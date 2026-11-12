import type { MeshGeometry3D } from './meshGeometry3D.js';
import type { SceneDirectionalLighting3D, SceneFrame3D, SceneLambertSurface3D, SceneMeshTexture3D, SceneWorldCard3D } from './sceneFrame3D.js';
type Vec3 = readonly [number, number, number];
export type SceneWorldProjectionInput3D = {
    readonly kind: 'perspective';
    readonly verticalFov: number;
    readonly aspect: number;
    readonly near: number;
    readonly far: number;
} | {
    readonly kind: 'orthographic';
    readonly height: number;
    readonly aspect: number;
    readonly near: number;
    readonly far: number;
};
export interface SceneWorldCameraInput3D {
    readonly eye: Vec3;
    readonly target: Vec3;
    readonly up?: Vec3;
    readonly projection: SceneWorldProjectionInput3D;
}
declare const cameraBrand: unique symbol;
export interface SceneWorldCamera3D {
    readonly [cameraBrand]: true;
    readonly projectionKind: SceneWorldProjectionInput3D['kind'];
}
export interface SceneWorldNodeInput3D {
    readonly id: string;
    readonly parentId?: string;
    readonly localMatrix: readonly number[];
    readonly meshes?: readonly MeshGeometry3D[];
    readonly cards?: readonly SceneWorldCard3D[];
}
export interface SceneWorldNodeTransform3D {
    readonly id: string;
    readonly localMatrix: readonly number[];
}
export interface SceneWorld3D {
    readonly nodeCount: number;
    capture(camera: SceneWorldCamera3D): SceneFrame3D;
    withNodeTransform(id: string, localMatrix: readonly number[]): SceneWorld3D;
    withNodeTransforms(edits: readonly SceneWorldNodeTransform3D[]): SceneWorld3D;
    withNodes(nodes: readonly SceneWorldNodeInput3D[]): SceneWorld3D;
}
export interface SceneLambertWorld3D extends SceneWorld3D {
    withLighting(input: SceneDirectionalLighting3D): SceneLambertWorld3D;
    withNodes(nodes: readonly SceneWorldNodeInput3D[]): SceneLambertWorld3D;
    withNodeTransform(id: string, localMatrix: readonly number[]): SceneLambertWorld3D;
    withNodeTransforms(edits: readonly SceneWorldNodeTransform3D[]): SceneLambertWorld3D;
}
export declare function createSceneCamera3D(input: SceneWorldCameraInput3D): SceneWorldCamera3D;
export declare function isSceneWorld3D(value: unknown): value is SceneWorld3D;
export declare function createSceneWorld3D(input: readonly SceneWorldNodeInput3D[]): SceneWorld3D;
/** The GLB binder provides immutable UVs and opaque images before publication. */
export declare function createTexturedSceneWorld3D(input: readonly SceneWorldNodeInput3D[], textures: ReadonlyMap<MeshGeometry3D, SceneMeshTexture3D>): SceneWorld3D;
/** The explicit Lambert binder owns the normals and image leases at publication. */
export declare function createLambertSceneWorld3D(input: readonly SceneWorldNodeInput3D[], surfaces: ReadonlyMap<MeshGeometry3D, SceneLambertSurface3D>, lighting: SceneDirectionalLighting3D): SceneLambertWorld3D;
export {};
//# sourceMappingURL=sceneWorld3D.d.ts.map