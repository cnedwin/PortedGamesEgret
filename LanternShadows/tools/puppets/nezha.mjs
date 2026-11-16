// Nezha, the third prince: a boy in a lotus skirt and a red bib, standing on the wheels of wind and fire, with
// the fire-tipped spear in one hand, the Universe Ring in the other and the red sash streaming behind him. Drawn
// standing on y = 200 and facing right, as the other puppets are.
//
// Besides what he does (track 0), two things are shown or put away on tracks of their own: the three heads and
// six arms he takes on when he is angered (`calm` and `wrath`, track 1), and the ring in his hand, which is gone
// from it while it flies (`held` and `bare`, track 2).
import { DYE, barbs, beads, blob, crescent, curve, dot, leather, line, poly, ribbon, slit, stud } from '../leather.mjs';

export const bones = [
  ['root', null, [100, 200], [112, 200]],
  ['hip', 'root', [100, 148], [100, 136]],
  ['chest', 'hip', [100, 136], [101, 114]],
  ['head', 'chest', [101, 114], [102, 96]],
  ['aura', 'chest', [100, 122], [100, 104]],
  ['sash1', 'chest', [97, 113], [85, 106]],
  ['sash2', 'sash1', [85, 106], [72, 111]],
  ['sash3', 'sash2', [72, 111], [60, 103]],
  ['armF1', 'chest', [106, 117], [110, 131]],
  ['armF2', 'armF1', [110, 131], [119, 140]],
  ['spear', 'armF2', [119, 140], [119, 90]],
  ['armB1', 'chest', [96, 117], [91, 130]],
  ['armB2', 'armB1', [91, 130], [93, 142]],
  ['ring', 'armB2', [93, 143], [93, 153]],
  ['legF1', 'hip', [103, 149], [106, 166]],
  ['legF2', 'legF1', [106, 166], [105, 181]],
  ['wheelF', 'legF2', [106, 189], [116, 189]],
  ['legB1', 'hip', [97, 149], [94, 166]],
  ['legB2', 'legB1', [94, 166], [93, 181]],
  ['wheelB', 'legB2', [93, 189], [103, 189]],
  ['skirt', 'hip', [100, 146], [100, 162]]
];

const limb = (points, widths, holes = [], over = '') => leather({ shape: ribbon(points, widths), fill: DYE.hide, holes, over });
const fist = (x, y) => leather({ shape: dot(x, y, 3.2), fill: DYE.hide, holes: [slit([x - 1.5, y - 0.5], [x + 1.8, y + 0.4], 0.5)] });
const bangle = (a, b) => line(curve([a, b]), 1.7, DYE.gold) + line(curve([a, b]), 0.4);
const foot = (x, y) => leather({ shape: blob([[x - 2.6, y - 1.6], [x + 2, y - 2], [x + 7.4, y + 1], [x + 6.8, y + 3.6], [x - 2.8, y + 3.6]], 0.4), fill: DYE.hide, holes: [slit([x + 1, y + 1.6], [x + 5, y + 1.8], 0.45)] });

/** A wheel of wind and fire: a spoked gold rim with tongues of flame leaning back from it. */
function wheel(cx, cy) {
  const around = (radius, angle) => [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  const flames = [],
    licks = [],
    spokes = [];
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    flames.push(around(7.6, angle - 0.24), around(13.2, angle + 0.34));
    licks.push(slit(around(8.8, angle + 0.16), around(11.6, angle + 0.3), 0.6));
  }
  for (let i = 0; i < 6; i++) spokes.push(slit(around(3, (i / 6) * Math.PI * 2), around(6.4, (i / 6) * Math.PI * 2), 1));
  return (
    leather({ shape: blob(flames, 0.32), fill: DYE.red, holes: licks, edge: 0.9 }) +
    leather({ shape: dot(cx, cy, 8.2), fill: DYE.gold, holes: spokes, opacity: 0.93, edge: 1 }) +
    stud(cx, cy, 1.3)
  );
}

