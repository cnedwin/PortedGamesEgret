// 天下的地形，用纯算式得出（不用网页画布）：海岸、江河的河道与水位、湖泊、山脉、高原、沙漠、草原、丘陵、森林、道路、
// 城池与关隘脚下平整的地面。画面用它铺地形，战斗用它判断每一格是平原、树林、山地、江面还是城墙——两者看的是同一片地，
// 所以地图上看到的就是仗里要打的。同样的输入永远得到同样的结果。
// The land of the realm, worked out by formula (no page canvas): the coast, the rivers with their beds and water levels,
// the lakes, mountain ranges, high plateau, desert, steppe, hills, woods, roads, and level ground under every city and
// pass. The picture lays its terrain from it and a battle reads each hex from it — plain, woods, hills, open water or a
// wall — so the ground seen on the map is the ground fought over. The same input always gives the same answer.
import { COAST, ISLANDS, LAKES, RANGES, REGIONS, RIVERS } from '../data/geography.mjs';
import { LINKS, MAP, NODES, project } from '../data/map.mjs';
import { HEX_H, HEX_W, hexAt, hexCenter } from './hexgrid.mjs';

// ——— Noise ———
function hash(ix, iz, seed) {
  let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/** Smooth value noise in 0..1. */
export function noise(x, z, seed = 0) {
  const ix = Math.floor(x),
    iz = Math.floor(z),
    fx = x - ix,
    fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx),
    uz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz, seed),
    b = hash(ix + 1, iz, seed),
    c = hash(ix, iz + 1, seed),
    d = hash(ix + 1, iz + 1, seed);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}
function fbm(x, z, octaves, seed) {
  let sum = 0,
    amp = 0.5,
    norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise(x, z, seed + o * 31) * amp;
    norm += amp;
    x = x * 2.03 + 17.1;
    z = z * 2.03 - 9.4;
    amp *= 0.5;
  }
  return sum / norm;
}
function ridged(x, z, octaves, seed) {
  let sum = 0,
    amp = 0.5,
    norm = 0;
  for (let o = 0; o < octaves; o++) {
    const n = 1 - Math.abs(noise(x, z, seed + o * 57) * 2 - 1);
    sum += n * n * amp;
    norm += amp;
    x = x * 2.1 + 5.3;
    z = z * 2.1 + 3.7;
    amp *= 0.5;
  }
  return sum / norm;
}
const smooth = (a, b, v) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const P = (pt) => {
  const p = project(pt[0], pt[1]);
  return [p.x, p.y];
};

// ——— Shapes in map units ———
/** A Catmull–Rom pass through the points, then a gentle wander across the line so rivers and roads do not run straight. */
function densify(points, step, wander = 0, seed = 0) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)],
      p1 = points[i],
      p2 = points[i + 1],
      p3 = points[Math.min(points.length - 1, i + 2)];
    const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n,
        t2 = t * t,
        t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
      ]);
    }
  }
  out.push(points[points.length - 1].slice());
  if (wander > 0) {
    // Push each inner point across the line by a slow noise, fading at both ends so the line still meets its places.
    let along = 0;
    for (let i = 1; i < out.length - 1; i++) {
      const a = out[i - 1],
        b = out[i + 1];
      along += Math.hypot(out[i][0] - a[0], out[i][1] - a[1]);
      const tx = b[0] - a[0],
        tz = b[1] - a[1],
        len = Math.hypot(tx, tz) || 1;
      const fade = Math.min(1, i / 6, (out.length - 1 - i) / 6);
      const off = (fbm(along / 22, seed * 0.37, 3, seed) - 0.5) * 2 * wander * fade;
      out[i][0] += (-tz / len) * off;
      out[i][1] += (tx / len) * off;
    }
  }
  return out;
}

const pointInPoly = (poly, x, z) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i],
      [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
};
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax,
    dz = bz - az,
    l2 = dx * dx + dz * dz;
  let t = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = ax + dx * t - px,
    qz = az + dz * t - pz;
  SEG_T = t;
  return Math.sqrt(qx * qx + qz * qz);
}
let SEG_T = 0;

