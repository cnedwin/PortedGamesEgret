// Authored first-person weapons and gloves, with a clear reflex optic and
// camera-local sway, recoil, reload, slide and switching animation.
// The procedural shapes supply the explicit original-art comparison mode.
import {
  Mesh3D,
  Object3D,
  createPointLight3D,
  createQuadGeometry3D,
  createSphereGeometry3D,
  createStandardMaterial3D,
  createUnlitMaterial3D,
} from '@egret/engine/world3d';
import { SWITCH_TIME } from './data.mjs';
import { addModel } from './asset-models.mjs';
import { createBuilder, orient, rgb } from './build.mjs';
import { createDetails, flashTexture } from './textures.mjs';

const STEEL = rgb(0x5f6874),
  DARK = rgb(0x3d4046),
  TAN = rgb(0x6f6349),
  SLEEVE = rgb(0xb0b0a0),
  GLOVE = rgb(0x4a4a44);

/**
 * The rig is drawn at this fraction of its real size, this much closer to the
 * eye. Seen from the eye that changes nothing, but the barrel no longer pokes
 * through a wall the operator is standing against.
 */
const RIG_SCALE = 0.42;
const PISTOL_CYCLE = 0.09;

/** Where each weapon sits (x right, y up, z back) from the hip and when aimed, and where its muzzle is. */
const HOLD = {
  rifle: { hip: [0.17, -0.19, -0.52], aim: [0, -0.0835, -0.43], muzzle: [0, 0.02, -0.62] },
  marksman: { hip: [0.17, -0.2, -0.5], aim: [0, -0.1, -0.24], muzzle: [0, 0.02, -0.82] },
  pistol: { hip: [0.15, -0.17, -0.6], aim: [0, -0.058, -0.5], muzzle: [0, 0.03, -0.14] },
};
// Barrel tips in the model's own coordinates. The world tracer uses the separate eye offset above.
const BARREL_TIP = { rifle: [0, 0.006, -0.746], marksman: [0, 0.006, -0.9], pistol: [0, 0.03, -0.136] };
// Measured source coordinates keep sights, grips and flashes aligned through one uniform model transform.
const ART_LANDMARKS = {
  rifle: {
    bounds: [-0.06472777, 0, -0.48957825, 0.06472777, 0.51684570, 0.48957825],
    sight: [0, 0.495, 0.31], muzzle: [0.00068993, 0.35270383, -0.48864385],
    right: [-0.00190891, 0.17792905, 0.26791168], left: [-0.02269963, 0.24919644, -0.09545191],
  },
  pistol: {
    bounds: [-0.11030960, 0, -0.49015808, 0.11030960, 0.65371698, 0.49015808],
    sight: [0.00472433, 0.64124757, 0.41111231], muzzle: [0.00472433, 0.50810645, -0.48997500],
    right: [0.09918631, 0.18910825, 0.38833778], left: [-0.13634012, 0.17613043, 0.35286748],
  },
  marksman: {
    bounds: [-0.05277064, 0, -0.49072266, 0.05277064, 0.24578859, 0.49072266],
    muzzle: [-0.00143470, 0.16200539, -0.48741037],
    right: [-0.00249920, 0.04806204, 0.29303962], left: [-0.01953119, 0.08728844, -0.02451190],
  },
};

/** Tile of the fine surface textures on the weapons, in metres. */
const GRAIN = 0.045;
const part = (tint) => ({ tint, tile: GRAIN });

/** An open reflex optic with a clear sight line, rail clamp, chamfered corners and recessed screws. */
function reflexHousing() {
  const shape = createBuilder(), dark = part(rgb(0x343d43)), edge = part(rgb(0x727c82));
  shape.box(0, -0.022, 0, 0.054, 0.008, 0.049, dark);
  shape.box(0, -0.0275, 0, 0.048, 0.003, 0.042, part(rgb(0x20282c)));
  shape.box(0, -0.041, 0, 0.034, 0.026, 0.039, dark);
  shape.box(0, -0.0545, 0, 0.046, 0.003, 0.045, edge);
  for (const sign of [-1, 1]) {
    shape.box(sign * 0.022, -0.002, 0, 0.006, 0.031, 0.032, dark);
    shape.box(sign * 0.0188, 0.0141, 0, 0.0085, 0.005, 0.032, { ...dark, roll: sign * -Math.PI / 4 });
    shape.cylinder(sign * 0.027, -0.022, 0.010, 0.0025, 0.0025, { ...edge, axis: 'x', sides: 12 });
    shape.box(sign * 0.0285, -0.022, 0.010, 0.0003, 0.0007, 0.003, part(rgb(0x161c21)));
    shape.box(sign * 0.022, -0.002, 0.0164, 0.006, 0.024, 0.0008, edge);
  }
  shape.box(0, 0.017, 0, 0.033, 0.0055, 0.032, dark);
  shape.box(0, 0.0197, 0.002, 0.026, 0.001, 0.027, edge);
  shape.cylinder(-0.029, -0.010, -0.003, 0.0055, 0.008, { ...dark, axis: 'x', sides: 20 });
  for (const z of [-0.008, 0.004])
    shape.box(0.0254, -0.009, z, 0.001, 0.0055, 0.004, part(rgb(0x131b1e)));
  return shape.finish({ tangents: true });
}