/** What he grows when angered: four more arms, each with something in its hand, and a face to either side. */
const wrath =
  limb([[97, 116], [88, 105], [80, 95]], [3.6, 3.2, 2.6]) +
  leather({ shape: dot(76.4, 90.4, 4.4), fill: DYE.red, holes: [crescent(76.4, 90.4, 2.4, 140), dot(76.4, 90.4, 0.8)], edge: 1 }) +
  fist(79.4, 94.2) +
  limb([[96, 120], [84, 119], [74, 122]], [3.4, 3, 2.6]) +
  leather({ shape: poly([[72, 120.4], [74.4, 122.2], [65.4, 133.4], [63.4, 131.6]]), fill: DYE.gold, holes: beads([71.4, 123.6], [66.4, 130.2], 3, 0.6), edge: 0.9 }) +
  fist(73.4, 122) +
  limb([[105, 116], [114, 106], [124, 98]], [3.6, 3.2, 2.6]) +
  leather({ shape: poly([[124, 96.4], [126.2, 98.2], [139.4, 81.6], [138.6, 79.4]]), fill: DYE.hide, holes: [slit([127, 95.4], [136.6, 83.4], 0.5)], edge: 0.9 }) +
  fist(124.8, 97.4) +
  limb([[106, 120], [118, 118], [129, 114]], [3.4, 3, 2.6]) +
  leather({ shape: blob([[130.4, 108.6], [136.4, 108], [137.6, 114], [131.6, 115.4]], 0.4), fill: DYE.gold, holes: [dot(134, 111.6, 1.2)], edge: 0.9 }) +
  fist(129.8, 113.6) +
  leather({ shape: blob([[84, 101], [86, 94], [92, 92], [96.4, 96], [96.4, 106], [91, 110.4], [86, 107.6]], 0.5), fill: DYE.hide, holes: [slit([86.2, 99], [90.6, 99.8], 1), slit([86.4, 105], [89.4, 105.4], 0.5)], over: line(curve([[85.6, 96.6], [88.6, 96], [91.4, 97.2]]), 1.1) }) +
  leather({ shape: blob([[108, 96], [113, 92.6], [119, 95], [121.4, 101.6], [118.4, 108], [112, 110.4], [108, 106]], 0.5), fill: DYE.hide, holes: [slit([114.4, 99.6], [119, 98.8], 1), slit([116, 105.4], [119.2, 105], 0.5)], over: line(curve([[113.6, 97.4], [116.6, 96], [119.6, 96.6]]), 1.1) });

