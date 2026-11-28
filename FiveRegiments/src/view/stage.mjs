// Training grounds and the three expedition battlefields. Each is a sky (a CC0 panorama that also lights the scene), a sun, a
// ground of scanned CC0 material, the generated buildings and props set round the field, the posts that stand in
// it (and stop men and arrows), the weather, and its own grade of light.
import {
  Attribute3D,
  CubeTexture3D,
  Geometry3D,
  Mesh3D,
  Object3D,
  Texture3D,
  createBoxGeometry3D,
  createGeometry3D,
  createCubeTextureFromEquirect3D,
  createDirectionalLight3D,
  createHemisphereLight3D,
  createPlaneGeometry3D,
  createPointLight3D,
  createStandardMaterial3D,
  loadGltf3D
} from '@egret/engine/world3d';

import { createScratchCanvas } from './scratch-canvas.mjs';
import { groundDetail, roadTints } from './environment-detail.mjs';

const ASSETS = new URL('../../assets/', import.meta.url);

const expeditionRoute = {
  spawn: Object.freeze({ x: 0, z: 11 }),
  exit: Object.freeze({ x: 0, z: -18, r: 2.5 })
};
// World-space collision matches the top of the drawn deck and the slope of its approach.
// Ramp minZ meets the deck, maxZ meets the ground. Positions are metres.
function lookout(id, minX, maxX, minZ, maxZ, height, rampMinX, rampMaxX, rampEndZ) {
  return Object.freeze({
    id, minX, maxX, minZ, maxZ, height,
    ramp: Object.freeze({ minX: rampMinX, maxX: rampMaxX, minZ: maxZ, maxZ: rampEndZ, axis: 'z', risesTo: 'min' })
  });
}
export const EXPEDITION_ARENAS = Object.freeze({
  pass: Object.freeze({
    ...expeditionRoute, path: 'stone_pathway_02', pathWidth: 6.4, threshold: 0xbcc495,
    deck: 'stone_pathway_02', support: 'rock_wall_02', trim: 0x817f69, accents: 0xb4ad82,
    platforms: Object.freeze([lookout('stone-lookout', 7.6, 12.7, -3.2, 3.3, 1.32, 8.7, 11.5, 8.25)])
  }),
  depot: Object.freeze({
    ...expeditionRoute, path: 'clay_plaster', pathWidth: 6.6, threshold: 0xe4bf73,
    deck: 'weathered_planks', support: 'clay_plaster', trim: 0x70513c, accents: 0xd2ab72,
    platforms: Object.freeze([lookout('supplies-roof', -13.4, -7.4, -4.8, 1.7, 1.55, -11.87, -8.99, 6.85)])
  }),
  citadel: Object.freeze({
    ...expeditionRoute, path: 'monastery_stone_floor', pathWidth: 7.6, threshold: 0xead298,
    deck: 'monastery_stone_floor', support: 'red_plaster_weathered', trim: 0x815a51, accents: 0xcab28a,
    platforms: Object.freeze([lookout('court-terrace', 8.25, 13.55, -7.55, -1.25, 1.82, 9.51, 12.39, 4.88)])
  })
});

export const PLACE_LOOK = {
  county: {
    sky: 'kloofendal_48d_partly_cloudy_puresky',
    sun: { dir: [-0.45, 0.82, -0.35], color: 0xfff1dc, intensity: 3.1 },
    hemi: { sky: 0xbcd2ee, ground: 0x8a7458, intensity: 0.55 },
    env: 0.9,
    fog: { color: [0.58, 0.64, 0.72], density: 0.009 },
    ground: { material: 'raked_dirt', repeat: 0.22 },
    exposure: 1.0,
    grade: { saturation: 1.05, contrast: 1.06, brightness: 1.0, vignette: 0.32 },
    weather: 'dust',
    radius: 18
  },
  peach: {
    sky: 'kloppenheim_06_puresky',
    sun: { dir: [0.55, 0.42, -0.6], color: 0xffd6a8, intensity: 3.0 },
    hemi: { sky: 0xd4def0, ground: 0x6a7a48, intensity: 0.5 },
    env: 0.85,
    fog: { color: [0.70, 0.64, 0.60], density: 0.011 },
    ground: { material: 'leafy_grass', repeat: 0.3 },
    exposure: 1.0,
    grade: { saturation: 1.1, contrast: 1.04, brightness: 1.02, vignette: 0.34 },
    weather: 'petals',
    radius: 18
  },
  bamboo: {
    sky: 'kloofendal_misty_morning_puresky',
    sun: { dir: [0.3, 0.75, 0.45], color: 0xf2f4ea, intensity: 2.05 },
    hemi: { sky: 0xd1e0d4, ground: 0x43543b, intensity: 0.53 },
    env: 0.72,
    fog: { color: [0.49, 0.58, 0.54], density: 0.020 },
    ground: { material: 'forest_floor', repeat: 0.3 },
    exposure: 1.0,
    grade: { saturation: 0.98, contrast: 1.10, brightness: 1.0, vignette: 0.36 },
    weather: 'motes',
    radius: 17.5
  },
  snow: {
    sky: 'snow_field_2_puresky',
    sun: { dir: [-0.3, 0.6, 0.55], color: 0xe8eef8, intensity: 2.10 },
    hemi: { sky: 0xd6e2ef, ground: 0xa6b5c7, intensity: 0.65 },
    env: 0.9,
    fog: { color: [0.62, 0.71, 0.80], density: 0.016 },
    ground: { material: 'snow_02', repeat: 0.25 },
    exposure: 0.95,
    grade: { saturation: 0.94, contrast: 1.08, brightness: 1.0, vignette: 0.38 },
    weather: 'snow',
    radius: 18
  },
  palace: {
    sky: 'qwantani_dusk_2_puresky',
    sun: { dir: [0.0, 0.22, -0.97], color: 0xffb27a, intensity: 2.2 },
    hemi: { sky: 0x8090c0, ground: 0x5a4038, intensity: 0.45 },
    env: 0.75,
    fog: { color: [0.52, 0.48, 0.58], density: 0.012 },
    ground: { material: 'monastery_stone_floor', repeat: 0.25 },
    exposure: 1.0,
    grade: { saturation: 1.08, contrast: 1.1, brightness: 0.96, vignette: 0.42 },
    weather: 'embers',
    radius: 18
  },
  pass: {
    sky: 'kloofendal_misty_morning_puresky',
    sun: { dir: [-0.43, 0.64, -0.64], color: 0xeedbc0, intensity: 2.45 },
    hemi: { sky: 0xbacdd1, ground: 0x66745e, intensity: 0.72 },
    env: 0.84,
    fog: { color: [0.49, 0.57, 0.54], density: 0.012 },
    ground: { material: 'forest_floor', repeat: 0.25 },
    exposure: 0.96,
    grade: { saturation: 0.91, contrast: 1.07, brightness: 1.02, vignette: 0.35 },
    weather: 'motes',
    radius: 23
  },
  depot: {
    sky: 'kloppenheim_06_puresky',
    sun: { dir: [0.66, 0.46, -0.53], color: 0xffdbad, intensity: 2.78 },
    hemi: { sky: 0xc3d0d1, ground: 0x98664c, intensity: 0.63 },
    env: 0.84,
    fog: { color: [0.75, 0.63, 0.53], density: 0.012 },
    ground: { material: 'raked_dirt', repeat: 0.25 },
    exposure: 1.02,
    grade: { saturation: 1.12, contrast: 1.08, brightness: 1.01, vignette: 0.32 },
    weather: 'dust',
    radius: 23
  },
  citadel: {
    sky: 'qwantani_dusk_2_puresky',
    sun: { dir: [0.18, 0.48, -0.81], color: 0xffba91, intensity: 2.35 },
    hemi: { sky: 0x9aaed7, ground: 0x735855, intensity: 0.76 },
    env: 0.82,
    fog: { color: [0.50, 0.47, 0.55], density: 0.014 },
    ground: { material: 'monastery_stone_floor', repeat: 0.29 },
    exposure: 1.07,
    grade: { saturation: 1.07, contrast: 1.07, brightness: 1.02, vignette: 0.4 },
    weather: 'embers',
    radius: 23
  }
};

