import type { ImageData2D, TexturedGeometry2D, TexturedRenderCommand2D } from '@egret/contracts';
import type { PreparationBudget2D, RectanglePreparationOptions } from './prepareRectangles2D.js';
export interface PreparedStageCost2D {
    readonly preparedVertices: number;
    readonly predicates: number;
    readonly tupleComparisons: number;
}
export interface PreparedStageValue2D<T> {
    readonly value: T;
    readonly cost: PreparedStageCost2D;
    readonly commandIndices: readonly number[] | undefined;
}
export interface PreparedCacheSettings2D extends RectanglePreparationOptions {
    readonly maxSourceTriangles?: number;
    readonly maxTupleComparisons?: number;
}
export interface PreparedCacheContext2D {
    readonly cache: PreparedFrameCache2D;
    readonly profile: 0 | 1 | 2 | 3;
    readonly settings: PreparedCacheSettings2D;
}
/** An opaque call-local key, never a retained frame, table or command array. */
export interface PreparedCacheSlot2D {
    readonly kind: 'prepared-cache-slot';
}
type Stage = 'geometry' | 'packing';
interface Key {
    readonly address: number;
    readonly identity: number;
    numbers: number[];
    image: ImageData2D | undefined;
    geometry: TexturedGeometry2D | undefined;
    resourceBytes: number;
}
interface SlotOwner {
    readonly cache: PreparedFrameCache2D;
    readonly address: number;
    readonly call: object;
    readonly allowAlternate: boolean;
    readonly observation: object;
    key: Key | undefined;
    matchedIdentity: number;
    mode: 'full' | 'rearm' | 'probe' | 'disabled';
}
/** One Host owns the combined geometry/packing allowance and its terminal clear. */
export declare class PreparedFrameCache2D {
    private candidates;
    private alternateCandidates;
    private oldest;
    private newest;
    private entries;
    private bytes;
    private reserved;
    private peakBytes;
    private peakEntries;
    private nextKeyIdentity;
    constructor();
    context(profile: 0 | 1 | 2 | 3, settings: PreparedCacheSettings2D): PreparedCacheContext2D | undefined;
    enableRecurringTexturedKeys(context: PreparedCacheContext2D): void;
    slot(context: PreparedCacheContext2D, commands: readonly TexturedRenderCommand2D[], width: number, height: number, image?: ImageData2D, geometry?: TexturedGeometry2D, run?: boolean, ordinal?: number): PreparedCacheSlot2D | undefined;
    private alternate;
    private find;
    private unlink;
    private append;
    private remove;
    read<T>(selected: SlotOwner, stage: Stage): PreparedStageValue2D<T> | undefined;
    touch(selected: SlotOwner): void;
    private convertToProbe;
    publish<T>(selected: SlotOwner, stage: Stage, value: T, cost: PreparedStageCost2D, commandIndices?: readonly number[]): void;
    /** Terminal invalidation cannot be undone by an already-created call-local slot. */
    clear(): void;
    /** Private UNIT/diagnostic logical accounting; no keys, resources or GPU authority. */
    snapshot(): {
        readonly entries: number;
        readonly bytes: number;
        readonly reservedBytes: number;
        readonly peakEntries: number;
        readonly peakBytes: number;
        readonly enabled: boolean;
    };
}
export declare function readPreparedStage2D<T>(slot: PreparedCacheSlot2D | undefined, stage: Stage): PreparedStageValue2D<T> | undefined;
export declare function acceptPreparedStage2D(slot: PreparedCacheSlot2D | undefined): void;
export declare function publishPreparedStage2D<T>(slot: PreparedCacheSlot2D | undefined, stage: Stage, value: T, cost: PreparedStageCost2D, commandIndices?: readonly number[]): void;
export declare function tryReplayPreparedStage2D(budget: PreparationBudget2D | undefined, cost: PreparedStageCost2D): boolean;
/** Required per-submission allocation stays outside every optional-cache catch. */
export declare function copyPreparedPacking2D<T extends {
    readonly data: Float32Array<ArrayBuffer>;
}>(value: T): T;
export {};
//# sourceMappingURL=preparedFrameCache2D.d.ts.map