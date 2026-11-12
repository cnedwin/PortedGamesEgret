import type { RenderFrame2D } from '@egret/contracts';
import type { PreparedRectangles2D, RectanglePreparationOptions } from './prepareRectangles2D.js';
import type { PreparedImage2D } from './prepareImages2D.js';
import type { PreparedCacheContext2D, PreparedCacheSlot2D } from './preparedFrameCache2D.js';
export type PreparedMixedDraw2D = {
    readonly kind: 'rect';
    readonly prepared: PreparedRectangles2D;
    readonly commandIndices: readonly number[];
    readonly cacheSlot?: PreparedCacheSlot2D;
} | {
    readonly kind: 'image';
    readonly prepared: PreparedImage2D;
    readonly commandIndex: number;
    readonly cacheSlot?: PreparedCacheSlot2D;
};
/** Consume a trusted copied frame; runs preserve painter order and share preparation caps. */
export declare function prepareMixedDraws2D(frame: RenderFrame2D, width: number, height: number, options: RectanglePreparationOptions, cache?: PreparedCacheContext2D): readonly PreparedMixedDraw2D[];
//# sourceMappingURL=prepareMixedDraws2D.d.ts.map