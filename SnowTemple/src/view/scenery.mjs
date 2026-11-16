// The place: a snowed-in road, the burnt fodder yard, the gate and the Mountain God's temple.
// All of it is modelled here from the layout in rules/arena.mjs, so what is drawn is what is walked on.
import {
  InstancedMesh3D,
  Mesh3D,
  Object3D,
  createCustomShader3D,
  createGeometry3D,
  createPointLight3D,
  createStandardMaterial3D
} from '@egret/engine/world3d';
import { PLACES, ROUNDS, WALLS, ZONES, edge } from '../rules/arena.mjs';
import { createBuilder, rgb, shade } from './build.mjs';

const SNOW = rgb(0xdfe7f2),
  SNOW_DIM = rgb(0xa9b6cc),
  STONE = rgb(0x5d636e),
  STONE_DARK = rgb(0x3c4048),
  TIMBER = rgb(0x4a2a1c),
  LACQUER = rgb(0x7a1f1a),
  TILE = rgb(0x2c3038),
  STRAW = rgb(0xb3924a),
  ASH = rgb(0x2a2624),
  BARK = rgb(0x2e221b),
  NEEDLE = rgb(0x1f3a2e);

/** Repeatable scatter: the same numbers every visit. */
function scatter(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}
const hash = (x, z) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function noise(x, z) {
  const ix = Math.floor(x),
    iz = Math.floor(z),
    fx = x - ix,
    fz = z - iz,
    ux = fx * fx * (3 - 2 * fx),
    uz = fz * fz * (3 - 2 * fz);
  return hash(ix, iz) * (1 - ux) * (1 - uz) + hash(ix + 1, iz) * ux * (1 - uz) + hash(ix, iz + 1) * (1 - ux) * uz + hash(ix + 1, iz + 1) * ux * uz;
}

/** Paved ground: the gate road and the forecourt. */
const paved = (x, z) => (z < -6.5 && z > -20 && Math.abs(x) < 3.4) || (z <= -19 && z > -43 && Math.abs(x) < 13.5 && edge(x, z) < 0.6);
/** Where the fire has been: the middle of the fodder yard. */
const burnt = (x, z) => Math.max(0, 1 - Math.hypot(x - 0.5, z - 8.5) / 9.5);
/** Height of the land: flat where one walks, rising into drifts and slopes beyond the edge. */
export function height(x, z) {
  const out = Math.max(0, edge(x, z) - 0.4);
  return Math.min(7, out * out * 0.05 + out * 0.16) * (0.6 + noise(x * 0.13, z * 0.13) * 0.9) + (out > 0 ? noise(x * 0.5, z * 0.5) * 0.25 : 0);
}

const GROUND_GLSL = `
float gHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), u.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec4 customFragment(vec4 color, vec3 worldPosition, vec3 normal, vec2 uv) {
    // Wind-combed snow: long soft streaks, a fine grain, and now and then a glint.
    vec2 p = worldPosition.xz;
    float streak = gNoise(vec2(p.x * 0.35 + p.y * 0.12, p.y * 1.7));
    float grain = gNoise(p * 9.0);
    float glint = step(0.992, gHash(floor(p * 34.0))) * smoothstep(0.55, 1.0, color.b);
    vec3 c = color.rgb * (0.86 + streak * 0.2 + grain * 0.08);
    return vec4(c + glint * 0.5, color.a);
}`;
const GROUND_NORMAL_GLSL = `
vec3 customNormal(vec3 normal, vec3 worldPosition, vec2 uv) {
    vec2 p = worldPosition.xz;
    float e = 0.12;
    float h0 = gNoise(p * 1.3) + gNoise(p * 4.1) * 0.35;
    float hx = gNoise((p + vec2(e, 0.0)) * 1.3) + gNoise((p + vec2(e, 0.0)) * 4.1) * 0.35;
    float hz = gNoise((p + vec2(0.0, e)) * 1.3) + gNoise((p + vec2(0.0, e)) * 4.1) * 0.35;
    return normal + vec3(h0 - hx, 0.0, h0 - hz) * 1.6;
}`;

