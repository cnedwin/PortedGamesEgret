// SPDX-License-Identifier: Apache-2.0
import { createSceneWorld3D } from './sceneWorld3D.js';
import { readStaticGlbNodes3D } from './staticGlb3D.js';
// Optional DOM-free authoring entry; capture retains the shared scene identity.
export { createSceneCamera3D, createSceneWorld3D } from './sceneWorld3D.js';
export { createSceneAnimationClip3D } from './sceneAnimation3D.js';
export { createSceneWorldCard3D } from './sceneFrame3D.js';
export { loadAnimatedGlbScene3D, prepareLambertStaticGlbScene3D, prepareTexturedStaticGlbScene3D, StaticGlb3DError } from './staticGlb3D.js';
export function loadStaticGlbScene3D(bytes) {
    return createSceneWorld3D(readStaticGlbNodes3D(bytes));
}
//# sourceMappingURL=scene3dAuthoring.js.map