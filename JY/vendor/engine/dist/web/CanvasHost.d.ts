import type { RenderHostAdapter } from '@egret/contracts';
export interface CanvasHostOptions {
    readonly canvas: HTMLCanvasElement;
    readonly pixelRatio?: number;
    readonly maxBackingPixels?: number;
}
export interface CanvasHost extends RenderHostAdapter {
    readonly surface: HTMLCanvasElement;
    start(): void;
    stop(): void;
}
export declare function createCanvasHost(options: CanvasHostOptions): CanvasHost;
//# sourceMappingURL=CanvasHost.d.ts.map