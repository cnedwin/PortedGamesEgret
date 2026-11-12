import type { SharedPageCopyDiagnostics2D } from '../rendering/sharedColor2D.js';
import type { PreparedSharedFrame2D } from '../rendering/prepareSharedDraws2D.js';
import { packSharedDraws2D } from '../rendering/packSharedDraws2D.js';
import type { ProjectionPlan2D } from './imageProjections2D.js';
import type { SharedWebGPUConfiguration } from './sharedWebGPUOptions.js';
import type { SharedOwnerSnapshot2D, SharedSceneStorage2D, SharedSubmissionStorage2D as NeutralSharedSubmissionStorage2D } from './sharedSubmissionStorage2D.js';
export { SharedStorageError2D } from './sharedSubmissionStorage2D.js';
export type { SharedOwnerSnapshot2D, SharedSceneStorage2D } from './sharedSubmissionStorage2D.js';
export interface SharedSubmissionStorage2D extends NeutralSharedSubmissionStorage2D {
    readonly options: SharedWebGPUConfiguration;
}
export declare const checkSharedCapacity2D: (storage: SharedSubmissionStorage2D, owner: SharedOwnerSnapshot2D, canonicalBytes?: number, sourceCopy?: number) => void;
export declare const materializeSharedPages2D: (storage: SharedSubmissionStorage2D, cold: ReadonlySet<number>, owner: SharedOwnerSnapshot2D, diagnostics?: SharedPageCopyDiagnostics2D) => {
    projections: (Uint8Array<ArrayBuffer> | undefined)[];
    canonicalBytes: number;
};
/** Preserve WebGPU fees, 256-byte rows, native checks and pending order before payloads. */
export declare function planSharedSubmission2D(prepared: PreparedSharedFrame2D, options: SharedWebGPUConfiguration, hardware: {
    maxTextureDimension2D: number;
    maxBufferSize: number;
    sceneBufferBytes?: readonly number[];
}, owner: SharedOwnerSnapshot2D, readback: boolean, scene?: SharedSceneStorage2D, sharedProjection?: ProjectionPlan2D): SharedSubmissionStorage2D;
export declare const packSharedSubmission2D: typeof packSharedDraws2D;
//# sourceMappingURL=prepareSharedSubmission2D.d.ts.map