// Sculpts every model of the game at three levels of detail and writes each level to
// assets/models-<level>.bin with an index beside it.
//   node tools/models.mjs                     everything
//   node tools/models.mjs --level=mid         one level
//   node tools/models.mjs hero lu             only those named, at every level
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { ANKLE_DEPTH, BIND, BONES, HANDS, JOINTS, YARD_BONES, YARD_GRIPS } from '../src/view/rig.mjs';
import { pack, sculpt } from './sculpt.mjs';
import { guardianLion, templeStele } from './carved-stone.mjs';
import { finishEquipment, makeGlaiveBlade } from './equipment-detail.mjs';
import { detailSceneMesh } from './scene-detail.mjs';
import { PROP_SURFACE } from '../src/view/prop-surface.mjs';

const rgb = (hex) => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255].map((v) => Math.pow(v, 2.2));
const dim = (c, k) => c.map((v) => v * k);
const SKIN = rgb(0xcf9e78),
  HAIR = rgb(0x15151a),
  STEEL = rgb(0xb9c2cf),
  IRON = rgb(0x3d4149),
  WOOD = rgb(0x4a2f1c),
  RED = rgb(0xb3221c),
  GOLD = rgb(0xb58a3a),
  SNOW = rgb(0xe8eef4),
  STONE = rgb(0x767c88);

/** Where every bone is in the sculpted pose: a rotation and a place in the model's space. */
function bindPose(palette) {
  const world = { root: { r: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] } };
  for (const name of palette) {
    const [parent, x, y, z] = JOINTS[name],
      p = world[parent],
      a = BIND[name] ?? 0,
      c = Math.cos(a),
      s = Math.sin(a),
      l = [c, -s, 0, s, c, 0, 0, 0, 1],
      r = new Array(9);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = p.r[i * 3] * l[j] + p.r[i * 3 + 1] * l[3 + j] + p.r[i * 3 + 2] * l[6 + j];
    world[name] = { r, t: [p.r[0] * x + p.r[1] * y + p.r[2] * z + p.t[0], p.r[3] * x + p.r[4] * y + p.r[5] * z + p.t[1], p.r[6] * x + p.r[7] * y + p.r[8] * z + p.t[2]] };
  }
  return palette.map((name) => world[name]);
}

