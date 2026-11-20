// 代码画的贴图：四种可平铺的地面（茶园草地、夯土路、岩石、积雪）、布纹、木纹和经幡的颜色。
// 全部是像素数组，交给引擎的 Texture3D；不依赖页面，所以 Node 里也能生成。
//
// Textures painted in code: four tiling grounds (tea-garden grass, packed earth, rock and snow), cloth, wood grain and
// the colours of the prayer flags. All are pixel arrays handed to the engine's Texture3D, free of the page, so they can
// be made in Node as well.
import { Texture3D } from '@egret/engine/world3d';
import { random2 } from '../world/noise.mjs';

/** Value noise that wraps every `period` cells, so a texture tiles without a seam. */
function tileNoise(x, y, period, seed) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    fx = x - ix,
    fy = y - iy,
    sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy),
    w = (v) => ((v % period) + period) % period;
  const a = random2(w(ix), w(iy), seed),
    b = random2(w(ix + 1), w(iy), seed),
    c = random2(w(ix), w(iy + 1), seed),
    d = random2(w(ix + 1), w(iy + 1), seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
/** Tiling fractal noise in [0, 1]: octaves at 4, 8, 16... cells across the texture. */
function tileFbm(u, v, base, octaves, seed) {
  let sum = 0,
    weight = 0.5,
    total = 0,
    period = base;
  for (let i = 0; i < octaves; i++) {
    sum += tileNoise(u * period, v * period, period, seed + i) * weight;
    total += weight;
    weight *= 0.5;
    period *= 2;
  }
  return sum / total;
}

/** Paint a `size` x `height` texture (square by default): `paint(u, v, out)` writes sRGB bytes 0..255 for a texel. */
function paint(size, painter, height = size) {
  const data = new Uint8Array(size * height * 4),
    out = [0, 0, 0, 255];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < size; x++) {
      out[3] = 255;
      painter((x + 0.5) / size, (y + 0.5) / height, out, x, y);
      const o = (y * size + x) * 4;
      data[o] = out[0];
      data[o + 1] = out[1];
      data[o + 2] = out[2];
      data[o + 3] = out[3];
    }
  return { width: size, height, data };
}

const mix = (a, b, t) => a + (b - a) * t;
const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Grass in three moods: the deep green of the tea hills, the dry gold of the gorge, the brown turf of the high pass. */
const GRASS = {
  lush: { low: [34, 58, 22], high: [70, 104, 38], dry: [96, 98, 52] },
  dry: { low: [70, 66, 40], high: [120, 110, 70], dry: [150, 136, 100] },
  alpine: { low: [60, 58, 36], high: [104, 98, 62], dry: [136, 126, 96] }
};
export function grassPixels(size = 256, mood = 'lush') {
  const c = GRASS[mood];
  return paint(size, (u, v, out, x, y) => {
    const clump = tileFbm(u, v, 6, 5, 101),
      fine = tileFbm(u, v, 48, 2, 102),
      patch = tileFbm(u, v, 3, 3, 105),
      blade = random2(x, y, 103);
    const t = Math.min(1, Math.max(0, clump * 0.8 + fine * 0.4 - 0.1)),
      d = Math.max(0, patch - 0.55) * 1.8;
    for (let k = 0; k < 3; k++) out[k] = clamp255(mix(mix(c.low[k], c.high[k], t), c.dry[k], d) * (0.82 + 0.3 * fine) + (blade > 0.975 ? 24 : 0));
  });
}

/** Packed earth: warm brown, with pebbles and fine cracks. */
export function soilPixels(size = 256) {
  return paint(size, (u, v, out, x, y) => {
    const n = tileFbm(u, v, 6, 5, 201),
      grain = tileFbm(u, v, 48, 2, 202),
      pebble = tileNoise(u * 40, v * 40, 40, 203),
      speck = random2(x, y, 204);
    let r = mix(98, 132, n) * (0.85 + 0.3 * grain),
      g = mix(78, 100, n) * (0.85 + 0.3 * grain),
      b = mix(58, 72, n) * (0.85 + 0.3 * grain);
    if (pebble > 0.88) {
      const k = (pebble - 0.88) / 0.12;
      r = mix(r, 118 + 30 * k, 0.6);
      g = mix(g, 110 + 26 * k, 0.6);
      b = mix(b, 100 + 22 * k, 0.6);
    }
    if (speck > 0.985) r = g = b = 60;
    out[0] = clamp255(r);
    out[1] = clamp255(g);
    out[2] = clamp255(b);
  });
}

/** Rock: grey layers with lichen and dark cracks. */
export function rockPixels(size = 256) {
  return paint(size, (u, v, out) => {
    const strata = 0.5 + 0.5 * Math.sin((v * 9 + tileFbm(u, v, 4, 4, 301) * 2.2) * Math.PI * 2),
      n = tileFbm(u, v, 8, 5, 302),
      crack = Math.abs(tileFbm(u, v, 12, 3, 303) - 0.5),
      lichen = tileFbm(u, v, 16, 3, 304);
    let k = 0.62 + 0.25 * n + 0.13 * strata;
    if (crack < 0.03) k *= 0.55 + crack * 10;
    out[0] = clamp255(118 * k + (lichen > 0.68 ? 30 : 0));
    out[1] = clamp255(116 * k + (lichen > 0.68 ? 34 : 0));
    out[2] = clamp255(112 * k);
  });
}

