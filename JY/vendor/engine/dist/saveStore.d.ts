/** Where a save is kept: strings by key. Browser storage is one; `createMemorySaveStorage` is another. */
export interface SaveStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
/** A save to keep: its key and version, its defaults and migrations, its check and its storage. */
export interface SaveStoreOptions<T> {
    /** The key the save is kept under. */
    readonly key: string;
    /** The version this build writes; a whole number from 1. */
    readonly version: number;
    /** The data of a new game; also what a missing or unreadable save becomes. */
    readonly defaults: () => T;
    /**
     * Steps from an older version: `migrations[n]` turns data of version n into version n + 1. A save older than
     * the oldest step, or newer than this build, starts again from the defaults and is kept aside under
     * `<key>.unread` so nothing is lost.
     */
    readonly migrations?: Readonly<Record<number, (data: unknown) => unknown>>;
    /** Checks loaded data; a save that fails it starts from the defaults. Defaults to accepting any object. */
    readonly validate?: (data: unknown) => data is T;
    readonly storage: SaveStorage;
    /** Told of every load or write that did not go as planned. */
    readonly onProblem?: (problem: SaveProblem) => void;
}
/** What went wrong with a save: unreadable, invalid, too new or too old, or a migration or write that failed. */
export type SaveProblemKind = 'unreadable' | 'invalid' | 'too-new' | 'too-old' | 'migration-failed' | 'write-failed';
/** A problem with a save: what kind, which key, and its cause. */
export interface SaveProblem {
    readonly kind: SaveProblemKind;
    readonly key: string;
    readonly cause?: unknown;
}
/** A saved value: read it, change it and save it, reset or remove it, export or import it. */
export interface SaveStore<T> {
    /** The data now: loaded, migrated, or the defaults. */
    readonly data: T;
    /** The version the loaded save had before migration, or undefined for a new game. */
    readonly loadedVersion: number | undefined;
    /**
     * Replaces the data and writes it. Returns false when the storage refused, as when it is full, or when the new
     * data fails `validate`: then it is reported as `invalid` and the data stays as it was.
     */
    save(data?: T): boolean;
    /**
     * Changes the data with `change`, which may edit it in place or return new data, then writes it. What it returns,
     * other than `undefined`, replaces the data only if it passes `validate`, so `data => (data.coins = 5)`, which
     * returns 5, is reported as `invalid` and keeps the save; write such a change as a block, `data => { data.coins = 5; }`.
     * Data edited in place that no longer passes `validate` is reported and not written.
     *
     * `change` is given a copy of the data, and the copy becomes the data only once it passes: a refused change, or one
     * that throws, leaves `data` exactly as it was. So `save.data` is a new object after an update; read it again rather
     * than keeping the old one.
     */
    update(change: (data: T) => T | void): boolean;
    /** Back to the defaults, written. */
    reset(): boolean;
    /** Takes the save out of the storage. The data stays as it was in memory. */
    remove(): void;
    /** The save as a string, for an export button. */
    export(): string;
    /** Loads an exported string, migrating it like a stored save. Returns false and changes nothing when it cannot. */
    import(text: string): boolean;
}
export declare function createSaveStore<T>(options: SaveStoreOptions<T>): SaveStore<T>;
/** Storage kept in memory: for tests, for a page without browser storage, or for a game played once. */
export declare function createMemorySaveStorage(initial?: Readonly<Record<string, string>>): SaveStorage & {
    readonly entries: ReadonlyMap<string, string>;
};
//# sourceMappingURL=saveStore.d.ts.map