import { Geometry3D } from './Geometry3D.js';
import type { ColorInput3D } from './Material3D.js';
type Vec3 = readonly [number, number, number];
/** Where a shape goes and how it looks: moved by `at`, turned by `rotation`, scaled by `scale`, painted `color`. */
export interface SdfOptions3D {
    /** Where the shape's centre goes; [0, 0, 0] by default. */
    readonly at?: Vec3;
    /** Euler angles in radians, in the order of `quatFromEuler`. */
    readonly rotation?: Vec3;
    /** One factor for all three axes. A field stays a distance only when scaled the same way on every axis. */
    readonly scale?: number;
    /** A hex colour as seen on screen, or linear RGB. A shape without one takes the colour of the group it is in. */
    readonly color?: ColorInput3D;
}
/** A group of shapes: `smooth` is how far, in the model's units, the blend between them reaches. */
export interface SdfGroupOptions3D extends SdfOptions3D {
    /** 0 joins shapes with a crease; 0.05 to 0.2 of a part's size reads as one soft body. */
    readonly smooth?: number;
}
/** A shape as a signed distance field: negative inside, positive outside, zero on the surface. */
export declare abstract class SdfShape3D {
    #private;
    /** The box the shape lies in, as [minX, minY, minZ, maxX, maxY, maxZ]. */
    readonly bounds: readonly [number, number, number, number, number, number];
    /** @internal */
    readonly paint: Float32Array | undefined;
    /** @internal */
    constructor(options: SdfOptions3D | undefined, local: readonly number[]);
    /** How far the point is from the surface: negative inside. */
    distance(x: number, y: number, z: number): number;
    /** @internal The linear colour of the shape at a point, written to `out`; `inherited` when it has none. */
    colorAt(x: number, y: number, z: number, out: Float32Array, inherited: Float32Array): void;
    /** @internal */
    protected abstract local(x: number, y: number, z: number): number;
    /** @internal */
    protected localColor(_x: number, _y: number, _z: number, out: Float32Array, paint: Float32Array): void;
}
/** A ball of `radius`. */
export declare function sdfSphere(radius: number, options?: SdfOptions3D): SdfShape3D;
/** A box of `size` [width, height, depth], its edges rounded by `round` (0 for sharp; more than half the smallest side is taken as that). */
export declare function sdfBox(size: Vec3, options?: SdfOptions3D & {
    readonly round?: number;
}): SdfShape3D;
/** A stretched ball with `radii` [x, y, z]: heads, bodies, eggs and stones. */
export declare function sdfEllipsoid(radii: Vec3, options?: SdfOptions3D): SdfShape3D;
/**
 * A rounded limb from `from` to `to`: `radius` thick at the start, `radiusEnd` (the same unless given) at the end.
 * Arms, legs, necks, tails, branches and horns.
 */
export declare function sdfCapsule(from: Vec3, to: Vec3, radius: number, options?: SdfOptions3D & {
    readonly radiusEnd?: number;
}): SdfShape3D;
/** An upright cylinder of `radius` and `height` along y, its rims rounded by `round` (at most the radius or half the height). */
export declare function sdfCylinder(radius: number, height: number, options?: SdfOptions3D & {
    readonly round?: number;
}): SdfShape3D;
/** An upright cone of `height` along y, `bottom` wide at its foot and `top` (0 for a point) at its head. */
export declare function sdfCone(bottom: number, top: number, height: number, options?: SdfOptions3D): SdfShape3D;
/** A ring lying flat: `radius` to the middle of the tube, `tube` the tube's radius. */
export declare function sdfTorus(radius: number, tube: number, options?: SdfOptions3D): SdfShape3D;
/**
 * A shape turned about the y axis from its `profile`: points [radius, height] going round a closed outline, as a
 * potter draws half a vase. Vases, bottles, pillars, bells, towers, lamp posts, chess pieces.
 */
export declare function sdfLathe(profile: readonly (readonly [number, number])[], options?: SdfOptions3D & {
    readonly round?: number;
}): SdfShape3D;
/**
 * A flat `outline` of points [x, y] in the xy plane, closed, pushed `depth` deep along z about its middle, its
 * edges rounded by `round`: signs, gables, blades, stars, letters, tiles, cut-out shapes.
 */
export declare function sdfExtrude(outline: readonly (readonly [number, number])[], depth: number, options?: SdfOptions3D & {
    readonly round?: number;
}): SdfShape3D;
/** The shapes joined into one; with `smooth`, blended where they meet. */
export declare function sdfUnion(items: SdfShape3D | readonly SdfShape3D[], options?: SdfGroupOptions3D): SdfShape3D;
/**
 * `base` with `cut` taken away; with `smooth`, the edges of the hollow rounded. A cut that has a colour paints the
 * faces it leaves, as the inside of a mouth or a window.
 */
export declare function sdfSubtract(base: SdfShape3D, cut: SdfShape3D | readonly SdfShape3D[], options?: SdfGroupOptions3D): SdfShape3D;
/**
 * What the shapes have in common; with `smooth`, its edges rounded. The shapes with a colour paint it, cut faces
 * included; a shape without one only cuts.
 */
