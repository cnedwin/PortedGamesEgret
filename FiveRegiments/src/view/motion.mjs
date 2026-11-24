// Motion: retargeted capture clips played on a character's own bones, blended by weight, with the hips' height
// and sway. The clips come from tools/retarget.mjs as one JSON index and one binary file: 16-bit quaternions per
// bone per frame, then three floats of hip offset per frame.
//
// A pose is a Float32Array of bones × 4 quaternion values followed by 3 hip values. Poses are sampled from clips,
// blended, laid over one another for some bones only, and finally written to the skeleton.

import { add, cross, dot, len, lerp3, mul, sub, unit } from './rig.mjs';
import { SKILLS } from '../sim/regiments.mjs';

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smooth = (t) => t * t * (3 - 2 * t);
const SWING_TEMPO = {
  knife: [0.55, 0.29],
  jian: [0.61, 0.36],
  sabre: [0.65, 0.44],
  spear: [0.67, 0.4],
  ji: [0.7, 0.46],
  zhanma: [0.72, 0.51],
  axe: [0.74, 0.55]
};

// Time, direction, and the weapon pose (load, contact, or follow-through).
export const TIGER_SWORD = {
  spin: [[0, 'ready'], [0.14, 'R', 0], [0.30, 'R', 1], [0.43, 'R', 2], [0.58, 'ready']],
  chain: [[0, 'ready'], [0.09, 'R', 0], [0.18, 'R', 1], [0.23, 'R', 2], [0.30, 'L', 0],
    [0.38, 'L', 1], [0.43, 'L', 2], [0.50, 'R', 0], [0.58, 'R', 1], [0.67, 'R', 2], [0.83, 'ready']]
};
const contactsOf = (keys) => keys.filter(([, , pose]) => pose === 1).map(([time]) => time);
const spinContacts = contactsOf(TIGER_SWORD.spin);
const chainContacts = contactsOf(TIGER_SWORD.chain);
const returningSpear = SKILLS.returnSpear;
const RETURN_SPEAR_BEATS = [0, returningSpear.stepTime * 0.58, returningSpear.turnTime - 0.07,
  returningSpear.release, returningSpear.release + 0.13, returningSpear.duration];
const skillTrailWindows = {
  charge: [0.4, 0.55], moon: [0.11, 0.28], down: [0.63, 0.82], wave: [0.3, 0.46],
  returnSpear: [returningSpear.release - 0.04, returningSpear.release + 0.056]
};

/** Ready, low carry, planted load, thrust contact, withdrawal, and ready again. */
export function returnSpearPhase(t) {
  for (let i = 1; i < RETURN_SPEAR_BEATS.length; i++) {
    const next = RETURN_SPEAR_BEATS[i];
    if (t > next) continue;
    const begin = RETURN_SPEAR_BEATS[i - 1];
    const k = clamp01((t - begin) / (next - begin));
    const paced = i === 3 ? k * k : i === 4 ? 1 - (1 - k) ** 2 : smooth(k);
    return i - 1 + paced;
  }
  return RETURN_SPEAR_BEATS.length - 1;
}

/** A short blade trail during each committed swing, without joining it to the next load. */
export function skillTrailSegment(action) {
  if (action?.kind !== 'skill') return null;
  const window = skillTrailWindows[action.id];
  if (window) return action.t >= window[0] && action.t <= window[1] ? 0 : null;
  if (action.id === 'boar') {
    if (action.firstHitAt !== undefined && action.t - action.firstHitAt < 0.072) return 1;
    return action.t >= 0.54 && action.t <= 0.7 ? 2 : null;
  }
  if (action.id === 'spin' && Math.abs(action.t - spinContacts[0]) >= 0.075) return null;
  if (action.id !== 'swing') return 0;
  const index = chainContacts.findIndex((time) => Math.abs(action.t - time) < 0.054);
  return index < 0 ? null : index + 1;
}

/**
 * The four spans run from ready to loaded, contact, follow-through and back to ready.
 * Logical contact stays on strikeAt, including when a held swing releases.
 */
