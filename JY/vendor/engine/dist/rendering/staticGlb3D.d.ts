import type { ImportedSceneAnimationClip3D } from './sceneAnimation3D.js';
import type { MeshGeometry3D } from './meshGeometry3D.js';
import type { ImageData2D } from '@egret/contracts';
import type { SceneDirectionalLighting3D } from './sceneFrame3D.js';
import type { SceneLambertWorld3D, SceneWorld3D, SceneWorldNodeInput3D } from './sceneWorld3D.js';
export type StaticGlb3DErrorCode = 'SCENE3D_GLB_INVALID' | 'SCENE3D_GLB_UNSUPPORTED' | 'SCENE3D_GLB_BUDGET';
export declare class StaticGlb3DError extends Error {
    readonly code: StaticGlb3DErrorCode;
    readonly field: string;
    constructor(code: StaticGlb3DErrorCode, field: string, cause?: unknown);
}
export interface StaticGlbTexturePrimitive3D {
    readonly geometry: MeshGeometry3D;
    readonly imageIndex: number;
    readonly texcoords: readonly number[];
}
export interface StaticGlbPngImage3D {
    readonly imageIndex: number;
    readonly width: number;
    readonly height: number;
    readonly byteLength: number;
    copyBytes(): Uint8Array<ArrayBuffer>;
}
export interface StaticGlbTexturePlan3D {
    readonly nodes: readonly SceneWorldNodeInput3D[];
    readonly primitives: readonly StaticGlbTexturePrimitive3D[];
    readonly images: readonly StaticGlbPngImage3D[];
}
/** Bounded GLB subset, independent of transport, model lifetime, and native graphics. */
export declare function readStaticGlbNodes3D(bytes: Uint8Array): readonly SceneWorldNodeInput3D[];
/** Validate the complete model before publishing owned texture requests and geometry. */
export declare function readStaticGlbTexturePlan3D(bytes: Uint8Array): StaticGlbTexturePlan3D;
export interface AnimatedGlbScene3D {
    readonly world: SceneWorld3D;
    readonly clips: readonly ImportedSceneAnimationClip3D[];
}
/** Load a bounded unlit GLB with rigid clips bound to its immutable base world. */
export declare function loadAnimatedGlbScene3D(bytes: Uint8Array): AnimatedGlbScene3D;
export interface StaticGlbImageRequest3D {
    readonly imageIndex: number;
    readonly width: number;
    readonly height: number;
    readonly byteLength: number;
    copyBytes(): Uint8Array<ArrayBuffer>;
}
export interface StaticGlbImageBinding3D {
    readonly imageIndex: number;
    readonly source: ImageData2D;
}
export interface PreparedTexturedStaticGlb3D {
    readonly images: readonly StaticGlbImageRequest3D[];
    bindImages(bindings: readonly StaticGlbImageBinding3D[]): SceneWorld3D;
}
export interface PreparedLambertStaticGlb3D {
    readonly images: readonly StaticGlbImageRequest3D[];
    bindImages(bindings: readonly StaticGlbImageBinding3D[], lighting: SceneDirectionalLighting3D): SceneLambertWorld3D;
}
/** A decode plan with no host dependency. Publish only after every opaque image is owned. */
export declare function prepareTexturedStaticGlbScene3D(bytes: Uint8Array): PreparedTexturedStaticGlb3D;
/** Apply an explicit Egret Lambert override to the admitted GLB unlit texture profile. */
export declare function prepareLambertStaticGlbScene3D(bytes: Uint8Array): PreparedLambertStaticGlb3D;
//# sourceMappingURL=staticGlb3D.d.ts.map