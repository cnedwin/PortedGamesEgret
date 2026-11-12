import type { DisplaySubtreeTicket } from './displaySubtreeTicket.js';
import type { DisplayObject, DisplayObjectContainer } from '@egret/runtime';
import type { FrameOptions2D, RenderFrame2D, TexturedFrameProfile2D, TexturedRenderFrame2D, SharedFrameProfile2D, SharedFrameOptions2D, SharedRenderFrame2D } from '@egret/contracts';
import type { DiagnosticHandler, HostAdapter } from "@egret/contracts";
import type { AssetManager, AssetRef, Scope, Stage } from "@egret/runtime";
import type { BitmapResourceSlot } from './bitmapResourceSlot.js';
import type { BitmapBindingTicket } from './bitmapBindingTicket.js';
import type { AdmittedGameClockOptions } from './gameClock.js';
import type { GameClock, GameClockOptions, GameClockTick } from './gameClockTypes.js';
import type { Tween, TweenOptions } from './tweenTypes.js';
import type { AssetGroup, AssetGroupOptions } from './assetGroupTypes.js';
import type { ManifestAssetGroup, ManifestBinding, ManifestGroupOptions } from './manifestResourceTypes.js';
import type { AdmittedResourceManifest } from '@egret/contracts/resources';
import type { SequencePlayback, SequencePlaybackOptions } from './sequencePlaybackTypes.js';
import type { Bitmap, SequenceClip } from '@egret/runtime';
export interface EngineOptions {
    readonly host: HostAdapter;
    readonly shutdownTimeoutMs?: number;
    readonly onDiagnostic?: DiagnosticHandler;
    readonly clock?: GameClockOptions;
}
export interface CapturedEngineFramePorts {
    readonly legacy: ((frame: RenderFrame2D) => unknown) | undefined;
    readonly textured: ((frame: TexturedRenderFrame2D) => unknown) | undefined;
    readonly profile: TexturedFrameProfile2D | undefined;
    readonly shared?: ((frame: SharedRenderFrame2D) => unknown) | undefined;
    readonly sharedProfile?: SharedFrameProfile2D | undefined;
}
export declare let constructEngine: (options: EngineOptions, timeoutMs: number, surface: object, releaseSurface: () => void, ports: CapturedEngineFramePorts, clockOptions: AdmittedGameClockOptions) => Engine;
/** One headless run. Construct with createEngine(), not directly. */
export declare class Engine {
    #private;
    private frameBusy;
    private nextFrameId;
    private frameIdle;
    private releaseFrame;
    private readonly renderer;
    private readonly sharedRenderer;
    private readonly texturedRenderer;
    private readonly scopes;
    private readonly cleanupErrors;
    private closePromise;
    private readonly host;
    private readonly timeoutMs;
    private readonly onDiagnostic;
    private readonly releaseSurface;
    readonly stage: Stage;
    readonly assets: AssetManager;
    readonly sharedFrameProfile: SharedFrameProfile2D | undefined;
    readonly texturedFrameProfile: TexturedFrameProfile2D | undefined;
    readonly clock: GameClock;
    private constructor();
    advanceTime(sourceSeconds: number): GameClockTick | undefined;
    captureFrame(options: FrameOptions2D): RenderFrame2D;
    renderFrame(options: FrameOptions2D): RenderFrame2D;
    captureTexturedFrame(options: FrameOptions2D): TexturedRenderFrame2D;
    renderTexturedFrame(options: FrameOptions2D): TexturedRenderFrame2D;
    captureSharedFrame(options: SharedFrameOptions2D): SharedRenderFrame2D;
    /** Capture a prepared binding view without publishing it to the live scene. */
    capturePreparedSharedFrame(ticket: BitmapBindingTicket, options: SharedFrameOptions2D): SharedRenderFrame2D;
    /**
     * Prepare one borrowed detached root as the target container's new sole child.
     * Uses authenticated already-bound private state, not fresh subclass hooks/getters.
     * Run application semantic guards before preparation; Scope ownership is not their approval.
     */
    prepareDisplaySubtree(scope: Scope, target: DisplayObjectContainer, candidate: DisplayObject): DisplaySubtreeTicket;
    /** Immutable candidate snapshot; the live Stage remains unchanged. */
    capturePreparedDisplaySharedFrame(ticket: DisplaySubtreeTicket, options: SharedFrameOptions2D): SharedRenderFrame2D;
    renderSharedFrame(options: SharedFrameOptions2D): SharedRenderFrame2D;
    /** Share the existing lifecycle barrier and ID sequence without changing old options. */
    private executeSharedFrame;
    /** Busy precedes all external reads; cleanup waits for the finally barrier. */
    private executeFrame;
    createScope(): Scope;
    createTween(scope: Scope, options: TweenOptions): Tween;
    /** Create an idle, Scope-owned sequence controller without rendering or ticking. */
    createSequencePlayback(scope: Scope, bitmap: Bitmap, clip: SequenceClip, options?: SequencePlaybackOptions): SequencePlayback;
    /** Preserve the current image while an explicitly requested replacement loads. */
    createBitmapResourceSlot(scope: Scope, bitmap: Bitmap): BitmapResourceSlot;
    /** Capture exact Bitmap bindings before asynchronously preparing a borrowed group. */
    captureBitmapBindings(scope: Scope, targets: readonly Bitmap[]): BitmapBindingTicket;
    createAssetGroup<T>(scope: Scope, refs: readonly AssetRef<T>[], options?: AssetGroupOptions): AssetGroup<T>;
    /** Acquire an admitted dependency closure with independent group-owned leases. */
    createManifestGroup(scope: Scope, manifest: AdmittedResourceManifest, roots: readonly string[], bindings: readonly ManifestBinding[], options?: ManifestGroupOptions): ManifestAssetGroup;
    /** Every caller shares one close promise, including reentrant cleanup callbacks. */
    dispose(): Promise<void>;
    private runClose;
}
//# sourceMappingURL=Engine.d.ts.map