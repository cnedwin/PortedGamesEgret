// The skeleton every figure shares: each joint's parent and where it sits on that parent, and the pose
// the figures were sculpted in (arms held a little out, legs a little apart) so that cloth and limbs
// come apart cleanly when they move.

export const JOINTS = {
  hips: ['root', 0, 0.94, 0],
  spine: ['hips', 0, 0.06, 0],
  head: ['spine', 0, 0.56, 0],
  armL: ['spine', 0.21, 0.46, 0],
  foreL: ['armL', 0, -0.29, 0],
  off: ['foreL', 0, -0.26, 0],
  armR: ['spine', -0.21, 0.46, 0],
  foreR: ['armR', 0, -0.29, 0],
  hand: ['foreR', 0, -0.26, 0],
  legL: ['hips', 0.1, 0, 0],
  shinL: ['legL', 0, -0.45, 0],
  legR: ['hips', -0.1, 0, 0],
  shinR: ['legR', 0, -0.45, 0],
  cloak: ['spine', 0, 0.47, -0.13],
  weapon: ['spine', 0, 0, 0]
};
// Keep these indices stable for the unmodified characters and older model packs.
export const BASE_BONES = Object.keys(JOINTS);

const offset = (point, origin) => point.map((value, axis) => value - origin[axis]);
export const ANKLE_DEPTH = -0.404;
export const HANDS = {};
for (const [suffix, side] of [['L', 1], ['R', -1]]) {
  JOINTS['foot' + suffix] = ['shin' + suffix, 0, ANKLE_DEPTH, 0];
  const wrist = [0, -0.258, 0],
    palm = 'palm' + suffix,
    fingers = [];
  JOINTS[palm] = ['fore' + suffix, ...wrist];
  for (let i = 0; i < 4; i++) {
    const z = 0.03 - i * 0.0195,
      length = [1, 1.08, 1, 0.82][i],
      radius = [0.0088, 0.009, 0.0086, 0.0076][i],
      points = [
        [side * 0.006, -0.326, z],
        [-side * 0.012 * length, -0.326 - 0.034 * length, z],
        [-side * 0.034 * length, -0.326 - 0.036 * length, z],
        [-side * 0.04 * length, -0.326 - 0.014 * length, z]
      ];
    fingers.push({ radius, points, joints: addDigit(palm, 'finger' + suffix + i, wrist, points) });
  }
  const thumbPoints = [[-side * 0.012, -0.276, 0.034], [-side * 0.03, -0.304, 0.046], [-side * 0.044, -0.33, 0.036]];
  const thumb = { points: thumbPoints, joints: addDigit(palm, 'thumb' + suffix, wrist, thumbPoints) };
  HANDS[suffix] = { palm, wrist, side, fingers, thumb, grip: offset([-side * 0.027, -0.327, 0.002], wrist) };
}

function addDigit(palm, prefix, wrist, points) {
  const names = [];
  for (let i = 0; i < points.length - 1; i++) {
    const name = prefix + '_' + i;
    JOINTS[name] = [names.at(-1) ?? palm, ...offset(points[i], i ? points[i - 1] : wrist)];
    names.push(name);
  }
  return names;
}

/** The order bones are numbered in for skinning. */
export const BONES = Object.keys(JOINTS);
// The yard's weapons need palm and ankle motion, with a smaller palette than Lin Chong's fingers.
export const YARD_BONES = [...BASE_BONES, 'footL', 'footR', 'palmL', 'palmR'];
export const YARD_GRIPS = {
  shield: [-0.018, 0.015, -0.045],
  bow: [0, 0, 0.22],
  bowTipZ: -0.04,
  bowHalfHeight: 0.64
};
/** Rotation about z of the joints that are not straight in the sculpted pose. */
export const BIND = { armL: 0.6, armR: -0.6, legL: 0.09, legR: -0.09 };
