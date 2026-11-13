// The eight racers and their karts. A kart is drawn in layers so each can
// have its own finish: lacquered paint, bright metal, dark rubber and seat,
// glowing lamps, a badge with the racer's seal, the driver's body with the
// kart's ornament, and a head that turns with the steering. Models face +Z;
// +X is the driver's left.
import {
  Mesh3D,
  Object3D,
  createGlassMaterial3D,
  createLatheGeometry3D,
  createSphereGeometry3D,
  createStandardMaterial3D,
  createTorusGeometry3D,
  createUnlitMaterial3D,
} from '@egret/engine/world3d';
import { RACERS } from './data.mjs';
import { BALL, BOX, CONE, CYLINDER, SPHERE, TORUS, build, canvasTexture, quads, shade } from './shapes.mjs';

const DARK = 0x1c1c22,
  WHITE = 0xfbfbf6,
  GOLD = 0xf2c230,
  RED = 0xd8262c,
  SKIN = 0xf6cfa4,
  STEEL = 0xc9ccd4;
const HALF = Math.PI / 2;
/** Where the neck is: heads are modelled in kart space and turn about this point. */
const NECK = [0, 1.3, -0.24];

/** Two eyes on a face looking along +Z, each with a highlight. */
const eyes = (y, z, gap, size, pupil = DARK) => [
  [SPHERE, [-gap, y, z], [size, size * 1.15, size * 0.6], WHITE],
  [SPHERE, [gap, y, z], [size, size * 1.15, size * 0.6], WHITE],
  [SPHERE, [-gap, y, z + size * 0.42], size * 0.52, pupil],
  [SPHERE, [gap, y, z + size * 0.42], size * 0.52, pupil],
  [SPHERE, [-gap + size * 0.2, y + size * 0.25, z + size * 0.8], size * 0.18, WHITE],
  [SPHERE, [gap + size * 0.2, y + size * 0.25, z + size * 0.8], size * 0.18, WHITE],
];
/** Arms reaching from the shoulders to the steering wheel, with cuffs. */
const arms = (color, hand = color, cuff = color) =>
  [-1, 1].flatMap((side) => [
    [SPHERE, [side * 0.4, 1.14, -0.2], 0.14, color],
    [CYLINDER, [side * 0.36, 1.0, 0.1], [0.1, 0.62, 0.1], color, [1.15, 0, side * 0.3]],
    [CYLINDER, [side * 0.28, 0.985, 0.33], [0.115, 0.08, 0.115], cuff, [1.15, 0, side * 0.3]],
    [SPHERE, [side * 0.26, 0.98, 0.4], 0.11, hand],
  ]);
/** A seated body: `robe` is the main colour, `sash` a belt and `collar` a neckband. */
const torso = (robe, sash, collar) => [
  [SPHERE, [0, 0.88, -0.28], [0.4, 0.5, 0.34], robe],
  [SPHERE, [0, 0.62, -0.2], [0.42, 0.22, 0.4], shade(robe, 0.85)],
  ...(sash ? [[CYLINDER, [0, 0.78, -0.28], [0.41, 0.1, 0.35], sash]] : []),
  ...(collar ? [[CYLINDER, [0, 1.24, -0.26], [0.22, 0.09, 0.2], collar]] : []),
];

/** The kart's layers, painted in the racer's colours. */
function chassis(body, trim) {
  const deep = shade(body, 0.72),
    bright = shade(body, 1.15);
  return {
    paint: [
      // Tub, nose and cowl.
      [BOX, [0, 0.34, -0.05], [1.02, 0.2, 2.05], body],
      [SPHERE, [0, 0.42, 1.02], [0.47, 0.25, 0.72], bright],
      [SPHERE, [0, 0.57, 0.5], [0.4, 0.2, 0.5], body],
      [BOX, [0, 0.585, 0.98], [0.2, 0.03, 0.9], trim],
      // Front wing with end plates.
      [BOX, [0, 0.23, 1.6], [1.56, 0.05, 0.34], trim],
      [BOX, [0.78, 0.3, 1.6], [0.05, 0.2, 0.4], body],
      [BOX, [-0.78, 0.3, 1.6], [0.05, 0.2, 0.4], body],
      // Side pods with a stripe, and fenders over the rear wheels.
      ...[-1, 1].flatMap((side) => [
        [SPHERE, [side * 0.66, 0.42, -0.1], [0.24, 0.2, 0.74], deep],
        [BOX, [side * 0.66, 0.36, -0.1], [0.4, 0.16, 1.2], deep],
        [BOX, [side * 0.66, 0.6, -0.1], [0.14, 0.03, 1.0], trim],
        [SPHERE, [side * 0.8, 0.74, -0.86], [0.24, 0.1, 0.5], body],
      ]),
      // Engine cover and number plate.
      [SPHERE, [0, 0.68, -1.0], [0.4, 0.28, 0.4], trim],
      [BOX, [0, 0.56, -1.32], [0.62, 0.42, 0.05], body],
    ],
    metal: [
      [CYLINDER, [0, 0.33, 1.42], [0.06, 1.2, 0.06], STEEL, [0, 0, HALF]],
      [CYLINDER, [0, 0.34, -1.38], [0.07, 1.45, 0.07], STEEL, [0, 0, HALF]],
      [CYLINDER, [0, 0.34, 0.92], [0.045, 1.5, 0.045], 0x8f9198, [0, 0, HALF]],
      [CYLINDER, [0, 0.4, -0.86], [0.06, 1.6, 0.06], 0x8f9198, [0, 0, HALF]],
      [CYLINDER, [0.88, 0.3, -0.05], [0.05, 1.3, 0.05], STEEL, [HALF, 0, 0]],
      [CYLINDER, [-0.88, 0.3, -0.05], [0.05, 1.3, 0.05], STEEL, [HALF, 0, 0]],
      [BOX, [0, 0.52, -1.0], [0.74, 0.3, 0.46], 0x6c6e76],
      // Exhausts with flared tips.
      ...[-1, 1].flatMap((side) => [
        [CYLINDER, [side * 0.27, 0.74, -1.3], [0.075, 0.44, 0.075], STEEL, [HALF, 0, 0]],
        [CYLINDER, [side * 0.27, 0.74, -1.52], [0.1, 0.1, 0.1], GOLD, [HALF, 0, 0]],
        [CYLINDER, [side * 0.3, 0.47, 1.5], [0.11, 0.08, 0.11], STEEL, [HALF, 0, 0]],
      ]),
      [CYLINDER, [0, 0.78, 0.52], [0.035, 0.5, 0.035], 0x8f9198, [-0.9, 0, 0]],
    ],
    dark: [
      [BOX, [0, 0.5, -0.36], [0.74, 0.12, 0.62], DARK],
      [BOX, [0, 0.84, -0.66], [0.76, 0.74, 0.16], DARK],
      [SPHERE, [0, 1.22, -0.66], [0.3, 0.14, 0.1], 0x2a2a32],
      [TORUS, [0, 0.98, 0.36], [0.2, 0.2, 0.2], DARK, [-0.9 + HALF, 0, 0]],
      [BOX, [0.66, 0.42, 0.52], [0.3, 0.2, 0.04], 0x111114],
      [BOX, [-0.66, 0.42, 0.52], [0.3, 0.2, 0.04], 0x111114],
      [BOX, [0, 0.235, -0.05], [0.96, 0.03, 2.0], 0x111114],
    ],
  };
}

