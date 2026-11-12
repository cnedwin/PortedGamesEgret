import type { PreparedCacheSlot2D } from './preparedFrameCache2D.js';
import type { ImageCommand2D, TextureRegion2D } from '@egret/contracts';
import type { RectanglePreparationOptions, PreparationBudget2D, ClipRectanglePreparationContext2D } from './prepareRectangles2D.js';
export interface ImagePoint2D {
    readonly x: number;
    readonly y: number;
    readonly u: number;
    readonly v: number;
}
export interface PreparedImage2D {
    readonly points: readonly ImagePoint2D[];
    readonly pointIndices: readonly number[];
    readonly imageIndex: number;
    readonly sourceRect: TextureRegion2D;
    readonly alpha: number;
    readonly edgeTests: number;
}
export declare function normalizeImagePolygon(points: readonly ImagePoint2D[], options: RectanglePreparationOptions): {
    readonly points: readonly ImagePoint2D[];
    readonly edgeTests: number;
};
export declare function prepareImage2D(command: ImageCommand2D, width: number, height: number, options: RectanglePreparationOptions, budget?: PreparationBudget2D, cacheSlot?: PreparedCacheSlot2D, containedClipping?: boolean, clipContext?: ClipRectanglePreparationContext2D): PreparedImage2D;
//# sourceMappingURL=prepareImages2D.d.ts.map