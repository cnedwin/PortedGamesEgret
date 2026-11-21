import type { Engine } from '@egret/engine';
import type { Scope } from '@egret/runtime';
import type { Disposable } from '@egret/contracts';
import type { Camera3D } from '../../rendering/world3d/Camera3D.js';
import type { Scene3D } from '../../rendering/world3d/Object3D.js';
import type { AnimationMixer3D } from '../../rendering/world3d/Animation3D.js';
import type { Renderer3D, ToneMapping3D } from './frame3D.js';
import { World3DView } from './World3DView.js';
import type { OrbitControls3D } from './OrbitControls3D.js';
/** Which GPU interface a 3D app draws with. */
export type World3DBackend = 'webgl2' | 'webgpu';
/** How much a 3D app draws: low, medium or high quality. */
export type World3DQuality = 'low' | 'medium' | 'high';
/** What one picture quality turns on. */
export interface World3DQualityPreset {
    /** Largest device pixel ratio drawn at. */
    readonly pixelRatio: number;
    /** Multisampling of the canvas; fixed when the renderer is made. */
    readonly antialias: boolean;
    readonly shadows: boolean;
    /** Edge of the shadow atlas in texels; fixed when the renderer is made. */
    readonly shadowAtlasSize: number;
    /** The post-processing chain, and which of its parts run. */
    readonly post: boolean;
    readonly bloom: boolean;
    readonly ssao: boolean;
    readonly fxaa: boolean;
}
/** The three qualities. A phone gets `low`, a desktop `high`; `medium` sits between for weaker computers. */
export declare const WORLD3D_QUALITY_PRESETS: Readonly<Record<World3DQuality, World3DQualityPreset>>;
/** What `pickWorld3DQuality` reads about the device. Every field is optional; missing ones are read from the page. */
export interface World3DDeviceHints {
    /** The page address's query, as `location.search` or its parsed form. `quality=low|medium|high` wins. */
    readonly query?: string | URLSearchParams;
    /** A quality the player chose before, as kept in a save. Wins over the device, not over the address. */
    readonly stored?: string | null;
    /** True when the main pointer is a finger. */
    readonly coarsePointer?: boolean;
    /** The shorter side of the window, in CSS pixels. */
    readonly shortSide?: number;
    /** `navigator.deviceMemory`, in gigabytes, where the browser reports it. */
    readonly deviceMemory?: number;
    /** True when the page is drawn by software, without a graphics card. Not read from the page: see `isSoftwareRendered3D`. */
    readonly softwareRenderer?: boolean;
}
/**
 * The picture quality for this device: the address's `quality`, then a stored choice, then `low` for software
 * rendering, a finger or a window shorter than 600 pixels, `medium` for 4 GB of memory or less, and `high` otherwise.
 */
export declare function pickWorld3DQuality(hints?: World3DDeviceHints): World3DQuality;
/**
 * Whether WebGL here is drawn by software (SwiftShader, llvmpipe and the like), as in a headless browser, a virtual
 * machine or a page whose graphics card is blocked. It asks a throwaway context for its renderer's name.
 */
