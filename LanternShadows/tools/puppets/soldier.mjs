// The soldiers of heaven, as shadow puppets: one figure in scale armour, carried with a spear, with a bow, or
// in black armour with a hammer and a tall shield. The same figure in pale armour and a red cloak, with a third
// eye and a three-pointed glaive, is Erlang. Drawn standing on y = 200 and facing right, as the other puppets
// are; tools/puppets/spearman.mjs, archer.mjs, guard.mjs and erlang.mjs each ask for one of the four.
import { DYE, barbs, beads, blob, crescent, curve, dot, leather, line, poly, ribbon, scales, slit, stud } from '../leather.mjs';

const BONES = [
  ['root', null, [100, 200], [112, 200]],
  ['hip', 'root', [100, 142], [100, 128]],
  ['chest', 'hip', [100, 128], [102, 100]],
  ['head', 'chest', [102, 100], [104, 80]],
  ['plume1', 'head', [102, 71], [96, 58]],
  ['plume2', 'plume1', [96, 58], [86, 50]],
  ['armF1', 'chest', [107, 105], [111, 123]],
  ['armF2', 'armF1', [111, 123], [120, 134]],
  ['weapon', 'armF2', [120, 134], [120, 74]],
  ['armB1', 'chest', [95, 105], [90, 122]],
  ['armB2', 'armB1', [90, 122], [95, 136]],
  ['legF1', 'hip', [104, 143], [107, 170]],
  ['legF2', 'legF1', [107, 170], [105, 194]],
  ['footF', 'legF2', [105, 194], [118, 198]],
  ['legB1', 'hip', [96, 143], [93, 170]],
  ['legB2', 'legB1', [93, 170], [91, 194]],
  ['footB', 'legB2', [91, 194], [104, 198]],
  ['skirt', 'hip', [100, 140], [100, 166]]
];

const limb = (points, widths, dye, holes = [], over = '') => leather({ shape: ribbon(points, widths), fill: dye, holes, over });
const boot = (x, y) => leather({ shape: blob([[x - 3.4, y - 3.6], [x + 2.6, y - 3.8], [x + 8.4, y + 0.2], [x + 14.6, y - 0.8], [x + 16, y + 2], [x + 13, y + 5.4], [x - 2, y + 5.4], [x - 4, y + 1]], 0.45), fill: DYE.black, holes: [slit([x + 1, y + 2.6], [x + 11, y + 2.8], 0.6)] });
const fist = (x, y) => leather({ shape: dot(x, y, 3.6), fill: DYE.hide, holes: [slit([x - 1.6, y - 0.6], [x + 2, y + 0.4], 0.5)] });

const WEAPONS = {
  // A spear, held upright: a leaf blade, a red tassel under it, and an iron butt.
  spear:
    leather({ shape: poly([[118.8, 62], [121.2, 62], [121.2, 198], [118.8, 198]]), fill: DYE.black, opacity: 0.95, edge: 1 }) +
    leather({ shape: blob([[120, 38], [123.6, 52], [121.4, 63], [118.6, 63], [116.4, 52]], 0.3), fill: DYE.hide, holes: [slit([120, 44], [120, 59], 0.7)], edge: 1 }) +
    leather({ shape: blob([[117, 63], [123, 63], [125.4, 74], [120, 71], [114.6, 74]], 0.4), fill: DYE.red, holes: [slit([118.4, 65], [117, 71], 0.5), slit([121.6, 65], [123, 71], 0.5)], edge: 0.9 }),
  // A bow, held upright by its grip, strung.
  bow:
    line(curve([[118, 96], [118, 134], [118, 172]]), 0.7, DYE.ink) +
    leather({ shape: ribbon([[118, 96], [126, 108], [129, 134], [126, 160], [118, 172]], [1.2, 2, 2.6, 2, 1.2]), fill: DYE.amber, holes: beads([127.4, 122], [127.4, 146], 4, 0.7), edge: 1 }),
  // A hammer, held upright: a short haft and a head like a melon.
  shield:
    leather({ shape: poly([[118.7, 96], [121.3, 96], [121.3, 150], [118.7, 150]]), fill: DYE.black, opacity: 0.95, edge: 1 }) +
    leather({ shape: blob([[120, 76], [128, 80], [130, 88], [128, 96], [120, 100], [112, 96], [110, 88], [112, 80]], 0.5), fill: DYE.gold, holes: [slit([120, 79], [120, 97], 0.9), slit([115, 81], [113.6, 95], 0.7), slit([125, 81], [126.4, 95], 0.7)], edge: 1 })
};
/** Erlang's glaive, held upright: three points on a long haft, the middle one a leaf with an edge to either side. */
WEAPONS.glaive =
  leather({ shape: poly([[118.7, 60], [121.3, 60], [121.3, 198], [118.7, 198]]), fill: DYE.black, opacity: 0.95, edge: 1 }) +
  leather({ shape: blob([[120, 26], [124.6, 42], [122.4, 60], [117.6, 60], [115.4, 42]], 0.3), fill: DYE.hide, holes: [slit([120, 32], [120, 56], 0.8)], edge: 1 }) +
  leather({ shape: blob([[113, 60], [127, 60], [131, 52], [133.4, 38], [129.6, 47], [126, 55], [114, 55], [110.4, 47], [106.6, 38], [109, 52]], 0.25), fill: DYE.hide, holes: [dot(120, 57.4, 1.1)], edge: 1 }) +
  leather({ shape: blob([[116.6, 61], [123.4, 61], [126, 73], [120, 70], [114, 73]], 0.4), fill: DYE.red, holes: [slit([118.4, 63], [117, 70], 0.5), slit([121.6, 63], [123, 70], 0.5)], edge: 0.9 });
