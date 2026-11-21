declare const imageData2DBrand: unique symbol;
/** The size and pixels of an image to copy: sRGB RGBA, eight bits a channel, rows top to bottom. */
export interface ImageData2DInput {
    readonly width: number;
    readonly height: number;
    readonly pixels: Uint8Array<ArrayBuffer>;
    readonly format?: 'rgba8unorm';
    readonly colorSpace?: 'srgb';
    readonly alphaMode?: 'straight';
    readonly origin?: 'top-left';
}
/** Immutable CPU byte identity; the brand conveys no asset or GPU authority. */
export interface ImageData2D {
    readonly [imageData2DBrand]: true;
    readonly width: number;
    readonly height: number;
    readonly bytesPerRow: number;
    readonly byteLength: number;
    readonly format: 'rgba8unorm';
    readonly colorSpace: 'srgb';
    readonly alphaMode: 'straight';
    readonly origin: 'top-left';
}
/** A rectangle of an image in whole pixels, from its top left corner. */
export interface TextureRegion2D {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}
/** The largest image accepted: its longest edge and its number of pixels. */
export declare const IMAGE_LIMITS_2D: Readonly<{
    readonly maxSourceEdge: 4096;
    readonly maxSourcePixels: 4194304;
    readonly maxImagesPerFrame: 64;
    readonly maxViewsPerFrame: 128;
    readonly maxImageTableBytes: 16777216;
    readonly maxProjectionBytes: 16777216;
    readonly maxImageScratchBytes: 33554432;
    readonly maxPendingTextureBytes: 33554432;
}>;
/** Copies the pixels into an image this module owns; a wrong size or pixel count is refused with a TypeError. */
export declare function createImageData2D(input: ImageData2DInput): ImageData2D;
/** Whether a value is an image made by `createImageData2D`, without reading any of its properties. */
export declare function isImageData2D(value: unknown): value is ImageData2D;
/** A fresh copy of an image's pixels, which the caller owns. */
export declare function copyImageData2DPixels(image: ImageData2D): Uint8Array<ArrayBuffer>;
export {};
//# sourceMappingURL=ImageData2D.d.ts.map