/** A figure's solids. `look` says how he is dressed. */
function person(look, palette) {
  let part = 'body';
  const out = [],
    bone = (name) => palette.indexOf(name),
    cap = (name, a, b, ra, rb, colour, more = {}) => out.push({ kind: 'cap', bone: bone(name), part, a, b, ra, rb, colour, ...more }),
    egg = (name, c, r, colour, more = {}) => out.push({ kind: 'egg', bone: bone(name), part, c, r, colour, ...more }),
    box = (name, c, h, colour, more = {}) => out.push({ kind: 'box', bone: bone(name), part, c, h, colour, ...more }),
    { coat, trim, legs, boots } = look,
    under = dim(coat, 0.62),
    w = look.bulk ?? 1,
    detailedHands = palette === BONES;

  // Legs first, so that the coat lies over them.
  for (const side of ['L', 'R']) {
    const leg = 'leg' + side,
      shin = 'shin' + side,
      ankle = 'foot' + side,
      bootPoint = ([x, y, z]) => [x, y - ANKLE_DEPTH, z];
    cap(leg, [0, 0.02, 0], [0, -0.45, 0], 0.09 * w, 0.064, legs, { k: 0.03 });
    cap(shin, [0, 0, 0], [0, -0.2, 0], 0.064, 0.055, legs, { k: 0.03 });
    // The boot, on a finer grid: a creased cloth shaft bound at the calf, an ankle, a heel,
    // an instep running to a rounded toe, and a stitched sole standing a little proud.
    part = 'boot';
    const leather = boots,
      sole = dim(boots, 0.45),
      welt = dim(boots, 2.2);
    cap(shin, [0, -0.13, 0], [0, -0.37, 0.002], 0.06, 0.046, leather, { k: 0.012, fold: { n: 3, amp: 0.003, from: 0.3 } });
    for (let i = 0; i < 4; i++) egg(shin, [0, -0.17 - i * 0.05, 0], [0.0625 - i * 0.004, 0.009, 0.0625 - i * 0.004], welt, { k: 0.005 });
    egg(ankle, bootPoint([0, -0.4, 0.002]), [0.043, 0.04, 0.05], leather, { k: 0.02 });
    egg(ankle, bootPoint([0, -0.447, -0.03]), [0.037, 0.03, 0.038], leather, { k: 0.02 });
    cap(ankle, bootPoint([0, -0.415, 0.02]), bootPoint([0, -0.455, 0.105]), 0.04, 0.031, leather, { k: 0.02 });
    egg(ankle, bootPoint([0, -0.455, 0.13]), [0.041, 0.025, 0.044], leather, { k: 0.018 });
    egg(ankle, bootPoint([0, -0.44, 0.158]), [0.022, 0.016, 0.016], leather, { k: 0.014 });
    for (const off of [1, -1]) {
      egg(ankle, bootPoint([off * 0.036, -0.404, -0.008]), [0.012, 0.014, 0.014], leather, { k: 0.012 });
    }
    cap(ankle, bootPoint([0, -0.398, 0.047]), bootPoint([0, -0.44, 0.125]), 0.004, 0.004, welt, { k: 0.003 });
    egg(ankle, bootPoint([0, -0.478, 0.052]), [0.041, 0.011, 0.118], sole, { k: 0.006 });
    egg(ankle, bootPoint([0, -0.47, 0.052]), [0.043, 0.004, 0.12], welt, { k: 0.003 });
    part = 'body';
  }
  // The skirt of the coat: two overlapping halves, each half following its leg a little, pleated.
  const hem = look.long ? -0.6 : -0.38;
  for (const [side, leg] of [
    [1, 'legL'],
    [-1, 'legR']
  ])
    cap('hips', [side * 0.035, 0.06, 0], [side * 0.07, hem, 0], 0.15 * w, (look.long ? 0.24 : 0.2) * w, under, { k: 0.03, flat: 0.8, fold: { n: 11, amp: 0.011, from: 0.15 }, also: [bone(leg), 0.4] });
  egg('hips', [0, hem - 0.015, 0], [(look.long ? 0.315 : 0.275) * w, 0.02, (look.long ? 0.265 : 0.23) * w], trim, { k: 0.01 });
  // Torso: belly, chest, shoulders; the coat crossed right over left with a band at its edge.
  egg('spine', [0, 0.08, 0], [0.165 * w, 0.17, 0.118 * w], coat, { k: 0.04 });
  egg('spine', [0, 0.31, 0.005], [0.195 * w, 0.2, 0.128 * w], coat, { k: 0.05 });
  for (const side of [1, -1]) egg('spine', [side * 0.185 * w, 0.445, 0], [0.09, 0.075, 0.09], coat, { k: 0.04 });
  cap('spine', [0.07, 0.5, 0.078], [0.02, 0.33, 0.134 * w], 0.02, 0.023, trim, { k: 0.006, flat: 0.85 });
  cap('spine', [0.02, 0.33, 0.134 * w], [-0.075, 0.09, 0.124 * w], 0.023, 0.025, trim, { k: 0.006, flat: 0.85 });
  cap('spine', [-0.07, 0.5, 0.078], [-0.012, 0.37, 0.13 * w], 0.02, 0.021, trim, { k: 0.006, flat: 0.85 });
  egg('spine', [0, 0.515, -0.02], [0.082, 0.03, 0.085], trim, { k: 0.012 });
  cap('spine', [0, 0.47, 0.005], [0, 0.6, 0.012], 0.05, 0.046, SKIN, { k: 0.02 });
  // Sash: wound twice, knotted at the left hip, the ends hanging.
  egg('spine', [0, 0.035, 0], [0.192 * w, 0.046, 0.142 * w], look.sash ?? trim, { k: 0.008 });
  egg('spine', [0, 0.085, 0], [0.19 * w, 0.022, 0.14 * w], dim(look.sash ?? trim, 0.7), { k: 0.006 });
  egg('spine', [0.1, 0.04, 0.115 * w], [0.035, 0.03, 0.025], look.sash ?? trim, { k: 0.01 });
  cap('hips', [0.1, 0.08, 0.125 * w], [0.12, -0.2, 0.17 * w], 0.016, 0.026, look.sash ?? trim, { k: 0.008, flat: 0.35, fold: { n: 3, amp: 0.004 }, also: [bone('legL'), 0.3] });
  cap('hips', [0.085, 0.08, 0.125 * w], [0.06, -0.15, 0.165 * w], 0.014, 0.022, dim(look.sash ?? trim, 0.8), { k: 0.008, flat: 0.35, also: [bone('legL'), 0.3] });

  // Arms: a full sleeve gathered into a bound cuff, and a hand closed as on a haft.
  for (const side of ['L', 'R']) {
    const arm = 'arm' + side,
      fore = 'fore' + side;
    cap(arm, [0, 0.01, 0], [0, -0.29, 0], 0.07 * w, 0.058, coat, { k: 0.035, fold: { n: 5, amp: 0.004 } });
    cap(fore, [0, 0, 0], [0, -0.17, 0], 0.056, 0.064, coat, { k: 0.03, fold: { n: 6, amp: 0.005 } });
    cap(fore, [0, -0.15, 0], [0, -0.235, 0], 0.05, 0.043, look.cuff ?? trim, { k: 0.01 });
    for (let i = 0; i < 3; i++) egg(fore, [0, -0.165 - i * 0.03, 0], [0.052 - i * 0.003, 0.007, 0.052 - i * 0.003], dim(look.cuff ?? trim, 0.55), { k: 0.004 });
    // The hand, on its own fine grid: a palm, four fingers of three joints curled as round a haft,
    // knuckles, nails, and a thumb closing over them.
    part = 'hand';
    const sk = look.skin ?? SKIN,
      hand = HANDS[side],
      inward = -hand.side,
      local = (point, origin) => point.map((v, i) => v - origin[i]),
      palm = hand.palm,
      nail = [0.78, 0.6, 0.52];
    cap(fore, [0, -0.2, 0], [0, -0.258, 0], 0.03, 0.026, sk, { k: 0.01, flat: 0.8 });
    box(palm, local([inward * 0.004, -0.292, 0.002], hand.wrist), [0.013, 0.034, 0.036], sk, { k: 0.012, round: 0.012 });
    egg(palm, local([inward * 0.014, -0.282, 0.026], hand.wrist), [0.012, 0.024, 0.014], sk, { k: 0.012 });
    for (const { joints, points, radius } of hand.fingers) {
      const boneAt = (i) => detailedHands ? joints[i] : palm,
        originAt = (i) => detailedHands ? points[i] : hand.wrist;
      egg(boneAt(0), local(points[0], originAt(0)), [0.0105, 0.0105, 0.0098], sk, { k: 0.008 });
      const widths = [1, 0.95, 0.88, 0.78];
      for (let i = 0; i < joints.length; i++) {
        cap(boneAt(i), local(points[i], originAt(i)), local(points[i + 1], originAt(i)), radius * widths[i], radius * widths[i + 1], sk, { k: i ? 0.004 : 0.006 });
      }
      const [x, y, z] = points[3];
      egg(boneAt(2), local([x + inward * 0.004, y + 0.004, z], originAt(2)), [0.0035, 0.0068, 0.0058], nail, { k: 0.0015 });
    }
    const { joints: thumb, points } = hand.thumb,
      thumbA = detailedHands ? thumb[0] : palm,
      thumbB = detailedHands ? thumb[1] : palm,
      originA = detailedHands ? points[0] : hand.wrist,
      originB = detailedHands ? points[1] : hand.wrist;
    cap(thumbA, local(points[0], originA), local(points[1], originA), 0.0115, 0.0105, sk, { k: 0.008 });
    cap(thumbB, local(points[1], originB), local(points[2], originB), 0.0102, 0.0086, sk, { k: 0.005 });
    egg(thumbB, local([inward * 0.05, -0.33, 0.038], originB), [0.003, 0.007, 0.006], nail, { k: 0.0015 });
    part = 'body';
  }

  // The head is sculpted on a much finer grid than the body: a skull with brow, cheekbones and jaw,
  // eyes with lids, a nose with wings and nostrils, two lips, ears with their hollows.
  part = 'head';
  const skin = look.skin ?? SKIN,
    lip = [skin[0] * 0.78, skin[1] * 0.5, skin[2] * 0.48],
    shadow = dim(skin, 0.5),
    f = look.face ?? {},
    jaw = f.jaw ?? 1,
    brow = f.brow ?? 1;
  cap('spine', [0, 0.46, 0.0], [0, 0.6, 0.014], 0.05, 0.046, skin, { k: 0.02 });
  for (const side of [1, -1]) cap('spine', [side * 0.02, 0.6, 0.0], [side * 0.012, 0.5, 0.035], 0.012, 0.012, skin, { k: 0.02 }); // the cords of the neck
  egg('spine', [0, 0.545, 0.043], [0.011, 0.014, 0.01], skin, { k: 0.015 });
  if (f.portrait) {
    portraitHead({ cap, egg, box }, skin, f);
  } else {
    egg('head', [0, 0.135, -0.006], [0.077, 0.092, 0.094], skin, { k: 0.03 });
    egg('head', [0, 0.068, 0.02], [0.061 * jaw, 0.076, 0.069], skin, { k: 0.04 });
    egg('head', [0, 0.012, 0.056], [0.03 * jaw, 0.022, 0.026], skin, { k: 0.025 });
    egg('head', [0, 0.132, 0.077], [0.058, 0.011 * brow, 0.016 * brow], skin, { k: 0.016 });
    egg('head', [0, 0.168, 0.06], [0.055, 0.035, 0.03], skin, { k: 0.03 }); // forehead
    for (const side of [1, -1]) {
      egg('head', [side * 0.05 * jaw, 0.04, 0.0], [0.022, 0.03, 0.03], skin, { k: 0.03 });
      egg('head', [side * 0.05, 0.094, 0.052], [0.022, 0.018, 0.022], skin, { k: 0.03 });
      // The eye: a hollow, the ball in it, the iris, and a lid above and below.
      egg('head', [side * 0.031, 0.115, 0.083], [0.019, 0.012, 0.014], shadow, { k: 0.008, cut: true });
      egg('head', [side * 0.031, 0.114, 0.072], [0.0125, 0.0125, 0.0125], [0.82, 0.8, 0.76], { k: 0.002 });
      egg('head', [side * 0.0305, 0.114, 0.0832], [0.0058, 0.0058, 0.003], rgb(0x2a1a10), { k: 0.001 });
      egg('head', [side * 0.0305, 0.114, 0.0852], [0.0026, 0.0026, 0.0016], [0.01, 0.01, 0.01], { k: 0.0008 });
      egg('head', [side * 0.031, 0.1222, 0.0765], [0.0175, 0.0055, 0.0115], skin, { k: 0.003 });
      egg('head', [side * 0.031, 0.1065, 0.0755], [0.0155, 0.004, 0.0105], skin, { k: 0.003 });
      cap('head', [side * 0.011, 0.133 + 0.002 * brow, 0.089], [side * 0.05, 0.136, 0.076], 0.0045 * brow, 0.0028, HAIR, { k: 0.003, rough: { scale: 400, amp: 0.003 } });
      // The ear: a rim, a lobe, and the hollow inside.
      egg('head', [side * 0.08, 0.108, -0.006], [0.008, 0.028, 0.018], skin, { k: 0.008, turn: [0, side * 0.35, 0] });
      egg('head', [side * 0.079, 0.085, -0.002], [0.007, 0.011, 0.009], skin, { k: 0.006 });
      egg('head', [side * 0.087, 0.11, -0.001], [0.004, 0.017, 0.009], shadow, { k: 0.004, cut: true });
      // The wing of the nose and its nostril.
      egg('head', [side * 0.0135, 0.077, 0.098], [0.009, 0.0085, 0.0105], skin, { k: 0.008 });
      egg('head', [side * 0.007, 0.0705, 0.1035], [0.0042, 0.003, 0.0048], dim(skin, 0.25), { k: 0.002, cut: true });
      cap('head', [side * 0.018, 0.074, 0.092], [side * 0.03, 0.05, 0.082], 0.002, 0.002, shadow, { k: 0.006, cut: true }); // the fold from nose to mouth
    }
    cap('head', [0, 0.126, 0.086], [0, 0.086, 0.108], 0.0078, 0.0105, skin, { k: 0.012 });
    egg('head', [0, 0.08, 0.1095], [0.0125, 0.0105, 0.012], skin, { k: 0.008 });
    egg('head', [0, 0.066, 0.094], [0.016, 0.008, 0.008], skin, { k: 0.01 });
    egg('head', [0, 0.0575, 0.0935], [0.0195, 0.0058, 0.0095], lip, { k: 0.004 });
    egg('head', [0, 0.0475, 0.0905], [0.0165, 0.0068, 0.0098], lip, { k: 0.004 });
    egg('head', [0, 0.0528, 0.099], [0.021, 0.0016, 0.006], dim(lip, 0.3), { k: 0.0015, cut: true });
    egg('head', [0, 0.036, 0.084], [0.016, 0.006, 0.006], shadow, { k: 0.008, cut: true }); // under the lip
    // Hair drawn back over the skull into a knot, with sideburns.
    egg('head', [0, 0.152, -0.03], [0.081, 0.083, 0.094], HAIR, { k: 0.008, rough: { scale: 160, amp: 0.004 } });
    egg('head', [0, 0.24, -0.03], [0.03, 0.032, 0.03], HAIR, { k: 0.012, rough: { scale: 200, amp: 0.004 } });
    egg('head', [0, 0.222, -0.03], [0.034, 0.009, 0.034], look.trim, { k: 0.004 });
    for (const side of [1, -1]) cap('head', [side * 0.071, 0.13, 0.03], [side * 0.069, 0.07, 0.022], 0.01, 0.004, HAIR, { k: 0.005, rough: { scale: 300, amp: 0.003 } });
    if (look.beard) {
      // A full beard along the jaw, a moustache over the lip.
      egg('head', [0, 0.008, 0.052], [0.054 * jaw, 0.052, 0.046], HAIR, { k: 0.014, rough: { scale: 220, amp: 0.006 } });
      for (const side of [1, -1]) {
        cap('head', [side * 0.058 * jaw, 0.08, 0.02], [side * 0.03, 0.01, 0.05], 0.019, 0.024, HAIR, { k: 0.012, rough: { scale: 220, amp: 0.006 } });
        cap('head', [side * 0.004, 0.063, 0.1], [side * 0.032, 0.046, 0.086], 0.0065, 0.004, HAIR, { k: 0.004, rough: { scale: 300, amp: 0.003 } });
      }
    } else if (look.stubble) {
      for (const side of [1, -1]) cap('head', [side * 0.004, 0.063, 0.1], [side * 0.026, 0.052, 0.09], 0.005, 0.003, HAIR, { k: 0.004 });
      egg('head', [0, 0.014, 0.076], [0.012, 0.014, 0.008], HAIR, { k: 0.006, rough: { scale: 300, amp: 0.004 } });
    }
  }
  part = 'hat';
  // Hats sit on the brow, clear of the eyes.
  const lift = (p) => [p[0], p[1] + 0.034, p[2]];
  look.hat?.({ cap: (n, a, b, ...rest) => cap(n, lift(a), lift(b), ...rest), egg: (n, c, ...rest) => egg(n, lift(c), ...rest), box: (n, c, ...rest) => box(n, lift(c), ...rest) });
  part = 'body';
  look.extra?.({ cap, egg, box, w });
  // What each solid is made of, where it was not said: skin and hair by their colour, boots are leather,
  // anything shaggy is fur, the rest is cloth.
  for (const solid of out)
    solid.stuff ??= solid.colour === HAIR ? 4 : solid.part === 'head' || solid.part === 'hand' ? 1 : solid.part === 'boot' ? 2 : (solid.rough?.amp ?? 0) >= 0.016 ? 4 : 0;
  return out;
}