/**
 * Each racer's driver: `body` (torso and arms), `head`, and `extra`, the
 * ornament that marks out the kart.
 */
const DRIVERS = {
  // A southern lion-dance head: red and gold, big eyes, a horn, fur trim and a white beard.
  lion: () => ({
    body: [
      ...torso(0xd8262c, GOLD, GOLD),
      ...arms(0xf2c230, WHITE, RED),
      ...[-0.2, 0, 0.2].map((x) => [SPHERE, [x, 0.98, 0.04], 0.05, GOLD]),
    ],
    head: [
      [SPHERE, [0, 1.6, -0.2], [0.56, 0.5, 0.52], RED],
      [SPHERE, [0, 1.36, 0.08], [0.46, 0.2, 0.36], WHITE],
      [SPHERE, [0, 1.27, 0.1], [0.34, 0.16, 0.26], 0xfff3d0],
      [SPHERE, [0, 1.52, 0.3], [0.2, 0.15, 0.14], 0x2e8b57],
      [CONE, [0, 2.2, -0.14], [0.11, 0.36, 0.11], GOLD],
      [SPHERE, [0, 2.4, -0.14], 0.07, RED],
      [SPHERE, [0, 1.86, 0.22], [0.5, 0.1, 0.14], WHITE],
      [SPHERE, [0.5, 1.84, -0.22], [0.16, 0.22, 0.1], GOLD],
      [SPHERE, [-0.5, 1.84, -0.22], [0.16, 0.22, 0.1], GOLD],
      [SPHERE, [0, 1.6, -0.55], [0.6, 0.5, 0.3], GOLD],
      // Fur along the brow and down the back of the mane.
      ...[-0.4, -0.2, 0, 0.2, 0.4].map((x) => [SPHERE, [x, 1.96, 0.1], 0.09, WHITE]),
      ...[0, 1, 2, 3].map((k) => [SPHERE, [0, 2.0 - k * 0.24, -0.8 + k * 0.03], [0.16, 0.14, 0.1], k % 2 ? RED : 0x2e8b57]),
      [SPHERE, [0.3, 1.5, 0.22], 0.08, [1, 0.5, 0.55]],
      [SPHERE, [-0.3, 1.5, 0.22], 0.08, [1, 0.5, 0.55]],
      ...eyes(1.7, 0.25, 0.24, 0.15),
    ],
    // A festival drum rides on the back, with its two sticks.
    extra: [
      [CYLINDER, [0, 1.0, -1.08], [0.36, 0.42, 0.36], RED, [HALF, 0, 0]],
      [CYLINDER, [0, 1.0, -0.86], [0.38, 0.03, 0.38], 0xf3e6c4, [HALF, 0, 0]],
      [CYLINDER, [0, 1.0, -1.3], [0.38, 0.03, 0.38], 0xf3e6c4, [HALF, 0, 0]],
      [TORUS, [0, 1.0, -0.9], [0.37, 0.37, 0.2], GOLD],
      [TORUS, [0, 1.0, -1.26], [0.37, 0.37, 0.2], GOLD],
      [CYLINDER, [0.44, 1.38, -1.08], [0.03, 0.6, 0.03], 0x8a5a2b, [0.3, 0, -0.3]],
      [SPHERE, [0.53, 1.66, -1.0], 0.07, RED],
      [CYLINDER, [-0.44, 1.38, -1.08], [0.03, 0.6, 0.03], 0x8a5a2b, [0.3, 0, 0.3]],
      [SPHERE, [-0.53, 1.66, -1.0], 0.07, RED],
    ],
  }),
  // A giant panda with a red scarf and a bamboo bumper.
  panda: () => ({
    body: [
      ...torso(WHITE, 0x4f9d3a),
      ...arms(DARK),
      [SPHERE, [0, 1.2, -0.24], [0.3, 0.1, 0.28], RED],
      [BOX, [0.12, 1.02, 0.02], [0.14, 0.34, 0.05], RED, [0, 0, -0.2]],
    ],
    head: [
      [SPHERE, [0, 1.6, -0.24], [0.5, 0.46, 0.46], WHITE],
      [SPHERE, [0.38, 2.0, -0.28], [0.17, 0.17, 0.1], DARK],
      [SPHERE, [-0.38, 2.0, -0.28], [0.17, 0.17, 0.1], DARK],
      [SPHERE, [0.2, 1.64, 0.14], [0.15, 0.18, 0.1], DARK, [0, 0, 0.5]],
      [SPHERE, [-0.2, 1.64, 0.14], [0.15, 0.18, 0.1], DARK, [0, 0, -0.5]],
      [SPHERE, [0.2, 1.65, 0.22], 0.05, WHITE],
      [SPHERE, [-0.2, 1.65, 0.22], 0.05, WHITE],
      [SPHERE, [0.2, 1.65, 0.26], 0.025, DARK],
      [SPHERE, [-0.2, 1.65, 0.26], 0.025, DARK],
      [SPHERE, [0, 1.47, 0.16], [0.16, 0.11, 0.1], 0xfffdf4],
      [SPHERE, [0, 1.51, 0.25], [0.07, 0.05, 0.05], DARK],
      [SPHERE, [0.33, 1.47, 0.08], 0.07, [1, 0.72, 0.75]],
      [SPHERE, [-0.33, 1.47, 0.08], 0.07, [1, 0.72, 0.75]],
    ],
    extra: [
      [CYLINDER, [0, 0.42, 1.7], [0.09, 1.5, 0.09], 0x6fae4a, [0, 0, HALF]],
      ...[-0.5, 0, 0.5].map((x) => [CYLINDER, [x, 0.42, 1.7], [0.1, 0.04, 0.1], 0x4f8f38, [0, 0, HALF]]),
      [CYLINDER, [0.5, 1.5, -1.05], [0.06, 1.8, 0.06], 0x6fae4a, [0, 0, -0.12]],
      [CYLINDER, [-0.5, 1.3, -1.05], [0.06, 1.4, 0.06], 0x6fae4a, [0, 0, 0.12]],
      [CYLINDER, [0.56, 1.5, -1.05], [0.07, 0.04, 0.07], 0x4f8f38, [0, 0, -0.12]],
      [SPHERE, [0.75, 2.3, -1.05], [0.4, 0.07, 0.14], 0x4f9440, [0, 0, 0.5]],
      [SPHERE, [0.35, 2.2, -1.05], [0.36, 0.07, 0.14], 0x5aa04a, [0, 0, -0.6]],
      [SPHERE, [-0.72, 1.95, -1.05], [0.36, 0.07, 0.14], 0x4f9440, [0, 0, -0.5]],
      [SPHERE, [-0.34, 1.9, -1.05], [0.3, 0.07, 0.14], 0x5aa04a, [0, 0, 0.6]],
    ],
  }),
  // The Monkey King: golden circlet, two long pheasant feathers, a tiger-skin kilt and a staff.
  monkey: () => ({
    body: [
      ...torso(0xf2a81d, RED, RED),
      ...arms(0xf2a81d, 0x8a5a2b, RED),
      ...[-0.2, 0.05, 0.25].map((x) => [SPHERE, [x, 0.66, 0.1], [0.07, 0.05, 0.04], 0x5a3a1a]),
    ],
    head: [
      [SPHERE, [0, 1.58, -0.24], [0.46, 0.44, 0.44], 0x8a5a2b],
      // The heart-shaped face.
      [SPHERE, [0.11, 1.6, 0.03], [0.22, 0.24, 0.22], 0xf2c9a0],
      [SPHERE, [-0.11, 1.6, 0.03], [0.22, 0.24, 0.22], 0xf2c9a0],
      [SPHERE, [0, 1.44, 0.08], [0.24, 0.18, 0.22], 0xf2c9a0],
      [SPHERE, [0, 1.42, 0.27], [0.05, 0.03, 0.03], 0x8a5a2b],
      [SPHERE, [0.44, 1.6, -0.24], [0.1, 0.15, 0.12], 0xf2c9a0],
      [SPHERE, [-0.44, 1.6, -0.24], [0.1, 0.15, 0.12], 0xf2c9a0],
      [TORUS, [0, 1.84, -0.22], [0.36, 0.36, 0.36], GOLD, [HALF, 0, 0]],
      [SPHERE, [0, 1.86, 0.12], [0.09, 0.07, 0.05], RED],
      [CONE, [0.14, 2.6, -0.62], [0.045, 1.7, 0.045], RED, [-0.5, 0, -0.14]],
      [CONE, [-0.14, 2.6, -0.62], [0.045, 1.7, 0.045], RED, [-0.5, 0, 0.14]],
      [SPHERE, [0.14, 1.98, -0.3], 0.08, GOLD],
      [SPHERE, [-0.14, 1.98, -0.3], 0.08, GOLD],
      ...eyes(1.64, 0.2, 0.12, 0.08, 0x8a2a10),
    ],
    extra: [
      [CYLINDER, [0, 1.1, -1.12], [0.07, 2.5, 0.07], RED, [0, 0, HALF - 0.25]],
      [CYLINDER, [1.12, 1.39, -1.12], [0.09, 0.3, 0.09], GOLD, [0, 0, HALF - 0.25]],
      [CYLINDER, [-1.12, 0.81, -1.12], [0.09, 0.3, 0.09], GOLD, [0, 0, HALF - 0.25]],
      // Little clouds along the pods.
      ...[-1, 1].flatMap((side) => [
        [SPHERE, [side * 0.88, 0.5, 0.3], [0.1, 0.14, 0.2], WHITE],
        [SPHERE, [side * 0.88, 0.56, 0.08], [0.1, 0.17, 0.2], WHITE],
        [SPHERE, [side * 0.88, 0.5, -0.14], [0.1, 0.13, 0.18], WHITE],
      ]),
    ],
  }),
  // The Jade Rabbit in a moon-palace robe, with a crescent moon behind the seat.
  rabbit: () => ({
    body: [...torso(0xb9a4e8, WHITE, WHITE), ...arms(0xb9a4e8, WHITE, WHITE), [SPHERE, [0, 1.0, 0.03], 0.07, [1.2, 1.05, 0.5]]],
    head: [
      [SPHERE, [0, 1.56, -0.24], [0.44, 0.42, 0.42], WHITE],
      [SPHERE, [0.17, 2.28, -0.3], [0.1, 0.5, 0.08], WHITE, [-0.12, 0, -0.14]],
      [SPHERE, [-0.17, 2.28, -0.3], [0.1, 0.5, 0.08], WHITE, [-0.12, 0, 0.14]],
      [SPHERE, [0.17, 2.28, -0.25], [0.055, 0.4, 0.05], 0xf7a8c4, [-0.12, 0, -0.14]],
      [SPHERE, [-0.17, 2.28, -0.25], [0.055, 0.4, 0.05], 0xf7a8c4, [-0.12, 0, 0.14]],
      [SPHERE, [0, 1.5, 0.16], [0.06, 0.045, 0.05], 0xf06292],
      [SPHERE, [0.07, 1.43, 0.14], [0.09, 0.07, 0.07], WHITE],
      [SPHERE, [-0.07, 1.43, 0.14], [0.09, 0.07, 0.07], WHITE],
      [SPHERE, [0.26, 1.46, 0.06], [0.1, 0.07, 0.06], 0xf7c1d2],
      [SPHERE, [-0.26, 1.46, 0.06], [0.1, 0.07, 0.06], 0xf7c1d2],
      // A flower tucked by one ear.
      ...[0, 1, 2, 3, 4].map((k) => [
        SPHERE,
        [0.36 + Math.cos(k * 1.257) * 0.07, 1.9 + Math.sin(k * 1.257) * 0.07, -0.06],
        0.05,
        0xf59ab8,
      ]),
      [SPHERE, [0.36, 1.9, -0.03], 0.04, GOLD],
      ...eyes(1.62, 0.13, 0.16, 0.085, 0xc62828),
    ],
    extra: [
      [TORUS, [0.12, 1.55, -1.1], [0.52, 0.52, 0.3], [1.3, 1.1, 0.5]],
      [SPHERE, [0.36, 1.55, -1.1], [0.5, 0.56, 0.3], 0x55565c],
      [SPHERE, [-0.6, 2.1, -1.1], 0.09, [1.3, 1.1, 0.5]],
      [SPHERE, [0.75, 2.2, -1.1], 0.07, [1.3, 1.1, 0.5]],
      [SPHERE, [0.82, 1.2, -1.1], 0.06, [1.3, 1.1, 0.5]],
      [CYLINDER, [0, 0.9, -1.1], [0.04, 0.7, 0.04], STEEL],
    ],
  }),
  // The Azure Dragon: long snout, gold antlers, whiskers, a pearl and a row of spines down the kart.
  dragon: () => ({
    body: [
      ...torso(0x0f8f8a, GOLD),
      ...arms(0x0f8f8a, 0xf2c94c),
      [SPHERE, [0, 0.9, -0.02], [0.26, 0.38, 0.12], 0xf2e2a0],
      ...[0, 1, 2].map((k) => [BOX, [0, 1.04 - k * 0.14, 0.09], [0.3, 0.02, 0.03], 0xd9c070]),
    ],
    head: [
      [SPHERE, [0, 1.6, -0.26], [0.44, 0.42, 0.46], 0x0f8f8a],
      [SPHERE, [0, 1.5, 0.16], [0.3, 0.22, 0.42], 0x16a39d],
      [SPHERE, [0, 1.42, 0.2], [0.26, 0.1, 0.36], 0xf2e2a0],
      [SPHERE, [0.12, 1.58, 0.52], 0.05, DARK],
      [SPHERE, [-0.12, 1.58, 0.52], 0.05, DARK],
      [CONE, [0.24, 2.18, -0.42], [0.06, 0.6, 0.06], GOLD, [-0.5, 0, -0.35]],
      [CONE, [-0.24, 2.18, -0.42], [0.06, 0.6, 0.06], GOLD, [-0.5, 0, 0.35]],
      [CONE, [0.4, 2.0, -0.5], [0.045, 0.3, 0.045], GOLD, [-0.3, 0, -0.9]],
      [CONE, [-0.4, 2.0, -0.5], [0.045, 0.3, 0.045], GOLD, [-0.3, 0, 0.9]],
      [CYLINDER, [0.4, 1.42, 0.5], [0.015, 0.6, 0.015], GOLD, [0.5, 0, -1.2]],
      [CYLINDER, [-0.4, 1.42, 0.5], [0.015, 0.6, 0.015], GOLD, [0.5, 0, 1.2]],
      [SPHERE, [0.46, 1.62, -0.3], [0.06, 0.2, 0.16], 0x16a39d],
      [SPHERE, [-0.46, 1.62, -0.3], [0.06, 0.2, 0.16], 0x16a39d],
      [SPHERE, [0, 1.3, 0.2], [0.1, 0.12, 0.08], WHITE],
      ...[0, 1, 2].map((k) => [CONE, [0, 2.02 - k * 0.16, -0.5 - k * 0.1], [0.07, 0.24, 0.12], GOLD, [-0.7, 0, 0]]),
      ...eyes(1.72, 0.1, 0.2, 0.09, 0xb8860b),
    ],
    extra: [
      ...[0, 1, 2, 3, 4].map((k) => [
        CONE,
        [0, 1.42 - k * 0.11, -0.74 - k * 0.19],
        [0.1, 0.4 - k * 0.04, 0.16],
        GOLD,
        [-0.5, 0, 0],
      ]),
      [SPHERE, [0.72, 0.62, 0.2], [0.12, 0.1, 0.5], 0xf2c94c],
      [SPHERE, [-0.72, 0.62, 0.2], [0.12, 0.1, 0.5], 0xf2c94c],
      // The pearl every dragon chases, on the nose of the kart.
      [SPHERE, [0, 0.78, 1.3], 0.13, [1.5, 1.4, 1.2]],
      [CYLINDER, [0, 0.66, 1.3], [0.03, 0.14, 0.03], GOLD],
    ],
  }),
  // A terracotta soldier in plate armour, under the canopy of a bronze chariot.
  warrior: () => ({
    body: [
      ...torso(0xa87650, 0x8c5f3e, 0x8c5f3e),
      ...arms(0xa87650),
      ...[0, 1, 2].flatMap((row) =>
        [-1, 0, 1].map((col) => [BOX, [col * 0.22, 1.08 - row * 0.2, 0.02], [0.19, 0.17, 0.06], 0x8c5f3e]),
      ),
      ...[0, 1, 2].flatMap((row) => [-1, 0, 1].map((col) => [SPHERE, [col * 0.22, 1.08 - row * 0.2, 0.06], 0.025, 0x6f4a30])),
      [SPHERE, [0.42, 1.16, -0.22], [0.16, 0.1, 0.18], 0x8c5f3e],
      [SPHERE, [-0.42, 1.16, -0.22], [0.16, 0.1, 0.18], 0x8c5f3e],
    ],
    head: [
      [SPHERE, [0, 1.58, -0.26], [0.4, 0.44, 0.4], 0xb98560],
      [SPHERE, [-0.12, 2.06, -0.36], [0.16, 0.2, 0.16], 0x8c5f3e],
      [BOX, [0, 1.96, -0.28], [0.5, 0.08, 0.34], 0x8c5f3e],
      [BOX, [-0.12, 1.92, -0.36], [0.26, 0.05, 0.05], 0x6f4a30],
      [SPHERE, [0, 1.46, 0.1], [0.2, 0.035, 0.06], 0x6f4a30],
      [SPHERE, [0, 1.36, 0.1], [0.07, 0.09, 0.05], 0x6f4a30],
      [SPHERE, [0, 1.56, 0.12], [0.06, 0.09, 0.06], 0xa87650],
      [SPHERE, [0.4, 1.58, -0.26], [0.06, 0.12, 0.08], 0xa87650],
      [SPHERE, [-0.4, 1.58, -0.26], [0.06, 0.12, 0.08], 0xa87650],
      [BOX, [0.15, 1.77, 0.08], [0.16, 0.03, 0.04], 0x6f4a30, [0, 0, 0.15]],
      [BOX, [-0.15, 1.77, 0.08], [0.16, 0.03, 0.04], 0x6f4a30, [0, 0, -0.15]],
      ...eyes(1.66, 0.09, 0.15, 0.065, 0x4a3020),
    ],
    extra: [
      [CYLINDER, [0, 1.75, -1.02], [0.045, 2.0, 0.045], 0x4f7a6a],
      [CONE, [0, 2.86, -1.02], [1.05, 0.3, 1.05], 0x4f7a6a],
      [CYLINDER, [0, 2.7, -1.02], [1.07, 0.04, 1.07], 0x6fa08c],
      [SPHERE, [0, 3.04, -1.02], 0.07, 0x6fa08c],
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => [
        SPHERE,
        [Math.cos(k * 0.785) * 1.02, 2.62, -1.02 + Math.sin(k * 0.785) * 1.02],
        0.05,
        GOLD,
      ]),
      // Bronze rings on the chariot's sides.
      [TORUS, [0.86, 0.5, -0.1], [0.16, 0.16, 0.16], 0x4f7a6a, [0, HALF, 0]],
      [TORUS, [-0.86, 0.5, -0.1], [0.16, 0.16, 0.16], 0x4f7a6a, [0, HALF, 0]],
    ],
  }),
  // A Peking opera warrior: painted face, pom-pom crown, a beard and four flags on the back.
  opera: () => ({
    body: [
      ...torso(0x1f3fa8, GOLD, WHITE),
      ...arms(0x1f3fa8, WHITE, GOLD),
      [SPHERE, [0, 0.98, 0.03], [0.2, 0.2, 0.06], GOLD],
      [SPHERE, [0, 0.98, 0.07], [0.12, 0.12, 0.04], RED],
    ],
    head: [
      [SPHERE, [0, 1.58, -0.24], [0.42, 0.44, 0.42], WHITE],
      [SPHERE, [0, 1.7, -0.3], [0.44, 0.38, 0.42], DARK],
      [SPHERE, [0.17, 1.66, 0.1], [0.14, 0.09, 0.07], DARK, [0, 0, 0.5]],
      [SPHERE, [-0.17, 1.66, 0.1], [0.14, 0.09, 0.07], DARK, [0, 0, -0.5]],
      [SPHERE, [0, 1.78, 0.08], [0.07, 0.14, 0.06], RED],
      [SPHERE, [0.26, 1.48, 0.02], [0.1, 0.1, 0.06], RED],
      [SPHERE, [-0.26, 1.48, 0.02], [0.1, 0.1, 0.06], RED],
      [SPHERE, [0, 1.4, 0.12], [0.1, 0.03, 0.05], RED],
      [SPHERE, [0.17, 1.66, 0.17], 0.04, WHITE],
      [SPHERE, [-0.17, 1.66, 0.17], 0.04, WHITE],
      [SPHERE, [0.17, 1.66, 0.2], 0.02, DARK],
      [SPHERE, [-0.17, 1.66, 0.2], 0.02, DARK],
      // The long black stage beard.
      [BOX, [0, 1.2, 0.14], [0.34, 0.34, 0.05], DARK],
      [BOX, [0, 1.0, 0.16], [0.24, 0.16, 0.04], DARK],
      [BOX, [0, 2.0, -0.14], [0.7, 0.18, 0.12], GOLD],
      ...[-0.3, -0.1, 0.1, 0.3].map((x) => [SPHERE, [x, 2.16, -0.12], 0.09, RED]),
      ...[-0.2, 0, 0.2].map((x) => [SPHERE, [x, 2.02, -0.06], 0.05, [0.4, 0.9, 1]]),
      [SPHERE, [0, 2.3, -0.16], 0.13, [1.3, 0.9, 0.2]],
      [SPHERE, [0.46, 1.9, -0.2], 0.1, RED],
      [SPHERE, [-0.46, 1.9, -0.2], 0.1, RED],
    ],
    extra: [-0.6, -0.22, 0.22, 0.6].flatMap((x) => [
      [CYLINDER, [x, 1.9, -0.86], [0.03, 1.5, 0.03], 0x3a2a20, [-0.25, 0, -x * 0.5]],
      [BOX, [x * 1.38, 2.42, -1.0], [0.42, 0.56, 0.03], Math.abs(x) > 0.4 ? 0x1f3fa8 : WHITE, [-0.25, 0, -x * 0.5]],
      [BOX, [x * 1.38, 2.42, -1.0], [0.16, 0.56, 0.04], GOLD, [-0.25, 0, -x * 0.5]],
      [SPHERE, [x * 1.55, 2.7, -1.07], 0.05, GOLD],
    ]),
  }),
  // A child in a tiger-head hat and a red jacket; the kart wears stripes and a tail.
  tiger: () => ({
    body: [
      ...torso(RED, GOLD, GOLD),
      ...arms(RED, SKIN, GOLD),
      ...[0, 1, 2].map((k) => [SPHERE, [0, 1.1 - k * 0.13, 0.05], 0.035, GOLD]),
    ],
    head: [
      [SPHERE, [0, 1.56, -0.24], [0.42, 0.42, 0.4], SKIN],
      [SPHERE, [0.24, 1.48, 0.06], [0.09, 0.07, 0.05], 0xf79a9a],
      [SPHERE, [-0.24, 1.48, 0.06], [0.09, 0.07, 0.05], 0xf79a9a],
      [SPHERE, [0, 1.43, 0.13], [0.07, 0.03, 0.03], 0xd85a5a],
      [SPHERE, [0, 1.52, 0.15], 0.035, 0xf2bd92],
      ...eyes(1.6, 0.12, 0.15, 0.075),
      [SPHERE, [0, 1.78, -0.3], [0.48, 0.36, 0.46], 0xf07a1a],
      [SPHERE, [0, 1.74, -0.6], [0.4, 0.4, 0.2], 0xf07a1a],
      [SPHERE, [0.32, 2.12, -0.3], [0.15, 0.15, 0.09], 0xf07a1a],
      [SPHERE, [-0.32, 2.12, -0.3], [0.15, 0.15, 0.09], 0xf07a1a],
      [SPHERE, [0.32, 2.12, -0.25], [0.08, 0.08, 0.06], 0xffe08a],
      [SPHERE, [-0.32, 2.12, -0.25], [0.08, 0.08, 0.06], 0xffe08a],
      // The 王 mark, the hat's own eyes, whiskers and a fur trim.
      ...[0, 1, 2].map((k) => [BOX, [0, 2.03 - k * 0.07, 0.07 + k * 0.035], [0.2 - (k === 1 ? 0.06 : 0), 0.03, 0.03], DARK]),
      [BOX, [0, 1.96, 0.1], [0.03, 0.17, 0.03], DARK],
      [SPHERE, [0.2, 1.9, 0.08], 0.07, WHITE],
      [SPHERE, [-0.2, 1.9, 0.08], 0.07, WHITE],
      [SPHERE, [0.2, 1.9, 0.13], 0.035, DARK],
      [SPHERE, [-0.2, 1.9, 0.13], 0.035, DARK],
      ...[-0.36, -0.18, 0, 0.18, 0.36].map((x) => [SPHERE, [x, 1.76, 0.12 - Math.abs(x) * 0.3], 0.07, WHITE]),
      ...[-0.3, 0.3].map((x) => [BOX, [x, 1.84, -0.62], [0.12, 0.03, 0.03], DARK]),
    ],
    extra: [
      ...[0, 1, 2].map((k) => [BOX, [0, 0.61, 0.6 + k * 0.28], [0.72, 0.03, 0.09], DARK]),
      [CYLINDER, [0, 0.95, -1.36], [0.09, 0.8, 0.09], 0xf07a1a, [-0.5, 0, 0]],
      [CYLINDER, [0, 1.55, -1.62], [0.09, 0.6, 0.09], 0xf07a1a, [0.25, 0, 0]],
      [CYLINDER, [0, 1.3, -1.56], [0.095, 0.08, 0.095], DARK, [0.25, 0, 0]],
      [CYLINDER, [0, 1.62, -1.64], [0.095, 0.08, 0.095], DARK, [0.25, 0, 0]],
      [SPHERE, [0, 1.88, -1.54], 0.12, DARK],
      // A pinwheel on the nose.
      [CYLINDER, [0, 0.82, 1.2], [0.02, 0.4, 0.02], 0x8a5a2b],
      ...[0, 1, 2, 3].map((k) => [
        BOX,
        [Math.cos(k * HALF) * 0.1, 1.02 + Math.sin(k * HALF) * 0.1, 1.22],
        [0.16, 0.08, 0.02],
        [RED, GOLD, 0x2e8b57, 0x1f6f8a][k],
        [0, 0, k * HALF + 0.6],
      ]),
    ],
  }),
};

