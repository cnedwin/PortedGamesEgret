import type { Camera3D } from './Camera3D.js';
import type { Geometry3D } from './Geometry3D.js';
import { Light3D } from './Light3D.js';
import type { Material3D } from './Material3D.js';
import { Mesh3D } from './Mesh3D.js';
import type { Scene3D } from './Object3D.js';
export interface RenderItem3D {
    mesh: Mesh3D;
    geometry: Geometry3D;
    material: Material3D;
    /** First index (or vertex) and count of the range to draw. */
    start: number;
    count: number;
    /** View-space distance along the camera axis; larger is farther. */
    depth: number;
}
export interface RenderStats3D {
    visited: number;
    culled: number;
}
export declare class RenderList3D {
    #private;
    readonly opaque: RenderItem3D[];
    readonly transparent: RenderItem3D[];
    /** Visible-to-light meshes; shadow passes cull these against each light volume. */
    readonly shadowCasters: Mesh3D[];
    readonly directionalLights: Light3D[];
    readonly pointLights: Light3D[];
    readonly spotLights: Light3D[];
    /** Summed ambient radiance, plus hemisphere sky and ground radiance. */
    readonly ambient: Float32Array<ArrayBuffer>;
    readonly hemisphereSky: Float32Array<ArrayBuffer>;
    readonly hemisphereGround: Float32Array<ArrayBuffer>;
    readonly stats: RenderStats3D;
    /** Monotonic frame id, used to update each skeleton once per frame. */
    get frame(): number;
    build(scene: Scene3D, camera: Camera3D): void;
    private visit;
    private addLight;
    private addMesh;
    private push;
    /** Drop pooled references so retired scene content can be collected. */
    clear(): void;
}
//# sourceMappingURL=RenderList3D.d.ts.map