// SPDX-License-Identifier: Apache-2.0
import { EgretError } from '@egret/runtime';
import { trackScreenControl } from '../internal/uiControlReportState.js';
const ZERO = Object.freeze({ x: 0, y: 0 });
function finite(value) {
    return typeof value === 'number' && Number.isFinite(value);
}
function checkOptions(options) {
    if (options === null || typeof options !== 'object')
        throw new EgretError('UI_CONTROL_OPTIONS');
    const { input, target } = options;
    if (input === null || typeof input !== 'object')
        throw new EgretError('UI_CONTROL_OPTIONS');
    if (target === null || typeof target !== 'object' || typeof target.on !== 'function') {
        throw new EgretError('UI_CONTROL_OPTIONS');
    }
}
/** Clamp a scripted or keyboard direction into the control's admitted range. */
function direction(x, y) {
    if (!finite(x) || !finite(y))
        throw new EgretError('UI_CONTROL_DIRECTION');
    const length = Math.hypot(x, y);
    if (length === 0)
        return ZERO;
    const scale = length > 1 ? 1 / length : 1;
    return Object.freeze({ x: x * scale, y: y * scale });
}
function checkedGeometry(options) {
    if (options === null || typeof options !== 'object' || Array.isArray(options)) {
        throw new EgretError('UI_CONTROL_OPTIONS');
    }
    const { radius, center } = options;
    const deadZone = options.deadZone ?? radius / 10;
    if (!finite(radius) || radius <= 0)
        throw new EgretError('UI_CONTROL_RADIUS');
    if (!finite(deadZone) || deadZone < 0 || deadZone >= radius)
        throw new EgretError('UI_CONTROL_RADIUS');
    if (center !== undefined &&
        (center === null || typeof center !== 'object' || Array.isArray(center) || !finite(center.x) || !finite(center.y))) {
        throw new EgretError('UI_CONTROL_OPTIONS');
    }
    return { radius, deadZone, center: center === undefined ? undefined : Object.freeze({ x: center.x, y: center.y }) };
}
/** A singular target (e.g. an animated scale of zero) has no target-local point. */
function localPoint(target, contact) {
    try {
        return target.globalToLocal(contact.globalX, contact.globalY);
    }
    catch (cause) {
        if (cause instanceof EgretError && cause.code === 'COORDINATE_TRANSFORM_SINGULAR')
            return undefined;
        throw cause;
    }
}
/** A virtual stick on a target: dragging from its contact origin or a fixed center gives a direction. */
export function createMovementControl(options) {
    checkOptions(options);
    const { input, target, onMovement } = options;
    let geometry = checkedGeometry(options);
    let closed = false;
    let enabled = true;
    let value = ZERO;
    let owner;
    function publish(next) {
        if (next.x === value.x && next.y === value.y)
            return;
        value = next;
        try {
            onMovement?.(next);
        }
        catch (cause) {
            throw cause;
        }
    }
    function release() {
        owner = undefined;
        publish(ZERO);
    }
    function begin(event) {
        if (closed || !enabled)
            return;
        // One owning contact. A second contact is refused rather than replacing the first.
        if (owner !== undefined)
            return;
        owner = { session: event.payload.session, originX: event.payload.globalX, originY: event.payload.globalY };
        // A fixed stick responds immediately to an off-center down.
        if (geometry.center !== undefined)
            move(event);
    }
    function move(event) {
        if (closed || owner === undefined || event.payload.session !== owner.session)
            return;
        let dx;
        let dy;
        if (geometry.center === undefined) {
            // Preserve the original contact-relative geometry in stage units.
            dx = event.payload.globalX - owner.originX;
            dy = event.payload.globalY - owner.originY;
        }
        else {
            const point = localPoint(target, event.payload);
            if (point === undefined) {
                release();
                return;
            }
            dx = point.x - geometry.center.x;
            dy = point.y - geometry.center.y;
        }
        const distance = Math.hypot(dx, dy);
        // Inside the dead zone the control reports rest, not a debounced direction.
        if (distance <= geometry.deadZone) {
            publish(ZERO);
            return;
        }
        const magnitude = Math.min(1, distance / geometry.radius);
        const scale = magnitude / distance;
        publish(Object.freeze({ x: dx * scale, y: dy * scale }));
    }
    function end(event) {
        // A refused second contact must not release the contact that owns the movement.
        if (closed || owner === undefined || event.payload.session !== owner.session)
            return;
        release();
    }
    const subscriptions = [
        target.on(input.events.begin, begin),
        target.on(input.events.move, move),
        target.on(input.events.end, end),
        target.on(input.events.cancel, end)
    ];
    // An invalid target receives no dispatch, so the owner-session terminal stream is the only
    // signal that the held contact is gone.
    const observeTerminal = input.observe(notification => {
        if (closed || owner === undefined || notification.contact.session !== owner.session)
            return;
        // Retire whatever the owning session leaves behind after the dispatch attempt, whatever the
        // destination, a stopped propagation or a routed failure did to it. An ordinary delivery has
        // already released here from the control's own handler, so this is only the fallback.
        if (notification.kind === 'cancel' || notification.kind === 'end')
            release();
    });
    const untrack = trackScreenControl(input, target, 'movement', () => enabled && !closed);
    return Object.freeze({
        get value() {
            return value;
        },
        get active() {
            return owner !== undefined;
        },
        get enabled() {
            return enabled;
        },
        setDirection(x, y) {
            if (closed)
                throw new EgretError('UI_CONTROL_CLOSED');
            if (!enabled) {
                publish(ZERO);
                return;
            }
            publish(direction(x, y));
        },
        setGeometry(options) {
            if (closed)
                throw new EgretError('UI_CONTROL_CLOSED');
            const next = checkedGeometry(options);
            if (next.radius === geometry.radius &&
                next.deadZone === geometry.deadZone &&
                next.center?.x === geometry.center?.x &&
                next.center?.y === geometry.center?.y) {
                return;
            }
            // A new layout cannot reinterpret or accidentally re-arm the old owning contact.
            geometry = next;
            release();
        },
        setEnabled(next) {
            if (closed)
                throw new EgretError('UI_CONTROL_CLOSED');
            if (enabled === next)
                return;
            enabled = next;
            // Disabling a held control must not keep an action pressed.
            if (!enabled)
                release();
        },
        dispose() {
            if (closed)
                return;
            closed = true;
            untrack();
            let failure;
            try {
                release();
            }
            catch (cause) {
                // Keep the control terminal: every owned subscription is still released below.
                failure = cause;
            }
            finally {
                observeTerminal();
                for (const unsubscribe of subscriptions) {
                    try {
                        unsubscribe();
                    }
                    catch (cause) {
                        failure ??= cause;
                    }
                }
            }
            if (failure !== undefined)
                throw failure;
        }
    });
}
/** A button on a target: a captured press and release activates it by default. */
export function createActionControl(options) {
    return createSelectionItemAction(options, () => true);
}
/** A selection item's action still has its existing delivery path; reporting also reads its group's enable state. */
export function createSelectionItemAction(options, reportEnabled) {
    checkOptions(options);
    const { input, target, onActivate, onPressChange } = options;
    const activation = options.activation === undefined ? 'capturedRelease' : options.activation;
    const tapTolerance = options.tapTolerance === undefined ? 12 : options.tapTolerance;
    if ((activation !== 'capturedRelease' && activation !== 'releaseInside' && activation !== 'tap') ||
        !finite(tapTolerance) ||
        tapTolerance < 0 ||
        (options.tapTolerance !== undefined && activation !== 'tap')) {
        throw new EgretError('UI_CONTROL_OPTIONS');
    }
    let closed = false;
    let enabled = true;
    let candidate;
    let held = false;
    let activations = 0;
    function setPressed(next) {
        if (held === next)
            return;
        held = next;
        onPressChange?.(next);
    }
    function begin(event) {
        if (closed || !enabled)
            return;
        if (candidate !== undefined)
            return;
        candidate = {
            session: event.payload.session,
            x: event.payload.globalX,
            y: event.payload.globalY,
            withinTolerance: true
        };
        setPressed(true);
    }
    function noteExcursion(contact) {
        if (closed || candidate === undefined || contact.session !== candidate.session)
            return;
        // A swipe cannot become a tap again by returning to its start.
        if (activation === 'tap' &&
            Math.hypot(contact.globalX - candidate.x, contact.globalY - candidate.y) > tapTolerance) {
            candidate.withinTolerance = false;
        }
    }
    function releasedInside(contact) {
        const area = target.hitArea;
        if (area === undefined)
            return false;
        const point = localPoint(target, contact);
        return (point !== undefined &&
            point.x >= area.x &&
            point.y >= area.y &&
            point.x - area.x < area.width &&
            point.y - area.y < area.height);
    }
    function end(event) {
        if (closed || candidate === undefined || event.payload.session !== candidate.session)
            return;
        // Judge the final sample as well as moves. Retire the owning press even if the geometry query fails.
        noteExcursion(event.payload);
        const withinTolerance = candidate.withinTolerance;
        candidate = undefined;
        let admitted = false;
        try {
            admitted =
                activation === 'capturedRelease' ||
                    ((activation !== 'tap' || withinTolerance) && releasedInside(event.payload));
        }
        finally {
            setPressed(false);
        }
        if (admitted)
            activate();
    }
    function cancel(event) {
        // The refused second contact cancelling must not clear the first one's pending activation.
        if (closed || candidate === undefined || event.payload.session !== candidate.session)
            return;
        candidate = undefined;
        setPressed(false);
    }
    function activate() {
        if (closed || !enabled)
            return;
        activations += 1;
        onActivate?.();
    }
    const subscriptions = [
        target.on(input.events.begin, begin),
        target.on(input.events.end, end),
        target.on(input.events.cancel, cancel)
    ];
    const observeTerminal = input.observe(notification => {
        if (closed || candidate === undefined || notification.contact.session !== candidate.session)
            return;
        // Swipes count even if a move was stopped or routed away; the owning end must still be delivered.
        if (notification.kind === 'move')
            noteExcursion(notification.contact);
        // A terminal the control's own handler did not consume clears the press without activating.
        if (notification.kind === 'cancel' || notification.kind === 'end') {
            candidate = undefined;
            setPressed(false);
        }
    });
    const untrack = trackScreenControl(input, target, 'action', () => enabled && !closed && reportEnabled());
    return Object.freeze({
        get pressed() {
            return held;
        },
        get enabled() {
            return enabled;
        },
        get activationCount() {
            return activations;
        },
        press() {
            if (closed)
                throw new EgretError('UI_CONTROL_CLOSED');
            if (!enabled)
                return;
            setPressed(true);
        },
        release() {
            if (closed)
                throw new EgretError('UI_CONTROL_CLOSED');
            if (!enabled) {
                setPressed(false);
                return;
            }
            // A scripted release activates only if a press is outstanding; it cannot double-fire.
            if (!held)
                return;
            setPressed(false);
            activate();
        },
        setEnabled(next) {
            if (closed)
                throw new EgretError('UI_CONTROL_CLOSED');
            if (enabled === next)
                return;
            enabled = next;
            if (!enabled) {
                candidate = undefined;
                setPressed(false);
            }
        },
        dispose() {
            if (closed)
                return;
            closed = true;
            untrack();
            candidate = undefined;
            let failure;
            try {
                setPressed(false);
            }
            catch (cause) {
                failure = cause;
            }
            finally {
                observeTerminal();
                for (const unsubscribe of subscriptions) {
                    try {
                        unsubscribe();
                    }
                    catch (cause) {
                        failure ??= cause;
                    }
                }
            }
            if (failure !== undefined)
                throw failure;
        }
    });
}
