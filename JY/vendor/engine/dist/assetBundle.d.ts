/** One file to put in a bundle. */
export interface AssetBundleInput {
    /** A path-like name, unique in the bundle: `models/hero-high.glb`. */
    readonly name: string;
    readonly bytes: Uint8Array;
    /** A media type, kept for the reader: `model/gltf-binary`, `image/webp`. */
    readonly type?: string;
    /** Free labels a game can filter by, such as a quality tier or a level. */
    readonly tags?: readonly string[];
}
/** One file in an asset bundle: its name, where its bytes are, its type and tags, and its check. */
export interface AssetBundleEntry {
    readonly name: string;
    /** Bytes from the start of the bundle file. */
    readonly offset: number;
    readonly size: number;
    readonly type: string;
    readonly tags: readonly string[];
    /** FNV-1a 32-bit of the bytes, as eight hex digits: a quick check that a range came back whole. */
    readonly check: string;
}
/** The table of an asset bundle: its size, where its data begins, and its entries. */
export interface AssetBundleIndex {
    readonly version: 1;
    /** Bytes of the whole file. */
    readonly size: number;
    /** Bytes before the first entry: the header and the index. */
    readonly dataOffset: number;
    readonly entries: readonly AssetBundleEntry[];
}
/** FNV-1a over the bytes, as eight hex digits. */
export declare function assetBundleCheck(bytes: Uint8Array): string;
/** One file holding every input, in the order given, each starting at a multiple of four bytes. */
export declare function writeAssetBundle(inputs: readonly AssetBundleInput[]): Uint8Array<ArrayBuffer>;
/** How many bytes from the start must be read to know the index's length: the header. */
export declare const ASSET_BUNDLE_HEADER_BYTES = 12;
/** The index length a header gives, so a reader can ask for exactly the bytes of the index. */
export declare function readAssetBundleHeader(head: Uint8Array): {
    readonly indexBytes: number;
};
/** The index of a bundle from its first bytes: at least the header and the index. */
export declare function readAssetBundleIndex(head: Uint8Array): AssetBundleIndex;
/**
 * The bytes of one entry from bytes of the bundle that start at `start` (0 for the whole file), checked against
 * the index. The result shares memory with `bytes`.
 */
export declare function sliceAssetBundle(index: AssetBundleIndex, name: string, bytes: Uint8Array, start?: number): Uint8Array;
/** Ranges of the file that hold the named entries, joined where they touch or lie within `gap` bytes. */
export declare function planAssetBundleRanges(index: AssetBundleIndex, names: readonly string[], gap?: number): {
    readonly start: number;
    readonly end: number;
    readonly names: readonly string[];
}[];
//# sourceMappingURL=assetBundle.d.ts.map