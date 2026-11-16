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
/** The order bones are numbered in for skinning. */
export const BONES = Object.keys(JOINTS);
/** Rotation about z of the joints that are not straight in the sculpted pose. */
export const BIND = { armL: 0.6, armR: -0.6, legL: 0.09, legR: -0.09 };
