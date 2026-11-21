import { Resource3D } from './core3D.js';
/** An array of vertex data. */
export type AttributeArray3D = Float32Array | Uint32Array | Uint16Array | Uint8Array | Int16Array | Int8Array;
/** How a geometry's vertices are joined: as triangles, lines, a strip of lines, or points. */
export type Topology3D = 'triangles' | 'lines' | 'line-strip' | 'points';
/** The most vertices, indices, morph targets and groups a geometry has. */
export declare const GEOMETRY3D_LIMITS: Readonly<{
    readonly maxVertices: 4194304;
    readonly maxIndices: 12582912;
    readonly maxMorphTargets: 256;
    readonly maxGroups: 1024;
}>;
/** Well-known attribute names understood by the built-in materials. */
export declare const ATTRIBUTE_3D: Readonly<{
    readonly position: 'position';
    readonly normal: 'normal';
    readonly tangent: 'tangent';
    readonly uv: 'uv';
    readonly uv1: 'uv1';
    readonly color: 'color';
    readonly joints: 'joints';
    readonly weights: 'weights';
}>;
/** One attribute of a geometry, such as positions: its data, how many numbers each vertex has, and whether they are normalized. */
export declare class Attribute3D {
    #private;
    readonly data: AttributeArray3D;
    readonly itemSize: number;
    /** Integer data is mapped to [0, 1] or [-1, 1] when sampled as float. */
    readonly normalized: boolean;
    /** Hint that data changes often, so the backend picks a streaming buffer. */
    dynamic: boolean;
    constructor(data: AttributeArray3D, itemSize: number, normalized?: boolean);
    get count(): number;
    get version(): number;
    touch(): void;
}
/** A range of a geometry's indices drawn with one of its mesh's materials. */
export interface GeometryGroup3D {
    readonly start: number;
    readonly count: number;
    readonly materialIndex: number;
}
/** A morph target: the positions, and normals, it moves a geometry toward. */
export interface MorphTarget3D {
    readonly name: string;
    /** Per-vertex deltas relative to the base attribute. */
    readonly position?: Float32Array;
    readonly normal?: Float32Array;
}
/** The vertices of a mesh: its attributes and indices, its groups and morph targets, and calls that compute normals and tangents. */
export declare class Geometry3D extends Resource3D {
    #private;
    topology: Topology3D;
    get attributes(): ReadonlyMap<string, Attribute3D>;
    get index(): Attribute3D | undefined;
    get groups(): readonly GeometryGroup3D[];
    get morphTargets(): readonly MorphTarget3D[];
    get layoutVersion(): number;
    get vertexCount(): number;
    /** Number of indices, or vertices when the geometry is not indexed. */
    get drawCount(): number;
    setAttribute(name: string, attribute: Attribute3D): this;
    getAttribute(name: string): Attribute3D | undefined;
    removeAttribute(name: string): this;
    setIndex(index: Uint16Array | Uint32Array | readonly number[] | undefined): this;
    /** Assign a material slot to an index (or vertex) range. */
    addGroup(start: number, count: number, materialIndex?: number): this;
    clearGroups(): this;
    setMorphTargets(targets: readonly MorphTarget3D[]): this;
    /** Local-space [minX, minY, minZ, maxX, maxY, maxZ], cached until positions change. */
    get boundingBox(): Float32Array;
    /** Local-space [x, y, z, radius]; radius is negative for an empty geometry. */
    get boundingSphere(): Float32Array;
    /** Counts `invalidateBounds` calls: what a mesh's world bounds are kept by, beside the structure version. */
    get boundsVersion(): number;
    /** Call after editing position data in place. Meshes of this geometry find their world bounds again. */
    invalidateBounds(): void;
    /** Area-weighted smooth normals for triangle geometry. */
    computeNormals(): this;
    /** Per-vertex tangents (xyz + handedness) from positions, normals and UVs. */
    computeTangents(): this;
}
/** A geometry to make: its positions, and its normals, texture coordinates, colors and indices where given. */
export interface GeometryInput3D {
    readonly positions: ArrayLike<number>;
    readonly normals?: ArrayLike<number>;
    readonly uvs?: ArrayLike<number>;
    readonly colors?: ArrayLike<number>;
    readonly indices?: ArrayLike<number>;
    readonly topology?: Topology3D;
}
/** Build a geometry from plain arrays; missing normals are computed for triangles. */
export declare function createGeometry3D(input: GeometryInput3D): Geometry3D;
//# sourceMappingURL=Geometry3D.d.ts.map