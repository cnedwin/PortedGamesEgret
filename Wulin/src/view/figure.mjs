// A person in 3D: one skinned body in a sect's robe on a skeleton of twelve
// bones (hips, chest, head, two arms with elbows, two legs with knees, and
// the grip of the weapon hand).
//
// The body, its sleeves, skirt and legs are a single surface whose points
// follow the bones nearest them, so cloth bends at the waist, elbows and
// knees and the skirt swings with the legs. The head, hands, feet, weapon
// and ornaments are rigid pieces carried by their bones.
//
// An action is written as a function from time to joint angles and is baked
// once into an animation clip; a figure plays clips through a mixer, which
// fades one into the next. No model or animation files are loaded.
import { AnimationMixer3D, Attribute3D, Bone3D, Mesh3D, Skeleton3D, Object3D, createAnimationClip3D, createGeometry3D, quatFromEuler } from '@egret/engine/world3d';
import { BALL, BOX, ROD, SPIKE, TOON, mix, model, rgb, shade } from './shapes.mjs';

const SKIN = 0xf2cfa8,
  HAIR = 0x1d1a1a,
  STEEL = 0xcfd3da,
  WOOD = 0x7a4f2a,
  WHITE = 0xf5f1e6;

/** Joint angles (radians) of a figure standing at ease. */
const REST = {
  lean: 0, twist: 0, bob: 0, tilt: 0,
  head: 0, headTurn: 0,
  armL: 0.1, armR: 0.1, sideL: 0.12, sideR: 0.12, elbowL: 0.25, elbowR: 0.25,
  legL: 0, legR: 0, kneeL: 0, kneeR: 0, spreadL: 0.04, spreadR: 0.04,
  wrist: 0,
};

const ease = (t) => t * t * (3 - 2 * t);
/** 0 → 1 → 0 over the action, peaking at `peak`. */
const swing = (t, peak = 0.45) => (t < peak ? ease(t / peak) : ease(1 - (t - peak) / (1 - peak)));

/**
 * The actions. Each takes the seconds since it began and returns the joints
 * that differ from standing at ease. `length` is how long a one-off lasts;
 * actions without it repeat every `period` seconds until another is asked for.
 */