export function swingPhase(action, weapon, attackHeld) {
  const [naturalLoad, follow] = SWING_TEMPO[weapon] ?? SWING_TEMPO.sabre;
  if (!action.struck) {
    const wind = clamp01(action.t / action.wind);
    // The PC gesture reserves part of its wind-up for the committed stroke, even at full charge.
    const load = action.releaseOnly && action.prepCap > 0 ? action.prepCap / action.wind : naturalLoad;
    if (wind < load) return smooth(wind / load);
    if (action.awaitingRelease || !action.releaseOnly && (action.held > 0 || attackHeld && !action.quick)) return 1;
    const sweep = clamp01((wind - load) / (1 - load));
    return 1 + 0.96 * sweep * sweep;
  }
  const recovery = clamp01((action.t - action.strikeAt) / action.recover);
  if (recovery < follow) return 2 + (1 - (1 - recovery / follow) ** 2);
  return 3 + smooth((recovery - follow) / (1 - follow));
}

/** Body-space lateral transfer, fore/aft transfer and knee compression for the long axe. */
export function heavyFootwork(phase, line) {
  if (phase <= 0 || phase >= 4) return [0, 0, 0];
  const side = line === 'L' || line === 'T' ? -1 : 1;
  const overhead = line === 'O';
  const keys = [[0, 0, 0], [-0.09, -0.05, 0.034], [0.1, 0.1, overhead ? 0.092 : 0.064],
    [0.068, 0.078, overhead ? 0.074 : 0.046], [0, 0, 0]];
  const from = Math.floor(phase);
  const [across, forward, dip] = lerp3(keys[from], keys[from + 1], smooth(phase - from));
  return [across * side, forward, dip];
}

/** Follow a great circle so a near half-turn never collapses or flips at its midpoint. */
export function interpolateDirection(from, to, t) {
  const a = unit(from), b = unit(to);
  if (t <= 0) return a;
  if (t >= 1) return b;
  const cosine = Math.max(-1, Math.min(1, dot(a, b)));
  if (cosine > 0.9995) return unit(lerp3(a, b, t));
  const projected = sub(b, mul(a, cosine));
  const crossAxis = Math.abs(a[1]) < 0.85 ? [0, 1, 0] : [1, 0, 0];
  const tangent = unit(len(projected) > 1e-5 ? projected : cross(crossAxis, a));
  const angle = Math.acos(cosine) * t;
  return add(mul(a, Math.cos(angle)), mul(tangent, Math.sin(angle)));
}

/** Quick compression followed by a slower, non-oscillating release. */
export function impactWeight(age, heavy) {
  const power = clamp01(heavy);
  const peak = 0.042 + power * 0.014;
  const settle = 0.21 + power * 0.15;
  const amount = age < peak ? smooth(clamp01(age / peak)) : 1 - smooth(clamp01((age - peak) / (settle - peak)));
  return amount * (0.45 + power * 0.55);
}

export async function loadMotion(prefix) {
  const base = String(prefix);
  const [index, bin] = await Promise.all([
    fetch(base + '.json').then((r) => {
      if (!r.ok) throw Error('Motion index HTTP ' + r.status);
      return r.json();
    }),
    fetch(base + '.bin').then((r) => {
      if (!r.ok) throw Error('Motion data HTTP ' + r.status);
      return r.arrayBuffer();
    })
  ]);
  return createMotion(index, bin);
}

export function createMotion(index, bin) {
  const quats = new Int16Array(bin, 0, index.quatBytes / 2);
  const hips = new Float32Array(bin, index.quatBytes, index.hipBytes / 4);
  const bones = index.bones;
  const B = bones.length;
  const byName = new Map(index.clips.map((c) => [c.name, c]));
  const size = B * 4 + 3;
  const k = 1 / 32767;

  function frameInto(clip, f, out, offset = 0) {
    const row = (clip.start + f) * B * 4;
    for (let i = 0; i < B * 4; i++) out[offset + i] = quats[row + i] * k;
    const h = (clip.start + f) * 3;
    out[offset + B * 4] = hips[h];
    out[offset + B * 4 + 1] = hips[h + 1];
    out[offset + B * 4 + 2] = hips[h + 2];
  }
  const a = new Float32Array(size),
    b = new Float32Array(size);

  return {
    bones,
    size,
    clips: index.clips,
    rest: index.rest,
    pose: () => new Float32Array(size),
    clip: (name) => {
      const c = byName.get(name);
      if (!c) throw Error('No clip ' + name);
      return c;
    },
    has: (name) => byName.has(name),
    duration: (name) => (byName.get(name).frames - 1) / byName.get(name).fps,
    /** The clip's pose at `time` seconds (looping or held at the end), between frames. */
    sample(name, time, out) {
      const clip = byName.get(name);
      const span = clip.frames - 1;
      let f = time * clip.fps;
      if (clip.loop) f = ((f % span) + span) % span;
      else f = Math.max(0, Math.min(span, f));
      const f0 = Math.floor(f),
        f1 = Math.min(span, f0 + 1),
        w = f - f0;
      frameInto(clip, f0, a);
      frameInto(clip, f1, b);
      blend(a, b, w, out, B);
      return out;
    },
    /** Lay `top` over `out` by `weight`, for the bones whose mask entry is above zero (all when no mask). */
    blend: (out, top, weight, mask) => blend(out, top, weight, out, B, mask),
    copy: (from, to) => to.set(from)
  };
}

