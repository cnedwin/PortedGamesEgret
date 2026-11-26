// SPDX-License-Identifier: Apache-2.0
// A game's words in each of its languages: one table, a current language that can change while the game runs, and
// a word asked for by its key with values put in. Every string a player reads goes through it, so no Chinese is left
// on an English screen.
import { EgretError } from '@egret/runtime';
const PLACEHOLDER = /\{([A-Za-z0-9_]+)\}/g;
/** Makes a table of a game's words in its languages. */
export function createTextTable(options) {
    const invalid = () => new EgretError('TEXT_TABLE_INVALID');
    if (options === null ||
        typeof options !== 'object' ||
        options.languages === null ||
        typeof options.languages !== 'object')
        throw invalid();
    const languages = Object.keys(options.languages);
    if (languages.length === 0)
        throw invalid();
    for (const language of languages) {
        const words = options.languages[language];
        if (words === null || typeof words !== 'object' || Object.values(words).some(word => typeof word !== 'string'))
            throw invalid();
    }
    const fallback = options.fallback ?? languages[0];
    let language = options.language ?? languages[0];
    if (!languages.includes(fallback) || !languages.includes(language))
        throw invalid();
    const onMissing = options.onMissing;
    if (onMissing !== undefined && typeof onMissing !== 'function')
        throw invalid();
    const told = new Set(), listeners = new Set();
    const own = (words, key) => Object.prototype.hasOwnProperty.call(words, key) ? words[key] : undefined;
    return {
        languages: Object.freeze([...languages]),
        get language() {
            return language;
        },
        setLanguage(next) {
            if (!languages.includes(next))
                throw invalid();
            if (next === language)
                return;
            language = next;
            let first;
            for (const listener of [...listeners])
                try {
                    listener(next);
                }
                catch (cause) {
                    first ??= cause;
                }
            if (first !== undefined)
                throw first;
        },
        text(key, values) {
            if (typeof key !== 'string')
                throw invalid();
            let word = own(options.languages[language], key);
            if (word === undefined) {
                if (onMissing !== undefined && !told.has(language + '\u0000' + key)) {
                    told.add(language + '\u0000' + key);
                    onMissing(key, language);
                }
                word = own(options.languages[fallback], key) ?? key;
            }
            return values === undefined
                ? word
                : word.replace(PLACEHOLDER, (whole, name) => Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : whole);
        },
        has(key) {
            return own(options.languages[language], key) !== undefined;
        },
        onChange(listener) {
            if (typeof listener !== 'function')
                throw invalid();
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        missing() {
            const all = new Set();
            for (const each of languages)
                for (const key of Object.keys(options.languages[each]))
                    all.add(key);
            const result = {};
            for (const each of languages)
                result[each] = Object.freeze([...all].filter(key => own(options.languages[each], key) === undefined).sort());
            return Object.freeze(result);
        }
    };
}
/**
 * The language of `languages` that best matches what the player's browser or system asks for (`navigator.languages`,
 * given here as a list, such as `['zh-CN', 'en']`): an exact match first, then the same main language (`zh-TW` asks
 * for `zh`). The first of `languages` when none matches.
 */
export function pickLanguage(languages, wanted) {
    if (!Array.isArray(languages) || languages.length === 0)
        throw new EgretError('TEXT_TABLE_INVALID');
    const lower = languages.map(language => language.toLowerCase());
    for (const ask of Array.isArray(wanted) ? wanted : []) {
        if (typeof ask !== 'string')
            continue;
        const exact = lower.indexOf(ask.toLowerCase());
        if (exact >= 0)
            return languages[exact];
        const main = ask.toLowerCase().split('-')[0];
        const same = lower.findIndex(language => language.split('-')[0] === main);
        if (same >= 0)
            return languages[same];
    }
    return languages[0];
}
//# sourceMappingURL=textTable.js.map