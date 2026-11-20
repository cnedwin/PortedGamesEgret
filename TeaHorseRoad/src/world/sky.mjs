// 天光与天气：渐变天空盒兼环境光照，太阳是带级联阴影的平行光，高度雾和光束用引擎的 createAtmosphere3D 做成后期。
// 三段旅程各有自己的天色、雾色和雾浓度，在路上平滑过渡；雪山段飘雪。
//
// Light and weather: a gradient sky that also lights the scene, a sun with cascaded shadows, and height fog with light
// shafts from the engine's `createAtmosphere3D` as a post-processing pass. Each of the three legs has its own sky, fog
// colour and density, blended along the road.
import { createAmbientLight3D, createDirectionalLight3D, createGradientCubeTexture3D, createHemisphereLight3D } from '@egret/engine/world3d';
import { createAtmosphere3D } from '@egret/engine/webgl2/world3d';
import { lerp } from './noise.mjs';

// Per leg: sky zenith and horizon, sun colour, fog colour (linear RGB) and density.
const WEATHER = [
  { zenith: [0.075, 0.25, 0.34], horizon: [0.65, 0.73, 0.68], ground: [0.16, 0.21, 0.17], sun: [1.0, 0.86, 0.68], fog: [0.49, 0.60, 0.56], density: 0.00082, height: 56 },
  { zenith: [0.12, 0.26, 0.40], horizon: [0.72, 0.64, 0.52], ground: [0.23, 0.19, 0.14], sun: [1.0, 0.81, 0.59], fog: [0.62, 0.54, 0.47], density: 0.00115, height: 100 },
  { zenith: [0.075, 0.19, 0.38], horizon: [0.52, 0.63, 0.74], ground: [0.35, 0.39, 0.50], sun: [1.0, 0.94, 0.83], fog: [0.57, 0.65, 0.76], density: 0.00105, height: 245 }
];

/**
 * The sky, the sun and the fog over `scene`. `renderer` receives the atmosphere as its custom post pass. Call
 * `update(camera, focus, biome, seconds)` each frame: the sun's shadow follows `focus`, and `biome` (the shares of the
 * three legs) blends the weather.
 */
