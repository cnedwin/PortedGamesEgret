import type { Video } from '@egret/engine/video';
import type { AssetManager } from '@egret/runtime';
/** One file of a film offered in several: its address and, when known, its media type. */
export interface BrowserVideoSource {
    readonly src: string;
    readonly type?: string;
}
/** A browser video to make: its assets, its source or stream or element, and whether it loops, is muted and how loud. */
export interface BrowserVideoOptions {
    /** The Engine's assets, which lease each picture as a texture. */
    readonly assets: AssetManager;
    /** A file to play, or a stream such as a canvas's or a camera's, or a video element of the page's own. One of the three. */
    /**
     * One address, or the same film in several files to choose from, as `<source>` elements give them: the first the
     * browser can play is played, and one that fails to load gives way to the next. A file's `type` (`video/webm`, say)
     * lets the browser pass over what it cannot play without loading it.
     */
    readonly src?: string | readonly (string | BrowserVideoSource)[];
    readonly stream?: MediaStream;
    readonly element?: HTMLVideoElement;
    readonly loop?: boolean;
    /** Defaults to true: a page plays a muted video without waiting for a press. */
    readonly muted?: boolean;
    readonly volume?: number;
    /** Pictures wider than this are scaled down to it before they become textures, to keep each upload small. Defaults to 1280. */
    readonly maxWidth?: number;
    /** For a file from another origin that allows it. */
    readonly crossOrigin?: 'anonymous' | 'use-credentials';
}
/** A video played by a video element, its pictures leased as textures. */
export interface BrowserVideo extends Video {
    /** The page's video element the pictures are read from. */
    readonly element: HTMLVideoElement;
}
/**
 * A video played by a page's video element and shown as a display object. Each picture the element presents is drawn
 * into a canvas of the size it is shown at, read back, and leased as a texture; a picture not yet changed is not read.
 */
export declare function createBrowserVideo(options: BrowserVideoOptions): BrowserVideo;
//# sourceMappingURL=BrowserVideo.d.ts.map