import type { TexturedRenderFrame2D } from '@egret/contracts';
import type { TexturedFrameAdmission2D } from './prepareTexturedDraws2D.js';
import type { TexturedPreparationBudget2D } from './texturedPreparationBudget2D.js';
export interface TexturedFrameAdmissionOptions2D {
    readonly pixelRatio: number;
    readonly maxBackingPixels: number;
    readonly maxCommands: number;
    readonly maxClipRectangles: number;
    readonly maxSourceTriangles: number;
    readonly maxFrameGeometryBytes: number;
}
/** Private metadata classification; the host also requires current-invocation provenance. */
export declare class TexturedFrameAdmissionError2D extends Error {
    readonly reason: 'invalid' | 'backing' | 'budget';
    constructor(reason: 'invalid' | 'backing' | 'budget');
}
/** Admit an already owner-authenticated frame. This helper grants no frame authority. */
export declare function admitTexturedFrame2D(frame: TexturedRenderFrame2D, options: TexturedFrameAdmissionOptions2D, budget: TexturedPreparationBudget2D, reuseValidatedClips?: boolean): TexturedFrameAdmission2D;
//# sourceMappingURL=admitTexturedFrame2D.d.ts.map