export const parts = [
  ['aura', 'aura', wrath],
  ['sash3', 'sash3', leather({ shape: ribbon([[72, 111], [66, 108.6], [60, 103]], [3.4, 2.8, 1.3]), fill: DYE.red, holes: barbs([[72, 111], [61, 104]], 1.8, 3.2, 0.5, 0.5) })],
  ['sash2', 'sash2', leather({ shape: ribbon([[85, 106], [78, 107.6], [72, 111]], [3.6, 3.9, 3.4]), fill: DYE.red, holes: [slit([83, 106.4], [74, 110], 0.8)] }) + stud(72, 111, 0.9)],
  ['sash1', 'sash1', leather({ shape: ribbon([[98, 113], [91, 108], [85, 106]], [3, 3.6, 3.6]), fill: DYE.red, holes: [slit([95.6, 111], [87, 106.6], 0.8)] }) + stud(85, 106, 0.9)],
  ['armB1', 'armB1', limb([[96, 117], [93, 123.6], [91, 130]], [4.2, 3.8, 3.2], [], bangle([90.6, 122], [95.6, 124.4]))],
  ['armB2', 'armB2', limb([[91, 130], [91.8, 136], [93, 142]], [3.2, 3, 2.6], [], bangle([90, 139], [94.6, 138.2])) + stud(91, 130, 1.1)],
  ['ring', 'ring', leather({ shape: dot(93, 153, 9.6), fill: DYE.gold, holes: [dot(93, 153, 6), ...Array.from({ length: 8 }, (_, i) => dot(93 + 7.8 * Math.cos((i * Math.PI) / 4), 153 + 7.8 * Math.sin((i * Math.PI) / 4), 0.8))], opacity: 0.95, edge: 1 }) + `<circle cx="93" cy="153" r="6" fill="none" stroke="${DYE.ink}" stroke-width="0.9"/>` + fist(93.2, 143.6)],
  ['wheelB', 'wheelB', wheel(93, 189)],
  ['legB1', 'legB1', limb([[97, 149], [95.2, 158], [94, 166]], [4.8, 4.4, 3.6])],
  ['legB2', 'legB2', limb([[94, 166], [93.4, 174], [93, 181]], [3.6, 3.2, 2.7], [], bangle([90.8, 177.4], [95.6, 177])) + foot(93, 181) + stud(94, 166, 1.1)],
  ['wheelF', 'wheelF', wheel(106, 189)],
  ['legF1', 'legF1', limb([[103, 149], [104.8, 158], [106, 166]], [5.2, 4.7, 3.9], [crescent(105.4, 162.4, 1.8, 90)])],
  ['legF2', 'legF2', limb([[106, 166], [105.6, 174], [105, 181]], [3.9, 3.4, 2.8], [], bangle([102.8, 177.4], [107.8, 177])) + foot(105, 181) + stud(106, 166, 1.1)],
  [
    'skirt',
    'skirt',
    // Lotus petals hanging from a gold belt.
    leather({
      shape: poly([[90, 142], [111, 142], [114, 153], [110.6, 161.4], [106.6, 154], [102.6, 163], [98.4, 154], [94.6, 162], [91, 154], [87.4, 160.4], [87, 151]]),
      fill: DYE.green,
      holes: [slit([110.4, 147], [110.6, 157], 0.8), slit([102.6, 147], [102.6, 158.6], 0.9), slit([94.8, 147], [94.6, 157.6], 0.8), slit([106.6, 146], [106.6, 151], 0.6), slit([98.6, 146], [98.6, 151], 0.6), slit([90.4, 147], [89, 155.6], 0.6)],
      over: line(poly([[90, 141], [111, 141], [111.4, 144.6], [89.6, 144.6]]), 0.6, DYE.ink, `fill="${DYE.gold}"`)
    })
  ],
  [
    'torso',
    'chest',
    leather({
      shape: blob([[96, 114], [106, 114], [111.6, 118], [112.6, 127], [110, 137.6], [92.6, 137.6], [90, 127], [91.6, 118]], 0.42),
      fill: DYE.hide,
      holes: [crescent(94.4, 131, 2, 0), crescent(109, 131, 2, 180)],
      over:
        // The bib over his belly, and the ring about his neck.
        leather({ shape: poly([[101, 116.4], [110, 126.4], [101, 138.4], [92, 126.4]]), fill: DYE.red, holes: [dot(101, 127, 2.6), crescent(101, 121, 1.8, 270), crescent(101, 133.4, 1.8, 90), crescent(96.4, 127, 1.6, 180), crescent(105.6, 127, 1.6, 0)], edge: 1 }) +
        line(curve([[95.6, 115.2], [101, 118.6], [106.6, 115]]), 1.9, DYE.gold) +
        line(curve([[95.6, 115.2], [101, 118.6], [106.6, 115]]), 0.4)
    }) + stud(100, 136, 1.1)
  ],
  [
    'head',
    'head',
    leather({
      shape: blob([[93, 103], [94, 94], [100, 89.6], [107, 90], [112.6, 95.6], [113.4, 102], [111, 108], [106, 112.6], [99, 113], [94.6, 109]], 0.5),
      fill: DYE.hide,
      // A boy's round face: a wide eye, a small firm mouth, and the ear.
      holes: [slit([105.4, 98.8], [110.6, 97.8], 1.2), slit([108, 107], [111, 106.2], 0.5), crescent(97.8, 103.6, 2, 0)],
      over:
        line(curve([[104.4, 95.6], [108, 94], [111.6, 94.8]]), 1.3) +
        `<circle cx="109.4" cy="92.2" r="0.9" fill="${DYE.red}"/>` +
        // His hair, tied up in two buns.
        leather({ shape: blob([[92, 102], [92.4, 92.6], [99, 87.6], [107.4, 88.2], [111.8, 92.2], [104, 92.6], [98.4, 95.6], [96.4, 103]], 0.45), fill: DYE.black, holes: [slit([95, 93], [101, 89.6], 0.5), slit([94.4, 97], [97.4, 93.6], 0.5)], opacity: 0.95, edge: 1 }) +
        leather({ shape: dot(95.4, 85.4, 4.6), fill: DYE.black, holes: [crescent(95.4, 85.4, 2.2, 230)], opacity: 0.95, edge: 1 }) +
        leather({ shape: dot(106.4, 84, 4.2), fill: DYE.black, holes: [crescent(106.4, 84, 2, 300)], opacity: 0.95, edge: 1 }) +
        line(curve([[92.6, 89], [98, 89.6]]), 1.5, DYE.red) +
        line(curve([[103.6, 88], [109, 87.4]]), 1.5, DYE.red)
    }) + stud(101, 114, 1)
  ],
  [
    'spear',
    'spear',
    // The fire-tipped spear: a blade shaped like a flame, a red tassel under it, and a gold butt.
    leather({ shape: poly([[117.9, 64], [120.1, 64], [120.1, 186], [117.9, 186]]), fill: DYE.black, opacity: 0.95, edge: 1 }) +
      leather({ shape: blob([[119, 36], [123.6, 47], [121.4, 52.6], [124.4, 60], [121, 66], [117, 66], [113.6, 60], [116.6, 52.6], [114.4, 47]], 0.4), fill: DYE.hide, holes: [slit([119, 42], [119, 62], 0.8)], edge: 1 }) +
      leather({ shape: blob([[116, 66], [122, 66], [125.4, 79], [119, 75], [112.6, 79]], 0.4), fill: DYE.red, holes: [slit([117.4, 68], [115.6, 75], 0.5), slit([120.6, 68], [122.4, 75], 0.5)], edge: 0.9 }) +
      leather({ shape: blob([[117.4, 184], [120.6, 184], [121, 190], [119, 192.4], [117, 190]], 0.4), fill: DYE.gold, edge: 0.9 })
  ],
  ['armF1', 'armF1', limb([[106, 117], [108.4, 124], [110, 131]], [4.4, 4, 3.4], [], bangle([105.6, 122.6], [110.8, 121]))],
  ['armF2', 'armF2', limb([[110, 131], [114.6, 136], [119, 140]], [3.4, 3.1, 2.7], [], bangle([114.4, 139.4], [117.8, 135.6])) + fist(119.6, 140.8) + stud(110, 131, 1.1)]
];

