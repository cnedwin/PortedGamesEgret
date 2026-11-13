// A person in 3D: a jointed figure in a sect's robe, moved by code.
//
// The figure is a small tree of joints (hips, chest, head, two arms with
// elbows, two legs with knees). An action is a function from time to joint
// angles; the figure eases towards whatever the action asks, so one action
// flows into the next. No animation files are loaded.
import { Object3D } from '@egret/engine/world3d';
import { BALL, BOX, ROD, SPIKE, TAPER, mix, model, shade } from './shapes.mjs';

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
 * actions without it repeat until another is asked for.
 */
const ACTIONS = {
  idle: { pose: (t) => ({ bob: Math.sin(t * 1.6) * 0.012, armL: 0.1 + Math.sin(t * 1.6) * 0.03, armR: 0.1 - Math.sin(t * 1.6) * 0.03 }) },
  walk: {
    pose(t) {
      const s = Math.sin(t * 7);
      return { legL: s * 0.6, legR: -s * 0.6, kneeL: Math.max(0, -s) * 0.7, kneeR: Math.max(0, s) * 0.7, armL: -s * 0.5, armR: s * 0.5, bob: Math.abs(Math.cos(t * 7)) * 0.03, lean: 0.06 };
    },
  },
  run: {
    pose(t) {
      const s = Math.sin(t * 11);
      return { legL: s * 0.95, legR: -s * 0.95, kneeL: Math.max(0, -s) * 1.2, kneeR: Math.max(0, s) * 1.2, armL: -s * 0.9, armR: s * 0.9, elbowL: 1.2, elbowR: 1.2, bob: Math.abs(Math.cos(t * 11)) * 0.06, lean: 0.28 };
    },
  },
  /** Ready to fight: knees bent, weapon hand forward. */
  guard: { pose: (t) => ({ legL: 0.35, legR: -0.3, kneeL: 0.4, kneeR: 0.35, bob: -0.07 + Math.sin(t * 3) * 0.01, armR: -0.9, elbowR: 0.9, armL: -0.5, elbowL: 1.3, twist: -0.25, lean: 0.08 }) },
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
  work: {
    pose(t) {
      const k = (Math.sin(t * 4) + 1) / 2;
      return { armR: -2.2 + k * 1.9, armL: -2.0 + k * 1.8, elbowR: 0.5, elbowL: 0.6, lean: 0.1 + k * 0.4, kneeL: 0.25, kneeR: 0.25, bob: -0.05 - k * 0.05 };
    },
  },
  /** Seated in meditation. */
  sit: { pose: (t) => ({ bob: -0.5 + Math.sin(t * 1.2) * 0.008, legL: -1.5, legR: -1.5, kneeL: 2.3, kneeR: 2.3, spreadL: 0.7, spreadR: 0.7, armL: -0.5, armR: -0.5, elbowL: 1.2, elbowR: 1.2, sideL: 0.25, sideR: 0.25 }) },
};
export const ACTION_NAMES = Object.keys(ACTIONS);

