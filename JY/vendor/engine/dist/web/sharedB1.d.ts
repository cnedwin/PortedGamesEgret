import { createSceneFrame3D, isSceneFrame3D, getScene3DErrorOrigin } from '../rendering/sceneFrame3D.js';
import { packSharedMeshGeometry3D, getSharedMeshPacking3DErrorOrigin } from '../rendering/packSharedMeshGeometry3D.js';
import { createSharedWebGPUMeshPipeline, encodeSharedWebGPUMesh } from './webgpuSharedMeshPass.js';
export { createSharedWebGPUCardPipeline, createSharedWebGPUTexturedMeshPipeline, createSharedWebGPULambertMeshPipeline } from './webgpuSharedMeshPass.js';
import type { SharedSceneWebGPUHostOptions, SharedSceneWebGPUHost } from './WebGPUHost.js';
declare const builtin: Readonly<{
    version: 'egret.internal.shared-b1/1';
    createSceneFrame3D: typeof createSceneFrame3D;
    isSceneFrame3D: typeof isSceneFrame3D;
    getScene3DErrorOrigin: typeof getScene3DErrorOrigin;
    packMeshGeometry3D: typeof packSharedMeshGeometry3D;
    getMeshPacking3DErrorOrigin: typeof getSharedMeshPacking3DErrorOrigin;
    createWebGPUMeshPipeline: typeof createSharedWebGPUMeshPipeline;
    encodeWebGPUMesh: typeof encodeSharedWebGPUMesh;
}>;
export type SharedB1BuiltinProtocol = typeof builtin;
export declare function getBuiltinSharedB1Protocol(): SharedB1BuiltinProtocol;
export declare function isBuiltinSharedB1Protocol(value: unknown): value is SharedB1BuiltinProtocol;
export declare function createSharedSceneWebGPUHost(options: SharedSceneWebGPUHostOptions): SharedSceneWebGPUHost;
//# sourceMappingURL=sharedB1.d.ts.map