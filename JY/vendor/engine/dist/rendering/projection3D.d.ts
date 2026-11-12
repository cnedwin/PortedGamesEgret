import type { Matrix4 } from './matrix4.js';
export type DepthRange3D = 'zeroToOne' | 'minusOneToOne';
export type DepthDirection3D = 'forward' | 'reverse';
export interface DepthConvention3D {
    readonly range: DepthRange3D;
    readonly direction: DepthDirection3D;
}
export interface Projection3D {
    readonly kind: 'perspective' | 'orthographic';
    readonly matrix: Matrix4;
    readonly depth: DepthConvention3D;
}
export declare function createPerspectiveProjection3D(input: unknown): Projection3D;
export declare function createOrthographicProjection3D(input: unknown): Projection3D;
//# sourceMappingURL=projection3D.d.ts.map