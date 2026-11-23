// 城池、关隘与渡口的模型，全用代码搭成：城墙按城的六角格范围围成方城，四角有角楼、四面有城门楼，城里是街巷和
// 一片片青瓦民居，正中是官署大殿；关隘是横在路上的一道关墙和高大的关楼；渡口是伸进水里的木码头、几条船和仓房。
// 城头的旗帜按城主的颜色着色，易主时跟着换。离镜头近的才搭起来，搭过的留着。
// The cities, passes and ferries, all made in code: walls around each city's hexes in a square, corner towers at the
// four corners and gate towers on the four sides, streets and blocks of grey-tiled houses inside and the hall of office
// in the middle; a pass is a wall across the road with a tall gate tower; a ferry is a timber pier running out into the
// water with boats and a storehouse. The banners on the walls take the colour of whoever holds the place and change
// when it changes hands. A place is built when the camera first comes near, and kept.
import {
  InstancedMesh3D,
  Mesh3D,
  createBoxGeometry3D,
  createConeGeometry3D,
  createCylinderGeometry3D,
  createGeometry3D,
  createGeometryBuilder3D,
  createCustomShader3D,
  createStandardMaterial3D,
  createSurfaceMaterial3D,
  linearColor3D,
  mat4Compose,
  quatFromEuler
} from '@egret/engine/world3d';
import { ADJACENT, NODES } from '../data/map.mjs';
import { HEX_H, HEX_W } from '../sim/hexgrid.mjs';
import { FOOTPRINTS, landAt, noise } from '../sim/land.mjs';

const STONE = 0x7d776e,
  STONE_DARK = 0x635e57,
  STONE_TOP = 0x6e6961,
  ARCH = 0x231d19,
  PLASTER = 0xd6ccb8,
  TIMBER = 0x7a2d22,
  ROOF = 0x3b4350,
  ROOF_HOUSE = [0x4b4c4e, 0x55524e, 0x45474b, 0x5b5650],
  HOUSE_WALL = [0xa89a82, 0x968a74, 0xb3a68e, 0x8c8170],
  PLANK = 0x6b5038,
  PLANK_DARK = 0x4a3726,
  PAVING = 0x8f8676;

// Roof tiles: grooves running down the slope and courses across it, fading where a pixel is larger than a tile.
const ROOF_GLSL = /* glsl */ `
vec4 customFragment(vec4 color, vec3 wp, vec3 n, vec2 uv) {
  float slope = smoothstep(0.15, 0.3, n.y) * (1.0 - smoothstep(0.92, 0.99, n.y));
  float along = abs(n.x) > abs(n.z) ? wp.z : wp.x;
  float pixel = max(length(dFdx(wp)), length(dFdy(wp)));
  float fine = 1.0 - smoothstep(0.025, 0.09, pixel);
  float groove = smoothstep(0.3, 0.5, abs(fract(along * 8.0) - 0.5));
  float course = smoothstep(0.4, 0.5, abs(fract(wp.y * 11.0) - 0.5));
  float k = 1.0 - (groove * 0.38 + course * 0.22) * fine * slope;
  return vec4(color.rgb * k, color.a);
}`;

// ——— Shapes ———
function flatGeometry(tris, flip = false) {
  // `tris` is a flat list of points, three per triangle; normals face each triangle's own way.
  const n = tris.length / 3,
    positions = new Float32Array(n * 3),
    normals = new Float32Array(n * 3);
  for (let t = 0; t < n; t += 3) {
    const a = tris.slice(t * 3, t * 3 + 3),
      b = tris.slice(t * 3 + 3, t * 3 + 6),
      c = tris.slice(t * 3 + 6, t * 3 + 9);
    const ux = b[0] - a[0],
      uy = b[1] - a[1],
      uz = b[2] - a[2],
      vx = c[0] - a[0],
      vy = c[1] - a[1],
      vz = c[2] - a[2];
    let nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    // A list that winds clockwise seen from outside is stored the other way round, facing out.
    const order = flip ? [0, 2, 1] : [0, 1, 2];
    for (let k = 0; k < 3; k++) {
      positions.set(tris.slice((t + order[k]) * 3, (t + order[k]) * 3 + 3), (t + k) * 3);
      normals.set(flip ? [-nx, -ny, -nz] : [nx, ny, nz], (t + k) * 3);
    }
  }
  return createGeometry3D({ positions, normals });
}
const quad = (out, a, b, c, d) => out.push(...a, ...b, ...c, ...a, ...c, ...d);
/**
 * A hipped roof `w` wide (x) and `d` deep (z), its eaves at y = 0 lifted at the corners, rising `h` to a ridge along x.
 * The ridge is shorter than the roof by its depth, as on a hall.
 */
