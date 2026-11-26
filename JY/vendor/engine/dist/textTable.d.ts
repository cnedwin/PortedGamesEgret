/** The words of one language, by key. A value may name `{placeholders}`. */
export type TextTableWords = Readonly<Record<string, string>>;
/** A text table to make: the words of each language, the language to start in and the one to fall back to. */
export interface TextTableOptions<L extends string> {
    /** One set of words per language, such as `{ zh: { start: '开始' }, en: { start: 'Start' } }`. */
    readonly languages: Readonly<Record<L, TextTableWords>>;
    /** The language to start in. The first that `languages` names unless given. */
    readonly language?: L;
    /** Where a word missing from the current language is taken from. The first language unless given. */
    readonly fallback?: L;
    /** Told of a key missing from the current language, once per key and language: for a check in development. */
    readonly onMissing?: (key: string, language: L) => void;
}
/** A game's words in its languages: the current one, a word by key, and who is told when the language changes. */
export interface TextTable<L extends string> {
    readonly languages: readonly L[];
    /** The current language. */
    readonly language: L;
    /** Changes the language and tells every listener, which redraws the words it shows. */
    setLanguage(language: L): void;
    /**
     * The word for `key` in the current language, else in the fallback, else the key itself, with each `{name}` replaced
     * by `values[name]`.
     */
    text(key: string, values?: Readonly<Record<string, string | number>>): string;
    /** Whether the current language has its own word for `key`. */
    has(key: string): boolean;
    /** Calls `listener` whenever the language changes. The function returned stops it. */
    onChange(listener: (language: L) => void): () => void;
    /** The keys some language has and another lacks, by language: for a test that every word is in every language. */
    missing(): Readonly<Record<L, readonly string[]>>;
}
/** Makes a table of a game's words in its languages. */
export declare function createTextTable<L extends string>(options: TextTableOptions<L>): TextTable<L>;
/**
 * The language of `languages` that best matches what the player's browser or system asks for (`navigator.languages`,
 * given here as a list, such as `['zh-CN', 'en']`): an exact match first, then the same main language (`zh-TW` asks
 * for `zh`). The first of `languages` when none matches.
 */
export declare function pickLanguage<L extends string>(languages: readonly L[], wanted: readonly string[]): L;
//# sourceMappingURL=textTable.d.ts.map