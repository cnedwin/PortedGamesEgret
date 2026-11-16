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
export const paved = (x, z) => (z < -6.5 && z > -20 && Math.abs(x) < 3.4) || (z <= -19 && z > -43 && Math.abs(x) < 13.5 && edge(x, z) < 0.6);
/** Where the fire has been: the middle of the fodder yard. */
const burnt = (x, z) => Math.max(0, 1 - Math.hypot(x - 0.5, z - 8.5) / 9.5);
/** Trodden snow leads from the brazier to the yard. */
function roadTrace(x, z) {
  if (z <= 16 || z >= 38) return 0;
  const center = Math.sin((z - 16) * 0.4) * 0.65;
  return Math.max(0, 1 - Math.abs(x - center) / 2.7) * Math.min(1, (z - 16) * 0.5, (38 - z) * 0.5);
}
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
    vec3 c = color.rgb * (0.89 + streak * 0.17 + grain * 0.055);
    float pixel = max(length(dFdx(p)), length(dFdy(p)));
    return vec4(c + glint * (1.0 - smoothstep(0.018, 0.038, pixel)) * 0.24, color.a);
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
        tread = Math.max(roadTrace(x, z), Math.min(1, -d / 3.4) * 0.45),
        trodden = Math.max(0, tread) * (0.6 + noise(x * 0.42, z * 0.42) * 0.23),
        ash = burnt(x, z) * (0.66 + noise(x * 0.75, z * 0.75) * 0.45),
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
  // Shallow meltwater has a broken frost rim and catches the same light as the wet flags.
  const ICE = [0.22, 0.28, 0.36];
  for (const [px, pz, size] of [
    [2.2, -15.5, 1.1], [-1.4, -9.2, 0.8], [-6.5, -25, 1.6], [7.2, -31.5, 1.4], [-3.5, -36.5, 1.2], [4.5, -22.8, 1.0], [-9.5, -31, 1.1],
    [1.2, 24.5, 1.3], [-1.6, 17.2, 1.0], [-2.5, 9.5, 1.7], [3.6, 12.4, 1.1], [0.8, -2.8, 1.2]
  ]) {
    const stony = paved(px, pz),
      lift = stony ? 0.137 : 0.015,
      frost = stony ? shade(STONE, 1.6) : shade(SNOW, 0.78),
      center = [px, lift, pz],
      outer = [],
      inner = [],
      turn = rand() * Math.PI;
    for (let i = 0; i < 10; i++) {
      const a = turn + i / 10 * Math.PI * 2,
        r = size * (0.58 + rand() * 0.24),
        x = Math.sin(a) * r,
        z = Math.cos(a) * r * 0.62;
      outer.push([px + x, lift, pz + z]);
      inner.push([px + x * 0.64, lift, pz + z * 0.64]);
    }
    for (let i = 0; i < 10; i++) {
      const next = (i + 1) % 10;
      b.sheet(center, inner[i], inner[next], inner[next], { tint: ICE });
      b.sheet(inner[next], inner[i], outer[i], outer[next], { tint: ICE, tintB: frost });
    }
  }
  // The round terrace in the middle of the court, where the censer stands.
  const { x: cx, z: cz } = PLACES.court;
  for (let ring = 0; ring < 3; ring++)
    for (let i = 0, n = 10 + ring * 8; i < n; i++) {
      const a = (i / n) * Math.PI * 2,
        r = 1.2 + ring * 1.25;
      b.box(cx + Math.sin(a) * r, 0.07, cz + Math.cos(a) * r, (Math.PI * 2 * r) / n - 0.06, 0.12, 1.16, { tint: shade(STONE_DARK, 0.9 + rand() * 0.3), top: shade(STONE, 1.5 + rand() * 0.4), ry: a });
    }
  // The flags are wet with melt: smooth enough to hold a dim picture of what stands on them.
  const material = createStandardMaterial3D({ vertexColors: true, roughness: 0.2, metallic: 0.05 }),
    mesh = b.mesh(material, { shadow: false });
  scene.addChild(mesh);
  return { mesh, material };
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
    low = rgb(0x59545d),
    high = rgb(0xb6a78e);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4,
      lean = 0.16 + (i % 2) * 0.14,
      w = 0.028,
      dx = Math.cos(a),
      dz = Math.sin(a),
      h = 0.48 + (i % 3) * 0.17,
      base = [dx * 0.05, 0, dz * 0.05],
      top = [dx * (0.05 + lean), h, dz * (0.05 + lean)];
    b.sheet([base[0] - dz * w, 0, base[2] + dx * w], [base[0] + dz * w, 0, base[2] - dx * w], [top[0] + dz * w * 0.2, top[1], top[2] - dx * w * 0.2], [top[0] - dz * w * 0.2, top[1], top[2] + dx * w * 0.2], { tint: low, tintB: high });
  }
  const shader = createCustomShader3D({ key: 'snow-reeds', glslVertex: GRASS_GLSL });
  const material = createStandardMaterial3D({ vertexColors: true, roughness: 0.9, side: 'double' });
  material.shader = shader;
  const places = [];
  const want = Math.round(15100 * density);
  for (let tries = 0; places.length < want * 3 && tries < want * 12; tries++) {
    const x = -34 + rand() * 68,
      z = -52 + rand() * 96,
      d = edge(x, z);
    if (d > 13 || paved(x, z)) continue;
    // Thick along the edges of the way, thin where feet and fire have been.
    const patch = noise(x * 0.18 + 3, z * 0.18) * 1.3,
      keep = (d > -0.6 ? patch : patch * 0.12) * (1 - roadTrace(x, z) * 0.94) * (1 - burnt(x, z) * 0.9);
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
  grass.layers = 2; // left out of the mirror picture
  grass.receiveShadow = true;
  scene.addChild(grass);
  return { shader, count };
}

