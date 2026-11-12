import type { PackedSharedDraw2D, PackedSharedEntry2D } from './packSharedDraws2D.js';
import type { PreparedBatchScratch2D } from './preparedBatches2D.js';
export interface PreparedSharedBatchPlan2D {
    readonly draws: PackedSharedDraw2D[];
    logicalDraws: readonly PackedSharedEntry2D[] | undefined;
    readonly logicalSpans: {
        first: number;
        count: number;
    }[];
    bytes: number;
    released: boolean;
    transferred: boolean;
}
/** No logical charge is refunded when a physical upload is concatenated. */
export declare function prepareSharedBatches2D(input: readonly PackedSharedEntry2D[], maxBufferSize: number, scratch: PreparedBatchScratch2D): PreparedSharedBatchPlan2D;
//# sourceMappingURL=preparedSharedBatches2D.d.ts.map