/** A tyre with rounded shoulders on a gold five-spoke rim; `radius` and `width` in metres. */
function wheelShape(radius, width) {
  // Half the tyre's outline from the inner bead to the tread, spun about the axle.
  const w = width / 2,
    profile = [
      [radius * 0.56, -w],
      [radius * 0.86, -w],
      [radius * 0.97, -w * 0.72],
      [radius, 0],
      [radius * 0.97, w * 0.72],
      [radius * 0.86, w],
      [radius * 0.56, w],
    ];
  const tyre = createLatheGeometry3D(profile, { segments: 20 });
  const parts = [
    [tyre, [0, 0, 0], [1, 1, 1], 0x17171b, [0, 0, HALF]],
    [CYLINDER, [0, 0, 0], [radius * 0.58, width * 0.7, radius * 0.58], GOLD, [0, 0, HALF]],
    [CYLINDER, [0, 0, 0], [radius * 0.24, width * 1.04, radius * 0.24], RED, [0, 0, HALF]],
  ];
  for (let k = 0; k < 5; k++)
    parts.push([BOX, [0, 0, 0], [width * 0.86, radius * 1.08, radius * 0.16], 0xd9a520, [(k * Math.PI) / 5, 0, 0]]);
  // Tread blocks, so the spin shows.
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    parts.push([BOX, [0, Math.cos(a) * radius, Math.sin(a) * radius], [width * 0.9, 0.03, radius * 0.24], 0x2a2a30, [a, 0, 0]]);
  }
  return build(parts);
}
const FRONT_WHEEL = wheelShape(0.31, 0.26),
  REAR_WHEEL = wheelShape(0.39, 0.36);
