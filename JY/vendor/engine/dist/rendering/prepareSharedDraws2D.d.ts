import type { PreparedEffects2D } from './sharedEffects2D.js';
import type { SharedRenderFrame2D, SharedRenderCommand2D, SharedMaterial2D, SharedRegion2D } from '@egret/contracts';
import { TexturedPreparationBudget2D } from './texturedPreparationBudget2D.js';
import type { TexturedPreparationLimits2D } from './texturedPreparationBudget2D.js';
export declare class SharedPreparationError extends Error {
    readonly reason: 'frame' | 'profile' | 'precision' | 'budget';
    constructor(reason: 'frame' | 'profile' | 'precision' | 'budget');
}
export declare function sharedFailure(reason: SharedPreparationError['reason']): never;
export interface SharedPoint2D {
    readonly x: number;
    readonly y: number;
    readonly u: number;
    readonly v: number;
    readonly r: number;
    readonly g: number;
    readonly b: number;
    readonly a: number;
    readonly dr: number;
    readonly dg: number;
    readonly db: number;
}
export type SharedDrawCommand2D = Exclude<SharedRenderCommand2D, {
    kind: 'barrier';
}>;
export interface PreparedSharedDraw2D {
    readonly kind: 'draw';
    readonly command: SharedDrawCommand2D;
    readonly material: SharedMaterial2D;
    readonly region: SharedRegion2D | undefined;
    readonly pageIndex: number | undefined;
    readonly polygons: readonly (readonly SharedPoint2D[])[];
    readonly vertexReservation: number;
}
export interface PreparedSharedBarrier2D {
    readonly kind: 'barrier';
    readonly ordinal: number;
    readonly occurrenceId: number;
}
export type PreparedSharedEntry2D = PreparedSharedDraw2D | PreparedSharedBarrier2D;
export interface SharedPreparationOptions2D extends TexturedPreparationLimits2D {
    readonly enableEffects?: boolean;
    readonly pixelRatio: number;
    readonly maxCommands: number;
    readonly maxClipRectangles: number;
    readonly maxFrameGeometryBytes: number;
}
export interface PreparedSharedFrame2D {
    readonly effects: PreparedEffects2D;
    readonly frame: SharedRenderFrame2D;
    readonly width: number;
    readonly height: number;
    readonly entries: readonly PreparedSharedEntry2D[];
    readonly budget: TexturedPreparationBudget2D;
    readonly geometryBytes: number;
    readonly pageBytes: number;
    readonly upload: number;
}
/** Address qualification follows f32 preparation and never clamps/modulos authored vertices. */
export declare function qualifySharedUV(point: SharedPoint2D, draw: Pick<PreparedSharedDraw2D, 'region' | 'material' | 'pageIndex'>, frame: SharedRenderFrame2D): void;
/** Authentic completion is checked by Host; this cold helper still defends all table references. */
export declare function prepareSharedDraws2D(frame: SharedRenderFrame2D, width: number, height: number, options: SharedPreparationOptions2D): PreparedSharedFrame2D;
//# sourceMappingURL=prepareSharedDraws2D.d.ts.map