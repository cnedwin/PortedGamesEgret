// The war horse as the picture shows it: a rigged, generated model (barding, saddle and bridle are part of it) whose
// legs are moved here by gait — a four-beat walk, a two-beat trot and a gallop, each with its own footfalls, stride
// and swing — with the body pitching and rising over them, the head nodding, rearing when struck hard, and falling
// when killed. It reads the fight's horse each frame and never changes it. `seat()` tells the rider where the saddle is.
import { Mesh3D, Object3D } from '@egret/engine/world3d';
import { axisAngle, qinv, qmul, qrot } from './rig.mjs';
import { createHorseIdlePitch } from './locomotion-blend.mjs';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** Model units: the horse stands 0.84 tall to the top of its plume and faces −Z. */
const MODEL = { height: 0.84, seat: [0, 0.6, 0.1] };
/** Metres from the ground to the top of the plume. */
export const HORSE_HEIGHT = 1.9;

// Each leg from the hip down: the bones that swing it, and where in the stride cycle it is (0..1) for each gait.
const LEGS = [
  { name: 'foreL', bones: ['tripo::0_Left_Limb_0', 'tripo::0_Left_Limb_1', 'tripo::0_Left_Limb_2'], fore: true },
  { name: 'foreR', bones: ['tripo::0_Right_Limb_0', 'tripo::0_Right_Limb_1', 'tripo::0_Right_Limb_2'], fore: true },
  { name: 'hindL', bones: ['bone_17', 'tripo::1_Left_Limb_0', 'tripo::1_Left_Limb_1'], fore: false },
  { name: 'hindR', bones: ['bone_20', 'tripo::1_Right_Limb_0'], fore: false }
];
// Footfalls: when in the cycle each leg leaves the ground. Walk: four beats. Trot: diagonal pairs. Gallop: rotary.
const GAITS = {
  walk: { foreL: 0.25, foreR: 0.75, hindL: 0.0, hindR: 0.5, stride: 1.7, swing: 0.32, flex: 0.55, pitch: 0.012, bob: 0.012 },
  trot: { foreL: 0.0, foreR: 0.5, hindL: 0.5, hindR: 0.0, stride: 2.7, swing: 0.42, flex: 0.85, pitch: 0.02, bob: 0.035 },
  gallop: { foreL: 0.58, foreR: 0.68, hindL: 0.0, hindR: 0.1, stride: 4.6, swing: 0.62, flex: 1.05, pitch: 0.085, bob: 0.06 }
};

/**
 * A horse in `world`: `body` is the loaded model (its scene). `update(horse, dt, stun)` follows the fight's horse;
 * `seat()` gives the saddle's place and heading in the world for the rider.
 */
