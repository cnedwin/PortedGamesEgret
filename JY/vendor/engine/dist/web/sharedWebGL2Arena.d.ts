import type { PackedSharedDraw2D } from '../rendering/packSharedDraws2D.js';
export interface SharedWebGL2ArenaStrides {
    readonly sharedStride: number;
    readonly sceneStride: number;
}
interface SharedRange {
    readonly draw: PackedSharedDraw2D;
    readonly vertexOffset: number;
    readonly firstVertex: number;
    readonly uniformOffset: number;
    readonly uniformSize: 128;
}
interface SceneRange {
    readonly uniform: Float32Array<ArrayBuffer>;
    readonly uniformOffset: number;
    readonly uniformSize: 64 | 112 | 128;
}
export interface SharedWebGL2ArenaPlan {
    readonly vertexBytes: number;
    readonly uniformBytes: number;
    readonly sharedRanges: readonly SharedRange[];
    readonly sceneRanges: readonly SceneRange[];
}
export interface SharedWebGL2ArenaOwner {
    readonly pendingVertexArenaBytes: number;
    readonly pendingUniformArenaBytes: number;
}
/** Actual GL alignment is finite but need not be a power of two. */
export declare function qualifySharedWebGL2Alignment(alignment: number): SharedWebGL2ArenaStrides;
/** Plan only native addresses; existing private payload arrays remain their original owners. */
export declare function planSharedWebGL2Arenas(draws: readonly PackedSharedDraw2D[], sceneUniforms: readonly Float32Array<ArrayBuffer>[], alignment: number): SharedWebGL2ArenaPlan;
/** Pure check: Host repeats it with current counters immediately before owner/serial commit. */
export declare function checkSharedWebGL2ArenaCapacity(plan: SharedWebGL2ArenaPlan, owner: SharedWebGL2ArenaOwner): void;
export {};
//# sourceMappingURL=sharedWebGL2Arena.d.ts.map