function hipRoof(w, d, h, lift = 0.12) {
  const hw = w / 2,
    hd = d / 2,
    r = Math.max(0.05, hw - hd * 0.9);
  const c = (x, z, up = 0) => [x, up, z];
  const A = c(-hw, -hd, lift),
    B = c(hw, -hd, lift),
    C = c(hw, hd, lift),
    D = c(-hw, hd, lift);
  // Mid-eave points sag a little: the curve of a tiled roof.
  const ab = c(0, -hd, 0),
    cd = c(0, hd, 0);
  const R1 = [-r, h, 0],
    R2 = [r, h, 0];
  const t = [];
  // Front (z < 0) and back, each as two halves meeting at the sagging middle.
  t.push(...A, ...ab, ...R1, ...ab, ...R2, ...R1, ...ab, ...B, ...R2);
  t.push(...C, ...cd, ...R2, ...cd, ...R1, ...R2, ...cd, ...D, ...R1);
  // The two hipped ends.
  t.push(...B, ...C, ...R2, ...D, ...A, ...R1);
  // Undersides, so the eaves are not see-through from below.
  t.push(...A, ...B, ...ab, ...C, ...D, ...cd);
  return flatGeometry(t, true);
}
/** A gabled roof: two slopes meeting at a ridge along x, `w` long, `d` deep, `h` high, with gable ends. */
function gableRoof(w, d, h) {
  const hw = w / 2,
    hd = d / 2;
  const t = [];
  quad(t, [-hw, 0, -hd], [-hw, h, 0], [hw, h, 0], [hw, 0, -hd]);
  quad(t, [hw, 0, hd], [hw, h, 0], [-hw, h, 0], [-hw, 0, hd]);
  t.push(-hw, 0, hd, -hw, h, 0, -hw, 0, -hd);
  t.push(hw, 0, -hd, hw, h, 0, hw, 0, hd);
  return flatGeometry(t);
}
const box = (w, h, d) => createBoxGeometry3D({ width: w, height: h, depth: d });
const pick = (list, v) => list[Math.floor(v * list.length) % list.length];

// Cached unit shapes, scaled per use.
const UNIT = {
  box: box(1, 1, 1),
  post: createCylinderGeometry3D({ radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments: 6 })
};

/** Three builders, one for each material: stone, roof tiles, and timber and plaster. */
function builders() {
  const stone = createGeometryBuilder3D(),
    roof = createGeometryBuilder3D(),
    body = createGeometryBuilder3D();
  return {
    stone,
    roof,
    body,
    add(geometry, part) {
      body.add(geometry, part);
      return this;
    }
  };
}

/** A pavilion on a platform: posts, walls, and one or two hipped roofs. */
function pavilion(b, at, w, d, h, { tiers = 1, roof = ROOF, body = PLASTER, rot = 0 } = {}) {
  const [x, y, z] = at;
  const rotY = rot;
  const place = (lx, ly, lz) => [x + lx * Math.cos(rotY) + lz * Math.sin(rotY), y + ly, z - lx * Math.sin(rotY) + lz * Math.cos(rotY)];
  b.add(UNIT.box, { position: place(0, h / 2, 0), scale: [w, h, d], rotation: [0, rotY, 0], color: body });
  // Red posts at the corners and along the front.
  const posts = Math.max(2, Math.round(w / 0.55));
  for (let i = 0; i <= posts; i++)
    for (const s of [-1, 1]) b.add(UNIT.post, { position: place(-w / 2 + (w * i) / posts, h / 2, s * (d / 2 + 0.03)), scale: [0.09, h, 0.09], color: TIMBER });
  let top = y + h;
  let rw = w + 0.75,
    rd = d + 0.75;
  for (let tier = 0; tier < tiers; tier++) {
    const rh = rd * 0.42;
    b.roof.add(hipRoof(rw, rd, rh), { position: [x, top, z], rotation: [0, rotY, 0], color: roof });
    if (tier < tiers - 1) {
      // A short storey between the eaves.
      const sw = w * 0.72,
        sd = d * 0.72,
        sh = rh * 0.75;
      b.add(UNIT.box, { position: [x, top + sh / 2, z], scale: [sw, sh, sd], rotation: [0, rotY, 0], color: TIMBER });
      top += sh;
      rw = sw + 0.65;
      rd = sd + 0.65;
    } else top += rh;
  }
  return top;
}

