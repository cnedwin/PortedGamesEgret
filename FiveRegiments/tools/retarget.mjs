// Carry motion capture onto the game's characters.
//
// The source clips are the CMU Graphics Lab captures as retargeted GLB files (UE4-mannequin bone names, a T-pose
// rest). The targets are the game's rigged characters (UE5-style names, also a T-pose). For every mapped bone the
// source's turn away from its rest is laid onto the target's rest, after the source's rest is first swung so that
// each bone points where the target's bone points; bones the map leaves out (twists, the extra spine and neck
// joints, fingers) keep their rest. Ground travel and the take's overall heading are taken out, so each clip
// plays in place facing forward; the hips keep their height and sway, scaled by the ratio of hip heights.
//
//   node tools/retarget.mjs <clips.json> <source dir> <character.glb> <out prefix>
//
// clips.json lists { name, file, from, to, loop, yaw } with frames at the source's 60 a second; the output is
// <out prefix>.json (the clips and bone list) and <out prefix>.bin (16-bit quaternions and float hip offsets).
// Needs @gltf-transform/core, @gltf-transform/extensions and meshoptimizer installed alongside.
import { readFileSync, writeFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

// ---- quaternions [x, y, z, w] and vectors -----------------------------------------------------------------
const qmul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
];
const qinv = (q) => [-q[0], -q[1], -q[2], q[3]];
const qnorm = (q) => {
  const l = Math.hypot(...q) || 1;
  return q.map((v) => v / l);
};
const qrot = (q, v) => {
  const p = qmul(qmul(q, [v[0], v[1], v[2], 0]), qinv(q));
  return [p[0], p[1], p[2]];
};
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, k) => a.map((v) => v * k);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => scale(a, 1 / (Math.hypot(...a) || 1));
function fromTo(a, b) {
  a = unit(a);
  b = unit(b);
  const d = dot(a, b);
  if (d < -0.99999) {
    const axis = unit(Math.abs(a[0]) < 0.9 ? cross(a, [1, 0, 0]) : cross(a, [0, 1, 0]));
    return [...axis, 0];
  }
  return qnorm([...cross(a, b), 1 + d]);
}
/** The rotation taking the orthonormal frame (x1, y1, z1) to (x2, y2, z2). */
function frameQuat(x, y, z) {
  const m = [x, y, z]; // columns
  const t = m[0][0] + m[1][1] + m[2][2];
  let q;
  if (t > 0) {
    const s = Math.sqrt(t + 1) * 2;
    q = [(m[1][2] - m[2][1]) / s, (m[2][0] - m[0][2]) / s, (m[0][1] - m[1][0]) / s, 0.25 * s];
  } else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
    const s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2;
    q = [0.25 * s, (m[1][0] + m[0][1]) / s, (m[2][0] + m[0][2]) / s, (m[1][2] - m[2][1]) / s];
  } else if (m[1][1] > m[2][2]) {
    const s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2;
    q = [(m[1][0] + m[0][1]) / s, 0.25 * s, (m[2][1] + m[1][2]) / s, (m[2][0] - m[0][2]) / s];
  } else {
    const s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2;
    q = [(m[2][0] + m[0][2]) / s, (m[2][1] + m[1][2]) / s, 0.25 * s, (m[0][1] - m[1][0]) / s];
  }
  return qnorm(q);
}
const yawQuat = (a) => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];

// ---- skeletons ----------------------------------------------------------------------------------------------
const MAP = {
  pelvis: 'pelvis', spine_01: 'spine_01', spine_03: 'spine_02', spine_05: 'spine_03', neck_01: 'neck_01', head: 'Head',
  clavicle_l: 'clavicle_l', upperarm_l: 'upperarm_l', lowerarm_l: 'lowerarm_l', hand_l: 'hand_l',
  clavicle_r: 'clavicle_r', upperarm_r: 'upperarm_r', lowerarm_r: 'lowerarm_r', hand_r: 'hand_r',
  thigh_l: 'thigh_l', calf_l: 'calf_l', foot_l: 'foot_l', ball_l: 'ball_l',
  thigh_r: 'thigh_r', calf_r: 'calf_r', foot_r: 'foot_r', ball_r: 'ball_r'
};
// Where each mapped bone points: [target child, source child].
const AIM = {
  pelvis: ['spine_01', 'spine_01'], spine_01: ['spine_02', 'spine_02'], spine_03: ['spine_04', 'spine_03'], spine_05: ['neck_01', 'neck_01'],
  neck_01: ['head', 'Head'],
  clavicle_l: ['upperarm_l', 'upperarm_l'], upperarm_l: ['lowerarm_l', 'lowerarm_l'], lowerarm_l: ['hand_l', 'hand_l'], hand_l: ['middle_01_l', 'middle_01_l'],
  clavicle_r: ['upperarm_r', 'upperarm_r'], upperarm_r: ['lowerarm_r', 'lowerarm_r'], lowerarm_r: ['hand_r', 'hand_r'], hand_r: ['middle_01_r', 'middle_01_r'],
  thigh_l: ['calf_l', 'calf_l'], calf_l: ['foot_l', 'foot_l'], foot_l: ['ball_l', 'ball_l'],
  thigh_r: ['calf_r', 'calf_r'], calf_r: ['foot_r', 'foot_r'], foot_r: ['ball_r', 'ball_r']
};

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

