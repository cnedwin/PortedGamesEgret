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
    radius: 12
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
    radius: 12
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
    radius: 11.5
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
    radius: 12
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
    radius: 12.5
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

const LAYOUT = {
  county: () => [
    { prop: 'gate', x: 0, z: -27, turn: 0, height: 15, width: 26 },
    { prop: 'drum', x: -10.5, z: -9.5, turn: 0.8, height: 2.4, post: 0.9 },
    { prop: 'dummy', x: 7.5, z: 5, turn: 2.2, height: 1.9, post: 0.35 },
    { prop: 'dummy', x: -6.5, z: 6.5, turn: -1.2, height: 1.9, post: 0.35 },
    ...ring('rack', 6, 14.2, 2.4, { start: 0.5, spread: 0.8, seed: 3 }),
    ...ring('banner', 10, 17, 7.5, { start: 0.2, seed: 5 }),
    ...ring('fence', 14, 15.6, 1.4, { start: 0.1, skip: [6, 7], seed: 9 })
  ],
  peach: () => [
    { prop: 'bridge', x: 2, z: 19, turn: 0, height: 2.6, width: 9 },
    { prop: 'peach', x: 6.8, z: -5.5, turn: 1, height: 5.5, post: 0.45 },
    { prop: 'peach2', x: -7.2, z: 4, turn: 2, height: 4.2, post: 0.35 },
    ...ring('peach', 9, 16, 6.5, { jitter: 4, turnIn: false, seed: 11 }),
    ...ring('peach2', 8, 21, 5, { start: 0.4, jitter: 5, turnIn: false, seed: 13 }),
    ...ring('boulder', 5, 13.5, 1.3, { start: 0.9, jitter: 1.5, turnIn: false, seed: 17 })
  ],
  bamboo: () => [
    { prop: 'pavilion', x: -15, z: -10, turn: 0.9, height: 6.5 },
    { prop: 'bamboo', x: 5.5, z: 6.5, turn: 0, height: 9, post: 0.7 },
    { prop: 'bamboo', x: -6, z: -4, turn: 2, height: 10, post: 0.7 },
    { prop: 'boulder', x: 0.5, z: -8, turn: 1, height: 1.2, post: 0.9 },
    ...ring('bamboo', 18, 15, 11, { jitter: 3, turnIn: false, seed: 19 }),
    ...ring('bamboo', 22, 22, 13, { start: 0.15, jitter: 5, turnIn: false, seed: 23 }),
    ...ring('boulder', 6, 13, 1.4, { start: 0.3, jitter: 1, turnIn: false, seed: 29 })
  ],
  snow: () => [
    { prop: 'beacon', x: -14, z: -18, turn: 0.6, height: 10 },
    { prop: 'snowrock', x: 6.5, z: -4.5, turn: 0.3, height: 1.6, post: 1.0 },
    { prop: 'snowrock', x: -5, z: 6, turn: 2.1, height: 1.3, post: 0.8 },
    ...ring('palisade', 16, 17, 3.2, { start: 0.1, skip: [0, 8], seed: 31 }),
    ...ring('pine', 14, 25, 12, { jitter: 6, turnIn: false, seed: 37 }),
    ...ring('snowrock', 5, 13.5, 1.8, { start: 1.2, jitter: 1, turnIn: false, seed: 41 })
  ],
  palace: () => [
    { prop: 'palace', x: 0, z: -30, turn: 0, height: 19, width: 34 },
    { prop: 'lion', x: -7, z: -15, turn: 0, height: 2.6 },
    { prop: 'lion', x: 7, z: -15, turn: 0, height: 2.6 },
    { prop: 'ding', x: 0, z: 15, turn: Math.PI, height: 2.2 },
    { prop: 'brazier', x: 8.5, z: 6, turn: 0, height: 1.5, post: 0.6, fire: true },
    { prop: 'brazier', x: -8.5, z: 6, turn: 0, height: 1.5, post: 0.6, fire: true },
    { prop: 'brazier', x: 8.5, z: -7, turn: 0, height: 1.5, post: 0.6, fire: true },
    { prop: 'brazier', x: -8.5, z: -7, turn: 0, height: 1.5, post: 0.6, fire: true },
    ...ring('banner', 8, 16, 8.5, { start: 0.39, seed: 43 })
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
      const light = createPointLight3D({ color: 0xff9a48, intensity: 6, range: 9 });
      light.setPosition(item.x, item.height + 0.4, item.z);
      root.addChild(light);
      fires.push({ light, x: item.x, y: item.height + 0.3, z: item.z, phase: Math.random() * 10 });
    }
  }

  // Walls of rammed earth round the county ground, red walls by the palace.
  if (name === 'county' || name === 'palace') {
    const wall = await scanned(name === 'county' ? 'clay_plaster' : 'red_plaster_weathered', 0.25);
    const cap = await scanned('grey_roof_tiles', 0.5);
    const segments = name === 'county' ? 18 : 14;
    const radius = name === 'county' ? 24 : 22;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      if (name === 'county' && Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 0.55) continue;
      if (name === 'palace' && Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 0.8) continue;
      const len = 2 * radius * Math.tan(Math.PI / segments) + 0.2;
      const height = name === 'county' ? 5.5 : 6.5;
      const geo = createBoxGeometry3D({ width: len, height, depth: name === 'county' ? 2.6 : 1.4 });
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
