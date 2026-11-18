import type { SaveStorage } from '@egret/engine/kit';
export interface IndexedDBSaveStorage extends SaveStorage {
    /** Resolves when every write so far has reached the database; rejects with the first that failed. */
    flush(): Promise<void>;
    /** Closes the database; later writes are refused. */
    close(): void;
}
export interface IndexedDBSaveStorageOptions {
    /** The database name; one per game. */
    readonly database: string;
    /** The IndexedDB factory; the page's by default. */
    readonly indexedDB?: IDBFactory;
    /** Told of a write that failed after it was accepted, as when the disk is full. */
    readonly onError?: (cause: unknown) => void;
}
/**
 * A save storage over IndexedDB. Opening reads every saved string into memory, so `createSaveStore` reads it
 * synchronously as it does local storage; each write goes to memory at once and to the database after.
 */
export declare function openIndexedDBSaveStorage(options: IndexedDBSaveStorageOptions): Promise<IndexedDBSaveStorage>;
/** Where fetched bundle entries are kept between visits; used as `cache` of `openBrowserAssetBundle`. */
export interface BundleCache {
    match(key: string): Promise<Uint8Array | undefined>;
    put(key: string, bytes: Uint8Array): Promise<void>;
    /** Forgets every entry whose key does not start with one of `keep`, as after a new build. */
    prune(keep: readonly string[]): Promise<number>;
}
/**
 * A bundle cache in the Cache API under `name`. Entries are kept by the bundle's address and each entry's
 * checksum, so a rebuilt bundle never serves an old entry. Where the Cache API is missing, every lookup misses.
 */
export declare function openBrowserBundleCache(name: string, cacheStorage?: CacheStorage): Promise<BundleCache>;
//# sourceMappingURL=BrowserStorage.d.ts.map