// ——— A walled city ———
function walledCity(f, level, seed, flags) {
  const b = builders();
  const rnd = (k) => noise(seed * 0.37 + k * 1.618, k * 0.71 - seed * 0.13, 401);
  const hx = (f.a - 0.25) * HEX_W,
    hz = f.b * HEX_H;
  const T = 0.85,
    WH = f.a >= 3 ? 1.45 : 1.15,
    gate = 1.5;
  const y0 = level;
  // Walls in four runs, each broken at its gate.
  const run = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1),
      rot = Math.atan2(-(z2 - z1), x2 - x1);
    const mx = (x1 + x2) / 2,
      mz = (z1 + z2) / 2;
    b.stone.add(UNIT.box, { position: [mx, y0 + WH / 2 - 0.3, mz], scale: [len, WH + 0.6, T + 0.15], rotation: [0, rot, 0], color: STONE });
    b.stone.add(UNIT.box, { position: [mx, y0 + WH + 0.02, mz], scale: [len, 0.06, T - 0.2], rotation: [0, rot, 0], color: STONE_TOP });
    // Battlements along the outer edge.
    const n = Math.floor(len / 0.5);
    const ox = Math.sin(rot) * (T / 2 - 0.08),
      oz = Math.cos(rot) * (T / 2 - 0.08);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const px = x1 + (x2 - x1) * t,
        pz = z1 + (z2 - z1) * t;
      for (const s of [1, -0.85]) b.stone.add(UNIT.box, { position: [px + ox * s, y0 + WH + 0.14, pz + oz * s], scale: [0.26, 0.24, 0.14], rotation: [0, rot, 0], color: s > 0 ? STONE_DARK : STONE_TOP });
    }
  };
  const corners = [
    [-hx, -hz],
    [hx, -hz],
    [hx, hz],
    [-hx, hz]
  ];
  for (let i = 0; i < 4; i++) {
    const [x1, z1] = corners[i],
      [x2, z2] = corners[(i + 1) % 4];
    const mx = (x1 + x2) / 2,
      mz = (z1 + z2) / 2,
      len = Math.hypot(x2 - x1, z2 - z1);
    const ux = (x2 - x1) / len,
      uz = (z2 - z1) / len;
    run(f.x + x1, f.z + z1, f.x + mx - ux * gate, f.z + mz - uz * gate);
    run(f.x + mx + ux * gate, f.z + mz + uz * gate, f.x + x2, f.z + z2);
    // The gate: a solid block with a dark arch, a gate tower on it.
    const rot = Math.atan2(-uz, ux);
    const gx = f.x + mx,
      gz = f.z + mz;
    b.stone.add(UNIT.box, { position: [gx, y0 + WH / 2 - 0.3, gz], scale: [gate * 2 + 0.4, WH + 0.6, T + 0.55], rotation: [0, rot, 0], color: STONE_DARK });
    b.add(UNIT.box, { position: [gx, y0 + 0.42, gz], scale: [0.85, 0.95, T + 0.6], rotation: [0, rot, 0], color: ARCH });
    const top = pavilion(b, [gx, y0 + WH, gz], gate * 1.55, 0.95, 0.62, { tiers: f.a >= 3 ? 2 : 1, rot });
    flags.push([gx + Math.sin(rot) * 0.2 - Math.cos(rot) * 1.4, y0 + WH, gz + Math.cos(rot) * 0.2 + Math.sin(rot) * 1.4], [gx + Math.cos(rot) * 1.4, y0 + WH, gz - Math.sin(rot) * 1.4]);
    void top;
  }
  // Corner towers.
  for (const [cx, cz] of corners) {
    b.stone.add(UNIT.box, { position: [f.x + cx, y0 + (WH + 0.3) / 2 - 0.3, f.z + cz], scale: [1.55, WH + 0.9, 1.55], color: STONE });
    pavilion(b, [f.x + cx, y0 + WH + 0.3, f.z + cz], 0.95, 0.95, 0.5, { rot: 0 });
    flags.push([f.x + cx * 1.02, y0 + WH + 0.3, f.z + cz * 1.02]);
  }
  // Inside: paving along the two main streets, the hall of office, and blocks of houses.
  const ix = hx - T / 2 - 0.15,
    iz = hz - T / 2 - 0.15;
  b.add(UNIT.box, { position: [f.x, y0 + 0.02, f.z], scale: [ix * 2, 0.04, 0.95], color: PAVING });
  b.add(UNIT.box, { position: [f.x, y0 + 0.02, f.z], scale: [0.95, 0.04, iz * 2], color: PAVING });
  const big = f.a >= 3;
  const hallW = big ? 3.6 : 2.4,
    hallD = big ? 2.2 : 1.6;
  b.stone.add(UNIT.box, { position: [f.x, y0 + 0.16, f.z], scale: [hallW + 1.2, 0.32, hallD + 1.1], color: STONE });
  pavilion(b, [f.x, y0 + 0.32, f.z], hallW, hallD, big ? 0.95 : 0.75, { tiers: big ? 2 : 1, body: TIMBER });
  if (big)
    for (const s of [-1, 1]) pavilion(b, [f.x + s * (hallW / 2 + 1.25), y0, f.z + 0.4], 1.5, 1.0, 0.55, { rot: Math.PI / 2, body: PLASTER });
  // Houses in rows, leaving the streets and the hall clear.
  const keepX = hallW / 2 + (big ? 2.4 : 0.9),
    keepZ = hallD / 2 + 0.9;
  let k = 0;
  for (let z = -iz + 0.55; z < iz - 0.4; z += 1.05)
    for (let x = -ix + 0.65; x < ix - 0.5; x += 1.25) {
      k++;
      if (Math.abs(z) < 0.95 || Math.abs(x) < 0.95) continue;
      if (Math.abs(x) < keepX && Math.abs(z) < keepZ) continue;
      const v = rnd(k);
      if (v < 0.12) continue;
      const w = 0.8 + rnd(k + 0.5) * 0.35,
        d = 0.62 + rnd(k + 0.7) * 0.18,
        h = 0.36 + rnd(k + 0.9) * 0.22;
      const px = f.x + x + (rnd(k + 1.1) - 0.5) * 0.18,
        pz = f.z + z;
      b.add(UNIT.box, { position: [px, y0 + h / 2, pz], scale: [w, h, d], color: pick(HOUSE_WALL, rnd(k + 1.3)) });
      b.roof.add(gableRoof(w + 0.16, d + 0.22, 0.3), { position: [px, y0 + h, pz], color: pick(ROOF_HOUSE, rnd(k + 1.7)) });
    }
  return b;
}

