// The eight racers and their karts. Each is one merged, vertex-coloured mesh
// (kart body, an ornament of its own and the driver) plus four wheels that
// turn and steer. Models face +Z; +X is the driver's left.
import { Mesh3D, Object3D, createGlassMaterial3D, createSphereGeometry3D, createStandardMaterial3D } from '@egret/engine/world3d';
import { RACERS } from './data.mjs';
import { BOX, CONE, CYLINDER, SPHERE, TORUS, build, shade } from './shapes.mjs';

const DARK = 0x1c1c22,
  WHITE = 0xfbfbf6,
  GOLD = 0xf2c230,
  RED = 0xd8262c,
  SKIN = 0xf6cfa4;
const HALF = Math.PI / 2;

/** Two eyes on a face looking along +Z. */
const eyes = (y, z, gap, size, pupil = DARK) => [
  [SPHERE, [-gap, y, z], [size, size * 1.15, size * 0.6], WHITE],
  [SPHERE, [gap, y, z], [size, size * 1.15, size * 0.6], WHITE],
  [SPHERE, [-gap, y, z + size * 0.42], size * 0.52, pupil],
  [SPHERE, [gap, y, z + size * 0.42], size * 0.52, pupil],
];
/** Arms reaching from the shoulders to the steering wheel. */
const arms = (color, hand = color) =>
  [-1, 1].flatMap((side) => [
    [CYLINDER, [side * 0.36, 1.0, 0.1], [0.1, 0.62, 0.1], color, [1.15, 0, side * 0.3]],
    [SPHERE, [side * 0.26, 0.98, 0.4], 0.11, hand],
  ]);
/** A seated body: `robe` is the main colour, `sash` an optional belt. */
const torso = (robe, sash) => [
  [SPHERE, [0, 0.88, -0.28], [0.4, 0.5, 0.34], robe],
  ...(sash ? [[CYLINDER, [0, 0.78, -0.28], [0.41, 0.1, 0.35], sash]] : []),
];

/** The parts shared by every kart, painted in the racer's colours. */
function chassis(body, trim) {
  const deep = shade(body, 0.7);
  return [
    [BOX, [0, 0.36, 0], [1.2, 0.2, 2.3], body],
    [SPHERE, [0, 0.44, 1.05], [0.5, 0.26, 0.62], body],
    [BOX, [0, 0.5, 0.75], [0.74, 0.16, 0.7], trim],
    [BOX, [0.68, 0.42, -0.1], [0.3, 0.3, 1.35], deep],
    [BOX, [-0.68, 0.42, -0.1], [0.3, 0.3, 1.35], deep],
    [BOX, [0.68, 0.585, -0.1], [0.2, 0.04, 1.1], trim],
    [BOX, [-0.68, 0.585, -0.1], [0.2, 0.04, 1.1], trim],
    // Seat, engine and exhausts.
    [BOX, [0, 0.82, -0.66], [0.78, 0.74, 0.16], DARK],
    [BOX, [0, 0.6, -1.0], [0.72, 0.36, 0.42], 0x55565c],
    [CYLINDER, [0.24, 0.72, -1.28], [0.08, 0.36, 0.08], 0xb9bcc4, [HALF, 0, 0]],
    [CYLINDER, [-0.24, 0.72, -1.28], [0.08, 0.36, 0.08], 0xb9bcc4, [HALF, 0, 0]],
    // Bumpers, steering column and wheel.
    [CYLINDER, [0, 0.34, 1.52], [0.07, 1.25, 0.07], 0xb9bcc4, [0, 0, HALF]],
    [CYLINDER, [0, 0.34, -1.3], [0.07, 1.35, 0.07], 0xb9bcc4, [0, 0, HALF]],
    [CYLINDER, [0, 0.76, 0.52], [0.035, 0.5, 0.035], DARK, [-0.9, 0, 0]],
    [TORUS, [0, 0.96, 0.36], [0.2, 0.2, 0.2], DARK, [-0.9 + HALF, 0, 0]],
  ];
}

