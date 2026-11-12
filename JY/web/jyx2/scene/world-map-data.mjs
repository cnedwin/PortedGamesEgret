import { worldSurfaceKind } from './world-layout.mjs';

const waterArt = id => id === 419 || id >= 154 && id <= 181 || id >= 253 && id <= 335 || id >= 508 && id <= 511;
const gritArt = id => id >= 105 && id <= 153 || id === 32 || id === 393;
const snowArt = id => id === 394 || id === 471;
export const worldMist = Object.freeze({ color: 0xaababb, near: 26, far: 65 });

export function createWorldTerrainData(world) {
  const { width, height, layers } = world;
  const length = width * height;
  const biomes = new Uint8Array(length * 4);
  const heights = new Float32Array(length);
  const routes = new Uint8Array(length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const cell = y * width + x, earth = layers.earth[cell] >> 1, surface = layers.surface[cell] >> 1;
    const water = waterArt(earth);
    const edge = earth >= 154 && earth <= 178;
    const detail = worldSurfaceKind(surface);
    const grit = gritArt(earth) || detail === 'dry-crack', snow = snowArt(earth) || detail === 'snow-cover';
    const field = detail === 'field';
    const soil = field ? .76 : earth >= 65 && earth <= 71 ? .94 : earth >= 37 && earth <= 64 ? .67 : .045;
    biomes.set([water ? edge ? 135 : 255 : 0, grit ? 255 : 0, Math.round(soil * 255), snow ? 255 : 0], cell * 4);
    routes[cell] = detail === 'road' ? 1 : 0;
    const folds = Math.sin(x * .086 + y * .075) * Math.cos(y * .102 - x * .083) * .62;
    const ridges = Math.sin(x * .039 + y * .060) * Math.sin(y * .052 - x * .026) * 1.11;
    const land = Math.max(-.10, .68 + folds + ridges + (soil > .3 ? .10 : 0));
    heights[cell] = water ? -.25 : land;
  }
  // Keep paths smooth and let the raised inland surface ease down to water.
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const cell = y * width + x;
    if (biomes[cell * 4]) continue;
    const north = y > 0 && biomes[(cell - width) * 4], south = y + 1 < height && biomes[(cell + width) * 4];
    const west = x > 0 && biomes[(cell - 1) * 4], east = x + 1 < width && biomes[(cell + 1) * 4];
    if (north || south || west || east) heights[cell] = Math.min(.21, heights[cell]);
    else if (routes[cell]) heights[cell] = heights[cell] * .76 + .15;
  }
  const sample = (x, y) => heights[Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))];
  function heightAt(x, y) {
    const left = Math.floor(x), top = Math.floor(y), fx = x - left, fy = y - top;
    const a = sample(left, top), b = sample(left + 1, top), c = sample(left, top + 1), d = sample(left + 1, top + 1);
    return fy <= fx ? a + (b - a) * fx + (d - b) * fy : a + (d - c) * fx + (c - a) * fy;
  }
  return { width, height, biomes, routes, heightAt };
}

export function createWorldPathPixels(data) {
  const { width, height, routes } = data;
  const density = 4;
  const canvas = document.createElement('canvas');
  canvas.width = width * density;
  canvas.height = height * density;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = context.strokeStyle = '#f00';
  context.lineWidth = 1.75;
  context.lineCap = 'round';
  context.beginPath();
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!routes[y * width + x]) continue;
    const px = (x + .5) * density, py = (y + .5) * density;
    context.moveTo(px - .15, py);
    context.lineTo(px + .15, py);
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= width || ny >= height || !routes[ny * width + nx]) continue;
      if (dx && dy && (routes[y * width + nx] || routes[ny * width + x])) continue;
      context.moveTo(px, py);
      context.lineTo(px + dx * density, py + dy * density);
    }
  }
  context.stroke();
  return context.getImageData(0, 0, canvas.width, canvas.height);
}