// ——— A pass across the road ———
function passFort(f, level, seed, flags) {
  const b = builders();
  // Across the line between the two places it joins.
  const near = (ADJACENT[f.id] ?? []).map((l) => NODES[l.to]);
  let ax = 1,
    az = 0;
  if (near.length >= 2) {
    ax = near[1].x - near[0].x;
    az = near[1].y - near[0].y;
  } else if (near.length === 1) {
    ax = near[0].x - f.x;
    az = near[0].y - f.z;
  }
  const l = Math.hypot(ax, az) || 1;
  ax /= l;
  az /= l;
  // The wall runs across the road.
  const rot = Math.atan2(ax, az);
  const WH = 1.7,
    T = 1.1,
    span = 9;
  const y0 = level;
  for (const s of [-1, 1]) {
    const cx = f.x + Math.cos(rot) * s * (span / 2 + 1.2),
      cz = f.z - Math.sin(rot) * s * (span / 2 + 1.2);
    b.stone.add(UNIT.box, { position: [cx, y0 + WH / 2 - 0.4, cz], scale: [span, WH + 0.8, T], rotation: [0, rot, 0], color: STONE });
    const n = Math.floor(span / 0.5);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n - 0.5;
      b.stone.add(UNIT.box, { position: [cx + Math.cos(rot) * t * span - Math.sin(rot) * 0.42, y0 + WH + 0.12, cz - Math.sin(rot) * t * span - Math.cos(rot) * 0.42], scale: [0.26, 0.24, 0.14], rotation: [0, rot, 0], color: STONE_DARK });
    }
    // Watchtowers at the ends.
    const ex = f.x + Math.cos(rot) * s * (span + 1.4),
      ez = f.z - Math.sin(rot) * s * (span + 1.4);
    b.stone.add(UNIT.box, { position: [ex, y0 + 0.9, ez], scale: [1.6, 2.6, 1.6], color: STONE });
    pavilion(b, [ex, y0 + 2.2, ez], 0.95, 0.95, 0.5);
    flags.push([ex, y0 + 2.2, ez]);
  }
  b.stone.add(UNIT.box, { position: [f.x, y0 + WH / 2 - 0.3, f.z], scale: [3.2, WH + 1.2, T + 0.8], rotation: [0, rot, 0], color: STONE_DARK });
  b.add(UNIT.box, { position: [f.x, y0 + 0.5, f.z], scale: [1.0, 1.1, T + 0.9], rotation: [0, rot, 0], color: ARCH });
  pavilion(b, [f.x, y0 + WH + 0.3, f.z], 2.4, 1.2, 0.8, { tiers: 2, rot });
  flags.push([f.x + Math.cos(rot) * 1.9, y0 + WH + 0.3, f.z - Math.sin(rot) * 1.9], [f.x - Math.cos(rot) * 1.9, y0 + WH + 0.3, f.z + Math.sin(rot) * 1.9]);
  void seed;
  return b;
}