// Where things stand: [prop, x, z, turn (radians), height (m)]; `post` makes it something the fight must go round.
const ring = (prop, n, radius, height, { start = 0, jitter = 0, turnIn = true, skip = [], spread = 1, post = 0, seed = 1 } = {}) => {
  const out = [];
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    if (skip.includes(i)) continue;
    const a = start + (i / n) * Math.PI * 2 * spread;
    const r = radius + (rnd() - 0.5) * jitter;
    const x = Math.sin(a) * r,
      z = Math.cos(a) * r;
    out.push({ prop, x, z, turn: turnIn ? a + Math.PI : rnd() * 6.28, height: height * (0.85 + rnd() * 0.3), post });
  }
  return out;
};

// Along a ring, each set across it (tangent): for a model that runs along its X axis `along` is 0, along Z it is π/2.
const across = (prop, n, radius, height, { start = 0, width, along = 0, skip = () => false, inward = false } = {}) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = start + (i / n) * Math.PI * 2;
    if (skip(a)) continue;
    out.push({ prop, x: Math.sin(a) * radius, z: Math.cos(a) * radius, turn: a + along + (inward ? Math.PI : 0), height, width });
  }
  return out;
};
const near = (a, b, within) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < within;

// The fields are 18 m across the middle: room for a horse to come round. What stands inside them is something the
// fight must go round (`post`); the rest stands about them.
const LAYOUT = {
  // A frontier camp: crenellated rammed-earth walls round it, the gate tower at one end and a stockade gate at the
  // other, tents, arrow towers, fires, a stable, carts and stores, racks of arms, a drum and straw men.
  county: () => [
    { prop: 'gate', x: 0, z: -31, turn: 0, height: 15, width: 26 },
    ...across('wall', 16, 31, 6, { width: 12.4, skip: (a) => near(a, Math.PI, 0.45) || near(a, 0, 0.3) }),
    { prop: 'gatehouse', x: 0, z: 30.5, turn: Math.PI / 2, height: 9, width: 13 },
    { prop: 'tent', x: -15, z: -18.5, turn: 0.7, height: 3.6, width: 6 },
    { prop: 'tent', x: 15.5, z: -18, turn: -0.7, height: 3.6, width: 6 },
    { prop: 'tent', x: -19, z: 14, turn: 2.2, height: 3.4, width: 5.5 },
    { prop: 'tent', x: 18, z: 16, turn: -2.3, height: 3.4, width: 5.5 },
    { prop: 'watchtower', x: -24, z: -16, turn: 0.4, height: 10 },
    { prop: 'watchtower', x: 24, z: -15, turn: -0.4, height: 10 },
    { prop: 'watchtower', x: -9, z: 26, turn: 0, height: 9.5 },
    { prop: 'watchtower', x: 9, z: 26, turn: 0, height: 9.5 },
    { prop: 'campfire', x: -20.5, z: -2, turn: 0.3, height: 1.7, fire: 0.45 },
    { prop: 'campfire', x: 20.5, z: 1, turn: 1.1, height: 1.7, fire: 0.45 },
    { prop: 'stable', x: -24, z: 4, turn: Math.PI / 2, height: 4.4, width: 8 },
    { prop: 'haycart', x: 22, z: 8.5, turn: 2.6, height: 2.4 },
    { prop: 'supplies', x: 21, z: -8.5, turn: -1.2, height: 2.2 },
    { prop: 'supplies', x: -21.5, z: -9, turn: 1.4, height: 2 },
    { prop: 'drum', x: -12, z: -21, turn: 0.6, height: 2.4 },
    { prop: 'dummy', x: 6, z: -20.5, turn: 3.1, height: 1.9 },
    { prop: 'dummy', x: -5, z: -20.8, turn: 3.0, height: 1.9 },
    { prop: 'juma', x: -6.5, z: 23.5, turn: Math.PI / 2, height: 1.5, width: 4.6 },
    { prop: 'juma', x: 6.5, z: 23.5, turn: Math.PI / 2, height: 1.5, width: 4.6 },
    { prop: 'juma', x: -7.5, z: -25, turn: Math.PI / 2, height: 1.5, width: 4.6 },
    { prop: 'juma', x: 7.5, z: -25, turn: Math.PI / 2, height: 1.5, width: 4.6 },
    ...ring('rack', 6, 20.5, 2.4, { start: 0.75, spread: 0.6, seed: 3 }),
    ...ring('banner', 12, 22.5, 7.5, { start: 0.2, seed: 5 })
  ],
  // A hamlet in the peach grove: thatched houses, a fence, a cart, the stone bridge over the stream.
  peach: () => [
    { prop: 'bridge', x: 2, z: 26, turn: 0, height: 2.6, width: 9 },
    { prop: 'peach', x: 9.5, z: -7.5, turn: 1, height: 5.5, post: 0.45 },
    { prop: 'peach2', x: -9.5, z: 6, turn: 2, height: 4.2, post: 0.35 },
    { prop: 'hut', x: -23, z: -7, turn: 1.4, height: 4.6 },
    { prop: 'hut', x: 22.5, z: -13, turn: -1.1, height: 4.4 },
    { prop: 'hut', x: -17, z: 19.5, turn: 2.4, height: 4.2 },
    { prop: 'haycart', x: 17, z: 17.5, turn: -2.2, height: 2.4 },
    { prop: 'stable', x: 24, z: 6, turn: -Math.PI / 2, height: 4, width: 7 },
    ...across('fence', 10, 26.5, 1.4, { start: 0.6, along: Math.PI / 2, skip: (a) => near(a, 0, 0.5) }),
    ...ring('peach', 10, 21.5, 6.5, { jitter: 4, turnIn: false, seed: 11 }),
    ...ring('peach2', 9, 29, 5, { start: 0.4, jitter: 5, turnIn: false, seed: 13 }),
    ...ring('boulder', 5, 19.5, 1.3, { start: 0.9, jitter: 1.5, turnIn: false, seed: 17 })
  ],
  // The old path through the bamboo: a pavilion, a hermit's hut, rocks.
  bamboo: () => [
    { prop: 'pavilion', x: -21, z: -12, turn: 0.9, height: 6.5 },
    { prop: 'hut', x: 21, z: -15, turn: -0.8, height: 4.2 },
    { prop: 'bamboo', x: 7.5, z: 8.5, turn: 0, height: 9, post: 0.7 },
    { prop: 'bamboo', x: -8.5, z: -5.5, turn: 2, height: 10, post: 0.7 },
    { prop: 'boulder', x: 1, z: -11, turn: 1, height: 1.2, post: 0.9 },
    ...ring('bamboo', 22, 21, 11, { jitter: 3, turnIn: false, seed: 19 }),
    ...ring('bamboo', 26, 28, 13, { start: 0.15, jitter: 5, turnIn: false, seed: 23 }),
    ...ring('boulder', 6, 19, 1.4, { start: 0.3, jitter: 1, turnIn: false, seed: 29 })
  ],
  // A fort in the pass: its wall and stockade gate, the beacon, arrow towers, a trebuchet and bed crossbows behind
  // cheval-de-frise, tents in the snow.
  snow: () => [
    { prop: 'gatehouse', x: 0, z: -27, turn: Math.PI / 2, height: 9.5, width: 13 },
    ...[-31, -19, 19, 31].map((x) => ({ prop: 'wall', x, z: -27.5, turn: 0, height: 6, width: 12.2 })),
    { prop: 'beacon', x: -23, z: -18, turn: 0.6, height: 10 },
    { prop: 'watchtower', x: 22, z: -19, turn: -0.5, height: 10 },
    { prop: 'watchtower', x: -25, z: 13, turn: 0.9, height: 9.5 },
    { prop: 'trebuchet', x: 23, z: 12, turn: Math.PI, height: 9 },
    { prop: 'ballista', x: -19.5, z: 6, turn: Math.PI * 0.9, height: 2.6, width: 5 },
    { prop: 'ballista', x: 19.5, z: -6, turn: Math.PI * 1.1, height: 2.6, width: 5 },
    { prop: 'juma', x: -9, z: -21.5, turn: Math.PI / 2, height: 1.5, width: 4.6 },
    { prop: 'juma', x: 9, z: -21.5, turn: Math.PI / 2, height: 1.5, width: 4.6 },
    { prop: 'juma', x: 0, z: 21.5, turn: Math.PI / 2, height: 1.5, width: 4.6 },
    { prop: 'tent', x: -20, z: 19, turn: 2.4, height: 3.4, width: 5.5 },
    { prop: 'tent', x: 19, z: 21, turn: -2.4, height: 3.4, width: 5.5 },
    { prop: 'snowrock', x: 9, z: -6, turn: 0.3, height: 1.6, post: 1.0 },
    { prop: 'snowrock', x: -7.5, z: 8, turn: 2.1, height: 1.3, post: 0.8 },
    ...across('palisade', 14, 25, 3.2, { start: 0.1, along: Math.PI / 2, skip: (a) => near(a, Math.PI, 0.9) || near(a, 0, 0.25) }),
    ...ring('pine', 14, 33, 12, { jitter: 6, turnIn: false, seed: 37 }),
    ...ring('snowrock', 5, 20, 1.8, { start: 1.2, jitter: 1, turnIn: false, seed: 41 })
  ],
  // Before the palace at dusk: the hall on its terrace, stone lions, the cauldron, braziers on the square, banners,
  // bed crossbows at the foot of the steps.
  palace: () => [
    { prop: 'palace', x: 0, z: -34, turn: 0, height: 19, width: 34 },
    { prop: 'lion', x: -8, z: -20, turn: 0, height: 2.6 },
    { prop: 'lion', x: 8, z: -20, turn: 0, height: 2.6 },
    { prop: 'ballista', x: -15, z: -21, turn: 0.3, height: 2.6, width: 5 },
    { prop: 'ballista', x: 15, z: -21, turn: -0.3, height: 2.6, width: 5 },
    { prop: 'ding', x: 0, z: 20, turn: Math.PI, height: 2.2 },
    { prop: 'brazier', x: 10, z: 7.5, turn: 0, height: 1.5, post: 0.6, fire: 1.9 },
    { prop: 'brazier', x: -10, z: 7.5, turn: 0, height: 1.5, post: 0.6, fire: 1.9 },
    { prop: 'brazier', x: 10, z: -8.5, turn: 0, height: 1.5, post: 0.6, fire: 1.9 },
    { prop: 'brazier', x: -10, z: -8.5, turn: 0, height: 1.5, post: 0.6, fire: 1.9 },
    ...ring('banner', 10, 21.5, 8.5, { start: 0.31, seed: 43 })
  ],
  // Stonegate Pass. Weathered hill forts and rocks frame the march up the old stone road.
  pass: () => [
    { prop: 'gatehouse', x: 0, z: -21, turn: Math.PI / 2, height: 8.7, width: 12.4 },
    { prop: 'beacon', x: -12.3, z: -24, height: 10.3, turn: 0.44 },
    { prop: 'watchtower', x: 15.3, z: -21, height: 8.3, turn: -0.29 },
    ...[-26, -16, -7.9, 7.9, 16, 26].map((x) => ({ prop: 'wall', x, z: -23, height: 4.65, width: 10 })),
    { prop: 'boulder', x: -9.1, z: 2.8, turn: 0.5, height: 2.4, post: 1.35 },
    { prop: 'boulder', x: -13, z: -8.8, turn: -1.16, height: 2.9, post: 1.7 },
    { prop: 'boulder', x: 15.2, z: -8.6, turn: 1.02, height: 3.2, post: 1.6 },
    { prop: 'boulder', x: 13.9, z: 13, turn: -0.9, height: 2.5, post: 1.4 },
    { prop: 'boulder', x: -18, z: 10, turn: 0.3, height: 4.25, post: 2.0 },
    { prop: 'boulder', x: -26, z: -7.4, turn: 0.9, height: 12.5 },
    { prop: 'boulder', x: 27, z: -10.9, turn: -1, height: 16.6 },
    { prop: 'boulder', x: -33, z: 14.3, turn: -0.6, height: 14.8 },
    { prop: 'brazier', x: -4.9, z: -18.1, height: 1.3, post: 0.64, fire: 1.4 },
    { prop: 'brazier', x: 4.9, z: -18.1, height: 1.3, post: 0.64, fire: 1.4 },
    ...ring('pine', 17, 34, 10.5, { jitter: 7, turnIn: false, seed: 33 }),
    ...ring('boulder', 7, 31, 4.65, { start: 0.25, jitter: 4, turnIn: false, seed: 53 })
  ],
  // Red Banner Depot. A loaded supply yard and its palisade, lit in warm afternoon light.
  depot: () => [
    { prop: 'gatehouse', x: 0, z: -21, turn: Math.PI / 2, height: 9, width: 13 },
    { prop: 'tent', x: -13, z: -14.5, turn: 0.46, height: 4.6, width: 7.8, post: 2.7 },
    { prop: 'tent', x: 14.8, z: -14, turn: -0.19, height: 5.0, width: 9, post: 3.1 },
    { prop: 'stable', x: 18.1, z: 3.0, turn: Math.PI / 2, height: 5.2, width: 8.5, post: 3.4 },
    { prop: 'haycart', x: -7.3, z: 11.8, turn: 0.8, height: 2.8, post: 1.4 },
    { prop: 'haycart', x: 9.6, z: -7.3, turn: 0.6, height: 2.75, post: 1.48 },
    { prop: 'supplies', x: 8.9, z: 7.6, turn: -0.28, height: 2.3, post: 1.22 },
    { prop: 'supplies', x: -17, z: -0.7, turn: 0.24, height: 3.15, post: 1.55 },
    { prop: 'rack', x: 16, z: 11.5, turn: -0.8, height: 2.55, post: 0.7 },
    { prop: 'drum', x: -12.8, z: 13, turn: 1.1, height: 2.75, post: 1.09 },
    { prop: 'watchtower', x: -22, z: 2.5, turn: 0.8, height: 9.0 },
    { prop: 'watchtower', x: 22, z: -21.3, turn: -0.26, height: 9.6 },
    { prop: 'banner', x: -5.2, z: -18.3, height: 6.4, turn: 0.35, post: 0.44 },
    { prop: 'banner', x: 5.2, z: -18.3, height: 6.4, turn: -0.05, post: 0.44 },
    ...across('palisade', 18, 26.5, 4.3, { along: Math.PI / 2, skip: (a) => near(a, Math.PI, .24) || near(a, 0, .30) }),
    ...ring('banner', 8, 23.8, 6.6, { start: 0.31, seed: 60 })
  ],
  // Nightwatch Citadel. Dusk blue stone opens up into a broad ceremonial court under firelight.
  citadel: () => [
    { prop: 'gate', x: 0, z: -25.5, turn: 0, height: 11.4, width: 16 },
    { prop: 'palace', x: 0, z: -46, turn: 0, height: 17, width: 30 },
    { prop: 'lion', x: -5.4, z: -17.3, height: 2.5, turn: -0.13, post: 1.0 },
    { prop: 'lion', x: 5.4, z: -17.3, height: 2.5, turn: 0.13, post: 1.0 },
    { prop: 'pavilion', x: -20.4, z: -11, height: 8.6, turn: 0.73, post: 3.0 },
    { prop: 'pavilion', x: 20.4, z: -11, height: 8.6, turn: -0.73, post: 3.0 },
    { prop: 'ding', x: -8.1, z: 4.5, height: 2.0, post: 1.05 },
    { prop: 'ding', x: 12.9, z: 10, height: 2.1, post: 1.05 },
    { prop: 'brazier', x: -9.0, z: -8.9, height: 1.8, post: 0.7, fire: 1.89 },
    { prop: 'brazier', x: 14.8, z: -11.2, height: 1.8, post: 0.7, fire: 1.89 },
    { prop: 'brazier', x: 6.6, z: 5.6, height: 1.7, post: 0.7, fire: 1.73 },
    { prop: 'brazier', x: -15.2, z: 8.6, height: 1.7, post: 0.7, fire: 1.73 },
    ...ring('banner', 10, 23.5, 7.4, { start: 0.25, seed: 64 })
  ]
};

