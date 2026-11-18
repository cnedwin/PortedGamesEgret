// SPDX-License-Identifier: Apache-2.0
// A whole small game from one call. `play` makes the canvas and fits it to the page, runs the game's setup before
// the first update, and gives the parts most games write for themselves: keys and a pointer to ask each frame,
// sound effects made in code, overlap tests, timers, text that can be centred, tweens, bursts of particles, a
// shake, a flash and a hit stop. Everything is built from the public entries, which stay there for a game that
// outgrows this one.
import { EgretError } from '@egret/runtime';
import { Sprite, animate } from '@egret/engine';
import { createRandom, encodeWav } from '@egret/engine/kit';
import { createBrowserAudio } from './audio.js';
import { createBrowserGamepadInput } from './gamepad.js';
import { createBrowserGame } from './game.js';
import { createBrowserFrameLoop } from './loop.js';
import { SFX_PRESETS, isSfxRecipe, synthesizeSfx } from './playSfx.js';
/** A line of text: a sprite to place, fade, tween and remove like any other, with words that can be changed. */
export class PlayText extends Sprite {
    #text;
    #color;
    #size;
    #changed;
    #styled;
    constructor(text, changed, color = 0xffffff, size = 24, styled = () => { }) {
        super();
        this.#text = text;
        this.#changed = changed;
        this.#color = color;
        this.#size = size;
        this.#styled = styled;
    }
    get text() {
        return this.#text;
    }
    set text(value) {
        const next = String(value);
        if (next === this.#text)
            return;
        this.#text = next;
        this.#changed(next);
    }
    /** The colour of the words, `0xRRGGBB`. What is not a colour is not taken. */
    get color() {
        return this.#color;
    }
    set color(value) {
        if (!Number.isInteger(value) || value < 0 || value > 0xffffff || value === this.#color)
            return;
        this.#color = value;
        this.#styled({ color: value });
    }
    /** The size of the words. What is not a size above 0 is not taken. */
    get size() {
        return this.#size;
    }
    set size(value) {
        if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value === this.#size)
            return;
        this.#size = value;
        this.#styled({ size: value });
    }
}
/**
 * The listener the Engine is given for a tap. A listener of the Engine runs to its end and returns nothing, and one
 * that returns a promise is refused, which ends pointer input; so what the game's function returns is not handed on.
 * When it is a promise, as an `async` function returns, its failure is told as the function's own would be.
 */
export function tapListener(callback, fail) {
    return () => {
        try {
            const result = callback();
            if (result !== null && result !== undefined && typeof result.then === 'function')
                result.then(undefined, fail);
        }
        catch (cause) {
            fail(cause);
        }
    };
}
const invalid = (why) => new EgretError('PLAY_OPTIONS_INVALID', { cause: new Error(why) });
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const colour = (value) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xffffff;
const KEY_NAMES = {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    up: 'ArrowUp',
    down: 'ArrowDown',
    space: 'Space',
    enter: 'Enter',
    escape: 'Escape',
    esc: 'Escape',
    shift: 'ShiftLeft',
    tab: 'Tab'
};
/** Keys a game uses that would otherwise scroll or move about the page. */
const KEPT_FROM_PAGE = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab']);
function codeOf(key) {
    const named = KEY_NAMES[key.toLowerCase()];
    if (named !== undefined)
        return named;
    if (/^[a-zA-Z]$/.test(key))
        return 'Key' + key.toUpperCase();
    if (/^[0-9]$/.test(key))
        return 'Digit' + key;
    return key;
}
const SWIPE = 24;
const PIECES = 256;
/** A loop of `sfx.loop`. Its voice starts once its sound is made, which is at once for the effects every game has. */
class PlayingLoop {
    #voice;
    #volume;
    #pitch;
    #pan;
    #master = 1;
    #stopped = false;
    constructor(sound, mixer, volume, pitch, pan, fadeIn) {
        this.#volume = Math.max(0, Math.min(1, volume));
        this.#pitch = Math.max(0.25, Math.min(4, pitch));
        this.#pan = Math.max(-1, Math.min(1, pan));
        const made = sound();
        if (made === undefined)
            return;
        try {
            this.#voice = mixer.play(made, {
                loop: true,
                volume: 0,
                rate: this.#pitch,
                pan: this.#pan,
                whileSilent: 'start',
                ...(fadeIn > 0 ? { fadeIn: Math.min(fadeIn, 60) } : {})
            });
        }
        catch {
            // Sound never stops a game.
        }
    }
    /** The volume of every effect, or 0 while they are muted. */
    heard(master) {
        this.#master = master;
        this.#apply();
    }
    #apply() {
        try {
            this.#voice?.setVolume(this.#stopped ? 0 : this.#volume * this.#master);
        }
        catch {
            /* A voice that has ended takes nothing. */
        }
    }
    get volume() {
        return this.#volume;
    }
    set volume(value) {
        if (!finite(value))
            return;
        this.#volume = Math.max(0, Math.min(1, value));
        this.#apply();
    }
    get pitch() {
        return this.#pitch;
    }
    set pitch(value) {
        if (!finite(value))
            return;
        this.#pitch = Math.max(0.25, Math.min(4, value));
        try {
            this.#voice?.setRate(this.#pitch);
        }
        catch {
            /* As above. */
        }
    }
    get pan() {
        return this.#pan;
    }
    set pan(value) {
        if (!finite(value))
            return;
        this.#pan = Math.max(-1, Math.min(1, value));
        try {
            this.#voice?.setPan(this.#pan);
        }
        catch {
            /* As above. */
        }
    }
    get stopped() {
        return this.#stopped;
    }
    stop(seconds = 0.1) {
        if (this.#stopped)
            return;
        this.#stopped = true;
        try {
            this.#voice?.stop(finite(seconds) && seconds > 0 ? { fade: Math.min(seconds, 60) } : undefined);
        }
        catch {
            /* As above. */
        }
    }
    /** Held while the game is paused. */
    hold(held) {
        try {
            if (held)
                this.#voice?.pause();
            else
                this.#voice?.resume();
        }
        catch {
            /* As above. */
        }
    }
}
/** Starts a game in the page. See the guide `play.md`. */
export async function play(options) {
    if (options === null || typeof options !== 'object')
        throw invalid('play takes an object of options');
    const { width, height, background = 0, setup, update, onError } = options;
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0)
        throw invalid('width and height are whole numbers above 0');
    if (!colour(background))
        throw invalid('background is a colour from 0 to 0xffffff');
    if (setup !== undefined && typeof setup !== 'function')
        throw invalid('setup is a function');
    if (update !== undefined && typeof update !== 'function')
        throw invalid('update is a function');
    if (onError !== undefined && typeof onError !== 'function')
        throw invalid('onError is a function');
    const page = options.canvas?.ownerDocument ?? options.parent?.ownerDocument ?? globalThis.document;
    if (page === undefined)
        throw invalid('play needs a page');
    const win = page.defaultView ?? globalThis;
    // The canvas: the caller's as it stands, or one of our own in a holder it is fitted into.
    let holder, canvas = options.canvas;
    if (canvas === undefined) {
        holder = page.createElement('div');
        const parent = options.parent;
        holder.style.cssText =
            parent === undefined
                ? 'position:fixed;left:0;top:0;width:100%;height:100%;overflow:hidden;background:#000'
                : 'position:relative;width:100%;overflow:hidden;background:#000;' +
                    // A parent with no height of its own is given the stage's shape.
                    (parent.clientHeight > 0 ? 'height:100%' : `aspect-ratio:${width}/${height}`);
        canvas = page.createElement('canvas');
        canvas.style.cssText = 'display:block;touch-action:none;outline:none';
        holder.appendChild(canvas);
        (parent ?? page.body).appendChild(holder);
    }
    const surface = canvas;
    let api;
    const baseBrowser = await createBrowserGame({
        canvas: surface,
        width,
        height,
        clearColor: options.transparent === true ? 0 : background,
        ...(options.transparent === true ? { clearAlpha: 0 } : {}),
        autoStart: false,
        keyboard: false,
        ...(holder === undefined ? {} : { fit: 'contain', fitTo: holder }),
        ...(options.backend === undefined ? {} : { backend: options.backend }),
        ...(onError === undefined ? {} : { onError })
    }).catch((cause) => {
        holder?.remove();
        throw cause;
    });
    const { engine, scope, stage } = baseBrowser;
    let sourceSeconds = 0, clockSeconds = 0, realStep = 0, playStep = 0, generation = 0;
    // Rendering keeps its wall-clock cadence; the real Engine clock advances only by gameplay time.
    const playLoop = createBrowserFrameLoop({
        engine: {
            clock: engine.clock,
            advanceTime(source) {
                realStep = Math.max(0, source - sourceSeconds);
                sourceSeconds = source;
                playStep = api === undefined || paused ? 0 : realStep * timeScale;
                if (api !== undefined && !paused && stopped > 0) {
                    stopped = Math.max(0, stopped - realStep);
                    playStep = 0;
                }
                const end = clockSeconds + playStep, version = generation;
                // Use headroom so subtraction of large absolute timestamps cannot exceed the admitted delta by rounding.
                const limit = engine.clock.maxDeltaSeconds / 2;
                const valid = () => !disposed &&
                    api !== undefined &&
                    !paused &&
                    stopped <= 0 &&
                    generation === version &&
                    playLoop.state === 'running';
                playStep = 0;
                do {
                    const next = Math.min(end, clockSeconds + limit);
                    const delta = next - clockSeconds;
                    clockSeconds = next;
                    playStep += delta;
                    time += delta;
                    engine.advanceTime(clockSeconds);
                    // Tween callbacks can pause, restart or dispose the game from inside a clock tick.
                    if (!valid())
                        return;
                } while (clockSeconds < end);
            },
            renderSharedFrame: frame => engine.renderSharedFrame(frame)
        },
        host: baseBrowser.host,
        frame: baseBrowser.frame,
        update: () => {
            if (!disposed && playLoop.state === 'running')
                step(realStep, playStep);
        },
        ...(onError === undefined ? {} : { onError })
    });
    const browser = Object.freeze({
        ...baseBrowser,
        loop: playLoop,
        dispose() {
            playLoop.dispose();
            stopMotions();
            return baseBrowser.dispose();
        }
    });
    const layer = () => stage.addChild(scope.use(new Sprite()));
    const world = layer(), effects = layer(), ui = layer(), cover = layer();
    const view = { x: 0, y: 0 };
    const random = createRandom(options.seed ?? Date.now() + ':' + Math.random());
    // Keys: a set of what is held, and what changed since the last update.
    const held = new Set(), wentDown = new Set(), cameUp = new Set();
    const typing = (target) => {
        const element = target;
        return (element?.isContentEditable === true ||
            element?.tagName === 'INPUT' ||
            element?.tagName === 'TEXTAREA' ||
            element?.tagName === 'SELECT');
    };
    const keyDown = (event) => {
        if (typing(event.target))
            return;
        if (KEPT_FROM_PAGE.has(event.code))
            event.preventDefault();
        if (event.repeat || held.has(event.code))
            return;
        held.add(event.code);
        wentDown.add(event.code);
    };
    const keyUp = (event) => {
        if (held.delete(event.code))
            cameUp.add(event.code);
    };
    const letGo = () => {
        for (const code of held)
            cameUp.add(code);
        held.clear();
        point.down = false;
    };
    const any = (set, keys) => keys.some(key => set.has(codeOf(String(key))));
    // A gamepad, where the page has them: polled once a step. Its sticks count in `axis` and `look`.
    let pads;
    try {
        pads = scope.use(createBrowserGamepadInput());
    }
    catch {
        pads = undefined;
    }
    const stick = (name) => {
        const pad = pads?.input.pads[0];
        if (pad === undefined)
            return { x: 0, y: 0 };
        try {
            const at = pad.stick(name);
            return { x: finite(at.x) ? at.x : 0, y: finite(at.y) ? at.y : 0 };
        }
        catch {
            return { x: 0, y: 0 };
        }
    };
    const keys = {
        down: (...names) => any(held, names),
        pressed: (...names) => any(wentDown, names),
        released: (...names) => any(cameUp, names),
        axis() {
            let x = (any(held, ['right', 'd']) ? 1 : 0) - (any(held, ['left', 'a']) ? 1 : 0), y = (any(held, ['down', 's']) ? 1 : 0) - (any(held, ['up', 'w']) ? 1 : 0);
            const length = x !== 0 && y !== 0 ? Math.SQRT1_2 : 1;
            x *= length;
            y *= length;
            const pushed = stick('left');
            if (x === 0 && y === 0 && (pushed.x !== 0 || pushed.y !== 0)) {
                const reach = Math.hypot(pushed.x, pushed.y);
                return reach > 1 ? { x: pushed.x / reach, y: pushed.y / reach } : pushed;
            }
            return { x, y };
        },
        look: () => stick('right')
    };
    // The pointer: where it is, on the stage, and what changed since the last update.
    const point = {
        x: width / 2,
        y: height / 2,
        dx: 0,
        dy: 0,
        wheel: 0,
        down: false,
        pressed: false,
        released: false,
        swipe: undefined,
        fromX: 0,
        fromY: 0
    };
    // The first move a page sees has no move before it, and some browsers give it the whole way from the corner.
    let seenMove = false;
    const moved = (event) => {
        if (seenMove || page.pointerLockElement === surface) {
            if (finite(event.movementX))
                point.dx += event.movementX;
            if (finite(event.movementY))
                point.dy += event.movementY;
        }
        seenMove = true;
        place(event);
    };
    const turned = (event) => {
        if (finite(event.deltaY))
            point.wheel += event.deltaY > 0 ? 1 : event.deltaY < 0 ? -1 : 0;
        // The wheel turns the game, not the page under it.
        event.preventDefault();
    };
    const place = (event) => {
        const at = browser.toStage(event.clientX, event.clientY);
        if (finite(at.x) && finite(at.y)) {
            point.x = at.x;
            point.y = at.y;
        }
    };
    // The sprites a tap is given to. A press on one of them is the sprite's, and is not also told as `pressed`: a game
    // that places something wherever the stage is pressed would place it under its own buttons.
    let tappable = [];
    const pointerDown = (event) => {
        place(event);
        point.down = true;
        tappable = tappable.filter(node => !node.isDisposed);
        point.pressed = !tappable.some(node => pointer.over(node));
        point.fromX = point.x;
        point.fromY = point.y;
        // Keys reach the page only once it has been clicked, where the game sits in a frame.
        win.focus?.();
    };
    const pointerUp = (event) => {
        place(event);
        if (!point.down)
            return;
        point.down = false;
        point.released = true;
        const dx = point.x - point.fromX, dy = point.y - point.fromY;
        if (Math.max(Math.abs(dx), Math.abs(dy)) >= SWIPE)
            point.swipe = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    };
    const pointerCancel = () => {
        point.down = false;
    };
    const pointer = {
        get x() {
            return point.x;
        },
        get y() {
            return point.y;
        },
        get down() {
            return point.down;
        },
        get pressed() {
            return point.pressed;
        },
        get released() {
            return point.released;
        },
        get swipe() {
            return point.swipe;
        },
        get dx() {
            return point.dx;
        },
        get dy() {
            return point.dy;
        },
        get wheel() {
            return point.wheel;
        },
        lock() {
            try {
                const asked = surface.requestPointerLock?.();
                // A browser that answers with a promise refuses through it, as when no click came first.
                if (asked !== null && typeof asked === 'object' && 'catch' in asked)
                    asked.catch(() => { });
            }
            catch {
                // Not allowed now: the game goes on with the mouse free.
            }
        },
        unlock() {
            try {
                if (page.pointerLockElement === surface)
                    page.exitPointerLock?.();
            }
            catch {
                // As above.
            }
        },
        get locked() {
            return page.pointerLockElement === surface;
        },
        over(node) {
            if (!seen(node))
                return false;
            const box = boxOf(node);
            return (box !== undefined && point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom);
        }
    };
    const listening = [
        [win, 'keydown', keyDown],
        [win, 'keyup', keyUp],
        [win, 'blur', letGo],
        [surface, 'pointerdown', pointerDown],
        [win, 'pointermove', moved],
        [surface, 'wheel', turned],
        [win, 'pointerup', pointerUp],
        [win, 'pointercancel', pointerCancel]
    ];
    for (const [target, type, listener] of listening)
        target.addEventListener(type, listener, { passive: false });
    // Sound: every effect is made and decoded before the game is set up, so the first one plays at once.
    const audio = scope.use(createBrowserAudio({ limiter: true }));
    const sounds = new Map();
    const RATE = 22050;
    const make = async (name, recipe) => {
        try {
            sounds.set(name, await audio.mixer.decode(encodeWav([synthesizeSfx(recipe, RATE)], RATE)));
        }
        catch {
            // A page without sound still plays the game.
        }
    };
    const names = new Set(Object.keys(SFX_PRESETS));
    const loops = new Set();
    const stopLoops = () => {
        for (const each of loops)
            each.stop(0);
        loops.clear();
    };
    let volume = 1, muted = false;
    const sfx = {
        play(name, given = {}) {
            if (!names.has(name))
                throw new EgretError('PLAY_SFX_UNKNOWN', {
                    cause: new Error(`"${String(name)}" is not one of: ${[...names].join(', ')}`)
                });
            const sound = sounds.get(name);
            if (sound === undefined || muted)
                return;
            const loud = Math.max(0, Math.min(1, (finite(given.volume) ? given.volume : 1) * volume)), rate = Math.max(0.25, Math.min(4, finite(given.pitch) ? given.pitch : 1)), pan = Math.max(-1, Math.min(1, finite(given.pan) ? given.pan : 0));
            try {
                audio.mixer.play(sound, { volume: loud, rate, pan, maxInstances: 6 });
            }
            catch {
                // Sound never stops a game.
            }
        },
        loop(name, given = {}) {
            if (!names.has(name))
                throw new EgretError('PLAY_SFX_UNKNOWN', {
                    cause: new Error(`"${String(name)}" is not one of: ${[...names].join(', ')}`)
                });
            const made = new PlayingLoop(() => sounds.get(name), audio.mixer, finite(given.volume) ? given.volume : 1, finite(given.pitch) ? given.pitch : 1, finite(given.pan) ? given.pan : 0, finite(given.fadeIn) ? given.fadeIn : 0);
            loops.add(made);
            made.heard(muted ? 0 : volume);
            return made;
        },
        define(name, recipe) {
            if (typeof name !== 'string' || name === '' || !isSfxRecipe(recipe))
                throw invalid('an effect is a name and one tone, or a list of tones, each with `from` and `seconds`');
            names.add(name);
            void make(name, recipe);
        },
        get names() {
            return [...names];
        },
        get volume() {
            return volume;
        },
        set volume(value) {
            if (finite(value))
                volume = Math.max(0, Math.min(1, value));
            for (const each of loops)
                each.heard(muted ? 0 : volume);
        },
        get muted() {
            return muted;
        },
        set muted(value) {
            muted = Boolean(value);
            for (const each of loops)
                each.heard(muted ? 0 : volume);
        }
    };
    let timers = [];
    const timer = (seconds, callback, repeat) => {
        if (!finite(seconds) || seconds < 0 || typeof callback !== 'function')
            throw invalid('a timer is a number of seconds, 0 or more, and a function');
        // A repeat of no length would never let the frame end.
        const entry = { at: time + seconds, every: repeat ? Math.max(seconds, 1 / 240) : 0, callback, live: true };
        timers.push(entry);
        return () => {
            entry.live = false;
        };
    };
    // Tweens start by themselves at the next update, so a chain is written without a last `.start()`. Each is
    // watched until it has finished or been stopped, which is when its `done` resolves.
    let waiting = [];
    let moving = [];
    function stopMotions() {
        waiting = [];
        const ending = moving;
        moving = [];
        for (const entry of ending) {
            entry.motion.stop();
            entry.settle();
        }
    }
    const pieces = [];
    let nextPiece = 0;
    // Text.
    const removers = new WeakMap();
    const text = (given, o = {}) => {
        if (o === null || typeof o !== 'object')
            throw invalid('the options of a text are an object');
        const { size = 24, color = 0xffffff, align = 'left', bold = false } = o;
        if (!finite(size) || size <= 0 || !colour(color))
            throw invalid('a text has a size above 0 and a colour');
        if (align !== 'left' && align !== 'center' && align !== 'right')
            throw invalid("align is 'left', 'center' or 'right'");
        let label, gone = false;
        const settle = () => {
            if (label === undefined || gone)
                return;
            const made = label;
            made.ready.then(() => {
                if (gone)
                    return;
                made.display.x = align === 'center' ? -made.display.width / 2 : align === 'right' ? -made.display.width : 0;
                made.display.y = o.baseline === 'middle' ? -made.display.height / 2 : 0;
                made.display.visible = true;
            }, () => { });
        };
        const node = scope.use(new PlayText(String(given), next => {
            if (label === undefined)
                return;
            label.text = next;
            settle();
        }, color, size, style => {
            if (label === undefined)
                return;
            label.set({
                ...(style.color === undefined ? {} : { color: style.color }),
                ...(style.size === undefined ? {} : { fontSize: style.size })
            });
            settle();
        }));
        node.x = finite(o.x) ? o.x : 0;
        node.y = finite(o.y) ? o.y : 0;
        if (o.baseline !== undefined && o.baseline !== 'top' && o.baseline !== 'middle')
            throw invalid("baseline is 'top' or 'middle'");
        const into = o.layer === undefined || o.layer === 'ui' ? ui : o.layer === 'world' ? world : o.layer;
        if (!(into instanceof Sprite) || into.isDisposed)
            throw invalid("layer is 'ui', 'world' or a sprite");
        into.addChild(node);
        const words = node.text;
        browser
            .createLabel({
            text: words,
            fontSize: size,
            color,
            fontWeight: bold ? 700 : 400,
            locale: o.locale ?? (/[぀-ヿ㐀-鿿가-힯]/.test(words) ? 'zh' : 'en')
        })
            .then(made => {
            if (gone || node.isDisposed) {
                made.dispose();
                return;
            }
            label = made;
            // Hidden until it has been measured, so centred words never show at the wrong place first.
            made.display.visible = false;
            node.addChild(made.display);
            if (node.text !== words)
                made.text = node.text;
            // What was set while the words were being made.
            if (node.color !== color || node.size !== size)
                made.set({ color: node.color, fontSize: node.size });
            settle();
        }, () => { });
        removers.set(node, () => {
            gone = true;
            label?.dispose();
        });
        return node;
    };
    const boxOf = (node) => {
        const own = node.getBounds();
        if (!(own.width > 0) || !(own.height > 0))
            return undefined;
        let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
        for (const [x, y] of [
            [own.x, own.y],
            [own.x + own.width, own.y],
            [own.x, own.y + own.height],
            [own.x + own.width, own.y + own.height]
        ]) {
            const at = node.localToGlobal(x, y);
            left = Math.min(left, at.x);
            right = Math.max(right, at.x);
            top = Math.min(top, at.y);
            bottom = Math.max(bottom, at.y);
        }
        return { left, top, right, bottom };
    };
    const meet = (a, b, shrink) => a.left + shrink < b.right - shrink &&
        b.left + shrink < a.right - shrink &&
        a.top + shrink < b.bottom - shrink &&
        b.top + shrink < a.bottom - shrink;
    const seen = (node) => !node.isDisposed && node.visible && node.parent !== undefined;
    // The step of every frame.
    let time = 0, timeScale = 1, paused = false, stopped = 0, shakeAmount = 0, shakeLeft = 0, shakeSpan = 1, flashLeft = 0, flashSpan = 1, disposed = false;
    // What `remove` took off the stage, until it is ended.
    const left = new WeakSet();
    let leaving = [];
    const endRemoved = () => {
        if (leaving.length === 0)
            return;
        const ending = leaving;
        leaving = [];
        for (const node of ending)
            if (!node.isDisposed)
                node.dispose();
    };
    const endFrame = () => {
        endRemoved();
        wentDown.clear();
        cameUp.clear();
        point.pressed = false;
        point.released = false;
        point.swipe = undefined;
        point.dx = point.dy = point.wheel = 0;
    };
    // What the function of a tap threw, now or when its promise failed: it stops the game at the next step, as what
    // `update` throws does, and is told the same way.
    let failure;
    let disposal;
    const fail = (cause) => {
        failure ??= { cause };
    };
    function step(real, seconds) {
        if (failure !== undefined) {
            const { cause } = failure;
            failure = undefined;
            throw cause;
        }
        try {
            pads?.poll();
        }
        catch {
            // A pad that cannot be read is not there.
        }
        const version = generation;
        const active = () => !disposed &&
            api !== undefined &&
            !paused &&
            stopped <= 0 &&
            version === generation &&
            playLoop.state === 'running';
        if (api === undefined || paused || disposed || playLoop.state !== 'running') {
            endFrame();
            return;
        }
        if (seconds > 0 && stopped <= 0) {
            if (waiting.length > 0) {
                const starting = waiting;
                waiting = [];
                for (let index = 0; index < starting.length; index++) {
                    const motion = starting[index];
                    if (motion.state === 'idle')
                        motion.start();
                    if (!active()) {
                        if (!disposed && version === generation && api !== undefined)
                            waiting.push(...starting.slice(index + 1).filter(motion => motion.state === 'idle'));
                        endFrame();
                        return;
                    }
                }
            }
            if (moving.length > 0)
                moving = moving.filter(entry => {
                    if (entry.motion.state !== 'finished' && entry.motion.state !== 'stopped')
                        return true;
                    entry.settle();
                    return false;
                });
            if (timers.length > 0) {
                // A timer may add or call off timers; those added now wait for the next step.
                const due = timers;
                timers = [];
                for (let index = 0; index < due.length; index++) {
                    const entry = due[index];
                    if (!entry.live)
                        continue;
                    if (entry.at <= time) {
                        if (entry.every > 0)
                            entry.at = Math.max(entry.at + entry.every, time);
                        else
                            entry.live = false;
                        entry.callback();
                    }
                    if (disposed || version !== generation || api === undefined) {
                        endFrame();
                        return;
                    }
                    if (entry.live)
                        timers.push(entry);
                    if (!active()) {
                        timers.push(...due.slice(index + 1).filter(entry => entry.live));
                        endFrame();
                        return;
                    }
                }
            }
            update?.(seconds, api);
            if (!active()) {
                endFrame();
                return;
            }
            for (const piece of pieces) {
                if (piece.life <= 0)
                    continue;
                piece.life -= seconds;
                if (piece.life <= 0) {
                    piece.node.visible = false;
                    continue;
                }
                piece.vy += piece.gravity * seconds;
                piece.node.x += piece.vx * seconds;
                piece.node.y += piece.vy * seconds;
                const left = piece.life / piece.span;
                piece.node.alpha = left;
                piece.node.scaleX = piece.node.scaleY = 0.4 + 0.6 * left;
            }
        }
        // The shake and the flash run on the clock of the wall, so a hit stop does not freeze them.
        let dx = 0, dy = 0;
        if (shakeLeft > 0) {
            shakeLeft -= real;
            const strength = shakeAmount * Math.max(0, shakeLeft / shakeSpan);
            dx = (Math.random() * 2 - 1) * strength;
            dy = (Math.random() * 2 - 1) * strength;
        }
        world.x = effects.x = dx - view.x;
        world.y = effects.y = dy - view.y;
        if (flashLeft > 0) {
            flashLeft -= real;
            cover.alpha = Math.max(0, flashLeft / flashSpan) * 0.85;
            if (flashLeft <= 0)
                cover.visible = false;
        }
        endFrame();
    }
    const storage = (() => {
        try {
            return win.localStorage;
        }
        catch {
            return undefined;
        }
    })();
    const kept = new Map();
    const saveKey = (key) => 'egret.play:' + (options.saveKey ?? win.location?.pathname ?? '') + ':' + key;
    const game = {
        width,
        height,
        get time() {
            return time;
        },
        world,
        ui,
        view,
        keys,
        pointer,
        sfx,
        random,
        get timeScale() {
            return timeScale;
        },
        set timeScale(value) {
            if (finite(value) && value >= 0)
                timeScale = Math.min(value, 8);
        },
        sprite(draw, into = world) {
            const node = scope.use(new Sprite());
            if (draw !== undefined)
                draw(node.graphics);
            into.addChild(node);
            return node;
        },
        rect(x, y, w, h, color, into) {
            if (![x, y, w, h].every(finite) || w < 0 || h < 0 || !colour(color))
                throw invalid('rect takes x, y, a width, a height and a colour');
            if (into !== undefined && !(into instanceof Sprite))
                throw invalid('the layer of a rect is a sprite');
            const node = game.sprite(g => {
                g.beginFill(color)
                    .drawRect(-w / 2, -h / 2, w, h)
                    .endFill();
            }, into);
            node.x = x;
            node.y = y;
            return node;
        },
        circle(x, y, radius, color, into) {
            if (![x, y, radius].every(finite) || radius < 0 || !colour(color))
                throw invalid('circle takes x, y, a radius and a colour');
            if (into !== undefined && !(into instanceof Sprite))
                throw invalid('the layer of a circle is a sprite');
            const node = game.sprite(g => {
                g.beginFill(color).drawCircle(0, 0, radius).endFill();
            }, into);
            node.x = x;
            node.y = y;
            return node;
        },
        text,
        button(words, o, onTap) {
            if (o === null || typeof o !== 'object' || !finite(o.x) || !finite(o.y) || typeof onTap !== 'function')
                throw invalid('a button takes its words, { x, y } and a function');
            const { width: w = 160, height: h = 44, color = 0x3b82f6, textColor = 0xffffff } = o;
            if (!finite(w) || !finite(h) || w <= 0 || h <= 0 || !colour(color) || !colour(textColor))
                throw invalid('a button has a width and a height above 0 and colours');
            const node = game.sprite(g => {
                g.beginFill(color)
                    .drawRoundRect(-w / 2, -h / 2, w, h, Math.min(w, h) * 0.25)
                    .endFill();
            }, o.layer ?? ui);
            node.x = o.x;
            node.y = o.y;
            node.label = text(words, {
                size: finite(o.size) && o.size > 0 ? o.size : h * 0.45,
                color: textColor,
                align: 'center',
                baseline: 'middle',
                layer: node
            });
            game.onTap(node, onTap);
            return node;
        },
        toFront(node) {
            if (node === undefined || node === null || node.isDisposed)
                return;
            node.parent?.addChild(node);
        },
        remove(node) {
            if (node === undefined || node === null || node.isDisposed || left.has(node))
                return;
            left.add(node);
            removers.get(node)?.();
            // Off the stage at once, and ended when the step is over: the rest of an update that still holds it, as a
            // loop over a list it was in does, may set it without failing.
            node.parent?.removeChild(node);
            leaving.push(node);
        },
        onTap(node, callback) {
            if (typeof callback !== 'function')
                throw invalid('onTap takes a sprite and a function');
            if (browser.pointer === undefined)
                return;
            node.touchEnabled = true;
            node.on(browser.pointer.events.tap, tapListener(callback, fail));
            if (!tappable.includes(node))
                tappable.push(node);
        },
        overlaps(a, b, shrink = 0) {
            if (!seen(a) || !seen(b))
                return false;
            const first = boxOf(a), second = boxOf(b);
            return first !== undefined && second !== undefined && meet(first, second, shrink);
        },
        hits(a, others, shrink = 0) {
            if (!seen(a))
                return undefined;
            const first = boxOf(a);
            if (first === undefined)
                return undefined;
            for (const other of others) {
                // A sprite does not hit itself, so a list may hold it.
                if (other === a || !seen(other))
                    continue;
                const second = boxOf(other);
                if (second !== undefined && meet(first, second, shrink))
                    return other;
            }
            return undefined;
        },
        hitsAll(a, others, shrink = 0) {
            const found = [];
            if (!seen(a))
                return found;
            const first = boxOf(a);
            if (first === undefined)
                return found;
            for (const other of others) {
                if (other === a || !seen(other))
                    continue;
                const second = boxOf(other);
                if (second !== undefined && meet(first, second, shrink))
                    found.push(other);
            }
            return found;
        },
        pushOut(a, b) {
            if (!seen(a) || !seen(b))
                return undefined;
            const first = boxOf(a), second = boxOf(b);
            if (first === undefined || second === undefined || !meet(first, second, 0))
                return undefined;
            // The four ways out; the shortest is taken, and of two the same length the vertical one, so a box set
            // down on a floor is lifted and not slid.
            const left = second.left - first.right, right = second.right - first.left, up = second.top - first.bottom, down = second.bottom - first.top;
            const x = -left < right ? left : right, y = -up < down ? up : down;
            return Math.abs(x) < Math.abs(y) ? { x, y: 0 } : { x: 0, y };
        },
        near(a, b, distance) {
            if (!finite(distance) || !seen(a) || !seen(b))
                return false;
            const first = boxOf(a), second = boxOf(b);
            if (first === undefined || second === undefined)
                return false;
            const dx = (first.left + first.right - second.left - second.right) / 2, dy = (first.top + first.bottom - second.top - second.bottom) / 2;
            return dx * dx + dy * dy <= distance * distance;
        },
        tween(target) {
            const motion = animate(engine, scope, target);
            let settle;
            const done = new Promise(resolve => {
                settle = resolve;
            });
            Object.defineProperty(motion, 'done', { value: done, enumerable: true });
            waiting.push(motion);
            moving.push({ motion: motion, settle });
            return motion;
        },
        wait(seconds) {
            return new Promise(resolve => {
                timer(seconds, resolve, false);
            });
        },
        after: (seconds, callback) => timer(seconds, callback, false),
        every: (seconds, callback) => timer(seconds, callback, true),
        shake(amount = 6, seconds = 0.25) {
            if (!finite(amount) || !finite(seconds) || amount <= 0 || seconds <= 0)
                return;
            shakeAmount = Math.max(shakeLeft > 0 ? shakeAmount : 0, Math.min(amount, Math.max(width, height)));
            shakeLeft = shakeSpan = Math.min(seconds, 5);
        },
        flash(color = 0xffffff, seconds = 0.15) {
            if (!colour(color) || !finite(seconds) || seconds <= 0)
                return;
            cover.graphics.clear().beginFill(color).drawRect(0, 0, width, height).endFill();
            cover.visible = true;
            cover.alpha = 0.85;
            flashLeft = flashSpan = Math.min(seconds, 5);
        },
        hitStop(seconds = 0.06) {
            if (finite(seconds) && seconds > 0)
                stopped = Math.max(stopped, Math.min(seconds, 1));
        },
        burst(x, y, o = {}) {
            if (!finite(x) || !finite(y) || o === null || typeof o !== 'object')
                return;
            const color = colour(o.color) ? o.color : 0xffffff, size = finite(o.size) && o.size > 0 ? o.size : 3, count = Math.max(0, Math.min(64, finite(o.count) ? Math.round(o.count) : 12)), speed = finite(o.speed) ? o.speed : 160, life = finite(o.life) && o.life > 0 ? o.life : 0.5, gravity = finite(o.gravity) ? o.gravity : 0;
            const drawn = color + ':' + size;
            for (let i = 0; i < count; i++) {
                let piece = pieces[nextPiece];
                if (piece === undefined) {
                    piece = {
                        node: effects.addChild(scope.use(new Sprite())),
                        vx: 0,
                        vy: 0,
                        gravity: 0,
                        life: 0,
                        span: 1,
                        drawn: ''
                    };
                    pieces[nextPiece] = piece;
                }
                nextPiece = (nextPiece + 1) % PIECES;
                if (piece.drawn !== drawn) {
                    piece.node.graphics.clear().beginFill(color).drawCircle(0, 0, size).endFill();
                    piece.drawn = drawn;
                }
                const angle = Math.random() * Math.PI * 2, fast = speed * (0.35 + Math.random() * 0.65);
                piece.vx = Math.cos(angle) * fast;
                piece.vy = Math.sin(angle) * fast;
                piece.gravity = gravity;
                piece.life = piece.span = life * (0.6 + Math.random() * 0.4);
                piece.node.x = x;
                piece.node.y = y;
                piece.node.alpha = 1;
                piece.node.scaleX = piece.node.scaleY = 1;
                piece.node.visible = true;
            }
        },
        save(key, value) {
            let written;
            try {
                written = JSON.stringify(value);
            }
            catch {
                return;
            }
            if (written === undefined)
                return;
            kept.set(key, written);
            try {
                storage?.setItem(saveKey(key), written);
            }
            catch {
                // Full or blocked storage: the value is kept for this visit.
            }
        },
        load(key, fallback) {
            let written = kept.get(key);
            if (written === undefined) {
                try {
                    written = storage?.getItem(saveKey(key)) ?? undefined;
                }
                catch {
                    written = undefined;
                }
            }
            if (written === undefined)
                return fallback;
            try {
                return JSON.parse(written);
            }
            catch {
                return fallback;
            }
        },
        pause() {
            paused = true;
            for (const each of loops)
                each.hold(true);
        },
        resume() {
            paused = false;
            for (const each of loops)
                each.hold(false);
        },
        get paused() {
            return paused;
        },
        async restart() {
            if (disposed)
                return;
            generation++;
            // No update runs while the game is taken down and set up again.
            api = undefined;
            timers = [];
            stopLoops();
            stopMotions();
            for (const made of [world, ui])
                while (made.numChildren > 0)
                    game.remove(made.getChildAt(0));
            endRemoved();
            for (const piece of pieces) {
                piece.life = 0;
                piece.node.visible = false;
            }
            view.x = view.y = 0;
            time = 0;
            timeScale = 1;
            paused = false;
            stopped = shakeLeft = flashLeft = 0;
            cover.visible = false;
            try {
                await setup?.(game);
            }
            finally {
                api = game;
            }
        },
        browser,
        engine,
        scope,
        canvas: surface,
        dispose() {
            if (disposal !== undefined)
                return disposal;
            disposed = true;
            stopLoops();
            for (const [target, type, listener] of listening)
                target.removeEventListener(type, listener);
            disposal = browser.dispose().finally(() => holder?.remove());
            return disposal;
        }
    };
    cover.visible = false;
    try {
        await Promise.all(Object.entries(SFX_PRESETS).map(([name, recipe]) => make(name, recipe)));
        await setup?.(game);
    }
    catch (cause) {
        await game.dispose();
        throw cause;
    }
    api = game;
    browser.loop.start();
    return game;
}
//# sourceMappingURL=BrowserPlay.js.map