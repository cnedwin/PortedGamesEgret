// SPDX-License-Identifier: Apache-2.0
// The texts of a play game: `game.text` makes a sprite whose words are drawn on pages shared with the game's other
// texts, hidden while it is not on the stage, and given the words it was last told once they are drawn.
import { EgretError } from '@egret/runtime';
import { Sprite } from '@egret/engine';
import { verticalPlayWords } from './playWidgets.js';
const invalid = (why) => new EgretError('PLAY_OPTIONS_INVALID', { cause: new Error(why) });
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const colour = (value) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xffffff;
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
/** Makes `game.text` for a game. */
export function createPlayTexts(context) {
    const { browser, density: playDensity, scope, stage, world, ui, glass, cover, removers, generation, disposed, made } = context;
    // A promise published before code that may change or end the text runs.
    function pending() {
        let resolve, reject;
        const promise = new Promise((done, fail) => {
            resolve = done;
            reject = fail;
        });
        return { promise, resolve, reject };
    }
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
            if (!disposed())
                syncLabelVisibility();
        });
    };
    const text = (given, o = {}) => {
        made('game.text');
        if (o === null || typeof o !== 'object')
            throw invalid('the options of a text are an object');
        const { size = 24, color = 0xffffff, align = 'left', bold = false } = o;
        const { fontFamily, fontWeight = bold ? 700 : 400, italic = false } = o;
        if (o.retainLastText !== undefined && typeof o.retainLastText !== 'boolean')
            throw invalid('retainLastText is a boolean');
        const retainLastText = o.retainLastText === true;
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
        let label, rasterActive = true, gone = false, alignRaster = false, rasterReleasedAfterFailure = false;
        const round = generation();
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
        const changeRevision = (keepFlight = false) => {
            revision.reject(new DOMException('Text revision was superseded', 'AbortError'));
            revision = newRevision();
            if (!keepFlight)
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
            // The retained branch sends one snapshot at a time to the atlas. Setting new words
            // on every animation tick would supersede an in-progress raster indefinitely.
            const advanceQueued = () => {
                const latest = drawn(node.text);
                if (!retainLastText || latest === made.text)
                    return false;
                made.text = latest;
                settle();
                return true;
            };
            const failed = (cause) => {
                if (pendingReady !== request)
                    return;
                pendingReady = undefined;
                if (retainLastText) {
                    made.display.visible = false;
                    if (advanceQueued())
                        return;
                    // A failed revision is not a license to keep outdated pixels or a hidden atlas borrow.
                    made.setRasterActive(false);
                    rasterReleasedAfterFailure = true;
                }
                revision.reject(cause);
            };
            void ready
                .then(() => {
                if (gone || pendingReady !== request)
                    return;
                syncVisibility();
                if (!rasterActive || pendingReady !== request)
                    return;
                position(made);
                made.display.visible = true;
                pendingReady = undefined;
                if (!advanceQueued())
                    revision.resolve();
            }, failed)
                .catch(failed);
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
            const latest = drawn(next);
            const keep = retainLastText && rasterActive && label !== undefined && /\S/u.test(label.text) && /\S/u.test(latest);
            // Preserve the one underlying flight, but reject every superseded public revision as before.
            const defer = keep && pendingReady !== undefined;
            changeRevision(defer);
            if (label === undefined || defer)
                return;
            // Strict/action text, empty words, and style changes hide the old raster immediately.
            if (!keep)
                label.display.visible = false;
            label.text = latest;
            if (rasterReleasedAfterFailure && rasterActive) {
                rasterReleasedAfterFailure = false;
                label.setRasterActive(true);
            }
            settle();
        }, color, size, style => {
            if (gone)
                return;
            changeRevision();
            if (label === undefined)
                return;
            label.display.visible = false;
            label.set({
                // A retained text revision may still be queued when a strict style change supersedes it.
                ...(retainLastText && label.text !== drawn(node.text) ? { text: drawn(node.text) } : {}),
                ...(style.color === undefined ? {} : { color: style.color }),
                ...(style.size === undefined ? {} : { fontSize: style.size }),
                ...(style.size !== undefined && vertical !== undefined && vertical !== false
                    ? { lineHeight: style.size * 1.1 }
                    : {})
            });
            if (rasterReleasedAfterFailure && rasterActive) {
                rasterReleasedAfterFailure = false;
                label.setRasterActive(true);
            }
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
            if (node.isDisposed || generation() !== round) {
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
                    if (next)
                        rasterReleasedAfterFailure = false;
                    // Hiding ends the outstanding flight and releases the existing raster. Capture
                    // any unsent latest words while inactive, ready for the next reveal.
                    if (!next && retainLastText && label.text !== drawn(node.text))
                        label.text = drawn(node.text);
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
            if (gone || node.isDisposed || generation() !== round) {
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
            if (node.text !== words && !(retainLastText && rasterActive && /\S/u.test(words) && /\S/u.test(node.text)))
                made.text = drawn(node.text);
            // What was set while the words were being made.
            if (node.color !== color || node.size !== size)
                made.set({
                    ...(retainLastText && made.text !== drawn(node.text) ? { text: drawn(node.text) } : {}),
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
    return { text, syncVisibility: syncLabelVisibility };
}
