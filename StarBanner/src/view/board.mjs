// 棋盘：把规则里的地形网格做成一块浮在空中的立体沙盘。陆地格子是一块块草皮、土路、沙滩和城砖，水面低一截，有起伏的
// 波纹和岸边的泥土断面；沙盘外沿切出分层的土石侧壁。森林、山、礁石、桥和地上的草花按格子摆上去，同一种东西用实例批量画。
// The board: the rules' terrain grid made into a floating diorama. Land tiles are turf, dirt road, sand and
// courtyard stone; water sits lower with a moving swell and earthen banks at its shores; the outer edge is cut into
// layered soil and rock. Woods, peaks, reefs, bridges and the grass and flowers on the ground go on their tiles, each
// kind drawn as one batch of instances.
import {
  InstancedMesh3D,
  Mesh3D,
  Object3D,
  createBoxGeometry3D,
  createConeGeometry3D,
  createCustomShader3D,
  createGeometry3D,
  createIcosahedronGeometry3D,
  createStandardMaterial3D,
  createToonMaterial3D,
  mat4Compose,
  mat4Multiply,
  quatFromEuler
} from '@egret/engine/world3d';
import { TILE } from './stage.mjs';
import { terrainAtlas, terrainUV } from './surface.mjs';

const WATER = new Set(['sea', 'ocean', 'reef', 'river', 'dock']);
const ROAD_NEIGHBOURS = new Set(['road', 'bridge', 'floor']);
// Atlas connection bits are north, east, south, west.
const DIRECTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const LAND_TOP = 0,
  BED = -0.9,
  SURFACE = -0.32,
  CAKE = -3.2;

// Top colours (linear) of each kind of ground, and of the earth under it.
const TOP = {
  plains: [0.4, 0.58, 0.26],
  forest: [0.29, 0.46, 0.21],
  mountain: [0.47, 0.47, 0.4],
  road: [0.74, 0.6, 0.4],
  beach: [0.9, 0.8, 0.58],
  floor: [0.6, 0.58, 0.55],
  bridge: [0.4, 0.58, 0.26]
};
const LOOK_TINT = { meadow: [1, 1, 1], coast: [1.02, 1.03, 0.96], highland: [0.94, 0.9, 1.0] };
const srgb = (c) => c.map((v) => Math.pow(v, 2.2));

