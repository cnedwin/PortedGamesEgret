import type { ImageData2D, RenderFrame2D, TexturedRenderFrame2D, TextureRegion2D } from '@egret/contracts';
export declare class ImageProjectionError extends Error {
    readonly reason: 'budget' | 'invalid';
    constructor(reason: 'budget' | 'invalid');
}
export interface ProjectionView2D {
    readonly image: ImageData2D;
    readonly region: TextureRegion2D;
    readonly byteLength: number;
}
export interface ProjectionPlan2D {
    readonly views: readonly ProjectionView2D[];
    readonly commandViews: readonly (number | undefined)[];
    readonly projectionBytes: number;
    readonly scratchBytes: number;
}
/** Legacy facade preserves mode, optional-image timing and exact failure identity. */
export declare function planImageProjections(frame: RenderFrame2D, mode: 'straight' | 'premultiplied', onFailure?: (failure: ImageProjectionError) => void): ProjectionPlan2D;
/** Mesh and image rows share the same identity/crop registry, including empty barriers. */
export declare function planTexturedImageProjections(frame: TexturedRenderFrame2D, onFailure?: (failure: ImageProjectionError) => void): ProjectionPlan2D;
/** Return a standalone tight crop; neither source ownership nor another output is exposed. */
export declare function copyProjectionPixels(view: ProjectionView2D, mode: 'straight' | 'premultiplied'): Uint8Array<ArrayBuffer>;
//# sourceMappingURL=imageProjections2D.d.ts.map