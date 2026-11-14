// The 3D stage: one canvas, one renderer, and whichever scene is showing.
//
// A scene here is `{ scene, camera, update(dt, time) }`. The game has two: the
// sect's seat (seat.mjs) and a fight (arena.mjs). `show` swaps between them.
import { createEngine } from '@egret/engine';
import { InstancedMesh3D, Mesh3D, Scene3D, createAmbientLight3D, createDirectionalLight3D, createHemisphereLight3D, createPerspectiveCamera3D, createUnlitMaterial3D } from '@egret/engine/world3d';
import { createOrbit } from './orbit.mjs';
import { BALL, ORB, linear, skyOf } from './shapes.mjs';

/**
 * Picture quality by device. A phone gets no shadows or post-processing and
 * fewer people on screen; see `crowd` in seat.mjs.
 */
export function pickQuality(params = new URLSearchParams(globalThis.location?.search ?? ''), stored = null) {
  const asked = params.get('quality') ?? stored;
  if (['high', 'medium', 'low'].includes(asked)) return asked;
  const phone = globalThis.matchMedia?.('(pointer: coarse)').matches || Math.min(globalThis.innerWidth ?? 1200, globalThis.innerHeight ?? 800) < 600;
  return phone ? 'low' : 'high';
}

/**
 * Starts the renderer on a canvas.
 * @returns the stage, or `null` when the device cannot draw 3D (the game then stays with its panels)
 */
export async function createStage(canvas, { onError = () => {}, quality = pickQuality(), webgpu = false } = {}) {
  let backend, engine, renderer;
  try {
    backend = await (webgpu ? import('@egret/engine/webgpu/world3d') : import('@egret/engine/webgl2/world3d'));
    engine = await createEngine({ host: backend.createWorld3DHost(canvas) });
    renderer = webgpu
      ? await backend.createWebGPURenderer3D({ canvas, antialias: quality !== 'low', toneMapping: 'aces', onDeviceLost: (message) => onError(message || 'device lost') })
      : backend.createWebGL2Renderer3D({ canvas, antialias: quality !== 'low', toneMapping: 'aces' });
  } catch (cause) {
    onError(cause);
    return null;
  }
  const scope = engine.createScope();
  scope.use(renderer);
  renderer.shadowsEnabled = quality !== 'low';
  Object.assign(renderer.postProcess, {
    enabled: quality !== 'low',
    bloom: quality === 'high',
    bloomThreshold: 1.2,
    bloomIntensity: 0.35,
    fxaa: true,
    saturation: 1.0,
    contrast: 1.08,
    vignette: 0.16,
    ssao: quality === 'high',
    ssaoRadius: 1.1,
    ssaoIntensity: 1.0,
  });

  // Haze that lies in the hollows and shafts of light when the sun is low; a scene's light says how much of each.
  const air = quality !== 'low' && backend.createAtmosphere3D ? backend.createAtmosphere3D({ fogDensity: 0.004, fogHeight: 0, fogFalloff: 0.05, shaftIntensity: 0.5, shaftLength: 0.7 }) : null;
  if (air) renderer.postProcess.custom = air.post;

  // An empty scene to show until the game asks for one.
  const blank = { scene: new Scene3D(), camera: createPerspectiveCamera3D({ fov: 45, near: 0.3, far: 600 }), update() {} };
  blank.scene.addChild(blank.camera);
  let current = blank;
  const stage = {
    quality,
    renderer,
    /** Frames drawn, for automated checks. */
    frames: 0,
    paused: false,
    canvas,
    /** The camera rig the scenes share; each sets its own view of things when shown. */
    orbit: createOrbit(canvas),
    show(next) {
      current.leave?.();
      current = next ?? blank;
      viewOptions.maxPixelRatio = quality === 'high' ? 1.5 : quality === 'low' ? current.lowPixelRatio ?? 1 : 1;
      view.scene = current.scene;
      view.camera = current.camera;
      stage.orbit.onTap = null;
      current.enter?.();
    },
    /** Stops drawing while the canvas is out of sight, to spare the battery. */
    sleep(asleep) {
      view.paused = asleep;
    },
    get current() {
      return current;
    },
  };
  const viewOptions = {
    renderer,
    scene: blank.scene,
    camera: blank.camera,
    maxPixelRatio: quality === 'high' ? 1.5 : 1,
    onUpdate(dt, time) {
      stage.frames++;
      if (!stage.paused) current.update(Math.min(dt, 0.1), time);
      const light = current.light;
      if (air && light?.travels) {
        air.setFogColor(...light.haze);
        // Mist at dawn and dusk and through the night; clear air at noon.
        air.fogDensity = (current.mist ?? 0.0016) * (0.45 + light.low * 1.3 + (light.night ? 0.5 : 0));
        air.shaftIntensity = light.night ? 0 : 0.12 + light.low * 0.5;
        air.update(current.camera, light.travels);
      } else if (air) (air.fogDensity = 0), (air.shaftIntensity = 0), air.update(current.camera);
    },
    onError,
  };
  const view = backend.createWorld3DView(engine, scope, viewOptions);
  backend.startWorld3DLoop(engine, onError);
  return stage;
}