/** A seeded random stream for the scatter, so the same map always looks the same. */
function scatter(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// A gentle swell and a lighter rim where the water is thin. uCustom[0] = (time, 0, 0, 0).
const WATER_VERTEX = /* glsl */ `
vec3 customVertex(vec3 wp, vec3 lp, vec3 n, vec2 uv, vec4 color) {
  float t = uCustom[0].x;
  wp.y += sin(wp.x * 0.9 + t * 1.3) * 0.035 + cos(wp.z * 0.7 - t * 1.1) * 0.035;
  return wp;
}`;
const WATER_VERTEX_WGSL = /* wgsl */ `
fn customVertex(wp: vec3f, lp: vec3f, n: vec3f, uv: vec2f, color: vec4f) -> vec3f {
  let t = material.custom[0].x;
  var p = wp;
  p.y = p.y + sin(p.x * 0.9 + t * 1.3) * 0.035 + cos(p.z * 0.7 - t * 1.1) * 0.035;
  return p;
}`;
const WATER_FRAGMENT = /* glsl */ `
vec4 customFragment(vec4 color, vec3 wp, vec3 normal, vec2 uv) {
  float t = uCustom[0].x;
  float glint = sin(wp.x * 2.3 + t * 1.7) * sin(wp.z * 2.1 - t * 1.3);
  glint = smoothstep(0.82, 0.98, glint);
  vec3 v = normalize(uCameraPosition.xyz - wp);
  float fres = pow(1.0 - clamp(v.y, 0.0, 1.0), 2.0);
  vec3 c = color.rgb + vec3(0.55, 0.7, 0.75) * glint * 0.22 + vec3(0.25, 0.35, 0.45) * fres * 0.4;
  return vec4(c, color.a);
}`;
const WATER_FRAGMENT_WGSL = /* wgsl */ `
fn customFragment(color: vec4f, wp: vec3f, normal: vec3f, uv: vec2f) -> vec4f {
  let t = material.custom[0].x;
  var glint = sin(wp.x * 2.3 + t * 1.7) * sin(wp.z * 2.1 - t * 1.3);
  glint = smoothstep(0.82, 0.98, glint);
  let v = normalize(frame.cameraPosition.xyz - wp);
  let fres = pow(1.0 - clamp(v.y, 0.0, 1.0), 2.0);
  let c = color.rgb + vec3f(0.55, 0.7, 0.75) * glint * 0.22 + vec3f(0.25, 0.35, 0.45) * fres * 0.4;
  return vec4f(c, color.a);
}`;
// Grass and flowers sway a little at their tips.
const SWAY = /* glsl */ `
vec3 customVertex(vec3 wp, vec3 lp, vec3 n, vec2 uv, vec4 color) {
  float t = uCustom[0].x;
  float h = max(lp.y, 0.0);
  wp.x += sin(t * 1.6 + wp.z * 0.8 + wp.x * 0.3) * h * 0.18;
  wp.z += cos(t * 1.3 + wp.x * 0.7) * h * 0.12;
  return wp;
}`;
const SWAY_WGSL = /* wgsl */ `
fn customVertex(wp: vec3f, lp: vec3f, n: vec3f, uv: vec2f, color: vec4f) -> vec3f {
  let t = material.custom[0].x;
  let h = max(lp.y, 0.0);
  var p = wp;
  p.x = p.x + sin(t * 1.6 + p.z * 0.8 + p.x * 0.3) * h * 0.18;
  p.z = p.z + cos(t * 1.3 + p.x * 0.7) * h * 0.12;
  return p;
}`;

/** A quad-based mesh builder with per-vertex colours. */
function quads() {
  const positions = [],
    normals = [],
    colors = [],
    uvs = [],
    indices = [];
  return {
    quad(a, b, c, d, n, col, { far = col, uv, corners = [col, col, far, far] } = {}) {
      const base = positions.length / 3;
      const vertices = [a, b, c, d];
      for (let i = 0; i < vertices.length; i++) {
        positions.push(...vertices[i]);
        normals.push(...n);
        colors.push(...corners[i]);
      }
      if (uv) uvs.push(...uv);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    },
    build() {
      return createGeometry3D({ positions, normals, colors, indices, ...(uvs.length ? { uvs } : {}) });
    },
    get empty() {
      return positions.length === 0;
    }
  };
}

/**
 * Make the board for `game` (or a map) into `scene`. `props` are the loaded prop models by name ({ geometry,
 * material, matrix, size }), any of which may be missing (then a plainer shape stands in). Returns the board group
 * and `update(seconds)` for the water and the swaying grass.
 */
export function buildBoard(scene, game, { look = 'meadow', props = {}, quality = 'medium', seed = 7 } = {}) {
  const group = new Object3D();
  group.name = 'board';
  scene.addChild(group);
  const W = game.w,
    H = game.h;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? null : game.terrain[y * W + x]);
  const wx = (x) => (x - W / 2) * TILE,
    wz = (y) => (y - H / 2) * TILE;
  const tint = LOOK_TINT[look] ?? LOOK_TINT.meadow;
  const rand = scatter(seed + W * 131 + H);
  const toon = (opts) => createToonMaterial3D({ steps: 3, vertexColors: true, ...opts });

  // ---- ground: tops, banks and the cake's sides ----
  const ground = quads();
  const shade = (c, k) => [c[0] * k * tint[0], c[1] * k * tint[1], c[2] * k * tint[2]];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = at(x, y);
      const x0 = wx(x),
        x1 = wx(x + 1),
        z0 = wz(y),
        z1 = wz(y + 1);
      if (WATER.has(t)) {
        // The bed under the water: sand near land, deeper blue-green out at sea.
        const deep = t === 'ocean' ? 0.55 : t === 'sea' || t === 'reef' ? 0.75 : 0.85;
        const bed = shade(srgb([0.62 * deep, 0.66 * deep, 0.5 * deep]), 1);
        ground.quad([x0, BED, z1], [x1, BED, z1], [x1, BED, z0], [x0, BED, z0], [0, 1, 0], bed, { uv: terrainUV('bed') });
        continue;
      }
      const checker = (x + y) % 2 ? 1.0 : 0.93;
      const wobble = 0.96 + rand() * 0.08;
      const top = shade(srgb(TOP[t] ?? TOP.plains), checker * wobble);
      const variant = (Math.imul(x + 5, 73856093) ^ Math.imul(y + 19, 19349663) ^ seed) >>> 16 & 3;
      let links = 0;
      if (t === 'road') for (const [i, [dx, dy]] of DIRECTIONS.entries()) {
        if (ROAD_NEIGHBOURS.has(at(x + dx, y + dy))) links |= 1 << i;
      }
      ground.quad([x0, LAND_TOP, z1], [x1, LAND_TOP, z1], [x1, LAND_TOP, z0], [x0, LAND_TOP, z0], [0, 1, 0], top, { uv: terrainUV(t, variant, links) });
      // Banks where land meets water, so the water sits in a cut channel.
      const soil = shade(srgb([0.46, 0.32, 0.2]), 1),
        grass = shade(srgb(TOP[t] ?? TOP.plains), 0.8);
      const bank = (nx, ny, a, b) => {
        const n = at(x + nx, y + ny);
        if (!n || !WATER.has(n)) return;
        ground.quad([a[0], BED, a[1]], [b[0], BED, b[1]], [b[0], LAND_TOP, b[1]], [a[0], LAND_TOP, a[1]], [nx, 0, ny], soil, { far: grass, uv: terrainUV(t === 'beach' ? 'bed' : 'earth') });
      };
      bank(1, 0, [x1, z1], [x1, z0]);
      bank(-1, 0, [x0, z0], [x0, z1]);
      bank(0, 1, [x0, z1], [x1, z1]);
      bank(0, -1, [x1, z0], [x0, z0]);
    }
  // The cake: the board's four outer walls, in bands of turf, soil and stone.
  const band = [
    [LAND_TOP, -0.25, srgb([0.3, 0.52, 0.18]), 'turf'],
    [-0.25, -1.4, srgb([0.48, 0.33, 0.2]), 'earth'],
    [-1.4, CAKE, srgb([0.4, 0.36, 0.33]), 'stone']
  ];
  const wall = (x, y, nx, ny, a, b) => {
    const water = WATER.has(at(x, y));
    for (const [hi, lo, col, type] of band) {
      const top = water ? Math.min(hi, BED) : hi;
      if (top <= lo) continue;
      const c = shade(col, nx + ny > 0 ? 0.82 : 0.95);
      ground.quad([a[0], lo, a[1]], [b[0], lo, b[1]], [b[0], top, b[1]], [a[0], top, a[1]], [nx, 0, ny], c, { uv: terrainUV(type) });
    }
  };
  for (let x = 0; x < W; x++) {
    wall(x, H - 1, 0, 1, [wx(x), wz(H)], [wx(x + 1), wz(H)]);
    wall(x, 0, 0, -1, [wx(x + 1), wz(0)], [wx(x), wz(0)]);
  }
  for (let y = 0; y < H; y++) {
    wall(W - 1, y, 1, 0, [wx(W), wz(y + 1)], [wx(W), wz(y)]);
    wall(0, y, -1, 0, [wx(0), wz(y)], [wx(0), wz(y + 1)]);
  }
  const groundMesh = new Mesh3D(ground.build(), toon({ map: terrainAtlas() ?? undefined }));
  groundMesh.receiveShadow = true;
  groundMesh.castShadow = false;
  group.addChild(groundMesh);

  // ---- water: one surface over every water tile, per-tile colour ----
  const water = quads();
  const shallow = srgb([0.37, 0.69, 0.63]);
  const shelf = (x, y, col) => {
    const left = Math.floor(x), top = Math.floor(y);
    let nearest = 1;
    for (let py = top - 1; py <= top + 1; py++) for (let px = left - 1; px <= left + 1; px++) {
      const land = at(px, py);
      if (!land || WATER.has(land) || land === 'bridge') continue;
      const dx = Math.max(px - x, 0, x - px - 1), dy = Math.max(py - y, 0, y - py - 1);
      nearest = Math.min(nearest, dx * dx + dy * dy);
    }
    const fade = Math.max(0, 1 - Math.sqrt(nearest) / 0.78) * 0.45;
    return col.map((c, i) => c + (shallow[i] - c) * fade);
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = at(x, y);
      if (!WATER.has(t)) continue;
      const col = srgb(t === 'ocean' ? [0.1, 0.3, 0.55] : t === 'river' ? [0.24, 0.52, 0.66] : [0.16, 0.44, 0.62]);
      // Split each tile into four so the swell bends the surface.
      for (let sy = 0; sy < 2; sy++)
        for (let sx = 0; sx < 2; sx++) {
          const ax = wx(x) + (sx * TILE) / 2,
            bx = ax + TILE / 2,
            az = wz(y) + (sy * TILE) / 2,
            bz = az + TILE / 2;
          const left = x + sx / 2, top = y + sy / 2;
          const corners = [
            shelf(left, top + 0.5, col),
            shelf(left + 0.5, top + 0.5, col),
            shelf(left + 0.5, top, col),
            shelf(left, top, col)
          ];
          water.quad([ax, SURFACE, bz], [bx, SURFACE, bz], [bx, SURFACE, az], [ax, SURFACE, az], [0, 1, 0], col, { corners });
        }
    }
  let waterMaterial = null;
  if (!water.empty) {
    waterMaterial = createStandardMaterial3D({ vertexColors: true, roughness: 0.25, metallic: 0, opacity: 0.82, alphaMode: 'blend', depthWrite: false });
    waterMaterial.shader = createCustomShader3D({ key: 'sb-water', glsl: WATER_FRAGMENT, wgsl: WATER_FRAGMENT_WGSL, glslVertex: WATER_VERTEX, wgslVertex: WATER_VERTEX_WGSL, uniforms: [0, 0, 0, 0] });
    const mesh = new Mesh3D(water.build(), waterMaterial);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.renderOrder = 2;
    group.addChild(mesh);
  }

  // ---- things on the tiles ----
  const placed = { oak: [], pine: [], crag: [], rocks: [], reef: [], tuft: [], flower: [], plank: [], rail: [] };
  const m = new Float32Array(16);
  const put = (list, x, z, y, yaw, s, sy = s) => list.push({ x, z, y, yaw, s, sy });
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = at(x, y);
      const cx = wx(x) + TILE / 2,
        cz = wz(y) + TILE / 2;
      if (t === 'forest') {
        const n = 3;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + rand() * 0.8;
          const r = 0.42 + rand() * 0.18;
          const kind = look === 'highland' || (look === 'meadow' && rand() < 0.35) ? 'pine' : 'oak';
          put(placed[kind], cx + Math.cos(a) * r, cz + Math.sin(a) * r, 0, rand() * 6.28, 0.85 + rand() * 0.3);
        }
      } else if (t === 'mountain') {
        put(placed.crag, cx + (rand() - 0.5) * 0.2, cz + (rand() - 0.5) * 0.2, 0, rand() * 6.28, 1.0 + rand() * 0.15);
      } else if (t === 'reef') {
        for (let i = 0; i < 2; i++) put(placed.reef, cx + (rand() - 0.5) * 1.1, cz + (rand() - 0.5) * 1.1, BED + 0.1, rand() * 6.28, 0.45 + rand() * 0.2);
      } else if (t === 'bridge') {
        // Planks across the stream, laid the way the land runs.
        const alongX = !WATER.has(at(x - 1, y)) || !WATER.has(at(x + 1, y));
        for (let i = 0; i < 5; i++) {
          const o = -0.8 + i * 0.4;
          put(placed.plank, alongX ? cx + o : cx, alongX ? cz : cz + o, 0.02, alongX ? Math.PI / 2 : 0, 1);
        }
        for (const side of [-0.92, 0.92]) put(placed.rail, alongX ? cx : cx + side, alongX ? cz + side : cz, 0.25, alongX ? 0 : Math.PI / 2, 1);
      } else if (t === 'plains' || t === 'road' || t === 'beach') {
        if (t !== 'plains') continue;
        const n = quality === 'low' ? 1 : 3 + Math.floor(rand() * 3);
        for (let i = 0; i < n; i++) put(placed.tuft, cx + (rand() - 0.5) * 1.7, cz + (rand() - 0.5) * 1.7, 0, rand() * 6.28, 0.7 + rand() * 0.6);
        if (rand() < 0.45) for (let i = 0; i < 2; i++) put(placed.flower, cx + (rand() - 0.5) * 1.6, cz + (rand() - 0.5) * 1.6, 0, rand() * 6.28, 0.8 + rand() * 0.4);
      }
    }

  const swayMaterials = [];
  /** One instanced batch of `list` with a model (`props[name]`) or the stand-in shape. */
  const batch = (list, model, fallback, { ink = false, sway = false, colorJitter = null } = {}) => {
    if (!list.length) return;
    const geometry = model?.geometry ?? fallback.geometry;
    const material = model?.material ?? fallback.material;
    if (sway) {
      material.shader = createCustomShader3D({ key: 'sb-sway', glslVertex: SWAY, wgslVertex: SWAY_WGSL, uniforms: [0, 0, 0, 0] });
      swayMaterials.push(material);
    }
    const mesh = new InstancedMesh3D(geometry, material, list.length);
    const local = model?.matrix;
    const fit = model ? model.fit : 1;
    list.forEach((p, i) => {
      const q = quatFromEuler(new Float32Array(4), 0, p.yaw, 0);
      mat4Compose(m, [p.x, p.y, p.z], q, [p.s * fit, p.sy * fit, p.s * fit]);
      if (local) mat4Multiply(m, m, local);
      mesh.setMatrixAt(i, m);
      if (colorJitter) {
        const k = colorJitter[0] + rand() * colorJitter[1];
        mesh.setColorAt(i, k, k, k);
      }
    });
    mesh.count = list.length;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (ink) mesh.layers |= 2;
    group.addChild(mesh);
    return mesh;
  };
  const vc = (geometry, color) => {
    const n = geometry.getAttribute?.('position')?.count ?? 0;
    void n;
    return { geometry, material: toon({ vertexColors: false, color }) };
  };
  batch(placed.oak, props.oak, vc(createIcosahedronGeometry3D({ radius: 0.7, detail: 1 }), 0x4c9a30), { colorJitter: [0.62, 0.2] });
  batch(placed.pine, props.pine, vc(createConeGeometry3D({ radius: 0.55, height: 1.8, radialSegments: 8 }), 0x2f6b2a), { colorJitter: [0.78, 0.2] });
  batch(placed.crag, props.crag, vc(createConeGeometry3D({ radius: 0.95, height: 1.9, radialSegments: 7 }), 0x8a8478));
  batch(placed.reef, props.rocks, vc(createIcosahedronGeometry3D({ radius: 0.5, detail: 0 }), 0x7c7a70));
  batch(placed.plank, null, vc(createBoxGeometry3D({ width: TILE * 1.02, height: 0.12, depth: 0.36 }), 0x9a6a3c));
  batch(placed.rail, null, vc(createBoxGeometry3D({ width: TILE * 1.0, height: 0.1, depth: 0.1 }), 0x6e4a2a));
  const tuftGeometry = createConeGeometry3D({ radius: 0.09, height: 0.32, radialSegments: 4 });
  batch(placed.tuft, null, vc(tuftGeometry, 0x5fae2e), { sway: true, colorJitter: [0.8, 0.35] });
  batch(placed.flower, null, vc(createIcosahedronGeometry3D({ radius: 0.07, detail: 0 }), 0xffe27a), { sway: true, colorJitter: [0.85, 0.3] });

  let time = 0;
  return {
    group,
    update(seconds) {
      time += seconds;
      if (waterMaterial) waterMaterial.shader.uniforms[0] = time;
      for (const s of swayMaterials) s.shader.uniforms[0] = time;
    },
    dispose() {
      group.removeFromParent();
    }
  };
}
