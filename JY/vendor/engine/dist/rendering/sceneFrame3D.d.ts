import type { ImageData2D, TextureRegion2D } from '@egret/contracts';
import type { Matrix4 } from './matrix4.js';
import type { MeshGeometry3D } from './meshGeometry3D.js';
export interface SceneProjectionInput3D {
    readonly kind: 'perspective' | 'orthographic';
    readonly left: number;
    readonly right: number;
    readonly bottom: number;
    readonly top: number;
    readonly near: number;
    readonly far: number;
}
export interface SceneDrawInput3D {
    readonly geometry: MeshGeometry3D;
    readonly modelView: Matrix4;
}
export interface SceneInput3D {
    readonly projection: SceneProjectionInput3D;
    readonly draws: readonly SceneDrawInput3D[];
}
export interface SceneMeshTexture3D {
    readonly source: ImageData2D;
    readonly texcoords: readonly number[];
}
export interface SceneDirectionalLighting3D {
    /** World-space direction pointing toward the light. */
    readonly direction: readonly [number, number, number];
    readonly ambient: number;
    readonly intensity: number;
}
export interface SceneLambertSurface3D extends SceneMeshTexture3D {
    readonly normals: readonly number[];
}
export interface SceneLambertDraw3D {
    readonly normals: readonly number[];
    readonly normalMatrix: readonly number[];
    readonly mirrored: boolean;
    readonly lighting: SceneDirectionalLighting3D;
}
export interface SceneDraw3D {
    readonly geometry: MeshGeometry3D;
    readonly mvp: Matrix4;
    readonly texture?: SceneMeshTexture3D;
    readonly lambert?: SceneLambertDraw3D;
}
type CardTuple = readonly [number, number, number, number];
export interface SceneWorldCardInput3D {
    readonly source: ImageData2D;
    /** Card dimensions in world units. */
    readonly width: number;
    readonly height: number;
    readonly region?: TextureRegion2D;
    /** Pivot in crop-relative pixels. It can lie outside the crop. */
    readonly pivotX?: number;
    readonly pivotY?: number;
    /** First admitted source-alpha byte, from 1 through 255. */
    readonly alphaCutoff?: number;
}
declare const cardBrand: unique symbol;
export interface SceneWorldCard3D {
    readonly [cardBrand]: true;
    readonly source: ImageData2D;
    readonly bounds: CardTuple;
    readonly region: CardTuple;
    readonly alphaCutoff: number;
}
export interface SceneCardDraw3D {
    readonly source: ImageData2D;
    readonly bounds: CardTuple;
    readonly region: CardTuple;
    readonly alphaCutoff: number;
    readonly mvp: Matrix4;
}
interface SceneCardCapture3D {
    readonly card: SceneWorldCard3D;
    readonly modelView: Matrix4;
}
export interface SceneFrame3D {
    readonly cards?: readonly SceneCardDraw3D[];
    readonly draws: readonly SceneDraw3D[];
    readonly geometries: readonly MeshGeometry3D[];
    readonly cpuLogicalBytes: number;
    readonly sceneBytes: number;
    readonly uniformBytes: number;
}
export type Scene3DErrorOrigin = 'validation' | 'budget' | 'source' | 'native';
export type Scene3DErrorCode = 'SCENE3D_INPUT_INVALID' | 'SCENE3D_INPUT_READ_FAILED' | 'SCENE3D_BUDGET' | 'SCENE3D_PRECISION_UNSUPPORTED' | 'SCENE3D_ARITHMETIC_RANGE' | 'SCENE3D_NATIVE_FAILED';
export declare class Scene3DError extends Error {
    readonly code: Scene3DErrorCode;
    constructor(code: Scene3DErrorCode, cause?: unknown);
}
export declare function createSceneWorldCard3D(input: SceneWorldCardInput3D): SceneWorldCard3D;
export declare function isSceneWorldCard3D(value: unknown): value is SceneWorldCard3D;
export declare function createSceneFrame3D(input: unknown): SceneFrame3D;
export declare function createAuthoredSceneFrame3D(input: SceneInput3D, cards?: readonly SceneCardCapture3D[], textures?: ReadonlyMap<MeshGeometry3D, SceneMeshTexture3D>, lambertDraws?: ReadonlyMap<number, SceneLambertDraw3D>): SceneFrame3D;
export declare function isSceneFrame3D(value: unknown): value is SceneFrame3D;
export declare function getScene3DErrorOrigin(value: unknown): Scene3DErrorOrigin | undefined;
export {};
//# sourceMappingURL=sceneFrame3D.d.ts.map