// Sculpts every model of the game and writes them to assets/models.bin with an index beside it.
//   node tools/models.mjs            all of them
//   node tools/models.mjs hero lu    only those named
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { BIND, BONES, JOINTS } from '../src/view/rig.mjs';
import { pack, sculpt } from './sculpt.mjs';

const rgb = (hex) => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255].map((v) => Math.pow(v, 2.2));
const dim = (c, k) => c.map((v) => v * k);
const SKIN = rgb(0xd9a982),
  HAIR = rgb(0x15151a),
  STEEL = rgb(0xb9c2cf),
  IRON = rgb(0x3d4149),
  WOOD = rgb(0x4a2f1c),
  RED = rgb(0xb3221c),
  GOLD = rgb(0xb58a3a),
  SNOW = rgb(0xe8eef4),
  STONE = rgb(0x767c88);

/** Where every bone is in the sculpted pose: a rotation and a place in the model's space. */
function bindPose() {
  const world = { root: { r: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] } };
  for (const name of BONES) {
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
  return BONES.map((name) => world[name]);
}

/** A figure's solids. `look` says how he is dressed. */
function person(look) {
  const out = [],
    bone = (name) => BONES.indexOf(name),
    cap = (name, a, b, ra, rb, colour, more = {}) => out.push({ kind: 'cap', bone: bone(name), a, b, ra, rb, colour, ...more }),
    egg = (name, c, r, colour, more = {}) => out.push({ kind: 'egg', bone: bone(name), c, r, colour, ...more }),
    box = (name, c, h, colour, more = {}) => out.push({ kind: 'box', bone: bone(name), c, h, colour, ...more }),
    { coat, trim, legs, boots } = look,
    under = dim(coat, 0.62),
    w = look.bulk ?? 1;

  // Legs first, so that the coat lies over them.
  for (const [leg, shin, side] of [
    ['legL', 'shinL', 1],
    ['legR', 'shinR', -1]
  ]) {
    cap(leg, [0, 0.02, 0], [0, -0.45, 0], 0.09 * w, 0.064, legs, { k: 0.03 });
    cap(shin, [0, 0, 0], [0, -0.2, 0], 0.064, 0.055, legs, { k: 0.03 });
    // Bound leggings and a soft boot with a turned-up toe.
    cap(shin, [0, -0.16, 0], [0, -0.4, 0], 0.058, 0.05, boots, { k: 0.012, fold: { n: 1, amp: 0 } });
    for (let i = 0; i < 4; i++) egg(shin, [0, -0.19 - i * 0.055, 0], [0.062 - i * 0.002, 0.012, 0.062 - i * 0.002], dim(boots, 1.5), { k: 0.008 });
    egg(shin, [0, -0.44, 0.045], [0.052, 0.04, 0.105], boots, { k: 0.02 });
    egg(shin, [0, -0.425, 0.14], [0.03, 0.028, 0.03], boots, { k: 0.02 });
    egg(shin, [0, -0.475, 0.04], [0.056, 0.014, 0.11], dim(boots, 0.5), { k: 0.006 });
    void side;
  }
  // The skirt of the coat: two overlapping halves, each half following its leg a little, pleated.
  const hem = look.long ? -0.6 : -0.38;
  for (const [side, leg] of [
    [1, 'legL'],
    [-1, 'legR']
  ])
    cap('hips', [side * 0.035, 0.06, 0], [side * 0.07, hem, 0], 0.15 * w, (look.long ? 0.24 : 0.2) * w, under, { k: 0.03, flat: 0.8, fold: { n: 11, amp: 0.011, from: 0.15 }, also: [bone(leg), 0.4] });
  egg('hips', [0, hem - 0.015, 0], [(look.long ? 0.3 : 0.26) * w, 0.016, (look.long ? 0.25 : 0.215) * w], trim, { k: 0.01 });
  // Torso: belly, chest, shoulders; the coat crossed right over left with a band at its edge.
  egg('spine', [0, 0.08, 0], [0.165 * w, 0.17, 0.118 * w], coat, { k: 0.04 });
  egg('spine', [0, 0.31, 0.005], [0.195 * w, 0.2, 0.128 * w], coat, { k: 0.05 });
  for (const side of [1, -1]) egg('spine', [side * 0.185 * w, 0.445, 0], [0.09, 0.075, 0.09], coat, { k: 0.04 });
  cap('spine', [0.075, 0.5, 0.075], [-0.07, 0.08, 0.118 * w], 0.02, 0.026, trim, { k: 0.008 });
  cap('spine', [-0.075, 0.5, 0.075], [-0.02, 0.36, 0.125 * w], 0.02, 0.022, trim, { k: 0.008 });
  egg('spine', [0, 0.515, -0.02], [0.082, 0.03, 0.085], trim, { k: 0.012 });
  cap('spine', [0, 0.47, 0.005], [0, 0.6, 0.012], 0.05, 0.046, SKIN, { k: 0.02 });
  // Sash: wound twice, knotted at the left hip, the ends hanging.
  egg('spine', [0, 0.035, 0], [0.18 * w, 0.042, 0.13 * w], look.sash ?? trim, { k: 0.008 });
  egg('spine', [0, 0.085, 0], [0.176 * w, 0.02, 0.127 * w], dim(look.sash ?? trim, 0.7), { k: 0.006 });
  egg('spine', [0.1, 0.04, 0.115 * w], [0.035, 0.03, 0.025], look.sash ?? trim, { k: 0.01 });
  cap('hips', [0.1, 0.08, 0.125 * w], [0.12, -0.2, 0.17 * w], 0.02, 0.028, look.sash ?? trim, { k: 0.008, flat: 0.5, also: [bone('legL'), 0.3] });
  cap('hips', [0.085, 0.08, 0.125 * w], [0.06, -0.15, 0.165 * w], 0.018, 0.024, dim(look.sash ?? trim, 0.8), { k: 0.008, flat: 0.5, also: [bone('legL'), 0.3] });

  // Arms: a full sleeve gathered into a bound cuff, and a hand closed as on a haft.
  for (const [arm, fore, side] of [
    ['armL', 'foreL', 1],
    ['armR', 'foreR', -1]
  ]) {
    cap(arm, [0, 0.01, 0], [0, -0.29, 0], 0.07 * w, 0.058, coat, { k: 0.035, fold: { n: 5, amp: 0.004 } });
    cap(fore, [0, 0, 0], [0, -0.17, 0], 0.056, 0.064, coat, { k: 0.03, fold: { n: 6, amp: 0.005 } });
    cap(fore, [0, -0.15, 0], [0, -0.235, 0], 0.05, 0.043, look.cuff ?? trim, { k: 0.01 });
    for (let i = 0; i < 3; i++) egg(fore, [0, -0.165 - i * 0.03, 0], [0.052 - i * 0.003, 0.007, 0.052 - i * 0.003], dim(look.cuff ?? trim, 0.55), { k: 0.004 });
    egg(fore, [0, -0.275, 0.004], [0.034, 0.042, 0.03], SKIN, { k: 0.015 });
    egg(fore, [0, -0.3, 0.022], [0.036, 0.026, 0.03], SKIN, { k: 0.012 }); // fingers curled
    cap(fore, [side * -0.03, -0.265, 0.02], [side * -0.012, -0.295, 0.046], 0.012, 0.01, SKIN, { k: 0.008 }); // thumb
  }

  // Head: skull and jaw, brow, nose, cheekbones, ears, eyes set in shallow hollows.
  egg('head', [0, 0.09, 0], [0.09, 0.108, 0.098], SKIN, { k: 0.03 });
  egg('head', [0, 0.035, 0.022], [0.066, 0.066, 0.072], SKIN, { k: 0.04 });
  egg('head', [0, 0.105, 0.078], [0.07, 0.014, 0.022], SKIN, { k: 0.02 });
  cap('head', [0, 0.092, 0.092], [0, 0.052, 0.108], 0.011, 0.017, SKIN, { k: 0.014 });
  for (const side of [1, -1]) {
    egg('head', [side * 0.05, 0.062, 0.062], [0.026, 0.02, 0.022], SKIN, { k: 0.03 });
    egg('head', [side * 0.09, 0.07, -0.005], [0.011, 0.026, 0.017], SKIN, { k: 0.01 });
    egg('head', [side * 0.034, 0.088, 0.09], [0.017, 0.008, 0.012], HAIR, { k: 0.006, cut: true });
    cap('head', [side * 0.016, 0.112, 0.09], [side * 0.058, 0.115, 0.075], 0.006, 0.004, HAIR, { k: 0.004 }); // eyebrow
  }
  egg('head', [0, 0.028, 0.088], [0.022, 0.005, 0.01], dim(SKIN, 0.45), { k: 0.004, cut: true }); // mouth
  // Hair bound up behind, sideburns.
  egg('head', [0, 0.118, -0.028], [0.097, 0.1, 0.098], HAIR, { k: 0.012, rough: { scale: 70, amp: 0.006 } });
  for (const side of [1, -1]) cap('head', [side * 0.082, 0.1, 0.035], [side * 0.08, 0.03, 0.03], 0.012, 0.006, HAIR, { k: 0.008 });
  if (look.beard) {
    egg('head', [0, -0.005, 0.07], [0.05, 0.05, 0.03], HAIR, { k: 0.02, rough: { scale: 80, amp: 0.008 } });
    for (const side of [1, -1]) cap('head', [side * 0.008, 0.045, 0.1], [side * 0.05, 0.02, 0.085], 0.009, 0.005, HAIR, { k: 0.006 });
  }
  look.hat?.({ cap, egg, box });
  look.extra?.({ cap, egg, box, w });
  return out;
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
    coat: rgb(0xcdd2d8), trim: rgb(0x8e2420), sash: rgb(0x8e2420), cuff: rgb(0x2b3140), legs: rgb(0x2b3140), boots: rgb(0x1d1b1c),
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
    coat: rgb(0x6b4a33), trim: rgb(0x2e2420), sash: rgb(0x8a7a5c), legs: rgb(0x37312d), boots: rgb(0x1f1a17),
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
    coat: rgb(0x4f5a4a), trim: rgb(0x8a6a2c), sash: rgb(0x2c2a26), cuff: IRON, legs: rgb(0x2c302c), boots: rgb(0x1c1b19), bulk: 1.08, beard: true,
    hat({ egg, cap }) {
      egg('head', [0, 0.15, 0], [0.112, 0.09, 0.115], IRON, { k: 0.008 });
      egg('head', [0, 0.13, 0], [0.122, 0.014, 0.125], dim(IRON, 1.6), { k: 0.006 });
      cap('head', [0, 0.23, 0], [0, 0.31, 0], 0.018, 0.005, IRON, { k: 0.01 });
      egg('head', [0, 0.06, -0.07], [0.105, 0.08, 0.06], dim(IRON, 0.8), { k: 0.01 });
    },
    extra({ egg, box, w }) {
      egg('spine', [0, 0.28, 0.01], [0.2 * w, 0.21, 0.138 * w], rgb(0x4a3526), { k: 0.012 });
      for (let row = 0; row < 3; row++) for (let i = -1; i <= 1; i++) box('spine', [i * 0.085, 0.4 - row * 0.105, 0.13 * w - Math.abs(i) * 0.022], [0.034, 0.042, 0.008], dim(IRON, 1.3), { k: 0.004, round: 0.008 });
      for (const side of [1, -1]) egg('spine', [side * 0.21 * w, 0.46, 0], [0.105, 0.06, 0.11], IRON, { k: 0.01 });
    }
  },
  // A bowman: a dark blue coat, a fur hat, a quiver across the back.
  bow: {
    coat: rgb(0x2f3d5c), trim: rgb(0x9a8a70), sash: rgb(0x6a5440), legs: rgb(0x26282e), boots: rgb(0x1b1a19), bulk: 0.96,
    hat({ cap, egg }) {
      cap('head', [0, 0.12, 0], [0, 0.2, 0], 0.125, 0.11, rgb(0x6a5440), { k: 0.01, rough: { scale: 90, amp: 0.02 } });
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
    coat: rgb(0x25181c), trim: rgb(0x9b1f24), sash: rgb(0xb58a3a), cuff: rgb(0x5a1418), legs: rgb(0x16161a), boots: rgb(0x0f0f11), long: true, beard: true, bulk: 1.06,
    hat({ cap, box, egg }) {
      cap('head', [0, 0.13, 0], [0, 0.22, -0.005], 0.105, 0.095, rgb(0x121216), { k: 0.008 });
      box('head', [0, 0.245, -0.05], [0.07, 0.055, 0.04], rgb(0x121216), { k: 0.01, round: 0.02 });
      box('head', [0, 0.19, -0.105], [0.27, 0.02, 0.012], rgb(0x121216), { k: 0.006, round: 0.01 });
      egg('head', [0, 0.17, 0.095], [0.022, 0.022, 0.012], GOLD, { k: 0.004 });
    },
    extra(tools) {
      const { egg, box, w } = tools;
      cloak(rgb(0x5a1418), 0.8)(tools);
      for (const side of [1, -1]) {
        egg('spine', [side * 0.215 * w, 0.47, 0], [0.12, 0.06, 0.125], IRON, { k: 0.01 });
        egg('spine', [side * 0.245 * w, 0.43, 0], [0.11, 0.045, 0.115], dim(IRON, 0.8), { k: 0.008 });
        egg('spine', [side * 0.215 * w, 0.5, 0], [0.05, 0.03, 0.05], GOLD, { k: 0.006 });
      }
      // A plate on the chest and a broad belt with a clasp.
      box('spine', [0, 0.33, 0.125 * w], [0.075, 0.075, 0.012], dim(IRON, 1.2), { k: 0.006, round: 0.02, turn: [0, 0, 0.785] });
      egg('spine', [0, 0.33, 0.14 * w], [0.03, 0.03, 0.012], GOLD, { k: 0.004 });
      box('spine', [0, 0.04, 0.13 * w], [0.045, 0.04, 0.012], GOLD, { k: 0.004, round: 0.008 });
    }
  }
};

