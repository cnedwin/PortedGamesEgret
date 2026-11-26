// SPDX-License-Identifier: Apache-2.0
// A whole small game from one call. `play` makes the canvas and fits it to the page, runs the game's setup before
// the first update, and gives the parts most games write for themselves: keys and a pointer to ask each frame,
// sound effects made in code, overlap tests, timers, text that can be centred, tweens, bursts of particles, a
// shake, a flash and a hit stop. Everything is built from the public entries, which stay there for a game that
// outgrows this one.
import { EgretError } from '@egret/runtime';
import { Bitmap, Sprite, animate, createSharedMaterial2D } from '@egret/engine';
import { createRandom, encodeWav } from '@egret/engine/kit';
import { createBrowserAudio } from './audio.js';
import { createBrowserGamepadInput } from './gamepad.js';
import { createBrowserGame } from './game.js';
import { createBrowserFrameLoop } from './loop.js';
import { SFX_PRESETS, isSfxRecipe, synthesizeSfx } from './playSfx.js';
import { createPlayWidgets, verticalPlayWords } from './playWidgets.js';
import { prefersReducedMotion, watchReducedMotion } from './BrowserPreferences.js';
import { createPlayTouch } from './playTouch.js';
import { MUSIC_MOODS, MUSIC_PARTS, composeMusic, musicMix } from './playMusic.js';
import { createDragAndDrop, createGestures } from './gestures.js';
import { createPlayViews } from './playView.js';
import { createBadges, createRequest, formatCompact } from './viewParts.js';
import { pointerTapActivation, semanticTapActivation } from './playActivation.js';
/** A line of text: a sprite to place, fade, tween and remove like any other, with words that can be changed. */
export class PlayText extends Sprite {
    #text;
    #color;
    #size;
    #changed;
    #styled;
    #readReady;
    #ended;
    constructor(text, changed, color = 0xffffff, size = 24, styled = () => { }, readReady = () => Promise.resolve(), ended = () => { }) {
        super();
        this.#text = text;
        this.#changed = changed;
        this.#color = color;
        this.#size = size;
        this.#styled = styled;
        this.#readReady = readReady;
        this.#ended = ended;
    }
    /** The current words/style are installed on the display when this resolves. Read again after a change.
     * A superseded, hidden or removed pending revision rejects with AbortError; raster failures reject too.
     * This is not a promise that the GPU has presented a frame.
     */
    get ready() {
        return this.#readReady();
    }
    dispose() {
        if (this.isDisposed)
            return;
        try {
            super.dispose();
        }
        finally {
            if (this.isDisposed)
                this.#ended();
        }
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
/** Frames in a row in which update made one kind of thing before play tells PLAY_MADE_EVERY_FRAME. */
const MADE_EVERY_FRAMES = 60;
/** The buttons of a pad a key name may be, as `'pad:a'`: the standard layout, by where each button is. */
const PAD_BUTTONS = Object.freeze([
    'a',
    'b',
    'x',
    'y',
    'l1',
    'r1',
    'l2',
    'r2',
    'select',
    'start',
    'up',
    'down',
    'left',
    'right'
]);
function codeOf(key) {
    if (/^pad:/i.test(key))
        return 'Pad:' + key.slice(4).toLowerCase();
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
// A picture is smooth, and read from its smaller copies when drawn small; or sharp, every texel kept.
const SMOOTH = createSharedMaterial2D({ filter: 'linear', mipmapFilter: 'linear' }), SHARP = createSharedMaterial2D({});
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
        if (mixer === undefined) {
            this.#stopped = true;
            return;
        }
        if (sound === undefined)
            return;
        try {
            this.#voice = mixer.play(sound, {
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
    if (options.staticLayers !== undefined && typeof options.staticLayers !== 'boolean')
        throw invalid('staticLayers is true or false');
    const renderMode = options.renderMode ?? 'continuous';
    if (renderMode !== 'continuous' && renderMode !== 'on-demand')
        throw invalid("renderMode is 'continuous' or 'on-demand'");
    if (onError !== undefined && typeof onError !== 'function')
        throw invalid('onError is a function');
    const fitAsked = options.fit ?? 'contain';
    if (fitAsked !== 'contain' && fitAsked !== 'expand')
        throw invalid("fit is 'contain' or 'expand'");
    if (options.portrait !== undefined &&
        (options.portrait === null ||
            typeof options.portrait !== 'object' ||
            !Number.isSafeInteger(options.portrait.width) ||
            !Number.isSafeInteger(options.portrait.height) ||
            options.portrait.width <= 0 ||
            options.portrait.height <= 0))
        throw invalid('portrait is { width, height } of whole numbers above 0');
    if (options.insets !== undefined &&
        (options.insets === null ||
            typeof options.insets !== 'object' ||
            [options.insets.top, options.insets.right, options.insets.bottom, options.insets.left].some(edge => !finite(edge) || edge < 0)))
        throw invalid('insets is { top, right, bottom, left } of numbers 0 or more');
    if (options.arrange !== undefined && typeof options.arrange !== 'function')
        throw invalid('arrange is a function');
    if (options.onWarning !== undefined && typeof options.onWarning !== 'function')
        throw invalid('onWarning is a function');
    if (options.semantics !== undefined &&
        (options.semantics === null ||
            typeof options.semantics !== 'object' ||
            typeof options.semantics.add !== 'function' ||
            typeof options.semantics.publish !== 'function'))
        throw invalid('semantics is a tree made by createUiSemantics');
    if (options.audio !== undefined && typeof options.audio !== 'boolean')
        throw invalid('audio is true or false');
    if (options.reducedMotion !== undefined && typeof options.reducedMotion !== 'boolean')
        throw invalid('reducedMotion is true or false');
    // Given, it is the game's; not given, it follows the system's setting.
    let reduced = options.reducedMotion ?? prefersReducedMotion(), followSystem = options.reducedMotion === undefined;
    const unwatchMotion = watchReducedMotion(next => {
        if (followSystem)
            reduced = next;
    });
    const blendSpace = options.blendSpace ?? 'srgb';
    if (blendSpace !== 'linear' && blendSpace !== 'srgb')
        throw invalid("blendSpace is 'srgb' or 'linear'");
    const page = options.canvas?.ownerDocument ?? options.parent?.ownerDocument ?? globalThis.document;
    if (page === undefined)
        throw invalid('play needs a page');
    const win = page.defaultView ?? globalThis;
    // The canvas: the caller's as it stands, or one of our own in a holder it is fitted into.
    const embedded = options.parent !== undefined || options.canvas !== undefined;
    let holder, canvas = options.canvas;
    if (canvas === undefined) {
        holder = page.createElement('div');
        const parent = options.parent;
        holder.style.cssText =
            parent === undefined
                ? 'position:fixed;left:0;top:0;width:100%;height:100%;overflow:hidden'
                : 'position:relative;width:100%;overflow:hidden;' +
                    // A parent with no height of its own is given the stage's shape.
                    (parent.clientHeight > 0 ? 'height:100%' : `aspect-ratio:${width}/${height}`);
        holder.style.background = options.transparent === true ? 'transparent' : '#000';
        canvas = page.createElement('canvas');
        canvas.style.cssText = 'display:block;touch-action:none';
        if (!embedded)
            canvas.style.outline = 'none';
        holder.appendChild(canvas);
        (parent ?? page.body).appendChild(holder);
    }
    const surface = canvas;
    let api;
    const deviceDensity = Number(globalThis.devicePixelRatio);
    const playDensity = options.pixelRatio ?? (deviceDensity > 0 ? Math.min(deviceDensity, 2) : 1);
    const baseBrowser = await createBrowserGame({
        canvas: surface,
        width,
        height,
        clearColor: options.transparent === true ? 0 : background,
        ...(options.transparent === true ? { clearAlpha: 0 } : {}),
        blendSpace,
        // Masks, glows, outlines, blurs and colour matrices are drawn, as Egret 5 code expects of them.
        effects: true,
        ...(options.staticLayers === undefined ? {} : { staticLayers: options.staticLayers }),
        autoStart: false,
        keyboard: false,
        ...(holder === undefined ? {} : { fit: fitAsked, fitTo: holder }),
        ...(options.portrait === undefined ? {} : { portrait: options.portrait }),
        ...(options.insets === undefined ? {} : { insets: options.insets }),
        ...(options.backend === undefined ? {} : { backend: options.backend }),
        pixelRatio: playDensity,
        ...(options.beforeRender === undefined ? {} : { beforeRender: options.beforeRender }),
        ...(options.renderRetry === undefined ? {} : { renderRetry: options.renderRetry }),
        ...(onError === undefined ? {} : { onError }),
        ...(options.onWarning === undefined ? {} : { onWarning: options.onWarning })
    }).catch((cause) => {
        holder?.remove();
        throw cause;
    });
    const { engine, scope, stage } = baseBrowser;
    const revision = renderMode === 'on-demand' ? engine.watchDisplayRevision(scope) : undefined;
    let lastFrame, lastRevision = -1, lastLayerRevision = -1, redraw = 0, shownRedraw = 0;
    const invalidate = () => {
        if (revision !== undefined)
            redraw++;
    };
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
            renderSharedFrame(frame) {
                // A refusal or a late mutation must leave the request pending.
                const pending = redraw, next = revision?.revision, nextLayer = baseBrowser.staticLayers?.revision ?? 0;
                // Drawn as the game draws: a frame of too many images is left undrawn with a warning, not the game stopped.
                const submitted = baseBrowser.drawFrame(frame);
                if (submitted === undefined)
                    return undefined;
                if (next !== undefined) {
                    lastFrame = frame;
                    lastRevision = next;
                    lastLayerRevision = nextLayer;
                    shownRedraw = pending;
                }
                return submitted;
            }
        },
        host: baseBrowser.host,
        frame: () => baseBrowser.frame,
        ...(options.beforeRender === undefined ? {} : { beforeRender: options.beforeRender }),
        ...(options.renderRetry === undefined ? {} : { renderRetry: options.renderRetry }),
        ...(revision === undefined
            ? {}
            : {
                shouldRender: () => lastRevision !== revision.revision ||
                    lastLayerRevision !== (baseBrowser.staticLayers?.revision ?? 0) ||
                    shownRedraw !== redraw ||
                    lastFrame !== baseBrowser.frame
            }),
        update: () => {
            if (!disposed && playLoop.state === 'running')
                step(realStep, playStep);
        },
        ...(onError === undefined ? {} : { onError })
    });
    const browser = Object.freeze({
        ...baseBrowser,
        // The frame and the screen change with the window; these read the game's own.
        get frame() {
            return baseBrowser.frame;
        },
        get screen() {
            return baseBrowser.screen;
        },
        loop: playLoop,
        dispose() {
            playLoop.dispose();
            stopMotions();
            return baseBrowser.dispose();
        }
    });
    const layer = () => stage.addChild(scope.use(new Sprite()));
    const world = layer(), effects = layer(), ui = layer(), glass = layer(), cover = layer();
    // Where the design is on the stage: the layers are moved there, so (0, 0) is the design's corner however much of
    // the stage the window shows around it. The cover is the stage's own, over all of it.
    let shown = baseBrowser.screen;
    const placeLayers = () => {
        ui.x = glass.x = shown.designRect.x;
        ui.y = glass.y = shown.designRect.y;
    };
    placeLayers();
    const view = { x: 0, y: 0 };
    const random = createRandom(options.seed ?? Date.now() + ':' + Math.random());
    // What the player used last, for hints in the player's own words.
    let device = (() => {
        try {
            return win.matchMedia?.('(pointer: coarse)').matches === true ? 'touch' : 'keyboard';
        }
        catch {
            return 'keyboard';
        }
    })();
    const badges = createBadges();
    // Keys: a set of what is held, and what changed since the last update.
    const physicalKeys = new Set(), gameplayPadCodes = new Set(), held = new Set(), wentDown = new Set(), cameUp = new Set();
    const typing = (target) => {
        const element = target;
        return (element?.isContentEditable === true ||
            element?.tagName === 'INPUT' ||
            element?.tagName === 'TEXTAREA' ||
            element?.tagName === 'SELECT');
    };
    const keyDown = (event) => {
        if (typing(event.target) || (embedded && event.target !== surface) || event.defaultPrevented)
            return;
        if ((!widgets.asking || views.modalActive) && views.keyDown(event, embedded)) {
            device = 'keyboard';
            event.preventDefault();
            return;
        }
        // An embedded view's final control leaves Tab to the page.
        if (embedded && event.code === 'Tab')
            return;
        if (KEPT_FROM_PAGE.has(event.code))
            event.preventDefault();
        if (event.repeat)
            return;
        device = 'keyboard';
        physicalKeys.add(event.code);
        if (held.has(event.code))
            return;
        held.add(event.code);
        wentDown.add(event.code);
    };
    const releasePhysicalKey = (code) => {
        if (physicalKeys.delete(code) && !touchHeld.has(code) && held.delete(code))
            cameUp.add(code);
    };
    const keyUp = (event) => releasePhysicalKey(event.code);
    const leaveCanvas = () => {
        // A keyup can go to a page control after focus moves. Retire only this keyboard's presses.
        for (const code of physicalKeys) {
            releasePhysicalKey(code);
            if (!held.has(code))
                wentDown.delete(code);
        }
    };
    const letGo = () => {
        touch.cancelFloating('blur');
        touch.cancel();
        touchHeld.clear();
        touchStick.x = touchStick.y = 0;
        for (const code of held)
            cameUp.add(code);
        held.clear();
        physicalKeys.clear();
        gameplayPadCodes.clear();
        padActive = false;
        pointerOwner = undefined;
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
    const padDown = new Set(), padPressed = new Set();
    let padActive = true, padIndex, padId;
    const activatePad = () => {
        padActive = true;
    };
    const releasePad = (name) => {
        const code = 'Pad:' + name;
        if (gameplayPadCodes.delete(code) && !touchHeld.has(code) && held.delete(code)) {
            wentDown.delete(code);
            cameUp.add(code);
        }
    };
    // A consumed hardware press stays consumed until release, even if it resumed or restarted the game.
    const pollPadButtons = () => {
        if (!padActive || page.visibilityState === 'hidden')
            return;
        const pad = pads?.input.pads[0];
        if (padIndex !== pad?.index || padId !== pad?.id) {
            for (const name of padDown)
                releasePad(name);
            padDown.clear();
            padIndex = pad?.index;
            padId = pad?.id;
        }
        if (pad === undefined)
            return;
        padPressed.clear();
        for (const name of PAD_BUTTONS) {
            let down = false;
            try {
                down = pad.standard && pad.pressed(name);
            }
            catch {
                down = false;
            }
            if (down) {
                if (!padDown.has(name))
                    padPressed.add(name);
                padDown.add(name);
            }
            else if (padDown.delete(name)) {
                releasePad(name);
            }
        }
        if (padDown.size === 0)
            return;
        if (padPressed.size > 0)
            device = 'gamepad';
        const version = generation;
        const claimed = views.padButtons(padPressed, widgets.asking);
        if (disposed || version !== generation)
            return;
        for (const name of claimed)
            releasePad(name);
        for (const name of padPressed) {
            if (claimed.has(name))
                continue;
            const code = 'Pad:' + name;
            gameplayPadCodes.add(code);
            if (!held.has(code)) {
                held.add(code);
                wentDown.add(code);
            }
        }
    };
    // Keys a finger holds through a button on the glass, and where a stick on the glass is.
    const touchHeld = new Set(), touchStick = { x: 0, y: 0 };
    const keys = {
        down: (...names) => any(held, names),
        pressed: (...names) => any(wentDown, names),
        released: (...names) => any(cameUp, names),
        axis() {
            let x = (any(held, ['right', 'd', 'pad:right']) ? 1 : 0) - (any(held, ['left', 'a', 'pad:left']) ? 1 : 0), y = (any(held, ['down', 's', 'pad:down']) ? 1 : 0) - (any(held, ['up', 'w', 'pad:up']) ? 1 : 0);
            const length = x !== 0 && y !== 0 ? Math.SQRT1_2 : 1;
            x *= length;
            y *= length;
            // A stick on the glass, then the pad's left stick, when no key is held.
            const pushed = touchStick.x !== 0 || touchStick.y !== 0 ? touchStick : stick('left');
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
        pressed: false,
        released: false,
        swipe: undefined,
        fromX: 0,
        fromY: 0
    };
    // The first move a page sees has no move before it, and some browsers give it the whole way from the corner.
    let seenMove = false;
    // This convenience view follows one drag; the shared UI router still receives every contact.
    let pointerOwner;
    const moved = (event) => {
        touch.move(event);
        if (pointerOwner !== undefined
            ? event.pointerId !== pointerOwner
            : event.pointerType === 'touch' || event.buttons !== 0)
            return;
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
        if (!event.ctrlKey && !widgets.asking && finite(event.deltaY) && event.deltaY !== 0) {
            const at = browser.toStage(event.clientX, event.clientY);
            if (finite(at.x) && finite(at.y) && views.wheel(at.x, at.y, event.deltaY, event.deltaMode)) {
                event.preventDefault();
                return;
            }
        }
        if (finite(event.deltaY))
            point.wheel += event.deltaY > 0 ? 1 : event.deltaY < 0 ? -1 : 0;
        // The wheel turns the game, not the page under it.
        event.preventDefault();
    };
    const place = (event) => {
        const at = browser.toStage(event.clientX, event.clientY);
        if (finite(at.x) && finite(at.y)) {
            point.x = at.x - shown.designRect.x;
            point.y = at.y - shown.designRect.y;
        }
    };
    // The sprites a tap is given to. A press on one of them is the sprite's, and is not also told as `pressed`: a game
    // that places something wherever the stage is pressed would place it under its own buttons.
    let tappable = [];
    // Sprites that take taps or gestures and have children but no hit area of their own: each is given its bounds,
    // children included, as its area, again at each step while they move, and until the game sets an area itself.
    const boundsAreas = new Map();
    const sameArea = (a, b) => a === b ||
        (a !== undefined && b !== undefined && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height);
    const fitBoundsArea = (node) => {
        const given = boundsAreas.get(node);
        if (node.isDisposed || !sameArea(node.hitArea, given)) {
            // Ended, or the game gave it an area of its own.
            boundsAreas.delete(node);
            return;
        }
        const bounds = node.getBounds();
        const next = bounds.width > 0 && bounds.height > 0
            ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
            : undefined;
        if (sameArea(next, given))
            return;
        node.hitArea = next;
        boundsAreas.set(node, next);
    };
    const areaFromBounds = (node) => {
        if (boundsAreas.has(node) || node.hitArea !== undefined)
            return;
        if (!(node instanceof Sprite) || node.numChildren === 0)
            return;
        boundsAreas.set(node, undefined);
        fitBoundsArea(node);
    };
    // Sprites of onTap with a name: their buttons in the semantic tree.
    const tapButtons = new Map();
    let tapButtonCount = 0;
    const pointerDown = (event) => {
        device = event.pointerType === 'touch' ? 'touch' : 'mouse';
        if (embedded)
            surface.focus({ preventScroll: true });
        // A finger on a stick or a button on the glass is that control's, and not the game's pointer.
        if (touch.claim(event)) {
            event.preventDefault();
            return;
        }
        if (pointerOwner !== undefined)
            return;
        pointerOwner = event.pointerId;
        place(event);
        tappable = tappable.filter(node => !node.isDisposed);
        point.pressed = !tappable.some(node => pointer.over(node));
        point.fromX = point.x;
        point.fromY = point.y;
        // Keys reach the page only once it has been clicked, where the game sits in a frame.
        if (!embedded)
            win.focus?.();
    };
    const pointerUp = (event) => {
        if (touch.end(event))
            return;
        if (event.pointerId !== pointerOwner)
            return;
        pointerOwner = undefined;
        place(event);
        point.released = true;
        const dx = point.x - point.fromX, dy = point.y - point.fromY;
        if (Math.max(Math.abs(dx), Math.abs(dy)) >= SWIPE)
            point.swipe = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    };
    const pointerCancel = (event) => {
        if (touch.end(event))
            return;
        if (event.pointerId === pointerOwner)
            pointerOwner = undefined;
    };
    const pointer = {
        get x() {
            return point.x;
        },
        get y() {
            return point.y;
        },
        get down() {
            return pointerOwner !== undefined;
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
    const keyboardTarget = embedded ? surface : win;
    const addedTabIndex = embedded && !surface.hasAttribute('tabindex');
    if (addedTabIndex)
        surface.tabIndex = 0;
    const listening = [
        [keyboardTarget, 'keydown', keyDown],
        [keyboardTarget, 'keyup', keyUp],
        [win, 'blur', letGo],
        [win, 'focus', activatePad],
        [surface, 'pointerdown', pointerDown],
        [win, 'pointermove', moved],
        [surface, 'wheel', turned],
        [win, 'pointerup', pointerUp],
        [win, 'pointercancel', pointerCancel]
    ];
    if (embedded)
        listening.push([surface, 'blur', leaveCanvas]);
    let resizeObserver;
    if (revision !== undefined) {
        // Input is observed after its ordinary dispatch. A burst of events requests only the next submitted frame.
        for (const [target, type] of [...listening])
            listening.push([target, type, invalidate]);
        listening.push([win, 'resize', invalidate], [page, 'visibilitychange', invalidate], [surface, 'webglcontextrestored', invalidate]);
        if (typeof ResizeObserver === 'function') {
            resizeObserver = new ResizeObserver(invalidate);
            resizeObserver.observe(surface);
        }
    }
    for (const [target, type, listener] of listening)
        target.addEventListener(type, listener, { passive: false });
    // Only the built-in mixer belongs to this game. Opting out also skips its browser gesture listeners.
    const mixer = options.audio === false ? undefined : scope.use(createBrowserAudio({ limiter: true })).mixer;
    const sounds = new Map();
    const RATE = 22050;
    const make = async (name, recipe) => {
        if (mixer === undefined)
            return;
        try {
            sounds.set(name, await mixer.decode(encodeWav([synthesizeSfx(recipe, RATE)], RATE)));
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
            if (mixer === undefined || sound === undefined || muted)
                return;
            const loud = Math.max(0, Math.min(1, (finite(given.volume) ? given.volume : 1) * volume)), rate = Math.max(0.25, Math.min(4, finite(given.pitch) ? given.pitch : 1)), pan = Math.max(-1, Math.min(1, finite(given.pan) ? given.pan : 0));
            try {
                mixer.play(sound, { volume: loud, rate, pan, maxInstances: 6 });
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
            const made = new PlayingLoop(sounds.get(name), mixer, finite(given.volume) ? given.volume : 1, finite(given.pitch) ? given.pitch : 1, finite(given.pan) ? given.pan : 0, finite(given.fadeIn) ? given.fadeIn : 0);
            if (mixer === undefined)
                return made;
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
    // Music: the parts of one piece looped together, each a loop whose loudness follows the intensity.
    let musicParts = [], musicIntensity = 0.5, musicVolume = 0.6, musicMood, musicTicket = 0;
    const musicTick = (seconds) => {
        if (musicParts.length === 0)
            return;
        const mix = musicMix(musicIntensity), rate = Math.min(1, seconds / 1.5);
        for (const entry of musicParts) {
            const wanted = musicVolume * mix[entry.part];
            if (Math.abs(wanted - entry.level) < 1e-3)
                continue;
            entry.level += (wanted - entry.level) * rate;
            entry.loop.volume = entry.level;
        }
    };
    const endMusic = (seconds) => {
        musicTicket++;
        for (const { loop } of musicParts)
            loop.stop(seconds);
        musicParts = [];
        musicMood = undefined;
    };
    const music = {
        async play(given = 'calm') {
            const chosen = typeof given === 'string' ? { mood: given } : (given ?? {});
            if (chosen === null || typeof chosen !== 'object')
                throw invalid('music.play takes a mood or { mood, seed, tempo, bars }');
            if (mixer === undefined) {
                if (!MUSIC_MOODS.includes(chosen.mood ?? 'calm'))
                    throw invalid('the mood of music is one of: ' + MUSIC_MOODS.join(', '));
                return;
            }
            let piece;
            try {
                piece = composeMusic(chosen, RATE);
            }
            catch (cause) {
                throw invalid(cause instanceof Error ? cause.message : 'music.play takes a mood');
            }
            const ticket = ++musicTicket;
            const made = await Promise.all(MUSIC_PARTS.map(part => mixer.decode(encodeWav([piece.parts[part]], piece.rate)).catch(() => undefined)));
            // A newer piece, a stop or the end of the game came while this one was being made.
            if (ticket !== musicTicket || disposed)
                return;
            for (const { loop } of musicParts)
                loop.stop(1.2);
            const mix = musicMix(musicIntensity);
            musicParts = MUSIC_PARTS.map((part, index) => {
                const level = musicVolume * mix[part], loop = new PlayingLoop(made[index], mixer, level, 1, 0, 1.2);
                loops.add(loop);
                loop.heard(muted ? 0 : volume);
                if (paused)
                    loop.hold(true);
                return { part, loop, level };
            });
            musicMood = piece.mood;
        },
        stop(seconds = 1) {
            endMusic(finite(seconds) && seconds >= 0 ? seconds : 1);
        },
        get intensity() {
            return musicIntensity;
        },
        set intensity(value) {
            if (finite(value))
                musicIntensity = Math.max(0, Math.min(1, value));
        },
        get volume() {
            return musicVolume;
        },
        set volume(value) {
            if (finite(value))
                musicVolume = Math.max(0, Math.min(1, value));
        },
        get mood() {
            return musicMood;
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
    const labelVisibility = new Set();
    let labelVisibilityQueued = false;
    const syncLabelVisibility = () => {
        for (const sync of labelVisibility)
            sync();
    };
    const prepareLabelVisibility = () => {
        if (labelVisibilityQueued)
            return;
        labelVisibilityQueued = true;
        // A page switch can hide a group and create its replacement in one event turn, before the next frame.
        queueMicrotask(() => {
            labelVisibilityQueued = false;
            if (!disposed)
                syncLabelVisibility();
        });
    };
    // What update makes in every frame, to be told once: a text, a shape or a sprite made each frame is drawn anew each
    // frame, where made once in setup it would only change.
    let inUpdate = false, making = 0;
    const madeThisFrame = new Set(), madeStreak = new Map(), toldMade = new Set();
    const made = (call) => {
        if (inUpdate && making === 0)
            madeThisFrame.add(call);
    };
    const noteMade = () => {
        for (const call of new Set([...madeStreak.keys(), ...madeThisFrame])) {
            if (!madeThisFrame.has(call)) {
                madeStreak.delete(call);
                continue;
            }
            const frames = (madeStreak.get(call) ?? 0) + 1;
            madeStreak.set(call, frames);
            if (frames === MADE_EVERY_FRAMES && !toldMade.has(call)) {
                toldMade.add(call);
                tellWarning({
                    code: 'PLAY_MADE_EVERY_FRAME',
                    message: `${call} was called in update in each of the last ${MADE_EVERY_FRAMES} frames: make it once in setup and change it when it changes.`
                });
            }
        }
        madeThisFrame.clear();
    };
    const tellWarning = (warning) => {
        const frozen = Object.freeze(warning);
        const agent = globalThis.__egretAgent;
        if (typeof agent?.warning === 'function')
            try {
                agent.warning(frozen);
            }
            catch {
                /* The tool's own failure, not the game's. */
            }
        // A handler that throws is a failure of the frame, as an update that throws is.
        options.onWarning?.(frozen);
    };
    const text = (given, o = {}) => {
        made('game.text');
        if (o === null || typeof o !== 'object')
            throw invalid('the options of a text are an object');
        const { size = 24, color = 0xffffff, align = 'left', bold = false } = o;
        const { fontFamily, fontWeight = bold ? 700 : 400, italic = false } = o;
        if (fontFamily !== undefined && (typeof fontFamily !== 'string' || !fontFamily.trim() || fontFamily.length > 256))
            throw invalid('fontFamily is one nonempty family, at most 256 characters');
        if (!Number.isInteger(fontWeight) || fontWeight < 1 || fontWeight > 1000 || typeof italic !== 'boolean')
            throw invalid('fontWeight is an integer from 1 to 1000, italic is true or false');
        if (!finite(size) || size <= 0 || !colour(color))
            throw invalid('a text has a size above 0 and a colour');
        if (align !== 'left' && align !== 'center' && align !== 'right')
            throw invalid("align is 'left', 'center' or 'right'");
        const vertical = o.vertical;
        if (vertical !== undefined &&
            typeof vertical !== 'boolean' &&
            (vertical === null ||
                typeof vertical !== 'object' ||
                (vertical.column !== undefined && !(Number.isInteger(vertical.column) && vertical.column >= 1))))
            throw invalid('vertical is true or { column } with a whole number of characters');
        // What the label draws: the words, or their rows when written vertically.
        const drawn = (words) => vertical === undefined || vertical === false
            ? words
            : verticalPlayWords(words, typeof vertical === 'object' ? (vertical.column ?? Infinity) : Infinity);
        // The words are drawn on pages shared with the game's other texts, so a screen of many short texts takes few of
        // the images a frame may hold.
        let label, rasterActive = true, gone = false, alignRaster = false;
        const round = generation;
        const newRevision = () => {
            const next = pending();
            // A label may be changed or closed without any caller waiting for the old words.
            void next.promise.catch(() => { });
            return next;
        };
        let revision = newRevision();
        let creationFailure;
        let pendingReady;
        const abortRevision = (reason) => {
            const cause = new DOMException(reason, 'AbortError');
            revision.reject(cause);
            revision = newRevision();
            revision.reject(cause);
            pendingReady = undefined;
        };
        const changeRevision = () => {
            revision.reject(new DOMException('Text revision was superseded', 'AbortError'));
            revision = newRevision();
            pendingReady = undefined;
            if (creationFailure !== undefined)
                revision.reject(creationFailure.cause);
            else if (!rasterActive)
                revision.reject(new DOMException('Text is hidden', 'AbortError'));
        };
        // The raster's logical origin is on its own texel grid. Middle baselines and centre alignment can move that
        // origin by half a physical pixel, producing inconsistent sampling (notably missing stems at density 1).
        // Snap only the atlas display, in device pixels, not the authored PlayText/layout position. Keep the transform
        // continuous in the world or under rotated/skewed parents. Reapply after scroll, layout or surface size changes.
        const position = (made) => {
            const box = made.bounds;
            let x = align === 'center' ? -box.width / 2 : align === 'right' ? -box.width : 0;
            let y = o.baseline === 'middle' ? -box.height / 2 : 0;
            if (alignRaster && made.display.numChildren > 0) {
                const picture = made.display.getChildAt(0);
                const lx = x + picture.x, ly = y + picture.y;
                const at = node.localToGlobal(lx, ly);
                const sx = Math.ceil(browser.frame.width * playDensity) / browser.frame.width;
                const sy = Math.ceil(browser.frame.height * playDensity) / browser.frame.height;
                const ax = Math.round(at.x * sx) / sx, ay = Math.round(at.y * sy) / sy;
                if (Math.abs(ax - at.x) > 1e-8 || Math.abs(ay - at.y) > 1e-8) {
                    const offset = node.globalToLocal(ax, ay);
                    x += offset.x - lx;
                    y += offset.y - ly;
                }
            }
            made.display.x = x;
            made.display.y = y;
        };
        const settle = () => {
            if (label === undefined || gone || !rasterActive)
                return;
            const made = label;
            const ready = made.ready;
            if (ready === pendingReady?.ready && revision === pendingReady.revision)
                return;
            const request = { ready, revision };
            pendingReady = request;
            void ready
                .then(() => {
                if (gone || pendingReady !== request)
                    return;
                syncVisibility();
                if (!rasterActive || pendingReady !== request)
                    return;
                position(made);
                made.display.visible = true;
                request.revision.resolve();
            }, cause => {
                if (pendingReady === request)
                    request.revision.reject(cause);
            })
                .catch(cause => {
                if (pendingReady === request)
                    request.revision.reject(cause);
            });
        };
        const removeText = () => {
            if (gone)
                return;
            gone = true;
            abortRevision('Text was removed');
            labelVisibility.delete(syncVisibility);
            label?.dispose();
        };
        const node = scope.use(new PlayText(String(given), next => {
            if (gone)
                return;
            changeRevision();
            if (label === undefined)
                return;
            // A label's old wording must not describe an action after its semantic name changed.
            label.display.visible = false;
            label.text = drawn(next);
            settle();
        }, color, size, style => {
            if (gone)
                return;
            changeRevision();
            if (label === undefined)
                return;
            label.display.visible = false;
            label.set({
                ...(style.color === undefined ? {} : { color: style.color }),
                ...(style.size === undefined ? {} : { fontSize: style.size }),
                ...(style.size !== undefined && vertical !== undefined && vertical !== false
                    ? { lineHeight: style.size * 1.1 }
                    : {})
            });
            settle();
        }, () => revision.promise, removeText));
        node.x = finite(o.x) ? o.x : 0;
        node.y = finite(o.y) ? o.y : 0;
        if (o.baseline !== undefined && o.baseline !== 'top' && o.baseline !== 'middle')
            throw invalid("baseline is 'top' or 'middle'");
        const into = o.layer === undefined || o.layer === 'ui' ? ui : o.layer === 'world' ? world : o.layer;
        if (!(into instanceof Sprite) || into.isDisposed)
            throw invalid("layer is 'ui', 'world' or a sprite");
        into.addChild(node);
        function syncVisibility() {
            if (node.isDisposed || generation !== round) {
                removeText();
                return;
            }
            let next = false, inUi = false, axisAligned = true;
            for (let current = node; current !== undefined; current = current.parent) {
                if (!current.visible || current.alpha === 0)
                    break;
                if (current === ui || current === glass || current === cover)
                    inUi = true;
                if (axisAligned &&
                    (current.rotation % 360 !== 0 ||
                        current.skewX !== 0 ||
                        current.skewY !== 0 ||
                        current.scaleX === 0 ||
                        current.scaleY === 0))
                    axisAligned = false;
                if (current === stage) {
                    next = true;
                    break;
                }
            }
            const wasAligned = alignRaster;
            alignRaster = inUi && axisAligned;
            if (rasterActive !== next) {
                rasterActive = next;
                if (next) {
                    changeRevision();
                }
                else {
                    abortRevision('Text is hidden');
                }
                if (label !== undefined) {
                    label.display.visible = false;
                    label.setRasterActive(next);
                }
                if (next)
                    settle();
            }
            if (next && label !== undefined && label.display.visible && (alignRaster || wasAligned !== alignRaster))
                position(label);
        }
        const words = node.text;
        labelVisibility.add(syncVisibility);
        prepareLabelVisibility();
        browser
            .createAtlasLabel({
            text: drawn(words),
            fontSize: size,
            // A column's characters stand one under another, as close as their size.
            ...(vertical === undefined || vertical === false ? {} : { lineHeight: size * 1.1 }),
            color,
            ...(fontFamily === undefined ? {} : { fontFamily }),
            fontWeight,
            italic,
            locale: o.locale ?? (/[぀-ヿ㐀-鿿가-힯]/.test(words) ? 'zh' : 'en')
        })
            .then(made => {
            if (gone || node.isDisposed || generation !== round) {
                made.dispose();
                removeText();
                return;
            }
            label = made;
            // Hidden until it has been measured, so centred words never show at the wrong place first.
            made.display.visible = false;
            node.addChild(made.display);
            made.setRasterActive(rasterActive);
            syncVisibility();
            if (node.text !== words)
                made.text = drawn(node.text);
            // What was set while the words were being made.
            if (node.color !== color || node.size !== size)
                made.set({
                    color: node.color,
                    fontSize: node.size,
                    ...(vertical === undefined || vertical === false ? {} : { lineHeight: node.size * 1.1 })
                });
            settle();
        }, cause => {
            // No label exists to retry the request. Preserve the actual failure for later revisions as well.
            if (gone)
                return;
            creationFailure = { cause };
            revision.reject(cause);
        });
        removers.set(node, removeText);
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
    // The seconds of the wall this frame, for what follows the state at its end: the views and their semantics.
    let frameSeconds = 0;
    const endFrame = () => {
        const seconds = frameSeconds;
        frameSeconds = 0;
        if (!disposed) {
            views.tick(seconds);
            syncLabelVisibility();
            if (options.semantics !== undefined)
                try {
                    options.semantics.publish();
                }
                catch (cause) {
                    failure ??= { cause };
                }
        }
        endRemoved();
        touch.sync();
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
    let setupRequest;
    // Publish the promise before invoking code that can reenter restart or disposal.
    function pending() {
        let resolve, reject;
        const promise = new Promise((done, fail) => {
            resolve = done;
            reject = fail;
        });
        return { promise, resolve, reject };
    }
    function step(real, seconds) {
        frameSeconds = real;
        for (const node of [...boundsAreas.keys()])
            fitBoundsArea(node);
        for (const [node, button] of [...tapButtons])
            if (node.isDisposed) {
                tapButtons.delete(node);
                button.remove();
            }
        if (failure !== undefined) {
            const { cause } = failure;
            failure = undefined;
            throw cause;
        }
        const version = generation;
        let padSampled = pads !== undefined;
        try {
            pads?.poll();
        }
        catch {
            // A browser read can fail. Do not route a stale sample from the last successful poll.
            padSampled = false;
        }
        if (padSampled)
            pollPadButtons();
        // A modal may open between steps while the floating stick's owner stays down.
        touch.sync();
        if (disposed || version !== generation || playLoop.state !== 'running') {
            endFrame();
            return;
        }
        const active = () => !disposed &&
            api !== undefined &&
            !paused &&
            stopped <= 0 &&
            version === generation &&
            playLoop.state === 'running';
        // Bars, boxes of words and menus answer while the game is paused, as buttons do, and while `setup` awaits one.
        if (!disposed && playLoop.state === 'running') {
            widgets.tick(real);
            musicTick(real);
        }
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
            inUpdate = true;
            try {
                update?.(seconds, api);
            }
            finally {
                inUpdate = false;
            }
            noteMade();
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
        world.x = effects.x = shown.designRect.x + dx - view.x;
        world.y = effects.y = shown.designRect.y + dy - view.y;
        if (flashLeft > 0) {
            flashLeft -= real;
            cover.alpha = Math.max(0, flashLeft / flashSpan) * (reduced ? 0.3 : 0.85);
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
    function resetRound() {
        endMusic(0.3);
        widgets.reset();
        views.reset();
        badges.clear();
        touch.reset();
        touchHeld.clear();
        touchStick.x = touchStick.y = 0;
        timers = [];
        stopLoops();
        stopMotions();
        for (const made of [world, ui, glass])
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
    }
    function runSetup(restarting) {
        if (setupRequest !== undefined)
            return setupRequest.promise;
        const request = pending();
        setupRequest = request;
        generation++;
        api = undefined;
        void (async () => {
            try {
                if (restarting) {
                    failure = undefined;
                    resetRound();
                }
                if (disposed)
                    return;
                await setup?.(game);
                if (disposed)
                    return;
                options.arrange?.(game);
                if (disposed)
                    return;
                // A tap that returned an unsuccessful restart may have failed the loop.
                // An explicit retry resumes it, while a deliberately stopped loop stays idle.
                if (restarting && playLoop.state === 'failed')
                    playLoop.start();
                api = game;
                request.resolve();
            }
            catch (cause) {
                // Failed setup may already have placed objects or scheduled work.
                // Keep updates suspended and leave a clean scene for the next attempt.
                if (restarting && !disposed) {
                    try {
                        resetRound();
                    }
                    catch (cleanupFailure) {
                        request.reject(new AggregateError([cause, cleanupFailure], 'Play restart and cleanup failed'));
                        return;
                    }
                }
                request.reject(cause);
            }
            finally {
                if (setupRequest === request)
                    setupRequest = undefined;
            }
        })();
        return request.promise;
    }
    const game = {
        invalidate,
        get width() {
            return shown.design.width;
        },
        get height() {
            return shown.design.height;
        },
        get orientation() {
            return shown.orientation;
        },
        get screen() {
            return Object.freeze({
                // Never -0, which a test of equality tells from 0.
                x: -shown.designRect.x || 0,
                y: -shown.designRect.y || 0,
                width: shown.width,
                height: shown.height
            });
        },
        get safe() {
            return Object.freeze({
                x: shown.safe.x - shown.designRect.x || 0,
                y: shown.safe.y - shown.designRect.y || 0,
                width: shown.safe.width,
                height: shown.safe.height
            });
        },
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
            made('game.sprite');
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
            made('game.rect');
            making++;
            let node;
            try {
                node = game.sprite(g => {
                    g.beginFill(color)
                        .drawRect(-w / 2, -h / 2, w, h)
                        .endFill();
                }, into);
            }
            finally {
                making--;
            }
            node.x = x;
            node.y = y;
            return node;
        },
        circle(x, y, radius, color, into) {
            if (![x, y, radius].every(finite) || radius < 0 || !colour(color))
                throw invalid('circle takes x, y, a radius and a colour');
            if (into !== undefined && !(into instanceof Sprite))
                throw invalid('the layer of a circle is a sprite');
            made('game.circle');
            making++;
            let node;
            try {
                node = game.sprite(g => {
                    g.beginFill(color).drawCircle(0, 0, radius).endFill();
                }, into);
            }
            finally {
                making--;
            }
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
            made('game.button');
            making++;
            try {
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
            }
            finally {
                making--;
            }
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
        onTap(node, callback, tapOptions) {
            if (typeof callback !== 'function')
                throw invalid('onTap takes a sprite and a function');
            if (tapOptions !== undefined && (tapOptions === null || typeof tapOptions !== 'object'))
                throw invalid('the options of onTap are { name }');
            const name = tapOptions?.name;
            if (name !== undefined && (typeof name !== 'string' || name.trim() === '' || name.length > 1024))
                throw invalid('the name of a tap is words');
            const tap = (activation) => {
                const round = generation;
                tapListener(() => callback(activation), cause => {
                    // A delayed input callback belongs to the round that received the press.
                    if (!disposed && generation === round)
                        failure ??= { cause };
                })();
            };
            if (name !== undefined && options.semantics !== undefined) {
                tapButtons.get(node)?.remove();
                tapButtons.set(node, options.semantics.add({
                    id: 'play-tap-' + ++tapButtonCount,
                    role: 'button',
                    describe: () => {
                        const box = node.isDisposed ? undefined : boxOf(node);
                        let shownNow = box !== undefined;
                        for (let at = node; shownNow && at !== undefined; at = at.parent) {
                            if (at.isDisposed || !at.visible || at.alpha === 0)
                                shownNow = false;
                            else if (at === stage)
                                break;
                            else if (at.parent === undefined)
                                shownNow = false;
                        }
                        return {
                            name,
                            bounds: box === undefined
                                ? { x: 0, y: 0, width: 0, height: 0 }
                                : { x: box.left, y: box.top, width: box.right - box.left, height: box.bottom - box.top },
                            hidden: !shownNow
                        };
                    },
                    onActivate: () => tap(semanticTapActivation(node))
                }));
            }
            if (browser.pointer === undefined)
                return;
            node.touchEnabled = true;
            node.on(browser.pointer.events.tap, event => tap(pointerTapActivation(node, event)));
            areaFromBounds(node);
            if (!tappable.includes(node))
                tappable.push(node);
        },
        toStage(x, y) {
            if (!finite(x) || !finite(y))
                throw invalid('toStage takes two numbers');
            return { x: x + shown.designRect.x, y: y + shown.designRect.y };
        },
        fromStage(x, y) {
            if (!finite(x) || !finite(y))
                throw invalid('fromStage takes two numbers');
            return { x: x - shown.designRect.x, y: y - shown.designRect.y };
        },
        gestures(node, handlers) {
            if (handlers === null || typeof handlers !== 'object')
                throw invalid('gestures takes a sprite and { hold, doubleTap, drag, swipe, pinch }');
            for (const name of ['doubleTap', 'hold', 'drag', 'swipe', 'pinch'])
                if (handlers[name] !== undefined && typeof handlers[name] !== 'function')
                    throw invalid('gestures: ' + name + ' is a function');
            const input = browser.pointer;
            if (input === undefined)
                return () => { };
            node.touchEnabled = true;
            areaFromBounds(node);
            if (!tappable.includes(node))
                tappable.push(node);
            const round = generation;
            // Places in the game's units; what a handler throws stops the game, as a tap's does.
            const told = (handler, place) => handler === undefined
                ? undefined
                : (value) => {
                    if (disposed || generation !== round)
                        return;
                    try {
                        handler(place(value));
                    }
                    catch (cause) {
                        failure ??= { cause };
                    }
                };
            const inGame = (value) => Object.freeze({ ...value, x: value.x - shown.designRect.x, y: value.y - shown.designRect.y });
            const made = createGestures({
                engine,
                scope,
                input,
                target: node,
                ...(handlers.doubleTap === undefined ? {} : { onDoubleTap: told(handlers.doubleTap, inGame) }),
                ...(handlers.hold === undefined ? {} : { onHold: told(handlers.hold, inGame) }),
                ...(handlers.drag === undefined ? {} : { onDrag: told(handlers.drag, inGame) }),
                ...(handlers.swipe === undefined ? {} : { onSwipe: told(handlers.swipe, swipe => swipe) }),
                ...(handlers.pinch === undefined ? {} : { onPinch: told(handlers.pinch, inGame) })
            });
            return () => made.dispose();
        },
        show(description, viewOptions) {
            return views.view(description, viewOptions);
        },
        dragAndDrop() {
            const input = browser.pointer;
            if (input === undefined)
                throw invalid('drag and drop needs pointer input');
            const made = createDragAndDrop({ engine, scope, input, layer: glass });
            const guarded = (fn) => (...args) => {
                try {
                    fn(...args);
                }
                catch (cause) {
                    failure ??= { cause };
                }
            };
            return {
                source(node, o) {
                    if (o === null || typeof o !== 'object' || typeof o.data !== 'function')
                        throw invalid('source takes a sprite and { data, ghost }');
                    node.touchEnabled = true;
                    areaFromBounds(node);
                    if (!tappable.includes(node))
                        tappable.push(node);
                    return made.source({ node, data: o.data, ...(o.ghost === undefined ? {} : { ghost: o.ghost }) });
                },
                target(node, o) {
                    if (o === null || typeof o !== 'object' || typeof o.drop !== 'function')
                        throw invalid('target takes a sprite and { drop, accepts, hover }');
                    return made.target({
                        node,
                        drop: guarded((data) => o.drop(data)),
                        ...(o.accepts === undefined ? {} : { accepts: o.accepts }),
                        ...(o.hover === undefined ? {} : { hover: guarded(o.hover) })
                    });
                },
                get dragging() {
                    return made.dragging;
                }
            };
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
        tiles(rows, o = {}) {
            if (!Array.isArray(rows) || rows.length === 0 || rows.some(row => typeof row !== 'string'))
                throw invalid('tiles takes rows of characters');
            const size = finite(o?.size) && o.size > 0 ? o.size : 32, solid = typeof o?.solid === 'string' ? o.solid : '#', colors = { '#': 0x6b7280, ...(o?.colors ?? {}) }, cells = rows.map(row => [...row]), columns = Math.max(...cells.map(row => row.length)), node = game.sprite(undefined, o?.layer ?? world);
            node.x = finite(o?.x) ? o.x : 0;
            node.y = finite(o?.y) ? o.y : 0;
            const draw = () => {
                const g = node.graphics.clear();
                // An empty fill over the whole map keeps its bounds those of the map.
                g.beginFill(0, 0)
                    .drawRect(0, 0, columns * size, cells.length * size)
                    .endFill();
                for (let row = 0; row < cells.length; row++)
                    for (let column = 0; column < cells[row].length; column++) {
                        const color = colors[cells[row][column]];
                        if (colour(color))
                            g.beginFill(color)
                                .drawRect(column * size, row * size, size, size)
                                .endFill();
                    }
            };
            draw();
            const at = (column, row) => cells[row]?.[column] ?? '';
            const cellAt = (x, y) => ({
                column: Math.floor((x - node.x) / size),
                row: Math.floor((y - node.y) / size)
            });
            const corner = (column, row) => node.localToGlobal(column * size, row * size);
            return {
                sprite: node,
                columns,
                rows: cells.length,
                size,
                at,
                set(column, row, character) {
                    if (cells[row] === undefined || column < 0 || column >= columns || typeof character !== 'string')
                        return;
                    cells[row][column] = character.slice(0, 1) || ' ';
                    draw();
                },
                cellAt,
                solidAt(x, y) {
                    const cell = cellAt(x, y);
                    return solid.includes(at(cell.column, cell.row) || '\u0000');
                },
                pushOut(a) {
                    if (!seen(a) || !seen(node))
                        return undefined;
                    const first = boxOf(a);
                    if (first === undefined)
                        return undefined;
                    const origin = corner(0, 0), far = corner(1, 1), unitX = far.x - origin.x, unitY = far.y - origin.y;
                    if (!(unitX > 0) || !(unitY > 0))
                        return undefined;
                    let moveX = 0, moveY = 0;
                    // Out of the most overlapped solid tile first, then of what still overlaps, a few times at most.
                    for (let round = 0; round < 4; round++) {
                        const box = {
                            left: first.left + moveX,
                            right: first.right + moveX,
                            top: first.top + moveY,
                            bottom: first.bottom + moveY
                        };
                        let best, most = 0;
                        const c0 = Math.floor((box.left - origin.x) / unitX), c1 = Math.floor((box.right - origin.x) / unitX), r0 = Math.floor((box.top - origin.y) / unitY), r1 = Math.floor((box.bottom - origin.y) / unitY);
                        for (let row = Math.max(0, r0); row <= Math.min(cells.length - 1, r1); row++)
                            for (let column = Math.max(0, c0); column <= Math.min(columns - 1, c1); column++) {
                                if (!solid.includes(at(column, row) || '\u0000'))
                                    continue;
                                const cell = {
                                    left: origin.x + column * unitX,
                                    right: origin.x + (column + 1) * unitX,
                                    top: origin.y + row * unitY,
                                    bottom: origin.y + (row + 1) * unitY
                                };
                                if (!meet(box, cell, 0))
                                    continue;
                                const area = (Math.min(box.right, cell.right) - Math.max(box.left, cell.left)) *
                                    (Math.min(box.bottom, cell.bottom) - Math.max(box.top, cell.top));
                                if (area <= most)
                                    continue;
                                most = area;
                                const left = cell.left - box.right, right = cell.right - box.left, up = cell.top - box.bottom, down = cell.bottom - box.top;
                                const x = -left < right ? left : right, y = -up < down ? up : down;
                                best = Math.abs(x) < Math.abs(y) ? { x, y: 0 } : { x: 0, y };
                            }
                        if (best === undefined)
                            break;
                        moveX += best.x;
                        moveY += best.y;
                    }
                    return moveX === 0 && moveY === 0 ? undefined : { x: moveX, y: moveY };
                }
            };
        },
        mix(a, b, t) {
            if (!colour(a) || !colour(b) || !finite(t))
                throw invalid('mix takes two colours 0xRRGGBB and a number');
            const k = Math.min(1, Math.max(0, t)), part = (shift) => Math.round(((a >> shift) & 255) + (((b >> shift) & 255) - ((a >> shift) & 255)) * k) << shift;
            return part(16) | part(8) | part(0);
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
        get reducedMotion() {
            return reduced;
        },
        set reducedMotion(value) {
            if (typeof value !== 'boolean')
                throw invalid('reducedMotion is true or false');
            reduced = value;
            followSystem = false;
            if (value)
                shakeLeft = 0;
        },
        shake(amount = 6, seconds = 0.25) {
            if (reduced || !finite(amount) || !finite(seconds) || amount <= 0 || seconds <= 0)
                return;
            shakeAmount = Math.max(shakeLeft > 0 ? shakeAmount : 0, Math.min(amount, Math.max(game.width, game.height)));
            shakeLeft = shakeSpan = Math.min(seconds, 5);
        },
        flash(color = 0xffffff, seconds = 0.15) {
            if (!colour(color) || !finite(seconds) || seconds <= 0)
                return;
            cover.graphics.clear().beginFill(color).drawRect(0, 0, shown.width, shown.height).endFill();
            cover.visible = true;
            cover.alpha = reduced ? 0.3 : 0.85;
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
            touch.cancelFloating();
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
        restart() {
            return disposed ? Promise.resolve() : runSetup(true);
        },
        async image(url, o = {}) {
            if (typeof url !== 'string' || url === '')
                throw invalid('image takes the address of a picture');
            if (o === null || typeof o !== 'object')
                throw invalid('the options of an image are an object');
            const into = o.layer === undefined || o.layer === 'world' ? world : o.layer === 'ui' ? ui : o.layer;
            if (!(into instanceof Sprite) || into.isDisposed)
                throw invalid("layer is 'ui', 'world' or a sprite");
            const round = generation;
            const lease = await browser.loadTexture(url);
            if (disposed || generation !== round || into.isDisposed || left.has(into)) {
                lease.release();
                throw invalid('the layer stopped accepting this image while it loaded');
            }
            const holder = scope.use(new Sprite());
            let picture;
            try {
                picture = scope.use(new Bitmap(lease));
            }
            catch (cause) {
                holder.dispose();
                lease.release();
                throw cause;
            }
            picture.sharedMaterial = o.smooth === false ? SHARP : SMOOTH;
            const own = { width: picture.width, height: picture.height }, w = finite(o.width) && o.width > 0 ? o.width : undefined, h = finite(o.height) && o.height > 0 ? o.height : undefined;
            const sx = w !== undefined ? w / own.width : h !== undefined ? h / own.height : 1, sy = h !== undefined ? h / own.height : sx;
            picture.scaleX = sx;
            picture.scaleY = sy;
            picture.x = (-own.width * sx) / 2;
            picture.y = (-own.height * sy) / 2;
            holder.addChild(picture);
            holder.x = finite(o.x) ? o.x : 0;
            holder.y = finite(o.y) ? o.y : 0;
            into.addChild(holder);
            removers.set(holder, () => {
                // Detach the bitmap before revoking its texture lease. Its disposal still follows the normal frame boundary.
                game.remove(picture);
                lease.release();
            });
            return holder;
        },
        bar: options => widgets.bar(options),
        toast: (words, options) => widgets.toast(words, options),
        say: (words, options) => widgets.say(words, options),
        menu: (items, options) => widgets.menu(items, options),
        get asking() {
            return widgets.asking || views.asking;
        },
        get device() {
            return device;
        },
        confirm: (question, confirmOptions) => views.confirm(question, confirmOptions),
        hints: list => views.hints(list),
        loading: (tasks, loadingOptions) => views.loading(tasks, loadingOptions),
        badges,
        compact: (value, compactOptions) => formatCompact(value, { locale: /^zh\b/i.test(win.navigator?.language ?? '') ? 'zh' : 'en', ...compactOptions }),
        request: send => createRequest(send),
        touchStick: options => touch.stick(options),
        touchButton: (words, options) => touch.button(words, options),
        music,
        browser,
        engine,
        scope,
        canvas: surface,
        dispose() {
            if (disposal !== undefined)
                return disposal;
            const close = pending();
            disposal = close.promise;
            disposed = true;
            api = undefined;
            unwatchMotion();
            // Caller-controlled loading can outlive the game. Release its waiters now;
            // late completion cannot re-enable updates or restart the closed loop.
            setupRequest?.reject(new EgretError('SCOPE_CLOSED'));
            setupRequest = undefined;
            void (async () => {
                let touchFailure;
                try {
                    touch.cancelFloating('dispose');
                }
                catch (cause) {
                    touchFailure = { cause };
                }
                try {
                    stopLoops();
                    resizeObserver?.disconnect();
                    for (const [target, type, listener] of listening)
                        target.removeEventListener(type, listener);
                    if (addedTabIndex && surface.getAttribute('tabindex') === '0')
                        surface.removeAttribute('tabindex');
                    await browser.dispose();
                    if (touchFailure !== undefined)
                        throw touchFailure.cause;
                }
                finally {
                    holder?.remove();
                }
            })().then(close.resolve, close.reject);
            return disposal;
        }
    };
    cover.visible = false;
    // A menu or a box of words that the first `setup` awaits starts the frames, so it is seen and answered. Otherwise
    // they start when `setup` has finished, as they always have. The game's own steps, timers and tweens begin then.
    const widgets = createPlayWidgets(game, () => {
        if (!disposed && browser.loop.state === 'idle')
            browser.loop.start();
    });
    const views = createPlayViews(game, {
        failed: cause => {
            failure ??= { cause };
        },
        semantics: () => options.semantics
    });
    const touch = createPlayTouch(game, {
        hold(key) {
            const code = codeOf(key);
            touchHeld.add(code);
            if (!held.has(code)) {
                held.add(code);
                wentDown.add(code);
            }
        },
        letGo(key) {
            const code = codeOf(key);
            touchHeld.delete(code);
            if (!physicalKeys.has(code) && !gameplayPadCodes.has(code) && held.delete(code))
                cameUp.add(code);
        },
        stick(x, y) {
            touchStick.x = x;
            touchStick.y = y;
        },
        toStage: (x, y) => {
            const at = browser.toStage(x, y);
            return { x: at.x - shown.designRect.x, y: at.y - shown.designRect.y };
        },
        cssScale() {
            const box = surface.getBoundingClientRect();
            return { x: box.width / browser.frame.width, y: box.height / browser.frame.height };
        },
        allowFloating: () => !disposed && !paused && !widgets.asking && !views.modalActive,
        failed: cause => {
            failure ??= { cause };
        },
        layer: glass
    });
    // The window changed size or turned: the layers move to the design's new place and the game arranges itself.
    baseBrowser.onScreenChange(next => {
        shown = next;
        placeLayers();
        point.x = Math.min(point.x, game.width);
        point.y = Math.min(point.y, game.height);
        if (!disposed)
            views.arrange();
        if (api === undefined || disposed || options.arrange === undefined)
            return;
        try {
            options.arrange(game);
        }
        catch (cause) {
            // As what `update` throws: the game stops at its next step and is told.
            failure ??= { cause };
        }
    });
    try {
        if (mixer !== undefined)
            await Promise.all(Object.entries(SFX_PRESETS).map(([name, recipe]) => make(name, recipe)));
        await runSetup(false);
        if (disposed)
            throw new EgretError('SCOPE_CLOSED');
        if (browser.loop.state === 'idle')
            browser.loop.start();
    }
    catch (cause) {
        try {
            await game.dispose();
        }
        catch (cleanupFailure) {
            throw new AggregateError([cause, cleanupFailure], 'Play setup and cleanup failed');
        }
        throw cause;
    }
    return game;
}