const decode = async ({ bytes, mimeType }) => createImageBitmap(new Blob([bytes], { type: mimeType }), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });

async function image(url) {
  const blob = await (await fetch(url)).blob();
  return createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
}

async function projectSkyInWorker(panorama, size) {
  const engine = import.meta.resolve('@egret/engine/world3d');
  const worker = new Worker(new URL('./sky-worker.mjs', import.meta.url), { type: 'module' });
  try {
    const faces = await new Promise((resolve, reject) => {
      worker.onmessage = ({ data }) => data.error ? reject(new Error(data.error)) : resolve(data.faces);
      worker.onerror = (error) => {
        error.preventDefault();
        reject(new Error(error.message));
      };
      worker.onmessageerror = reject;
      // Keep the original pixels available for the synchronous fallback.
      worker.postMessage({ engine, panorama, size });
    });
    return new CubeTexture3D(faces, { colorSpace: 'srgb', mipmaps: true, name: 'equirect' });
  } finally {
    worker.terminate();
  }
}

/** Sky panorama → background and light cube. */
async function skyCube(name, size, useWorker = false) {
  const bitmap = await image(new URL(`skies/${name}.jpg`, ASSETS));
  const canvas = createScratchCanvas(1024, 512);
  const g = canvas.getContext('2d');
  g.drawImage(bitmap, 0, 0, 1024, 512);
  bitmap.close();
  const data = g.getImageData(0, 0, 1024, 512).data;
  const panorama = { width: 1024, height: 512, data: new Uint8Array(data.buffer) };
  // The 384px Stonegate sky shares the loader with WebGL2 shader prep. Let the page paint
  // while the same projection runs in a worker. Older browsers can still load the scene.
  if (useWorker && typeof Worker === 'function' && typeof import.meta.resolve === 'function') {
    try {
      return await projectSkyInWorker(panorama, size);
    } catch {
      // The pixels and projection are the same on the fallback path.
    }
  }
  return createCubeTextureFromEquirect3D(panorama, { size });
}

