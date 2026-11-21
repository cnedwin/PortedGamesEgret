import type { ImageData2D } from '@egret/contracts';
/** Selected sRGB transfer. Alpha and tint coefficients are never gamma converted. */
export declare function decodeSharedSRGB(value: number): number;
/** The linear-light value of an sRGB byte, from the written table: the same number in every JavaScript engine. */
export declare function decodeSharedSRGBByte(code: number): number;
/** The recipe and target a frame records for each blend space. */
export declare const SHARED_BLEND_RECIPES_2D: Readonly<{
    linear: Readonly<{
        readonly colorRecipe: 'egret.linear-srgb-pma/1';
        readonly targetRepresentation: 'egret.srgb-pma8-target/1';
    }>;
    srgb: Readonly<{
        readonly colorRecipe: 'egret.srgb-pma/1';
        readonly targetRepresentation: 'egret.encoded-srgb-pma8-target/1';
    }>;
}>;
/** The blend space of a frame whose recipe and target agree, or undefined. */
export declare function sharedBlendSpace2D(frame: {
    readonly colorRecipe: string;
    readonly targetRepresentation: string;
}): 'linear' | 'srgb' | undefined;
/**
 * The 0-to-1 value a target of the blend space holds for a channel byte of a colour: its linear light, or the
 * byte as it is written in a target that mixes the codes.
 */
export declare function sharedTargetChannel2D(space: 'linear' | 'srgb', code: number): number;
export declare function encodeSharedSRGB(value: number): number;
/**
 * How many levels a page of this size has when it carries its smaller copies: the page itself, then each copy
 * half as large, rounded down and never below one texel, down to one texel.
 */
export declare function sharedPageLevels2D(width: number, height: number): number;
/** The size of each level of a page, and where its bytes start in the page's bytes. */
export declare function sharedPageLevelLayout2D(width: number, height: number, levels: number): {
    width: number;
    height: number;
    offset: number;
}[];
/** The bytes of a page with `levels` levels: the page's own, then those of each smaller copy after it. */
export declare function sharedPageChainBytes2D(width: number, height: number, levels: number): number;
/** Plain Host-owned observation only; no allocator, callback or resource authority. */
export interface SharedPageCopyDiagnostics2D {
    canonicalBytes: number;
    scratchBytes: number;
    highCanonicalBytes: number;
    highScratchBytes: number;
    highTemporaryBytes: number;
    saturated: boolean;
}
/** One actual source copy and one tight canonical output; callers reserve that peak first. */
export declare function copySharedPagePixels(image: ImageData2D, diagnostics?: SharedPageCopyDiagnostics2D, levels?: number): Uint8Array<ArrayBuffer>;
//# sourceMappingURL=sharedColor2D.d.ts.map