// ——— A ferry or port ———
function harbour(f, level, seed, flags) {
  const b = builders();
  const s = {};
  // Which way the water lies: the mean of the wet points round about.
  let wx = 0,
    wz = 0;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    for (const r of [4, 7, 10]) {
      landAt(f.x + Math.cos(a) * r, f.z + Math.sin(a) * r, s);
      if (s.water) {
        wx += Math.cos(a) / r;
        wz += Math.sin(a) / r;
      }
    }
  }
  const l = Math.hypot(wx, wz) || 1;
  wx /= l;
  wz /= l;
  const rot = Math.atan2(wx, wz);
  const y0 = level;
  // A storehouse and a hall on the shore, behind a palisade.
  const back = (d, side) => [f.x - wx * d + Math.cos(rot) * side, f.z - wz * d - Math.sin(rot) * side];
  for (const [d, side, w] of [
    [2.2, -1.6, 1.4],
    [2.6, 1.4, 1.1],
    [0.6, 2.6, 0.9]
  ]) {
    const [px, pz] = back(d, side);
    b.add(UNIT.box, { position: [px, y0 + 0.28, pz], scale: [w, 0.56, 0.8], rotation: [0, rot, 0], color: PLANK });
    b.roof.add(gableRoof(w + 0.2, 1.0, 0.36), { position: [px, y0 + 0.56, pz], rotation: [0, rot + Math.PI / 2, 0], color: ROOF_HOUSE[1] });
  }
  pavilion(b, [...(() => {
    const [px, pz] = back(1.8, 0);
    return [px, y0, pz];
  })()], 1.1, 0.8, 0.5, { rot });
  // The pier, out over the water on posts.
  const len = 6;
  for (let i = 0; i <= len * 2; i++) {
    const d = i * 0.5;
    const px = f.x + wx * d,
      pz = f.z + wz * d;
    landAt(px, pz, s);
    const y = Math.max(level - 0.2, (s.water ? s.level : s.height) + 0.25);
    b.add(UNIT.box, { position: [px, y, pz], scale: [0.95, 0.07, 0.52], rotation: [0, rot + Math.PI / 2, 0], color: i % 2 ? PLANK : PLANK_DARK });
    if (i % 2 === 0) for (const sd of [-1, 1]) b.add(UNIT.post, { position: [px + Math.cos(rot) * sd * 0.42, y - 0.5, pz - Math.sin(rot) * sd * 0.42], scale: [0.07, 1.0, 0.07], color: PLANK_DARK });
  }
  // Boats moored beside it.
  for (const [d, side] of [
    [3, 1.3],
    [5, -1.3],
    [6.5, 1.4]
  ]) {
    const px = f.x + wx * d + Math.cos(rot) * side,
      pz = f.z + wz * d - Math.sin(rot) * side;
    landAt(px, pz, s);
    const y = (s.water ? s.level : s.height) + 0.08;
    b.add(UNIT.box, { position: [px, y, pz], scale: [0.6, 0.22, 2.0], rotation: [0, rot, 0], color: PLANK_DARK });
    b.add(UNIT.box, { position: [px, y + 0.2, pz - wz * 0.2], scale: [0.45, 0.2, 0.8], rotation: [0, rot, 0], color: 0x8a7556 });
    b.add(UNIT.post, { position: [px, y + 0.8, pz], scale: [0.05, 1.4, 0.05], color: PLANK_DARK });
  }
  flags.push([f.x - wx * 0.6, y0, f.z - wz * 0.6]);
  void seed;
  return b;
}

