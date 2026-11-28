const finite = (value) => typeof value === 'number' && Number.isFinite(value);
/**
 * The safe-area insets a tool's `globalThis.__egretAgent.insets` gives, in the window's CSS pixels, to fit the game as
 * a phone with a notch would; undefined where a page has none, or none of 0 or more on each side.
 */
function agentInsets() {
    const agent = globalThis.__egretAgent;
    const insets = agent?.insets;
    if (insets === null || typeof insets !== 'object')
        return undefined;
    const sides = [insets.top, insets.right, insets.bottom, insets.left];
    if (!sides.every(side => typeof side === 'number' && Number.isFinite(side) && side >= 0))
        return undefined;
    return { top: insets.top, right: insets.right, bottom: insets.bottom, left: insets.left };
}
/** Fits the canvas now and on every change of its element's size; the result ends the watching. */
export function fitGameCanvas(input) {
    const { canvas, holder, fit, width, height, wholeScale, plan, current, follow, movedTo } = input;
    let watcher, probe;
    // The page's safe-area insets, read from an element that is padded by them and shows nothing.
    const pageInsets = () => {
        if (input.insets !== undefined)
            return input.insets;
        const page = canvas.ownerDocument, view = page?.defaultView;
        if (page === undefined ||
            page === null ||
            view === null ||
            view === undefined ||
            typeof view.getComputedStyle !== 'function' ||
            typeof page.createElement !== 'function' ||
            page.body === null ||
            page.body === undefined)
            return undefined;
        if (probe === undefined) {
            probe = page.createElement('div');
            probe.setAttribute('aria-hidden', 'true');
            probe.style.cssText =
                'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
                    'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
            page.body.appendChild(probe);
        }
        const style = view.getComputedStyle(probe), read = (value) => (Number.isFinite(parseFloat(value)) ? Math.max(0, parseFloat(value)) : 0);
        // A tool may stand in for a phone's notch and home bar, which a headless browser does not have.
        const standIn = agentInsets(), edges = standIn ?? {
            top: read(style.paddingTop),
            right: read(style.paddingRight),
            bottom: read(style.paddingBottom),
            left: read(style.paddingLeft)
        };
        // Insets are of the window; the element may be anywhere in it.
        const box = (holder ?? canvas).getBoundingClientRect(), across = view.innerWidth, down = view.innerHeight;
        return {
            top: Math.max(0, edges.top - box.top),
            left: Math.max(0, edges.left - box.left),
            right: Math.max(0, edges.right - (finite(across) ? across - box.right : 0)),
            bottom: Math.max(0, edges.bottom - (finite(down) ? down - box.bottom : 0))
        };
    };
    if (fit !== 'none' && holder !== null) {
        const place = () => {
            const projected = holder.getBoundingClientRect();
            // CSS dimensions are set in the holder's layout space. A transformed bounding box is
            // measured in page space and would multiply the ancestor scale a second time.
            const box = { width: holder.clientWidth || projected.width, height: holder.clientHeight || projected.height };
            const style = canvas.style;
            if (fit === 'cover' || fit === 'stretch') {
                const wide = box.width / width, tall = box.height / height;
                const scaleX = fit === 'stretch' ? wide : Math.max(wide, tall), scaleY = fit === 'stretch' ? tall : scaleX;
                style.width = width * scaleX + 'px';
                style.height = height * scaleY + 'px';
                // Centred in its element; with "cover" what does not fit is outside it, for the element to cut off.
                style.marginLeft = (box.width - width * scaleX) / 2 + 'px';
                style.marginTop = (box.height - height * scaleY) / 2 + 'px';
                return;
            }
            if (!(box.width > 0 && box.height > 0))
                return;
            const next = plan({ width: box.width, height: box.height }, pageInsets()), before = current();
            follow(next);
            style.width = next.width * next.scale + 'px';
            style.height = next.height * next.scale + 'px';
            // Whole steps are enlarged as they are, a canvas pixel to a square of the device's.
            if (wholeScale)
                style.imageRendering = 'pixelated';
            style.marginLeft = next.left + 'px';
            style.marginTop = next.top + 'px';
            const moved = next.width !== before.width ||
                next.height !== before.height ||
                next.scale !== before.scale ||
                next.orientation !== before.orientation ||
                ['x', 'y', 'width', 'height'].some(key => next.safe[key] !== before.safe[key]);
            if (moved)
                movedTo(next);
        };
        place();
        watcher = new ResizeObserver(place);
        watcher.observe(holder);
    }
    return () => {
        watcher?.disconnect();
        probe?.remove();
    };
}
