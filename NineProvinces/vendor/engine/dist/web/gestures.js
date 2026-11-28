// SPDX-License-Identifier: Apache-2.0
// The optional entry @egret/engine/web/gestures. What a finger, the mouse or a pen does on a display object, said
// once as a game means it: a tap, a double tap, a long press, a drag, a swipe, two fingers pinching and turning, and
// something dragged from one place and dropped on another. It reads the contacts that pointer input routes to the
// object and adds no listener of its own to any page.
// It touches no page either, so a host that gives contacts to pointer input in its own way, a mini game for one, uses
// it as it is.
import { DisplayObject, EgretError, Stage } from '@egret/runtime';
import { after } from '@egret/engine';
/**
 * Which button a contact was begun with. Touches and pens, and a mouse press that holds the primary button, are the
 * primary kind; a mouse press of the secondary button alone is secondary; one of any other button is neither.
 */
function pressButton(contact) {
    const buttons = contact.buttons;
    if (contact.session.pointerType !== 'mouse' || buttons === 0 || (buttons & 1) !== 0)
        return 'primary';
    return (buttons & 2) !== 0 ? 'secondary' : 'other';
}
const invalid = (what) => new EgretError('GESTURE_OPTIONS_INVALID', { cause: what });
const positive = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;
/**
 * Recognizes gestures on an object. A tap is told at once; a second tap soon after and near it is also a double tap.
 * A still press of `holdSeconds` is a long press and is then no tap. A contact that moves more than `slop` is a drag
 * from then on, and a drag that ends fast enough is also a swipe. While two contacts are down on the object they are a
 * pinch, and neither is a tap, a press or a drag.
 */