export function createSky(scene, renderer, { quality = 'medium' } = {}) {
  const skies = WEATHER.map((w) => createGradientCubeTexture3D(w.zenith, w.horizon, w.ground, 64));
  scene.background = skies[0];
  scene.environment = skies[0];
  scene.environmentIntensity = 0.49;
  // The sky is drawn brighter than it lights the land, so it reads as open air after tone mapping.
  scene.backgroundIntensity = 1.64;

  const hemisphere = createHemisphereLight3D({ color: 0xb9d5d9, groundColor: 0x66503d, intensity: 0.55 });
  const ambient = createAmbientLight3D({ color: 0xffffff, intensity: 0.08 });
  const sun = createDirectionalLight3D({ color: 0xfff1d8, intensity: 2.6, castShadow: quality !== 'low' });
  // The sun stands high in the south-west of a late morning.
  const toSun = [-0.57, 0.57, 0.58],
    l = Math.hypot(...toSun);
  for (let i = 0; i < 3; i++) toSun[i] /= l;
  if (quality !== 'low') {
    sun.shadow.cascades = quality === 'high' ? 3 : 2;
    sun.shadow.cascadeDistance = quality === 'high' ? 260 : 160;
    sun.shadow.cascadeLambda = 0.75;
    sun.shadow.bias = 0.0006;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 1.5;
  }
  scene.addChild(hemisphere);
  scene.addChild(ambient);
  scene.addChild(sun);

  // Height fog and light shafts, as the renderer's custom post pass. On the lowest setting the pass runs alone.
  const atmosphere = createAtmosphere3D({ fogColor: 0x9fb2b8, fogDensity: WEATHER[0].density, fogHeight: WEATHER[0].height, fogFalloff: 0.012, shaftIntensity: 0.35, shaftLength: 0.6 });
  const post = renderer.postProcess;
  if (post) {
    post.custom = atmosphere.post;
    if (!post.enabled) {
      post.enabled = true;
      post.bloom = false;
      post.fxaa = false;
      post.ssao = false;
    }
    post.saturation = 1.01;
    post.contrast = 1.08;
    post.vignette = 0.15;
    if (post.bloom) {
      post.bloomThreshold = 1.4;
      post.bloomIntensity = 0.35;
    }
  } else {
    scene.fog = { kind: 'exponential', color: WEATHER[0].fog, density: WEATHER[0].density };
  }

  // Dusk, for the arrival at the plateau and the closing film: a low sun in the west, amber light, a warm sky.
  const duskSky = createGradientCubeTexture3D([0.08, 0.12, 0.32], [0.95, 0.52, 0.26], [0.22, 0.16, 0.14], 64),
    duskDirection = [-0.82, 0.16, 0.55],
    duskSun = [1.0, 0.56, 0.3],
    duskFog = [0.78, 0.6, 0.5],
    light = [0, 0, 0];
  const dl = Math.hypot(...duskDirection);
  for (let i = 0; i < 3; i++) duskDirection[i] /= dl;
  let dusk = 0;

  const mixed = { zenith: [0, 0, 0], fog: [0, 0, 0], sun: [0, 0, 0] };
  let lastSky = 0;
  return {
    sun,
    atmosphere,
    toSun,
    /** How far toward dusk the light has gone, 0 (day) to 1. */
    set dusk(value) {
      dusk = Math.max(0, Math.min(1, value));
    },
    get dusk() {
      return dusk;
    },
    update(camera, focus, biome) {
      // The weather of the legs, weighted by how far into each the convoy is.
      let density = 0,
        height = 0;
      for (let c = 0; c < 3; c++) mixed.fog[c] = mixed.sun[c] = 0;
      for (let i = 0; i < 3; i++) {
        const w = biome[i];
        density += WEATHER[i].density * w;
        height += WEATHER[i].height * w;
        for (let c = 0; c < 3; c++) {
          mixed.fog[c] += WEATHER[i].fog[c] * w;
          mixed.sun[c] += WEATHER[i].sun[c] * w;
        }
      }
      for (let c = 0; c < 3; c++) {
        mixed.fog[c] = lerp(mixed.fog[c], duskFog[c], dusk);
        mixed.sun[c] = lerp(mixed.sun[c], duskSun[c], dusk);
        light[c] = lerp(toSun[c], duskDirection[c], dusk);
      }
      const ll = Math.hypot(...light);
      for (let c = 0; c < 3; c++) light[c] /= ll;
      atmosphere.fogDensity = density * (1 - 0.45 * dusk);
      atmosphere.fogHeight = lerp(height, focus[1] + 30, 0.5);
      atmosphere.setFogColor(mixed.fog[0], mixed.fog[1], mixed.fog[2]);
      atmosphere.shaftIntensity = 0.35 + dusk * 0.5;
      atmosphere.update(camera, light);
      if (scene.fog) scene.fog = { kind: 'exponential', color: [...mixed.fog], density };
      sun.color.set(mixed.sun);
      sun.intensity = 2.6 + dusk * 0.4;
      // The sky box of the leg the convoy is mostly in, or of dusk.
      const leg = dusk > 0.5 ? 3 : biome[2] > 0.5 ? 2 : biome[1] > 0.5 ? 1 : 0;
      if (leg !== lastSky) {
        lastSky = leg;
        scene.background = leg === 3 ? duskSky : skies[leg];
        scene.environment = leg === 3 ? duskSky : skies[leg];
      }
      // The sun keeps its direction and stands over the convoy, so its shadows fall where the camera looks.
      sun.setPosition(focus[0] + light[0] * 400, focus[1] + light[1] * 400, focus[2] + light[2] * 400);
      sun.lookAt(focus[0], focus[1], focus[2]);
    }
  };
}