/** A scanned CC0 material: colour, normal and AO/roughness/metal maps. */
const materialCache = new Map();
async function scanned(name, repeat, extra = {}) {
  const key = name + repeat;
  if (materialCache.has(key)) return materialCache.get(key);
  const [diff, nor, arm] = await Promise.all(['diff', 'nor', 'arm'].map((m) => image(new URL(`materials/${name}_${m}.jpg`, ASSETS))));
  const tex = (source, colorSpace) => {
    const t = new Texture3D(source, { colorSpace, flipY: false, mipmaps: true, anisotropy: 8, wrapS: 'repeat', wrapT: 'repeat' });
    t.repeat[0] = repeat;
    t.repeat[1] = repeat;
    return t;
  };
  const material = createStandardMaterial3D({
    map: tex(diff, 'srgb'),
    normalMap: tex(nor, 'linear'),
    metallicRoughnessMap: tex(arm, 'linear'),
    occlusionMap: tex(arm, 'linear'),
    roughness: 1,
    metallic: 1,
    ...extra
  });
  materialCache.set(key, material);
  return material;
}

/** One flat, weathered ground mesh, with no new collision. */
function environmentGround(root, name, radius, quality, scannedGround, owned) {
  const groundGeometry = createGeometry3D(groundDetail(name, radius, quality));
  const groundMaterial = scannedGround.clone(); // The material and texture residency aren't changed for other props.
  groundMaterial.vertexColors = true;
  const ground = new Mesh3D(groundGeometry, groundMaterial);
  ground.name = 'environment-ground';
  ground.receiveShadow = true;
  root.addChild(ground);
  owned.push(groundGeometry, groundMaterial);
}