/** His cloak, hanging from the shoulders behind him. */
const CLOAK = leather({
  shape: blob([[96, 102], [104, 101], [100, 124], [96, 150], [88, 172], [78, 176], [82, 150], [86, 124], [90, 108]], 0.4),
  fill: DYE.red,
  opacity: 0.84,
  holes: [slit([92, 112], [86, 150], 1.1), slit([96, 118], [91, 160], 0.9), crescent(84, 166, 2.6, 60)]
});
/** The helmet of heaven's soldiers, its cheek piece, and the spike the plume flies from. */
const HELMET =
  leather({ shape: blob([[91.6, 86.4], [93.6, 77], [102.4, 71.6], [110.6, 76], [112.4, 82.6], [101, 82.4]], 0.45), fill: DYE.gold, holes: [...beads([94.6, 83.6], [110, 80.6], 6, 0.7), crescent(101.6, 76.6, 2.6, 270)], edge: 1 }) +
  leather({ shape: blob([[92.6, 85], [98, 85], [99, 93], [95, 96], [92, 92]], 0.4), fill: DYE.gold, holes: [dot(95.6, 90, 1)], edge: 0.9 }) +
  leather({ shape: poly([[100.6, 72.4], [104, 72.4], [102.6, 66]]), fill: DYE.gold, edge: 0.9 });
/** Those of Laozi's household, who wear no armour: their hair is bound up under a black cap with a pin through it. */
const HOUSEHOLD = ['fan', 'gourd'];
const CAP =
  leather({ shape: blob([[91.6, 87], [92.6, 78], [101, 73], [110, 76.6], [112, 82], [102, 82.6], [96, 88]], 0.45), fill: DYE.black, holes: [slit([95, 80], [106, 76.6], 0.5)], opacity: 0.95, edge: 1 }) +
  leather({ shape: blob([[98, 73.6], [100, 67], [105, 66.6], [106.6, 72.6]], 0.5), fill: DYE.black, opacity: 0.95, edge: 0.9 }) +
  line(curve([[95.6, 69.6], [110, 68.6]]), 1.3, DYE.gold);
/** A palm-leaf fan as wide as he is, held upright by its handle. */
WEAPONS.fan =
  leather({ shape: poly([[119, 110], [121, 110], [121, 150], [119, 150]]), fill: DYE.black, opacity: 0.95, edge: 1 }) +
  leather({
    shape: blob([[120, 112], [106, 102], [100, 84], [106, 66], [120, 58], [134, 66], [140, 84], [134, 102]], 0.5),
    fill: DYE.green,
    opacity: 0.86,
    holes: [slit([120, 108], [120, 62], 0.9), slit([118, 106], [107, 72], 0.7), slit([122, 106], [133, 72], 0.7), slit([117, 108], [102, 86], 0.6), slit([123, 108], [138, 86], 0.6)],
    over: line(blob([[120, 110.4], [107.4, 101], [102, 84], [107.4, 67.6], [120, 60], [132.6, 67.6], [138, 84], [132.6, 101]], 0.5), 1, DYE.gold)
  });
/** A gourd of pills, held up by its neck. */
WEAPONS.gourd =
  leather({ shape: blob([[120, 104], [124, 107], [123.4, 113], [128.6, 120], [129, 130], [120, 137], [111, 130], [111.4, 120], [116.6, 113], [116, 107]], 0.5), fill: DYE.amber, holes: [crescent(116, 126, 3, 200), dot(120, 109.6, 0.9)], edge: 1 }) +
  line(curve([[115.4, 114.6], [124.6, 114.6]]), 1.6, DYE.red) +
  leather({ shape: poly([[118.6, 100], [121.4, 100], [121.4, 104.6], [118.6, 104.6]]), fill: DYE.red, edge: 0.8 });
/** The eye in his forehead, painted on the helmet. */
const THIRD_EYE = `<path d="${slit([107.4, 75.4], [107.8, 81.6], 1.9)}" fill="${DYE.red}" stroke="${DYE.ink}" stroke-width="0.6"/><circle cx="107.6" cy="78.5" r="0.9" fill="${DYE.ink}"/>`;
/** The tall shield, carried on the other arm: drawn where that hand hangs, and brought round in front by the arm. */
const SHIELD = leather({
  shape: blob([[84, 108], [95, 104], [106, 108], [107, 150], [95, 166], [83, 150]], 0.3),
  fill: DYE.crimson,
  opacity: 0.93,
  holes: [dot(95, 132, 5), ...beads([87, 112], [103, 112], 4, 1), crescent(95, 120, 3.4, 270), crescent(95, 146, 3.4, 90), slit([88, 124], [88, 146], 0.9), slit([102, 124], [102, 146], 0.9)],
  over: line(blob([[86.4, 110], [95, 106.6], [103.6, 110], [104.6, 149], [95, 162.6], [85.4, 149]], 0.3), 1.2, DYE.gold) + stud(95, 132, 2)
});

