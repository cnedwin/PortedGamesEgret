import type { RectangleCommand2D, RenderCommand2D, ImageData2D } from "@egret/contracts";
import type { Stage } from "./Stage.js";
export interface CapturedContent2D {
    readonly commands: readonly RenderCommand2D[];
    readonly images?: readonly ImageData2D[];
}
/** New content port authenticates the root and brackets traversal with openness. */
export declare function collectFrameContent(stage: Stage): CapturedContent2D;
/** Legacy input behavior is retained; its mode rejects every emitted image. */
export declare function collectFrameCommands(stage: Stage): readonly RectangleCommand2D[];
//# sourceMappingURL=frameCapture.d.ts.map