export function createGestures(options) {
    if (options === null || typeof options !== 'object')
        throw invalid('options');
    const { engine, scope, input, target } = options;
    if (input === null || typeof input !== 'object' || typeof input.events !== 'object')
        throw invalid('input');
    if (!(target instanceof DisplayObject))
        throw invalid('target');
    if (scope === null || typeof scope !== 'object' || engine === null || typeof engine !== 'object')
        throw invalid('engine and scope');
    for (const name of ['onTap', 'onDoubleTap', 'onHold', 'onDrag', 'onSwipe', 'onPinch', 'onSecondaryTap'])
        if (options[name] !== undefined && typeof options[name] !== 'function')
            throw invalid(name);
    const slop = options.slop ?? 12, holdSeconds = options.holdSeconds ?? 0.5, doubleTapSeconds = options.doubleTapSeconds ?? 0.3, swipeSpeed = options.swipeSpeed ?? 600;
    for (const [name, value] of [
        ['slop', slop],
        ['holdSeconds', holdSeconds],
        ['doubleTapSeconds', doubleTapSeconds],
        ['swipeSpeed', swipeSpeed]
    ])
        if (!positive(value))
            throw invalid(name);
    const tracks = new Map();
    // Secondary mouse presses, by session: where each began and whether it has moved past the slop.
    const secondary = new Map();
    let pinch, lastTap, closed = false;
    const point = (x, y) => {
        let localX = x, localY = y;
        try {
            const local = target.globalToLocal(x, y);
            localX = local.x;
            localY = local.y;
        }
        catch {
            // A collapsed object has no inside; its point is the stage's.
        }
        return Object.freeze({ x, y, localX, localY });
    };
    const two = () => {
        const [a, b] = tracks.values();
        return tracks.size === 2 && a !== undefined && b !== undefined ? [a, b] : undefined;
    };
    const shape = (a, b) => ({
        distance: Math.hypot(b.x - a.x, b.y - a.y),
        angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2
    });
    const pinchOf = (phase) => {
        const pair = two();
        if (pair === undefined || pinch === undefined)
            return undefined;
        const now = shape(...pair);
        let turn = now.angle - pinch.angle;
        while (turn > 180)
            turn -= 360;
        while (turn < -180)
            turn += 360;
        return Object.freeze({
            phase,
            scale: pinch.distance > 0 ? now.distance / pinch.distance : 1,
            rotation: turn,
            x: now.x,
            y: now.y
        });
    };
    const stopHold = (track) => {
        track.hold?.cancel();
        track.hold = undefined;
    };
    const endPinch = (phase) => {
        if (pinch === undefined)
            return;
        const last = pinchOf(phase);
        pinch = undefined;
        if (last !== undefined)
            options.onPinch?.(last);
    };
    const begin = (contact) => {
        if (closed)
            return;
        const button = pressButton(contact);
        if (button === 'secondary') {
            secondary.set(contact.session.id, { startX: contact.globalX, startY: contact.globalY, moved: false });
            return;
        }
        if (button === 'other' || tracks.size >= 2)
            return;
        const track = {
            id: contact.session.id,
            startX: contact.globalX,
            startY: contact.globalY,
            x: contact.globalX,
            y: contact.globalY,
            samples: [{ x: contact.globalX, y: contact.globalY, t: contact.timestamp }],
            dragging: false,
            held: false,
            spent: false,
            hold: undefined
        };
        tracks.set(track.id, track);
        const pair = two();
        if (pair !== undefined) {
            // A second finger makes a pinch of both: what the first was doing alone ends.
            for (const each of pair) {
                stopHold(each);
                if (each.dragging) {
                    each.dragging = false;
                    options.onDrag?.(dragOf(each, 'cancel', 0, 0));
                }
            }
            const start = shape(...pair);
            pinch = { distance: start.distance, angle: start.angle };
            if (options.onPinch !== undefined)
                options.onPinch(pinchOf('start'));
            return;
        }
        if (options.onHold !== undefined)
            track.hold = after(engine, scope, holdSeconds, () => {
                track.hold = undefined;
                if (closed || tracks.get(track.id) !== track || track.dragging || pinch !== undefined)
                    return;
                track.held = true;
                options.onHold?.(point(track.x, track.y));
            });
    };
    const dragOf = (track, phase, dx, dy) => {
        const at = point(track.x, track.y);
        return Object.freeze({
            ...at,
            phase,
            dx,
            dy,
            totalX: track.x - track.startX,
            totalY: track.y - track.startY
        });
    };
    const move = (contact) => {
        const press = secondary.get(contact.session.id);
        if (press !== undefined) {
            if (Math.hypot(contact.globalX - press.startX, contact.globalY - press.startY) > slop)
                press.moved = true;
            return;
        }
        const track = tracks.get(contact.session.id);
        if (closed || track === undefined || track.spent)
            return;
        const dx = contact.globalX - track.x, dy = contact.globalY - track.y;
        track.x = contact.globalX;
        track.y = contact.globalY;
        track.samples.push({ x: track.x, y: track.y, t: contact.timestamp });
        if (track.samples.length > 8)
            track.samples.shift();
        if (pinch !== undefined) {
            const now = pinchOf('move');
            if (now !== undefined)
                options.onPinch?.(now);
            return;
        }
        if (!track.dragging && !track.held && Math.hypot(track.x - track.startX, track.y - track.startY) > slop) {
            track.dragging = true;
            stopHold(track);
            options.onDrag?.(dragOf(track, 'start', track.x - track.startX, track.y - track.startY));
            return;
        }
        if (track.dragging)
            options.onDrag?.(dragOf(track, 'move', dx, dy));
    };
    const finish = (contact, cancelled) => {
        const press = secondary.get(contact.session.id);
        if (press !== undefined) {
            secondary.delete(contact.session.id);
            const still = Math.hypot(contact.globalX - press.startX, contact.globalY - press.startY) <= slop;
            if (!closed && !cancelled && !press.moved && still)
                options.onSecondaryTap?.(point(contact.globalX, contact.globalY));
            return;
        }
        const track = tracks.get(contact.session.id);
        if (track === undefined)
            return;
        if (!cancelled) {
            track.x = contact.globalX;
            track.y = contact.globalY;
            track.samples.push({ x: track.x, y: track.y, t: contact.timestamp });
        }
        stopHold(track);
        // A pinch ends when either finger lifts, measured with both; the other finger is then done until it lifts too.
        if (pinch !== undefined && !closed) {
            endPinch(cancelled ? 'cancel' : 'end');
            for (const other of tracks.values())
                other.spent = true;
        }
        tracks.delete(track.id);
        if (closed || track.spent)
            return;
        if (track.dragging) {
            options.onDrag?.(dragOf(track, cancelled ? 'cancel' : 'end', 0, 0));
            if (cancelled || options.onSwipe === undefined)
                return;
            // The speed of the last tenth of a second of the drag.
            const last = track.samples[track.samples.length - 1], first = track.samples.find(sample => last.t - sample.t <= 100) ?? last;
            const seconds = Math.max(1e-3, (last.t - first.t) / 1000), dx = last.x - first.x, dy = last.y - first.y, speed = Math.hypot(dx, dy) / seconds;
            if (speed >= swipeSpeed && last.t > first.t) {
                const totalX = track.x - track.startX, totalY = track.y - track.startY;
                const direction = Math.abs(totalX) >= Math.abs(totalY) ? (totalX < 0 ? 'left' : 'right') : totalY < 0 ? 'up' : 'down';
                options.onSwipe(Object.freeze({ direction, speed, dx: totalX, dy: totalY }), point(track.x, track.y));
            }
            return;
        }
        if (cancelled || track.held)
            return;
        const at = point(track.x, track.y);
        options.onTap?.(at);
        if (options.onDoubleTap === undefined)
            return;
        if (lastTap !== undefined &&
            contact.timestamp - lastTap.t <= doubleTapSeconds * 1000 &&
            Math.hypot(track.x - lastTap.x, track.y - lastTap.y) <= slop * 2) {
            lastTap = undefined;
            options.onDoubleTap(at);
        }
        else
            lastTap = { x: track.x, y: track.y, t: contact.timestamp };
    };
    // Each subscription returns its own removal.
    const removals = [
        target.on(input.events.begin, event => begin(event.payload)),
        target.on(input.events.move, event => move(event.payload)),
        target.on(input.events.end, event => finish(event.payload, false)),
        target.on(input.events.cancel, event => finish(event.payload, true))
    ];
    const gestures = {
        dispose() {
            if (closed)
                return;
            closed = true;
            for (const remove of removals)
                remove();
            for (const track of tracks.values())
                stopHold(track);
            tracks.clear();
            secondary.clear();
            pinch = undefined;
        }
    };
    scope.use(gestures);
    return Object.freeze(gestures);
}
/** Whether a stage point is inside what an object draws, by its bounds on the stage. */
function contains(node, x, y) {
    // Shown, with everything it is in, and on a stage.
    let top = node;
    for (let at = node; at != null; at = at.parent) {
        if (!at.visible)
            return false;
        top = at;
    }
    if (!(top instanceof Stage))
        return false;
    try {
        const local = node.globalToLocal(x, y), bounds = node.getBounds();
        return (local.x >= bounds.x &&
            local.y >= bounds.y &&
            local.x <= bounds.x + bounds.width &&
            local.y <= bounds.y + bounds.height);
    }
    catch {
        return false;
    }
}
const inside = (node, outer) => {
    for (let at = node.parent; at != null; at = at.parent)
        if (at === outer)
            return true;
    return false;
};
/**
 * Drag and drop as games do it: the dragged object stays where it is, a picture of it follows the finger in `layer`,
 * and letting go over a target that accepts what is carried calls its `drop`. Over several targets, the innermost
 * takes it: a slot inside a bag, not the bag. Let go anywhere else, nothing happens.
 */
