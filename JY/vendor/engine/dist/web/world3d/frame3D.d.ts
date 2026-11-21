import type { Disposable } from '@egret/contracts';
import type { Camera3D } from '../../rendering/world3d/Camera3D.js';
import type { Light3D } from '../../rendering/world3d/Light3D.js';
import type { Mesh3D } from '../../rendering/world3d/Mesh3D.js';
import type { Scene3D } from '../../rendering/world3d/Object3D.js';
import type { RenderList3D } from '../../rendering/world3d/RenderList3D.js';
import type { PostProcessSettings3D } from './post3D.js';
import type { CompressedFormat3D, RenderTarget3D } from '../../rendering/world3d/Texture3D.js';
/** How a renderer maps bright colors into the screen's range. */
export type ToneMapping3D = 'none' | 'reinhard' | 'aces';
/** Half-float targets keep scene-referred light until composition. */
export declare function outputToneMapping3D(toneMapping: ToneMapping3D, target?: RenderTarget3D): ToneMapping3D;
/** What a renderer drew in its last frame: draws, triangles, culled nodes, lights, shadow maps and resources. */
export interface Renderer3DInfo {
    frame: number;
    drawCalls: number;
    triangles: number;
    visited: number;
    culled: number;
    /** Point and spot lights left out of the last frame because more were lit than the renderer draws. */
    lightsDropped: number;
    /** Point lights past the eight lit through the tiled list in the last frame. */
    lightsTiled: number;
    shadowMaps: number;
    programs: number;
    geometries: number;
    textures: number;
}
/** What both world3d backends provide; views and tools depend on this only. */
export interface Renderer3D extends Disposable {
    readonly canvas: HTMLCanvasElement | OffscreenCanvas;
    readonly info: Renderer3DInfo;
    toneMapping: ToneMapping3D;
    exposure: number;
    shadowsEnabled: boolean;
    /** Bloom, color grading and FXAA; set `enabled` to turn the chain on. */
    readonly postProcess: PostProcessSettings3D;
    /**
     * Part of the output to draw into, as [x, y, width, height] in 0 to 1 with
     * the origin at the bottom left; undefined draws everywhere. Set the
     * camera's aspect to match. Used for split screens and inset views.
     */
    viewport: readonly [number, number, number, number] | undefined;
    /**
     * Clear the whole output to the scene background before drawing. Turn it
     * off for the second and later views of one frame; depth is always cleared.
     */
    autoClear: boolean;
    /** Draw to the canvas, or into `target`. Returns false when the device is lost. */
    render(scene: Scene3D, camera: Camera3D, target?: RenderTarget3D): boolean;
    setSize(width: number, height: number, pixelRatio?: number): void;
    resizeToDisplaySize(pixelRatio?: number): boolean;
    /** True when textures in this compressed format can be used on this device. */
    supportsCompressedFormat(format: CompressedFormat3D): boolean;
    /** RGBA8 pixels of a render target, top row first, in the sRGB encoding. */
    readRenderTargetPixels(target: RenderTarget3D): Promise<Uint8Array>;
}
/** Size in floats of the Frame uniform block. */
export declare const FRAME_BLOCK_FLOATS_3D = 360;
/** Offsets, in floats, of the Frame block members. */
export declare const FRAME_OFFSETS_3D: Readonly<{
    readonly viewProjection: 0;
    readonly view: 16;
    readonly cameraPosition: 32;
    readonly fogColor: 36;
    readonly fogParams: 40;
    readonly ambient: 44;
    readonly hemisphereSky: 48;
    readonly hemisphereGround: 52;
    readonly lightCounts: 56;
    readonly directionalDirection: 60;
    readonly directionalColor: 76;
    readonly pointPosition: 92;
    readonly pointColor: 124;
    readonly spotPosition: 156;
    readonly spotDirection: 172;
    readonly spotColor: 188;
    readonly spotCone: 204;
    readonly shadowMatrix: 220;
    readonly shadowRect: 284;
    readonly shadowParams: 300;
    readonly output: 316;
    readonly cascadeSplits: 320;
    readonly cascadeInfo: 324;
    readonly pointShadow: 328;
    readonly clipPlanes: 332;
    readonly clipInfo: 348;
    readonly tileGrid: 352;
    readonly tileInfo: 356;
}>;
export interface FrameOutput3D {
    readonly exposure: number;
    readonly toneMapping: ToneMapping3D;
    /** Highest mip level of the bound environment cube, or 0 without one. */
    readonly environmentMaxMip: number;
}
/** Fill camera, fog, light and output members. Shadow members are written by planShadows3D. */
export declare function writeFrameBlock3D(data: Float32Array, scene: Scene3D, camera: Camera3D, list: RenderList3D, shadowSlots: ReadonlyMap<Light3D, number>, output: FrameOutput3D): void;
export interface ShadowPlan3D {
    readonly light: Light3D;
    readonly slot: number;
    /** Tile origin and edge in atlas texels; the origin is the lower-left corner in GL conventions. */
    readonly x: number;
    readonly y: number;
    readonly tile: number;
    /** Light view-projection with OpenGL clip conventions (z in [-1, 1]). */
    readonly matrix: Float32Array;
    /** Casters whose bounds intersect this light's volume. */
    readonly casters: Mesh3D[];
}
/** View-space far distance of each cascade, blending uniform and logarithmic spacing. */
export declare function cascadeSplits3D(near: number, far: number, count: number, lambda: number): number[];
/**
 * Assign shadow-casting lights to quarter tiles of a square atlas, compute
 * their matrices and caster lists, and write the shadow members of the block.
 * A cascaded directional light takes one tile per cascade, each fitted to a
 * slice of the camera frustum. `flipY` selects top-left atlas addressing for
 * backends whose texture origin is the top row.
 */
export declare function planShadows3D(data: Float32Array, list: RenderList3D, atlasSize: number, enabled: boolean, flipY: boolean, slots: Map<Light3D, number>, camera?: Camera3D): ShadowPlan3D[];
/**
 * The tiled light list: point lights past the eight a frame lights directly, and for each screen tile the lights
 * whose range reaches into it. One RGBA32F table of `TILED_LIGHTS_3D.width` texels a row: lights from texel 0
 * (two texels each: position and range, then colour), tile headers from `headerBase` (first index and count),
 * then light indices four to a texel from `indexBase`.
 */
export declare const TILED_LIGHTS_3D: Readonly<{
    readonly width: 512;
    readonly rows: 17;
    readonly maxLights: 256;
    readonly headerBase: 512;
    readonly maxTiles: 4096;
    readonly indexBase: number;
    readonly maxIndices: 16384;
    readonly maxPerTile: 32;
}>;
/**
 * Fills `table` with the lights and their tiles for a viewport of `width` by `height` pixels, and the tile members
 * of the frame block. With no lights the frame block says so and the table is left alone. `yDown` is true where
 * fragment coordinates count rows from the top (WebGPU), false where from the bottom (WebGL2). `originX` and
 * `originY` are where the viewport starts in fragment coordinates.
 */
export declare function writeTiledLights3D(data: Float32Array, table: Float32Array, lights: readonly Light3D[], viewProjection: ArrayLike<number>, width: number, height: number, yDown: boolean, originX?: number, originY?: number): number;
//# sourceMappingURL=frame3D.d.ts.map