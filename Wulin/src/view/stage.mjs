// The 3D stage: one canvas, one renderer, and whichever scene is showing.
//
// A scene here is `{ scene, camera, update(dt, time) }`. The game has two: the
// sect's seat (seat.mjs) and a fight (arena.mjs). `show` swaps between them.
import { createEngine } from '@egret/engine';
import { Scene3D, createAmbientLight3D, createDirectionalLight3D, createHemisphereLight3D, createPerspectiveCamera3D } from '@egret/engine/world3d';
import { createOrbit } from './orbit.mjs';
import { linear, skyOf } from './shapes.mjs';

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
    saturation: 1.12,
    contrast: 1.05,
    vignette: 0.16,
    ssao: quality === 'high',
    ssaoRadius: 0.7,
    ssaoIntensity: 0.7,
  });

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
  const view = backend.createWorld3DView(engine, scope, {
    renderer,
    scene: blank.scene,
    camera: blank.camera,
    maxPixelRatio: quality === 'high' ? 1.5 : 1,
    onUpdate(dt, time) {
      stage.frames++;
      if (!stage.paused) current.update(Math.min(dt, 0.1), time);
    },
    onError,
  });
  backend.startWorld3DLoop(engine, onError);
  return stage;
}

/**
 * Sky, fog and the three lights every scene shares.
 * @param mood 'day' for the seat, 'dusk' for a fight
 * @returns the sun, so a scene can aim its shadows at what it is showing
 */
export function lightScene(scene, mood = 'day', quality = 'high') {
  const dusk = mood === 'dusk';
  const sky = dusk ? skyOf([70, 84, 150], [246, 196, 150], [120, 104, 96]) : skyOf([58, 118, 214], [222, 234, 246], [128, 148, 120]);
  scene.background = sky;
  scene.environment = sky;
  scene.environmentIntensity = 0.4;
  const haze = dusk ? [0.95, 0.8, 0.68] : [0.84, 0.9, 0.96];
  scene.fog = { kind: 'linear', color: haze.map(linear), near: 150, far: 480 };
  scene.addChild(createHemisphereLight3D({ color: dusk ? 0xffe9d6 : 0xd6e8ff, groundColor: 0x7c8f5e, intensity: 0.5 }));
  scene.addChild(createAmbientLight3D({ intensity: 0.12 }));
  const sun = createDirectionalLight3D({ color: dusk ? 0xffdcb0 : 0xfff0d2, intensity: 1.55, castShadow: quality !== 'low' });
  if (quality !== 'low') Object.assign(sun.shadow, { cascades: 2, cascadeDistance: 60, mapSize: quality === 'high' ? 2048 : 1024 });
  scene.addChild(sun);
  const aim = (x, y, z) => {
    sun.setPosition(x + (dusk ? 55 : 35), y + (dusk ? 38 : 70), z + 30);
    sun.lookAt(x, y, z);
  };
  aim(0, 0, 0);
  return { sun, aim };
}
