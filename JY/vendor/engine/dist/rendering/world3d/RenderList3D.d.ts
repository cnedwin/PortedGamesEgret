import type { Camera3D } from './Camera3D.js';
import type { Geometry3D } from './Geometry3D.js';
import { Light3D } from './Light3D.js';
import type { Material3D } from './Material3D.js';
import { Mesh3D } from './Mesh3D.js';
import type { Object3D, Scene3D } from './Object3D.js';
/** One thing to draw: its mesh, geometry and material, its range, its depth and order. */
export interface RenderItem3D {
    mesh: Mesh3D;
    geometry: Geometry3D;
    material: Material3D;
    /** First index (or vertex) and count of the range to draw. */
    start: number;
    count: number;
    /** View-space distance along the camera axis; larger is farther. */
    depth: number;
    /** Drawn before blended items, and the mesh's render order: kept on the item so sorting need not look them up. */
    opaque?: boolean;
    order?: number;
    /** What else must match for meshes to share an instanced draw: layers, receiving shadows, being instanceable at all. */
    group?: number;
}
/** What building a render list counted: nodes visited, culled, and lights dropped. */
export interface RenderStats3D {
    visited: number;
    culled: number;
    /** Point and spot lights past the renderer's limits that the last build left out. */
    lightsDropped: number;
}
/** What a camera sees, sorted for drawing: opaque and transparent items, shadow casters and lights. */
export declare class RenderList3D {
    #private;
    readonly opaque: RenderItem3D[];
    readonly transparent: RenderItem3D[];
    /** Visible-to-light meshes; shadow passes cull these against each light volume. */
    readonly shadowCasters: Mesh3D[];
    readonly directionalLights: Light3D[];
    readonly pointLights: Light3D[];
    readonly spotLights: Light3D[];
    /**
     * Point lights past the eight a frame lights directly, nearest first: they are lit through the tiled light
     * list instead, each only where its range reaches. Lights with no range are not among them.
     */
    readonly tiledPointLights: Light3D[];
    /** Whether lights past the eight go to the tiled list (the renderer sets this) or are dropped. */
    tiledLights: boolean;
    /** Summed ambient radiance, plus hemisphere sky and ground radiance. */
    readonly ambient: Float32Array<ArrayBuffer>;
    readonly hemisphereSky: Float32Array<ArrayBuffer>;
    readonly hemisphereGround: Float32Array<ArrayBuffer>;
    readonly stats: RenderStats3D;
    /**
     * Runs of at least this many plain meshes with the same geometry and
     * material are drawn as one instanced draw; shadow casters are grouped the
     * same way. 0 draws every mesh on its own.
     */
    autoInstanceThreshold: number;
    /** How many instanced draws automatic instancing made in the last build, and how many meshes they stand for. */
    readonly instancing: {
        batches: number;
        meshes: number;
    };
    /** Monotonic frame id, used to update each skeleton once per frame. */
    get frame(): number;
    build(scene: Scene3D, camera: Camera3D, filter?: {
        readonly layerMask: number;
        readonly hidden: readonly Object3D[];
    }): void;
    /** Copy the sorted opaque items out, replacing each long enough run of like meshes with one instanced item. */
    private fold;
    /** Shadow casters that share a geometry and a material are drawn into the shadow maps as one instanced mesh. */
    private groupCasters;
    /** The instanced stand-in for a run of meshes, with their world matrices as its instances. */
    private batch;
    /** Forget stand-ins that have not been used for a while. */
    private retire;
    private visit;
    private addLight;
    /**
     * Keeps at most `limit` of the lights found, the ones that matter most to the camera: a light whose range
     * reaches the camera before one that does not, then the brightest at the camera's distance. A light that
     * casts a shadow counts as reaching. Kept lights stay in scene order, so a frame with no more lights than
     * the limit is unchanged.
     */
    private keepLights;
    private addMesh;
    private push;
    /** Drop pooled references so retired scene content can be collected. */
    clear(): void;
}
//# sourceMappingURL=RenderList3D.d.ts.map