/** Planes drawn to read in warm firelight and in the cold shade below either hat. */
function portraitHead({ cap, egg, box }, skin, face) {
  const jaw = face.jaw,
    chin = face.chin,
    [cheekX, cheekY, cheekZ] = face.cheek,
    [noseY, noseZ] = face.noseTip,
    [eyeY, eyeDepth, eyeHeight, eyeSlope] = face.eye,
    socket = [skin[0] * 0.66, skin[1] * 0.59, skin[2] * 0.57],
    flushed = [skin[0] * 1.06, skin[1] * face.flush, skin[2] * face.flush],
    lips = [skin[0] * 0.75, skin[1] * 0.54, skin[2] * 0.56],
    hairDetail = { stuff: 4, rough: { scale: 270, amp: 0.0017 } };

  egg('head', [0, 0.133, -0.012], [0.076 * face.width, 0.091, 0.092], skin, { k: 0.022 });
  egg('head', [0, 0.165, 0.054], [0.063 * face.width, 0.037, 0.031], skin, { k: 0.025 });
  box('head', [0, 0.067 + chin * 0.35, 0.014], [0.061 * jaw, 0.060, 0.057], skin, { k: 0.027, round: 0.03 });
  box('head', [0, 0.022 + chin, 0.048], [0.043 * jaw, 0.028, 0.039], skin, { k: 0.018, round: 0.02 });
  egg('head', [0, 0.022 + chin, 0.065], [0.032 * jaw, 0.021, 0.024], skin, { k: 0.019 });
  egg('head', [0, 0.086 + chin * 0.15, 0.045], [0.058 * face.width, 0.053, 0.036], skin, { k: 0.022 });
  for (const side of [-1, 1]) {
    // Lay the cheek over the mandible as a broad strip. A shallow hollow below makes the flare visible from above.
    egg('head', [side * 0.058, 0.043 + chin, 0.014], [0.017 * jaw, 0.033, 0.038], skin, { k: 0.020, turn: [0, -side * 0.16, side * -0.24] });
    egg('head', [side * cheekX, cheekY, cheekZ], [0.024, 0.024, 0.024], flushed, { k: 0.023, turn: [-0.09, side * 0.29, -side * 0.18] });
    if (face.hollow) egg('head', [side * 0.052, 0.073, 0.087], [0.015, 0.017, face.hollow], dim(skin, 0.88), { k: 0.008, cut: true, turn: [-0.26, side * 0.25, -side * 0.35] });
    egg('head', [side * 0.032, 0.130, 0.065], [0.029, 0.010 * face.brow, 0.020], skin, { k: 0.019, turn: [0, -side * 0.13, side * 0.12] });

    // Keep the exposed sclera narrow and use the oblique lid and the brow to carry the expression.
    const x = side * 0.031,
      eyeTurn = [0, 0, side * eyeSlope];
    egg('head', [x, eyeY, eyeDepth + 0.012], [0.020, 0.009, 0.011], socket, { k: 0.007, cut: true, turn: eyeTurn });
    egg('head', [x, eyeY, eyeDepth], [0.0155, eyeHeight, 0.0093], rgb(0xc7baa4), { k: 0.004, turn: eyeTurn });
    egg('head', [x - side * 0.001, eyeY, eyeDepth + 0.0086], [0.0065, 0.0059, 0.0035], rgb(0x3f2d22), { k: 0.0018, stuff: 1 });
    egg('head', [x - side * 0.001, eyeY, eyeDepth + 0.0109], [0.0037, 0.0038, 0.0015], rgb(0x1c1816), { k: 0.001, stuff: 1 });
    cap('head', [side * 0.016, eyeY + eyeHeight * 0.64, eyeDepth + 0.0065], [side * 0.047, eyeY + eyeHeight * 0.75 + eyeSlope * 0.016, eyeDepth + 0.002], 0.0028, 0.0025, dim(skin, 0.90), { k: 0.004 });
    cap('head', [side * 0.015, face.browLine[0], 0.087], [side * 0.035, face.browLine[1], 0.087], face.brow * 0.0037, face.brow * 0.0036, HAIR, { ...hairDetail, k: 0.0035 });
    cap('head', [side * 0.035, face.browLine[1], 0.087], [side * 0.051, face.browLine[1] - 0.006, 0.074], face.brow * 0.0036, 0.0021, HAIR, { ...hairDetail, k: 0.003 });

    egg('head', [side * 0.079 * face.width, 0.108, -0.008], [0.009, 0.027, 0.017], skin, { k: 0.008, turn: [0, side * 0.34, 0] });
    egg('head', [side * 0.079 * face.width, 0.085, -0.002], [0.007, 0.010, 0.009], dim(skin, 0.97), { k: 0.006 });
    egg('head', [side * 0.085 * face.width, 0.108, -0.004], [0.0044, 0.015, 0.009], socket, { k: 0.004, cut: true });
  }

  cap('head', [0, 0.126, 0.077], [0, noseY + 0.015, noseZ - 0.015], 0.0086, 0.012, skin, { k: 0.018 });
  egg('head', [0, noseY + 0.018, noseZ - 0.022], [0.014, 0.026, 0.018], skin, { k: 0.016 });
  egg('head', [0, noseY, noseZ], [0.0118 * face.noseWidth, 0.0089, 0.0113], flushed, { k: 0.011 });
  for (const side of [-1, 1]) {
    egg('head', [side * 0.0124 * face.noseWidth, noseY - 0.003, noseZ - 0.0105], [0.0084, 0.007, 0.0097], skin, { k: 0.010 });
    egg('head', [side * 0.009 * face.noseWidth, noseY - 0.0085, noseZ - 0.0045], [0.0033, 0.0028, 0.0042], dim(socket, 0.67), { k: 0.0025, cut: true });
  }

  const mouth = face.mouth,
    lipZ = 0.092 + chin * 0.25;
  egg('head', [0, mouth[0] + 0.0095, lipZ - 0.002], [0.018, 0.010, 0.009], skin, { k: 0.009 });
  egg('head', [0, mouth[0] + 0.0024, lipZ], [mouth[1], 0.0043, 0.0080], lips, { k: 0.004 });
  egg('head', [0, mouth[0] - 0.005, lipZ - 0.001], [mouth[1] * 0.84, 0.0048, 0.0080], dim(lips, 1.14), { k: 0.004 });
  egg('head', [0, mouth[0] - 0.001, lipZ + 0.005], [mouth[1] * 0.98, 0.0018, 0.005], dim(lips, 0.40), { k: 0.003, cut: true, turn: [0, 0, mouth[2]] });

  egg('head', [0, 0.152, -0.031], [0.081 * face.width, 0.082, 0.093], HAIR, { ...hairDetail, k: 0.007 });
  egg('head', [0, 0.239, -0.03], [0.029, 0.032, 0.03], HAIR, { ...hairDetail, k: 0.011 });
  for (const side of [-1, 1]) {
    cap('head', [side * 0.071 * face.width, 0.133, 0.029], [side * 0.067, 0.081 + chin, 0.025], 0.008, 0.0035, HAIR, { ...hairDetail, k: 0.006 });
    cap('head', [side * 0.004, mouth[0] + 0.011, lipZ + 0.005], [side * 0.026, mouth[0] + face.moustache, lipZ - 0.001], 0.0042, 0.0024, face.beardHair, { ...hairDetail, k: 0.004 });
    if (face.beard) {
      cap('head', [side * 0.052, 0.054, 0.036], [side * 0.031, 0.011 + chin, 0.063], 0.012, 0.016, face.beardHair, { ...hairDetail, k: 0.010 });
      cap('head', [side * 0.019, 0.010 + chin, 0.076], [side * 0.006, -0.040, 0.069], 0.013, 0.005, rgb(0x40362e), { ...hairDetail, k: 0.009 });
    }
  }
  if (face.beard) cap('head', [0, 0.021, 0.076], [0, -0.047, 0.066], 0.021, 0.0065, face.beardHair, { ...hairDetail, k: 0.012 });
  else egg('head', [0, 0.019 + chin, 0.077], [0.011, 0.0095, 0.010], face.beardHair, { ...hairDetail, k: 0.007 });
}

const cloak = (colour, length = 0.98) => ({ cap }) => {
  // Three falling widths of cloth from the shoulders, creased where they meet.
  for (const [x0, x1] of [
    [-0.15, -0.3],
    [0, 0],
    [0.15, 0.3]
  ])
    cap('cloak', [x0, 0.0, 0.0], [x1, -length, -0.2], 0.085, 0.13, colour, { k: 0.02, flat: 0.3, fold: { n: 3, amp: 0.012, from: 0.2 } });
  cap('cloak', [-0.17, 0.02, 0.03], [0.17, 0.02, 0.03], 0.045, 0.045, dim(colour, 1.25), { k: 0.02 });
};