const WHEEL_PLACES = [
  [0.76, 0.31, 0.92],
  [-0.76, 0.31, 0.92],
  [0.82, 0.39, -0.86],
  [-0.82, 0.39, -0.86],
];

// Finishes shared by every kart.
const paintMaterial = createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 0.3, metallic: 0.2 });
paintMaterial.clearcoat = 1;
paintMaterial.clearcoatRoughness = 0.06;
const metalMaterial = createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 0.28, metallic: 0.9 });
const darkMaterial = createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 0.85 });
const clothMaterial = createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 0.62 });
clothMaterial.sheen = 0.5;
clothMaterial.sheenRoughness = 0.5;
const wheelMaterial = createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 0.5, metallic: 0.35 });
const lampMaterial = createUnlitMaterial3D({ color: [2.6, 2.3, 1.7] });
const LAMPS = build([
  [BALL, [0.3, 0.47, 1.56], [0.09, 0.09, 0.05], WHITE],
  [BALL, [-0.3, 0.47, 1.56], [0.09, 0.09, 0.05], WHITE],
]);
const TAIL_LAMPS = build([
  [BOX, [0.42, 0.6, -1.36], [0.16, 0.08, 0.04], WHITE],
  [BOX, [-0.42, 0.6, -1.36], [0.16, 0.08, 0.04], WHITE],
]);
// The badge: on the cowl, on the number plate and on both pods.
const BADGES = quads([
  [
    [0, 0.775, 0.5],
    [-0.2, 0, 0],
    [0, 0.03, 0.2],
  ],
  [
    [0, 0.56, -1.35],
    [-0.19, 0, 0],
    [0, 0.19, 0],
  ],
  [
    [0.865, 0.42, -0.1],
    [0, 0, -0.17],
    [0, 0.17, 0],
  ],
  [
    [-0.865, 0.42, -0.1],
    [0, 0, 0.17],
    [0, 0.17, 0],
  ],
]);
const DOME = createSphereGeometry3D({ radius: 1, widthSegments: 24, heightSegments: 14 });
const JADE_RING = createTorusGeometry3D({ radius: 1, tube: 0.06, radialSegments: 8, tubularSegments: 40 });
const CLOUD = build([
  [SPHERE, [0, 0, 0], [1.5, 0.5, 1.9], WHITE],
  [SPHERE, [1.0, 0.1, 0.7], [0.8, 0.45, 0.9], WHITE],
  [SPHERE, [-1.0, 0.1, 0.5], [0.85, 0.5, 1], WHITE],
  [SPHERE, [0.7, 0.12, -1.1], [0.8, 0.45, 0.8], WHITE],
  [SPHERE, [-0.6, 0.1, -1.3], [0.9, 0.5, 0.8], WHITE],
  [SPHERE, [0, 0.2, 1.7], [0.7, 0.4, 0.6], WHITE],
  // The curl at the back of a painted cloud.
  [TORUS, [0, 0.25, -2.0], [0.4, 0.4, 0.5], 0xf2c230, [0, HALF, 0]],
]);
const cloudMaterial = createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 0.9 });
cloudMaterial.setEmissive([1, 1, 1]);
cloudMaterial.emissiveIntensity = 0.35;