export function createHorse({ body, world }) {
  const holder = new Object3D();
  holder.name = 'horse';
  const inner = new Object3D();
  holder.addChild(inner);
  inner.addChild(body.scene);
  world.addChild(holder);
  const scale = HORSE_HEIGHT / MODEL.height;
  inner.setScale(scale, scale, scale);
  // The model faces −Z; the fight's heading 0 is +Z.
  inner.setRotation(0, Math.PI, 0);
  body.scene.traverse((n) => {
    if (n instanceof Mesh3D) {
      n.castShadow = true;
      n.receiveShadow = true;
      n.frustumCulled = false;
    }
  });
  const nodes = new Map();
  body.scene.traverse((n) => n.name && nodes.set(n.name, n));
  // Rest turns, and each bone's parent turn in the model's own space, so a swing about the model's side-to-side axis
  // can be written into each bone's local turn.
  const rest = new Map(),
    axisIn = new Map();
  const worldTurn = (node) => {
    let q = [0, 0, 0, 1];
    const chain = [];
    for (let n = node; n && n !== body.scene; n = n.parent) chain.unshift(n);
    for (const n of chain) q = qmul(q, Array.from(n.quaternion));
    return q;
  };
  const side = [1, 0, 0];
  for (const leg of LEGS)
    for (const name of leg.bones) {
      const node = nodes.get(name);
      if (!node) continue;
      rest.set(name, Array.from(node.quaternion));
      axisIn.set(name, qrot(qinv(worldTurn(node.parent)), side));
    }
  const spine = ['tripo::Spine_0', 'tripo::Spine_1', 'tripo::Spine_2', 'tripo::Spine_3'].map((n) => nodes.get(n)).filter(Boolean);
  const neck = nodes.get('tripo::Head_0'),
    root = nodes.get('tripo::Root');
  for (const n of [...spine, neck, root].filter(Boolean)) {
    rest.set(n.name, Array.from(n.quaternion));
    axisIn.set(n.name, qrot(qinv(worldTurn(n.parent)), side));
  }
  const rootRest = root ? Array.from(root.position) : [0, 0, 0];

  const turnBone = (name, angle) => {
    const node = nodes.get(name),
      q0 = rest.get(name),
      axis = axisIn.get(name);
    if (!node || !q0) return;
    const q = qmul(axisAngle(axis, angle), q0);
    node.setQuaternion(q[0], q[1], q[2], q[3]);
  };

  const idleHead = createHorseIdlePitch();
  const state = { phase: 0, mix: { walk: 1, trot: 0, gallop: 0 }, rein: 0, rear: 0, fall: 0, fallSide: 1, lean: 0 };

  /** The swing and bend of one leg at a point in its cycle: forward and back, the lower joints folding as it lifts. */
  function legAt(leg, gait, amount) {
    const g = GAITS[gait];
    const u = (state.phase - g[leg.name] + 1) % 1;
    // A third of the cycle in the air for a walk, half for a trot or a gallop.
    const air = gait === 'walk' ? 0.36 : 0.48;
    let swing, lift;
    if (u < air) {
      const k = u / air;
      swing = -1 + 2 * ease(k);
      lift = Math.sin(k * Math.PI);
    } else {
      const k = (u - air) / (1 - air);
      swing = 1 - 2 * k;
      lift = 0;
    }
    return { swing: swing * g.swing * amount, lift: lift * g.flex * amount };
  }

  return {
    holder,
    /** Follow the fight's horse for one frame. `stun` is its rider's stagger (a rear), if any. */
    update(h, dt, { rearing = false } = {}) {
      const pace = h.speed ?? 0;
      const speed = Math.abs(pace);
      // Which gait, by pace: walk below 3 m/s, trot to 6.5, gallop above.
      const want = { walk: speed < 3 ? 1 : 0, trot: speed >= 3 && speed < 6.6 ? 1 : 0, gallop: speed >= 6.6 ? 1 : 0 };
      for (const k of Object.keys(state.mix)) state.mix[k] += (want[k] - state.mix[k]) * (1 - Math.exp(-dt * 6));
      const stride = GAITS.walk.stride * state.mix.walk + GAITS.trot.stride * state.mix.trot + GAITS.gallop.stride * state.mix.gallop;
      const moving = clamp(speed / 0.6, 0, 1);
      // Keep walking in reverse while the horse faces forward. Shorter steps and a tucked head show rein pressure.
      state.rein += (clamp(-pace / 0.48, 0, 1) - state.rein) * (1 - Math.exp(-dt * 8));
      const phase = state.phase + dt * pace / stride;
      state.phase = phase - Math.floor(phase);
      // Legs: the gaits blended by weight.
      for (const leg of LEGS) {
        let swing = 0,
          lift = 0;
        for (const gait of ['walk', 'trot', 'gallop']) {
          const w = state.mix[gait];
          if (w < 0.01) continue;
          const l = legAt(leg, gait, moving);
          swing += l.swing * w;
          lift += l.lift * w;
        }
        const [hip, knee, foot] = leg.bones;
        // Fore legs fold at the knee backward; hind legs at the hock forward.
        turnBone(hip, swing * (1 - 0.16 * state.rein));
        if (knee) turnBone(knee, leg.fore ? -lift * 0.9 : lift * 0.7);
        if (foot) turnBone(foot, leg.fore ? lift * 0.7 : -lift * 0.5);
      }
      // The body over the legs: a gallop rocks it, every gait lifts it twice a stride.
      const g = state.mix;
      const pitchAmp = GAITS.walk.pitch * g.walk + GAITS.trot.pitch * g.trot + GAITS.gallop.pitch * g.gallop;
      const bobAmp = GAITS.walk.bob * g.walk + GAITS.trot.bob * g.trot + GAITS.gallop.bob * g.gallop;
      const rock = Math.sin(state.phase * Math.PI * 2) * pitchAmp * moving;
      const bob = Math.abs(Math.sin(state.phase * Math.PI * 2)) * bobAmp * moving;
      // A hard blow makes it rear; a killed horse goes down on its side.
      state.rear += ((rearing ? 1 : 0) - state.rear) * (1 - Math.exp(-dt * (rearing ? 7 : 4)));
      if (!h.alive) state.fall = Math.min(1, state.fall + dt * 1.4);
      if (root) {
        const p = [rootRest[0], rootRest[1] + bob / scale, rootRest[2]];
        root.setPosition(p[0], p[1], p[2]);
      }
      turnBone('tripo::Spine_0', -rock * 0.5);
      // The idle breath lives only on the head bone; the saddle/body transforms stay authored by the gait.
      const breath = idleHead(speed, h.alive, rearing || state.rear > .02, dt);
      turnBone('tripo::Head_0', rock * 1.6 + Math.sin(state.phase * Math.PI * 4) * 0.03 * moving + state.rear * 0.35 - state.rein * 0.09 + breath);
      // The whole horse: heading, the rear (up about the hind feet), the fall (over onto its side).
      const yaw = h.face ?? 0;
      const rearAngle = ease(state.rear) * 0.55 + rock * 0.4;
      const fallAngle = ease(state.fall) * 1.45;
      const q = qmul(qmul(axisAngle([0, 1, 0], yaw), axisAngle([1, 0, 0], -rearAngle)), axisAngle([0, 0, 1], fallAngle * state.fallSide));
      holder.setQuaternion(q[0], q[1], q[2], q[3]);
      // Rearing lifts it about the hind feet, which stand about a metre behind the middle.
      const back = 1.0;
      // Down on its side its barrel lies about half its width off the ground.
      holder.setPosition(h.x - Math.sin(yaw) * back * (1 - Math.cos(rearAngle)), Math.sin(rearAngle) * back + Math.sin(fallAngle) * 0.42, h.z - Math.cos(yaw) * back * (1 - Math.cos(rearAngle)));
      state.yaw = yaw;
      state.lean = rock;
    },
    /** The saddle's seat: its place in the world and the horse's heading, for the rider. */
    seat() {
      const spineNode = spine[2] ?? spine[0];
      const at = spineNode ? spineNode.localToWorld([0, 0, 0], [0, 0, 0]) : holder.position;
      // The bone runs along the back below the saddle; the seat is a little above it and a hand forward.
      const yaw = state.yaw ?? 0;
      return { at: [at[0] + Math.sin(yaw) * 0.08, at[1] + 0.06 * scale, at[2] + Math.cos(yaw) * 0.08], lean: state.lean, rear: state.rear, fall: state.fall };
    },
    dispose() {
      holder.removeFromParent();
    }
  };
}
