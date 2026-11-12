import type { ClipRectangle2D, Matrix2D, Rectangle2D, RectangleCommand2D } from '@egret/contracts';
import type { RectangleFrame2D } from './RectangleFrame2D.js';
/** Only our validation uses this error; arbitrary input/allocation faults escape intact. */
export declare class FrameCopyError extends Error {
    readonly reason: 'invalid' | 'backing' | 'budget';
    constructor(reason: 'invalid' | 'backing' | 'budget', cause?: unknown);
}
/** A getter may throw an old validation error; origin, rather than its class, controls mapping. */
export declare class FrameInputReadError extends Error {
    constructor(cause: unknown);
}
export declare function read(source: object, key: PropertyKey): unknown;
export interface FrameCopyOptions {
    readonly pixelRatio: number;
    readonly maxBackingPixels: number;
    readonly maxCommands: number;
    readonly maxClipRectangles: number;
}
export declare function invalid(): never;
export declare function object(value: unknown): Record<string, unknown>;
export declare function finite(value: unknown): number;
export declare function opacity(value: unknown): number;
export declare function rgb(value: unknown): number;
export interface ArraySnapshot {
    readonly source: unknown[];
    readonly length: number;
}
export declare function array(value: unknown, wrapArrayCheck?: boolean): ArraySnapshot;
export declare function transform(value: unknown): Matrix2D;
export declare function rectangle(value: unknown, matrix: Matrix2D, ratio: number): Rectangle2D;
export interface CopiedFrameHeader2D {
    readonly source: Record<string, unknown>;
    readonly ratio: number;
    readonly clipBudget: number;
    readonly frameId: number;
    readonly width: number;
    readonly height: number;
    readonly clearColor: number;
    readonly clearAlpha: number;
    readonly backingWidth: number;
    readonly backingHeight: number;
    readonly commandsInput: ArraySnapshot;
}
export declare function copyFrameHeader2D(input: unknown, options: FrameCopyOptions): CopiedFrameHeader2D;
export declare function copyClips2D(item: object, ratio: number, clipBudget: number, clipCount: number, wrapArrayCheck?: boolean): readonly ClipRectangle2D[];
export declare function copyRectangleCommand2D(item: object, ratio: number, clipBudget: number, clipCount: number): RectangleCommand2D;
export declare function copyFrame2D(input: unknown, options: FrameCopyOptions): {
    readonly frame: RectangleFrame2D;
    readonly width: number;
    readonly height: number;
};
//# sourceMappingURL=copyFrame2D.d.ts.map