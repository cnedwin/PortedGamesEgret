import type { SceneCardDraw3D, SceneDraw3D } from '../rendering/sceneFrame3D.js';
import type { PreparedSharedFrame2D } from '../rendering/prepareSharedDraws2D.js';
import type { SharedPageCopyDiagnostics2D } from '../rendering/sharedColor2D.js';
import type { ProjectionPlan2D } from './imageProjections2D.js';
/** Private logical limits; native capabilities remain in each concrete wrapper. */
export interface SharedStorageLimits2D {
    readonly maxUploadBytes: number;
    readonly maxPendingUploadBytes: number;
    readonly maxPendingFrames: number;
    readonly maxReadbackBytes: number;
    readonly maxPendingGeometryBytes: number;
}
/** Append scene images to the existing page namespace without changing overlay indices. */
export declare function attachSharedSceneSources2D(prepared: PreparedSharedFrame2D, cards: readonly SceneCardDraw3D[], draws: readonly SceneDraw3D[]): {
    prepared: PreparedSharedFrame2D;
    projectionPlan: ProjectionPlan2D;
    cardViews: readonly number[];
    textureViews: ReadonlyMap<SceneDraw3D['geometry'], number>;
} | undefined;
export declare function packSharedSceneCardUniform3D(card: SceneCardDraw3D): Float32Array<ArrayBuffer>;
/** Fixed 128-byte uniform ABI for the optional opaque Lambert draw. */
export declare function packSharedSceneLambertUniform3D(draw: SceneDraw3D): Float32Array<ArrayBuffer>;
export declare class SharedStorageError2D extends Error {
    readonly reason: 'budget' | 'device' | 'backpressure' | 'serial';
    constructor(reason: 'budget' | 'device' | 'backpressure' | 'serial');
}
export interface SharedOwnerSnapshot2D {
    readonly pendingFrames: number;
    readonly pendingUploadBytes: number;
    readonly pendingReadbackBytes: number;
    readonly pendingTextureBytes: number;
    readonly pendingGeometryBytes: number;
    readonly pendingColorBytes: number;
    readonly pendingCanonicalBytes: number;
    readonly pendingSceneBytes: number;
    readonly pendingUniformBytes: number;
    readonly pendingDepthBytes: number;
    readonly serial: number;
}
export interface SharedSceneStorage2D {
    readonly sceneBytes: number;
    readonly uniformBytes: number;
    readonly depthBytes: number;
}
export interface SharedStorageFees2D {
    readonly prepared: PreparedSharedFrame2D;
    readonly options: SharedStorageLimits2D;
    readonly upload: number;
    readonly colorBytes: number;
    readonly effectBytes: number;
    readonly scene: SharedSceneStorage2D | undefined;
}
/** Concrete amounts authored by the backend after the shared logical fee check. */
export interface SharedReadbackLayout2D {
    readonly rowPitch: number;
    readonly staging: number;
    readonly output: number;
}
export interface SharedStoragePlan2D extends SharedStorageFees2D, SharedReadbackLayout2D {
}
export interface SharedSubmissionStorage2D extends SharedStoragePlan2D {
    readonly projectionPlan: ProjectionPlan2D;
}
/** Joint logical fees precede readback layout, native limits, pending checks and payloads. */
export declare function planSharedStorageFees2D(prepared: PreparedSharedFrame2D, options: SharedStorageLimits2D, scene?: SharedSceneStorage2D): SharedStorageFees2D;
/** No allocator or callback is accepted; the caller supplies its already computed layout. */
export declare function withSharedReadbackLayout2D(fees: SharedStorageFees2D, layout: SharedReadbackLayout2D): SharedStoragePlan2D;
export declare function checkSharedCapacity2D(storage: SharedStoragePlan2D, owner: SharedOwnerSnapshot2D, canonicalBytes?: number, sourceCopy?: number): void;
/** Only current READY identities authorize omitted whole-page copies. */
export declare function materializeSharedPages2D(storage: SharedSubmissionStorage2D, cold: ReadonlySet<number>, owner: SharedOwnerSnapshot2D, diagnostics?: SharedPageCopyDiagnostics2D): {
    projections: (Uint8Array<ArrayBuffer> | undefined)[];
    canonicalBytes: number;
};
//# sourceMappingURL=sharedSubmissionStorage2D.d.ts.map