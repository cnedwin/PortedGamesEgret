// What the fight throws into the air: sparks where steel meets steel, a mist of blood, dust under feet, the
// sweep of a blade, arrows in flight and stuck where they landed, the blade wave, poison mist, the web, the blast,
// the ring of a slam, and the weather of each place.
import {
  Mesh3D,
  Texture3D,
  createGeometry3D,
  createParticleEmitter3D,
  createGpuParticles3D,
  createPointLight3D,
  createUnlitMaterial3D
} from '@egret/engine/world3d';
import { createWeapon } from './weapons.mjs';
import { SKILL_EFFECTS, SKILL_PREPARATION } from './effect-profiles.mjs';
import { mountedContactBody, mountedContactPoint } from './mounted-contact.mjs';

/** A soft round dot (and a petal) for particles, drawn once on a small canvas. */
function spriteTexture(kind = 'dot') {
  const size = 64;
  const canvas = new OffscreenCanvas(size, size);
  const g = canvas.getContext('2d');
  if (kind === 'petal') {
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(32, 32, 26, 14, 0.6, 0, Math.PI * 2);
    g.fill();
  } else {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.75)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  const data = g.getImageData(0, 0, size, size).data;
  return new Texture3D({ width: size, height: size, data: new Uint8Array(data.buffer) }, { colorSpace: 'srgb', mipmaps: true });
}

const TRAIL = 10;
const UP = [0, 1, 0];
const EDGE_STEPS = 8;

function arcs(sectors, inside, outside) {
  const positions = [], indices = [];
  for (const [from, to, steps] of sectors) {
    for (let i = 0; i <= steps; i++) {
      const a = from + (to - from) * i / steps;
      const x = Math.sin(a), z = Math.cos(a);
      const index = positions.length / 3;
      positions.push(x * inside, 0, z * inside, x * outside, 0, z * outside);
      if (i) indices.push(index - 2, index - 1, index, index - 1, index + 1, index);
    }
  }
  return createGeometry3D({ positions, indices });
}

/** Tapered strokes in the ground plane. A complete motif stays in one pooled draw. */
function strokes(...paths) {
  const positions = [], indices = [];
  for (const [width, ...points] of paths) {
    const first = positions.length / 3;
    for (let i = 0; i < points.length; i++) {
      const before = points[Math.max(i - 1, 0)], next = points[Math.min(i + 1, points.length - 1)];
      const [x, z] = points[i];
      const dx = next[0] - before[0], dz = next[1] - before[1];
      const w = width * (i === 0 || i === points.length - 1 ? 0.20 : 1) / (Math.hypot(dx, dz) || 1);
      positions.push(x - dz * w, 0, z + dx * w, x + dz * w, 0, z - dx * w);
      if (i) {
        const j = first + 2 * i;
        indices.push(j - 2, j - 1, j, j - 1, j + 1, j);
      }
    }
  }
  return createGeometry3D({ positions, indices });
}

const sweepPoints = (from, to, radius) => Array.from({ length: 12 }, (_, i) => {
  const a = from + (to - from) * i / 11;
  return [Math.sin(a) * radius, Math.cos(a) * radius];
});

/** A curved leading edge with a hot core and tapered ends; the mesh follows the real wave projectile. */
function bladeWaveGeometry() {
  const positions = [], colors = [], indices = [];
  const bands = [
    { height: -1, tint: [0.13, 0.023, 0.004] },
    { height: 0, tint: [1, 0.65, 0.23] },
    { height: 0.45, tint: [1, 0.90, 0.71] },
    { height: 1, tint: [0.28, 0.042, 0.004] }
  ];
  for (let i = 0; i <= 24; i++) {
    const x = i / 12 - 1;
    const taper = Math.sin(Math.PI * i / 24);
    const y = 0.54 * taper - 0.12 + x * 0.22;
    for (const { height, tint } of bands) {
      positions.push(x * 1.52, y + height * 0.22 * taper, -x * x * 0.58 + height * 0.07);
      for (const c of tint) colors.push(c * (0.1 + 0.9 * taper));
    }
    if (!i) continue;
    for (let k = 0; k < bands.length - 1; k++) {
      const j = (i - 1) * bands.length + k;
      indices.push(j, j + 1, j + bands.length, j + 1, j + bands.length + 1, j + bands.length);
    }
  }
  return createGeometry3D({ positions, colors, indices });
}

