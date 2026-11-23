// The five places: the county drill ground at noon, the peach grove by the stream, the bamboo path in mist, the
// snowy pass and the palace front at dusk. Each is a sky (a CC0 panorama that also lights the scene), a sun, a
// ground of scanned CC0 material, the generated buildings and props set round the field, the posts that stand in
// it (and stop men and arrows), the weather, and its own grade of light.
import {
  Mesh3D,
  Object3D,
  Texture3D,
  createBoxGeometry3D,
  createCubeTextureFromEquirect3D,
  createCylinderGeometry3D,
  createDirectionalLight3D,
  createHemisphereLight3D,
  createPlaneGeometry3D,
  createPointLight3D,
  createStandardMaterial3D,
  loadGltf3D
} from '@egret/engine/world3d';

const ASSETS = new URL('../../assets/', import.meta.url);

export const PLACE_LOOK = {
  county: {
    sky: 'kloofendal_48d_partly_cloudy_puresky',
    sun: { dir: [-0.45, 0.82, -0.35], color: 0xfff1dc, intensity: 3.1 },
    hemi: { sky: 0xbcd2ee, ground: 0x8a7458, intensity: 0.55 },
    env: 0.9,
    fog: { color: [0.72, 0.78, 0.86], density: 0.008 },
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
    fog: { color: [0.86, 0.8, 0.78], density: 0.012 },
    ground: { material: 'leafy_grass', repeat: 0.3 },
    exposure: 1.0,
    grade: { saturation: 1.1, contrast: 1.04, brightness: 1.02, vignette: 0.34 },
    weather: 'petals',
    radius: 18
  },
  bamboo: {
    sky: 'kloofendal_misty_morning_puresky',
    sun: { dir: [0.3, 0.75, 0.45], color: 0xf2f4ea, intensity: 1.8 },
    hemi: { sky: 0xdfe8e2, ground: 0x4a5a3a, intensity: 0.7 },
    env: 0.8,
    fog: { color: [0.8, 0.84, 0.82], density: 0.035 },
    ground: { material: 'forest_floor', repeat: 0.3 },
    exposure: 1.05,
    grade: { saturation: 0.92, contrast: 1.02, brightness: 1.02, vignette: 0.36 },
    weather: 'motes',
    radius: 17.5
  },
  snow: {
    sky: 'snow_field_2_puresky',
    sun: { dir: [-0.3, 0.6, 0.55], color: 0xe8eef8, intensity: 1.9 },
    hemi: { sky: 0xdde6f2, ground: 0xb8c0cc, intensity: 0.85 },
    env: 0.9,
    fog: { color: [0.83, 0.86, 0.9], density: 0.022 },
    ground: { material: 'snow_02', repeat: 0.25 },
    exposure: 0.95,
    grade: { saturation: 0.9, contrast: 1.05, brightness: 1.0, vignette: 0.38 },
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
  ]
};

const decode = async ({ bytes, mimeType }) => createImageBitmap(new Blob([bytes], { type: mimeType }), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });

async function image(url) {
  const blob = await (await fetch(url)).blob();
  return createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
}

