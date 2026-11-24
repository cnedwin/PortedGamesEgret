// One man on the field as the picture shows him: his body (a rigged, generated model), captured locomotion
// blended by how he moves, and over it his arms placed by reach along the line of the blow he is giving or the
// guard he holds, his weapon in his hand, a kick, a stagger, a fall. It reads the fight's state of the man each
// frame; it never changes the fight.
import { Mesh3D, Object3D, createCylinderGeometry3D, createStandardMaterial3D } from '@egret/engine/world3d';
import { ARMS, createWeapon } from './weapons.mjs';
import { add, axisAngle, basis, cross, dot, fitLinkedGrip, gripRotation, len, lerp3, mul, qinv, qmul, qrot, stabilizeBladeRoll, sub, unit } from './rig.mjs';
import { createRig } from './rig.mjs';
import { createAnimator, heavyFootwork, impactWeight, interpolateDirection, returnSpearPhase, swingPhase, TIGER_SWORD } from './motion.mjs';
import { createFooting } from './footing.mjs';
import { bowLoosePose, bowReleasePose } from './bow-release.mjs';
import { ordinaryCuts } from './ordinary-poses.mjs';
import { ARTS, SKILLS } from '../sim/regiments.mjs';
import { telegraphPoseTime } from '../sim/combat-tells.mjs';

const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const easeOut = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - (1 - t) ** 3);
const easeIn = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * t);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

const THROW_FLOOR = [
  ['head', 0.13], ['spine_03', 0.13], ['pelvis', 0.11],
  ['lowerarm_l', 0.055], ['lowerarm_r', 0.055], ['hand_l', 0.04], ['hand_r', 0.04],
  ['calf_l', 0.065], ['calf_r', 0.065], ['ball_l', 0.028], ['ball_r', 0.028]
];

// Hand places, relative to the middle of the shoulders, in metres (+X his left, +Y up, +Z forward) and the way the
// blade points. `t` twists the chest about the spine (+ to his left), `n` leans him forward, `d` drops the hips,
// `f` moves them forward.
const P = (r, b, extra = {}) => ({ r, b, t: 0, n: 0, d: 0, f: 0, ...extra });
const THROWN_JI = P([-0.19, -0.16, 0.32], [0, 0.12, 1], { t: -0.1 });
// Keep the held ji clear of the saddle on the right, then bring the head
// across and down. Hand and shaft targets are first authored in rider space.
function saddleCutKey(hand, direction, body, bodySpaceHand = true) {
  const unwind = axisAngle([0, 1, 0], -body.t);
  return P(bodySpaceHand ? qrot(unwind, hand) : hand, qrot(unwind, direction), body);
}
const SADDLE_RIGHT_CUT = [
  saddleCutKey([-0.30, -0.065, 0.27], [-0.98, 0.16, 0.12], { t: -0.42, n: -0.05 }),
  saddleCutKey([-0.22, -0.10, 0.39], [0.11, -0.22, 1], { t: 0.17, n: 0.16, f: 0.065 }),
  saddleCutKey([0.015, -0.22, 0.28], [0.91, -0.26, 0.38], { t: 0.39, n: 0.14 })
];
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
const AXE = {
  ...TWO,
  ready: P([-0.12, -0.17, 0.32], [0.31, 0.86, 0.4], { t: -0.06, d: 0.016 }),
  O: [
    P([-0.24, 0.28, -0.12], [-0.48, 0.33, -0.81], { t: -0.48, n: -0.1 }),
    P([-0.04, -0.12, 0.49], [0.1, -0.26, 0.96], { t: 0.17, n: 0.22, d: 0.055, f: 0.07 }),
    P([0.16, -0.37, 0.38], [0.22, -0.85, 0.48], { t: 0.24, n: 0.24, d: 0.075 })
  ],
  T: [
    P([-0.31, -0.28, -0.1], [-0.13, 0.13, 1], { t: -0.45 }),
    P([-0.12, -0.16, 0.51], [-0.03, 0.015, 1], { t: 0.12, n: 0.15, f: 0.11 }),
    P([-0.16, -0.18, 0.36], [0.04, 0.07, 1], { t: 0.09, n: 0.12, f: 0.06 })
  ]
};
const STYLE = { sabre: ONE, jian: ONE, knife: ONE, zhanma: TWO, axe: AXE, spear: SPEAR, ji: SPEAR };
const CUT_EDGE = { R: [1, -0.12, 0], L: [-1, -0.12, 0], O: [0, -1, 0] };
const CUT_ELBOW = { R: [-0.82, -0.55, -0.24], L: [0.68, -0.5, -0.2], O: [-0.36, 0.84, -0.22] };
const REST_ELBOW = [-0.6, -0.8, -0.2];
const SWING_ARM_RANGE = [0.39, 0.965];
const SHIELD_GUARD = {
  O: [[0.08, 0.27, 0.34], [0, 0.7, 0.7]],
  R: [[-0.12, -0.02, 0.4], [-0.35, 0.05, 1]],
  T: [[0.02, -0.15, 0.44], [0.02, -0.2, 1]],
  L: [[0.19, -0.04, 0.4], [0.2, 0.05, 1]]
};