// ——— Buckets: every feature listed in the cells it reaches ———
const CELL = 32;
const GX = Math.ceil(MAP.width / CELL) + 2,
  GZ = Math.ceil(MAP.height / CELL) + 2;
const cellIndex = (x, z) => {
  const cx = Math.min(GX - 1, Math.max(0, Math.floor(x / CELL) + 1)),
    cz = Math.min(GZ - 1, Math.max(0, Math.floor(z / CELL) + 1));
  return cz * GX + cx;
};
function makeBuckets() {
  return Array.from({ length: GX * GZ }, () => null);
}
function addToBuckets(buckets, item, x0, z0, x1, z1) {
  const c0 = Math.max(0, Math.floor(x0 / CELL) + 1),
    c1 = Math.min(GX - 1, Math.floor(x1 / CELL) + 1),
    r0 = Math.max(0, Math.floor(z0 / CELL) + 1),
    r1 = Math.min(GZ - 1, Math.floor(z1 / CELL) + 1);
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      const k = r * GX + c;
      (buckets[k] ??= []).push(item);
    }
}

// The land: the coast from the north-east round to the south-west, closed through the far corners on the land side.
const COAST_LINE = COAST.map(P);
const LAND_POLY = [...COAST_LINE, P([90, 17.2]), P([90, 46]), P([126, 46])];
const ISLAND_POLYS = ISLANDS.map((line) => line.map(P));
const SHORE = 26; // how far inland the land rises from the shore
const coastSegs = [];
for (let i = 0; i < COAST_LINE.length - 1; i++) coastSegs.push([...COAST_LINE[i], ...COAST_LINE[i + 1]]);
for (const poly of ISLAND_POLYS) for (let i = 0; i < poly.length; i++) coastSegs.push([...poly[i], ...poly[(i + 1) % poly.length]]);
const coastBuckets = makeBuckets();
for (const s of coastSegs) addToBuckets(coastBuckets, s, Math.min(s[0], s[2]) - SHORE, Math.min(s[1], s[3]) - SHORE, Math.max(s[0], s[2]) + SHORE, Math.max(s[1], s[3]) + SHORE);
const isLand = (x, z) => pointInPoly(LAND_POLY, x, z) || ISLAND_POLYS.some((p) => pointInPoly(p, x, z));
// Whether each cell's centre is land, for points far from any shore.
const cellLand = new Uint8Array(GX * GZ);
for (let r = 0; r < GZ; r++) for (let c = 0; c < GX; c++) cellLand[r * GX + c] = isLand((c - 0.5) * CELL, (r - 0.5) * CELL) ? 1 : 0;

/** Signed distance to the shore: positive on land, negative at sea (capped at the shore band). */
function coastDistance(x, z) {
  const k = cellIndex(x, z),
    list = coastBuckets[k];
  if (!list) return cellLand[k] ? SHORE : -SHORE;
  let d = SHORE;
  for (const s of list) {
    const v = segDist(x, z, s[0], s[1], s[2], s[3]);
    if (v < d) d = v;
  }
  return isLand(x, z) ? d : -d;
}

// The mountains: ridge lines, each reaching out by its height.
const ridgeSegs = [];
const ridgeBuckets = makeBuckets();
for (const range of RANGES) {
  const line = densify(range.line.map(P), 10, 8, range.height * 13);
  const reach = 20 + range.height * 13;
  for (let i = 0; i < line.length - 1; i++) {
    const s = { ax: line[i][0], az: line[i][1], bx: line[i + 1][0], bz: line[i + 1][1], height: range.height, reach };
    ridgeSegs.push(s);
    addToBuckets(ridgeBuckets, s, Math.min(s.ax, s.bx) - reach, Math.min(s.az, s.bz) - reach, Math.max(s.ax, s.bx) + reach, Math.max(s.az, s.bz) + reach);
  }
}

