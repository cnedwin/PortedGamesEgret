import { Texture } from '@egret/runtime';
import type { AssetProvider, AssetRef, AssetLoadContext } from '@egret/runtime';
import type { ManifestPngOwner } from './ManifestByteSource.js';
/** How the browser decodes a PNG: its orientation, alpha and color space conversion. */
export interface BrowserPngDecodeOptions {
    readonly imageOrientation: 'from-image';
    readonly premultiplyAlpha: 'none';
    readonly colorSpaceConversion: 'none';
}
/** How the browser decodes a PNG and makes a canvas, for PNG textures. */
export interface BrowserPngPorts {
    readonly decode: (blob: Blob, options: BrowserPngDecodeOptions) => Promise<ImageBitmap>;
    readonly createCanvas: () => HTMLCanvasElement;
}
/** A PNG texture provider to make: where it reads bytes from, and the ports it decodes with. */
export interface BrowserTextureProviderOptions {
    readonly readBytes: (ref: AssetRef<Texture>, context: AssetLoadContext) => Promise<Uint8Array<ArrayBuffer>>;
    readonly ports?: BrowserPngPorts;
}
/** Loads PNG textures in the browser; close it when done. */
export interface BrowserTextureProvider extends AssetProvider<Texture> {
    readonly profile: 'png-rgb-rgba8-browser-normalized-v1';
    readonly isClosed: boolean;
    close(): Promise<void>;
}
interface ManifestTextureProviderCounters {
    readonly jobs: number;
    readonly encodedCreditBytes: number;
    readonly ownedEncodedBytes: number;
    readonly blobLogicalBytes: number;
    readonly activeDecodes: number;
    readonly bitmapLogicalBytes: number;
    readonly rasterLogicalBytes: number;
    readonly readbackCpuBytes: number;
    readonly materializedCpuBytes: number;
    readonly quarantinedJobs: number;
    readonly unknownNativeObjects: number;
}
/** How many textures a manifest texture provider holds now and at most, and whether it was full. */
export interface ManifestTextureProviderStatus {
    readonly current: ManifestTextureProviderCounters;
    readonly highWater: ManifestTextureProviderCounters;
    readonly saturated: boolean;
}
/** A texture provider for a manifest's images, with its status. */
export interface ManifestTextureProvider extends BrowserTextureProvider {
    getStatus(): ManifestTextureProviderStatus;
}
/** Fixed private assembly options; no public lifecycle callbacks. */
export interface ManifestPngProviderOptions {
    readonly ports?: BrowserPngPorts;
}
/** Caller owns async close; managers own issued Textures and their final demand. */
export declare function createBrowserTextureProvider(options: BrowserTextureProviderOptions): BrowserTextureProvider;
/** Called only by the authenticated optional resource entry. */
export declare function createManifestPngTextureProvider(owner: ManifestPngOwner, options: ManifestPngProviderOptions): ManifestTextureProvider;
export {};
//# sourceMappingURL=BrowserTextureProvider.d.ts.map