import { Geometry3D } from './Geometry3D.js';
import type { ColorInput3D } from './Material3D.js';
/** One geometry added to a builder: where, turned and scaled how, and its color. */
export interface GeometryPart3D {
    /** Where the part goes; [0, 0, 0] by default. */
    readonly position?: readonly [number, number, number];
    /** Euler angles in radians, applied X then Y then Z, as `quatFromEuler`. Ignored when `quaternion` is given. */
    readonly rotation?: readonly [number, number, number];
    readonly quaternion?: readonly [number, number, number, number];
    /** One number for all three axes, or one per axis. */
    readonly scale?: number | readonly [number, number, number];
    /** A 4 x 4 column-major matrix that places the part, instead of position, rotation and scale. */
    readonly matrix?: ArrayLike<number>;
    /** A hex colour as seen on screen, or linear RGB; white by default. */
    readonly color?: ColorInput3D;
    /** Multiplies each vertex colour already in the part, as for shading baked into it. */
    readonly keepColors?: boolean;
}
/** Joins many geometries, each placed, into one. */
export interface GeometryBuilder3D {
    /** Parts added so far. */
    readonly parts: number;
    /** Vertices added so far. */
    readonly vertexCount: number;
    /** Adds a placed, coloured copy of `geometry`; the geometry itself is not changed. */
    add(geometry: Geometry3D, part?: GeometryPart3D): this;
    /** One geometry with position, normal, uv (when every part has one) and colour; the builder is emptied. */
    build(): Geometry3D;
}
/** A builder that merges placed, coloured parts into one geometry. */
export declare function createGeometryBuilder3D(): GeometryBuilder3D;
/** A hex colour as seen on screen in the linear RGB the renderer lights, for vertex colours written by hand. */
export declare function linearColor3D(hex: number): [number, number, number];
/** Where a world point falls in a viewport, for labels, markers and pointers drawn over the picture. */
export interface ViewportPoint3D {
    /** Pixels from the viewport's left and top edges. */
    x: number;
    y: number;
    /** Normalized depth, -1 at the near plane and 1 at the far plane. */
    depth: number;
    /** False when the point is behind the camera; x and y then point the way it lies, mirrored back. */
    inFront: boolean;
    /** True when the point is in front of the camera and inside the viewport. */
    onScreen: boolean;
}
/**
 * Projects a world point into a viewport of `width` by `height` pixels through `camera`. Call
 * `camera.updateViewMatrices()` first, or use it after the frame was drawn.
 */
export declare function projectToViewport3D(camera: {
    readonly viewProjectionMatrix: ArrayLike<number>;
}, point: ArrayLike<number>, width: number, height: number, out?: ViewportPoint3D): ViewportPoint3D;
//# sourceMappingURL=GeometryBuilder3D.d.ts.map