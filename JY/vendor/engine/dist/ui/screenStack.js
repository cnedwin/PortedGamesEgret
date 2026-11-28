// SPDX-License-Identifier: Apache-2.0
// The screens of a game and which is in front: pages in a stack, popups over them and one modal at a time, with
// what each screen gives back when it closes. The stack draws nothing. A screen is made by its definition's `open`
// and told, through its handle, when it is shown, covered, revealed, made active or closed; the application, or the
// data-described screens built on this, shows and hides what it drew.
import { CancellationController, EgretError } from '@egret/runtime';
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const invalid = (what) => new EgretError('UI_SCREENS_DEFINITION_INVALID', { cause: what });
/** Equal parameters: the same value, or plain objects and arrays of equal values, whatever the order of their keys. */
function sameParams(a, b, depth = 0) {
    if (Object.is(a, b))
        return true;
    if (depth > 16 || a === null || b === null || typeof a !== 'object' || typeof b !== 'object')
        return false;
    if (Array.isArray(a) !== Array.isArray(b))
        return false;
    if (Array.isArray(a))
        return (a.length === b.length && a.every((item, i) => sameParams(item, b[i], depth + 1)));
    const plain = (value) => [Object.prototype, null].includes(Object.getPrototypeOf(value));
    if (!plain(a) || !plain(b))
        return false;
    const keys = Object.keys(a);
    return (keys.length === Object.keys(b).length &&
        keys.every(key => Object.prototype.hasOwnProperty.call(b, key) &&
            sameParams(a[key], b[key], depth + 1)));
}
function checkScreen(screen) {
    if (screen === null || typeof screen !== 'object')
        throw invalid('screen');
    const s = screen;
    if (typeof s.id !== 'string' || !ID.test(s.id))
        throw invalid('id');
    if (s.layer !== 'page' && s.layer !== 'popup' && s.layer !== 'modal')
        throw invalid('layer');
    if (s.fullScreen !== undefined && typeof s.fullScreen !== 'boolean')
        throw invalid('fullScreen');
    if (s.back !== undefined && s.back !== 'close' && s.back !== 'none' && typeof s.back !== 'function')
        throw invalid('back');
    if (typeof s.open !== 'function')
        throw invalid('open');
    return s;
}
/**
 * Makes a screen stack. Each call that changes it waits for the ones before, so a screen opened from a button while
 * another is being made opens after it. Screens are told, in this order: when one opens, `show`, then `cover` on the
 * pages it hides, then `deactivate` on the screen that was in front and `activate` on the new one; when one closes,
 * `deactivate` if it was in front, `hide`, `close`, then `reveal` and `activate` on what is in front after it.
 */
