// What a blow looks like: spear light, warnings on the ground, the formation of the pear-blossom rain,
// sparks, fire and falling snow. The shapes are plain meshes; one small fragment shader gives them
// their sweep, grain and decay, so nothing here is a picture pasted on a card.
import {
  InstancedMesh3D,
  Mesh3D,
  createCustomShader3D,
  createGeometry3D,
  createPointLight3D,
  createUnlitMaterial3D
} from '@egret/engine/world3d';
import { createBuilder, rgb } from './build.mjs';

const FX_GLSL = `
float fHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float fNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(fHash(i), fHash(i + vec2(1.0, 0.0)), u.x), mix(fHash(i + vec2(0.0, 1.0)), fHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fLine(float v, float at, float w) { return smoothstep(w, 0.0, abs(v - at)); }
vec4 customFragment(vec4 color, vec3 worldPosition, vec3 normal, vec2 uv) {
    float age = uCustom[0].x, seed = uCustom[0].y, k = uCustom[0].z;
    int mode = int(uCustom[0].w + 0.5);
    vec3 tint = uCustom[1].rgb;
    float power = uCustom[1].a, a = 0.0, hot = 0.0;
    if (mode == 0) {
        // A cut: the head of the sweep runs along the arc and leaves a tail; the edge is a thin bright
        // core at the rim that thins to nothing inward and to a point at both ends.
        float head = age * 1.7, behind = head - uv.x;
        float tail = smoothstep(0.0, 0.05, behind) * exp(-behind * 3.0);
        float core = exp(-pow((0.88 - uv.y) * 9.0, 2.0));
        float body = smoothstep(0.3, 0.88, uv.y) * step(uv.y, 0.93) * 0.16;
        float ends = pow(sin(clamp(uv.x, 0.0, 1.0) * 3.14159), 0.6);
        float grain = fNoise(vec2(uv.x * 22.0 - age * 7.0 + seed, uv.y * 4.0));
        float eaten = smoothstep(age * 1.25 - 0.3, age * 1.25 + 0.15, grain * 0.7 + uv.y * 0.3);
        a = tail * ends * (core + body * (0.5 + grain)) * eaten;
        hot = core * tail;
    } else if (mode == 1) {
        // A ring of force running outward.
        float grain = fNoise(vec2(uv.x * 40.0 + seed, age * 3.0));
        a = (exp(-pow((uv.y - 0.78) * 6.0, 2.0)) + smoothstep(0.2, 0.8, uv.y) * 0.15 * step(uv.y, 0.8)) * pow(1.0 - age, 1.5) * (0.6 + grain * 0.7);
        hot = a * 0.5;
    } else if (mode == 2) {
        // The formation: rings, a turning band of strokes, two triangles turning against each other,
        // all drawn outward from the middle as it opens.
        vec2 p = uv * 2.0 - 1.0;
        float r = length(p), ang = atan(p.y, p.x);
        float open = smoothstep(r - 0.12, r, k * 1.15);
        float rings = fLine(r, 0.97, 0.012) + fLine(r, 0.9, 0.006) + fLine(r, 0.58, 0.008) + fLine(r, 0.27, 0.008) + fLine(r, 0.22, 0.004);
        float band = step(0.62, r) * step(r, 0.86);
        vec2 cell = vec2(floor((ang + age * 0.35) * 28.0 / 6.28318), floor((r - 0.62) * 12.5));
        vec2 inCell = vec2(fract((ang + age * 0.35) * 28.0 / 6.28318), fract((r - 0.62) * 12.5));
        float pick = fHash(cell + seed);
        float stroke = pick < 0.4 ? fLine(inCell.x, 0.5, 0.12) : pick < 0.7 ? fLine(inCell.y, 0.5, 0.16) : fLine(inCell.x + inCell.y, 1.0, 0.16);
        float star = 0.0;
        for (int i = 0; i < 2; i++) {
            float turn = ang + (i == 0 ? age * 0.5 : -age * 0.5 + 1.0472), seg = 2.0944;
            float d = cos(floor(0.5 + turn / seg) * seg - turn) * r;
            star += fLine(d, 0.29, 0.007) * step(r, 0.6);
        }
        float spokes = fLine(fract((ang - age * 0.2) * 12.0 / 6.28318), 0.5, 0.03) * step(0.9, r) * step(r, 0.97);
        a = open * (rings + band * stroke * 0.55 + star + spokes * 0.5) * step(r, 1.0) * uCustom[2].x;
        a += exp(-r * 5.0) * 0.5 * uCustom[2].x * open;
        hot = a * 0.3;
    } else if (mode == 3) {
        // The dark backing stays visible on snow. A continuous amber edge means guard;
        // diagonal stripes and an interrupted vermilion edge mean get out of the shape.
        float hard = uCustom[2].y, edgeType = uCustom[2].z;
        float edge = 1.0 - uv.y;
        if (edgeType > 0.5) edge = min(edge, min(uv.x, 1.0 - uv.x));
        if (edgeType > 1.5) edge = min(edge, uv.y);
        float thickness = clamp(fwidth(edge) * 1.2, 0.009, 0.036);
        float outer = 1.0 - smoothstep(thickness * 2.8, thickness * 4.5, edge);
        float rim = 1.0 - smoothstep(thickness, thickness * 2.4, abs(edge - thickness * 1.4));
        float slash = smoothstep(0.52, 0.72, fract(uv.x * 16.0 - uv.y * 9.0));
        float front = 1.0 - smoothstep(0.015, 0.045, abs(uv.y - max(0.07, k)));
        float signal = max(rim * mix(1.0, 0.4 + slash * 0.6, hard), front * 0.65);
        signal = max(signal, hard * slash * mix(0.32, 0.53, uv.y));
        vec3 body = mix(vec3(0.025, 0.023, 0.035), tint * 0.52, hard * 0.65);
        vec3 line = mix(tint, vec3(1.0, 0.92, 0.77), front * 0.32 + k * 0.20);
        float fill = 0.18 + hard * 0.05 + step(uv.y, k) * 0.13;
        a = max(fill, max(outer * 0.82, signal * 0.95)) * uCustom[2].x;
        return vec4(mix(body, line, signal), a);
    } else if (mode == 4) {
        // A standing column of light.
        float across = 1.0 - abs(uv.x * 2.0 - 1.0);
        float grain = fNoise(vec2(uv.x * 4.0 + seed, uv.y * 7.0 - age * 3.0));
        a = (pow(across, 6.0) * 1.4 + pow(across, 2.0) * 0.45 * (0.5 + grain)) * pow(1.0 - uv.y, max(k, 0.2)) * uCustom[2].x;
        hot = pow(across, 8.0);
    } else if (mode == 6) {
        // A scar on the ground: cracks running out from where the blow fell, and a broken ring round it.
        vec2 p = uv * 2.0 - 1.0;
        float r = length(p), ang = atan(p.y, p.x);
        float wander = fNoise(vec2(ang * 2.5 + seed, r * 3.0)) - 0.5;
        float ray = abs(fract((ang + wander * 0.9) * 7.0 / 6.28318 + seed) - 0.5);
        float cracks = smoothstep(0.05 + r * 0.05, 0.0, ray * (0.25 + r)) * smoothstep(1.0, 0.25, r) * step(fHash(vec2(floor((ang + wander * 0.9) * 7.0 / 6.28318 + seed), seed)), 0.8);
        float ring = fLine(r + wander * 0.25, 0.42, 0.035) * 0.7 * step(0.35, fNoise(vec2(ang * 5.0, seed)));
        a = (cracks * 1.3 + ring + exp(-r * 5.0) * 1.2) * uCustom[2].x;
    } else if (mode == 7) {
        // The counter window empties around the hero's feet as the opening closes.
        float rim = 1.0 - smoothstep(0.028, 0.09, abs(uv.y - 0.9));
        float progress = smoothstep(0.0, 0.04, k) * step(uv.x, k);
        a = rim * (0.18 + progress * 0.82);
        hot = progress * 0.55;
    } else {
        // A bolt: bright at the head, torn along its tail.
        float across = 1.0 - abs(uv.x * 2.0 - 1.0);
        float grain = fNoise(vec2(uv.x * 5.0 + seed, uv.y * 9.0 + age * 9.0));
        a = pow(uv.y, 2.4) * (pow(across, 5.0) * 1.5 + pow(across, 1.6) * 0.5 * grain) * uCustom[2].x;
        hot = pow(uv.y, 6.0) * pow(across, 6.0);
    }
    return vec4(mix(tint, vec3(1.0), clamp(hot, 0.0, 0.6)) * power, clamp(a, 0.0, 1.0));
}`;