/** Read a skin's joints with their rest local transforms and the fixed transform above the skeleton. */
async function readRig(path) {
  const doc = await io.read(path);
  const skin = doc.getRoot().listSkins()[0];
  const joints = skin.listJoints();
  const names = joints.map((j) => j.getName());
  const bones = {};
  for (const j of joints) {
    const parent = j.getParentNode();
    bones[j.getName()] = { node: j, parent: parent && names.includes(parent.getName()) ? parent.getName() : null, t: j.getTranslation(), r: j.getRotation() };
  }
  // The world transform of the node holding the top joint (the armature), taken as rotation and offset.
  const top = joints.find((j) => !bones[j.getName()].parent);
  const holder = top.getParentNode();
  let baseR = [0, 0, 0, 1],
    baseT = [0, 0, 0];
  for (let n = holder; n; n = n.getParentNode()) {
    baseT = add(qrot(n.getRotation(), baseT), n.getTranslation());
    baseR = qmul(n.getRotation(), baseR);
  }
  const order = [];
  const visit = (name) => {
    order.push(name);
    for (const [k, b] of Object.entries(bones)) if (b.parent === name) visit(k);
  };
  visit(top.getName());
  return { doc, bones, order, baseR, baseT };
}

/** World rotations and positions of every joint for local rotations `rot` and translations `pos` by name. */
function pose(rig, rot = {}, pos = {}) {
  const W = {};
  for (const name of rig.order) {
    const b = rig.bones[name];
    const pr = b.parent ? W[b.parent].r : rig.baseR,
      pt = b.parent ? W[b.parent].t : rig.baseT;
    const r = qmul(pr, rot[name] ?? b.r);
    const t = add(pt, qrot(pr, pos[name] ?? b.t));
    W[name] = { r, t };
  }
  return W;
}

/** The rig's own frame: left (from right hip to left), up (hips to head) and forward. */
function bodyFrame(W, head) {
  const left = unit(sub(W.thigh_l.t, W.thigh_r.t));
  const upRaw = sub(W[head].t, W.pelvis.t);
  const fwd = unit(cross(left, upRaw));
  const up = unit(cross(fwd, left));
  return frameQuat(left, up, fwd);
}

function sampleTrack(channel, frame) {
  const sampler = channel.getSampler();
  const out = sampler.getOutput();
  const count = sampler.getInput().getCount();
  const i = Math.max(0, Math.min(count - 1, frame));
  return out.getElement(i, []);
}

// ---- main ------------------------------------------------------------------------------------------------
const [clipsPath, sourceDir, targetPath, outPrefix] = process.argv.slice(2);
const clips = JSON.parse(readFileSync(clipsPath, 'utf8'));
const target = await readRig(targetPath);
const restT = pose(target);
const targetFrame = bodyFrame(restT, 'head');
const tracks = Object.keys(MAP).filter((name) => target.bones[name]);
const FPS = 30;
const quats = [],
  hips = [],
  index = [];
const sources = new Map();

