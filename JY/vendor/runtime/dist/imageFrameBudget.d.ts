import type { ImageData2D, TextureRegion2D } from "@egret/contracts";
/** Per-capture identity ledger: payload and cropped-view charges are independent. */
export declare class CaptureImageBudget {
    private readonly images;
    private readonly entries;
    private tableBytes;
    private viewCount;
    private projectionBytes;
    constructor();
    register(image: ImageData2D, region: TextureRegion2D): number;
    finish(): readonly ImageData2D[] | undefined;
}
//# sourceMappingURL=imageFrameBudget.d.ts.map