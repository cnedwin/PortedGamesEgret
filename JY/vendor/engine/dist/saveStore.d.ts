/** Where a save is kept: strings by key. Browser storage is one; `createMemorySaveStorage` is another. */
export interface SaveStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
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
export type SaveProblemKind = 'unreadable' | 'invalid' | 'too-new' | 'too-old' | 'migration-failed' | 'write-failed';
export interface SaveProblem {
    readonly kind: SaveProblemKind;
    readonly key: string;
    readonly cause?: unknown;
}
export interface SaveStore<T> {
    /** The data now: loaded, migrated, or the defaults. */
    readonly data: T;
    /** The version the loaded save had before migration, or undefined for a new game. */
    readonly loadedVersion: number | undefined;
    /** Replaces the data and writes it. Returns false when the storage refused, as when it is full. */
    save(data?: T): boolean;
    /** Changes the data with `change`, which may edit it in place or return new data, then writes it. */
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
/** Opens the save under `options.key`, migrating an older one. */
export declare function createSaveStore<T>(options: SaveStoreOptions<T>): SaveStore<T>;
/** Storage kept in memory: for tests, for a page without browser storage, or for a game played once. */
export declare function createMemorySaveStorage(initial?: Readonly<Record<string, string>>): SaveStorage & {
    readonly entries: ReadonlyMap<string, string>;
};
//# sourceMappingURL=saveStore.d.ts.map