/** Sky panorama → background and light cube. */
async function skyCube(name, size) {
  const bitmap = await image(new URL(`skies/${name}.jpg`, ASSETS));
  const canvas = new OffscreenCanvas(1024, 512);
  const g = canvas.getContext('2d');
  g.drawImage(bitmap, 0, 0, 1024, 512);
  bitmap.close();
  const data = g.getImageData(0, 0, 1024, 512).data;
  return createCubeTextureFromEquirect3D({ width: 1024, height: 512, data: new Uint8Array(data.buffer) }, { size });
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

/** A plane whose UVs run in metres, so a material's repeat is per metre. */
function groundPlane(size, material, y = 0) {
  const geometry = createPlaneGeometry3D({ width: size, height: size, widthSegments: 1, heightSegments: 1 });
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.data.length; i++) uv.data[i] *= size;
  uv.touch();
  const mesh = new Mesh3D(geometry, material);
  mesh.setRotation(-Math.PI / 2, 0, 0);
  mesh.setPosition(0, y, 0);
  mesh.receiveShadow = true;
  return mesh;
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

/**
 * Build a place into `scene`. Returns { place (radius, posts) for the fight, lights to flicker, update(dt), dispose }.
 * `quality` is 'low' | 'medium' | 'high'.
 */
export async function buildPlace(scene, name, { renderer, quality = 'high' } = {}) {
  const look = PLACE_LOOK[name];
  const root = new Object3D();
  root.name = 'place-' + name;
  scene.addChild(root);
  const cube = await skyCube(look.sky, quality === 'low' ? 128 : 384);
  scene.background = cube;
  scene.environment = cube;
  scene.fog = { kind: 'exponential', color: look.fog.color, density: look.fog.density };

  const hemi = createHemisphereLight3D({ color: look.hemi.sky, groundColor: look.hemi.ground, intensity: look.hemi.intensity });
  root.addChild(hemi);
  const sun = createDirectionalLight3D({ color: look.sun.color, intensity: look.sun.intensity, castShadow: quality !== 'low' });
  const d = look.sun.dir;
  sun.setPosition(d[0] * 40, d[1] * 40, d[2] * 40);
  sun.lookAt(0, 0, 0);
  Object.assign(sun.shadow, { mapSize: quality === 'high' ? 2048 : 1024, extent: 18, near: 1, far: 120, cascades: quality === 'high' ? 2 : 1, cascadeDistance: 45, bias: 0.0006, normalBias: 0.02 });
  root.addChild(sun);

  const ground = await scanned(look.ground.material, look.ground.repeat);
  root.addChild(groundPlane(1600, ground));

  const set = quality === 'low' ? 'low' : quality === 'medium' ? 'mid' : 'high';
  const posts = [];
  const fires = [];
  const layout = LAYOUT[name]();
  await Promise.all(
    [...new Set(layout.map((l) => l.prop))].map((p) => prop(p, set))
  );
  for (const item of layout) {
    const loaded = await prop(item.prop, set);
    if (item.post) posts.push({ x: item.x, z: item.z, r: item.post });
    if (!loaded) continue;
    const { root: model, min, max } = loaded;
    const holder = new Object3D();
    const h = max[1] - min[1] || 1;
    const k = item.width ? Math.min(item.height / h, item.width / Math.max(max[0] - min[0], max[2] - min[2])) : item.height / h;
    const inner = model.clone();
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

  // Red walls round the palace square (the camp's walls are models).
  if (name === 'palace') {
    const wall = await scanned('red_plaster_weathered', 0.25);
    const cap = await scanned('grey_roof_tiles', 0.5);
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
      if (name === 'palace') {
        const top = new Mesh3D(createBoxGeometry3D({ width: len + 0.4, height: 0.5, depth: 2.2 }), cap);
        top.setPosition(Math.sin(a) * radius, height + 0.25, Math.cos(a) * radius);
        top.setRotation(0, a, 0);
        top.castShadow = true;
        root.addChild(top);
      }
    }
  }
  // A stone path through the bamboo.
  if (name === 'bamboo') {
    const stone = await scanned('stone_pathway_02', 0.4);
    const geometry = createPlaneGeometry3D({ width: 4.2, height: 70 });
    scaleUv(geometry, 4.2, 70);
    const path = new Mesh3D(geometry, stone);
    path.setRotation(-Math.PI / 2, 0, 0.35);
    path.setPosition(0, 0.012, 0);
    path.receiveShadow = true;
    root.addChild(path);
  }

  let time = 0;
  return {
    root,
    look,
    sun,
    place: { radius: look.radius, posts },
    fires,
    update(dt) {
      time += dt;
      for (const f of fires) f.light.intensity = 5.5 + Math.sin(time * 11 + f.phase) * 0.8 + Math.sin(time * 23 + f.phase * 2) * 0.5;
    },
    dispose() {
      root.removeFromParent();
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