/**
 * An animation from poses. Each key is `[fraction, pose, ease]`; a pose gives the turn of every bone it names,
 * and `at`, where the hip is carried to. A bone a pose leaves out is at rest in it. `more` adds whole tracks.
 */
function seq(seconds, keys, more = {}) {
  const out = {};
  for (const name of new Set(keys.flatMap(([, pose]) => Object.keys(pose)))) {
    const eased = ease => (ease ? [ease] : []);
    if (name === 'at') out.hip = { ...out.hip, pos: keys.map(([t, pose, ease]) => [t, ...(pose.at ?? [0, 0]), ...eased(ease)]) };
    else out[name] = { ...out[name], rot: keys.map(([t, pose, ease]) => [t, pose[name] ?? 0, ...eased(ease)]) };
  }
  for (const [name, tracks] of Object.entries(more)) out[name] = { ...out[name], ...tracks };
  return { seconds, bones: out };
}

/** The wheels turning under him, `turns` times in the animation. */
const spin = turns => ({ wheelF: { rot: [[0, 0], [1, -360 * turns, 'lin']] }, wheelB: { rot: [[0, 50], [1, 50 - 360 * turns, 'lin']] } });
/** The sash on the air: lifted by `lift`, swaying by `sway`. */
const wave = (lift, sway) => ({
  sash1: { rot: [[0, lift - sway * 0.4], [0.5, lift + sway * 0.4], [1, lift - sway * 0.4]] },
  sash2: { rot: [[0, sway * 0.4], [0.22, sway], [0.72, -sway], [1, sway * 0.4]] },
  sash3: { rot: [[0, -sway * 0.7], [0.42, sway * 1.3], [0.92, -sway * 1.3], [1, -sway * 0.7]] }
});

