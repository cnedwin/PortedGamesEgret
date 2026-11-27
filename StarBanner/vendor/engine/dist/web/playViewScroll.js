import { createScrollControl } from '@egret/engine/ui';
const PAN_SLOP = 12;
/** Owns one touch stream for the viewports in a game. Nested viewports claim the nearest eligible ancestor. */
export function createPlayViewScrolls(game) {
    const panels = new Map();
    const hands = new Map();
    const pointer = game.browser.pointer;
    let unsubscribe;
    const closest = (target) => {
        for (let node = target; node !== undefined; node = node.parent) {
            const panel = panels.get(node);
            if (panel !== undefined && panel.enabled() && panel.maximum > 0)
                return panel;
        }
        return undefined;
    };
    const localPoint = (panel, contact) => panel.viewport.globalToLocal(contact.globalX, contact.globalY);
    const observe = ({ kind, contact, target }) => {
        const { session } = contact;
        if (session.pointerType !== 'touch')
            return;
        if (kind === 'begin') {
            const panel = closest(target);
            if (panel !== undefined && ![...hands.values()].some(hand => hand.panel === panel)) {
                const local = localPoint(panel, contact);
                hands.set(session, { panel, localX: local.x, localY: local.y, offset: panel.offset, dragging: false });
            }
            return;
        }
        const hand = hands.get(session);
        if (hand === undefined)
            return;
        const { panel } = hand;
        if (kind !== 'move' || !panel.enabled()) {
            hands.delete(session);
            return;
        }
        // The viewport's axes may differ from the stage axes after rotation or scaling.
        const local = localPoint(panel, contact);
        if (!hand.dragging) {
            const dx = local.x - hand.localX, dy = local.y - hand.localY;
            if (Math.abs(dy) <= PAN_SLOP || Math.abs(dx) > Math.abs(dy))
                return;
            // Once a pan wins, end it on an empty target so a return to the starting point cannot press a button.
            if (!pointer?.capture(session, panel.captureTarget)) {
                hands.delete(session);
                return;
            }
            hand.dragging = true;
        }
        panel.scrollTo(hand.offset + hand.localY - local.y);
    };
    const create = (viewport, offset, enabled) => {
        const content = game.sprite(undefined, viewport);
        const captureTarget = game.sprite(undefined, viewport);
        viewport.touchEnabled = true;
        captureTarget.touchEnabled = true;
        const control = createScrollControl({
            viewportLength: 1,
            contentLength: offset + 1,
            offset,
            onScroll: value => {
                content.y = -value;
            }
        });
        content.y = -control.offset;
        const panel = {
            content,
            viewport,
            captureTarget,
            enabled,
            get offset() {
                return control.offset;
            },
            get maximum() {
                return control.maximum;
            },
            scrollTo: control.scrollTo,
            scrollBy: control.scrollBy,
            page: control.page,
            layout(width, height, contentHeight) {
                const current = viewport.clipRect;
                if (current === undefined ||
                    current.x !== 0 ||
                    current.y !== 0 ||
                    current.width !== width ||
                    current.height !== height)
                    viewport.clipRect = { x: 0, y: 0, width, height };
                control.setLengths(Math.max(height, Number.MIN_VALUE), height === 0 ? 0 : contentHeight);
            },
            reveal(node, bounds) {
                const clip = viewport.clipRect;
                if (clip.height <= 0)
                    return;
                const ys = [
                    [bounds.x, bounds.y],
                    [bounds.x + bounds.width, bounds.y],
                    [bounds.x, bounds.y + bounds.height],
                    [bounds.x + bounds.width, bounds.y + bounds.height]
                ].map(([x, y]) => {
                    const global = node.localToGlobal(x, y);
                    return viewport.globalToLocal(global.x, global.y).y;
                });
                const top = Math.min(...ys), bottom = Math.max(...ys);
                const delta = top < 0 || bottom - top > clip.height ? top : Math.max(0, bottom - clip.height);
                if (delta !== 0)
                    control.scrollBy(delta);
            },
            dispose() {
                panels.delete(viewport);
                for (const [session, hand] of hands)
                    if (hand.panel === panel)
                        hands.delete(session);
                control.dispose();
                if (panels.size === 0) {
                    unsubscribe?.();
                    unsubscribe = undefined;
                }
            }
        };
        panels.set(viewport, panel);
        unsubscribe ??= pointer?.observe(observe);
        return panel;
    };
    return {
        create,
        wheel(x, y, delta, mode) {
            if (panels.size === 0 || mode < 0 || mode > 2)
                return false;
            // Route the Play canvas's existing wheel input. A consumer's own hover adapter
            // remains independent, and an inner viewport at its edge leaves the wheel to its parent.
            for (let node = game.engine.stage.hitTest(x, y); node !== undefined; node = node.parent) {
                const panel = panels.get(node);
                if (!panel?.enabled())
                    continue;
                const units = mode === 0 ? 1 : mode === 1 ? 40 : panel.viewport.clipRect.height;
                if (panel.scrollBy(delta * units))
                    return true;
            }
            return false;
        }
    };
}