/** Each racer's driver and the ornament that marks out the kart. */
const DRIVERS = {
  // A southern lion-dance head: red and gold, big eyes, a horn and a white beard.
  lion: () => [
    ...torso(0xd8262c, GOLD),
    ...arms(0xf2c230, WHITE),
    [SPHERE, [0, 1.6, -0.2], [0.56, 0.5, 0.52], RED],
    [SPHERE, [0, 1.36, 0.08], [0.46, 0.2, 0.36], WHITE],
    [SPHERE, [0, 1.52, 0.3], [0.2, 0.15, 0.14], 0x2e8b57],
    [CONE, [0, 2.2, -0.14], [0.11, 0.36, 0.11], GOLD],
    [SPHERE, [0, 1.86, 0.22], [0.5, 0.1, 0.14], WHITE],
    [SPHERE, [0.5, 1.84, -0.22], [0.16, 0.22, 0.1], GOLD],
    [SPHERE, [-0.5, 1.84, -0.22], [0.16, 0.22, 0.1], GOLD],
    [SPHERE, [0, 1.6, -0.55], [0.6, 0.5, 0.3], GOLD],
    ...eyes(1.7, 0.25, 0.24, 0.15),
    // A festival drum rides on the back.
    [CYLINDER, [0, 1.0, -1.08], [0.36, 0.42, 0.36], RED, [HALF, 0, 0]],
    [CYLINDER, [0, 1.0, -0.86], [0.38, 0.03, 0.38], 0xf3e6c4, [HALF, 0, 0]],
    [CYLINDER, [0, 1.0, -1.3], [0.38, 0.03, 0.38], 0xf3e6c4, [HALF, 0, 0]],
  ],
  // A giant panda with a bamboo bumper.
  panda: () => [
    ...torso(WHITE, 0x4f9d3a),
    ...arms(DARK),
    [SPHERE, [0, 1.6, -0.24], [0.5, 0.46, 0.46], WHITE],
    [SPHERE, [0.38, 2.0, -0.28], [0.17, 0.17, 0.1], DARK],
    [SPHERE, [-0.38, 2.0, -0.28], [0.17, 0.17, 0.1], DARK],
    [SPHERE, [0.2, 1.64, 0.14], [0.15, 0.18, 0.1], DARK, [0, 0, 0.5]],
    [SPHERE, [-0.2, 1.64, 0.14], [0.15, 0.18, 0.1], DARK, [0, 0, -0.5]],
    [SPHERE, [0.2, 1.65, 0.22], 0.05, WHITE],
    [SPHERE, [-0.2, 1.65, 0.22], 0.05, WHITE],
    [SPHERE, [0, 1.5, 0.2], [0.09, 0.06, 0.06], DARK],
    [CYLINDER, [0, 0.42, 1.62], [0.09, 1.5, 0.09], 0x6fae4a, [0, 0, HALF]],
    [CYLINDER, [0.5, 1.5, -1.05], [0.06, 1.8, 0.06], 0x6fae4a, [0, 0, -0.12]],
    [CYLINDER, [-0.5, 1.3, -1.05], [0.06, 1.4, 0.06], 0x6fae4a, [0, 0, 0.12]],
    [SPHERE, [0.75, 2.3, -1.05], [0.4, 0.07, 0.14], 0x4f9440, [0, 0, 0.5]],
    [SPHERE, [-0.72, 1.95, -1.05], [0.36, 0.07, 0.14], 0x4f9440, [0, 0, -0.5]],
  ],
  // The Monkey King: golden circlet, two long pheasant feathers and a staff.
  monkey: () => [
    ...torso(0xf2a81d, RED),
    ...arms(0xf2a81d, 0x8a5a2b),
    [SPHERE, [0, 1.58, -0.24], [0.46, 0.44, 0.44], 0x8a5a2b],
    [SPHERE, [0, 1.54, 0.02], [0.33, 0.3, 0.26], 0xf2c9a0],
    [SPHERE, [0.44, 1.6, -0.24], [0.1, 0.15, 0.12], 0xf2c9a0],
    [SPHERE, [-0.44, 1.6, -0.24], [0.1, 0.15, 0.12], 0xf2c9a0],
    [TORUS, [0, 1.84, -0.22], [0.36, 0.36, 0.36], GOLD, [HALF, 0, 0]],
    [CONE, [0.14, 2.6, -0.62], [0.045, 1.7, 0.045], RED, [-0.5, 0, -0.14]],
    [CONE, [-0.14, 2.6, -0.62], [0.045, 1.7, 0.045], RED, [-0.5, 0, 0.14]],
    [SPHERE, [0, 1.3, -0.22], [0.42, 0.12, 0.38], RED],
    ...eyes(1.62, 0.2, 0.13, 0.08, 0x8a2a10),
    [CYLINDER, [0, 1.1, -1.12], [0.07, 2.5, 0.07], RED, [0, 0, HALF - 0.25]],
    [CYLINDER, [1.12, 1.39, -1.12], [0.09, 0.3, 0.09], GOLD, [0, 0, HALF - 0.25]],
    [CYLINDER, [-1.12, 0.81, -1.12], [0.09, 0.3, 0.09], GOLD, [0, 0, HALF - 0.25]],
  ],
  // The Jade Rabbit, with a crescent moon behind the seat.
  rabbit: () => [
    ...torso(0xb9a4e8, WHITE),
    ...arms(WHITE),
    [SPHERE, [0, 1.56, -0.24], [0.44, 0.42, 0.42], WHITE],
    [SPHERE, [0.17, 2.28, -0.3], [0.1, 0.5, 0.08], WHITE, [-0.12, 0, -0.14]],
    [SPHERE, [-0.17, 2.28, -0.3], [0.1, 0.5, 0.08], WHITE, [-0.12, 0, 0.14]],
    [SPHERE, [0.17, 2.28, -0.25], [0.055, 0.4, 0.05], 0xf7a8c4, [-0.12, 0, -0.14]],
    [SPHERE, [-0.17, 2.28, -0.25], [0.055, 0.4, 0.05], 0xf7a8c4, [-0.12, 0, 0.14]],
    [SPHERE, [0, 1.5, 0.16], [0.06, 0.045, 0.05], 0xf06292],
    [SPHERE, [0.24, 1.46, 0.08], [0.1, 0.07, 0.06], 0xf7c1d2],
    [SPHERE, [-0.24, 1.46, 0.08], [0.1, 0.07, 0.06], 0xf7c1d2],
    ...eyes(1.62, 0.13, 0.16, 0.085, 0xc62828),
    [TORUS, [0.12, 1.55, -1.1], [0.52, 0.52, 0.3], [1.3, 1.1, 0.5]],
    [SPHERE, [0.36, 1.55, -1.1], [0.5, 0.56, 0.3], 0x55565c],
    [SPHERE, [-0.6, 2.1, -1.1], 0.09, [1.3, 1.1, 0.5]],
    [SPHERE, [0.75, 2.2, -1.1], 0.07, [1.3, 1.1, 0.5]],
  ],
  // The Azure Dragon: long snout, gold antlers and a row of spines down the kart.
  dragon: () => [
    ...torso(0x0f8f8a, GOLD),
    ...arms(0x0f8f8a, 0xf2c94c),
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
    ...eyes(1.72, 0.1, 0.2, 0.09, 0xb8860b),
    ...[0, 1, 2, 3, 4].map((k) => [
      CONE,
      [0, 1.42 - k * 0.11, -0.74 - k * 0.19],
      [0.1, 0.4 - k * 0.04, 0.16],
      GOLD,
      [-0.5, 0, 0],
    ]),
    [SPHERE, [0.72, 0.6, 0.2], [0.12, 0.1, 0.5], 0xf2c94c],
    [SPHERE, [-0.72, 0.6, 0.2], [0.12, 0.1, 0.5], 0xf2c94c],
  ],
  // A terracotta soldier in plate armour, under the canopy of a bronze chariot.
  warrior: () => [
    ...torso(0xa87650),
    ...arms(0xa87650),
    ...[0, 1, 2].flatMap((row) =>
      [-1, 0, 1].map((col) => [BOX, [col * 0.22, 1.08 - row * 0.2, 0.02], [0.19, 0.17, 0.06], 0x8c5f3e]),
    ),
    [SPHERE, [0, 1.58, -0.26], [0.4, 0.44, 0.4], 0xb98560],
    [SPHERE, [-0.12, 2.06, -0.36], [0.16, 0.2, 0.16], 0x8c5f3e],
    [BOX, [0, 1.96, -0.28], [0.5, 0.08, 0.34], 0x8c5f3e],
    [SPHERE, [0, 1.46, 0.1], [0.2, 0.035, 0.06], 0x6f4a30],
    [SPHERE, [0, 1.56, 0.12], [0.06, 0.09, 0.06], 0xa87650],
    ...eyes(1.66, 0.09, 0.15, 0.065, 0x4a3020),
    [CYLINDER, [0, 1.75, -1.02], [0.045, 2.0, 0.045], 0x4f7a6a],
    [CONE, [0, 2.86, -1.02], [1.05, 0.3, 1.05], 0x4f7a6a],
    [CYLINDER, [0, 2.7, -1.02], [1.07, 0.04, 1.07], 0x6fa08c],
    [SPHERE, [0, 3.04, -1.02], 0.07, 0x6fa08c],
  ],
  // A Peking opera warrior: painted face, pom-pom crown and four flags on the back.
  opera: () => [
    ...torso(0x1f3fa8, GOLD),
    ...arms(0x1f3fa8, WHITE),
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
    [BOX, [0, 2.0, -0.14], [0.7, 0.18, 0.12], GOLD],
    ...[-0.3, -0.1, 0.1, 0.3].map((x) => [SPHERE, [x, 2.16, -0.12], 0.09, RED]),
    [SPHERE, [0, 2.3, -0.16], 0.13, [1.3, 0.9, 0.2]],
    ...[-0.6, -0.22, 0.22, 0.6].flatMap((x) => [
      [CYLINDER, [x, 1.9, -0.86], [0.03, 1.5, 0.03], 0x3a2a20, [-0.25, 0, -x * 0.5]],
      [BOX, [x * 1.38, 2.42, -1.0], [0.42, 0.56, 0.03], Math.abs(x) > 0.4 ? 0x1f3fa8 : WHITE, [-0.25, 0, -x * 0.5]],
      [BOX, [x * 1.38, 2.42, -1.0], [0.16, 0.56, 0.04], GOLD, [-0.25, 0, -x * 0.5]],
    ]),
  ],
  // A child in a tiger-head hat; the kart wears stripes and a tail.
  tiger: () => [
    ...torso(RED, GOLD),
    ...arms(RED, SKIN),
    [SPHERE, [0, 1.56, -0.24], [0.42, 0.42, 0.4], SKIN],
    [SPHERE, [0.24, 1.48, 0.06], [0.09, 0.07, 0.05], 0xf79a9a],
    [SPHERE, [-0.24, 1.48, 0.06], [0.09, 0.07, 0.05], 0xf79a9a],
    ...eyes(1.6, 0.12, 0.15, 0.075),
    [SPHERE, [0, 1.78, -0.3], [0.48, 0.36, 0.46], 0xf07a1a],
    [SPHERE, [0.32, 2.12, -0.3], [0.15, 0.15, 0.09], 0xf07a1a],
    [SPHERE, [-0.32, 2.12, -0.3], [0.15, 0.15, 0.09], 0xf07a1a],
    [SPHERE, [0.32, 2.12, -0.25], [0.08, 0.08, 0.06], 0xffe08a],
    [SPHERE, [-0.32, 2.12, -0.25], [0.08, 0.08, 0.06], 0xffe08a],
    // The 王 mark and the hat's own eyes.
    ...[0, 1, 2].map((k) => [BOX, [0, 2.03 - k * 0.07, 0.07 + k * 0.035], [0.2 - (k === 1 ? 0.06 : 0), 0.03, 0.03], DARK]),
    [BOX, [0, 1.96, 0.1], [0.03, 0.17, 0.03], DARK],
    [SPHERE, [0.2, 1.9, 0.08], 0.07, WHITE],
    [SPHERE, [-0.2, 1.9, 0.08], 0.07, WHITE],
    [SPHERE, [0.2, 1.9, 0.13], 0.035, DARK],
    [SPHERE, [-0.2, 1.9, 0.13], 0.035, DARK],
    ...[0, 1, 2].map((k) => [BOX, [0, 0.6, 0.55 + k * 0.28], [0.72, 0.05, 0.09], DARK]),
    [CYLINDER, [0, 0.95, -1.36], [0.09, 0.8, 0.09], 0xf07a1a, [-0.5, 0, 0]],
    [CYLINDER, [0, 1.55, -1.62], [0.09, 0.6, 0.09], 0xf07a1a, [0.25, 0, 0]],
    [SPHERE, [0, 1.88, -1.54], 0.12, DARK],
  ],
};

