// 舞台：3D 程序、场景、天光、带阴影的日光、后期（泛光、描边、色调），以及斜 45 度俯瞰棋盘的镜头。镜头盯住棋盘上的一点，
// 可平移、缩放、按 90 度转向，平滑地飞向某格；屏幕上的点能换成棋盘上的格子。
// The stage: the 3D app, the scene, sky light, sunlight with shadows, post-processing (bloom, outlines, grading), and
// the camera looking down on the board at 45 degrees. It keeps a point of the board in view; it pans, zooms, turns in
// quarter steps and glides to a tile; a point on the screen becomes a tile of the board.
import { createWorld3DApp } from '@egret/engine/webgpu/world3d';
import { Raycaster3D, Scene3D, createDirectionalLight3D, createGradientCubeTexture3D, createHemisphereLight3D, createPerspectiveCamera3D } from '@egret/engine/world3d';

/** World units per tile. */
export const TILE = 2;
/** The layer bit of things traced with an ink outline (units and buildings). */
export const INK = 2;

export const LOOKS = {
  meadow: { top: [86, 150, 222], horizon: [196, 224, 242], bottom: [120, 160, 200], sun: [1, 0.95, 0.86], sky: [0.7, 0.78, 0.92], ground: [0.5, 0.46, 0.38] },
  coast: { top: [70, 150, 220], horizon: [205, 232, 246], bottom: [90, 150, 200], sun: [1, 0.96, 0.9], sky: [0.72, 0.82, 0.95], ground: [0.45, 0.5, 0.48] },
  highland: { top: [120, 130, 200], horizon: [236, 208, 190], bottom: [130, 130, 160], sun: [1, 0.88, 0.74], sky: [0.74, 0.74, 0.9], ground: [0.5, 0.42, 0.38] }
};