export function createDragAndDrop(options) {
    if (options === null || typeof options !== 'object')
        throw invalid('options');
    const { engine, scope, input, layer } = options;
    if (layer === null || typeof layer !== 'object' || typeof layer.addChild !== 'function')
        throw invalid('layer');
    const targets = new Set(), sources = new Set();
    let carrying, closed = false;
    const under = (x, y, data) => {
        let best;
        for (const each of targets) {
            if (!contains(each.node, x, y))
                continue;
            if (each.accepts !== undefined && !each.accepts(data))
                continue;
            if (best === undefined || inside(each.node, best.node))
                best = each;
        }
        return best;
    };
    const end = (at) => {
        const done = carrying;
        carrying = undefined;
        if (done === undefined)
            return;
        if (done.ghost !== undefined)
            done.ghost.parent?.removeChild(done.ghost);
        done.over?.hover?.(done.data, false);
        if (at !== undefined && !closed)
            under(at.x, at.y, done.data)?.drop(done.data, at);
    };
    const dnd = {
        source(source) {
            if (closed)
                throw new EgretError('GESTURE_CLOSED');
            if (source === null ||
                typeof source !== 'object' ||
                typeof source.data !== 'function' ||
                !(source.node instanceof DisplayObject))
                throw invalid('source');
            const gestures = createGestures({
                engine,
                scope,
                input,
                target: source.node,
                ...(options.slop === undefined ? {} : { slop: options.slop }),
                onDrag(drag) {
                    if (drag.phase === 'start') {
                        if (carrying !== undefined)
                            return;
                        const data = source.data();
                        if (data === undefined)
                            return;
                        const ghost = source.ghost?.(data);
                        if (ghost !== undefined) {
                            ghost.touchEnabled = false;
                            layer.addChild(ghost);
                            const at = layer.globalToLocal(drag.x, drag.y);
                            ghost.x = at.x;
                            ghost.y = at.y;
                        }
                        carrying = { data, ghost, over: undefined };
                    }
                    if (carrying === undefined)
                        return;
                    if (drag.phase === 'start' || drag.phase === 'move') {
                        if (carrying.ghost !== undefined) {
                            const at = layer.globalToLocal(drag.x, drag.y);
                            carrying.ghost.x = at.x;
                            carrying.ghost.y = at.y;
                        }
                        const over = under(drag.x, drag.y, carrying.data);
                        if (over !== carrying.over) {
                            carrying.over?.hover?.(carrying.data, false);
                            carrying.over = over;
                            over?.hover?.(carrying.data, true);
                        }
                    }
                    else
                        end(drag.phase === 'end' ? drag : undefined);
                }
            });
            sources.add(gestures);
            return () => {
                sources.delete(gestures);
                gestures.dispose();
            };
        },
        target(given) {
            if (closed)
                throw new EgretError('GESTURE_CLOSED');
            if (given === null ||
                typeof given !== 'object' ||
                typeof given.drop !== 'function' ||
                !(given.node instanceof DisplayObject))
                throw invalid('target');
            targets.add(given);
            return () => {
                targets.delete(given);
            };
        },
        get dragging() {
            return carrying?.data;
        },
        dispose() {
            if (closed)
                return;
            closed = true;
            end(undefined);
            for (const gestures of sources)
                gestures.dispose();
            sources.clear();
            targets.clear();
        }
    };
    scope.use(dnd);
    return dnd;
}
