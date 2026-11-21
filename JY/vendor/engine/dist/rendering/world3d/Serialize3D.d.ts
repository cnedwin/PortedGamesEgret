import { Camera3D } from './Camera3D.js';
import { Geometry3D } from './Geometry3D.js';
import { Material3D } from './Material3D.js';
import { Object3D } from './Object3D.js';
import { Texture3D } from './Texture3D.js';
/** The format name of a saved scene document. */
export declare const SCENE_DOCUMENT_FORMAT_3D = "egret.world3d.scene";
/** The version of the scene document format. */
export declare const SCENE_DOCUMENT_VERSION_3D = 1;
/** The most nodes, embedded texture bytes and document bytes a scene document has. */
export declare const SERIALIZE3D_LIMITS: Readonly<{
    readonly maxNodes: 65536;
    readonly maxEmbeddedTextureBytes: 1048576;
    readonly maxDocumentBytes: 268435456;
}>;
type Json = Record<string, any>;
/** A scene saved as JSON: its nodes, geometries, materials, textures and skeletons, and what was skipped. */
export interface SceneDocument3D {
    readonly format: typeof SCENE_DOCUMENT_FORMAT_3D;
    readonly version: number;
    readonly root: number;
    readonly nodes: readonly Json[];
    readonly geometries: readonly Json[];
    readonly materials: readonly Json[];
    readonly textures: readonly Json[];
    readonly skeletons: readonly Json[];
    /** Names of nodes that were written as plain objects because their type cannot be saved. */
    readonly skipped: readonly string[];
}
/** How a scene is saved: the key each texture is saved by. */
export interface SerializeOptions3D {
    /** Stable key for a texture that should be stored by reference, such as its asset id. */
    readonly textureKey?: (texture: Texture3D) => string | undefined;
    /**
     * Stable key for a geometry the game can make again, such as the name of a model it builds in code: the geometry is
     * then saved as that key alone, not as all its vertices. Undefined, or an empty string, saves it whole.
     */
    readonly geometryKey?: (geometry: Geometry3D) => string | undefined;
}
/** How a scene is loaded back: how each texture key is turned into a texture. */
export interface DeserializeOptions3D {
    /** Return the texture for a key written by `textureKey`. */
    readonly resolveTexture?: (key: string) => Texture3D | undefined;
    /**
     * Return the geometry for a key written by `geometryKey`. It stays the game's: disposing the loaded scene leaves it.
     * A key with no geometry gives an empty one, so the rest of the scene still loads.
     */
    readonly resolveGeometry?: (key: string) => Geometry3D | undefined;
}
/** A scene loaded back: its root, cameras, geometries, materials and textures. */
export interface DeserializedScene3D {
    readonly root: Object3D;
    readonly cameras: readonly Camera3D[];
    readonly geometries: readonly Geometry3D[];
    readonly materials: readonly Material3D[];
    /** Textures created from embedded pixels; resolved textures stay owned by their provider. */
    readonly textures: readonly Texture3D[];
    /** Release every resource this call created. */
    dispose(): void;
}
/** Write the subtree under `root` as JSON-safe data. */
export declare function serializeScene3D(root: Object3D, options?: SerializeOptions3D): SceneDocument3D;
/** Rebuild a subtree from data produced by serializeScene3D. */
export declare function deserializeScene3D(saved: SceneDocument3D, options?: DeserializeOptions3D): DeserializedScene3D;
export {};
//# sourceMappingURL=Serialize3D.d.ts.map