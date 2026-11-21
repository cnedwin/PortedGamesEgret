import type { Camera3D } from '../../rendering/world3d/Camera3D.js';
import type { Material3D } from '../../rendering/world3d/Material3D.js';
import type { Mesh3D } from '../../rendering/world3d/Mesh3D.js';
import type { Scene3D } from '../../rendering/world3d/Object3D.js';
import type { PlanarReflectionPass3D } from '../../rendering/world3d/Water3D.js';
import { RenderTarget3D } from '../../rendering/world3d/Texture3D.js';
import type { CompressedFormat3D } from '../../rendering/world3d/Texture3D.js';
import type { PostProcessSettings3D } from './post3D.js';
import type { Renderer3D, Renderer3DInfo, ToneMapping3D } from './frame3D.js';
import type { World3DFrameMetrics } from './webGL2FrameMetrics3D.js';
/** A WebGL2 renderer to make: its canvas and context, its tone mapping and exposure, its shadows, and what is called when the context is lost and restored. */
export interface WebGL2Renderer3DOptions {
    readonly canvas: HTMLCanvasElement | OffscreenCanvas;
    readonly antialias?: boolean;
    /** Keep an alpha channel so the page shows through where nothing is drawn. */
    readonly alpha?: boolean;
    readonly powerPreference?: WebGLPowerPreference;
    readonly preserveDrawingBuffer?: boolean;
    readonly toneMapping?: ToneMapping3D;
    readonly exposure?: number;
    readonly shadows?: boolean;
    /** Edge of the shared shadow atlas in texels; each shadow light receives a quarter. */
    readonly shadowAtlasSize?: number;
    readonly onContextLost?: () => void;
    readonly onContextRestored?: () => void;
}
/** One material program for an expected draw. Color flags describe the view and its available inputs. */
export interface WebGL2ProgramVariant3D {
    readonly mesh: Mesh3D;
    readonly material: Material3D;
    readonly pass?: 'color' | 'shadow' | 'depth-prepass';
    /** The render output target. An enabled post chain uses its own HDR scene target. */
    readonly target?: RenderTarget3D;
    /** Reflected output and object selection. The reflection has no post chain. */
    readonly reflection?: PlanarReflectionPass3D;
    readonly fog?: boolean;
    readonly environment?: boolean;
    readonly receiveShadows?: boolean;
    readonly softDepth?: boolean;
    readonly transmission?: boolean;
}
/** Draws 3D scenes with WebGL2: set its size, render a scene from a camera, and read what it drew. */
export declare class WebGL2Renderer3D implements Renderer3D {
    #private;
    readonly canvas: HTMLCanvasElement | OffscreenCanvas;
    toneMapping: ToneMapping3D;
    exposure: number;
    shadowsEnabled: boolean;
    /** Bloom, color grading and FXAA; set `enabled` to turn the chain on. */
    readonly postProcess: PostProcessSettings3D;
    viewport: readonly [number, number, number, number] | undefined;
    autoClear: boolean;
    readonly info: Renderer3DInfo;
    constructor(options: WebGL2Renderer3DOptions);
    get isContextLost(): boolean;
    /** Link and initialize the specified draw variants without submitting any draws. */
    preparePrograms(requests: readonly WebGL2ProgramVariant3D[]): Promise<void>;
    /** The underlying context, for advanced interop. Restore any state you change. */
    get context(): WebGL2RenderingContext;
    /** Resize the drawing buffer; `pixelRatio` multiplies the logical size. */
    setSize(width: number, height: number, pixelRatio?: number): void;
    /** Match the drawing buffer to the canvas's CSS size. Returns true when it changed. */
    resizeToDisplaySize(pixelRatio?: number): boolean;
    /**
     * Draw one frame to the canvas, or into `target` when given. Returns false
     * when the context is lost and nothing was drawn.
     */
    /**
     * Draw runs of plain meshes that share a geometry and a material as one
     * instanced draw each, in the main view and in shadow maps. On by default;
     * the meshes themselves are untouched.
     */
    get autoInstancing(): boolean;
    set autoInstancing(value: boolean);
    /**
     * Light point lights past the eight a frame lights directly through a tiled list: each pixel visits only the
     * lights whose range reaches its screen tile, up to 32 a tile and 256 in all. On by default.
     */
    get tiledLights(): boolean;
    set tiledLights(value: boolean);
    /** Writes the tiled lights for this view and binds their table; an empty table when there are none. */
    private bindTiledLights;
    /** Measure the WebGL2 renderer calls made synchronously by one application frame. */
    measureFrame(draw: () => void, options?: {
        readonly gpuTiming?: boolean;
    }): World3DFrameMetrics;
    /** Resolve ready GPU samples without waiting. Call from a later browser turn. */
    pollFrameTimings(): void;
    render(scene: Scene3D, camera: Camera3D, target?: RenderTarget3D): boolean;
    /** Draw the view prepared by PlanarReflection3D and identify it in frame metrics. */
    renderReflection(scene: Scene3D, camera: Camera3D, target: RenderTarget3D): boolean;
    /** Draw the mirror directly with its own output, shadows and object selection. */
    renderReflectionPass(scene: Scene3D, camera: Camera3D, pass: PlanarReflectionPass3D): boolean;
    private recordReflection;
    /** The retained mirror image must still belong to the live WebGL2 context. */
    reuseReflection(target: RenderTarget3D): boolean;
    private renderMeasuredView;
    private renderView;
    /** Draw the scene into the half-float chain target, then post-process into the output. */
    private renderPost;
    /** Copy the output drawn so far into a texture on the scene-color unit. */
    private grabScene;
    private resetState;
    /** std140 blocks stay active even when unused, so the buffer must be bound before the shadow pass. */
    private bindFrameBlock;
    private uploadFrameBlock;
    private createShadowAtlas;
    private renderShadows;
    /** Draw the depth of the opaque scene, as the camera sees it, into a texture of the output's size. */
    private renderSceneDepth;
    private readonly depthItem;
    private drawDepth;
    private selectProgram;
    private programRequest;
    private applyMaterial;
    private applyState;
    private meshProgramVariant;
    private draw;
    /** Upload the strongest morph influences; the shader blends at most a fixed number. */
    private applyMorph;
    private drawSkybox;
    private assertReadbackAvailable;
    private readFramebuffer;
    /** Read back RGBA8 pixels of the last frame; requires preserveDrawingBuffer or a call right after render(). */
    readPixels(x?: number, y?: number, width?: number, height?: number): Uint8Array;
    /** RGBA8 pixels of a render target, top row first. Resolves immediately on WebGL2. */
    readRenderTargetPixels(target: RenderTarget3D): Promise<Uint8Array>;
    private clearMaterialPrograms;
    /** True when textures in this compressed format can be used on this device. */
    supportsCompressedFormat(format: CompressedFormat3D): boolean;
    /** Release every GPU object and detach from the canvas. Idempotent. */
    dispose(): void;
}
/** Makes a renderer that draws 3D scenes with WebGL2. */
export declare function createWebGL2Renderer3D(options: WebGL2Renderer3DOptions): WebGL2Renderer3D;
//# sourceMappingURL=WebGL2Renderer3D.d.ts.map