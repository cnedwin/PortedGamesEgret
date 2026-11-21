import type { SharedRenderFrame2D } from '@egret/engine';
/** What a game knows at one frame of the display. Every part may be left out; its line then shows a dash. */
export interface BrowserStatsSample {
    /** The time of the display's frame in milliseconds; `performance.now()` unless given. */
    readonly now?: number;
    /** The frame that was drawn since the last sample, if one was. */
    readonly frame?: SharedRenderFrame2D;
    /** Frames the Host holds that it has not finished: `host.getStatus().pendingFrames`. */
    readonly pendingFrames?: number;
    /** Frames drawn and frames skipped so far, as a frame loop's `snapshot()` gives them. */
    readonly frames?: number;
    readonly skipped?: number;
    /**
     * The draw calls the Host made for its last frame, `host.getFrameDrawCalls()`: fewer than the
     * frame's commands when they are batched, more when effects need passes of their own.
     */
    readonly drawCalls?: number;
}
/** The numbers the panel shows, as of its last refresh. */
export interface BrowserStatsSnapshot {
    /** Frames of the display a second, and the longest time between two of them, in milliseconds, since the refresh before. */
    readonly fps: number;
    readonly longestFrameMs: number;
    /** Of the last frame drawn: its commands, the triangles they draw, its different geometries and its pages. */
    readonly commands: number;
    readonly triangles: number;
    readonly geometries: number;
    readonly pages: number;
    readonly pendingFrames: number;
    readonly frames: number;
    readonly skipped: number;
    /** The draw calls the Host made for the last frame, or 0 when they were not given. */
    readonly drawCalls: number;
}
/** A stats panel to make: the canvas it sits over, its label, and how often it updates. */
export interface BrowserStatsPanelOptions {
    /** The canvas the panel lies over: it is placed at the canvas's top left corner. */
    readonly canvas: HTMLCanvasElement;
    /** A line at the top of the panel, such as the backend's name. */
    readonly label?: string;
    /** How often the text changes, in milliseconds. 500 unless given; at least 100. */
    readonly intervalMs?: number;
}
/** A panel over the canvas showing frame rate and frame times: sample each frame. */
export interface BrowserStatsPanel {
    /** The panel's element, a child of the page's body. */
    readonly element: HTMLElement;
    /** Called once for each frame of the display. */
    sample(sample?: BrowserStatsSample): void;
    snapshot(): BrowserStatsSnapshot;
    /** Removes the panel from the page. */
    dispose(): void;
}
/** Puts a panel over the canvas that shows frame rate and frame times. */
export declare function createBrowserStatsPanel(options: BrowserStatsPanelOptions): BrowserStatsPanel;
//# sourceMappingURL=BrowserStatsPanel.d.ts.map