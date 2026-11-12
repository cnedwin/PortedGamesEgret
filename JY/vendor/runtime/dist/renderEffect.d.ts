import type { Rectangle2D } from '@egret/contracts';
import type { Bitmap } from './Bitmap.js';
import type { DisplayObject } from './DisplayObject.js';
/** Render-only subtree effect. The mask borrows its Bitmap's existing texture lease.
 * maskRect is in the affected node's local coordinates; mask display transforms
 * and opacity do not apply. The mask is not removed from its own display tree. */
export interface RenderEffect2D {
    readonly blurRadius?: number;
    readonly alphaMask?: Bitmap;
    readonly maskRect?: Rectangle2D;
}
export declare function setRenderEffect(node: DisplayObject, input: RenderEffect2D | undefined): void;
//# sourceMappingURL=renderEffect.d.ts.map