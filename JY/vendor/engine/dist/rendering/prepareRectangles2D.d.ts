import type { ClipRectangle2D } from '@egret/contracts';
import type { RectangleFrame2D } from './RectangleFrame2D.js';
import type { PreparedCacheContext2D, PreparedStageCost2D } from './preparedFrameCache2D.js';
export interface PreparedPoint2D {
    readonly x: number;
    readonly y: number;
}
/** Private structural seam; the opted-in dispatcher supplies one first-party ledger. */
export interface PreparationBudget2D {
    admitPreparedVertices(count: number): void;
    admitPredicate(): void;
    tryReplayStageCost?(cost: PreparedStageCost2D): boolean;
}
/** Private polygon policy; omission retains the legacy XY cache and corner limit. */
export interface PolygonClipPolicy2D<P extends PreparedPoint2D> {
    readonly maxCorners: number;
    before(first: P, second: P): boolean;
    sameTuple(first: P, second: P): boolean;
    assertAppend(currentLength: number): void;
}
export interface PreparedRectangles2D {
    readonly points: readonly PreparedPoint2D[];
    readonly commands: readonly {
        readonly pointIndices: readonly number[];
        readonly color: number;
        readonly alpha: number;
    }[];
    readonly edgeTests: number;
}
export interface RectanglePreparationOptions {
    readonly pixelRatio: number;
    readonly maxPreparedVertices: number;
    readonly maxClipEdgeTests: number;
}
interface ClipRectanglePreparationEntry2D {
    readonly polygon: readonly PreparedPoint2D[];
    readonly predicates: number;
}
/** Call-local scratch supplied only by the opted-in ordinary TEXTURED dispatcher. */
export interface ClipRectanglePreparationContext2D {
    readonly options: RectanglePreparationOptions;
    readonly budget: PreparationBudget2D;
    active: boolean;
    entries: Map<ClipRectangle2D, ClipRectanglePreparationEntry2D> | undefined;
}
/** Drop all clip references before packing, including on an original preparation failure. */
export declare function clearClipRectangleContext2D(context: ClipRectanglePreparationContext2D | undefined): void;
/** Adapter-owned mapping keeps these numeric errors private to preparation. */
export declare class GeometryPreparationError extends Error {
    readonly reason: 'range' | 'precision' | 'budget';
    constructor(reason: 'range' | 'precision' | 'budget', cause?: unknown);
}
export declare const POLYGON_LIMIT = 1024;
export declare function coordinate(value: number): number;
export declare function same(a: PreparedPoint2D, b: PreparedPoint2D): boolean;
export declare function before(a: PreparedPoint2D, b: PreparedPoint2D): boolean;
export declare class Preparation {
    private readonly options;
    private readonly budget?;
    private readonly containedClipping;
    edgeTests: number;
    constructor(options: RectanglePreparationOptions, budget?: PreparationBudget2D | undefined, containedClipping?: boolean);
    private determinant;
    /** Only the ordinary TEXTURED Host enables this for its own normalized polygons and ledger. */
    tryContainedClip<P extends PreparedPoint2D>(subject: P[], clip: readonly PreparedPoint2D[], normalization: 'rectangle' | 'image' | 'mesh'): P[] | undefined;
    /** Known first-party normalization may skip one unchanged canonical half-plane. */
    tryContainedEdge<P extends PreparedPoint2D>(subject: P[], clip: readonly PreparedPoint2D[], edge: number, normalization: 'rectangle' | 'image' | 'mesh'): P[] | undefined;
    sign(a: PreparedPoint2D, b: PreparedPoint2D, c: PreparedPoint2D): number;
    normalize(input: readonly PreparedPoint2D[]): PreparedPoint2D[];
    corners(input: ClipRectangle2D): PreparedPoint2D[];
    rectangle(input: ClipRectangle2D): PreparedPoint2D[];
    /** Reuse only successful first-party clip rectangles, never the subject or viewport. */
    clipRectangle(input: ClipRectangle2D, context?: ClipRectanglePreparationContext2D): readonly PreparedPoint2D[];
    crossing<P extends PreparedPoint2D>(a: PreparedPoint2D, b: PreparedPoint2D, first: P, second: P, attach: CrossingAttributes<P>, policy?: PolygonClipPolicy2D<P>): P;
    intersect(subject: PreparedPoint2D[], clip: readonly PreparedPoint2D[], normalized?: boolean): PreparedPoint2D[];
}
/** Policy wrappers keep their collinear/duplicate rules; this finish preserves sign order and full points. */
export declare function finishPolygonWinding2D<P extends PreparedPoint2D>(preparation: Preparation, points: P[]): P[];
export type CrossingAttributes<P extends PreparedPoint2D> = (p: P, q: P, weight: number, complementary: boolean, x: number, y: number) => P;
/** Shared traversal preserves determinant order; callers own attribute normalization. */
export declare function clipPolygon2D<P extends PreparedPoint2D>(preparation: Preparation, subject: P[], clip: readonly PreparedPoint2D[], normalize: (preparation: Preparation, input: readonly P[]) => P[], attach: CrossingAttributes<P>, policy?: PolygonClipPolicy2D<P>, normalization?: 'rectangle' | 'image' | 'mesh'): P[];
export declare function prepareRectangles2D(frame: RectangleFrame2D, width: number, height: number, options: RectanglePreparationOptions, budget?: PreparationBudget2D, commandIndices?: number[], cache?: PreparedCacheContext2D, sourceCommandIndices?: readonly number[], containedClipping?: boolean, clipContext?: ClipRectanglePreparationContext2D): PreparedRectangles2D;
export {};
//# sourceMappingURL=prepareRectangles2D.d.ts.map