// Plateau, desert and steppe, each with a soft edge.
const REGION_EDGE = 45;
const regions = REGIONS.map((r, i) => ({ kind: r.kind, poly: r.line.map(P), high: r.kind === 'plateau' ? (i === 0 ? 13 : 5.5) : r.kind === 'desert' ? 2.2 : 1.6 }));
const regionBuckets = makeBuckets();
for (const region of regions) {
  const xs = region.poly.map((p) => p[0]),
    zs = region.poly.map((p) => p[1]);
  addToBuckets(regionBuckets, region, Math.min(...xs) - REGION_EDGE, Math.min(...zs) - REGION_EDGE, Math.max(...xs) + REGION_EDGE, Math.max(...zs) + REGION_EDGE);
}
function regionShare(region, x, z) {
  let d = REGION_EDGE;
  const poly = region.poly;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const v = segDist(x, z, poly[j][0], poly[j][1], poly[i][0], poly[i][1]);
    if (v < d) d = v;
  }
  const inside = pointInPoly(poly, x, z);
  return inside ? 0.5 + 0.5 * (d / REGION_EDGE) : 0.5 - 0.5 * (d / REGION_EDGE);
}

// ——— Cities, passes and ports: the level ground they stand on ———
/** Half-size of a city's walls in hexes across (columns) and down (rows), by its size. */
const WALL_SIZE = { 1: [2, 2], 2: [2, 2], 3: [3, 2], 4: [3, 3], 5: [4, 3] };
/** Where every walled place stands on the realm's hexes: the keep's hex and the walls' half-size. */
export const FOOTPRINTS = {};
for (const n of Object.values(NODES)) {
  const [kc, kr] = hexAt(n.x, n.y);
  const c = hexCenter(kc, kr);
  const [a, b] = n.kind === 'city' ? WALL_SIZE[n.size] : n.kind === 'pass' ? [1, 1] : [1, 1];
  FOOTPRINTS[n.id] = { id: n.id, kind: n.kind, kc, kr, x: c.x, z: c.z, a, b, halfX: (a + 0.5) * HEX_W, halfZ: (b + 0.5) * HEX_H };
}
const placeBuckets = makeBuckets();
for (const f of Object.values(FOOTPRINTS)) addToBuckets(placeBuckets, f, f.x - f.halfX - 14, f.z - f.halfZ - 14, f.x + f.halfX + 14, f.z + f.halfZ + 14);

/**
 * Whether realm hex (c, r) lies inside a place's walls: 'keep', 'wall' (on the ring), 'town' (within), or null.
 * The walls are a rectangle of hexes around the keep: `a` columns each side and `b` rows above and below.
 */
export function footprintCell(f, c, r) {
  const dr = r - f.kr;
  if (Math.abs(dr) > f.b) return null;
  const dx = c - f.kc + ((r & 1) - (f.kr & 1)) / 2;
  if (Math.abs(dx) > f.a) return null;
  if (dx === 0 && dr === 0) return 'keep';
  const edge = Math.abs(dr) === f.b || Math.abs(dx) > f.a - 1;
  return edge ? 'wall' : 'town';
}
/** The walled place a realm hex belongs to, if any. */
export function placeOfHex(c, r) {
  const { x, z } = hexCenter(c, r);
  for (const f of placeBuckets[cellIndex(x, z)] ?? []) {
    const cell = footprintCell(f, c, r);
    if (cell) return { place: f, cell };
  }
  return null;
}

