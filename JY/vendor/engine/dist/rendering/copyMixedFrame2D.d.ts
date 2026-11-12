import type { RenderFrame2D } from '@egret/contracts';
import type { FrameCopyOptions } from './copyFrame2D.js';
/** CPU-only contracts snapshot; production hosts keep their rectangle dispatch. */
export declare function copyMixedFrame2D(input: unknown, options: FrameCopyOptions): {
    readonly frame: RenderFrame2D;
    readonly width: number;
    readonly height: number;
};
//# sourceMappingURL=copyMixedFrame2D.d.ts.map