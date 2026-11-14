// The realm as a model on a table: mountains, plains, two great rivers, a
// lake and the sea, with every stronghold built on it, roads between them,
// forests, farmland, a wall along the northern frontier and boats on the
// water. Each sect's lands are tinted in its colour and edged where they meet
// another's.
//
// The land is made from rules and the map's own data (data/places.mjs), so
// it always agrees with where the strongholds are. The scene reads the world
// and never changes it; `refresh` repaints the lands and banners when
// strongholds have changed hands.
import { InstancedMesh3D, Mesh3D, Object3D, Scene3D, createGeometry3D, createPerspectiveCamera3D, createStandardMaterial3D, quatFromEuler } from '@egret/engine/world3d';
import { PLACES, PLACE_BY_ID } from '../data/places.mjs';
import { SECT_BY_ID } from '../data/sects.mjs';
import { createBuilding } from './buildings.mjs';
import { BALL, BOX, PYRAMID, ROD, SPIKE, TAPER, TOON, build, hexOf, mix, model, rgb, scatter, shade } from './shapes.mjs';
import { lightScene } from './stage.mjs';

/** Metres of the model for one step of the map's 0 to 100 grid. */
const S = 3;
/** The land is modelled a little beyond the map on every side. */
const SPAN = 132;
/** How fine the land is, how many trees stand on it and how much is built, by picture quality. */
const DETAIL = { high: { grid: 320, trees: 16000, towns: 3 }, medium: { grid: 240, trees: 9000, towns: 2 }, low: { grid: 140, trees: 2600, towns: 1 } };

const CITIES = new Set(['shuntian', 'yingtian', 'yangzhou', 'yuzhou', 'quanzhou']);
const TOWNS = new Set(['dongting', 'lingnan', 'guilin', 'dali']);
const kindOf = (id) => (CITIES.has(id) ? 'city' : TOWNS.has(id) ? 'town' : 'mountain');
/** The height each kind of stronghold stands at. */
const GROUND = { city: 1.5, town: 1.8, mountain: 6.5 };

/** Rounds the corners of a path of straight pieces, keeping its two ends. */
function rounded(path, times = 3) {
  for (let pass = 0; pass < times; pass++) {
    const next = [path[0]];
    for (let i = 0; i < path.length - 1; i++) {
      const [ax, ay] = path[i],
        [bx, by] = path[i + 1];
      next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    next.push(path[path.length - 1]);
    path = next;
  }
  return path;
}
/** The two great rivers, as points on the map's grid, from source to sea. */
const RIVERS = [
  [[8, 49], [20, 53], [30, 62], [37, 60.5], [43, 60.5], [50, 63], [57, 65.5], [63, 64], [68, 57], [73, 52.5], [78, 48.5], [84, 47.5], [96, 46]],
  [[6, 27], [18, 29], [28, 24], [38, 21], [44, 26], [47.5, 32], [53, 35], [61, 34], [68, 29], [78, 27.5], [96, 25]],
].map((path) => rounded(path));
/** The lake beside Dongting, as [u, v, radius]. */
const LAKE = [61.5, 65.5, 3.4];
/** The frontier wall, west to east. */
const WALL = [[30, 15], [40, 12], [50, 14], [60, 11.5], [70, 13], [80, 10.5]];
/** Where boats sail: down the long river, and along the coast. */
const SAILS = [RIVERS[0].slice(Math.floor(RIVERS[0].length * 0.24)), [[93, 40], [92, 55], [90, 68], [85, 80], [72, 92], [60, 94]]];

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const lerp = (a, b, t) => a + (b - a) * t;

/** Smooth noise from 0 to 1, the same everywhere for the same point. */
function noise(x, y) {
  const hash = (i, j) => {
    const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const ix = Math.floor(x),
    iy = Math.floor(y),
    fx = smooth(x - ix),
    fy = smooth(y - iy);
  return lerp(lerp(hash(ix, iy), hash(ix + 1, iy), fx), lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), fx), fy);
}
const rough = (x, y) => noise(x, y) * 0.5 + noise(x * 2.1, y * 2.1) * 0.27 + noise(x * 4.3, y * 4.3) * 0.15 + noise(x * 8.9, y * 8.9) * 0.08;

/** The distance from a point to a path of straight pieces. */
function awayFrom(path, u, v) {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, ay] = path[i],
      [bx, by] = path[i + 1];
    const dx = bx - ax,
      dy = by - ay;
    const t = Math.max(0, Math.min(1, ((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(u - ax - dx * t, v - ay - dy * t));
  }
  return best;
}
/** The point a share `t` of the way along a path, and the way it is heading there. */
function along(path, t) {
  const lengths = path.slice(1).map(([x, y], i) => Math.hypot(x - path[i][0], y - path[i][1]));
  let left = t * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i] || i === lengths.length - 1) {
      const k = Math.min(1, left / lengths[i]);
      return { u: lerp(path[i][0], path[i + 1][0], k), v: lerp(path[i][1], path[i + 1][1], k), heading: Math.atan2(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]) };
    }
    left -= lengths[i];
  }
}

/** How far inland a point is, in grid steps; below zero is sea. The coast runs down the east and along the south. */
const inland = (u, v) => Math.min(91 + 3 * Math.sin(v * 0.11) - Math.max(0, v - 62) * 0.22 - u, 91 + 2.5 * Math.sin(u * 0.13) - v, u + 30, v + 30) + (noise(u * 0.4, v * 0.4) - 0.5) * 5;

/** The height of the land at a point of the map's grid, in metres of the model; the sea is at zero. */
function heightOf(u, v) {
  const n = rough(u * 0.11, v * 0.11),
    ridge = 1 - Math.abs(2 * rough(u * 0.06 + 7.3, v * 0.06 + 3.1) - 1);
  // Where the mountains are: the western highlands, the southern hills, and round every mountain seat.
  let mountains = 0.5 * smooth((36 - u) / 28) + 0.22 * smooth((v - 52) / 22) * smooth((72 - u) / 30) + 0.12;
  let flat = 0;
  for (const place of PLACES) {
    const d = Math.hypot(u - place.at.x, v - place.at.y),
      kind = kindOf(place.id);
    if (kind === 'mountain') mountains += Math.exp(-((d / (place.id === 'kunlun' ? 15 : 8)) ** 2)) * (place.id === 'kunlun' || place.id === 'changbai' ? 1.1 : 0.75);
    else flat = Math.max(flat, Math.exp(-((d / 8) ** 2)));
  }
  mountains = Math.min(1.5, mountains) * (1 - 0.85 * flat);
  let y = 1.3 + n * 1.5 + mountains * (3 + ridge * ridge * 13.5);
  y = lerp(-4 + n * 1.5, y, smooth(inland(u, v) / 5));
  // The rivers and the lake cut down to the water.
  for (const river of RIVERS) {
    const d = awayFrom(river, u, v);
    if (d < 3) y = lerp(Math.min(y, -0.5), y, smooth((d - 0.5) / 2.4));
  }
  const lake = Math.hypot(u - LAKE[0], (v - LAKE[1]) * 1.25);
  if (lake < LAKE[2] + 2) y = lerp(Math.min(y, -0.6), y, smooth((lake - LAKE[2] + 0.6) / 2));
  // Every stronghold stands on level ground.
  for (const place of PLACES) {
    const d = Math.hypot(u - place.at.x, v - place.at.y);
    if (d < 3.6) y = lerp(GROUND[kindOf(place.id)] + (place.id === 'kunlun' ? 3 : 0), y, smooth((d - 1.5) / 2.1));
  }
  return y;
}

