import type { RenderFrame2D, TexturedRenderFrame2D } from '@egret/contracts';
import { createSceneFrame3D, isSceneFrame3D, getScene3DErrorOrigin } from '../rendering/sceneFrame3D.js';
import type { SceneFrame3D } from '../rendering/sceneFrame3D.js';
import { packMeshGeometry3D, getMeshPacking3DErrorOrigin } from '../rendering/packMeshGeometry3D.js';
import { createWebGPUMeshPipeline, encodeWebGPUMesh } from './webgpuMeshPass.js';
import type { WebGPUHost, WebGPUHostOptions, WebGPUHostStatus, TexturedWebGPUHost, TexturedWebGPUHostOptions } from './WebGPUHost.js';
export interface B1SceneStatus {
    readonly host: WebGPUHostStatus;
    readonly pendingSceneBytes: number;
    readonly pendingUniformBytes: number;
    readonly pendingDepthBytes: number;
}
export interface B1WebGPUHost extends WebGPUHost {
    renderSceneFrame(scene: SceneFrame3D, overlay: RenderFrame2D): undefined;
    getSceneStatus(): B1SceneStatus;
}
export interface TexturedB1WebGPUHost extends B1WebGPUHost, TexturedWebGPUHost {
    renderSceneTexturedFrame(scene: SceneFrame3D, overlay: TexturedRenderFrame2D): undefined;
}
export interface B1BuiltinProtocol {
    readonly version: 'egret.internal.b1/1';
    readonly createSceneFrame3D: typeof createSceneFrame3D;
    readonly isSceneFrame3D: typeof isSceneFrame3D;
    readonly getScene3DErrorOrigin: typeof getScene3DErrorOrigin;
    readonly packMeshGeometry3D: typeof packMeshGeometry3D;
    readonly getMeshPacking3DErrorOrigin: typeof getMeshPacking3DErrorOrigin;
    readonly createWebGPUMeshPipeline: typeof createWebGPUMeshPipeline;
    readonly encodeWebGPUMesh: typeof encodeWebGPUMesh;
}
export declare function getBuiltinB1Protocol(): B1BuiltinProtocol;
export declare function isBuiltinB1Protocol(value: unknown): value is B1BuiltinProtocol;
export declare function createB1WebGPUHost(options: WebGPUHostOptions): B1WebGPUHost;
/** The same delayed backedge selects one module-owned combined host. */
export declare function createTexturedB1WebGPUHost(options: TexturedWebGPUHostOptions): TexturedB1WebGPUHost;
//# sourceMappingURL=b1.d.ts.map