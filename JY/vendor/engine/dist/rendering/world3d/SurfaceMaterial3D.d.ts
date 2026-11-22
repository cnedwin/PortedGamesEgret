import type { Material3D, StandardMaterialOptions3D } from './Material3D.js';
/** The surfaces the shader can draw. */
export type SurfaceKind3D = 'wood' | 'stone' | 'brick' | 'plaster' | 'metal' | 'cloth' | 'bark';
/** A material with a surface: the standard material's options and how the surface looks. */
export interface SurfaceMaterialOptions3D extends StandardMaterialOptions3D {
    readonly surface: SurfaceKind3D;
    /** How many of the pattern's units fit in one world unit; each surface has its own unless given. */
    readonly scale?: number;
    /** How much the pattern darkens and lightens the colour, 0 to 1; 0.5 unless given. */
    readonly strength?: number;
    /** How deep the relief looks under light, 0 to 1; 0.5 unless given. */
    readonly bump?: number;
}
/** The shader sources of a surface: its height, the colour it gives and the relief it gives, in GLSL and WGSL. */
export declare function surfaceShaderSources3D(kind: SurfaceKind3D): {
    glsl: string;
    wgsl: string;
    glslNormal: string;
    wgslNormal: string;
};
/**
 * A standard material with a surface drawn by the shader, over its colour or its vertex colours (on unless
 * `vertexColors: false`): `createSurfaceMaterial3D({ surface: 'wood' })` for a crate made in code.
 */
export declare function createSurfaceMaterial3D(options: SurfaceMaterialOptions3D): Material3D;
//# sourceMappingURL=SurfaceMaterial3D.d.ts.map