const cache = new Map();
/** The geometry and badge texture of one racer, built on first use. */
function parts(racer) {
  if (!cache.has(racer.id)) {
    const kart = chassis(racer.body, racer.trim),
      driver = DRIVERS[racer.id]();
    const css = (hex) => '#' + hex.toString(16).padStart(6, '0');
    const badge = createStandardMaterial3D({
      color: 0xffffff,
      roughness: 0.35,
      alphaMode: 'mask',
      alphaCutoff: 0.5,
      map: canvasTexture(128, 128, (c) => {
        // A round seal: gold rim, a dark ground in the kart's colour, and the character.
        c.beginPath();
        c.arc(64, 64, 62, 0, Math.PI * 2);
        c.fillStyle = '#f2c230';
        c.fill();
        c.beginPath();
        c.arc(64, 64, 52, 0, Math.PI * 2);
        c.fillStyle = css(shade(racer.body, 0.55));
        c.fill();
        c.fillStyle = '#fff6d8';
        c.font = '900 76px "Noto Serif SC", "Songti SC", "SimSun", serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(racer.seal, 64, 69);
      }),
    });
    // Drawn just in front of the panel it sits on.
    badge.polygonOffset = [-1, -1];
    cache.set(racer.id, {
      paint: build(kart.paint),
      metal: build(kart.metal),
      dark: build(kart.dark),
      body: build([...driver.body, ...driver.extra]),
      // The head is stored relative to the neck so it can turn there.
      head: build(
        driver.head.map(([geometry, at, ...rest]) => [geometry, [at[0] - NECK[0], at[1] - NECK[1], at[2] - NECK[2]], ...rest]),
      ),
      badge,
    });
  }
  return cache.get(racer.id);
}

