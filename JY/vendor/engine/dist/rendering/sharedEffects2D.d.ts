import type { SharedRenderFrame2D } from '@egret/contracts';
/** A schedule contains no native handles and borrows only immutable captured data. */
export interface PreparedEffect2D {
    readonly enter: number;
    readonly exit: number;
    readonly depth: number;
    readonly maskPageIndex: number | undefined;
    readonly radius: number;
    readonly uniform: Float32Array<ArrayBuffer>;
}
export interface PreparedEffects2D {
    readonly groups: readonly PreparedEffect2D[];
    readonly depth: number;
    readonly targetCount: number;
    readonly uniformBytes: number;
}
/** All admission precedes target/buffer allocation. Clips execute at group composition. */
export declare function prepareEffects2D(frame: SharedRenderFrame2D, ratio: number, enabled: boolean): PreparedEffects2D;
//# sourceMappingURL=sharedEffects2D.d.ts.map