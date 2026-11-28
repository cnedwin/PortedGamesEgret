// SPDX-License-Identifier: Apache-2.0
// A game's save: settings, progress, unlocked tiers, best marks. It is plain
// data kept under one key, with a version number and the steps that bring an
// older save up to date, so a save from last month's build still loads. A save
// that cannot be read or written never stops the game: the store reports it
// and goes on with the data it has. The storage is given, so the same store
// works over browser storage, a file, or a test's map.
import { EgretError } from '@egret/runtime';
const isObject = (value) => typeof value === 'object' && value !== null;
/** Opens the save under `options.key`, migrating an older one. */
/** A deep copy: by `structuredClone` where the platform has it, else through JSON, as the save is stored. */
function copyOf(value) {
    const clone = globalThis.structuredClone;
    return typeof clone === 'function' ? clone(value) : JSON.parse(JSON.stringify(value));
}
export function createSaveStore(options) {
    if (!isObject(options))
        throw new EgretError('SAVE_STORE_OPTIONS_INVALID');
    const { key, version, defaults, storage } = options;
    if (typeof key !== 'string' || key.length === 0 || key.length > 200)
        throw new EgretError('SAVE_STORE_OPTIONS_INVALID');
    if (!Number.isSafeInteger(version) || version < 1)
        throw new EgretError('SAVE_STORE_OPTIONS_INVALID');
    if (typeof defaults !== 'function')
        throw new EgretError('SAVE_STORE_OPTIONS_INVALID');
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function')
        throw new EgretError('SAVE_STORE_OPTIONS_INVALID');
    const migrations = options.migrations ?? {};
    const validate = options.validate ?? ((data) => isObject(data));
    const report = (kind, cause) => {
        try {
            options.onProblem?.({ kind, key, ...(cause === undefined ? {} : { cause }) });
        }
        catch {
            /* A failing listener must not break loading. */
        }
    };
    const keepAside = (text) => {
        try {
            storage.setItem(key + '.unread', text);
        }
        catch {
            /* Nothing more can be done for it. */
        }
    };
    // Reads text into data of this version, or explains why not.
    const read = (text) => {
        let envelope;
        try {
            envelope = JSON.parse(text);
        }
        catch (cause) {
            return { problem: 'unreadable', cause };
        }
        if (!isObject(envelope) || !Number.isSafeInteger(envelope.version) || envelope.version < 1)
            return { problem: 'unreadable' };
        if (envelope.version > version)
            return { problem: 'too-new' };
        let data = envelope.data;
        for (let at = envelope.version; at < version; at++) {
            const step = migrations[at];
            if (typeof step !== 'function')
                return { problem: 'too-old' };
            try {
                data = step(data);
            }
            catch (cause) {
                return { problem: 'migration-failed', cause };
            }
        }
        if (!validate(data))
            return { problem: 'invalid' };
        return { data: data, from: envelope.version };
    };
    let data = defaults();
    let loadedVersion;
    let text = null;
    try {
        text = storage.getItem(key);
    }
    catch (cause) {
        report('unreadable', cause);
    }
    if (text !== null) {
        const result = read(text);
        if ('data' in result) {
            data = result.data;
            loadedVersion = result.from;
        }
        else {
            report(result.problem, result.cause);
            keepAside(text);
        }
    }
    // New data that fails the check is not kept or written: the save on disk stays the last good one.
    const refuse = (value) => {
        report('invalid', new TypeError('The new save data fails validate' +
            (isObject(value) ? '' : ': it is ' + (value === null ? 'null' : typeof value) + ', not an object') +
            '. A change that edits in place returns nothing; write it as a block.'));
        return false;
    };
    const write = () => {
        try {
            const envelope = { version, savedAt: new Date().toISOString(), data };
            storage.setItem(key, JSON.stringify(envelope));
            return true;
        }
        catch (cause) {
            report('write-failed', cause);
            return false;
        }
    };
    // A migrated save is written back at once in its new form.
    if (loadedVersion !== undefined && loadedVersion < version)
        write();
    const store = {
        get data() {
            return data;
        },
        get loadedVersion() {
            return loadedVersion;
        },
        save(next) {
            if (next !== undefined) {
                if (!validate(next))
                    return refuse(next);
                data = next;
            }
            return write();
        },
        update(change) {
            if (typeof change !== 'function')
                throw new EgretError('SAVE_STORE_OPTIONS_INVALID');
            // A copy, so that a change refused, or one that throws halfway, does not reach the data.
            const draft = copyOf(data);
            const result = change(draft);
            const next = result === undefined ? draft : result;
            if (!validate(next))
                return refuse(next);
            data = next;
            return write();
        },
        reset() {
            data = defaults();
            return write();
        },
        remove() {
            try {
                storage.removeItem(key);
            }
            catch (cause) {
                report('write-failed', cause);
            }
        },
        export() {
            return JSON.stringify({ version, savedAt: new Date().toISOString(), data });
        },
        import(imported) {
            if (typeof imported !== 'string')
                return false;
            const result = read(imported);
            if (!('data' in result)) {
                report(result.problem, result.cause);
                return false;
            }
            data = result.data;
            return write();
        }
    };
    return store;
}
/** Storage kept in memory: for tests, for a page without browser storage, or for a game played once. */
export function createMemorySaveStorage(initial = {}) {
    const entries = new Map(Object.entries(initial));
    return {
        entries,
        getItem: key => entries.get(key) ?? null,
        setItem: (key, value) => void entries.set(key, String(value)),
        removeItem: key => void entries.delete(key)
    };
}
