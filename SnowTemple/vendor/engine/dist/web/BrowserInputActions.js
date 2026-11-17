// SPDX-License-Identifier: Apache-2.0
// Feeds named input actions from the page: keys, mouse buttons and gamepads,
// and on-screen sticks and buttons for touch screens. Every listener is taken
// off by `dispose`. A lost focus or a hidden page lets every control go, so a
// key held while the player switched windows does not stay down.
import { EgretError } from '@egret/runtime';
// The standard gamepad layout, by button number.
const PAD_BUTTONS = [
    'a',
    'b',
    'x',
    'y',
    'leftShoulder',
    'rightShoulder',
    'leftTrigger',
    'rightTrigger',
    'select',
    'start',
    'leftStickButton',
    'rightStickButton',
    'up',
    'down',
    'left',
    'right',
    'home'
];
const PAD_DEAD_ZONE = 0.12;
function bound(actions, binding) {
    for (const name of actions.names)
        for (const slot of ['bindings', 'negative', 'positive', 'up', 'down', 'left', 'right', 'sticks']) {
            let list;
            try {
                list = actions.bindingsOf(name, slot);
            }
            catch {
                continue;
            }
            if (list.includes(binding))
                return true;
        }
    return false;
}
/** Listens to the page for the controls of `actions`. */
export function bindBrowserInputActions(actions, options = {}) {
    if (!actions || typeof actions.press !== 'function')
        throw new EgretError('INPUT_ACTIONS_INVALID');
    const win = globalThis;
    const keyTarget = options.keyTarget ?? win;
    if (!keyTarget || typeof keyTarget.addEventListener !== 'function')
        throw new EgretError('INPUT_ACTIONS_INVALID');
    const prevent = options.preventDefault ?? true;
    const pass = new Set(options.passKeys ?? ['F5', 'F11', 'F12']);
    const removers = [];
    const listen = (target, type, handler, opts) => {
        target.addEventListener(type, handler, opts);
        removers.push(() => target.removeEventListener(type, handler, opts));
    };
    const typing = (event) => {
        const element = event.target;
        return (!!element &&
            (element.isContentEditable === true || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName ?? '')));
    };
    listen(keyTarget, 'keydown', event => {
        const e = event;
        if (typing(e) || !e.code)
            return;
        const binding = 'Key:' + e.code;
        if (prevent && !pass.has(e.code) && bound(actions, binding))
            e.preventDefault();
        if (!e.repeat)
            actions.press(binding);
    });
    listen(keyTarget, 'keyup', event => {
        const e = event;
        if (e.code)
            actions.release('Key:' + e.code);
    });
    const letGo = () => actions.releaseAll();
    if (typeof win.addEventListener === 'function') {
        listen(win, 'blur', letGo);
        listen(win, 'pagehide', letGo);
    }
    const doc = globalThis.document;
    if (doc && typeof doc.addEventListener === 'function')
        listen(doc, 'visibilitychange', () => {
            if (doc.visibilityState === 'hidden')
                letGo();
        });
    if (options.pointerTarget) {
        const target = options.pointerTarget;
        listen(target, 'pointerdown', event => {
            const e = event;
            if (e.pointerType === 'touch')
                return;
            actions.press('Mouse:' + e.button);
        });
        listen(win, 'pointerup', event => {
            const e = event;
            if (e.pointerType !== 'touch')
                actions.release('Mouse:' + e.button);
        });
        listen(target, 'contextmenu', event => {
            if (bound(actions, 'Mouse:2'))
                event.preventDefault();
        });
    }
    const padsHeld = new Set();
    const padSticks = new Set();
    const readPads = options.gamepads ?? true;
    return {
        poll() {
            if (!readPads)
                return;
            const nav = globalThis.navigator;
            const pads = typeof nav?.getGamepads === 'function' ? nav.getGamepads() : [];
            const now = new Set();
            // Pads are merged: any pad presses a button, and the strongest stick wins.
            const sticks = new Map();
            for (const pad of pads) {
                if (!pad?.connected)
                    continue;
                pad.buttons.forEach((button, index) => {
                    const value = button.value ?? (button.pressed ? 1 : 0);
                    if (!(button.pressed || value > 0.05))
                        return;
                    for (const name of [String(index), pad.mapping === 'standard' ? PAD_BUTTONS[index] : undefined]) {
                        if (!name)
                            continue;
                        const binding = 'Pad:' + name;
                        now.add(binding);
                        actions.press(binding, Math.min(1, Math.max(value, button.pressed ? 1 : 0)));
                    }
                });
                const pairs = [
                    ['leftStick', pad.axes[0] ?? 0, pad.axes[1] ?? 0],
                    ['rightStick', pad.axes[2] ?? 0, pad.axes[3] ?? 0]
                ];
                for (const [name, x, y] of pairs) {
                    const length = Math.hypot(x, y);
                    if (length < PAD_DEAD_ZONE)
                        continue;
                    const held = sticks.get(name);
                    if (!held || length > Math.hypot(held[0], held[1]))
                        sticks.set(name, [x, y]);
                }
            }
            for (const binding of padsHeld)
                if (!now.has(binding))
                    actions.release(binding);
            padsHeld.clear();
            for (const binding of now)
                padsHeld.add(binding);
            for (const name of ['leftStick', 'rightStick']) {
                const value = sticks.get(name);
                const binding = 'Pad:' + name;
                if (value) {
                    actions.setStick(binding, value[0], value[1]);
                    padSticks.add(binding);
                }
                else if (padSticks.delete(binding))
                    actions.setStick(binding, 0, 0);
            }
        },
        dispose() {
            for (const remove of removers.splice(0))
                remove();
            actions.releaseAll();
        }
    };
}
/**
 * A stick that appears where a finger lands in its zone of `element` and follows it. The element should cover
 * the screen area the stick works in, with `touch-action: none`.
 */