const DOT_GLSL = `
vec4 customFragment(vec4 color, vec3 worldPosition, vec3 normal, vec2 uv) {
    float d = length(uv - 0.5) * 2.0;
    return vec4(color.rgb, color.a * smoothstep(1.0, 0.2, d));
}`;

/** A flat sector on the ground, opening toward +z: `u` runs across the arc, `v` outward. */
function sectorGeometry(inner, outer, arc, upright = false) {
  const N = 28,
    positions = [],
    uvs = [],
    indices = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N,
      a = -arc / 2 + arc * t;
    for (const [r, v] of [
      [inner, 0],
      [outer, 1]
    ]) {
      if (upright) positions.push(0, Math.cos(a) * r, Math.sin(a) * r);
      else positions.push(Math.sin(a) * r, 0, Math.cos(a) * r);
      uvs.push(t, v);
    }
    if (i < N) indices.push(i * 2, i * 2 + 1, i * 2 + 3, i * 2, i * 2 + 3, i * 2 + 2);
  }
  return createGeometry3D({ positions, uvs, indices });
}
/** A strip on the ground from the origin toward +z: `u` across, `v` along. */
const stripGeometry = () => createGeometry3D({ positions: [-0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 1, -0.5, 0, 1], uvs: [0, 0, 1, 0, 1, 1, 0, 1], indices: [0, 1, 2, 0, 2, 3] });
/** A square on the ground about the origin. */
const padGeometry = () => createGeometry3D({ positions: [-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1], uvs: [0, 0, 1, 0, 1, 1, 0, 1], indices: [0, 1, 2, 0, 2, 3] });
/** Two upright cards crossed, standing on the origin. */
const columnGeometry = () =>
  createGeometry3D({
    positions: [-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0, 0, 0, -0.5, 0, 0, 0.5, 0, 1, 0.5, 0, 1, -0.5],
    uvs: [0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1],
    indices: [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]
  });