function buildGround(scene) {
  // A grid fine enough to carry the paths, the ash and the drifts as colour at its corners.
  const X0 = -46,
    X1 = 46,
    Z0 = -74,
    Z1 = 50,
    STEP = 0.5,
    nx = Math.round((X1 - X0) / STEP) + 1,
    nz = Math.round((Z1 - Z0) / STEP) + 1,
    positions = new Float32Array(nx * nz * 3),
    normals = new Float32Array(nx * nz * 3),
    colors = new Float32Array(nx * nz * 3),
    indices = new Uint32Array((nx - 1) * (nz - 1) * 6);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const x = X0 + i * STEP,
        z = Z0 + j * STEP,
        k = (j * nx + i) * 3,
        y = height(x, z),
        e = 0.4,
        sx = (height(x + e, z) - height(x - e, z)) / (2 * e),
        sz = (height(x, z + e) - height(x, z - e)) / (2 * e),
        nl = Math.hypot(sx, 1, sz);
      positions.set([x, y, z], k);
      normals.set([-sx / nl, 1 / nl, -sz / nl], k);
      // Colour: fresh snow, trodden grey along the way, ash where the yard burned, bare rock on steep ground.
      const d = edge(x, z),
        trodden = Math.max(0, Math.min(1, -d / 3.5)) * (0.35 + noise(x * 0.9, z * 0.9) * 0.5),
        ash = burnt(x, z) * (0.5 + noise(x * 1.7, z * 1.7) * 0.7),
        steep = Math.max(0, Math.min(1, (Math.hypot(sx, sz) - 0.55) * 2.2)),
        drift = 0.9 + noise(x * 0.22, z * 0.22) * 0.16;
      for (let c = 0; c < 3; c++) {
        let v = SNOW[c] * drift;
        v += (SNOW_DIM[c] * 0.72 - v) * trodden;
        v += (ASH[c] - v) * Math.min(0.85, ash);
        v += (STONE_DARK[c] - v) * steep;
        colors[k + c] = v;
      }
    }
  let q = 0;
  for (let j = 0; j < nz - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i,
        b = a + 1,
        c = a + nx,
        d = c + 1;
      indices.set([a, c, b, b, c, d], q);
      q += 6;
    }
  const shader = createCustomShader3D({ key: 'snow-ground', glsl: GROUND_GLSL, glslNormal: GROUND_NORMAL_GLSL });
  const material = createStandardMaterial3D({ vertexColors: true, roughness: 0.82, metallic: 0 });
  material.shader = shader;
  const ground = new Mesh3D(createGeometry3D({ positions, normals, colors, indices }), material);
  ground.receiveShadow = true;
  scene.addChild(ground);
}

function buildPaving(scene, rand) {
  // Flagstones, each a little off true, snow lying on some and between all.
  const b = createBuilder();
  for (let z = -43; z < -6.5; z += 1.25)
    for (let x = -13.5 + (Math.round(z / 1.25) % 2) * 0.8; x < 13.5; x += 1.6) {
      if (!paved(x + 0.8, z + 0.6)) continue;
      const tone = 1.25 + rand() * 0.5,
        snowy = rand() < 0.16 + Math.max(0, Math.hypot(x, z + 29) - 7) * 0.08,
        tint = shade(STONE, tone);
      b.box(x + 0.8, 0.03 + rand() * 0.02, z + 0.6, 1.52, 0.1, 1.17, { tint: shade(tint, 0.6), top: snowy ? shade(SNOW, 0.55 + rand() * 0.2) : tint, ry: (rand() - 0.5) * 0.03 });
    }
  // The round terrace in the middle of the court, where the censer stands.
  const { x: cx, z: cz } = PLACES.court;
  for (let ring = 0; ring < 3; ring++)
    for (let i = 0, n = 10 + ring * 8; i < n; i++) {
      const a = (i / n) * Math.PI * 2,
        r = 1.2 + ring * 1.25;
      b.box(cx + Math.sin(a) * r, 0.07, cz + Math.cos(a) * r, (Math.PI * 2 * r) / n - 0.06, 0.12, 1.16, { tint: shade(STONE_DARK, 0.9 + rand() * 0.3), top: shade(STONE, 1.5 + rand() * 0.4), ry: a });
    }
  const mesh = b.mesh(createStandardMaterial3D({ vertexColors: true, roughness: 0.55, metallic: 0.05 }), { shadow: false });
  scene.addChild(mesh);
}

