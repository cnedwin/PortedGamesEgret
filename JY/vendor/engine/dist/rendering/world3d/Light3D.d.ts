import type { ColorInput3D } from './Material3D.js';
import { Object3D } from './Object3D.js';
/** The kind of a light: ambient, hemisphere, directional, point or spot. */
export type LightType3D = 'ambient' | 'hemisphere' | 'directional' | 'point' | 'spot';
/** The most directional, point, tiled point and spot lights a scene lights, and the most shadows. */
export declare const LIGHT3D_LIMITS: Readonly<{
    readonly maxDirectional: 4;
    readonly maxPoint: 8;
    /** Point lights with a range lit through the tiled list, beyond the eight lit directly. */
    readonly maxTiledPoint: 256;
    readonly maxSpot: 4;
    readonly maxShadows: 4;
}>;
/** How a light casts shadows: its map size, biases, range, extent, softness and cascades. */
export interface LightShadow3D {
    /** Edge of this light's square tile in the shared shadow atlas, in texels. */
    mapSize: number;
    /** Constant depth offset against shadow acne. */
    bias: number;
    /** Offset along the surface normal, in world units. */
    normalBias: number;
    near: number;
    far: number;
    /** Half extent of the orthographic volume used by directional lights. */
    extent: number;
    /** Percentage-closer filter radius in texels; 0 samples once. */
    radius: number;
    /**
     * Number of cascades for a directional light, 1 to 4. Each cascade takes
     * one atlas tile and follows the camera, so `extent` is ignored above 1.
     * Only the first cascaded directional light in a scene is split.
     */
    cascades: number;
    /** Distance from the camera, in world units, that cascaded shadows cover. */
    cascadeDistance: number;
    /** Split distribution: 0 spaces cascades evenly, 1 logarithmically. */
    cascadeLambda: number;
}
/** A light to make: its color and intensity, and whether it casts shadows. */
export interface LightOptions3D {
    readonly color?: ColorInput3D;
    readonly intensity?: number;
    readonly castShadow?: boolean;
}
/** A point light to make: how far it reaches. */
export interface PointLightOptions3D extends LightOptions3D {
    /** Distance at which the light fades to zero; 0 means unbounded inverse-square falloff. */
    readonly range?: number;
}
/** A spot light to make: its cone's angle and soft edge. */
export interface SpotLightOptions3D extends PointLightOptions3D {
    /** Half angle of the cone in radians. */
    readonly angle?: number;
    /** Fraction of the cone over which intensity falls off, in [0, 1]. */
    readonly penumbra?: number;
}
/** A light in a scene: its kind and its shadow. */
export declare class Light3D extends Object3D {
    readonly lightType: LightType3D;
    readonly color: Float32Array<ArrayBuffer>;
    intensity: number;
    /** Lower hemisphere color for hemisphere lights. */
    readonly groundColor: Float32Array<ArrayBuffer>;
    range: number;
    angle: number;
    penumbra: number;
    readonly shadow: LightShadow3D;
    constructor(lightType?: LightType3D);
    clone(recursive?: boolean): this;
    protected copyFrom(source: this): void;
}
/** Uniform light from every direction. */
export declare function createAmbientLight3D(options?: LightOptions3D): Light3D;
/** Sky color from above blending to a ground color from below (world Y axis). */
export declare function createHemisphereLight3D(options?: LightOptions3D & {
    readonly groundColor?: ColorInput3D;
}): Light3D;
/** Parallel rays, such as sunlight. Aim it with lookAt(). */
export declare function createDirectionalLight3D(options?: LightOptions3D): Light3D;
/** Makes a light that shines from a point in every direction. */
export declare function createPointLight3D(options?: PointLightOptions3D): Light3D;
/** Makes a light that shines from a point in a cone. */
export declare function createSpotLight3D(options?: SpotLightOptions3D): Light3D;
//# sourceMappingURL=Light3D.d.ts.map