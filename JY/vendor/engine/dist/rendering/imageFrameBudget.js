import { IMAGE_LIMITS_2D } from '@egret/contracts';
import { FrameCopyError } from './copyFrame2D.js';
function bounded(value, limit) {
    if (!Number.isSafeInteger(value) || value < 0 || value > limit)
        throw new FrameCopyError('budget');
    return value;
}
/** Per-copy ledger; authentic table identities and unique crops charge separately. */
export class MixedImageBudget {
    views = new Map();
    tableBytes = 0;
    viewCount = 0;
    projectionBytes = 0;
    constructor() { }
    registerTable(images) {
        bounded(images.length, IMAGE_LIMITS_2D.maxImagesPerFrame);
        // The caller authenticated every admitted table entry before payload accounting.
        for (const image of images) {
            if (!this.views.has(image)) {
                this.tableBytes = bounded(this.tableBytes + image.byteLength, IMAGE_LIMITS_2D.maxImageTableBytes);
                this.views.set(image, new Set());
            }
        }
    }
    registerView(image, region) {
        const views = this.views.get(image);
        if (views === undefined)
            throw new FrameCopyError('invalid');
        const key = `${region.x},${region.y},${region.width},${region.height}`;
        if (!views.has(key)) {
            const bytes = bounded(4 * region.width * region.height, IMAGE_LIMITS_2D.maxProjectionBytes);
            this.viewCount = bounded(this.viewCount + 1, IMAGE_LIMITS_2D.maxViewsPerFrame);
            this.projectionBytes = bounded(this.projectionBytes + bytes, IMAGE_LIMITS_2D.maxProjectionBytes);
            views.add(key);
        }
    }
}
//# sourceMappingURL=imageFrameBudget.js.map