/** A gloved hand as the operator sees it: a palm, four fingers of two joints and a thumb. `curl` gives each finger's three points. */
function hand(builder, palm, size, fingers, thumb) {
  builder.box(palm[0], palm[1], palm[2], size[0], size[1], size[2], {
    tint: GLOVE,
    tile: GRAIN,
    yaw: palm[3] ?? 0,
    pitch: palm[4] ?? 0,
  });
  for (const [a, b, c] of fingers) {
    builder.limb(a, b, 0.0095, 0.009, { tint: GLOVE, sides: 6 });
    builder.limb(b, c, 0.009, 0.008, { tint: GLOVE, sides: 6 });
    builder.ball(b[0], b[1], b[2], 0.0105, 0.0105, 0.0105, { tint: rgb(0x3a3c40), sides: 6, rings: 4 });
  }
  builder.limb(thumb[0], thumb[1], 0.011, 0.0095, { tint: GLOVE, sides: 6 });
}
/** A sleeve from the wrist back to the elbow, with a cuff and a watch-sized strap. */
function sleeve(builder, wrist, elbow) {
  builder.limb(wrist, elbow, 0.034, 0.05, { tint: SLEEVE, sides: 10 });
  const mid = [0, 1, 2].map((i) => wrist[i] + (elbow[i] - wrist[i]) * 0.06);
  builder.limb(wrist, mid, 0.037, 0.037, { tint: GLOVE, sides: 10 });
}

