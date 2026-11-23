// One man on the field as the picture shows him: his body (a rigged, generated model), captured locomotion
// blended by how he moves, and over it his arms placed by reach along the line of the blow he is giving or the
// guard he holds, his weapon in his hand, a kick, a stagger, a fall. It reads the fight's state of the man each
// frame; it never changes the fight.
import { Mesh3D, Object3D, createCylinderGeometry3D, createStandardMaterial3D } from '@egret/engine/world3d';
import { ARMS, createWeapon } from './weapons.mjs';
import { add, axisAngle, basis, cross, dot, len, lerp3, mul, qinv, qmul, qrot, slerp, sub, unit } from './rig.mjs';
import { createRig } from './rig.mjs';
import { createAnimator, impactWeight, interpolateDirection, swingPhase } from './motion.mjs';

const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const easeOut = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - (1 - t) ** 3);
const easeIn = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * t);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Hand places, relative to the middle of the shoulders, in metres (+X his left, +Y up, +Z forward) and the way the
// blade points. `t` twists the chest about the spine (+ to his left), `n` leans him forward, `d` drops the hips,
// `f` moves them forward.
const P = (r, b, extra = {}) => ({ r, b, t: 0, n: 0, d: 0, f: 0, ...extra });
const ONE = {
  ready: P([-0.2, -0.24, 0.32], [0.18, 0.72, 0.62], { t: 0.08 }),
  R: [P([-0.44, 0.16, -0.06], [-0.35, 0.72, -0.6], { t: -0.6, n: -0.05 }), P([-0.02, -0.06, 0.56], [0.78, 0.04, 0.62], { t: 0.18, n: 0.14, f: 0.08 }), P([0.3, -0.32, 0.32], [0.72, -0.38, -0.25], { t: 0.6, n: 0.12 })],
  L: [P([0.24, 0.12, 0.1], [0.62, 0.55, -0.5], { t: 0.5 }), P([-0.06, -0.06, 0.56], [-0.8, 0.02, 0.6], { t: -0.12, n: 0.14, f: 0.08 }), P([-0.4, -0.32, 0.28], [-0.72, -0.4, -0.3], { t: -0.55, n: 0.1 })],
  O: [P([-0.14, 0.42, -0.04], [0.05, 0.32, -0.95], { t: -0.15, n: -0.14 }), P([-0.06, -0.02, 0.52], [0.02, -0.18, 1], { t: 0.05, n: 0.22, d: 0.06, f: 0.06 }), P([-0.08, -0.44, 0.36], [0, -0.86, 0.5], { n: 0.3, d: 0.11 })],
  T: [P([-0.28, -0.26, -0.14], [0.08, 0.16, 1], { t: -0.48, n: -0.05 }), P([-0.04, -0.08, 0.68], [0.05, 0.02, 1], { t: 0.28, n: 0.16, f: 0.16 }), P([-0.06, -0.13, 0.6], [0.05, -0.1, 1], { t: 0.22, n: 0.12, f: 0.1 })],
  guard: {
    R: P([-0.35, 0.02, 0.36], [0.12, 1, 0.22], { t: -0.17, d: 0.026 }),
    L: P([0.15, 0.03, 0.36], [-0.18, 1, 0.22], { t: 0.2, d: 0.026 }),
    O: P([-0.22, 0.38, 0.3], [1, 0.12, 0.08], { n: -0.04, d: 0.018 }),
    T: P([-0.08, -0.18, 0.44], [0.83, 0.29, 0.44], { n: 0.12, d: 0.055 })
  }
};
const TWO = {
  ready: P([-0.1, -0.26, 0.32], [0.1, 0.86, 0.5], { t: 0.12 }),
  R: [P([-0.36, 0.24, -0.06], [-0.42, 0.7, -0.58], { t: -0.75, n: -0.06 }), P([0.0, -0.08, 0.46], [0.86, 0.06, 0.5], { t: 0.22, n: 0.16, f: 0.1, d: 0.04 }), P([0.32, -0.26, 0.24], [0.78, -0.3, -0.46], { t: 0.75, n: 0.14, d: 0.05 })],
  L: [P([0.22, 0.2, 0.02], [0.6, 0.62, -0.5], { t: 0.65 }), P([-0.04, -0.08, 0.46], [-0.86, 0.06, 0.5], { t: -0.2, n: 0.16, f: 0.1, d: 0.04 }), P([-0.36, -0.26, 0.22], [-0.78, -0.3, -0.46], { t: -0.7, n: 0.14, d: 0.05 })],
  O: [P([-0.06, 0.44, 0.0], [0, 0.3, -0.96], { t: -0.1, n: -0.16 }), P([0, -0.04, 0.46], [0, -0.22, 1], { n: 0.26, d: 0.1, f: 0.08 }), P([0, -0.4, 0.36], [0, -0.9, 0.42], { n: 0.34, d: 0.14 })],
  T: [P([-0.18, -0.2, -0.1], [0.05, 0.1, 1], { t: -0.4 }), P([-0.02, -0.05, 0.62], [0, 0, 1], { t: 0.2, n: 0.16, f: 0.18 }), P([-0.02, -0.1, 0.56], [0, -0.08, 1], { t: 0.16, n: 0.12, f: 0.12 })],
  guard: {
    R: P([-0.28, 0.01, 0.31], [0.14, 1, 0.24], { t: -0.22, d: 0.038 }),
    L: P([0.12, 0.01, 0.34], [-0.16, 1, 0.24], { t: 0.24, d: 0.038 }),
    O: P([-0.2, 0.36, 0.28], [1, 0.14, 0.1], { d: 0.028 }),
    T: P([-0.04, -0.14, 0.4], [0.72, 0.39, 0.48], { n: 0.12, d: 0.06 })
  }
};
const SPEAR = {
  ready: P([-0.2, -0.36, 0.04], [0.06, 0.14, 1], { t: -0.25 }),
  R: [P([-0.42, -0.02, -0.12], [-0.62, 0.22, 0.75], { t: -0.6 }), P([-0.12, -0.12, 0.24], [0.76, 0.05, 0.64], { t: 0.3, n: 0.1, f: 0.06 }), P([0.06, -0.2, 0.2], [1, -0.12, 0.08], { t: 0.6, n: 0.1 })],
  L: [P([0.0, -0.04, 0.16], [0.75, 0.2, 0.65], { t: 0.5 }), P([-0.22, -0.12, 0.24], [-0.76, 0.05, 0.64], { t: -0.25, n: 0.1, f: 0.06 }), P([-0.36, -0.2, 0.12], [-1, -0.12, 0.1], { t: -0.5, n: 0.1 })],
  O: [P([-0.2, 0.34, -0.1], [0, 0.85, 0.52], { t: -0.2, n: -0.12 }), P([-0.1, -0.02, 0.28], [0, -0.32, 0.95], { n: 0.22, d: 0.08, f: 0.08 }), P([-0.1, -0.24, 0.26], [0, -0.6, 0.8], { n: 0.26, d: 0.1 })],
  T: [P([-0.24, -0.34, -0.24], [0.04, 0.08, 1], { t: -0.4, n: -0.04 }), P([-0.06, -0.16, 0.4], [0.02, 0.02, 1], { t: 0.16, n: 0.16, f: 0.22 }), P([-0.08, -0.18, 0.34], [0.02, -0.04, 1], { t: 0.12, n: 0.12, f: 0.16 })],
  guard: {
    R: P([-0.32, -0.12, 0.21], [0.14, 1, 0.32], { t: -0.18, d: 0.026 }),
    L: P([0.08, -0.12, 0.29], [-0.16, 1, 0.32], { t: 0.2, d: 0.026 }),
    O: P([-0.31, 0.3, 0.23], [1, 0.15, 0.1], { d: 0.02 }),
    T: P([-0.15, -0.28, 0.28], [0.69, 0.34, 0.64], { n: 0.1, d: 0.048 })
  }
};
const STYLE = { sabre: ONE, jian: ONE, knife: ONE, zhanma: TWO, axe: TWO, spear: SPEAR, ji: SPEAR };

