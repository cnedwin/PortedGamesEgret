// The arms and hands over the captured motion: forward kinematics of a character's own skeleton, two-bone reach
// for the arms, a hand turned to hold a blade along a wanted direction, and fingers closed round a grip.
//
// "Rig space" is the space of the loaded model's scene root (Y up, the model's own units and facing). Body space
// is metres with +Z forward and +X to the character's left; `toRig` and `toBody` convert between them.

// ---- small vector and quaternion helpers ([x, y, z] and [x, y, z, w]) -----------------------------------------
export const qmul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
];
export const qinv = (q) => [-q[0], -q[1], -q[2], q[3]];
export const qnorm = (q) => {
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
};
export function qrot(q, v) {
  const [x, y, z, w] = q;
  const ix = w * v[0] + y * v[2] - z * v[1],
    iy = w * v[1] + z * v[0] - x * v[2],
    iz = w * v[2] + x * v[1] - y * v[0],
    iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
}
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a) => mul(a, 1 / (len(a) || 1));
export const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export function axisAngle(axis, angle) {
  const s = Math.sin(angle / 2);
  const a = unit(axis);
  return [a[0] * s, a[1] * s, a[2] * s, Math.cos(angle / 2)];
}
export function fromTo(a, b) {
  a = unit(a);
  b = unit(b);
  const d = dot(a, b);
  if (d < -0.9999) return axisAngle(Math.abs(a[0]) < 0.9 ? cross(a, [1, 0, 0]) : cross(a, [0, 1, 0]), Math.PI);
  return qnorm([...cross(a, b), 1 + d]);
}

/** Carry the existing edge onto the new blade axis before turning it toward the forearm. */
export function stabilizeBladeRoll(axis, lead, previous, maxTurn) {
  const projected = sub(lead, mul(axis, dot(lead, axis)));
  const confidence = len(projected);
  const carried = previous?.edge ? qrot(fromTo(previous.axis, axis), previous.edge) : null;
  if (confidence < 0.15) {
    if (carried) return carried;
    const fallback = Math.abs(axis[1]) < 0.85 ? [0, 1, 0] : [0, 0, 1];
    return unit(sub(fallback, mul(axis, dot(fallback, axis))));
  }
  const preferred = unit(projected);
  if (!carried) return preferred;
  const signed = Math.atan2(dot(cross(carried, preferred), axis), dot(carried, preferred));
  const bound = maxTurn * Math.min(1, (confidence - 0.15) / 0.25);
  const turn = Math.max(-bound, Math.min(bound, signed));
  return unit(qrot(axisAngle(axis, turn), carried));
}
/** The rotation whose columns are the given orthonormal axes. */
export function basis(x, y, z) {
  const t = x[0] + y[1] + z[2];
  let q;
  if (t > 0) {
    const s = Math.sqrt(t + 1) * 2;
    q = [(y[2] - z[1]) / s, (z[0] - x[2]) / s, (x[1] - y[0]) / s, 0.25 * s];
  } else if (x[0] > y[1] && x[0] > z[2]) {
    const s = Math.sqrt(1 + x[0] - y[1] - z[2]) * 2;
    q = [0.25 * s, (y[0] + x[1]) / s, (z[0] + x[2]) / s, (y[2] - z[1]) / s];
  } else if (y[1] > z[2]) {
    const s = Math.sqrt(1 + y[1] - x[0] - z[2]) * 2;
    q = [(y[0] + x[1]) / s, 0.25 * s, (z[1] + y[2]) / s, (z[0] - x[2]) / s];
  } else {
    const s = Math.sqrt(1 + z[2] - x[0] - y[1]) * 2;
    q = [(z[0] + x[2]) / s, (z[1] + y[2]) / s, 0.25 * s, (x[1] - y[0]) / s];
  }
  return qnorm(q);
}
export function slerp(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let bb = b;
  if (d < 0) {
    d = -d;
    bb = [-b[0], -b[1], -b[2], -b[3]];
  }
  if (d > 0.9995) return qnorm([a[0] + (bb[0] - a[0]) * t, a[1] + (bb[1] - a[1]) * t, a[2] + (bb[2] - a[2]) * t, a[3] + (bb[3] - a[3]) * t]);
  const th = Math.acos(d),
    s = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / s,
    wb = Math.sin(t * th) / s;
  return [a[0] * wa + bb[0] * wb, a[1] * wa + bb[1] * wb, a[2] * wa + bb[2] * wb, a[3] * wa + bb[3] * wb];
}