function partsOf(weapon) {
  // The guard's armour is black where the others' is teal.
  const coat = { shield: DYE.black, glaive: DYE.hide, fan: DYE.red, gourd: DYE.amber }[weapon] ?? DYE.teal,
    // The plume of a helmet; on a cap, a ribbon of the same shape.
    plume = HOUSEHOLD.includes(weapon) ? DYE.black : DYE.red;
  return [
    ...(weapon === 'glaive' ? [['cloak', 'chest', CLOAK]] : []),
    ['plume2', 'plume2', leather({ shape: ribbon([[96, 58], [91, 53], [86, 50]], [2.6, 2.2, 1.1]), fill: plume, holes: barbs([[96, 58], [86, 50]], 1.8, 3, 0.7, 0.5) })],
    ['plume1', 'plume1', leather({ shape: ribbon([[102, 71], [99, 64], [96, 58]], [1.8, 2.6, 2.6]), fill: plume, holes: barbs([[102, 71], [96, 58]], 2, 3, 0.7, 0.5) }) + stud(96, 58, 1)],
    ['armB1', 'armB1', limb([[95, 105], [92, 113], [90, 122]], [4.8, 4.4, 3.8], coat, [crescent(92.4, 110, 2.2, 200), crescent(91, 116, 2, 200)])],
    ['armB2', 'armB2', limb([[90, 122], [92, 129], [95, 136]], [3.6, 3.4, 3], DYE.gold, beads([90.8, 125], [93.8, 133], 3, 0.8)) + fist(95.6, 137.6) + stud(90, 122)],
    ['legB1', 'legB1', limb([[96, 143], [94.4, 156], [93, 170]], [6, 5.4, 4.4], DYE.crimson, [slit([95.4, 148], [93.6, 164], 0.8)])],
    ['legB2', 'legB2', limb([[93, 170], [92, 182], [91, 194]], [4.4, 4, 3.2], DYE.black, [crescent(92.4, 176, 2.2, 90), crescent(92, 182, 2, 90), crescent(91.6, 188, 1.8, 90)]) + stud(93, 170)],
    ['footB', 'footB', boot(91, 194) + stud(91, 194, 1.1)],
    [
      'skirt',
      'skirt',
      // The tassets: plates of armour hanging from the belt.
      leather({ shape: poly([[90, 139], [110.6, 139], [114, 164], [108, 168], [103.4, 163], [98.6, 168], [93.6, 163], [88, 167]]), fill: coat, holes: scales(90, 145, 22, 18, 3, 90), over: line(poly([[90, 139], [110.6, 139], [111, 142], [89.6, 142]]), 0.6, DYE.ink, `fill="${DYE.gold}"`) })
    ],
    ['legF1', 'legF1', limb([[104, 143], [105.6, 156], [107, 170]], [6.6, 5.8, 4.8], DYE.crimson, [slit([104.4, 148], [106.6, 164], 0.9), slit([107.6, 148], [109, 161], 0.7)])],
    ['legF2', 'legF2', limb([[107, 170], [106, 182], [105, 194]], [4.8, 4.3, 3.4], DYE.black, [crescent(106.6, 176, 2.4, 90), crescent(106.2, 182, 2.2, 90), crescent(105.8, 188, 2, 90)], line(curve([[103, 171.4], [111, 171.2]]), 1.5, DYE.gold)) + stud(107, 170)],
    ['footF', 'footF', boot(105, 194) + stud(105, 194, 1.1)],
    [
      'torso',
      'chest',
      leather({
        shape: blob([[97, 99], [106.4, 99], [113.4, 103], [115, 114], [111.6, 129.4], [92, 129.4], [89, 114], [90.4, 103.4]], 0.42),
        fill: coat,
        holes: scales(90, 107, 25, 13, 3.3, 90),
        over:
          leather({ shape: blob([[95.6, 98.6], [107.6, 98.6], [110.6, 102.6], [102, 106], [93.6, 102.8]], 0.4), fill: DYE.gold, holes: beads([97.6, 101.6], [107.4, 101.6], 5, 0.75), edge: 1 }) +
          leather({ shape: poly([[91.4, 124], [112.6, 124], [112, 130], [92, 130]]), fill: DYE.gold, holes: beads([94.6, 127], [109.6, 127], 6, 0.85), edge: 1 }) +
          // The mirror over the heart.
          leather({ shape: dot(102, 114, 4.8), fill: DYE.hide, holes: [dot(102, 114, 1.5)], edge: 1 })
      }) + stud(100, 128, 1.2)
    ],
    [
      'head',
      'head',
      leather({
        shape: blob([[93, 90], [95, 80], [103, 76], [110, 80], [115.4, 88], [112.4, 93.4], [108.6, 98.4], [100, 99.6], [94, 96]], 0.46),
        fill: DYE.hide,
        // A stern face: a narrow eye, a set mouth, and a line of beard.
        holes: [slit([105.6, 86], [110.6, 85], 0.9), slit([108, 93.4], [112, 92.6], 0.55), slit([100, 95], [106, 97.6], 0.55), crescent(97.6, 89.6, 2.4, 0)],
        over:
          line(curve([[104.6, 83.2], [108.6, 82], [111.6, 83]]), 1.2) +
          line(curve([[112.6, 91.4], [109.6, 91.6]]), 0.8) +
          (HOUSEHOLD.includes(weapon) ? CAP : HELMET) +
          (weapon === 'glaive' ? THIRD_EYE : '')
      }) + stud(102, 100, 1.1)
    ],
    ['weapon', 'weapon', WEAPONS[weapon]],
    ['armF1', 'armF1', limb([[107, 105], [109.4, 114], [111, 123]], [5.2, 4.8, 4], coat, [crescent(108.6, 110, 2.4, 20), crescent(110, 116.4, 2.2, 20)]) + stud(107, 105)],
    ['armF2', 'armF2', limb([[111, 123], [115.4, 129], [120, 134]], [3.9, 3.6, 3.1], DYE.gold, beads([112.8, 125.2], [118, 131.6], 3, 0.85)) + fist(120.6, 134.8) + stud(111, 123)],
    ...(weapon === 'shield' ? [['shield', 'armB2', SHIELD]] : [])
  ];
}