/** The assault rifle, or with `marksman` its long-barrelled cousin with a telescopic sight. */
function rifleShapes(marksman = false) {
  const body = createBuilder();
  // ---- receivers ------------------------------------------------------------------------
  body.box(0, 0.012, -0.03, 0.04, 0.05, 0.27, part(STEEL));
  body.box(0, -0.028, 0.005, 0.036, 0.04, 0.18, part(DARK));
  body.box(0, -0.036, -0.09, 0.034, 0.03, 0.07, part(DARK)); // magazine well
  body.box(0.0215, 0.012, -0.055, 0.004, 0.022, 0.085, part(rgb(0x55595e))); // ejection port cover
  body.box(0.022, -0.004, 0.03, 0.006, 0.012, 0.03, part(rgb(0x55595e))); // brass deflector
  body.limb([0.021, 0.018, 0.07], [0.03, 0.018, 0.085], 0.006, 0.007, { tint: STEEL, sides: 6 }); // forward assist
  body.box(-0.021, -0.012, 0.028, 0.004, 0.016, 0.01, part(rgb(0x8a2a20))); // selector
  body.box(-0.021, -0.006, -0.03, 0.004, 0.02, 0.028, part(STEEL)); // bolt catch
  for (const z of [0.06, -0.12])
    body.limb([-0.021, -0.022, z], [0.021, -0.022, z], 0.004, 0.004, { tint: rgb(0x16171a), sides: 6 }); // takedown pins
  body.box(0, 0.032, 0.115, 0.03, 0.012, 0.045, part(STEEL)); // charging handle
  // ---- handguard: eight-sided, with slots along the sides and a full rail on top -------
  body.limb([0, 0.004, -0.165], [0, 0.004, -0.47], 0.0295, 0.027, { tint: TAN, sides: 8 });
  for (let i = 0; i < 6; i++)
    for (const side of [-1, 1]) {
      body.box(side * 0.0285, 0.004, -0.2 - i * 0.045, 0.004, 0.009, 0.03, { tint: rgb(0x14161a) });
      body.box(side * 0.02, -0.018, -0.2 - i * 0.045, 0.004, 0.008, 0.03, { tint: rgb(0x14161a), roll: side * 0.78 });
    }
  body.box(0, 0.041, -0.19, 0.022, 0.01, 0.56, part(DARK));
  for (let i = 0; i < 26; i++) body.box(0, 0.0485, 0.085 - i * 0.022, 0.024, 0.005, 0.012, { tint: rgb(0x1a1b1e) });
  body.limb([0, 0.004, -0.165], [0, 0.004, -0.178], 0.033, 0.033, { tint: STEEL, sides: 8 }); // barrel nut
  // ---- barrel, gas block, suppressor -------------------------------------------------------
  body.limb([0, 0.006, -0.47], [0, 0.006, -0.56], 0.0092, 0.0092, { tint: DARK, sides: 8 });
  body.box(0, 0.014, -0.49, 0.022, 0.03, 0.03, part(DARK));
  body.limb([0, 0.006, -0.55], [0, 0.006, -0.74], 0.0185, 0.0185, { tint: rgb(0x33363a), sides: 10 });
  for (const z of [-0.565, -0.59, -0.72])
    body.limb([0, 0.006, z], [0, 0.006, z - 0.008], 0.0198, 0.0198, { tint: rgb(0x1c1d20), sides: 10, caps: false });
  body.limb([0, 0.006, -0.74], [0, 0.006, -0.746], 0.012, 0.012, { tint: rgb(0x0c0c0d), sides: 8 });
  // ---- sight: a holographic unit with a hooded window, and a folded front post ---------
  if (!marksman) {
    body.box(0, 0.056, -0.05, 0.04, 0.012, 0.085, part(DARK));
    body.box(0, 0.07, 0.0, 0.04, 0.02, 0.03, part(DARK)); // battery housing
    for (const side of [-1, 1]) body.box(side * 0.0205, 0.086, -0.05, 0.004, 0.05, 0.05, part(DARK));
    body.box(0, 0.1125, -0.05, 0.045, 0.005, 0.05, part(DARK));
    body.box(0, 0.0635, -0.05, 0.038, 0.004, 0.05, part(DARK));
    for (const side of [-1, 1]) body.box(side * 0.026, 0.064, -0.04, 0.008, 0.012, 0.012, part(STEEL)); // mount levers
  } else {
    // A telescopic sight on two rings: the tube, a flared objective, an eyepiece and two turrets.
    body.box(0, 0.056, -0.05, 0.03, 0.012, 0.2, part(DARK));
    for (const z of [0.02, -0.12]) body.box(0, 0.078, z, 0.012, 0.034, 0.016, part(DARK));
    body.limb([0, 0.1, 0.09], [0, 0.1, -0.2], 0.0165, 0.0165, { tint: DARK, sides: 12 });
    body.limb([0, 0.1, -0.2], [0, 0.1, -0.27], 0.0165, 0.026, { tint: DARK, sides: 12 });
    body.limb([0, 0.1, 0.09], [0, 0.1, 0.13], 0.0165, 0.021, { tint: DARK, sides: 12 });
    body.limb([0, 0.1, -0.05], [0, 0.128, -0.05], 0.011, 0.011, { tint: STEEL, sides: 8 });
    body.limb([0, 0.1, -0.05], [0.03, 0.1, -0.05], 0.011, 0.011, { tint: STEEL, sides: 8 });
    // The lenses: dark glass with a blue-violet coating.
    body.ball(0, 0.1, -0.268, 0.024, 0.024, 0.004, { tint: rgb(0x2a3a6a), sides: 12, rings: 4 });
    body.ball(0, 0.1, 0.128, 0.019, 0.019, 0.004, { tint: rgb(0x1a2030), sides: 12, rings: 4 });
    // A longer, heavier barrel past the handguard.
    body.limb([0, 0.006, -0.74], [0, 0.006, -0.86], 0.011, 0.011, { tint: DARK, sides: 8 });
    body.limb([0, 0.006, -0.84], [0, 0.006, -0.9], 0.016, 0.016, { tint: STEEL, sides: 8 });
  }
  body.box(0, 0.058, -0.44, 0.02, 0.012, 0.034, part(DARK));
  body.box(0, 0.068, -0.452, 0.012, 0.012, 0.006, part(DARK));
  body.box(0, 0.058, 0.09, 0.02, 0.012, 0.03, part(DARK)); // folded rear sight
  // ---- accessories: a light on the right, an aiming module on top, a foregrip below ---
  body.limb([0.047, 0.006, -0.3], [0.047, 0.006, -0.4], 0.013, 0.013, { tint: DARK, sides: 8 });
  body.limb([0.047, 0.006, -0.4], [0.047, 0.006, -0.425], 0.016, 0.016, { tint: STEEL, sides: 8 });
  body.box(0.036, 0.006, -0.33, 0.012, 0.016, 0.03, part(DARK));
  body.box(0, 0.058, -0.36, 0.036, 0.02, 0.07, part(TAN));
  for (const side of [-1, 1])
    body.limb([side * 0.01, 0.058, -0.395], [side * 0.01, 0.058, -0.401], 0.005, 0.005, { tint: rgb(0x0c0c0d), sides: 6 });
  body.limb([0, -0.028, -0.26], [0, -0.1, -0.245], 0.014, 0.0125, { tint: DARK, sides: 8 });
  // ---- stock: a buffer tube and a sliding stock with a cheek rest and butt pad ---------
  body.limb([0, 0.008, 0.1], [0, 0.008, 0.31], 0.0145, 0.0145, { tint: DARK, sides: 8 });
  body.box(0, 0.006, 0.26, 0.036, 0.04, 0.13, part(TAN));
  body.box(0, -0.035, 0.29, 0.03, 0.075, 0.07, part(TAN));
  body.box(0, -0.02, 0.33, 0.04, 0.115, 0.014, part(rgb(0x18191b)));
  body.box(0, -0.012, 0.215, 0.012, 0.02, 0.04, part(DARK)); // adjustment lever
  // ---- grip, with ridges, and the trigger guard --------------------------------------
  body.box(0, -0.078, 0.075, 0.032, 0.1, 0.04, { tint: DARK, tile: GRAIN, pitch: 0.32 });
  for (let i = 0; i < 5; i++)
    body.box(0, -0.05 - i * 0.014, 0.066 + i * 0.0045, 0.034, 0.004, 0.036, { tint: rgb(0x17181a), pitch: 0.32 });
  body.box(0, -0.056, 0.005, 0.01, 0.006, 0.085, part(DARK));
  body.box(0, -0.046, -0.036, 0.01, 0.022, 0.006, part(DARK));
  body.box(0, -0.042, 0.02, 0.006, 0.02, 0.008, { tint: STEEL, pitch: -0.3 }); // trigger

  // A curved magazine with ribs and a floor plate.
  const magazine = createBuilder();
  magazine.box(0, -0.045, 0, 0.026, 0.09, 0.058, { tint: DARK, tile: GRAIN, pitch: -0.12 });
  magazine.box(0, -0.115, -0.014, 0.026, 0.07, 0.056, { tint: DARK, tile: GRAIN, pitch: -0.3 });
  for (let i = 0; i < 4; i++)
    magazine.box(0, -0.03 - i * 0.022, -0.004 - i * 0.003, 0.0285, 0.006, 0.05, { tint: rgb(0x1b1c1f), pitch: -0.12 - i * 0.05 });
  magazine.box(0, -0.152, -0.026, 0.03, 0.01, 0.062, { tint: rgb(0x3a3c40), pitch: -0.3 });

  // The hands: the right on the grip, the left under the handguard.
  const hands = createBuilder();
  const support = createBuilder();
  const palm = [-0.004, -0.04, -0.31], elbow = [-0.17, -0.37, -0.1];
  hand(
    hands,
    [0.012, -0.082, 0.092, 0, 0.32],
    [0.05, 0.085, 0.05],
    [0, 1, 2].map((i) => [
      [0.03, -0.058 - i * 0.02, 0.085 + i * 0.006],
      [0.028, -0.062 - i * 0.02, 0.05 + i * 0.006],
      [0.006, -0.064 - i * 0.02, 0.04 + i * 0.006],
    ]),
    [
      [0.02, -0.04, 0.1],
      [-0.014, -0.022, 0.07],
    ],
  );
  // The trigger finger lies along the receiver.
  hands.limb([0.028, -0.04, 0.085], [0.026, -0.036, 0.03], 0.0095, 0.0085, { tint: GLOVE, sides: 6 });
  sleeve(hands, [0.03, -0.11, 0.12], [0.21, -0.32, 0.42]);
  hand(
    support,
    palm,
    [0.06, 0.03, 0.085],
    [0, 1, 2, 3].map((i) => [
      [-0.03, -0.04, -0.345 + i * 0.022],
      [-0.04, -0.004, -0.345 + i * 0.022],
      [-0.03, 0.026, -0.345 + i * 0.022],
    ]),
    [
      [0.026, -0.036, -0.29],
      [0.036, 0.004, -0.325],
    ],
  );
  sleeve(support, [-0.012, -0.066, -0.28], elbow);
  support.box(-0.03, -0.092, -0.262, 0.05, 0.012, 0.03, { tint: rgb(0x16171a), yaw: 0.5, pitch: -0.9 }); // watch
  return {
    body: body.finish({ tangents: true }),
    magazine: magazine.finish({ tangents: true }),
    hands: hands.finish({ tangents: true }),
    support: support.finish({ tangents: true }),
    palm, elbow,
    magazineAt: [0, -0.035, -0.07],
    magazineGrip: [-0.043, -0.123, -0.014],
  };
}

