// 茶马古道的地理：路两边的山、谷、溪流、湖和驿站，全部是给定道路采样之后的纯函数。
// 这个模块不引用引擎也不碰页面，所以地块工作线程、页面和 Node 测试用的是同一套代码。
//
// The geography of the Tea Horse Road: the hills, gorges, streams, lake and stations around the road, all pure
// functions of the road's samples. It imports neither the engine nor the page, so the terrain worker, the page and
// the tests in Node all run the same code.
import { clamp, fbm2, lerp, noise2, ridged2, smoothstep } from './noise.mjs';

export const ROAD_HALF_WIDTH = 4.5;
const SPACING = 2;
const CELL = 64;

/**
 * Everything about the land, given the road sampled every two metres: `samples` holds `x`, `y`, `z` (typed arrays)
 * and `count`.
 */
export function createGeography(samples) {
const count = samples.count;
const ROAD_LENGTH = (count - 1) * SPACING;
/** A point of the road at distance `s` along it, interpolated between samples. */
const pointAt = (s, out = [0, 0, 0]) => {
  const f = clamp(s / SPACING, 0, count - 1),
    i = Math.min(count - 2, Math.floor(f)),
    t = f - i;
  out[0] = lerp(samples.x[i], samples.x[i + 1], t);
  out[1] = lerp(samples.y[i], samples.y[i + 1], t);
  out[2] = lerp(samples.z[i], samples.z[i + 1], t);
  return out;
};
// A grid of the samples by cell, for finding the road near a point quickly.
const grid = new Map();
const key = (cx, cz) => cx * 73856093 + cz * 19349663;
for (let i = 0; i < count; i++) {
  const k = key(Math.floor(samples.x[i] / CELL), Math.floor(samples.z[i] / CELL));
  let list = grid.get(k);
  if (!list) grid.set(k, (list = []));
  list.push(i);
}
// Every tenth sample, for the far-off slopes and for smoothing the land's height between bends of the road.
const COARSE = 10;

/** The road's direction at distance `s`, as a unit vector [x, z]. */
function directionAt(s) {
  const i = clamp(Math.round(s / SPACING), 0, count - 2);
  const dx = samples.x[i + 1] - samples.x[i],
    dz = samples.z[i + 1] - samples.z[i],
    l = Math.hypot(dx, dz) || 1;
  return [dx / l, dz / l];
}

const nearestOut = { d: 0, s: 0, y: 0, index: 0, side: 0 };
/**
 * The nearest point of the road to (x, z): its horizontal distance `d`, the distance `s` along the road, the road's
 * height `y` there and which `side` the point is on (+1 right of the direction of travel). Points far from the road
 * are answered from every tenth sample.
 */
function nearestRoad(x, z, out = nearestOut) {
  const cx = Math.floor(x / CELL),
    cz = Math.floor(z / CELL);
  let best = Infinity,
    bi = -1;
  for (let i = -1; i <= 1; i++)
    for (let j = -1; j <= 1; j++) {
      const list = grid.get(key(cx + i, cz + j));
      if (!list) continue;
      for (const k of list) {
        const dx = samples.x[k] - x,
          dz = samples.z[k] - z,
          d2 = dx * dx + dz * dz;
        if (d2 < best) {
          best = d2;
          bi = k;
        }
      }
    }
  if (bi < 0)
    for (let k = 0; k < count; k += COARSE) {
      const dx = samples.x[k] - x,
        dz = samples.z[k] - z,
        d2 = dx * dx + dz * dz;
      if (d2 < best) {
        best = d2;
        bi = k;
      }
    }
  // Refine on the segment to the better neighbour, so the distance is smooth across samples.
  const j = bi === 0 ? 1 : bi === count - 1 ? count - 2 : Math.hypot(samples.x[bi + 1] - x, samples.z[bi + 1] - z) < Math.hypot(samples.x[bi - 1] - x, samples.z[bi - 1] - z) ? bi + 1 : bi - 1;
  const a = Math.min(bi, j),
    b = Math.max(bi, j),
    ax = samples.x[a],
    az = samples.z[a],
    ex = samples.x[b] - ax,
    ez = samples.z[b] - az,
    t = clamp(((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez || 1)),
    px = ax + ex * t,
    pz = az + ez * t;
  out.d = Math.hypot(x - px, z - pz);
  out.s = (a + t) * SPACING;
  out.y = lerp(samples.y[a], samples.y[b], t);
  out.index = a;
  out.side = Math.sign(ex * (z - pz) - ez * (x - px)) || 1;
  return out;
}

/** The land's general level near (x, z): the road's height, averaged over the bends within a few hundred metres. */
function baseLevel(x, z) {
  let sum = 0,
    weight = 0,
    nearest = Infinity,
    nearestY = 0;
  for (let k = 0; k < count; k += COARSE) {
    const dx = samples.x[k] - x,
      dz = samples.z[k] - z,
      d2 = dx * dx + dz * dz;
    if (d2 < nearest) {
      nearest = d2;
      nearestY = samples.y[k];
    }
    if (d2 > 90000) continue;
    const w = Math.exp(-d2 / 12000);
    sum += samples.y[k] * w;
    weight += w;
  }
  return weight > 1e-4 ? sum / weight : nearestY;
}

// ---- Places along the road ---------------------------------------------------------------------------------------

/** The three legs of the journey, by distance along the road. */
const LEGS = [
  { id: 'tea', from: 0 },
  { id: 'gorge', from: 0 },
  { id: 'snow', from: 0 }
];

/** Distance along the road nearest to a point. */
const along = (x, z) => nearestRoad(x, z, {}).s;

/** The stations: the start yard, the two posts on the way and the plateau station at the end. */
const STATIONS = [
  { id: 'start', s: along(0, 40), radius: 30 },
  { id: 'creek', s: along(40, -1460), radius: 34 },
  { id: 'gorge', s: along(150, -2800), radius: 34 },
  { id: 'plateau', s: along(260, -4150), radius: 40 }
].map((station) => {
  const p = pointAt(station.s);
  return { ...station, x: p[0], y: p[1], z: p[2] };
});
LEGS[1].from = STATIONS[1].s;
LEGS[2].from = STATIONS[2].s;

/** The rope bridge over the gorge: straight, level, between two rims. */
const BRIDGE = (() => {
  const from = along(262, -2205),
    to = along(262, -2335),
    a = pointAt(from),
    b = pointAt(to);
  return { from, to, a, b, y: 130, x: 262, river: 62 };
})();

/** The gorge's river, meandering east to west under the bridge. */
const RIVER = { y: 62, z: (x) => -2270 + 26 * Math.sin(x / 140) + 12 * Math.sin(x / 47 + 1.3), halfWidth: 22, rim: 64 };
/** The stream the road fords in the tea hills. */
const FORD = { s: along(71, -775), y: 0, z: (x) => -775 + 18 * Math.sin(x / 55 + 0.4), halfWidth: 7 };
FORD.y = pointAt(FORD.s)[1] - 0.45;
/** The lake by the plateau station. */
const LAKE = { x: 415, z: -4100, radius: 95, y: 275 };

/** Where bandits wait, and where wolves run. */
const AMBUSHES = [
  { id: 'forest', kind: 'bandit', s: along(-55, -1150), count: 6, radius: 70 },
  { id: 'gorge', kind: 'bandit', s: along(180, -2580), count: 7, radius: 70 },
  { id: 'pass', kind: 'wolf', s: along(185, -3440), count: 6, radius: 80 }
].map((zone) => {
  const p = pointAt(zone.s);
  return { ...zone, x: p[0], y: p[1], z: p[2] };
});

/** The high pass, with its white stupa and its lines of prayer flags. */
const PASS = (() => {
  const s = along(160, -3700),
    p = pointAt(s);
  return { s, x: p[0], y: p[1], z: p[2] };
})();

/** Which leg a distance along the road belongs to: 0 tea hills, 1 gorge, 2 snow mountains. */
const legAt = (s) => (s < LEGS[1].from ? 0 : s < LEGS[2].from ? 1 : 2);

/** How much of each landscape a point has, blended over 160 m around the stations between legs. */
function biomeAt(s, out = [0, 0, 0]) {
  const g = smoothstep(LEGS[1].from - 120, LEGS[1].from + 120, s),
    w = smoothstep(LEGS[2].from - 80, LEGS[2].from + 160, s);
  out[0] = 1 - g;
  out[1] = g * (1 - w);
  out[2] = w;
  return out;
}

// ---- The height of the land ----------------------------------------------------------------------------------------

const biome = [0, 0, 0];
const near = { d: 0, s: 0, y: 0, index: 0, side: 0 };

/** The hills, ridges and peaks of each landscape, rising away from the road. */
function relief(x, z, s) {
  biomeAt(s, biome);
  let h = 0;
  if (biome[0] > 0) {
    // Tea hills: soft rolling hills, cut into terraces on their flanks.
    const rolling = 26 * (fbm2(x / 260, z / 260, 4, 11) * 0.5 + 0.5) + 10 * fbm2(x / 90, z / 90, 3, 12);
    const step = 2.6,
      terraced = Math.floor(rolling / step) * step + step * smoothstep(0.78, 1, (rolling / step) % 1);
    h += biome[0] * lerp(rolling, terraced, 0.75);
  }
  if (biome[1] > 0) h += biome[1] * (95 * ridged2(x / 380, z / 380, 5, 21) + 18 * fbm2(x / 120, z / 120, 3, 22));
  if (biome[2] > 0) {
    const r = ridged2(x / 520, z / 520, 6, 31);
    h += biome[2] * (210 * r * r + 40 * fbm2(x / 200, z / 200, 4, 32));
  }
  return h;
}

/** The land's height at (x, z): the general level, the relief away from the road, the road and the water carved in. */
function heightAt(x, z, level = baseLevel(x, z)) {
  const n = nearestRoad(x, z, near),
    base = level,
    away = smoothstep(12, 150, n.d),
    detail = 1.6 * noise2(x / 23, z / 23, 5) + 0.6 * noise2(x / 7, z / 7, 6);
  let h = base + relief(x, z, n.s) * away + detail * smoothstep(5, 18, n.d);

  // The gorge: a canyon cut down to the river, steep below the rims.
  const dr = Math.abs(z - RIVER.z(x));
  if (dr < RIVER.rim) {
    const k = smoothstep(RIVER.halfWidth * 0.6, RIVER.rim, dr);
    const floor = RIVER.y - 3 + 1.5 * noise2(x / 30, z / 30, 41);
    h = lerp(floor, h, Math.pow(k, 0.55));
  }

  // Keep the banks under the first and last planks. The overlap also covers
  // the two-metre terrain grid, which otherwise leaves a gap before the deck.
  const onBridge = n.s > BRIDGE.from + 4 && n.s < BRIDGE.to - 4;
  if (!onBridge) {
    const shoulder = smoothstep(ROAD_HALF_WIDTH + 1, ROAD_HALF_WIDTH + 14, n.d);
    h = lerp(n.y - 0.05 * smoothstep(0, ROAD_HALF_WIDTH, n.d), h, shoulder);
  }

  // The stream at the ford, a shallow channel the road dips through.
  const df = Math.abs(z - FORD.z(x));
  if (df < FORD.halfWidth + 6 && Math.abs(n.s - FORD.s) < 220) {
    const bed = FORD.y - 0.85 * (1 - (df / FORD.halfWidth) ** 2);
    if (df < FORD.halfWidth) h = Math.min(h, bed);
    else h = Math.min(h, lerp(FORD.y + 0.2, h, smoothstep(FORD.halfWidth, FORD.halfWidth + 6, df)));
  }

  // The lake on the plateau.
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
  if (dl < LAKE.radius + 40) {
    const shore = smoothstep(LAKE.radius - 30, LAKE.radius + 40, dl);
    h = lerp(LAKE.y - 4, h, shore);
  }

  // The stations: level yards beside the road; the road keeps its own grade through them.
  for (const station of STATIONS) {
    const ds = Math.hypot(x - station.x, z - station.z);
    if (ds < station.radius + 30) {
      const yard = lerp(n.y, station.y, smoothstep(ROAD_HALF_WIDTH + 0.5, ROAD_HALF_WIDTH + 10, n.d));
      h = lerp(yard, h, smoothstep(station.radius, station.radius + 30, ds));
    }
  }
  return h;
}

/** Whether a point lies on the road surface. */
const onRoad = (x, z) => nearestRoad(x, z, {}).d < ROAD_HALF_WIDTH;

/** The colour of the ground at a sample, written as linear RGB: soil, tea, grass, rock and snow by height and slope. */
function groundColor(height, slope, x, z, out, n = nearestRoad(x, z, {})) {
  biomeAt(n.s, biome);
  const v = 0.5 + 0.5 * noise2(x / 9, z / 9, 51),
    w = 0.5 + 0.5 * noise2(x / 40, z / 40, 52);
  // Grass and tea in the south, dry grass and scree in the gorge, snow and dark rock above the snow line.
  let r = lerp(0.07, 0.12, v) * biome[0] + lerp(0.16, 0.24, v) * biome[1] + lerp(0.18, 0.25, v) * biome[2];
  let g = lerp(0.16, 0.24, w) * biome[0] + lerp(0.15, 0.2, v) * biome[1] + lerp(0.17, 0.22, w) * biome[2];
  let b = lerp(0.03, 0.06, v) * biome[0] + lerp(0.07, 0.1, v) * biome[1] + lerp(0.12, 0.17, w) * biome[2];
  // Steep ground is bare rock.
  const rock = smoothstep(0.45, 0.75, slope);
  r = lerp(r, 0.2 + 0.06 * v, rock);
  g = lerp(g, 0.19 + 0.05 * v, rock);
  b = lerp(b, 0.18 + 0.05 * v, rock);
  // Snow: above a line that wavers with the ground, and lying on what is not too steep.
  const snowLine = 205 + 25 * noise2(x / 80, z / 80, 53) - 60 * biome[2],
    snow = smoothstep(snowLine, snowLine + 30, height) * (1 - smoothstep(0.55, 0.85, slope)) + biome[2] * 0.35 * (1 - rock);
  r = lerp(r, 0.82, clamp(snow));
  g = lerp(g, 0.85, clamp(snow));
  b = lerp(b, 0.92, clamp(snow));
  // The road: packed earth, darker in its two ruts, muddy by the ford, grey with slush in the snow.
  const road = 1 - smoothstep(ROAD_HALF_WIDTH - 0.5, ROAD_HALF_WIDTH + 1.5, n.d);
  if (road > 0) {
    const rut = 1 - 0.25 * (Math.exp(-(((n.d - 1.3) / 0.45) ** 2)) + 0);
    const rr = lerp(0.24, 0.3, v) * rut,
      rg = lerp(0.17, 0.21, v) * rut,
      rb = lerp(0.1, 0.13, v) * rut;
    r = lerp(r, lerp(rr, 0.5, biome[2] * 0.6), road);
    g = lerp(g, lerp(rg, 0.5, biome[2] * 0.6), road);
    b = lerp(b, lerp(rb, 0.53, biome[2] * 0.6), road);
  }
  out[0] = r;
  out[1] = g;
  out[2] = b;
  return out;
}

/** The share of tea, grass, rock and snow in the ground at a point, for the terrain's texture layers. */
function groundWeights(height, slope, x, z, out = [0, 0, 0, 0]) {
  const n = nearestRoad(x, z, near);
  biomeAt(n.s, biome);
  const rock = smoothstep(0.4, 0.7, slope);
  // Snow caps the slopes well above the road, and lies in patches beside it in the snow leg; never on steep rock.
  const above = height - n.y,
    drift = smoothstep(0.52, 0.72, noise2(x / 38, z / 38, 54) * 0.5 + 0.5 + 0.15 * noise2(x / 9, z / 9, 55)),
    cap = smoothstep(28 - 14 * biome[2], 70 - 20 * biome[2], above) * (0.4 + 0.6 * biome[2] + 0.3 * biome[1]);
  let snow = clamp(cap + biome[2] * 0.85 * drift) * (1 - smoothstep(0.5, 0.85, slope)) * (1 - rock * 0.5);
  const road = 1 - smoothstep(ROAD_HALF_WIDTH - 0.5, ROAD_HALF_WIDTH + 2, n.d);
  snow *= 1 - 0.8 * road;
  let grass = (1 - rock) * (1 - snow),
    soil = road;
  grass *= 1 - road;
  const rest = Math.max(0, 1 - grass - soil - snow);
  out[0] = grass;
  out[1] = soil;
  out[2] = rock * (1 - snow) + rest * 0.5;
  out[3] = snow;
  const total = out[0] + out[1] + out[2] + out[3] || 1;
  for (let i = 0; i < 4; i++) out[i] /= total;
  return out;
}

/**
 * One terrain tile, `size` metres square, centred at (cx, cz): its heights on a grid of `columns` x `columns`
 * samples, row by row from the north-west corner, and the RGBA weights of its four ground layers on a grid of
 * `weightSize` x `weightSize`. The general level of the land is worked out every eight metres and interpolated.
 */
function fillTile(cx, cz, size, columns, weightSize) {
  const half = size / 2,
    step = size / (columns - 1),
    coarse = Math.ceil(size / 8) + 1,
    level = new Float32Array(coarse * coarse);
  for (let j = 0; j < coarse; j++)
    for (let i = 0; i < coarse; i++) level[j * coarse + i] = baseLevel(cx - half + (i * size) / (coarse - 1), cz - half + (j * size) / (coarse - 1));
  const levelAt = (x, z) => {
    const fx = clamp(((x - cx + half) / size) * (coarse - 1), 0, coarse - 1.0001),
      fz = clamp(((z - cz + half) / size) * (coarse - 1), 0, coarse - 1.0001),
      i = Math.floor(fx),
      j = Math.floor(fz),
      tx = fx - i,
      tz = fz - j,
      a = level[j * coarse + i],
      b = level[j * coarse + i + 1],
      c = level[(j + 1) * coarse + i],
      d = level[(j + 1) * coarse + i + 1];
    return lerp(lerp(a, b, tx), lerp(c, d, tx), tz);
  };
  const heights = new Float32Array(columns * columns);
  for (let j = 0; j < columns; j++)
    for (let i = 0; i < columns; i++) {
      const x = cx - half + i * step,
        z = cz - half + j * step;
      heights[j * columns + i] = heightAt(x, z, levelAt(x, z));
    }
  // The ground layers, read from the heights just made: slope from the neighbouring samples.
  const weights = new Uint8Array(weightSize * weightSize * 4),
    w = [0, 0, 0, 0],
    hAt = (x, z) => {
      const fx = clamp((x - cx + half) / step, 0, columns - 1.0001),
        fz = clamp((z - cz + half) / step, 0, columns - 1.0001),
        i = Math.floor(fx),
        j = Math.floor(fz),
        tx = fx - i,
        tz = fz - j;
      return lerp(lerp(heights[j * columns + i], heights[j * columns + i + 1], tx), lerp(heights[(j + 1) * columns + i], heights[(j + 1) * columns + i + 1], tx), tz);
    };
  for (let j = 0; j < weightSize; j++)
    for (let i = 0; i < weightSize; i++) {
      const x = cx - half + ((i + 0.5) * size) / weightSize,
        z = cz - half + ((j + 0.5) * size) / weightSize,
        h = hAt(x, z),
        gx = hAt(x + 1.5, z) - hAt(x - 1.5, z),
        gz = hAt(x, z + 1.5) - hAt(x, z - 1.5),
        slope = Math.hypot(gx, gz) / 3;
      groundWeights(h, slope / Math.hypot(1, slope), x, z, w);
      const o = (j * weightSize + i) * 4;
      weights[o] = w[0] * 255;
      weights[o + 1] = w[1] * 255;
      weights[o + 2] = w[2] * 255;
      weights[o + 3] = w[3] * 255;
    }
  return { heights, weights };
}

/**
 * The far land around the journey, seen beyond the tiles that stream in: the same hills, sunk a little where the tiles
 * will cover them, and lifted into high snow peaks the farther they lie from the road.
 */
function backdropHeight(x, z) {
  const n = nearestRoad(x, z, near),
    h = heightAt(x, z),
    sink = 90 * (1 - smoothstep(420, 1100, n.d)),
    peaks = smoothstep(500, 2600, n.d) * (380 * Math.pow(ridged2(x / 900, z / 900, 5, 71), 1.6) + 60 * fbm2(x / 400, z / 400, 3, 72));
  return h - sink + peaks;
}

/** The far land on a grid of `columns` x `columns` samples over `size` metres, centred at (cx, cz). */
function fillBackdrop(cx, cz, size, columns) {
  const heights = new Float32Array(columns * columns),
    step = size / (columns - 1);
  for (let j = 0; j < columns; j++)
    for (let i = 0; i < columns; i++) heights[j * columns + i] = backdropHeight(cx - size / 2 + i * step, cz - size / 2 + j * step);
  return heights;
}

return {
  fillTile,
  fillBackdrop,
  samples, ROAD_LENGTH, pointAt, directionAt, nearestRoad, heightAt, groundColor, groundWeights, onRoad, biomeAt, legAt,
  STATIONS, BRIDGE, RIVER, FORD, LAKE, AMBUSHES, PASS, LEGS
};
}
