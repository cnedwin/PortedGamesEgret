declare const sharedGeometry2DBrand: unique symbol;
/** A float array of a shared geometry, in single or double precision. */
export type SharedFloatArray2D = Float32Array<ArrayBuffer> | Float64Array<ArrayBuffer>;
/** An index array of a shared geometry, in 16 or 32 bits. */
export type SharedIndexArray2D = Uint16Array<ArrayBuffer> | Uint32Array<ArrayBuffer>;
/** The positions, texture coordinates, light and dark colors and triangle indices of a mesh to share with a renderer. */
export interface SharedGeometryInput2D {
    readonly positions: SharedFloatArray2D;
    readonly uvs: SharedFloatArray2D;
    readonly lightColors: SharedFloatArray2D;
    readonly darkColors: SharedFloatArray2D;
    readonly indices: SharedIndexArray2D;
}
/** Immutable CPU geometry identity; the brand grants no asset or GPU authority. */
export interface SharedGeometry2D {
    readonly [sharedGeometry2DBrand]: true;
    readonly vertexCount: number;
    readonly indexCount: number;
    readonly triangleCount: number;
    readonly logicalByteLength: number;
    readonly positions: readonly number[];
    readonly uvs: readonly number[];
    readonly lightColors: readonly number[];
    readonly darkColors: readonly number[];
    readonly indices: readonly number[];
}
/** Copies and checks a mesh into a shared geometry that renderers can draw; malformed arrays are refused. */
export declare function createSharedGeometry2D(input: SharedGeometryInput2D): SharedGeometry2D;
export declare function isSharedGeometry2D(value: unknown): value is SharedGeometry2D;
export {};
//# sourceMappingURL=SharedGeometry2D.d.ts.map