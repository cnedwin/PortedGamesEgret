import { Font3D } from '../../rendering/world3d/Text3D.js';
/** A canvas font to make: the page's font family, weight and style, how finely it is traced, and how much it is smoothed. */
export interface CanvasFontOptions3D {
    /** A CSS font family the page has loaded. Defaults to `sans-serif`. */
    readonly family?: string;
    /** A CSS font weight, such as `bold` or `700`. Defaults to `normal`. */
    readonly weight?: string | number;
    readonly style?: 'normal' | 'italic';
    /** Canvas pixels to one em when a character is traced, 16 to 512. Defaults to 128; more is finer and slower. */
    readonly resolution?: number;
    /** How far, in traced pixels, a smoothed outline may stray from the pixel edge. Defaults to 0.75. */
    readonly tolerance?: number;
}
/**
 * A `Font3D` whose glyphs are traced from the page's own fonts, for 3D text in any script the page can draw, such as
 * the Chinese of a road sign, without a font file. Each character is drawn and traced once, when first used. The
 * outlines are straight segments following the drawn edge, so curves are as smooth as `resolution` allows. Where the
 * page has neither `OffscreenCanvas` nor a document, it throws `WORLD3D_CONTEXT_UNAVAILABLE`.
 */
export declare function createCanvasFont3D(options?: CanvasFontOptions3D): Font3D;
//# sourceMappingURL=canvasFont3D.d.ts.map