function createCuePool(scene, capacity) {
  // Regular marks share geometry. A blade extension uses the slot's own short dynamic strip.
  const shapes = {
    ring: arcs([[-Math.PI, Math.PI, 32]], 0.91, 1),
    arc: arcs([[-1.16, 1.16, 16]], 0.91, 1),
    split: arcs([[-2.1, -0.24, 12], [0.28, 1.74, 10]], 0.90, 1),
    fan: arcs([[-0.58, 0.58, 12]], 0.88, 1),
    chargeLane: strokes([0.05, [-0.52, -0.15], [-0.45, 0.50], [0, 1.33], [0.45, 0.50], [0.52, -0.15]],
      [0.043, [0, 0.12], [0, 0.61], [0, 1.13]]),
    bullHorns: strokes([0.067, [-0.87, 0.81], [-0.65, 0.53], [0, 0.30], [0.65, 0.53], [0.87, 0.81]],
      [0.059, [-0.43, 0.45], [-0.34, 0.95], [0, 1.18], [0.34, 0.95], [0.43, 0.45]]),
    spinGather: strokes([0.051, ...sweepPoints(-2.62, 0.03, 0.83)], [0.064, ...sweepPoints(0.17, 2.79, 1.04)]),
    swingBeats: strokes(...[-0.38, 0, 0.38].map((x, i) => [0.062, [x - 0.10, 0.29 - i * 0.11],
      [x, 0.61 - i * 0.11], [x + 0.13, 0.88 - i * 0.11]])),
    axePlant: strokes([0.082, [-0.86, 0.48], [-0.56, 0.27], [0, 0.21], [0.56, 0.27], [0.86, 0.48]],
      [0.053, [-0.72, 0.73], [-0.37, 0.68], [-0.18, 1.09]], [0.053, [0.72, 0.73], [0.37, 0.68], [0.18, 1.09]]),
    waveFold: strokes([0.079, ...sweepPoints(-1.22, 1.22, 0.82)], [0.045, ...sweepPoints(-0.73, 0.73, 0.63)]),
    returnPlant: strokes([0.056, [-1.06, -0.45], [-0.72, -0.57], [-0.34, -0.28], [-0.37, 0.17]],
      [0.05, [0.91, 0.20], [0.65, 0.52], [0.33, 0.84]]),
    sidePlant: strokes([0.066, ...sweepPoints(0.32, 2.34, 0.91)], [0.050, [-0.46, -0.21], [-0.24, 0.24], [0.07, 0.56]]),
    boarStep: strokes([0.071, [-0.64, 0.19], [0, 0.69], [0.64, 0.19]], [0.056, [-0.48, 0.62], [0, 1.16], [0.48, 0.62]]),
    fanFeathers: strokes(...[-0.59, -0.3, 0, 0.3, 0.59].map(x => [0.036, [x * 0.31, 0.19], [x * 0.76, 0.55], [x * 1.35, 1.04 - Math.abs(x) * 0.25]])),
    galeChannel: strokes([0.075, [0, 0.29], [0, 0.88], [0, 1.52]],
      [0.044, [-0.35, 0.42], [-0.17, 0.68], [0, 0.9], [0.17, 0.68], [0.35, 0.42]]),
    thrust: createGeometry3D({
      positions: [-0.16, 0, -0.48, -0.026, 0, 0.20, 0, 0, 1, 0.026, 0, 0.20, 0.16, 0, -0.48],
      indices: [0, 1, 2, 2, 3, 4]
    }),
    glint: createGeometry3D({
      positions: [-1, 0, 0, 0, -0.065, 0, 1, 0, 0, 0, 0.065, 0, 0, -0.55, 0, 0, 0.55, 0, -0.055, 0, 0, 0.055, 0, 0],
      indices: [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 5, 7]
    })
  };
  const stripIndices = [];
  for (let i = 0; i < EDGE_STEPS * 2; i += 2) stripIndices.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
  const slots = Array.from({ length: capacity }, () => {
    const material = createUnlitMaterial3D({ blending: 'normal', depthWrite: false, side: 'double', fog: false, opacity: 0 });
    const mesh = new Mesh3D(shapes.ring, material);
    mesh.name = 'skill-cue';
    mesh.castShadow = false;
    mesh.visible = false;
    mesh.renderOrder = 4;
    scene.addChild(mesh);
    const strip = createGeometry3D({ positions: new Float32Array((EDGE_STEPS + 1) * 6), indices: stripIndices });
    strip.getAttribute('position').dynamic = true;
    return { mesh, material, strip, remaining: 0 };
  });
  const take = () => slots.reduce((lowest, item) => item.remaining < lowest.remaining ? item : lowest);
  function show(slot, geometry, at, yaw, radius, tint, { time = 0.28, opacity = 0.56, growth = 0.38, initial = 0.65 } = {}) {
    Object.assign(slot, { remaining: time, time, radius, opacity, growth, initial });
    const { mesh, material } = slot;
    const bridge = geometry === slot.strip;
    mesh.name = bridge ? 'mounted-edge-bridge' : 'skill-cue';
    mesh.frustumCulled = !bridge;
    mesh.geometry = geometry;
    mesh.setPosition(...at);
    mesh.setRotation(0, yaw, 0);
    mesh.setScale(radius * initial, radius * initial, radius * initial);
    material.color.set(tint);
    material.opacity = opacity;
    mesh.visible = true;
  }
  return {
    show(shape, at, yaw, radius, tint, options) {
      show(take(), shapes[shape], at, yaw, radius, tint, options);
    },
    bridge(blade, end) {
      const [base, tip] = blade;
      const axis = tip.map((value, i) => value - base[i]);
      const lengthSq = axis.reduce((total, value) => total + value * value, 0);
      if (lengthSq < 1e-8) return;
      // Start on the working edge. Very close hits already read through the regular contact glint.
      const projection = axis.reduce((total, value, i) => total + value * (end[i] - base[i]), 0) / lengthSq;
      const reach = Math.max(0.5, Math.min(1, projection));
      const from = base.map((value, i) => value + axis[i] * reach);
      const [dx, dy, dz] = end.map((value, i) => value - from[i]);
      const gap = Math.hypot(dx, dy, dz);
      if (!(gap >= 0.46 && gap <= 1.6)) return;

      const slot = take();
      const position = slot.strip.getAttribute('position');
      const horizontal = Math.hypot(dx, dz);
      const sideX = horizontal > 1e-6 ? dz / horizontal : 1;
      const sideZ = horizontal > 1e-6 ? -dx / horizontal : 0;
      const curvature = Math.min(0.22, gap * 0.20);
      for (let i = 0; i <= EDGE_STEPS; i++) {
        const t = i / EDGE_STEPS;
        const bend = 2 * t * (1 - t);
        const x = from[0] + dx * t + sideX * bend * curvature;
        const y = from[1] + dy * t + bend * 0.10;
        const z = from[2] + dz * t + sideZ * bend * curvature;
        const width = 0.046 * Math.sin(Math.PI * t) ** 0.75;
        position.data.set([
          x - sideX * width * 0.45, y - width * 0.89, z - sideZ * width * 0.45,
          x + sideX * width * 0.45, y + width * 0.89, z + sideZ * width * 0.45
        ], i * 6);
      }
      position.touch();
      show(slot, slot.strip, [0, 0, 0], 0, 1, [0.79, 0.88, 1], { time: 0.13, opacity: 0.87, growth: 0, initial: 1 });
    },
    update(dt) {
      for (const slot of slots) {
        if (slot.remaining <= 0) continue;
        slot.remaining = Math.max(0, slot.remaining - dt);
        slot.mesh.visible = slot.remaining > 0;
        const fade = slot.remaining / slot.time;
        const size = slot.radius * (slot.initial + slot.growth * (1 - fade ** 2));
        slot.material.opacity = slot.opacity * fade ** 2;
        slot.mesh.setScale(size, size, size);
      }
    },
    clear() {
      for (const slot of slots) {
        slot.remaining = 0;
        slot.mesh.visible = false;
      }
    }
  };
}