const GRASS_GLSL = `
vec3 customVertex(vec3 worldPosition, vec3 localPosition, vec3 normal, vec2 uv, vec4 color) {
    float bend = uv.y * uv.y;
    float t = uCustom[0].x;
    vec2 root = worldPosition.xz - localPosition.xz * 0.5;
    // Gusts cross the field as slow waves; each tuft shivers on top of that.
    float gust = sin(root.x * 0.35 + root.y * 0.22 + t * 1.3) + sin(root.x * 0.11 - root.y * 0.4 + t * 0.7) * 0.7;
    float shiver = sin(t * 5.3 + root.x * 3.1 + root.y * 2.3) * 0.25;
    vec3 p = worldPosition;
    p.x += (gust * 0.16 + shiver * 0.05 + 0.1) * bend;
    p.z += (gust * 0.07 + shiver * 0.04) * bend;
    // Whoever walks through pushes the stalks aside.
    vec2 away = root - uCustom[0].yz;
    float near = 1.0 - smoothstep(0.2, 1.5, length(away));
    p.xz += normalize(away + vec2(0.001)) * near * 0.5 * bend;
    p.y -= near * 0.25 * bend;
    return p;
}`;

function buildGrass(scene, rand, density) {
  // One tuft: five dry stalks leaning out of the snow, pale at the tips.
  const b = createBuilder(),
    low = rgb(0x4a4252),
    high = rgb(0xb9a98a);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4,
      lean = 0.16 + (i % 2) * 0.14,
      w = 0.028,
      dx = Math.cos(a),
      dz = Math.sin(a),
      h = 0.62 + (i % 3) * 0.2,
      base = [dx * 0.05, 0, dz * 0.05],
      top = [dx * (0.05 + lean), h, dz * (0.05 + lean)];
    b.sheet([base[0] - dz * w, 0, base[2] + dx * w], [base[0] + dz * w, 0, base[2] - dx * w], [top[0] + dz * w * 0.2, top[1], top[2] - dx * w * 0.2], [top[0] - dz * w * 0.2, top[1], top[2] + dx * w * 0.2], { tint: low, tintB: high });
  }
  const shader = createCustomShader3D({ key: 'snow-reeds', glslVertex: GRASS_GLSL });
  const material = createStandardMaterial3D({ vertexColors: true, roughness: 0.9, side: 'double' });
  material.shader = shader;
  const places = [];
  const want = Math.round(52000 * density);
  for (let tries = 0; places.length < want && tries < want * 6; tries++) {
    const x = -34 + rand() * 68,
      z = -52 + rand() * 96,
      d = edge(x, z);
    if (d > 13 || paved(x, z)) continue;
    // Thick along the edges of the way, thin where feet and fire have been.
    const patch = noise(x * 0.18 + 3, z * 0.18) * 1.3,
      keep = d > -0.6 ? patch : patch * 0.16 * (1 - burnt(x, z));
    if (rand() > keep) continue;
    if (ROUNDS.some((round) => Math.hypot(x - round.x, z - round.z) < round.r + 0.2)) continue;
    places.push(x, height(x, z), z);
  }
  const count = places.length / 3,
    grass = new InstancedMesh3D(b.geometry(), material, count, 3),
    quat = [0, 0, 0, 1];
  for (let i = 0; i < count; i++) {
    const turn = rand() * Math.PI * 2,
      size = 0.7 + rand() * 0.75;
    quat[1] = Math.sin(turn / 2);
    quat[3] = Math.cos(turn / 2);
    grass.setTransformAt(i, [places[i * 3], places[i * 3 + 1] - 0.03, places[i * 3 + 2]], quat, [size, size * (0.8 + rand() * 0.5), size]);
    const tone = 0.75 + rand() * 0.5,
      cold = rand();
    grass.setColorAt(i, tone * (0.92 + cold * 0.1), tone * 0.95, tone * (1.05 - cold * 0.2));
  }
  grass.count = count;
  grass.frustumCulled = false;
  grass.receiveShadow = true;
  scene.addChild(grass);
  return { shader, count };
}

