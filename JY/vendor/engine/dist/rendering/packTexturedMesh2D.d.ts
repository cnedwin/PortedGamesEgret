import type { PreparedCacheSlot2D } from './preparedFrameCache2D.js';
import type { MeshStageCounters2D, PreparedMesh2D } from './prepareTexturedMesh2D.js';
import type { TexturedPreparationBudget2D } from './texturedPreparationBudget2D.js';
export interface PackedTexturedMesh2D {
    readonly data: Float32Array<ArrayBuffer>;
    readonly vertexCount: number;
    readonly sourceTrianglesCharged: number;
    readonly preparedVerticesCharged: number;
    readonly counters: MeshStageCounters2D;
    readonly maxBackingDisplacement: number;
    readonly maxUVDisplacement: number;
    readonly maxLightColorDisplacement: number;
}
/** Preserve the original owned payload-allocation/copy fault for the trusted host boundary. */
export declare class TexturedMeshPackingAllocationError {
    readonly original: unknown;
    constructor(original: unknown);
}
/** Pack admitted full-tuple polygons into one nonindexed 32-byte vertex layout. */
export declare function packTexturedMesh2D(prepared: PreparedMesh2D, width: number, height: number, admittedVertexBytes: number, budget: TexturedPreparationBudget2D, cacheSlot?: PreparedCacheSlot2D): PackedTexturedMesh2D;
//# sourceMappingURL=packTexturedMesh2D.d.ts.map