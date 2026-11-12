import type { PreparedPoint2D } from './prepareRectangles2D.js';
/** First-party extraction: preserve rectangle NDC rounding and measured backing displacement. */
export declare function packedPosition2D(point: PreparedPoint2D, width: number, height: number, previousMax: number): {
    readonly x: number;
    readonly y: number;
    readonly maxBackingDisplacement: number;
} | undefined;
//# sourceMappingURL=packedPosition2D.d.ts.map