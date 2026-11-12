import type { PreparedCacheSlot2D } from './preparedFrameCache2D.js';
import type { TexturedGeometry2D, TexturedMeshCommand2D } from '@egret/contracts';
import type { CrossingAttributes, RectanglePreparationOptions, ClipRectanglePreparationContext2D } from './prepareRectangles2D.js';
import type { MeshPoint2D, TexturedPreparationBudget2D } from './texturedPreparationBudget2D.js';
export type { MeshPoint2D } from './texturedPreparationBudget2D.js';
export interface MeshStageCounters2D {
    readonly authoredDegenerateTriangles: number;
    readonly singularSuppressedTriangles: number;
    readonly transformedCollapsedTriangles: number;
    readonly clippedCollapsedTriangles: number;
    readonly packedCollapsedTriangles: number;
}
export interface PreparedMesh2D {
    readonly polygons: readonly (readonly MeshPoint2D[])[];
    readonly sourceTrianglesCharged: number;
    readonly preparedVerticesCharged: number;
    readonly counters: MeshStageCounters2D;
}
/** Private real producer shared by Mesh clipping and direct complementary-weight units. */
export declare const attachTexturedMeshAttributes2D: CrossingAttributes<MeshPoint2D>;
/** Consume authentic admitted geometry; its whole source count was charged by metadata admission. */
export declare function prepareTexturedMesh2D(command: TexturedMeshCommand2D, geometry: TexturedGeometry2D, width: number, height: number, options: RectanglePreparationOptions, budget: TexturedPreparationBudget2D, cacheSlot?: PreparedCacheSlot2D, containedClipping?: boolean, clipContext?: ClipRectanglePreparationContext2D): PreparedMesh2D;
//# sourceMappingURL=prepareTexturedMesh2D.d.ts.map