// ---- things that stand on the ground ------------------------------------------------------




function lantern(b, glow, x, z) {
  const y = height(x, z);
  b.box(x, y + 0.12, z, 0.62, 0.24, 0.62, { tint: STONE });
  b.limb([x, y + 0.24, z], [x, y + 1.0, z], 0.13, 0.11, { tint: STONE, sides: 6 });
  b.box(x, y + 1.06, z, 0.46, 0.12, 0.46, { tint: STONE });
  for (const [dx, dz] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1]
  ])
    b.box(x + dx * 0.15, y + 1.29, z + dz * 0.15, 0.07, 0.34, 0.07, { tint: STONE_DARK });
  glow.box(x, y + 1.29, z, 0.24, 0.3, 0.24, { tint: [1, 0.62, 0.25] });
  b.limb([x, y + 1.46, z], [x, y + 1.72, z], 0.44, 0.06, { tint: STONE_DARK, sides: 4 });
  b.limb([x, y + 1.5, z], [x, y + 1.76, z], 0.4, 0.05, { tint: SNOW, sides: 4, caps: false });
}

function brazier(b, glow, x, z) {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    b.limb([x + Math.cos(a) * 0.42, 0, z + Math.sin(a) * 0.42], [x + Math.cos(a) * 0.2, 0.62, z + Math.sin(a) * 0.2], 0.03, 0.03, { tint: rgb(0x26262b), sides: 5 });
  }
  b.limb([x, 0.55, z], [x, 0.8, z], 0.28, 0.46, { tint: rgb(0x2b2b31), sides: 10 });
  glow.limb([x, 0.79, z], [x, 0.82, z], 0.4, 0.4, { tint: [1, 0.42, 0.1], sides: 10 });
}

function roof(b, x, y, z, w, d, rise, snow = 0.75) {
  // Two slopes meeting at a ridge, the eaves turned up at the corners.
  const slope = Math.atan2(rise, d / 2),
    run = Math.hypot(rise, d / 2) + 0.5;
  for (const side of [1, -1]) {
    b.box(x, y + rise / 2 - 0.08, z + (side * d) / 4, w, 0.2, run, { tint: shade(TILE, 0.8), top: shade(SNOW, snow), rx: side * slope });
    for (let i = 0; i <= 10; i++) {
      const px = x - w / 2 + (w * i) / 10;
      b.box(px, y + rise / 2 + 0.05, z + (side * d) / 4, 0.09, 0.07, run, { tint: TILE, rx: side * slope });
    }
    for (const end of [1, -1]) b.box(x + end * (w / 2 + 0.05), y + 0.08, z + side * (d / 2 + 0.1), 0.5, 0.16, 0.5, { tint: TILE, rx: side * -0.5, rz: end * 0.5 });
  }
  b.box(x, y + rise + 0.1, z, w + 0.3, 0.3, 0.34, { tint: TILE, top: shade(SNOW, snow) });
  for (const end of [1, -1]) b.box(x + end * (w / 2 + 0.1), y + rise + 0.32, z, 0.26, 0.5, 0.3, { tint: TILE, rz: end * -0.3 });
}