const ACTIONS = {
  idle: { period: (Math.PI * 2) / 1.6, pose: (t) => ({ bob: Math.sin(t * 1.6) * 0.012, armL: 0.1 + Math.sin(t * 1.6) * 0.03, armR: 0.1 - Math.sin(t * 1.6) * 0.03 }) },
  walk: { period: (Math.PI * 2) / 7,
    pose(t) {
      const s = Math.sin(t * 7);
      return { legL: s * 0.6, legR: -s * 0.6, kneeL: Math.max(0, -s) * 0.7, kneeR: Math.max(0, s) * 0.7, armL: -s * 0.5, armR: s * 0.5, bob: Math.abs(Math.cos(t * 7)) * 0.03, lean: 0.06 };
    },
  },
  run: { period: (Math.PI * 2) / 11,
    pose(t) {
      const s = Math.sin(t * 11);
      return { legL: s * 0.95, legR: -s * 0.95, kneeL: Math.max(0, -s) * 1.2, kneeR: Math.max(0, s) * 1.2, armL: -s * 0.9, armR: s * 0.9, elbowL: 1.2, elbowR: 1.2, bob: Math.abs(Math.cos(t * 11)) * 0.06, lean: 0.28 };
    },
  },
  /** Ready to fight: knees bent, weapon hand forward. */
  guard: { period: (Math.PI * 2) / 3, pose: (t) => ({ legL: 0.35, legR: -0.3, kneeL: 0.4, kneeR: 0.35, bob: -0.07 + Math.sin(t * 3) * 0.01, armR: -0.9, elbowR: 0.9, armL: -0.5, elbowL: 1.3, twist: -0.25, lean: 0.08 }) },
  /** A downward cut with a blade. */
  slash: {
    length: 0.62,
    pose(t) {
      const k = swing(t / 0.62, 0.38), wind = t < 0.24 ? ease(t / 0.24) : 1;
      return { armR: -2.7 * wind + 2.6 * (t > 0.24 ? ease(Math.min(1, (t - 0.24) / 0.2)) : 0), elbowR: 0.5 - k * 0.3, sideR: 0.3, twist: 0.5 - 1.0 * (t > 0.24 ? ease(Math.min(1, (t - 0.24) / 0.2)) : 0), lean: 0.1 + k * 0.25, legL: 0.5, kneeL: 0.5, legR: -0.4, bob: -0.08, wrist: -0.6 * k, armL: 0.5 };
    },
  },
  /** A straight lunge with a pole arm. */
  thrust: {
    length: 0.6,
    pose(t) {
      const k = swing(t / 0.6, 0.45);
      return { armR: -1.2 - k * 0.5, armL: -1.3 - k * 0.3, elbowR: 1.3 - k * 1.2, elbowL: 1.1 - k * 0.9, lean: 0.05 + k * 0.4, legL: 0.3 + k * 0.5, kneeL: 0.3 + k * 0.5, legR: -0.3 - k * 0.3, twist: -0.5 + k * 0.4, bob: -0.06 - k * 0.08 };
    },
  },
  /** A wide sweep with a staff. */
  sweep: {
    length: 0.66,
    pose(t) {
      const k = t / 0.66;
      return { twist: 1.2 - ease(k) * 2.6, armR: -1.4, armL: -1.3, elbowR: 0.5, elbowL: 0.6, sideR: 0.4, lean: 0.15, legL: 0.4, kneeL: 0.5, legR: -0.4, kneeR: 0.3, bob: -0.12 };
    },
  },
  punch: {
    length: 0.42,
    pose(t) {
      const k = swing(t / 0.42, 0.4);
      return { armR: -1.5 * k - 0.4, elbowR: 1.6 - k * 1.5, armL: -0.6 + k * 0.5, elbowL: 1.5, twist: -0.4 + k * 0.9, lean: 0.1 + k * 0.15, legL: 0.4, kneeL: 0.45, legR: -0.35, bob: -0.08 };
    },
  },
  /** An open-hand push with both palms. */
  palm: {
    length: 0.55,
    pose(t) {
      const k = swing(t / 0.55, 0.5);
      return { armR: -0.5 - k * 1.1, armL: -0.5 - k * 1.1, elbowR: 1.7 - k * 1.6, elbowL: 1.7 - k * 1.6, lean: -0.1 + k * 0.35, legL: 0.45, kneeL: 0.5, legR: -0.4, bob: -0.1 };
    },
  },
  kick: {
    length: 0.55,
    pose(t) {
      const k = swing(t / 0.55, 0.45);
      return { legR: -1.7 * k, kneeR: 1.4 * (1 - k) * (t < 0.3 ? 1 : 0.4), lean: -0.3 * k, armL: -0.8, armR: 0.6, elbowL: 1.2, elbowR: 0.8, kneeL: 0.25, bob: -0.03 };
    },
  },
  /** A jab with two fingers or a stylus. */
  point: {
    length: 0.36,
    pose(t) {
      const k = swing(t / 0.36, 0.4);
      return { armR: -1.45 * k - 0.3, elbowR: 1.4 - k * 1.35, sideR: -0.1, twist: -0.2 + k * 0.5, lean: 0.12 + k * 0.12, legL: 0.35, kneeL: 0.35, legR: -0.3, bob: -0.05, armL: 0.5, elbowL: 1.4 };
    },
  },
  /** An overarm throw. */
  throw: {
    length: 0.5,
    pose(t) {
      const wind = t < 0.2 ? ease(t / 0.2) : 1, out = t > 0.2 ? ease(Math.min(1, (t - 0.2) / 0.15)) : 0;
      return { armR: 1.0 * wind - 2.6 * out, elbowR: 1.5 - out * 1.3, twist: 0.6 * wind - 1.0 * out, lean: -0.1 * wind + 0.3 * out, legL: 0.35, kneeL: 0.3, legR: -0.3, armL: -0.7, bob: -0.04 };
    },
  },
  /** Struck: a flinch backwards. */
  hit: { length: 0.3, pose: (t) => ({ lean: -0.35 * swing(t / 0.3, 0.3), head: -0.3 * swing(t / 0.3, 0.3), armL: 0.6, armR: 0.5, bob: -0.04, twist: 0.2 }) },
  /** Down and out; the figure stays where it falls. */
  down: {
    length: 0.7, stay: true,
    pose(t) {
      const k = ease(Math.min(1, t / 0.7));
      return { tilt: -1.5 * k, bob: -0.72 * k, armL: 1.2 * k, armR: 0.9 * k, sideL: 0.8 * k, sideR: 0.9 * k, kneeL: 0.3 * k, legR: 0.2 * k, head: 0.2 * k };
    },
  },
  /** Swinging a tool: mining, hoeing, forging. */
  work: { period: (Math.PI * 2) / 4,
    pose(t) {
      const k = (Math.sin(t * 4) + 1) / 2;
      return { armR: -2.2 + k * 1.9, armL: -2.0 + k * 1.8, elbowR: 0.5, elbowL: 0.6, lean: 0.1 + k * 0.4, kneeL: 0.25, kneeR: 0.25, bob: -0.05 - k * 0.05 };
    },
  },
  /** Seated in meditation. */
  sit: { period: (Math.PI * 2) / 1.2, pose: (t) => ({ bob: -0.5 + Math.sin(t * 1.2) * 0.008, legL: -1.5, legR: -1.5, kneeL: 2.3, kneeR: 2.3, spreadL: 0.7, spreadR: 0.7, armL: -0.5, armR: -0.5, elbowL: 1.2, elbowR: 1.2, sideL: 0.25, sideR: 0.25 }) },
};
export const ACTION_NAMES = Object.keys(ACTIONS);

