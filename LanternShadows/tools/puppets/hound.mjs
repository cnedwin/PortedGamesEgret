// Erlang's hound: lean, black, deep in the chest and narrow in the loin, with a red collar. Drawn standing on
// y = 200 and facing right.
import { DYE, blob, crescent, curve, dot, leather, line, poly, ribbon, slit, stud } from '../leather.mjs';

export const bones = [
  ['root', null, [100, 200], [112, 200]],
  ['body', 'root', [84, 170], [112, 168]],
  ['neck', 'body', [112, 167], [122, 158]],
  ['head', 'neck', [122, 158], [136, 157]],
  ['jaw', 'head', [124, 161], [135, 163]],
  ['tail1', 'body', [84, 169], [73, 161]],
  ['tail2', 'tail1', [73, 161], [66, 149]],
  ['foreF1', 'body', [110, 172], [112, 186]],
  ['foreF2', 'foreF1', [112, 186], [111, 199]],
  ['foreB1', 'body', [106, 172], [105, 186]],
  ['foreB2', 'foreB1', [105, 186], [104, 199]],
  ['hindF1', 'body', [88, 172], [93, 186]],
  ['hindF2', 'hindF1', [93, 186], [89, 199]],
  ['hindB1', 'body', [84, 172], [87, 186]],
  ['hindB2', 'hindB1', [87, 186], [83, 199]]
];

const leg = (points, widths, opacity = 0.95) => leather({ shape: ribbon(points, widths), fill: DYE.black, opacity, edge: 0.9 });
const paw = (x, y) => leather({ shape: blob([[x - 2, y - 2], [x + 3, y - 2], [x + 5.4, y + 1], [x - 2, y + 1]], 0.4), fill: DYE.black, opacity: 0.95, edge: 0.8 });

export const parts = [
  ['foreB1', 'foreB1', leg([[106, 172], [105.4, 179], [105, 186]], [3.2, 2.8, 2.2], 0.8)],
  ['foreB2', 'foreB2', leg([[105, 186], [104.6, 193], [104, 198]], [2.2, 1.9, 1.6], 0.8) + paw(104, 198)],
  ['hindB1', 'hindB1', leg([[84, 172], [85, 179], [87, 186]], [4, 3.2, 2.4], 0.8)],
  ['hindB2', 'hindB2', leg([[87, 186], [85, 192], [83, 198]], [2.4, 2, 1.6], 0.8) + paw(83, 198)],
  ['tail2', 'tail2', leather({ shape: ribbon([[73, 161], [68, 156], [66, 149]], [1.8, 1.5, 0.8]), fill: DYE.black, opacity: 0.95, edge: 0.8 })],
  ['tail1', 'tail1', leather({ shape: ribbon([[84, 169], [78, 166], [73, 161]], [2.4, 2.1, 1.8]), fill: DYE.black, opacity: 0.95, edge: 0.8 })],
  [
    'body',
    'body',
    leather({
      shape: blob([[82, 168], [90, 163.6], [104, 162.6], [114, 164], [117, 171], [113, 178.4], [103, 177], [93, 172.6], [85, 174.6]], 0.45),
      fill: DYE.black,
      opacity: 0.95,
      holes: [crescent(108, 170, 2.6, 180), crescent(102, 169, 2.4, 180), crescent(96, 168, 2.2, 180), slit([90, 167], [104, 165.6], 0.5)]
    })
  ],
  ['neck', 'neck', leather({ shape: ribbon([[112, 167], [117.6, 162.6], [122, 158]], [5, 4.2, 3.6]), fill: DYE.black, opacity: 0.95, over: line(curve([[114.6, 160], [120, 166]]), 2.2, DYE.red) + `<circle cx="120.4" cy="167" r="1.4" fill="${DYE.gold}" stroke="${DYE.ink}" stroke-width="0.5"/>` })],
  ['jaw', 'jaw', leather({ shape: poly([[124, 160.4], [135, 161.6], [134.4, 163.6], [124, 163.6]]), fill: DYE.black, opacity: 0.95, edge: 0.8 }) + `<path d="M128 160.6l1 -1.8l1 1.8zM131.6 161l0.9 -1.6l0.9 1.6z" fill="${DYE.hide}"/>`],
  [
    'head',
    'head',
    leather({ shape: blob([[119, 157], [122, 152.6], [128, 152], [137.6, 155.6], [138, 158.6], [128, 160.6], [121, 161.6]], 0.4), fill: DYE.black, opacity: 0.95, holes: [dot(127.6, 155.4, 0.9)], over: `<circle cx="137" cy="157" r="1" fill="${DYE.ink}"/>` }) +
      leather({ shape: blob([[120, 153.6], [117.6, 146.6], [123.4, 150.6], [124, 154]], 0.4), fill: DYE.black, opacity: 0.95, holes: [slit([120.4, 149.6], [122, 152.6], 0.4)], edge: 0.8 })
  ],
  ['hindF1', 'hindF1', leg([[88, 172], [91, 179], [93, 186]], [4.6, 3.6, 2.6]) + stud(88, 172, 1)],
  ['hindF2', 'hindF2', leg([[93, 186], [91, 192], [89, 198]], [2.6, 2.1, 1.7]) + paw(89, 198)],
  ['foreF1', 'foreF1', leg([[110, 172], [111.4, 179], [112, 186]], [3.6, 3, 2.3]) + stud(110, 172, 1)],
  ['foreF2', 'foreF2', leg([[112, 186], [111.6, 193], [111, 198]], [2.3, 2, 1.7]) + paw(111, 198)]
];