export declare function sdfIntersect(items: readonly SdfShape3D[], options?: SdfGroupOptions3D): SdfShape3D;
/**
 * The shape and its mirror image across the plane through the origin square to `axis` ('x' unless given): make one
 * eye, ear, arm or leg on the positive side and get the pair.
 */
export declare function sdfMirror(shape: SdfShape3D, options?: SdfOptions3D & {
    readonly axis?: 'x' | 'y' | 'z';
}): SdfShape3D;
/** The shape grown by `radius` all round, its edges rounded by as much. */
export declare function sdfRound(shape: SdfShape3D, radius: number, options?: SdfOptions3D): SdfShape3D;
/** A hollow skin of the shape, `thickness` thick: bowls, pots, helmets, when cut open. */
export declare function sdfShell(shape: SdfShape3D, thickness: number, options?: SdfOptions3D): SdfShape3D;
/** What `sdfDisplace` does: how far, how fine and which noise. */
export interface SdfDisplaceOptions3D {
    /** How far the surface moves in and out, in the model's units. */
    readonly amount: number;
    /** How many bumps per unit; 4 unless given. */
    readonly frequency?: number;
    /** Which noise: the same seed gives the same bumps. 0 unless given. */
    readonly seed?: number;
}
/** The surface pushed in and out by smooth noise: rocks, bark, rough earth, a lumpy creature. */
export declare function sdfDisplace(shape: SdfShape3D, options: SdfDisplaceOptions3D): SdfShape3D;
/** A pattern painted over a shape's colours. */
export interface SdfPatternOptions3D {
    /**
     * 'spots' (a coat, a toadstool, lichen), 'stripes' (a tiger, a bee, planks, layers of rock), 'noise' (patches of
     * moss, dirt, wear, a mottled skin) or 'gradient' (darker feet, a sunset belly, moss creeping up a wall).
     */
    readonly kind: 'spots' | 'stripes' | 'noise' | 'gradient';
    /** The colour painted. */
    readonly color: ColorInput3D;
    /** How many spots, stripes or patches per unit; 4 unless given. Not used by 'gradient'. */
    readonly frequency?: number;
    /** How much of the colour at most, 0 to 1; 1 unless given. */
    readonly amount?: number;
    /** Stripes run across this axis and a gradient along it; 'y' unless given. */
    readonly axis?: 'x' | 'y' | 'z';
    /** Spots: their size, 0 to 1 of the space between them (0.35 unless given). Stripes: the share painted (0.5). */
    readonly size?: number;
    /** Gradient: where along `axis` the colour is absent and where it is whole; the shape's extent unless given. */
    readonly from?: number;
    readonly to?: number;
    /** Which noise or which spots: the same seed gives the same pattern. 0 unless given. */
    readonly seed?: number;
}
/**
 * `shape` with a pattern painted over its colours, in the coordinates of the model; the surface does not move. The
 * pattern is written into vertex colours, so it is as fine as the mesh: keep `frequency` at a few per unit.
 */
export declare function sdfPattern(shape: SdfShape3D, options: SdfPatternOptions3D): SdfShape3D;
/** How a field becomes a mesh. */
export interface SdfMeshOptions3D {
    /** Cells along the longest side of the model: 64 unless given, from 8 to 192. More is finer and slower. */
    readonly resolution?: number;
    /** How dark creases and hollows get, from 0 (no shading baked) to 1; 0.7 unless given. */
    readonly occlusion?: number;
    /** How far, in the model's units, a hollow is looked into for that shade; a tenth of the model's size unless given. */
    readonly occlusionRadius?: number;
    /** Uneven colour, so a large part is not one flat tone: `amount` 0 to 1 of brightness, `frequency` per unit. */
    readonly variation?: {
        readonly amount: number;
        readonly frequency?: number;
        readonly seed?: number;
    };
    /** The colour of shapes that have none; white unless given. */
    readonly color?: ColorInput3D;
    /**
     * At most this many triangles: the mesh is simplified to it with `simplifyGeometry3D`. 8000 unless given, enough for a
     * prop or a character seen close in a game; 0 keeps every triangle the grid gives.
     */
    readonly triangles?: number;
    /**
     * Light caught on the outer edges, as on worn wood, chipped paint or polished stone: `amount` 0 to 1 of the way to
     * `color` (a lighter shade of each part unless given). Off unless given.
     */
    readonly edges?: {
        readonly amount: number;
        readonly color?: ColorInput3D;
    };
    /**
     * Hard surfaces: corners and edges kept sharp, as on crates, walls, roofs, weapons and machines, instead of rounded
     * to the grid. Each vertex is placed where the planes of the surface around it meet (dual contouring), and the
     * normals are split where faces meet at more than an angle, so an edge shades as an edge. `true` splits at 40
     * degrees; a number gives the angle. Off unless given: soft creatures and plants look better without it.
     */
    readonly sharp?: boolean | number;
}
/**
 * The mesh of the field's surface, with smooth normals and linear vertex colours (draw it with a material that has
 * `vertexColors: true`). Made once, when a level or a model is set up: at the default resolution a model takes a few
 * tens of milliseconds.
 */
export declare function createSdfGeometry3D(shape: SdfShape3D, options?: SdfMeshOptions3D): Geometry3D;
export {};
//# sourceMappingURL=Sdf3D.d.ts.map