const LOOKS = {
  // Lin Chong: a pale quilted coat, a dark travelling cloak, and the wide felt hat with snow on its brim.
  hero: {
    skin: rgb(0xca9c7e),
    face: { portrait: true, width: 1.03, jaw: 1.025, chin: 0, cheek: [0.043, 0.092, 0.052], flush: 0.91, brow: 1.06, browLine: [0.134, 0.138], eye: [0.113, 0.078, 0.0063, 0.04], noseTip: [0.081, 0.105], noseWidth: 1.02, mouth: [0.052, 0.019, -0.025], moustache: 0.001, beardHair: rgb(0x352923) },
    coat: rgb(0xb4bac4), trim: rgb(0x8e2420), sash: rgb(0x8e2420), cuff: rgb(0x2b3140), legs: rgb(0x2b3140), boots: rgb(0x1d1b1c),
    hat({ cap, egg }) {
      egg('head', [0, 0.172, 0], [0.34, 0.02, 0.34], rgb(0x4a4038), { k: 0.012 });
      egg('head', [0, 0.185, 0], [0.22, 0.03, 0.22], rgb(0x4a4038), { k: 0.03 });
      cap('head', [0, 0.2, 0], [0, 0.29, 0], 0.115, 0.035, rgb(0x54483e), { k: 0.04 });
      egg('head', [0, 0.192, 0], [0.31, 0.012, 0.31], SNOW, { k: 0.008, rough: { scale: 30, amp: 0.012 } });
      egg('head', [0, 0.285, 0], [0.07, 0.03, 0.07], SNOW, { k: 0.02 });
      egg('head', [0, 0.325, 0], [0.03, 0.035, 0.03], RED, { k: 0.008 });
      egg('head', [0, 0.215, 0], [0.138, 0.012, 0.138], rgb(0x8e2420), { k: 0.005 });
    },
    extra(tools) {
      cloak(rgb(0x39404f))(tools);
      // A fur collar where the cloak ties.
      tools.egg('spine', [0, 0.5, -0.03], [0.14, 0.05, 0.12], rgb(0xd8d2c4), { k: 0.02, rough: { scale: 90, amp: 0.02 } });
    }
  },
  // A hired blade: a short brown coat, a head cloth, a sheepskin vest.
  blade: {
    skin: rgb(0xc99a72), stubble: true, face: { jaw: 1.08, brow: 1.3 }, coat: rgb(0x6b4a33), trim: rgb(0x2e2420), sash: rgb(0x8a7a5c), legs: rgb(0x37312d), boots: rgb(0x1f1a17),
    hat({ egg, cap }) {
      egg('head', [0, 0.15, -0.01], [0.105, 0.075, 0.108], rgb(0x8a3a2c), { k: 0.01, rough: { scale: 40, amp: 0.006 } });
      cap('head', [0.02, 0.14, -0.1], [0.07, 0.0, -0.16], 0.03, 0.012, rgb(0x8a3a2c), { k: 0.01 });
    },
    extra({ egg }) {
      egg('spine', [0, 0.3, -0.01], [0.205, 0.2, 0.135], rgb(0x9a8a70), { k: 0.012, rough: { scale: 80, amp: 0.016 } });
      egg('spine', [0, 0.3, 0.1], [0.07, 0.24, 0.1], rgb(0x6b4a33), { k: 0.01, cut: true });
    }
  },
  // A shield man: an iron cap with a neck guard, a leather cuirass with plates.
  shield: {
    skin: rgb(0xc08e66), face: { jaw: 1.14, brow: 1.25 }, coat: rgb(0x4f5a4a), trim: rgb(0x8a6a2c), sash: rgb(0x2c2a26), cuff: IRON, legs: rgb(0x2c302c), boots: rgb(0x1c1b19), bulk: 1.08, beard: true,
    hat({ egg, cap }) {
      egg('head', [0, 0.15, 0], [0.112, 0.09, 0.115], IRON, { stuff: 3, k: 0.008 });
      egg('head', [0, 0.13, 0], [0.122, 0.014, 0.125], dim(IRON, 1.6), { stuff: 3, k: 0.006 });
      cap('head', [0, 0.23, 0], [0, 0.31, 0], 0.018, 0.005, IRON, { stuff: 3, k: 0.01 });
      egg('head', [0, 0.06, -0.07], [0.105, 0.08, 0.06], dim(IRON, 0.8), { stuff: 3, k: 0.01 });
    },
    extra({ egg, box, w }) {
      egg('spine', [0, 0.28, 0.01], [0.2 * w, 0.21, 0.138 * w], rgb(0x4a3526), { k: 0.012 });
      for (let row = 0; row < 3; row++) for (let i = -1; i <= 1; i++) box('spine', [i * 0.085, 0.4 - row * 0.105, 0.13 * w - Math.abs(i) * 0.022], [0.034, 0.042, 0.008], dim(IRON, 1.3), { stuff: 3, k: 0.004, round: 0.008 });
      for (const side of [1, -1]) egg('spine', [side * 0.21 * w, 0.46, 0], [0.105, 0.06, 0.11], IRON, { stuff: 3, k: 0.01 });
    }
  },
  // A bowman: a dark blue coat, a fur hat, a quiver across the back.
  bow: {
    skin: rgb(0xd6ab86), face: { jaw: 0.94, brow: 0.9 }, coat: rgb(0x2f3d5c), trim: rgb(0x9a8a70), sash: rgb(0x6a5440), legs: rgb(0x26282e), boots: rgb(0x1b1a19), bulk: 0.96,
    hat({ cap, egg }) {
      egg('head', [0, 0.165, 0], [0.118, 0.058, 0.12], rgb(0x6a5440), { k: 0.01, rough: { scale: 90, amp: 0.02 } });
      egg('head', [0, 0.215, 0], [0.085, 0.03, 0.085], rgb(0x2f3d5c), { k: 0.01 });
    },
    extra({ cap, egg }) {
      cap('spine', [-0.12, 0.08, -0.15], [0.12, 0.5, -0.14], 0.05, 0.055, rgb(0x4a3526), { k: 0.008 });
      for (let i = 0; i < 5; i++) cap('spine', [0.12 + (i - 2) * 0.012, 0.5, -0.14 + (i % 2) * 0.02], [0.17 + (i - 2) * 0.02, 0.62, -0.13], 0.006, 0.012, i % 2 ? SNOW : rgb(0x9a3a2c), { k: 0.003 });
      egg('spine', [0.03, 0.3, 0.02], [0.03, 0.34, 0.15], rgb(0x4a3526), { k: 0.006, turn: [0, 0, 0.75] });
    }
  },
  // Lu Qian: a long black robe edged in crimson, shoulder guards, a short cape, the winged cap of an officer.
  lu: {
    skin: rgb(0xc89973),
    face: { portrait: true, width: 0.96, jaw: 0.88, chin: -0.009, cheek: [0.046, 0.097, 0.053], hollow: 0.011, flush: 0.94, brow: 1.23, browLine: [0.13, 0.142], eye: [0.111, 0.077, 0.0059, 0.16], noseTip: [0.077, 0.114], noseWidth: 0.91, mouth: [0.047, 0.019, 0.09], moustache: -0.004, beard: true, beardHair: rgb(0x29231f) },
    coat: rgb(0x25181c), trim: rgb(0x9b1f24), sash: rgb(0xb58a3a), cuff: rgb(0x5a1418), legs: rgb(0x16161a), boots: rgb(0x0f0f11), long: true, bulk: 1.06,
    hat({ cap, box, egg }) {
      egg('head', [0, 0.172, -0.004], [0.096, 0.062, 0.1], rgb(0x121216), { k: 0.008 });
      egg('head', [0, 0.135, -0.004], [0.094, 0.012, 0.099], rgb(0x2a2a30), { k: 0.004 });
      box('head', [0, 0.245, -0.05], [0.07, 0.055, 0.04], rgb(0x121216), { k: 0.01, round: 0.02 });
      box('head', [0, 0.19, -0.105], [0.27, 0.02, 0.012], rgb(0x121216), { k: 0.006, round: 0.01 });
      egg('head', [0, 0.17, 0.095], [0.022, 0.022, 0.012], GOLD, { stuff: 3, k: 0.004 });
    },
    extra(tools) {
      const { egg, box, w } = tools;
      cloak(rgb(0x5a1418), 0.8)(tools);
      for (const side of [1, -1]) {
        egg('spine', [side * 0.215 * w, 0.47, 0], [0.12, 0.06, 0.125], IRON, { stuff: 3, k: 0.01 });
        egg('spine', [side * 0.245 * w, 0.43, 0], [0.11, 0.045, 0.115], dim(IRON, 0.8), { stuff: 3, k: 0.008 });
        egg('spine', [side * 0.215 * w, 0.5, 0], [0.05, 0.03, 0.05], GOLD, { stuff: 3, k: 0.006 });
      }
      // A plate on the chest and a broad belt with a clasp.
      box('spine', [0, 0.33, 0.125 * w], [0.075, 0.075, 0.012], dim(IRON, 1.2), { stuff: 3, k: 0.006, round: 0.02, turn: [0, 0, 0.785] });
      egg('spine', [0, 0.33, 0.14 * w], [0.03, 0.03, 0.012], GOLD, { stuff: 3, k: 0.004 });
      box('spine', [0, 0.04, 0.13 * w], [0.045, 0.04, 0.012], GOLD, { stuff: 3, k: 0.004, round: 0.008 });
    }
  }
};

