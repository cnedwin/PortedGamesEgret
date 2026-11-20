// Canvas textures are leased once by the game and tinted by its particle emitters.
function surface(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, context: canvas.getContext('2d', { willReadFrequently: true }) };
}

function mist(context, x, y, radius, strength) {
  const glow = context.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, 'rgba(255,255,255,' + strength + ')');
  glow.addColorStop(0.42, 'rgba(255,255,255,' + strength * 0.62 + ')');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = glow;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function shard(context, points, fill) {
  context.beginPath();
  context.moveTo(...points[0]);
  for (const point of points.slice(1)) context.lineTo(...point);
  context.closePath();
  context.fillStyle = fill;
  context.fill();
}

export function paintDot(size = 32) {
  const { canvas, context } = surface(size, size);
  mist(context, size / 2, size / 2, size / 2, 1);
  return canvas;
}

export function paintDust() {
  const { canvas, context } = surface(48, 48);
  for (const [x, y, radius, alpha] of [[26, 26, 19, 0.33], [17, 22, 13, 0.42], [26, 19, 15, 0.29],
    [30, 26, 13, 0.61], [16, 33, 11, 0.44], [36, 32, 7, 0.51], [34, 17, 9, 0.30]]) {
    mist(context, x, y, radius, alpha);
  }
  return canvas;
}

export function paintSplinter() {
  const { canvas, context } = surface(32, 32);
  shard(context, [[2, 19], [12, 12], [25, 9], [30, 12], [24, 18], [17, 20], [9, 24]], '#b8b8b8');
  shard(context, [[2, 19], [12, 12], [25, 9], [30, 12], [20, 13], [11, 18]], '#fff');
  shard(context, [[8, 23], [16, 19], [24, 18], [25, 20], [13, 22]], '#737373');
  return canvas;
}

export function paintSpark() {
  const { canvas, context } = surface(32, 32);
  mist(context, 16, 16, 15, 0.6);
  shard(context, [[16, 2], [18, 13], [26, 16], [18, 19], [16, 30], [14, 19], [6, 16], [14, 13]], 'rgba(255,255,255,.95)');
  mist(context, 16, 16, 5, 1);
  return canvas;
}

export function paintThunder() {
  const { canvas, context } = surface(40, 40);
  mist(context, 19, 19, 20, 0.84);
  shard(context, [[21, 4], [10, 22], [20, 19], [15, 36], [31, 15], [20, 18]], 'rgba(255,255,255,.83)');
  return canvas;
}

/** Two soft lights in one texture, for a sealed lock and a released lock. */
export function paintLockLights() {
  const { canvas, context } = surface(128, 64);
  for (const [index, color] of ['112,206,172', '255,191,94'].entries()) {
    const x = 32 + 64 * index;
    const glow = context.createRadialGradient(x, 32, 2, x, 32, 30);
    glow.addColorStop(0, 'rgba(' + color + ',0.48)');
    glow.addColorStop(0.52, 'rgba(' + color + ',0.19)');
    glow.addColorStop(1, 'rgba(' + color + ',0)');
    context.fillStyle = glow;
    context.fillRect(index * 64, 0, 64, 64);
  }
  return canvas;
}

// Glyph frames follow the shape accepted by Egret's bitmap-font importer.
export const FONT_CHARACTERS = '0123456789+×/:-连击星分第关';

export function paintScoreFont() {
  const size = 40,
    cell = 52,
    columns = 8,
    rows = Math.ceil(FONT_CHARACTERS.length / columns),
    { canvas, context } = surface(columns * cell, rows * cell),
    frames = {};
  context.font = '700 ' + size + 'px "Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", serif';
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
    gold.addColorStop(0, '#fff3d8');
    gold.addColorStop(0.32, '#ffe5a6');
    gold.addColorStop(0.56, '#e7b766');
    gold.addColorStop(0.61, '#d59e55');
    gold.addColorStop(1, '#a46136');
    context.lineWidth = 5.5;
    context.strokeStyle = '#1b1815';
    context.strokeText(character, left, baseline);
    context.fillStyle = gold;
    context.fillText(character, left, baseline);
    frames[character] = { x: left - 3, y: y + 2, w: advance + 6, h: cell - 4, offX: 0, offY: 0, sourceW: advance + 1, sourceH: cell - 4 };
  }
  return { canvas, font: { file: 'score.png', frames } };
}
