import { createSceneFrame3D, isSceneFrame3D, getScene3DErrorOrigin } from '../rendering/sceneFrame3D.js';
import { packMeshGeometry3D, getMeshPacking3DErrorOrigin } from '../rendering/packMeshGeometry3D.js';
import { createWebGPUMeshPipeline, encodeWebGPUMesh } from './webgpuMeshPass.js';
import { createB1WebGPUHostInternal, createTexturedB1WebGPUHostInternal } from './WebGPUHost.js';
// Exact built-in identity belongs to this source-bound module. Frozen shape
// alone cannot authenticate a copy/proxy or protect against loader replacement.
const builtin = Object.freeze({
    version: 'egret.internal.b1/1',
    createSceneFrame3D,
    isSceneFrame3D,
    getScene3DErrorOrigin,
    packMeshGeometry3D,
    getMeshPacking3DErrorOrigin,
    createWebGPUMeshPipeline,
    encodeWebGPUMesh,
});
export function getBuiltinB1Protocol() { return builtin; }
export function isBuiltinB1Protocol(value) { return value === builtin; }
export function createB1WebGPUHost(options) {
    // The ESM backedge is read only on an explicit call, after module evaluation.
    // This module never starts a host or invokes the protocol getter at top level.
    return createB1WebGPUHostInternal(options);
}
/** The same delayed backedge selects one module-owned combined host. */
export function createTexturedB1WebGPUHost(options) {
    return createTexturedB1WebGPUHostInternal(options);
}