/** The colour of the land before any sect's tint: by height, by how far north or west, with fields round the towns. */
function landColour(u, v, y) {
  const speckle = noise(u * 1.7, v * 1.7);
  if (y < -0.05) return mix(0x6f907e, 0x3d6470, Math.min(1, -y / 2.5));
  if (y < 0.45) return mix(0xb3a981, 0xa59a72, speckle);
  const snowLine = 19.5 - Math.max(0, 30 - v) * 0.32 + speckle * 1.6;
  if (y > snowLine) return mix(0xe6ebee, 0xffffff, speckle);
  const dry = smooth((30 - u) / 22) * 0.85 + smooth((24 - v) / 20) * 0.45;
  let grass = mix(mix(0x66784a, 0x4b6443, smooth((v - 40) / 40)), 0x8a7d5c, Math.min(1, dry));
  grass = shade(grass, 0.88 + speckle * 0.24);
  // Fields in strips and squares on the low ground near towns and cities.
  let near = 99;
  for (const place of PLACES) if (kindOf(place.id) !== 'mountain') near = Math.min(near, Math.hypot(u - place.at.x, v - place.at.y));
  if (y < 2.6 && near < 7.5 && near > 1.6) {
    const patch = Math.sin(Math.floor(u * 1.4) * 12.9898 + Math.floor(v * 1.4) * 78.233) * 43758.5453;
    const pick = patch - Math.floor(patch);
    grass = mix(grass, pick < 0.3 ? 0x9c9156 : pick < 0.6 ? 0x76874a : pick < 0.8 ? 0x5f7341 : 0x8c7d56, 0.75 * smooth((7.5 - near) / 2));
  }
  if (y > 7.5) return mix(grass, mix(0x7b7668, 0x625e56, speckle), smooth((y - 7.5) / 6));
  return grass;
}

/**
 * @param stage  the stage from stage.mjs
 * @param world  gives the world; read, never changed
 * @param options.layer  an element over the canvas for the strongholds' name tags
 */
