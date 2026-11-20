// SPDX-License-Identifier: Apache-2.0
// Named game actions over keys, mouse buttons, gamepad buttons and sticks, and
// on-screen controls. A game asks "is Jump pressed", "was Fire just pressed",
// "which way does Move point" and never which key that is; the player can
// rebind, and the bindings can be saved and loaded. This core takes no browser
// events: the browser kit entry feeds it from the page, and tests feed it
// directly.
import { EgretError } from '@egret/runtime';
const SLOTS = [
    'bindings',
    'negative',
    'positive',
    'up',
    'down',
    'left',
    'right',
    'sticks'
];
const PATTERN = /^(Key|Mouse|Pad|Touch):[A-Za-z0-9_+\-]{1,40}$/;
const MAX_ACTIONS = 256;
const MAX_BINDINGS = 16;
const invalid = (detail) => {
    throw new EgretError('INPUT_ACTIONS_INVALID', { cause: new TypeError(detail) });
};
const clamp = (value, low, high) => (value < low ? low : value > high ? high : value);
function checkBinding(binding) {
    if (typeof binding !== 'string' || !PATTERN.test(binding))
        invalid('binding ' + String(binding));
    return binding;
}
function slotsOf(definition, kind) {
    const slots = Object.fromEntries(SLOTS.map(slot => [slot, []]));
    const allowed = kind === 'button'
        ? ['bindings']
        : kind === 'axis'
            ? ['negative', 'positive']
            : ['up', 'down', 'left', 'right', 'sticks'];
    for (const slot of SLOTS) {
        const list = definition[slot];
        if (list === undefined)
            continue;
        if (!allowed.includes(slot))
            invalid(`${slot} on a ${kind} action`);
        if (!Array.isArray(list) || list.length > MAX_BINDINGS)
            invalid(slot);
        slots[slot] = list.map(checkBinding);
    }
    return slots;
}
/** Makes the actions of `map`. */
export function createInputActions(map) {
    if (typeof map !== 'object' || map === null)
        invalid('map');
    const names = Object.keys(map);
    if (names.length === 0 || names.length > MAX_ACTIONS)
        invalid('action count');
    const actions = new Map();
    const defaults = new Map();
    for (const name of names) {
        if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(name))
            invalid('action name ' + name);
        const definition = map[name];
        if (typeof definition !== 'object' || definition === null)
            invalid('action ' + name);
        const kind = definition.kind ?? 'button';
        if (kind !== 'button' && kind !== 'axis' && kind !== 'vector')
            invalid('kind of ' + name);
        const deadZone = definition.deadZone ?? 0.2;
        if (!(deadZone >= 0 && deadZone < 1))
            invalid('deadZone of ' + name);
        const slots = slotsOf(definition, kind);
        defaults.set(name, structuredCloneSlots(slots));
        actions.set(name, { name, kind, deadZone, slots, down: false, wentDown: false, wentUp: false });
    }
    // What each control is doing now: a press value, or a stick's x and y.
    const values = new Map();
    const sticks = new Map();
    const listeners = new Set();
    let lastPressed;
    const action = (name) => actions.get(name) ?? invalid('unknown action ' + name);
    const level = (binding) => {
        const direct = values.get(binding);
        if (direct !== undefined)
            return direct;
        // Half of a stick axis: Pad:leftStickX+ reads the x of Pad:leftStick.
        const half = /^(.*)([XY])([+-])$/.exec(binding);
        if (half) {
            const stick = sticks.get(half[1]);
            if (stick) {
                const v = half[2] === 'X' ? stick.x : stick.y;
                return half[3] === '+' ? Math.max(0, v) : Math.max(0, -v);
            }
        }
        return 0;
    };
    const strongest = (list) => {
        let best = 0;
        for (const binding of list)
            best = Math.max(best, level(binding));
        return best;
    };
    const buttonLevel = (a) => {
        switch (a.kind) {
            case 'button':
                return strongest(a.slots.bindings);
            case 'axis':
                return Math.abs(axisOf(a));
            default: {
                const v = vectorOf(a);
                return Math.hypot(v.x, v.y);
            }
        }
    };
    const axisOf = (a) => {
        const raw = strongest(a.slots.positive) - strongest(a.slots.negative);
        return Math.abs(raw) <= a.deadZone ? 0 : clamp(raw, -1, 1);
    };
    const vectorOf = (a) => {
        let x = strongest(a.slots.right) - strongest(a.slots.left), y = strongest(a.slots.down) - strongest(a.slots.up);
        for (const binding of a.slots.sticks) {
            const stick = sticks.get(binding);
            if (stick && Math.hypot(stick.x, stick.y) > Math.hypot(x, y)) {
                x = stick.x;
                y = stick.y;
            }
        }
        const length = Math.hypot(x, y);
        if (length <= a.deadZone)
            return { x: 0, y: 0 };
        // The dead zone is taken out and the rest stretched to reach 1, so small pushes start from zero.
        const scaled = Math.min(1, (length - a.deadZone) / (1 - a.deadZone));
        return { x: (x / length) * scaled, y: (y / length) * scaled };
    };
    const refresh = () => {
        for (const a of actions.values()) {
            const down = buttonLevel(a) > (a.kind === 'button' ? 0.5 : 0);
            if (down === a.down)
                continue;
            a.down = down;
            if (down)
                a.wentDown = true;
            else
                a.wentUp = true;
            for (const listener of [...listeners])
                listener(a.name, down);
        }
    };
    const api = {
        names: Object.freeze([...names]),
        press(binding, value = 1) {
            checkBinding(binding);
            if (!(value >= 0 && value <= 1))
                invalid('press value');
            if (value === 0)
                values.delete(binding);
            else {
                if (!values.has(binding))
                    lastPressed = binding;
                values.set(binding, value);
            }
            refresh();
        },
        release(binding) {
            checkBinding(binding);
            values.delete(binding);
            refresh();
        },
        setStick(binding, x, y) {
            checkBinding(binding);
            if (!Number.isFinite(x) || !Number.isFinite(y))
                invalid('stick value');
            const length = Math.hypot(x, y);
            if (length > 1) {
                x /= length;
                y /= length;
            }
            if (x === 0 && y === 0)
                sticks.delete(binding);
            else
                sticks.set(binding, { x, y });
            refresh();
        },
        releaseAll() {
            values.clear();
            sticks.clear();
            refresh();
        },
        pressed: name => action(name).down,
        justPressed: name => action(name).wentDown,
        justReleased: name => action(name).wentUp,
        value(name) {
            const a = action(name);
            if (a.kind === 'axis')
                return axisOf(a);
            if (a.kind === 'button')
                return a.down ? 1 : 0;
            return Math.hypot(vectorOf(a).x, vectorOf(a).y);
        },
        vector(name) {
            const a = action(name);
            if (a.kind === 'vector')
                return vectorOf(a);
            if (a.kind === 'axis')
                return { x: axisOf(a), y: 0 };
            return { x: a.down ? 1 : 0, y: 0 };
        },
        endFrame() {
            for (const a of actions.values())
                a.wentDown = a.wentUp = false;
            lastPressed = undefined;
        },
        bindingsOf(name, slot) {
            const a = action(name);
            return Object.freeze([...a.slots[slot ?? defaultSlot(a.kind)]]);
        },
        rebind(name, binding, options = {}) {
            const a = action(name);
            checkBinding(binding);
            const slot = options.slot ?? defaultSlot(a.kind);
            if (!SLOTS.includes(slot) || !slotsOf({ [slot]: [binding] }, a.kind))
                invalid('slot');
            const list = a.slots[slot];
            const index = options.index ?? 0;
            if (!Number.isSafeInteger(index) || index < 0 || index > list.length || index >= MAX_BINDINGS)
                invalid('index');
            // A control does one thing: it is taken off wherever else it was.
            for (const other of actions.values())
                for (const s of SLOTS) {
                    const at = other.slots[s].indexOf(binding);
                    if (at >= 0 && !(other === a && s === slot && at === index))
                        other.slots[s].splice(at, 1);
                }
            if (index < list.length)
                list[index] = binding;
            else
                list.push(binding);
            refresh();
        },
        resetBindings() {
            for (const [name, slots] of defaults)
                action(name).slots = structuredCloneSlots(slots);
            refresh();
        },
        saveBindings() {
            const saved = {};
            for (const [name, slots] of defaults) {
                const now = action(name).slots;
                for (const slot of SLOTS)
                    if (now[slot].join('\n') !== slots[slot].join('\n'))
                        (saved[name] ??= {})[slot] = [...now[slot]];
            }
            return { version: 1, actions: saved };
        },
        loadBindings(saved) {
            const data = saved;
            if (!data || data.version !== 1 || typeof data.actions !== 'object' || data.actions === null)
                return;
            for (const [name, slots] of Object.entries(data.actions)) {
                const a = actions.get(name);
                if (!a || typeof slots !== 'object' || slots === null)
                    continue;
                for (const [slot, list] of Object.entries(slots)) {
                    if (!SLOTS.includes(slot) || !Array.isArray(list) || list.length > MAX_BINDINGS)
                        continue;
                    if (!list.every(b => typeof b === 'string' && PATTERN.test(b)))
                        continue;
                    try {
                        slotsOf({ [slot]: list }, a.kind);
                    }
                    catch {
                        continue;
                    }
                    a.slots[slot] = [...list];
                }
            }
            refresh();
        },
        subscribe(listener) {
            if (typeof listener !== 'function')
                invalid('listener');
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        get lastPressed() {
            return lastPressed;
        }
    };
    return Object.freeze(api);
}
function defaultSlot(kind) {
    return kind === 'button' ? 'bindings' : kind === 'axis' ? 'positive' : 'sticks';
}
function structuredCloneSlots(slots) {
    return Object.fromEntries(SLOTS.map(slot => [slot, [...slots[slot]]]));
}
/** A readable name for a binding, for settings screens: `Key:KeyW` is `W`, `Mouse:0` is `Left button`. */
export function describeInputBinding(binding) {
    checkBinding(binding);
    const [device, control] = binding.split(':');
    if (device === 'Key') {
        if (/^Key[A-Z]$/.test(control))
            return control.slice(3);
        if (/^Digit[0-9]$/.test(control))
            return control.slice(5);
        const named = {
            Space: 'Space',
            Enter: 'Enter',
            Escape: 'Esc',
            ShiftLeft: 'Shift',
            ShiftRight: 'Right Shift',
            ControlLeft: 'Ctrl',
            ControlRight: 'Right Ctrl',
            AltLeft: 'Alt',
            AltRight: 'Right Alt',
            ArrowUp: '↑',
            ArrowDown: '↓',
            ArrowLeft: '←',
            ArrowRight: '→',
            Tab: 'Tab',
            Backspace: 'Backspace'
        };
        return named[control] ?? control;
    }
    if (device === 'Mouse')
        return ['Left button', 'Middle button', 'Right button'][Number(control)] ?? `Mouse ${control}`;
    if (device === 'Pad')
        return `Pad ${control}`;
    return control;
}