function buildGate(scene, rand, material, tall) {
  const b = createBuilder(),
    top = createBuilder(),
    { x, z } = PLACES.gate;
  // The wall to either side, capped with tile and snow.
  for (const wall of WALLS.slice(0, 2)) {
    const cx = (wall.ax + wall.bx) / 2,
      w = Math.abs(wall.bx - wall.ax) + 0.3;
    b.box(cx, 1.45, z, w, 2.9, 1.0, { tint: shade(rgb(0x8a8378), 0.8 + rand() * 0.2) });
    b.box(cx, 0.35, z, w + 0.1, 0.7, 1.16, { tint: STONE_DARK });
    b.box(cx, 3.02, z, w + 0.3, 0.26, 1.5, { tint: TILE, top: SNOW });
  }
  // Wall running on into the trees.
  for (const side of [1, -1]) b.box(x + side * 17, 1.4 + height(side * 17, z), z, 16, 3.4, 0.9, { tint: rgb(0x77716a), top: SNOW });
  // Gate house: four posts and a lintel under a roof that the camera may need to see through.
  for (const side of [1, -1]) {
    b.limb([x + side * 2.2, 0, z - 0.75], [x + side * 2.2, 4.6, z - 0.75], 0.24, 0.22, { tint: LACQUER, sides: 8 });
    b.limb([x + side * 2.2, 0, z + 0.75], [x + side * 2.2, 4.6, z + 0.75], 0.24, 0.22, { tint: LACQUER, sides: 8 });
    b.box(x + side * 2.2, 0.2, z, 0.8, 0.4, 2.3, { tint: STONE });
  }
  top.box(x, 4.4, z, 5.4, 0.42, 0.42, { tint: TIMBER });
  top.box(x, 3.72, z, 2.3, 0.72, 0.1, { tint: rgb(0x1c2a3a) }); // the name board
  top.box(x, 3.72, z + 0.06, 1.7, 0.36, 0.02, { tint: rgb(0xc9a44a) });
  roof(top, x, 4.62, z, 7.4, 4.0, 1.45);
  scene.addChild(b.mesh(material));
  const cover = createStandardMaterial3D({ vertexColors: true, roughness: 0.8 });
  const roofMesh = top.mesh(cover);
  scene.addChild(roofMesh);
  tall.push({ x, z, r: 4.2, material: cover, mesh: roofMesh });
  // The two leaves of the door, hung on the inner posts.
  const doors = [];
  for (const side of [1, -1]) {
    const hinge = new Object3D(),
      leaf = createBuilder();
    leaf.box(-side * 0.98, 1.7, 0, 1.94, 3.4, 0.14, { tint: LACQUER });
    for (let i = 0; i < 9; i++) leaf.ball(-side * (0.4 + (i % 3) * 0.55), 0.8 + Math.floor(i / 3) * 0.9, 0.08, 0.06, 0.06, 0.04, { tint: rgb(0xb58a3a), sides: 6, rings: 3 });
    leaf.box(-side * 0.98, 1.7, -0.08, 1.9, 0.14, 0.06, { tint: TIMBER });
    hinge.setPosition(x + side * 1.96, 0, z);
    hinge.addChild(leaf.mesh(material));
    scene.addChild(hinge);
    doors.push({ hinge, side, open: 0 });
  }
  return doors;
}

