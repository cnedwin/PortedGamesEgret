/** First-party extraction: preserve rectangle NDC rounding and measured backing displacement. */
export function packedPosition2D(point, width, height, previousMax) {
    const x = Math.fround(2 * point.x / width - 1), y = Math.fround(1 - 2 * point.y / height);
    if (!Number.isFinite(x) || !Number.isFinite(y))
        return undefined;
    const maxBackingDisplacement = Math.max(previousMax, Math.abs((x + 1) * width / 2 - point.x), Math.abs((1 - y) * height / 2 - point.y));
    return { x, y, maxBackingDisplacement };
}