/**
 * A racer's kart. `node` goes in the scene; `pose(kart, dt, time)` moves it
 * to match a kart from the rules, and `still()` parks it for a portrait.
 */
export function createKartModel(racerIndex) {
  const shapes = parts(RACERS[racerIndex]);
  const node = new Object3D(),
    lean = new Object3D(),
    neck = new Object3D();
  node.addChild(lean);
  const layer = (geometry, material, parent = lean, shadow = true) => {
    const mesh = new Mesh3D(geometry, material);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    parent.addChild(mesh);
    return mesh;
  };
  const shell = [
    layer(shapes.paint, paintMaterial),
    layer(shapes.metal, metalMaterial),
    layer(shapes.dark, darkMaterial),
    layer(shapes.body, clothMaterial),
  ];
  shell.push(layer(BADGES, shapes.badge, lean, false), layer(LAMPS, lampMaterial, lean, false));
  // Tail lamps brighten under braking, so each kart has its own.
  const tail = layer(TAIL_LAMPS, createUnlitMaterial3D({ color: [0.9, 0.05, 0.03] }), lean, false);
  shell.push(tail);
  neck.setPosition(NECK[0], NECK[1], NECK[2]);
  lean.addChild(neck);
  shell.push(layer(shapes.head, clothMaterial, neck));
  const wheels = WHEEL_PLACES.map(([x, y, z], index) => {
    const wheel = layer(index < 2 ? FRONT_WHEEL : REAR_WHEEL, wheelMaterial);
    wheel.setPosition(x, y, z);
    return wheel;
  });

  // The golden bell: a see-through dome shown while the item is active.
  const dome = new Mesh3D(DOME, createGlassMaterial3D({ color: 0xffd76a, roughness: 0.1, opacity: 0.4 }));
  dome.material.setEmissive([1, 0.75, 0.2]);
  dome.material.emissiveIntensity = 0.6;
  dome.castShadow = false;
  dome.visible = false;
  dome.setPosition(0, 1.1, -0.1);
  dome.setScale(1.9, 1.75, 2.3);
  node.addChild(dome);
  // The jade charm: two green rings circling the kart until it takes a blow.
  const jade = [0, 1].map((k) => {
    const ring = new Mesh3D(
      JADE_RING,
      createStandardMaterial3D({ color: 0x35c98a, roughness: 0.15, metallic: 0.1, emissive: 0x1f9a6a, emissiveIntensity: 1.2 }),
    );
    ring.castShadow = false;
    ring.visible = false;
    ring.setPosition(0, 1.0, -0.1);
    ring.setScale(1.75 + k * 0.2);
    node.addChild(ring);
    return ring;
  });
  // The somersault cloud under the wheels.
  const cloud = new Mesh3D(CLOUD, cloudMaterial);
  cloud.castShadow = false;
  cloud.visible = false;
  node.addChild(cloud);

  const model = { node, roll: 0, size: 1, yaw: 0, tip: 0, lift: 0 };
  // Springs for the squash on landing and the nod of the head.
  let spin = 0,
    squash = 0,
    squashSpeed = 0,
    nod = 0,
    look = 0,
    wasAirborne = false,
    lastSpeed = 0,
    trick = 0;

  model.pose = (kart, dt, time) => {
    const ease = Math.min(1, dt * 10);
    // Shrunk by the thunder drum.
    model.size += ((kart.shrink > 0 ? 0.6 : 1) - model.size) * Math.min(1, dt * 8);
    // The hop that starts a drift, on top of real air time; the cloud carries the kart above the road.
    const hop = kart.hop > 0 ? Math.sin((1 - kart.hop / 0.28) * Math.PI) * 0.42 : 0;
    model.lift += ((kart.cloud > 0 ? 1.1 : 0) - model.lift) * Math.min(1, dt * 6);
    node.setPosition(kart.x, kart.y + hop + model.lift, kart.z);
    node.setScale(model.size);

    // Turn into a drift, and spin or tumble when hit.
    let yaw = kart.drifting ? -kart.driftDir * 0.42 : 0,
      flip = 0;
    if (kart.spin > 0) {
      const done = 1 - kart.spin / kart.spinTotal;
      if (kart.spinKind === 'tumble') {
        flip = done * Math.PI * 2;
        node.setPosition(kart.x, kart.y + Math.sin(done * Math.PI) * 2.4, kart.z);
      } else yaw += done * Math.PI * 4;
    }
    // A trick off a ramp: one full turn in the air.
    if (kart.airborne && kart.trick) trick = Math.min(1, trick + dt * 2.2);
    else trick = 0;
    yaw += trick * Math.PI * 2;
    model.yaw += (yaw - model.yaw) * (kart.spin > 0 || trick > 0 ? 1 : ease);
    node.setRotation(0, kart.heading + model.yaw, 0);

    // Landing squashes the kart on its springs; a boost stretches it.
    if (wasAirborne && !kart.airborne) squashSpeed -= 5.5;
    wasAirborne = kart.airborne;
    squashSpeed += (-squash * 190 - squashSpeed * 13) * dt;
    squash = Math.max(-0.4, Math.min(0.3, squash + squashSpeed * dt));
    const stretch = kart.boost > 0 ? 0.07 : 0;
    lean.setScale(1 - squash * 0.4 - stretch * 0.4, 1 + squash, 1 - squash * 0.3 + stretch);

    // Lean out of corners, nose up under boost, and follow the slope.
    const roll = kart.steer * Math.min(1, Math.abs(kart.speed) / 25) * 0.12 + (kart.drifting ? kart.driftDir * 0.16 : 0);
    model.roll += (roll - model.roll) * ease;
    const tip =
      -Math.atan(kart.slope) -
      (kart.boost > 0 ? 0.1 : 0) +
      (kart.airborne ? -Math.max(-0.35, Math.min(0.35, kart.vy * 0.02)) : 0);
    model.tip += (tip - model.tip) * ease;
    lean.setRotation(model.tip + flip, 0, model.roll);
    // An engine shiver while standing, and a rumble on grass or in mud.
    const rough = kart.grass || kart.mud ? Math.min(1, Math.abs(kart.speed) / 12) * 0.035 : 0;
    lean.setPosition(
      0,
      (Math.abs(kart.speed) < 1 ? Math.sin(time * 38 + kart.index) * 0.012 : 0) + Math.sin(time * 47 + kart.index) * rough,
      0,
    );

    // The driver looks into the corner, nods under braking and acceleration, bobs when
    // celebrating and wobbles when dizzy.
    const gain = dt > 0 ? (kart.speed - lastSpeed) / dt : 0;
    lastSpeed = kart.speed;
    look += (-kart.steer * 0.42 - (kart.drifting ? kart.driftDir * 0.25 : 0) - look) * Math.min(1, dt * 8);
    nod += (Math.max(-0.25, Math.min(0.25, -gain * 0.012)) - nod) * Math.min(1, dt * 6);
    const dizzy = kart.spin > 0 || kart.inked > 0 ? Math.sin(time * 16) * 0.3 : 0,
      cheer = kart.finished ? Math.abs(Math.sin(time * 7)) * 0.1 : 0;
    neck.setRotation(nod + cheer * -1.5, look + dizzy, dizzy * 0.5 - model.roll * 0.6);
    neck.setPosition(NECK[0], NECK[1] + cheer, NECK[2]);

    spin += kart.speed * dt;
    wheels.forEach((wheel, index) => wheel.setRotation(spin / (index < 2 ? 0.31 : 0.39), index < 2 ? -kart.steer * 0.42 : 0, 0));
    tail.material.setColor(
      kart.controls?.brake > 0 || (kart.human && kart.throttle <= 0 && kart.speed > 3) ? [3.2, 0.25, 0.12] : [0.9, 0.05, 0.03],
    );

    dome.visible = kart.bell > 0;
    if (dome.visible) dome.setRotation(0, time * 2.5, 0);
    jade.forEach((ring, k) => {
      ring.visible = kart.jade > 0;
      if (ring.visible) ring.setRotation(Math.sin(time * 1.7 + k * 2) * 0.5 + (k ? 1.2 : 0.3), time * (k ? -2.4 : 2), 0);
    });
    cloud.visible = model.lift > 0.05;
    if (cloud.visible) {
      cloud.setPosition(0, -0.35 - model.lift * 0.25, 0);
      cloud.setScale(0.9 + Math.sin(time * 9) * 0.04);
    }
    // Blink while nothing can hit it after a knock.
    const shown = !(kart.safe > 0 && kart.spin <= 0 && kart.bell <= 0 && kart.cloud <= 0 && Math.floor(time * 14) % 2 === 0);
    for (const mesh of shell) mesh.visible = shown;
  };

  model.still = (x, y, z, heading) => {
    node.setPosition(x, y, z);
    node.setRotation(0, heading, 0);
    node.setScale(1);
    lean.setRotation(0, 0, 0);
    lean.setScale(1);
    neck.setRotation(0, 0, 0);
    dome.visible = cloud.visible = false;
    for (const ring of jade) ring.visible = false;
    for (const mesh of shell) mesh.visible = true;
  };

  return model;
}