/** Load generated props on demand, normalised so that each stands on y = 0 at its middle. */
const propCache = new Map();
async function prop(name, set) {
  const key = name + set;
  if (!propCache.has(key))
    propCache.set(
      key,
      (async () => {
        const response = await fetch(new URL(`props/${name}-${set}.glb`, ASSETS));
        if (!response.ok) return null;
        const asset = await loadGltf3D(new Uint8Array(await response.arrayBuffer()), { decodeImage: decode });
        const root = asset.scene;
        root.updateWorldMatrices(true);
        // Bounds over every mesh in its world (node) frame.
        const min = [Infinity, Infinity, Infinity],
          max = [-Infinity, -Infinity, -Infinity];
        root.traverse((n) => {
          if (!(n instanceof Mesh3D)) return;
          const b = n.geometry.boundingBox,
            m = n.matrixWorld;
          for (let i = 0; i < 8; i++) {
            const p = [i & 1 ? b[3] : b[0], i & 2 ? b[4] : b[1], i & 4 ? b[5] : b[2]];
            for (let k = 0; k < 3; k++) {
              const v = m[k] * p[0] + m[4 + k] * p[1] + m[8 + k] * p[2] + m[12 + k];
              min[k] = Math.min(min[k], v);
              max[k] = Math.max(max[k], v);
            }
          }
          n.castShadow = true;
          n.receiveShadow = true;
        });
        return { root, min, max, asset };
      })()
    );
  return propCache.get(key);
}

