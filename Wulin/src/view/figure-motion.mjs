import { createAnimationClip3D, quatFromEuler } from '@egret/engine/world3d';

const REST = {
  lean: 0, twist: 0, tilt: 0, balance: 0, bob: 0, shift: 0, reach: 0,
  head: 0, headTurn: 0, armL: .08, armR: .1, sideL: .12, sideR: .12,
  shoulderTurnL: 0, shoulderTurnR: 0, elbowL: .22, elbowR: .24,
  legL: 0, legR: 0, kneeL: 0, kneeR: 0, spreadL: .04, spreadR: .04,
  wrist: 0, wristTurn: 0, wristRoll: 0, clothFront: 0, clothBack: 0, clothTurn: 0,
};
const GUARD = {
  ...REST, lean: .12, twist: -.27, balance: .04, bob: -.032, reach: .015, headTurn: .06,
  armL: -.91, armR: -.76, sideL: .28, sideR: .25, elbowL: .73, elbowR: 1.26,
  legL: .34, legR: -.32, kneeL: .41, kneeR: .16, spreadL: .21, spreadR: .20, wrist: 4.17,
};
const TAU = 2 * Math.PI;
const ease = (t) => t * t * (3 - 2 * t);
const poseKeys = Object.keys(REST);

/** Keys are complete silhouettes built from a common stance, with eased joint motion between them. */
function keyed(length, stance, frames, extras) {
  const keys = frames.map(([at, pose]) => [at, { ...stance, ...pose }]);
  return {
    length, ...extras,
    pose(t) {
      let next = 1;
      while (next < keys.length - 1 && t > keys[next][0]) next++;
      const [start, from] = keys[next - 1];
      const [end, to] = keys[next];
      const blend = ease(Math.max(0, Math.min(1, (t - start) / (end - start))));
      return Object.fromEntries(poseKeys.map(key => [key, from[key] + (to[key] - from[key]) * blend]));
    },
  };
}

/** A brief load, a fast contact, and the slower shape the audience sees after contact. */
function strike(length, contact, load, impact, follow) {
  return keyed(length, GUARD, [[0, {}], [contact * .55, load], [contact, impact],
    [contact + (length - contact) * .42, follow], [length, {}]], { contact });
}

