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
        // A warning on the ground: stripes running out from the man, a hard edge, and a bright line
        // that crosses the shape as his blow comes.
        float flow = fract(uv.y * 5.0 - age * 3.0 + fNoise(vec2(uv.x * 9.0, seed)) * 0.4);
        float stripes = smoothstep(0.55, 0.75, flow) * 0.5;
        float rim = smoothstep(0.93, 0.985, uv.y) + smoothstep(0.06, 0.0, uv.x) + smoothstep(0.94, 1.0, uv.x);
        float sides = pow(sin(clamp(uv.x, 0.0, 1.0) * 3.14159), 0.35);
        float front = fLine(uv.y, k, 0.035) * 1.6 + step(uv.y, k) * 0.2;
        a = (0.16 + stripes * (0.4 + k * 0.6) + rim * 0.9 + front) * sides * smoothstep(0.0, 0.08, age) * (1.0 - smoothstep(0.92, 1.0, age) * 0.6);
        hot = front * 0.4;
    } else if (mode == 4) {
        // A standing column of light.
        float across = 1.0 - abs(uv.x * 2.0 - 1.0);
        float grain = fNoise(vec2(uv.x * 4.0 + seed, uv.y * 7.0 - age * 3.0));
        a = (pow(across, 6.0) * 1.4 + pow(across, 2.0) * 0.45 * (0.5 + grain)) * pow(1.0 - uv.y, max(k, 0.2)) * uCustom[2].x;
        hot = pow(across, 8.0);
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
  warn: [1.0, 0.25, 0.1],
  warnHard: [1.0, 0.1, 0.25],
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
    spare = new Map();
  let serial = 0;

  /**
   * Show one shape. `mode` picks the shader's drawing; `life` is seconds; `from`/`to` are sizes it grows
   * between; `k` and `fade` are read by the shader; `track` is called each frame to move it.
   */
  function spawn(shape, { mode, x = 0, y = 0.07, z = 0, yaw = 0, life = 0.4, from = [1, 1, 1], to = from, tint = TINT.spear, power = 2, k = 0, fade = 1, track, hold = false }) {
    const geometry = typeof shape === 'string' ? shapes[shape] : shape;
    let item = spare.get(geometry)?.pop();
    if (!item) {
      const shader = createCustomShader3D({ key: 'snow-fx', glsl: FX_GLSL });
      const material = createUnlitMaterial3D({ color: 0xffffff, alphaMode: 'blend', blending: 'additive', depthWrite: false, side: 'double', fog: false });
      material.shader = shader;
      const mesh = new Mesh3D(geometry, material);
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.renderOrder = 10;
      scene.addChild(mesh);
      item = { mesh, shader, geometry };
    }
    Object.assign(item, { age: 0, life, from, to, track, hold, k, fade, done: false });
    item.mesh.visible = true;
    item.mesh.setPosition(x, y, z);
    item.mesh.setRotation(0, yaw, 0);
    item.mesh.setScale(from[0], from[1], from[2]);
    item.shader.uniforms.set([0, (++serial * 0.618) % 10, k, mode, tint[0], tint[1], tint[2], power * 0.62, fade, 0, 0, 0]);
    live.push(item);
    return item;
  }
  function release(item) {
    item.mesh.visible = false;
    item.done = true;
    if (!spare.has(item.geometry)) spare.set(item.geometry, []);
    spare.get(item.geometry).push(item);
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
  const spearMaterial = createUnlitMaterial3D({ color: 0xffffff, vertexColors: true, fog: false });
  spearMaterial.color.set([1.3, 1.6, 2.1]);
  const spearMesh = new InstancedMesh3D(spearShape.geometry(), spearMaterial, 32);
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
      item.age += dt;
      const t = Math.min(1, item.age / item.life),
        u = item.shader.uniforms;
      u[0] = item.hold ? item.age : t;
      u[2] = item.k;
      u[8] = item.fade;
      item.track?.(item, t, dt);
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

    for (const slot of flashes) {
      slot.left = Math.max(0, slot.left - dt);
      slot.light.intensity = slot.peak * Math.pow(slot.left / slot.life, 1.5);
    }

    // Spears: fall along their lean, stand a moment, then sink away.
    let s = 0;
    for (const spear of falling) {
      spear.t += dt;
      const before = spear.at - spear.t,
        dx = Math.sin(spear.turn) * spear.lean,
        dz = Math.cos(spear.turn) * spear.lean;
      let lift = 0,
        size = 1;
      if (before > 0) lift = before * 46;
      else {
        const after = -before;
        if (after > 0.55) size = Math.max(0, 1 - (after - 0.55) / 0.3);
        lift = -0.15;
      }
      if (before > 0.28 || size <= 0 || s >= 32) continue;
      place[0] = spear.x + dx * lift;
      place[1] = lift + (1 - size) * -0.6;
      place[2] = spear.z + dz * lift;
      spearMesh.setTransformAt(s++, place, axisAngle(dz, 0, -dx, Math.atan(Math.hypot(dx, dz))), [1, size, 1]);
    }
    spearMesh.count = s;
    falling = falling.filter((spear) => spear.t < spear.at + 0.9);
  }

  return { spawn, release, burst, flash, dropSpear, update, sector, shapes, rgb };
}
