// SPDX-License-Identifier: Apache-2.0
// Parts most game screens need, as plain logic that draws nothing: red dots that add up from what they hold, numbers
// written short in the reader's way (12.3K, 1.2万), and a request that a button cannot send twice. Part of the
// optional entry @egret/engine/web/view; play draws them through `game.show`.
import { EgretError } from '@egret/runtime';
const PATH = /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/;
const badPath = (path) => new EgretError('UI_BADGE_PATH_INVALID', { cause: String(path) + ' is not a path such as mail/system' });
/** Makes a tree of red dots. Paths are names joined by `/`: letters, digits, `_`, `-` and `.`. */
export function createBadges() {
    const own = new Map();
    const listeners = new Set();
    const check = (path) => {
        if (typeof path !== 'string' || !PATH.test(path) || path.length > 256)
            throw badPath(path);
        return path;
    };
    const under = (path, of) => path === of || path.startsWith(of + '/');
    const told = () => {
        for (const listener of [...listeners])
            listener();
    };
    return {
        set(path, value) {
            check(path);
            const next = value === true
                ? 1
                : value === false
                    ? 0
                    : typeof value === 'number' && Number.isFinite(value)
                        ? Math.max(0, Math.floor(value))
                        : NaN;
            if (Number.isNaN(next))
                throw new EgretError('UI_BADGE_PATH_INVALID', { cause: path + ': a count, or true or false' });
            if ((own.get(path) ?? 0) === next)
                return;
            if (next === 0)
                own.delete(path);
            else
                own.set(path, next);
            told();
        },
        count(path) {
            check(path);
            let total = 0;
            for (const [at, value] of own)
                if (under(at, path))
                    total += value;
            return total;
        },
        has(path) {
            check(path);
            for (const at of own.keys())
                if (under(at, path))
                    return true;
            return false;
        },
        clear(path) {
            if (path !== undefined)
                check(path);
            let changed = false;
            for (const at of [...own.keys()])
                if (path === undefined || under(at, path)) {
                    own.delete(at);
                    changed = true;
                }
            if (changed)
                told();
        },
        paths: () => Object.freeze([...own.keys()].sort()),
        onChange(listener) {
            if (typeof listener !== 'function')
                throw new EgretError('UI_BADGE_PATH_INVALID', { cause: 'a listener is a function' });
            listeners.add(listener);
            return () => listeners.delete(listener);
        }
    };
}
/**
 * A number written short for a screen: 999, 12.3K and 4.5M in English; 9999, 1.2万 and 3.4亿 in Chinese. Below the
 * first step it is written whole; a minus sign is kept. Written by hand, so it is the same wherever it runs.
 */
export function formatCompact(value, options = {}) {
    if (typeof value !== 'number' || Number.isNaN(value))
        throw new EgretError('UI_COMPACT_INVALID', { cause: 'a number' });
    const locale = options.locale ?? 'en', digits = options.digits ?? 1;
    if ((locale !== 'en' && locale !== 'zh') || !Number.isInteger(digits) || digits < 0 || digits > 3)
        throw new EgretError('UI_COMPACT_INVALID', { cause: "locale is 'en' or 'zh'; digits are 0 to 3" });
    if (!Number.isFinite(value))
        return value > 0 ? '∞' : '-∞';
    const sign = value < 0 ? '-' : '', size = Math.abs(value);
    const steps = locale === 'zh'
        ? [
            [1e12, '万亿'],
            [1e8, '亿'],
            [1e4, '万']
        ]
        : [
            [1e12, 'T'],
            [1e9, 'B'],
            [1e6, 'M'],
            [1e3, 'K']
        ];
    const scale = 10 ** digits;
    for (let index = 0; index < steps.length; index++) {
        const [step, mark] = steps[index];
        if (size < step)
            continue;
        // Cut, not round, so that 9999 is never 10K short of what it is; a cut that reaches the next step uses it.
        const shown = Math.floor((size / step) * scale) / scale;
        const above = steps[index - 1];
        if (above !== undefined && shown * step >= above[0])
            return sign + trim(Math.floor((size / above[0]) * scale) / scale, digits) + above[1];
        return sign + trim(shown, digits) + mark;
    }
    return sign + String(Math.floor(size));
}
const trim = (value, digits) => value.toFixed(digits).replace(/\.?0+$/, '');
/** Wraps what a button sends, such as a purchase, so that it is sent once at a time and its state can be shown. */
export function createRequest(send) {
    if (typeof send !== 'function')
        throw new EgretError('UI_REQUEST_INVALID', { cause: 'a request sends with a function' });
    let out, result, error, sent = 0;
    return {
        run(...args) {
            if (out !== undefined)
                return out;
            sent++;
            error = undefined;
            const going = (async () => {
                try {
                    result = await send(...args);
                    return result;
                }
                catch (cause) {
                    error = cause ?? new EgretError('UI_REQUEST_INVALID', { cause: 'it failed without a reason' });
                    return undefined;
                }
                finally {
                    out = undefined;
                }
            })();
            // The function above runs to its first `await` and no further, so `out` is let go only after it is set here.
            out = going;
            return going;
        },
        get busy() {
            return out !== undefined;
        },
        get result() {
            return result;
        },
        get error() {
            return error;
        },
        get sent() {
            return sent;
        }
    };
}
/** The words of a key or a button, as a player reads them on a key cap. */
export function keyCap(key, device) {
    if (typeof key !== 'string' || key === '')
        return '';
    if (device === 'gamepad') {
        const pad = {
            a: 'A',
            b: 'B',
            x: 'X',
            y: 'Y',
            l1: 'LB',
            r1: 'RB',
            l2: 'LT',
            r2: 'RT',
            select: 'View',
            start: 'Menu',
            up: 'D-pad Up',
            down: 'D-pad Down',
            left: 'D-pad Left',
            right: 'D-pad Right'
        };
        return pad[key.replace(/^pad:/, '').toLowerCase()] ?? key;
    }
    const named = {
        space: 'Space',
        enter: 'Enter',
        escape: 'Esc',
        shift: 'Shift',
        tab: 'Tab',
        left: 'Left',
        right: 'Right',
        up: 'Up',
        down: 'Down',
        backspace: 'Backspace'
    };
    const lower = key.toLowerCase();
    if (named[lower] !== undefined)
        return named[lower];
    if (/^Key[A-Z]$/.test(key))
        return key.slice(3);
    if (/^Digit[0-9]$/.test(key))
        return key.slice(5);
    if (/^Arrow(Left|Right|Up|Down)$/.test(key))
        return key.slice(5);
    return key.length === 1 ? key.toUpperCase() : key;
}