const breath = extra => ({
  hip: { pos: [[0, 0, 0], [0.5, 0, -1.4], [1, 0, 0]] },
  chest: { rot: [[0, 0], [0.5, -2], [1, 0]] },
  head: { rot: [[0, 0], [0.5, 2.4], [1, 0]] },
  legF1: { rot: [[0, 0], [0.5, 3], [1, 0]] },
  legF2: { rot: [[0, 0], [0.5, -5.6], [1, 0]] },
  legB1: { rot: [[0, 0], [0.5, 3], [1, 0]] },
  legB2: { rot: [[0, 0], [0.5, -5.6], [1, 0]] },
  footF: { rot: [[0, 0], [0.5, 2.6], [1, 0]] },
  footB: { rot: [[0, 0], [0.5, 2.6], [1, 0]] },
  plume1: { rot: [[0, -4], [0.5, 4], [1, -4]] },
  plume2: { rot: [[0, -8], [0.6, 8], [1, -8]] },
  ...extra
});

/** Struck: he is knocked back on his heels and rights himself. */
const hurt = {
  seconds: 0.32,
  bones: {
    hip: { pos: [[0, 0, 0], [0.3, -7, -3, 'out'], [1, 0, 0]], rot: [[0, 0], [0.3, 12, 'out'], [1, 0]] },
    chest: { rot: [[0, 0], [0.3, 20, 'out'], [1, 0]] },
    head: { rot: [[0, 0], [0.3, -22, 'out'], [1, 0]] },
    armF1: { rot: [[0, 0], [0.3, 50, 'out'], [1, 0]] },
    armB1: { rot: [[0, 0], [0.3, 60, 'out'], [1, 0]] },
    armB2: { rot: [[0, 0], [0.3, 40, 'out'], [1, 0]] },
    weapon: { rot: [[0, 0], [0.3, -30, 'out'], [1, 0]] },
    legF1: { rot: [[0, 0], [0.3, 26, 'out'], [1, 0]] },
    legF2: { rot: [[0, 0], [0.3, -20, 'out'], [1, 0]] },
    legB1: { rot: [[0, 0], [0.3, -16, 'out'], [1, 0]] },
    plume1: { rot: [[0, 0], [0.3, -40], [0.7, 20], [1, 0]] },
    plume2: { rot: [[0, 0], [0.36, -50], [0.76, 28], [1, 0]] },
    skirt: { rot: [[0, 0], [0.3, -20], [0.7, 8], [1, 0]] }
  }
};

/** Beaten: he goes over backwards and lies where he falls. It holds its last pose. */
const down = {
  seconds: 0.7,
  bones: {
    hip: { pos: [[0, 0, 0], [0.3, -14, 6, 'out'], [0.7, -30, -36, 'in'], [0.82, -32, -32, 'out'], [1, -34, -37, 'in']], rot: [[0, 0], [0.3, 30, 'out'], [0.7, 88, 'in'], [0.82, 84], [1, 90]] },
    chest: { rot: [[0, 0], [0.3, 16], [0.7, 6], [1, 2]] },
    head: { rot: [[0, 0], [0.3, -24], [0.7, 10], [1, 6]] },
    armF1: { rot: [[0, 0], [0.3, 80, 'out'], [0.7, 150], [1, 160]] },
    armF2: { rot: [[0, 0], [0.7, 20], [1, 14]] },
    weapon: { rot: [[0, 0], [0.3, -40], [0.7, -104], [1, -112]] },
    armB1: { rot: [[0, 0], [0.3, 70, 'out'], [0.7, 120], [1, 128]] },
    armB2: { rot: [[0, 0], [0.7, 30], [1, 24]] },
    legF1: { rot: [[0, 0], [0.3, 40, 'out'], [0.7, 66], [0.84, 30], [1, 16]] },
    legF2: { rot: [[0, 0], [0.3, -30], [0.7, -70], [0.84, -30], [1, -20]] },
    legB1: { rot: [[0, 0], [0.3, 20, 'out'], [0.7, 30], [0.84, 4], [1, -6]] },
    legB2: { rot: [[0, 0], [0.3, -40], [0.7, -40], [1, -10]] },
    footF: { rot: [[0, 0], [1, -30]] },
    footB: { rot: [[0, 0], [1, -30]] },
    plume1: { rot: [[0, 0], [0.3, -40], [0.7, 30], [1, 10]] },
    plume2: { rot: [[0, 0], [0.36, -50], [0.76, 40], [1, 16]] },
    skirt: { rot: [[0, 0], [0.5, -30], [1, -10]] }
  }
};