// ——— Roads ———
/** Every road between two places, as a wandering line in map units. */
export const ROADS = [];
const roadBuckets = makeBuckets();
for (const link of LINKS) {
  if (link.kind !== 'land') continue;
  const a = NODES[link.a],
    b = NODES[link.b];
  const seed = (a.x * 7 + b.y * 13) | 0;
  const mid = [(a.x + b.x) / 2, (a.y + b.y) / 2];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const bend = (noise(seed * 0.01, 3.3, 7) - 0.5) * 0.16 * len;
  mid[0] += (-(b.y - a.y) / len) * bend;
  mid[1] += ((b.x - a.x) / len) * bend;
  const line = densify([[a.x, a.y], mid, [b.x, b.y]], 3, Math.min(5, len * 0.03), seed);
  const road = { a: link.a, b: link.b, line };
  ROADS.push(road);
  for (let i = 0; i < line.length - 1; i++) {
    const s = [line[i][0], line[i][1], line[i + 1][0], line[i + 1][1]];
    addToBuckets(roadBuckets, s, Math.min(s[0], s[2]) - 10, Math.min(s[1], s[3]) - 10, Math.max(s[0], s[2]) + 10, Math.max(s[1], s[3]) + 10);
  }
}
function roadDistance(x, z) {
  let d = 10;
  for (const s of roadBuckets[cellIndex(x, z)] ?? []) {
    const v = segDist(x, z, s[0], s[1], s[2], s[3]);
    if (v < d) d = v;
  }
  return d;
}

// ——— The ground before water: lowland, hills, plateau and mountains ———
const MOUNTAIN_SCALE = 6.2;
/** Height and make-up of the ground before rivers and lakes are cut into it. `out` gets the parts. */
function ground(x, z, out) {
  const shore = coastDistance(x, z);
  out.shore = shore;
  // Regions.
  let plateau = 0,
    desert = 0,
    steppe = 0,
    lift = 0;
  for (const region of regionBuckets[cellIndex(x, z)] ?? []) {
    const s = smooth(0, 1, regionShare(region, x, z));
    if (!s) continue;
    if (region.kind === 'plateau') plateau = Math.max(plateau, s * (region.high > 10 ? 1 : 0.55));
    else if (region.kind === 'desert') desert = Math.max(desert, s);
    else steppe = Math.max(steppe, s);
    lift = Math.max(lift, s * region.high);
  }
  // The land climbs in steps toward the west.
  const west = smooth(1900, 1150, x) * 3.2 + smooth(1150, 700, x) * 2.5;
  // Rolling lowland, with hill country where a slow noise says so.
  const hilly = smooth(0.52, 0.78, fbm(x / 190, z / 190, 3, 11));
  let h = 0.7 + fbm(x / 70, z / 70, 3, 3) * 1.6 + west + hilly * (fbm(x / 16, z / 16, 4, 5) * 5.5 + 0.8) + lift;
  // Plateau ground is broken and high; desert has dunes.
  if (plateau > 0) h += plateau * (ridged(x / 30, z / 30, 4, 21) * 7 - 1.5);
  if (desert > 0) h += desert * (Math.abs(Math.sin(x / 5.5 + fbm(x / 30, z / 30, 2, 41) * 6)) * 0.7 - 0.3);
  // Mountains.
  let m = 0;
  const pass = passNear(x, z);
  for (const s of ridgeBuckets[cellIndex(x, z)] ?? []) {
    const d = segDist(x, z, s.ax, s.az, s.bx, s.bz);
    if (d >= s.reach) continue;
    const t = d / s.reach,
      v = s.height * (1 - t * t) * (1 - t * t);
    if (v > m) m = v;
  }
  // Roads and passes open valleys through the ranges.
  const road = roadDistance(x, z);
  out.road = road;
  m *= 1 - 0.55 * smooth(14, 2, road);
  m *= 1 - 0.8 * pass;
  const rock = ridged(x / 38, z / 38, 5, 9);
  const mountain = m * MOUNTAIN_SCALE * (0.35 + 0.85 * rock) + m * fbm(x / 9, z / 9, 3, 13) * 1.6;
  h += mountain;
  // Toward the sea the land sinks to the beach; out at sea is the sea floor.
  if (shore < SHORE) {
    const t = smooth(-1, SHORE, shore);
    const sea = -1.2 - Math.min(7, Math.max(0, -shore) * 0.25);
    h = shore > 0 ? 0.35 + (h - 0.35) * t : sea + (0.35 - sea) * smooth(-6, 0, shore);
  }
  out.plateau = plateau;
  out.desert = desert;
  out.steppe = steppe;
  out.mountain = mountain;
  out.hilly = hilly;
  return h;
}
function passNear(x, z) {
  let v = 0;
  for (const f of placeBuckets[cellIndex(x, z)] ?? []) {
    if (f.kind !== 'pass' && f.kind !== 'city') continue;
    const d = Math.hypot(x - f.x, z - f.z);
    const reach = f.kind === 'pass' ? 16 : f.halfX + 8;
    if (d < reach) v = Math.max(v, smooth(reach, reach * 0.4, d));
  }
  return v;
}