/** The strike that suits a class of martial art. */
export const STRIKE_OF = { fist: 'punch', palm: 'palm', leg: 'kick', point: 'point', saber: 'slash', sword: 'slash', spear: 'thrust', staff: 'sweep', dart: 'throw' };

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
    skin = shade(SKIN, 1 + vary(1) * 0.08),
    hair = rank >= 4 && !female ? 0xd8d8d8 : HAIR;
  const w = female ? 0.86 : 1,
    tall = 1 + vary(2) * 0.04;

  const node = new Object3D();
  const body = new Object3D();
  const chest = new Object3D();
  const head = new Object3D();
  node.addChild(body);
  body.setPosition(0, 0.92, 0);
  node.setScale(tall);

  // Hips and the skirt of the robe, which hides the tops of the legs.
  body.addChild(
    model([
      [TAPER, [0, -0.2, 0], [0.24 * w, 0.52, 0.2 * w], robe],
      [ROD, [0, 0.07, 0], [0.19 * w, 0.07, 0.15 * w], trim],
    ]),
  );
  body.addChild(chest);
  chest.setPosition(0, 0.1, 0);
  chest.addChild(
    model([
      [TAPER, [0, 0.22, 0], [0.2 * w, 0.44, 0.14 * w], robe, [Math.PI, 0, 0]],
      [BOX, [0, 0.27, 0.105 * w], [0.05, 0.3, 0.02], trim, [0, 0, 0.35]],
      [BOX, [0, 0.27, 0.105 * w], [0.05, 0.3, 0.02], trim, [0, 0, -0.35]],
      // A monk's sash runs from one shoulder to the opposite hip, front and back.
      ...(monk ? [[BOX, [0, 0.24, 0.1 * w], [0.44 * w, 0.09, 0.03], 0xb9502a, [0, 0, 0.75]], [BOX, [0, 0.24, -0.1 * w], [0.44 * w, 0.09, 0.03], 0xb9502a, [0, 0, -0.75]]] : []),
    ]),
  );
  chest.addChild(head);
  head.setPosition(0, 0.5, 0);
  const headParts = [
    [BALL, [0, 0.13, 0], [0.115, 0.13, 0.12], skin],
    [ROD, [0, 0, 0], [0.05, 0.08, 0.05], skin],
    [BALL, [0.045, 0.14, 0.105], [0.016, 0.02, 0.01], HAIR],
    [BALL, [-0.045, 0.14, 0.105], [0.016, 0.02, 0.01], HAIR],
  ];
  if (!monk) {
    headParts.push([BALL, [0, 0.17, -0.02], [0.125, 0.115, 0.13], hair]);
    if (female) headParts.push([BALL, [0, 0.02, -0.1], [0.09, 0.2, 0.06], hair], [BALL, [0, 0.31, -0.03], [0.05, 0.05, 0.05], hair], [ROD, [0, 0.31, -0.03], [0.008, 0.012, 0.16], 0xd9b04a, [0, 0, Math.PI / 2]]);
    else headParts.push([BALL, [0, 0.3, -0.02], [0.045, 0.055, 0.045], hair], [ROD, [0, 0.27, -0.02], [0.03, 0.03, 0.03], trim]);
    if (rank >= 4 && !female) headParts.push([SPIKE, [0, 0.0, 0.09], [0.05, 0.2, 0.03], 0xe4e4e4, [Math.PI, 0, 0]]);
  }
  head.addChild(model(headParts));

  // Arms: shoulder → upper arm → elbow → forearm and hand.
  const arm = (side) => {
    const shoulder = new Object3D(),
      elbow = new Object3D();
    chest.addChild(shoulder);
    shoulder.setPosition(side * 0.2 * w, 0.4, 0);
    shoulder.addChild(model([[TAPER, [0, -0.14, 0], [0.065, 0.3, 0.065], robe, [Math.PI, 0, 0]]]));
    shoulder.addChild(elbow);
    elbow.setPosition(0, -0.29, 0);
    elbow.addChild(
      model([
        [TAPER, [0, -0.12, 0], [0.085, 0.26, 0.085], robe],
        [ROD, [0, -0.25, 0], [0.088, 0.03, 0.088], trim],
        [BALL, [0, -0.3, 0], [0.042, 0.05, 0.042], skin],
      ]),
    );
    return { shoulder, elbow };
  };
  const armL = arm(1),
    armR = arm(-1);
  const grip = new Object3D();
  armR.elbow.addChild(grip);
  grip.setPosition(0, -0.31, 0.02);
  const blade = weaponParts(weapon);
  if (blade) grip.addChild(model(blade));

  // Legs: hip → thigh → knee → shin and boot.
  const leg = (side) => {
    const hip = new Object3D(),
      knee = new Object3D();
    body.addChild(hip);
    hip.setPosition(side * 0.09 * w, -0.02, 0);
    hip.addChild(model([[ROD, [0, -0.22, 0], [0.075, 0.44, 0.075], dark]]));
    hip.addChild(knee);
    knee.setPosition(0, -0.45, 0);
    knee.addChild(
      model([
        [ROD, [0, -0.2, 0], [0.062, 0.4, 0.062], dark],
        [BOX, [0, -0.42, 0.04], [0.1, 0.09, 0.22], 0x24201c],
      ]),
    );
    return { hip, knee };
  };
  const legL = leg(1),
    legR = leg(-1);

  const pose = { ...REST };
  const figure = {
    node,
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
    },
    get busy() {
      return ACTIONS[figure.action].length !== undefined && figure.time < ACTIONS[figure.action].length;
    },
    update(dt) {
      figure.time += dt;
      let action = ACTIONS[figure.action];
      if (action.length !== undefined && figure.time >= action.length && !action.stay) {
        figure.action = figure.base;
        figure.time = 0;
        action = ACTIONS[figure.action];
      }
      const target = { ...REST, ...action.pose(action.stay ? Math.min(figure.time, action.length) : figure.time) };
      // Ease every joint towards where the action wants it.
      const k = 1 - Math.exp(-dt * 18);
      for (const key in pose) pose[key] += (target[key] - pose[key]) * k;
      body.setPosition(0, 0.92 + pose.bob, 0);
      body.setRotation(pose.lean + pose.tilt, pose.twist, 0);
      chest.setRotation(pose.lean * 0.5, pose.twist * 0.6, 0);
      head.setRotation(pose.head - pose.lean * 0.6, pose.headTurn - pose.twist * 0.8, 0);
      armL.shoulder.setRotation(pose.armL, 0, pose.sideL);
      armR.shoulder.setRotation(pose.armR, 0, -pose.sideR);
      armL.elbow.setRotation(-pose.elbowL, 0, 0);
      armR.elbow.setRotation(-pose.elbowR, 0, 0);
      grip.setRotation(-1.35 + pose.wrist, 0, 0);
      legL.hip.setRotation(-pose.legL, 0, pose.spreadL);
      legR.hip.setRotation(-pose.legR, 0, -pose.spreadR);
      legL.knee.setRotation(pose.kneeL, 0, 0);
      legR.knee.setRotation(pose.kneeR, 0, 0);
    },
  };
  figure.update(0);
  return figure;
}