export function createUiScreenStack(options = {}) {
    if (options === null || typeof options !== 'object')
        throw new EgretError('UI_SCREENS_OPTIONS_INVALID');
    const limit = options.maxScreens ?? 32, onError = options.onError;
    if (!Number.isSafeInteger(limit) ||
        limit < 1 ||
        limit > 256 ||
        (onError !== undefined && typeof onError !== 'function'))
        throw new EgretError('UI_SCREENS_OPTIONS_INVALID');
    const pages = [], popups = [], waiting = [];
    let modal, closed = false, queue = Promise.resolve(), front;
    const entries = new Map();
    const listeners = new Set();
    /** Runs `work` after everything asked before; its failures reach its caller only. */
    function enqueue(work) {
        const run = queue.then(work);
        queue = run.catch(() => undefined);
        return run;
    }
    /** Calls a hook of a handle; what it throws is kept to give the caller once the step is done. */
    function call(entry, name, errors) {
        const hook = entry.handle?.[name];
        if (typeof hook !== 'function')
            return;
        try {
            hook.call(entry.handle);
        }
        catch (cause) {
            errors.push(cause);
        }
    }
    /** The first failure goes to the caller; the rest are told to `onError`, or to the page. */
    function settleErrors(errors) {
        if (errors.length === 0)
            return;
        for (const extra of errors.slice(1)) {
            if (onError !== undefined)
                onError(extra);
            else
                globalThis.reportError?.(extra);
        }
        throw errors[0];
    }
    const shownTop = () => modal ?? popups.at(-1) ?? pages.at(-1);
    /** Covers and reveals pages, and moves the front, as the stack now stands. */
    function arrange(errors) {
        let hidden = false;
        for (let i = pages.length - 1; i >= 0; i--) {
            const page = pages[i];
            if (hidden !== page.covered) {
                page.covered = hidden;
                call(page, hidden ? 'cover' : 'reveal', errors);
            }
            if (page.screen.fullScreen !== false)
                hidden = true;
        }
        const next = shownTop();
        if (next !== front) {
            const before = front;
            front = next;
            if (before !== undefined && before.state === 'open' && before.active) {
                before.active = false;
                call(before, 'deactivate', errors);
            }
            if (next !== undefined) {
                next.active = true;
                call(next, 'activate', errors);
            }
        }
    }
    function tell() {
        const now = snapshot();
        for (const listener of [...listeners])
            try {
                listener(now);
            }
            catch (cause) {
                if (onError !== undefined)
                    onError(cause);
                else
                    globalThis.reportError?.(cause);
            }
    }
    function listOf(layer) {
        return layer === 'page' ? pages : popups;
    }
    /** Makes and shows a screen. A modal waits while another is shown. */
    async function show(entry) {
        if (entry.state === 'closed')
            return;
        if (entry.screen.layer === 'modal' && modal !== undefined && modal !== entry) {
            entry.state = 'waiting';
            if (!waiting.includes(entry))
                waiting.push(entry);
            return;
        }
        entry.state = 'opening';
        if (entry.screen.layer === 'modal')
            modal = entry;
        let handle;
        try {
            handle = await entry.screen.open(contextOf(entry));
            if (handle !== undefined && (handle === null || typeof handle !== 'object'))
                throw invalid('handle');
        }
        catch (cause) {
            // A screen that could not be made is not kept, and the one who opened it is told why.
            entries.delete(entry.screen.id);
            entry.state = 'closed';
            entry.abort.abort();
            if (modal === entry)
                modal = undefined;
            entry.fail(cause);
            const errors = [];
            arrange(errors);
            await showNextModal();
            tell();
            settleErrors(errors);
            return;
        }
        entry.handle = handle ?? undefined;
        if (entry.screen.layer !== 'modal')
            listOf(entry.screen.layer).push(entry);
        entry.state = 'open';
        const errors = [];
        call(entry, 'show', errors);
        arrange(errors);
        tell();
        const asked = entry.closing;
        if (asked !== undefined)
            await shut([entry], asked.result);
        settleErrors(errors);
    }
    async function showNextModal() {
        while (modal === undefined && waiting.length > 0)
            await show(waiting.shift());
    }
    /** Closes screens, top first, and arranges the stack once after. */
    async function shut(closing, result, results) {
        const errors = [];
        let modalClosed = false;
        for (const entry of closing) {
            if (entry.state === 'closed')
                continue;
            const given = results?.has(entry) ? results.get(entry) : result;
            if (entry.state === 'opening') {
                entry.closing = { result: given };
                continue;
            }
            if (entry.state === 'waiting') {
                waiting.splice(waiting.indexOf(entry), 1);
                entries.delete(entry.screen.id);
                entry.state = 'closed';
                entry.abort.abort();
                entry.settle(given);
                continue;
            }
            if (entry.active) {
                entry.active = false;
                call(entry, 'deactivate', errors);
            }
            if (front === entry)
                front = undefined;
            if (entry === modal) {
                modal = undefined;
                modalClosed = true;
            }
            else {
                const list = listOf(entry.screen.layer);
                list.splice(list.indexOf(entry), 1);
            }
            entries.delete(entry.screen.id);
            entry.state = 'closed';
            call(entry, 'hide', errors);
            call(entry, 'close', errors);
            entry.abort.abort();
            entry.settle(given);
        }
        arrange(errors);
        tell();
        if (modalClosed)
            await showNextModal();
        settleErrors(errors);
    }
    function contextOf(entry) {
        return Object.freeze({
            params: entry.params,
            close: (result) => {
                if (entry.state === 'closed' || closed)
                    return;
                void enqueue(() => shut([entry], result)).catch(cause => {
                    if (onError !== undefined)
                        onError(cause);
                    else
                        globalThis.reportError?.(cause);
                });
            },
            signal: entry.abort.signal,
            get covered() {
                return entry.covered;
            },
            get active() {
                return entry.active;
            }
        });
    }
    function refuseClosed() {
        if (closed)
            throw new EgretError('UI_SCREENS_CLOSED');
    }
    function begin(screen, params) {
        const known = entries.get(screen.id);
        if (known !== undefined) {
            if (known.screen === screen && sameParams(known.params, params))
                return { entry: known, fresh: false };
            throw new EgretError('UI_SCREENS_ALREADY_OPEN', { cause: screen.id });
        }
        if (entries.size >= limit)
            throw new EgretError('UI_SCREENS_FULL', { cause: limit });
        let settle, fail;
        const result = new Promise((resolve, reject) => {
            settle = resolve;
            fail = reject;
        });
        const entry = {
            screen,
            params,
            result,
            settle,
            fail,
            abort: new CancellationController(),
            state: 'waiting',
            handle: undefined,
            covered: false,
            active: false
        };
        entries.set(screen.id, entry);
        return { entry, fresh: true };
    }
    /** Every open, opening or waiting screen, from the one in front down. */
    function stacked() {
        return [...[...waiting].reverse(), ...(modal ? [modal] : []), ...[...popups].reverse(), ...[...pages].reverse()];
    }
    function snapshot() {
        return Object.freeze({
            state: closed ? 'closed' : 'open',
            pages: Object.freeze(pages.map(entry => entry.screen.id)),
            popups: Object.freeze(popups.map(entry => entry.screen.id)),
            modal: modal?.state === 'open' ? modal.screen.id : undefined,
            waiting: Object.freeze(waiting.map(entry => entry.screen.id)),
            active: front?.screen.id,
            covered: Object.freeze(pages.filter(entry => entry.covered).map(entry => entry.screen.id))
        });
    }
    const stack = {
        open(screen, params) {
            refuseClosed();
            checkScreen(screen);
            const { entry, fresh } = begin(screen, params);
            if (fresh)
                void enqueue(() => show(entry)).catch(() => undefined);
            return entry.result;
        },
        close(screen, result) {
            refuseClosed();
            checkScreen(screen);
            return enqueue(async () => {
                const entry = entries.get(screen.id);
                if (entry !== undefined && entry.screen === screen)
                    await shut([entry], result);
            });
        },
        replace(screen, params) {
            refuseClosed();
            if (checkScreen(screen).layer !== 'page')
                throw invalid('replace takes a page');
            const top = pages.at(-1);
            const { entry, fresh } = begin(screen, params);
            if (fresh)
                void enqueue(async () => {
                    if (top !== undefined && top !== entry && top.state !== 'closed')
                        await shut([top]);
                    await show(entry);
                }).catch(() => undefined);
            return entry.result;
        },
        back() {
            refuseClosed();
            return enqueue(async () => {
                const top = front;
                if (top === undefined || top.state !== 'open')
                    return false;
                // The page at the bottom is where a game starts again; the back key does not close it.
                if (top.screen.layer === 'page' && pages.length === 1 && popups.length === 0 && modal === undefined)
                    return false;
                const back = top.screen.back ?? 'close';
                if (back === 'none')
                    return false;
                if (typeof back === 'function') {
                    back();
                    return true;
                }
                await shut([top]);
                return true;
            });
        },
        popTo(screen) {
            refuseClosed();
            checkScreen(screen);
            return enqueue(async () => {
                const target = entries.get(screen.id);
                if (target === undefined || target.screen !== screen || target.state !== 'open')
                    return;
                const all = stacked(), above = all.slice(0, all.indexOf(target));
                await shut(above);
            });
        },
        closeAll(layer) {
            refuseClosed();
            if (layer !== undefined && layer !== 'page' && layer !== 'popup' && layer !== 'modal')
                throw invalid('layer');
            return enqueue(() => shut(stacked().filter(entry => layer === undefined || entry.screen.layer === layer)));
        },
        isOpen(screen) {
            return screen !== null && typeof screen === 'object' && entries.get(screen.id)?.screen === screen;
        },
        get active() {
            return front?.screen;
        },
        snapshot,
        onChange(listener) {
            if (typeof listener !== 'function')
                throw new EgretError('UI_SCREENS_OPTIONS_INVALID');
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        dispose() {
            if (closed)
                return queue.then(() => undefined);
            const done = enqueue(async () => {
                await shut(stacked());
            }).finally(() => {
                closed = true;
                tell();
                listeners.clear();
            });
            return done;
        }
    };
    return Object.freeze(stack);
}
