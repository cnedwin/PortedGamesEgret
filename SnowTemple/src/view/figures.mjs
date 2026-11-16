// The people of the chapter: jointed figures modelled from limbs and balls, and the poses that move them.
// A figure faces +z; its left is +x. Poses are sets of joint angles; each frame every joint eases toward
// the pose its state asks for, which is what gives the cuts their snap and the walk its weight.
import { Object3D, createStandardMaterial3D } from '@egret/engine/world3d';
import { createBuilder, rgb, shade } from './build.mjs';

const SKIN = rgb(0xd9a982),
  STEEL = rgb(0xaeb6c2),
  IRON = rgb(0x3b3f47),
  WOOD = rgb(0x4a2f1c),
  RED = rgb(0xb3221c),
  BLACK = rgb(0x17171b);

/** How each is dressed. */
const LOOKS = {
  hero: { coat: rgb(0xcfd3d8), trim: rgb(0x8e2420), legs: rgb(0x2b3140), boots: rgb(0x1d1b1c), cloak: rgb(0x39404f), size: 1, weapon: 'spear', hat: 'felt' },
  blade: { coat: rgb(0x6b4a33), trim: rgb(0x2e2420), legs: rgb(0x37312d), boots: rgb(0x1f1a17), size: 1, weapon: 'sabre', hat: 'scarf' },
  shield: { coat: rgb(0x4f5a4a), trim: rgb(0x8a6a2c), legs: rgb(0x2c302c), boots: rgb(0x1c1b19), size: 1.06, weapon: 'short', hat: 'cap', off: 'shield' },
  bow: { coat: rgb(0x2f3d5c), trim: rgb(0x9a8a70), legs: rgb(0x26282e), boots: rgb(0x1b1a19), size: 0.98, weapon: 'none', hat: 'fur', off: 'bow' },
  lu: { coat: rgb(0x25181c), trim: rgb(0x9b1f24), legs: rgb(0x16161a), boots: rgb(0x0f0f11), cloak: rgb(0x5a1418), size: 1.2, weapon: 'glaive', hat: 'official' }
};

const JOINTS = {
  hips: ['root', 0, 0.94, 0],
  spine: ['hips', 0, 0.06, 0],
  head: ['spine', 0, 0.56, 0],
  armL: ['spine', 0.21, 0.46, 0],
  foreL: ['armL', 0, -0.29, 0],
  off: ['foreL', 0, -0.26, 0],
  armR: ['spine', -0.21, 0.46, 0],
  foreR: ['armR', 0, -0.29, 0],
  hand: ['foreR', 0, -0.26, 0],
  legL: ['hips', 0.1, 0, 0],
  shinL: ['legL', 0, -0.45, 0],
  legR: ['hips', -0.1, 0, 0],
  shinR: ['legR', 0, -0.45, 0],
  cloak: ['spine', 0, 0.47, -0.13],
  weapon: ['spine', 0, 0, 0]
};
const POSED = ['hips', 'spine', 'head', 'armL', 'foreL', 'armR', 'foreR', 'legL', 'shinL', 'legR', 'shinR', 'cloak', 'weapon', 'off'];

