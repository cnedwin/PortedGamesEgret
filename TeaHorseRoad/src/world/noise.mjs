// 地形与布景用的确定性噪声：同一坐标永远得到同一个值，所以按需加载的地块在边界处严丝合缝。
// Deterministic noise for the land and its dressing: one coordinate always gives one value, so terrain tiles
// loaded at different times meet exactly at their borders.

/** A 32-bit integer hash of two integers and a seed. */
export function hash2(x, y, seed = 0) {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (seed | 0) * 982451653;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

/** A value in [0, 1) from two integers and a seed. */
export const random2 = (x, y, seed = 0) => hash2(x, y, seed) / 4294967296;

const fade = (t) => t * t * (3 - 2 * t);

/** Smooth value noise in [-1, 1]. */
export function noise2(x, y, seed = 0) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    fx = fade(x - ix),
    fy = fade(y - iy);
  const a = random2(ix, iy, seed),
    b = random2(ix + 1, iy, seed),
    c = random2(ix, iy + 1, seed),
    d = random2(ix + 1, iy + 1, seed);
  return (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy) * 2 - 1;
}

/** Fractal noise: `octaves` layers, each at twice the frequency and half the weight. */
export function fbm2(x, y, octaves = 5, seed = 0) {
  let sum = 0,
    weight = 0.5,
    total = 0,
    f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += noise2(x * f, y * f, seed + i * 17) * weight;
    total += weight;
    weight *= 0.5;
    f *= 2.03;
  }
  return sum / total;
}

/** Ridged fractal noise in [0, 1]: sharp crests where the noise crosses zero, as on mountain ridges. */
export function ridged2(x, y, octaves = 5, seed = 0) {
  let sum = 0,
    weight = 0.5,
    total = 0,
    f = 1,
    prev = 1;
  for (let i = 0; i < octaves; i++) {
    let n = 1 - Math.abs(noise2(x * f, y * f, seed + i * 31));
    n *= n;
    sum += n * weight * prev;
    prev = n;
    total += weight;
    weight *= 0.5;
    f *= 2.1;
  }
  return sum / total;
}

export const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** A seeded generator of values in [0, 1), for placing things the same way on every run. */
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
