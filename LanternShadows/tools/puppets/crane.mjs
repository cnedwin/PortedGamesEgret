// A crane of the immortals' orchard: white, black at the neck and the wing tips, red at the crown. It is drawn in
// the air and facing right, with the middle of its body at (100, 120), which is where the game places it.
import { DYE, barbs, blob, crescent, curve, dot, leather, line, poly, ribbon, slit, stud } from '../leather.mjs';

export const bones = [
  ['root', null, [100, 120], [112, 120]],
  ['body', 'root', [92, 122], [114, 116]],
  ['neck1', 'body', [114, 116], [126, 104]],
  ['neck2', 'neck1', [126, 104], [134, 90]],
  ['head', 'neck2', [134, 90], [144, 88]],
  ['wingF1', 'body', [102, 116], [94, 94]],
  ['wingF2', 'wingF1', [94, 94], [80, 74]],
  ['wingB1', 'body', [105, 115], [101, 93]],
  ['wingB2', 'wingB1', [101, 93], [91, 73]],
  ['tail', 'body', [92, 122], [76, 128]],
  ['legs', 'body', [98, 124], [78, 138]]
];

const wing = (points, widths, dye, opacity) => leather({ shape: ribbon(points, widths), fill: dye, opacity, holes: barbs([points[0], points.at(-1)], t => widths[0] * (1 - t * 0.5), 3.4, 0.7, 0.5) });

export const parts = [
  ['wingB2', 'wingB2', wing([[101, 93], [96, 83], [91, 73]], [6.4, 5, 2.2], DYE.black, 0.8)],
  ['wingB1', 'wingB1', wing([[105, 115], [103, 104], [101, 93]], [6.4, 7.4, 6.4], DYE.hide, 0.7)],
  ['tail', 'tail', wing([[92, 122], [84, 125], [76, 128]], [4.2, 3.6, 1.6], DYE.black, 0.9)],
  ['legs', 'legs', leather({ shape: ribbon([[98, 124], [88, 131], [78, 138]], [1.2, 1, 0.9]), fill: DYE.black, opacity: 0.95, edge: 0.8 }) + line(curve([[78, 138], [73, 138.6]]), 1) + line(curve([[78, 138], [74, 141.6]]), 1)],
  ['body', 'body', leather({ shape: blob([[89, 122], [95, 114], [107, 111], [116, 114], [117.6, 120], [110, 126.4], [98, 128.4]], 0.5), fill: DYE.hide, holes: [crescent(98, 121, 2.6, 200), crescent(104, 119, 2.6, 200), crescent(110, 118, 2.4, 200), crescent(101, 125, 2, 200)] })],
  ['neck1', 'neck1', leather({ shape: ribbon([[114, 116], [121, 111], [126, 104]], [3.6, 3, 2.6]), fill: DYE.hide, holes: [slit([116, 114.6], [124, 106.6], 0.6)] })],
  ['neck2', 'neck2', leather({ shape: ribbon([[126, 104], [131, 97], [134, 90]], [2.6, 2.4, 2.4]), fill: DYE.black, opacity: 0.95 }) + stud(126, 104, 0.9)],
  [
    'head',
    'head',
    leather({ shape: poly([[139.6, 86.2], [157, 89.4], [139.6, 91]]), fill: DYE.amber, holes: [slit([142, 88.6], [152, 89.2], 0.4)], edge: 0.9 }) +
      leather({ shape: dot(137, 88.4, 4.6), fill: DYE.hide, holes: [dot(138.6, 87.6, 0.9)], over: leather({ shape: blob([[133, 86.4], [135.6, 83.6], [139.6, 84], [140.6, 86.6], [136.6, 86]], 0.5), fill: DYE.red, edge: 0.8 }) })
  ],
  ['wingF1', 'wingF1', wing([[102, 116], [98, 105], [94, 94]], [7, 8.2, 7], DYE.hide, 0.9) + stud(102, 116, 1.1)],
  ['wingF2', 'wingF2', wing([[94, 94], [87, 84], [80, 74]], [7, 5.6, 2.4], DYE.black, 0.92) + stud(94, 94, 1)]
];

