import { type MeshGeometry3D } from './meshGeometry3D.js';
/** Shared scene recipe: original authored eligibility, then decode before f32 interpolation. */
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
export declare function packSharedMeshGeometry3D(geometry: MeshGeometry3D, texcoords?: readonly number[], normals?: readonly number[]): PackedMeshGeometry3D;
export declare function getSharedMeshPacking3DErrorOrigin(value: unknown): MeshPacking3DErrorOrigin | undefined;
//# sourceMappingURL=packSharedMeshGeometry3D.d.ts.map