// ——— Rivers and lakes ———
/** River width in map units from the data's 1 (a stream) to 3 (a great river). */
const riverWidth = (w) => 1.2 + w * 1.95;
const BANK = 4;
/** Every river as dense points from source to mouth, each with its half-width and water level. */
export const RIVER_LINES = [];
const riverBuckets = makeBuckets();
{
  const scratch = {};
  const footprints = Object.values(FOOTPRINTS).filter((f) => f.kind !== 'port');
  for (const river of [...RIVERS].sort((a, b) => b.width - a.width)) {
    const half = riverWidth(river.width) / 2;
    const points = densify(river.line.map(P), 2, 2.5 + river.width, river.name.length * 97);
    // Rivers pass beside the walls rather than through them: where a river runs into a footprint, the stretch near it
    // bows out to the far side in one smooth curve, just enough to clear the walls.
    for (const f of footprints) {
      let k = -1,
        best = Infinity;
      for (let i = 0; i < points.length; i++) {
        const d = Math.hypot(points[i][0] - f.x, points[i][1] - f.z);
        if (d < best) (best = d), (k = i);
      }
      const ex = f.halfX + half + 2.5,
        ez = f.halfZ + half + 2.5;
      const inside = (p) => Math.abs(p[0] - f.x) < ex && Math.abs(p[1] - f.z) < ez;
      if (best > Math.hypot(ex, ez) + 4 || !points.some(inside)) continue;
      const a = points[Math.max(0, k - 6)],
        b = points[Math.min(points.length - 1, k + 6)];
      const tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = -(b[1] - a[1]) / tl,
        nz = (b[0] - a[0]) / tl;
      const side = (f.x - points[k][0]) * nx + (f.z - points[k][1]) * nz >= 0 ? -1 : 1;
      const along = [0];
      for (let i = 1; i < points.length; i++) along.push(along[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
      const sigma = Math.hypot(ex, ez) * 1.5;
      const weight = (i) => Math.exp(-((along[i] - along[k]) ** 2) / (2 * sigma * sigma));
      const moved = (D) => points.map((p, i) => [p[0] + nx * side * D * weight(i), p[1] + nz * side * D * weight(i)]);
      let lo = 0,
        hi = Math.hypot(ex, ez) * 2.5;
      for (let it = 0; it < 18; it++) {
        const mid = (lo + hi) / 2;
        if (moved(mid).some(inside)) lo = mid;
        else hi = mid;
      }
      const next = moved(hi);
      for (let i = 0; i < points.length; i++) points[i] = next[i];
    }
    // The water level falls from source to mouth and never rises.
    const levels = [];
    let level = Infinity;
    for (const p of points) {
      const h = flatten(p[0], p[1], ground(p[0], p[1], scratch), scratch);
      level = Math.min(level, h - 0.5);
      levels.push(Math.max(scratch.shore < 4 ? -0.05 : 0.08, level));
    }
    // Where a smaller river meets a greater one, it comes down to the greater one's level.
    const end = points[points.length - 1];
    for (const other of RIVER_LINES) {
      let best = Infinity,
        at = -1;
      for (let i = 0; i < other.points.length; i++) {
        const d = Math.hypot(other.points[i][0] - end[0], other.points[i][1] - end[1]);
        if (d < best) (best = d), (at = i);
      }
      if (best < other.half + half + 3) {
        const target = other.levels[at];
        const n = Math.min(20, levels.length);
        for (let k = 0; k < n; k++) {
          const i = levels.length - 1 - k,
            w = 1 - k / n;
          levels[i] = Math.min(levels[i], target + (levels[i] - target) * (1 - w));
        }
      }
    }
    const line = { name: river.name, half, points, levels };
    RIVER_LINES.push(line);
    for (let i = 0; i < points.length - 1; i++) {
      const s = { line, i, ax: points[i][0], az: points[i][1], bx: points[i + 1][0], bz: points[i + 1][1] };
      const r = half + BANK + 1;
      addToBuckets(riverBuckets, s, Math.min(s.ax, s.bx) - r, Math.min(s.az, s.bz) - r, Math.max(s.ax, s.bx) + r, Math.max(s.az, s.bz) + r);
    }
  }
}
/** Lakes as smoothed outlines, each with its level. */
export const LAKE_SHAPES = [];
const lakeBuckets = makeBuckets();
{
  const scratch = {};
  for (const lake of LAKES) {
    let poly = lake.line.map(P);
    // Two rounds of corner cutting make the outline round.
    for (let round = 0; round < 3; round++) {
      const next = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i],
          b = poly[(i + 1) % poly.length];
        next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      poly = next;
    }
    const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length,
      cz = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    let level = Infinity;
    for (const p of poly) level = Math.min(level, ground(p[0], p[1], scratch));
    const shape = { zh: lake.zh, en: lake.en, poly, level: Math.max(0.05, level - 0.4), cx, cz };
    LAKE_SHAPES.push(shape);
    const xs = poly.map((p) => p[0]),
      zs = poly.map((p) => p[1]);
    addToBuckets(lakeBuckets, shape, Math.min(...xs) - 8, Math.min(...zs) - 8, Math.max(...xs) + 8, Math.max(...zs) + 8);
  }
}

/** The land mask for district colours; rivers render separately above the terrain. */
export function isTerritoryLand(x, z) {
  return coastDistance(x, z) >= 0 && !(lakeBuckets[cellIndex(x, z)] ?? []).some(lake => pointInPoly(lake.poly, x, z));
}

// ——— The whole land at a point ———
/**
 * Everything about the land at a map point, written into `out` (and returned): `height`, `water` (0 none, 1 sea,
 * 2 lake, 3 river), `level` (the water's surface there), `river` (how far into the river's half-width, 0 at its middle,
 * 1 at its bank), `shore`, `mountain`, `plateau`, `desert`, `steppe`, `hilly`, `forest` (0..1), `marsh` (0..1),
 * `road` (distance to the nearest road) and `place` (0..1, the level ground of a city or pass).
 */
export function landAt(x, z, out = {}) {
  let h = flatten(x, z, ground(x, z, out), out);
  out.water = out.shore < 0 ? 1 : 0;
  out.level = 0;
  out.river = 2;
  // Rivers cut their beds and lower their banks.
  let best = Infinity,
    bestLevel = 0,
    bestHalf = 1;
  for (const s of riverBuckets[cellIndex(x, z)] ?? []) {
    const d = segDist(x, z, s.ax, s.az, s.bx, s.bz);
    if (d - s.line.half < best - bestHalf) {
      best = d;
      bestHalf = s.line.half;
      bestLevel = s.line.levels[s.i] + (s.line.levels[s.i + 1] - s.line.levels[s.i]) * SEG_T;
    }
  }
  if (best < bestHalf + BANK) {
    const t = best / bestHalf;
    if (t < 1) {
      const bed = bestLevel - 0.35 - 1.1 * (1 - t * t);
      h = Math.min(h, bed);
      if (out.water !== 1) {
        out.water = 3;
        out.level = bestLevel;
      }
    } else {
      const bank = bestLevel + 0.12 + (best - bestHalf) * (best - bestHalf) * 0.32;
      h = Math.min(h, bank);
    }
    out.river = t;
  }
  // Lakes.
  for (const lake of lakeBuckets[cellIndex(x, z)] ?? []) {
    if (pointInPoly(lake.poly, x, z)) {
      let d = Infinity;
      const poly = lake.poly;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) d = Math.min(d, segDist(x, z, poly[j][0], poly[j][1], poly[i][0], poly[i][1]));
      h = Math.min(h, lake.level - 0.3 - Math.min(1.6, d * 0.25));
      out.water = 2;
      out.level = lake.level;
    } else {
      let d = Infinity;
      const poly = lake.poly;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) d = Math.min(d, segDist(x, z, poly[j][0], poly[j][1], poly[i][0], poly[i][1]));
      if (d < 6) h = Math.min(h, lake.level + 0.1 + d * d * 0.08);
    }
  }
  const place = out.place;
  if (place > 0.95 && out.water !== 1) out.water = 0;
  // Woods: wetter to the south, on the slopes of the ranges, thinner on farmland near towns and none in dry country.
  const south = smooth(1200, 2100, z);
  const dry = Math.max(out.desert, out.steppe * 0.8, out.plateau * 0.6);
  const wood = fbm(x / 34, z / 34, 4, 77);
  const thr = 0.6 - south * 0.13 - Math.min(0.2, out.mountain * 0.03) + dry * 0.45 + place * 0.5 + smooth(6, 0, out.road) * 0.1;
  out.forest = out.water ? 0 : smooth(thr, thr + 0.08, wood) * (1 - smooth(14, 22, out.mountain));
  // Marsh by lakes and the lower rivers of the south.
  out.marsh = out.water ? 0 : smooth(0.62, 0.74, fbm(x / 22, z / 22, 3, 55)) * smooth(2.2, 0.6, h) * (0.4 + south * 0.6);
  out.height = h;
  return out;
}
function placeLevel(f) {
  const s = {};
  const h = ground(f.x, f.z, s);
  return Math.max(0.5, h);
}
/** Level ground under cities and passes, blended into the land around them. Writes `out.place`. */
function flatten(x, z, h, out) {
  let place = 0;
  for (const f of placeBuckets[cellIndex(x, z)] ?? []) {
    const dx = Math.max(0, Math.abs(x - f.x) - f.halfX),
      dz = Math.max(0, Math.abs(z - f.z) - f.halfZ);
    const d = Math.hypot(dx, dz);
    const reach = f.kind === 'port' ? 3 : 7;
    if (d >= reach) continue;
    const w = smooth(reach, 0.5, d);
    if (w > place) {
      place = w;
      const flat = f.level ?? (f.level = placeLevel(f));
      h = h + (flat - h) * w;
    }
  }
  out.place = place;
  return h;
}

