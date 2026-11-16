// The practice post: a straw man on a wooden stake, dressed up as a soldier of heaven. It is the same from both
// sides, so the game turns it to face whoever strikes it. Drawn standing on y = 200, as the other puppets are.
import { DYE, barbs, beads, blob, crescent, dot, leather, line, poly, ribbon, slit, stud } from '../leather.mjs';

export const bones = [
  ['root', null, [100, 200], [112, 200]],
  ['post', 'root', [100, 196], [100, 152]],
  ['body', 'post', [100, 152], [100, 112]],
  ['head', 'body', [100, 112], [100, 90]],
  ['plume1', 'head', [100, 86], [100, 72]],
  ['plume2', 'plume1', [100, 72], [104, 58]],
  ['armL', 'body', [96, 121], [74, 126]],
  ['armR', 'body', [104, 121], [126, 126]]
];

const straw = (points, widths) => leather({ shape: ribbon(points, widths), fill: DYE.amber, holes: barbs(points, widths[0] * 0.9, 3.4, 0.9, 0.5) });

export const parts = [
  ['base', 'root', leather({ shape: poly([[84, 200], [116, 200], [110, 192], [90, 192]]), fill: DYE.black, holes: [slit([92, 196.4], [108, 196.4], 0.7)] })],
  ['post', 'post', leather({ shape: poly([[97.6, 196], [102.4, 196], [102.4, 148], [97.6, 148]]), fill: DYE.black, holes: [slit([100, 156], [100, 190], 0.5)], opacity: 0.94 })],
  ['armL', 'armL', straw([[96, 121], [85, 123], [74, 126]], [3.4, 3, 2.2]) + line('M96 121L76 125.6', 1)],
  ['armR', 'armR', straw([[104, 121], [115, 123], [126, 126]], [3.4, 3, 2.2]) + line('M104 121L124 125.6', 1)],
  [
    'body',
    'body',
    leather({
      shape: blob([[90, 114], [110, 114], [113.6, 128], [112, 146], [106, 153.6], [94, 153.6], [88, 146], [86.4, 128]], 0.42),
      fill: DYE.amber,
      holes: [slit([92, 119], [91, 148], 0.8), slit([96, 118], [95.6, 150], 0.8), slit([104, 118], [104.4, 150], 0.8), slit([108, 119], [109, 148], 0.8)],
      over:
        // A soldier's breastplate tied on with rope, and a mark to aim at.
        leather({ shape: blob([[93, 118], [107, 118], [109, 132], [100, 140], [91, 132]], 0.4), fill: DYE.teal, holes: [dot(100, 127.6, 1.5), ...[0, 72, 144, 216, 288].map(a => crescent(100 + 4.2 * Math.cos((a * Math.PI) / 180), 127.6 + 4.2 * Math.sin((a * Math.PI) / 180), 1.4, a + 180))], edge: 1 }) +
        leather({ shape: poly([[87.6, 142], [112.4, 142], [112, 146.6], [88, 146.6]]), fill: DYE.crimson, holes: beads([90.6, 144.3], [109.4, 144.3], 7, 0.75), edge: 0.9 })
    }) + stud(100, 152, 1.3)
  ],
  [
    'head',
    'head',
    leather({
      shape: blob([[91, 100], [94, 91.4], [100, 88.6], [106, 91.4], [109, 100], [106, 109.6], [100, 113], [94, 109.6]], 0.5),
      fill: DYE.hide,
      // A face cut with a few strokes: two slanted eyes and a crooked mouth.
      holes: [slit([94, 98], [98, 100], 0.9), slit([106, 98], [102, 100], 0.9), slit([96, 106], [104, 105], 0.6)],
      over: leather({ shape: poly([[90.6, 93.6], [109.4, 93.6], [107, 88], [100, 84.6], [93, 88]]), fill: DYE.teal, holes: beads([94, 91], [106, 91], 5, 0.7), edge: 1 })
    }) + stud(100, 112, 1.2)
  ],
  ['plume1', 'plume1', leather({ shape: ribbon([[100, 86], [100, 79], [100, 72]], [1.6, 2.4, 2.4]), fill: DYE.red, holes: barbs([[100, 86], [100, 72]], 2, 3, 0.7, 0.5) })],
  ['plume2', 'plume2', leather({ shape: ribbon([[100, 72], [101, 65], [104, 58]], [2.4, 2.2, 1]), fill: DYE.red, holes: barbs([[100, 72], [101, 65], [104, 58]], 1.8, 3, 0.7, 0.5) }) + stud(100, 72, 1)]
];

const settle = (first, times = [0.14, 0.36, 0.6, 0.82, 1]) => [[0, 0], [times[0], first, 'out'], [times[1], -first * 0.55], [times[2], first * 0.28], [times[3], -first * 0.1], [times[4], 0]];

export const animations = {
  idle: {
    seconds: 2.6,
    bones: {
      body: { rot: [[0, 0], [0.5, 1.4], [1, 0]] },
      plume1: { rot: [[0, -3], [0.5, 3], [1, -3]] },
      plume2: { rot: [[0, -6], [0.6, 6], [1, -6]] }
    }
  },
  // Struck from its left: it rocks away and back, each part a little behind the one that carries it.
  hit: {
    seconds: 0.5,
    bones: {
      post: { rot: settle(-5) },
      body: { rot: settle(-14) },
      head: { rot: settle(-16, [0.18, 0.4, 0.64, 0.86, 1]) },
      armL: { rot: settle(26, [0.2, 0.42, 0.66, 0.86, 1]) },
      armR: { rot: settle(30, [0.2, 0.42, 0.66, 0.86, 1]) },
      plume1: { rot: settle(30, [0.2, 0.44, 0.68, 0.88, 1]) },
      plume2: { rot: settle(44, [0.24, 0.48, 0.72, 0.9, 1]) }
    }
  },
  // Lifted by a blow from below: it jumps on its stake.
  lift: {
    seconds: 0.56,
    bones: {
      post: { rot: settle(-3), pos: [[0, 0, 0], [0.2, 0, 13, 'out'], [0.46, 0, 0, 'in'], [0.6, 0, 3, 'out'], [0.74, 0, 0, 'in'], [1, 0, 0]] },
      body: { rot: settle(-9) },
      head: { rot: settle(12, [0.2, 0.44, 0.66, 0.86, 1]) },
      armL: { rot: settle(-38, [0.22, 0.48, 0.7, 0.88, 1]) },
      armR: { rot: settle(38, [0.22, 0.48, 0.7, 0.88, 1]) },
      plume1: { rot: settle(-24, [0.24, 0.5, 0.72, 0.9, 1]) },
      plume2: { rot: settle(-40, [0.28, 0.54, 0.76, 0.92, 1]) }
    }
  },
  // Beaten down from above: it is driven into the ground and shudders.
  slam: {
    seconds: 0.7,
    bones: {
      post: { rot: settle(-8), pos: [[0, 0, 0], [0.1, 0, -9, 'out'], [0.3, 0, 2], [0.5, 0, -1], [1, 0, 0]] },
      body: { rot: settle(-24) },
      head: { rot: settle(-30, [0.16, 0.4, 0.64, 0.86, 1]) },
      armL: { rot: settle(48, [0.18, 0.44, 0.68, 0.88, 1]) },
      armR: { rot: settle(52, [0.18, 0.44, 0.68, 0.88, 1]) },
      plume1: { rot: settle(44, [0.2, 0.46, 0.7, 0.9, 1]) },
      plume2: { rot: settle(64, [0.24, 0.5, 0.74, 0.92, 1]) }
    }
  }
};

export const events = [];
