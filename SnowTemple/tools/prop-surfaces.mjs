// All three registered maps use the same procedural height/material fields.
// Regenerate with node tools/prop-surfaces.mjs. No source photographs are used.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { PROP_ATLAS } from '../src/view/prop-surface.mjs';

const clip = (v) => Math.min(1, Math.max(0, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clip((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
function hash(x, y, seed) {
  let k = Math.imul(x + seed, 0x548a6a7d) ^ Math.imul(y - seed, 0x9e3779b1);
  k = Math.imul(k ^ (k >>> 16), 0x21f0aaad);
  k = Math.imul(k ^ (k >>> 15), 0x735a2d97);
  return ((k ^ (k >>> 15)) >>> 0) / 4294967295;
}
function noise(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const u = smooth(0, 1, x - ix), v = smooth(0, 1, y - iy);
  return mix(mix(hash(ix, iy, seed), hash(ix + 1, iy, seed), u),
    mix(hash(ix, iy + 1, seed), hash(ix + 1, iy + 1, seed), u), v);
}

function reed(u, v, slope, seed) {
  const bend = (noise(u * 15, v * 6, seed) - 0.5) * 0.015;
  const x = (u + v * slope + bend) * 126, id = Math.floor(x);
  const offset = 0.17 + 0.66 * hash(id, 1, seed);
  const near = 1 - smooth(0.13, 0.39, Math.abs(x - id - offset));
  const run = v * (2 + hash(id, 4, seed) * 3) + hash(id, 3, seed);
  const ends = run - Math.floor(run);
  return near * smooth(0.01, 0.12, ends) * (1 - smooth(0.81, 0.99, ends));
}

const SCENES = [
  // Granite: chipped fractures, interlocked crystals and recessed pores.
  (u, v) => {
    const cloud = noise(u * 6.9, v * 7.8, 52), grit = noise(u * 133, v * 147, 94);
    const seam = 1 - smooth(0.012, 0.049, Math.abs(noise(u * 16 + cloud * 1.4, v * 19, 21) - 0.53));
    const pits = smooth(0.68, 0.98, grit) * smooth(0.34, 0.9, noise(u * 47, v * 59, 65));
    const crust = smooth(0.76, 0.97, noise(u * 82, v * 92, 131));
    const tone = 0.82 + (cloud - 0.5) * 0.16 + (grit - 0.5) * 0.18 - seam * 0.083 - pits * 0.14 + crust * 0.08;
    return [tone * 0.99, tone, tone * 1.015, grit * 0.10 - seam * 0.12 - pits * 0.22, 0.92 - crust * 0.11, 0];
  },
  // Bronze: the wear breaks through a layered blue-green corrosion film.
  (u, v) => {
    const field = noise(u * 5.3, v * 7.1, 28) * 0.72 + noise(u * 20, v * 23, 51) * 0.28;
    const runoff = noise(u * 47 + v * 2.5, v * 4.2, 37), hammer = noise(u * 95, v * 62, 94);
    const oxidized = smooth(0.45, 0.72, field) * 0.83 + smooth(0.5, 0.93, runoff) * 0.14;
    const specks = smooth(0.64, 0.94, hammer) * oxidized;
    const shine = (hammer - 0.5) * 0.09 - specks * 0.18;
    return [mix(0.99, 0.58, oxidized) + shine, mix(0.91, 0.88, oxidized) + shine, mix(0.76, 0.84, oxidized) + shine,
      hammer * 0.075 + oxidized * 0.10 - specks * 0.11, mix(0.40, 0.77, oxidized), mix(0.72, 0.15, oxidized)];
  },
  // Frost: thick crumbs along a smoother, compressed snow bed.
  (u, v) => {
    const broad = noise(u * 17 + v * 5.9, v * 25, 121), bits = noise(u * 145, v * 138, 27);
    const sparkle = smooth(0.77, 0.99, bits);
    const tone = 0.90 + broad * 0.05 + bits * 0.04 + sparkle * 0.05;
    return [tone * 0.98, tone, tone * 1.02, broad * 0.085 + sparkle * 0.052, 0.75 + broad * 0.15, 0];
  },
  // Straw: fine, overlapping fibres interrupted by split strands and dark bundles.
  (u, v) => {
    const shade = noise(u * 18, v * 15, 104), short = noise(u * 97 + v * 30.5, v * 56, 19);
    const fibre = Math.max(reed(u,v,0.072,63),reed(u,v,-0.024,48)*0.58);
    const tone = 0.73 + shade * 0.17 + fibre * 0.13;
    return [tone * 1.04, tone, tone * 0.9, fibre * 0.22 + short * 0.036, 0.88 + (1 - fibre) * 0.10, 0];
  },
  // Bark: irregular longitudinal plates around eroded creases.
  (u, v) => {
    const coarse = noise(u * 8, v * 8, 13), ripples = noise(u * 27 + coarse * 6 - v * 1.5, v * 3.5, 61);
    const flap = smooth(0.4, 0.68, ripples) * smooth(0.20, 0.66, noise(u * 12 + v * 1.4, v * 21, 73));
    const cracks = 1 - smooth(0.015, 0.10, Math.abs(ripples - 0.32));
    const bits = noise(u * 126, v * 59, 3);
    const tone = 0.72 + flap * 0.19 + bits * 0.085 - cracks * 0.20;
    return [tone, tone * 0.94, tone * 0.895, flap * 0.25 + bits * 0.04 - cracks * 0.096, 0.82 + coarse * 0.14, 0];
  },
  // Needles: interleaving groups of sprays over dark secondary twigs.
  (u, v) => {
    const tuft = noise(u * 21, v * 27, 22), warp = noise(u * 17, v * 14, 14);
    const strength = noise(u * 88 + v * 51 + warp * 7, v * 11, 61)
      * 0.62 + noise(u * 77 - v * 46 + tuft * 4, v * 12, 31) * 0.38;
    const needle = smooth(0.41, 0.77, strength);
    const tone = 0.73 + needle * 0.25 + (tuft - 0.5) * 0.15;
    return [tone * 0.94, tone * 1.055, tone * mix(0.87, 0.95, tuft), needle * 0.2 + tuft * 0.069, 0.79 + tuft * 0.16, 0];
  }
];

const bits = Array.from({ length:256 }, (_, i) => {
  let c = i;
  for (let b = 0; b < 8; b++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  return c;
});
function chunk(tag, body) {
  const full = Buffer.alloc(12 + body.length);
  full.writeUInt32BE(body.length, 0);
  full.write(tag, 4, 4, 'ascii');
  body.copy(full, 8);
  let crc = 0xffffffff;
  for (const value of full.subarray(4, -4)) crc = (crc >>> 8) ^ bits[(crc ^ value) & 255];
  full.writeUInt32BE((crc ^ 0xffffffff) >>> 0, full.length - 4);
  return full;
}
function png(width, height, rgb) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const stride = width * 3, scan = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    scan[y * (stride + 1)] = 1; // RGB horizontal Sub filter
    for (let i = 0; i < stride; i++) {
      const di = y * stride + i;
      scan[y * (stride + 1) + 1 + i] = rgb[di] - (i > 2 ? rgb[di - 3] : 0);
    }
  }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header),
    chunk('IDAT', deflateSync(scan, { level:9 })), chunk('IEND', Buffer.alloc(0))]);
}