for (const clip of clips) {
  let src = sources.get(clip.file);
  if (!src) {
    src = await readRig(`${sourceDir}/${clip.file}`);
    src.anim = src.doc.getRoot().listAnimations()[0];
    src.channels = {};
    for (const ch of src.anim.listChannels()) src.channels[ch.getTargetNode().getName() + ':' + ch.getTargetPath()] = ch;
    src.rest = pose(src);
    src.frame = bodyFrame(src.rest, 'Head');
    sources.set(clip.file, src);
  }
  const restS = src.rest;
  // Source rest frame onto target rest frame.
  const align = qmul(targetFrame, qinv(src.frame));
  const hipK = (restT.pelvis.t[1] - target.baseT[1]) / (restS.pelvis.t[1] - src.baseT[1]);
  // Each target bone's correction: swing the source rest bone to point as the target's does.
  const swing = {};
  for (const name of tracks) {
    const aim = AIM[name];
    if (!aim || !target.bones[aim[0]] || !src.bones[aim[1]]) {
      swing[name] = [0, 0, 0, 1];
      continue;
    }
    const dt = sub(restT[aim[0]].t, restT[name].t);
    const ds = qrot(align, sub(restS[aim[1]].t, restS[MAP[name]].t));
    swing[name] = fromTo(ds, dt);
  }
  const frames = [];
  for (let f = clip.from; f <= clip.to; f += 60 / FPS) frames.push(Math.round(f));
  // The take's heading over this stretch, taken out so the clip faces forward.
  const sourcePoses = frames.map((f) => {
    const rot = {},
      pos = {};
    for (const name of Object.keys(src.bones)) {
      const r = src.channels[name + ':rotation'];
      if (r) rot[name] = sampleTrack(r, f);
    }
    const pelvisT = src.channels['pelvis:translation'];
    if (pelvisT) pos.pelvis = sampleTrack(pelvisT, f);
    // Ground travel lives on the root bone; leave it out.
    pos.root = src.bones.root?.t ?? [0, 0, 0];
    return pose(src, rot, pos);
  });
  let heading = 0;
  if (clip.yaw !== false) {
    let sx = 0,
      sz = 0;
    for (const W of sourcePoses) {
      const fr = bodyFrame(W, 'Head');
      const fwd = qrot(fr, [0, 0, 1]);
      sx += fwd[0];
      sz += fwd[2];
    }
    heading = Math.atan2(sx, sz) + (clip.turn ?? 0);
  }
  const unturn = yawQuat(-heading);
  const start = quats.length / 4 / tracks.length;
  // A mirrored clip swaps the sides and reflects every turn across the body's middle plane.
  const side = qrot(targetFrame, [1, 0, 0]);
  const reflect = (q) => {
    const v = [q[0], q[1], q[2]],
      d = dot(v, side);
    return [2 * d * side[0] - v[0], 2 * d * side[1] - v[1], 2 * d * side[2] - v[2], q[3]];
  };
  const swap = (name) => (name.endsWith('_l') ? name.slice(0, -2) + '_r' : name.endsWith('_r') ? name.slice(0, -2) + '_l' : name);
  // Travel per second along the target's left and forward, for knowing which way a sideways walk goes.
  const travel = (() => {
    const rootCh = src.channels['root:translation'];
    if (!rootCh) return [0, 0];
    const a = qrot(align, qrot(unturn, qrot(src.baseR, sampleTrack(rootCh, frames[0])))),
      b = qrot(align, qrot(unturn, qrot(src.baseR, sampleTrack(rootCh, frames.at(-1)))));
    const d = scale(sub(b, a), FPS / Math.max(1, frames.length - 1));
    const fwd = qrot(targetFrame, [0, 0, 1]);
    return [dot(d, side) * (clip.mirror ? -1 : 1), dot(d, fwd)];
  })();
  for (const W of sourcePoses) {
    const Wt = {};
    const delta = {};
    for (const name of tracks) {
      if (!MAP[name] || !W[MAP[name]]) continue;
      const sr = qmul(align, qmul(unturn, W[MAP[name]].r));
      const sRest = qmul(swing[name], qmul(align, restS[MAP[name]].r));
      delta[name] = qmul(sr, qinv(sRest));
    }
    for (const name of target.order) {
      const b = target.bones[name];
      const parentW = b.parent ? Wt[b.parent] : target.baseR;
      const restLocal = b.r;
      const d = clip.mirror ? (delta[swap(name)] ? reflect(delta[swap(name)]) : null) : delta[name];
      if (MAP[name] && d) Wt[name] = qnorm(qmul(d, restT[name].r));
      else Wt[name] = qmul(parentW, restLocal);
    }
    for (const name of tracks) {
      const b = target.bones[name];
      const parentW = b.parent ? Wt[b.parent] : target.baseR;
      let local = qnorm(qmul(qinv(parentW), Wt[name]));
      if (local[3] < 0) local = local.map((v) => -v);
      quats.push(...local);
    }
    // Hips: the source pelvis relative to its root, turned and scaled, then in the target pelvis parent's space.
    const rootT = W.root ? W.root.t : src.baseT;
    let p = qrot(align, qrot(unturn, sub(W.pelvis.t, rootT)));
    p = scale(p, hipK);
    if (clip.mirror) {
      const d = dot(p, side);
      p = sub(p, scale(side, 2 * d));
    }
    const parentName = target.bones.pelvis.parent;
    const parentWorld = parentName ? restT[parentName] : { r: target.baseR, t: target.baseT };
    const local = qrot(qinv(parentWorld.r), sub(add(p, parentName ? restT[parentName].t : target.baseT), parentWorld.t));
    hips.push(...local);
  }
  index.push({ name: clip.name, frames: frames.length, start, loop: !!clip.loop, fps: FPS, travel: travel.map((v) => +v.toFixed(3)) });
  console.log(clip.name.padEnd(14), frames.length, 'frames', 'heading', ((heading * 180) / Math.PI).toFixed(0) + '°', 'travel (left, forward) m/s', travel.map((v) => v.toFixed(2)).join(', '));
}

const q16 = new Int16Array(quats.length);
for (let i = 0; i < quats.length; i++) q16[i] = Math.round(Math.max(-1, Math.min(1, quats[i])) * 32767);
const h32 = new Float32Array(hips);
const bin = Buffer.concat([Buffer.from(q16.buffer), Buffer.from(h32.buffer)]);
writeFileSync(`${outPrefix}.bin`, bin);
writeFileSync(`${outPrefix}.json`, JSON.stringify({ bones: tracks, clips: index, quatBytes: q16.byteLength, hipBytes: h32.byteLength, rest: Object.fromEntries(tracks.map((n) => [n, target.bones[n].r.map((v) => +v.toFixed(6))])) }, null, 1));
console.log('wrote', `${outPrefix}.bin`, bin.length, 'bytes');
