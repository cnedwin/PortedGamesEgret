import { Texture3D } from '@egret/engine/world3d';

const CELL = 64;
const GUTTER = 8;
const SIZE = CELL * 8;
const PATCH = CELL - GUTTER * 2;
const LAND = ['plains', 'forest', 'mountain', 'beach', 'floor'];
const SIDE = ['turf', 'earth', 'stone', 'bed'];
const ROAD = 24;
const EDGES = [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]];

let atlas;

function paintRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function stipple(ctx, rand, count, ink, largest) {
  ctx.fillStyle = ink;
  for (let i = 0; i < count; i++) {
    const radius = 0.25 + rand() * largest;
    ctx.fillRect(rand() * PATCH, rand() * PATCH, radius * (1 + rand()), radius);
  }
}

function turf(ctx, rand, shaded) {
  for (let i = 0; i < 14; i++) {
    const x = rand() * PATCH, y = rand() * PATCH;
    ctx.fillStyle = i < 8 ? (shaded ? '#77804b32' : '#637f5729') : '#fff8cd55';
    ctx.beginPath();
    ctx.ellipse(x, y, 2 + rand() * 7, 1 + rand() * 3, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 0.65;
  for (let i = 0; i < (shaded ? 22 : 16); i++) {
    const x = rand() * PATCH, y = rand() * PATCH;
    const height = 1.1 + rand() * 2.8;
    ctx.strokeStyle = i % 3 === 0 ? '#fff6c992' : shaded ? '#4d533e59' : '#526f4a60';
    ctx.beginPath();
    ctx.moveTo(x - 1.7, y - height * 0.63);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 0.8, y - height);
    ctx.stroke();
  }
}

function pavers(ctx, rand) {
  ctx.fillStyle = '#a3a19d';
  ctx.fillRect(0, 0, PATCH, PATCH);
  for (let row = 0; row < 6; row++) {
    for (let col = -1; col < 5; col++) {
      const x = col * 12 + (row % 2) * 6;
      const y = row * 8;
      const tone = 213 + Math.floor(rand() * 40);
      ctx.fillStyle = `rgb(${tone + 2}, ${tone}, ${tone - 3})`;
      ctx.fillRect(x + 0.6, y + 0.45, 10.9, 7);
      ctx.fillStyle = '#fffde07a';
      ctx.fillRect(x + 0.9, y + 0.65, 10.2, 0.85);
    }
  }
}

function strata(ctx, rand, steep) {
  ctx.lineCap = 'round';
  for (let i = 0; i < (steep ? 9 : 6); i++) {
    const x = i % 2 ? rand() * PATCH : -3;
    const y = rand() * PATCH;
    const length = 8 + rand() * 36;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length * 0.42, y + (steep ? -4 : -0.5));
    ctx.lineTo(x + length * 0.67, y + (steep ? 1 : 1.2));
    ctx.lineTo(x + length, y + (steep ? -5 : 0));
    ctx.strokeStyle = steep ? '#645b483f' : '#6a56493b';
    ctx.lineWidth = 0.6 + rand() * 1.25;
    ctx.stroke();
  }
}

function ripples(ctx, rand) {
  ctx.lineCap = 'round';
  for (let i = 0; i < 11; i++) {
    const x = rand() * PATCH, y = rand() * PATCH;
    const length = 4 + rand() * 17;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + length / 2, y - 2, x + length, y + 0.8);
    ctx.strokeStyle = i % 3 === 0 ? '#fffdf19c' : '#806c5137';
    ctx.lineWidth = i % 3 === 0 ? 1.1 : 0.65;
    ctx.stroke();
  }
}

function tracks(ctx, mask) {
  const paths = EDGES.filter((_, i) => mask & (1 << i));
  if (!paths.length) paths.push([0.5, 0.22], [0.5, 0.78]);
  ctx.lineCap = 'round';
  for (const [x, y] of paths) {
    const crossX = y === 0 || y === 1 || !mask;
    for (const offset of [-4, 4]) {
      const sx = crossX ? offset : 0, sy = crossX ? 0 : offset;
      ctx.beginPath();
      ctx.moveTo(x * PATCH + sx, y * PATCH + sy);
      ctx.quadraticCurveTo((x + 0.5) * PATCH * 0.5 + sx, (y + 0.5) * PATCH * 0.5 + sy, PATCH / 2 + sx, PATCH / 2 + sy);
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = '#77553a39';
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#6d503a29';
      ctx.stroke();
    }
  }
}

/** A small, original multiplier map. One upload, shared by all boards and draw distances. */
export function terrainAtlas() {
  if (atlas) return atlas;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = '#f5f5f1';
  ctx.fillRect(0, 0, SIZE, SIZE);
  for (let slot = 0; slot < ROAD + 16; slot++) {
    const x = (slot % 8) * CELL + GUTTER;
    const y = Math.floor(slot / 8) * CELL + GUTTER;
    const type = slot >= ROAD ? 'road' : LAND[Math.floor(slot / 4)] ?? SIDE[slot - 20];
    const rand = paintRandom(449 * slot + 101);
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.rect(0, 0, PATCH, PATCH);
    ctx.clip();
    if (type === 'plains' || type === 'forest' || type === 'turf') turf(ctx, rand, type !== 'plains');
    if (type === 'mountain' || type === 'earth' || type === 'stone') strata(ctx, rand, type === 'mountain');
    if (type === 'floor') pavers(ctx, rand);
    if (type === 'beach' || type === 'bed') ripples(ctx, rand);
    if (type === 'road') tracks(ctx, slot - ROAD);
    stipple(ctx, rand, 82, '#4d453429', 1.25);
    stipple(ctx, rand, 58, '#fffdef85', 0.95);
    ctx.restore();
  }
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
  // Extend each patch into its gutter for filtering.
  const pixels = new Uint32Array(data.buffer);
  for (let slot = 0; slot < ROAD + 16; slot++) {
    const x = slot % 8 * CELL, y = Math.floor(slot / 8) * CELL;
    for (let dy = 0; dy < CELL; dy++) {
      const sy = Math.min(CELL - GUTTER - 1, Math.max(GUTTER, dy));
      for (let dx = 0; dx < CELL; dx++) {
        const sx = Math.min(CELL - GUTTER - 1, Math.max(GUTTER, dx));
        if (sx === dx && sy === dy) continue;
        pixels[(y + dy) * SIZE + x + dx] = pixels[(y + sy) * SIZE + x + sx];
      }
    }
  }
  atlas = new Texture3D({ width: SIZE, height: SIZE, data: new Uint8Array(data.buffer) }, {
    name: 'starbanner-terrain', wrapS: 'clamp', wrapT: 'clamp', colorSpace: 'linear', mipmaps: true, anisotropy: 4
  });
  return atlas;
}

export function terrainUV(type, variant = 0, roadLinks = 0) {
  const land = LAND.indexOf(type);
  const side = SIDE.indexOf(type);
  const slot = type === 'road' ? ROAD + roadLinks : side >= 0 ? 20 + side : Math.max(0, land) * 4 + variant;
  const x = (slot % 8) * CELL + GUTTER, y = Math.floor(slot / 8) * CELL + GUTTER;
  const left = (x + 0.5) / SIZE, right = (x + PATCH - 0.5) / SIZE;
  const top = (y + 0.5) / SIZE, bottom = (y + PATCH - 0.5) / SIZE;
  return [left, bottom, right, bottom, right, top, left, top];
}
