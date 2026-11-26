/** What meshopt data encodes: vertex attributes, triangles or indices. */
export type MeshoptMode3D = 'ATTRIBUTES' | 'TRIANGLES' | 'INDICES';
/** The filter meshopt data was encoded with. */
export type MeshoptFilter3D = 'NONE' | 'OCTAHEDRAL' | 'QUATERNION' | 'EXPONENTIAL';
/** The largest stride and count of meshopt data. */
export declare const MESHOPT3D_LIMITS: Readonly<{
    readonly maxStride: 256;
    readonly maxElements: 268435456;
}>;
/**
 * Decode one EXT_meshopt_compression buffer view. `count` elements of
 * `stride` bytes are returned; for the two index modes the stride is 2 or 4.
 */
export declare function decodeMeshopt3D(source: Uint8Array, count: number, stride: number, mode: MeshoptMode3D, filter?: MeshoptFilter3D): Uint8Array;
//# sourceMappingURL=Meshopt3D.d.ts.map