const actions = {
  idle: { period: TAU / 1.6, pose(t) {
    const breath = Math.sin(t * 1.6);
    return { bob: breath * .008, armL: .08 + breath * .025, armR: .1 - breath * .025, clothBack: breath * .025 };
  } },
  walk: { period: TAU / 7, pose(t) {
    const stride = Math.sin(t * 7), hips = Math.cos(t * 7);
    return { legL: stride * .52, legR: -stride * .52, kneeL: Math.max(0, -stride) * .68,
      kneeR: Math.max(0, stride) * .68, armL: -stride * .43, armR: stride * .43,
      bob: -.015 + Math.abs(hips) * .018, lean: .075, twist: -stride * .12, balance: hips * .036,
      clothFront: hips * .075, clothBack: -hips * .11, clothTurn: stride * .07 };
  } },
  run: { period: TAU / 10, pose(t) {
    const stride = Math.sin(t * 10), hips = Math.cos(t * 10);
    return { legL: stride * .9, legR: -stride * .9,
      kneeL: .13 + Math.max(0, -stride) * 1.08, kneeR: .13 + Math.max(0, stride) * 1.08,
      armL: -.28 - stride * .76, armR: -.25 + stride * .72, elbowL: 1.06, elbowR: .98,
      sideL: .23, sideR: .25, wrist: 4.05, bob: -.09 + Math.abs(hips) * .067,
      lean: .39 + hips * .05, twist: -stride * .26, balance: hips * .06,
      clothFront: .17 + hips * .105, clothBack: .25 - hips * .18, clothTurn: -stride * .15 };
  } },
  guard: { period: TAU / 2.7, pose(t) {
    const breath = Math.sin(t * 2.7);
    return { ...GUARD, bob: GUARD.bob + breath * .01, armL: GUARD.armL + breath * .03,
      balance: GUARD.balance + breath * .025, clothFront: breath * .035, clothBack: -breath * .046 };
  } },

  // Saber: a deep back load opens into a heavy, hip-led horizontal cut.
  slash: strike(.62, .20,
    { lean: -.08, twist: .95, balance: -.12, bob: -.065, armR: -.56, sideR: 1.25, shoulderTurnR: -.36,
      elbowR: 1.08, armL: -.83, elbowL: .67, wrist: 4.61, wristTurn: .9, clothBack: -.19, clothTurn: -.25 },
    { lean: .34, twist: -.56, balance: .14, reach: .12, bob: -.09, armR: -1.61, sideR: -.78, shoulderTurnR: .34,
      elbowR: .28, armL: -.39, sideL: .65, elbowL: 1.3, wrist: 4.30, wristTurn: -.26, wristRoll: -.16,
      legL: .66, kneeL: .72, legR: -.48, kneeR: .2, clothFront: -.22, clothBack: .42, clothTurn: .38 },
    { lean: .28, twist: -.82, balance: .21, reach: .11, bob: -.09, armR: -.92, sideR: -.85,
      shoulderTurnR: .31, armL: -.4, sideL: .54, elbowR: .58, wrist: 4.21, wristTurn: -.45,
      legL: .58, kneeL: .63, legR: -.36, clothFront: .11, clothBack: .22, clothTurn: .33 }),
  // Sword: a high point and quick diagonal draw, leaving the off hand extended for balance.
  sword: strike(.62, .17,
    { lean: -.06, twist: .28, balance: -.11, armR: -1.9, sideR: .44, elbowR: .99, wrist: 4.14,
      armL: -.32, sideL: .72, elbowL: .37, legL: .29, kneeL: .43, clothFront: -.11, clothBack: .08 },
    { lean: .32, twist: .34, balance: -.18, reach: .14, bob: -.076, armR: -1.56, sideR: .31, elbowR: .13,
      shoulderTurnR: -.26, wrist: 4.62, wristTurn: -.39, wristRoll: .38, armL: -.03, sideL: .91, elbowL: .15,
      legL: .59, kneeL: .52, legR: -.39, kneeR: .12, clothFront: -.17, clothBack: .24, clothTurn: -.19 },
    { lean: .19, twist: .62, balance: -.21, reach: .11, bob: -.061, armR: -.91, sideR: .93, elbowR: .32,
      wrist: 4.40, wristTurn: -.62, armL: .31, sideL: .81, elbowL: .41, legL: .48, kneeL: .49, clothBack: .37, clothTurn: -.25 }),
  // Spear: the back hand chambers while the front arm guides the point down the centre line.
  thrust: strike(.60, .18,
    { lean: -.09, twist: -.46, bob: -.07, reach: -.085, armR: -.48, elbowR: 1.61, sideR: .26,
      armL: -1.38, elbowL: .51, sideL: -.18, wrist: 4.51, wristTurn: .25, legR: -.42, kneeR: .38, clothBack: -.12 },
    { lean: .49, twist: -.06, reach: .2, bob: -.109, armR: -1.59, elbowR: .13, sideR: -.26,
      armL: -1.54, elbowL: .23, sideL: -.24, wrist: 4.12, wristTurn: -.1,
      legL: .73, kneeL: .74, legR: -.49, kneeR: .12, clothFront: -.24, clothBack: .38 },
    { lean: .27, twist: -.15, reach: .11, bob: -.08, armR: -1.15, elbowR: .52, sideR: -.09,
      armL: -1.36, elbowL: .44, sideL: -.13, wrist: 4.30, legL: .56, kneeL: .55, clothBack: .25 }),
  // Staff: a crouched circular sweep with the whole shoulder line rotating over the lead knee.
  sweep: strike(.66, .21,
    { lean: .18, twist: .83, balance: -.22, bob: -.12, armR: -.78, sideR: .98, shoulderTurnR: -.67, elbowR: .47,
      armL: -1.19, sideL: -.41, elbowL: 1.19, wrist: 4.37, wristTurn: 1.14,
      legL: .47, kneeL: .64, legR: -.44, kneeR: .46, clothTurn: -.32 },
    { lean: .4, twist: -.72, balance: .24, reach: .1, bob: -.152, armR: -1.24, sideR: -.71, shoulderTurnR: .54,
      armL: -1.23, sideL: .31, elbowL: .58, elbowR: .38, wrist: 3.88, wristTurn: -.88, wristRoll: -.34,
      legL: .63, kneeL: .89, legR: -.51, kneeR: .38, clothFront: -.31, clothBack: .37, clothTurn: .58 },
    { lean: .24, twist: -1.03, balance: .22, bob: -.13, armR: -1.0, sideR: -.66, armL: -.47, sideL: .54,
      elbowR: .57, elbowL: .7, wrist: 4.36, wristTurn: -.98, legL: .53, kneeL: .66, clothBack: .28, clothTurn: .41 }),
  punch: strike(.42, .13,
    { lean: -.11, twist: .43, balance: -.08, reach: -.065, armR: .3, sideR: .24, elbowR: 1.7,
      armL: -1.08, sideL: .23, elbowL: .61, legR: -.36, kneeR: .36, clothBack: -.12 },
    { lean: .34, twist: .46, balance: -.09, reach: .105, bob: -.065, armR: -1.56, sideR: .05, elbowR: .09,
      armL: -.35, sideL: .34, elbowL: 1.54, legL: .51, kneeL: .55, legR: -.4, clothFront: -.16, clothBack: .19 },
    { lean: .22, twist: .34, reach: .071, armR: -1.19, elbowR: .42, armL: -.35, elbowL: 1.33, clothBack: .24 }),
  palm: strike(.55, .19,
    { lean: -.15, twist: .02, bob: -.061, reach: -.072, armL: -.32, armR: -.34, elbowL: 1.58, elbowR: 1.58,
      sideL: .46, sideR: .46, legR: -.43, kneeR: .32, clothFront: .15, clothBack: -.14 },
    { lean: .44, twist: -.04, reach: .155, bob: -.098, armL: -1.52, armR: -1.55, elbowL: .12, elbowR: .14,
      sideL: .15, sideR: .1, legL: .6, kneeL: .68, legR: -.45, clothFront: -.23, clothBack: .31 },
    { lean: .3, twist: .03, reach: .105, bob: -.073, armL: -1.32, armR: -1.38, elbowL: .34, elbowR: .41,
      sideL: .26, sideR: .25, legL: .52, kneeL: .54, clothBack: .22 }),
  kick: strike(.55, .20,
    { lean: -.15, twist: -.21, balance: .22, shift: .075, bob: -.07, legL: .13, kneeL: .29,
      legR: 1.36, kneeR: 1.65, spreadR: .32, armL: -.81, sideL: .56, elbowL: .68,
      armR: .25, sideR: .64, elbowR: .82, clothFront: -.34, clothTurn: .18 },
    { lean: -.45, twist: .35, balance: .24, shift: .11, reach: .11, bob: -.01,
      legL: .16, kneeL: .2, legR: 1.65, kneeR: .17, spreadR: .17, armL: -.79, sideL: .74, elbowL: .7,
      armR: .41, sideR: .62, elbowR: .65, clothFront: -.51, clothBack: .31, clothTurn: .26 },
    { lean: -.18, twist: .15, balance: .11, shift: .065, bob: -.035, legL: .12, kneeL: .25,
      legR: 1.0, kneeR: 1.39, armL: -.65, sideL: .55, armR: -.07, sideR: .34, clothFront: -.28, clothBack: .16 }),
  point: strike(.36, .12,
    { lean: -.02, twist: -.37, armR: -.92, sideR: .31, elbowR: 1.44, wrist: 4.26,
      armL: -.9, sideL: .29, elbowL: 1.12, clothFront: .08 },
    { lean: .27, twist: .29, reach: .1, bob: -.036, armR: -1.62, sideR: -.07, elbowR: .16, wrist: 4.30,
      armL: -.43, sideL: .22, elbowL: 1.26, legL: .46, kneeL: .47, clothFront: -.14, clothBack: .17 },
    { lean: .13, twist: .1, reach: .055, armR: -1.11, elbowR: .86, wrist: 4.29, clothBack: .14 }),
  throw: strike(.50, .17,
    { lean: -.14, twist: .76, balance: -.18, armR: -.55, sideR: 1.12, elbowR: 1.53, wrist: 4.30, wristTurn: .74,
      armL: -1.1, elbowL: .42, legR: -.47, kneeR: .29, reach: -.095, clothBack: -.2, clothTurn: -.3 },
    { lean: .34, twist: -.18, balance: .15, reach: .115, armR: -1.69, sideR: -.32, elbowR: .16,
      wrist: 4.12, wristTurn: -.36, armL: -.2, sideL: .61, legL: .54, kneeL: .59, clothFront: -.25, clothBack: .32, clothTurn: .22 },
    { lean: .32, twist: -.44, balance: .16, reach: .08, armR: -.91, sideR: -.57,
      elbowR: .36, wrist: 3.98, armL: -.34, sideL: .63, clothBack: .27, clothTurn: .29 }),
  mend: strike(.66, .23,
    { lean: -.06, twist: 0, bob: -.053, armL: -.78, armR: -.79, sideL: -.38, sideR: -.42,
      elbowL: 1.45, elbowR: 1.45, head: .15, clothFront: .11 },
    { lean: .11, twist: .05, reach: .06, armL: -1.45, armR: -1.36, sideL: .4, sideR: .31,
      elbowL: .29, elbowR: .41, head: -.07, clothFront: -.12, clothBack: .2 },
    { lean: .04, twist: -.07, armL: -1.24, armR: -1.14, sideL: .28, sideR: .18, elbowL: .55, elbowR: .66, clothBack: .14 }),

  hit: keyed(.30, GUARD, [[0, {}],
    [.064, { lean: -.49, twist: -.36, balance: .16, reach: -.13, bob: -.044,
      head: -.27, armL: -.4, sideL: .55, elbowL: .84, armR: .04, sideR: .55, elbowR: .66,
      legL: .21, legR: -.46, kneeR: .4, clothFront: .27, clothBack: -.28 }],
    [.15, { lean: -.22, twist: -.5, balance: .12, reach: -.11, bob: -.079,
      head: .08, armL: -.88, sideL: .5, armR: -.51, sideR: .44, kneeL: .6, clothFront: .18, clothBack: -.11 }],
    [.30, {}]]),
  evade: keyed(.31, GUARD, [[0, {}],
    [.11, { lean: -.27, twist: -.67, balance: -.27, shift: .13, reach: -.085, bob: -.065,
      armL: -.77, sideL: .37, armR: -.45, sideR: .45, headTurn: .4, clothTurn: -.35, clothBack: -.18 }],
    [.31, {}]]),
  down: keyed(.70, GUARD, [[0, {}],
    [.14, { lean: -.24, twist: .39, balance: -.21, reach: -.13, bob: -.11, head: -.2, armL: -.45, sideL: .76,
      armR: .22, sideR: .55, legL: .13, legR: -.37, kneeL: .59, kneeR: .71, clothBack: -.2 }],
    [.37, { tilt: -.79, twist: .38, balance: -.14, reach: -.22, bob: -.5, head: .13, wrist: 3.86,
      armL: .21, sideL: .64, elbowL: .47, armR: .72, sideR: .95, elbowR: .52,
      legL: .41, kneeL: .63, legR: -.15, kneeR: .52, clothFront: .29, clothBack: -.34 }],
    [.55, { tilt: -1.53, twist: .30, balance: -.07, reach: -.28, bob: -.72, head: .09, wrist: 3.63,
      armL: .31, sideL: .83, elbowL: .35, armR: .72, sideR: 1.01, elbowR: .48,
      legL: .13, kneeL: .27, legR: -.01, kneeR: .16, clothFront: .21, clothBack: -.07 }],
    [.70, { tilt: -1.49, twist: .31, balance: -.05, reach: -.29, bob: -.73, head: .11, wrist: 3.54,
      armL: .31, sideL: .85, elbowL: .35, armR: .73, sideR: 1.04, elbowR: .42,
      legL: .14, kneeL: .26, legR: -.025, kneeR: .15, clothFront: .18, clothBack: -.02 }]], { stay: true }),
  work: { period: TAU / 4, pose(t) {
    const k = (Math.sin(t * 4) + 1) / 2;
    return { armR: -2.2 + k * 1.9, armL: -2.0 + k * 1.8, elbowR: .5, elbowL: .6, lean: .1 + k * .4,
      kneeL: .25, kneeR: .25, bob: -.05 - k * .05 };
  } },
  sit: { period: TAU / 1.2, pose: (t) => ({ bob: -.5 + Math.sin(t * 1.2) * .008, legL: -1.5, legR: -1.5,
    kneeL: 2.3, kneeR: 2.3, spreadL: .7, spreadR: .7, armL: -.5, armR: -.5,
    elbowL: 1.2, elbowR: 1.2, sideL: .25, sideR: .25 }) },
};

