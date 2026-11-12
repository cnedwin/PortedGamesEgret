import type { PreparedCacheSlot2D } from './preparedFrameCache2D.js';
import type { PreparedImage2D } from './prepareImages2D.js';
import type { PreparationBudget2D } from './prepareRectangles2D.js';
export interface PackedImage2D {
    readonly data: Float32Array<ArrayBuffer>;
    readonly vertexCount: number;
    readonly collapsedTriangles: number;
    readonly maxBackingDisplacement: number;
    readonly maxUVDisplacement: number;
}
/** Internal allocation/copy origin, distinct from geometry admission failures. */
export declare class ImagePackingAllocationError {
    readonly original: unknown;
    constructor(original: unknown);
}
/** CPU observation layout only; A2 must separately review its GPU pipeline. */
export declare function packImageVertices2D(prepared: PreparedImage2D, width: number, height: number, maxUploadBytes: number, budget?: PreparationBudget2D, cacheSlot?: PreparedCacheSlot2D): PackedImage2D;
//# sourceMappingURL=packImageVertices2D.d.ts.map