function mixPose(a, b, t) {
  return {
    r: lerp3(a.r, b.r, t),
    b: interpolateDirection(a.b, b.b, t),
    t: a.t + (b.t - a.t) * t,
    n: a.n + (b.n - a.n) * t,
    d: a.d + (b.d - a.d) * t,
    f: a.f + (b.f - a.f) * t
  };
}

/** A string between two points, as a thin cylinder placed each frame. */
function createStrand(material, radius = 0.0016) {
  const mesh = new Mesh3D(createCylinderGeometry3D({ radiusTop: radius, radiusBottom: radius, height: 1, radialSegments: 4 }), material);
  mesh.castShadow = false;
  return {
    mesh,
    span(a, b) {
      const d = sub(b, a),
        l = len(d);
      const m = lerp3(a, b, 0.5);
      mesh.setPosition(m[0], m[1], m[2]);
      const q = axisAngle(cross([0, 1, 0], d).every((v) => Math.abs(v) < 1e-6) ? [1, 0, 0] : cross([0, 1, 0], d), Math.acos(clamp(dot([0, 1, 0], unit(d)), -1, 1)));
      mesh.setQuaternion(q[0], q[1], q[2], q[3]);
      mesh.setScale(1, Math.max(0.001, l), 1);
    }
  };
}

let stringMaterial;