const { columns, rows, border, high, low } = PROP_ATLAS;
const width = high * columns, height = high * rows;
const color = Buffer.alloc(width * height * 3), normal = Buffer.alloc(width * height * 3);
const metalrough = Buffer.alloc(width * height * 3);
for (let tile = 0; tile < SCENES.length; tile++) {
  const field = SCENES[tile];
  const x0 = tile % columns * high, y0 = Math.floor(tile / columns) * high;
  const fraction = (index) => clip(((index + 0.5) / high - border) / (1 - 2 * border));
  const bump = new Float32Array(high * high);
  for (let y = 0; y < high; y++) {
    for (let x = 0; x < high; x++) {
      const [r,g,b,relief,roughness,metallic] = field(fraction(x), fraction(y));
      const at = ((y0 + y) * width + x0 + x) * 3;
      color.set([r,g,b].map(value => Math.round(clip(value) * 255)), at);
      metalrough.set([255, Math.round(roughness * 255), Math.round(metallic * 255)], at);
      bump[y * high + x] = relief;
    }
  }
  const atHeight = (x, y) => bump[Math.max(0, Math.min(high - 1, y)) * high + Math.max(0, Math.min(high - 1, x))];
  for (let y = 0; y < high; y++) {
    for (let x = 0; x < high; x++) {
      const dx = (atHeight(x - 1, y) - atHeight(x + 1, y)) * 1.63;
      const dy = (atHeight(x, y - 1) - atHeight(x, y + 1)) * 1.63;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const at = ((y0 + y) * width + x0 + x) * 3;
      normal.set([dx, dy, 1].map(value => Math.round((0.5 + value * inv * 0.5) * 255)), at);
    }
  }
}
const half = (data) => {
  const copy = Buffer.alloc(width * height * 3 / 4);
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      for (let i = 0; i < 3; i++) {
        const at = (y * width + x) * 3 + i;
        copy[(y / 2 * width / 2 + x / 2) * 3 + i] = Math.round((data[at] + data[at + 3] + data[at + width * 3] + data[at + width * 3 + 3]) * 0.25);
      }
    }
  }
  return copy;
};
const output = new URL('../assets/prop-surfaces/', import.meta.url);
mkdirSync(output, { recursive:true });
for (const [name, file] of Object.entries({ color, normal, metalrough })) {
  writeFileSync(new URL('high-' + name + '.png', output), png(width, height, file));
  writeFileSync(new URL('low-' + name + '.png', output), png(low * columns, low * rows, half(file)));
}