const CHAIN = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'spine_04', 'spine_05', 'neck_01', 'neck_02', 'head'];
const ARM = (s) => ['clavicle_' + s, 'upperarm_' + s, 'lowerarm_' + s, 'hand_' + s];
const FINGERS = ['index', 'middle', 'ring', 'pinky'];

/**
 * Bind to a loaded character's bones. `scale` and `turn` are what the holder applies (rig → body).
 */
export function createRig(nodes, { scale, turn, root: sceneRoot }) {
  const bone = (n) => nodes[n];
  const yaw = [0, Math.sin(turn / 2), 0, Math.cos(turn / 2)];
  const toBody = (p) => mul(qrot(yaw, p), scale);
  const toRig = (p) => qrot(qinv(yaw), mul(p, 1 / scale));
  const dirToBody = (d) => qrot(yaw, d);
  const dirToRig = (d) => qrot(qinv(yaw), d);

  // World transforms are taken from the model's scene root down (rig space), whatever holds the model above it.
  const cache = new Map();
  const IDENTITY = { r: [0, 0, 0, 1], t: [0, 0, 0] };
  function worldOf(node) {
    if (!node || node === sceneRoot) return IDENTITY;
    let w = cache.get(node);
    if (w) return w;
    const pw = worldOf(node.parent);
    const q = Array.from(node.quaternion),
      t = Array.from(node.position);
    w = { r: qmul(pw.r, q), t: add(pw.t, qrot(pw.r, t)) };
    cache.set(node, w);
    return w;
  }
  /** World (rig space) rotation and position of a bone, from the current local transforms. */
  const world = (name) => worldOf(bone(name));
  const forget = () => cache.clear();
  function setWorld(name, r) {
    const node = bone(name);
    const pr = worldOf(node.parent).r;
    const local = qnorm(qmul(qinv(pr), r));
    node.setQuaternion(local[0], local[1], local[2], local[3]);
    forget();
  }
  function setLocal(name, q) {
    bone(name).setQuaternion(q[0], q[1], q[2], q[3]);
    forget();
  }

  // ---- rest measurements -----------------------------------------------------------------------------------
  const restLocal = {};
  for (const [name, node] of Object.entries(nodes)) restLocal[name] = Array.from(node.quaternion);
  const hands = {};
  for (const s of ['l', 'r']) {
    const hw = world('hand_' + s);
    const inv = qinv(hw.r);
    const index = world('index_01_' + s).t,
      pinky = world('pinky_01_' + s).t,
      middle = world('middle_01_' + s).t;
    const along = unit(qrot(inv, sub(index, pinky))); // pinky to index: where a held blade comes out
    let fingers = qrot(inv, sub(middle, hw.t));
    fingers = unit(sub(fingers, mul(along, dot(fingers, along))));
    const palm = unit(cross(fingers, along)); // checked against the rest palm, which faces down
    const palmDown = qrot(inv, [0, -1, 0]);
    const palmSign = dot(palm, palmDown) >= 0 ? 1 : -1;
    const knuckles = sub(middle, hw.t);
    // Where a grip sits in the hand: a little short of the knuckles, toward the palm.
    const grip = qrot(inv, add(mul(knuckles, 0.62), mul(qrot(hw.r, mul(palm, palmSign)), len(knuckles) * 0.38)));
    const curl = [];
    for (const f of FINGERS) {
      for (let k = 1; k <= 3; k++) {
        const n = `${f}_0${k}_${s}`;
        if (!bone(n)) continue;
        const fw = world(n).r;
        // Close about the hand's across axis, taken into this joint's own frame; the sign puts fingertips to the palm.
        const axisWorld = qrot(hw.r, mul(along, palmSign * (s === 'l' ? 1 : 1)));
        curl.push({ name: n, axis: qrot(qinv(fw), axisWorld), rest: restLocal[n], k });
      }
    }
    const thumb = [1, 2, 3].map((k) => `thumb_0${k}_${s}`).filter((n) => bone(n));
    hands[s] = { along, fingers, palm: mul(palm, palmSign), grip, curl, thumb };
  }
  // Arm lengths (rig units).
  const reach = {};
  for (const s of ['l', 'r']) {
    const a = world('upperarm_' + s).t,
      b = world('lowerarm_' + s).t,
      c = world('hand_' + s).t;
    reach[s] = { upper: len(sub(b, a)), lower: len(sub(c, b)) };
  }
  forget();

  /** Close a hand round a grip: `amount` 0 open … 1 a fist. */
  function closeHand(s, amount = 1, spread = 1) {
    for (const c of hands[s].curl) {
      const angle = amount * (c.k === 1 ? 1.25 : c.k === 2 ? 1.45 : 1.0) * spread;
      setLocal(c.name, qmul(c.rest, axisAngle(c.axis, angle)));
    }
    for (const [k, n] of hands[s].thumb.entries()) setLocal(n, qmul(restLocal[n], axisAngle([0, 0, 1], amount * (k ? 0.35 : 0.15))));
  }

  /**
   * Reach the hand of side `s` to `target` (rig space), the elbow toward `pole` (a rig-space direction), and turn
   * the hand so that a held blade points along `blade` with its edge leading along the forearm. `weight` blends
   * from the captured arm to the reached one. A primary melee grip remembers its edge to avoid singular rolls.
   */
  function reachArm(s, target, pole, blade, weight = 1, roll = 0, face = null, grip = null, dt = 0) {
    if (weight <= 0) return;
    const up = 'upperarm_' + s,
      lo = 'lowerarm_' + s,
      hd = 'hand_' + s;
    const S = world(up).t,
      E0 = world(lo).t,
      H0 = world(hd).t;
    const { upper: L1, lower: L2 } = reach[s];
    let toT = sub(target, S);
    let d = len(toT);
    const dir = unit(toT);
    d = Math.max(Math.abs(L1 - L2) + 1e-4, Math.min(L1 + L2 - 1e-4, d));
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    let p = sub(pole, mul(dir, dot(pole, dir)));
    if (len(p) < 1e-5) p = Math.abs(dir[1]) < 0.9 ? [0, -1, 0] : [0, 0, -1];
    p = unit(p);
    const E = add(add(S, mul(dir, a)), mul(p, h));
    const T = add(S, mul(dir, d));
    const upR0 = world(up).r;
    const upR = qmul(fromTo(sub(E0, S), sub(E, S)), upR0);
    setWorld(up, weight >= 1 ? upR : slerp(upR0, upR, weight));
    const E1 = world(lo).t,
      H1 = world(hd).t,
      loR0 = world(lo).r;
    const loR = qmul(fromTo(sub(H1, E1), sub(lerp3(H0, T, weight), E1)), loR0);
    setWorld(lo, loR);
    if (blade) {
      const hand = hands[s];
      const forearm = unit(sub(world(hd).t, world(lo).t));
      const B = unit(blade);
      const lead = face ? unit(face) : forearm;
      let F = stabilizeBladeRoll(B, lead, grip, 9 * dt);
      if (grip) {
        grip.axis = B;
        grip.edge = F;
      }
      if (roll) F = qrot(axisAngle(B, roll), F);
      // Hand frame: along → B, fingers → F.
      const local = basis(hand.along, hand.fingers, cross(hand.along, hand.fingers));
      const want = basis(B, F, cross(B, F));
      const hr0 = world(hd).r;
      const hr = qmul(want, qinv(local));
      setWorld(hd, weight >= 1 ? hr : slerp(hr0, hr, weight));
    }
  }

  /** Turn a chain bone about the body's up and side axes (radians), on top of what it has. */
  function bend(name, yawAngle = 0, pitch = 0, rollAngle = 0) {
    if (!bone(name)) return;
    const w = world(name).r;
    const up = dirToRig([0, 1, 0]),
      side = dirToRig([1, 0, 0]),
      fwd = dirToRig([0, 0, 1]);
    let q = [0, 0, 0, 1];
    if (yawAngle) q = qmul(axisAngle(up, yawAngle), q);
    if (pitch) q = qmul(axisAngle(side, pitch), q);
    if (rollAngle) q = qmul(axisAngle(fwd, rollAngle), q);
    setWorld(name, qmul(q, w));
  }

  return { world, setWorld, setLocal, forget, reachArm, closeHand, bend, hands, reach, toBody, toRig, dirToBody, dirToRig, restLocal, chain: CHAIN, arm: ARM, bone };
}