function weaponShapes(kind) {
  const body = createBuilder(),
    edge = createBuilder();
  if (kind === 'spear') {
    body.limb([0, 0, -1.05], [0, 0, 1.3], 0.02, 0.018, { tint: WOOD, sides: 6 });
    body.limb([0, 0, -1.17], [0, 0, -1.05], 0.004, 0.024, { tint: IRON, sides: 6 });
    body.ball(0, 0, 1.27, 0.07, 0.07, 0.09, { tint: RED, sides: 8, rings: 5 }); // the tassel
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      body.limb([0, 0, 1.25], [Math.cos(a) * 0.09, Math.sin(a) * 0.09 - 0.05, 1.08], 0.02, 0.004, { tint: RED, sides: 4 });
    }
    // The wine gourd, tied below the tassel.
    body.limb([0, -0.02, 0.95], [0, -0.13, 0.95], 0.006, 0.006, { tint: BLACK, sides: 4 });
    body.ball(0, -0.2, 0.95, 0.07, 0.075, 0.07, { tint: rgb(0xb5843a), sides: 8, rings: 5 });
    body.ball(0, -0.11, 0.95, 0.045, 0.045, 0.045, { tint: rgb(0xb5843a), sides: 8, rings: 5 });
    edge.limb([0, 0, 1.3], [0, 0, 1.44], 0.03, 0.06, { tint: STEEL, sides: 4, flat: 0.22 });
    edge.limb([0, 0, 1.44], [0, 0, 1.82], 0.06, 0.003, { tint: STEEL, sides: 4, flat: 0.22 });
  } else if (kind === 'sabre' || kind === 'short') {
    const reach = kind === 'sabre' ? 1.25 : 0.95,
      grip = kind === 'sabre' ? -0.4 : -0.14;
    body.limb([0, 0, grip], [0, 0, 0.3], 0.02, 0.02, { tint: WOOD, sides: 6 });
    body.box(0, 0, 0.3, 0.035, 0.12, 0.03, { tint: rgb(0x8a6a2c) });
    edge.box(0, 0.015, (0.3 + reach) / 2, 0.014, 0.1, reach - 0.3, { tint: STEEL });
    edge.box(0, 0.035, reach + 0.05, 0.012, 0.075, 0.12, { tint: STEEL, rx: -0.45 });
  } else if (kind === 'glaive') {
    body.limb([0, 0, -1.0], [0, 0, 1.0], 0.027, 0.024, { tint: rgb(0x2a1a14), sides: 6 });
    body.limb([0, 0, -1.14], [0, 0, -1.0], 0.005, 0.03, { tint: IRON, sides: 6 });
    body.box(0, 0, 1.0, 0.07, 0.07, 0.07, { tint: rgb(0x9a7a2c), rz: 0.78 });
    body.ball(0, -0.07, 0.94, 0.05, 0.08, 0.05, { tint: RED, sides: 6, rings: 4 });
    edge.box(0, 0.05, 1.42, 0.02, 0.2, 0.8, { tint: STEEL });
    edge.box(0, 0.1, 1.86, 0.018, 0.17, 0.2, { tint: STEEL, rx: -0.6 });
    edge.box(0, -0.07, 1.24, 0.016, 0.07, 0.16, { tint: STEEL, rx: 0.7 });
  }
  return { body, edge };
}

