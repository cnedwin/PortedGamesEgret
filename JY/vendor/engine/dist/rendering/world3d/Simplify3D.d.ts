import { Geometry3D } from './Geometry3D.js';
/** How far to simplify. */
export interface SimplifyOptions3D {
    /** Stop at this many triangles or fewer. */
    readonly triangles?: number;
    /** Or keep this share of the triangles, from 0 to 1. Ignored when `triangles` is given. */
    readonly ratio?: number;
    /**
     * Never move the surface further than this, in the model's units, even short of the target: the target is then
     * not reached. No limit unless given.
     */
    readonly maxError?: number;
}
/** How a simplification went. */
export interface SimplifyResult3D {
    readonly geometry: Geometry3D;
    /** Triangles before and after. */
    readonly before: number;
    readonly after: number;
    /** The largest distance, in the model's units, a collapse moved the surface by. */
    readonly error: number;
}
/**
 * A copy of an indexed triangle geometry with fewer triangles; the geometry given is not changed. Groups (one material per range) are kept;
 * geometries with morph targets are refused. Vertices that sit
 * on an open edge (a hole, or a texture seam where vertices are split) are kept in place.
 */
export declare function simplifyGeometry3D(geometry: Geometry3D, options?: SimplifyOptions3D): SimplifyResult3D;
//# sourceMappingURL=Simplify3D.d.ts.map