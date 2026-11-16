// The Monkey King, as a shadow puppet. He is drawn once, standing and facing right, in design coordinates
// (y down, feet on y = 200); each piece of leather belongs to a bone, and the author tool cuts the pieces apart,
// packs them into an atlas and writes the skeleton that ties them back together.
import { DYE, barbs, beads, blob, crescent, curve, dot, leather, line, poly, ribbon, scales, slit, stud } from '../leather.mjs';

/** Bones: name, parent, where the joint is and where the bone points, both in the standing pose. */
export const bones = [
  ['root', null, [100, 200], [112, 200]],
  ['hip', 'root', [100, 140], [100, 127]],
  ['chest', 'hip', [100, 127], [103, 100]],
  ['head', 'chest', [103, 100], [107, 78]],
  ['featherF1', 'head', [107.6, 66.6], [115.6, 42.6]],
  ['featherF2', 'featherF1', [115.6, 42.6], [132.6, 17.6]],
  ['featherB1', 'head', [101.6, 67.6], [92.6, 42.6]],
  ['featherB2', 'featherB1', [92.6, 42.6], [73.6, 22.6]],
  ['armF1', 'chest', [108, 105], [113, 123]],
  ['armF2', 'armF1', [113, 123], [121, 136]],
  ['handF', 'armF2', [121, 136], [125, 139]],
  ['staff', 'handF', [124, 138], [124, 78]],
  ['armB1', 'chest', [95, 105], [88, 122]],
  ['armB2', 'armB1', [88, 122], [91, 137]],
  ['handB', 'armB2', [91, 137], [93, 142]],
  ['legF1', 'hip', [104, 141], [109, 169]],
  ['legF2', 'legF1', [109, 169], [106, 193]],
  ['footF', 'legF2', [106, 193], [120, 198]],
  ['legB1', 'hip', [96, 141], [92, 169]],
  ['legB2', 'legB1', [92, 169], [90, 193]],
  ['footB', 'legB2', [90, 193], [104, 198]],
  ['tail1', 'hip', [93, 139], [77, 135]],
  ['tail2', 'tail1', [77, 135], [65, 117]],
  ['skirtF', 'hip', [104, 139], [107, 166]],
  ['skirtB', 'hip', [96, 139], [91, 164]]
];

/** Puppets have big heads: his is drawn a quarter larger about the neck, and the feathers ride up with the crown. */
const HEAD = 1.25,
  NECK = [103, 99],
  CROWN = [0.6, -6.4];
const big = art => `<g transform="translate(${NECK[0]} ${NECK[1]}) scale(${HEAD}) translate(${-NECK[0]} ${-NECK[1]})">${art}</g>`;
const lifted = art => `<g transform="translate(${CROWN[0]} ${CROWN[1]})">${art}</g>`;

const featherShape = (points, widths, dye) => {
  const reach = t => widths[0] + (widths.at(-1) - widths[0]) * t;
  return leather({
    shape: ribbon(points, widths),
    fill: dye,
    holes: barbs(points, reach, 3.2, 0.7, 0.55),
    over: line(curve(points), 0.7)
  });
};

const limb = (points, widths, dye, holes = [], over = '') => leather({ shape: ribbon(points, widths), fill: dye, holes, over });