/** Snow: near white, blue in its hollows, with a few glints. */
export function snowPixels(size = 256) {
  return paint(size, (u, v, out, x, y) => {
    const n = tileFbm(u, v, 6, 5, 401),
      glint = random2(x, y, 402);
    const k = 0.86 + 0.14 * n;
    out[0] = clamp255(222 * k + (glint > 0.995 ? 30 : 0));
    out[1] = clamp255(230 * k + (glint > 0.995 ? 25 : 0));
    out[2] = clamp255(246 * k);
  });
}

/** Rough woven cloth, for tarps and tents, in a given colour. */
export function clothPixels(size = 128, rgb = [180, 160, 120]) {
  return paint(size, (u, v, out, x, y) => {
    const weave = ((x >> 1) + (y >> 1)) % 2 ? 0.92 : 1.04,
      n = tileFbm(u, v, 8, 4, 501);
    const k = weave * (0.82 + 0.3 * n);
    out[0] = clamp255(rgb[0] * k);
    out[1] = clamp255(rgb[1] * k);
    out[2] = clamp255(rgb[2] * k);
  });
}

/** Wood grain along v, for planks and poles. */
export function woodPixels(size = 128, rgb = [128, 88, 54]) {
  return paint(size, (u, v, out) => {
    const ring = 0.5 + 0.5 * Math.sin((u * 18 + tileFbm(u, v, 4, 4, 601) * 3) * Math.PI * 2),
      n = tileFbm(u, v, 16, 3, 602);
    const k = 0.72 + 0.2 * ring + 0.16 * n;
    out[0] = clamp255(rgb[0] * k);
    out[1] = clamp255(rgb[1] * k);
    out[2] = clamp255(rgb[2] * k);
  });
}

const cache = new Map();
/** A texture of one of the kinds above, made once and shared. */
export function texture(name, make, options = {}) {
  if (!cache.has(name)) cache.set(name, new Texture3D(make(), { wrapS: 'repeat', wrapT: 'repeat', mipmaps: true, anisotropy: 4, ...options }));
  return cache.get(name);
}

/** The four ground layers of a tile in a leg (0 tea hills, 1 gorge, 2 snow mountains): grass, earth, rock and snow. */
export const groundLayers = (leg = 0) => {
  const mood = ['lush', 'dry', 'alpine'][leg];
  return [
    texture('grass-' + mood, () => grassPixels(256, mood)),
    texture('soil', () => soilPixels()),
    texture('rock', () => rockPixels()),
    texture('snow', () => snowPixels())
  ];
};

/** Prayer flags: blue, white, red, green and yellow, each printed with a dark block, a gap of nothing between. */
export function flagPixels(width = 320, height = 64) {
  const colors = [
    [40, 88, 170],
    [236, 234, 226],
    [196, 40, 34],
    [40, 140, 70],
    [232, 190, 40]
  ];
  return paint(width, (u, v, out, x, y) => {
    const flag = Math.floor((x / width) * 5),
      fx = (x % (width / 5)) / (width / 5),
      c = colors[flag];
    if (fx > 0.9 || y >= height) {
      out[3] = 0;
      return;
    }
    // A printed panel: rows of fine dark marks in the middle of each flag, and a frayed lower edge.
    const fy = y / height,
      panel = fx > 0.18 && fx < 0.74 && fy > 0.2 && fy < 0.8,
      mark = panel && (Math.floor(fx * 40) + Math.floor(fy * 14)) % 3 === 0;
    const k = mark ? 0.45 : 0.92 + 0.08 * random2(x, y, 701);
    out[0] = clamp255(c[0] * k);
    out[1] = clamp255(c[1] * k);
    out[2] = clamp255(c[2] * k);
    out[3] = fy > 0.94 && random2(x, 0, 702) > 0.5 ? 0 : 255;
  }, height);
}

/** A tyre's print: chevrons of tread, darker where they press deepest, fading at the edges. */
export function trackPixels(width = 64, height = 128) {
  return paint(width, (u, v, out, x, y) => {
    const edge = Math.min(u, 1 - u) * 2,
      chevron = Math.abs(((v * 10 + Math.abs(u - 0.5) * 1.6) % 1) - 0.5) < 0.18,
      noise = random2(x, y, 801);
    out[0] = 40;
    out[1] = 32;
    out[2] = 24;
    out[3] = clamp255((chevron ? 150 : 70) * Math.min(1, edge * 2.5) * (0.75 + 0.25 * noise));
  }, height);
}

/** A splash of mud: a ragged blot with droplets flung out from it, for the trucks' sides. */
export function mudPixels(size = 128) {
  return paint(size, (u, v, out, x, y) => {
    const dx = u - 0.5,
      dy = v - 0.5,
      a = Math.atan2(dy, dx),
      d = Math.hypot(dx, dy) * 2,
      rim = 0.55 + 0.25 * tileNoise(Math.cos(a) * 3 + 3, Math.sin(a) * 3 + 3, 6, 911),
      drop = random2(Math.floor(u * 22), Math.floor(v * 22), 913) > 0.93 && d < 0.95;
    const inside = d < rim ? 1 : drop ? 0.9 : 0;
    out[0] = 72 + 20 * random2(x, y, 915);
    out[1] = 54 + 14 * random2(x, y, 917);
    out[2] = 34;
    out[3] = clamp255(inside * 235 * (0.7 + 0.3 * tileNoise(u * 8, v * 8, 8, 919)));
  });
}

/** A soft round puff, for dust and snow particles. */
export function puffPixels(size = 64) {
  return paint(size, (u, v, out) => {
    const d = Math.hypot(u - 0.5, v - 0.5) * 2,
      k = Math.max(0, 1 - d);
    out[0] = out[1] = out[2] = 255;
    out[3] = clamp255(255 * k * k * (0.8 + 0.2 * tileNoise(u * 6, v * 6, 6, 901)));
  });
}