export declare function isSoftwareRendered3D(document?: Document): boolean;
/** The backend asked for by the address (`backend=webgpu`), or `fallback`. */
export declare function pickWorld3DBackend(query?: string | URLSearchParams, fallback?: World3DBackend): World3DBackend;
/** How dynamic resolution moves: its least and greatest scale, its step, and the frame rates and times that move it. */
export interface DynamicResolutionOptions3D {
    /** Smallest share of the quality's pixel ratio drawn at. Defaults to 0.6. */
    readonly min?: number;
    /** Largest share. Defaults to 1. */
    readonly max?: number;
    /** How much one change moves the share. Defaults to 0.15. */
    readonly step?: number;
    /** Below this smoothed frame rate the share goes down. Defaults to 45. */
    readonly lowFps?: number;
    /** Above this smoothed frame rate the share goes up. Defaults to 57. */
    readonly highFps?: number;
    /** Seconds the rate must stay low before going down. Defaults to 1.5. */
    readonly downAfter?: number;
    /** Seconds the rate must stay high before going up. Defaults to 6. */
    readonly upAfter?: number;
}
/** A drawing resolution that follows the frame rate: down quickly when frames are slow, up slowly when they are not. */
export interface DynamicResolution3D {
    /** The share of the pixel ratio to draw at now. */
    readonly scale: number;
    /** The smoothed frame rate. */
    readonly fps: number;
    /** Takes one frame's seconds and returns the share to draw at. */
    update(deltaSeconds: number): number;
    /** Back to the largest share, as after a change of scene. */
    reset(): void;
}
/** Makes a resolution scale that drops when frames are slow and rises when they are fast. */
export declare function createDynamicResolution3D(options?: DynamicResolutionOptions3D): DynamicResolution3D;
/** A 3D app to make: its backend and quality, its dynamic resolution, its tone mapping, and what is called on an error or a lost device. */
export interface World3DAppOptions {
    /** `webgl2` or `webgpu`. Defaults to what the address asks (`backend=`), else WebGL2. */
    readonly backend?: World3DBackend;
    /** A fixed quality, or `auto` (the default) for `pickWorld3DQuality`. */
    readonly quality?: World3DQuality | 'auto';
    /** A quality the player chose before; used by `auto` after the address. */
    readonly storedQuality?: string | null;
    /** The address's query; `location.search` by default. */
    readonly query?: string | URLSearchParams;
    /** Let the drawing resolution follow the frame rate. On by default; pass options or `false`. */
    readonly dynamicResolution?: boolean | DynamicResolutionOptions3D;
    readonly toneMapping?: ToneMapping3D;
    readonly exposure?: number;
    readonly powerPreference?: 'default' | 'low-power' | 'high-performance';
    /** Told of failures while updating or drawing and of a stopped loop. Without it they are thrown. */
    readonly onError?: (cause: unknown) => void;
    /** Told once when the graphics device is lost. */
    readonly onDeviceLost?: (message: string) => void;
}
/** What a 3D app shows: its update, mixers and controls. */
export interface World3DShowOptions {
    /** Called every frame before animation and drawing. */
    readonly onUpdate?: (deltaSeconds: number, elapsedSeconds: number) => void;
    readonly mixers?: readonly AnimationMixer3D[];
    readonly controls?: OrbitControls3D;
}
/** A 3D app: its Engine, renderer and view, its quality and resolution, and calls that show a scene and start and stop it. */
export interface World3DApp extends Disposable {
    readonly engine: Engine;
    /** The Engine scope the app's view and renderer belong to. */
    readonly scope: Scope;
    readonly renderer: Renderer3D;
    /** The backend in use. A WebGPU request falls back to WebGL2 when the browser has no adapter. */
    readonly backend: World3DBackend;
    /** True when WebGPU was asked for and WebGL2 is drawing instead. */
    readonly fellBack: boolean;
    readonly quality: World3DQuality;
    /** The share of the quality's pixel ratio drawn at, 1 without dynamic resolution. */
    readonly resolutionScale: number;
    /** The view showing now, if any. */
    readonly view: World3DView | undefined;
    /** Applies another quality's shadows, post-processing and pixel ratio. Antialiasing and the atlas size stay. */
    setQuality(quality: World3DQuality): void;
    /** Shows a scene through a camera, replacing what was shown. The loop starts if it is not running. */
    show(scene: Scene3D, camera: Camera3D, options?: World3DShowOptions): World3DView;
    /** Starts or stops the frame loop. */
    start(): void;
    stop(): void;
}
/**
 * Starts a World3D game on `canvas`: an Engine, a renderer for the chosen backend and quality, and a frame loop.
 * Call `show(scene, camera)` to draw. `dispose()` ends the loop, the view, the renderer and the Engine.
 */
export declare function createWorld3DApp(canvas: HTMLCanvasElement | OffscreenCanvas, options?: World3DAppOptions): Promise<World3DApp>;
//# sourceMappingURL=app3D.d.ts.map