function pistolShapes() {
  const body = createBuilder();
  const slide = createBuilder();
  // Slide with rear serrations, sights and an ejection port; barrel showing at the muzzle.
  slide.box(0, 0.03, -0.03, 0.028, 0.034, 0.2, part(STEEL));
  for (let i = 0; i < 6; i++) slide.box(0, 0.03, 0.04 + i * 0.007, 0.0295, 0.028, 0.003, { tint: rgb(0x202225) });
  slide.box(0.0145, 0.036, -0.03, 0.002, 0.014, 0.045, { tint: rgb(0x16171a) });
  body.limb([0, 0.03, -0.128], [0, 0.03, -0.136], 0.008, 0.008, { tint: rgb(0x101113), sides: 8 });
  slide.box(0, 0.05, 0.058, 0.022, 0.008, 0.01, part(DARK));
  slide.box(0, 0.05, -0.12, 0.005, 0.008, 0.008, part(DARK));
  for (const side of [-1, 1]) slide.box(side * 0.006, 0.0515, 0.058, 0.003, 0.004, 0.004, { tint: rgb(0xe8e4d8) });
  // Frame with a light rail, trigger guard, trigger and a ridged grip.
  body.box(0, 0.002, -0.02, 0.027, 0.024, 0.165, part(DARK));
  body.box(0, -0.012, -0.085, 0.022, 0.008, 0.05, part(DARK));
  body.box(0, -0.022, -0.02, 0.01, 0.006, 0.06, part(DARK));
  body.box(0, -0.014, -0.048, 0.01, 0.02, 0.006, part(DARK));
  body.box(0, -0.012, -0.01, 0.005, 0.018, 0.007, { tint: STEEL, pitch: -0.25 });
  body.box(0, -0.057, 0.046, 0.029, 0.11, 0.048, { tint: DARK, tile: GRAIN, pitch: 0.2 });
  for (let i = 0; i < 6; i++)
    body.box(0, -0.025 - i * 0.014, 0.04 + i * 0.003, 0.031, 0.004, 0.04, { tint: rgb(0x17181a), pitch: 0.2 });
  body.box(-0.0145, 0.006, 0.02, 0.003, 0.008, 0.02, part(STEEL)); // slide stop
  const magazine = createBuilder()
    .box(0, -0.06, 0, 0.021, 0.11, 0.035, { tint: STEEL, tile: GRAIN, pitch: 0.2 })
    .box(0, -0.118, 0.012, 0.026, 0.01, 0.042, { tint: rgb(0x16171a), pitch: 0.2 });
  // Two hands round the grip.
  const hands = createBuilder();
  const support = createBuilder();
  const palm = [-0.02, -0.064, 0.05], elbow = [-0.19, -0.3, 0.38];
  hand(
    hands,
    [0.014, -0.06, 0.058, 0, 0.2],
    [0.05, 0.09, 0.055],
    [0, 1, 2].map((i) => [
      [0.03, -0.04 - i * 0.02, 0.06 + i * 0.004],
      [0.028, -0.044 - i * 0.02, 0.022 + i * 0.004],
      [0.004, -0.046 - i * 0.02, 0.014 + i * 0.004],
    ]),
    [
      [0.02, -0.01, 0.07],
      [-0.012, 0.004, 0.03],
    ],
  );
  hands.limb([0.028, -0.014, 0.05], [0.024, -0.008, -0.01], 0.0095, 0.0085, { tint: GLOVE, sides: 6 });
  sleeve(hands, [0.03, -0.09, 0.09], [0.2, -0.3, 0.4]);
  hand(
    support,
    [...palm, 0, 0.2],
    [0.045, 0.085, 0.05],
    [0, 1, 2, 3].map((i) => [
      [-0.036, -0.034 - i * 0.019, 0.05 + i * 0.004],
      [-0.03, -0.038 - i * 0.019, 0.012 + i * 0.004],
      [0.0, -0.04 - i * 0.019, 0.006 + i * 0.004],
    ]),
    [
      [-0.03, -0.006, 0.06],
      [-0.018, 0.012, 0.0],
    ],
  );
  sleeve(support, [-0.03, -0.1, 0.085], elbow);
  return {
    body: body.finish({ tangents: true }),
    slide: slide.finish({ tangents: true }),
    magazine: magazine.finish({ tangents: true }),
    hands: hands.finish({ tangents: true }),
    support: support.finish({ tangents: true }),
    palm, elbow,
    magazineAt: [0, -0.005, 0.045],
    magazineGrip: [-0.033, -0.11, 0.007],
  };
}

