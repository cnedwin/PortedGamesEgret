/** Internal owned binary64 tuples; no host/backend or public facade dependency. */
export type Matrix4 = readonly [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
];
export type Vector4 = readonly [number, number, number, number];
export type Math3DErrorCode = 'MATH3D_INPUT_INVALID' | 'MATH3D_INPUT_READ_FAILED' | 'MATH3D_GEOMETRY_INVALID' | 'MATH3D_ARITHMETIC_RANGE' | 'MATH3D_NATIVE_FAILED';
export declare class Math3DError extends Error {
    readonly code: Math3DErrorCode;
    constructor(code: Math3DErrorCode, cause?: unknown);
}
export declare function createMatrix4(input: unknown): Matrix4;
export declare function createVector4(input: unknown): Vector4;
export declare function multiplyMatrix4(left: unknown, right: unknown): Matrix4;
export declare function transformHomogeneous4(matrix: unknown, vector: unknown): Vector4;
//# sourceMappingURL=matrix4.d.ts.map