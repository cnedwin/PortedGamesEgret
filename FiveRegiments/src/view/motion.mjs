// Motion: retargeted capture clips played on a character's own bones, blended by weight, with the hips' height
// and sway. The clips come from tools/retarget.mjs as one JSON index and one binary file: 16-bit quaternions per
// bone per frame, then three floats of hip offset per frame.
//
// A pose is a Float32Array of bones × 4 quaternion values followed by 3 hip values. Poses are sampled from clips,
// blended, laid over one another for some bones only, and finally written to the skeleton.

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