/** The pieces, from the one furthest from the screen to the nearest. Each is `[name, bone, svg]`. */
export const parts = [
  ['featherB2', 'featherB2', lifted(featherShape([[92, 49], [84, 37], [73, 29]], [2.6, 2.2, 1.1], DYE.crimson))],
  ['featherB1', 'featherB1', lifted(featherShape([[101, 74], [97, 61], [92, 49]], [2.2, 2.8, 2.6], DYE.crimson) + stud(92, 49, 1.1))],

  ['armB1', 'armB1', limb([[95, 105], [91, 113], [88, 122]], [4.6, 4.2, 3.6], DYE.crimson, [crescent(92, 110, 2.2, 200), crescent(90, 116, 2, 200)])],
  ['armB2', 'armB2', limb([[88, 122], [89, 130], [91, 137]], [3.5, 3.3, 2.8], DYE.amber, beads([88.4, 125], [90.4, 134], 4, 0.8)) + stud(88, 122)],
  ['handB', 'handB', leather({ shape: blob([[88.6, 137], [91, 135.4], [94, 137.4], [95, 141], [93, 144.4], [90, 144], [88.2, 141]]), fill: DYE.fur, holes: [slit([91, 139], [94, 140.5], 0.5), slit([90.6, 141.2], [93.4, 142.6], 0.5)] }) + stud(91, 137, 1.1)],

  ['tail2', 'tail2', limb([[77, 135], [69, 128], [65, 117]], [2.2, 1.9, 1], DYE.fur, barbs([[77, 135], [69, 128], [65, 117]], 1.8, 3, 0.8, 0.45))],
  ['tail1', 'tail1', limb([[93, 139], [85, 139], [77, 135]], [2.8, 2.6, 2.2], DYE.fur, barbs([[93, 139], [85, 139], [77, 135]], 2.2, 3, 0.8, 0.45)) + stud(77, 135, 1)],

  ['legB1', 'legB1', limb([[96, 141], [94, 155], [92, 169]], [6, 5.4, 4.4], DYE.crimson, [slit([95, 146], [93.4, 163], 0.8), slit([98.4, 147], [96, 160], 0.6)])],
  ['legB2', 'legB2', limb([[92, 169], [91, 181], [90, 193]], [4.4, 4, 3.2], DYE.black, [crescent(91.4, 175, 2.2, 90), crescent(91, 181, 2, 90), crescent(90.6, 187, 1.8, 90)]) + stud(92, 169)],
  ['footB', 'footB', leather({ shape: blob([[87, 190.6], [92.4, 190.4], [98, 194.4], [104.6, 193.2], [106, 196], [103, 199.4], [88, 199.4], [86.4, 195]], 0.45), fill: DYE.black, holes: [slit([90, 196.6], [100, 196.8], 0.6)] }) + stud(90, 193, 1.1)],

  ['skirtB', 'skirtB', leather({ shape: poly([[90, 138.4], [101, 138.4], [101, 164], [96.6, 167.6], [92.4, 164.4], [88, 168], [84.6, 163.6]]), fill: DYE.crimson, holes: [slit([93, 143], [90, 160], 0.9), slit([97.4, 143], [96.4, 160], 0.9), ...beads([87, 164], [99, 163], 5, 0.7)] })],

  ['pelvis', 'hip', leather({ shape: blob([[94, 126], [110, 126], [112.4, 134], [111, 142.4], [100, 144.6], [92.6, 142.4], [92, 134]], 0.4), fill: DYE.amber, holes: [slit([96, 131], [100, 139], 0.9), slit([101, 130], [105, 139], 0.9), slit([106, 131], [109.4, 138.4], 0.9)] })],

  ['legF1', 'legF1', limb([[104, 141], [107, 155], [109, 169]], [6.6, 5.8, 4.8], DYE.red, [slit([104.4, 146], [108, 163], 0.9), slit([108, 146], [110.6, 160], 0.7), dot(104, 158, 0.9), dot(104.8, 162.4, 0.8)])],
  ['legF2', 'legF2', limb([[109, 169], [107.4, 181], [106, 193]], [4.8, 4.3, 3.4], DYE.black, [crescent(108, 175, 2.4, 90), crescent(107.4, 181, 2.2, 90), crescent(106.8, 187, 2, 90)], line(curve([[105, 170.6], [113, 170.4]]), 1.5, DYE.gold)) + stud(109, 169)],
  ['footF', 'footF', leather({ shape: blob([[102.6, 190.4], [108.6, 190.2], [114.4, 194.2], [121.4, 192.6], [123, 195.6], [120, 199.4], [104, 199.4], [102, 195]], 0.45), fill: DYE.black, holes: [slit([106, 196.6], [117, 196.8], 0.6), crescent(119.6, 195.6, 1.3, 200)], over: line(curve([[103.4, 191.6], [108.4, 191.6]]), 1.2, DYE.gold) }) + stud(106, 193, 1.1)],

  [
    'torso',
    'chest',
    leather({
      shape: blob([[99, 99], [107.4, 99], [113.6, 103], [115, 113], [111, 127.4], [94, 127.4], [90.4, 114], [91.6, 103.4]], 0.42),
      fill: DYE.green,
      holes: [...scales(91, 106.4, 24, 12, 3.3, 90)],
      over:
        // The collar and the belt, in gold.
        leather({ shape: blob([[97.4, 98.6], [108.6, 98.6], [111, 102.4], [103.4, 105.6], [95.6, 102.6]], 0.4), fill: DYE.gold, holes: beads([98.6, 101.4], [108.4, 101.4], 5, 0.75), edge: 1 }) +
        leather({ shape: poly([[93.4, 122.6], [111.8, 122.6], [111, 128], [94, 128]]), fill: DYE.gold, holes: [...beads([96, 125.3], [109, 125.3], 6, 0.8)], edge: 1 }) +
        leather({ shape: dot(102.6, 113.6, 4.6), fill: DYE.gold, holes: [dot(102.6, 113.6, 1.2), ...[0, 60, 120, 180, 240, 300].map(a => crescent(102.6 + 2.6 * Math.cos((a * Math.PI) / 180), 113.6 + 2.6 * Math.sin((a * Math.PI) / 180), 1.1, a + 180))], edge: 1 })
    })
  ],

  [
    'skirtF',
    'skirtF',
    // The tiger-skin kilt: amber, with the stripes cut out.
    leather({
      shape: poly([[96.4, 137.6], [112, 137.6], [118, 163.6], [113.6, 168.6], [109.6, 164], [105.4, 169.4], [101.2, 164.4], [96.6, 168.6], [93.4, 163]]),
      fill: DYE.amber,
      holes: [slit([99, 142], [103.6, 147], 1), slit([106, 141.6], [110.6, 146.6], 1), slit([97, 150], [102.6, 155.4], 1.1), slit([105.4, 149.6], [111.6, 155], 1.1), slit([98.6, 158.6], [103, 162.6], 0.9), slit([108, 157.6], [113.6, 162.6], 0.9)],
      over: line(poly([[96.4, 137.6], [112, 137.6], [112.6, 140.2], [96, 140.2]]), 0.6, DYE.ink, `fill="${DYE.gold}"`)
    })
  ],

  [
    'head',
    'head',
    big(leather({
      shape: blob([[95.2, 87], [97.4, 77.6], [105.6, 73.4], [113.6, 76.4], [117, 81.6], [123.6, 87.6], [122.4, 92.6], [115.4, 97.6], [106, 99], [98, 95.6]], 0.48),
      fill: DYE.fur,
      // The eye, the ear, the mouth and the fur of the cheek.
      holes: [blob([[110.4, 84.4], [113.6, 82.4], [117, 84.2], [113.6, 86.2]], 0.5), crescent(100.6, 87.4, 2.6, 0), crescent(101.6, 87.4, 1.3, 0), slit([116, 93.2], [121.6, 91], 0.6), slit([98.4, 92], [102.6, 95.6], 0.6), slit([103.6, 93.6], [107.4, 96.6], 0.6), slit([97, 81], [100, 84], 0.5)],
      // The face is painted: a red peach around the eye, and a pale muzzle.
      under: `<path d="${blob([[107, 80.6], [112.6, 78.6], [118, 82.6], [118.4, 87.6], [113, 90.4], [107.6, 88]], 0.5)}" fill="${DYE.red}" fill-opacity="0.9"/><path d="${blob([[116, 86.6], [123.6, 87.6], [122.4, 92.6], [116, 95], [112.6, 91]], 0.5)}" fill="${DYE.hide}" fill-opacity="0.9"/>`,
      over:
        `<circle cx="113.9" cy="84.3" r="1.15" fill="${DYE.ink}"/>` +
        line(curve([[109, 80.2], [113.6, 79.4], [117.6, 81.4]]), 1.1) +
        line(curve([[121.6, 87.4], [122.6, 88.2]]), 0.9) +
        // The golden band, and the knot of the crown the feathers stand in.
        leather({ shape: ribbon([[96.6, 80], [104.6, 76], [114.6, 77.6]], [1.9, 2.1, 1.7]), fill: DYE.gold, holes: beads([98.6, 79], [112.6, 77.4], 6, 0.6), edge: 0.9 }) +
        leather({ shape: blob([[100.4, 75.6], [103.6, 71.4], [107.6, 71.2], [109.6, 75.2], [105, 77]], 0.5), fill: DYE.red, holes: [dot(105, 74.2, 0.9)], edge: 0.9 })
    }) + stud(103, 99, 1))
  ],

  ['featherF1', 'featherF1', lifted(featherShape([[107, 73], [112, 61], [115, 49]], [2.2, 2.9, 2.7], DYE.red))],
  ['featherF2', 'featherF2', lifted(featherShape([[115, 49], [122, 35], [132, 24]], [2.7, 2.3, 1.1], DYE.red) + stud(115, 49, 1.1))],

  [
    'staff',
    'staff',
    // The staff: dark red, with a golden hoop at each end.
    leather({ shape: poly([[122.6, 76], [125.4, 76], [125.4, 200], [122.6, 200]]), fill: DYE.crimson, holes: [slit([124, 92], [124, 130], 0.45), slit([124, 146], [124, 184], 0.45)], opacity: 0.95, edge: 1.1 }) +
      leather({ shape: poly([[122, 75], [126, 75], [126, 88], [122, 88]]), fill: DYE.gold, holes: beads([124, 77.6], [124, 85.6], 3, 0.7), edge: 1 }) +
      leather({ shape: poly([[122, 188], [126, 188], [126, 201], [122, 201]]), fill: DYE.gold, holes: beads([124, 190.6], [124, 198.6], 3, 0.7), edge: 1 })
  ],

  ['armF1', 'armF1', limb([[108, 105], [111, 114], [113, 123]], [5, 4.6, 3.9], DYE.red, [crescent(109.6, 110, 2.4, 20), crescent(111.4, 116.4, 2.2, 20)]) + stud(108, 105)],
  ['armF2', 'armF2', limb([[113, 123], [117, 130], [121, 136]], [3.8, 3.5, 3], DYE.gold, beads([114.6, 125.4], [119.6, 133.6], 4, 0.85)) + stud(113, 123)],
  ['handF', 'handF', leather({ shape: blob([[119.4, 135.4], [122.6, 133.6], [126.6, 135.6], [127.6, 139.6], [125.4, 142.6], [121.6, 142.4], [119.2, 139.4]]), fill: DYE.fur, holes: [slit([122, 137.2], [126, 138.2], 0.5), slit([121.6, 139.6], [125.6, 140.6], 0.5)] }) + stud(121, 136, 1.1)]
];

