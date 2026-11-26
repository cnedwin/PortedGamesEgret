// SPDX-License-Identifier: Apache-2.0
// The check and the fill of a save, read from the shape of its defaults. Games wrote both by hand, a field at a time:
// a `validate` that a save store runs on what it loads, and a step that gives a save from an older build the fields
// added since. Both follow from the defaults: a number stays a number, a list a list, a table a table with at least the
// defaults' fields, and a field the save lacks is the default's. Rules name what the defaults cannot say: the words a
// setting may be, a whole number between two others, or a check of one's own.
import { EgretError } from '@egret/runtime';
const plain = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const copy = (value) => Array.isArray(value)
    ? value.map(copy)
    : plain(value)
        ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, copy(v)]))
        : value;
function describeRule(rule) {
    if (typeof rule === 'function')
        return 'what its check accepts';
    if (Array.isArray(rule))
        return 'one of ' + rule.map(value => JSON.stringify(value)).join(', ');
    const range = rule;
    return ((range.int ? 'a whole number' : 'a number') +
        (range.min !== undefined ? ' from ' + range.min : '') +
        (range.max !== undefined ? ' to ' + range.max : ''));
}
function keeps(rule, value) {
    if (typeof rule === 'function')
        return rule(value) === true;
    if (Array.isArray(rule))
        return rule.includes(value);
    const range = rule;
    return (typeof value === 'number' &&
        Number.isFinite(value) &&
        (!range.int || Number.isInteger(value)) &&
        (range.min === undefined || value >= range.min) &&
        (range.max === undefined || value <= range.max));
}
/**
 * The check and the fill of a save whose new game is `defaults` (the data, or the function a save store is given).
 * `rules` are keyed by the path of a field, its names joined by dots, with `*` for every element of a list or every
 * field of a table: `'settings.language': ['zh', 'en']`, `'best.normal': { int: true, min: 0, max: 3 }`,
 * `'nights.*': night => …`. A field whose default is `null` may hold anything its rule allows, or anything without one.
 *
 *     const shape = shapeOf(freshSave, { 'settings.language': ['zh', 'en'] });
 *     createSaveStore({ key: 'my-game', version: 1, defaults: freshSave, storage, validate: shape.validate });
 */
export function shapeOf(defaults, rules = {}) {
    const sample = typeof defaults === 'function' ? defaults() : defaults;
    if (!plain(sample))
        throw new EgretError('SAVE_STORE_OPTIONS_INVALID');
    const ruled = Object.entries(rules).map(([path, rule]) => {
        if (typeof path !== 'string' || path === '' || !(typeof rule === 'function' || Array.isArray(rule) || plain(rule)))
            throw new EgretError('SAVE_STORE_OPTIONS_INVALID');
        return { parts: path.split('.'), rule };
    });
    const ruleAt = (at) => ruled.find(({ parts }) => parts.length === at.length && parts.every((part, i) => part === '*' || part === at[i]))
        ?.rule;
    function check(value, like, at, found) {
        const where = at.join('.') || '(the save)';
        const rule = ruleAt(at);
        if (rule !== undefined && !keeps(rule, value)) {
            found.push(`${where}: ${describeRule(rule)}`);
            return;
        }
        if (like === null || like === undefined)
            return;
        if (typeof like === 'number') {
            if (typeof value !== 'number' || !Number.isFinite(value))
                found.push(`${where}: a number`);
        }
        else if (typeof like === 'string' || typeof like === 'boolean') {
            if (typeof value !== typeof like)
                found.push(`${where}: ${typeof like === 'string' ? 'words' : 'true or false'}`);
        }
        else if (Array.isArray(like)) {
            if (!Array.isArray(value))
                found.push(`${where}: a list`);
            else
                value.forEach((item, i) => check(item, like[0], [...at, String(i)], found));
        }
        else if (plain(like)) {
            if (!plain(value)) {
                found.push(`${where}: a table of fields`);
                return;
            }
            for (const key of Object.keys(like))
                check(value[key], like[key], [...at, key], found);
            // Fields the defaults do not name (a table of nights by number) are held to a rule of their own, if any.
            for (const key of Object.keys(value))
                if (!(key in like) && ruleAt([...at, key]) !== undefined)
                    check(value[key], undefined, [...at, key], found);
        }
    }
    function fill(data, like = sample) {
        if (!plain(data) || !plain(like))
            return data;
        for (const [key, value] of Object.entries(like)) {
            if (data[key] === undefined)
                data[key] = copy(value);
            else
                fill(data[key], value);
        }
        return data;
    }
    const problems = (data) => {
        const found = [];
        check(data, sample, [], found);
        return found;
    };
    return Object.freeze({
        validate: (data) => problems(fill(data)).length === 0,
        fill: (data) => fill(data),
        problems
    });
}
