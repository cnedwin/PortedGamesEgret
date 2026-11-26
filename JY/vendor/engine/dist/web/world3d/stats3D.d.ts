import type { Renderer3DInfo } from './frame3D.js';
/** 3D stats to make: the container they show in, how they smooth, and how often they refresh. */
export interface World3DStatsOptions {
    /** Where the readout is shown; nothing is shown without it. */
    readonly container?: HTMLElement;
    /** Share of each new sample in the running averages. Defaults to 0.1. */
    readonly smoothing?: number;
    /** How often the text is rewritten, in milliseconds. Defaults to 250. */
    readonly refreshMs?: number;
}
/** Frame times, frame rate, draws and triangles of a 3D view, measured each frame. */
export interface World3DStats {
    /** Smoothed milliseconds: the whole frame, and each part named in `lap`. */
    readonly average: Readonly<Record<string, number>>;
    /** The longest frame lately, decaying slowly. */
    readonly slowest: number;
    readonly fps: number;
    /** What the renderer reported for the last frame drawn. */
    readonly drawCalls: number;
    readonly triangles: number;
    /** Call at the very start of a frame. */
    begin(): void;
    /** Closes the part of the frame since the previous mark, under `name`. */
    lap(name: string): void;
    /** Call after drawing; reads the renderer and rewrites the text when it is due. */
    end(): void;
    /** Removes the readout. */
    dispose(): void;
}
/** Makes a panel that shows a 3D view's frame times and draws. */
export declare function createWorld3DStats(renderer: {
    readonly info: Renderer3DInfo;
}, options?: World3DStatsOptions): World3DStats;
//# sourceMappingURL=stats3D.d.ts.map