/** Both wings beating: `keys` are `[fraction, shoulder, tip]`, and the far wing follows a little behind the near one. */
const beat = keys => ({
  wingF1: { rot: keys.map(([t, shoulder]) => [t, shoulder]) },
  wingF2: { rot: keys.map(([t, , tip]) => [t, tip]) },
  wingB1: { rot: keys.map(([t, shoulder]) => [t, shoulder * 0.9 + 6]) },
  wingB2: { rot: keys.map(([t, , tip]) => [t, tip * 0.9 + 4]) }
});

export const animations = {
  // Keeping its place in the air.
  fly: {
    seconds: 0.56,
    bones: {
      body: { pos: [[0, 0, 3], [0.5, 0, -4], [1, 0, 3]], rot: [[0, 4], [0.5, -3], [1, 4]] },
      neck1: { rot: [[0, -4], [0.5, 5], [1, -4]] },
      neck2: { rot: [[0, 6], [0.5, -4], [1, 6]] },
      tail: { rot: [[0, -8], [0.5, 8], [1, -8]] },
      legs: { rot: [[0, 4], [0.5, -6], [1, 4]] },
      ...beat([[0, -34, -22], [0.5, 96, 30], [1, -34, -22]])
    }
  },
  // The warning before it stoops: it rears, wings high, and draws its neck back. It holds its last pose.
  windup: {
    seconds: 0.4,
    bones: {
      body: { pos: [[0, 0, 0], [1, -4, 6, 'out']], rot: [[0, 0], [1, 30, 'out']] },
      neck1: { rot: [[0, 0], [1, 24, 'out']] },
      neck2: { rot: [[0, 0], [1, 34, 'out']] },
      head: { rot: [[0, 0], [1, -64, 'out']] },
      tail: { rot: [[0, 0], [1, 20]] },
      legs: { rot: [[0, 0], [1, 30]] },
      ...beat([[0, -34, -22], [1, -56, -30, 'out']])
    }
  },
  // The stoop: beak first, wings laid back.
  dive: {
    seconds: 0.3,
    bones: {
      body: { rot: [[0, -40], [0.5, -43], [1, -40]] },
      neck1: { rot: [[0, -14], [1, -14]] },
      neck2: { rot: [[0, -22], [1, -22]] },
      head: { rot: [[0, 16], [1, 16]] },
      tail: { rot: [[0, 8], [0.5, 14], [1, 8]] },
      legs: { rot: [[0, 14], [1, 14]] },
      ...beat([[0, 30, 52], [0.5, 38, 60], [1, 30, 52]])
    }
  },
  hurt: {
    seconds: 0.32,
    bones: {
      body: { rot: [[0, 0], [0.3, 46, 'out'], [1, 0]] },
      neck1: { rot: [[0, 0], [0.3, -30, 'out'], [1, 0]] },
      neck2: { rot: [[0, 0], [0.3, -40, 'out'], [1, 0]] },
      legs: { rot: [[0, 0], [0.3, -40], [1, 0]] },
      ...beat([[0, 0, 0], [0.3, 110, 60], [0.7, -40, -20], [1, 0, 0]])
    }
  },
  // Struck out of the air: it turns over and falls with its wings loose. It holds its last pose.
  down: {
    seconds: 0.6,
    bones: {
      body: { rot: [[0, 0], [0.5, -120, 'out'], [1, -160]] },
      neck1: { rot: [[0, 0], [0.5, 30], [1, 40]] },
      neck2: { rot: [[0, 0], [0.5, 40], [1, 50]] },
      head: { rot: [[0, 0], [1, 30]] },
      tail: { rot: [[0, 0], [1, -30]] },
      legs: { rot: [[0, 0], [0.5, 50], [1, 70]] },
      ...beat([[0, 0, 0], [0.4, 80, 70], [1, 60, 90]])
    }
  }
};

export const events = [];