/**
 * A figure for one man: `body` is a loaded character (its scene and owned resources), `motion` the locomotion set
 * retargeted onto it. `world` is the parent node to put him under (the scene).
 */
export function createFigure({ regiment, body, motion, world, height = 1.8 }) {
  const holder = new Object3D();
  holder.name = 'figure-' + regiment;
  const inner = new Object3D();
  holder.addChild(inner);
  inner.addChild(body.scene);
  world.addChild(holder);
  body.scene.traverse((n) => {
    if (n instanceof Mesh3D) {
      n.castShadow = true;
      n.receiveShadow = true;
      n.frustumCulled = false;
    }
  });
  const animator = createAnimator(body.scene, motion, { height });
  const s = animator.scale;
  inner.setScale(s, s, s);
  inner.setRotation(0, animator.turn, 0);
  inner.updateWorldMatrices?.(true);
  const rig = createRig(animator.nodes, { scale: s, turn: animator.turn, root: body.scene });

  // Body landmarks at rest, in body space.
  const hipY = rig.toBody(rig.world('pelvis').t)[1];
  const armLength = rig.reach.r.upper * s + rig.reach.r.lower * s;
  // Hand places were written for a man of about 1.8 m; scale them to his arms.
  const reachK = armLength / 0.56;

  // ---- weapons in hand ------------------------------------------------------------------------------------
  const arms = ARMS[regiment];
  const leftGripFrame = arms.two ? qinv(basis(rig.hands.l.along, rig.hands.l.fingers, cross(rig.hands.l.along, rig.hands.l.fingers))) : null;
  const held = {};
  function attach(kind, side, mapping = 'blade') {
    const weapon = createWeapon(kind);
    const hand = rig.hands[side];
    const handNode = rig.bone('hand_' + side);
    const node = weapon.node;
    // Weapon +Y along the hand's grip axis, its edge (+Z) toward the knuckles; a shield's face (+Y) toward the knuckles.
    const along = hand.along,
      fingers = hand.fingers,
      across = cross(along, fingers);
    const q = mapping === 'shield' ? basis(along, fingers, cross(along, fingers)) : basis(cross(along, fingers), along, fingers);
    void across;
    node.setQuaternion(q[0], q[1], q[2], q[3]);
    const g = mapping === 'shield' ? add(hand.grip, mul(fingers, 0.03 / s)) : hand.grip;
    node.setPosition(g[0], g[1], g[2]);
    node.setScale(1 / s, 1 / s, 1 / s);
    handNode.addChild(node);
    held[kind] = { ...weapon, side, q, g };
    return held[kind];
  }
  const main = attach(arms.main, 'r');
  const offhand = arms.off ? attach(arms.off, 'l', 'shield') : null;
  const bow = arms.bow ? attach(arms.bow, 'l') : null;
  if (bow) main.node.visible = false;
  let strings = null,
    nocked = null;
  if (bow) {
    stringMaterial ??= createStandardMaterial3D({ color: 0xeee2c4, roughness: 0.6 });
    strings = [createStrand(stringMaterial), createStrand(stringMaterial)];
    for (const st of strings) holder.addChild(st.mesh);
    nocked = createWeapon('arrow');
    holder.addChild(nocked.node);
  }

  /** The rig-space place and turn of a point in a held weapon's frame. */
  function weaponPoint(w, local) {
    const hw = rig.world('hand_' + w.side);
    return add(hw.t, qrot(hw.r, add(w.g, qrot(w.q, mul(local, 1 / s)))));
  }
  function weaponDir(w, local) {
    const hw = rig.world('hand_' + w.side);
    return qrot(hw.r, qrot(w.q, local));
  }

  const base = motion.pose(),
    gait = motion.pose(),
    layer = motion.pose();
  const state = {
    phase: 0,
    pose: { ...ONE.ready },
    lpose: null,
    impactAge: Infinity,
    impactPower: 0,
    impactBearing: null,
    impactKind: 'hit',
    down: 0,
    fall: 0,
    spin: 0,
    kick: 0,
    lastAct: null,
    guardBlend: 0,
    drawBlend: 0,
    bowPull: 0,
    // On horseback: how far into the saddle (0 standing, 1 seated), and how far his chest turns from the horse.
    ride: 0,
    turnOnHorse: 0
  };
  const style = STYLE[arms.main] ?? ONE;

  /** The arm pose for this moment of his action, in shoulder-centred body space. */
  function actionPose(man, dt) {
    const act = man.act;
    let pose = style.ready;
    let blend = 10; // how fast the arms follow (1/s); swings set the place exactly
    if (man.guard && style.guard) {
      pose = style.guard[man.guardLine] ?? style.ready;
      blend = 26;
    }
    if (act?.kind === 'swing') {
      const phase = swingPhase(act, arms.main, man.prev?.attack);
      const keys = [style.ready, ...style[act.line], style.ready];
      const from = Math.min(3, Math.floor(phase));
      const pose = mixPose(keys[from], keys[from + 1], phase - from);
      // The front foot takes the load as the blade commits. Held attacks stay weighted on the back foot.
      const gather = phase < 1 ? phase : Math.max(0, 2 - phase);
      const carry = Math.max(0, 1 - Math.abs(phase - 2.45) / 1.25);
      const heft = arms.two ? 1 : 0.66;
      pose.d += heft * (0.033 * gather + 0.026 * carry);
      pose.f += heft * (-0.08 * gather + 0.075 * carry);
      return { pose, blend: 60 };
    }
    if (act?.kind === 'skill') return skillPose(man, act) ?? { pose, blend };
    // The couched ji: held level under the arm, its point off the horse's head toward the right front.
    if (act?.kind === 'lance') return { pose: P([-0.24, -0.3, 0.12], [-0.85, -0.05, 0.52], { t: -0.3, n: 0.1 }), blend: 12 };
    if (act?.kind === 'kick') return { pose: style.ready, blend: 14 };
    return { pose, blend };
  }

  function sweep(keys, k) {
    return k < 0.5 ? mixPose(keys[0], keys[1], easeIn(k * 2)) : mixPose(keys[1], keys[2], easeOut((k - 0.5) * 2));
  }

  function skillPose(man, act) {
    const t = act.t;
    const k = (a, b) => clamp((t - a) / (b - a), 0, 1);
    function stroke(line, load, contact, follow, ready, lean = 0) {
      const keys = style[line];
      let pose;
      if (t < load) pose = mixPose(style.ready, keys[0], easeOut(k(0, load)));
      else if (t < contact) pose = mixPose(keys[0], keys[1], easeIn(k(load, contact)));
      else if (t < follow) pose = mixPose(keys[1], keys[2], easeOut(k(contact, follow)));
      else pose = mixPose(keys[2], style.ready, ease(k(follow, ready)));
      return { pose, blend: 60, lean: lean * (k(load, contact) - k(follow, ready)) };
    }
    switch (act.id) {
      case 'turning':
        return { pose: sweep(style.R, k(0.05, 0.5)), blend: 60, spin: k(0.1, 0.5) * Math.PI * 2 };
      case 'moon':
        return stroke('L', 0.095, 0.18, 0.34, 0.49);
      case 'swing': {
        const times = [0.18, 0.38, 0.58];
        for (let i = 0; i < 3; i++) if (t < times[i] + 0.1) return { pose: sweep(style[i % 2 ? 'L' : 'R'], clamp((t - (times[i] - 0.14)) / 0.24, 0, 1)), blend: 60 };
        return { pose: style.ready, blend: 12 };
      }
      case 'spin':
        return { pose: sweep(style.R, k(0.05, 0.4)), blend: 50, spin: k(0.08, 0.42) * Math.PI * 2 };
      case 'whirl':
        return { pose: mixPose(style.R[1], style.L[1], 0.5), blend: 30, spin: k(0.2, 1.85) * Math.PI * 2 * 5 };
      case 'wave':
        return stroke('R', 0.26, 0.38, 0.56, 0.74);
      case 'down':
        return stroke('O', 0.54, 0.72, 0.98, 1.27);
      case 'leap':
        return stroke('O', 0.42, 0.56, 0.78, 1.02);
      case 'drop':
        return stroke('O', 0.39, 0.52, 0.74, 1);
      case 'flowers': {
        const phase = ((t - 0.1) / 0.17) % 1;
        return { pose: t < 0.1 ? style.T[0] : mixPose(style.T[0], style.T[1], Math.sin(Math.max(0, phase) * Math.PI)), blend: 60 };
      }
      case 'charge':
        return stroke('T', 0.35, 0.48, 0.67, 0.9, 0.17);
      case 'stepCut':
        return stroke('R', 0.26, 0.38, 0.61, 0.84, 0.12);
      case 'boar':
        return stroke('T', 0.46, 0.6, 0.83, 1, 0.15);
      case 'bull':
      case 'counter':
        return { pose: style.guard.T, blend: 30, lean: act.id === 'bull' ? 0.3 : 0 };
      // Weapon arts.
      case 'finisher':
        return stroke('T', 0.16, 0.28, 0.47, 0.67, 0.17);
      case 'shieldSlam':
        return { pose: style.guard.T, blend: 30, lean: 0.35 * k(0, 0.18) - 0.2 * k(0.3, 0.55) };
      case 'axeSmash':
      case 'poleAxeSmash':
        return stroke('R', 0.4, 0.55, 0.81, 1.03, 0.16);
      case 'shout':
        return { pose: P([-0.42, 0.1, 0.18], [-0.2, 0.9, 0.3], { n: -0.2, t: 0.1 }), blend: 12, shout: k(0.2, 0.5) };
      case 'mist':
        return { pose: style.ready, blend: 12, throwLeft: k(0.1, 0.35) };
      default:
        return null;
    }
  }

  function arrange(man, game, dt) {
    // ---- locomotion ---------------------------------------------------------------------------------------
    const f = man.face;
    const vFwd = man.vx * Math.sin(f) + man.vz * Math.cos(f),
      vLeft = man.vx * Math.cos(f) - man.vz * Math.sin(f);
    const speed = Math.hypot(vFwd, vLeft);
    const recoil = impactWeight(state.impactAge, state.impactPower) * (state.impactKind === 'hit' ? 1 : 0.37);
    const fallen = man.stun > 0 && (man.stunKind === 'down' || man.stunKind === 'thrown');
    const stunned = fallen || man.stun > 0 && man.stunKind === 'flinch';
    state.down += ((fallen ? 1 : 0) - state.down) * (1 - Math.exp(-dt * (fallen ? 18 : 7)));
    const movement = clamp((speed - 0.15) / 0.5, 0, 1);
    const moving = movement * (1 - state.ride) * (man.alive && !stunned ? 1 : 0.16);
    const fwdW = Math.max(0, vFwd) / (speed || 1),
      backW = Math.max(0, -vFwd) / (speed || 1),
      leftW = Math.max(0, vLeft) / (speed || 1),
      rightW = Math.max(0, -vLeft) / (speed || 1);
    const runW = clamp((speed - 1.7) / 1.6, 0, 1);
    // One phase for all the gaits, run at the pace of the strongest.
    const natural = fwdW * (runW * 3.1 + (1 - runW) * 1.33) + backW * 0.9 + (leftW + rightW) * 1.1;
    const cycle = fwdW * (runW * motion.duration('run') + (1 - runW) * motion.duration('walk')) + backW * motion.duration('back') + (leftW + rightW) * motion.duration('sideA');
    state.phase = (state.phase + (dt * (speed / Math.max(0.3, natural))) / Math.max(0.3, cycle || 1)) % 1;
    const ph = state.phase;
    const sampleAt = (name, out) => motion.sample(name, ph * motion.duration(name), out);
    motion.sample('idle', (game.time * 0.9 + man.id.length) % motion.duration('idle'), base);
    if (moving > 0) {
      const gaits = [
        ['walk', fwdW * (1 - runW)],
        ['run', fwdW * runW],
        ['back', backW],
        ['sideB', leftW],
        ['sideA', rightW]
      ].filter(([, w]) => w > 0.02);
      let acc = 0;
      for (const [name, w] of gaits) {
        if (acc === 0) sampleAt(name, gait);
        else {
          sampleAt(name, layer);
          motion.blend(gait, layer, w / (acc + w));
        }
        acc += w;
      }
      if (acc > 0) motion.blend(base, gait, moving);
    }
    animator.apply(base);
    rig.forget();
    // In the saddle: thighs forward and apart round the horse's barrel, the lower legs hanging.
    if (state.ride > 0) {
      const k = ease(state.ride);
      for (const [side, sign] of [['l', 1], ['r', -1]]) {
        rig.bend('thigh_' + side, 0, -1.15 * k);
        rig.bend('thigh_' + side, 0, 0, 0.5 * sign * k);
        rig.bend('calf_' + side, 0, 1.05 * k);
        rig.bend('foot_' + side, 0, -0.25 * k);
      }
      rig.forget();
    }

    // ---- the upper body: twist, lean, arms ----------------------------------------------------------------
    const { pose: want, blend, spin = 0, lean = 0, shout = 0, throwLeft = 0 } = actionPose(man, dt);
    const k = 1 - Math.exp(-dt * blend);
    state.pose = mixPose(state.pose, want, blend >= 60 ? 1 : k);
    const p = state.pose;
    state.spin = spin;

    // Hips: lead the turn through a loaded stance. Recoil travels from shoulders through knees.
    const pelvis = rig.bone('pelvis');
    const hp = Array.from(pelvis.position);
    const parentR = rig.world('root').r;
    const [knockX, knockZ] = man.knock ?? [0, 0];
    const incoming = state.impactBearing ?? (Math.hypot(knockX, knockZ) > 0.02 ? Math.atan2(knockX, knockZ) : f + Math.PI);
    const relative = incoming - f;
    const sideways = Math.sin(relative) * recoil;
    const back = Math.cos(relative) * recoil;
    const feet = (1 - state.ride) * (man.act?.air > 0 ? 0 : 1) * (1 - moving * 0.65);
    const buckle = ease(state.fall / 0.27) * (1 - ease((state.fall - 0.44) / 0.4));
    const stride = 1 - state.ride * 0.72;
    const dip = p.d * stride + feet * (0.042 * recoil + 0.12 * buckle + 0.13 * state.down);
    const shift = mul(rig.dirToRig([sideways * 0.045 * feet, -dip, p.f * 0.6 * stride + back * 0.065 * feet]), 1 / s);
    const pel = add(hp, qrot(qinv(parentR), shift));
    pelvis.setPosition(pel[0], pel[1], pel[2]);
    rig.forget();

    const twist = p.t + state.turnOnHorse - sideways * 0.21;
    const leanAll = p.n + lean + back * 0.42 - shout * 0.15 + 0.17 * buckle;
    const hipTwist = p.t * feet * 0.36;
    const shoulderTwist = twist - hipTwist;
    rig.bend('pelvis', hipTwist, 0, -sideways * 0.08 * feet);
    if (feet > 0.05 && man.act?.kind !== 'kick') {
      const brace = feet * (p.d * 2 + Math.abs(p.f) * 0.33 + 0.19 * recoil + 0.56 * buckle + 0.5 * state.down);
      for (const side of ['l', 'r']) {
        rig.bend('thigh_' + side, 0, -brace * 0.7);
        rig.bend('calf_' + side, 0, brace * 1.25);
        rig.bend('foot_' + side, 0, -brace * 0.54);
      }
    }
    rig.bend('spine_01', shoulderTwist * 0.25, leanAll * 0.3, -sideways * 0.1);
    rig.bend('spine_03', shoulderTwist * 0.35, leanAll * 0.35, -sideways * 0.18);
    rig.bend('spine_05', shoulderTwist * 0.3, leanAll * 0.25, -sideways * 0.08);
    // The head keeps looking ahead.
    rig.bend('neck_01', -twist * 0.7, -leanAll * 0.6 - shout * 0.3);

    // Body frame for the arms: the chest turned by the twist.
    const twistQ = axisAngle([0, 1, 0], twist);
    const chestNow = rig.toBody(lerp3(rig.world('upperarm_r').t, rig.world('upperarm_l').t, 0.5));
    const place = (rel) => rig.toRig(add(chestNow, qrot(twistQ, mul(rel, reachK))));
    const along = (d) => rig.dirToRig(qrot(twistQ, d));

    // Right arm: the weapon hand.
    const poleR = rig.dirToRig(qrot(twistQ, [-0.6, -0.8, -0.2]));
    if (bow) armsForBow(man, dt, twistQ, place, along);
    else rig.reachArm('r', place(p.r), poleR, along(p.b));
    rig.closeHand('r', 1);

    // Left arm: on the same weapon (two-handed), the shield, or free.
    if (arms.two) {
      const blade = weaponDir(main, [0, 1, 0]);
      const edge = weaponDir(main, [0, 0, 1]);
      const face = mul(edge, -1);
      const gripTurn = qmul(basis(blade, face, cross(blade, face)), leftGripFrame);
      const gripOffset = qrot(gripTurn, rig.hands.l.grip);
      const wrist = () => sub(weaponPoint(main, main.second), gripOffset);
      const reachLimit = (rig.reach.l.upper + rig.reach.l.lower) * 0.985;
      const reachToGrip = sub(wrist(), rig.world('upperarm_l').t);
      const distance = len(reachToGrip);
      // A locked second hand limits the first hand's travel before it moves the weapon out of reach.
      if (distance > reachLimit) {
        const correction = mul(reachToGrip, (reachLimit - distance) / distance);
        rig.reachArm('r', add(rig.world('hand_r').t, correction), poleR, blade, 1, 0, edge);
      }
      rig.reachArm('l', wrist(), rig.dirToRig(qrot(twistQ, [0.7, -0.7, -0.1])), blade, 1, 0, face);
      rig.closeHand('l', 1);
    } else if (offhand) {
      const up = man.guard || man.act?.id === 'counter' || man.act?.id === 'bull' || man.act?.id === 'shieldSlam';
      const gl = man.guardLine;
      const spot = !up ? [0.2, -0.2, 0.3] : gl === 'O' ? [0.08, 0.27, 0.34] : gl === 'R' ? [-0.12, -0.02, 0.4] : gl === 'T' ? [0.02, -0.15, 0.44] : [0.19, -0.04, 0.4];
      const face = !up ? [0.3, 0.1, 1] : gl === 'O' ? [0, 0.7, 0.7] : gl === 'R' ? [-0.35, 0.05, 1] : gl === 'T' ? [0.02, -0.2, 1] : [0.2, 0.05, 1];
      state.lpose = state.lpose ? lerp3(state.lpose, spot, 1 - Math.exp(-dt * 22)) : spot;
      // The shield's face along the knuckles: reach with the hand's grip axis upright and the fingers forward.
      rig.reachArm('l', place(state.lpose), rig.dirToRig(qrot(twistQ, [0.8, -0.6, -0.1])), along([0, 1, 0]), 1, 0, along(face));
      rig.closeHand('l', 1);
    } else if (!bow) {
      const free = throwLeft > 0 ? lerp3([0.12, -0.05, 0.2], [0.15, 0.05, 0.62], easeOut(throwLeft)) : shout > 0 ? [0.45, 0.08, 0.18] : regiment === 'tiger' ? [0.16, -0.12, 0.22] : [0.24, -0.42, 0.1];
      rig.reachArm('l', place(free), rig.dirToRig([0.8, -0.6, -0.2]), regiment === 'tiger' && !throwLeft ? along([0.2, 0.8, 0.4]) : null, 0.85);
      rig.closeHand('l', regiment === 'tiger' && !throwLeft ? 0.55 : 0.4);
    }

    // ---- the kick ---------------------------------------------------------------------------------------------
    if (man.act?.kind === 'kick') {
      const t = man.act.t;
      const lift = t < 0.24 ? easeOut(t / 0.24) : t < 0.34 ? 1 : 1 - ease((t - 0.34) / 0.24);
      const extend = t < 0.18 ? 0 : t < 0.3 ? easeOut((t - 0.18) / 0.12) : 1 - ease((t - 0.3) / 0.2);
      rig.bend('thigh_r', 0, -1.55 * lift);
      rig.bend('calf_r', 0, 1.7 * lift * (1 - extend));
      rig.bend('spine_01', 0, -0.25 * lift);
    }
    let floorLift = 0;
    const combat = man.guard || ['swing', 'skill', 'kick'].includes(man.act?.kind) || p.d > 0.004 || recoil > 0.001;
    if (combat && man.alive && !man.mounted && !state.ride && !(man.act?.air > 0) && state.down < 0.02) {
      // Ball bones track the shoe's contact surface more closely than the ankle pivots.
      const support = Math.min(rig.toBody(rig.world('ball_l').t)[1], rig.toBody(rig.world('ball_r').t)[1]);
      floorLift = clamp(-support, 0, 0.075);
    }
    return { spin, floorLift };
  }

  function armsForBow(man, dt, twistQ, place, along) {
    const drawing = man.draw ? clamp(man.draw.t / man.r.bow.draw, 0, 1) : 0;
    const shooting = man.act?.kind === 'skill' && ['gale', 'fan', 'backStep', 'blast', 'web', 'volley'].includes(man.act.id);
    const aiming = Boolean(man.draw || shooting);
    state.drawBlend += ((aiming ? 1 : 0) - state.drawBlend) * (1 - Math.exp(-dt * 14));
    state.bowPull += ((shooting ? 0.9 : drawing) - state.bowPull) * (1 - Math.exp(-dt * 26));
    const up = state.drawBlend;
    if (man.knife) {
      main.node.visible = true;
      bow.node.visible = false;
      rig.reachArm('r', place(state.pose.r), rig.dirToRig([-0.6, -0.8, -0.2]), along(state.pose.b));
      for (const st of strings) st.mesh.visible = false;
      nocked.node.visible = false;
      rig.reachArm('l', place([0.24, -0.42, 0.1]), rig.dirToRig([0.8, -0.6, -0.2]), null, 0.8);
      return;
    }
    main.node.visible = false;
    bow.node.visible = true;
    // The bow arm reaches toward the aim; the string hand comes back to the jaw as he draws.
    const aimYaw = wrap((man.aim?.yaw ?? man.face) - man.face);
    const aim = [Math.sin(aimYaw), 0.05, Math.cos(aimYaw)];
    const bowHand = lerp3([0.12, -0.24, 0.34], add([0.18, 0.02, 0], mul(aim, 0.6)), up);
    rig.reachArm('l', place(bowHand), rig.dirToRig([0.7, -0.7, -0.2]), along(lerp3([0.25, 0.9, 0.25], [0.12, 1, -0.05], up)));
    rig.closeHand('l', 1);
    const gripL = weaponPoint(bow, [0, 0, -0.02]);
    const anchor = place([-0.06, 0.2, 0.06]);
    const stringHand = up > 0.05 ? lerp3(add(gripL, rig.dirToRig([0, 0, -0.06 / s])), anchor, state.bowPull) : place([-0.16, -0.28, 0.26]);
    rig.reachArm('r', stringHand, rig.dirToRig([-0.7, -0.4, -0.6]), along([0.1, 1, 0]));
    rig.closeHand('r', 0.75);
    // The string: tip, hand (when drawn), tip.
    const top = weaponPoint(bow, bow.nocks[0]),
      bottom = weaponPoint(bow, bow.nocks[1]);
    const toHolder = (p) => rig.toBody(p);
    const nock = aiming && up > 0.05 ? rig.world('hand_r').t : lerp3(top, bottom, 0.5);
    strings[0].span(toHolder(top), toHolder(nock));
    strings[1].span(toHolder(nock), toHolder(bottom));
    for (const st of strings) st.mesh.visible = true;
    // The arrow on the string, pointing at the bow.
    nocked.node.visible = aiming && up > 0.3;
    if (nocked.node.visible) {
      const from = toHolder(nock),
        to = toHolder(gripL);
      const dir = unit(sub(to, from));
      const q = basis(unit(cross([0, 1, 0], dir)), dir, unit(cross(unit(cross([0, 1, 0], dir)), dir)));
      nocked.node.setQuaternion(q[0], q[1], q[2], q[3]);
      const at = add(from, mul(dir, 0.72));
      nocked.node.setPosition(at[0], at[1], at[2]);
    }
  }

  const figure = {
    holder,
    regiment,
    held,
    rig,
    /** Follow the man for one frame. */
    update(man, game, dt, { seat = null } = {}) {
      if (!man.alive) {
        if (state.fall === 0 && state.impactBearing === null) state.impactBearing = man.face + Math.PI;
        state.fall = Math.min(1, state.fall + dt * 1.6);
      }
      state.impactAge += dt;
      // How far into the saddle: getting on and off take their time; thrown, he is out of it at once.
      const R = man.r?.horse;
      let ride = man.mounted ? 1 : 0;
      if (man.act?.kind === 'mount' && R) ride = clamp(man.act.t / R.mount, 0, 1);
      if (man.act?.kind === 'dismount' && R) ride = 1 - clamp(man.act.t / R.dismount, 0, 1);
      if (!seat || !man.alive) ride = 0;
      state.ride = ride;
      const horseYaw = man.horse?.face ?? man.face;
      state.turnOnHorse = ride > 0 ? clamp(wrap(man.face - horseYaw), -1.25, 1.25) * ease(ride) : 0;
      let spin = 0, floorLift = 0;
      if (state.fall < 1) ({ spin, floorLift } = arrange(man, game, dt));
      const air = man.act?.air ?? 0;
      const fallTilt = 1.45 * ease((state.fall - 0.19) / 0.68) + 0.76 * ease(state.down);
      const landing = state.fall === 0 ? 0 : 0.045 * Math.sin(Math.PI * clamp((state.fall - 0.27) / 0.66, 0, 1));
      const fallAngle = (state.impactBearing ?? man.face + Math.PI) - man.face;
      let at = [man.x, air + landing + floorLift, man.z];
      let yaw = man.face + spin,
        sway = 0;
      if (ride > 0) {
        // Hips on the seat, facing the way the horse goes; his chest turns on its own (above). He sways with the horse.
        const k = ease(ride);
        const sat = [seat.at[0], seat.at[1] + 0.06 - hipY, seat.at[2]];
        at = lerp3(at, sat, k);
        yaw = horseYaw + wrap(man.face - horseYaw) * (1 - k);
        sway = -(seat.rear * 0.55 + seat.lean * 0.6) * k;
      }
      holder.setPosition(at[0], at[1], at[2]);
      const tipAxis = [Math.cos(fallAngle), 0, -Math.sin(fallAngle)];
      const tilt = axisAngle(tipAxis, Math.min(1.45, fallTilt) * (1 - ride));
      const q = qmul(qmul(axisAngle([0, 1, 0], yaw), axisAngle([1, 0, 0], sway)), tilt);
      holder.setQuaternion(q[0], q[1], q[2], q[3]);
    },
    /** Where his eyes are, in the world (for the first-person view). */
    eye() {
      const head = rig.bone('head');
      return head ? Array.from(head.localToWorld([0, 0, 0], [0, 0, 0])).map((v, i) => (i === 1 ? v + 0.09 : v)) : null;
    },
    /** A blow landed on him: sway away from where it came from. */
    struck(heavy = 0, bearing, kind = 'hit') {
      state.impactAge = 0;
      state.impactPower = clamp(heavy, 0, 1);
      state.impactBearing = Number.isFinite(bearing) ? bearing : null;
      state.impactKind = kind;
    },
    /** Where the blade's base and tip are, in world space (for trails and sparks). */
    blade() {
      const w = bow && !held.knife?.node.visible ? null : main;
      if (!w || !w.node.visible) return null;
      const node = w.node;
      const base = node.localToWorld([0, 0, 0], [0, w.length * 0.35, 0]);
      const tip = node.localToWorld([0, 0, 0], [0, w.length, 0]);
      return [Array.from(base), Array.from(tip)];
    },
    dispose() {
      holder.removeFromParent();
      body.dispose?.();
    }
  };
  return figure;
}