/** Place the effect at the near side of the defender, with a small correction from a nearby blade. */
function contact(e, body, from, blade, depth) {
  if (e.mountedImpact) {
    body = mountedContactBody(e.mountedImpact);
    from = [e.mountedImpact.from[0], body[1], e.mountedImpact.from[1]];
    blade = null;
  }
  const dx = body[0] - from[0],
    dz = body[2] - from[2],
    d = Math.hypot(dx, dz) || 1,
    x = dx / d,
    z = dz / d;
  const point = e.mountedImpact ? mountedContactPoint(e.mountedImpact, depth)
    : [body[0] - x * depth, body[1] + (e.kick ? -0.32 : e.line === 'O' ? 0.18 : 0), body[2] - z * depth];
  if (blade) {
    const [base, tip] = blade;
    const ray = tip.map((v, i) => v - base[i]);
    const lengthSquared = ray.reduce((sum, v) => sum + v * v, 0);
    if (lengthSquared > 1e-6) {
      const t = ray.reduce((sum, v, i) => sum + v * (point[i] - base[i]), 0) / lengthSquared;
      const close = ray.map((v, i) => base[i] + v * Math.max(0, Math.min(1, t)));
      // The logical sweep can reach while the animated sword tip is far away. Keep those sparks at the body.
      if (Math.hypot(...close.map((v, i) => v - point[i])) < 0.6)
        for (let i = 0; i < point.length; i++) point[i] += (close[i] - point[i]) * 0.48;
    }
  }
  const side = e.line === 'L' ? -1 : e.line === 'R' ? 1 : 0;
  return { point, away: [x + side * z * 0.65, 0.24, z - side * x * 0.65], back: [-x + side * z * 0.65, 0.4, -z - side * x * 0.65] };
}

/**
 * A blade's sweep: the last few places of the outer part of the blade joined into a ribbon, bright at the edge and
 * gone toward the hilt, fading in a fifth of a second.
 */
