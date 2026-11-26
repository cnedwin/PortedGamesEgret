import { Lod3D } from './helpers3D.js';
import { type Material3D } from './Material3D.js';
import { SdfShape3D, type SdfMeshOptions3D } from './Sdf3D.js';
/** How a model is made in levels: the mesh options, its material, and each level's triangles and distance. */
export interface SdfLodOptions3D extends SdfMeshOptions3D {
    /**
     * Each level as [triangles, distance]: shown once the camera is at least that far. The first is the full model and
     * its distance is 0. Unless given: the model's `triangles` (8000) up close, a quarter of them beyond 12 times the
     * model's size, and a sixteenth beyond 30 times.
     */
    readonly levels?: readonly (readonly [triangles: number, distance: number])[];
    /** The material of every level; a standard one with vertex colours unless given. */
    readonly material?: Material3D;
}
/** The model in levels of detail, as a Lod3D whose children are the meshes of the levels, nearest first. */
export declare function createSdfLod3D(shape: SdfShape3D, options?: SdfLodOptions3D): Lod3D;
//# sourceMappingURL=SdfLod3D.d.ts.map