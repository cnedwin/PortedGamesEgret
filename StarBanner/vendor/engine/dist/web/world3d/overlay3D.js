// SPDX-License-Identifier: Apache-2.0
// The engine's own 2D interface over a World3D scene: menus, bars, buttons,
// text and dialogs drawn by the 2D stage on a transparent canvas laid exactly
// over the 3D one. A touch or click that lands on 2D content goes to the 2D
// stage; one that lands where the interface is empty goes on to the 3D canvas
// below, so the scene can still be orbited, aimed at and picked.
import { EgretError } from '@egret/runtime';
import { createBrowserGame } from '../game.js';
/** The fits an overlay takes: three that lay a stage of fixed size over the 3D canvas, and five that fill it. */
const PLANNED = ['expand', 'fixedWidth', 'fixedHeight', 'fixedNarrow', 'fixedWide'];
const OVERLAY_FITS = ['stretch', 'contain', 'cover', ...PLANNED];
const FORWARDED = [
    'pointerdown',
    'pointermove',
    'pointerup',
    'pointercancel',
    'click',
    'wheel',
    'contextmenu',
    'dblclick'
];
/**
 * Lays a transparent 2D stage over `canvas` (the 3D canvas, which must sit in a positioned parent) and starts it.
 * Give interface nodes hit areas as usual; presses elsewhere fall through to the 3D canvas.
 */