/** Two cards crossed along +z, for a bolt in flight. */
const boltGeometry = () =>
  createGeometry3D({
    positions: [-0.5, 0, -1, 0.5, 0, -1, 0.5, 0, 0, -0.5, 0, 0, 0, -0.5, -1, 0, 0.5, -1, 0, 0.5, 0, 0, -0.5, 0],
    uvs: [0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1],
    indices: [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]
  });

export const TINT = {
  spear: [0.55, 0.8, 1.0],
  gold: [1.0, 0.66, 0.22],
  warn: [1.0, 0.78, 0.37],
  warnHard: [1.0, 0.25, 0.23],
  fire: [1.0, 0.45, 0.1],
  white: [0.9, 0.95, 1.0],
  jade: [0.4, 1.0, 0.75]
};

export function createEffects(scene, camera, { particles: amount = 1 } = {}) {
  const shapes = {
    arcWide: sectorGeometry(0.9, 3.5, 2.5),
    arcNarrow: sectorGeometry(0.6, 3.6, 1.0),
    arcUp: sectorGeometry(0.5, 3.4, 2.4, true),
    ring: sectorGeometry(0.02, 1, Math.PI * 2),
    strip: stripGeometry(),
    pad: padGeometry(),
    scar: padGeometry(),
    column: columnGeometry(),
    bolt: boltGeometry()
  };
  const sectors = new Map();
  const sector = (arc) => {
    const key = Math.round(arc * 20);
    if (!sectors.has(key)) sectors.set(key, sectorGeometry(0.02, 1, arc));
    return sectors.get(key);
  };
  const live = [],
    spare = new Map(),
    groundSpare = new Map();
  let serial = 0;

  function takeEffect(geometry, grounded) {
    const pool = grounded ? groundSpare : spare;
    const spareItem = pool.get(geometry)?.pop();
    if (spareItem) return spareItem;
    const shader = createCustomShader3D({ key: 'snow-fx', glsl: FX_GLSL });
    const material = createUnlitMaterial3D({ color: 0xffffff, alphaMode: 'blend', blending: grounded ? 'normal' : 'additive', depthWrite: false, side: 'double', fog: false });
    material.shader = shader;
    const mesh = new Mesh3D(geometry, material);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    scene.addChild(mesh);
    return { mesh, shader, geometry, pool };
  }

  /**
   * Show one shape. `mode` picks the shader's drawing; `life` is seconds; `from`/`to` are sizes it grows
   * between; `k` and `fade` are read by the shader; `track` is called each frame to move it.
   */
  function spawn(shape, { mode, x = 0, y = 0.07, z = 0, yaw = 0, life = 0.4, from = [1, 1, 1], to = from, tint = TINT.spear, power = 2, k = 0, fade = 1, track, hold = false, hard = false, edgeType = 0 }) {
    const geometry = typeof shape === 'string' ? shapes[shape] : shape;
    const item = takeEffect(geometry, mode === 3 || geometry === shapes.scar);
    Object.assign(item, { age: 0, life, from, to, track, hold, k, fade, done: false });
    item.mesh.visible = true;
    item.mesh.renderOrder = mode === 3 ? 14 : 10;
    item.mesh.setPosition(x, y, z);
    item.mesh.setRotation(0, yaw, 0);
    item.mesh.setScale(from[0], from[1], from[2]);
    item.shader.uniforms.set([0, (++serial * 0.618) % 10, k, mode, tint[0], tint[1], tint[2], power * 0.62, fade, Number(hard), edgeType, 0]);
    live.push(item);
    return item;
  }
  function release(item) {
    if (item.done) return;
    item.mesh.visible = false;
    item.done = true;
    if (!item.pool.has(item.geometry)) item.pool.set(item.geometry, []);
    item.pool.get(item.geometry).push(item);
  }

  // Warm the real meshes below the horizon without advancing their game-time pools.
  function prepareFirstDraw() {
    const item = takeEffect(shapes.pad, false);
    item.mesh.name = 'snow-fx-pad';
    item.mesh.setPosition(0, -1000, 0);
    preparingFootprints = true;
    printMesh.setTransformAt(0, [0, -1000, 0], [0, 0, 0, 1], PRINT);
    printMesh.setColorAt(0, 0, 0, 0, 0);
    spearMesh.setTransformAt(0, [0, -1000, 0], [0, 0, 0, 1], 1);
    spearMesh.setColorAt(0, 0, 0, 0, 0);
    return () => {
      release(item);
      preparingFootprints = false;
      printMesh.count = 0;
      spearMesh.count = 0;
    };
  }

  // ---- sparks, embers, dust: one pool of bright dots ----------------------------------------
  const dotShader = createCustomShader3D({ key: 'snow-dot', glsl: DOT_GLSL });
  const makeDots = (capacity, additive) => {
    const material = createUnlitMaterial3D({ color: 0xffffff, alphaMode: 'blend', blending: additive ? 'additive' : 'normal', depthWrite: false, fog: false });
    material.shader = dotShader;
    const mesh = new InstancedMesh3D(createGeometry3D({ positions: [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], uvs: [0, 0, 1, 0, 1, 1, 0, 1], indices: [0, 1, 2, 0, 2, 3] }), material, capacity, 4);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.renderOrder = 11;
    mesh.layers = 2; // left out of the mirror picture
    mesh.count = 0;
    scene.addChild(mesh);
    return mesh;
  };
  const SPARKS = Math.round(700 * amount),
    sparkMesh = makeDots(SPARKS, true),
    sparks = [];
  /** Throw bright dots: `spread` scatters their direction, `speed` their pace, `rise` their pull upward. */
  function burst(x, y, z, { count = 10, dir = [0, 1, 0], spread = 1, speed = 4, life = 0.4, size = 0.09, tint = TINT.white, power = 3, rise = -9, drag = 2.5 } = {}) {
    const n = Math.max(1, Math.round(count * amount));
    for (let i = 0; i < n; i++) {
      if (sparks.length >= SPARKS) sparks.shift();
      const rx = Math.random() * 2 - 1,
        ry = Math.random() * 2 - 1,
        rz = Math.random() * 2 - 1,
        s = speed * (0.4 + Math.random() * 0.8);
      sparks.push({ x, y, z, vx: (dir[0] + rx * spread) * s, vy: (dir[1] + ry * spread) * s, vz: (dir[2] + rz * spread) * s, age: 0, life: life * (0.6 + Math.random() * 0.7), size: size * (0.6 + Math.random() * 0.8), tint, power, rise, drag });
    }
  }

  // ---- snow: flakes in a box that goes where the camera looks ----------------------------------
  const FLAKES = Math.round(1100 * amount),
    snowMesh = makeDots(FLAKES, false),
    flakes = Array.from({ length: FLAKES }, (_, i) => ({ x: Math.random(), y: Math.random(), z: Math.random(), sway: Math.random() * 6.28, speed: 1.6 + (i % 5) * 0.45, size: 0.035 + (i % 4) * 0.014 }));
  const BOX = [44, 16, 34];

  // ---- low mist, streaks of wind, and the glow round every lamp ------------------------------
  // Mist: wide soft sheets lying just over the ground, drifting with the wind, in three layers.
  const WISPS = Math.round(46 * Math.min(1.3, amount)),
    mistMesh = makeDots(WISPS, false),
    wisps = Array.from({ length: WISPS }, (_, i) => ({ x: Math.random(), z: Math.random(), y: 0.3 + (i % 3) * 0.42, size: 7 + Math.random() * 7, speed: 0.7 + (i % 3) * 0.45, thin: 0.5 + Math.random() * 0.5 })),
    FLAT = [-Math.SQRT1_2, 0, 0, Math.SQRT1_2];
  // Wind: long thin streaks of blown snow that cross the picture quickly.
  const GUSTS = 14,
    gustMesh = makeDots(GUSTS, true),
    gusts = Array.from({ length: GUSTS }, () => ({ x: Math.random(), z: Math.random(), y: 0.4 + Math.random() * 2.2, speed: 11 + Math.random() * 8, long: 2.4 + Math.random() * 2.6 }));
  // Halos: the snow in the air lights up round a flame.
  const haloMesh = makeDots(24, true);
  let halos = [];

  // ---- footprints in the snow ----------------------------------------------------------------
  const printMaterial = createUnlitMaterial3D({ color: 0xffffff, alphaMode: 'blend', depthWrite: false });
  printMaterial.shader = dotShader;
  const printMesh = new InstancedMesh3D(createGeometry3D({ positions: [-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5], uvs: [0, 0, 1, 0, 1, 1, 0, 1], indices: [0, 2, 1, 0, 3, 2] }), printMaterial, 96, 4);
  printMesh.name = 'snow-footprints';
  printMesh.frustumCulled = false;
  printMesh.castShadow = false;
  printMesh.count = 0;
  scene.addChild(printMesh);
  const prints = Array.from({ length: 96 }, () => ({ x: 0, z: 0, yaw: 0, age: 99 })),
    PRINT = [0.19, 1, 0.4];
  let printAt = 0, preparingFootprints = false;

  // ---- flashes of light ----------------------------------------------------------------------
  const flashes = [0, 1].map(() => {
    const light = createPointLight3D({ color: 0xffffff, intensity: 0, range: 12 });
    scene.addChild(light);
    return { light, left: 0, life: 1, peak: 0 };
  });
  function flash(x, z, colour, peak, life = 0.25, range = 12) {
    const slot = flashes.reduce((a, b) => (a.left < b.left ? a : b));
    slot.light.setPosition(x, 1.6, z);
    slot.light.color.set(colour);
    slot.light.range = range;
    Object.assign(slot, { left: life, life, peak });
  }

  // ---- the spears of the rain ----------------------------------------------------------------
  const spearShape = createBuilder();
  spearShape.limb([0, 0.25, 0], [0, 2.4, 0], 0.03, 0.03, { tint: [0.6, 0.8, 1], sides: 5 });
  spearShape.limb([0, -0.3, 0], [0, 0.25, 0], 0.004, 0.09, { tint: [0.9, 0.97, 1], sides: 4, flat: 0.3 });
  const spearMaterial = createUnlitMaterial3D({
    color: 0xffffff, vertexColors: true, fog: false, alphaMode: 'blend', blending: 'additive', depthWrite: false
  });
  spearMaterial.shader = createCustomShader3D({
    key: 'snow-spear-dissolve',
    glsl: `
vec4 customFragment(vec4 color, vec3 worldPosition, vec3 normal, vec2 uv) {
    float remaining = color.a;
    if (remaining <= 0.001) discard;
    if (remaining > 0.998) return color;
    vec3 cell = floor(worldPosition * vec3(24.0, 34.0, 24.0));
    float crystal = fract(sin(dot(cell, vec3(12.9898, 78.233, 21.651))) * 43758.5453);
    float edge = remaining - crystal;
    if (edge < 0.0) discard;
    float rim = 1.0 - smoothstep(0.0, 0.18, edge);
    return vec4(color.rgb * 0.72 + vec3(0.42, 0.76, 1.05) * rim, smoothstep(0.0, 0.24, remaining));
}
`
  });
  spearMaterial.color.set([1.3, 1.6, 2.1]);
  const spearMesh = new InstancedMesh3D(spearShape.geometry(), spearMaterial, 32, 4);
  spearMesh.frustumCulled = false;
  spearMesh.castShadow = false;
  spearMesh.count = 0;
  scene.addChild(spearMesh);
  let falling = [];
  /** Let one spear fall to (x, z) so that it lands `delay` seconds from now. */
  function dropSpear(x, z, delay, lean, turn) {
    falling.push({ x, z, at: delay, t: 0, lean, turn });
  }

  const quat = [0, 0, 0, 1],
    place = [0, 0, 0];
  const axisAngle = (ax, ay, az, angle) => {
    const s = Math.sin(angle / 2);
    quat[0] = ax * s;
    quat[1] = ay * s;
    quat[2] = az * s;
    quat[3] = Math.cos(angle / 2);
    return quat;
  };

  function update(dt, clock) {
    for (const item of live) {
      if (item.done) continue;
      item.age += dt;
      const t = Math.min(1, item.age / item.life),
        u = item.shader.uniforms;
      u[0] = item.hold ? item.age : t;
      item.track?.(item, t, dt);
      u[2] = item.k;
      u[8] = item.fade;
      if (item.to !== item.from) {
        const e = 1 - (1 - t) * (1 - t);
        item.mesh.setScale(item.from[0] + (item.to[0] - item.from[0]) * e, item.from[1] + (item.to[1] - item.from[1]) * e, item.from[2] + (item.to[2] - item.from[2]) * e);
      }
      if (item.age >= item.life) release(item);
    }
    for (let i = live.length - 1; i >= 0; i--) if (live[i].done) live.splice(i, 1);

    // Dots turn to the camera.
    const face = camera.quaternion;
    let n = 0;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.age += dt;
      if (p.age >= p.life) {
        sparks.splice(i, 1);
        continue;
      }
      const slow = Math.exp(-p.drag * dt);
      p.vx *= slow;
      p.vz *= slow;
      p.vy = p.vy * slow + p.rise * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < 0.03) (p.y = 0.03), (p.vy = Math.abs(p.vy) * 0.35);
    }
    for (const p of sparks) {
      const k = 1 - p.age / p.life;
      place[0] = p.x;
      place[1] = p.y;
      place[2] = p.z;
      sparkMesh.setTransformAt(n, place, face, p.size * (0.4 + k * 0.6));
      sparkMesh.setColorAt(n, p.tint[0] * p.power * 0.7, p.tint[1] * p.power * 0.7, p.tint[2] * p.power * 0.7, k * k);
      n++;
    }
    sparkMesh.count = n;

    const cx = camera.position[0],
      cz = camera.position[2] - 11;
    for (let i = 0; i < FLAKES; i++) {
      const f = flakes[i],
        fall = (f.y * BOX[1] - clock * f.speed) % BOX[1];
      place[0] = cx + ((((f.x * BOX[0] + clock * 1.6 + Math.sin(clock * 0.9 + f.sway) * 0.4 - cx) % BOX[0]) + BOX[0]) % BOX[0]) - BOX[0] / 2;
      place[1] = fall < 0 ? fall + BOX[1] : fall;
      place[2] = cz + ((((f.z * BOX[2] + clock * 0.5 - cz) % BOX[2]) + BOX[2]) % BOX[2]) - BOX[2] / 2;
      snowMesh.setTransformAt(i, place, face, f.size);
      snowMesh.setColorAt(i, 0.92, 0.95, 1, 0.85);
    }
    snowMesh.count = FLAKES;

    for (let i = 0; i < WISPS; i++) {
      const w = wisps[i];
      place[0] = cx + ((((w.x * 56 + clock * w.speed - cx) % 56) + 56) % 56) - 28;
      place[1] = w.y;
      place[2] = cz + ((((w.z * 44 + clock * 0.2 - cz) % 44) + 44) % 44) - 22;
      // A sheet thins out as it nears the edge of the box, so that none pops in or out.
      const inside = Math.min(1, (28 - Math.abs(place[0] - cx)) / 8, (22 - Math.abs(place[2] - cz)) / 6);
      mistMesh.setTransformAt(i, place, FLAT, [w.size * 1.8, w.size, 1]);
      mistMesh.setColorAt(i, 0.5, 0.6, 0.82, 0.1 * w.thin * Math.max(0, inside));
    }
    mistMesh.count = WISPS;
    for (let i = 0; i < GUSTS; i++) {
      const g = gusts[i];
      place[0] = cx + ((((g.x * 60 + clock * g.speed - cx) % 60) + 60) % 60) - 30;
      place[1] = g.y + Math.sin(clock * 1.3 + i) * 0.2;
      place[2] = cz + ((((g.z * 40 - cz) % 40) + 40) % 40) - 20;
      gustMesh.setTransformAt(i, place, face, [g.long, 0.035, 1]);
      gustMesh.setColorAt(i, 0.8, 0.88, 1, 0.16 * Math.min(1, (30 - Math.abs(place[0] - cx)) / 8));
    }
    gustMesh.count = GUSTS;
    let h = 0;
    for (const halo of halos) {
      if (h >= 24 || halo.strength <= 0.01) continue;
      place[0] = halo.x;
      place[1] = halo.y;
      place[2] = halo.z;
      haloMesh.setTransformAt(h, place, face, halo.size * (1 + Math.sin(clock * 7 + halo.x) * 0.05));
      haloMesh.setColorAt(h++, halo.colour[0], halo.colour[1], halo.colour[2], 0.2 * halo.strength);
    }
    haloMesh.count = h;

    for (const slot of flashes) {
      slot.left = Math.max(0, slot.left - dt);
      slot.light.intensity = slot.peak * Math.pow(slot.left / slot.life, 1.5);
    }

    // Footprints fade as the snow drifts back into them.
    let f = 0;
    for (const step of prints) {
      step.age += dt;
      if (step.age > 16) continue;
      place[0] = step.x;
      place[1] = 0.03;
      place[2] = step.z;
      printMesh.setTransformAt(f, place, axisAngle(0, 1, 0, step.yaw), PRINT);
      printMesh.setColorAt(f++, 0.1, 0.13, 0.24, 0.8 * Math.min(1, (16 - step.age) / 6));
    }
    printMesh.count = preparingFootprints ? 1 : f;

    // Spears keep their shape through contact, then break up into cold light.
    let s = 0;
    for (const spear of falling) {
      spear.t += dt;
      const before = spear.at - spear.t,
        dx = Math.sin(spear.turn) * spear.lean,
        dz = Math.cos(spear.turn) * spear.lean;
      const lift = before > 0 ? before * 46 : -0.15,
        remain = Math.min(1, Math.max(0, (before + 0.9) / 0.34));
      if (before > 0.28 || remain <= 0 || s >= 32) continue;
      place[0] = spear.x + dx * lift;
      place[1] = lift;
      place[2] = spear.z + dz * lift;
      spearMesh.setTransformAt(s, place, axisAngle(dz, 0, -dx, Math.atan(Math.hypot(dx, dz))), 1);
      spearMesh.setColorAt(s++, 1, 1, 1, remain);
    }
    spearMesh.count = preparingFootprints ? 1 : s;
    falling = falling.filter((spear) => spear.t < spear.at + 0.9);
  }

  /** A scar left on the ground by a heavy blow; it stays a while and fades. */
  function scar(x, z, size, life = 7) {
    spawn('scar', { mode: 6, x, y: 0.05, z, yaw: Math.random() * 6.28, life, from: [size * 1.3, 1, size * 1.3], tint: [0.012, 0.014, 0.022], power: 1.6, track: (item, t) => (item.fade = Math.min(1, t * 30, (1 - t) * 3)) });
  }
  function clear() {
    for (const item of live) release(item);
    live.length = sparks.length = falling.length = 0;
    for (const step of prints) step.age = 99;
    printAt = 0;
    sparkMesh.count = printMesh.count = spearMesh.count = 0;
    for (const slot of flashes) {
      slot.left = 0;
      slot.light.intensity = 0;
    }
  }

  return { spawn, release, prepareFirstDraw, burst, flash, dropSpear, update, clear, sector, shapes, rgb, scar, setHalos: (list) => (halos = list), print: (x, z, yaw) => (prints[(printAt = (printAt + 1) % prints.length)] = { x, z, yaw, age: 0 }) };
}
