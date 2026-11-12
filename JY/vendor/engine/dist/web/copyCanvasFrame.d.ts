import type { RenderFrame2D } from '@egret/contracts';
import type { RectangleFrame2D } from '../rendering/RectangleFrame2D.js';
import { EgretError } from '@egret/runtime';
/** Private host boundary: source failures retain their original cause, not its apparent class. */
export declare class CanvasImageCopyError extends Error {
    readonly reason: 'invalid' | 'read' | 'budget';
    constructor(reason: 'invalid' | 'read' | 'budget', options?: ErrorOptions);
}
export declare function copyCanvasFrame(value: unknown, ratio: number, budget: number): {
    frame: RectangleFrame2D;
    width: number;
    height: number;
};
export declare function copyCanvasMixedFrame(value: unknown, ratio: number, budget: number, onImageObserved: () => void, onFailure?: (failure: CanvasImageCopyError | EgretError) => void): {
    frame: RenderFrame2D;
    width: number;
    height: number;
};
//# sourceMappingURL=copyCanvasFrame.d.ts.map