const rockProjections = new WeakMap();

/** Keep the scanned silhouette but replace the warped baked atlas on the expedition rocks. */
function surfaceRock(model, material, scale) {
  model.updateWorldMatrices(true);
  const hillside = scale > 7;
  const repeats = hillside ? 12 : 3.4;
  model.traverse((mesh) => {
    if (!(mesh instanceof Mesh3D)) return;
    const source = mesh.geometry;
    let versions = rockProjections.get(source);
    if (!versions) rockProjections.set(source, versions = new Map());
    let geometry = versions.get(repeats);
    if (!geometry) {
      const positions = source.getAttribute('position');
      const uv = new Float32Array(source.vertexCount * 2);
      const m = mesh.matrixWorld;
      for (let i = 0; i < source.vertexCount; i++) {
        const px = positions.data[i * 3], py = positions.data[i * 3 + 1], pz = positions.data[i * 3 + 2];
        const x = m[0] * px + m[4] * py + m[8] * pz + m[12];
        const y = m[1] * px + m[5] * py + m[9] * pz + m[13];
        const z = m[2] * px + m[6] * py + m[10] * pz + m[14];
        // The oblique projection is continuous across the imported triangles and has no wrap seam.
        uv[i * 2] = (hillside ? x * .78 + z * .62 + y * .12 : x * -.58 + z * .81 + y * .10) * repeats;
        uv[i * 2 + 1] = (hillside ? y * .87 + z * .43 - x * .34 : y * .93 - z * .18 - x * .14) * repeats;
      }
      geometry = new Geometry3D();
      geometry.setAttribute('position', positions);
      const normal = source.getAttribute('normal');
      if (normal) geometry.setAttribute('normal', normal);
      geometry.setAttribute('uv', new Attribute3D(uv, 2));
      if (source.index) geometry.setIndex(source.index.data);
      if (!normal) geometry.computeNormals();
      geometry.computeTangents();
      versions.set(repeats, geometry);
    }
    mesh.geometry = geometry;
    mesh.material = material;
  });
}

// A turn at the far end of Stonegate can bring enough pines or rocks into view for auto-instancing
// for the first time. Prepare both ordinary and batched draws from each prop's real color material.
async function prepareStonegatePrograms(renderer, set, platforms) {
  const [pine, boulder, materials] = await Promise.all([prop('pine', set), prop('boulder', set), platforms]);
  const color = { fog: true, environment: true, receiveShadows: renderer.shadowsEnabled };
  const requests = [];
  function addColorRequests(root) {
    root.traverse((mesh) => {
      if (mesh instanceof Mesh3D) requests.push({ ...color, mesh, material: mesh.material });
    });
  }
  if (pine) addColorRequests(pine.root);
  if (boulder) {
    const rock = boulder.root.clone();
    surfaceRock(rock, materials[1], 2.4);
    addColorRequests(rock);
  }
  if (requests.length) await renderer.preparePrograms(requests, { includeAutoInstancing: true });
}

/** The renderer and combat simulation share one layout, including the marked expedition exit. */
export function describePlace(name) {
  const look = PLACE_LOOK[name];
  if (!look) throw new RangeError('Unknown battlefield ' + name);
  const layout = LAYOUT[name]();
  const route = EXPEDITION_ARENAS[name];
  const place = {
    radius: look.radius,
    posts: layout.filter((item) => item.post).map(({ x, z, post: r }) => ({ x, z, r }))
  };
  if (route) {
    place.spawn = route.spawn;
    place.exit = route.exit;
    place.platforms = route.platforms;
  }
  return { look, layout, place, route };
}

function groundStrip(root, material, { name, width, length, x = 0, y = .016, z = 0, angle = 0 }, owned) {
  const geometry = createPlaneGeometry3D({ width, height: length, widthSegments: 4, heightSegments: 16 });
  geometry.setAttribute('color', new Attribute3D(roadTints(name, 4, 16), 3));
  scaleUv(geometry, width, length);
  const surface = material.clone();
  surface.vertexColors = true;
  const mesh = new Mesh3D(geometry, surface);
  owned.push(geometry, surface);
  mesh.setRotation(-Math.PI / 2, 0, angle);
  mesh.setPosition(x, y, z);
  mesh.receiveShadow = true;
  root.addChild(mesh);
}

function block(root, material, { x = 0, y, z, w, h, d, turn = 0, shadow = true }) {
  const geometry = createBoxGeometry3D({ width: w, height: h, depth: d });
  const mesh = new Mesh3D(geometry, material);
  mesh.setPosition(x, y, z);
  mesh.setRotation(0, turn, 0);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  root.addChild(mesh);
  return mesh;
}

