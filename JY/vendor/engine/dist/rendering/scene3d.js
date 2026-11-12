// Experimental DOM-free scene entry. Internal factories retain capture authority.
import { createMatrix4 as createOwnedMatrix4, multiplyMatrix4 as multiplyOwnedMatrix4 } from './matrix4.js';
import { createMeshGeometry3D as createOwnedMeshGeometry3D } from './meshGeometry3D.js';
import { createSceneFrame3D as createOwnedSceneFrame3D } from './sceneFrame3D.js';
export { isMeshGeometry3D, MeshGeometry3DError, getMeshGeometry3DErrorOrigin } from './meshGeometry3D.js';
export { isSceneFrame3D, Scene3DError, getScene3DErrorOrigin } from './sceneFrame3D.js';
// Preserve the original diagnostic identity; this class does not authenticate input.
export { Math3DError } from './matrix4.js';
// Forward untouched inputs and return the exact owned value or thrown error.
export function createMeshGeometry3D(input) {
    return createOwnedMeshGeometry3D(input);
}
export function createSceneFrame3D(input) {
    return createOwnedSceneFrame3D(input);
}
// Forward without copying or wrapping: the original module owns capture and errors.
export function createMatrix4(input) {
    return createOwnedMatrix4(input);
}
// Column vectors apply the right transform first; preserve left * right order.
export function multiplyMatrix4(left, right) {
    return multiplyOwnedMatrix4(left, right);
}
//# sourceMappingURL=scene3d.js.map