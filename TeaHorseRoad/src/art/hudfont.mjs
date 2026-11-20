// 仪表的数字：在画布上画出一套藏红色描黑边的数字和几个符号，写成位图字体的说明交给引擎的 parseBitmapFont，
// 速度表和里程表用 createBitmapText 显示。
// The gauges' figures: saffron digits outlined in ink, and a few signs, painted on a canvas and described as a bitmap
// font for the engine's `parseBitmapFont`; the speedometer and the odometer show them with `createBitmapText`.

const CHARACTERS = '0123456789.:/-+ kmh';

/** Paint the figures at `size` pixels; returns the canvas and the font description. */
export function paintGaugeFont(size = 44) {
  const cell = Math.round(size * 1.25),
    columns = 8,
    rows = Math.ceil(CHARACTERS.length / columns),
    canvas = document.createElement('canvas');
  canvas.width = columns * cell;
  canvas.height = rows * cell;
  const context = canvas.getContext('2d'),
    frames = {};
  context.font = `700 ${size}px "Barlow Condensed", "Roboto Condensed", "Arial Narrow", "Helvetica Neue", sans-serif`;
  context.textBaseline = 'alphabetic';
  context.lineJoin = 'round';
  for (const [index, character] of [...CHARACTERS].entries()) {
    const x = (index % columns) * cell,
      y = Math.floor(index / columns) * cell,
      advance = Math.ceil(character === ' ' ? size * 0.3 : context.measureText(character).width),
      baseline = y + Math.round(size * 1.02),
      left = x + Math.round((cell - advance) / 2);
    if (character !== ' ') {
      const fill = context.createLinearGradient(0, y + size * 0.1, 0, y + size);
      fill.addColorStop(0, '#fff1c8');
      fill.addColorStop(0.55, '#f2b648');
      fill.addColorStop(1, '#c47a22');
      context.lineWidth = Math.max(4, size * 0.13);
      context.strokeStyle = '#121620';
      context.strokeText(character, left, baseline);
      context.fillStyle = fill;
      context.fillText(character, left, baseline);
    }
    frames[character] = { x: left - 3, y: y + 2, w: advance + 6, h: cell - 4, offX: 0, offY: 0, sourceW: advance + 1, sourceH: cell - 4 };
  }
  return { canvas, font: { file: 'gauge.png', frames } };
}