function offShapes(kind) {
  const b = createBuilder();
  if (kind === 'shield') {
    b.limb([0.05, 0, 0.06], [0.05, 0, 0.1], 0.44, 0.4, { tint: rgb(0x7a5a2e), sides: 14 });
    b.limb([0.05, 0, 0.1], [0.05, 0, 0.16], 0.13, 0.05, { tint: IRON, sides: 10 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      b.ball(0.05 + Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0.1, 0.03, 0.03, 0.02, { tint: IRON, sides: 5, rings: 3 });
    }
  } else if (kind === 'bow') {
    const curve = (t) => [0, t * 0.62, 0.02 + (1 - t * t) * 0.2];
    for (let i = -5; i < 5; i++) b.limb(curve(i / 5), curve((i + 1) / 5), 0.016, 0.016, { tint: rgb(0x5c3a1e), sides: 5, caps: false });
    b.limb(curve(-1), curve(1), 0.004, 0.004, { tint: rgb(0xd8d2c2), sides: 3, caps: false });
    b.limb([0, 0, 0.02], [0, 0, 0.75], 0.007, 0.007, { tint: rgb(0xc9bfa6), sides: 4 });
  }
  return b;
}

/** The shapes of one figure, joint by joint. */
function dress(kind) {
  const look = LOOKS[kind],
    parts = {},
    at = (name) => (parts[name] ??= createBuilder()),
    coat = look.coat,
    dark = shade(coat, 0.72);
  // Torso: the coat widens toward the shoulders; a sash at the waist.
  at('spine').limb([0, -0.04, 0], [0, 0.26, 0], 0.17, 0.2, { tint: dark, tintB: coat, sides: 10, flat: 0.72 });
  at('spine').limb([0, 0.26, 0], [0, 0.5, 0], 0.2, 0.16, { tint: coat, sides: 10, flat: 0.7 });
  at('spine').limb([0, 0.0, 0], [0, 0.07, 0], 0.185, 0.185, { tint: look.trim, sides: 10, flat: 0.74, caps: false });
  at('spine').box(0, 0.3, 0.125, 0.07, 0.42, 0.02, { tint: look.trim }); // the coat's front band
  at('spine').limb([0, 0.5, 0], [0, 0.58, 0], 0.06, 0.055, { tint: SKIN, sides: 8 });
  for (const side of [1, -1]) at('spine').ball(side * 0.2, 0.46, 0, 0.085, 0.075, 0.085, { tint: kind === 'lu' || kind === 'shield' ? IRON : coat, sides: 8, rings: 5 });
  // The skirt of the coat hangs from the hips, split at the sides.
  at('hips').limb([0, 0.08, 0], [0, -0.34, 0], 0.18, 0.27, { tint: dark, tintB: shade(coat, 0.55), sides: 10, flat: 0.78, caps: false });
  at('hips').box(0, -0.12, 0.2, 0.1, 0.42, 0.02, { tint: look.trim, rx: -0.12 });
  // Head and hat.
  at('head').ball(0, 0.08, 0.005, 0.095, 0.115, 0.1, { tint: SKIN, sides: 10, rings: 7 });
  at('head').ball(0, 0.11, -0.03, 0.1, 0.105, 0.1, { tint: BLACK, sides: 10, rings: 6 }); // hair
  if (look.hat === 'felt') {
    // A wide felt hat, snow on its brim.
    at('head').limb([0, 0.15, 0], [0, 0.2, 0], 0.33, 0.12, { tint: rgb(0x4a4038), tintB: rgb(0x5a4e44), sides: 14 });
    at('head').limb([0, 0.2, 0], [0, 0.31, 0], 0.12, 0.03, { tint: rgb(0x5a4e44), sides: 12 });
    at('head').limb([0, 0.155, 0], [0, 0.17, 0], 0.335, 0.3, { tint: rgb(0xe8eef4), sides: 14, caps: false });
    at('head').ball(0, 0.32, 0, 0.035, 0.035, 0.035, { tint: RED, sides: 6, rings: 4 });
  } else if (look.hat === 'scarf') {
    at('head').ball(0, 0.15, -0.01, 0.105, 0.07, 0.105, { tint: look.trim, sides: 10, rings: 5 });
    at('head').limb([0, 0.13, -0.09], [0.03, 0.0, -0.16], 0.03, 0.012, { tint: look.trim, sides: 5 });
  } else if (look.hat === 'cap') {
    at('head').ball(0, 0.15, 0, 0.115, 0.085, 0.115, { tint: IRON, sides: 10, rings: 5 });
    at('head').limb([0, 0.22, 0], [0, 0.3, 0], 0.02, 0.004, { tint: IRON, sides: 5 });
  } else if (look.hat === 'fur') {
    at('head').limb([0, 0.1, 0], [0, 0.2, 0], 0.125, 0.115, { tint: rgb(0x6a5440), sides: 10 });
  } else {
    // An official's black cap with its two stiff wings.
    at('head').limb([0, 0.13, 0], [0, 0.24, -0.01], 0.105, 0.095, { tint: BLACK, sides: 10 });
    at('head').box(0, 0.25, -0.05, 0.13, 0.1, 0.07, { tint: BLACK });
    at('head').box(0, 0.19, -0.1, 0.52, 0.035, 0.012, { tint: BLACK });
  }
  for (const [arm, fore, side] of [
    ['armL', 'foreL', 1],
    ['armR', 'foreR', -1]
  ]) {
    at(arm).limb([0, 0.02, 0], [0, -0.29, 0], 0.07, 0.058, { tint: coat, sides: 7 });
    at(fore).limb([0, 0, 0], [0, -0.2, 0], 0.058, 0.066, { tint: coat, tintB: dark, sides: 7 }); // a wide cuff
    at(fore).limb([0, -0.19, 0], [0, -0.23, 0], 0.05, 0.05, { tint: look.trim, sides: 7 });
    at(fore).ball(0, -0.27, 0, 0.042, 0.05, 0.042, { tint: SKIN, sides: 6, rings: 4 });
    void side;
  }
  for (const [leg, shin] of [
    ['legL', 'shinL'],
    ['legR', 'shinR']
  ]) {
    at(leg).limb([0, 0.02, 0], [0, -0.45, 0], 0.092, 0.07, { tint: look.legs, sides: 7 });
    at(shin).limb([0, 0, 0], [0, -0.38, 0], 0.07, 0.055, { tint: look.legs, tintB: look.boots, sides: 7 });
    at(shin).limb([0, -0.36, 0], [0, -0.47, 0.0], 0.062, 0.066, { tint: look.boots, sides: 7 });
    at(shin).box(0, -0.455, 0.055, 0.11, 0.07, 0.2, { tint: look.boots });
  }
  if (look.cloak) {
    // A cloak in three falling panels.
    const tint = look.cloak,
      low = shade(look.cloak, 0.6);
    for (const [x0, x1] of [
      [-0.2, -0.06],
      [-0.06, 0.06],
      [0.06, 0.2]
    ])
      at('cloak').sheet([x0, 0, 0], [x1, 0, 0], [x1 * 1.55, -0.95, -0.2], [x0 * 1.55, -0.95, -0.2], { tint, tintB: low });
  }
  if (kind === 'bow') at('spine').limb([-0.1, 0.1, -0.16], [0.12, 0.5, -0.14], 0.05, 0.05, { tint: rgb(0x4a3526), sides: 6 }); // the quiver
  return parts;
}

/** Build one figure of the given kind. */
export function createFigure(kind) {
  const look = LOOKS[kind],
    cloth = createStandardMaterial3D({ vertexColors: true, roughness: 0.86, metallic: 0, side: 'double' }),
    metal = createStandardMaterial3D({ vertexColors: true, roughness: 0.32, metallic: 0.85, emissive: 0x9fd4ff, emissiveIntensity: 0 }),
    root = new Object3D(),
    joints = { root },
    rest = {};
  for (const [name, [parent, x, y, z]] of Object.entries(JOINTS)) {
    const joint = new Object3D();
    joint.setPosition(x, y, z);
    rest[name] = [x, y, z];
    joints[parent].addChild(joint);
    joints[name] = joint;
  }
  const parts = dress(kind);
  for (const [name, builder] of Object.entries(parts)) joints[name].addChild(builder.mesh(cloth));
  const weapon = weaponShapes(look.weapon);
  if (!weapon.body.empty) joints.weapon.addChild(weapon.body.mesh(cloth));
  if (!weapon.edge.empty) joints.weapon.addChild(weapon.edge.mesh(metal));
  if (look.off) joints.off.addChild(offShapes(look.off).mesh(cloth));
  root.setScale(look.size);
  const angles = {};
  for (const name of POSED) angles[name] = [0, 0, 0];
  return { kind, look, root, joints, rest, angles, lift: 0, cloth, metal, glow: 0, flash: 0, scale: look.size, sink: 0 };
}

// ---- poses --------------------------------------------------------------------------------

const mix = (a, b, k) => a + (b - a) * k;
const ease = (k) => k * k * (3 - 2 * k);
const span = (t, from, to) => Math.max(0, Math.min(1, (t - from) / (to - from)));

/** Blend two poses. */
function blend(a, b, k) {
  const out = { lift: mix(a.lift ?? 0, b.lift ?? 0, k) };
  for (const name of POSED) {
    const p = a[name] ?? ZERO,
      q = b[name] ?? ZERO;
    out[name] = [mix(p[0], q[0], k), mix(p[1], q[1], k), mix(p[2], q[2], k)];
  }
  return out;
}
const ZERO = [0, 0, 0];

const STAND = {
  hero: { spine: [0.06, -0.3, 0], head: [0, 0.25, 0], armR: [0.3, 0, -0.25], foreR: [-1.0, 0, 0], weapon: [-0.22, 0.42, 0], armL: [-0.25, 0, 0.18], foreL: [-0.7, 0, 0], legL: [-0.18, 0, 0.07], shinL: [0.2, 0, 0], legR: [0.22, 0, -0.07], shinR: [0.18, 0, 0], cloak: [0.12, 0, 0] },
  foe: { spine: [0.1, -0.2, 0], armR: [0.1, 0, -0.3], foreR: [-0.9, 0, 0], weapon: [-0.5, 0.25, 0], armL: [-0.2, 0, 0.2], foreL: [-0.6, 0, 0], legL: [-0.15, 0, 0.08], shinL: [0.18, 0, 0], legR: [0.18, 0, -0.08], shinR: [0.15, 0, 0], cloak: [0.1, 0, 0] },
  shield: { armL: [-0.95, 0, 0.1], foreL: [-1.1, 0, -0.5], off: [1.2, 0, 0] },
  bow: { armL: [-0.5, 0, 0.2], foreL: [-0.6, 0, 0], off: [0.9, 0, 0], armR: [0, 0, -0.15], foreR: [-0.4, 0, 0] }
};

/** A stride: `phase` runs 0..1 over two steps, `reach` is how far the legs swing. */
function stride(base, phase, reach, lean) {
  const s = Math.sin(phase * Math.PI * 2),
    c = Math.cos(phase * Math.PI * 2);
  return {
    ...base,
    lift: Math.abs(c) * 0.05 - 0.04,
    spine: [(base.spine?.[0] ?? 0) + lean, (base.spine?.[1] ?? 0) + s * 0.12, 0],
    legL: [-s * reach, 0, 0.03],
    shinL: [Math.max(0, c) * reach * 1.3 + 0.15, 0, 0],
    legR: [s * reach, 0, -0.03],
    shinR: [Math.max(0, -c) * reach * 1.3 + 0.15, 0, 0],
    armL: [s * reach * 0.7 - 0.15, 0, 0.15],
    foreL: [-0.6, 0, 0],
    cloak: [0.3 + lean * 1.4 + c * 0.08, 0, 0]
  };
}

// The three cuts, each as: ready, drawn back, struck.
const CUTS = [
  [
    { spine: [0.08, -0.75, 0], armR: [0.85, 0, -0.3], foreR: [-1.7, 0, 0], weapon: [0, 0.1, 0], armL: [-0.9, 0, 0.2], foreL: [-0.5, 0, 0], legL: [-0.3, 0, 0.05], shinL: [0.4, 0, 0], legR: [0.35, 0, -0.05], shinR: [0.3, 0, 0], lift: -0.08 },
    { spine: [0.32, 0.55, 0], head: [0, -0.4, 0], armR: [-1.5, 0, 0.12], foreR: [-0.08, 0, 0], weapon: [0.04, 0, 0], armL: [0.5, 0, 0.3], foreL: [-0.4, 0, 0], legL: [-0.95, 0, 0.05], shinL: [0.95, 0, 0], legR: [0.6, 0, -0.05], shinR: [0.1, 0, 0], lift: -0.2, cloak: [0.7, 0, 0] }
  ],
  [
    { spine: [0.1, -1.0, 0], armR: [-0.5, 0, -1.1], foreR: [-0.5, 0, 0], weapon: [0, -1.75, 0], armL: [-0.7, 0, -0.3], foreL: [-0.9, 0, 0], legL: [-0.25, 0, 0.1], shinL: [0.35, 0, 0], legR: [0.3, 0, -0.1], shinR: [0.3, 0, 0], lift: -0.1 },
    { spine: [0.18, 1.0, 0], head: [0, -0.6, 0], armR: [-1.25, 0, 0.75], foreR: [-0.2, 0, 0], weapon: [0.02, 1.6, 0], armL: [0.3, 0, 0.6], foreL: [-0.5, 0, 0], legL: [-0.5, 0, 0.2], shinL: [0.5, 0, 0], legR: [0.45, 0, -0.2], shinR: [0.25, 0, 0], lift: -0.14, cloak: [0.5, 0.5, 0] }
  ],
  [
    { spine: [-0.32, 0, 0], head: [0.3, 0, 0], armR: [-2.75, 0, -0.1], foreR: [-0.35, 0, 0], weapon: [-2.0, 0, 0], armL: [-2.6, 0, 0.1], foreL: [-0.4, 0, 0], legL: [-0.1, 0, 0.1], shinL: [0.1, 0, 0], legR: [0.1, 0, -0.1], shinR: [0.1, 0, 0], lift: 0.12 },
    { spine: [0.7, 0, 0], head: [-0.4, 0, 0], armR: [-0.95, 0, 0.1], foreR: [-0.2, 0, 0], weapon: [0.52, 0, 0], armL: [-0.9, 0, -0.1], foreL: [-0.4, 0, 0], legL: [-0.9, 0, 0.1], shinL: [1.1, 0, 0], legR: [0.5, 0, -0.1], shinR: [0.6, 0, 0], lift: -0.32, cloak: [0.9, 0, 0] }
  ]
];

const HERO_POSES = {
  guard: { spine: [0.12, 0, 0], armR: [-1.0, 0, -0.35], foreR: [-0.9, 0, 0], weapon: [-0.2, 1.4, 0.2], armL: [-1.2, 0, 0.45], foreL: [-0.7, 0, 0], legL: [-0.35, 0, 0.16], shinL: [0.4, 0, 0], legR: [0.3, 0, -0.16], shinR: [0.35, 0, 0], lift: -0.12 },
  dodge: { spine: [1.0, 0, 0], head: [-0.4, 0, 0], armR: [0.6, 0, -0.3], foreR: [-0.6, 0, 0], weapon: [0.1, -0.5, 0], armL: [0.7, 0, 0.3], foreL: [-0.5, 0, 0], legL: [-1.2, 0, 0], shinL: [1.5, 0, 0], legR: [-0.3, 0, 0], shinR: [1.2, 0, 0], lift: -0.42, cloak: [1.2, 0, 0] },
  hurt: { spine: [-0.5, 0.35, 0], head: [-0.35, 0, 0], armR: [0.4, 0, -0.9], foreR: [-0.5, 0, 0], weapon: [0.3, -0.8, 0], armL: [0.3, 0, 0.9], foreL: [-0.4, 0, 0], legL: [0.25, 0, 0.1], shinL: [0.3, 0, 0], legR: [-0.2, 0, -0.1], shinR: [0.3, 0, 0], lift: -0.06 },
  drink: { spine: [-0.18, 0, 0], head: [-0.5, 0, 0], armL: [-2.1, 0, 0.35], foreL: [-1.7, 0, 0], armR: [-0.4, 0, -0.35], foreR: [-0.5, 0, 0], weapon: [-1.45, 0, 0] },
  stars: { spine: [0.1, 0.55, 0], armL: [-1.55, 0, -0.1], foreL: [-0.05, 0, 0], armR: [0.5, 0, -0.5], foreR: [-0.7, 0, 0], weapon: [0.15, -1.3, 0], legL: [-0.5, 0, 0.1], shinL: [0.5, 0, 0], legR: [0.4, 0, -0.1], shinR: [0.2, 0, 0], lift: -0.1 },
  rainUp: { spine: [-0.28, 0, 0], head: [-0.45, 0, 0], armR: [-3.0, 0, -0.08], foreR: [-0.1, 0, 0], weapon: [-1.57, 0, 0], armL: [-0.6, 0, 0.9], foreL: [-0.3, 0, 0], lift: 0.25, cloak: [1.0, 0, 0] },
  rainDown: { spine: [0.75, 0, 0], head: [-0.3, 0, 0], armR: [-1.0, 0, 0], foreR: [-0.5, 0, 0], weapon: [1.25, 0, 0], armL: [-1.0, 0, 0.2], foreL: [-0.5, 0, 0], legL: [-1.1, 0, 0.1], shinL: [1.3, 0, 0], legR: [0.3, 0, -0.1], shinR: [1.2, 0, 0], lift: -0.4 },
  glide: { spine: [0.75, 0, 0], head: [-0.6, 0, 0], armR: [0.9, 0, -0.4], foreR: [-0.3, 0, 0], weapon: [0.12, -0.25, 0], armL: [0.9, 0, 0.4], foreL: [-0.2, 0, 0], legL: [-0.7, 0, 0.05], shinL: [0.9, 0, 0], legR: [0.75, 0, -0.05], shinR: [0.5, 0, 0], lift: -0.1, cloak: [1.35, 0, 0] },
  dead: { hips: [-1.45, 0, 0.1], spine: [-0.1, 0, 0], head: [-0.2, 0.4, 0], armR: [0.2, 0, -1.2], armL: [0.1, 0, 1.3], weapon: [0.2, -1.2, 1.2], legL: [0.1, 0, 0.25], legR: [-0.15, 0, -0.2], shinR: [0.5, 0, 0], lift: -0.8 }
};

/** The hero's pose for what he is doing. Returns [pose, how fast the joints chase it]. */
export function heroPose(hero, tune, clock, travelled) {
  const base = STAND.hero;
  switch (hero.state) {
    case 'cut': {
      const cut = tune.cuts[hero.cut],
        [back, through] = CUTS[hero.cut];
      if (hero.t < cut.windup) return [{ ...base, ...back }, 30];
      if (hero.t < cut.windup + cut.active + 0.08) return [{ ...base, ...through }, 46];
      return [blend({ ...base, ...through }, base, ease(span(hero.t, cut.windup + cut.active + 0.08, cut.windup + cut.active + cut.recover))), 16];
    }
    case 'riposte':
      return hero.t < tune.riposte.strike * 0.7 ? [{ ...base, ...CUTS[0][0], lift: -0.25 }, 40] : [{ ...base, ...CUTS[0][1], lift: -0.3 }, 50];
    case 'guard':
      return [{ ...base, ...HERO_POSES.guard }, 26];
    case 'dodge':
      return [{ ...base, ...HERO_POSES.dodge, hips: [hero.t / tune.dodge.time < 0.8 ? 0.5 : 0, 0, 0] }, 26];
    case 'hurt':
      return [{ ...base, ...HERO_POSES.hurt }, 30];
    case 'drink':
      return [{ ...base, ...HERO_POSES.drink }, 14];
    case 'stars':
      return [{ ...base, ...HERO_POSES.stars }, 30];
    case 'rain':
      return hero.t < tune.rain.burstAt - 0.2 ? [{ ...base, ...HERO_POSES.rainUp, lift: 0.25 + Math.sin(clock * 3) * 0.05 }, 9] : [{ ...base, ...HERO_POSES.rainDown }, 34];
    case 'glide':
      return [{ ...base, ...HERO_POSES.glide }, 14];
    case 'dead':
      return [{ ...base, ...HERO_POSES.dead }, 7];
  }
  if (hero.moving) return [{ ...stride({ ...base, weapon: [0.12, 0.3, 0], armR: [0.35, 0, -0.25] }, travelled / 2.3, 0.85, 0.22) }, 18];
  const breath = Math.sin(clock * 1.8) * 0.02;
  return [{ ...base, spine: [0.06 + breath, -0.3, 0], lift: breath * 0.6 }, 10];
}

const FOE_POSES = {
  arcBack: { spine: [0.05, -0.9, 0], armR: [-0.9, 0, -1.2], foreR: [-0.7, 0, 0], weapon: [-0.55, -1.7, 0], legL: [-0.3, 0, 0.1], shinL: [0.35, 0, 0], legR: [0.3, 0, -0.1], shinR: [0.3, 0, 0], lift: -0.1 },
  arcThrough: { spine: [0.25, 0.95, 0], armR: [-1.3, 0, 0.6], foreR: [-0.2, 0, 0], weapon: [0.12, 1.5, 0], legL: [-0.7, 0, 0.1], shinL: [0.7, 0, 0], legR: [0.5, 0, -0.1], shinR: [0.2, 0, 0], lift: -0.16, cloak: [0.6, 0.4, 0] },
  lineBack: { spine: [0.3, -0.6, 0], armR: [0.8, 0, -0.3], foreR: [-1.5, 0, 0], weapon: [0, 0.05, 0], legL: [-0.5, 0, 0.1], shinL: [0.8, 0, 0], legR: [0.5, 0, -0.1], shinR: [0.8, 0, 0], lift: -0.25 },
  lineThrough: { spine: [0.4, 0.5, 0], armR: [-1.5, 0, 0.1], foreR: [-0.05, 0, 0], weapon: [0.03, 0, 0], legL: [-1.0, 0, 0.05], shinL: [1.0, 0, 0], legR: [0.7, 0, -0.05], shinR: [0.1, 0, 0], lift: -0.22, cloak: [1.1, 0, 0] },
  discBack: { spine: [-0.35, 0, 0], head: [0.3, 0, 0], armR: [-2.8, 0, -0.1], foreR: [-0.3, 0, 0], armL: [-2.7, 0, 0.1], foreL: [-0.3, 0, 0], weapon: [-2.05, 0, 0], lift: 0.14 },
  discThrough: { spine: [0.75, 0, 0], armR: [-0.9, 0, 0.1], foreR: [-0.2, 0, 0], armL: [-0.9, 0, -0.1], foreL: [-0.3, 0, 0], weapon: [0.55, 0, 0], legL: [-0.9, 0, 0.1], shinL: [1.1, 0, 0], legR: [0.5, 0, -0.1], shinR: [0.6, 0, 0], lift: -0.32 },
  fireBack: { spine: [0.55, -0.5, 0], armR: [0.3, 0, -0.5], foreR: [-0.4, 0, 0], weapon: [0.5, -0.9, 0], legL: [-0.6, 0, 0.1], shinL: [0.9, 0, 0], legR: [0.4, 0, -0.1], shinR: [0.7, 0, 0], lift: -0.28 },
  fireThrough: { spine: [-0.25, 0.6, 0], armR: [-2.2, 0, 0.3], foreR: [-0.2, 0, 0], weapon: [-1.0, 0.5, 0], lift: 0.05, cloak: [0.8, 0, 0] },
  wheel: { spine: [0.15, 0, 0], armR: [-1.4, 0, -0.9], foreR: [-0.1, 0, 0], armL: [-0.6, 0, 1.0], weapon: [0.05, -1.57, 0], lift: -0.12, cloak: [1.1, 0, 0] },
  draw: { spine: [0.02, -0.5, 0], head: [0, 0.4, 0], armL: [-1.5, 0, -0.35], foreL: [-0.05, 0, 0], off: [1.55, 0, 0], armR: [-1.35, 0, -0.5], foreR: [-2.0, 0, 0] },
  loft: { spine: [-0.35, -0.5, 0], head: [-0.3, 0.4, 0], armL: [-2.3, 0, -0.35], foreL: [-0.05, 0, 0], off: [1.55, 0, 0], armR: [-2.0, 0, -0.5], foreR: [-2.0, 0, 0] },
  stagger: { spine: [-0.55, 0.3, 0], head: [-0.4, 0, 0], armR: [0.3, 0, -1.0], foreR: [-0.4, 0, 0], weapon: [0.4, -1.0, 0.3], armL: [0.2, 0, 1.0], foreL: [-0.3, 0, 0], legL: [0.3, 0, 0.1], shinL: [0.35, 0, 0], legR: [-0.25, 0, -0.1], shinR: [0.35, 0, 0], lift: -0.08 },
  down: { spine: [0.7, 0, 0], head: [0.45, 0, 0], armR: [-0.8, 0, -0.2], foreR: [-0.9, 0, 0], weapon: [-1.35, 0, 0.15], armL: [-0.3, 0, 0.3], foreL: [-1.0, 0, 0], legL: [-1.4, 0, 0.1], shinL: [1.5, 0, 0], legR: [0.2, 0, -0.1], shinR: [1.5, 0, 0], lift: -0.46 },
  rage: { spine: [-0.42, 0, 0], head: [-0.5, 0, 0], armR: [-0.7, 0, -1.3], foreR: [-0.3, 0, 0], weapon: [-0.9, -0.9, 0], armL: [-0.7, 0, 1.3], foreL: [-0.4, 0, 0], legL: [-0.2, 0, 0.2], legR: [0.2, 0, -0.2], lift: 0.05, cloak: [1.0, 0, 0] },
  wait: { spine: [0.05, 0, 0], armR: [-0.35, 0, -0.3], foreR: [-0.5, 0, 0], weapon: [-1.5, 0, 0], armL: [0.1, 0, 0.12], foreL: [-0.2, 0, 0] }
};

/** A foe's pose for what he is doing. */
export function foePose(foe, clock, travelled) {
  const base = { ...STAND.foe, ...(STAND[foe.kind] ?? {}) },
    over = (pose) => ({ ...base, ...pose });
  switch (foe.state) {
    case 'dead':
      return [over({ ...HERO_POSES.dead, hips: [-1.5, 0, foe.id % 2 ? 0.2 : -0.2] }), 8];
    case 'stagger':
      return [over(FOE_POSES.stagger), 28];
    case 'down':
      return [over(FOE_POSES.down), 12];
    case 'rage':
      return foe.t < 0.8 ? [over(FOE_POSES.down), 12] : [over(FOE_POSES.rage), 16];
    case 'wait':
      return [over(foe.kind === 'lu' ? FOE_POSES.wait : {}), 8];
    case 'windup':
    case 'strike':
    case 'recover': {
      const move = foe.move,
        key = move.name === 'fire' ? 'fire' : move.name === 'wheel' ? 'wheel' : move.shape === 'arc' ? 'arc' : move.shape === 'line' ? 'line' : 'disc';
      if (foe.kind === 'bow') {
        const pose = over(move.name === 'volley' ? FOE_POSES.loft : FOE_POSES.draw);
        return foe.state === 'recover' ? [blend(pose, base, ease(span(foe.t, 0, 0.35))), 14] : [pose, 12];
      }
      if (key === 'wheel') return [over({ ...FOE_POSES.wheel, hips: [0, foe.state === 'strike' ? foe.t * 26 : 0, 0] }), foe.state === 'strike' ? 60 : 14];
      const back = over(FOE_POSES[key + 'Back']),
        through = over(FOE_POSES[key + 'Through']);
      if (foe.state === 'windup') return [blend(base, back, ease(span(foe.t, 0, move.windup * 0.55))), 16];
      if (foe.state === 'strike') return [through, 48];
      return [blend(through, base, ease(span(foe.t, move.recover * 0.35, move.recover))), 14];
    }
  }
  if (foe.walking) return [stride(base, travelled / (foe.kind === 'lu' ? 2.6 : 1.9), 0.6, 0.12), 16];
  const breath = Math.sin(clock * 1.6 + foe.id) * 0.02;
  return [{ ...base, lift: breath }, 10];
}

/** Ease the figure's joints toward a pose and place its weapon in its right hand. */
export function pose(figure, target, rate, dt) {
  const k = 1 - Math.exp(-rate * dt),
    joints = figure.joints;
  for (const name of POSED) {
    const want = target[name] ?? ZERO,
      now = figure.angles[name];
    for (let i = 0; i < 3; i++) now[i] += (want[i] - now[i]) * k;
    joints[name].setRotation(now[0], now[1], now[2]);
  }
  figure.lift += ((target.lift ?? 0) - figure.lift) * k;
  joints.hips.setPosition(0, figure.rest.hips[1] + figure.lift, 0);
  // The weapon is posed in the body's own space, and carried to wherever the hand has got to.
  figure.root.updateWorldMatrices(true);
  const hand = joints.hand.getWorldPosition(scratch);
  joints.spine.worldToLocal(scratch, hand);
  joints.weapon.setPosition(scratch[0], scratch[1], scratch[2]);
}
const scratch = [0, 0, 0];