const REST = {};
// Each pose's spear lies where `hip + chest + armF1 + armF2 + spear` puts it: 0 is upright, -90 level ahead.
const POSE = {
  // Drawn back for a thrust: his weight on the back wheel, the spear levelled beside him.
  drawn: { at: [-8, -2], hip: 5, chest: 14, head: -10, armF1: -50, armF2: 36, spear: -92, armB1: 46, armB2: 30, legF1: 18, legF2: -26, legB1: -14, legB2: -10 },
  lunged: { at: [14, -4], hip: -10, chest: -22, head: 16, armF1: 76, armF2: 6, spear: -140, armB1: -40, armB2: 20, legF1: 34, legF2: -40, legB1: -30, legB2: -6 },
  // The spear swung up behind his head, and brought down across everything before him.
  raised: { at: [-4, 2], hip: 4, chest: 16, head: -8, armF1: 150, armF2: 20, spear: -150, armB1: 30, armB2: 20, legF1: 10, legF2: -14, legB1: -10 },
  swept: { at: [8, -6], hip: -8, chest: -24, head: 14, armF1: 60, armF2: 10, spear: -148, armB1: -50, armB2: 10, legF1: 30, legF2: -44, legB1: -24, legB2: -8 },
  // The ring carried up behind him, and flung.
  cocked: { at: [-4, 0], hip: 3, chest: 10, head: -6, armB1: -150, armB2: -30, armF1: 20, spear: -24, legF1: 10, legF2: -12, legB1: -8 },
  flung: { at: [6, -2], hip: -4, chest: -14, head: 8, armB1: 84, armB2: 12, armF1: -20, spear: 18, legF1: 16, legF2: -20, legB1: -14 },
  // Curled over his wheels before he rides them through, and laid out along the air as he does.
  curled: { at: [0, 6], hip: -20, chest: -24, head: 30, armF1: 40, spear: -86, armB1: -40, armB2: 30, legF1: 50, legF2: -80, legB1: 30, legB2: -70 },
  riding: { at: [10, -2], hip: -62, chest: -14, head: 50, armF1: 40, spear: -54, armB1: -30, armB2: 20, legF1: -6, legF2: -8, legB1: -22, legB2: -10 },
  // Arms flung wide and head thrown back, in a rage.
  raging: { at: [0, 10], hip: 4, chest: 18, head: 20, armF1: 70, armF2: 30, spear: -110, armB1: -70, armB2: -30, legF1: 18, legF2: -10, legB1: -18, legB2: -10 },
  // Knocked back on his wheels, and doubled over them.
  reeling: { at: [-8, -3], hip: 10, chest: 26, head: -20, armF1: 60, armF2: 20, spear: -40, armB1: 50, armB2: 30, legF1: 26, legF2: -20, legB1: -10 },
  slumped: { at: [0, -8], hip: -10, chest: -22, head: -26, armF1: 12, armF2: 10, spear: -34, armB1: 14, armB2: 10, legF1: 14, legF2: -26, legB1: 8, legB2: -22 }
};

