// Surfaces painted by code. Each one is described by a height function and a
// colour function over a square that tiles; from them come a colour map and a
// normal map, so walls catch the light as if they had relief.
import { Texture3D } from '@egret/engine/world3d';

const fract = (v) => v - Math.floor(v);
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** A repeatable value in 0..1 for a lattice point; `period` makes the lattice wrap. */
function lattice(x, y, period, seed) {
  x = ((x % period) + period) % period;
  y = ((y % period) + period) % period;
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
/** Smooth noise that tiles over 0..1 with `cells` lumps across. */
function noise(u, v, cells, seed) {
  const x = u * cells,
    y = v * cells,
    x0 = Math.floor(x),
    y0 = Math.floor(y),
    tx = smooth(x - x0),
    ty = smooth(y - y0);
  return mix(
    mix(lattice(x0, y0, cells, seed), lattice(x0 + 1, y0, cells, seed), tx),
    mix(lattice(x0, y0 + 1, cells, seed), lattice(x0 + 1, y0 + 1, cells, seed), tx),
    ty,
  );
}
/** Several layers of noise, coarse to fine. */
function cloud(u, v, cells, seed, layers = 4) {
  let sum = 0,
    weight = 0.5,
    total = 0;
  for (let i = 0; i < layers; i++) {
    sum += noise(u, v, cells << i, seed + i * 17) * weight;
    total += weight;
    weight *= 0.5;
  }
  return sum / total;
}

/**
 * Paint a surface. `height(u, v)` gives relief in 0..1 and `colour(u, v, h)`
 * an [r, g, b] in 0..1 as seen on screen; `bump` scales how deep the relief
 * looks. Returns `{ map, normalMap }`.
 */
function paint(size, height, colour, bump) {
  const heights = new Float32Array(size * size),
    pixels = new Uint8Array(size * size * 4),
    normals = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size,
        v = y / size,
        h = height(u, v),
        c = colour(u, v, h),
        i = (y * size + x) * 4;
      heights[y * size + x] = h;
      pixels[i] = clamp01(c[0]) * 255;
      pixels[i + 1] = clamp01(c[1]) * 255;
      pixels[i + 2] = clamp01(c[2]) * 255;
      pixels[i + 3] = 255;
    }
  const at = (x, y) => heights[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * bump,
        dy = (at(x, y + 1) - at(x, y - 1)) * bump,
        length = Math.sqrt(dx * dx + dy * dy + 1),
        i = (y * size + x) * 4;
      normals[i] = (-dx / length) * 127.5 + 127.5;
      normals[i + 1] = (-dy / length) * 127.5 + 127.5;
      normals[i + 2] = (1 / length) * 127.5 + 127.5;
      normals[i + 3] = 255;
    }
  const wrap = { wrapS: 'repeat', wrapT: 'repeat', mipmaps: true, anisotropy: 4 };
  return {
    map: new Texture3D({ width: size, height: size, data: pixels }, { ...wrap, colorSpace: 'srgb' }),
    normalMap: new Texture3D({ width: size, height: size, data: normals }, { ...wrap, colorSpace: 'linear' }),
  };
}

const tint = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

