// 由代码画出的图：粒子的光点、木屑、火花，以及计分用的位图字体页。
// Pictures painted by the code at start: the soft dot of a particle, a splinter of wood, a spark, and the
// page of the bitmap font for scores and combos. Each is painted on a canvas of the page; the browser game
// turns a canvas into a leased texture in one step (`game.textureFromCanvas`).

/** A canvas of a size, and its 2D context. */
function surface(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, context: canvas.getContext('2d', { willReadFrequently: true }) };
}

/** A white dot that fades to its edge: each particle tints and fades it. */
export function paintDot(size = 32) {
  const { canvas, context } = surface(size, size),
    glow = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.45, 'rgba(255,255,255,0.75)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, size, size);
  return canvas;
}

/** A splinter: a thin white shard, tinted to wood or stone by the emitter. */
export function paintSplinter() {
  const { canvas, context } = surface(24, 24);
  context.fillStyle = '#fff';
  context.beginPath();
  context.moveTo(2, 13);
  context.lineTo(18, 9);
  context.lineTo(22, 12);
  context.lineTo(6, 16);
  context.closePath();
  context.fill();
  return canvas;
}

/** The characters of the score font: figures, signs and the few words the HUD prints in it. */
export const FONT_CHARACTERS = '0123456789+×/:-连击星分第关';

/**
 * The page of the score font, gold with an ink outline, and the font in the form Egret's texture merger
 * writes: one frame for each character on the page. The glyphs are drawn with the page's own serif face.
 */
export function paintScoreFont() {
  const size = 40,
    cell = 52,
    columns = 8,
    rows = Math.ceil(FONT_CHARACTERS.length / columns),
    { canvas, context } = surface(columns * cell, rows * cell),
    frames = {};
  context.font = `700 ${size}px "Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", serif`;
  context.textBaseline = 'alphabetic';
  context.lineJoin = 'round';
  for (const [index, character] of [...FONT_CHARACTERS].entries()) {
    const x = (index % columns) * cell,
      y = Math.floor(index / columns) * cell,
      metrics = context.measureText(character),
      advance = Math.ceil(metrics.width),
      baseline = y + 42,
      left = x + Math.round((cell - advance) / 2);
    const gold = context.createLinearGradient(0, y + 6, 0, y + 46);
    gold.addColorStop(0, '#fff3c4');
    gold.addColorStop(0.5, '#f0c25a');
    gold.addColorStop(1, '#b0722c');
    context.lineWidth = 6;
    context.strokeStyle = '#1b130d';
    context.strokeText(character, left, baseline);
    context.fillStyle = gold;
    context.fillText(character, left, baseline);
    frames[character] = { x: left - 3, y: y + 2, w: advance + 6, h: cell - 4, offX: 0, offY: 0, sourceW: advance + 1, sourceH: cell - 4 };
  }
  return { canvas, font: { file: 'score.png', frames } };
}
