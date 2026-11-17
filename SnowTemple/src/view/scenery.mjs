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
import { PLACES, ROUNDS, WALLS, WET, ZONES, edge } from '../rules/arena.mjs';
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

/** Stone follows the worn approach through the snow, then widens into the forecourt. */
export function paved(x, z) {
  const court = z <= -19 && z > -43 && Math.abs(x) < 13.5;
  const approach = z > -20 && z < 12;
  const trace = Math.sin((z + 6.5) * 0.32) * Math.min(0.45, Math.max(0, z + 6.5) * 0.09);
  const width = 3.4 - Math.max(0, z + 6.5) * 0.074;
  return (court || (approach && Math.abs(x - trace) < width)) && edge(x, z) < 0.58;
}

function pavingSnow(x, z) {
  const bank = noise(x * 0.40 + 28, z * 0.47) * 0.63 + noise(x * 1.1, z * 1.3 - 41) * 0.37;
  return Math.max(0, Math.min(1, (bank - 0.39 + Math.max(0, z) * 0.018) * 2.48));
}
/** Where the fire has been: the middle of the fodder yard. */
const burnt = (x, z) => Math.max(0, 1 - Math.hypot(x - 0.5, z - 8.5) / 9.5);
const saturate = (value) => Math.max(0, Math.min(1, value));
function smooth(lo, hi, value) {
  const t = saturate((value - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
}

const roadCenter = (z) => Math.sin((z - 16) * 0.4) * 0.65;
const roadSpan = (z) => smooth(15, 18, z) * (1 - smooth(38, 41.5, z));

/** The compacted footway widens and frays into the snow along the verges. */
function compactedRoad(x, z) {
  return (1 - smooth(0.63, 2.65, Math.abs(x - roadCenter(z)))) * roadSpan(z);
}

function roadTrace(x, z) {
  if (z <= 16 || z >= 38) return 0;
  return Math.max(0, 1 - Math.abs(x - roadCenter(z)) / 2.7) * Math.min(1, (z - 16) * 0.5, (38 - z) * 0.5);
}

function landHeight(x, z, distance) {
  const out = Math.max(0, distance - 0.4);
  return Math.min(7, out * out * 0.05 + out * 0.16) * (0.6 + noise(x * 0.13, z * 0.13) * 0.9) + (out > 0 ? noise(x * 0.5, z * 0.5) * 0.25 : 0);
}

/** Height of the land: flat where one walks, rising into drifts and slopes beyond the edge. */
export function height(x, z) {
  return landHeight(x, z, edge(x, z));
}

function snowSurface(x, z, distance = edge(x, z)) {
  const base = landHeight(x, z, distance), window = roadSpan(z);
  if (window === 0) return base;
  const across = Math.abs(x - roadCenter(z));
  const ripples = noise(x * 0.89 + z * 0.21, z * 0.38);
  const berm = smooth(1.6, 3.4, across) * (1 - smooth(4.7, 8.1, across));
  const shoulder = berm * (0.05 + 0.16 * ripples * ripples);
  const crust = (ripples - 0.58) * 0.038;
  const tread = (1 - smooth(0.6, 2.3, across)) * -0.021;
  // Visible relief leaves the collision surface and the actor foot plane untouched.
  return base + (shoulder + crust + tread) * window;
}

const GROUND_GLSL = `
float gHash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
}
float gNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), u.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec4 customFragment(vec4 color, vec3 worldPosition, vec3 normal, vec2 uv) {
    vec2 p = worldPosition.xz;
    float pixel = max(length(dFdx(p)), length(dFdy(p)));
    float fine = 1.0 - smoothstep(0.022, 0.080, pixel);
    // Packed crust, soft windrows, and small glints that disappear at distance.
    float streak = gNoise(vec2(p.x * 0.84 + p.y * 0.27, p.y * 2.15));
    float crust = gNoise(p * 5.3);
    float grain = gHash(floor(p * 26.0)) - 0.5;
    float glint = step(0.992, gHash(floor(p * 34.0))) * smoothstep(0.55, 1.0, color.b);
    vec3 c = color.rgb * (0.83 + streak * 0.20 + crust * 0.10 + grain * fine * 0.095);
    return vec4(c + glint * fine * 0.14, color.a);
}`;
const GROUND_NORMAL_GLSL = `
float snowGrain(vec2 p) {
    return gNoise(vec2(p.x * 1.4 + p.y * 0.45, p.y * 1.88)) + gNoise(p * 5.4) * 0.29;
}
vec3 customNormal(vec3 normal, vec3 worldPosition, vec2 uv) {
    vec2 p = worldPosition.xz;
    float pixel = max(length(dFdx(p)), length(dFdy(p)));
    float h0 = snowGrain(p), hx = snowGrain(p + vec2(0.087, 0.0)), hz = snowGrain(p + vec2(0.0, 0.087));
    return normal + vec3(h0 - hx, 0.0, h0 - hz) * mix(0.67, 1.69, 1.0 - smoothstep(0.02, 0.13, pixel));
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
        d = edge(x, z),
        k = (j * nx + i) * 3;
      positions.set([x, snowSurface(x, z, d), z], k);
    }
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const x = X0 + i * STEP,
        z = Z0 + j * STEP,
        k = (j * nx + i) * 3,
        left = Math.max(0, i - 1), right = Math.min(nx - 1, i + 1),
        near = Math.max(0, j - 1), far = Math.min(nz - 1, j + 1),
        sx = (positions[(j * nx + right) * 3 + 1] - positions[(j * nx + left) * 3 + 1]) / ((right - left) * STEP),
        sz = (positions[(far * nx + i) * 3 + 1] - positions[(near * nx + i) * 3 + 1]) / ((far - near) * STEP),
        nl = Math.hypot(sx, 1, sz);
      normals.set([-sx / nl, 1 / nl, -sz / nl], k);
      // Colour: fresh snow, trodden grey along the way, ash where the yard burned, bare rock on steep ground.
      const d = edge(x, z),
        tread = Math.max(compactedRoad(x, z), saturate(-d / 3.4) * 0.42),
        trodden = tread * (0.68 + noise(x * 1.1, z * 0.52) * 0.25),
        ash = burnt(x, z) * (0.66 + noise(x * 0.75, z * 0.75) * 0.45),
        steep = saturate((Math.hypot(sx, sz) - 0.55) * 2.2),
        drift = 0.9 + noise(x * 0.22, z * 0.22) * 0.16,
        grout = paved(x, z) ? (1 - pavingSnow(x, z) * 0.93) * 0.77 : 0;
      for (let c = 0; c < 3; c++) {
        let v = SNOW[c] * drift;
        v += (SNOW_DIM[c] * 0.67 - v) * trodden;
        v += (ASH[c] - v) * Math.min(0.85, ash);
        v += (STONE_DARK[c] - v) * steep;
        v += (STONE_DARK[c] * 0.74 - v) * grout;
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

const PAVING_GLSL = `
float pHash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
}
float pNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(pHash(i), pHash(i + vec2(1.0, 0.0)), u.x),
               mix(pHash(i + vec2(0.0, 1.0)), pHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec4 customFragment(vec4 color, vec3 worldPosition, vec3 normal, vec2 uv) {
    vec2 p = worldPosition.xz;
    float pixel = max(length(dFdx(p)), length(dFdy(p)));
    float fine = 1.0 - smoothstep(0.018, 0.068, pixel);
    float mottled = pNoise(p * 3.0 + vec2(p.y * 0.85, p.x * -0.40));
    float pores = pHash(floor(p * 29.0));
    float pits = smoothstep(0.7, 0.98, pores) * fine;
    float seam = abs(pNoise(p * 2.7 + vec2(4.7, -5.1)) - 0.54);
    float fracture = (1.0 - smoothstep(0.009, 0.036, seam)) * smoothstep(0.27, 0.72, mottled);
    float deposit = (1.0 - smoothstep(0.023, 0.075, seam)) * smoothstep(0.47, 0.81, mottled);
    // Frost belongs to the whole path. Drift shapes continue across neighbouring flags.
    float drift = pNoise(p * 0.73 + vec2(24.1, -8.5)) * 0.83 + mottled * 0.17;
    float frost = smoothstep(0.46, 0.80, drift) * uCustom[0].y;
    vec3 detail = vec3(0.73 + mottled * 0.38 + (pores - 0.5) * 0.14 * fine - pits * 0.16 - fracture * 0.21);
    return vec4(color.rgb * (detail + deposit * vec3(0.18, 0.17, 0.15) + frost * vec3(0.31, 0.35, 0.41)), color.a);
}`;
const PAVING_NORMAL_GLSL = `
vec3 customNormal(vec3 normal, vec3 worldPosition, vec2 uv) {
    vec2 p = worldPosition.xz;
    float pixel = max(length(dFdx(p)), length(dFdy(p)));
    float relief = (1.0 - smoothstep(0.022, 0.11, pixel)) * uCustom[0].x;
    vec2 grain = vec2(pNoise(p * 10.0), pNoise(p.yx * 10.0 + vec2(11.2, -6.0))) - 0.5;
    return normalize(normal + vec3(grain.x, 0.0, grain.y) * relief);
}`;

const tinted = (a, b, t) => a.map((value, channel) => value + (b[channel] - value) * t);

/** A chipped flag with a broad, worn face and stone exposed on the shoulders of the bevel. */
function flagstone(builder, x, z, width, depth, angle, crown, tint, rand) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const left = -width / 2, right = width / 2, back = -depth / 2, front = depth / 2;
  const cut = () => Math.min(width, depth) * (0.026 + rand() * 0.15);
  const shape = [
    [left + cut(), back], [left, back + cut()], [left, front - cut()], [left + cut(), front],
    [right - cut(), front], [right, front - cut()], [right, back + cut()], [right - cut(), back]
  ];
  const rim = [], face = [];
  for (const [px, pz] of shape) {
    const localX = px + (rand() - 0.5) * 0.046, localZ = pz + (rand() - 0.5) * 0.046;
    const dx = localX * cos + localZ * sin, dz = localZ * cos - localX * sin;
    const base = height(x + dx, z + dz);
    rim.push([x + dx, base + 0.007, z + dz]);
    const bevel = 0.903 + rand() * 0.070;
    face.push([x + dx * bevel, base + crown * (0.76 + rand() * 0.28), z + dz * bevel]);
  }
  const center = [x, height(x, z) + crown * 0.97, z];
  const frost = shade(SNOW_DIM, 0.76);
  const faceTint = tinted(tint, frost, pavingSnow(x, z) * 0.36);
  for (let i = 0; i < rim.length; i += 2) {
    const side = face[(i + 1) % face.length];
    const edgeTint = tinted(tint, frost, pavingSnow(side[0], side[2]) * 0.48);
    builder.sheet(center, face[i], side, face[(i + 2) % face.length], { tint: faceTint, tintB: edgeTint });
  }
  for (let i = 0; i < rim.length; i++) {
    const next = (i + 1) % rim.length;
    builder.sheet(rim[i], rim[next], face[next], face[i], { tint: shade(tint, 0.71 + rand() * 0.15), tintB: faceTint });
  }
}

/** Little melt runnels in trodden snow. Their rims fade out in the surrounding frost. */
function meltRunnel(builder, x, z, width, length, angle, rand) {
  const outer = [], inner = [];
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const wet = rgb(0x738091), crust = shade(SNOW_DIM, 0.90), snow = shade(SNOW, 0.86);
  const first = [x, snowSurface(x, z) + 0.017, z];
  for (let i = 0; i < 12; i++) {
    const turn = i * Math.PI / 6;
    const u = Math.sin(turn) * width * (0.69 + rand() * 0.31), v = Math.cos(turn) * length * (0.76 + rand() * 0.24);
    const dx = u * cos + v * sin, dz = v * cos - u * sin;
    outer.push([x + dx, snowSurface(x + dx, z + dz) + 0.012, z + dz]);
    const irregular = 0.45 + rand() * 0.27;
    inner.push([x + dx * irregular, snowSurface(x + dx * irregular, z + dz * irregular) + 0.015, z + dz * irregular]);
  }
  for (let i = 0; i < inner.length; i += 2) {
    builder.sheet(first, inner[i], inner[(i + 1) % inner.length], inner[(i + 2) % inner.length], { tint: wet, tintB: crust });
  }
  for (let i = 0; i < outer.length; i++) {
    const next = (i + 1) % outer.length;
    builder.sheet(inner[i], outer[i], outer[next], inner[next], { tint: crust, tintB: snow });
  }
}

function buildPaving(scene) {
  const rand = scatter(20261117);
  const flags = createBuilder(), sheen = createBuilder();
  const stone = [0x686c72, 0x505c65, 0x6b6763, 0x596366, 0x5e5e6c, 0x707272].map(rgb);
  const damp = WET; // the same patches the rules let a dodge slide on
  const runnels = [[1.18, 24.5, 0.42, 0.9, -0.24], [-1.1, 17.2, 0.35, 0.82, 0.24], [2.8, 10.1, 0.35, 0.79, 0.42], [-2.45, -2.1, 0.28, 0.70, 0.33]];
  const { x: cx, z: cz } = PLACES.court;
  let row = 0;
  for (let baseZ = -43.2; baseZ < 12; row++) {
    const depth = 0.91 + rand() * 0.63, z = baseZ + depth * 0.5;
    for (let baseX = -13.9 + (row % 2) * 0.7; baseX < 13.6;) {
      const width = 1.03 + rand() * 0.77, x = baseX + width * 0.5;
      baseX += width;
      if (!paved(x, z) || Math.hypot(x - cx, z - cz) < 4.26) continue;
      const frost = pavingSnow(x, z);
      if (z > 4 && rand() < frost * (z - 4) * 0.094) continue;
      const wet = frost < 0.64 && damp.some(([px, pz, reach]) => Math.hypot(x - px, (z - pz) * 0.78) < reach);
      const tint = shade(stone[Math.floor(rand() * stone.length)], (0.89 + rand() * 0.34) * (wet ? 0.77 : 1.0));
      flagstone(wet ? sheen : flags, x, z, width - 0.039, depth - 0.034, (rand() - 0.5) * 0.058, 0.020 + rand() * 0.025, tint, rand);
    }
    baseZ += depth;
  }
  // The round terrace keeps its existing footprint and uses the same dressed stone.
  for (let ring = 0; ring < 3; ring++) {
    for (let i = 0, count = 10 + ring * 8; i < count; i++) {
      const angle = ((i + (ring % 2) * 0.5) / count) * Math.PI * 2;
      const r = 1.2 + ring * 1.25;
      flagstone(flags, cx + Math.sin(angle) * r, cz + Math.cos(angle) * r,
        Math.PI * 2 * r / count - 0.039, 1.18, angle, 0.042 + rand() * 0.015,
        shade(stone[Math.floor(rand() * stone.length)], 1.05 + rand() * 0.14), rand);
    }
  }
  // Old stone still shows through where feet wear down the road snow. The banks
  // naturally cover the lower edges, so the flagstones merge into the same crust.
  const roadRand = scatter(1637086557);
  for (let front = 17.5; front < 39.7;) {
    const depth = 0.89 + roadRand() * 0.69;
    const z = front + depth / 2;
    front += depth;
    for (let left = roadCenter(z) - 2.63 + roadRand() * 0.28; left < roadCenter(z) + 2.14;) {
      const width = 0.79 + roadRand() * 0.71, x = left + width / 2;
      left += width;
      const wear = compactedRoad(x, z);
      if (wear <= 0.16 || roadRand() > 0.37 + wear * 0.54) continue;
      const base = shade(stone[Math.floor(roadRand() * stone.length)], 0.83 + roadRand() * 0.36);
      const tint = tinted(base, shade(SNOW_DIM, 0.9), 0.27 + (1 - wear) * 0.39);
      flagstone(flags, x, z, width - 0.051, depth - 0.055, (roadRand() - 0.5) * 0.074,
        0.011 + roadRand() * 0.027, tint, roadRand);
    }
  }
  for (const [x, z, width, length, angle] of runnels) meltRunnel(sheen, x, z, width, length, angle, rand);

  // Use one matte batch and one small damp batch. Mid/low light both with the normal scene pass.
  function surface(builder, roughness, normalGrain, frost) {
    const material = createStandardMaterial3D({ vertexColors: true, roughness, metallic: 0.0 });
    material.shader = createCustomShader3D({ key: 'snow-flagstone', glsl: PAVING_GLSL, glslNormal: PAVING_NORMAL_GLSL });
    material.shader.uniforms[0] = normalGrain;
    material.shader.uniforms[1] = frost;
    const mesh = builder.mesh(material, { shadow: false });
    scene.addChild(mesh);
    return { material, mesh };
  }
  surface(flags, 0.83, 0.68, 1);
  const wet = surface(sheen, 0.35, 0.30, 0.34);
  return { ...wet, nearReflection: (x, z) => damp.some(([px, pz]) => Math.hypot(x - px, z - pz) < 10.5) };
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
  // Broken dry leaves and pale frost tips share the single instanced tuft.
  const b = createBuilder(),
    low = rgb(0x605862),
    straw = rgb(0xc4ae91),
    frost = rgb(0xc4c5d2);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4,
      lean = 0.16 + (i % 2) * 0.14,
      w = i % 2 === 0 ? 0.036 : 0.021,
      dx = Math.cos(a),
      dz = Math.sin(a),
      h = 0.48 + (i % 3) * 0.17,
      base = [dx * 0.05, 0, dz * 0.05],
      top = [dx * (0.05 + lean), h, dz * (0.05 + lean)];
    b.sheet([base[0] - dz * w, 0, base[2] + dx * w], [base[0] + dz * w, 0, base[2] - dx * w], [top[0] + dz * w * 0.2, top[1], top[2] - dx * w * 0.2], [top[0] - dz * w * 0.2, top[1], top[2] + dx * w * 0.2], { tint: low, tintB: i % 2 ? straw : frost });
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
    places.push(x, snowSurface(x, z, d), z);
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
  const iron = rgb(0x33383b), hammered = rgb(0x514942);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    b.limb([x + c * 0.42, 0, z + s * 0.42], [x + c * 0.2, 0.62, z + s * 0.2], 0.042, 0.035, { tint: iron, sides: 6 });
    b.limb([x + c * 0.43, 0.03, z + s * 0.43], [x + c * 0.29, 0.05, z + s * 0.29], 0.054, 0.032, { tint: hammered, sides: 6 });
  }
  b.limb([x, 0.56, z], [x, 0.8, z], 0.28, 0.46, { tint: iron, tintB: hammered, sides: 12 });
  b.limb([x, 0.751, z], [x, 0.804, z], 0.464, 0.469, { tint: iron, tintB: hammered, sides: 12, caps: false });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.ball(x + Math.cos(a) * 0.447, 0.758, z + Math.sin(a) * 0.447, 0.028, 0.024, 0.028, { tint: hammered, sides: 5, rings: 3 });
  }
  b.limb([x, 0.797, z], [x, 0.806, z], 0.408, 0.402, { tint: rgb(0x2b201e), sides: 12 });
  for (let i = 0; i < 13; i++) {
    const angle = i * 2.399963, radius = 0.093 * Math.sqrt(i),
      px = x + Math.cos(angle) * radius, pz = z + Math.sin(angle) * radius;
    b.ball(px, 0.812, pz, 0.085, 0.038, 0.063, { tint: rgb(i % 3 === 0 ? 0x743529 : 0x392822), sides: 5, rings: 3 });
    if (i % 3 === 0) glow.ball(px + 0.016, 0.845, pz, 0.034, 0.011, 0.023, { tint: [1, 0.28, 0.06], sides: 5, rings: 3 });
  }
}

/** Split planks and a spoked carriage use the same merged scene geometry as the old cart. */
function buildCart(mesh, x, z) {
  const yaw = 0.5, c = Math.cos(yaw), s = Math.sin(yaw),
    at = (across, y, along) => [x + c * across + s * along, y, z - s * across + c * along];
  const plank = (across, y, along, w, h, d, tint, top) => mesh.box(...at(across, y, along), w, h, d, { tint, top, ry: yaw });
  const metal = rgb(0x33383c), rims = rgb(0x595047), oak = rgb(0x674337);
  for (let i = 0; i < 5; i++) plank((i - 2) * 0.28, 0.75, 0, 0.265, 0.11, 2.48, i % 2 ? TIMBER : oak, i < 2 ? SNOW_DIM : undefined);
  for (const side of [-1, 1]) {
    plank(side * 0.68, 0.91, 0, 0.12, 0.28, 2.3, TIMBER);
    plank(side * 0.685, 1.066, -0.24, 0.1, 0.046, 1.56, SNOW_DIM);
    mesh.limb(at(side * 0.63, 0.59, -1.13), at(side * 0.79, 0.24, -2.23), 0.045, 0.032, { tint: TIMBER, sides: 6 });
    const wheel = (angle) => at(side * 0.88, 0.57 + Math.sin(angle) * 0.51, Math.cos(angle) * 0.51);
    const hub = at(side * 0.88, 0.57, 0);
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6;
      mesh.limb(wheel(angle), wheel(angle + Math.PI / 6), 0.052, 0.052, { tint: rims, sides: 5, caps: false });
      if (i % 2 === 0) mesh.limb(hub, wheel(angle), 0.037, 0.024, { tint: oak, sides: 4, caps: false });
    }
    mesh.limb(at(side * 0.62, 0.57, 0), at(side * 0.95, 0.57, 0), 0.13, 0.104, { tint: metal, sides: 8 });
  }
  for (const end of [-1, 1]) plank(0, 0.885, end * 1.15, 1.34, 0.21, 0.12, oak);
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
  glow.box(x, 2.7, z + 1.95, 2.26, 3.45, 0.05, { tint: [0.84, 0.4, 0.13] });
  for (const side of [1, -1]) glow.box(x + side * 5.6, 3.0, z + 1.98, 2.0, 1.7, 0.05, { tint: [0.9, 0.5, 0.2] });

  // Lower wooden panels frame a lit lattice above and a narrow seam between the leaves.
  const details = createBuilder();
  const lattice = rgb(0x4b2c24);
  for (const side of [1, -1]) {
    const leaf = x + side * 0.59, face = z + 2.17;
    details.box(leaf, 1.83, face, 1.08, 1.74, 0.09, { tint: rgb(0x492b25) });
    details.box(leaf, 2.64, face + 0.055, 1.09, 0.16, 0.035, { tint: lattice });
    for (const stile of [-0.50, 0.50]) details.box(leaf + stile, 2.61, face + 0.055, 0.081, 3.31, 0.056, { tint: lattice });
    for (const rail of [3.11, 3.59, 4.04]) details.box(leaf, rail, face + 0.04, 1.07, 0.070, 0.057, { tint: lattice });
    details.box(leaf, 3.48, face + 0.062, 0.067, 1.53, 0.05, { tint: lattice });
    details.ball(x + side * 0.23, 1.92, face + 0.07, 0.062, 0.064, 0.043, { tint: rgb(0x8d6841), sides: 8, rings: 4 });
    // Draw the muntins outside the emissive panes at every model detail level.
    // They share this existing trim mesh, and leave the recess open to lamplight.
    const wx = x + side * 5.6, wz = z + 2.195;
    for (let column = -2; column <= 2; column++) details.box(wx + column * 0.32, 3.0, wz, 0.064, 1.69, 0.065, { tint: lattice });
    for (let row = -2; row <= 2; row++) details.box(wx, 3.0 + row * 0.29, wz, 2.0, 0.055, 0.065, { tint: lattice });
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

function buildProps(scene, rand, material, glow, tall, lights, models, propAtlas) {
  const b = createBuilder(),
    stone = createStandardMaterial3D({ vertexColors: true, roughness: 0.9, metallic: 0 }),
    bronze = createStandardMaterial3D({ vertexColors: true, roughness: 0.45, metallic: 0.7 }),
    sculpted = propAtlas ? createStandardMaterial3D({ ...propAtlas, vertexColors: true, metallic: 1, roughness: 1, normalScale: 0.49 }) : null;
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
  const scorched = sculpted ? sculpted.clone().setColor(0x96857c) :
    createStandardMaterial3D({ vertexColors: true, roughness: 0.95, color: 0x756054 }),
    wood = createStandardMaterial3D({ vertexColors: true, roughness: 0.92 });
  for (const round of ROUNDS) {
    const { x, z, r } = round;
    if (round.kind === 'stack') {
      stand('stack', x, z, r, x * 3, x > 0 ? scorched : sculpted ?? wood);
      if (x > 0) {
        // Split sheaves at the fire-facing edge, within the existing stack's snow skirt.
        const char = rgb(0x3c2925), fibre = rgb(0x795943);
        for (let i = 0; i < 5; i++) {
          const dx = (i - 2) * 0.22, turn = i * 0.71;
          b.limb([x + dx, 0.18 + i * 0.021, z + r * 0.65], [x + dx + 0.38 * Math.sin(turn), 0.09, z + r * 1.03],
            0.09, 0.035, { tint: char, tintB: fibre, sides: 6 });
        }
        lights.push({ x, y: 5, z, color: 0xff6a20, intensity: 15, range: 17, flicker: 0.4 });
      }
    }
    else if (round.kind === 'rock') stand('rock', x, z, r * 0.95, rand() * 6);
    else if (round.kind === 'lantern') {
      stand('lantern', x, z, 1, 0, sculpted ?? stone);
      glow.box(x, height(x, z) + 1.29, z, 0.26, 0.3, 0.26, { tint: [1, 0.62, 0.25] });
      lights.push({ x, y: 1.4, z, color: 0xffb66b, intensity: 11, range: 8.5, flicker: 0.1 });
    } else if (round.kind === 'brazier') {
      brazier(b, glow, x, z);
      lights.push({ x, y: 1.3, z, color: 0xff8f48, intensity: 20, range: 11, flicker: 0.25, fire: true });
    } else if (round.kind === 'cart') {
      buildCart(b, x, z);
    } else if (round.kind === 'censer') {
      stand('censer', x, z, 1, 0, sculpted ?? bronze);
      lights.push({ x, y: 2.6, z, color: 0xffb070, intensity: 30, range: 16, flicker: 0.2, fire: true });
    } else if (round.kind === 'lion') {
      stand('lion', x, z, 0.9, x < 0 ? 0.25 : -0.25, sculpted ?? stone);
    } else if (round.kind === 'stele') {
      stand('stele', x, z, 1, 0);
    } else if (round.kind === 'pine') {
      const cover = sculpted?.clone() ?? createStandardMaterial3D({ vertexColors: true, roughness: 0.9 }),
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
      stand('pine', x, z, size, rand() * 6, sculpted ?? wood, size * (1 + rand() * 0.35));
    }
  }
  scene.addChild(b.mesh(material));
  const ridges = createBuilder();
  buildRidges(ridges);
  scene.addChild(ridges.mesh(material, { shadow: false }));
  return sculpted;
}

/** Build the whole place. Returns what the view animates: grass, doors, lamps and what may hide the hero. */
export function buildScenery(scene, models, { density = 1, propAtlas } = {}) {
  // Seed the dressing after the former shared paving stream so unaffected scenery keeps its layout.
  const rand = scatter(1683703667),
    material = createStandardMaterial3D({ vertexColors: true, roughness: 0.85, metallic: 0 }),
    glowMaterial = createStandardMaterial3D({ vertexColors: true, roughness: 1, emissive: 0xff8a3a, emissiveIntensity: 2.4 }),
    glow = createBuilder(),
    tall = [],
    lamps = [];
  buildGround(scene);
  const paving = buildPaving(scene);
  const grass = buildGrass(scene, rand, density);
  const doors = buildGate(scene, rand, material, tall, models);
  buildTemple(scene, material, glow, models);
  const propMaterial = buildProps(scene, rand, material, glow, tall, lamps, models, propAtlas);
  const glowMesh = glow.mesh(glowMaterial, { shadow: false });
  scene.addChild(glowMesh);
  // Lamps: each has a light of its own; the view lets the nearest burn.
  const lights = lamps.map((lamp) => {
    const light = createPointLight3D({ color: lamp.color, intensity: 0, range: lamp.range });
    light.setPosition(lamp.x, lamp.y + height(lamp.x, lamp.z), lamp.z);
    scene.addChild(light);
    return { ...lamp, light, share: 0 };
  });
  void ZONES;
  return { grass, doors, lights, tall, glowMaterial, paving, propMaterial };
}
