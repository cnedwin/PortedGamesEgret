import type { ImageData2D, TexturedGeometry2D, TexturedRenderCommand2D, TexturedRenderFrame2D } from '@egret/contracts';
import type { PreparedRectangles2D, RectanglePreparationOptions, ClipRectanglePreparationContext2D } from './prepareRectangles2D.js';
import type { PreparedImage2D } from './prepareImages2D.js';
import type { PreparedMesh2D } from './prepareTexturedMesh2D.js';
import { TexturedPreparationBudget2D } from './texturedPreparationBudget2D.js';
import type { PreparedCacheContext2D, PreparedCacheSlot2D } from './preparedFrameCache2D.js';
/** Private canonical metadata records; the admission owner alone charges source triangles. */
export interface AdmittedTexturedCommand2D {
    readonly command: TexturedRenderCommand2D;
    readonly commandIndex: number;
    readonly geometry?: TexturedGeometry2D;
    readonly image?: ImageData2D;
}
export interface TexturedFrameAdmission2D {
    readonly frame: TexturedRenderFrame2D;
    readonly width: number;
    readonly height: number;
    readonly uniqueGeometryBytes: number;
    readonly commands: readonly AdmittedTexturedCommand2D[];
}
export type PreparedTexturedDraw2D = {
    readonly kind: 'rect';
    readonly prepared: PreparedRectangles2D;
    readonly commandIndices: readonly number[];
    readonly cacheSlot?: PreparedCacheSlot2D;
} | {
    readonly kind: 'image';
    readonly prepared: PreparedImage2D;
    readonly commandIndex: number;
    readonly cacheSlot?: PreparedCacheSlot2D;
} | {
    readonly kind: 'mesh';
    readonly prepared: PreparedMesh2D;
    readonly commandIndex: number;
    readonly cacheSlot?: PreparedCacheSlot2D;
};
/** Private scratch factory; no registration, public export, retained frame or authority token. */
export declare function createClipRectangleContext2D(options: RectanglePreparationOptions, budget: TexturedPreparationBudget2D): ClipRectanglePreparationContext2D | undefined;
/** Preserve painter barriers and share one frame ledger across all three preparation paths. */
export declare function prepareTexturedDraws2D(admitted: TexturedFrameAdmission2D, options: RectanglePreparationOptions, budget: TexturedPreparationBudget2D, cache?: PreparedCacheContext2D, containedClipping?: boolean): readonly PreparedTexturedDraw2D[];
//# sourceMappingURL=prepareTexturedDraws2D.d.ts.map