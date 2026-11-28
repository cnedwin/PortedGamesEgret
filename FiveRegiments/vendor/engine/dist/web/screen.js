// SPDX-License-Identifier: Apache-2.0
// The optional entry @egret/engine/web/screen. Where a stage goes on a screen of any shape: which design applies, how large a stage unit is, how much stage the
// screen shows and which part of it no notch, rounded corner or home bar covers. Pure arithmetic: the caller gives
// the size of the space on the screen and what covers it, and places the canvas and its content from the answer.
import { EgretError } from '@egret/runtime';
const FITS = ['contain', 'expand', 'fixedWidth', 'fixedHeight', 'fixedNarrow', 'fixedWide'];
const invalid = () => new EgretError('UI_SCREEN_OPTIONS_INVALID');
const positive = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;
const size = (value) => value !== null &&
    typeof value === 'object' &&
    positive(value.width) &&
    positive(value.height);
const whole = (value) => Number.isSafeInteger(value.width) && Number.isSafeInteger(value.height);
/**
 * Fits a stage to a space on a screen. With `'contain'` and `'expand'` the scale keeps the whole design in the space
 * whatever its shape; with `'expand'` the stage takes the rest of the space, so an edge of the screen is at `0` or
 * `width` of the stage and the design lies in its middle. The fixed modes choose the scale from one side and fill the
 * space as Egret 5 did. `safe` is the stage less what the insets cover. Recompute it whenever the space or the insets
 * change, as they do when a phone turns.
 */
export function planScreen(options) {
    if (options === null || typeof options !== 'object')
        throw invalid();
    const { box, design: landscape, portrait, insets, uiScale } = options, fit = options.fit ?? 'contain', wholeScale = options.wholeScale ?? false, pixelRatio = options.pixelRatio ?? 1;
    if (!size(box) ||
        !size(landscape) ||
        !whole(landscape) ||
        (portrait !== undefined && (!size(portrait) || !whole(portrait))) ||
        !FITS.includes(fit) ||
        typeof wholeScale !== 'boolean' ||
        !positive(pixelRatio) ||
        (uiScale !== undefined &&
            (fit === 'contain' ||
                wholeScale ||
                uiScale === null ||
                typeof uiScale !== 'object' ||
                Array.isArray(uiScale) ||
                (uiScale.min !== undefined && !positive(uiScale.min)) ||
                (uiScale.max !== undefined && !positive(uiScale.max)) ||
                (uiScale.min !== undefined && uiScale.max !== undefined && uiScale.min > uiScale.max))) ||
        (insets !== undefined &&
            (insets === null ||
                typeof insets !== 'object' ||
                [insets.top, insets.right, insets.bottom, insets.left].some(edge => typeof edge !== 'number' || !Number.isFinite(edge) || edge < 0))))
        throw invalid();
    const orientation = box.height > box.width ? 'portrait' : 'landscape', design = orientation === 'portrait' && portrait !== undefined ? portrait : landscape;
    const across = box.width / design.width, down = box.height / design.height;
    let scale = fit === 'fixedWidth'
        ? across
        : fit === 'fixedHeight'
            ? down
            : fit === 'fixedWide'
                ? Math.max(across, down)
                : Math.min(across, down);
    const fitted = scale;
    if (uiScale !== undefined)
        scale = Math.min(uiScale.max ?? Infinity, Math.max(uiScale.min ?? 0, scale));
    const bounded = scale !== fitted;
    // A whole number of device pixels a unit, where there is room for one or more.
    if (wholeScale && scale * pixelRatio >= 1)
        scale = Math.floor(scale * pixelRatio + 1e-9) / pixelRatio;
    // As many whole units as the space holds: never fewer than the design with 'expand', and as the space makes them
    // with the fixed modes; the design itself with 'contain'.
    const fill = (space) => Math.max(1, Math.floor(space / scale + 1e-6)), grows = fit === 'expand' || fit === 'fixedNarrow';
    const width = bounded
        ? fill(box.width)
        : fit === 'contain' || fit === 'fixedWidth'
            ? design.width
            : grows
                ? Math.max(design.width, fill(box.width))
                : fill(box.width), height = bounded
        ? fill(box.height)
        : fit === 'contain' || fit === 'fixedHeight'
            ? design.height
            : grows
                ? Math.max(design.height, fill(box.height))
                : fill(box.height);
    if (bounded && (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)))
        throw invalid();
    const left = (box.width - width * scale) / 2, top = (box.height - height * scale) / 2;
    const designRect = Object.freeze({
        x: (width - design.width) / 2,
        y: (height - design.height) / 2,
        width: design.width,
        height: design.height
    });
    // What the insets leave of the space, as stage units, and within the stage.
    const edge = insets ?? { top: 0, right: 0, bottom: 0, left: 0 };
    const x0 = Math.max(0, (edge.left - left) / scale), y0 = Math.max(0, (edge.top - top) / scale), x1 = Math.min(width, (box.width - edge.right - left) / scale), y1 = Math.min(height, (box.height - edge.bottom - top) / scale);
    const safe = Object.freeze({ x: x0, y: y0, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) });
    return Object.freeze({
        orientation,
        design: Object.freeze({ width: design.width, height: design.height }),
        width,
        height,
        scale,
        left,
        top,
        designRect,
        safe
    });
}
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const rect = (value) => value !== null &&
    typeof value === 'object' &&
    finite(value.x) &&
    finite(value.y) &&
    finite(value.width) &&
    finite(value.height) &&
    value.width >= 0 &&
    value.height >= 0;
const PIN_KEYS = ['left', 'right', 'centerX', 'top', 'bottom', 'centerY'];
/** Whether `pin` is a pin: only its six names, finite numbers, and at most one of each axis. */
export function isScreenPin(pin) {
    if (pin === null || typeof pin !== 'object')
        return false;
    const given = Object.entries(pin).filter(([, value]) => value !== undefined);
    if (given.some(([key, value]) => !PIN_KEYS.includes(key) || !finite(value)))
        return false;
    const named = new Set(given.map(([key]) => key));
    const count = (keys) => keys.filter(key => named.has(key)).length;
    return count(['left', 'right', 'centerX']) <= 1 && count(['top', 'bottom', 'centerY']) <= 1;
}
/**
 * Where `box` goes in `area` by `pin`: the place of its top left corner, in the units of both. The rectangle of the
 * safe part of a plan, or of the whole stage, held against its edges: a score at `{ right: 16, top: 16 }`, a bar at
 * `{ bottom: 0, centerX: 0 }`. Place again whenever the area or the box's size changes, as `onScreenChange` tells.
 */
export function pinBox(area, box, pin) {
    if (!rect(area) || !rect(box) || !isScreenPin(pin))
        throw invalid();
    const x = pin.left !== undefined
        ? area.x + pin.left
        : pin.right !== undefined
            ? area.x + area.width - pin.right - box.width
            : pin.centerX !== undefined
                ? area.x + (area.width - box.width) / 2 + pin.centerX
                : box.x;
    const y = pin.top !== undefined
        ? area.y + pin.top
        : pin.bottom !== undefined
            ? area.y + area.height - pin.bottom - box.height
            : pin.centerY !== undefined
                ? area.y + (area.height - box.height) / 2 + pin.centerY
                : box.y;
    return Object.freeze({ x, y });
}
