import { Geometry3D } from './Geometry3D.js';
/** A box to make: its width, height and depth, and their segments. */
export interface BoxGeometryOptions3D {
    readonly width?: number;
    readonly height?: number;
    readonly depth?: number;
    readonly widthSegments?: number;
    readonly heightSegments?: number;
    readonly depthSegments?: number;
}
/** Axis-aligned box centered on the origin with one material group per face (+X, -X, +Y, -Y, +Z, -Z). */
export declare function createBoxGeometry3D(options?: BoxGeometryOptions3D): Geometry3D;
/** A plane to make: its width and height, and their segments. */
export interface PlaneGeometryOptions3D {
    readonly width?: number;
    readonly height?: number;
    readonly widthSegments?: number;
    readonly heightSegments?: number;
}
/** Plane in the XY plane facing +Z. Rotate -90 degrees about X for a floor. */
export declare function createPlaneGeometry3D(options?: PlaneGeometryOptions3D): Geometry3D;
/** A sphere to make: its radius and segments. */
export interface SphereGeometryOptions3D {
    readonly radius?: number;
    readonly widthSegments?: number;
    readonly heightSegments?: number;
}
/** UV sphere with poles on the Y axis. */
export declare function createSphereGeometry3D(options?: SphereGeometryOptions3D): Geometry3D;
/** A cylinder to make: its top and bottom radius, height, segments, and whether its ends are open. */
export interface CylinderGeometryOptions3D {
    readonly radiusTop?: number;
    readonly radiusBottom?: number;
    readonly height?: number;
    readonly radialSegments?: number;
    readonly heightSegments?: number;
    readonly openEnded?: boolean;
}
/** Cylinder or truncated cone along Y. A zero radius at one end produces a cone. */
export declare function createCylinderGeometry3D(options?: CylinderGeometryOptions3D): Geometry3D;
/** Makes a cone. */
export declare function createConeGeometry3D(options?: {
    readonly radius?: number;
    readonly height?: number;
    readonly radialSegments?: number;
}): Geometry3D;
/** A torus to make: its radius, tube and segments. */
export interface TorusGeometryOptions3D {
    readonly radius?: number;
    readonly tube?: number;
    readonly radialSegments?: number;
    readonly tubularSegments?: number;
}
/** Torus around the Z axis. */
export declare function createTorusGeometry3D(options?: TorusGeometryOptions3D): Geometry3D;
/** A capsule to make: its radius, height and segments. */
export interface CapsuleGeometryOptions3D {
    readonly radius?: number;
    readonly height?: number;
    readonly capSegments?: number;
    readonly radialSegments?: number;
}
/** Capsule along Y; `height` is the length of the cylindrical middle section. */
export declare function createCapsuleGeometry3D(options?: CapsuleGeometryOptions3D): Geometry3D;
/** Unit quad in XY used by sprites: corners at +-0.5, facing +Z. */
export declare function createQuadGeometry3D(): Geometry3D;
//# sourceMappingURL=primitives3D.d.ts.map