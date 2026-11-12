import type { ClipRectangle2D, Rectangle2D } from '@egret/contracts';
import type { PackedImage2D } from './packImageVertices2D.js';
import type { PackedTexturedMesh2D } from './packTexturedMesh2D.js';
interface PackedRectangles2D {
    readonly data: Float32Array<ArrayBuffer>;
    readonly ranges: readonly {
        firstVertex: number;
        vertexCount: number;
    }[];
    readonly collapsedTriangles: number;
    readonly maxBackingDisplacement: number;
}
/** Provenance belongs to this admitted frame, never to a cross-frame index. */
export type PreparedBatchDraw2D = {
    readonly kind: 'rect';
    readonly packed: PackedRectangles2D;
    readonly rangeClips?: readonly (readonly ClipRectangle2D[])[];
    readonly rangeCommands?: readonly number[];
} | {
    readonly kind: 'image';
    readonly packed: PackedImage2D;
    readonly viewIndex: number;
    readonly alpha: number;
    readonly clips?: readonly ClipRectangle2D[];
    readonly crop?: Rectangle2D;
    uniform: Float32Array<ArrayBuffer> | undefined;
} | {
    readonly kind: 'mesh';
    readonly packed: PackedTexturedMesh2D;
    readonly viewIndex: number;
    readonly alpha: number;
    readonly clips?: readonly ClipRectangle2D[];
    readonly crop?: Rectangle2D;
    uniform: Float32Array<ArrayBuffer> | undefined;
};
export interface PreparedBatchPlan2D {
    readonly draws: PreparedBatchDraw2D[];
    logicalDraws: readonly PreparedBatchDraw2D[] | undefined;
    readonly logicalSpans: {
        first: number;
        count: number;
    }[];
    bytes: number;
    transferred: boolean;
    released: boolean;
}
/** Both immutable-frame paths share this one optional-concat owner. */
export interface PreparedBatchScratchPlan2D {
    readonly draws: unknown[];
    logicalDraws: readonly unknown[] | undefined;
    readonly logicalSpans: unknown[];
    bytes: number;
    released: boolean;
}
/** CPU concat ownership only. The Host retains the original GPU retirement proof. */
export declare class PreparedBatchScratch2D {
    private retained;
    available(): number;
    reserve(plan: PreparedBatchScratchPlan2D, bytes: number): boolean;
    refund(plan: PreparedBatchScratchPlan2D, bytes: number): void;
    release(plan: PreparedBatchScratchPlan2D): void;
}
/** Logical admission and every original payload allocation must finish before this call. */
export declare function prepareAdjacentBatches2D(input: readonly PreparedBatchDraw2D[], maxBufferSize: number, scratch: PreparedBatchScratch2D): PreparedBatchPlan2D;
export {};
//# sourceMappingURL=preparedBatches2D.d.ts.map