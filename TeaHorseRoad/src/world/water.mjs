// 水：茶山里车要涉过的溪、吊桥下峡谷里的河、高原驿站边的湖，都是引擎的 createWater3D。
// 每片水是一块水平的面，比河床大；地形高过水面的地方自然把它挡住，所以弯弯曲曲的河道不必另做形状。
//
// Water: the stream the trucks ford in the tea hills, the river in the gorge under the rope bridge and the lake by the
// plateau station, all the engine's `createWater3D`. Each is one level surface larger than its bed; where the land
// rises above it the land hides it, so a winding channel needs no shape of its own.
import { createWater3D } from '@egret/engine/world3d';
import { FORD, LAKE, RIVER, pointAt } from './route.mjs';

/** The bodies of water, with where they lie and how they look. */
export function waterBodies() {
  const ford = pointAt(FORD.s);
  return [
    {
      id: 'ford',
      x: ford[0],
      z: FORD.z(ford[0]),
      y: FORD.y,
      width: 360,
      depth: 70,
      options: { color: 0x4a7a72, deepColor: 0x1d3a36, amplitude: 0.02, wavelength: 9, speed: 1.4, direction: [1, 0.2], rippleStrength: 0.35, clarity: 0.8, depthFade: 1.2, foamWidth: 0.15, caustics: 0.4 },
      contains: (x, z) => Math.abs(z - FORD.z(x)) < FORD.halfWidth && Math.abs(x - ford[0]) < 180
    },
    {
      id: 'river',
      x: 260,
      z: -2270,
      y: RIVER.y,
      width: 1800,
      depth: 180,
      options: { color: 0x2f5a5a, deepColor: 0x0f2a2c, amplitude: 0.12, wavelength: 7, speed: 3.2, direction: [-1, 0.1], steepness: 0.5, rippleStrength: 1.2, clarity: 0.55, depthFade: 3, foamWidth: 0.9, caustics: 0.3 },
      contains: (x, z) => Math.abs(z - RIVER.z(x)) < RIVER.halfWidth
    },
    {
      id: 'lake',
      x: LAKE.x,
      z: LAKE.z,
      y: LAKE.y,
      width: LAKE.radius * 2.4,
      depth: LAKE.radius * 2.4,
      options: { color: 0x3a6f8a, deepColor: 0x0e2c44, amplitude: 0.05, wavelength: 6, speed: 1.2, direction: [0.6, 0.8], rippleStrength: 0.7, clarity: 0.7, depthFade: 6, foamWidth: 0.6, caustics: 0.4 },
      contains: (x, z) => Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.radius - 2
    }
  ];
}

/**
 * Put the water into `scene`. The lake mirrors the mountains on the high setting. Returns the bodies, `update(seconds)`,
 * `depthAt(x, y, z)` (how far a point lies below the surface of the water it is in, or 0), and `beforeRender(renderer,
 * camera)` for the lake's mirror.
 */
export function createWaters(scene, { quality = 'medium' } = {}) {
  const bodies = waterBodies().map((body) => {
    const water = createWater3D({
      width: body.width,
      depth: body.depth,
      segments: body.id === 'ford' ? (quality === 'low' ? 64 : 128) : quality === 'low' ? 32 : 64,
      ...body.options,
      // Only High refreshes the mirror. Otherwise the default map would allocate
      // a framebuffer on first sampling even though no reflection was rendered.
      reflectionSize: quality === 'high' ? 512 : 0
    });
    water.setPosition(body.x, body.y, body.z);
    water.receiveShadow = true;
    scene.addChild(water);
    if (water.reflection) {
      water.reflection.interval = 3;
      water.reflection.shadows = false;
    }
    return { ...body, water };
  });
  return {
    bodies,
    update(seconds) {
      for (const body of bodies) body.water.update(seconds);
    },
    /** How deep a point is under water, in metres; zero when dry. */
    depthAt(x, y, z) {
      for (const body of bodies) if (body.contains(x, z)) return Math.max(0, body.water.heightAt(x, z) - y);
      return 0;
    },
    beforeRender(renderer, scene, camera) {
      for (const body of bodies) if (body.water.reflection) body.water.renderReflection(renderer, scene, camera);
    }
  };
}
