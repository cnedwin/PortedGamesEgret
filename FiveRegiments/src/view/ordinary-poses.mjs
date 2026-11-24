import { axisAngle, qrot } from './rig.mjs';

/**
 * Chamber and follow-through poses in shoulder-centred body space: +x is the
 * wielder's left, +y is up, and +z is forward. The spine turns separately.
 */
function key(hand, blade, { t = 0, n = 0, d = 0, f = 0 } = {}, bodyHand = true) {
  const untwist = axisAngle([0, 1, 0], -t);
  return { r: bodyHand ? qrot(untwist, hand) : hand, b: qrot(untwist, blade), t, n, d, f };
}

const CHAMBER_AND_FINISH = {
  // A lifted sabre and a broad diagonal finish, with the shield still ahead.
  sabre: {
    R: [key([-0.37, 0.16, 0.19], [-0.87, 0.44, 0.26], { t: -0.43, n: -0.035 }),
      key([0.10, -0.22, 0.33], [0.88, -0.30, 0.38], { t: 0.44, n: 0.16 })],
    L: [key([-0.025, 0.18, 0.29], [0.82, 0.52, 0.25], { t: 0.42, n: -0.035 }),
      key([-0.39, -0.24, 0.27], [-0.91, -0.22, 0.34], { t: -0.38, n: 0.13 })],
    O: [key([-0.23, 0.38, 0.21], [-0.16, 0.92, -0.35], { t: -0.16, n: -0.1 }),
      key([-0.19, -0.31, 0.27], [0.11, -0.65, 0.76], { t: 0.12, n: 0.24, d: 0.026 })],
    T: [key([-0.31, -0.24, 0.15], [0.17, 0.16, 0.97], { t: -0.27, n: -0.03 }),
      key([-0.22, -0.16, 0.31], [0.13, 0.06, 0.98], { t: 0.05, n: 0.08, f: 0.035 })]
  },
  // Flat, extended sword draws and sharper exits, with a level point on the thrust.
  jian: {
    R: [key([-0.45, 0.06, 0.25], [-0.96, 0.23, 0.12], { t: -0.38, n: -0.025 }),
      key([0.14, -0.08, 0.36], [0.94, -0.10, 0.31], { t: 0.45, n: 0.08 })],
    L: [key([0.08, 0.11, 0.37], [0.95, 0.27, 0.16], { t: 0.49, n: -0.03 }),
      key([-0.41, -0.11, 0.25], [-0.93, -0.13, 0.34], { t: -0.44, n: 0.075 })],
    O: [key([-0.31, 0.36, 0.25], [0.20, 0.91, -0.35], { t: -0.20, n: -0.085 }),
      key([-0.29, -0.18, 0.32], [0.10, -0.48, 0.87], { t: 0.1, n: 0.15, d: 0.014 })],
    T: [key([-0.33, -0.11, 0.17], [0.10, 0.05, 1], { t: -0.33, n: -0.06 }),
      key([-0.25, -0.1, 0.38], [0.12, -0.04, 1], { t: 0.10, n: 0.11, f: 0.06 })]
  },
  // The axe head rises beyond the shoulders. The heavy finish drops the hips.
  axe: {
    R: [key([-0.44, 0.26, 0.28], [-0.82, 0.55, 0.18], { t: -0.49, n: -0.08 }),
      key([0.075, -0.27, 0.36], [0.85, -0.29, 0.43], { t: 0.47, n: 0.22, d: 0.020 })],
    L: [key([0.13, 0.23, 0.42], [0.82, 0.55, 0.20], { t: 0.46, n: -0.06 }),
      key([-0.36, -0.32, 0.30], [-0.86, -0.35, 0.36], { t: -0.46, n: 0.21, d: 0.025 })],
    O: [key([-0.19, 0.49, 0.25], [-0.15, 0.96, -0.14], { t: -0.27, n: -0.14 }),
      key([-0.22, -0.37, 0.37], [0.18, -0.76, 0.63], { t: 0.14, n: 0.26, d: 0.045 })],
    T: [key([-0.32, -0.25, 0.22], [0.08, 0.22, 0.97], { t: -0.3, n: -0.04 }),
      key([-0.22, -0.24, 0.33], [0.24, 0.01, 0.97], { t: 0.04, n: 0.11, f: 0.05 })]
  },
  // A low horizontal draw lets the long ji open to the side with both hands on the shaft.
  ji: {
    R: [key([-0.33, -0.075, 0.30], [-0.95, 0.18, 0.28], { t: -0.30, n: -0.04 }),
      key([0.03, -0.17, 0.33], [0.93, -0.15, 0.35], { t: 0.32, n: 0.11 })],
    L: [key([0.02, -0.03, 0.37], [0.95, 0.16, 0.27], { t: 0.32, n: -0.025 }),
      key([-0.37, -0.19, 0.31], [-0.95, -0.14, 0.27], { t: -0.34, n: 0.10 })],
    O: [key([-0.32, 0.31, 0.34], [-0.31, 0.93, 0.22], { t: -0.2, n: -0.07 }),
      key([-0.28, -0.27, 0.35], [0.03, -0.45, 0.89], { t: 0.08, n: 0.22, d: 0.028 })],
    T: [key([-0.33, -0.32, 0.235], [-0.025, 0.035, 0.999], { t: -0.28, n: -0.045 }),
      key([-0.22, -0.19, 0.35], [0.07, -0.04, 1], { t: 0.03, n: 0.08, f: 0.045 })]
  },
  // The knife stays close to the shoulder and takes a shorter path back to guard.
  knife: {
    R: [key([-0.28, 0.06, 0.25], [-0.77, 0.59, 0.23], { t: -0.24, n: -0.025 }),
      key([-0.04, -0.17, 0.33], [0.84, -0.29, 0.45], { t: 0.27, n: 0.095 })],
    L: [key([-0.085, 0.09, 0.32], [0.77, 0.53, 0.32], { t: 0.28, n: -0.02 }),
      key([-0.30, -0.18, 0.26], [-0.8, -0.27, 0.52], { t: -0.25, n: 0.09 })],
    O: [key([-0.205, 0.27, 0.26], [-0.24, 0.92, 0.30], { t: -0.085, n: -0.045 }),
      key([-0.18, -0.20, 0.32], [0.16, -0.51, 0.86], { t: 0.08, n: 0.16, d: 0.017 })],
    T: [key([-0.23, -0.12, 0.22], [0.13, 0.18, 0.98], { t: -0.20, n: -0.018 }),
      key([-0.19, -0.13, 0.32], [0.14, 0.06, 0.99], { t: 0.025, n: 0.07, f: 0.024 })]
  }
};
const WEAPON_FAMILY = { spear: 'ji', zhanma: 'axe' };

/** The middle key preserves each weapon's existing pose at the logical hit. */
export function ordinaryCuts(arms) {
  const move = CHAMBER_AND_FINISH[WEAPON_FAMILY[arms.main] ?? arms.main] ?? CHAMBER_AND_FINISH.sabre;
  const pole = arms.main === 'ji' || arms.main === 'spear';
  const reach = arms.two ? 0.39 : 0.44;
  const side = pole ? 0.11 : 0.18;
  const contact = {
    R: key([-0.22, -0.08, reach], [side, -0.04, 1], { t: 0.17, n: 0.13, f: 0.07 }, false),
    L: key([-0.135, -0.075, reach], [side, -0.045, 1], { t: -0.17, n: 0.15, f: 0.065 }, false),
    O: key([-0.185, 0.01, reach], [side, -0.34, 1], { t: 0.06, n: 0.2, d: 0.026, f: 0.045 }, false),
    T: key([pole ? -0.31 : -0.22, -0.16, reach + 0.03], [pole ? 0.15 : 0.21, 0.025, 1],
      { t: 0.07, n: 0.15, f: 0.105 }, false)
  };
  return Object.fromEntries(Object.entries(move).map(([line, [load, finish]]) => [line, [load, contact[line], finish]]));
}