/** Normalised linear blend of two poses, `w` toward `b`, per bone; `mask` (per bone 0..1) scales the weight. */
export function blend(a, b, w, out, B, mask) {
  for (let i = 0; i < B; i++) {
    const t = mask ? w * mask[i] : w;
    const o = i * 4;
    if (t <= 0) {
      if (out !== a) for (let k = 0; k < 4; k++) out[o + k] = a[o + k];
      continue;
    }
    let bx = b[o],
      by = b[o + 1],
      bz = b[o + 2],
      bw = b[o + 3];
    if (a[o] * bx + a[o + 1] * by + a[o + 2] * bz + a[o + 3] * bw < 0) [bx, by, bz, bw] = [-bx, -by, -bz, -bw];
    const x = a[o] + (bx - a[o]) * t,
      y = a[o + 1] + (by - a[o + 1]) * t,
      z = a[o + 2] + (bz - a[o + 2]) * t,
      q = a[o + 3] + (bw - a[o + 3]) * t;
    const l = Math.hypot(x, y, z, q) || 1;
    out[o] = x / l;
    out[o + 1] = y / l;
    out[o + 2] = z / l;
    out[o + 3] = q / l;
  }
  const h = B * 4;
  const hw = mask ? w * (mask.hips ?? 0) : w;
  for (let k = 0; k < 3; k++) out[h + k] = a[h + k] + (b[h + k] - a[h + k]) * hw;
  return out;
}

/**
 * Bind a motion set to a loaded character: find its bones, work out the scale for `height` metres and the turn
 * that makes it face +Z, and write poses to it.
 */
export function createAnimator(root, motion, { height = 1.78 } = {}) {
  const nodes = {};
  root.traverse((n) => {
    if (n.name) nodes[n.name] = nodes[n.name] ?? n;
  });
  const bones = motion.bones.map((name) => nodes[name] ?? null);
  root.updateWorldMatrices?.(true);
  const at = (name) => Array.from(nodes[name]?.getWorldPosition() ?? [0, 0, 0]);
  const left = [at('thigh_l')[0] - at('thigh_r')[0], 0, at('thigh_l')[2] - at('thigh_r')[2]];
  // Forward is left × up.
  const forward = [-left[2], 0, left[0]];
  const turn = -Math.atan2(forward[0], forward[2]);
  const headY = at('head')[1] - Math.min(at('foot_l')[1], at('foot_r')[1]) + 0.08;
  const scale = (height * 0.9) / Math.max(0.1, headY);
  const pelvis = nodes.pelvis;
  const B = motion.bones.length;

  return {
    nodes,
    scale,
    turn,
    /** Write a pose to the skeleton. */
    apply(p) {
      for (let i = 0; i < B; i++) {
        const bone = bones[i];
        if (bone) bone.setQuaternion(p[i * 4], p[i * 4 + 1], p[i * 4 + 2], p[i * 4 + 3]);
      }
      if (pelvis) pelvis.setPosition(p[B * 4], p[B * 4 + 1], p[B * 4 + 2]);
    },
    /** Sample one clip and write it. */
    pose(name, time) {
      const p = motion.pose();
      motion.sample(name, time, p);
      this.apply(p);
      return p;
    }
  };
}