// ---- things that stand on the ground ------------------------------------------------------





function brazier(b, glow, x, z) {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    b.limb([x + Math.cos(a) * 0.42, 0, z + Math.sin(a) * 0.42], [x + Math.cos(a) * 0.2, 0.62, z + Math.sin(a) * 0.2], 0.03, 0.03, { tint: rgb(0x26262b), sides: 5 });
  }
  b.limb([x, 0.55, z], [x, 0.8, z], 0.28, 0.46, { tint: rgb(0x2b2b31), sides: 10 });
  glow.limb([x, 0.79, z], [x, 0.82, z], 0.4, 0.4, { tint: [1, 0.42, 0.1], sides: 10 });
}


function buildGate(scene, rand, material, tall, models) {
  const { x, z } = PLACES.gate,
    place = (name, mat) => {
      const mesh = new Mesh3D(models[name], mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.setPosition(x, 0, z);
      scene.addChild(mesh);
      return mesh;
    };
  place('gate', material);
  // The wall runs on into the trees to either side.
  const far = createBuilder();
  for (const side of [1, -1]) far.box(x + side * 17.2, 1.4 + height(side * 17, z), z, 16, 3.4, 0.9, { tint: rgb(0x77716a), top: SNOW });
  scene.addChild(far.mesh(material));
  void rand;
  // The roof is its own piece: the camera may need to see through it.
  const cover = createStandardMaterial3D({ vertexColors: true, roughness: 0.8 }),
    roofMesh = place('gateRoof', cover);
  tall.push({ x, z, r: 4.2, top: 8.6, material: cover, mesh: roofMesh });
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

function buildTemple(scene, material, glow, models) {
  const { x, z } = PLACES.temple,
    hall = new Mesh3D(models.temple, material);
  hall.castShadow = true;
  hall.receiveShadow = true;
  hall.setPosition(x, 0, z);
  scene.addChild(hall);
  // Lamplight behind the door and the two lattice windows.
  glow.box(x, 2.7, z + 1.95, 2.3, 3.5, 0.05, { tint: [1, 0.55, 0.2] });
  for (const side of [1, -1]) glow.box(x + side * 5.6, 3.0, z + 1.98, 2.0, 1.7, 0.05, { tint: [0.9, 0.5, 0.2] });

  // Keep the entrance readable behind the duel: a pale snow line and warm lanterns frame the red door.
  const details = createBuilder();
  for (const side of [1, -1]) {
    const lx = x + side * 2.65;
    details.limb([lx, 3.1, z + 2.25], [lx, 3.55, z + 2.25], 0.036, 0.036, { tint: TIMBER, sides: 5 });
    details.box(lx, 2.97, z + 2.25, 0.58, 0.12, 0.43, { tint: LACQUER, top: SNOW });
    details.box(lx, 2.38, z + 2.25, 0.43, 0.11, 0.35, { tint: LACQUER });
    glow.box(lx, 2.66, z + 2.25, 0.42, 0.48, 0.32, { tint: [0.95, 0.3, 0.08] });
  }
  scene.addChild(details.mesh(material, { shadow: false }));
}

/** Layered profiles for the skyline visible from the title and the temple's forecourt. */
function buildRidges(b) {
  for (let layer = 0; layer < 3; layer++) {
    const distance = -84 - layer * 29;
    const seed = 3.4 + layer * 4.1;
    const base = rgb(0x202c43 + layer * 0x070706);
    const crest = rgb(0x475973 + layer * 0x080806);
    const point = (x) => {
      const t = x * 0.026 + seed;
      const height = 8 + layer * 3 + noise(t, seed) * 17 + noise(t * 2.8, seed + 1) * 5;
      return [x, height, distance + noise(t * 0.7, seed + 4) * 7];
    };
    for (let x = -135; x < 135; x += 4.5) {
      const left = point(x),
        right = point(x + 4.5);
      b.sheet([left[0], -3, left[2]], [right[0], -3, right[2]], right, left, { tint: base, tintB: crest });
    }
  }
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
      stand('lantern', x, z, 1, 0);
      glow.box(x, height(x, z) + 1.29, z, 0.26, 0.3, 0.26, { tint: [1, 0.62, 0.25] });
      lights.push({ x, y: 1.4, z, color: 0xffb66b, intensity: 11, range: 8.5, flicker: 0.1 });
    } else if (round.kind === 'brazier') {
      brazier(b, glow, x, z);
      lights.push({ x, y: 1.3, z, color: 0xff8f48, intensity: 20, range: 11, flicker: 0.25, fire: true });
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
      tall.push({ x, z, r: 2.7, top: mesh.position[1] + 7.6, material: cover, mesh });
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
    else if (d > (z > 15 ? 6 : 4.5) && d < 22 && !(Math.abs(x) < 14 && z < -40)) {
      const size = 0.95 + rand() * 0.6;
      stand('pine', x, z, size, rand() * 6, wood, size * (1 + rand() * 0.35));
    }
  }
  scene.addChild(b.mesh(material));
  const ridges = createBuilder();
  buildRidges(ridges);
  scene.addChild(ridges.mesh(material, { shadow: false }));
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
  const paving = buildPaving(scene, rand);
  const grass = buildGrass(scene, rand, density);
  const doors = buildGate(scene, rand, material, tall, models);
  buildTemple(scene, material, glow, models);
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
  return { grass, doors, lights, tall, glowMaterial, paving };
}