/** The strike that suits a class of martial art. */
export const STRIKE_OF = { fist: 'punch', palm: 'palm', leg: 'kick', point: 'point', saber: 'slash', sword: 'slash', spear: 'thrust', staff: 'sweep', dart: 'throw' };

/** How long one action takes to give way to the next. */
const FADE = 0.12;
const RATE = 30;
const clips = new Map();
/**
 * The clip for an action: its joint angles sampled thirty times a second and
 * written as a turn for every bone and a height for the hips. Baked the first
 * time the action is wanted and shared by every figure.
 */
function clipOf(name) {
  if (clips.has(name)) return clips.get(name);
  const action = ACTIONS[name],
    // A one-off is held a little past its end, so that it is still playing when the next action fades in.
    span = action.length ?? action.period,
    count = Math.ceil((span + (action.length === undefined ? 0 : 0.3)) * RATE);
  const times = [],
    turns = {},
    heights = [],
    q = new Float32Array(4);
  const turn = (bone, x, y, z) => (turns[bone] ??= []).push(...quatFromEuler(q, x, y, z));
  for (let k = 0; k <= count; k++) {
    const t = action.length === undefined ? (k / count) * span : k / RATE;
    times.push(t);
    const pose = { ...REST, ...action.pose(Math.min(t, span)) };
    heights.push(0, 0.92 + pose.bob, 0);
    turn('hips', pose.lean + pose.tilt, pose.twist, 0);
    turn('chest', pose.lean * 0.5, pose.twist * 0.6, 0);
    turn('head', pose.head - pose.lean * 0.6, pose.headTurn - pose.twist * 0.8, 0);
    turn('shoulderL', pose.armL, 0, pose.sideL);
    turn('shoulderR', pose.armR, 0, -pose.sideR);
    turn('elbowL', -pose.elbowL, 0, 0);
    turn('elbowR', -pose.elbowR, 0, 0);
    turn('grip', -1.35 + pose.wrist, 0, 0);
    turn('legL', -pose.legL, 0, pose.spreadL);
    turn('legR', -pose.legR, 0, -pose.spreadR);
    turn('kneeL', pose.kneeL, 0, 0);
    turn('kneeR', pose.kneeR, 0, 0);
  }
  const clip = createAnimationClip3D({ name, tracks: [{ targetName: 'hips', path: 'position', times, values: heights }, ...Object.entries(turns).map(([targetName, values]) => ({ targetName, path: 'quaternion', times, values }))] });
  clips.set(name, clip);
  return clip;
}

/** The weapon carried in the right hand, by slot. The grip is at the origin and the weapon points up. */
function weaponParts(slot) {
  if (slot === 'sword') return [[BOX, [0, 0.5, 0], [0.035, 0.8, 0.012], STEEL], [BOX, [0, 0.08, 0], [0.16, 0.025, 0.03], 0xb08a2e], [ROD, [0, 0, 0], [0.018, 0.16, 0.018], 0x3a2418]];
  if (slot === 'saber') return [[BOX, [0, 0.46, 0.02], [0.02, 0.72, 0.085], STEEL], [BOX, [0, 0.82, 0.045], [0.02, 0.1, 0.05], STEEL, [0.5, 0, 0]], [ROD, [0, 0.08, 0], [0.05, 0.02, 0.05], 0xb08a2e], [ROD, [0, 0, 0], [0.02, 0.18, 0.02], 0x3a2418]];
  if (slot === 'spear') return [[ROD, [0, 0.55, 0], [0.018, 2.0, 0.018], WOOD], [SPIKE, [0, 1.68, 0], [0.04, 0.26, 0.014], STEEL], [BALL, [0, 1.5, 0], [0.06, 0.05, 0.06], 0xc0282a]];
  if (slot === 'staff') return [[ROD, [0, 0.45, 0], [0.022, 1.9, 0.022], WOOD], [ROD, [0, 1.36, 0], [0.027, 0.1, 0.027], 0xb08a2e], [ROD, [0, -0.46, 0], [0.027, 0.1, 0.027], 0xb08a2e]];
  if (slot === 'stylus') return [[ROD, [0, 0.12, 0], [0.012, 0.3, 0.012], 0x2c2c34], [SPIKE, [0, 0.31, 0], [0.012, 0.08, 0.012], STEEL]];
  if (slot === 'dart') return [[SPIKE, [0, 0.07, 0], [0.02, 0.14, 0.006], STEEL]];
  return null;
}