const WHEEL = build([
  [CYLINDER, [0, 0, 0], [0.36, 0.3, 0.36], 0x1a1a1e, [0, 0, HALF]],
  [CYLINDER, [0, 0, 0], [0.2, 0.32, 0.2], 0xd9d9de, [0, 0, HALF]],
  [BOX, [0, 0, 0], [0.33, 0.1, 0.5], 0x8f9198],
  [BOX, [0, 0, 0], [0.33, 0.5, 0.1], 0x8f9198],
]);
const WHEEL_PLACES = [
  [0.72, 0.36, 0.92],
  [-0.72, 0.36, 0.92],
  [0.76, 0.36, -0.86],
  [-0.76, 0.36, -0.86],
];
const DOME = createSphereGeometry3D({ radius: 1, widthSegments: 20, heightSegments: 12 });
const bodyMaterial = createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 0.42 });
const wheelMaterial = createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 0.7 });
const shapes = new Map();

/**
 * A racer's kart. `node` goes in the scene; `pose(kart, dt, time)` moves it
 * to match a kart from the rules, and `still()` parks it for a portrait.
 */
export function createKartModel(racerIndex) {
  const racer = RACERS[racerIndex];
  if (!shapes.has(racer.id)) shapes.set(racer.id, build([...chassis(racer.body, racer.trim), ...DRIVERS[racer.id]()]));
  const node = new Object3D(),
    lean = new Object3D(),
    body = new Mesh3D(shapes.get(racer.id), bodyMaterial);
  body.castShadow = true;
  body.receiveShadow = true;
  node.addChild(lean);
  lean.addChild(body);
  const wheels = WHEEL_PLACES.map(([x, y, z]) => {
    const wheel = new Mesh3D(WHEEL, wheelMaterial);
    wheel.castShadow = true;
    wheel.setPosition(x, y, z);
    lean.addChild(wheel);
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

  const model = { node, roll: 0, size: 1, yaw: 0, tip: 0 };
  let spin = 0;

  model.pose = (kart, dt, time) => {
    const ease = Math.min(1, dt * 10);
    // Shrunk by the thunder drum.
    model.size += ((kart.shrink > 0 ? 0.6 : 1) - model.size) * Math.min(1, dt * 8);
    // The hop that starts a drift, on top of real air time.
    const hop = kart.hop > 0 ? Math.sin((1 - kart.hop / 0.28) * Math.PI) * 0.42 : 0;
    node.setPosition(kart.x, kart.y + hop, kart.z);
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
    model.yaw += (yaw - model.yaw) * (kart.spin > 0 ? 1 : ease);
    node.setRotation(0, kart.heading + model.yaw, 0);

    // Lean out of corners, nose up under boost, and follow the slope.
    const roll = kart.steer * Math.min(1, Math.abs(kart.speed) / 25) * 0.1 + (kart.drifting ? kart.driftDir * 0.14 : 0);
    model.roll += (roll - model.roll) * ease;
    const tip =
      -Math.atan(kart.slope) -
      (kart.boost > 0 ? 0.09 : 0) +
      (kart.airborne ? -Math.max(-0.35, Math.min(0.35, kart.vy * 0.02)) : 0);
    model.tip += (tip - model.tip) * ease;
    lean.setRotation(model.tip + flip, 0, model.roll);
    // An engine shiver while standing on the grid.
    lean.setPosition(0, Math.abs(kart.speed) < 1 ? Math.sin(time * 38 + kart.index) * 0.012 : 0, 0);

    spin += (kart.speed / 0.36) * dt;
    wheels.forEach((wheel, index) => wheel.setRotation(spin, index < 2 ? -kart.steer * 0.42 : 0, 0));

    dome.visible = kart.bell > 0;
    if (dome.visible) dome.setRotation(0, time * 2.5, 0);
    // Blink while nothing can hit it after a knock.
    body.visible = !(kart.safe > 0 && kart.spin <= 0 && kart.bell <= 0 && Math.floor(time * 14) % 2 === 0);
  };

  model.still = (x, y, z, heading) => {
    node.setPosition(x, y, z);
    node.setRotation(0, heading, 0);
    node.setScale(1);
    lean.setRotation(0, 0, 0);
    dome.visible = false;
    body.visible = true;
  };

  return model;
}
