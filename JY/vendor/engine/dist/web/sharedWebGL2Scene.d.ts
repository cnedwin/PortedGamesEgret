import { createSceneFrame3D, isSceneFrame3D, getScene3DErrorOrigin } from '../rendering/sceneFrame3D.js';
import type { SceneFrame3D } from '../rendering/sceneFrame3D.js';
import type { PackedMeshGeometry3D } from '../rendering/packSharedMeshGeometry3D.js';
export { createSceneFrame3D, isSceneFrame3D, getScene3DErrorOrigin };
export type SharedGLScenePreparationReason = 'frame' | 'budget' | 'precision' | 'backing';
export declare class SharedGLScenePreparationError extends Error {
    readonly reason: SharedGLScenePreparationReason;
    constructor(reason: SharedGLScenePreparationReason, cause?: unknown);
}
export interface SharedGLSceneAdmission {
    readonly frame: SceneFrame3D;
    readonly sceneBytes: number;
    readonly uniformBytes: number;
    readonly depthBytes: number;
    /** Geometry vertex/index byte pairs in frame.geometries order; no UBO arena padding. */
    readonly bufferBytes: readonly number[];
}
export interface SharedGLSceneDraw {
    readonly mesh: PackedMeshGeometry3D;
    readonly uniform: Float32Array<ArrayBuffer>;
    readonly pageIndex?: number;
    readonly lambert?: true;
}
export interface SharedGLSceneCardDraw {
    readonly pageIndex: number;
    readonly uniform: Float32Array<ArrayBuffer>;
}
export interface PreparedSharedGLScene extends SharedGLSceneAdmission {
    readonly meshes: readonly PackedMeshGeometry3D[];
    readonly draws: readonly SharedGLSceneDraw[];
    readonly cards: readonly SharedGLSceneCardDraw[];
    /** Mesh uniforms followed by card uniforms, each in its authored draw order. */
    readonly uniforms: readonly Float32Array<ArrayBuffer>[];
}
/** Metadata only. Host validates backing first, then combines these fees with its overlay. */
export declare function admitSharedGLScene(input: unknown, width: number, height: number): SharedGLSceneAdmission;
/** Call only after joint logical, native-limit and pending admission; never as that preflight. */
export declare function prepareSharedGLScene(input: unknown, width: number, height: number, cardViews?: readonly number[], textureViews?: ReadonlyMap<SceneFrame3D["geometries"][number], number>): PreparedSharedGLScene;
/** Fixed metadata for linked ABI verification and native setup owned entirely by the Host. */
export declare const SHARED_GL_SCENE_LAYOUT: Readonly<{
    readonly vertexStride: 24;
    readonly attributes: readonly (Readonly<{
        location: 0;
        name: "aPosition";
        components: 3;
        type: "float32";
        normalized: false;
        byteOffset: 0;
        divisor: 0;
    }> | Readonly<{
        location: 1;
        name: "aLinearColor";
        components: 3;
        type: "float32";
        normalized: false;
        byteOffset: 12;
        divisor: 0;
    }>)[];
    readonly indexType: 'uint32';
    readonly indexElementBytes: 4;
    readonly uniformBlock: 'SceneDraw';
    readonly uniformMember: 'uMVP';
    readonly uniformBytes: 64;
    readonly uniformOffset: 0;
    readonly uniformMatrixStride: 16;
    readonly uniformIsRowMajor: false;
    readonly primitive: 'triangles';
    readonly frontFace: 'ccw';
    readonly cull: false;
    readonly depthFormat: 'DEPTH_COMPONENT32F';
    readonly clearDepth: 0;
    readonly depthCompare: 'greater';
    readonly depthWrite: true;
    readonly blend: false;
    readonly samples: 1;
}>;
export declare const SHARED_GL_SCENE_VERTEX = "#version 300 es\nprecision highp float;\nprecision highp int;\nlayout(location = 0) in vec3 aPosition;\nlayout(location = 1) in vec3 aLinearColor;\nlayout(std140) uniform SceneDraw {\n    mat4 uMVP;\n};\nout highp vec3 vLinearColor;\nvoid main() {\n    vec4 clip = uMVP * vec4(aPosition, 1.0);\n    gl_Position = vec4(clip.xy, 2.0 * clip.z - clip.w, clip.w);\n    vLinearColor = aLinearColor;\n}\n";
export declare const SHARED_GL_SCENE_FRAGMENT = "#version 300 es\nprecision highp float;\nprecision highp int;\nin highp vec3 vLinearColor;\nlayout(location = 0) out vec4 outColor;\nvoid main() {\n    outColor = vec4(vLinearColor, 1.0);\n}\n";
export declare const SHARED_GL_SCENE_CARD_VERTEX = "#version 300 es\nprecision highp float;\nprecision highp int;\nlayout(std140) uniform SceneCard {\n    mat4 uCardMVP;\n    vec4 uCardBounds;\n    vec4 uCardRegion;\n    vec4 uCardCutoff;\n};\n\nout highp vec2 vCardUV;\nconst vec2 corners[6] = vec2[6](vec2(0, 0), vec2(0, 1), vec2(1, 0), vec2(1, 0), vec2(0, 1), vec2(1, 1));\nvoid main() {\n    vCardUV = corners[gl_VertexID];\n    // Select the same endpoints and triangle diagonal as WebGPU.\n    vec2 position = vec2(vCardUV.x == 0.0 ? uCardBounds.x : uCardBounds.z,\n        vCardUV.y == 0.0 ? uCardBounds.w : uCardBounds.y);\n    vec4 clip = uCardMVP * vec4(position, 0.0, 1.0);\n    gl_Position = vec4(clip.xy, 2.0 * clip.z - clip.w, clip.w);\n}\n";
export declare const SHARED_GL_SCENE_CARD_FRAGMENT = "#version 300 es\nprecision highp float;\nprecision highp int;\nlayout(std140) uniform SceneCard {\n    mat4 uCardMVP;\n    vec4 uCardBounds;\n    vec4 uCardRegion;\n    vec4 uCardCutoff;\n};\n\nuniform highp sampler2D uCardPage;\nin highp vec2 vCardUV;\nlayout(location = 0) out vec4 outColor;\nvoid main() {\n    // Canonical atlas upload keeps top-left source rows and does no automatic sRGB decode.\n    vec2 local = clamp(floor(vCardUV * uCardRegion.zw), vec2(0.0), uCardRegion.zw - vec2(1.0));\n    vec4 texel = texelFetch(uCardPage, ivec2(uCardRegion.xy) + ivec2(local), 0);\n    if (floor(texel.a * 255.0 + 0.5) < floor(uCardCutoff.x * 255.0 + 0.5)) discard;\n    vec3 premultiplied = mix(texel.rgb / 12.92, pow((texel.rgb + vec3(0.055)) / 1.055, vec3(2.4)),\n        greaterThan(texel.rgb, vec3(0.04045)));\n    outColor = vec4(clamp(premultiplied / texel.a, vec3(0.0), vec3(1.0)), 1.0);\n}\n";
export declare const SHARED_GL_SCENE_TEXTURE_VERTEX = "#version 300 es\nprecision highp float;\nprecision highp int;\nlayout(location = 0) in vec3 aPosition;\nlayout(location = 1) in vec3 aLinearColor;\nlayout(location = 2) in vec2 aUV;\nlayout(std140) uniform SceneDraw {\n    mat4 uMVP;\n};\nout highp vec3 vLinearColor;\nout highp vec2 vUV;\nvoid main() {\n    vec4 clip = uMVP * vec4(aPosition, 1.0);\n    gl_Position = vec4(clip.xy, 2.0 * clip.z - clip.w, clip.w);\n    vLinearColor = aLinearColor;\n    vUV = aUV;\n}\n";
export declare const SHARED_GL_SCENE_TEXTURE_FRAGMENT = "#version 300 es\nprecision highp float;\nprecision highp int;\nuniform highp sampler2D uScenePage;\nin highp vec3 vLinearColor;\nin highp vec2 vUV;\nlayout(location = 0) out vec4 outColor;\nvoid main() {\n    // Shared GL pages hold encoded color in top-left row order. Decode once before modulation.\n    ivec2 dimensions = textureSize(uScenePage, 0);\n    ivec2 pixel = min(ivec2(clamp(vUV, 0.0, 1.0) * vec2(dimensions)), dimensions - 1);\n    vec3 encoded = texelFetch(uScenePage, pixel, 0).rgb;\n    vec3 linear = mix(encoded / 12.92, pow((encoded + vec3(0.055)) / 1.055, vec3(2.4)),\n        greaterThan(encoded, vec3(0.04045)));\n    outColor = vec4(linear * vLinearColor, 1.0);\n}\n";
export declare const SHARED_GL_SCENE_LAMBERT_VERTEX = "#version 300 es\nprecision highp float;\nprecision highp int;\nlayout(location = 0) in vec3 aPosition;\nlayout(location = 1) in vec3 aLinearColor;\nlayout(location = 2) in vec2 aUV;\nlayout(location = 3) in vec3 aNormal;\nlayout(std140) uniform SceneLambert {\n    mat4 uMVP;\n    vec4 uNormal0;\n    vec4 uNormal1;\n    vec4 uNormal2;\n    vec4 uLight;\n};\n\nout highp vec3 vLinearColor;\nout highp vec2 vUV;\nout highp vec3 vNormal;\nvoid main() {\n    vec4 clip = uMVP * vec4(aPosition, 1.0);\n    gl_Position = vec4(clip.xy, 2.0 * clip.z - clip.w, clip.w);\n    vLinearColor = aLinearColor;\n    vUV = aUV;\n    vNormal = mat3(uNormal0.xyz, uNormal1.xyz, uNormal2.xyz) * aNormal;\n}\n";
export declare const SHARED_GL_SCENE_LAMBERT_FRAGMENT = "#version 300 es\nprecision highp float;\nprecision highp int;\nlayout(std140) uniform SceneLambert {\n    mat4 uMVP;\n    vec4 uNormal0;\n    vec4 uNormal1;\n    vec4 uNormal2;\n    vec4 uLight;\n};\n\nuniform highp sampler2D uScenePage;\nin highp vec3 vLinearColor;\nin highp vec2 vUV;\nin highp vec3 vNormal;\nlayout(location = 0) out vec4 outColor;\nvoid main() {\n    ivec2 dimensions = textureSize(uScenePage, 0);\n    ivec2 pixel = min(ivec2(clamp(vUV, 0.0, 1.0) * vec2(dimensions)), dimensions - 1);\n    vec3 encoded = texelFetch(uScenePage, pixel, 0).rgb;\n    vec3 linear = mix(encoded / 12.92, pow((encoded + vec3(0.055)) / 1.055, vec3(2.4)),\n        greaterThan(encoded, vec3(0.04045)));\n    // Mirrored model transforms reverse native winding. Light the authored side.\n    bool front = gl_FrontFacing != (uNormal1.w < 0.0);\n    vec3 oriented = front ? vNormal : -vNormal;\n    vec3 absolute = abs(oriented);\n    float scale = max(absolute.x, max(absolute.y, absolute.z));\n    float directional = 0.0;\n    if (scale >= 1.17549435e-38) directional = max(0.0, dot(normalize(oriented / scale), uLight.xyz));\n    outColor = vec4(linear * vLinearColor * (uNormal0.w + uLight.w * directional), 1.0);\n}\n";
//# sourceMappingURL=sharedWebGL2Scene.d.ts.map