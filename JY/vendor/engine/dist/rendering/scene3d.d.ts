import type { Matrix4 } from './matrix4.js';
import type { MeshGeometry3D } from './meshGeometry3D.js';
import type { SceneInput3D, SceneFrame3D } from './sceneFrame3D.js';
export { isMeshGeometry3D, MeshGeometry3DError, getMeshGeometry3DErrorOrigin } from './meshGeometry3D.js';
export { isSceneFrame3D, Scene3DError, getScene3DErrorOrigin } from './sceneFrame3D.js';
export { Math3DError } from './matrix4.js';
export type { Matrix4, Math3DErrorCode } from './matrix4.js';
export type { MeshGeometry3D, MeshGeometry3DErrorCode, MeshGeometry3DErrorOrigin } from './meshGeometry3D.js';
export type { SceneProjectionInput3D, SceneDrawInput3D, SceneInput3D, SceneDraw3D, SceneFrame3D, Scene3DErrorCode, Scene3DErrorOrigin, } from './sceneFrame3D.js';
export interface MeshGeometry3DInput {
    readonly positions: readonly number[];
    readonly colors: readonly number[];
    readonly indices: readonly number[];
}
export declare function createMeshGeometry3D(input: MeshGeometry3DInput): MeshGeometry3D;
export declare function createSceneFrame3D(input: SceneInput3D): SceneFrame3D;
export declare function createMatrix4(input: readonly number[]): Matrix4;
export declare function multiplyMatrix4(left: Matrix4, right: Matrix4): Matrix4;
//# sourceMappingURL=scene3d.d.ts.map