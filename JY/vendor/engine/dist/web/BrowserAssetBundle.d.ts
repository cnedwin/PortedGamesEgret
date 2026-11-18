import type { AssetBundleEntry, AssetBundleIndex } from '@egret/engine/kit';
export interface BrowserAssetBundleOptions {
    /** `fetch` by default; tests and service workers give their own. */
    readonly fetch?: (url: string, init?: {
        headers?: Record<string, string>;
        signal?: AbortSignal;
    }) => Promise<Response>;
    readonly signal?: AbortSignal;
    /** Fetch the whole file at once instead of by ranges. */
    readonly whole?: boolean;
    /**
     * Keeps the index and every entry read, so the bundle opens and reads again without the network. Entries are
     * kept by the bundle's address and their checksums, so a rebuilt bundle never serves an old one.
     * `openBrowserBundleCache` makes one.
     */
    readonly cache?: {
        match(key: string): Promise<Uint8Array | undefined>;
        put(key: string, bytes: Uint8Array): Promise<void>;
    };
}
export interface BrowserAssetBundle {
    readonly url: string;
    readonly index: AssetBundleIndex;
    /** True when the host answered byte ranges; false when the whole file was fetched. */
    readonly ranged: boolean;
    /** Entries whose tags include every tag given. */
    entries(...tags: string[]): readonly AssetBundleEntry[];
    /** The bytes of each named entry, fetched in as few requests as their places allow. */
    read(names: readonly string[]): Promise<Map<string, Uint8Array>>;
    /** The bytes of one entry. */
    get(name: string): Promise<Uint8Array>;
    /** Bytes fetched so far. */
    readonly transferred: number;
    /** True when the index came from the cache because the bundle could not be fetched. */
    readonly offline: boolean;
}
/** Opens the bundle at `url`, reading its index. */
export declare function openBrowserAssetBundle(url: string, options?: BrowserAssetBundleOptions): Promise<BrowserAssetBundle>;
//# sourceMappingURL=BrowserAssetBundle.d.ts.map