/** All four legs: `fore` and `hind` are keys of `[fraction, upper, lower]`; the far legs follow a little behind the near ones. */
const legs = (fore, hind) => ({
  foreF1: { rot: fore.map(([t, upper]) => [t, upper]) },
  foreF2: { rot: fore.map(([t, , lower]) => [t, lower]) },
  foreB1: { rot: fore.map(([t, upper]) => [t, upper * 0.84 - 6]) },
  foreB2: { rot: fore.map(([t, , lower]) => [t, lower * 0.84]) },
  hindF1: { rot: hind.map(([t, upper]) => [t, upper]) },
  hindF2: { rot: hind.map(([t, , lower]) => [t, lower]) },
  hindB1: { rot: hind.map(([t, upper]) => [t, upper * 0.84 + 6]) },
  hindB2: { rot: hind.map(([t, , lower]) => [t, lower * 0.84]) }
});

export const animations = {
  // At full stretch: all four out, and all four gathered under it.
  run: {
    seconds: 0.34,
    bones: {
      body: { pos: [[0, 0, 4], [0.5, 0, -2], [1, 0, 4]], rot: [[0, 6], [0.5, -7], [1, 6]] },
      neck: { rot: [[0, -8], [0.5, 6], [1, -8]] },
      head: { rot: [[0, -4], [0.5, 4], [1, -4]] },
      jaw: { rot: [[0, -14], [0.5, -6], [1, -14]] },
      tail1: { rot: [[0, -24], [0.5, -6], [1, -24]] },
      tail2: { rot: [[0, -30], [0.5, 4], [1, -30]] },
      ...legs([[0, 62, -8], [0.5, -44, -58], [1, 62, -8]], [[0, -58, 24], [0.5, 46, -30], [1, -58, 24]])
    }
  },
  // Showing itself before it runs: down on its forelegs, teeth bared. It holds its last pose.
  crouch: {
    seconds: 0.44,
    bones: {
      body: { pos: [[0, 0, 0], [0.7, -3, -7, 'out'], [1, -3, -7]], rot: [[0, 0], [0.7, -13, 'out'], [1, -13]] },
      neck: { rot: [[0, 0], [0.7, -16, 'out'], [1, -16]] },
      head: { rot: [[0, 0], [0.7, 22, 'out'], [1, 22]] },
      jaw: { rot: [[0, 0], [0.7, -24, 'out'], [0.85, -14], [1, -24]] },
      tail1: { rot: [[0, 0], [0.7, -40, 'out'], [1, -40]] },
      tail2: { rot: [[0, 0], [0.7, -30, 'out'], [0.85, -18], [1, -30]] },
      ...legs([[0, 0, 0], [0.7, 44, -64, 'out'], [1, 44, -64]], [[0, 0, 0], [0.7, 20, -26, 'out'], [1, 20, -26]])
    }
  },
  // Struck: it is thrown up off its forelegs and backs away.
  yelp: {
    seconds: 0.5,
    bones: {
      body: { pos: [[0, 0, 0], [0.24, -4, 8, 'out'], [1, 0, 0]], rot: [[0, 0], [0.24, 26, 'out'], [0.6, 8], [1, 0]] },
      neck: { rot: [[0, 0], [0.24, 30, 'out'], [1, 0]] },
      head: { rot: [[0, 0], [0.24, 20, 'out'], [1, 0]] },
      jaw: { rot: [[0, 0], [0.24, -30, 'out'], [0.7, -10], [1, 0]] },
      tail1: { rot: [[0, 0], [0.24, 50, 'out'], [1, 30]] },
      tail2: { rot: [[0, 0], [0.3, 60, 'out'], [1, 40]] },
      ...legs([[0, 0, 0], [0.24, 50, -40, 'out'], [0.6, 10, -10], [1, 0, 0]], [[0, 0, 0], [0.24, -20, -24, 'out'], [0.6, 16, -30], [1, 0, 0]])
    }
  }
};

export const events = [];