function markExit(root, route) {
  const { exit, threshold } = route;
  const brass = createStandardMaterial3D({ color: 0x6f6350, roughness: .72 });
  const lit = createStandardMaterial3D({ color: threshold, emissive: threshold, emissiveIntensity: .64, roughness: .68 });
  const markers = [];
  const add = (w, d, x, z, turn = 0) => {
    const mesh = block(root, brass, { x, y: .057, z, w, h: .025, d, turn, shadow: false });
    markers.push(mesh);
  };
  for (const side of [-1, 1]) {
    add(.18, 3.6, exit.x + exit.r * side, exit.z -.1);
    add(1.3, .16, exit.x + 1.86 * side, exit.z - 1.9);
    add(1.3, .16, exit.x + 1.86 * side, exit.z + 1.7);
    add(.22, 1.46, exit.x + .54 * side, exit.z, side * .77);
  }
  return (open) => {
    const material = open ? lit : brass;
    if (markers[0].material === material) return;
    for (const mesh of markers) mesh.material = material;
  };
}

function buildLookout(root, platform, route, material) {
  const { minX, maxX, minZ, maxZ, height, ramp } = platform;
  const centerX = (minX + maxX) / 2, centerZ = (minZ + maxZ) / 2;
  const width = maxX - minX, depth = maxZ - minZ;
  const coping = .16;
  const [deck, support] = material;
  const edge = createStandardMaterial3D({ color: route.trim, roughness: .9 });
  const accent = createStandardMaterial3D({ color: route.accents, roughness: .78 });
  const base = block(root, support, { x: centerX, y: (height - coping) / 2, z: centerZ, w: width - .13, h: height - coping, d: depth - .13 });
  scaleUv(base.geometry, width, height);
  const top = block(root, deck, { x: centerX, y: height - coping / 2, z: centerZ, w: width, h: coping, d: depth });
  scaleUv(top.geometry, width, depth);

  // Wall sections and coping make the climbable surface read as part of the building.
  // Nothing protrudes above the collision deck.
  for (const sign of [-1, 1]) {
    const x = sign < 0 ? minX + .09 : maxX - .09;
    block(root, edge, { x, y: height - .12, z: centerZ, w: .18, h: .22, d: depth });
    for (let i = 0; i < 3; i++) {
      block(root, edge, { x, y: (height - coping) / 2, z: minZ + .6 + i * (depth - 1.2) * .5, w: .17, h: height - coping, d: .36, shadow: false });
    }
  }
  block(root, edge, { x: centerX, y: height - .12, z: minZ + .085, w: width, h: .22, d: .17 });
  block(root, accent, { x: centerX, y: height + .008, z: maxZ - .24, w: ramp.maxX - ramp.minX, h: .022, d: .11, shadow: false });

  const approach = ramp.maxZ - ramp.minZ;
  const slope = Math.atan2(height, approach);
  const rampLength = Math.hypot(height, approach);
  const rampWidth = ramp.maxX - ramp.minX;
  const rampX = (ramp.minX + ramp.maxX) / 2;
  const rampZ = (ramp.minZ + ramp.maxZ) / 2;
  const slab = block(root, deck, {
    x: rampX,
    y: (height - coping * Math.cos(slope)) / 2,
    z: rampZ - coping * Math.sin(slope) / 2,
    w: rampWidth, h: coping, d: rampLength
  });
  slab.setRotation(slope, 0, 0);
  scaleUv(slab.geometry, rampWidth, rampLength);
  for (const side of [-1, 1]) {
    const trim = block(root, edge, {
      x: rampX + side * (rampWidth / 2 - .12),
      y: height / 2, z: rampZ,
      w: .13, h: .08, d: rampLength, shadow: false
    });
    trim.setRotation(slope, 0, 0);
  }
  // Short inlaid treads identify the ramp from either approach without a floating indicator.
  for (const progress of [.23, .5, .77]) {
    const tread = block(root, accent, {
      x: rampX, y: height * progress + .022, z: ramp.maxZ - approach * progress,
      w: rampWidth - .44, h: .037, d: .10, shadow: false
    });
    tread.setRotation(slope, 0, 0);
  }
}

