/** Private owned binary64 geometry; float32 admission is a separate policy. */
export interface MeshGeometry3D {
    readonly positions: readonly number[];
    readonly colors: readonly number[];
    readonly indices: readonly number[];
    readonly vertexCount: number;
    readonly indexCount: number;
    readonly logicalBytes: number;
}
export type MeshGeometry3DErrorCode = 'MESH3D_INPUT_INVALID' | 'MESH3D_INPUT_READ_FAILED' | 'MESH3D_BUDGET' | 'MESH3D_NATIVE_FAILED';
export type MeshGeometry3DErrorOrigin = 'validation' | 'budget' | 'source' | 'native';
export declare class MeshGeometry3DError extends Error {
    readonly code: MeshGeometry3DErrorCode;
    constructor(code: MeshGeometry3DErrorCode, cause?: unknown);
}
export declare function createMeshGeometry3D(input: unknown): MeshGeometry3D;
export declare function isMeshGeometry3D(value: unknown): value is MeshGeometry3D;
export declare function getMeshGeometry3DErrorOrigin(value: unknown): MeshGeometry3DErrorOrigin | undefined;
//# sourceMappingURL=meshGeometry3D.d.ts.map