/** The height of the top of a walled place's walls, where defenders stand. */
export function wallTop(f) {
  const level = (f.level ?? landAt(f.x, f.z, {}).height) + 0.02;
  if (f.kind === 'pass') return level + 1.7;
  return level + (f.a >= 3 ? 1.45 : 1.15) + 0.05;
}

/** Flag on a pole, 0.8 tall; the cloth takes the instance's colour. */
function flagShape() {
  const b = createGeometryBuilder3D();
  b.add(UNIT.post, { position: [0, 0.45, 0], scale: [0.035, 0.9, 0.035], color: 0x2a201a });
  b.add(UNIT.box, { position: [0.2, 0.72, 0], scale: [0.38, 0.3, 0.02], color: 0xffffff });
  b.add(createConeGeometry3D({ radius: 0.04, height: 0.08, radialSegments: 4 }), { position: [0, 0.93, 0], color: 0xc9a24a });
  return b.build();
}

/**
 * The places of the map as models. `colourOf(nodeId)` gives the colour of whoever holds a place (or null). Returns
 * `update(x, z, reach)` to build what has come near, and `recolour()` after places change hands.
 */
export function createPlaces(scene, { quality = 'medium', colourOf }) {
  const material = createStandardMaterial3D({ vertexColors: true, roughness: 0.86, metallic: 0 });
  const stoneMaterial = createSurfaceMaterial3D({ surface: 'brick', scale: 2.2, strength: 0.45, bump: 0.5, roughness: 0.92, metallic: 0 });
  const roofMaterial = createStandardMaterial3D({ vertexColors: true, roughness: 0.7, metallic: 0 });
  roofMaterial.shader = createCustomShader3D({ key: 'nine-roof', glsl: ROOF_GLSL });
  const built = new Map();
  const flagSpots = [];
  const flagCapacity = 1600;
  const flags = new InstancedMesh3D(flagShape(), createStandardMaterial3D({ vertexColors: true, roughness: 0.8, metallic: 0 }), flagCapacity);
  flags.count = 0;
  flags.castShadow = quality !== 'low';
  flags.pickable = false;
  flags.frustumCulled = false;
  scene.addChild(flags);
  const m = new Float32Array(16),
    q = [0, 0, 0, 1];
  function build(f) {
    const node = NODES[f.id];
    const level = (f.level ?? landAt(f.x, f.z, {}).height) + 0.02;
    const spots = [];
    const seed = Math.round(f.x * 13 + f.z * 7);
    const parts = node.kind === 'city' ? walledCity(f, level, seed, spots) : node.kind === 'pass' ? passFort(f, level, seed, spots) : harbour(f, level, seed, spots);
    const group = [];
    for (const [builder, mat] of [
      [parts.stone, stoneMaterial],
      [parts.roof, roofMaterial],
      [parts.body, material]
    ]) {
      if (!builder.parts) continue;
      const mesh = new Mesh3D(builder.build(), mat);
      mesh.castShadow = quality !== 'low';
      mesh.receiveShadow = true;
      mesh.userData = { place: f.id };
      scene.addChild(mesh);
      group.push(mesh);
    }
    const mesh = group;
    for (const p of spots) {
      if (flags.count >= flagCapacity) break;
      const i = flags.count++;
      quatFromEuler(q, 0, noise(p[0], p[2], 9) * 6.28, 0);
      mat4Compose(m, p, q, [1, 1, 1]);
      flags.setMatrixAt(i, m);
      flagSpots.push({ place: f.id, i });
      paint(i, f.id);
    }
    built.set(f.id, mesh);
  }
  function paint(i, id) {
    const c = colourOf(id);
    const [r, g, b] = c === null || c === undefined ? [0.55, 0.53, 0.5] : linearColor3D(c);
    flags.setColorAt(i, r, g, b);
  }
  return {
    meshes: built,
    /** Build the places within `reach` of (x, z). */
    update(x, z, reach) {
      let made = 0;
      for (const f of Object.values(FOOTPRINTS)) {
        if (built.has(f.id)) continue;
        if (Math.abs(f.x - x) > reach || Math.abs(f.z - z) > reach) continue;
        build(f);
        if (++made >= 3) break;
      }
    },
    recolour() {
      for (const s of flagSpots) paint(s.i, s.place);
    }
  };
}

export { STONE, ROOF };