/** Build the battlefield in a World3D scene. `quality` is 'low' | 'medium' | 'high'. */
export async function buildPlace(scene, name, { quality = 'high', renderer } = {}) {
  const { look, layout, place, route } = describePlace(name);
  const set = quality === 'low' ? 'low' : quality === 'medium' ? 'mid' : 'high';
  const propNames = [...new Set(layout.map((item) => item.prop))];
  const platformMaterials = route ? Promise.all([scanned(route.deck, 0.45), scanned(route.support, 0.36)]) : null;
  const programs = name === 'pass' && quality !== 'low' && renderer?.autoInstancing &&
    renderer.preparePrograms && renderer.context?.getExtension('KHR_parallel_shader_compile')
    ? prepareStonegatePrograms(renderer, set, platformMaterials).catch((error) => {
      console.warn('Stonegate program preparation failed; drawing will retry on demand.', error);
    })
    : null;
  // Terrain, props, sky and extra surfaces can load independently.
  const [cube, ground, propEntries, palace, stone, platforms] = await Promise.all([
    skyCube(look.sky, quality === 'low' ? 128 : 384, name === 'pass' && quality !== 'low'),
    scanned(look.ground.material, look.ground.repeat),
    Promise.all(propNames.map(async (id) => [id, await prop(id, set)])),
    ['palace', 'citadel'].includes(name) ? Promise.all([scanned('red_plaster_weathered', 0.25), scanned('grey_roof_tiles', 0.5)]) : null,
    route ? scanned(route.path, 0.37) : name === 'bamboo' ? scanned('stone_pathway_02', 0.4) : null,
    platformMaterials,
    programs
  ]);
  const props = new Map(propEntries);
  const root = new Object3D();
  root.name = 'place-' + name;
  scene.addChild(root);
  scene.background = cube;
  scene.environment = cube;
  scene.environmentIntensity = look.env;
  scene.fog = { kind: 'exponential', color: look.fog.color, density: look.fog.density };

  const hemi = createHemisphereLight3D({ color: look.hemi.sky, groundColor: look.hemi.ground, intensity: look.hemi.intensity });
  root.addChild(hemi);
  const sun = createDirectionalLight3D({ color: look.sun.color, intensity: look.sun.intensity, castShadow: quality !== 'low' });
  const d = look.sun.dir;
  sun.setPosition(d[0] * 40, d[1] * 40, d[2] * 40);
  sun.lookAt(0, 0, 0);
  Object.assign(sun.shadow, { mapSize: quality === 'high' ? 2048 : 1024, extent: 18, near: 1, far: 120, cascades: quality === 'high' ? 2 : 1, cascadeDistance: 45, bias: 0.0006, normalBias: 0.02 });
  root.addChild(sun);

  const ownedSurfaces = [];
  environmentGround(root, name, place.radius, quality, ground, ownedSurfaces);

  const fires = [];
  for (const item of layout) {
    const loaded = props.get(item.prop);
    if (!loaded) continue;
    const { root: model, min, max } = loaded;
    const holder = new Object3D();
    const h = max[1] - min[1] || 1;
    const k = item.width ? Math.min(item.height / h, item.width / Math.max(max[0] - min[0], max[2] - min[2])) : item.height / h;
    const inner = model.clone();
    if (name === 'pass' && item.prop === 'boulder') surfaceRock(inner, platforms[1], item.height);
    inner.setPosition(-(min[0] + max[0]) / 2, -min[1], -(min[2] + max[2]) / 2);
    holder.addChild(inner);
    holder.setScale(k, k, k);
    holder.setPosition(item.x, 0, item.z);
    holder.setRotation(0, item.turn ?? 0, 0);
    root.addChild(holder);
    if (item.fire) {
      // `fire` is the height of the flames above the ground.
      const light = createPointLight3D({ color: 0xff9a48, intensity: 6, range: 10 });
      light.setPosition(item.x, item.fire + 0.3, item.z);
      root.addChild(light);
      fires.push({ light, x: item.x, y: item.fire, z: item.z, phase: Math.random() * 10 });
    }
  }

  // Turn the citadel into a lined court and leave the open axis facing its exit.
  if (name === 'citadel') {
    const [wall, cap] = palace;
    for (const x of [-26, 26]) {
      const wallHeight = 6.4;
      const side = block(root, wall, { x, y: wallHeight / 2, z: -6, w: 33, h: wallHeight, d: 1.35, turn: Math.PI / 2 });
      scaleUv(side.geometry, 33, wallHeight);
      const trim = block(root, cap, { x, y: wallHeight + .23, z: -6, w: 33.35, h: .46, d: 2.05, turn: Math.PI / 2 });
      scaleUv(trim.geometry, 33, 1);
    }
  } else if (palace) {
    const [wall, cap] = palace;
    const segments = 16;
    const radius = 27;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      if (Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 0.7) continue;
      const len = 2 * radius * Math.tan(Math.PI / segments) + 0.2;
      const height = 6.5;
      const geo = createBoxGeometry3D({ width: len, height, depth: 1.4 });
      scaleUv(geo, len, height);
      const seg = new Mesh3D(geo, wall);
      seg.setPosition(Math.sin(a) * radius, height / 2, Math.cos(a) * radius);
      seg.setRotation(0, a, 0);
      seg.castShadow = true;
      seg.receiveShadow = true;
      root.addChild(seg);
      const top = new Mesh3D(createBoxGeometry3D({ width: len + 0.4, height: 0.5, depth: 2.2 }), cap);
      top.setPosition(Math.sin(a) * radius, height + 0.25, Math.cos(a) * radius);
      top.setRotation(0, a, 0);
      top.castShadow = true;
      root.addChild(top);
    }
  }
  // In the expedition a raised pigment strip of stone or clay identifies the shared northbound route.
  if (stone) {
    if (route) groundStrip(root, stone, { name, width: route.pathWidth, length: 43.8, z: -3.5 }, ownedSurfaces);
    else groundStrip(root, stone, { name, width: 4.2, length: 70, y: .012, angle: .35 }, ownedSurfaces);
  }
  if (platforms) {
    for (const platform of place.platforms) buildLookout(root, platform, route, platforms);
  }
  const setExitOpen = route && markExit(root, route);

  let time = 0;
  return {
    root,
    look,
    sun,
    place,
    setExitOpen,
    fires,
    update(dt) {
      time += dt;
      for (const f of fires) f.light.intensity = 5.5 + Math.sin(time * 11 + f.phase) * 0.8 + Math.sin(time * 23 + f.phase * 2) * 0.5;
    },
    dispose() {
      root.removeFromParent();
      for (const resource of ownedSurfaces.splice(0)) resource.dispose();
    }
  };
}

function scaleUv(geometry, w, h) {
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.data.length; i += 2) {
    uv.data[i] *= w;
    uv.data[i + 1] *= h;
  }
  uv.touch();
}

/** Grade and post settings for a place on the renderer. */
export function applyLook(renderer, look, quality) {
  renderer.exposure = look.exposure;
  const post = renderer.postProcess;
  if (!post) return;
  Object.assign(post, {
    enabled: quality !== 'low',
    bloom: true,
    bloomThreshold: 1.0,
    bloomKnee: 0.5,
    bloomIntensity: 0.18,
    fxaa: true,
    ssao: quality === 'high',
    ssaoRadius: 0.6,
    ssaoIntensity: 1.0,
    vignette: look.grade.vignette,
    saturation: look.grade.saturation,
    contrast: look.grade.contrast,
    brightness: look.grade.brightness
  });
}
