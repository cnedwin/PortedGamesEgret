import type { ImageData2D, TextureRegion2D } from '@egret/contracts';
/** Per-copy ledger; authentic table identities and unique crops charge separately. */
export declare class MixedImageBudget {
    private readonly views;
    private tableBytes;
    private viewCount;
    private projectionBytes;
    constructor();
    registerTable(images: readonly ImageData2D[]): void;
    registerView(image: ImageData2D, region: TextureRegion2D): void;
}
//# sourceMappingURL=imageFrameBudget.d.ts.map