const ANIMATIONS = {
  spear: {
    idle: { seconds: 2.4, bones: breath({ armF1: { rot: [[0, 0], [0.5, 2], [1, 0]] }, armB1: { rot: [[0, 0], [0.5, -3], [1, 0]] } }) },
    // On patrol, the spear carried upright.
    walk: {
      seconds: 0.84,
      bones: {
        hip: { pos: [[0, 0, -1], [0.25, 0, 1.4], [0.5, 0, -1], [0.75, 0, 1.4], [1, 0, -1]] },
        chest: { rot: [[0, -3], [0.5, -5], [1, -3]] },
        legF1: { rot: [[0, 24, 'lin'], [0.5, -20, 'lin'], [1, 24]] },
        legF2: { rot: [[0, -6, 'lin'], [0.25, -10, 'lin'], [0.5, -14, 'lin'], [0.75, -46, 'lin'], [1, -6]] },
        footF: { rot: [[0, 10], [0.5, -12], [1, 10]] },
        legB1: { rot: [[0, -20, 'lin'], [0.5, 24, 'lin'], [1, -20]] },
        legB2: { rot: [[0, -14, 'lin'], [0.25, -46, 'lin'], [0.5, -6, 'lin'], [0.75, -10, 'lin'], [1, -14]] },
        footB: { rot: [[0, -12], [0.5, 10], [1, -12]] },
        armB1: { rot: [[0, 18], [0.5, -16], [1, 18]] },
        armB2: { rot: [[0, 20], [0.5, 10], [1, 20]] },
        weapon: { rot: [[0, 3], [0.5, -3], [1, 3]] },
        plume1: { rot: [[0, 6], [0.5, 12], [1, 6]] },
        plume2: { rot: [[0, 10], [0.5, 20], [1, 10]] },
        skirt: { rot: [[0, 6], [0.5, -6], [1, 6]] }
      }
    },
    // The warning before a thrust: the spear is levelled and drawn back. It holds its last pose.
    windup: {
      seconds: 0.3,
      bones: {
        hip: { pos: [[0, 0, 0], [1, -6, -3, 'out']], rot: [[0, 0], [1, 4, 'out']] },
        chest: { rot: [[0, 0], [1, 12, 'out']] },
        head: { rot: [[0, 0], [1, -8, 'out']] },
        armF1: { rot: [[0, 0], [1, -46, 'out']] },
        armF2: { rot: [[0, 0], [1, 34, 'out']] },
        weapon: { rot: [[0, 0], [1, -94, 'out']] },
        armB1: { rot: [[0, 0], [1, 50, 'out']] },
        armB2: { rot: [[0, 0], [1, 60, 'out']] },
        legF1: { rot: [[0, 0], [1, 16, 'out']] },
        legF2: { rot: [[0, 0], [1, -26, 'out']] },
        legB1: { rot: [[0, 0], [1, -10, 'out']] },
        legB2: { rot: [[0, 0], [1, -12, 'out']] },
        plume1: { rot: [[0, 0], [1, 14]] },
        plume2: { rot: [[0, 0], [1, 22]] }
      }
    },
    // The thrust itself, and the step back from it.
    attack: {
      seconds: 0.5,
      events: [[0.2, 'hit']],
      bones: {
        hip: { pos: [[0, -6, -3], [0.2, 12, -5, 'out'], [0.5, 10, -4], [1, 0, 0]], rot: [[0, 4], [0.2, -8, 'out'], [0.5, -6], [1, 0]] },
        chest: { rot: [[0, 12], [0.2, -18, 'out'], [0.5, -14], [1, 0]] },
        head: { rot: [[0, -8], [0.2, 12, 'out'], [0.5, 10], [1, 0]] },
        armF1: { rot: [[0, -46], [0.2, 72, 'out'], [0.5, 64], [1, 0]] },
        armF2: { rot: [[0, 34], [0.2, 8, 'out'], [0.5, 10], [1, 0]] },
        weapon: { rot: [[0, -94], [0.2, -144, 'out'], [0.5, -138], [1, 0]] },
        armB1: { rot: [[0, 50], [0.2, -30, 'out'], [0.5, -24], [1, 0]] },
        armB2: { rot: [[0, 60], [0.2, 20, 'out'], [1, 0]] },
        legF1: { rot: [[0, 16], [0.2, 38, 'out'], [0.5, 34], [1, 0]] },
        legF2: { rot: [[0, -26], [0.2, -44, 'out'], [0.5, -38], [1, 0]] },
        footF: { rot: [[0, 0], [0.2, 12, 'out'], [1, 0]] },
        legB1: { rot: [[0, -10], [0.2, -28, 'out'], [0.5, -24], [1, 0]] },
        legB2: { rot: [[0, -12], [0.2, -4, 'out'], [1, 0]] },
        footB: { rot: [[0, 0], [0.2, 30, 'out'], [1, 0]] },
        plume1: { rot: [[0, 14], [0.24, -30], [0.6, 12], [1, 0]] },
        plume2: { rot: [[0, 22], [0.3, -44], [0.66, 18], [1, 0]] },
        skirt: { rot: [[0, 0], [0.2, -16], [0.5, 6], [1, 0]] }
      }
    },
    hurt,
    down
  },
  bow: {
    idle: { seconds: 2.4, bones: breath({ armF1: { rot: [[0, 20], [0.5, 23], [1, 20]] }, armF2: { rot: [[0, 30], [0.5, 28], [1, 30]] }, weapon: { rot: [[0, -44], [0.5, -45], [1, -44]] }, armB1: { rot: [[0, 0], [0.5, -3], [1, 0]] } }) },
    // The warning before an arrow: the bow is raised and drawn. It holds its last pose.
    windup: {
      seconds: 0.4,
      bones: {
        hip: { pos: [[0, 0, 0], [1, -2, -2, 'out']] },
        chest: { rot: [[0, 0], [1, 8, 'out']] },
        head: { rot: [[0, 0], [1, -6, 'out']] },
        armF1: { rot: [[0, 20], [1, 84, 'out']] },
        armF2: { rot: [[0, 30], [1, 12, 'out']] },
        weapon: { rot: [[0, -44], [1, -104, 'out']] },
        armB1: { rot: [[0, 0], [1, 96, 'out']] },
        armB2: { rot: [[0, 0], [1, 110, 'out']] },
        legF1: { rot: [[0, 0], [1, 10, 'out']] },
        legF2: { rot: [[0, 0], [1, -10, 'out']] },
        legB1: { rot: [[0, 0], [1, -10, 'out']] },
        plume1: { rot: [[0, 0], [1, 10]] },
        plume2: { rot: [[0, 0], [1, 16]] }
      }
    },
    // The release.
    attack: {
      seconds: 0.4,
      events: [[0.1, 'hit']],
      bones: {
        hip: { pos: [[0, -2, -2], [0.14, -4, -2, 'out'], [1, 0, 0]] },
        chest: { rot: [[0, 8], [0.14, 12, 'out'], [1, 0]] },
        head: { rot: [[0, -6], [0.14, -9, 'out'], [1, 0]] },
        armF1: { rot: [[0, 84], [0.14, 90, 'out'], [0.6, 84], [1, 20]] },
        armF2: { rot: [[0, 12], [0.6, 12], [1, 30]] },
        weapon: { rot: [[0, -104], [0.14, -114, 'out'], [0.6, -104], [1, -44]] },
        armB1: { rot: [[0, 96], [0.14, 60, 'out'], [0.6, 50], [1, 0]] },
        armB2: { rot: [[0, 110], [0.14, 30, 'out'], [0.6, 30], [1, 0]] },
        legF1: { rot: [[0, 10], [1, 0]] },
        legF2: { rot: [[0, -10], [1, 0]] },
        legB1: { rot: [[0, -10], [1, 0]] },
        plume1: { rot: [[0, 10], [0.2, -16], [0.6, 8], [1, 0]] },
        plume2: { rot: [[0, 16], [0.26, -26], [0.66, 12], [1, 0]] }
      }
    },
    hurt,
    down
  }
};