/** Things held in the hand, sculpted along +z from the grip at the origin. */
const THINGS = {
  spear() {
    const oak = rgb(0x70472b), bronze = rgb(0xbe9961), blueIron = rgb(0x687886), silk = rgb(0xc4312a), silkShadow = rgb(0x801c22);
    const s = [
      { kind: 'cap', a: [0, 0, -1.05], b: [0, 0, 1.3], ra: 0.019, rb: 0.017, colour: oak, k: 0.004 },
      { kind: 'cap', a: [0, 0, -1.18], b: [0, 0, -1.04], ra: 0.004, rb: 0.024, colour: blueIron, k: 0.004 },
      { kind: 'egg', c: [0, 0, -1.048], r: [0.024, 0.024, 0.009], colour: bronze, k: 0.003 },
      // A hammered socket and two bright ferrules above the silk knot.
      { kind: 'cap', a: [0, 0, 1.28], b: [0, 0, 1.381], ra: 0.028, rb: 0.019, colour: blueIron, k: 0.004, rough: { scale: 95, amp: 0.002 } },
      { kind: 'egg', c: [0, 0, 1.322], r: [0.034, 0.034, 0.009], colour: bronze, k: 0.004 },
      { kind: 'egg', c: [0, 0, 1.371], r: [0.027, 0.027, 0.008], colour: bronze, k: 0.003 },
      { kind: 'cap', a: [0, 0, 1.292], b: [0, 0, 1.16], ra: 0.03, rb: 0.064, colour: silkShadow, k: 0.008, fold: { n: 10, amp: 0.012, from: 0.3 } },
      { kind: 'egg', c: [0, 0, 1.277], r: [0.034, 0.034, 0.022], colour: silk, k: 0.005 },
      // The two amber lobes, fabric neck band, and dark stopper of the wine gourd.
      { kind: 'cap', a: [0, -0.015, 0.95], b: [0, -0.11, 0.95], ra: 0.006, rb: 0.006, colour: silkShadow, k: 0.004 },
      { kind: 'egg', c: [0, -0.215, 0.95], r: [0.07, 0.072, 0.07], colour: rgb(0x97622c), k: 0.03 },
      { kind: 'egg', c: [0, -0.13, 0.95], r: [0.045, 0.045, 0.045], colour: rgb(0xab7235), k: 0.03 },
      { kind: 'egg', c: [0, -0.168, 0.95], r: [0.038, 0.011, 0.038], colour: silk, k: 0.004 },
      { kind: 'cap', a: [0, -0.089, 0.95], b: [0, -0.105, 0.95], ra: 0.017, rb: 0.015, colour: rgb(0x4d2c1c), k: 0.003 }
    ];
    for (let i = 0; i < 3; i++) s.push({ kind: 'egg', c: [0, 0, -0.3 + i * 0.5], r: [0.022, 0.022, 0.012], colour: dim(bronze, 0.82), k: 0.003 });
    for (let i = 0; i < 9; i++) {
      const angle = i * Math.PI * 2 / 9, x = Math.cos(angle), y = Math.sin(angle);
      const spread = 0.052 + (i % 3) * 0.011;
      s.push({ kind: 'cap', a: [x * 0.026, y * 0.026, 1.274], b: [x * spread, y * spread, 1.118 - (i % 3) * 0.016], ra: 0.011, rb: 0.008, colour: dim(silk, 0.69 + (i % 4) * 0.12), k: 0.005 });
    }
    return { solids: s, edge: [
      { kind: 'cap', a: [0, 0, 1.32], b: [0, 0, 1.466], ra: 0.016, rb: 0.019, colour: rgb(0x727e86), k: 0.005 },
      // The leaf has a darker forged face, a narrow ridge and light polished margins.
      { kind: 'egg', c: [0, 0, 1.62], r: [0.064, 0.0095, 0.2], colour: rgb(0xd1dee2), k: 0.006 },
      { kind: 'egg', c: [0, 0, 1.607], r: [0.048, 0.013, 0.166], colour: rgb(0x8299aa), k: 0.004, rough: { scale: 120, amp: 0.0015 } },
      { kind: 'cap', a: [0, 0, 1.45], b: [0, 0, 1.804], ra: 0.0175, rb: 0.003, colour: rgb(0xaebfc9), k: 0.004 },
      { kind: 'box', c: [0.034, 0.0105, 1.615], h: [0.009, 0.005, 0.021], turn: [0, 0.3, 0], colour: rgb(0x687c8b), k: 0.002, round: 0.002, cut: true }
    ] };
  },
  sabre: () => sword(1.25, -0.4, 0.062),
  short: () => sword(0.95, -0.14, 0.05),
  glaive() {
    const bronze = rgb(0xad8751), brightBronze = rgb(0xc5a671), iron = rgb(0x656c73), binding = rgb(0x8e252c);
    // Keep the shaft, its four bands and the butt profile where the hand was fitted.
    const s = [
      { kind: 'cap', a: [0, 0, -1.0], b: [0, 0, 1.0], ra: 0.026, rb: 0.023, colour: rgb(0x56372a), k: 0.004 },
      { kind: 'cap', a: [0, 0, -1.15], b: [0, 0, -0.99], ra: 0.005, rb: 0.03, colour: iron, k: 0.004 },
      // Narrow worked-metal socket, two ferrule rings, and a cloth binding.
      { kind: 'cap', a: [0, 0, 0.993], b: [0, 0, 1.059], ra: 0.034, rb: 0.032, colour: iron, k: 0.005 },
      { kind: 'egg', c: [0, 0, 0.985], r: [0.038, 0.039, 0.012], colour: brightBronze, k: 0.004 },
      { kind: 'egg', c: [0, 0.003, 1.05], r: [0.033, 0.037, 0.01], colour: brightBronze, k: 0.004 },
      { kind: 'egg', c: [0, 0, 0.928], r: [0.037, 0.037, 0.012], colour: binding, k: 0.004 },
      { kind: 'egg', c: [0, 0, 0.95], r: [0.038, 0.038, 0.011], colour: rgb(0xb34435), k: 0.004 },
      { kind: 'cap', a: [0, -0.026, 0.967], b: [0, -0.156, 0.91], ra: 0.022, rb: 0.038, colour: binding, k: 0.009, fold: { n: 9, amp: 0.008, from: 0.2 } }
    ];
    for (let i = 0; i < 4; i++) s.push({ kind: 'egg', c: [0, 0, -0.6 + i * 0.4], r: [0.03, 0.03, 0.014], colour: bronze, k: 0.003 });
    for (const side of [-1, 1]) {
      s.push({ kind: 'egg', c: [side * 0.033, 0.012, 1.02], r: [0.006, 0.008, 0.006], colour: brightBronze, k: 0.002 });
      s.push({ kind: 'cap', a: [side * 0.015, -0.06, 0.951], b: [side * 0.025, -0.175, 0.9], ra: 0.01, rb: 0.009, colour: rgb(0xa33832), k: 0.005 });
    }
    return { solids: s };
  },
  rattan() {
    const s = [];
    // Rattan wound in rings round an iron boss.
    s.push({ kind: 'egg', c: [0.05, 0, 0.09], r: [0.43, 0.43, 0.05], colour: rgb(0x7a5a2e), k: 0.01 });
    for (let i = 1; i <= 5; i++) for (let j = 0; j < 20 + i * 6; j++) {
      const a = (j / (20 + i * 6)) * Math.PI * 2, r = i * 0.075;
      s.push({ kind: 'egg', c: [0.05 + Math.cos(a) * r, Math.sin(a) * r, 0.125 - r * 0.07], r: [0.036, 0.036, 0.02], colour: dim(rgb(0x8a6838), 0.85 + (j % 3) * 0.12), k: 0.012 });
    }
    s.push({ kind: 'egg', c: [0.05, 0, 0.14], r: [0.1, 0.1, 0.055], colour: IRON, k: 0.008 });
    s.push({ kind: 'egg', c: [0.05, 0, 0.19], r: [0.03, 0.03, 0.03], colour: dim(IRON, 1.5), k: 0.006 });
    const [x, y, z] = YARD_GRIPS.shield;
    s.push({ kind: 'cap', a: [x, y - 0.095, z], b: [x, y + 0.095, z], ra: 0.018, rb: 0.018, colour: WOOD, k: 0.004 });
    for (const side of [-1, 1]) s.push({ kind: 'cap', a: [x, y + side * 0.086, z], b: [x, y + side * 0.086, 0.075], ra: 0.019, rb: 0.027, colour: WOOD, k: 0.004 });
    return { solids: s };
  },
  longbow() {
    const s = [], at = (t) => [0, t * 0.64, 0.02 + (1 - t * t) * 0.2 - Math.max(0, Math.abs(t) - 0.8) * 0.3];
    for (let i = -8; i < 8; i++) s.push({ kind: 'cap', a: at(i / 8), b: at((i + 1) / 8), ra: 0.017 - Math.abs(i + 0.5) * 0.001, rb: 0.017 - Math.abs(i + 1.5) * 0.001, colour: Math.abs(i + 0.5) < 1.5 ? rgb(0x8e2420) : rgb(0x5c3a1e), k: 0.006 });
    // The string is animated separately between the tips and the nocking hand.
    return { solids: s };
  }
};
function sword(reach, grip, width) {
  const s = [];
  s.push({ kind: 'cap', a: [0, 0, grip], b: [0, 0, 0.28], ra: 0.019, rb: 0.02, colour: WOOD, k: 0.004, fold: { n: 1, amp: 0 } });
  for (let z = grip + 0.04; z < 0.26; z += 0.05) s.push({ kind: 'egg', c: [0, 0, z], r: [0.022, 0.022, 0.01], colour: dim(RED, 0.7), k: 0.003 });
  s.push({ kind: 'egg', c: [0, 0, grip - 0.01], r: [0.028, 0.028, 0.022], colour: GOLD, k: 0.006 });
  s.push({ kind: 'egg', c: [0, 0, 0.3], r: [0.026, 0.07, 0.018], colour: GOLD, k: 0.006 });
  return { solids: s, edge: [
    { kind: 'box', c: [0, 0.012, (0.3 + reach) / 2], h: [0.008, width, (reach - 0.3) / 2], colour: STEEL, k: 0.008, round: 0.007 },
    { kind: 'egg', c: [0, 0.035, reach + 0.03], r: [0.008, width * 0.95, 0.12], colour: STEEL, k: 0.02, turn: [-0.35, 0, 0] },
    { kind: 'egg', c: [0, -0.02, (0.3 + reach) / 2], r: [0.012, 0.014, (reach - 0.3) / 2], colour: dim(STEEL, 0.55), k: 0.005 }
  ] };
}

const PLASTER = rgb(0x8a8378),
  LACQUER = rgb(0x7a1f1a),
  TIMBER = rgb(0x4a2a1c),
  TILE = rgb(0x3b4654);

