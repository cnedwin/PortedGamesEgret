import { createB1WebGPUHost, createTexturedB1WebGPUHost } from './b1.js';
// The existing Host owns admission, submission and lifecycle. Creation stays opt-in.
export function createSceneWebGPUHost(options) {
    return createB1WebGPUHost(options);
}
/** Own the scene and captured textured overlay through one explicit host. */
export function createTexturedSceneWebGPUHost(options) {
    return createTexturedB1WebGPUHost(options);
}
export { createSharedSceneWebGPUHost } from './sharedB1.js';
//# sourceMappingURL=scene3d.js.map