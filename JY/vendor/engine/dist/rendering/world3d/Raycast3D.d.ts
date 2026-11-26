import type { Camera3D } from './Camera3D.js';
import { Mesh3D } from './Mesh3D.js';
import type { Object3D } from './Object3D.js';
/** What a ray hit: how far, where, the object, its face, its texture coordinate and its instance. */
export interface RaycastHit3D {
    /** Distance from the ray origin in world units. */
    readonly distance: number;
    /** World-space hit position. */
    readonly point: readonly [number, number, number];
    readonly object: Mesh3D;
    /** Index of the hit triangle within the geometry. */
    readonly faceIndex: number;
    /** Interpolated texture coordinates when the geometry has a `uv` attribute. */
    readonly uv: readonly [number, number] | undefined;
    /** Instance index for instanced meshes. */
    readonly instanceId: number | undefined;
}
/** How a ray is cast: its near and far distances, its layers, and whether only the first hit is wanted. */
export interface RaycastOptions3D {
    readonly near?: number;
    readonly far?: number;
    /** Only objects whose layers intersect this mask are tested. */
    readonly layerMask?: number;
    /** Stop at the first hit per mesh and skip sorting of further triangles. */
    readonly firstHitOnly?: boolean;
}
/** Casts rays through a scene, from a point or from the camera through a screen point. */
export declare class Raycaster3D {
    readonly origin: Float32Array<ArrayBuffer>;
    readonly direction: Float32Array<ArrayBuffer>;
    /** Set a world-space ray; the direction is normalized. */
    set(origin: ArrayLike<number>, direction: ArrayLike<number>): this;
    /** Ray through normalized device coordinates (x, y in [-1, 1], y up). */
    setFromCamera(ndcX: number, ndcY: number, camera: Camera3D): this;
    /** Intersect the subtree under `root`. World matrices are refreshed first. */
    intersect(root: Object3D, options?: RaycastOptions3D): RaycastHit3D[];
    private intersectMesh;
    private intersectTriangles;
}
//# sourceMappingURL=Raycast3D.d.ts.map