// The guard carries his shield before him in everything he does: `held` is the arm that does it, and each of his
// animations keeps it there unless it says otherwise.
const held = (shoulder = 78, elbow = 30) => ({ armB1: { rot: [[0, shoulder], [1, shoulder]] }, armB2: { rot: [[0, elbow], [1, elbow]] } });
ANIMATIONS.shield = {
  idle: { seconds: 2.6, bones: { ...breath({ armF1: { rot: [[0, 0], [0.5, 2], [1, 0]] } }), ...held() } },
  walk: { seconds: 1, bones: { ...ANIMATIONS.spear.walk.bones, ...held(80, 28) } },
  // The warning before the hammer falls: it is carried up and back. It holds its last pose.
  windup: {
    seconds: 0.4,
    bones: {
      hip: { pos: [[0, 0, 0], [1, -4, -2, 'out']], rot: [[0, 0], [1, 5, 'out']] },
      chest: { rot: [[0, 0], [1, 12, 'out']] },
      head: { rot: [[0, 0], [1, -8, 'out']] },
      armF1: { rot: [[0, 0], [1, 150, 'out']] },
      armF2: { rot: [[0, 0], [1, 30, 'out']] },
      weapon: { rot: [[0, 0], [1, 40, 'out']] },
      legF1: { rot: [[0, 0], [1, 14, 'out']] },
      legF2: { rot: [[0, 0], [1, -22, 'out']] },
      legB1: { rot: [[0, 0], [1, -10, 'out']] },
      plume1: { rot: [[0, 0], [1, 14]] },
      plume2: { rot: [[0, 0], [1, 22]] },
      ...held(70, 26)
    }
  },
  // The hammer brought down in front of him.
  attack: {
    seconds: 0.56,
    events: [[0.2, 'hit']],
    bones: {
      hip: { pos: [[0, -4, -2], [0.2, 8, -6, 'in'], [0.56, 8, -6], [1, 0, 0]], rot: [[0, 5], [0.2, -10, 'in'], [0.56, -10], [1, 0]] },
      chest: { rot: [[0, 12], [0.2, -22, 'in'], [0.56, -20], [1, 0]] },
      head: { rot: [[0, -8], [0.2, 14, 'in'], [0.56, 12], [1, 0]] },
      armF1: { rot: [[0, 150], [0.2, 46, 'in'], [0.56, 50], [1, 0]] },
      armF2: { rot: [[0, 30], [0.2, 10, 'in'], [1, 0]] },
      weapon: { rot: [[0, 40], [0.2, -96, 'in'], [0.56, -92], [1, 0]] },
      legF1: { rot: [[0, 14], [0.2, 34, 'in'], [0.56, 30], [1, 0]] },
      legF2: { rot: [[0, -22], [0.2, -46, 'in'], [0.56, -40], [1, 0]] },
      legB1: { rot: [[0, -10], [0.2, -24, 'in'], [0.56, -20], [1, 0]] },
      plume1: { rot: [[0, 14], [0.24, -30], [0.6, 12], [1, 0]] },
      plume2: { rot: [[0, 22], [0.3, -44], [0.66, 18], [1, 0]] },
      skirt: { rot: [[0, 0], [0.2, -16], [0.5, 6], [1, 0]] },
      armB1: { rot: [[0, 70], [0.2, 86, 'in'], [0.56, 84], [1, 78]] },
      armB2: { rot: [[0, 26], [0.2, 32, 'in'], [1, 30]] }
    }
  },
  // A blow taken on the shield: he gives a little and is still again.
  block: {
    seconds: 0.26,
    bones: {
      hip: { pos: [[0, 0, 0], [0.3, -5, -1, 'out'], [1, 0, 0]], rot: [[0, 0], [0.3, 5, 'out'], [1, 0]] },
      chest: { rot: [[0, 0], [0.3, 7, 'out'], [1, 0]] },
      armB1: { rot: [[0, 78], [0.3, 62, 'out'], [1, 78]] },
      armB2: { rot: [[0, 30], [0.3, 44, 'out'], [1, 30]] },
      plume1: { rot: [[0, 0], [0.3, -16], [0.7, 8], [1, 0]] },
      plume2: { rot: [[0, 0], [0.36, -24], [0.76, 12], [1, 0]] }
    }
  },
  // The shield knocked aside: he staggers with it flung wide, and for that while there is nothing between
  // him and the staff.
  open: {
    seconds: 1.2,
    bones: {
      hip: { pos: [[0, 0, 0], [0.14, -8, -3, 'out'], [0.8, -6, -2], [1, 0, 0]], rot: [[0, 0], [0.14, 12, 'out'], [0.8, 9], [1, 0]] },
      chest: { rot: [[0, 0], [0.14, 20, 'out'], [0.5, 15], [0.8, 17], [1, 0]] },
      head: { rot: [[0, 0], [0.14, -20, 'out'], [0.8, -14], [1, 0]] },
      armB1: { rot: [[0, 78], [0.14, -70, 'out'], [0.5, -56], [0.8, -62], [1, 78]] },
      armB2: { rot: [[0, 30], [0.14, -10, 'out'], [0.8, -4], [1, 30]] },
      armF1: { rot: [[0, 0], [0.14, 46, 'out'], [0.8, 36], [1, 0]] },
      weapon: { rot: [[0, 0], [0.14, -34, 'out'], [0.8, -26], [1, 0]] },
      legF1: { rot: [[0, 0], [0.14, 24, 'out'], [0.8, 18], [1, 0]] },
      legF2: { rot: [[0, 0], [0.14, -18, 'out'], [0.8, -12], [1, 0]] },
      legB1: { rot: [[0, 0], [0.14, -14, 'out'], [0.8, -10], [1, 0]] },
      plume1: { rot: [[0, 0], [0.14, -36], [0.5, 14], [0.8, -6], [1, 0]] },
      plume2: { rot: [[0, 0], [0.2, -48], [0.56, 20], [0.86, -8], [1, 0]] }
    }
  },
  hurt: { ...hurt, bones: { ...hurt.bones, armB1: { rot: [[0, 78], [0.3, 30, 'out'], [1, 78]] }, armB2: { rot: [[0, 30], [0.3, 50, 'out'], [1, 30]] } } },
  down
};

