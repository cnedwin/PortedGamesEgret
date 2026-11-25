// 特效：火花与碎屑、治疗的光点、占领的光环、飞行道具（箭、弩箭、石弹、魔弹、鱼叉、龙息），全部用实例批量画，
// 每帧在 JS 里推进。飞行道具返回一个在命中时刻兑现的 Promise，画面据此对上伤害数字和音效。
// Effects: sparks and debris, healing motes, a capture ring, missiles (arrows, bolts, stones, magic, harpoons, dragon
// fire), all drawn as instanced batches advanced in JS each frame. A missile returns a promise that settles when it
// lands, so the view can time the damage figure and the sound to it.
import { InstancedMesh3D, Mesh3D, createBoxGeometry3D, createIcosahedronGeometry3D, createRingGeometry3D, createUnlitMaterial3D, mat4Compose, quatFromEuler } from '@egret/engine/world3d';

export function createEffects(scene, { amount = 1 } = {}) {
  const cap = Math.round(420 * amount) + 40;
  const sparkMaterial = createUnlitMaterial3D({ color: [1, 1, 1], toneMapped: false, fog: false, alphaMode: 'blend', depthWrite: false, blending: 'additive' });
  const sparks = new InstancedMesh3D(createIcosahedronGeometry3D({ radius: 0.07, detail: 0 }), sparkMaterial, cap, 4);
  sparks.count = 0;
  sparks.castShadow = false;
  sparks.renderOrder = 9;
  scene.addChild(sparks);
  const debrisMaterial = createUnlitMaterial3D({ color: [1, 1, 1], toneMapped: false, fog: false });
  const shots = new InstancedMesh3D(createBoxGeometry3D({ width: 0.06, height: 0.06, depth: 0.7 }), debrisMaterial, 24, 4);
  shots.count = 0;
  shots.castShadow = false;
  scene.addChild(shots);
  const orbs = new InstancedMesh3D(createIcosahedronGeometry3D({ radius: 0.22, detail: 1 }), sparkMaterial, 24, 4);
  orbs.count = 0;
  orbs.castShadow = false;
  orbs.renderOrder = 9;
  scene.addChild(orbs);
  const ringMaterial = createUnlitMaterial3D({ color: [1, 0.9, 0.4], toneMapped: false, alphaMode: 'blend', depthWrite: false, side: 'double', opacity: 0.8 });
  const rings = [];

  const particles = [];
  const missiles = [];
  const m = new Float32Array(16);
  const q = new Float32Array(4);
  const rand = (a, b) => a + Math.random() * (b - a);

  const fx = {
    /** A burst of sparks at `p` ([x, y, z]) in `color` ([r, g, b]). */
    burst(p, color = [1, 0.85, 0.4], n = 14, speed = 3.2, life = 0.55, gravity = -6) {
      n = Math.round(n * amount);
      for (let i = 0; i < n && particles.length < cap; i++) {
        const a = rand(0, Math.PI * 2),
          up = rand(0.2, 1);
        const v = rand(0.4, 1) * speed;
        particles.push({ p: [...p], v: [Math.cos(a) * v * (1 - up * 0.5), up * v, Math.sin(a) * v * (1 - up * 0.5)], life, age: 0, color, size: rand(0.6, 1.4), gravity });
      }
    },
    /** Motes rising (healing, capture, a buff). */
    rise(p, color = [0.5, 1, 0.6], n = 16, spread = 0.8) {
      n = Math.round(n * amount);
      for (let i = 0; i < n && particles.length < cap; i++)
        particles.push({ p: [p[0] + rand(-spread, spread), p[1] + rand(0, 0.4), p[2] + rand(-spread, spread)], v: [0, rand(0.8, 1.8), 0], life: rand(0.7, 1.1), age: 0, color, size: rand(0.6, 1.2), gravity: 0 });
    },
    /** An expanding ring on the ground. */
    ring(p, color = [1, 0.85, 0.3], radius = 1.4) {
      const mat = ringMaterial.clone();
      mat.color.set(color);
      const mesh = new Mesh3D(createRingGeometry3D({ innerRadius: 0.82, outerRadius: 1, thetaSegments: 40 }), mat);
      mesh.setRotation(-Math.PI / 2, 0, 0);
      mesh.castShadow = false;
      mesh.renderOrder = 8;
      scene.addChild(mesh);
      rings.push({ mesh, p, radius, age: 0, life: 0.6 });
    },
    /**
     * Fly a missile of `kind` from `a` to `b` ([x, y, z]); resolves when it lands. Kinds: arrow, bolt, stone, magic,
     * harpoon, fire, shell.
     */
    missile(kind, a, b, time = 0.45) {
      return new Promise((done) => {
        const arc = kind === 'stone' || kind === 'shell' ? 3.5 : kind === 'arrow' ? 1.2 : kind === 'fire' ? 0 : 0.3;
        missiles.push({ kind, a, b, time, age: 0, arc, done });
      });
    },
    update(seconds) {
      // Particles.
      let n = 0;
      for (let i = particles.length - 1; i >= 0; i--) {
        const s = particles[i];
        s.age += seconds;
        if (s.age >= s.life) {
          particles.splice(i, 1);
          continue;
        }
        s.v[1] += s.gravity * seconds;
        for (let k = 0; k < 3; k++) s.p[k] += s.v[k] * seconds;
        const fade = 1 - s.age / s.life;
        mat4Compose(m, s.p, quatFromEuler(q, 0, 0, 0), [s.size * fade, s.size * fade, s.size * fade]);
        sparks.setMatrixAt(n, m);
        sparks.setColorAt(n, s.color[0] * 2, s.color[1] * 2, s.color[2] * 2, fade);
        n++;
      }
      sparks.count = n;
      // Missiles.
      let ns = 0,
        no = 0;
      for (let i = missiles.length - 1; i >= 0; i--) {
        const s = missiles[i];
        s.age += seconds;
        const k = Math.min(1, s.age / s.time);
        const x = s.a[0] + (s.b[0] - s.a[0]) * k,
          z = s.a[2] + (s.b[2] - s.a[2]) * k,
          y = s.a[1] + (s.b[1] - s.a[1]) * k + Math.sin(k * Math.PI) * s.arc;
        if (s.kind === 'fire') {
          fx.burst([x, y, z], [1, 0.5 + Math.random() * 0.3, 0.1], 3, 1.2, 0.35, 1.5);
        } else if (s.kind === 'magic' || s.kind === 'stone' || s.kind === 'shell') {
          const color = s.kind === 'magic' ? [0.6, 0.8, 2.2] : s.kind === 'shell' ? [0.25, 0.25, 0.28] : [0.55, 0.5, 0.45];
          const size = s.kind === 'magic' ? 1 : 1.3;
          mat4Compose(m, [x, y, z], quatFromEuler(q, s.age * 6, s.age * 4, 0), [size, size, size]);
          orbs.setMatrixAt(no, m);
          orbs.setColorAt(no, color[0], color[1], color[2], 1);
          no++;
          if (s.kind === 'magic') fx.burst([x, y, z], [0.5, 0.7, 1], 1, 0.4, 0.3, 0);
        } else {
          // Arrow, bolt, harpoon: a shaft pointing along its flight.
          const dx = s.b[0] - s.a[0],
            dz = s.b[2] - s.a[2];
          const dy = s.b[1] - s.a[1] + Math.cos(k * Math.PI) * Math.PI * s.arc;
          const yaw = Math.atan2(dx, dz),
            pitch = -Math.atan2(dy, Math.hypot(dx, dz));
          const len = s.kind === 'arrow' ? 1 : 1.6;
          mat4Compose(m, [x, y, z], quatFromEuler(q, pitch, yaw, 0), [s.kind === 'arrow' ? 1 : 1.6, s.kind === 'arrow' ? 1 : 1.6, len]);
          shots.setMatrixAt(ns, m);
          const c = s.kind === 'harpoon' ? [0.7, 0.72, 0.75] : [0.42, 0.28, 0.16];
          shots.setColorAt(ns, c[0], c[1], c[2], 1);
          ns++;
        }
        if (k >= 1) {
          missiles.splice(i, 1);
          s.done();
        }
      }
      shots.count = ns;
      orbs.count = no;
      // Rings.
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.age += seconds;
        const k = r.age / r.life;
        if (k >= 1) {
          r.mesh.removeFromParent();
          rings.splice(i, 1);
          continue;
        }
        const s = 0.3 + k * r.radius;
        r.mesh.setPosition(r.p[0], r.p[1] + 0.06, r.p[2]);
        r.mesh.setScale(s, s, s);
        r.mesh.material.opacity = 0.85 * (1 - k);
      }
    },
    dispose() {
      for (const mesh of [sparks, shots, orbs, ...rings.map((r) => r.mesh)]) mesh.removeFromParent();
      rings.length = 0;
      particles.length = 0;
      for (const s of missiles.splice(0)) s.done();
    }
  };
  return fx;
}