function buildTemple(scene, rand, material, glow) {
  const b = createBuilder(),
    { x, z } = PLACES.temple;
  // A stone terrace and its steps.
  b.box(x, 0.45, z, 21, 0.9, 11, { tint: STONE_DARK, top: shade(STONE, 0.9) });
  for (let i = 0; i < 4; i++) b.box(x, 0.11 + i * 0.22, z + 5.7 + (3 - i) * 0.42, 7, 0.22, 0.44, { tint: STONE, top: i % 2 ? SNOW : shade(STONE, 1.1) });
  // The hall: red columns, dark walls, a door standing a little open with lamplight behind it.
  b.box(x, 3.0, z - 1.2, 17, 4.2, 6.6, { tint: rgb(0x3a2a24) });
  for (let i = 0; i < 6; i++) b.limb([x - 8 + i * 3.2, 0.9, z + 3.4], [x - 8 + i * 3.2, 5.3, z + 3.4], 0.3, 0.27, { tint: LACQUER, sides: 9 });
  b.box(x, 5.3, z + 3.4, 17.6, 0.5, 0.5, { tint: TIMBER });
  for (const side of [1, -1]) b.box(x + side * 1.5, 2.7, z + 2.16, 1.3, 3.6, 0.12, { tint: LACQUER, ry: side * 0.5 });
  glow.box(x, 2.7, z + 2.1, 2.2, 3.5, 0.05, { tint: [1, 0.55, 0.2] });
  for (const side of [1, -1]) glow.box(x + side * 5.4, 3.0, z + 2.14, 1.6, 1.4, 0.05, { tint: [0.9, 0.5, 0.2] });
  b.box(x, 6.0, z + 3.6, 3.6, 0.9, 0.12, { tint: rgb(0x1c2a3a) });
  b.box(x, 6.0, z + 3.68, 2.8, 0.5, 0.02, { tint: rgb(0xc9a44a) });
  roof(b, x, 5.6, z + 0.6, 22, 12.5, 3.4, 0.82);
  roof(b, x, 9.0, z + 0.6, 13, 6, 2.2, 0.9);
  scene.addChild(b.mesh(material));
  void rand;
}