/**
 * Builds a figure.
 * @param options.color   the sect's colour, 0xRRGGBB
 * @param options.female  a slimmer build and a longer robe
 * @param options.rank    0 to 5; higher ranks wear trim, elders a white beard or a hairpin
 * @param options.weapon  the weapon slot carried, or null
 * @param options.monk    a shaven head and a kasaya
 * @param options.seed    varies height, skin and hair a little
 */
export function createFigure({ color = 0x5b6c8a, female = false, rank = 1, weapon = null, monk = false, seed = 1 } = {}) {
  const vary = (n) => (((seed * 9301 + n * 49297) % 233280) / 233280) * 2 - 1;
  const robe = rank === 0 ? mix(color, 0x9a9484, 0.6) : color,
    dark = shade(robe, 0.62),
    trim = rank >= 3 ? 0xd9b04a : rank >= 2 ? WHITE : shade(robe, 1.35),
    skinTone = shade(SKIN, 1 + vary(1) * 0.08),
    hair = rank >= 4 && !female ? 0xd8d8d8 : HAIR;
  const w = female ? 0.86 : 1,
    tall = 1 + vary(2) * 0.04;

  const node = new Object3D();
  // ---- the skeleton, standing at ease with its arms hanging -------------------------------------------------
  const bones = [];
  const bone = (name, parent, x, y, z) => {
    const made = new Bone3D();
    made.name = name;
    made.setPosition(x, y, z);
    made.index = bones.length;
    bones.push(made);
    parent?.addChild(made);
    return made;
  };
  const body = bone('hips', null, 0, 0.92, 0),
    chest = bone('chest', body, 0, 0.1, 0),
    head = bone('head', chest, 0, 0.5, 0);
  const armL = { shoulder: bone('shoulderL', chest, 0.2 * w, 0.4, 0) },
    armR = { shoulder: bone('shoulderR', chest, -0.2 * w, 0.4, 0) };
  armL.elbow = bone('elbowL', armL.shoulder, 0, -0.29, 0);
  armR.elbow = bone('elbowR', armR.shoulder, 0, -0.29, 0);
  const grip = bone('grip', armR.elbow, 0, -0.31, 0.02);
  const legL = { hip: bone('legL', body, 0.09 * w, -0.02, 0) },
    legR = { hip: bone('legR', body, -0.09 * w, -0.02, 0) };
  legL.knee = bone('kneeL', legL.hip, 0, -0.45, 0);
  legR.knee = bone('kneeR', legR.hip, 0, -0.45, 0);

  // ---- the skin: tubes of rings, each point weighted to the bones it follows --------------------------------
  const skin = { p: [], n: [], c: [], j: [], w: [], i: [] };
  const AROUND = 12;
  /**
   * Adds a tube to the skin. A ring is [x, y, z, radiusX, radiusZ, colour, weights]; the colour may be a
   * function of the angle round the ring (0 at the front), and the weights a function of how far to the
   * left a point is, from -1 to 1. Weights are [[bone, share], ...]. `closed` caps the two ends.
   */
  const tube = (rings, closed = true) => {
    const start = skin.p.length / 3;
    rings.forEach(([x, y, z, rx, rz, colour, weights], r) => {
      for (let k = 0; k < AROUND; k++) {
        const angle = (k / AROUND) * Math.PI * 2,
          sx = Math.sin(angle),
          cz = Math.cos(angle);
        skin.p.push(x + sx * rx, y, z + cz * rz);
        // Outward, and tipped up or down where the tube widens or narrows.
        const before = rings[Math.max(0, r - 1)],
          after = rings[Math.min(rings.length - 1, r + 1)],
          slope = after[1] === before[1] ? 0 : -(after[3] - before[3]) / (after[1] - before[1]);
        const nx = sx / Math.max(rx, 0.001),
          nz = cz / Math.max(rz, 0.001),
          flat = Math.hypot(nx, nz) || 1,
          length = Math.hypot(1, slope);
        skin.n.push(nx / flat / length, slope / length, nz / flat / length);
        skin.c.push(...rgb(typeof colour === 'function' ? colour(angle > Math.PI ? angle - Math.PI * 2 : angle) : colour));
        const shares = (typeof weights === 'function' ? weights(sx) : weights).filter(([, share]) => share > 0.001).slice(0, 4),
          total = shares.reduce((sum, [, share]) => sum + share, 0);
        for (let q = 0; q < 4; q++) skin.j.push(shares[q]?.[0].index ?? 0), skin.w.push((shares[q]?.[1] ?? 0) / total);
        if (r) {
          const a = start + (r - 1) * AROUND + k,
            b = start + (r - 1) * AROUND + ((k + 1) % AROUND),
            c = a + AROUND,
            d = b + AROUND;
          // Rings may be listed upwards or downwards; the faces look outwards either way.
          if (rings[r][1] >= rings[r - 1][1]) skin.i.push(a, b, c, b, d, c);
          else skin.i.push(a, c, b, b, c, d);
        }
      }
    });
    if (!closed) return;
    for (const r of [0, rings.length - 1]) {
      const [x, y, z, , , colour, weights] = rings[r],
        centre = skin.p.length / 3,
        up = (r === 0) === rings[0][1] > rings[rings.length - 1][1];
      skin.p.push(x, y, z);
      skin.n.push(0, up ? 1 : -1, 0);
      skin.c.push(...rgb(typeof colour === 'function' ? colour(0) : colour));
      const shares = typeof weights === 'function' ? weights(0) : weights,
        total = shares.reduce((sum, [, share]) => sum + share, 0);
      for (let q = 0; q < 4; q++) skin.j.push(shares[q]?.[0].index ?? 0), skin.w.push((shares[q]?.[1] ?? 0) / total);
      for (let k = 0; k < AROUND; k++) {
        const a = start + r * AROUND + k,
          b = start + r * AROUND + ((k + 1) % AROUND);
        if (up) skin.i.push(centre, a, b);
        else skin.i.push(centre, b, a);
      }
    }
  };
  const sash = rank >= 4 ? 0x7a2f28 : rank >= 2 ? shade(robe, 0.5) : 0x4a4038;
  // The trunk, from under the sash to the base of the neck; the waist turns between hips and chest.
  tube([
    [0, 0.93, 0, 0.165 * w, 0.135 * w, robe, [[body, 1]]],
    [0, 0.99, 0, 0.15 * w, 0.118 * w, robe, [[body, 0.75], [chest, 0.25]]],
    [0, 1.05, 0, 0.148 * w, 0.112 * w, robe, [[body, 0.4], [chest, 0.6]]],
    [0, 1.12, 0, 0.16 * w, 0.126 * w, robe, [[body, 0.1], [chest, 0.9]]],
    [0, 1.28, 0, 0.188 * w, 0.137 * w, robe, [[chest, 1]]],
    [0, 1.41, 0, 0.2 * w, 0.14 * w, robe, [[chest, 1]]],
    [0, 1.46, 0, 0.13 * w, 0.105 * w, robe, [[chest, 1]]],
    [0, 1.49, 0, 0.07, 0.066, WHITE, [[chest, 1]]],
  ]);
  // The skirt of the robe: held at the hips, and lower down drawn along by whichever leg is nearer.
  // A paler panel runs down its front.
  const panel = (angle) => (Math.abs(angle) < 0.62 ? shade(robe, 1.18) : robe);
  const drawn = (legs) => (side) => {
    const left = Math.max(0, Math.min(1, 0.5 + side * 0.9));
    return [[body, 1 - legs], [legL.hip, legs * left], [legR.hip, legs * (1 - left)]];
  };
  tube(
    [
      [0, 1.0, 0, 0.158 * w, 0.126 * w, robe, [[body, 1]]],
      [0, 0.9, 0, 0.19 * w, 0.158 * w, panel, drawn(0.15)],
      [0, 0.78, 0, 0.215 * w, 0.178 * w, panel, drawn(0.5)],
      [0, 0.64, 0, 0.238 * w, 0.196 * w, panel, drawn(0.72)],
      [0, 0.52, 0, 0.256 * w, 0.21 * w, panel, drawn(0.82)],
      [0, 0.5, 0, 0.262 * w, 0.215 * w, (angle) => (Math.abs(angle) < 0.62 ? trim : dark), drawn(0.84)],
      [0, 0.46, 0, 0.268 * w, 0.22 * w, (angle) => (Math.abs(angle) < 0.62 ? trim : dark), drawn(0.86)],
      [0, 0.47, 0, 0.2 * w, 0.16 * w, shade(dark, 0.6), drawn(0.86)],
    ],
    false,
  );
  // Arms: the upper arm, an elbow that bends, and a wide sleeve open at the wrist over a bound forearm.
  for (const { shoulder, elbow, x } of [{ ...armL, x: 0.2 * w }, { ...armR, x: -0.2 * w }]) {
    const wrap = rank <= 1 ? 0x4a4038 : WHITE;
    tube([
      [x, 1.45, 0, 0.05, 0.05, robe, [[chest, 0.5], [shoulder, 0.5]]],
      [x, 1.42, 0, 0.074, 0.074, robe, [[chest, 0.3], [shoulder, 0.7]]],
      [x, 1.34, 0, 0.07, 0.07, robe, [[shoulder, 1]]],
      [x, 1.2, 0, 0.064, 0.064, robe, [[shoulder, 1]]],
      [x, 1.165, 0, 0.064, 0.064, robe, [[shoulder, 0.75], [elbow, 0.25]]],
      [x, 1.13, 0, 0.066, 0.066, robe, [[shoulder, 0.5], [elbow, 0.5]]],
      [x, 1.095, 0, 0.068, 0.068, robe, [[shoulder, 0.25], [elbow, 0.75]]],
      [x, 1.0, 0, 0.082, 0.082, robe, [[elbow, 1]]],
      [x, 0.89, 0, 0.098, 0.098, robe, [[elbow, 1]]],
      [x, 0.885, 0, 0.102, 0.102, trim, [[elbow, 1]]],
      [x, 0.86, 0, 0.104, 0.104, trim, [[elbow, 1]]],
      [x, 0.87, 0, 0.045, 0.045, shade(dark, 0.6), [[elbow, 1]]],
      [x, 0.87, 0, 0.04, 0.04, wrap, [[elbow, 1]]],
      [x, 0.81, 0, 0.036, 0.036, wrap, [[elbow, 1]]],
    ]);
  }
  // Legs: trousers to the knee, gathered into a tall boot.
  for (const { hip, knee, x } of [{ ...legL, x: 0.09 * w }, { ...legR, x: -0.09 * w }]) {
    tube([
      [x, 0.93, 0, 0.074, 0.074, dark, [[body, 0.5], [hip, 0.5]]],
      [x, 0.84, 0, 0.076, 0.076, dark, [[hip, 1]]],
      [x, 0.56, 0, 0.07, 0.07, dark, [[hip, 1]]],
      [x, 0.5, 0, 0.068, 0.068, dark, [[hip, 0.75], [knee, 0.25]]],
      [x, 0.45, 0, 0.07, 0.07, dark, [[hip, 0.5], [knee, 0.5]]],
      [x, 0.4, 0, 0.068, 0.068, dark, [[hip, 0.25], [knee, 0.75]]],
      [x, 0.27, 0, 0.064, 0.064, dark, [[knee, 1]]],
      [x, 0.265, 0, 0.066, 0.068, trim, [[knee, 1]]],
      [x, 0.24, 0, 0.066, 0.068, trim, [[knee, 1]]],
      [x, 0.235, 0, 0.06, 0.063, 0x2a2420, [[knee, 1]]],
      [x, 0.05, 0, 0.056, 0.06, 0x2a2420, [[knee, 1]]],
    ]);
  }
  const geometry = createGeometry3D({ positions: skin.p, normals: skin.n, colors: skin.c, indices: skin.i });
  geometry.setAttribute('joints', new Attribute3D(new Uint16Array(skin.j), 4));
  geometry.setAttribute('weights', new Attribute3D(new Float32Array(skin.w), 4));
  const mesh = new Mesh3D(geometry, TOON);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  node.addChild(mesh);
  mesh.addChild(body);
  mesh.updateWorldMatrices();
  mesh.bind(new Skeleton3D(bones));
  node.setScale(tall);

  // ---- rigid pieces, each carried by one bone ---------------------------------------------------------------
  const hipParts = [
    [ROD, [0, 0.07, 0], [0.2 * w, 0.085, 0.16 * w], sash],
    [BALL, [0.06 * w, 0.06, 0.155 * w], [0.035, 0.03, 0.02], sash],
    [BOX, [0.05 * w, -0.08, 0.17 * w], [0.028, 0.24, 0.01], sash, [-0.06, 0, 0.1]],
    [BOX, [0.085 * w, -0.06, 0.17 * w], [0.028, 0.2, 0.01], sash, [-0.06, 0, -0.14]],
  ];
  if (rank >= 2) hipParts.push([ROD, [-0.08 * w, -0.03, 0.17 * w], [0.004, 0.12, 0.004], 0xb08a2e], [BALL, [-0.08 * w, -0.11, 0.172 * w], [0.026, 0.032, 0.01], 0x8fc7a0], [SPIKE, [-0.08 * w, -0.19, 0.172 * w], [0.012, 0.09, 0.008], 0xc0282a, [Math.PI, 0, 0]]);
  // Whoever fights with a blade carries its scabbard at the hip.
  if (weapon === 'sword' || weapon === 'saber') hipParts.push([BOX, [0.2 * w, -0.12, -0.04], [0.03, 0.62, 0.05], 0x2c2420, [0.5, 0, 0.12]], [BOX, [0.2 * w, 0.13, 0.09], [0.034, 0.05, 0.054], 0xb08a2e, [0.5, 0, 0.12]]);
  body.addChild(model(hipParts));
  const chestParts = [
    // The robe crosses left over right, with the white of an inner collar showing at the neck.
    [BOX, [0.03, 0.25, 0.129 * w], [0.05, 0.3, 0.012], trim, [-0.05, 0, 0.38]],
    [BOX, [-0.03, 0.25, 0.126 * w], [0.05, 0.3, 0.012], shade(trim, 0.85), [-0.05, 0, -0.38]],
    // A monk's sash runs from one shoulder to the opposite hip, front and back.
    ...(monk ? [[BOX, [0, 0.24, 0.128 * w], [0.3 * w, 0.09, 0.014], 0xb9502a, [0, 0, 0.75]], [BOX, [0, 0.24, -0.128 * w], [0.3 * w, 0.09, 0.014], 0xb9502a, [0, 0, -0.75]], [ROD, [0, 0.4, 0.02], [0.13, 0.03, 0.11], 0x5a3a22]] : []),
  ];
  // Elders wear a sleeveless over-robe; the head of a sect a cloak that falls to the calves.
  if (rank >= 4 && !monk) chestParts.push([BOX, [0.13 * w, 0.2, 0.09 * w], [0.07, 0.42, 0.02], dark], [BOX, [-0.13 * w, 0.2, 0.09 * w], [0.07, 0.42, 0.02], dark], [BOX, [0, 0.2, -0.125 * w], [0.36 * w, 0.44, 0.02], dark]);
  if (rank >= 5) chestParts.push([BOX, [0, -0.12, -0.2 * w], [0.44 * w, 1.05, 0.02], shade(robe, 0.45), [0.13, 0, 0]], [BOX, [0, 0.4, -0.13 * w], [0.4 * w, 0.06, 0.06], 0xd9b04a]);
  chest.addChild(model(chestParts));
  const headParts = [
    [BALL, [0, 0.13, 0], [0.112, 0.128, 0.118], skinTone],
    [BALL, [0, 0.075, 0.02], [0.09, 0.085, 0.095], skinTone],
    [ROD, [0, 0, 0], [0.05, 0.08, 0.05], skinTone],
    // Eyes with brows over them, a nose, a mouth and ears.
    [BALL, [0.045, 0.14, 0.105], [0.017, 0.016, 0.01], 0x1a1614],
    [BALL, [-0.045, 0.14, 0.105], [0.017, 0.016, 0.01], 0x1a1614],
    [BOX, [0.046, 0.168, 0.106], [0.04, 0.008, 0.01], hair, [0, 0, female ? 0.08 : -0.16]],
    [BOX, [-0.046, 0.168, 0.106], [0.04, 0.008, 0.01], hair, [0, 0, female ? -0.08 : 0.16]],
    [SPIKE, [0, 0.105, 0.118], [0.014, 0.045, 0.02], shade(skinTone, 0.93)],
    [BOX, [0, 0.066, 0.108], [0.034, 0.007, 0.008], female ? 0xc4605a : shade(skinTone, 0.7)],
    [BALL, [0.112, 0.125, 0], [0.014, 0.03, 0.022], skinTone],
    [BALL, [-0.112, 0.125, 0], [0.014, 0.03, 0.022], skinTone],
  ];
  if (!monk) {
    // Hair over the crown and down behind the ears, with locks at the temples.
    headParts.push([BALL, [0, 0.175, -0.02], [0.124, 0.112, 0.13], hair], [BOX, [0.1, 0.1, -0.02], [0.02, 0.13, 0.07], hair], [BOX, [-0.1, 0.1, -0.02], [0.02, 0.13, 0.07], hair], [BALL, [0, 0.215, 0.085], [0.09, 0.03, 0.04], hair]);
    if (female) {
      // Long hair down the back, a knot on the crown with a pin through it, and a flower at the temple.
      headParts.push([BALL, [0, -0.02, -0.105], [0.085, 0.24, 0.055], hair], [BALL, [0, 0.31, -0.03], [0.055, 0.05, 0.055], hair], [BALL, [0.05, 0.28, -0.05], [0.04, 0.04, 0.04], hair], [ROD, [0, 0.31, -0.03], [0.007, 0.01, 0.2], 0xd9b04a, [0, 0, Math.PI / 2]], [BALL, [0.105, 0.2, 0.05], [0.022, 0.022, 0.014], rank >= 3 ? 0xd9b04a : 0xe7a3a8]);
      if (rank >= 3) headParts.push([SPIKE, [0.11, 0.13, 0.05], [0.008, 0.07, 0.008], 0xd9b04a, [Math.PI, 0, 0]]);
    } else {
      // A topknot bound with a band whose two ends hang behind; elders pin theirs with a small crown.
      headParts.push([BALL, [0, 0.3, -0.02], [0.045, 0.058, 0.045], hair], [ROD, [0, 0.265, -0.02], [0.034, 0.03, 0.034], rank >= 4 ? 0xd9b04a : trim], [BOX, [0.02, 0.17, -0.135], [0.022, 0.2, 0.008], rank >= 4 ? 0xd9b04a : trim, [0.2, 0, 0.1]], [BOX, [-0.02, 0.16, -0.135], [0.022, 0.22, 0.008], rank >= 4 ? 0xd9b04a : trim, [0.2, 0, -0.1]]);
      if (rank >= 4) headParts.push([SPIKE, [0, 0.0, 0.09], [0.05, 0.22, 0.03], 0xe4e4e4, [Math.PI, 0, 0]], [BOX, [0.03, 0.078, 0.11], [0.04, 0.012, 0.01], 0xe4e4e4, [0, 0, -0.5]], [BOX, [-0.03, 0.078, 0.11], [0.04, 0.012, 0.01], 0xe4e4e4, [0, 0, 0.5]], [ROD, [0, 0.33, -0.02], [0.006, 0.008, 0.13], 0xd9b04a, [0, 0, Math.PI / 2]]);
      // The lowest ranks tie a cloth round the brow instead.
      else if (rank <= 1) headParts.push([ROD, [0, 0.195, 0], [0.118, 0.022, 0.124], shade(robe, 0.7)]);
    }
  } else headParts.push([BALL, [0, 0.21, 0.04], [0.01, 0.006, 0.01], 0x9a6a50], [BALL, [0.03, 0.215, 0.02], [0.01, 0.006, 0.01], 0x9a6a50], [BALL, [-0.03, 0.215, 0.02], [0.01, 0.006, 0.01], 0x9a6a50]);
  head.addChild(model(headParts));
  for (const arm of [armL, armR]) arm.elbow.addChild(model([[BALL, [0, -0.3, 0], [0.04, 0.05, 0.034], skinTone], [BOX, [0, -0.34, 0.006], [0.05, 0.035, 0.022], skinTone]]));
  const blade = weaponParts(weapon);
  if (blade) grip.addChild(model(blade));
  // A boot with a pale sole and an upturned toe.
  for (const leg of [legL, legR]) leg.knee.addChild(model([[BOX, [0, -0.42, 0.04], [0.1, 0.075, 0.22], 0x2a2420], [BOX, [0, -0.462, 0.04], [0.105, 0.02, 0.23], 0xd8cfb8], [SPIKE, [0, -0.4, 0.15], [0.04, 0.05, 0.03], 0x2a2420, [0.9, 0, 0]]]));

  // ---- playing clips ----------------------------------------------------------------------------------------
  const mixer = new AnimationMixer3D(node);
  let playing = null;
  const start = (name) => {
    const spec = ACTIONS[name],
      next = mixer.clipAction(clipOf(name));
    next.loop = spec.length === undefined ? 'repeat' : 'once';
    next.clampWhenFinished = true;
    if (!playing || playing === next || playing.paused) {
      // Nothing to fade from, the same action again, or one that has ended and is held: begin at once.
      if (playing && playing !== next) playing.stop();
      next.reset().play();
    } else playing.crossFadeTo(next, FADE);
    playing = next;
  };
  const figure = {
    node,
    /** The skinned body and the bones under it, for anything that wants to look. */
    mesh,
    bones,
    action: 'idle',
    time: 0,
    /** Another action to return to when a one-off finishes. */
    base: 'idle',
    /** Starts an action. One-off actions return to the base action when done. */
    play(name, { base } = {}) {
      if (!ACTIONS[name]) return;
      if (base) figure.base = base;
      if (figure.action === 'down' && name !== 'idle' && name !== 'guard') return;
      if (ACTIONS[name].length === undefined) figure.base = name;
      figure.action = name;
      figure.time = 0;
      start(name);
    },
    get busy() {
      return ACTIONS[figure.action].length !== undefined && figure.time < ACTIONS[figure.action].length;
    },
    update(dt) {
      figure.time += dt;
      const action = ACTIONS[figure.action];
      if (action.length !== undefined && figure.time >= action.length && !action.stay) {
        figure.action = figure.base;
        figure.time = 0;
        start(figure.action);
      }
      mixer.update(dt);
    },
  };
  start('idle');
  mixer.update(0);
  return figure;
}
