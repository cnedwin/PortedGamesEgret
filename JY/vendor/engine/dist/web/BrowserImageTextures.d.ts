import type { AssetLoadContext, AssetProvider, AssetRef, Texture } from '@egret/runtime';
/** What `textureFromCanvas` and `decodeBrowserImage` can read pixels from. */
export type BrowserImageSource = HTMLCanvasElement | OffscreenCanvas | HTMLImageElement | ImageBitmap | {
    readonly width: number;
    readonly height: number;
};
/** The picture formats the browser route recognises by their first bytes. */
export type BrowserImageFormat = 'png' | 'jpeg' | 'webp' | 'gif' | 'avif';
/** How the browser makes a canvas and decodes an image, for image textures. */
export interface BrowserImagePorts {
    /** A fresh canvas of the given size with a 2D context that can be read back. */
    readonly createCanvas: (width: number, height: number) => BrowserImageCanvas;
    /** Decodes encoded bytes into something a 2D context can draw. */
    readonly decode: (bytes: Uint8Array<ArrayBuffer>, type: string) => Promise<BrowserDecodedImage>;
}
/** A canvas to draw a decoded image into. */
export interface BrowserImageCanvas {
    width: number;
    height: number;
    getContext(kind: '2d', options?: {
        willReadFrequently?: boolean;
    }): BrowserImageContext | null;
}
/** The drawing context of such a canvas: draw an image and read its pixels. */
export interface BrowserImageContext {
    drawImage(source: unknown, x: number, y: number, width: number, height: number): void;
    getImageData(x: number, y: number, width: number, height: number): {
        readonly data: Uint8ClampedArray;
    };
}
/** A decoded image: its source, size, and a call that releases it. */
export interface BrowserDecodedImage {
    readonly source: unknown;
    readonly width: number;
    readonly height: number;
    /** Frees what decoding held; called once the pixels are read. */
    readonly release?: () => void;
}
/** How images are decoded: the largest size accepted, and the ports used. */
export interface BrowserImageOptions {
    /** Largest area kept, in pixels; larger pictures are scaled down. At most the 2D image limit. */
    readonly maxPixels?: number;
    /** Longest edge kept, in pixels. At most the 2D image limit. */
    readonly maxEdge?: number;
    /** Replaces the browser operations, for tests or other hosts. */
    readonly ports?: BrowserImagePorts;
}
/** Where an image texture provider reads the bytes of each image from. */
export interface BrowserImageTextureProviderOptions extends BrowserImageOptions {
    /** Reads the encoded bytes a reference names. */
    readonly readBytes: (ref: AssetRef<Texture>, context: AssetLoadContext) => Promise<Uint8Array<ArrayBuffer>>;
}
/** The picture format the bytes start with, or undefined when they start like none of them. */
export declare function sniffBrowserImageFormat(bytes: Uint8Array): BrowserImageFormat | undefined;
/** The size a picture is read at: its own, or scaled down evenly to fit both limits. */
export declare function fitBrowserImageSize(width: number, height: number, options?: Pick<BrowserImageOptions, 'maxPixels' | 'maxEdge'>): {
    width: number;
    height: number;
};
/**
 * Reads a canvas, image or bitmap as a texture of straight RGBA bytes, scaled down when it is larger than
 * the limits. The source is not changed.
 */
export declare function textureFromCanvas(source: BrowserImageSource, options?: BrowserImageOptions): Texture;
/** Decodes PNG, JPEG, WebP, GIF or AVIF bytes with the browser and returns a texture of them. */
export declare function decodeBrowserImage(bytes: Uint8Array<ArrayBuffer>, options?: BrowserImageOptions): Promise<Texture>;
/**
 * An asset provider that reads bytes with `readBytes` and decodes them with the browser. Register it for a
 * texture asset type; disposing a texture releases it.
 */
export declare function createBrowserImageTextureProvider(options: BrowserImageTextureProviderOptions): AssetProvider<Texture>;
//# sourceMappingURL=BrowserImageTextures.d.ts.map