/** Things held in the hand, sculpted along +z from the grip at the origin. */
const THINGS = {
  spear() {
    const s = [];
    s.push({ kind: 'cap', a: [0, 0, -1.05], b: [0, 0, 1.3], ra: 0.019, rb: 0.017, colour: WOOD, k: 0.004 });
    s.push({ kind: 'cap', a: [0, 0, -1.18], b: [0, 0, -1.04], ra: 0.004, rb: 0.024, colour: IRON, k: 0.004 });
    for (let i = 0; i < 3; i++) s.push({ kind: 'egg', c: [0, 0, -0.3 + i * 0.5], r: [0.022, 0.022, 0.012], colour: dim(GOLD, 0.8), k: 0.003 });
    // The tassel: a red skirt of threads below the head.
    s.push({ kind: 'cap', a: [0, 0, 1.3], b: [0, 0, 1.12], ra: 0.03, rb: 0.085, colour: RED, k: 0.01, fold: { n: 13, amp: 0.016, from: 0.2 }, rough: { scale: 120, amp: 0.01 } });
    s.push({ kind: 'egg', c: [0, 0, 1.31], r: [0.034, 0.034, 0.028], colour: GOLD, k: 0.006 });
    // The wine gourd on its cord.
    s.push({ kind: 'cap', a: [0, -0.015, 0.95], b: [0, -0.11, 0.95], ra: 0.006, rb: 0.006, colour: dim(RED, 0.6), k: 0.004 });
    s.push({ kind: 'egg', c: [0, -0.215, 0.95], r: [0.07, 0.072, 0.07], colour: rgb(0xb5843a), k: 0.03 });
    s.push({ kind: 'egg', c: [0, -0.13, 0.95], r: [0.045, 0.045, 0.045], colour: rgb(0xb5843a), k: 0.03 });
    s.push({ kind: 'egg', c: [0, -0.168, 0.95], r: [0.036, 0.008, 0.036], colour: RED, k: 0.004 });
    return { solids: s, edge: [
      { kind: 'cap', a: [0, 0, 1.32], b: [0, 0, 1.44], ra: 0.016, rb: 0.016, colour: STEEL, k: 0.005 },
      // A leaf blade with a raised spine.
      { kind: 'egg', c: [0, 0, 1.62], r: [0.058, 0.012, 0.2], colour: STEEL, k: 0.012 },
      { kind: 'cap', a: [0, 0, 1.44], b: [0, 0, 1.8], ra: 0.016, rb: 0.003, colour: dim(STEEL, 1.15), k: 0.008 }
    ] };
  },
  sabre: () => sword(1.25, -0.4, 0.062),
  short: () => sword(0.95, -0.14, 0.05),
  glaive() {
    const s = [];
    s.push({ kind: 'cap', a: [0, 0, -1.0], b: [0, 0, 1.0], ra: 0.026, rb: 0.023, colour: rgb(0x2a1a14), k: 0.004 });
    s.push({ kind: 'cap', a: [0, 0, -1.15], b: [0, 0, -0.99], ra: 0.005, rb: 0.03, colour: IRON, k: 0.004 });
    for (let i = 0; i < 4; i++) s.push({ kind: 'egg', c: [0, 0, -0.6 + i * 0.4], r: [0.03, 0.03, 0.014], colour: GOLD, k: 0.003 });
    // A dragon-mouth collar and a tuft of red hair below the blade.
    s.push({ kind: 'egg', c: [0, 0.01, 1.02], r: [0.045, 0.06, 0.06], colour: GOLD, k: 0.01 });
    s.push({ kind: 'cap', a: [0, -0.04, 0.98], b: [0, -0.2, 0.9], ra: 0.03, rb: 0.055, colour: RED, k: 0.01, fold: { n: 9, amp: 0.012, from: 0.2 } });
    return { solids: s, edge: [
      // A broad curved blade: a long slab, a swelling belly, a hooked back.
      { kind: 'box', c: [0, 0.07, 1.42], h: [0.011, 0.105, 0.4], colour: STEEL, k: 0.01, round: 0.01 },
      { kind: 'egg', c: [0, 0.16, 1.5], r: [0.011, 0.085, 0.3], colour: STEEL, k: 0.02 },
      { kind: 'egg', c: [0, 0.13, 1.86], r: [0.01, 0.12, 0.16], colour: STEEL, k: 0.02, turn: [-0.5, 0, 0] },
      { kind: 'egg', c: [0, -0.07, 1.22], r: [0.01, 0.06, 0.09], colour: STEEL, k: 0.012, turn: [0.6, 0, 0] },
      { kind: 'egg', c: [0, -0.02, 1.5], r: [0.016, 0.02, 0.36], colour: dim(STEEL, 0.5), k: 0.006 }
    ] };
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
    return { solids: s };
  },
  longbow() {
    const s = [], at = (t) => [0, t * 0.64, 0.02 + (1 - t * t) * 0.2 - Math.max(0, Math.abs(t) - 0.8) * 0.3];
    for (let i = -8; i < 8; i++) s.push({ kind: 'cap', a: at(i / 8), b: at((i + 1) / 8), ra: 0.017 - Math.abs(i + 0.5) * 0.001, rb: 0.017 - Math.abs(i + 1.5) * 0.001, colour: Math.abs(i + 0.5) < 1.5 ? rgb(0x8e2420) : rgb(0x5c3a1e), k: 0.006 });
    s.push({ kind: 'cap', a: at(-1), b: at(1), ra: 0.0045, rb: 0.0045, colour: rgb(0xd8d2c2), k: 0.002 });
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

/** Stone and bronze that stand about the place, sculpted about their footing at the origin. */
const PROPS = {
  lion() {
    const s = [], st = STONE, e = (c, r, more = {}) => s.push({ kind: 'egg', c, r, colour: st, k: 0.06, rough: { scale: 14, amp: 0.02 }, ...more });
    s.push({ kind: 'box', c: [0, 0.4, 0], h: [0.62, 0.4, 0.78], colour: dim(st, 0.8), k: 0.02, round: 0.05, rough: { scale: 10, amp: 0.02 } });
    s.push({ kind: 'box', c: [0, 0.84, 0], h: [0.68, 0.06, 0.84], colour: st, k: 0.02, round: 0.04 });
    e([0, 1.35, -0.2], [0.42, 0.42, 0.5]); // haunches
    e([0, 1.7, 0.12], [0.36, 0.5, 0.36]); // chest
    for (const side of [1, -1]) {
      s.push({ kind: 'cap', a: [side * 0.24, 1.7, 0.32], b: [side * 0.26, 0.98, 0.48], ra: 0.13, rb: 0.11, colour: st, k: 0.05 });
      e([side * 0.26, 0.96, 0.56], [0.14, 0.09, 0.17], { k: 0.03 });
      e([side * 0.36, 1.18, -0.2], [0.17, 0.28, 0.32], { k: 0.05 });
      e([side * 0.22, 2.5, 0.2], [0.07, 0.1, 0.05], { k: 0.03 }); // ears
      e([side * 0.13, 2.3, 0.5], [0.05, 0.04, 0.04], { k: 0.01, colour: dim(st, 0.4), cut: true }); // eyes
    }
    e([0, 2.22, 0.22], [0.34, 0.33, 0.34], { k: 0.05 }); // head
    e([0, 2.12, 0.5], [0.2, 0.15, 0.16], { k: 0.04 }); // muzzle
    e([0, 2.05, 0.6], [0.13, 0.04, 0.08], { k: 0.01, colour: dim(st, 0.35), cut: true });
    // The mane: curls in rows round the neck.
    for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + row * 0.35;
      if (Math.cos(a) > 0.55 && row < 2) continue;
      e([Math.sin(a) * (0.34 + row * 0.03), 2.25 - row * 0.2, 0.18 - Math.cos(a) * -0.3 * 1 + (row * 0.02 - 0.3)], [0.1, 0.1, 0.1], { k: 0.025 });
    }
    e([0, 0.98, 0.72], [0.17, 0.17, 0.17], { k: 0.02 }); // the ball under the paw
    s.push({ kind: 'egg', c: [0, 0.93, 0], r: [0.6, 0.05, 0.74], colour: SNOW, k: 0.03, rough: { scale: 20, amp: 0.03 } });
    s.push({ kind: 'egg', c: [0, 2.56, 0.12], r: [0.26, 0.06, 0.26], colour: SNOW, k: 0.04, rough: { scale: 20, amp: 0.03 } });
    s.push({ kind: 'egg', c: [0, 1.82, -0.42], r: [0.3, 0.07, 0.24], colour: SNOW, k: 0.05, rough: { scale: 20, amp: 0.03 } });
    return s;
  },
  censer() {
    const s = [], bronze = rgb(0x4a5a50), pale = rgb(0x6f8a78);
    for (let i = 0; i < 3; i++) {
      const a = i * 2.094 + 0.5;
      s.push({ kind: 'cap', a: [Math.cos(a) * 0.6, 0.06, Math.sin(a) * 0.6], b: [Math.cos(a) * 0.45, 0.8, Math.sin(a) * 0.45], ra: 0.13, rb: 0.16, colour: bronze, k: 0.04 });
      s.push({ kind: 'egg', c: [Math.cos(a) * 0.62, 0.08, Math.sin(a) * 0.62], r: [0.17, 0.09, 0.17], colour: bronze, k: 0.03 });
    }
    s.push({ kind: 'egg', c: [0, 1.0, 0], r: [0.86, 0.42, 0.86], colour: bronze, k: 0.05, rough: { scale: 12, amp: 0.012 } });
    s.push({ kind: 'egg', c: [0, 1.28, 0], r: [0.9, 0.07, 0.9], colour: pale, k: 0.02 });
    for (let i = 0; i < 16; i++) s.push({ kind: 'egg', c: [Math.cos(i * 0.3927) * 0.84, 1.0, Math.sin(i * 0.3927) * 0.84], r: [0.07, 0.13, 0.07], colour: pale, k: 0.02 });
    for (const side of [1, -1]) {
      s.push({ kind: 'cap', a: [side * 0.84, 1.3, 0], b: [side * 0.98, 1.72, 0], ra: 0.06, rb: 0.06, colour: bronze, k: 0.03 });
      s.push({ kind: 'cap', a: [side * 0.98, 1.72, 0], b: [side * 0.72, 1.74, 0], ra: 0.06, rb: 0.05, colour: bronze, k: 0.03 });
    }
    s.push({ kind: 'egg', c: [0, 1.22, 0], r: [0.78, 0.16, 0.78], colour: rgb(0x1a1a1c), k: 0.03, cut: true });
    s.push({ kind: 'egg', c: [0, 1.14, 0], r: [0.74, 0.07, 0.74], colour: rgb(0x8f8f86), k: 0.02, rough: { scale: 25, amp: 0.03 } }); // ash
    return s;
  },
  pine() {
    // A trunk and six tiers of drooping boughs, each bough with its load of snow.
    const s = [], bark = rgb(0x2e221b), needle = rgb(0x1f3a2e);
    s.push({ kind: 'cap', a: [0, -0.4, 0], b: [0.15, 6.6, 0], ra: 0.3, rb: 0.07, colour: bark, k: 0.1, rough: { scale: 5, amp: 0.1 } });
    for (let tier = 0; tier < 6; tier++) {
      const y = 1.9 + tier * 0.92, reach = 2.5 - tier * 0.4, n = 8 - tier;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + tier * 0.7, c = Math.cos(a), z = Math.sin(a), tone = dim(needle, 0.75 + ((i * 7 + tier * 3) % 5) * 0.11);
        s.push({ kind: 'cap', a: [c * 0.15, y + 0.25, z * 0.15], b: [c * reach, y - reach * 0.22, z * reach], ra: 0.3 + reach * 0.08, rb: 0.1, colour: tone, k: 0.16, rough: { scale: 7, amp: 0.2 } });
        s.push({ kind: 'cap', a: [c * reach * 0.25, y + 0.42, z * reach * 0.25], b: [c * reach * 0.86, y + 0.06 - reach * 0.16, z * reach * 0.86], ra: 0.2 + reach * 0.05, rb: 0.08, colour: SNOW, k: 0.1, rough: { scale: 6, amp: 0.12 } });
      }
    }
    s.push({ kind: 'cap', a: [0.12, 6.3, 0], b: [0.16, 7.5, 0], ra: 0.34, rb: 0.03, colour: needle, k: 0.12, rough: { scale: 7, amp: 0.16 } });
    s.push({ kind: 'egg', c: [0.14, 6.9, 0], r: [0.22, 0.3, 0.22], colour: SNOW, k: 0.1 });
    return s;
  },
  stack() {
    // A fodder stack: bound straw under a thatched cap, snow on the windward side.
    const s = [], straw = rgb(0xb3924a);
    s.push({ kind: 'cap', a: [0, 0.2, 0], b: [0, 1.5, 0], ra: 0.92, rb: 0.98, colour: dim(straw, 0.8), k: 0.05, fold: { n: 46, amp: 0.035, from: 1 }, rough: { scale: 9, amp: 0.05 } });
    s.push({ kind: 'cap', a: [0, 1.75, 0], b: [0, 3.0, 0], ra: 1.02, rb: 0.1, colour: straw, k: 0.06, fold: { n: 34, amp: 0.05, from: 0.6 }, rough: { scale: 8, amp: 0.06 } });
    for (const y of [0.55, 1.15]) s.push({ kind: 'egg', c: [0, y, 0], r: [1.0, 0.05, 1.0], colour: dim(straw, 0.5), k: 0.02 });
    s.push({ kind: 'egg', c: [0, 3.0, 0], r: [0.16, 0.2, 0.16], colour: dim(straw, 0.6), k: 0.04 });
    s.push({ kind: 'egg', c: [-0.3, 2.3, -0.2], r: [0.75, 0.55, 0.7], colour: SNOW, k: 0.12, rough: { scale: 6, amp: 0.1 } });
    s.push({ kind: 'egg', c: [0, 0.05, 0], r: [1.25, 0.1, 1.25], colour: SNOW, k: 0.1, rough: { scale: 5, amp: 0.1 } });
    return s;
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

mkdirSync(new URL('../assets/', import.meta.url), { recursive: true });
const binPath = new URL('../assets/models.bin', import.meta.url),
  indexPath = new URL('../assets/models.json', import.meta.url),
  only = process.argv.slice(2),
  jobs = [];
const bones = bindPose();
for (const [name, look] of Object.entries(LOOKS)) jobs.push([name, () => sculpt(person(look), { cell: 0.012, bones })]);
for (const [name, make] of Object.entries(THINGS)) {
  jobs.push([name, () => sculpt(make().solids, { cell: 0.0075, mottle: 0.05 })]);
  if (make().edge) jobs.push([name + 'Edge', () => sculpt(make().edge, { cell: 0.006, mottle: 0.03 })]);
}
for (const [name, make] of Object.entries(PROPS)) jobs.push([name, () => sculpt(make(), { cell: { rock: 0.05, pine: 0.085, stack: 0.04 }[name] ?? 0.026, mottle: 0.16 })]);

// Models not asked for keep what was sculpted before.
const old = existsSync(indexPath) && only.length ? { index: JSON.parse(readFileSync(indexPath, 'utf8')), bin: readFileSync(binPath) } : null,
  chunks = [],
  index = {};
let offset = 0;
for (const [name, make] of jobs) {
  let bytes, info;
  if (old && !only.includes(name) && old.index[name]) {
    info = old.index[name];
    bytes = old.bin.subarray(info.offset, info.offset + info.bytes);
  } else {
    const started = Date.now(),
      packed = pack(make());
    ({ bytes, info } = packed);
    console.log(`${name}: ${info.count} points, ${info.indices / 3} triangles, ${(bytes.length / 1024) | 0} KB, ${((Date.now() - started) / 1000).toFixed(1)} s`);
  }
  index[name] = { ...info, offset, bytes: bytes.length };
  chunks.push(bytes);
  offset += bytes.length;
}
writeFileSync(binPath, Buffer.concat(chunks));
writeFileSync(indexPath, JSON.stringify(index));
console.log(`assets/models.bin: ${(offset / 1024) | 0} KB`);