/** A tiled roof of two slopes: rows of tile, a ridge with a beast at each end, upturned corners, and snow. */
function roof(s, y, width, depth, rise, z0 = 0, pitch = 0.62) {
  const slope = Math.atan2(rise, depth / 2),
    run = Math.hypot(rise, depth / 2) + 0.7;
  for (const side of [1, -1]) {
    const lean = [side * slope, 0, 0],
      c = [0, y + rise / 2 - 0.12, z0 + (side * depth) / 4];
    s.push({ kind: 'box', c, h: [width / 2, 0.07, run / 2], colour: TILE, k: 0.02, round: 0.03, turn: lean, ridge: { axis: 0, n: (Math.PI * 2) / pitch, amp: pitch * 0.2 } });
    // Round end tiles along the eave.
    for (let x = -width / 2 + pitch / 2; x < width / 2; x += pitch) s.push({ kind: 'egg', c: [x, y - 0.16, z0 + side * (depth / 2 + 0.28)], r: [pitch * 0.27, pitch * 0.27, 0.09], colour: dim(TILE, 1.5), k: 0.02 });
    // Overlapping drift tongues expose the lower tiles. The changing reach
    // repeats on neither roof slope, preserving readable dark eaves against snow.
    for (let drift = 0; drift < 4; drift++) {
      const x = (drift - 1.5) * width * 0.22 + side * (drift % 2 ? 0.06 : -0.06);
      const depthScale = [0.24, 0.3, 0.26, 0.29][side > 0 ? drift : 3 - drift];
      s.push({ kind: 'box', c: [x, y + rise * 0.62 + 0.02, z0 + side * depth * 0.2], h: [width * 0.151, 0.09, run * depthScale], colour: SNOW, k: 0.06, round: 0.08, turn: lean, rough: { scale: 1.75, amp: 0.07 } });
    }
    for (const end of [1, -1]) {
      // The corner turns up into a horn.
      const cx = end * (width / 2 - 0.1), cz = z0 + side * (depth / 2 + 0.2);
      s.push({ kind: 'cap', a: [cx - end * 1.2, y + 0.0, cz - side * 0.15], b: [cx + end * 0.5, y + 0.55, cz + side * 0.25], ra: 0.16, rb: 0.05, colour: TILE, k: 0.1 });
      s.push({ kind: 'cap', a: [end * (width / 2), y + rise * 0.95, z0], b: [end * (width / 2), y - 0.05, z0 + side * (depth / 2 + 0.3)], ra: 0.14, rb: 0.12, colour: dim(TILE, 0.8), k: 0.04 });
    }
  }
  s.push({ kind: 'box', c: [0, y + rise + 0.08, z0], h: [width / 2 + 0.1, 0.2, 0.17], colour: dim(TILE, 0.85), k: 0.04, round: 0.06 });
  s.push({ kind: 'egg', c: [0, y + rise + 0.3, z0], r: [width / 2 - 0.4, 0.09, 0.2], colour: SNOW, k: 0.05, rough: { scale: 3, amp: 0.08 } });
  for (const end of [1, -1]) {
    // The ridge beast: a fish-tailed dragon biting the end of the ridge.
    const x = end * (width / 2 + 0.05);
    s.push({ kind: 'egg', c: [x, y + rise + 0.3, z0], r: [0.24, 0.3, 0.2], colour: dim(TILE, 1.2), k: 0.06 });
    s.push({ kind: 'cap', a: [x, y + rise + 0.4, z0], b: [x + end * 0.3, y + rise + 0.95, z0], ra: 0.15, rb: 0.04, colour: dim(TILE, 1.2), k: 0.06 });
    s.push({ kind: 'cap', a: [x + end * 0.3, y + rise + 0.95, z0], b: [x - end * 0.05, y + rise + 1.1, z0], ra: 0.05, rb: 0.03, colour: dim(TILE, 1.2), k: 0.03 });
  }
}
/** A row of bracket sets under an eave: each a block, two arms and a cap. */
function brackets(s, y, half, z) {
  for (let x = -half; x <= half + 0.01; x += 0.8) {
    s.push({ kind: 'box', c: [x, y, z], h: [0.11, 0.1, 0.11], colour: rgb(0x1f5a5a), k: 0.01, round: 0.02 });
    s.push({ kind: 'box', c: [x, y + 0.16, z], h: [0.3, 0.06, 0.07], colour: LACQUER, k: 0.01, round: 0.02 });
    s.push({ kind: 'box', c: [x, y + 0.16, z + Math.sign(z) * 0.14], h: [0.07, 0.06, 0.26], colour: rgb(0x1f5a5a), k: 0.01, round: 0.02 });
  }
}
/** The tile cap of a wall, with snow on it. */
function wallCap(s, x, y, z, half) {
  for (const side of [1, -1]) s.push({ kind: 'box', c: [x, y + 0.08, z + side * 0.36], h: [half, 0.05, 0.42], colour: TILE, k: 0.02, round: 0.03, turn: [side * 0.42, 0, 0], ridge: { axis: 0, n: (Math.PI * 2) / 0.5, amp: 0.08 } });
  s.push({ kind: 'cap', a: [x - half, y + 0.3, z], b: [x + half, y + 0.3, z], ra: 0.12, rb: 0.12, colour: dim(TILE, 0.85), k: 0.03 });
  s.push({ kind: 'cap', a: [x - half + 0.3, y + 0.4, z], b: [x + half - 0.3, y + 0.4, z], ra: 0.14, rb: 0.14, colour: SNOW, k: 0.05, flat: 1, rough: { scale: 3, amp: 0.12 } });
}

