import type { SceneWorld3D } from './sceneWorld3D.js';
export { createSceneCamera3D, createSceneWorld3D } from './sceneWorld3D.js';
export type { SceneWorldCamera3D, SceneWorldCameraInput3D, SceneWorldProjectionInput3D, SceneWorld3D, SceneWorldNodeInput3D, SceneWorldNodeTransform3D, SceneLambertWorld3D, } from './sceneWorld3D.js';
export { createSceneAnimationClip3D } from './sceneAnimation3D.js';
export type { ImportedSceneAnimationClip3D, SceneAnimationClip3D, SceneAnimationClipInput3D, SceneAnimationTrackInput3D, SceneAnimationKey3D } from './sceneAnimation3D.js';
export { createSceneWorldCard3D } from './sceneFrame3D.js';
export type { SceneWorldCard3D, SceneWorldCardInput3D, SceneDirectionalLighting3D } from './sceneFrame3D.js';
export { loadAnimatedGlbScene3D, prepareLambertStaticGlbScene3D, prepareTexturedStaticGlbScene3D, StaticGlb3DError } from './staticGlb3D.js';
export type { AnimatedGlbScene3D, PreparedLambertStaticGlb3D, PreparedTexturedStaticGlb3D, StaticGlbImageBinding3D, StaticGlbImageRequest3D, StaticGlb3DErrorCode } from './staticGlb3D.js';
export declare function loadStaticGlbScene3D(bytes: Uint8Array): SceneWorld3D;
//# sourceMappingURL=scene3dAuthoring.d.ts.map