/**
 * The look of the sky and the light at set hours of the day; in between, one
 * blends into the next. Colours are 0–255; `sun` and `fill` are strengths.
 */
const HOURS = [
  { hour: 0, light: [150, 175, 255], sun: 0.3, top: [10, 16, 40], rim: [38, 52, 92], below: [24, 30, 44], sky: [110, 135, 215], fill: 0.3, haze: [40, 52, 86] },
  { hour: 4.6, light: [150, 175, 255], sun: 0.3, top: [14, 22, 52], rim: [70, 78, 120], below: [30, 36, 50], sky: [120, 140, 215], fill: 0.32, haze: [58, 68, 104] },
  { hour: 5.6, light: [255, 170, 120], sun: 0.9, top: [58, 84, 150], rim: [250, 178, 132], below: [112, 100, 96], sky: [255, 214, 190], fill: 0.4, haze: [238, 196, 170] },
  { hour: 7.5, light: [255, 226, 186], sun: 1.7, top: [66, 126, 214], rim: [236, 226, 214], below: [126, 142, 118], sky: [226, 234, 250], fill: 0.36, haze: [222, 226, 228] },
  { hour: 12, light: [255, 244, 222], sun: 2.05, top: [52, 114, 214], rim: [220, 234, 248], below: [128, 148, 120], sky: [214, 232, 255], fill: 0.38, haze: [214, 230, 245] },
  { hour: 16, light: [255, 232, 196], sun: 1.9, top: [60, 112, 204], rim: [232, 226, 220], below: [128, 142, 116], sky: [226, 230, 246], fill: 0.36, haze: [222, 226, 232] },
  { hour: 18.2, light: [255, 176, 112], sun: 1.5, top: [70, 84, 150], rim: [250, 186, 130], below: [120, 104, 96], sky: [255, 216, 186], fill: 0.32, haze: [240, 200, 168] },
  { hour: 19.4, light: [200, 170, 200], sun: 0.3, top: [30, 38, 86], rim: [150, 110, 130], below: [50, 48, 60], sky: [170, 160, 220], fill: 0.34, haze: [110, 96, 124] },
  { hour: 20.4, light: [150, 175, 255], sun: 0.3, top: [10, 16, 40], rim: [38, 52, 92], below: [24, 30, 44], sky: [110, 135, 215], fill: 0.3, haze: [40, 52, 86] },
  { hour: 24, light: [150, 175, 255], sun: 0.3, top: [10, 16, 40], rim: [38, 52, 92], below: [24, 30, 44], sky: [110, 135, 215], fill: 0.3, haze: [40, 52, 86] },
];
const blend = (a, b, k) => (Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * k) : a + (b - a) * k);
/** The light at an hour of the day, 0 to 24. */
export function lightAt(hour) {
  const h = ((hour % 24) + 24) % 24;
  const next = HOURS.findIndex((key) => key.hour > h),
    a = HOURS[next - 1],
    b = HOURS[next];
  const k = (h - a.hour) / (b.hour - a.hour),
    out = {};
  for (const key in a) out[key] = blend(a[key], b[key], k);
  // By day the light is the sun, rising in the east and setting in the west; by night it is the moon, high in the south.
  out.night = h < 5.1 || h > 19.4;
  const arc = out.night ? 0.5 : (h - 5.1) / 14.3;
  out.from = [Math.cos(arc * Math.PI) * 0.75, Math.max(0.24, Math.sin(arc * Math.PI)) * (out.night ? 0.9 : 1), 0.45];
  return out;
}

/**
 * Sky, fog and the three lights every scene shares, turning with the hour.
 * @param mood 'day' or 'dusk': the hour the scene opens at
 * @param quality the picture's quality; the lowest has no shadows
 * @param options.sun, options.fill  scale the lights, for a scene seen from far above
 * @returns `{ sun, aim(x, y, z), setHour(hour), hour, night }`: `aim` points the
 *   shadows at what the scene is showing, `setHour` moves the day on.
 */
