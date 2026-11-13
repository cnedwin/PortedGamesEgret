import { createSceneFrame3D, isSceneFrame3D, getScene3DErrorOrigin } from '../rendering/sceneFrame3D.js';
import { packSharedMeshGeometry3D, getSharedMeshPacking3DErrorOrigin } from '../rendering/packSharedMeshGeometry3D.js';
import { createSharedWebGPUMeshPipeline, encodeSharedWebGPUMesh } from './webgpuSharedMeshPass.js';
export { createSharedWebGPUCardPipeline, createSharedWebGPUTexturedMeshPipeline, createSharedWebGPULambertMeshPipeline } from './webgpuSharedMeshPass.js';
import { createSharedSceneWebGPUHostInternal } from './WebGPUHost.js';
// A separate exact eight-field identity preserves the old built-in protocol.
const builtin = Object.freeze({ version: 'egret.internal.shared-b1/1', createSceneFrame3D, isSceneFrame3D, getScene3DErrorOrigin,
    packMeshGeometry3D: packSharedMeshGeometry3D, getMeshPacking3DErrorOrigin: getSharedMeshPacking3DErrorOrigin,
    createWebGPUMeshPipeline: createSharedWebGPUMeshPipeline, encodeWebGPUMesh: encodeSharedWebGPUMesh });
export function getBuiltinSharedB1Protocol() { return builtin; }
export function isBuiltinSharedB1Protocol(value) { return value === builtin; }
export function createSharedSceneWebGPUHost(options) { return createSharedSceneWebGPUHostInternal(options); }
