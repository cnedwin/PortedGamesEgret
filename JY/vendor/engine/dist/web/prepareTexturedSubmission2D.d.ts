import type { TexturedRenderFrame2D } from '@egret/contracts';
import type { PreparedBatchDraw2D } from '../rendering/preparedBatches2D.js';
import type { TexturedFrameAdmission2D, PreparedTexturedDraw2D } from '../rendering/prepareTexturedDraws2D.js';
import type { TexturedPreparationBudget2D } from '../rendering/texturedPreparationBudget2D.js';
import type { PackedImage2D } from '../rendering/packImageVertices2D.js';
import type { PackedTexturedMesh2D } from '../rendering/packTexturedMesh2D.js';
import { packWebGPUVertices } from './webgpuPass.js';
import type { ProjectionPlan2D, ProjectionView2D } from './imageProjections2D.js';
type PackedRectangles2D = ReturnType<typeof packWebGPUVertices>;
export interface TexturedSubmissionStorageOptions2D {
    readonly maxUploadBytes: number;
    readonly maxPendingUploadBytes: number;
    readonly maxPendingFrames: number;
    readonly maxReadbackBytes: number;
    readonly maxPendingGeometryBytes: number;
}
export interface TexturedSubmissionHardware2D {
    readonly maxBufferSize: number;
    readonly maxTextureDimension2D: number;
}
export interface TexturedSubmissionOwnerSnapshot2D {
    readonly pendingFrames: number;
    readonly pendingUploadBytes: number;
    readonly pendingReadbackBytes: number;
    readonly pendingTextureBytes: number;
    readonly pendingGeometryBytes: number;
    readonly serial: number;
    readonly pendingSceneBytes?: number;
    readonly pendingUniformBytes?: number;
    readonly pendingDepthBytes?: number;
}
/** Only the combined host supplies these captured, first-party scene charges. */
export interface TexturedSceneReservation2D {
    readonly sceneBytes: number;
    readonly uniformBytes: number;
    readonly maxSceneBytes: number;
    readonly maxUniformBytes: number;
    readonly maxDepthBytes: number;
    readonly maxPendingSceneBytes: number;
    readonly maxPendingUniformBytes: number;
    readonly maxPendingDepthBytes: number;
}
interface JointSceneStorage2D {
    readonly sceneBytes: number;
    readonly uniformBytes: number;
    readonly depthBytes: number;
}
export interface TexturedSubmissionRequest2D {
    readonly admitted: TexturedFrameAdmission2D;
    readonly draws: readonly PreparedTexturedDraw2D[];
    readonly projectionPlan: ProjectionPlan2D;
    readonly options: TexturedSubmissionStorageOptions2D;
    readonly hardware: TexturedSubmissionHardware2D;
    readonly owner: TexturedSubmissionOwnerSnapshot2D;
    readonly readback: boolean;
    readonly sceneReservation?: TexturedSceneReservation2D;
}
export interface TexturedDrawStorage2D {
    readonly vertexBytes: number;
    readonly uniformBytes: 0 | 16;
}
export interface TexturedSubmissionStorage2D {
    readonly request: TexturedSubmissionRequest2D;
    readonly frame: TexturedRenderFrame2D;
    readonly width: number;
    readonly height: number;
    readonly upload: number;
    readonly geometryBytes: number;
    readonly drawStorage: readonly TexturedDrawStorage2D[];
    readonly rowPitch: number;
    readonly staging: number;
    readonly output: number;
    readonly sceneStorage?: JointSceneStorage2D;
}
export type PackedTexturedDraw2D = PreparedBatchDraw2D;
export interface TexturedSubmissionPlan2D {
    readonly frame: TexturedRenderFrame2D;
    readonly width: number;
    readonly height: number;
    readonly draws: PackedTexturedDraw2D[];
    readonly upload: number;
    readonly geometryBytes: number;
    readonly projectionPlan: ProjectionPlan2D;
    readonly projections: (Uint8Array<ArrayBuffer> | undefined)[];
    readonly rowPitch: number;
    readonly staging: number;
    readonly output: number;
    readonly ticket: undefined;
    readonly scene: undefined;
}
/** This seam is private. The real host always selects the captured first-party table. */
export interface TexturedPayloadOperations2D {
    pack(draw: PreparedTexturedDraw2D, width: number, height: number, admittedVertexBytes: number, budget: TexturedPreparationBudget2D, preparedCommandIndices?: number[]): PackedRectangles2D | PackedImage2D | PackedTexturedMesh2D;
    copy(view: ProjectionView2D): Uint8Array<ArrayBuffer>;
    uniform(alpha: number): Float32Array<ArrayBuffer>;
}
declare class TexturedSubmissionAdmissionError2D extends Error {
    readonly reason: 'budget' | 'device' | 'backpressure' | 'serial';
    readonly facet: 'upload' | 'buffer' | 'texture' | 'readback' | 'frames' | 'geometry' | 'scene' | 'uniform' | 'depth' | 'serial';
    constructor(reason: 'budget' | 'device' | 'backpressure' | 'serial', facet: 'upload' | 'buffer' | 'texture' | 'readback' | 'frames' | 'geometry' | 'scene' | 'uniform' | 'depth' | 'serial');
}
/** Module creation alone is insufficient: public mapping also checks the current scope object. */
export declare function isTexturedSubmissionAdmissionError2D(error: unknown): error is TexturedSubmissionAdmissionError2D;
/** Reserve whole upper bounds before packing, copying, uniform creation or owner mutation. */
export declare function planTexturedSubmissionStorage2D(request: TexturedSubmissionRequest2D): TexturedSubmissionStorage2D;
export interface PackedTexturedPayload2D {
    readonly storage: TexturedSubmissionStorage2D;
    readonly draws: PackedTexturedDraw2D[];
}
/** Packing reveals actual coverage before the Host selects qualified resident views. */
export declare function packTexturedDrawPayloads2D(storage: TexturedSubmissionStorage2D, budget: TexturedPreparationBudget2D, operations?: TexturedPayloadOperations2D, checkActive?: () => void): PackedTexturedPayload2D;
/** Only the Host's exact current READY hit set authorizes an omitted pixel payload. */
export declare function materializeTexturedSubmission2D(payload: PackedTexturedPayload2D, residentViews: ReadonlySet<number>, readOwner: () => TexturedSubmissionOwnerSnapshot2D, operations?: TexturedPayloadOperations2D, checkActive?: () => void): TexturedSubmissionPlan2D;
/** The original private facade retains its complete cold operation sequence. */
export declare function packTexturedSubmission2D(storage: TexturedSubmissionStorage2D, budget: TexturedPreparationBudget2D, readOwner: () => TexturedSubmissionOwnerSnapshot2D, operations?: TexturedPayloadOperations2D, checkActive?: () => void): TexturedSubmissionPlan2D;
/** Preserve the existing textured-only planner-then-payload sequence. */
export declare function prepareTexturedSubmission2D(request: TexturedSubmissionRequest2D, budget: TexturedPreparationBudget2D, readOwner: () => TexturedSubmissionOwnerSnapshot2D, operations?: TexturedPayloadOperations2D): TexturedSubmissionPlan2D;
export {};
//# sourceMappingURL=prepareTexturedSubmission2D.d.ts.map