// ---- Animations ------------------------------------------------------------------------------------------------
// Rotations are in degrees added to the standing pose, counter-clockwise as seen on the screen with the puppet
// facing right: for a limb that hangs down, a positive angle swings it forward. `pos` moves a bone, in stage units,
// x forward and y up. Times are fractions of the animation's length. A key may end with an easing: 'lin', 'in',
// 'out' or 'step'; with none, it eases in and out.
const sway = (amount, lag = 0) => [[0, -amount * lag], [0.25 + lag * 0.2, amount], [0.75 + lag * 0.2, -amount], [1, -amount * lag]];

/** The pose both feathers and the tail keep falling back to. */
const loose = (amount = 1) => ({
  featherF1: { rot: sway(4 * amount) },
  featherF2: { rot: sway(8 * amount, 0.3) },
  featherB1: { rot: sway(-4 * amount) },
  featherB2: { rot: sway(-8 * amount, 0.3) },
  tail1: { rot: sway(5 * amount) },
  tail2: { rot: sway(10 * amount, 0.3) }
});

export const animations = {
  // Standing, the staff planted: he breathes, and the feathers and the tail are never quite still.
  idle: {
    seconds: 2.2,
    bones: {
      ...loose(),
      hip: { pos: [[0, 0, 0], [0.5, 0, -1.6], [1, 0, 0]] },
      chest: { rot: [[0, 0], [0.5, -2.4], [1, 0]] },
      head: { rot: [[0, 0], [0.5, 3], [1, 0]] },
      armF1: { rot: [[0, 0], [0.5, 3], [1, 0]] },
      armF2: { rot: [[0, 0], [0.5, -4], [1, 0]] },
      armB1: { rot: [[0, 0], [0.5, -4], [1, 0]] },
      legF1: { rot: [[0, 0], [0.5, 3.4], [1, 0]] },
      legF2: { rot: [[0, 0], [0.5, -6.4], [1, 0]] },
      legB1: { rot: [[0, 0], [0.5, 3.4], [1, 0]] },
      legB2: { rot: [[0, 0], [0.5, -6.4], [1, 0]] },
      footF: { rot: [[0, 0], [0.5, 3], [1, 0]] },
      footB: { rot: [[0, 0], [0.5, 3], [1, 0]] }
    }
  },

  // Running: leaning into it, the staff carried low behind him.
  run: {
    seconds: 0.52,
    bones: {
      hip: { pos: [[0, 0, -3], [0.25, 0, 2, 'out'], [0.5, 0, -3, 'in'], [0.75, 0, 2, 'out'], [1, 0, -3, 'in']], rot: [[0, -6], [1, -6]] },
      chest: { rot: [[0, -12], [0.25, -9], [0.5, -12], [0.75, -9], [1, -12]] },
      head: { rot: [[0, 10], [0.25, 7], [0.5, 10], [0.75, 7], [1, 10]] },
      legF1: { rot: [[0, 44, 'lin'], [0.25, 8, 'lin'], [0.5, -34, 'lin'], [0.75, 6, 'lin'], [1, 44]] },
      legF2: { rot: [[0, -18, 'lin'], [0.25, -6, 'lin'], [0.5, -32, 'lin'], [0.75, -96, 'lin'], [1, -18]] },
      footF: { rot: [[0, 18], [0.25, 0], [0.5, -26], [0.75, -10], [1, 18]] },
      legB1: { rot: [[0, -34, 'lin'], [0.25, 6, 'lin'], [0.5, 44, 'lin'], [0.75, 8, 'lin'], [1, -34]] },
      legB2: { rot: [[0, -32, 'lin'], [0.25, -96, 'lin'], [0.5, -18, 'lin'], [0.75, -6, 'lin'], [1, -32]] },
      footB: { rot: [[0, -26], [0.25, -10], [0.5, 18], [0.75, 0], [1, -26]] },
      armF1: { rot: [[0, -42], [0.5, -30], [1, -42]] },
      armF2: { rot: [[0, 38], [0.5, 50], [1, 38]] },
      handF: { rot: [[0, 0], [1, 0]] },
      staff: { rot: [[0, 96], [0.5, 104], [1, 96]] },
      armB1: { rot: [[0, 46], [0.5, -40], [1, 46]] },
      armB2: { rot: [[0, 60], [0.5, 30], [1, 60]] },
      featherF1: { rot: [[0, 20], [0.5, 26], [1, 20]] },
      featherF2: { rot: [[0, 26], [0.25, 36], [0.75, 22], [1, 26]] },
      featherB1: { rot: [[0, 16], [0.5, 22], [1, 16]] },
      featherB2: { rot: [[0, 20], [0.25, 30], [0.75, 16], [1, 20]] },
      tail1: { rot: [[0, -22], [0.5, -30], [1, -22]] },
      tail2: { rot: [[0, -30], [0.25, -44], [0.75, -22], [1, -30]] },
      skirtF: { rot: [[0, 12], [0.5, -16], [1, 12]] },
      skirtB: { rot: [[0, -22], [0.5, -8], [1, -22]] }
    }
  },

  // Rising: knees up, the staff lifted across him. It holds its last pose until he starts to fall.
  jump: {
    seconds: 0.22,
    bones: {
      hip: { pos: [[0, 0, -8], [1, 0, 0, 'out']] },
      chest: { rot: [[0, -14], [1, 4, 'out']] },
      head: { rot: [[0, 8], [1, -6, 'out']] },
      legF1: { rot: [[0, 52], [1, 62, 'out']] },
      legF2: { rot: [[0, -100], [1, -104, 'out']] },
      footF: { rot: [[0, 0], [1, -28, 'out']] },
      legB1: { rot: [[0, 30], [1, -14, 'out']] },
      legB2: { rot: [[0, -80], [1, -40, 'out']] },
      footB: { rot: [[0, 0], [1, -40, 'out']] },
      armF1: { rot: [[0, -20], [1, 96, 'out']] },
      armF2: { rot: [[0, 30], [1, 40, 'out']] },
      staff: { rot: [[0, 60], [1, 62, 'out']] },
      armB1: { rot: [[0, 30], [1, -70, 'out']] },
      armB2: { rot: [[0, 20], [1, 20, 'out']] },
      featherF1: { rot: [[0, 10], [1, 34, 'out']] },
      featherF2: { rot: [[0, 14], [1, 48, 'out']] },
      featherB1: { rot: [[0, 8], [1, 26, 'out']] },
      featherB2: { rot: [[0, 10], [1, 40, 'out']] },
      tail1: { rot: [[0, -10], [1, 30, 'out']] },
      tail2: { rot: [[0, -14], [1, 40, 'out']] },
      skirtF: { rot: [[0, 0], [1, 22, 'out']] },
      skirtB: { rot: [[0, 0], [1, -30, 'out']] }
    }
  },

  // Falling: legs reaching for the ground, everything loose streaming upward.
  fall: {
    seconds: 0.5,
    bones: {
      chest: { rot: [[0, -6], [0.5, -9], [1, -6]] },
      head: { rot: [[0, 12], [1, 12]] },
      legF1: { rot: [[0, 34], [0.5, 30], [1, 34]] },
      legF2: { rot: [[0, -50], [0.5, -44], [1, -50]] },
      footF: { rot: [[0, -30], [1, -30]] },
      legB1: { rot: [[0, -22], [0.5, -18], [1, -22]] },
      legB2: { rot: [[0, -34], [0.5, -40], [1, -34]] },
      footB: { rot: [[0, -44], [1, -44]] },
      armF1: { rot: [[0, 120], [0.5, 126], [1, 120]] },
      armF2: { rot: [[0, 30], [1, 30]] },
      staff: { rot: [[0, 50], [0.5, 46], [1, 50]] },
      armB1: { rot: [[0, -110], [0.5, -118], [1, -110]] },
      armB2: { rot: [[0, -20], [1, -20]] },
      featherF1: { rot: [[0, -18], [0.5, -24], [1, -18]] },
      featherF2: { rot: [[0, -30], [0.5, -22], [1, -30]] },
      featherB1: { rot: [[0, -14], [0.5, -8], [1, -14]] },
      featherB2: { rot: [[0, -24], [0.5, -32], [1, -24]] },
      tail1: { rot: [[0, -40], [0.5, -46], [1, -40]] },
      tail2: { rot: [[0, -44], [0.5, -36], [1, -44]] },
      skirtF: { rot: [[0, 26], [0.5, 32], [1, 26]] },
      skirtB: { rot: [[0, -34], [0.5, -28], [1, -34]] }
    }
  },

  // Landing: a deep crouch that springs back.
  land: {
    seconds: 0.2,
    bones: {
      hip: { pos: [[0, 0, -4], [0.3, 0, -15, 'out'], [1, 0, 0]] },
      chest: { rot: [[0, -8], [0.3, -22, 'out'], [1, 0]] },
      head: { rot: [[0, 8], [0.3, 16, 'out'], [1, 0]] },
      legF1: { rot: [[0, 30], [0.3, 62, 'out'], [1, 0]] },
      legF2: { rot: [[0, -50], [0.3, -112, 'out'], [1, 0]] },
      footF: { rot: [[0, 0], [0.3, 46, 'out'], [1, 0]] },
      legB1: { rot: [[0, 10], [0.3, 44, 'out'], [1, 0]] },
      legB2: { rot: [[0, -40], [0.3, -104, 'out'], [1, 0]] },
      footB: { rot: [[0, 0], [0.3, 56, 'out'], [1, 0]] },
      armF1: { rot: [[0, 80], [0.3, 30, 'out'], [1, 0]] },
      armF2: { rot: [[0, 30], [0.3, 30], [1, 0]] },
      staff: { rot: [[0, 50], [0.3, 16], [1, 0]] },
      armB1: { rot: [[0, -80], [0.3, -30, 'out'], [1, 0]] },
      featherF1: { rot: [[0, -18], [0.4, 22], [1, 0]] },
      featherF2: { rot: [[0, -30], [0.5, 34], [1, 0]] },
      featherB1: { rot: [[0, -14], [0.4, 18], [1, 0]] },
      featherB2: { rot: [[0, -24], [0.5, 30], [1, 0]] },
      tail1: { rot: [[0, -40], [0.4, 16], [1, 0]] },
      tail2: { rot: [[0, -44], [0.5, 24], [1, 0]] },
      skirtF: { rot: [[0, 26], [0.4, -8], [1, 0]] },
      skirtB: { rot: [[0, -34], [0.4, 8], [1, 0]] }
    }
  },

  // First blow: a level sweep. The staff is drawn back for a moment, then whips through in front of him.
  attack1: {
    seconds: 0.34,
    events: [[0.3, 'hit']],
    bones: {
      hip: { pos: [[0, 0, 0], [0.16, -3, -2], [0.34, 7, -5, 'out'], [0.7, 6, -4], [1, 0, 0]], rot: [[0, 0], [0.16, 4], [0.34, -8, 'out'], [0.7, -6], [1, 0]] },
      chest: { rot: [[0, 0], [0.16, 16], [0.34, -20, 'out'], [0.7, -14], [1, 0]] },
      head: { rot: [[0, 0], [0.16, -10], [0.34, 14, 'out'], [0.7, 10], [1, 0]] },
      armF1: { rot: [[0, 0], [0.16, -70], [0.34, 78, 'out'], [0.7, 66], [1, 0]] },
      armF2: { rot: [[0, 0], [0.16, 60], [0.34, 8, 'out'], [0.7, 12], [1, 0]] },
      handF: { rot: [[0, 0], [0.16, 0], [0.34, -10, 'out'], [1, 0]] },
      staff: { rot: [[0, 0], [0.16, 104], [0.34, -146, 'out'], [0.7, -134], [1, 0]] },
      armB1: { rot: [[0, 0], [0.16, 40], [0.34, -60, 'out'], [0.7, -50], [1, 0]] },
      armB2: { rot: [[0, 0], [0.16, 40], [0.34, 30], [1, 0]] },
      legF1: { rot: [[0, 0], [0.16, -6], [0.34, 34, 'out'], [0.7, 30], [1, 0]] },
      legF2: { rot: [[0, 0], [0.16, -8], [0.34, -40, 'out'], [0.7, -34], [1, 0]] },
      footF: { rot: [[0, 0], [0.34, 14, 'out'], [1, 0]] },
      legB1: { rot: [[0, 0], [0.16, 8], [0.34, -26, 'out'], [0.7, -22], [1, 0]] },
      legB2: { rot: [[0, 0], [0.16, -20], [0.34, -6, 'out'], [1, 0]] },
      footB: { rot: [[0, 0], [0.34, 30, 'out'], [1, 0]] },
      featherF1: { rot: [[0, 0], [0.2, -16], [0.4, 30], [0.7, -8], [1, 0]] },
      featherF2: { rot: [[0, 0], [0.24, -26], [0.46, 44], [0.76, -14], [1, 0]] },
      featherB1: { rot: [[0, 0], [0.2, -12], [0.4, 26], [0.7, -6], [1, 0]] },
      featherB2: { rot: [[0, 0], [0.24, -22], [0.46, 40], [0.76, -12], [1, 0]] },
      tail1: { rot: [[0, 0], [0.2, 20], [0.42, -34], [0.72, 8], [1, 0]] },
      tail2: { rot: [[0, 0], [0.24, 28], [0.48, -46], [0.78, 12], [1, 0]] },
      skirtF: { rot: [[0, 0], [0.34, -18], [0.6, 8], [1, 0]] },
      skirtB: { rot: [[0, 0], [0.34, 14], [0.6, -6], [1, 0]] }
    }
  },

  // Second blow: the staff comes up from below and lifts what it meets.
  attack2: {
    seconds: 0.36,
    events: [[0.34, 'hit']],
    bones: {
      hip: { pos: [[0, 6, -4], [0.18, 3, -9], [0.38, 8, 2, 'out'], [0.7, 6, 0], [1, 0, 0]], rot: [[0, -6], [0.18, -10], [0.38, 6, 'out'], [0.7, 4], [1, 0]] },
      chest: { rot: [[0, -14], [0.18, -26], [0.38, 14, 'out'], [0.7, 10], [1, 0]] },
      head: { rot: [[0, 10], [0.18, 18], [0.38, -12, 'out'], [0.7, -8], [1, 0]] },
      armF1: { rot: [[0, 66], [0.18, 10], [0.38, 150, 'out'], [0.7, 140], [1, 0]] },
      armF2: { rot: [[0, 12], [0.18, 10], [0.38, 20, 'out'], [0.7, 24], [1, 0]] },
      staff: { rot: [[0, -134], [0.18, -196], [0.38, -40, 'out'], [0.7, -30], [1, 0]] },
      armB1: { rot: [[0, -50], [0.18, 30], [0.38, -80, 'out'], [0.7, -70], [1, 0]] },
      armB2: { rot: [[0, 30], [0.38, 10], [1, 0]] },
      legF1: { rot: [[0, 30], [0.18, 50], [0.38, 14, 'out'], [0.7, 12], [1, 0]] },
      legF2: { rot: [[0, -34], [0.18, -70], [0.38, -10, 'out'], [1, 0]] },
      footF: { rot: [[0, 10], [0.18, 24], [0.38, -6, 'out'], [1, 0]] },
      legB1: { rot: [[0, -22], [0.18, 4], [0.38, -30, 'out'], [0.7, -24], [1, 0]] },
      legB2: { rot: [[0, -6], [0.18, -60], [0.38, -4, 'out'], [1, 0]] },
      footB: { rot: [[0, 30], [0.18, 40], [0.38, 10, 'out'], [1, 0]] },
      featherF1: { rot: [[0, 0], [0.2, 20], [0.44, -30], [0.74, 10], [1, 0]] },
      featherF2: { rot: [[0, 0], [0.24, 30], [0.5, -46], [0.8, 14], [1, 0]] },
      featherB1: { rot: [[0, 0], [0.2, 16], [0.44, -26], [0.74, 8], [1, 0]] },
      featherB2: { rot: [[0, 0], [0.24, 26], [0.5, -40], [0.8, 12], [1, 0]] },
      tail1: { rot: [[0, 0], [0.2, -20], [0.44, 26], [0.74, -8], [1, 0]] },
      tail2: { rot: [[0, 0], [0.24, -30], [0.5, 38], [0.8, -12], [1, 0]] },
      skirtF: { rot: [[0, -10], [0.38, 20], [0.66, -6], [1, 0]] },
      skirtB: { rot: [[0, 8], [0.38, -18], [0.66, 6], [1, 0]] }
    }
  },

  // Third blow: both hands overhead, then down with his whole weight.
  attack3: {
    seconds: 0.56,
    events: [[0.42, 'hit']],
    bones: {
      hip: { pos: [[0, 4, 0], [0.28, -2, 9, 'out'], [0.44, 10, -14, 'in'], [0.7, 9, -12], [1, 0, 0]], rot: [[0, 0], [0.28, 8, 'out'], [0.44, -14, 'in'], [0.7, -10], [1, 0]] },
      chest: { rot: [[0, 6], [0.28, 24, 'out'], [0.44, -34, 'in'], [0.7, -26], [1, 0]] },
      head: { rot: [[0, -6], [0.28, -16, 'out'], [0.44, 26, 'in'], [0.7, 20], [1, 0]] },
      armF1: { rot: [[0, 120], [0.28, 196, 'out'], [0.44, 64, 'in'], [0.7, 60], [1, 0]] },
      armF2: { rot: [[0, 20], [0.28, 40, 'out'], [0.44, 4, 'in'], [1, 0]] },
      staff: { rot: [[0, -30], [0.28, 50, 'out'], [0.44, -152, 'in'], [0.7, -146], [1, 0]] },
      armB1: { rot: [[0, -60], [0.28, -190, 'out'], [0.44, -70, 'in'], [0.7, -60], [1, 0]] },
      armB2: { rot: [[0, 10], [0.28, -30, 'out'], [0.44, 40, 'in'], [1, 0]] },
      legF1: { rot: [[0, 10], [0.28, 30, 'out'], [0.44, 66, 'in'], [0.7, 60], [1, 0]] },
      legF2: { rot: [[0, -10], [0.28, -70, 'out'], [0.44, -96, 'in'], [0.7, -88], [1, 0]] },
      footF: { rot: [[0, 0], [0.28, -30, 'out'], [0.44, 34, 'in'], [1, 0]] },
      legB1: { rot: [[0, -20], [0.28, -6, 'out'], [0.44, 14, 'in'], [0.7, 12], [1, 0]] },
      legB2: { rot: [[0, -4], [0.28, -50, 'out'], [0.44, -70, 'in'], [0.7, -64], [1, 0]] },
      footB: { rot: [[0, 10], [0.28, -40, 'out'], [0.44, 50, 'in'], [1, 0]] },
      featherF1: { rot: [[0, 0], [0.28, 26], [0.5, -40], [0.76, 14], [1, 0]] },
      featherF2: { rot: [[0, 0], [0.32, 40], [0.56, -60], [0.82, 20], [1, 0]] },
      featherB1: { rot: [[0, 0], [0.28, 22], [0.5, -34], [0.76, 12], [1, 0]] },
      featherB2: { rot: [[0, 0], [0.32, 34], [0.56, -52], [0.82, 16], [1, 0]] },
      tail1: { rot: [[0, 0], [0.28, 26], [0.5, -44], [0.76, 12], [1, 0]] },
      tail2: { rot: [[0, 0], [0.32, 36], [0.56, -60], [0.82, 18], [1, 0]] },
      skirtF: { rot: [[0, 0], [0.28, 24], [0.5, -20], [1, 0]] },
      skirtB: { rot: [[0, 0], [0.28, -24], [0.5, 18], [1, 0]] }
    }
  },

  // The cloud somersault: one tight forward turn, tucked around the staff.
  dash: {
    seconds: 0.3,
    bones: {
      hip: { pos: [[0, 0, 0], [0.2, 0, 34, 'out'], [0.8, 0, 34, 'lin'], [1, 0, 0, 'in']], rot: [[0, -20, 'lin'], [0.9, -360, 'lin'], [1, -360]] },
      chest: { rot: [[0, -20], [0.2, -52], [0.8, -52], [1, 0]] },
      head: { rot: [[0, 10], [0.2, -30], [0.8, -30], [1, 0]] },
      legF1: { rot: [[0, 30], [0.2, 104], [0.8, 104], [1, 0]] },
      legF2: { rot: [[0, -40], [0.2, -130], [0.8, -130], [1, 0]] },
      legB1: { rot: [[0, 20], [0.2, 90], [0.8, 90], [1, 0]] },
      legB2: { rot: [[0, -40], [0.2, -124], [0.8, -124], [1, 0]] },
      armF1: { rot: [[0, 30], [0.2, 70], [0.8, 70], [1, 0]] },
      armF2: { rot: [[0, 20], [0.2, 80], [0.8, 80], [1, 0]] },
      staff: { rot: [[0, 20], [0.2, 96], [0.8, 96], [1, 0]] },
      armB1: { rot: [[0, 20], [0.2, 80], [0.8, 80], [1, 0]] },
      armB2: { rot: [[0, 20], [0.2, 70], [0.8, 70], [1, 0]] },
      featherF1: { rot: [[0, 10], [0.2, 40], [0.8, 40], [1, 0]] },
      featherF2: { rot: [[0, 14], [0.2, 50], [0.8, 50], [1, 0]] },
      featherB1: { rot: [[0, 8], [0.2, 30], [0.8, 30], [1, 0]] },
      featherB2: { rot: [[0, 10], [0.2, 44], [0.8, 44], [1, 0]] },
      tail1: { rot: [[0, -10], [0.2, -50], [0.8, -50], [1, 0]] },
      tail2: { rot: [[0, -14], [0.2, -60], [0.8, -60], [1, 0]] }
    }
  },

  // Struck: thrown back off his feet for a moment.
  hurt: {
    seconds: 0.34,
    bones: {
      hip: { pos: [[0, 0, 0], [0.3, -4, 8, 'out'], [1, 0, 0, 'in']], rot: [[0, 0], [0.3, 16, 'out'], [1, 0]] },
      chest: { rot: [[0, 0], [0.3, 22, 'out'], [1, 0]] },
      head: { rot: [[0, 0], [0.3, -26, 'out'], [1, 0]] },
      armF1: { rot: [[0, 0], [0.3, 70, 'out'], [1, 0]] },
      armF2: { rot: [[0, 0], [0.3, 30, 'out'], [1, 0]] },
      staff: { rot: [[0, 0], [0.3, -50, 'out'], [1, 0]] },
      armB1: { rot: [[0, 0], [0.3, 80, 'out'], [1, 0]] },
      armB2: { rot: [[0, 0], [0.3, 40, 'out'], [1, 0]] },
      legF1: { rot: [[0, 0], [0.3, 46, 'out'], [1, 0]] },
      legF2: { rot: [[0, 0], [0.3, -60, 'out'], [1, 0]] },
      legB1: { rot: [[0, 0], [0.3, 20, 'out'], [1, 0]] },
      legB2: { rot: [[0, 0], [0.3, -50, 'out'], [1, 0]] },
      featherF1: { rot: [[0, 0], [0.3, -34], [0.7, 16], [1, 0]] },
      featherF2: { rot: [[0, 0], [0.36, -50], [0.76, 24], [1, 0]] },
      featherB1: { rot: [[0, 0], [0.3, -28], [0.7, 12], [1, 0]] },
      featherB2: { rot: [[0, 0], [0.36, -44], [0.76, 20], [1, 0]] },
      tail1: { rot: [[0, 0], [0.3, 30], [0.7, -12], [1, 0]] },
      tail2: { rot: [[0, 0], [0.36, 44], [0.76, -18], [1, 0]] },
      skirtF: { rot: [[0, 0], [0.3, -24], [0.7, 8], [1, 0]] },
      skirtB: { rot: [[0, 0], [0.3, -20], [0.7, 8], [1, 0]] }
    }
  },

  // The body beyond the body: he plucks a tuft from behind his ear, brings it to his lips, and blows.
  conjure: {
    seconds: 0.7,
    bones: {
      hip: { pos: [[0, 0, 0], [0.28, -2, -3, 'out'], [0.56, 3, -1, 'out'], [0.8, 3, -1], [1, 0, 0]], rot: [[0, 0], [0.28, 4, 'out'], [0.56, -5, 'out'], [0.8, -5], [1, 0]] },
      chest: { rot: [[0, 0], [0.28, 10, 'out'], [0.56, -12, 'out'], [0.8, -12], [1, 0]] },
      head: { rot: [[0, 0], [0.28, 14, 'out'], [0.56, -10, 'out'], [0.8, -8], [1, 0]] },
      armB1: { rot: [[0, 0], [0.28, 176, 'out'], [0.56, 112, 'out'], [0.8, 104], [1, 0]] },
      armB2: { rot: [[0, 0], [0.28, 74, 'out'], [0.56, 62, 'out'], [0.8, 40], [1, 0]] },
      handB: { rot: [[0, 0], [0.28, 30], [0.56, -20], [0.8, -40], [1, 0]] },
      armF1: { rot: [[0, 0], [0.28, -8], [0.56, 6], [1, 0]] },
      staff: { rot: [[0, 0], [0.28, 6], [0.56, -6], [1, 0]] },
      legF1: { rot: [[0, 0], [0.28, 8, 'out'], [0.56, 14, 'out'], [0.8, 14], [1, 0]] },
      legF2: { rot: [[0, 0], [0.28, -14, 'out'], [0.56, -20, 'out'], [0.8, -20], [1, 0]] },
      legB1: { rot: [[0, 0], [0.28, -4], [0.56, -10, 'out'], [0.8, -10], [1, 0]] },
      legB2: { rot: [[0, 0], [0.28, -6], [0.56, -4], [1, 0]] },
      featherF1: { rot: [[0, 0], [0.28, 14], [0.6, -22], [0.84, 10], [1, 0]] },
      featherF2: { rot: [[0, 0], [0.32, 22], [0.66, -34], [0.88, 14], [1, 0]] },
      featherB1: { rot: [[0, 0], [0.28, 12], [0.6, -18], [0.84, 8], [1, 0]] },
      featherB2: { rot: [[0, 0], [0.32, 20], [0.66, -30], [0.88, 12], [1, 0]] },
      tail1: { rot: [[0, 0], [0.28, -16], [0.6, 20], [1, 0]] },
      tail2: { rot: [[0, 0], [0.34, -26], [0.66, 30], [1, 0]] },
      skirtF: { rot: [[0, 0], [0.56, 8], [1, 0]] },
      skirtB: { rot: [[0, 0], [0.56, 10], [1, 0]] }
    }
  },
  // Beaten: he goes over backwards, the staff falling from his hand. It holds its last pose until he is up again.
  down: {
    seconds: 0.8,
    bones: {
      hip: { pos: [[0, 0, 0], [0.3, -12, 14, 'out'], [0.66, -28, -42, 'in'], [0.8, -30, -36, 'out'], [1, -32, -43, 'in']], rot: [[0, 0], [0.3, 34, 'out'], [0.66, 86, 'in'], [0.8, 80], [1, 88]] },
      chest: { rot: [[0, 0], [0.3, 18], [0.66, 6], [1, 2]] },
      head: { rot: [[0, 0], [0.3, -26], [0.66, 12], [1, 8]] },
      armF1: { rot: [[0, 0], [0.3, 90, 'out'], [0.66, 150], [1, 164]] },
      armF2: { rot: [[0, 0], [0.66, 24], [1, 16]] },
      staff: { rot: [[0, 0], [0.3, -50], [0.66, -150], [1, -168]] },
      armB1: { rot: [[0, 0], [0.3, 80, 'out'], [0.66, 126], [1, 134]] },
      armB2: { rot: [[0, 0], [0.66, 30], [1, 22]] },
      legF1: { rot: [[0, 0], [0.3, 50, 'out'], [0.66, 70], [0.82, 30], [1, 18]] },
      legF2: { rot: [[0, 0], [0.3, -40], [0.66, -76], [0.82, -30], [1, -22]] },
      legB1: { rot: [[0, 0], [0.3, 24, 'out'], [0.66, 34], [0.82, 6], [1, -4]] },
      legB2: { rot: [[0, 0], [0.3, -44], [0.66, -40], [1, -12]] },
      footF: { rot: [[0, 0], [1, -30]] },
      footB: { rot: [[0, 0], [1, -30]] },
      featherF1: { rot: [[0, 0], [0.3, -36], [0.66, 30], [1, 12]] },
      featherF2: { rot: [[0, 0], [0.36, -52], [0.72, 44], [1, 18]] },
      featherB1: { rot: [[0, 0], [0.3, -30], [0.66, 24], [1, 8]] },
      featherB2: { rot: [[0, 0], [0.36, -46], [0.72, 38], [1, 14]] },
      tail1: { rot: [[0, 0], [0.3, 30], [0.66, -30], [1, -16]] },
      tail2: { rot: [[0, 0], [0.36, 44], [0.72, -40], [1, -20]] },
      skirtF: { rot: [[0, 0], [0.5, -30], [1, -12]] },
      skirtB: { rot: [[0, 0], [0.5, -26], [1, -10]] }
    }
  }
};

// The staff in his hand, or not: on a track of its own, as it may be taken from him. A staff put away is drawn
// too small to see.
animations.held = { seconds: 1, bones: { staff: { scale: [[0, 1], [1, 1]] } } };
animations.bare = { seconds: 1, bones: { staff: { scale: [[0, 0.02], [1, 0.02]] } } };

export const events = ['hit'];