/** Start the 3D world on `canvas`. */
export async function createStage(canvas, { quality, backend = 'webgl2', onError } = {}) {
  const app = await createWorld3DApp(canvas, {
    backend,
    toneMapping: 'aces',
    exposure: 0.95,
    ...(quality ? { quality } : {}),
    onError: (cause) => (onError ? onError(cause) : console.error(cause))
  });
  const scene = new Scene3D();
  const camera = createPerspectiveCamera3D({ fov: 26, near: 1, far: 600 });
  scene.addChild(camera);
  const sky = createHemisphereLight3D({ color: [0.7, 0.78, 0.92], groundColor: [0.5, 0.46, 0.38], intensity: 0.42 });
  scene.addChild(sky);
  const sun = createDirectionalLight3D({ color: [1, 0.95, 0.86], intensity: 1.55, castShadow: app.quality !== 'low' });
  if (sun.shadow) {
    sun.shadow.cascades = 1;
    sun.shadow.cascadeDistance = 120;
    sun.shadow.bias = 0.0008;
    sun.shadow.normalBias = 0.04;
    sun.shadow.radius = 1.2;
  }
  scene.addChild(sun);

  const post = app.renderer.postProcess;
  if (post) {
    Object.assign(post, {
      enabled: app.quality !== 'low',
      bloom: true,
      bloomThreshold: 1.25,
      bloomKnee: 0.4,
      bloomIntensity: 0.22,
      fxaa: true,
      ssao: false,
      saturation: 1.0,
      contrast: 1.04,
      brightness: 1.0,
      vignette: 0.14,
      outlineLayers: INK,
      outlineColor: [0.06, 0.04, 0.08],
      outlineThickness: app.quality === 'high' ? 2 : 1.5
    });
  }

  /** Paint the sky and the light for a map's look. */
  function setLook(name) {
    const look = LOOKS[name] ?? LOOKS.meadow;
    scene.background = createGradientCubeTexture3D(look.top, look.horizon, look.bottom, 32);
    scene.environment = scene.background;
    scene.environmentIntensity = 0.08;
    sky.color.set(look.sky);
    sky.groundColor?.set?.(look.ground);
    sun.color.set(look.sun);
  }

  // ---- the camera ----
  const view = { x: 0, z: 0, d: 60, tx: 0, tz: 0, td: 60, yaw: Math.PI / 4, tyaw: Math.PI / 4, quarter: 0, pitch: 0.82 };
  let bounds = { w: 16, h: 12 };
  const ZOOM = { near: 12, far: 110 };
  function place() {
    const ox = Math.sin(view.yaw) * Math.cos(view.pitch),
      oz = Math.cos(view.yaw) * Math.cos(view.pitch);
    camera.setPosition(view.x + ox * view.d, Math.sin(view.pitch) * view.d, view.z + oz * view.d);
    camera.lookAt(view.x, 0, view.z);
    sun.setPosition(view.x + 30, 60, view.z - 10);
    sun.lookAt(view.x, 0, view.z);
    if (sun.shadow) sun.shadow.cascadeDistance = view.d * 1.6 + 20;
  }
  const raycaster = new Raycaster3D();
  const rig = {
    view,
    /** The board's size in tiles, so the view stays over it. */
    setBounds(w, h) {
      bounds = { w, h };
      const fit = Math.max(w, h) * TILE * 2.6;
      ZOOM.far = Math.max(70, fit * 1.15);
      view.td = Math.min(ZOOM.far, Math.max(ZOOM.near, fit * 0.5));
    },
    update(seconds) {
      const k = 1 - Math.exp(-seconds * 7);
      view.x += (view.tx - view.x) * k;
      view.z += (view.tz - view.z) * k;
      view.d += (view.td - view.d) * k;
      view.yaw += (view.tyaw - view.yaw) * (1 - Math.exp(-seconds * 9));
      place();
    },
    snap() {
      view.x = view.tx;
      view.z = view.tz;
      view.d = view.td;
      view.yaw = view.tyaw;
      place();
    },
    /** Look at the centre of tile (x, y). */
    focus(x, y, d) {
      const p = tileCentre(x, y, bounds);
      view.tx = p.x;
      view.tz = p.z;
      if (d !== undefined) view.td = Math.max(ZOOM.near, Math.min(ZOOM.far, d));
    },
    panBy(dx, dz) {
      // Pan in screen directions: right and up as the camera sees them.
      const c = Math.cos(view.yaw),
        s = Math.sin(view.yaw);
      view.tx += dx * c - dz * s;
      view.tz += -dx * s - dz * c;
      const half = { x: (bounds.w * TILE) / 2 + 4, z: (bounds.h * TILE) / 2 + 4 };
      view.tx = Math.max(-half.x, Math.min(half.x, view.tx));
      view.tz = Math.max(-half.z, Math.min(half.z, view.tz));
    },
    zoomBy(factor) {
      view.td = Math.max(ZOOM.near, Math.min(ZOOM.far, view.td / factor));
    },
    /** Turn the view a quarter round (1 clockwise, -1 anticlockwise). */
    turn(step) {
      view.quarter = (view.quarter + step + 4) % 4;
      view.tyaw += (step * Math.PI) / 2;
    },
    /** The grid step that the screen's up, right, down and left mean now. */
    screenSteps() {
      // With the camera to the south-east, screen-up is north and screen-right is east, each turned 45°.
      const base = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0]
      ];
      return base.map((_, i) => base[(i + 4 - view.quarter) % 4]);
    },
    /** The tile under a point of the canvas (CSS pixels from its corner), or null. */
    tileAt(px, py, width, height) {
      raycaster.setFromCamera((px / width) * 2 - 1, 1 - (py / height) * 2, camera);
      const o = raycaster.origin,
        d = raycaster.direction;
      if (d[1] >= -1e-4) return null;
      const t = (0 - o[1]) / d[1];
      const x = o[0] + d[0] * t,
        z = o[2] + d[2] * t;
      const tx = Math.floor(x / TILE + bounds.w / 2),
        ty = Math.floor(z / TILE + bounds.h / 2);
      if (tx < 0 || ty < 0 || tx >= bounds.w || ty >= bounds.h) return null;
      return { x: tx, y: ty };
    }
  };
  place();
  return { app, scene, camera, sun, sky, rig, setLook, renderer: app.renderer, quality: app.quality };
}

/** The world point at the centre of tile (x, y) on a board `bounds` tiles across. */
export function tileCentre(x, y, bounds) {
  return { x: (x + 0.5 - bounds.w / 2) * TILE, z: (y + 0.5 - bounds.h / 2) * TILE };
}