function buildProps(scene, rand, material, glow, tall, lights, models) {
  const b = createBuilder(),
    stone = createStandardMaterial3D({ vertexColors: true, roughness: 0.9, metallic: 0 }),
    bronze = createStandardMaterial3D({ vertexColors: true, roughness: 0.45, metallic: 0.7 });
  /** Stand a sculpted model on the ground. */
  const stand = (name, x, z, size, turn, material = stone, tallness = size) => {
    const mesh = new Mesh3D(models[name], material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.setPosition(x, height(x, z) - 0.03, z);
    mesh.setRotation(0, turn, 0);
    mesh.setScale(size, tallness, size);
    scene.addChild(mesh);
    return mesh;
  };
  const scorched = createStandardMaterial3D({ vertexColors: true, roughness: 0.95, color: 0x4a3a30 }),
    wood = createStandardMaterial3D({ vertexColors: true, roughness: 0.92 });
  for (const round of ROUNDS) {
    const { x, z, r } = round;
    if (round.kind === 'stack') {
      stand('stack', x, z, r, x * 3, x > 0 ? scorched : wood);
      if (x > 0) lights.push({ x, y: 5, z, color: 0xff6a20, intensity: 15, range: 17, flicker: 0.4 });
    }
    else if (round.kind === 'rock') stand('rock', x, z, r * 0.95, rand() * 6);
    else if (round.kind === 'lantern') {
      lantern(b, glow, x, z);
      lights.push({ x, y: 1.4, z, color: 0xffa050, intensity: 14, range: 10, flicker: 0.12 });
    } else if (round.kind === 'brazier') {
      brazier(b, glow, x, z);
      lights.push({ x, y: 1.3, z, color: 0xff7a2a, intensity: 26, range: 13, flicker: 0.3, fire: true });
    } else if (round.kind === 'cart') {
      b.box(x, 0.75, z, 1.5, 0.12, 2.5, { tint: TIMBER, top: SNOW, ry: 0.5, rz: 0.12 });
      for (const side of [1, -1]) b.limb([x + side * 0.85, 0.6, z + side * 0.3], [x + side * 0.95, 0.6, z + side * 0.36], 0.6, 0.6, { tint: rgb(0x2c1d14), sides: 12 });
      b.limb([x - 0.6, 0.8, z - 1.2], [x - 1.6, 0.2, z - 2.6], 0.05, 0.05, { tint: TIMBER, sides: 5 });
    } else if (round.kind === 'censer') {
      stand('censer', x, z, 1, 0, bronze);
      lights.push({ x, y: 2.6, z, color: 0xffb070, intensity: 30, range: 16, flicker: 0.2, fire: true });
    } else if (round.kind === 'lion') {
      stand('lion', x, z, 0.9, x < 0 ? 0.25 : -0.25);
    } else if (round.kind === 'stele') {
      b.box(x, 0.3, z, 1.5, 0.6, 0.9, { tint: STONE_DARK, top: SNOW });
      b.box(x, 1.9, z, 1.05, 2.8, 0.3, { tint: shade(STONE, 0.8), top: SNOW, ry: -0.2 });
    } else if (round.kind === 'pine') {
      const cover = createStandardMaterial3D({ vertexColors: true, roughness: 0.9 }),
        mesh = stand('pine', x, z, 0.95, rand() * 6, cover, 1.1);
      tall.push({ x, z, r: 2.4, material: cover, mesh });
    }
  }
  // What is left of the yard fence.
  for (const wall of WALLS.slice(2)) {
    for (let i = 0; i <= 4; i++) {
      const px = wall.ax + ((wall.bx - wall.ax) * i) / 4,
        pz = wall.az + ((wall.bz - wall.az) * i) / 4;
      b.limb([px, 0, pz], [px + (rand() - 0.5) * 0.2, 1.3 + rand() * 0.3, pz], 0.07, 0.05, { tint: shade(TIMBER, 0.7), sides: 5 });
    }
    b.limb([wall.ax, 0.9, wall.az], [wall.bx, 0.75, wall.bz], 0.05, 0.05, { tint: TIMBER, sides: 5 });
    b.limb([wall.ax, 0.45, wall.az], [wall.bx, 0.5, wall.bz], 0.05, 0.05, { tint: TIMBER, sides: 5 });
  }
  // Round the edges of the way: rocks, and pines standing back in the dark.
  for (let i = 0; i < 150; i++) {
    const x = -38 + rand() * 76,
      z = -56 + rand() * 100,
      d = edge(x, z);
    if (d > 1.2 && d < 4 && rand() < 0.5) stand('rock', x, z, 0.5 + rand() * 1.0, rand() * 6);
    else if (d > 3.5 && d < 22 && !(Math.abs(x) < 14 && z < -40) && !(z > 2 && z < 30 && d < 6 && Math.abs(x) < 4)) {
      const size = 0.95 + rand() * 0.6;
      stand('pine', x, z, size, rand() * 6, wood, size * (1 + rand() * 0.35));
    }
  }
  // Far peaks behind the temple, dim in the snow.
  for (let i = 0; i < 9; i++) {
    const x = -70 + i * 17 + rand() * 8,
      z = -92 - rand() * 26,
      h = 24 + rand() * 26;
    b.limb([x, -2, z], [x + (rand() - 0.5) * 8, h, z], 20 + rand() * 12, 1.5, { tint: rgb(0x1c2333), tintB: rgb(0x7f8ba6), sides: 7, caps: false });
  }
  scene.addChild(b.mesh(material));
}

/** Build the whole place. Returns what the view animates: grass, doors, lamps and what may hide the hero. */
export function buildScenery(scene, models, { density = 1 } = {}) {
  const rand = scatter(20261116),
    material = createStandardMaterial3D({ vertexColors: true, roughness: 0.85, metallic: 0 }),
    glowMaterial = createStandardMaterial3D({ vertexColors: true, roughness: 1, emissive: 0xff8a3a, emissiveIntensity: 2.4 }),
    glow = createBuilder(),
    tall = [],
    lamps = [];
  buildGround(scene);
  buildPaving(scene, rand);
  const grass = buildGrass(scene, rand, density);
  const doors = buildGate(scene, rand, material, tall);
  buildTemple(scene, rand, material, glow);
  buildProps(scene, rand, material, glow, tall, lamps, models);
  const glowMesh = glow.mesh(glowMaterial, { shadow: false });
  scene.addChild(glowMesh);
  // Lamps: the renderer lights a few point lights at a time, so only the nearest burn.
  const lights = lamps.map((lamp) => {
    const light = createPointLight3D({ color: lamp.color, intensity: 0, range: lamp.range });
    light.setPosition(lamp.x, lamp.y + height(lamp.x, lamp.z), lamp.z);
    scene.addChild(light);
    return { ...lamp, light, share: 0 };
  });
  void ZONES;
  return { grass, doors, lights, tall, glowMaterial };
}