export function createRealm(stage, world, { layer = null } = {}) {
  const detail = DETAIL[stage.quality] ?? DETAIL.medium;
  const scene = new Scene3D();
  const camera = createPerspectiveCamera3D({ fov: 38, near: 4, far: 1400 });
  scene.addChild(camera);
  // The whole model is seen from above in full sun, so the lights are turned down a little.
  const light = lightScene(scene, 'day', stage.quality, { sun: 0.76, fill: 0.72 });
  scene.fog = { ...scene.fog, near: 330, far: 1100 };
  if (light.sun.shadow) light.sun.shadow.cascadeDistance = 300;
  const random = scatter(20261114);

  // ---- the land: heights once, colours whenever lands change hands ----------------------------------------
  const n = detail.grid,
    step = (SPAN / n) * S,
    gridU = (i) => 50 - SPAN / 2 + (i / n) * SPAN;
  const heights = new Float32Array((n + 1) * (n + 1));
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) heights[j * (n + 1) + i] = heightOf(gridU(i), gridU(j));
  /** The height of the land under a point of the model. */
  const groundAt = (x, z) => {
    const fi = Math.max(0, Math.min(n - 0.001, ((x / S + SPAN / 2) / SPAN) * n)),
      fj = Math.max(0, Math.min(n - 0.001, ((z / S + SPAN / 2) / SPAN) * n));
    const i = Math.floor(fi),
      j = Math.floor(fj),
      a = j * (n + 1) + i;
    return lerp(lerp(heights[a], heights[a + 1], fi - i), lerp(heights[a + n + 1], heights[a + n + 2], fi - i), fj - j);
  };
  const positions = [],
    normals = [],
    indices = [],
    base = [];
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) {
      const y = heights[j * (n + 1) + i];
      positions.push((gridU(i) - 50) * S, y, (gridU(j) - 50) * S);
      const dx = (heights[j * (n + 1) + Math.min(n, i + 1)] - heights[j * (n + 1) + Math.max(0, i - 1)]) / (2 * step),
        dz = (heights[Math.min(n, j + 1) * (n + 1) + i] - heights[Math.max(0, j - 1) * (n + 1) + i]) / (2 * step),
        length = Math.hypot(dx, 1, dz);
      normals.push(-dx / length, 1 / length, -dz / length);
      // Steep ground shows its rock.
      const colour = landColour(gridU(i), gridU(j), y);
      base.push(y > 0.5 && length > 1.45 ? mix(colour, 0x6b675c, Math.min(0.85, (length - 1.45) * 1.6)) : colour);
    }
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i;
      indices.push(a, a + n + 1, a + 1, a + 1, a + n + 1, a + n + 2);
    }
  // The land is shaded smoothly, unlike the figures and buildings, so that slopes read as slopes.
  const landMaterial = createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 0.96, metallic: 0 });
  let land = null;
  function paintLand() {
    const owners = PLACES.map((place) => ({ u: place.at.x, v: place.at.y, owner: world().places[place.id].owner }));
    const colors = new Float32Array(base.length * 3);
    for (let j = 0; j <= n; j++)
      for (let i = 0; i <= n; i++) {
        const k = j * (n + 1) + i,
          u = gridU(i),
          v = gridU(j);
        let colour = base[k];
        if (heights[k] > 0.3) {
          // The nearest stronghold claims the ground; where two sects' claims meet there is an edge.
          let first = null,
            second = null,
            d1 = 99,
            d2 = 99;
          for (const place of owners) {
            const d = Math.hypot(u - place.u, v - place.v);
            if (d < d1) (second = first), (d2 = d1), (first = place), (d1 = d);
            else if (d < d2) (second = place), (d2 = d);
          }
          if (first.owner && d1 < 14.6) {
            const tint = hexOf(SECT_BY_ID[first.owner].color);
            // Stronger toward the edge of the claim, like a wash laid inside a drawn line.
            const edge = second && second.owner !== first.owner ? 0.2 * smooth(1 - (d2 - d1) / 3) : 0.2 * smooth((d1 - 11) / 3.6);
            colour = mix(colour, shade(tint, 0.9), 0.2 + edge);
          }
        }
        const c = rgb(colour);
        colors[k * 3] = c[0];
        colors[k * 3 + 1] = c[1];
        colors[k * 3 + 2] = c[2];
      }
    if (land) scene.removeChild(land);
    land = new Mesh3D(createGeometry3D({ positions, normals, colors, indices }), landMaterial);
    land.receiveShadow = true;
    land.castShadow = stage.quality === 'high';
    scene.addChild(land);
  }

  // The water is one sheet at sea level; the rivers and the lake are where the land dips under it.
  const water = new Mesh3D(createGeometry3D({ positions: [-900, 0, -900, 900, 0, -900, -900, 0, 900, 900, 0, 900], normals: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], indices: [0, 2, 1, 1, 2, 3] }), createStandardMaterial3D({ color: 0x2c6488, roughness: 0.4, metallic: 0, opacity: 0.9, alphaMode: 'blend' }));
  scene.addChild(water);

  /** Adds a flat ribbon along `points` ([x, y, z] each) to the lists of a mesh being built. */
  const ribbon = (out, points, width, colourOf) => {
    const start = out.p.length / 3;
    points.forEach(([x, y, z], i) => {
      const [ax, , az] = points[Math.max(0, i - 1)],
        [bx, , bz] = points[Math.min(points.length - 1, i + 1)];
      const length = Math.hypot(bx - ax, bz - az) || 1,
        ox = (-(bz - az) / length) * width,
        oz = ((bx - ax) / length) * width;
      out.p.push(x - ox, y, z - oz, x + ox, y, z + oz);
      out.n.push(0, 1, 0, 0, 1, 0);
      const c = rgb(colourOf(y, i));
      out.c.push(...c, ...c);
      if (i) out.i.push(start + i * 2 - 2, start + i * 2 - 1, start + i * 2, start + i * 2 - 1, start + i * 2 + 1, start + i * 2);
    });
  };
  const meshOf = (out, material) => new Mesh3D(createGeometry3D({ positions: out.p, normals: out.n, colors: out.c, indices: out.i }), material);

  // ---- river banks: the grid is too coarse to cut a clean shore, so each bank is modelled along the stream ---
  {
    const out = { p: [], n: [], c: [], i: [] };
    for (const river of RIVERS) {
      // Finer points along the stream than the path itself has.
      const line = [];
      for (let i = 0; i < river.length - 1; i++)
        for (let k = 0; k < 4; k++) line.push([lerp(river[i][0], river[i + 1][0], k / 4), lerp(river[i][1], river[i + 1][1], k / 4)]);
      line.push(river[river.length - 1]);
      for (const side of [-1, 1]) {
        const rows = line.map(([u, v], i) => {
          const [au, av] = line[Math.max(0, i - 1)],
            [bu, bv] = line[Math.min(line.length - 1, i + 1)];
          const length = Math.hypot(bu - au, bv - av) || 1,
            nu = (-(bv - av) / length) * side,
            nv = ((bu - au) / length) * side;
          // From under the water, up over the shoreline, and down into the land behind it.
          return [0.55, 0.95, 1.3, 1.75].map((d, k) => {
            const x = (u + nu * d - 50) * S,
              z = (v + nv * d - 50) * S,
              ground = groundAt(x, z);
            return [x, k === 0 ? -0.35 : k === 3 ? ground - 0.25 : Math.max(ground + 0.1, k === 1 ? 0.1 : 0.34), z];
          });
        });
        const tones = [0x6f8a78, 0xb7ab84, 0x9d9a6c, 0x71804f];
        // Where the stream meets the sea there is no bank to model.
        const dry = line.map(([u, v]) => inland(u, v) > 2.5);
        const start = out.p.length / 3;
        rows.forEach((row, i) => {
          row.forEach(([x, y, z], k) => {
            out.p.push(x, y, z);
            out.n.push(0, 1, 0);
            out.c.push(...rgb(tones[k]));
          });
          if (i && dry[i] && dry[i - 1])
            for (let k = 0; k < 3; k++) {
              const a = start + (i - 1) * 4 + k,
                b = start + i * 4 + k;
              if (side > 0) out.i.push(a, a + 1, b, a + 1, b + 1, b);
              else out.i.push(a, b, a + 1, a + 1, b, b + 1);
            }
        });
      }
    }
    const banks = meshOf(out, landMaterial);
    banks.receiveShadow = true;
    scene.addChild(banks);
  }

  // ---- borders: a clean line wherever two sects' lands meet, and round the rim of each sect's reach --------
  const borderMaterial = createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 0.8, metallic: 0 });
  let borders = null;
  function drawBorders() {
    const owned = PLACES.map((place) => ({ u: place.at.x, v: place.at.y, owner: world().places[place.id].owner }));
    const out = { p: [], n: [], c: [], i: [] };
    /** Whether a point belongs to this stronghold's claim: on land, and no other stronghold nearer. */
    const nearest = (u, v, mine, also = null) => {
      const d = Math.hypot(u - mine.u, v - mine.v);
      return owned.every((other) => other === mine || other === also || Math.hypot(u - other.u, v - other.v) >= d - 0.001);
    };
    const lay = (points, colour) => {
      // Cut the line wherever it leaves the claim or runs into water.
      let run = [];
      const flush = () => {
        if (run.length > 1) ribbon(out, run, 0.34, () => colour);
        run = [];
      };
      for (const point of points) {
        if (!point) flush();
        else run.push(point);
      }
      flush();
    };
    const lift = (u, v) => {
      const x = (u - 50) * S,
        z = (v - 50) * S,
        y = groundAt(x, z);
      return y > 0.3 ? [x, y + 0.3, z] : null;
    };
    for (const mine of owned) {
      if (!mine.owner) continue;
      const colour = shade(hexOf(SECT_BY_ID[mine.owner].color), 1.05);
      // The rim of its reach, where nobody else's claim comes first.
      const rim = [];
      for (let k = 0; k <= 120; k++) {
        const angle = (k / 120) * Math.PI * 2,
          u = mine.u + Math.sin(angle) * 14.6,
          v = mine.v + Math.cos(angle) * 14.6;
        rim.push(nearest(u, v, mine) ? lift(u, v) : null);
      }
      lay(rim, colour);
      // The line half way to each neighbour of another allegiance; each side draws its own, a little apart.
      for (const other of owned) {
        if (other === mine || other.owner === mine.owner) continue;
        const gap = Math.hypot(other.u - mine.u, other.v - mine.v);
        if (gap > 29.2) continue;
        const du = (other.u - mine.u) / gap,
          dv = (other.v - mine.v) / gap,
          reach = Math.sqrt(Math.max(0, 14.6 * 14.6 - (gap / 2) ** 2));
        const line = [];
        for (let k = 0; k <= 60; k++) {
          const t = (k / 60) * 2 - 1,
            u = mine.u + du * (gap / 2 - 0.16) - dv * t * reach,
            v = mine.v + dv * (gap / 2 - 0.16) + du * t * reach;
          line.push(nearest(u, v, mine, other) ? lift(u, v) : null);
        }
        lay(line, colour);
      }
    }
    if (borders) scene.removeChild(borders);
    borders = out.i.length ? meshOf(out, borderMaterial) : null;
    if (borders) scene.addChild(borders);
  }

  /** The line each road takes, by the ids of the two strongholds it joins. */
  const roadPaths = {};
  // ---- roads, with a bridge wherever one crosses water ------------------------------------------------------
  {
    const p = [],
      nrm = [],
      col = [],
      idx = [];
    const strip = (points, width, colourOf) => {
      const start = p.length / 3;
      points.forEach(([x, y, z], i) => {
        const [ax, , az] = points[Math.max(0, i - 1)],
          [bx, , bz] = points[Math.min(points.length - 1, i + 1)];
        const length = Math.hypot(bx - ax, bz - az) || 1,
          ox = (-(bz - az) / length) * width,
          oz = ((bx - ax) / length) * width;
        p.push(x - ox, y, z - oz, x + ox, y, z + oz);
        nrm.push(0, 1, 0, 0, 1, 0);
        const c = rgb(colourOf(y, i));
        col.push(...c, ...c);
        if (i) idx.push(start + i * 2 - 2, start + i * 2 - 1, start + i * 2, start + i * 2 - 1, start + i * 2 + 1, start + i * 2);
      });
    };
    for (const place of PLACES)
      for (const other of place.roads.filter((id) => id > place.id)) {
        const a = place.at,
          b = PLACE_BY_ID[other].at;
        const length = Math.hypot(b.x - a.x, b.y - a.y),
          bend = (random() - 0.5) * 0.16 * length,
          steps = Math.ceil(length * 2.4);
        const points = [];
        for (let i = 0; i <= steps; i++) {
          const t = i / steps,
            swing = Math.sin(t * Math.PI) * bend + Math.sin(t * Math.PI * 3) * 0.5;
          const x = (lerp(a.x, b.x, t) - ((b.y - a.y) / length) * swing - 50) * S,
            z = (lerp(a.y, b.y, t) + ((b.x - a.x) / length) * swing - 50) * S;
          // Over water the road is a bridge, held level above it.
          points.push([x, Math.max(groundAt(x, z), 0.55) + 0.32, z]);
        }
        roadPaths[place.id + '|' + other] = points;
        strip(points, 0.6, (y) => (y < 0.9 ? 0x7a5c3e : 0xbfae84));
      }
    // The frontier wall follows the ridges.
    const wallPoints = [];
    for (let t = 0; t <= 1.0001; t += 1 / 90) {
      const at = along(WALL, Math.min(1, t));
      const x = (at.u - 50) * S,
        z = (at.v + Math.sin(t * 40) * 0.35 - 50) * S;
      wallPoints.push([x, groundAt(x, z) + 0.9, z]);
    }
    strip(wallPoints, 0.5, () => 0x8f8a7c);
    const roads = new Mesh3D(createGeometry3D({ positions: p, normals: nrm, colors: col, indices: idx }), landMaterial);
    roads.receiveShadow = true;
    scene.addChild(roads);
    const towers = [];
    wallPoints.forEach(([x, y, z], i) => {
      towers.push([BOX, [x, y - 0.55, z], [1.1, 1.3, 1.1], 0x9a9485]);
      if (i % 9 === 0) towers.push([BOX, [x, y + 0.6, z], [1.7, 2.6, 1.7], 0xa39d8d], [PYRAMID, [x, y + 2.3, z], [1.5, 0.9, 1.5], 0x4a4f55, [0, Math.PI / 4, 0]]);
    });
    scene.addChild(model(towers));
  }

  // ---- strongholds ------------------------------------------------------------------------------------------
  /** Houses everywhere are two instanced shapes: a body and a roof. */
  const houses = [];
  const house = (x, z, size, turn, wall, roof) => houses.push({ x, z, size, turn, wall, roof });
  const fixed = [];
  const sites = {};
  for (const place of PLACES) {
    const kind = kindOf(place.id),
      cx = (place.at.x - 50) * S,
      cz = (place.at.y - 50) * S,
      y = groundAt(cx, cz);
    sites[place.id] = { x: cx, y, z: cz, kind };
    const put = (what, dx, dz, scale, turn = 0) => {
      if (detail.towns < 2 && what !== 'hall') return;
      const node = createBuilding(what, what === 'hall' ? 3 : 2);
      node.setPosition(cx + dx, groundAt(cx + dx, cz + dz), cz + dz);
      node.setScale(scale);
      node.setRotation(0, turn, 0);
      scene.addChild(node);
    };
    if (kind === 'city') {
      // A walled square with gate towers, streets of houses and a keep in the middle.
      const r = 4.6;
      for (const [dx, dz, w, d] of [[0, -r, 2 * r, 0.5], [0, r, 2 * r, 0.5], [-r, 0, 0.5, 2 * r], [r, 0, 0.5, 2 * r]]) fixed.push([BOX, [cx + dx, y + 0.55, cz + dz], [w, 1.1, d], 0xb9b3a2], [BOX, [cx + dx, y + 1.15, cz + dz], [w + 0.2, 0.14, d + 0.2], 0x4a4f55]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) fixed.push([BOX, [cx + sx * r, y + 0.9, cz + sz * r], [1.1, 1.8, 1.1], 0xc2bcab], [PYRAMID, [cx + sx * r, y + 2.1, cz + sz * r], [1.1, 0.7, 1.1], 0x4a4f55, [0, Math.PI / 4, 0]]);
      put('hall', 0, -0.6, 0.3);
      put('gate', 0, r, 0.26);
      put('library', 2.6, 1.6, 0.24);
      put('tower', -r, -r, 0.2);
      for (let i = 0; i < 26 * detail.towns; i++) {
        const dx = (random() - 0.5) * 2 * (r - 0.9),
          dz = (random() - 0.5) * 2 * (r - 0.9);
        if (Math.abs(dx) < 1.9 && Math.abs(dz + 0.6) < 1.5) continue;
        house(cx + Math.round(dx / 0.85) * 0.85, cz + Math.round(dz / 0.85) * 0.85, 0.5 + random() * 0.2, 0, 0xe6dfcd, random() < 0.25 ? 0x7a4a3a : 0x4f565c);
      }
      // Houses spill outside the walls along the roads.
      for (let i = 0; i < 10 * detail.towns; i++) {
        const angle = random() * 6.28,
          far = r + 1.2 + random() * 3.5;
        house(cx + Math.cos(angle) * far, cz + Math.sin(angle) * far, 0.45 + random() * 0.15, random() * 3, 0xd9cfb6, 0x6a5a48);
      }
    } else if (kind === 'mountain') {
      // A hall on a terrace with side halls, a gate at the foot of the steps and a pagoda above.
      fixed.push([BOX, [cx, y + 0.2, cz], [7.4, 0.4, 5.6], 0xbdb7a6], [BOX, [cx, y + 0.1, cz + 3.6], [1.6, 0.2, 1.8], 0xa9a394]);
      put('hall', 0, -0.9, 0.3);
      put('dorm', -2.7, 0.9, 0.2, 0.3);
      put('dorm', 2.7, 0.9, 0.2, -0.3);
      put('gate', 0, 3.4, 0.22);
      for (let i = 0; i < 5; i++) fixed.push([TAPER, [cx + 3.6, y + 0.6 + i * 0.95, cz - 2.6], [0.85 - i * 0.12, 0.7, 0.85 - i * 0.12], 0xd8cfb8], [PYRAMID, [cx + 3.6, y + 1.05 + i * 0.95, cz - 2.6], [1.25 - i * 0.16, 0.34, 1.25 - i * 0.16], 0x4a4f55, [0, Math.PI / 4, 0]]);
      for (let i = 0; i < 4 * detail.towns; i++) house(cx + (random() - 0.5) * 9, cz + 4.5 + random() * 2.5, 0.42, random() * 3, 0xd9cfb6, 0x5a5148);
    } else {
      // A stockaded town: a hall, a market of houses, and a jetty where there is water.
      for (let i = 0; i < 26; i++) {
        const angle = (i / 26) * 6.283;
        if (Math.abs(angle - Math.PI / 2) > 0.3) fixed.push([BOX, [cx + Math.cos(angle) * 4.4, y + 0.4, cz + Math.sin(angle) * 3.6], [0.25, 0.9, 1.1], 0x8a6a48, [0, -angle, 0]]);
      }
      put('hall', 0, -0.8, 0.27);
      put('tower', 3.2, -2.2, 0.18);
      for (let i = 0; i < 16 * detail.towns; i++) {
        const angle = random() * 6.28,
          far = 1.9 + random() * 2.1;
        house(cx + Math.cos(angle) * far * 1.1, cz + Math.sin(angle) * far * 0.9 + 0.5, 0.48 + random() * 0.18, random() * 3, 0xe0d6bd, random() < 0.4 ? 0x7a5a3c : 0x4f565c);
      }
    }
    // The villages that answer to the place stand a little way off, each with its own few houses.
    const count = Array.isArray(place.villages) ? place.villages.length : place.villages ?? 0;
    for (let k = 0; k < count; k++) {
      for (let tries = 0; tries < 12; tries++) {
        const angle = random() * 6.28,
          vx = cx + Math.cos(angle) * (11 + random() * 6),
          vz = cz + Math.sin(angle) * (11 + random() * 6),
          vy = groundAt(vx, vz);
        if (vy < 0.8 || vy > 6) continue;
        for (let i = 0; i < 5 + detail.towns; i++) house(vx + (random() - 0.5) * 3, vz + (random() - 0.5) * 3, 0.42, random() * 3, 0xd9cfb6, 0x8a7a52);
        break;
      }
    }
  }
  // Pillars of rock round Guilin.
  for (let i = 0; i < 26; i++) {
    const x = (50 - 50 + (random() - 0.5) * 16) * S,
      z = (76 - 50 + (random() - 0.5) * 12) * S;
    if (Math.hypot(x - sites.guilin.x, z - sites.guilin.z) < 7) continue;
    const tall = 2.5 + random() * 3.5;
    fixed.push([TAPER, [x, groundAt(x, z) + tall / 2, z], [0.9 + random() * 0.5, tall, 0.9 + random() * 0.5], mix(0x7f8f6a, 0x8a8577, random())], [BALL, [x, groundAt(x, z) + tall, z], [0.75, 0.5, 0.75], 0x5f8a4e]);
  }
  // Hamlets beside the roads, each a few houses and a field or two.
  for (const path of Object.values(roadPaths)) {
    for (const share of path.length > 30 ? [0.35, 0.68] : [0.5]) {
      const [px, , pz] = path[Math.floor(path.length * share)];
      const cx = px + (random() - 0.5) * 7,
        cz = pz + (random() - 0.5) * 7,
        cy = groundAt(cx, cz);
      if (cy < 0.9 || cy > 5 || Object.values(sites).some((site) => Math.hypot(cx - site.x, cz - site.z) < 12)) continue;
      for (let i = 0; i < 3 + Math.floor(random() * 3); i++) house(cx + (random() - 0.5) * 3.4, cz + (random() - 0.5) * 3.4, 0.5 + random() * 0.2, random() * 3.14, 0xd8cdb4, random() < 0.5 ? 0x4a4f55 : 0x7a5a3e);
      fixed.push([BOX, [cx + 2.6, cy + 0.06, cz + 1.2], [2.2, 0.06, 1.6], 0x8fa85a, [0, random(), 0]], [BOX, [cx - 2.4, cy + 0.06, cz - 1.6], [1.8, 0.06, 2.0], 0xb9a85a, [0, random(), 0]]);
    }
  }
  // Pagodas on the hills, tier upon tier; a pavilion by the lake; beacons along the coast.
  const pagoda = (x, z, scale) => {
    const y = groundAt(x, z);
    for (let tier = 0; tier < 5; tier++) {
      const w = (1.0 - tier * 0.14) * scale;
      fixed.push([ROD, [x, y + (0.35 + tier * 0.62) * scale, z], [w * 0.55, 0.5 * scale, w * 0.55], 0xe4dcc8], [SPIKE, [x, y + (0.72 + tier * 0.62) * scale, z], [w, 0.3 * scale, w], 0x4a4f55]);
    }
    fixed.push([SPIKE, [x, y + 3.75 * scale, z], [0.12 * scale, 0.9 * scale, 0.12 * scale], 0xd9b04a]);
  };
  for (let tries = 0, made = 0; tries < 400 && made < 9; tries++) {
    const u = 12 + random() * 76,
      v = 16 + random() * 70,
      x = (u - 50) * S,
      z = (v - 50) * S,
      y = groundAt(x, z);
    if (y < 4 || y > 10 || Object.values(sites).some((site) => Math.hypot(x - site.x, z - site.z) < 14)) continue;
    pagoda(x, z, 0.8 + random() * 0.35);
    made++;
  }
  {
    const x = (LAKE[0] + LAKE[2] + 1.2 - 50) * S,
      z = (LAKE[1] - 1.5 - 50) * S,
      y = groundAt(x, z);
    fixed.push([ROD, [x, y + 0.2, z], [1.0, 0.4, 1.0], 0xbdb7a6], ...[0, 1.57, 3.14, 4.71].map((a) => [ROD, [x + Math.cos(a) * 0.7, y + 0.9, z + Math.sin(a) * 0.7], [0.07, 1.0, 0.07], 0x9c2f24]), [SPIKE, [x, y + 1.75, z], [1.3, 0.8, 1.3], 0x3f6a55]);
  }
  // Rice paddies in squares on the low wet ground of the south, each a little pool between banks.
  const paddies = [];
  for (const site of Object.values(sites)) {
    if (site.kind === 'mountain' || site.z < -10) continue;
    for (let i = 0; i < 26; i++) {
      const gx = Math.round((random() - 0.5) * 9) * 1.5,
        gz = Math.round((random() - 0.5) * 9) * 1.5,
        x = site.x + gx,
        z = site.z + gz,
        y = groundAt(x, z);
      if (Math.hypot(gx, gz) < 6.6 || y < 0.6 || y > 2.6) continue;
      paddies.push([x, y, z, random()]);
    }
  }
  for (const [x, y, z, tone] of paddies) fixed.push([BOX, [x, y + 0.03, z], [1.42, 0.08, 1.42], 0x6f6a48], [BOX, [x, y + 0.05, z], [1.22, 0.08, 1.22], mix(0x5f8f7a, 0x8fb86a, tone)]);
  scene.addChild(model(fixed));
  {
    const turned = new Float32Array(4);
    // White shapes, coloured house by house.
    const bodies = new InstancedMesh3D(build([[BOX, [0, 0, 0], 1, 0xffffff]]), TOON, houses.length),
      roofs = new InstancedMesh3D(build([[PYRAMID, [0, 0, 0], 1, 0xffffff]]), TOON, houses.length);
    houses.forEach((h, i) => {
      const y = groundAt(h.x, h.z);
      bodies.setTransformAt(i, [h.x, y + h.size * 0.35, h.z], quatFromEuler(turned, 0, h.turn, 0), [h.size * 1.3, h.size * 0.7, h.size]);
      roofs.setTransformAt(i, [h.x, y + h.size * 0.95, h.z], quatFromEuler(turned, 0, h.turn + Math.PI / 4, 0), [h.size * 1.15, h.size * 0.55, h.size * 0.95]);
      bodies.setColorAt(i, ...rgb(h.wall));
      roofs.setColorAt(i, ...rgb(h.roof));
    });
    bodies.castShadow = roofs.castShadow = stage.quality !== 'low';
    scene.addChild(bodies);
    scene.addChild(roofs);
  }

  // ---- forests ------------------------------------------------------------------------------------------------
  {
    const pine = build([[TAPER, [0, 0.25, 0], [0.09, 0.5, 0.09], 0x6e4a2b], [SPIKE, [0, 0.95, 0], [0.42, 1.1, 0.42], 0x263f2b], [SPIKE, [0, 1.45, 0], [0.3, 0.8, 0.3], 0x304b32]]),
      leafy = build([[TAPER, [0, 0.25, 0], [0.09, 0.5, 0.09], 0x6e4a2b], [BALL, [0, 0.85, 0], [0.5, 0.45, 0.5], 0x3a5632], [BALL, [0.18, 1.1, 0.05], [0.34, 0.3, 0.34], 0x46653a]]);
    const maple = build([[TAPER, [0, 0.25, 0], [0.08, 0.5, 0.08], 0x5a3a24], [BALL, [0, 0.85, 0], [0.48, 0.42, 0.48], 0xb0502a], [BALL, [0.16, 1.08, 0.04], [0.32, 0.28, 0.32], 0xcf7a2a]]),
      blossom = build([[TAPER, [0, 0.22, 0], [0.07, 0.44, 0.07], 0x4a3428], [BALL, [0, 0.74, 0], [0.44, 0.36, 0.44], 0xf0b4c4], [BALL, [0.18, 0.92, 0.06], [0.3, 0.24, 0.3], 0xf7d2da]]),
      bamboo = build([[ROD, [0, 0.7, 0], [0.035, 1.4, 0.035], 0x7aa04a], [ROD, [0.14, 0.6, 0.08], [0.03, 1.2, 0.03], 0x86ac52], [ROD, [-0.1, 0.55, -0.1], [0.03, 1.1, 0.03], 0x6f9644], [BALL, [0, 1.4, 0], [0.34, 0.3, 0.34], 0x5f9a3f], [BALL, [0.16, 1.2, 0.1], [0.26, 0.24, 0.26], 0x79b04f]]),
      reed = build([[SPIKE, [0, 0.3, 0], [0.05, 0.6, 0.05], 0x9aa85a], [SPIKE, [0.1, 0.26, 0.05], [0.05, 0.52, 0.05], 0x8a9a4e], [SPIKE, [-0.08, 0.24, -0.06], [0.05, 0.48, 0.05], 0xa6b062]]),
      boulder = build([[BALL, [0, 0.14, 0], [0.5, 0.34, 0.42], 0x8d8a80], [BALL, [0.3, 0.08, 0.2], [0.26, 0.2, 0.24], 0x7d7a70]]);
    const spots = [[], [], [], [], [], [], []];
    const towns = Object.values(sites);
    // Reeds stand at the water's edge and boulders lie on the high ground.
    for (let i = 0; i < detail.trees * 0.5; i++) {
      const u = 50 - SPAN / 2 + random() * SPAN,
        v = 50 - SPAN / 2 + random() * SPAN,
        x = (u - 50) * S,
        z = (v - 50) * S,
        y = groundAt(x, z);
      if (y > 0.12 && y < 0.6 && inland(u, v) > 3) spots[5].push([x, y, z]);
      else if (y > 7.5 && y < 17 && random() < 0.5) spots[6].push([x, y, z]);
    }
    for (let tries = 0; tries < detail.trees * 4 && spots[0].length + spots[1].length < detail.trees; tries++) {
      const u = 50 - SPAN / 2 + random() * SPAN,
        v = 50 - SPAN / 2 + random() * SPAN,
        x = (u - 50) * S,
        z = (v - 50) * S,
        y = groundAt(x, z);
      if (y < 0.7 || y > 11.5) continue;
      // Woods gather in drifts, thicker in the south and on the hills, thin in the dry north-west and on farmland.
      const thick = noise(u * 0.23 + 4, v * 0.23 + 9) * (0.55 + smooth((v - 30) / 40) * 0.5 + smooth((y - 2.5) / 4) * 0.35) * (1 - 0.8 * smooth((30 - u) / 22));
      if (random() > thick * 1.7 - 0.3) continue;
      if (towns.some((site) => Math.hypot(x - site.x, z - site.z) < 6.5)) continue;
      // Blossom round the towns, bamboo in the warm south, maples turning red across the middle of the land.
      const near = towns.some((site) => Math.hypot(x - site.x, z - site.z) < 13);
      const kind = near && random() < 0.32 ? 3 : v > 66 && y < 4.5 && random() < 0.45 ? 4 : v > 26 && v < 50 && random() < 0.2 ? 2 : v > 46 + random() * 14 && y < 6 ? 1 : 0;
      spots[kind].push([x, y, z]);
    }
    const turned = new Float32Array(4);
    [pine, leafy, maple, blossom, bamboo, reed, boulder].forEach((geometry, kind) => {
      if (!spots[kind].length) return;
      const trees = new InstancedMesh3D(geometry, TOON, spots[kind].length);
      spots[kind].forEach(([x, y, z], i) => {
        trees.setTransformAt(i, [x, y - 0.05, z], quatFromEuler(turned, 0, random() * 6.28, 0), 0.75 + random() * 0.6);
        const tone = (kind > 1 ? 0.82 : 0.7) + random() * (kind > 1 ? 0.18 : 0.3);
        trees.setColorAt(i, tone, tone, tone * (kind > 1 ? 1 : 0.9));
      });
      trees.castShadow = stage.quality === 'high' && kind < 5;
      scene.addChild(trees);
    });
  }

  // ---- boats, clouds, banners and the mark on the chosen stronghold -------------------------------------------
  const boatShape = build([[BOX, [0, 0.12, 0], [0.5, 0.24, 1.5], 0x6e4a2b], [ROD, [0, 0.9, 0.1], [0.04, 1.5, 0.04], 0x4a3a2a], [BOX, [0, 1.0, 0.12], [0.9, 1.0, 0.04], 0xe9e1cf]]);
  const fleet = Array.from({ length: stage.quality === 'low' ? 6 : 14 }, (_, i) => ({ path: SAILS[i % 3 === 2 ? 1 : 0], t: random(), pace: (0.004 + random() * 0.004) * (random() < 0.5 ? 1 : -1) }));
  const boats = new InstancedMesh3D(boatShape, TOON, fleet.length);
  scene.addChild(boats);
  // Water that moves: pale streaks carried down each river, surf that comes and goes along the shore,
  // and a fall where the long river drops out of the western hills.
  const foam = createStandardMaterial3D({ color: 0xe8f4f8, roughness: 0.6, metallic: 0, opacity: 0.5, alphaMode: 'blend' });
  const streakShape = build([[BOX, [0, 0, 0], [0.16, 0.02, 1.5], 0xffffff]]);
  const flow = RIVERS.flatMap((river, r) => Array.from({ length: stage.quality === 'low' ? 26 : 70 }, () => ({ river, t: random(), off: (random() - 0.5) * 1.1, pace: 0.02 + random() * 0.012 + r * 0.004 })));
  const streaks = new InstancedMesh3D(streakShape, foam, flow.length);
  streaks.castShadow = false;
  scene.addChild(streaks);
  const shore = [];
  for (let tries = 0; tries < 6000 && shore.length < (stage.quality === 'low' ? 60 : 170); tries++) {
    const u = 50 - SPAN / 2 + random() * SPAN,
      v = 50 - SPAN / 2 + random() * SPAN,
      d = inland(u, v);
    if (d > -0.4 || d < -3.2) continue;
    // Which way the land lies, so that the surf runs along the shore and rolls towards it.
    const gu = inland(u + 0.5, v) - inland(u - 0.5, v),
      gv = inland(u, v + 0.5) - inland(u, v - 0.5),
      g = Math.hypot(gu, gv) || 1;
    shore.push({ x: (u - 50) * S, z: (v - 50) * S, nx: gu / g, nz: gv / g, phase: random() * 6.283, long: 1.4 + random() * 2 });
  }
  const surf = new InstancedMesh3D(build([[BOX, [0, 0, 0], [1.5, 0.02, 0.2], 0xffffff]]), foam, shore.length);
  surf.castShadow = false;
  scene.addChild(surf);
  // Flights of birds cross the land in arrowheads.
  const flights = Array.from({ length: stage.quality === 'low' ? 1 : 3 }, (_, i) => ({ x: (random() - 0.5) * 300, z: (random() - 0.5) * 240, heading: random() * 6.283, y: 20 + i * 4 }));
  const flock = new InstancedMesh3D(build([[BOX, [0.22, 0, 0], [0.44, 0.03, 0.16], 0x2a2a30, [0, 0.5, 0]], [BOX, [-0.22, 0, 0], [0.44, 0.03, 0.16], 0x2a2a30, [0, -0.5, 0]]]), TOON, flights.length * 7);
  flock.castShadow = false;
  scene.addChild(flock);
  const cloudMaterial = createStandardMaterial3D({ color: 0xffffff, roughness: 1, opacity: 0.3, alphaMode: 'blend' });
  const clouds = Array.from({ length: stage.quality === 'low' ? 0 : 9 }, () => {
    const node = model([[BALL, [0, 0, 0], [9 + random() * 8, 1.6, 5 + random() * 4], 0xffffff], [BALL, [4, 0.6, 1], [5, 1.4, 3.5], 0xffffff]], cloudMaterial, false);
    const cloud = { node, x: (random() - 0.5) * 520, y: 30 + random() * 8, z: (random() - 0.5) * 420 };
    scene.addChild(node);
    return cloud;
  });
  // A band of light round the chosen stronghold.
  const band = { positions: [], normals: [], indices: [] };
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    band.positions.push(Math.cos(angle) * 7.1, 0, Math.sin(angle) * 7.1, Math.cos(angle) * 7.9, 0, Math.sin(angle) * 7.9);
    band.normals.push(0, 1, 0, 0, 1, 0);
    if (i) band.indices.push(i * 2 - 2, i * 2, i * 2 - 1, i * 2 - 1, i * 2, i * 2 + 1);
  }
  const ring = new Mesh3D(createGeometry3D(band), createStandardMaterial3D({ color: 0xf6dc8c, emissive: 0xf6dc8c, roughness: 1 }));
  scene.addChild(ring);

  // Carts on the roads that are traded along, and a column of fighters when someone marches.
  const cartShape = build([[BOX, [0, 0.32, 0], [0.5, 0.3, 0.9], 0x8a6a48], [BOX, [0, 0.62, 0], [0.56, 0.3, 0.7], 0xe9e1cf], [BOX, [0, 0.3, 0.75], [0.22, 0.36, 0.5], 0x5a4632]]);
  const CARTS = stage.quality === 'low' ? 12 : 36;
  const carts = new InstancedMesh3D(cartShape, TOON, CARTS);
  scene.addChild(carts);
  let trade = [];
  /** The road between two strongholds, from the first to the second. */
  const roadBetween = (from, to) => roadPaths[from + '|' + to] ?? [...(roadPaths[to + '|' + from] ?? [])].reverse();
  const spotOn = (path, t) => {
    const f = Math.max(0, Math.min(path.length - 1.001, t * (path.length - 1))),
      i = Math.floor(f),
      a = path[i],
      b = path[i + 1];
    return { x: lerp(a[0], b[0], f - i), y: lerp(a[1], b[1], f - i), z: lerp(a[2], b[2], f - i), heading: Math.atan2(b[0] - a[0], b[2] - a[2]) };
  };
  const troop = new Object3D();
  troop.visible = false;
  scene.addChild(troop);
  let marching = null;
  /** Columns of other sects on the move, shown but not followed. */
  let parades = [];
  const columnOf = (colour) => {
    const parts = [[ROD, [0, 1.6, 0], [0.06, 3.2, 0.06], 0x4a3a2a], [BOX, [0.5, 2.6, 0], [0.9, 1.1, 0.05], colour]];
    for (let i = 0; i < 10; i++) parts.push([TAPER, [((i % 2) - 0.5) * 0.7, 0.45, -0.6 - Math.floor(i / 2) * 0.7], [0.2, 0.9, 0.2], colour], [BALL, [((i % 2) - 0.5) * 0.7, 1.0, -0.6 - Math.floor(i / 2) * 0.7], 0.17, 0xe2b48c]);
    return model(parts);
  };

  let banners = new Object3D(),
    signature = '',
    chosen = null,
    glide = null;
  scene.addChild(banners);
  /** Name tags over the strongholds. */
  const tags = {};
  function refresh() {
    const now = PLACES.map((place) => world().places[place.id].owner ?? '-').join();
    if (now === signature) return;
    signature = now;
    paintLand();
    drawBorders();
    scene.removeChild(banners);
    const parts = [];
    for (const place of PLACES) {
      const owner = world().places[place.id].owner,
        site = sites[place.id];
      const colour = owner ? hexOf(SECT_BY_ID[owner].color) : 0xb9a77d;
      // A tall banner in the owner's colour, and smaller flags round a place that is held.
      parts.push([ROD, [site.x - 3.4, site.y + 2.6, site.z + 2.6], [0.07, 5.2, 0.07], 0x4a3a2a], [BOX, [site.x - 2.75, site.y + 4.2, site.z + 2.6], [1.2, 1.9, 0.05], colour], [BOX, [site.x - 2.75, site.y + 5.2, site.z + 2.6], [1.4, 0.12, 0.09], shade(colour, 0.6)]);
      if (owner) for (const [dx, dz] of [[3.6, 3], [-3.6, -3], [3.6, -3]]) parts.push([ROD, [site.x + dx, site.y + 1.2, site.z + dz], [0.04, 2.4, 0.04], 0x4a3a2a], [BOX, [site.x + dx + 0.3, site.y + 2, site.z + dz], [0.6, 0.7, 0.04], colour]);
      if (layer) {
        const tag = (tags[place.id] ??= Object.assign(document.createElement('button'), { className: 'realm-tag' }));
        tag.dataset.act = 'place';
        tag.dataset.place = place.id;
        tag.style.setProperty('--marker', owner ? SECT_BY_ID[owner].color : '#b9a77d');
        tag.innerHTML = `<i></i><span></span><small></small>`;
        tag.children[1].textContent = place.name;
        tag.children[2].textContent = owner ? SECT_BY_ID[owner].name : '无主';
      }
    }
    banners = model(parts);
    scene.addChild(banners);
  }
  /** Tells the model which roads are traded along: `[{ from, to }]`. Carts are shared out among them. */
  function setTrade(routes) {
    const paths = routes.map((route) => roadBetween(route.from, route.to)).filter((path) => path.length > 1);
    trade = paths.length ? Array.from({ length: Math.min(CARTS, paths.length * 2) }, (_, i) => ({ path: paths[i % paths.length], t: random(), pace: (0.02 + random() * 0.015) * (i % 2 ? 1 : -1) })) : [];
    carts.count = trade.length;
  }
  refresh();

  const turned = new Float32Array(4);
  let clock = 0;
  const realm = {
    scene,
    camera,
    refresh,
    setTrade,
    /**
     * Shows a column marching from one stronghold to its neighbour under a
     * banner, then calls `arrived`. The camera follows it.
     */
    march(from, to, colour, arrived) {
      const path = roadBetween(from, to);
      if (path.length < 2) return arrived();
      for (const child of [...(troop.children ?? [])]) troop.removeChild(child);
      troop.addChild(columnOf(colour));
      troop.visible = true;
      marching = { path, t: 0, arrived, began: performance.now() };
    },
    /** Shows another sect's column going from one stronghold to its neighbour; the camera stays where it is. */
    parade(from, to, colour) {
      const path = roadBetween(from, to);
      if (path.length < 2 || parades.length > 5) return;
      const node = columnOf(colour);
      node.setScale(1.6);
      scene.addChild(node);
      parades.push({ path, node, began: performance.now() });
    },
    /** Marks a stronghold as the one being looked at, and brings the camera over to it. */
    select(placeId, move = true) {
      if (placeId === chosen) return;
      chosen = placeId;
      if (move && sites[placeId]) glide = sites[placeId];
    },
    enter() {
      const site = sites[chosen] ?? { x: 20, z: 0 };
      stage.orbit.set({ target: [site.x, 0, site.z], yaw: 0, pitch: 0.82, distance: 150, minDistance: 26, maxDistance: 330, minPitch: 0.3, maxPitch: 1.5, reach: 170, drift: 0, dragPans: true });
    },
    leave() {
      stage.orbit.dragPans = false;
      for (const tag of Object.values(tags)) tag.remove();
    },
    update(dt) {
      clock += dt;
      const orbit = stage.orbit;
      if (glide) {
        const k = Math.min(1, dt * 4);
        orbit.target[0] += (glide.x - orbit.target[0]) * k;
        orbit.target[2] += (glide.z - orbit.target[2]) * k;
        if (Math.hypot(glide.x - orbit.target[0], glide.z - orbit.target[2]) < 0.5) glide = null;
      }
      // The camera looks at the ground, not through it, and is lifted clear of any mountain it would sink into.
      orbit.target[1] += (Math.max(0, groundAt(orbit.target[0], orbit.target[2])) - orbit.target[1]) * Math.min(1, dt * 5);
      orbit.apply(camera, dt);
      for (let tries = 0; tries < 12 && orbit.position[1] < groundAt(orbit.position[0], orbit.position[2]) + 4 && orbit.pitch < orbit.maxPitch; tries++) {
        orbit.pitch = Math.min(orbit.maxPitch, orbit.pitch + 0.04);
        orbit.apply(camera, 0);
      }
      // The light swings from morning to evening and back; the map is never left in the dark.
      light.setHour(12.2 + 5.6 * Math.sin(clock / 75));
      light.aim(orbit.target[0], 0, orbit.target[2]);
      flow.forEach((streak, i) => {
        streak.t = (streak.t + streak.pace * dt) % 1;
        const at = along(streak.river, streak.t),
          side = streak.off * S,
          x = (at.u - 50) * S + Math.cos(at.heading) * side,
          z = (at.v - 50) * S - Math.sin(at.heading) * side;
        // A streak shows only where there is water under it, and fades in and out along its run.
        const wet = groundAt(x, z) < -0.05 ? Math.sin(((streak.t * 9) % 1) * Math.PI) : 0;
        streaks.setTransformAt(i, [x, 0.05, z], quatFromEuler(turned, 0, at.heading, 0), [1, 1, 0.2 + wet]);
      });
      shore.forEach((wave, i) => {
        const roll = (clock * 0.22 + wave.phase) % 1,
          reach = (1 - roll) * 3.4;
        surf.setTransformAt(i, [wave.x - wave.nx * reach * 0 + wave.nx * (1.2 - reach), 0.05, wave.z + wave.nz * (1.2 - reach)], quatFromEuler(turned, 0, Math.atan2(wave.nx, wave.nz), 0), [wave.long * (0.4 + roll), 1, 0.5 + roll * 1.2]);
      });
      flights.forEach((flight, f) => {
        flight.x += Math.sin(flight.heading) * 7 * dt;
        flight.z += Math.cos(flight.heading) * 7 * dt;
        if (Math.abs(flight.x) > 210 || Math.abs(flight.z) > 210) (flight.heading += Math.PI * (0.8 + 0.4 * Math.sin(clock + f))), (flight.x *= 0.98), (flight.z *= 0.98);
        for (let k = 0; k < 7; k++) {
          const row = Math.ceil(k / 2),
            wing = k % 2 ? 1 : -1;
          const bx = -row * 1.3,
            bz = wing * row * 1.1;
          flock.setTransformAt(f * 7 + k, [flight.x + Math.sin(flight.heading) * bx + Math.cos(flight.heading) * bz, flight.y + Math.sin(clock * 2 + k) * 0.3, flight.z + Math.cos(flight.heading) * bx - Math.sin(flight.heading) * bz], quatFromEuler(turned, 0, flight.heading + Math.PI / 2, Math.sin(clock * 8 + k) * 0.5), 1.5);
        }
      });
      fleet.forEach((boat, i) => {
        boat.t = (boat.t + boat.pace * dt + 1) % 1;
        const at = along(boat.path, boat.t);
        boats.setTransformAt(i, [(at.u - 50) * S, 0.05 + Math.sin(clock * 1.7 + i) * 0.04, (at.v - 50) * S], quatFromEuler(turned, 0, at.heading + (boat.pace < 0 ? Math.PI : 0), Math.sin(clock * 1.3 + i) * 0.05), 1.5);
      });
      clouds.forEach((cloud, i) => {
        cloud.x = ((cloud.x + dt * (1.2 + (i % 4) * 0.4) + 260) % 520) - 260;
        cloud.node.setPosition(cloud.x, cloud.y, cloud.z);
      });
      trade.forEach((cart, i) => {
        cart.t = (cart.t + cart.pace * dt + 1) % 1;
        const at = spotOn(cart.path, cart.t);
        carts.setTransformAt(i, [at.x, at.y, at.z], quatFromEuler(turned, 0, at.heading + (cart.pace < 0 ? Math.PI : 0), 0), 1.3);
      });
      for (const parade of parades) {
        const t = (performance.now() - parade.began) / 6000,
          at = spotOn(parade.path, Math.min(1, t));
        parade.node.setPosition(at.x, at.y, at.z);
        parade.node.setRotation(0, at.heading, 0);
        if (t >= 1) scene.removeChild(parade.node), (parade.done = true);
      }
      if (parades.some((parade) => parade.done)) parades = parades.filter((parade) => !parade.done);
      if (marching) {
        // By the clock, not by frames, so a slow device does not hold the fight up.
        marching.t = (performance.now() - marching.began) / 2600;
        const at = spotOn(marching.path, Math.min(1, marching.t));
        troop.setPosition(at.x, at.y, at.z);
        troop.setRotation(0, at.heading, 0);
        troop.setScale(1.6);
        glide = at;
        if (marching.t >= 1) {
          const { arrived } = marching;
          marching = null;
          troop.visible = false;
          arrived();
        }
      }
      const site = sites[chosen];
      ring.visible = !!site;
      if (site) ring.setPosition(site.x, site.y + 0.9, site.z), ring.setScale(1 + 0.05 * Math.sin(clock * 3));
      // Name tags follow their strongholds and shrink away when the camera is far above.
      for (const place of PLACES) {
        const tag = tags[place.id];
        if (!tag) continue;
        const spot = sites[place.id],
          at = orbit.project(spot.x, spot.y + (spot.kind === 'city' ? 4.5 : 7), spot.z);
        if (!at || at.x < -60 || at.y < -30 || at.x > layer.clientWidth + 60 || at.y > layer.clientHeight + 30) {
          tag.remove();
          continue;
        }
        if (!tag.isConnected) layer.append(tag);
        tag.style.left = at.x.toFixed(1) + 'px';
        tag.style.top = at.y.toFixed(1) + 'px';
        tag.classList.toggle('is-active', place.id === chosen);
        tag.classList.toggle('is-small', orbit.distance > 210);
      }
    },
  };
  return realm;
}
