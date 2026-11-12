import type { ImageData2D, TexturedGeometry2D, TexturedRenderCommand2D } from '@egret/contracts';
import type { Stage } from './Stage.js';
export interface CapturedTexturedContent2D {
    readonly commands: readonly TexturedRenderCommand2D[];
    readonly images: readonly ImageData2D[];
    readonly geometries: readonly TexturedGeometry2D[];
}
/** Two callback-free iterative passes; retained output contains immutable values only. */
export declare function collectTexturedFrameContent(stage: Stage): CapturedTexturedContent2D;
//# sourceMappingURL=texturedFrameCapture.d.ts.map