export function createTouchStick(element, actions, options = {}) {
    if (!element || typeof element.addEventListener !== 'function' || !actions)
        throw new EgretError('INPUT_ACTIONS_INVALID');
    const binding = options.binding ?? 'Touch:stick', radius = options.radius ?? 56, zone = options.zone ?? 'left', name = options.className ?? 'egret-touch-stick';
    if (!(radius > 0))
        throw new EgretError('INPUT_ACTIONS_INVALID');
    const doc = element.ownerDocument;
    const base = doc.createElement('div'), knob = doc.createElement('div');
    base.className = name;
    knob.className = name + '-knob';
    base.style.cssText =
        `position:absolute;left:0;top:0;width:${radius * 2}px;height:${radius * 2}px;margin:${-radius}px 0 0 ${-radius}px;` +
            'border-radius:50%;background:rgba(255,255,255,0.12);border:2px solid rgba(255,255,255,0.35);pointer-events:none';
    knob.style.cssText =
        `position:absolute;left:${radius - 22}px;top:${radius - 22}px;width:44px;height:44px;border-radius:50%;` +
            'background:rgba(255,255,255,0.45)';
    base.hidden = true;
    base.appendChild(knob);
    element.appendChild(base);
    let finger, cx = 0, cy = 0;
    const local = (event) => {
        const box = element.getBoundingClientRect();
        return [event.clientX - box.left, event.clientY - box.top];
    };
    const move = (event) => {
        const [x, y] = local(event);
        let dx = (x - cx) / radius, dy = (y - cy) / radius;
        const length = Math.hypot(dx, dy);
        if (length > 1) {
            dx /= length;
            dy /= length;
        }
        knob.style.transform = `translate(${(dx * radius).toFixed(1)}px, ${(dy * radius).toFixed(1)}px)`;
        actions.setStick(binding, dx, dy);
    };
    const down = (event) => {
        const e = event;
        if (finger !== undefined || e.pointerType === 'mouse')
            return;
        const [x, y] = local(e);
        const width = element.getBoundingClientRect().width;
        if ((zone === 'left' && x > width / 2) || (zone === 'right' && x < width / 2))
            return;
        finger = e.pointerId;
        cx = x;
        cy = y;
        base.style.transform = `translate(${x}px, ${y}px)`;
        base.hidden = false;
        element.setPointerCapture?.(e.pointerId);
        e.preventDefault();
        move(e);
    };
    const moved = (event) => {
        const e = event;
        if (e.pointerId === finger)
            move(e);
    };
    const up = (event) => {
        const e = event;
        if (e.pointerId !== finger)
            return;
        finger = undefined;
        base.hidden = true;
        knob.style.transform = '';
        actions.setStick(binding, 0, 0);
    };
    element.addEventListener('pointerdown', down);
    element.addEventListener('pointermove', moved);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', up);
    return {
        elements: [base, knob],
        dispose() {
            element.removeEventListener('pointerdown', down);
            element.removeEventListener('pointermove', moved);
            element.removeEventListener('pointerup', up);
            element.removeEventListener('pointercancel', up);
            base.remove();
            if (finger !== undefined)
                actions.setStick(binding, 0, 0);
        }
    };
}
/** Makes `element` an on-screen button that holds `binding` (such as `Touch:jump`) while a finger is on it. */
export function createTouchButton(element, actions, binding) {
    if (!element || typeof element.addEventListener !== 'function' || !actions || typeof binding !== 'string')
        throw new EgretError('INPUT_ACTIONS_INVALID');
    const fingers = new Set();
    const down = (event) => {
        const e = event;
        fingers.add(e.pointerId);
        element.setPointerCapture?.(e.pointerId);
        element.dataset['pressed'] = '';
        e.preventDefault();
        actions.press(binding);
    };
    const up = (event) => {
        const e = event;
        if (!fingers.delete(e.pointerId) || fingers.size > 0)
            return;
        delete element.dataset['pressed'];
        actions.release(binding);
    };
    element.addEventListener('pointerdown', down);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', up);
    return {
        elements: [element],
        dispose() {
            element.removeEventListener('pointerdown', down);
            element.removeEventListener('pointerup', up);
            element.removeEventListener('pointercancel', up);
            if (fingers.size)
                actions.release(binding);
            fingers.clear();
        }
    };
}
/**
 * The page's local storage as a save storage, or a memory stand-in where the page has none (a private window, a
 * blocked site): every call is guarded, so a save never throws for want of storage.
 */
export function browserSaveStorage() {
    let storage;
    try {
        storage = globalThis.localStorage;
        const probe = '__egret_probe__';
        storage?.setItem(probe, probe);
        storage?.removeItem(probe);
    }
    catch {
        storage = undefined;
    }
    const memory = new Map();
    return {
        persistent: storage !== undefined,
        getItem(key) {
            if (!storage)
                return memory.get(key) ?? null;
            return storage.getItem(key);
        },
        setItem(key, value) {
            if (!storage)
                return void memory.set(key, value);
            // Thrown when the storage is full; the save store reports it.
            storage.setItem(key, value);
        },
        removeItem(key) {
            if (!storage)
                return void memory.delete(key);
            storage.removeItem(key);
        }
    };
}
