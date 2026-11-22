import { Geometry3D } from './Geometry3D.js';
import { Object3D } from './Object3D.js';
/** How a model is written. */
export interface GlbExportOptions3D {
    /** The name of the root node; that of the object, or 'model', unless given. */
    readonly name?: string;
}
/**
 * The model as the bytes of a .glb file: a geometry alone (with a plain material that shows its vertex colours), or an
 * object and everything under it. Meshes that draw lines or points are left out.
 */
export declare function exportGlb3D(source: Geometry3D | Object3D, options?: GlbExportOptions3D): Uint8Array;
//# sourceMappingURL=Export3D.d.ts.map