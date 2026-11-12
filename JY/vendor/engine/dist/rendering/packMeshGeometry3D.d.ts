import { type MeshGeometry3D } from './meshGeometry3D.js';
/** Private upload storage: only the wrapper is frozen, not its owned buffers. */
export interface PackedMeshGeometry3D {
    readonly vertices: Float32Array<ArrayBuffer>;
    readonly indices: Uint32Array<ArrayBuffer>;
    readonly vertexCount: number;
    readonly indexCount: number;
    readonly vertexBytes: number;
    readonly indexBytes: number;
}
export type MeshPacking3DErrorCode = 'MESH3D_PACK_INPUT_INVALID' | 'MESH3D_PACK_BUDGET' | 'MESH3D_PACK_F32_UNSUPPORTED' | 'MESH3D_PACK_NATIVE_FAILED';
export type MeshPacking3DErrorOrigin = 'validation' | 'budget' | 'native';
export declare class MeshPacking3DError extends Error {
    readonly code: MeshPacking3DErrorCode;
    constructor(code: MeshPacking3DErrorCode, cause?: unknown);
}
export declare function packMeshGeometry3D(geometry: MeshGeometry3D): PackedMeshGeometry3D;
export declare function getMeshPacking3DErrorOrigin(value: unknown): MeshPacking3DErrorOrigin | undefined;
//# sourceMappingURL=packMeshGeometry3D.d.ts.map