/** Place the left palm at the magazine and swing the sleeve toward it from the authored elbow. */
function poseSupport(model, reach, magazineTravel) {
  const { support, palm, elbow, arm, magazineAt, magazineGrip } = model;
  if (reach === 0) {
    support.setPosition(...palm);
    support.setQuaternion(0, 0, 0, 1);
    return;
  }
  const x = palm[0] + (magazineAt[0] + magazineGrip[0] - palm[0]) * reach;
  const y = palm[1] + (magazineAt[1] + magazineGrip[1] - magazineTravel - palm[1]) * reach;
  const z = palm[2] + (magazineAt[2] + magazineGrip[2] - palm[2]) * reach;
  support.setPosition(x, y, z);
  const dx = x - elbow[0], dy = y - elbow[1], dz = z - elbow[2], length = Math.hypot(dx, dy, dz);
  support.setQuaternion(
    (arm[1] * dz - arm[2] * dy) / length,
    (arm[2] * dx - arm[0] * dz) / length,
    (arm[0] * dy - arm[1] * dx) / length,
    1 + (arm[0] * dx + arm[1] * dy + arm[2] * dz) / length,
  );
}

/** Add the weapons under `camera` and return the object that animates them. */
export function createGun(camera, art = {}) {
  const details = createDetails();
  // Keep the gun legible in deep shadow without turning the warm sunrise into a gold finish.
  const metal = createStandardMaterial3D({
    color: 0xffffff,
    vertexColors: true,
    map: details.gunmetal.map,
    normalMap: details.gunmetal.normalMap,
    normalScale: 0.46,
    roughness: 0.63,
    metallic: 0.16,
    environmentIntensity: 1.15,
    // A little light of its own, so the weapon keeps its shape in deep shadow.
    emissive: 0x4a5058,
    emissiveIntensity: 0.1,
  });
  const cloth = createStandardMaterial3D({
    color: 0xffffff,
    vertexColors: true,
    map: details.camo.map,
    normalMap: details.camo.normalMap,
    normalScale: 0.62,
    roughness: 0.92,
    environmentIntensity: 1.2,
  });
  const rig = new Object3D();
  rig.setScale(RIG_SCALE);
  camera.addChild(rig);

  const viewPart = (geometry, material, authored, transform) => {
    if (authored) {
      const pivot = new Object3D();
      addModel(pivot, authored, geometry.boundingBox, { transform, shadow: false, cull: false });
      return pivot;
    }
    const mesh = new Mesh3D(geometry, material);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    if (transform) {
      const pivot = new Object3D();
      mesh.setScale(transform.scale).setPosition(...transform.position);
      pivot.addChild(mesh);
      return pivot;
    }
    return mesh;
  };
  const models = {};
  for (const [key, set] of Object.entries({ rifle: rifleShapes(), pistol: pistolShapes(), marksman: rifleShapes(true) })) {
    const model = art['weapon-' + key], held = art['operator-hands']?.parts;
    const parts = model?.parts;
    const bodyArt = parts?.body ?? (parts && !Object.keys(parts).length ? model : undefined);
    const landmarks = ART_LANDMARKS[key];
    const bounds = bodyArt ? landmarks.bounds : model?.bounds, native = set.body.boundingBox;
    const scale = bodyArt ? (native[5] - native[2]) / (bounds[5] - bounds[2]) : 1;
    const transform = bodyArt ? { scale, position: [
      -scale * (bounds[0] + bounds[3]) / 2,
      (set.slide?.boundingBox[4] ?? native[4]) - bounds[4] * scale,
      native[2] - bounds[2] * scale,
    ] } : undefined;
    const mapPoint = point => point.map((value, axis) => value * scale + transform.position[axis]);
    const rightGrip = key === 'pistol' ? [0.014, -0.06, 0.058] : [0.012, -0.082, 0.092];
    const rightShift = bodyArt ? mapPoint(landmarks.right).map((value, axis) => value - rightGrip[axis]) : [0, 0, 0];
    const leftShift = bodyArt ? mapPoint(landmarks.left).map((value, axis) => value - set.palm[axis]) : [0, 0, 0];
    const palm = set.palm.map((value, axis) => value + leftShift[axis]);
    const sourceElbow = key === 'pistol' && held ? [-0.19, -0.32, 0.18] : set.elbow;
    const elbow = sourceElbow.map((value, axis) => value + leftShift[axis]);
    const magazineAt = bodyArt && parts?.magazine ? mapPoint([
      (parts.magazine.bounds[0] + parts.magazine.bounds[3]) / 2, parts.magazine.bounds[4],
      (parts.magazine.bounds[2] + parts.magazine.bounds[5]) / 2,
    ]) : set.magazineAt.map((value, axis) => value + rightShift[axis]);
    const magazineTransform = bodyArt && parts?.magazine ? { scale,
      position: transform.position.map((value, axis) => value - magazineAt[axis]) } : undefined;
    const node = new Object3D(),
      body = viewPart(set.body, metal, bodyArt, transform),
      magazine = bodyArt && !parts?.magazine ? new Object3D() : viewPart(set.magazine, metal, parts?.magazine, magazineTransform),
      hands = viewPart(set.hands, cloth, held?.[key + '-hands'], { scale: 1, position: rightShift }),
      support = new Object3D(),
      sleeve = viewPart(set.support, cloth, held?.[key + '-support'], { scale: 1, position: leftShift }),
      slide = set.slide && (!bodyArt || parts?.slide) ? viewPart(set.slide, metal, parts?.slide, transform) : undefined;
    node.name = `weapon-${key}`;
    magazine.name = 'magazine';
    support.name = 'support-hand';
    magazine.setPosition(...magazineAt);
    support.setPosition(...palm);
    sleeve.setPosition(-palm[0], -palm[1], -palm[2]);
    support.addChild(sleeve);
    for (const part of [body, magazine, hands, support]) node.addChild(part);
    if (slide) {
      slide.name = 'pistol-slide';
      node.addChild(slide);
    }
    node.visible = false;
    rig.addChild(node);
    const forearm = palm.map((value, i) => value - elbow[i]);
    const length = Math.hypot(...forearm);
    const sight = bodyArt && landmarks.sight ? mapPoint(landmarks.sight) : [0, 0.0835, -0.05];
    if (key === 'rifle' && bodyArt) {
      const optic = new Mesh3D(reflexHousing(), createStandardMaterial3D({ color: 0xffffff, vertexColors: true,
        metallic: 0.3, roughness: 0.52, environmentIntensity: 0.7 }));
      optic.name = 'reflex-sight-housing';
      optic.frustumCulled = false;
      optic.castShadow = false;
      optic.setPosition(...sight);
      node.addChild(optic);
      const glass = new Mesh3D(createQuadGeometry3D(), createUnlitMaterial3D({ color: 0x72c6d4, opacity: 0.035,
        alphaMode: 'blend', side: 'double', depthWrite: false }));
      glass.name = 'reflex-sight-window';
      glass.setPosition(sight[0], sight[1], sight[2] - 0.004).setScale(0.035, 0.027, 1);
      glass.castShadow = false;
      glass.frustumCulled = false;
      node.addChild(glass);
    }
    const aim = bodyArt && landmarks.sight ? [-sight[0], -sight[1], HOLD[key].aim[2]] : HOLD[key].aim;
    models[key] = { node, magazine, support, slide, bodyArt, sight, aim,
      flashTip: bodyArt ? mapPoint(landmarks.muzzle) : BARREL_TIP[key],
      palm, elbow, arm: forearm.map(value => value / length), magazineAt, magazineGrip: set.magazineGrip };
  }
  // The red dot of the rifle's sight.
  const dot = new Mesh3D(
    createSphereGeometry3D({ radius: 0.5, widthSegments: 16, heightSegments: 8 }),
    createUnlitMaterial3D({ color: 0xff3425, toneMapped: false }),
  );
  dot.setPosition(...models.rifle.sight);
  dot.name = 'reflex-sight-reticle';
  dot.setScale(0.001);
  dot.frustumCulled = false;
  dot.castShadow = false;
  models.rifle.node.addChild(dot);
  // The stock sight has a frame for this pane. The imported model uses open sights.
  if (!models.rifle.bodyArt) {
    const lens = new Mesh3D(
      createQuadGeometry3D(),
      createUnlitMaterial3D({ color: 0x6fb0c8, opacity: 0.12, alphaMode: 'blend', depthWrite: false, side: 'double' }),
    );
    lens.setPosition(0, 0.0875, -0.05);
    lens.setScale(0.037, 0.045, 1);
    lens.frustumCulled = false;
    lens.castShadow = false;
    models.rifle.node.addChild(lens);
  }

  // Muzzle flash: two crossed cards and a brief light.
  const flashMaterial = createUnlitMaterial3D({
    color: 0xffffff,
    map: flashTexture(),
    alphaMode: 'blend',
    blending: 'additive',
    depthWrite: false,
    side: 'double',
    toneMapped: false,
  });
  const flash = new Object3D(),
    cards = [0, 1].map((i) => {
      const card = new Mesh3D(createQuadGeometry3D(), flashMaterial);
      card.frustumCulled = false;
      card.castShadow = false;
      flash.addChild(card);
      if (i) orient(card, Math.PI / 2);
      return card;
    });
  flash.visible = false;
  flash.name = 'muzzle-flash';
  models.rifle.node.addChild(flash);
  const light = createPointLight3D({ color: 0xffc27a, intensity: 0, range: 14 });
  camera.addChild(light);
  light.setPosition(0.1, -0.05, -0.9);

  const state = {
    weapon: 'rifle',
    kickBack: 0,
    kickUp: 0,
    swayX: 0,
    swayY: 0,
    bob: 0,
    sprint: 0,
    lower: 1, // starts lowered and comes up
    reload: 0,
    reloadTime: 1,
    flashLeft: 0,
    slideLeft: 0,
    landing: 0,
  };
  const ease = (t) => t * t * (3 - 2 * t);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  return {
    /** Offset from the eye, in the camera's own axes, of the muzzle (for tracers). */
    muzzleOffset(aim) {
      const hold = HOLD[state.weapon], model = models[state.weapon], blend = ease(aim);
      return [0, 1, 2].map(i => (hold.hip[i] + (model.aim[i] - hold.hip[i]) * blend + model.flashTip[i]) * RIG_SCALE);
    },
    fire(weapon, aim) {
      state.kickBack += weapon === 'pistol' ? 0.028 : weapon === 'marksman' ? 0.06 : 0.022 - 0.008 * aim;
      state.kickUp += weapon === 'pistol' ? 0.09 : weapon === 'marksman' ? 0.085 : 0.035 - 0.015 * aim;
      if (weapon === 'pistol') state.slideLeft = PISTOL_CYCLE;
      state.flashLeft = 0.045;
      const size = (weapon === 'pistol' ? 0.16 : 0.26) * (0.8 + Math.random() * 0.5);
      for (const card of cards) card.setScale(size);
      orient(flash, 0, 0, Math.random() * 6.28);
      const { node, flashTip } = models[weapon];
      if (flash.parent !== node) node.addChild(flash);
      const [x, y, z] = flashTip;
      flash.setPosition(x, y, z - 0.04);
    },
    reload(seconds) {
      state.reload = seconds;
      state.reloadTime = seconds;
    },
    land(speed) {
      state.landing = Math.min(0.08, speed * 0.008);
    },
    /** Animate for this frame. `turn` and `tilt` are how far the view moved since the last one. */
    update(dt, game, turn, tilt, visible) {
      const p = game.player,
        weapon = game.weapons[p.weapon],
        model = models[p.weapon],
        hold = HOLD[p.weapon],
        aimed = model.aim;
      if (state.weapon !== p.weapon) {
        state.weapon = p.weapon;
        state.reload = 0;
        state.slideLeft = 0;
      }
      // Through the marksman scope the eye is inside the tube, so the rifle itself is not drawn.
      const scoped = p.weapon === 'marksman' && p.aim > 0.8;
      for (const key of Object.keys(models)) models[key].node.visible = visible && !scoped && key === p.weapon;
      if (weapon.reloading <= 0) state.reload = 0;
      else state.reload = weapon.reloading;

      // Springs: recoil settles, sway trails the view, the bob follows the stride.
      state.kickBack *= Math.exp(-dt * 16);
      state.kickUp *= Math.exp(-dt * 13);
      state.swayX += (Math.max(-0.05, Math.min(0.05, turn * 0.9)) - state.swayX) * Math.min(1, dt * 9);
      state.swayY += (Math.max(-0.05, Math.min(0.05, -tilt * 0.9)) - state.swayY) * Math.min(1, dt * 9);
      state.bob += dt * (p.sprinting ? 13 : 9) * Math.min(1, p.speed / 3);
      state.sprint += ((p.sprinting ? 1 : 0) - state.sprint) * Math.min(1, dt * 8);
      state.landing *= Math.exp(-dt * 10);
      const lowered = p.healing > 0 || !visible ? 1 : clamp01(p.drawing / SWITCH_TIME);
      state.lower += (lowered - state.lower) * Math.min(1, dt * 14);

      const aim = ease(p.aim),
        moving = Math.min(1, p.speed / 4) * (p.grounded ? 1 : 0),
        bobSize = (1 - aim * 0.85) * moving * (p.sprinting ? 0.016 : 0.008),
        swayX = state.swayX * (1 - aim * 0.72),
        swayY = state.swayY * (1 - aim * 0.72);
      let x = hold.hip[0] + (aimed[0] - hold.hip[0]) * aim,
        y = hold.hip[1] + (aimed[1] - hold.hip[1]) * aim,
        z = hold.hip[2] + (aimed[2] - hold.hip[2]) * aim;
      x += swayX + Math.sin(state.bob) * bobSize + state.lower * 0.045;
      y += swayY - Math.abs(Math.cos(state.bob)) * bobSize - state.landing - state.lower * 0.32;
      z += state.kickBack;
      let yaw = swayX * 1.5,
        pitch = state.kickUp * (1 - aim * 0.5) + swayY - state.lower * 0.9,
        roll = -swayX * 2 - state.lower * 0.12;
      // Sprinting carries the weapon low across the body.
      x -= state.sprint * 0.07;
      y -= state.sprint * 0.05;
      yaw += state.sprint * 0.75;
      roll += state.sprint * 0.35;
      // Use the game's existing reload clock: reach, pull the old magazine, seat the new one, return to grip.
      let phase = 0, magazineDrop = 0, reach = 0;
      if (state.reload > 0) {
        phase = clamp01(1 - state.reload / state.reloadTime);
        const tip = ease(clamp01(phase / 0.15)) * (1 - ease(clamp01((phase - 0.8) / 0.2)));
        y -= tip * 0.05;
        pitch += tip * 0.32;
        roll += tip * 0.55;
        yaw += tip * 0.12;
        reach = ease(clamp01((phase - 0.05) / 0.15)) * (1 - ease(clamp01((phase - 0.7) / 0.25)));
        magazineDrop = phase < 0.45 ? ease(clamp01((phase - 0.2) / 0.16)) : 1 - ease(clamp01((phase - 0.48) / 0.21));
      }
      const magazineTravel = magazineDrop * 0.24;
      model.magazine.setPosition(model.magazineAt[0], model.magazineAt[1] - magazineTravel, model.magazineAt[2]);
      model.magazine.visible = magazineDrop < 0.98;
      poseSupport(model, reach, magazineTravel);
      if (model.slide) {
        const cycle = ease(clamp01(state.slideLeft / 0.065)),
          empty = weapon.ammo === 0 ? 1 - ease(clamp01((phase - 0.8) / 0.16)) : 0;
        model.slide.setPosition(0, 0, Math.max(cycle, empty) * 0.033);
      }
      state.slideLeft = Math.max(0, state.slideLeft - dt);
      model.node.setPosition(x, y, z);
      orient(model.node, yaw, pitch, roll);
      dot.visible = visible && p.weapon === 'rifle' && p.aim > 0.2;
      const sightDepth = Math.max(0.08, -models.rifle.aim[2] - models.rifle.sight[2]);
      const lensHeight = Math.max(1, globalThis.innerHeight ?? 900);
      dot.setScale(2 * Math.tan(camera.fov * Math.PI / 360) * sightDepth * 4 / lensHeight);

      state.flashLeft -= dt;
      flash.visible = visible && !scoped && state.flashLeft > 0;
      light.intensity = state.flashLeft > 0 ? 9 : 0;
    },
  };
}