function createSweep(scene) {
  const positions = new Float32Array(TRAIL * 2 * 3);
  const colors = new Float32Array(TRAIL * 2 * 3);
  const indices = [];
  for (let i = 0; i < TRAIL - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geometry = createGeometry3D({ positions, colors, indices });
  geometry.getAttribute('position').dynamic = true;
  geometry.getAttribute('color').dynamic = true;
  const material = createUnlitMaterial3D({ vertexColors: true, blending: 'additive', depthWrite: false, side: 'double', fog: false });
  const mesh = new Mesh3D(geometry, material);
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.renderOrder = 5;
  mesh.visible = false;
  scene.addChild(mesh);
  const points = [];
  return {
    mesh,
    push(base, tip, strength, tint) {
      const previous = points[0]?.tip;
      if (previous && Math.hypot(tip[0] - previous[0], tip[1] - previous[1], tip[2] - previous[2]) > 1.35)
        points.length = 0;
      points.unshift({ base, tip, strength, tint });
      if (points.length > TRAIL) points.pop();
    },
    clear() {
      points.length = 0;
      mesh.visible = false;
    },
    update(dt) {
      mesh.visible = points.length > 1;
      if (!points.length) return;
      const pos = geometry.getAttribute('position').data,
        col = geometry.getAttribute('color').data;
      for (let i = 0; i < TRAIL; i++) {
        const p = points[Math.min(i, points.length - 1)];
        const k = p ? (1 - i / TRAIL) * p.strength : 0;
        const b = p?.base ?? [0, -100, 0],
          t = p?.tip ?? [0, -100, 0];
        pos.set(b, i * 6);
        pos.set(t, i * 6 + 3);
        const tint = p?.tint ?? [1, 1, 1];
        col.set([0, 0, 0], i * 6);
        col.set([tint[0] * k * 0.42, tint[1] * k * 0.42, tint[2] * k * 0.42], i * 6 + 3);
      }
      geometry.getAttribute('position').touch();
      geometry.getAttribute('color').touch();
      // Fade every point by the time gone (a fifth each sixtieth of a second).
      const fade = Math.exp(-20 * dt);
      for (const p of points) p.strength *= fade;
      while (points.length && points.at(-1).strength < 0.02) points.pop();
    }
  };
}

export function createEffects(scene, { particles = 1, blood = true } = {}) {
  const fx = { blood };
  const cues = createCuePool(scene, particles < 1 ? 8 : 14);
  const mountedEdges = new Map();
  const dot = spriteTexture('dot'),
    petal = spriteTexture('petal');
  const emitter = (options) => {
    const capacity = Math.max(1, Math.round((options.capacity ?? 200) * particles));
    const e = createParticleEmitter3D({ space: 'world', rate: 0, map: dot, ...options, capacity });
    e.castShadow = false;
    scene.addChild(e);
    return e;
  };
  const sparks = emitter({ capacity: 260, lifetime: [0.18, 0.5], speed: [3, 9], spread: Math.PI, gravity: [0, -9, 0], drag: 1.2, startSize: 0.05, endSize: 0.01, startColor: 0xfff2c8, endColor: 0xff7a20, startOpacity: 1, endOpacity: 0, blending: 'additive', shape: 'sphere', radius: 0.04 });
  const parry = emitter({ capacity: 96, lifetime: [0.09, 0.29], speed: [4, 8], spread: 0.8, gravity: [0, -9, 0], drag: 2.8, startSize: 0.065, endSize: 0.009, startColor: 0xf3faff, endColor: 0x98c6ff, startOpacity: 1, endOpacity: 0, blending: 'additive', shape: 'sphere', radius: 0.025 });
  const impact = emitter({ capacity: 64, lifetime: [0.05, 0.16], speed: [0.55, 2.3], spread: 0.7, gravity: [0, -4, 0], drag: 4.8, startSize: 0.085, endSize: 0.025, startColor: 0xf5d4a2, endColor: 0xa88866, startOpacity: 0.8, endOpacity: 0, blending: 'normal', shape: 'sphere', radius: 0.047 });
  const red = emitter({ capacity: 220, lifetime: [0.3, 0.8], speed: [1, 3.6], spread: 1.1, gravity: [0, -7, 0], drag: 1.6, startSize: 0.07, endSize: 0.16, startColor: 0x7a0a06, endColor: 0x3a0503, startOpacity: 0.9, endOpacity: 0, shape: 'sphere', radius: 0.08 });
  const dust = emitter({ capacity: 200, lifetime: [0.6, 1.4], speed: [0.4, 1.4], spread: 1.3, direction: [0, 1, 0], gravity: [0, 0.3, 0], drag: 2.4, startSize: 0.2, endSize: 0.9, startColor: 0xb8a58a, endColor: 0xd8c8b0, startOpacity: 0.35, endOpacity: 0, shape: 'sphere', radius: 0.3 });
  const glow = emitter({ capacity: 160, lifetime: [0.25, 0.6], speed: [0.5, 2.5], spread: Math.PI, gravity: [0, 1.5, 0], drag: 2, startSize: 0.14, endSize: 0.02, startColor: 0xfff0b0, endColor: 0xffa040, startOpacity: 0.9, endOpacity: 0, blending: 'additive', shape: 'sphere', radius: 0.2 });
  const venom = emitter({ capacity: 260, lifetime: [1.2, 2.2], speed: [0.2, 0.7], spread: Math.PI, gravity: [0, 0.25, 0], drag: 1.2, startSize: 0.5, endSize: 1.4, startColor: 0x6a9a2a, endColor: 0x2c4a10, startOpacity: 0.32, endOpacity: 0, shape: 'sphere', radius: 1.6 });
  const fire = emitter({ capacity: 160, lifetime: [0.3, 0.8], speed: [2, 6], spread: Math.PI, gravity: [0, 3, 0], drag: 2.2, startSize: 0.5, endSize: 1.2, startColor: 0xffd890, endColor: 0x802010, startOpacity: 0.9, endOpacity: 0, blending: 'additive', shape: 'sphere', radius: 0.4 });
  const fightEmitters = [sparks, parry, impact, red, dust, glow, venom, fire];
  const burst = (e, at, n, dir) => {
    e.setPosition(at[0], at[1], at[2]);
    e.direction.set(dir ?? UP);
    e.burst(Math.max(1, Math.round(n * particles)));
  };

  // Light from a clash or a blast, fading fast.
  const flash = createPointLight3D({ color: 0xffc070, intensity: 0, range: 6 });
  scene.addChild(flash);
  let flashLife = 0;

  // Arrows: one model, cloned per shot.
  const arrowModel = createWeapon('arrow');
  const arrows = new Map();
  const waveMat = createUnlitMaterial3D({ vertexColors: true, blending: 'normal', depthWrite: false, side: 'double', opacity: 0.85 });
  const waveGeo = bladeWaveGeometry();
  // A shared, tapered wake around the actual arrow axis. Each kind changes width, length and hue.
  const wakeGeo = createGeometry3D({
    positions: [0, -1.58, 0, -0.10, -0.05, 0, 0, 0.35, 0, 0.10, -0.05, 0, 0, -0.05, -0.10, 0, -0.05, 0.10],
    colors: [0.08, 0.08, 0.08, 1, 1, 1, 0.55, 0.55, 0.55, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    indices: [0, 1, 2, 0, 2, 3, 0, 4, 2, 0, 2, 5]
  });
  const wakes = new Map();
  for (const [id, width, length, opacity] of [
    ['gale', 1.55, 1.45, 0.71], ['blast', 0.86, 0.72, 0.68], ['web', 0.54, 0.62, 0.44],
    ['fan', 0.44, 0.66, 0.43], ['volley', 0.58, 0.83, 0.57], ['backStep', 0.6, 0.78, 0.48]
  ]) {
    if (id === 'fan' && particles < 1) continue;
    wakes.set(id, {
      width, length,
      material: createUnlitMaterial3D({ color: SKILL_EFFECTS[id].tint, vertexColors: true,
        blending: 'normal', depthWrite: false, side: 'double', opacity })
    });
  }
  const webMat = createUnlitMaterial3D({ color: 0xe8e6dc, opacity: 0.55, blending: 'normal', depthWrite: false, side: 'double' });
  const webs = new Map();

  function webGeometry() {
    // Spokes and rings of thin quads, lying on the ground.
    const pos = [],
      idx = [];
    const quad = (a, b, w) => {
      const dx = b[0] - a[0],
        dz = b[1] - a[1],
        l = Math.hypot(dx, dz) || 1;
      const nx = (-dz / l) * w,
        nz = (dx / l) * w;
      const base = pos.length / 3;
      pos.push(a[0] + nx, 0.03, a[1] + nz, a[0] - nx, 0.03, a[1] - nz, b[0] + nx, 0.03, b[1] + nz, b[0] - nx, 0.03, b[1] - nz);
      idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    };
    for (let s = 0; s < 12; s++) {
      const a = (s / 12) * Math.PI * 2;
      quad([0, 0], [Math.cos(a), Math.sin(a)], 0.0045);
    }
    for (let r = 1; r <= 5; r++) {
      const rr = r / 5;
      for (let s = 0; s < 12; s++) {
        const a = (s / 12) * Math.PI * 2,
          b = ((s + 1) / 12) * Math.PI * 2;
        quad([Math.cos(a) * rr, Math.sin(a) * rr], [Math.cos(b) * rr, Math.sin(b) * rr], 0.0035);
      }
    }
    return createGeometry3D({ positions: pos, indices: idx });
  }
  const webGeo = webGeometry();

  const sweeps = new Map();
  fx.sweep = (id) => {
    let s = sweeps.get(id);
    if (!s) sweeps.set(id, (s = createSweep(scene)));
    return s;
  };

  const floor = (at, y = 0.07) => [at[0], y, at[2]];
  const ahead = (at, yaw, metres, height = at[1]) => [at[0] + Math.sin(yaw) * metres, height, at[2] + Math.cos(yaw) * metres];
  function skillCue(id, at, yaw, blade, part, active) {
    const profile = SKILL_EFFECTS[id];
    const preparation = !active && SKILL_PREPARATION[id];
    if (preparation) {
      const { shape, radius, time } = preparation;
      cues.show(shape, floor(at), yaw, radius, profile.tint, { time, opacity: 0.81, initial: 0.86, growth: -0.16 });
      return;
    }
    const shape = active ? profile?.release : profile?.preparation;
    if (!shape) return;
    const onTip = shape === 'glint' || active && shape === 'thrust';
    const place = onTip ? blade?.[1] ?? ahead(at, yaw, 0.55) : floor(at);
    const radius = shape === 'thrust' ? (active ? 0.68 : 0.83)
      : shape === 'glint' ? (active ? 0.38 : 0.32) : (active ? 1.22 : 0.78);
    const angle = shape === 'split' && active ? yaw + part * 1.77 : yaw;
    cues.show(shape, place, angle, radius, profile.tint,
      active ? { time: 0.23, opacity: 0.84, initial: 0.8, growth: 0.25 }
        : { time: 0.31, opacity: 0.70, initial: 0.90, growth: -0.33 });
  }

  /** Answer one event of the fight. `where(id)` gives a man's chest place. */
  fx.event = (e, where, bladeOf, { shield = false, armoured = false, heading = 0 } = {}) => {
    const at = where(e.who);
    switch (e.type) {
      case 'block':
      case 'deflect': {
        const blade = e.arrow ? null : bladeOf(e.by);
        const { point, back } = contact(e, at, where(e.by), blade, shield ? 0.43 : 0.34);
        if (e.type === 'deflect') {
          burst(parry, point, 24, back);
          burst(glow, point, 4, back);
        } else if (shield) {
          burst(impact, point, e.arrow ? 3 : 6, back);
          burst(sparks, point, e.arrow ? 4 : 8, back);
        } else {
          burst(sparks, point, e.arrow ? 6 : e.heavy ? 17 : 12, back);
        }
        if (e.arrow) {
          break;
        }
        flash.setPosition(point[0], point[1], point[2]);
        flash.intensity = e.type === 'deflect' ? 5.6 : shield ? 1.5 : 2.8;
        flashLife = 0.095;
        break;
      }
      case 'hit': {
        if (e.quiet || e.poison) break;
        const strong = e.heavy > 0.5 || e.crit || e.broke;
        const special = SKILL_EFFECTS[e.skill];
        const blade = e.arrow || e.kick || !e.line ? null : bladeOf(e.by);
        const { point, away, back } = contact(e, at, e.by ? where(e.by) : at, blade, 0.23);
        if (e.mountedImpact && e.line === 'R' && blade && !e.graze && !e.broke) {
          // A sweep can hit several targets. One extension follows the closest contact on that beat.
          const { at: [x, z], from: [rx, rz] } = e.mountedImpact;
          const rangeSq = (x - rx) ** 2 + (z - rz) ** 2;
          const previous = mountedEdges.get(e.by);
          if (!previous || e.time > previous.time || (e.time === previous.time && rangeSq < previous.rangeSq))
            mountedEdges.set(e.by, { time: e.time, rangeSq, blade, point });
        }
        burst(impact, point, strong || special?.impact === 'blunt' ? 8 : e.arrow ? 3 : 5, away);
        if (e.glance || armoured || e.crit || special?.impact === 'steel')
          burst(sparks, point, e.glance ? 9 : strong ? 8 : 4, back);
        if (fx.blood && !e.kick && !e.glance && special?.impact !== 'arcane')
          burst(red, point, strong ? 16 : e.arrow ? 4 : 8, away);
        if (e.kick || special?.impact === 'blunt') burst(dust, floor(at, 0.2), 6);
        if (special?.impact === 'steel' || e.mountedImpact)
          cues.show('glint', point, heading, 0.28, special?.tint ?? [0.85, 0.93, 1], { time: 0.13, opacity: 0.92 });
        break;
      }
      case 'break':
        burst(sparks, at, 30);
        burst(glow, at, 12);
        break;
      case 'step':
        burst(dust, [at[0], 0.1, at[2]], 5);
        break;
      case 'horseRam': {
        const [x, z] = e.at ?? [at[0], at[2]];
        const from = where(e.by);
        const direction = [x - from[0], 0, z - from[2]];
        const stride = Math.hypot(direction[0], direction[2]) || 1;
        const away = [direction[0] / stride, 0.35, direction[2] / stride];
        burst(impact, [x, 0.84, z], 7, away);
        burst(dust, [x, 0.13, z], 10, away);
        break;
      }
      case 'skillBeat':
        if (e.part < 0) {
          burst(dust, floor(at, 0.09), 7);
          break;
        }
        skillCue(e.id, at, heading, bladeOf(e.who), e.part ?? 0, true);
        if (['spin', 'charge', 'moon', 'boar', 'stepCut', 'turning', 'shieldSlam'].includes(e.id))
          burst(dust, floor(at, 0.1), e.id === 'boar' && e.part === 1 ? 9 : 5);
        break;
      case 'loose': {
        const profile = SKILL_EFFECTS[e.skill];
        if (!profile?.release) break;
        const wave = e.skill === 'wave';
        const origin = ahead(at, e.yaw, wave ? 0.9 : 0.67, wave ? 0.92 : 1.45);
        cues.show(profile.release, origin, e.yaw, wave ? 0.96 : e.skill === 'fan' ? 0.67 : 0.48, profile.tint,
          { time: wave ? 0.21 : 0.18, opacity: 0.88, initial: 0.95 });
        if (e.skill === 'backStep') burst(dust, floor(at, 0.13), 7);
        break;
      }
      case 'slam': {
        const at = [e.at[0], 0.075, e.at[1]];
        const tint = SKILL_EFFECTS[e.skill]?.tint ?? SKILL_EFFECTS.down.tint;
        cues.show(e.skill === 'down' ? 'split' : 'ring', at, heading, e.radius, tint,
          { time: 0.44, opacity: 0.95, initial: 0.39, growth: 0.61 });
        if (e.skill === 'drop') cues.show('split', floor(at, 0.09), heading + Math.PI, e.radius * 0.73, tint,
          { time: 0.45, opacity: 0.64, initial: 0.55, growth: 0.43 });
        burst(dust, floor(at, 0.15), e.skill === 'leap' ? 19 : 28);
        burst(impact, floor(at, 0.28), 8);
        break;
      }
      case 'blast': {
        const at = [e.at[0], 0.075, e.at[1]];
        burst(fire, floor(at, 0.7), 32);
        burst(sparks, floor(at, 0.8), 24);
        burst(dust, floor(at, 0.2), 20);
        flash.setPosition(...floor(at, 1.2));
        flash.intensity = 13;
        flashLife = 0.16;
        cues.show('ring', at, 0, e.radius, SKILL_EFFECTS.blast.tint, { time: 0.4, opacity: 0.94, initial: 0.24, growth: 0.76 });
        break;
      }
      case 'mist': {
        const at = [e.at[0], 0.075, e.at[1]];
        burst(venom, floor(at, 0.55), 43);
        cues.show('split', at, 0, e.radius, SKILL_EFFECTS.mist.tint, { time: 0.54, opacity: 0.62, initial: 0.44, growth: 0.56 });
        break;
      }
      case 'web':
        cues.show('ring', [e.at[0], 0.07, e.at[1]], 0, e.radius, SKILL_EFFECTS.web.tint,
          { time: 0.35, opacity: 0.71, initial: 0.58, growth: 0.42 });
        break;
      case 'shout':
        burst(glow, at, 13);
        cues.show('ring', floor(at, 0.08), heading, 2.1, SKILL_EFFECTS.shout.tint, { time: 0.35, opacity: 0.89 });
        cues.show('split', floor(at, 0.20), heading, 1.54, SKILL_EFFECTS.shout.tint, { time: 0.49, opacity: 0.69 });
        break;
      case 'skill':
        skillCue(e.id, at, heading, bladeOf(e.who), 0, false);
        break;
      case 'lance':
        skillCue('couch', at, heading, bladeOf(e.who), 0, false);
        break;
      case 'skillCancel':
        if (e.id === 'spin') cues.show('arc', floor(at), heading, 0.84, SKILL_EFFECTS.counter.tint, { time: 0.19, opacity: 0.65 });
        break;
    }
  };

  /** Each frame: fly the arrows, place webs, run the emitters. */
  fx.update = (dt, game, bowLaunchOf) => {
    for (const e of fightEmitters) e.update(dt);
    if (flashLife > 0) {
      flashLife -= dt;
      flash.intensity *= Math.exp(-dt * 18);
    } else flash.intensity = 0;
    cues.update(dt);
    for (const { blade, point } of mountedEdges.values()) cues.bridge(blade, point);
    mountedEdges.clear();
    const live = new Set();
    for (const shot of game?.shots ?? []) {
      live.add(shot);
      let entry = arrows.get(shot);
      if (!entry) {
        let view, wake, handoff;
        if (shot.kind === 'wave') {
          view = new Mesh3D(waveGeo, waveMat);
          view.castShadow = false;
          view.renderOrder = 4;
        } else {
          view = arrowModel.node.clone();
          if (shot.kind === 'arrow' && !shot.skill) {
            const launch = bowLaunchOf?.(shot.by);
            if (launch && !shot.done) {
              const offset = [launch.at[0] - shot.x, launch.at[1] - shot.y, launch.at[2] - shot.z];
              const speed = Math.hypot(shot.vx, shot.vy, shot.vz);
              const [dx, dy, dz] = launch.direction;
              // Ignore stale views after a hitch or when the pose faces away from the shot.
              if (Math.hypot(...offset) <= 0.95 && dx * shot.vx + dy * shot.vy + dz * shot.vz > speed * 0.6)
                handoff = { offset, direction: launch.direction, age: 0 };
            }
          }
          const style = wakes.get(shot.skill ?? shot.kind);
          if (style) {
            wake = new Mesh3D(wakeGeo, style.material);
            wake.castShadow = false;
            wake.setScale(style.width, style.length, style.width);
            view.addChild(wake);
          }
        }
        scene.addChild(view);
        entry = { view, wake, handoff };
        arrows.set(shot, entry);
      }
      const { view, wake } = entry;
      if (wake) wake.visible = !shot.done;
      if (shot.kind === 'wave') {
        const yaw = Math.atan2(shot.vx, shot.vz);
        view.setPosition(shot.x, shot.y, shot.z);
        view.setRotation(0, yaw, 0);
        view.visible = !shot.done;
        continue;
      }
      if (!shot.done || !shot.stuck) {
        const sp = Math.hypot(shot.vx, shot.vy, shot.vz) || 1;
        const d = [shot.vx / sp, shot.vy / sp, shot.vz / sp];
        const position = [shot.x, shot.y, shot.z];
        if (entry.handoff && !shot.done) {
          const { offset, direction, age } = entry.handoff;
          const t = Math.min(1, age / 0.045);
          const weight = 1 - t * t * (3 - 2 * t);
          for (let i = 0; i < 3; i++) {
            position[i] += offset[i] * weight;
            d[i] += (direction[i] - d[i]) * weight;
          }
          const length = Math.hypot(...d);
          for (let i = 0; i < 3; i++) d[i] /= length;
          entry.handoff.age += dt;
          if (t === 1) entry.handoff = null;
        }
        // Arrow model points along +Y.
        const ax = [d[2], 0, -d[0]];
        const al = Math.hypot(ax[0], ax[2]);
        const angle = Math.acos(Math.max(-1, Math.min(1, d[1])));
        const s = Math.sin(angle / 2) / (al || 1);
        view.setQuaternion(ax[0] * s, 0, ax[2] * s, Math.cos(angle / 2));
        view.setPosition(position[0], Math.max(0.02, position[1]), position[2]);
      }
      view.visible = !(shot.done && shot.stuck);
    }
    for (const [shot, { view }] of arrows) {
      if (!live.has(shot)) {
        view.removeFromParent();
        arrows.delete(shot);
      }
    }
    const clouds = new Set(game?.clouds ?? []);
    for (const c of clouds) {
      if (c.kind === 'web' && !webs.has(c)) {
        const m = new Mesh3D(webGeo, webMat);
        m.castShadow = false;
        m.setPosition(c.x, 0, c.z);
        m.setScale(c.radius, 1, c.radius);
        scene.addChild(m);
        webs.set(c, m);
      }
      if (c.kind === 'mist' && Math.random() < dt * 12) {
        const angle = Math.random() * 2 * Math.PI;
        const radius = Math.sqrt(Math.random()) * c.radius * 0.58;
        burst(venom, [c.x + Math.cos(angle) * radius, 0.57, c.z + Math.sin(angle) * radius], 2);
      }
    }
    for (const [c, m] of webs) {
      if (!clouds.has(c)) {
        m.removeFromParent();
        webs.delete(c);
      }
    }
    for (const s of sweeps.values()) s.update(dt);
  };

  const flames = emitter({ capacity: 260, lifetime: [0.4, 0.9], speed: [0.6, 1.6], direction: [0, 1, 0], spread: 0.35, gravity: [0, 1.2, 0], drag: 1.5, startSize: 0.34, endSize: 0.08, startColor: 0xffe2a0, endColor: 0xd03010, startOpacity: 0.9, endOpacity: 0, blending: 'additive', shape: 'sphere', radius: 0.22 });
  /** A tongue of flame at a fire. */
  fx.flame = (at) => {
    burst(flames, at, 2);
    if (Math.random() < 0.15) burst(glow, [at[0], at[1] + 0.3, at[2]], 1);
  };
  const tickFlames = (dt) => flames.update(dt);
  fx.tickFire = tickFlames;

  /** Clear everything for a new fight. */
  fx.clear = () => {
    for (const { view } of arrows.values()) view.removeFromParent();
    arrows.clear();
    for (const [, m] of webs) m.removeFromParent();
    webs.clear();
    for (const e of fightEmitters) e.reset();
    for (const s of sweeps.values()) s.clear();
    cues.clear();
    mountedEdges.clear();
    flashLife = 0;
    flash.intensity = 0;
  };

  /** Weather: petals, snow, motes, embers — a slow field of particles around the camera. */
  fx.weather = (kind) => {
    fx.ambient?.removeFromParent();
    fx.ambient = null;
    if (!kind) return;
    const opts = {
      petals: { count: 520, lifetime: [5, 9], speed: [0.2, 0.7], direction: [0.4, -1, 0.2], spread: 0.6, gravity: [0.15, -0.35, 0.05], startSize: [0.05, 0.08], endScale: 0.9, startColor: 0xf6b8c8, endColor: 0xe890a8, startOpacity: 0.95, endOpacity: 0.7, spin: [-3, 3], shape: 'box', radius: 14 },
      snow: { count: 1400, lifetime: [5, 9], speed: [0.3, 0.9], direction: [0.2, -1, 0.1], spread: 0.4, gravity: [0.05, -0.5, 0], startSize: [0.03, 0.06], endScale: 1, startColor: 0xffffff, endColor: 0xf0f4ff, startOpacity: 0.9, endOpacity: 0.8, shape: 'box', radius: 16 },
      motes: { count: 320, lifetime: [6, 11], speed: [0.05, 0.2], direction: [0, 1, 0], spread: Math.PI, gravity: [0, 0.02, 0], startSize: [0.02, 0.04], endScale: 0.6, startColor: 0xfff6d0, endColor: 0xd8f0c0, startOpacity: 0.6, endOpacity: 0, shape: 'box', radius: 12 },
      embers: { count: 260, lifetime: [2, 4], speed: [0.4, 1.2], direction: [0, 1, 0], spread: 0.5, gravity: [0, 0.6, 0], startSize: [0.02, 0.05], endScale: 0.3, startColor: 0xffc070, endColor: 0xff5010, startOpacity: 1, endOpacity: 0, shape: 'box', radius: 12 },
      dust: { count: 260, lifetime: [6, 10], speed: [0.1, 0.4], direction: [1, 0.1, 0.2], spread: 0.6, gravity: [0, 0, 0], startSize: [0.03, 0.06], endScale: 1, startColor: 0xe8dcc0, endColor: 0xe8dcc0, startOpacity: 0.35, endOpacity: 0, shape: 'box', radius: 14 }
    }[kind];
    if (!opts) return;
    const gpu = createGpuParticles3D({ ...opts, map: kind === 'petals' ? petal : dot, count: Math.round(opts.count * particles), extents: [opts.radius, 5, opts.radius] });
    gpu.castShadow = false;
    gpu.setPosition(0, kind === 'embers' || kind === 'motes' ? 1.5 : 6, 0);
    scene.addChild(gpu);
    fx.ambient = gpu;
  };
  fx.tickWeather = (dt) => {
    fx.ambient?.update?.(dt);
    tickFlames(dt);
  };
  return fx;
}
