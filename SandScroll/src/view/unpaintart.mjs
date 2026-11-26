// 拆画的画：从手卷里截一段，缩成 200×240 粒，按这一关的颜料取最近的颜色、亮度变成每粒的深浅。画只在进关时取一次。
// The picture to unpaint: a part of a scroll, scaled to 200 × 240 grains, each pixel given the nearest of the level's
// pigments and its brightness kept as the grain's shade. Made once as a level opens.
import { BOARD, PIGMENTS } from '../sim/sand.mjs';
import { PICTURE_TOP, UNPAINT_LEVELS, quantize } from '../sim/unpaint.mjs';
import { paintScroll } from './scroll.mjs';

/** The grains of level `index`'s picture: { color, tone } of 200 × 240. */
export function unpaintPicture(index) {
  const level = UNPAINT_LEVELS[index],
    width = BOARD.cols,
    height = BOARD.rows - PICTURE_TOP,
    [cx, cy, cw, ch] = level.crop,
    // Painted at twice the size and scaled down, so each grain is the average of the strokes under it.
    // The painting without its silk: where little is painted the pixels are clear, and those stay empty.
    painting = paintScroll(level.painting, true, { width: 1920, height: 480, bare: true }),
    canvas = Object.assign(document.createElement('canvas'), { width, height }),
    g = canvas.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';
  g.drawImage(painting, cx * 2, cy * 2, cw * 2, ch * 2, 0, 0, width, height);
  const pixels = g.getImageData(0, 0, width, height).data;
  return quantize(pixels, width, height, level.pigments, PIGMENTS);
}