export function lightScene(scene, mood = 'day', quality = 'high', { sun: sunScale = 1, fill: fillScale = 1 } = {}) {
  scene.fog = { kind: 'linear', color: [1, 1, 1], near: 150, far: 480 };
  const hemisphere = createHemisphereLight3D({ color: 0xd6e8ff, groundColor: 0x7c8f5e, intensity: 0.5 });
  scene.addChild(hemisphere);
  scene.addChild(createAmbientLight3D({ intensity: 0.12 }));
  const sun = createDirectionalLight3D({ color: 0xfff0d2, intensity: 1.55, castShadow: quality !== 'low' });
  // Shadows have soft edges, as they do under a sun that is a disc and not a point.
  if (quality !== 'low') Object.assign(sun.shadow, { cascades: 2, cascadeDistance: 60, mapSize: quality === 'high' ? 2048 : 1024, radius: quality === 'high' ? 2.5 : 1.5 });
  scene.addChild(sun);
  // The sun or the moon is seen in the sky, and at night the stars come out.
  const discMaterial = createUnlitMaterial3D({ color: [6, 5, 3.6], fog: false });
  const disc = new Mesh3D(ORB, discMaterial);
  disc.castShadow = false;
  scene.addChild(disc);
  const STARS = quality === 'low' ? 90 : 260;
  const stars = new InstancedMesh3D(BALL, createUnlitMaterial3D({ color: [1.6, 1.7, 2.1], fog: false }), STARS);
  stars.castShadow = false;
  for (let i = 0; i < STARS; i++) {
    // Scattered over the upper half of a great dome, by a fixed rule so that they never change.
    const a = (i * 2.399963) % 6.2832,
      up = 0.08 + ((i * 0.6180339) % 1) * 0.9,
      flat = Math.sqrt(1 - up * up);
    stars.setTransformAt(i, [Math.cos(a) * flat * 380, up * 380, Math.sin(a) * flat * 380], [0, 0, 0, 1], 0.5 + ((i * 7) % 5) * 0.16);
  }
  stars.visible = false;
  scene.addChild(stars);
  let at = [0, 0, 0],
    from = [0.4, 0.8, 0.45],
    painted = -99;
  const light = {
    sun,
    hour: mood === 'dusk' ? 17.6 : 9.5,
    night: false,
    aim(x, y, z) {
      at = [x, y, z];
      sun.setPosition(x + from[0] * 90, y + from[1] * 90, z + from[2] * 90);
      sun.lookAt(x, y, z);
      disc.setPosition(x + from[0] * 360, y + from[1] * 360, z + from[2] * 360);
      stars.setPosition(x, y - 20, z);
    },
    setHour(hour) {
      const now = lightAt(hour);
      light.hour = ((hour % 24) + 24) % 24;
      light.night = now.night;
      from = now.from;
      /** For the haze and the shafts of light: which way the light travels, the haze's colour, and how low the sun is. */
      light.travels = [-from[0], -from[1], -from[2]];
      light.haze = now.haze.map((v) => linear(v / 255));
      light.low = now.night ? 0 : 1 - Math.min(1, from[1] / 0.75);
      disc.setScale(now.night ? 11 : 15);
      const glare = now.night ? [2.2, 2.4, 2.9] : [7, 5.6 - light.low * 2, 3.8 - light.low * 2.6];
      glare.forEach((v, i) => (discMaterial.color[i] = v));
      stars.visible = now.night || light.hour > 19 || light.hour < 5.4;
      now.light.forEach((v, i) => (sun.color[i] = linear(v / 255)));
      sun.intensity = now.sun * sunScale;
      now.sky.forEach((v, i) => (hemisphere.color[i] = linear(v / 255)));
      hemisphere.intensity = now.fill * fillScale;
      scene.fog = { ...scene.fog, color: now.haze.map((v) => linear(v / 255)) };
      // The sky is repainted only when the hour has moved enough to show.
      if (Math.abs(light.hour - painted) > 0.12) {
        painted = light.hour;
        const old = scene.background;
        const sky = skyOf(now.top, now.rim, now.below);
        scene.background = sky;
        scene.environment = sky;
        old?.dispose?.();
      }
      light.aim(...at);
    },
  };
  scene.environmentIntensity = 0.4 * fillScale;
  light.setHour(light.hour);
  return light;
}