/** Stone and bronze that stand about the place, sculpted about their footing at the origin. */
const PROPS = {
  lion: guardianLion,
  stele: templeStele,
  censer() {
    const s = [], bronze = rgb(0x5c6858), pale = rgb(0x86836a);
    for (let i = 0; i < 3; i++) {
      const a = i * 2.094 + 0.5;
      s.push({ kind: 'cap', a: [Math.cos(a) * 0.6, 0.06, Math.sin(a) * 0.6], b: [Math.cos(a) * 0.45, 0.8, Math.sin(a) * 0.45], ra: 0.13, rb: 0.16, colour: bronze, k: 0.04 });
      s.push({ kind: 'egg', c: [Math.cos(a) * 0.62, 0.08, Math.sin(a) * 0.62], r: [0.17, 0.09, 0.17], colour: bronze, k: 0.03 });
    }
    for (let i = 0; i < 16; i++) s.push({ kind: 'egg', c: [Math.cos(i * 0.3927) * 0.84, 1.0, Math.sin(i * 0.3927) * 0.84], r: [0.07, 0.13, 0.07], colour: pale, k: 0.02 });
    for (const side of [1, -1]) {
      s.push({ kind: 'cap', a: [side * 0.84, 1.3, 0], b: [side * 0.98, 1.72, 0], ra: 0.06, rb: 0.06, colour: bronze, k: 0.03 });
      s.push({ kind: 'cap', a: [side * 0.98, 1.72, 0], b: [side * 0.72, 1.74, 0], ra: 0.06, rb: 0.05, colour: bronze, k: 0.03 });
    }
    s.push({ kind: 'egg', c: [0, 1.14, 0], r: [0.74, 0.07, 0.74], colour: rgb(0x8f8f86), stuff: PROP_SURFACE.stone, k: 0.02, rough: { scale: 25, amp: 0.03 } }); // ash
    return s.map((solid) => ({ stuff: PROP_SURFACE.bronze, ...solid }));
  },
  pine() {
    // Broken-up sprays protrude from the main boughs, with snow held above them.
    const s = [], bark = rgb(0x433127), needle = rgb(0x2a4838);
    s.push({ kind: 'cap', a: [0, -0.4, 0], b: [0.15, 6.6, 0], ra: 0.3, rb: 0.07, colour: bark, stuff: PROP_SURFACE.bark, k: 0.1, rough: { scale: 5, amp: 0.1 } });
    for (let tier = 0; tier < 6; tier++) {
      const y = 1.9 + tier * 0.92, reach = 2.5 - tier * 0.4, n = 8 - tier;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + tier * 0.7 + Math.sin(i * 12.7 + tier) * 0.13;
        const c = Math.cos(a), z = Math.sin(a), length = reach * (0.81 + ((i * 7 + tier * 5) % 9) * 0.022);
        const tone = dim(needle, 0.77 + ((i * 7 + tier * 3) % 5) * 0.12);
        s.push({ kind: 'cap', a: [c * 0.15, y + 0.24, z * 0.15], b: [c * length, y - length * 0.22, z * length], ra: 0.22 + reach * 0.056, rb: 0.10, colour: tone, stuff: PROP_SURFACE.needle, spray: true, k: 0.12, rough: { scale: 9, amp: 0.14 } });
        s.push({ kind: 'cap', a: [c * length * 0.23, y + 0.40, z * length * 0.23], b: [c * length * 0.85, y + 0.05 - length * 0.18, z * length * 0.85], ra: 0.17 + reach * 0.046, rb: 0.076, colour: SNOW, stuff: PROP_SURFACE.snow, k: 0.08, rough: { scale: 8, amp: 0.12 } });
        if (tier < 5 && i % 5 !== 1) {
          const side = i % 2 ? 1 : -1;
          const fork = a + side * 0.36;
          const fx = Math.cos(fork), fz = Math.sin(fork);
          s.push({ kind: 'cap', a: [c * length * 0.48, y - 0.02, z * length * 0.48], b: [fx * length * 0.85, y - length * 0.19, fz * length * 0.85], ra: 0.16 + length * 0.028, rb: 0.078, colour: dim(tone, 0.87), stuff: PROP_SURFACE.needle, k: 0.075, rough: { scale: 12, amp: 0.095 } });
        }
      }
    }
    s.push({ kind: 'cap', a: [0.12, 6.3, 0], b: [0.16, 7.5, 0], ra: 0.31, rb: 0.03, colour: needle, stuff: PROP_SURFACE.needle, k: 0.12, rough: { scale: 9, amp: 0.16 } });
    s.push({ kind: 'egg', c: [0.14, 6.9, 0], r: [0.22, 0.3, 0.22], colour: SNOW, stuff: PROP_SURFACE.snow, k: 0.1 });
    return s;
  },
  stack() {
    // A fodder stack: bound straw under a thatched cap, snow on the windward side.
    const s = [], straw = rgb(0xa28a57);
    s.push({ kind: 'cap', a: [0, 0.2, 0], b: [0, 1.5, 0], ra: 0.92, rb: 0.98, colour: dim(straw, 0.8), k: 0.05, fold: { n: 46, amp: 0.035, from: 1 }, rough: { scale: 9, amp: 0.05 } });
    s.push({ kind: 'cap', a: [0, 1.75, 0], b: [0, 3.0, 0], ra: 1.02, rb: 0.1, colour: straw, k: 0.06, fold: { n: 34, amp: 0.05, from: 0.6 }, rough: { scale: 8, amp: 0.06 } });
    for (const y of [0.55, 1.15]) s.push({ kind: 'egg', c: [0, y, 0], r: [1.0, 0.05, 1.0], colour: dim(straw, 0.5), k: 0.02 });
    s.push({ kind: 'egg', c: [0, 3.0, 0], r: [0.16, 0.2, 0.16], colour: dim(straw, 0.6), k: 0.04 });
    for (let i = 0; i < 12; i++) {
      const a = i * 2.4, x = Math.cos(a), z = Math.sin(a), r = 0.97, y = 0.39 + ((i * 5) % 9) * 0.14;
      s.push({ kind: 'cap', a: [x * (r - 0.05), y + 0.19, z * (r - 0.05)], b: [x * (r + 0.068), y - 0.09, z * (r + 0.068)],
        ra: 0.045, rb: 0.026, colour: dim(straw, 0.75 + (i % 4) * 0.11), k: 0.021 });
    }
    s.push({ kind: 'egg', c: [-0.3, 2.3, -0.2], r: [0.75, 0.55, 0.7], colour: SNOW, k: 0.12, rough: { scale: 6, amp: 0.1 } });
    s.push({ kind: 'egg', c: [0, 0.05, 0], r: [1.25, 0.1, 1.25], colour: SNOW, k: 0.1, rough: { scale: 5, amp: 0.1 } });
    return s.map((solid) => ({ ...solid, stuff: solid.colour === SNOW ? PROP_SURFACE.snow : PROP_SURFACE.straw }));
  },
  gate() {
    // The wall to either side of the doorway under its tile cap, and the four posts of the gate house.
    const s = [];
    for (const side of [1, -1]) {
      s.push({ kind: 'box', c: [side * 5.45, 1.45, 0], h: [3.7, 1.45, 0.5], colour: PLASTER, k: 0.03, round: 0.04, rough: { scale: 2.2, amp: 0.05 } });
      s.push({ kind: 'box', c: [side * 5.45, 0.36, 0], h: [3.75, 0.36, 0.6], colour: dim(STONE, 0.6), k: 0.03, round: 0.06, rough: { scale: 5, amp: 0.05 } });
      for (let i = 0; i < 9; i++) s.push({ kind: 'box', c: [side * (2.1 + i * 0.83), 0.36, 0], h: [0.012, 0.4, 0.64], colour: dim(STONE, 0.3), k: 0.01, cut: true }); // joints between the stones
      wallCap(s, side * 5.45, 2.98, 0, 3.85);
      for (const z of [0.75, -0.75]) {
        s.push({ kind: 'cap', a: [side * 2.2, 0.45, z], b: [side * 2.2, 4.5, z], ra: 0.24, rb: 0.21, colour: LACQUER, k: 0.02 });
        s.push({ kind: 'egg', c: [side * 2.2, 0.45, z], r: [0.36, 0.22, 0.36], colour: STONE, k: 0.03, rough: { scale: 8, amp: 0.03 } });
        s.push({ kind: 'egg', c: [side * 2.2, 4.42, z], r: [0.29, 0.07, 0.29], colour: GOLD, k: 0.01 });
      }
      s.push({ kind: 'box', c: [side * 2.2, 0.16, 0], h: [0.44, 0.16, 1.2], colour: STONE, k: 0.02, round: 0.05, rough: { scale: 8, amp: 0.03 } });
      s.push({ kind: 'egg', c: [side * 2.2, 0.36, 0], r: [0.4, 0.07, 1.1], colour: SNOW, k: 0.05, rough: { scale: 9, amp: 0.05 } });
    }
    return s;
  },
  gateRoof() {
    const s = [];
    // Lintels, a row of brackets, the name board, and the roof.
    for (const z of [0.75, -0.75]) s.push({ kind: 'box', c: [0, 4.42, z], h: [2.75, 0.2, 0.17], colour: TIMBER, k: 0.02, round: 0.03 });
    for (const side of [1, -1]) s.push({ kind: 'box', c: [side * 2.2, 4.42, 0], h: [0.17, 0.2, 1.0], colour: TIMBER, k: 0.02, round: 0.03 });
    brackets(s, 4.74, 2.6, 0.92);
    brackets(s, 4.74, 2.6, -0.92);
    s.push({ kind: 'box', c: [0, 3.78, 0.82], h: [1.2, 0.4, 0.06], colour: rgb(0x1c2a3a), k: 0.01, round: 0.03 });
    s.push({ kind: 'box', c: [0, 3.78, 0.86], h: [1.28, 0.48, 0.03], colour: GOLD, k: 0.006, round: 0.02 });
    s.push({ kind: 'box', c: [0, 3.78, 0.9], h: [1.14, 0.34, 0.04], colour: rgb(0x16222f), k: 0.006, round: 0.02 });
    roof(s, 4.95, 7.6, 4.2, 1.5, 0, 0.4);
    return s;
  },
  temple() {
    const s = [];
    // The terrace and its steps.
    s.push({ kind: 'box', c: [0, 0.45, 0], h: [10.6, 0.45, 5.6], colour: dim(STONE, 0.75), k: 0.05, round: 0.08, rough: { scale: 3, amp: 0.06 } });
    s.push({ kind: 'box', c: [0, 0.86, 0], h: [10.75, 0.07, 5.75], colour: STONE, k: 0.03, round: 0.05 });
    for (let i = 0; i < 4; i++) s.push({ kind: 'box', c: [0, 0.11 + i * 0.22, 5.9 + (3 - i) * 0.42], h: [3.5, 0.11, 0.24], colour: i % 2 ? dim(STONE, 1.1) : STONE, k: 0.02, round: 0.03, rough: { scale: 6, amp: 0.02 } });
    for (const side of [1, -1]) s.push({ kind: 'box', c: [side * 3.7, 0.5, 6.4], h: [0.22, 0.5, 1.0], colour: dim(STONE, 0.8), k: 0.03, round: 0.06 });
    s.push({ kind: 'egg', c: [0, 0.94, 4.6], r: [9.8, 0.06, 0.9], colour: SNOW, k: 0.06, rough: { scale: 2.5, amp: 0.08 } });
    // The hall: plastered walls between timbers, a lattice window to each side of the door.
    s.push({ kind: 'box', c: [0, 3.0, -1.2], h: [8.5, 2.2, 3.3], colour: rgb(0x8a6a58), k: 0.03, round: 0.04, rough: { scale: 2, amp: 0.04 } });
    for (let i = 0; i < 7; i++) s.push({ kind: 'box', c: [-8.4 + i * 2.8, 3.0, 2.12], h: [0.16, 2.2, 0.08], colour: TIMBER, k: 0.01, round: 0.02 });
    s.push({ kind: 'box', c: [0, 1.25, 2.12], h: [8.5, 0.12, 0.08], colour: TIMBER, k: 0.01, round: 0.02 });
    for (const side of [1, -1]) {
      s.push({ kind: 'box', c: [side * 5.6, 3.0, 2.1], h: [1.0, 0.85, 0.2], colour: rgb(0x1a1210), k: 0.02, cut: true });
      for (let i = -3; i <= 3; i++) s.push({ kind: 'box', c: [side * 5.6 + i * 0.27, 3.0, 2.14], h: [0.035, 0.85, 0.04], colour: LACQUER, k: 0.006 });
      for (let j = -2; j <= 2; j++) s.push({ kind: 'box', c: [side * 5.6, 3.0 + j * 0.32, 2.14], h: [1.0, 0.03, 0.04], colour: LACQUER, k: 0.006 });
      // A door leaf standing ajar.
      s.push({ kind: 'box', c: [side * 1.5, 2.7, 2.3], h: [0.68, 1.8, 0.06], colour: LACQUER, k: 0.01, round: 0.02, turn: [0, side * 0.5, 0] });
    }
    s.push({ kind: 'box', c: [0, 2.7, 2.1], h: [1.2, 1.8, 0.3], colour: rgb(0x1a1210), k: 0.02, cut: true });
    // The colonnade: red columns on stone drums, a beam, and brackets under the eaves.
    for (let i = 0; i < 6; i++) {
      const x = -8 + i * 3.2;
      s.push({ kind: 'cap', a: [x, 1.0, 3.5], b: [x, 5.2, 3.5], ra: 0.3, rb: 0.26, colour: LACQUER, k: 0.02 });
      s.push({ kind: 'egg', c: [x, 1.02, 3.5], r: [0.44, 0.2, 0.44], colour: STONE, k: 0.03, rough: { scale: 8, amp: 0.03 } });
      s.push({ kind: 'egg', c: [x, 5.1, 3.5], r: [0.36, 0.08, 0.36], colour: GOLD, k: 0.01 });
    }
    s.push({ kind: 'box', c: [0, 5.35, 3.5], h: [8.9, 0.24, 0.22], colour: TIMBER, k: 0.02, round: 0.04 });
    s.push({ kind: 'box', c: [0, 5.35, 3.74], h: [8.6, 0.12, 0.02], colour: rgb(0x1f5a5a), k: 0.006, round: 0.01 });
    brackets(s, 5.75, 8.6, 3.7);
    s.push({ kind: 'box', c: [0, 6.25, 4.3], h: [1.7, 0.5, 0.07], colour: rgb(0x1c2a3a), k: 0.01, round: 0.03 });
    s.push({ kind: 'box', c: [0, 6.25, 4.36], h: [1.8, 0.6, 0.03], colour: GOLD, k: 0.006, round: 0.02 });
    s.push({ kind: 'box', c: [0, 6.25, 4.4], h: [1.6, 0.4, 0.04], colour: rgb(0x16222f), k: 0.006, round: 0.02 });
    roof(s, 5.9, 22.5, 13, 3.4, 0.6);
    // The upper storey and its smaller roof.
    s.push({ kind: 'box', c: [0, 8.4, 0.6], h: [5.6, 0.9, 2.2], colour: rgb(0x6a4a3c), k: 0.03, round: 0.04 });
    for (let i = 0; i < 9; i++) s.push({ kind: 'box', c: [-5.2 + i * 1.3, 8.4, 2.82], h: [0.07, 0.8, 0.05], colour: LACQUER, k: 0.01 });
    roof(s, 9.3, 13.4, 6.4, 2.3, 0.6);
    return s;
  },
  lantern() {
    // A stone lantern: a stepped foot, a shaft, a lamp house with four posts, a roof with snow on it.
    const s = [], st = STONE;
    s.push({ kind: 'box', c: [0, 0.1, 0], h: [0.34, 0.1, 0.34], colour: dim(st, 0.8), k: 0.02, round: 0.04, rough: { scale: 20, amp: 0.02 } });
    s.push({ kind: 'box', c: [0, 0.26, 0], h: [0.24, 0.07, 0.24], colour: st, k: 0.02, round: 0.04 });
    s.push({ kind: 'cap', a: [0, 0.3, 0], b: [0, 1.0, 0], ra: 0.13, rb: 0.105, colour: st, k: 0.04, rough: { scale: 25, amp: 0.015 } });
    s.push({ kind: 'egg', c: [0, 0.66, 0], r: [0.15, 0.05, 0.15], colour: dim(st, 1.15), k: 0.02 });
    for (const y of [0.31, 0.92]) s.push({ kind: 'egg', c: [0, y, 0], r: [0.168, 0.044, 0.165], colour: dim(st, 1.04), k: 0.016 });
    s.push({ kind: 'box', c: [0, 1.07, 0], h: [0.25, 0.06, 0.25], colour: st, k: 0.02, round: 0.04 });
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) s.push({ kind: 'box', c: [x * 0.17, 1.3, z * 0.17], h: [0.04, 0.18, 0.04], colour: dim(st, 0.7), k: 0.01, round: 0.015 });
    s.push({ kind: 'box', c: [0, 1.5, 0], h: [0.25, 0.035, 0.25], colour: dim(st, 0.8), k: 0.015, round: 0.02 });
    s.push({ kind: 'egg', c: [0, 1.785, 0], r: [0.059, 0.077, 0.059], colour: st, k: 0.02 });
    return s.map((solid) => ({ ...solid, stuff: solid.colour === SNOW ? PROP_SURFACE.snow : PROP_SURFACE.stone }));
  },
  rock() {
    const s = [], dark = rgb(0x3c4048);
    for (const [c, r] of [[[0, 0.4, 0], [1, 0.75, 0.85]], [[0.55, 0.3, 0.3], [0.6, 0.5, 0.55]], [[-0.5, 0.25, -0.35], [0.6, 0.45, 0.6]], [[0.1, 0.75, -0.2], [0.55, 0.5, 0.5]]])
      s.push({ kind: 'box', c, h: r.map((v) => v * 0.72), colour: dark, k: 0.12, round: 0.2, rough: { scale: 3.2, amp: 0.3 }, turn: [c[0] * 0.6, c[2] * 2, c[1] * 0.5] });
    s.push({ kind: 'egg', c: [0.05, 1.0, -0.1], r: [0.75, 0.2, 0.68], colour: SNOW, k: 0.1, rough: { scale: 6, amp: 0.1 } });
    s.push({ kind: 'egg', c: [0.5, 0.62, 0.3], r: [0.42, 0.12, 0.4], colour: SNOW, k: 0.08, rough: { scale: 6, amp: 0.08 } });
    return s;
  }
};