/** The height of the land (not the water) at a map point. */
export function heightAt(x, z) {
  return landAt(x, z, HEIGHT_SCRATCH).height;
}
const HEIGHT_SCRATCH = {};

/** The ground of realm hex (c, r) for a battle: a key of the battle terrain table. */
export function hexKind(c, r) {
  const at = placeOfHex(c, r);
  if (at) return at.cell === 'keep' ? 'town' : at.cell;
  const { x, z } = hexCenter(c, r);
  const s = landAt(x, z, KIND_SCRATCH);
  if (s.water === 1 || s.water === 2) return 'water';
  // Where a road meets a river there is a bridge or a ford.
  if (s.water === 3) return s.road < 1.6 ? 'river' : s.river < 0.6 ? 'water' : 'river';
  if (s.river < 1.25) return 'river';
  if (s.mountain > 9 || s.plateau > 0.6) return 'mountain';
  if (s.mountain > 3.2 || s.hilly > 0.55) return 'hill';
  if (s.road < 1.4) return 'road';
  if (s.forest > 0.5) return 'forest';
  if (s.marsh > 0.5) return 'marsh';
  if (s.steppe > 0.5 || s.desert > 0.5) return 'grass';
  return 'plain';
}
const KIND_SCRATCH = {};

export { HEX_W, HEX_H };