// Erlang moves as the guard does, without a shield to mind: his blow is the guard's hammer blow made with the
// glaive, and what else he does is his own.
const free = bones => Object.fromEntries(Object.entries(bones).filter(([bone]) => bone !== 'armB1' && bone !== 'armB2'));
const stance = (t, legs) => [[0, 0], [t, legs, 'out'], [1, legs]];
ANIMATIONS.glaive = {
  idle: ANIMATIONS.spear.idle,
  walk: ANIMATIONS.spear.walk,
  windup: { seconds: 0.4, bones: { ...free(ANIMATIONS.shield.windup.bones), armB1: { rot: [[0, 0], [1, 40, 'out']] }, armB2: { rot: [[0, 0], [1, 50, 'out']] } } },
  attack: { seconds: 0.56, events: [[0.2, 'hit']], bones: { ...free(ANIMATIONS.shield.attack.bones), armB1: { rot: [[0, 40], [0.2, -30, 'in'], [1, 0]] }, armB2: { rot: [[0, 50], [0.2, 16, 'in'], [1, 0]] } } },
  // Gathered to spring: before a leap, and before he changes his shape. It holds its last pose.
  crouch: {
    seconds: 0.36,
    bones: {
      hip: { pos: [[0, 0, 0], [0.7, -2, -16, 'out'], [1, -2, -16]], rot: stance(0.7, -6) },
      chest: { rot: stance(0.7, -16) },
      head: { rot: stance(0.7, 14) },
      armF1: { rot: stance(0.7, -34) },
      weapon: { rot: stance(0.7, -58) },
      armB1: { rot: stance(0.7, 30) },
      legF1: { rot: stance(0.7, 46) },
      legF2: { rot: stance(0.7, -82) },
      legB1: { rot: stance(0.7, 28) },
      legB2: { rot: stance(0.7, -70) },
      footF: { rot: stance(0.7, 30) },
      footB: { rot: stance(0.7, 36) },
      plume1: { rot: stance(0.7, 12) },
      plume2: { rot: stance(0.7, 20) }
    }
  },
  // In the air, the glaive carried up behind his head. It holds its last pose until he comes down.
  leap: {
    seconds: 0.3,
    bones: {
      hip: { pos: [[0, -2, -16], [1, 0, 4, 'out']], rot: [[0, -6], [1, 8, 'out']] },
      chest: { rot: [[0, -16], [1, 14, 'out']] },
      head: { rot: [[0, 14], [1, -10, 'out']] },
      armF1: { rot: [[0, -34], [1, 150, 'out']] },
      armF2: { rot: [[0, 0], [1, 30, 'out']] },
      weapon: { rot: [[0, -58], [1, 40, 'out']] },
      armB1: { rot: [[0, 30], [1, 40, 'out']] },
      armB2: { rot: [[0, 0], [1, 50, 'out']] },
      legF1: { rot: [[0, 46], [1, 52, 'out']] },
      legF2: { rot: [[0, -82], [1, -90, 'out']] },
      legB1: { rot: [[0, 28], [1, -24, 'out']] },
      legB2: { rot: [[0, -70], [1, -44, 'out']] },
      plume1: { rot: [[0, 12], [1, 30]] },
      plume2: { rot: [[0, 20], [1, 44]] },
      skirt: { rot: [[0, 0], [1, 14]] }
    }
  },
  // Between phases: the glaive held aloft and his head thrown back.
  roar: {
    seconds: 1.4,
    bones: {
      hip: { pos: [[0, 0, 0], [0.2, 0, 4, 'out'], [0.8, 0, 4], [1, 0, 0]] },
      chest: { rot: [[0, 0], [0.2, 16, 'out'], [0.5, 19], [0.8, 16], [1, 0]] },
      head: { rot: [[0, 0], [0.2, 18, 'out'], [0.8, 16], [1, 0]] },
      armF1: { rot: [[0, 0], [0.2, 128, 'out'], [0.5, 134], [0.8, 128], [1, 0]] },
      armF2: { rot: [[0, 0], [0.2, 20, 'out'], [0.8, 20], [1, 0]] },
      weapon: { rot: [[0, 0], [0.2, -24, 'out'], [0.8, -24], [1, 0]] },
      armB1: { rot: [[0, 0], [0.2, -64, 'out'], [0.8, -60], [1, 0]] },
      armB2: { rot: [[0, 0], [0.2, -30, 'out'], [0.8, -30], [1, 0]] },
      legF1: { rot: [[0, 0], [0.2, 16, 'out'], [0.8, 16], [1, 0]] },
      legB1: { rot: [[0, 0], [0.2, -16, 'out'], [0.8, -16], [1, 0]] },
      plume1: { rot: [[0, 0], [0.2, -30], [0.5, 10], [0.8, -10], [1, 0]] },
      plume2: { rot: [[0, 0], [0.26, -44], [0.56, 16], [0.86, -14], [1, 0]] }
    }
  },
  stun: { seconds: 1.3, bones: { ...free(ANIMATIONS.shield.open.bones), armB1: { rot: [[0, 0], [0.14, 54, 'out'], [0.8, 40], [1, 0]] }, armB2: { rot: [[0, 0], [0.14, 30, 'out'], [0.8, 24], [1, 0]] } } },
  hurt,
  down
};

// Laozi's household move as Erlang does when he strikes: the fan is swept over and down, and the pill is thrown
// with the same arm.
ANIMATIONS.fan = ANIMATIONS.gourd = { idle: ANIMATIONS.spear.idle, windup: ANIMATIONS.glaive.windup, attack: ANIMATIONS.glaive.attack, hurt, down };

/** A soldier's description, as tools/author.mjs wants it. */
export const soldier = weapon => ({ bones: BONES, parts: partsOf(weapon), animations: ANIMATIONS[weapon], events: ['hit'] });
