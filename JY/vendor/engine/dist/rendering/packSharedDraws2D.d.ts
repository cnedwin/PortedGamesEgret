import type { PreparedSharedDraw2D, PreparedSharedFrame2D } from './prepareSharedDraws2D.js';
export interface PackedSharedDraw2D {
    readonly prepared: PreparedSharedDraw2D;
    readonly data: Float32Array<ArrayBuffer>;
    readonly vertexCount: number;
    readonly uniform: Uint8Array<ArrayBuffer>;
}
export type PackedSharedEntry2D = PackedSharedDraw2D | {
    readonly barrier: true;
    readonly ordinal: number;
};
/** Backing coordinates stay backing coordinates until the fixed vertex shader. */
export declare function packSharedDraws2D(prepared: PreparedSharedFrame2D): PackedSharedEntry2D[];
//# sourceMappingURL=packSharedDraws2D.d.ts.map