export const animations = {
  idle: seq(1.6, [[0, REST], [0.5, { at: [0, 3], chest: -2, head: 2, armF1: 3, armB1: -4, legF2: -4, legB2: -4 }], [1, REST]], { ...spin(2), ...wave(0, 12) }),
  // Leaning into the way he goes, the sash laid out behind him.
  move: seq(0.6, [[0, { at: [2, -2], hip: -6, chest: -8, head: 6, armB1: -22, armB2: 10, spear: -16, legF1: 14, legF2: -22, legB1: -10, legB2: -16 }], [0.5, { at: [2, 0], hip: -7, chest: -10, head: 7, armB1: -26, armB2: 10, spear: -18, legF1: 16, legF2: -26, legB1: -12, legB2: -18 }], [1, { at: [2, -2], hip: -6, chest: -8, head: 6, armB1: -22, armB2: 10, spear: -16, legF1: 14, legF2: -22, legB1: -10, legB2: -16 }]], { ...spin(2), ...wave(-12, 18) }),
  // The warnings hold their last pose until the blow comes.
  thrustWindup: seq(0.5, [[0, REST], [0.6, POSE.drawn, 'out'], [1, POSE.drawn]], { ...spin(1), ...wave(8, 8) }),
  thrust: seq(0.62, [[0, POSE.drawn], [0.1, POSE.lunged, 'out'], [0.55, POSE.lunged], [1, REST]], { ...spin(3), ...wave(-22, 10) }),
  sweepWindup: seq(0.4, [[0, REST], [0.6, POSE.raised, 'out'], [1, POSE.raised]], { ...spin(1), ...wave(6, 8) }),
  sweep: seq(0.5, [[0, POSE.raised], [0.3, POSE.swept, 'in'], [0.6, POSE.swept], [1, REST]], { ...spin(1), ...wave(-16, 14) }),
  ringWindup: seq(0.45, [[0, REST], [0.6, POSE.cocked, 'out'], [1, POSE.cocked]], { ...spin(1), ...wave(4, 8) }),
  ring: seq(0.4, [[0, POSE.cocked], [0.25, POSE.flung, 'out'], [0.6, POSE.flung], [1, REST]], { ...spin(1), ...wave(-10, 12) }),
  chargeWindup: seq(0.6, [[0, REST], [0.5, POSE.curled, 'out'], [1, POSE.curled]], { ...spin(4), ...wave(10, 16) }),
  charge: seq(0.3, [[0, POSE.riding], [0.5, { ...POSE.riding, at: [10, 0], head: 46 }], [1, POSE.riding]], { ...spin(3), ...wave(-30, 22) }),
  roar: seq(1.3, [[0, REST], [0.2, POSE.raging, 'out'], [0.5, { ...POSE.raging, at: [0, 13], chest: 21 }], [0.8, POSE.raging], [1, REST]], { ...spin(5), ...wave(-20, 26) }),
  stun: seq(1.2, [[0, REST], [0.12, POSE.reeling, 'out'], [0.4, POSE.slumped], [0.62, { ...POSE.slumped, at: [-2, -6], chest: -16, head: -20 }], [0.84, POSE.slumped], [1, REST]], { ...spin(0.5), ...wave(16, 6) }),
  // Beaten: knocked back, doubled over, and then upright again to be carried off by his wheels. It holds its last pose.
  flee: seq(1.8, [[0, REST], [0.1, POSE.reeling, 'out'], [0.34, POSE.slumped], [0.56, POSE.slumped], [0.74, { at: [0, 6], chest: 8, head: 14, armF1: 14, spear: -20, armB1: -16, legF1: 12, legF2: -30, legB1: 6, legB2: -34 }], [1, { at: [0, 6], chest: 8, head: 14, armF1: 14, spear: -20, armB1: -16, legF1: 12, legF2: -30, legB1: 6, legB2: -34 }]], { ...spin(6), ...wave(20, 14) }),
  // What is shown and what is put away. A piece put away is drawn too small to see, behind what covers it.
  calm: { seconds: 1, bones: { aura: { scale: [[0, 0.02], [1, 0.02]] } } },
  wrath: { seconds: 1.4, bones: { aura: { scale: [[0, 1], [0.5, 1.05], [1, 1]], rot: [[0, -3], [0.5, 3], [1, -3]] } } },
  held: { seconds: 1, bones: { ring: { scale: [[0, 1], [1, 1]] } } },
  bare: { seconds: 1, bones: { ring: { scale: [[0, 0.02], [1, 0.02]] } } }
};

export const events = [];