export const ACTIONS = actions;
export const ACTION_NAMES = Object.keys(actions);
export const STRIKE_OF = { fist: 'punch', palm: 'palm', leg: 'kick', point: 'point', saber: 'slash', sword: 'sword',
  spear: 'thrust', staff: 'sweep', dart: 'throw' };
export const STRIKE_CONTACT = Object.fromEntries(Object.entries(actions).filter(([, action]) => action.contact)
  .map(([name, action]) => [name, action.contact]));
export const FADE = .10;
export const ACTION_FADE = { ...Object.fromEntries(Object.keys(STRIKE_CONTACT).map(name => [name, .06])), hit: .045, evade: .06, down: .08 };

const RATE = 48;
const clips = new Map();
/** Bake each action once for all figures. Its final frame holds while the mixer transitions out. */
export function clipOf(name) {
  if (clips.has(name)) return clips.get(name);
  const action = actions[name], span = action.length ?? action.period;
  const duration = span + (action.length === undefined ? 0 : .22);
  const count = Math.ceil(duration * RATE), times = [], turns = {}, hips = [], q = new Float32Array(4);
  const turn = (bone, x, y, z) => (turns[bone] ??= []).push(...quatFromEuler(q, x, y, z));
  for (let k = 0; k <= count; k++) {
    const t = k * duration / count;
    times.push(t);
    const pose = { ...REST, ...action.pose(Math.min(t, span)) };
    hips.push(pose.shift, .92 + pose.bob, pose.reach);
    turn('hips', pose.lean * .36 + pose.tilt, pose.twist * .54, pose.balance * .56);
    turn('chest', pose.lean * .72, pose.twist * .53, pose.balance * .49);
    turn('head', pose.head - pose.lean * .58, pose.headTurn - pose.twist * .78, -pose.balance * .49);
    turn('shoulderL', pose.armL, pose.shoulderTurnL, pose.sideL);
    turn('shoulderR', pose.armR, pose.shoulderTurnR, -pose.sideR);
    turn('elbowL', -pose.elbowL, 0, 0);
    turn('elbowR', -pose.elbowR, 0, 0);
    turn('grip', -1.35 + pose.wrist, pose.wristTurn, pose.wristRoll);
    turn('legL', -pose.legL, 0, pose.spreadL);
    turn('legR', -pose.legR, 0, -pose.spreadR);
    turn('kneeL', pose.kneeL, 0, 0);
    turn('kneeR', pose.kneeR, 0, 0);
    turn('clothFront', pose.clothFront, pose.clothTurn * -.52, pose.balance * -.42);
    turn('clothBack', pose.clothBack, pose.clothTurn, pose.balance * .36);
  }
  const clip = createAnimationClip3D({ name, tracks: [
    { targetName: 'hips', path: 'position', times, values: hips },
    ...Object.entries(turns).map(([targetName, values]) => ({ targetName, path: 'quaternion', times, values })),
  ] });
  clips.set(name, clip);
  return clip;
}
