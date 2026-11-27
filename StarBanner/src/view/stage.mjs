// 舞台：3D 程序、场景、天光、带阴影的日光、后期（泛光、描边、色调），以及斜 45 度俯瞰棋盘的镜头。镜头盯住棋盘上的一点，
// 可平移、缩放、按 90 度转向，平滑地飞向某格；屏幕上的点能换成棋盘上的格子。
// The stage: the 3D app, the scene, sky light, sunlight with shadows, post-processing (bloom, outlines, grading), and
// the camera looking down on the board at 45 degrees. It keeps a point of the board in view; it pans, zooms, turns in
// quarter steps and glides to a tile; a point on the screen becomes a tile of the board.
// The same high-level app dynamically selects either 3D backend; the overlay is always WebGL2.
import { createWorld3DApp } from '@egret/engine/webgl2/world3d';
import { Mesh3D, Raycaster3D, Scene3D, createDirectionalLight3D, createGradientCubeTexture3D, createHemisphereLight3D, createPerspectiveCamera3D, projectToViewport3D } from '@egret/engine/world3d';

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
  const renderer = app.renderer;
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

  const post = renderer.postProcess;
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

  /** Link scene programs before their first draw on browsers that support asynchronous shader compilation. */
  async function preparePrograms() {
    if (app.backend !== 'webgl2' || !renderer.context.getExtension('KHR_parallel_shader_compile')) return;
    const receiveShadows = renderer.shadowsEnabled && sun.castShadow;
    const environment = Boolean(scene.environment);
    const fog = Boolean(scene.fog);
    const requests = [];
    scene.traverse((mesh) => {
      if (!(mesh instanceof Mesh3D)) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        requests.push({ mesh, material, environment, fog, receiveShadows });
        if (receiveShadows && mesh.castShadow) requests.push({ mesh, material, pass: 'shadow' });
      }
    });
    await renderer.preparePrograms(requests, { includeAutoInstancing: true });
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
  const limitPan = () => {
    const x = (bounds.w * TILE) / 2 + 4, z = (bounds.h * TILE) / 2 + 4;
    view.tx = Math.max(-x, Math.min(x, view.tx));
    view.tz = Math.max(-z, Math.min(z, view.tz));
  };
  function groundAt(px, py, width, height) {
    if (!width || !height) return null;
    raycaster.setFromCamera((px / width) * 2 - 1, 1 - (py / height) * 2, camera);
    const { origin, direction } = raycaster;
    if (direction[1] >= -1e-4) return null;
    const t = -origin[1] / direction[1];
    return { x: origin[0] + direction[0] * t, z: origin[2] + direction[2] * t };
  }
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
      limitPan();
    },
    zoomBy(factor) {
      view.td = Math.max(ZOOM.near, Math.min(ZOOM.far, view.td / factor));
    },
    zoomAt(factor, px, py, width, height) {
      const anchor = groundAt(px, py, width, height);
      const previous = view.td;
      rig.zoomBy(factor);
      if (anchor) {
        const shift = (previous - view.td) / view.d;
        view.tx += (anchor.x - view.x) * shift;
        view.tz += (anchor.z - view.z) * shift;
        limitPan();
      }
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
      const hit = groundAt(px, py, width, height);
      if (!hit) return null;
      const tx = Math.floor(hit.x / TILE + bounds.w / 2),
        ty = Math.floor(hit.z / TILE + bounds.h / 2);
      if (tx < 0 || ty < 0 || tx >= bounds.w || ty >= bounds.h) return null;
      return { x: tx, y: ty };
    }
  };
  place();
  const projectPoint = (point,width,height) => projectToViewport3D(camera,point,width,height);
  const projectTile = (x,y,width,height) => {
    const point=tileCentre(x,y,bounds);
    return projectPoint([point.x,0,point.z],width,height);
  };
  return { app, scene, camera, sun, sky, rig, setLook, preparePrograms, projectPoint, projectTile, renderer, quality: app.quality };
}

/** The world point at the centre of tile (x, y) on a board `bounds` tiles across. */
export function tileCentre(x, y, bounds) {
  return { x: (x + 0.5 - bounds.w / 2) * TILE, z: (y + 0.5 - bounds.h / 2) * TILE };
}