/** Left, high and thrust cuts retain their tested clearance from the horse. */
function saddleCuts(foot) {
  const key = (hand, blade, body) => saddleCutKey(hand, blade, body, false);
  return {
    R: SADDLE_RIGHT_CUT,
    L: [
      key([-0.055, 0.035, 0.21], [0.76, 0.38, 0.48], { t: 0.31, n: -0.04 }),
      foot.L[1],
      key([-0.315, -0.23, 0.23], [-0.83, -0.25, 0.47], { t: -0.32, n: 0.12 })
    ],
    O: [
      key([-0.22, 0.31, 0.14], [0.06, 0.91, -0.4], { t: -0.13, n: -0.1 }),
      foot.O[1],
      key([-0.22, -0.23, 0.29], [0.11, -0.59, 0.84], { t: 0.09, n: 0.22, d: 0.034 })
    ],
    T: [
      key([-0.27, -0.24, 0.12], [0.1, 0.12, 1], { t: -0.23, n: -0.015 }),
      foot.T[1],
      key([-0.31, -0.21, 0.26], [0.11, 0.045, 1], { t: 0.01, n: 0.07, f: 0.045 })
    ]
  };
}

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
function createStrand(material, radius = 0.0028) {
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
  const plant = createFooting(rig);

  // Body landmarks at rest, in body space.
  const hipY = rig.toBody(rig.world('pelvis').t)[1];
  const armLength = rig.reach.r.upper * s + rig.reach.r.lower * s;
  // Hand places were written for a man of about 1.8 m; scale them to his arms.
  const reachK = armLength / 0.56;

  // ---- weapons in hand ------------------------------------------------------------------------------------
  const arms = ARMS[regiment];
  const held = {};
  function attach(kind, side, mapping = 'blade') {
    const weapon = createWeapon(kind);
    const hand = rig.hands[side];
    const handNode = rig.bone('hand_' + side);
    const node = weapon.node;
    // Weapon +Y along the hand's grip axis, its edge (+Z) toward the knuckles; a shield's face (+Y) toward the knuckles.
    const along = hand.along,
      fingers = hand.fingers;
    const q = mapping === 'shield' ? basis(along, fingers, cross(along, fingers)) : basis(cross(along, fingers), along, fingers);
    if (kind === 'jian') {
      // This model's palm faces the opposite side of the generic rest-hand estimate.
      // Seat the handle between the curled middle joints and the thumb, just below the guard.
      hand.grip = add(hand.grip, qrot(q, mul([-0.025, 0, 0.030], 1 / s)));
    }
    node.setQuaternion(q[0], q[1], q[2], q[3]);
    const g = weapon.grip ? sub(hand.grip, qrot(q, mul(weapon.grip, 1 / s))) : hand.grip;
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
    stringMaterial ??= createStandardMaterial3D({ color: 0xf3dca7, roughness: 0.74 });
    strings = [createStrand(stringMaterial, 0.0023), createStrand(stringMaterial, 0.0023)];
    for (const [index, st] of strings.entries()) {
      st.mesh.name = index === 0 ? 'bowstring-upper' : 'bowstring-lower';
      holder.addChild(st.mesh);
    }
    nocked = createWeapon('arrow');
    holder.addChild(nocked.node);
  }

  /** The rig-space place and turn of a point in a held weapon's frame. */
  function weaponPoint(w, local) {
    const hw = rig.world('hand_' + w.side);
    return add(hw.t, qrot(hw.r, add(w.g, qrot(w.q, mul(local, 1 / s)))));
  }
  function armSpace() {
    const right = rig.world('upperarm_r').t, left = rig.world('upperarm_l').t;
    const centre = lerp3(right, left, 0.5);
    const span = sub(left, right);
    const across = unit(span);
    const trunk = sub(centre, rig.world('pelvis').t);
    const forward = unit(cross(across, trunk));
    const up = cross(forward, across);
    return { left, right, across, forward, up, centre, rise: dot(trunk, up), halfWidth: len(span) * 0.5 };
  }

  function armClearance(space, side) {
    const outward = side === 'l' ? space.across : mul(space.across, -1);
    const shoulderOut = unit(add(mul(outward, 0.70), mul(space.forward, 0.72)));
    return { outward, side: dot(space.centre, outward) + space.halfWidth * 0.91,
      forward: space.forward, front: dot(space.centre, space.forward) + 0.127 / s,
      shoulderOut, shoulderSide: dot(space[side === 'l' ? 'left' : 'right'], shoulderOut) - 0.032 / s };
  }

  const armRadius = (side) => (rig.reach[side].upper + rig.reach[side].lower) * 0.98;

  function frontWrist(goal, shoulder, side, space) {
    const { forward, centre } = space;
    const radius = armRadius(side);
    const front = dot(centre, forward) + 0.14 / s;
    return fitLinkedGrip(goal, shoulder, radius, shoulder, radius, forward, front) ?? goal;
  }

  // Keep the haft outside a padded chest where the arms can reach a clear pose.
  // A separating plane constrains both ends while the same reach solve seats both hands.
  function avoidTorso(wrist, palm, blade, space, project) {
    const { across, up, forward, centre, rise, halfWidth } = space;
    const torso = add(add(centre, mul(up, -0.46 * rise)), mul(forward, 0.01 / s));
    const radius = [halfWidth * 0.82 + 0.022 / s, rise * 0.51 + 0.022 / s, 0.14 / s];
    const axes = [across, up, forward];
    const grip = sub(add(wrist, palm), torso);
    const gripY = main.grip?.[1] ?? 0;
    const origin = sub(grip, mul(blade, gripY / s));
    const scaled = (v) => axes.map((a, i) => dot(v, a) / radius[i]);
    const point = scaled(origin), direction = scaled(blade);
    const nearest = clamp(-dot(point, direction) / dot(direction, direction), main.butt / s, main.length / s);
    const radial = add(point, mul(direction, nearest));
    if (dot(radial, radial) >= 1) return { wrist, normal: null };

    const previous = state.shaftSide;
    const natural = axes.reduce((sum, a, i) => add(sum, mul(a, radial[i] / radius[i])), [0, 0, 0]);
    const guides = [forward, mul(across, -1), across, sub(forward, across), add(forward, across), up];
    if (previous) guides.unshift(previous);
    const normals = [natural, ...guides.map((a) => sub(a, mul(blade, dot(a, blade))))];
    let best = { wrist, normal: null }, cost = Infinity;
    for (const separation of normals) {
      if (len(separation) < 1e-6) continue;
      const normal = unit(separation);
      const thickness = Math.hypot(...axes.map((a, i) => dot(a, normal) * radius[i]));
      const shaftDepth = dot(blade, normal) / s;
      const nearestEnd = Math.min(shaftDepth * (main.butt - gripY), shaftDepth * (main.length - gripY));
      const corrected = project({ normal, bound: dot(sub(torso, palm), normal) + thickness - nearestEnd });
      if (!corrected) continue;
      const travel = len(sub(corrected, wrist)) + (previous ? (1 - dot(previous, normal)) * 0.045 / s : 0);
      if (travel >= cost) continue;
      best = { wrist: corrected, normal };
      cost = travel;
    }
    return best;
  }

  // The weapon and both grips move together. The second wrist is derived from the actual grip
  // offset, including palm orientation, before either arm is posed.
  function twoHandedPose(goal, blade, edgeHint, rightPole, leftPole, space, dt) {
    const { forward, centre, right, left, across } = space;
    const rRadius = armRadius('r'), lRadius = armRadius('l');
    const reachRange = [0, 0.98];
    const front = dot(centre, forward) + 0.14 / s;
    const middle = dot(centre, across);
    const crossover = 0.09 / s;
    const shaft = (main.second[1] - (main.grip?.[1] ?? 0)) / s;
    const edge = stabilizeBladeRoll(blade, edgeHint ?? sub(goal, right), state.primaryGrip, 9 * dt);
    let solution;

    function fit(axis) {
      const rolled = stabilizeBladeRoll(axis, edge, { axis: blade, edge }, 0);
      const palmR = qrot(gripRotation(rig.hands.r, axis, rolled), rig.hands.r.grip);
      const palmL = qrot(gripRotation(rig.hands.l, axis, mul(rolled, -1)), rig.hands.l.grip);
      const offset = add(mul(axis, shaft), sub(palmR, palmL));
      const clearance = front + Math.max(0, -dot(palmR, forward),
        -dot(offset, forward), -dot(add(offset, palmL), forward));
      // In a cross-body cut let the wrists pass each other in front, while sharing
      // the travel so neither arm reaches all the way around the opposite shoulder.
      const x = dot(goal, across);
      const minX = middle - crossover - dot(offset, across);
      const maxX = middle + crossover;
      const balanced = minX <= maxX ? clamp(x, minX, maxX) : (minX + maxX) * 0.5;
      const target = add(goal, mul(across, (balanced - x) * 0.72));
      const support = sub(left, offset);
      const project = (plane, aim = target) => fitLinkedGrip(aim, right, rRadius, support, lRadius, forward, clearance, plane);
      const wrist = project(null);
      if (!wrist) return false;
      const shaftPose = avoidTorso(wrist, palmR, axis, space, project);
      const requested = sub(shaftPose.wrist, wrist);
      const move = sub(requested, state.shaftShift);
      const maxStep = Math.min(dt, 1 / 30) * 2.3 / s;
      const shift = len(move) > maxStep ? add(state.shaftShift, mul(unit(move), maxStep)) : requested;
      // A change between the two sides of the body must not teleport the hands.
      const smoothWrist = project(null, add(wrist, shift)) ?? wrist;
      solution = { wrist: smoothWrist, shift, normal: shaftPose.normal, offset, axis, edge: rolled };
      return true;
    }

    if (!fit(blade)) {
      // Turn only as far toward the shoulder line as is needed for both hands to reach.
      const neutral = mul(across, Math.sign(shaft));
      if (fit(neutral)) {
        let lo = 0, hi = 1;
        for (let i = 0; i < 6; i++) {
          const at = (lo + hi) * 0.5;
          if (fit(interpolateDirection(blade, neutral, at))) hi = at;
          else lo = at;
        }
      }
    }
    if (!solution) return false;
    const { wrist, offset, axis, edge: axisEdge, normal, shift } = solution;
    state.shaftShift = shift;
    if (normal) state.shaftSide = normal;
    state.primaryGrip.axis = axis;
    state.primaryGrip.edge = axisEdge;
    rig.reachArm('r', wrist, rightPole, axis, 1, 0, axisEdge, null, 0, reachRange, armClearance(space, 'r'));
    rig.reachArm('l', add(wrist, offset), leftPole, axis, 1, 0, mul(axisEdge, -1), null, 0, reachRange, armClearance(space, 'l'));
    return true;
  }

  const base = motion.pose(),
    gait = motion.pose(),
    layer = motion.pose();
  const state = {
    phase: 0,
    primaryGrip: { axis: null, edge: null },
    shaftSide: null,
    shaftShift: [0, 0, 0],
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
    entryPose: null,
    spinBrace: 0,
    footing: [0, 0, 0],
    drawBlend: 0,
    bowPull: 0,
    wasDrawing: false,
    bowRelease: null,
    bowLaunch: null,
    // On horseback: how far into the saddle (0 standing, 1 seated), and how far his chest turns from the horse.
    ride: 0,
    turnOnHorse: 0,
    thrown: null,
    dismount: 0,
    dismountLand: 0
  };
  const style = STYLE[arms.main] ?? ONE;
  const cuts = ordinaryCuts(arms);
  const mountedCuts = arms.main === 'ji' ? saddleCuts(cuts) : null;
  const longAxe = arms.main === 'axe';

  /** The arm pose for this moment of his action, in shoulder-centred body space. */
  function actionPose(man, dt, contactTime) {
    const act = man.act;
    let pose = style.ready;
    let blend = 10; // how fast the arms follow (1/s); swings set the place exactly
    if (state.thrown && arms.main === 'ji') {
      return { pose: mixPose(style.ready, THROWN_JI, state.thrown.roll), blend: 26 };
    }
    if (man.guard && style.guard) {
      pose = style.guard[man.guardLine] ?? style.ready;
      blend = longAxe ? 36 : 26;
      if (state.spinBrace > 0) {
        return { pose: { ...pose, d: pose.d + 0.03, f: pose.f - 0.035 }, blend: 43, stance: [-0.028, -0.025, 0.022] };
      }
    }
    if (act?.kind === 'swing') {
      const visualAct = contactTime === null ? act : { ...act, t: contactTime };
      const phase = swingPhase(visualAct, arms.main, man.prev?.attack);
      const strikes = state.ride > 0 && mountedCuts ? mountedCuts : cuts;
      const keys = [style.ready, ...strikes[act.line], style.ready];
      const from = Math.min(3, Math.floor(phase));
      const pose = mixPose(keys[from], keys[from + 1], phase - from);
      // The front foot takes the load as the blade commits. Held attacks stay weighted on the back foot.
      const gather = phase < 1 ? phase : Math.max(0, 2 - phase);
      const carry = Math.max(0, 1 - Math.abs(phase - 2.45) / 1.25);
      const heft = arms.two ? 1 : 0.66;
      pose.d += heft * (0.033 * gather + 0.026 * carry);
      pose.f += heft * (-0.08 * gather + 0.075 * carry);
      return { pose, blend: 60, phase, line: act.line };
    }
    if (act?.kind === 'skill') return skillPose(man, act, contactTime ?? telegraphPoseTime(act)) ?? { pose, blend };
    if (act?.kind === 'lance') {
      // Lower the point past the horse's right shoulder, then lift it clear as the rider recovers.
      const { wind, last, recover, hitRecover } = ARTS.couch;
      const loaded = easeOut(telegraphPoseTime(act) / wind);
      const settle = act.metAt === undefined ? ease((act.t - wind - last) / recover) : ease((act.t - act.metAt) / hitRecover);
      const couch = P([-0.24, -0.3, 0.12], [-0.85, -0.05, 0.52], { t: -0.3, n: 0.1 });
      const check = act.metAt === undefined ? 0 : Math.sin(Math.PI * settle) * 0.09;
      const pose = mixPose(style.ready, couch, loaded * (1 - settle));
      pose.n += check;
      return { pose, blend: 60 };
    }
    if (act?.kind === 'kick') return { pose: style.ready, blend: 14 };
    if (longAxe && act?.kind === 'recover') blend = Math.max(blend, 34);
    return { pose, blend };
  }

  function skillPose(man, act, t) {
    const k = (a, b) => clamp((t - a) / (b - a), 0, 1);
    const pulse = (start, peak, hold, end) => ease(k(start, peak)) * (1 - ease(k(hold, end)));
    const swordPose = (keys) => {
      const poseAt = ([, line, which]) => line === 'ready' ? style.ready : style[line][which];
      for (let i = 1; i < keys.length; i++) {
        const next = keys[i], previous = keys[i - 1];
        if (t > next[0]) continue;
        const amount = k(previous[0], next[0]);
        return mixPose(poseAt(previous), poseAt(next), next[2] === 1 ? easeIn(amount) : ease(amount));
      }
      return style.ready;
    };
    function stroke(line, load, contact, follow, ready, lean = 0, start = 0) {
      const keys = style[line];
      const phase = t < load ? easeOut(k(start, load))
        : t < contact ? 1 + easeIn(k(load, contact))
          : t < follow ? 2 + easeOut(k(contact, follow)) : 3 + ease(k(follow, ready));
      const poses = [style.ready, ...keys, style.ready];
      const from = Math.min(3, Math.floor(phase));
      const pose = mixPose(poses[from], poses[from + 1], phase - from);
      return { pose, blend: 60, phase, line, lean: lean * (k(load, contact) - k(follow, ready)) };
    }
    switch (act.id) {
      case 'turning': {
        const cut = stroke('R', 0.15, 0.28, 0.43, 0.67);
        const plant = pulse(0.04, 0.14, 0.27, 0.43);
        return { ...cut, spin: ease(k(0.12, 0.46)) * Math.PI * 2, stance: [-0.055 * plant, 0.025 * plant, 0.04 * plant] };
      }
      case 'moon': {
        const cut = stroke('L', 0.095, 0.18, 0.34, 0.49);
        const turn = pulse(0.04, 0.18, 0.27, 0.48);
        cut.pose.t += 0.19 * turn;
        return { ...cut, stance: [0.07 * turn, 0.035 * turn, 0.018 * turn],
          shield: 0.55 * pulse(0, 0.09, 0.15, 0.33) };
      }
      case 'swing': {
        const weight = 0.6 * pulse(0.04, 0.18, 0.21, 0.3)
          - 0.56 * pulse(0.27, 0.38, 0.43, 0.49)
          + pulse(0.48, 0.58, 0.69, 0.84);
        return { pose: swordPose(TIGER_SWORD.chain), blend: 60,
          stance: [0.068 * weight, 0.05 * Math.abs(weight), 0.032 * Math.abs(weight)] };
      }
      case 'spin': {
        const turn = -0.2 * ease(k(0.03, 0.14)) + (Math.PI * 2 + 0.2) * easeOut(k(0.14, 0.43));
        const pose = { ...swordPose(TIGER_SWORD.spin) };
        const gather = pulse(0, 0.12, 0.15, 0.26), settle = pulse(0.3, 0.43, 0.48, 0.61);
        pose.d += 0.033 * gather + 0.049 * settle;
        return { pose, blend: 60, spin: turn,
          stance: [0.055 * (settle - gather), 0.026 * (settle - gather), 0.028 * settle] };
      }
      case 'whirl': {
        const count = SKILLS.whirl.hits;
        const part = clamp(Math.floor((t - 0.38) / 0.3) + 1, 0, count - 1);
        const contact = 0.25 + part * 0.3;
        const cut = stroke(part % 2 === 0 ? 'R' : 'L', contact - 0.055, contact,
          contact + 0.06, contact + (part === count - 1 ? 0.32 : 0.13), part ? 0.08 : 0, part ? contact - 0.17 : 0);
        const turning = k(0.12, 0.12 + count * 0.3);
        return { ...cut, spin: Math.PI * 2 * count * turning };
      }
      case 'wave': {
        const swing = stroke('R', 0.26, 0.38, 0.54, 0.7);
        const carry = pulse(0.28, 0.43, 0.5, 0.68);
        swing.pose.r = add(swing.pose.r, [0, 0.11 * carry, 0]);
        swing.pose.b = unit(add(swing.pose.b, [0, 0.32 * carry, 0]));
        return { ...swing, stance: [0.095 * carry, 0.038 * carry, 0.018 * carry] };
      }
      case 'down': {
        const chop = stroke('O', 0.57, 0.72, 0.95, 1.19);
        const load = pulse(0.04, 0.53, 0.61, 0.72);
        const sink = pulse(0.61, 0.75, 0.86, 1.16);
        chop.pose.r = add(chop.pose.r, [0, 0.075 * load - 0.08 * sink, 0.03 * sink]);
        chop.pose.n += 0.17 * sink - 0.065 * load;
        return { ...chop, stance: [-0.03 * load, 0.085 * sink - 0.045 * load, 0.052 * sink + 0.018 * load] };
      }
      case 'leap':
        return stroke('O', 0.42, 0.56, 0.78, 1.02);
      case 'drop':
        return stroke('O', 0.39, 0.52, 0.74, 1);
      case 'flowers': {
        const count = SKILLS.flowers.hits;
        const part = clamp(Math.floor((t - 0.23) / 0.17) + 1, 0, count - 1);
        const contact = 0.16 + part * 0.17;
        return stroke('T', contact - 0.048, contact, contact + 0.033,
          contact + (part === count - 1 ? 0.28 : 0.07), 0, part ? contact - 0.1 : 0);
      }
      case 'charge': {
        const thrust = stroke('T', 0.35, 0.48, 0.67, 0.9);
        const run = pulse(0, 0.12, 0.36, 0.53);
        const brace = pulse(0.33, 0.48, 0.54, 0.77);
        thrust.pose.n += 0.25 * run + 0.07 * brace;
        thrust.pose.d += 0.03 * run;
        return { ...thrust, stance: [-0.055 * brace, 0.065 * brace, 0.033 * brace],
          shield: pulse(0, 0.13, 0.42, 0.69) };
      }
      case 'stepCut':
        return stroke('R', 0.26, 0.38, 0.61, 0.84, 0.12);
      case 'returnSpear': {
        // The fight turns the whole character as his step lands. Layer the shaft and body load onto that turn.
        const side = -(act.stepSide ?? 1);
        const phase = returnSpearPhase(t);
        const index = Math.min(4, Math.floor(phase));
        const amount = phase - index;
        const poses = [
          style.ready,
          P([-0.33, -0.3, -0.025], [0.09 + 0.06 * side, 0.22, 1], { t: 0.14 * side, n: -0.06 }),
          P([-0.37, -0.27, -0.26], [0.085 + 0.06 * side, 0.09, 1], { t: -0.18 * side, n: -0.1 }),
          P([-0.34, -0.16, 0.405], [0, 0.035, 1], { n: 0.21, d: 0.016, f: 0.17 }),
          P([-0.34, -0.25, 0.075], [0.08 + 0.05 * side, 0.08, 1], { t: -0.1 * side, n: 0.02, f: 0.048 }),
          style.ready
        ];
        const stances = [
          [0, 0, 0], [0.065 * side, -0.045, 0.022], [0.035 * side, -0.058, 0.025],
          [-0.055 * side, 0.065, 0.033], [-0.024 * side, 0.032, 0.024], [0, 0, 0]
        ];
        return { pose: mixPose(poses[index], poses[index + 1], amount), blend: 60,
          stance: lerp3(stances[index], stances[index + 1], amount) };
      }
      case 'boar': {
        const thrust = stroke('T', 0.46, 0.6, 0.83, 1);
        const travel = pulse(0, 0.12, 0.37, 0.47);
        const hit = act.firstHitAt;
        const brace = hit === undefined ? 0 : pulse(hit - 0.025, hit + 0.03, hit + 0.065, hit + 0.16);
        const drive = pulse(0.47, 0.6, 0.67, 0.92);
        const pose = mixPose(thrust.pose, style.T[1], 0.48 * brace);
        pose.t -= 0.31 * travel;
        pose.n += 0.22 * travel + 0.16 * drive - 0.1 * brace;
        return { ...thrust, pose, stance: [-0.05 * travel + 0.065 * drive, 0.07 * drive, 0.037 * drive] };
      }
      case 'bull': {
        const { wind, run } = SKILLS.bull;
        const runEnd = wind + run;
        const end = Math.min(runEnd, act.metAt ?? runEnd);
        const load = ease(k(0, wind));
        const settle = 1 - ease(k(end, end + 0.28));
        const drive = act.metAt === undefined ? 0 : pulse(end - 0.02, end + 0.045, end + 0.065, end + 0.22);
        return { pose: mixPose(style.ready, style.guard.T, 0.9 * load * settle), blend: 48,
          lean: 0.22 * load * settle - 0.1 * drive, shield: load * settle, shieldDrive: drive };
      }
      case 'counter': {
        if (act.answeredAt === undefined) {
          const brace = pulse(0, 0.095, SKILLS.counter.hold, SKILLS.counter.hold + 0.24);
          return { pose: mixPose(style.ready, style.guard[man.guardLine] ?? style.guard.T, brace), blend: 45, shield: brace };
        }
        const elapsed = t - act.answeredAt;
        const strike = easeOut(elapsed / 0.055);
        const settle = ease((elapsed - 0.06) / 0.19);
        const direction = style.guard[man.guardLine] ?? style.guard.T;
        const pose = mixPose(mixPose(direction, style.T[1], strike), style.ready, settle);
        return { pose, blend: 52, shield: 1 - settle, shieldDrive: 0.65 * strike * (1 - settle) };
      }
      // Weapon arts.
      case 'finisher':
        return stroke('T', 0.16, 0.28, 0.47, 0.67, 0.17);
      case 'shieldSlam': {
        const brace = pulse(0, 0.115, 0.235, 0.55);
        const drive = pulse(0.11, 0.2, 0.27, 0.5);
        return { pose: mixPose(style.ready, style.guard.T, brace), blend: 48,
          lean: 0.27 * drive, shield: brace, shieldDrive: drive };
      }
      case 'axeSmash':
      case 'poleAxeSmash':
        return stroke('R', 0.4, 0.55, 0.81, 1.03, 0.16);
      case 'shout': {
        const breath = pulse(0.04, 0.42, 0.57, 0.87);
        const roar = pulse(0.38, 0.5, 0.61, 0.84);
        const raised = P([-0.42, 0.1, 0.18], [-0.2, 0.9, 0.3], { n: -0.2, t: 0.1 });
        return { pose: mixPose(style.ready, raised, breath), blend: 30, shout: roar };
      }
      case 'mist': {
        const cast = pulse(0.11, 0.32, 0.36, 0.59);
        const gather = pulse(0, 0.16, 0.21, 0.53);
        const pose = { ...style.ready, t: style.ready.t - 0.24 * gather + 0.18 * cast, n: 0.12 * cast };
        return { pose, blend: 29, throwLeft: cast };
      }
      default:
        return null;
    }
  }

  function arrange(man, game, dt, contactTime, mountedContact) {
    // ---- locomotion ---------------------------------------------------------------------------------------
    const f = man.face;
    const vFwd = man.vx * Math.sin(f) + man.vz * Math.cos(f),
      vLeft = man.vx * Math.cos(f) - man.vz * Math.sin(f);
    const speed = Math.hypot(vFwd, vLeft);
    const impact = impactWeight(state.impactAge, state.impactPower, state.impactKind);
    const caught = state.impactKind !== 'hit';
    const recoil = impact * (caught ? 0.23 : 1);
    const catchTravel = caught && man.guard ? impact : 0;
    const fallen = man.stun > 0 && (man.stunKind === 'down' || man.stunKind === 'thrown');
    const stunned = fallen || man.stun > 0 && (man.stunKind === 'flinch' || man.stunKind === 'break');
    const staggerWeight = state.thrown?.roll ?? Number(fallen);
    state.down += (staggerWeight - state.down) * (1 - Math.exp(-dt * (staggerWeight > state.down ? 18 : 7)));
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
      const thrown = state.thrown;
      if (thrown) {
        const tuck = ease(thrown.age / 0.075) * (1 - ease((thrown.age - 0.14) / 0.13));
        rig.bend('thigh_' + thrown.inside, 0, -1.12 * tuck);
        rig.bend('calf_' + thrown.inside, 0, 0.65 * tuck);
      }
      rig.forget();
    }

    // ---- the upper body: twist, lean, arms ----------------------------------------------------------------
    const { pose: want, blend, spin = 0, lean = 0, shout = 0, throwLeft = 0, phase = 0, line, stance, shield = 0,
      shieldDrive = 0 } = actionPose(man, dt, contactTime);
    const act = man.act;
    if (state.lastAct !== act) {
      const fromSpinGuard = state.spinBrace > 0 && act?.kind === 'skill' && act.id === 'swing';
      const returning = act?.kind === 'skill' && act.id === 'returnSpear';
      state.entryPose = longAxe || act?.kind === 'swing' || fromSpinGuard || returning ? state.pose : null;
    }
    state.lastAct = act;
    state.spinBrace = Math.max(0, state.spinBrace - dt);
    const poseTime = telegraphPoseTime(act);
    const entering = blend >= 60 && state.entryPose && act && poseTime < 0.09;
    const next = entering ? mixPose(state.entryPose, want, ease(poseTime / 0.09)) : want;
    const k = 1 - Math.exp(-dt * blend);
    state.pose = mixPose(state.pose, next, blend >= 60 ? 1 : k);
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
    const footing = stance ?? (longAxe ? heavyFootwork(phase, line) : [0, 0, 0]);
    state.footing = lerp3(state.footing, footing, 1 - Math.exp(-dt * 27));
    const [across, forward, settle] = state.footing;
    const dismountSink = ease((state.dismount - 0.72) / 0.28) + state.dismountLand;
    const dip = p.d * stride + feet * (settle + 0.048 * dismountSink + 0.042 * recoil + 0.12 * buckle + 0.13 * state.down);
    const shift = mul(rig.dirToRig([(across + sideways * 0.045) * feet, -dip, p.f * 0.6 * stride + (forward + back * 0.065) * feet]), 1 / s);
    const pel = add(hp, qrot(qinv(parentR), shift));
    pelvis.setPosition(pel[0], pel[1], pel[2]);
    rig.forget();

    const saddleCut = state.ride > 0 && arms.main === 'ji' && act?.kind === 'swing' && act.line === 'R';
    // The horse leads the chamber. Blend back to the normal aim by the contact pose.
    const aimWeight = saddleCut ? 1 - ease(phase) * (1 - ease(phase - 1)) : 1;
    const bowTurn = bow && !man.knife ? -0.46 * state.drawBlend : 0;
    const twist = p.t + bowTurn + state.turnOnHorse * aimWeight - sideways * 0.28;
    const leanAll = p.n + lean + back * 0.42 - shout * 0.15 + 0.17 * buckle;
    const hipTwist = p.t * feet * 0.36;
    const shoulderTwist = twist - hipTwist;
    rig.bend('pelvis', hipTwist, 0, -sideways * 0.08 * feet);
    if (feet > 0.05 && man.act?.kind !== 'kick') {
      const brace = feet * (p.d * 2 + Math.abs(p.f) * 0.33 + 0.18 * dismountSink + 0.19 * recoil + 0.56 * buckle + 0.5 * state.down);
      for (const [side, sign] of [['l', 1], ['r', -1]]) {
        const planted = Math.max(0, across * sign) * feet;
        const knee = brace + settle * feet * 1.25 + planted;
        rig.bend('thigh_' + side, 0, -knee * 0.7 - forward * feet * 0.9, -planted * sign * 0.8);
        rig.bend('calf_' + side, 0, knee * 1.25);
        rig.bend('foot_' + side, 0, -knee * 0.54);
      }
    }
    rig.bend('spine_01', shoulderTwist * 0.25, leanAll * 0.3, -sideways * 0.1);
    rig.bend('spine_03', shoulderTwist * 0.35, leanAll * 0.35, -sideways * 0.18);
    rig.bend('spine_05', shoulderTwist * 0.3, leanAll * 0.25, -sideways * 0.08);
    // The head keeps looking ahead.
    rig.bend('neck_01', -twist * 0.7 - sideways * 0.16, -leanAll * 0.6 + back * 0.23 - shout * 0.3, -sideways * 0.11);

    // Body frame for the arms: the chest turned by the twist.
    const twistQ = axisAngle([0, 1, 0], twist);
    const space = armSpace();
    const chestNow = rig.toBody(space.centre);
    const place = (rel) => rig.toRig(add(chestNow, qrot(twistQ, mul(rel, reachK))));
    const along = (d) => rig.dirToRig(qrot(twistQ, d));

    // Right arm: the weapon hand.
    const ordinary = act?.kind === 'swing';
    // The long ji rolls back to its neutral grip as soon as the left cut has passed the target.
    const resetJi = ordinary && arms.main === 'ji' && act.line === 'L';
    const edgeEnd = resetJi ? 2.05 : 2.78;
    const edge = ordinary && phase < edgeEnd && CUT_EDGE[act.line];
    const edgeHint = edge ? rig.dirToRig(edge) : null;
    const reachRange = ordinary ? SWING_ARM_RANGE : null;
    const shortChop = ordinary && arms.main === 'knife' && act.line === 'O';
    const elbow = ordinary && (shortChop ? [-0.67, 0.42, 0.14] : CUT_ELBOW[act.line]);
    // Lead a short blade with a shallow outside elbow as the hand rises.
    const overheadLoad = shortChop ? 0.49 : 0.98;
    const turnElbow = act?.line === 'O' ? ease((phase - overheadLoad) / (shortChop ? 0.8 : 0.6)) : ease(phase * 1.45);
    const releaseElbow = resetJi ? ease((phase - 2.5) / 0.61) : ease((phase - 3) / 0.9);
    const lead = turnElbow * (1 - releaseElbow);
    const poleR = along(elbow ? lerp3(REST_ELBOW, elbow, lead) : REST_ELBOW);
    const bareCatch = offhand ? 0 : catchTravel;
    const guardHand = bareCatch > 0 ? add(p.r, [0.07 * Math.sin(relative) * bareCatch, -0.034 * bareCatch, -0.14 * bareCatch]) : p.r;
    const mainTarget = place(guardHand);
    let blade = along(p.b);
    if (saddleCut && mountedContact && !act.awaitingRelease && phase > 1 && phase < 2.55) {
      // Keep the full side load. Guide the working edge only as the committed cut reaches its target.
      const follow = 1 - ease((phase - 2.05) / 0.5);
      const weight = ease((phase - 1) / 0.88) * follow;
      const toward = sub(mountedContact, mainTarget);
      if (len(toward) > 0.1 / s) blade = interpolateDirection(blade, unit(toward), weight);
    }
    const poleL = along([0.7, -0.7, -0.1]);
    const clearR = armClearance(space, 'r'), clearL = armClearance(space, 'l');
    if (ordinary && arms.main === 'jian' && act.line === 'L' && act.struck && phase > 2.8) {
      // After the edge leaves the cut, let the hand turn back with the rising sword instead of dragging the old roll.
      clearR.wristReturnRate = 9 + 18 * ease((phase - 2.8) / 0.58);
    }
    const linked = arms.two && twoHandedPose(mainTarget, blade, edgeHint, poleR, poleL, space, dt);
    if (bow) armsForBow(man, dt, place, along, edgeHint, reachRange, poleR, mainTarget, space, clearR);
    else if (!linked) rig.reachArm('r', frontWrist(mainTarget, space.right, 'r', space), poleR,
      blade, 1, 0, edgeHint, state.primaryGrip, dt, reachRange, clearR);
    if (arms.main === 'jian') rig.closeHand('r', -1.2, 1, 0.1);
    else if (!bow || man.knife) rig.closeHand('r', 1);

    // Left arm: on the same weapon (two-handed), the shield, or free.
    if (arms.two) {
      if (!linked) {
        // A rig with an unusable grip must still keep its free arm outside its torso.
        rig.reachArm('l', frontWrist(place([0.2, -0.2, 0.28]), space.left, 'l', space), poleL,
          null, 1, 0, null, null, 0, null, clearL);
      }
      rig.closeHand('l', 1);
    } else if (offhand) {
      const guard = SHIELD_GUARD[man.guardLine] ?? SHIELD_GUARD.T;
      const spot = man.guard ? guard[0] : lerp3([0.2, -0.2, 0.3], [0.13, 0.0, 0.48], shield);
      const face = man.guard ? guard[1] : lerp3([0.3, 0.1, 1], [0.04, -0.18, 1], shield);
      const press = add(spot, [0.06 * Math.sin(relative) * catchTravel, -0.065 * catchTravel, 0.18 * shieldDrive - 0.22 * catchTravel]);
      state.lpose = state.lpose ? lerp3(state.lpose, press, 1 - Math.exp(-dt * 30)) : press;
      // The shield's face along the knuckles: reach with the hand's grip axis upright and the fingers forward.
      rig.reachArm('l', frontWrist(place(state.lpose), space.left, 'l', space), along([0.8, -0.6, -0.1]),
        along([0, 1, 0]), 1, 0, along(face), null, 0, null, clearL);
      rig.closeHand('l', 1);
    } else if (arms.main === 'jian' && !throwLeft && !shout) {
      // Keep the free hand low and outside the cut. It opens for balance as the sword sweeps across.
      const balance = ordinary ? ease((phase - 0.55) / 1.4) * (1 - ease((phase - 2.85) / 1.1))
        : act?.id === 'spin' ? Math.abs(Math.sin(spin * 0.5)) : 0;
      const free = [0.29 + 0.105 * balance, -0.34 + 0.065 * Number(man.guard), 0.09 - 0.087 * balance];
      state.lpose = state.lpose ? lerp3(state.lpose, free, 1 - Math.exp(-dt * 21)) : free;
      rig.reachArm('l', place(state.lpose), along([0.78, -0.53, -0.18]), null, 0.9);
      rig.closeHand('l', -0.24 + 0.16 * balance, 1, 0.08);
    } else if (!bow) {
      const free = throwLeft > 0 ? lerp3([0.12, -0.05, 0.2], [0.15, 0.05, 0.62], easeOut(throwLeft)) : shout > 0 ? [0.45, 0.08, 0.18] : [0.24, -0.42, 0.1];
      rig.reachArm('l', place(free), rig.dirToRig([0.8, -0.6, -0.2]), null, 0.85);
      rig.closeHand('l', 0.4);
    }

    // ---- the kick ---------------------------------------------------------------------------------------------
    if (man.act?.kind === 'kick') {
      const t = telegraphPoseTime(man.act);
      const lift = t < 0.24 ? easeOut(t / 0.24) : t < 0.34 ? 1 : 1 - ease((t - 0.34) / 0.24);
      const extend = t < 0.18 ? 0 : t < 0.3 ? easeOut((t - 0.18) / 0.12) : 1 - ease((t - 0.3) / 0.2);
      rig.bend('thigh_r', 0, -1.55 * lift);
      rig.bend('calf_r', 0, 1.7 * lift * (1 - extend));
      rig.bend('spine_01', 0, -0.25 * lift);
    }
    let floorLift = 0;
    const combat = man.guard || ['swing', 'skill', 'kick'].includes(man.act?.kind) || p.d > 0.004 || recoil > 0.001 || state.dismountLand > 0.02;
    const grounded = man.alive && !man.mounted && !state.ride && !(man.act?.air > 0) && state.down < 0.02;
    if (combat && grounded) {
      // Ball bones track the shoe's contact surface more closely than the ankle pivots.
      const support = Math.min(rig.toBody(rig.world('ball_l').t)[1], rig.toBody(rig.world('ball_r').t)[1]);
      floorLift = clamp(-support, 0, 0.075);
    }
    plant({
      x: man.x, z: man.z, yaw: man.face + spin, lift: floorLift, dt, speed,
      active: man.guard || act?.kind === 'swing' || act?.kind === 'skill',
      grounded: grounded && man.stun <= 0 && act?.kind !== 'kick' && act?.kind !== 'step'
    });
    return { spin, floorLift };
  }

  function armsForBow(man, dt, place, along, edgeHint, reachRange, poleR, mainTarget, space, clearance) {
    if (man.knife) {
      state.wasDrawing = false;
      state.bowRelease = null;
      state.bowLaunch = null;
      state.drawBlend = state.bowPull = 0;
      bow.flex(0);
      main.node.visible = true;
      bow.node.visible = false;
      rig.reachArm('r', frontWrist(mainTarget, space.right, 'r', space), poleR, along(state.pose.b),
        1, 0, edgeHint, state.primaryGrip, dt, reachRange, clearance);
      for (const st of strings) st.mesh.visible = false;
      nocked.node.visible = false;
      rig.reachArm('l', place([0.24, -0.42, 0.1]), rig.dirToRig([0.8, -0.6, -0.2]), null, 0.8);
      return;
    }
    main.node.visible = false;
    bow.node.visible = true;

    const drawing = Boolean(man.draw);
    if (drawing || man.stun > 0 || !man.alive) state.bowRelease = null;
    else if (!state.bowRelease && state.wasDrawing && man.act?.kind === 'recover') {
      state.bowRelease = { age: 0, power: state.bowPull };
    }
    state.wasDrawing = drawing;
    const recovery = state.bowRelease && bowLoosePose(state.bowRelease.age, state.bowRelease.power);
    if (state.bowRelease && (state.bowRelease.age += dt) > 0.24) state.bowRelease = null;
    const cast = bowReleasePose(man.act);
    const pose = cast ?? recovery;
    const lift = pose?.lift ?? Number(drawing);
    const loaded = pose?.loaded ?? drawing;
    state.drawBlend += (lift - state.drawBlend) * (1 - Math.exp(-dt * 15));
    const up = state.drawBlend;
    const pull = pose?.pull ?? (drawing ? ease(clamp(man.draw.t / man.r.bow.draw, 0, 1)) : 0);
    state.bowPull = pull;
    const follow = recovery?.follow ?? (cast && !cast.loaded ? (1 - cast.string) * cast.pull * 0.75 : 0);
    const opening = recovery?.open ?? (cast && !cast.loaded ? (1 - cast.string) * cast.pull : 0);
    const tension = pull * (loaded ? pose?.string ?? 1 : pose?.string ?? 0);
    bow.flex(clamp(tension, 0, 1));

    const aimYaw = wrap((man.aim?.yaw ?? man.face) - man.face);
    const pitch = clamp(man.aim?.pitch ?? 0.04, -0.65, 0.65);
    const aim = rig.dirToRig([Math.sin(aimYaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(aimYaw) * Math.cos(pitch)]);
    const sky = rig.dirToRig([0, 1, 0]);
    const aimUp = qrot(axisAngle(aim, -0.105), unit(sub(sky, mul(aim, dot(sky, aim)))));
    const bowUp = unit(lerp3(along([0.28, 0.9, 0.25]), aimUp, up));
    const bowForward = unit(sub(aim, mul(bowUp, dot(bowUp, aim))));
    const bowFrame = basis(cross(bowUp, bowForward), bowUp, bowForward);
    const cheek = add(rig.world('head').t, rig.toRig([-0.138, -0.068, 0.038]));
    const alignedRest = add(cheek, mul(aim, (0.55 + 0.02 * follow) / s));
    const raisedGrip = sub(alignedRest, qrot(bowFrame, mul(bow.rest, 1 / s)));
    const grip = lerp3(place([0.16, -0.24, 0.34]), raisedGrip, up);
    const left = rig.hands.l;
    const leftWrist = sub(grip, qrot(gripRotation(left, bowUp, bowForward), left.grip));
    rig.reachArm('l', leftWrist, rig.dirToRig([0.7, -0.4, -0.15]), bowUp, 1, 0, bowForward);
    rig.closeHand('l', 1);

    const top = weaponPoint(bow, bow.nocks[0]);
    const bottom = weaponPoint(bow, bow.nocks[1]);
    const centre = lerp3(bottom, top, 0.5 + bow.rest[1] / (bow.nocks[0][1] - bow.nocks[1][1]));
    // Solve the wrist from the curled finger hook. The same two real fingertips set the rendered nock.
    const pinch = () => lerp3(rig.world('index_03_r').t, rig.world('middle_03_r').t, 0.5);
    rig.closeHand('r', (0.36 + up * 0.36) * (1 - opening * 0.93));
    const right = rig.world('hand_r');
    const fingerOffset = qrot(qinv(right.r), sub(pinch(), right.t));
    const hookTurn = gripRotation(rig.hands.r, bowUp, bowForward);
    const drawTarget = add(lerp3(centre, cheek, pull), mul(aim, -0.066 * follow / s));
    const wrist = lerp3(place([-0.19, -0.28, 0.27]), sub(drawTarget, qrot(hookTurn, fingerOffset)), up);
    rig.reachArm('r', wrist, rig.dirToRig([-0.8, 0.24, -0.75]), bowUp, 1, 0, bowForward, null, dt, null, clearance);
    const hook = pinch();
    const nock = (loaded || pose?.string > 0) && up > 0.10
      ? lerp3(centre, hook, loaded ? 1 : pose.string) : centre;
    strings[0].span(rig.toBody(top), rig.toBody(nock));
    strings[1].span(rig.toBody(nock), rig.toBody(bottom));
    for (const st of strings) st.mesh.visible = true;

    nocked.node.visible = loaded && up > 0.22;
    if (nocked.node.visible) {
      const from = rig.toBody(nock);
      const rest = rig.toBody(weaponPoint(bow, bow.rest));
      const dir = unit(sub(rest, from));
      const side = unit(cross([0, 1, 0], dir));
      const q = basis(side, dir, cross(side, dir));
      nocked.node.setQuaternion(...q);
      nocked.node.setPosition(...add(from, mul(dir, 0.72)));
    }
  }

  function updateThrow(man, dt) {
    if (!man.alive || man.mounted || man.stun <= 0) state.thrown = null;
    else if (!state.thrown && state.ride > 0 && man.stunKind === 'thrown') {
      const away = [man.x - man.horse.x, 0, man.z - man.horse.z];
      const yaw = man.horse.face;
      const left = [Math.cos(yaw), 0, -Math.sin(yaw)];
      state.thrown = { age: 0, from: Array.from(holder.position), yaw,
        away: len(away) > 0.01 ? unit(away) : left, inside: dot(left, away) >= 0 ? 'r' : 'l' };
    }
    const thrown = state.thrown;
    if (thrown) {
      thrown.age += dt;
      thrown.roll = ease((thrown.age - 0.07) / 0.26) * ease((man.stun - 0.035) / 0.45);
    }
    return thrown;
  }

  function throwPose(thrown, ground, yaw) {
    const travel = ease((thrown.age - 0.015) / 0.265);
    const turn = yaw + wrap(thrown.yaw - yaw) * (1 - travel);
    const upright = axisAngle([0, 1, 0], turn);
    const away = qrot(qinv(upright), thrown.away);
    const rotation = qmul(upright, axisAngle([away[2], 0, -away[0]], 1.45 * thrown.roll));
    const at = lerp3(thrown.from, ground, travel);
    // The rider clears the saddle before the legs release, then rolls over the low shoulder.
    const lift = Math.sin(Math.PI * travel) * 0.075;
    const floor = THROW_FLOOR.reduce((height, [name, radius]) =>
      Math.max(height, radius - qrot(rotation, rig.toBody(rig.world(name).t))[1]), 0);
    at[1] = Math.max(at[1] + lift, floor);
    return { at, rotation };
  }

  const figure = {
    holder,
    regiment,
    held,
    rig,
    /** Follow the man for one frame. */
    update(man, game, dt, { seat = null, contactTime = null, mountedContact = null } = {}) {
      if (!man.alive) {
        if (state.fall === 0 && state.impactBearing === null) state.impactBearing = man.face + Math.PI;
        state.fall = Math.min(1, state.fall + dt * 1.6);
      }
      state.impactAge += dt;
      // Simulated occupancy changes immediately. The visible rider still has to leave the saddle.
      const thrown = updateThrow(man, dt);
      const R = man.r?.horse;
      const dismounting = man.act?.kind === 'dismount' && R && seat;
      let ride = man.mounted ? 1 : 0;
      if (man.act?.kind === 'mount' && R) ride = clamp(man.act.t / R.mount, 0, 1);
      if (state.dismount > 0 && !dismounting && !man.mounted && man.stun <= 0) state.dismountLand = 1;
      state.dismount = dismounting ? clamp(man.act.t / R.dismount, 0, 1) : 0;
      state.dismountLand *= Math.exp(-dt * 11);
      if (dismounting) ride = 1 - state.dismount;
      if (thrown) ride = 1 - ease((thrown.age - 0.05) / 0.23);
      if (!seat || !man.alive) ride = 0;
      state.ride = ride;
      const horseYaw = man.horse?.face ?? man.face;
      const aimFromHorse = wrap(man.face - horseYaw);
      // Let the torso face forward again when the view looks behind the horse.
      // The twist reaches the same neutral pose on both sides of the rear seam.
      const lookBack = ease((Math.abs(aimFromHorse) - Math.PI / 2) / (Math.PI / 2));
      const saddleWeight = ease(ride);
      state.turnOnHorse = clamp(aimFromHorse, -1.25, 1.25) * (1 - lookBack) * saddleWeight;
      const saddleAt = ride > 0 ? [seat.at[0], seat.at[1] + 0.06 - hipY, seat.at[2]] : null;
      const sway = ride > 0 ? -(seat.rear * 0.55 + seat.lean * 0.6) * saddleWeight - 0.12 * Math.sin(Math.PI * state.dismount) : 0;
      const saddleRotation = ride === 1 ? qmul(axisAngle([0, 1, 0], horseYaw), axisAngle([1, 0, 0], sway)) : null;
      const anchorInRig = mountedContact && saddleRotation
        ? rig.toRig(qrot(qinv(saddleRotation), sub(mountedContact, saddleAt))) : null;
      let spin = 0, floorLift = 0;
      if (state.fall < 1) ({ spin, floorLift } = arrange(man, game, dt, contactTime, anchorInRig));
      const air = man.act?.air ?? 0;
      const fallTilt = 1.45 * ease((state.fall - 0.19) / 0.68) + 0.76 * ease(state.down);
      const landing = state.fall === 0 ? 0 : 0.045 * Math.sin(Math.PI * clamp((state.fall - 0.27) / 0.66, 0, 1));
      const fallAngle = (state.impactBearing ?? man.face + Math.PI) - man.face;
      // The fight places his feet one metre to the horse's left at the end of the dismount.
      const footX = dismounting ? man.horse.x + Math.cos(horseYaw) : man.x;
      const footZ = dismounting ? man.horse.z - Math.sin(horseYaw) : man.z;
      let at = [footX, air + landing + floorLift, footZ];
      let yaw = man.face + spin;
      if (thrown) {
        const pose = throwPose(thrown, at, yaw);
        holder.setPosition(...pose.at);
        holder.setQuaternion(...pose.rotation);
        return;
      }
      if (ride > 0) {
        // Hips on the seat, facing the way the horse goes; his chest turns on its own (above). He sways with the horse.
        at = lerp3(at, saddleAt, saddleWeight);
        yaw = horseYaw + wrap(man.face - horseYaw) * (1 - saddleWeight);
      }
      holder.setPosition(at[0], at[1], at[2]);
      const tipAxis = [Math.cos(fallAngle), 0, -Math.sin(fallAngle)];
      const tilt = axisAngle(tipAxis, Math.min(1.45, fallTilt) * (1 - ride));
      const q = saddleRotation ?? qmul(qmul(axisAngle([0, 1, 0], yaw), axisAngle([1, 0, 0], sway)), tilt);
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
    braceFromSpin() {
      state.spinBrace = 0.28;
    },
    releaseBow(power = state.bowPull) {
      if (!bow) return;
      state.bowRelease = { age: 0, power: clamp(power, 0.15, 1) };
      state.bowLaunch = null;
      if (nocked.node.visible) {
        const at = Array.from(nocked.node.localToWorld([0, 0, 0], [0, 0, 0]));
        const tip = Array.from(nocked.node.localToWorld([0, 0, 0], [0, 0.085, 0]));
        state.bowLaunch = { at, direction: unit(sub(tip, at)) };
      }
    },
    takeBowLaunch() {
      const launch = state.bowLaunch;
      state.bowLaunch = null;
      return launch;
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