/** Sculpt a figure part by part, each on a grid as fine as it deserves, and join the results. */
const CELLS = { body: 0.013, hat: 0.01, head: 0.0046, hand: 0.004, boot: 0.007 };
function sculptParts(solids, bones, coarse) {
  // Faces and hands coarsen more slowly than the rest, or they would be the first things lost.
  const made = Object.entries(CELLS).map(([part, fine]) => [part, fine * (part === 'head' || part === 'hand' ? Math.pow(coarse, 0.7) : coarse)]).map(([part, cell]) => sculpt(solids.filter((solid) => solid.part === part), { cell, bones, mottle: part === 'head' || part === 'hand' ? 0.035 : 0.07, pad: cell * 3 })),
    total = made.reduce((sum, mesh) => sum + mesh.positions.length / 3, 0),
    out = { positions: new Float32Array(total * 3), normals: new Float32Array(total * 3), colours: new Float32Array(total * 3), stuffs: new Uint8Array(total), joints: new Uint8Array(total * 4), weights: new Float32Array(total * 4), indices: [], lo: [1e9, 1e9, 1e9], hi: [-1e9, -1e9, -1e9] };
  let at = 0;
  for (const mesh of made) {
    out.positions.set(mesh.positions, at * 3);
    out.normals.set(mesh.normals, at * 3);
    out.colours.set(mesh.colours, at * 3);
    out.stuffs.set(mesh.stuffs, at);
    out.joints.set(mesh.joints, at * 4);
    out.weights.set(mesh.weights, at * 4);
    for (const i of mesh.indices) out.indices.push(i + at);
    at += mesh.positions.length / 3;
    for (let c = 0; c < 3; c++) (out.lo[c] = Math.min(out.lo[c], mesh.lo[c])), (out.hi[c] = Math.max(out.hi[c], mesh.hi[c]));
  }
  out.indices = Uint32Array.from(out.indices);
  return out;
}

// Three levels of detail, each a file of its own. `coarse` multiplies the size of the grid cells;
// blades and buildings coarsen less, because thin edges and rows of tile would vanish.
const LEVELS = { high: 1, mid: 1.4, low: 2 };
const args = process.argv.slice(2),
  wanted = args.find((arg) => arg.startsWith('--level='))?.slice(8) ?? 'all',
  only = args.filter((arg) => !arg.startsWith('--'));
mkdirSync(new URL('../assets/', import.meta.url), { recursive: true });
const fullRig = bindPose(BONES),
  yardRig = bindPose(YARD_BONES);
const stockParts = new Map();
const lowBin = new URL('../assets/models-low.bin', import.meta.url);
const lowIndex = new URL('../assets/models-low.json', import.meta.url);
const lowStock = only.length && existsSync(lowBin) && existsSync(lowIndex) ?
  { index: JSON.parse(readFileSync(lowIndex, 'utf8')), bin: readFileSync(lowBin) } : null;

for (const [level, coarse] of Object.entries(LEVELS)) {
  if (wanted !== 'all' && wanted !== level) continue;
  const binPath = new URL(`../assets/models-${level}.bin`, import.meta.url),
    indexPath = new URL(`../assets/models-${level}.json`, import.meta.url),
    jobs = [],
    thin = Math.min(coarse, 1.25),
    built = Math.min(coarse, 1.3);
  for (const [name, look] of Object.entries(LOOKS)) {
    const full = name === 'hero' || name === 'lu';
    // The Tripo GLBs carry their own quality tiers. This is the same LOD for stock fallback in each pack.
    jobs.push([name, () => sculptParts(person(look, full ? BONES : YARD_BONES), full ? fullRig : yardRig, LEVELS.low)]);
  }
  for (const [name, make] of Object.entries(THINGS)) {
    const { solids, edge } = finishEquipment(name, make(), rgb);
    jobs.push([name, () => sculpt(solids, { cell: 0.0075 * thin, mottle: 0.05 })]);
    if (name === 'glaive') jobs.push(['glaiveEdge', () => makeGlaiveBlade(rgb)]);
    else if (edge) jobs.push([name + 'Edge', () => sculpt(edge.map((solid) => ({ ...solid, stuff: 3 })), { cell: 0.006 * thin, mottle: 0.03 })]);
  }
  const CELL = { rock: 0.05, pine: 0.085, stack: 0.04, gate: 0.07, gateRoof: 0.08, temple: 0.16, lantern: 0.022, stele: 0.023, lion: 0.027 };
  for (const [name, make] of Object.entries(PROPS)) {
    const keepCarving = ['gate', 'gateRoof', 'temple', 'stele'].includes(name);
    const grid = name === 'lion' ? Math.min(coarse, 1.6) : keepCarving ? built : coarse;
    jobs.push([name, () => {
      const solids = make();
      return detailSceneMesh(name, sculpt(solids, { cell: (CELL[name] ?? 0.026) * grid, mottle: 0.16 }), coarse, solids);
    }]);
  }

  // Models not asked for keep what was sculpted before.
  const old = existsSync(indexPath) && only.length ? { index: JSON.parse(readFileSync(indexPath, 'utf8')), bin: readFileSync(binPath) } : null,
    chunks = [],
    index = {};
  let offset = 0;
  for (const [name, make] of jobs) {
    const stock = Object.hasOwn(LOOKS, name);
    let bytes, info;
    const previous = stock ? lowStock : old;
    if (stockParts.has(name)) {
      ({ bytes, info } = stockParts.get(name));
    } else if (previous && !only.includes(name) && previous.index[name]) {
      info = previous.index[name];
      bytes = previous.bin.subarray(info.offset, info.offset + info.bytes);
    } else {
      const started = Date.now(),
        packed = pack(make());
      ({ bytes, info } = packed);
      console.log(`${level} ${name}: ${info.count} points, ${info.indices / 3} triangles, ${(bytes.length / 1024) | 0} KB, ${((Date.now() - started) / 1000).toFixed(1)} s`);
    }
    if (stock) stockParts.set(name, { bytes, info });
    index[name] = { ...info, offset, bytes: bytes.length };
    chunks.push(bytes);
    offset += bytes.length;
  }
  writeFileSync(binPath, Buffer.concat(chunks));
  writeFileSync(indexPath, JSON.stringify(index));
  console.log(`assets/models-${level}.bin: ${(offset / 1024) | 0} KB`);
}