export async function createWorld3DOverlay(canvas, options) {
    if (!canvas || typeof canvas.getBoundingClientRect !== 'function' || !canvas.parentElement)
        throw new EgretError('WORLD3D_OVERLAY_OPTIONS_INVALID');
    if (!options || !(options.width > 0) || !(options.height > 0))
        throw new EgretError('WORLD3D_OVERLAY_OPTIONS_INVALID');
    const fit = options.fit ?? 'stretch';
    if (!OVERLAY_FITS.includes(fit))
        throw new EgretError('WORLD3D_OVERLAY_OPTIONS_INVALID');
    // With a fit that fills the 3D canvas, the 2D game plans its own stage in an element laid exactly over it.
    const fills = PLANNED.includes(fit);
    if ((options.portrait !== undefined || options.insets !== undefined) && !fills)
        throw new EgretError('WORLD3D_OVERLAY_OPTIONS_INVALID', {
            cause: 'portrait and insets go with a fit that fills the 3D canvas: ' + PLANNED.join(', ')
        });
    let placed = { x: 0, y: 0, width: 0, height: 0, scale: 0 };
    const doc = canvas.ownerDocument;
    const overlay = doc.createElement('canvas');
    overlay.className = 'egret-world3d-overlay';
    overlay.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;touch-action:none;background:transparent';
    const holder = fills ? doc.createElement('div') : undefined;
    if (holder !== undefined) {
        holder.className = 'egret-world3d-overlay-box';
        holder.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;pointer-events:none';
        overlay.style.pointerEvents = 'auto';
        // The whole element until the 2D game sizes it, so that its input has a surface to measure from the start.
        overlay.style.width = overlay.style.height = '100%';
        holder.appendChild(overlay);
    }
    canvas.parentElement.appendChild(holder ?? overlay);
    // The overlay follows the 3D canvas's box, wherever the page lays it out.
    const place = () => {
        const parent = canvas.parentElement.getBoundingClientRect(), box = canvas.getBoundingClientRect();
        if (holder !== undefined) {
            // The 2D game sizes its canvas inside this element, and plans its stage, as the element changes.
            holder.style.left = `${box.left - parent.left + canvas.parentElement.scrollLeft}px`;
            holder.style.top = `${box.top - parent.top + canvas.parentElement.scrollTop}px`;
            holder.style.width = `${box.width}px`;
            holder.style.height = `${box.height}px`;
            return;
        }
        let width = box.width, height = box.height;
        if (fit !== 'stretch' && width > 0 && height > 0) {
            const wide = width / options.width, tall = height / options.height, scale = fit === 'contain' ? Math.min(wide, tall) : Math.max(wide, tall);
            width = options.width * scale;
            height = options.height * scale;
        }
        const x = (box.width - width) / 2, y = (box.height - height) / 2;
        placed = Object.freeze({ x, y, width, height, scale: width / options.width });
        overlay.style.left = `${box.left - parent.left + canvas.parentElement.scrollLeft + x}px`;
        overlay.style.top = `${box.top - parent.top + canvas.parentElement.scrollTop + y}px`;
        overlay.style.width = `${width}px`;
        overlay.style.height = `${height}px`;
    };
    place();
    const Resize = globalThis.ResizeObserver;
    const observer = Resize ? new Resize(place) : undefined;
    observer?.observe(canvas);
    const win = doc.defaultView ?? globalThis;
    win.addEventListener('resize', place);
    let game;
    try {
        game = await createBrowserGame({
            canvas: overlay,
            width: options.width,
            height: options.height,
            backend: options.backend ?? 'webgl2',
            clearColor: 0,
            clearAlpha: 0,
            effects: true,
            ...(fills && holder !== undefined ? { fit: fit, fitTo: holder } : {}),
            ...(options.portrait === undefined ? {} : { portrait: options.portrait }),
            ...(options.insets === undefined ? {} : { insets: options.insets }),
            ...(options.blendSpace === undefined ? {} : { blendSpace: options.blendSpace }),
            ...(options.pixelRatio === undefined ? {} : { pixelRatio: options.pixelRatio }),
            ...(options.update ? { update: options.update } : {}),
            ...(options.onError ? { onError: options.onError } : {})
        });
    }
    catch (cause) {
        observer?.disconnect();
        win.removeEventListener('resize', place);
        (holder ?? overlay).remove();
        throw cause;
    }
    // Pointers that started on an empty part of the interface belong to the 3D canvas until they lift.
    const passing = new Set();
    let pendingClick;
    const empty = (event) => {
        const box = overlay.getBoundingClientRect();
        if (!(box.width > 0 && box.height > 0))
            return true;
        // The stage's size now: the design, or with a fit that fills the 3D canvas, the plan's.
        const stage = fills ? game.screen : options;
        const x = ((event.clientX - box.left) / box.width) * stage.width, y = ((event.clientY - box.top) / box.height) * stage.height;
        try {
            return game.stage.hitTest(x, y) === undefined;
        }
        catch {
            return true;
        }
    };
    const forward = (event) => {
        if (options.passThrough === false || event.target !== overlay)
            return;
        const pointer = event;
        const id = typeof pointer.pointerId === 'number' ? pointer.pointerId : -1;
        let send;
        if (event.type === 'pointerdown') {
            if (pointer.isPrimary)
                pendingClick = undefined;
            send = empty(pointer);
            if (send)
                passing.add(id);
        }
        else if (event.type === 'pointerup' || event.type === 'pointercancel') {
            send = passing.delete(id);
            if (pointer.isPrimary) {
                // Native click is separate from the pointer pair. A drag out of UI cannot acquire scene click ownership.
                pendingClick =
                    send && event.isTrusted && event.type === 'pointerup' && pointer.button === 0 && empty(pointer)
                        ? { id, x: pointer.clientX, y: pointer.clientY }
                        : undefined;
            }
        }
        else if (event.type === 'click') {
            const claimed = pendingClick;
            if (event.isTrusted)
                pendingClick = undefined;
            // Older browsers can report a trusted click as MouseEvent without an identifier.
            send =
                event.isTrusted &&
                    pointer.detail > 0 &&
                    claimed !== undefined &&
                    (id === claimed.id ||
                        (id === -1 && Math.abs(pointer.clientX - claimed.x) <= 1 && Math.abs(pointer.clientY - claimed.y) <= 1));
        }
        else if (event.type === 'pointermove') {
            // A drag that began on the scene stays with it; a hover goes where the interface is empty.
            send = passing.has(id) || (pointer.buttons === 0 && empty(pointer));
        }
        else
            send = empty(pointer);
        if (!send)
            return;
        event.stopImmediatePropagation();
        if (event.type !== 'pointermove' || passing.has(id))
            event.preventDefault();
        const Kind = event.constructor ?? Event;
        const copy = new Kind(event.type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            detail: pointer.detail,
            clientX: pointer.clientX,
            clientY: pointer.clientY,
            screenX: pointer.screenX,
            screenY: pointer.screenY,
            button: pointer.button,
            buttons: pointer.buttons,
            pointerId: pointer.pointerId,
            pointerType: pointer.pointerType,
            isPrimary: pointer.isPrimary,
            pressure: pointer.pressure,
            ctrlKey: pointer.ctrlKey,
            shiftKey: pointer.shiftKey,
            altKey: pointer.altKey,
            metaKey: pointer.metaKey,
            deltaX: event.deltaX,
            deltaY: event.deltaY,
            deltaMode: event.deltaMode
        });
        canvas.dispatchEvent(copy);
    };
    // Capturing on the window runs before the 2D game's own listeners on the overlay.
    for (const type of FORWARDED)
        win.addEventListener(type, forward, { capture: true, passive: false });
    return {
        game,
        canvas: overlay,
        get box() {
            if (!fills)
                return placed;
            const screen = game.screen;
            return Object.freeze({
                x: screen.left,
                y: screen.top,
                width: screen.width * screen.scale,
                height: screen.height * screen.scale,
                scale: screen.scale
            });
        },
        async dispose() {
            for (const type of FORWARDED)
                win.removeEventListener(type, forward, { capture: true });
            observer?.disconnect();
            win.removeEventListener('resize', place);
            await game.dispose();
            (holder ?? overlay).remove();
        }
    };
}
