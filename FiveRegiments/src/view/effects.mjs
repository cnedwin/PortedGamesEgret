// What the fight throws into the air: sparks where steel meets steel, a mist of blood, dust under feet, the
// sweep of a blade, arrows in flight and stuck where they landed, the blade wave, poison mist, the web, the blast,
// the ring of a slam, and the weather of each place.
import {
  Mesh3D,
  Texture3D,
  Object3D,
  createGeometry3D,
  createParticleEmitter3D,
  createGpuParticles3D,
  createPointLight3D,
  createRingGeometry3D,
  createUnlitMaterial3D
} from '@egret/engine/world3d';
import { createWeapon } from './weapons.mjs';

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
  scene.addChild(mesh);
  const points = [];
  return {
    mesh,
    push(base, tip, strength, tint) {
      points.unshift({ base, tip, strength, tint });
      if (points.length > TRAIL) points.pop();
    },
    update(dt) {
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
      const fade = Math.exp(-13.4 * dt);
      for (const p of points) p.strength *= fade;
      while (points.length && points.at(-1).strength < 0.02) points.pop();
    }
  };
}

export function createEffects(scene, { particles = 1, blood = true } = {}) {
  const fx = { blood };
  const dot = spriteTexture('dot'),
    petal = spriteTexture('petal');
  const emitter = (options) => {
    const e = createParticleEmitter3D({ space: 'world', rate: 0, map: dot, capacity: Math.round((options.capacity ?? 200) * particles), ...options });
    e.castShadow = false;
    scene.addChild(e);
    return e;
  };
  const sparks = emitter({ capacity: 260, lifetime: [0.18, 0.5], speed: [3, 9], spread: Math.PI, gravity: [0, -9, 0], drag: 1.2, startSize: 0.05, endSize: 0.01, startColor: 0xfff2c8, endColor: 0xff7a20, startOpacity: 1, endOpacity: 0, blending: 'additive', shape: 'sphere', radius: 0.04 });
  const red = emitter({ capacity: 220, lifetime: [0.3, 0.8], speed: [1, 3.6], spread: 1.1, gravity: [0, -7, 0], drag: 1.6, startSize: 0.07, endSize: 0.16, startColor: 0x7a0a06, endColor: 0x3a0503, startOpacity: 0.9, endOpacity: 0, shape: 'sphere', radius: 0.08 });
  const dust = emitter({ capacity: 200, lifetime: [0.6, 1.4], speed: [0.4, 1.4], spread: 1.3, direction: [0, 1, 0], gravity: [0, 0.3, 0], drag: 2.4, startSize: 0.2, endSize: 0.9, startColor: 0xb8a58a, endColor: 0xd8c8b0, startOpacity: 0.35, endOpacity: 0, shape: 'sphere', radius: 0.3 });
  const glow = emitter({ capacity: 160, lifetime: [0.25, 0.6], speed: [0.5, 2.5], spread: Math.PI, gravity: [0, 1.5, 0], drag: 2, startSize: 0.14, endSize: 0.02, startColor: 0xfff0b0, endColor: 0xffa040, startOpacity: 0.9, endOpacity: 0, blending: 'additive', shape: 'sphere', radius: 0.2 });
  const venom = emitter({ capacity: 260, lifetime: [1.2, 2.2], speed: [0.2, 0.7], spread: Math.PI, gravity: [0, 0.25, 0], drag: 1.2, startSize: 0.5, endSize: 1.4, startColor: 0x6a9a2a, endColor: 0x2c4a10, startOpacity: 0.32, endOpacity: 0, shape: 'sphere', radius: 1.6 });
  const fire = emitter({ capacity: 160, lifetime: [0.3, 0.8], speed: [2, 6], spread: Math.PI, gravity: [0, 3, 0], drag: 2.2, startSize: 0.5, endSize: 1.2, startColor: 0xffd890, endColor: 0x802010, startOpacity: 0.9, endOpacity: 0, blending: 'additive', shape: 'sphere', radius: 0.4 });
  const burst = (e, at, n, dir) => {
    e.setPosition(at[0], at[1], at[2]);
    if (dir) e.direction = dir;
    e.burst(Math.max(1, Math.round(n * particles)));
  };

  // Light from a clash or a blast, fading fast.
  const flash = createPointLight3D({ color: 0xffc070, intensity: 0, range: 6 });
  scene.addChild(flash);
  let flashLife = 0;

  // Arrows: one model, cloned per shot.
  const arrowModel = createWeapon('arrow');
  const arrows = new Map();
  const waveMat = createUnlitMaterial3D({ color: 0xbfe6ff, blending: 'additive', depthWrite: false, side: 'double', opacity: 0.85 });
  const waveGeo = createRingGeometry3D({ innerRadius: 0.9, outerRadius: 1.25, thetaSegments: 24, thetaStart: Math.PI * 0.15, thetaLength: Math.PI * 0.7 });
  const ringGeo = createRingGeometry3D({ innerRadius: 0.92, outerRadius: 1, thetaSegments: 48 });
  const rings = [];
  const webMat = createUnlitMaterial3D({ color: 0xe8e6dc, opacity: 0.55, blending: 'normal', depthWrite: false, side: 'double' });
  const webs = new Map();

  function webMesh(radius) {
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
      quad([0, 0], [Math.cos(a) * radius, Math.sin(a) * radius], 0.012);
    }
    for (let r = 1; r <= 5; r++) {
      const rr = (r / 5) * radius;
      for (let s = 0; s < 12; s++) {
        const a = (s / 12) * Math.PI * 2,
          b = ((s + 1) / 12) * Math.PI * 2;
        quad([Math.cos(a) * rr, Math.sin(a) * rr], [Math.cos(b) * rr * 0.97, Math.sin(b) * rr * 0.97], 0.01);
      }
    }
    return new Mesh3D(createGeometry3D({ positions: pos, indices: idx }), webMat);
  }

  const sweeps = new Map();
  fx.sweep = (id) => {
    let s = sweeps.get(id);
    if (!s) sweeps.set(id, (s = createSweep(scene)));
    return s;
  };

  /** Answer one event of the fight. `where(id)` gives a man's chest place. */
  fx.event = (e, where, bladeOf) => {
    const at = where(e.who);
    switch (e.type) {
      case 'block':
      case 'deflect': {
        if (e.arrow) {
          burst(sparks, at, 10);
          break;
        }
        const blade = bladeOf(e.by);
        const p = blade ? blade[1].map((v, i) => (v + at[i]) / 2) : at;
        burst(sparks, p, e.type === 'deflect' ? 48 : 22);
        if (e.type === 'deflect') burst(glow, p, 10);
        flash.setPosition(p[0], p[1], p[2]);
        flash.intensity = e.type === 'deflect' ? 9 : 4;
        flashLife = 0.12;
        break;
      }
      case 'hit':
        if (e.quiet) break;
        if (fx.blood && !e.poison) burst(red, at, e.heavy || e.crit ? 26 : 12);
        if (e.crit) burst(sparks, at, 8);
        if (e.kick) burst(dust, [at[0], 0.2, at[2]], 6);
        break;
      case 'break':
        burst(sparks, at, 30);
        burst(glow, at, 12);
        break;
      case 'step':
        burst(dust, [at[0], 0.1, at[2]], 5);
        break;
      case 'slam': {
        burst(dust, [e.at[0], 0.15, e.at[1]], 40);
        ring([e.at[0], 0.06, e.at[1]], e.radius, [1, 0.8, 0.5]);
        break;
      }
      case 'blast': {
        burst(fire, [e.at[0], 0.7, e.at[1]], 40);
        burst(sparks, [e.at[0], 0.8, e.at[1]], 40);
        burst(dust, [e.at[0], 0.2, e.at[1]], 30);
        flash.setPosition(e.at[0], 1.2, e.at[1]);
        flash.intensity = 30;
        flashLife = 0.3;
        ring([e.at[0], 0.06, e.at[1]], e.radius, [1, 0.5, 0.2]);
        break;
      }
      case 'mist':
        burst(venom, [e.at[0], 0.8, e.at[1]], 70);
        break;
      case 'shout':
        burst(glow, at, 30);
        ring([at[0], 0.06, at[2]], 2.2, [1, 0.7, 0.3]);
        break;
      case 'skill':
        burst(glow, at, 8);
        break;
    }
  };

  function ring(at, radius, tint) {
    const mat = createUnlitMaterial3D({ color: tint, blending: 'additive', depthWrite: false, side: 'double', opacity: 1 });
    const mesh = new Mesh3D(ringGeo, mat);
    mesh.setPosition(at[0], at[1], at[2]);
    mesh.setRotation(-Math.PI / 2, 0, 0);
    scene.addChild(mesh);
    rings.push({ mesh, mat, life: 0.5, radius });
  }

  /** Each frame: fly the arrows, place webs, run the emitters. */
  fx.update = (dt, game) => {
    for (const e of [sparks, red, dust, glow, venom, fire]) e.update(dt);
    if (flashLife > 0) {
      flashLife -= dt;
      flash.intensity *= Math.exp(-dt * 18);
    } else flash.intensity = 0;
    for (const r of [...rings]) {
      r.life -= dt;
      const k = 1 - r.life / 0.5;
      const s = r.radius * (0.4 + 0.6 * k);
      r.mesh.setScale(s, s, s);
      r.mat.opacity = Math.max(0, 1 - k);
      if (r.life <= 0) {
        r.mesh.removeFromParent();
        r.mat.dispose();
        rings.splice(rings.indexOf(r), 1);
      }
    }
    const live = new Set();
    for (const shot of game?.shots ?? []) {
      live.add(shot);
      let view = arrows.get(shot);
      if (!view) {
        if (shot.kind === 'wave') {
          view = new Mesh3D(waveGeo, waveMat);
          view.renderOrder = 4;
        } else {
          view = arrowModel.node.clone();
          if (shot.kind === 'blast') burst(glow, [shot.x, shot.y, shot.z], 4);
        }
        scene.addChild(view);
        arrows.set(shot, view);
      }
      if (shot.kind === 'wave') {
        const yaw = Math.atan2(shot.vx, shot.vz);
        view.setPosition(shot.x, 0.9, shot.z);
        view.setRotation(0, yaw, 0);
        view.visible = !shot.done;
        continue;
      }
      if (!shot.done || !shot.stuck) {
        const sp = Math.hypot(shot.vx, shot.vy, shot.vz) || 1;
        const d = [shot.vx / sp, shot.vy / sp, shot.vz / sp];
        // Arrow model points along +Y.
        const ax = [d[2], 0, -d[0]];
        const al = Math.hypot(ax[0], ax[2]);
        const angle = Math.acos(Math.max(-1, Math.min(1, d[1])));
        const s = Math.sin(angle / 2) / (al || 1);
        view.setQuaternion(ax[0] * s, 0, ax[2] * s, Math.cos(angle / 2));
        view.setPosition(shot.x, Math.max(0.02, shot.y), shot.z);
      }
      if (shot.kind === 'blast' && !shot.done) burst(glow, [shot.x, shot.y, shot.z], 1);
      view.visible = !(shot.done && shot.stuck);
    }
    for (const [shot, view] of arrows) {
      if (!live.has(shot)) {
        view.removeFromParent();
        arrows.delete(shot);
      }
    }
    const clouds = new Set(game?.clouds ?? []);
    for (const c of clouds) {
      if (c.kind === 'web' && !webs.has(c)) {
        const m = webMesh(c.radius);
        m.setPosition(c.x, 0, c.z);
        scene.addChild(m);
        webs.set(c, m);
      }
      if (c.kind === 'mist' && Math.random() < dt * 14) burst(venom, [c.x, 0.7, c.z], 2);
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
    for (const [, v] of arrows) v.removeFromParent();
    arrows.clear();
    for (const [, m] of webs) m.removeFromParent();
    webs.clear();
    for (const e of [sparks, red, dust, glow, venom, fire]) e.reset?.();
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