/** The surfaces of the map, by name. Built once, on first use. */
export function createSurfaces() {
  const SIZE = 256;
  return {
    // Poured concrete: blotches, pitting and the seams of the formwork.
    concrete: paint(
      SIZE,
      (u, v) => {
        const seam = Math.min(Math.abs(fract(u) - 0.5), Math.abs(fract(v) - 0.5)) > 0.492 ? 0.55 : 1;
        const pits = noise(u, v, 64, 3) > 0.86 ? 0.8 : 1;
        return cloud(u, v, 8, 1) * 0.3 + 0.7 * seam * pits;
      },
      (u, v, h) => {
        const stain = cloud(u, v, 4, 9, 3),
          streak = noise(u, v * 0.25, 32, 5);
        return tint([0.62, 0.61, 0.58], 0.8 + stain * 0.24 - streak * 0.07 + (h - 0.85) * 0.25);
      },
      4,
    ),
    // Worn tarmac.
    asphalt: paint(
      SIZE,
      (u, v) => noise(u, v, 128, 2) * 0.75 + cloud(u, v, 32, 4) * 0.25,
      (u, v, h) => {
        const patch = cloud(u, v, 5, 12, 3);
        return tint([0.3, 0.31, 0.32], 0.78 + patch * 0.22 + (h - 0.5) * 0.16);
      },
      1.2,
    ),
    // Corrugated steel, ribs running up and down; the colour comes from the vertex tint.
    container: paint(
      SIZE,
      (u, v) => {
        const rib = Math.abs(fract(u * 8) - 0.5) * 2;
        return smooth(clamp01((rib - 0.25) * 2.2)) * 0.9 + cloud(u, v, 16, 6) * 0.1;
      },
      (u, v, h) => {
        const rust = cloud(u, v, 6, 21, 4),
          low = v > 0.88 ? 0.82 : 1,
          base = (0.76 + h * 0.24) * low;
        // Rust shows as a warm stain where the paint has gone, not as a different colour of container.
        const worn = Math.max(0, Math.min(1, (rust - 0.6) * 6));
        return [base * (1 - worn * 0.12), base * (1 - worn * 0.34), base * (1 - worn * 0.5)];
      },
      5,
    ),
    // Painted block wall with a darker band at the foot.
    wall: paint(
      SIZE,
      (u, v) => {
        const row = Math.floor(v * 8),
          joint = Math.min(Math.abs(fract(v * 8) - 0.5), Math.abs(fract(u * 4 + (row % 2) * 0.5) - 0.5)) > 0.47 ? 0 : 1;
        return joint * 0.8 + cloud(u, v, 24, 13) * 0.2;
      },
      (u, v, h) => {
        const dirt = cloud(u, v, 5, 31, 3);
        return tint([0.78, 0.77, 0.72], 0.7 + dirt * 0.3 + (h - 0.8) * 0.25);
      },
      3,
    ),
    // Rough timber planks.
    wood: paint(
      SIZE,
      (u, v) => {
        const gap = Math.abs(fract(v * 4) - 0.5) > 0.46 ? 0 : 1;
        return gap * (0.7 + noise(u * 0.15, v, 96, 4) * 0.3);
      },
      (u, v, h) => {
        const plank = lattice(0, Math.floor(v * 4), 4, 5),
          grain = noise(u * 0.1, v, 128, 6);
        return tint([0.56, 0.45, 0.31], (0.6 + plank * 0.22 + grain * 0.16) * (0.55 + h * 0.45));
      },
      5,
    ),
    // Stacked sandbags.
    sandbag: paint(
      SIZE,
      (u, v) => {
        const row = Math.floor(v * 4),
          x = fract(u * 3 + (row % 2) * 0.5) - 0.5,
          y = fract(v * 4) - 0.5;
        return clamp01(1 - (x * x * 3.6 + y * y * 4.4)) * 0.85 + noise(u, v, 128, 7) * 0.15;
      },
      (u, v, h) => {
        const weave = noise(u, v, 128, 3);
        return tint([0.6, 0.55, 0.41], 0.62 + h * 0.36 + weave * 0.1);
      },
      9,
    ),
    // Painted machinery plate with rivets along the panel edges.
    metal: paint(
      SIZE,
      (u, v) => {
        const px = fract(u * 2),
          py = fract(v * 2),
          edge = Math.min(px, 1 - px, py, 1 - py) < 0.02 ? 0.3 : 1;
        const rx = fract(u * 16) - 0.5,
          ry = fract(v * 16) - 0.5,
          near = Math.min(px, 1 - px, py, 1 - py) < 0.07,
          rivet = near && rx * rx + ry * ry < 0.035 ? 0.35 : 0;
        return edge * 0.7 + rivet + cloud(u, v, 32, 5) * 0.08;
      },
      (u, v, h) => {
        const wear = cloud(u, v, 7, 41, 4);
        return wear > 0.76 ? [0.5, 0.42, 0.36] : tint([0.8, 0.8, 0.8], 0.68 + h * 0.27 + wear * 0.12);
      },
      4,
    ),
  };
}

/** A soft round dot for sparks, smoke and glows. */
export function dotTexture(size = 32, power = 2) {
  const data = new Uint8Array(size * size * 4),
    middle = (size - 1) / 2;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.sqrt((x - middle) ** 2 + (y - middle) ** 2) / middle,
        a = Math.max(0, 1 - d) ** power;
      data.set([255, 255, 255, 255 * a], (y * size + x) * 4);
    }
  return new Texture3D({ width: size, height: size, data });
}

/** A star-shaped burst for the muzzle flash. */
export function flashTexture(size = 64) {
  const data = new Uint8Array(size * size * 4),
    middle = (size - 1) / 2;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (x - middle) / middle,
        dy = (y - middle) / middle,
        d = Math.sqrt(dx * dx + dy * dy),
        angle = Math.atan2(dy, dx),
        spikes = 0.45 + 0.55 * Math.abs(Math.cos(angle * 2.5)) ** 3,
        a = clamp01(1 - d / spikes) ** 1.5;
      data.set([255, 235 - d * 60, 170 - d * 110, 255 * a], (y * size + x) * 4);
    }
  return new Texture3D({ width: size, height: size, data });
}

/** Paint with the page's 2D canvas (signs, the helipad mark, screens). Returns undefined outside a browser. */
export function canvasTexture(width, height, draw) {
  if (typeof document === 'undefined') return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  draw(context, width, height);
  const data = new Uint8Array(context.getImageData(0, 0, width, height).data.buffer.slice(0));
  return new Texture3D({ width, height, data }, { colorSpace: 'srgb', mipmaps: true, flipY: true });
}
