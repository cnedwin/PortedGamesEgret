// 舞台：3D 程序、场景、天光与日光（中高画质有阴影）、远处的薄雾、后期（泛光、色调、暗角），以及俯瞰天下的镜头：
// 盯住地上一点，拉远时抬高、拉近时放低视角，可平移、缩放、平滑飞到某处；屏幕上的点可以换成地上的点。
// The stage: the 3D app, the scene, sky light and sunlight (with shadows at medium and high quality), a haze in the
// distance, post-processing (bloom, grading, vignette), and the camera over the realm: it keeps a point on the ground in
// view, rising to look down as it draws back and lowering as it comes near; it pans, zooms and glides smoothly to a
// place; a point on the screen can be turned into a point on the ground.
import { createWorld3DApp } from '@egret/engine/webgl2/world3d';
import { Raycaster3D, Scene3D, createDirectionalLight3D, createGradientCubeTexture3D, createHemisphereLight3D, createPerspectiveCamera3D } from '@egret/engine/world3d';
import { MAP } from '../data/map.mjs';

export const ZOOM = { near: 20, far: 300 };

/** Start the 3D world on a canvas. */
export async function createStage(canvas, { quality, onError } = {}) {
  const app = await createWorld3DApp(canvas, {
    toneMapping: 'aces',
    exposure: 0.85,
    ...(quality ? { quality } : {}),
    onError: (cause) => (onError ? onError(cause) : console.error(cause))
  });
  const scene = new Scene3D();
  const camera = createPerspectiveCamera3D({ fov: 38, near: 1, far: 2400 });
  scene.addChild(camera);
  scene.background = createGradientCubeTexture3D([92, 128, 168], [196, 206, 210], [120, 124, 112], 32);
  scene.environment = scene.background;
  scene.environmentIntensity = 0.18;
  const hazeColour = [0.56, 0.62, 0.66];
  scene.fog = { kind: 'linear', color: hazeColour, near: 260, far: 900 };

  const sky = createHemisphereLight3D({ color: [0.72, 0.78, 0.86], groundColor: [0.42, 0.38, 0.3], intensity: 0.3 });
  scene.addChild(sky);
  const sun = createDirectionalLight3D({ color: [1, 0.94, 0.84], intensity: 2.9, castShadow: app.quality !== 'low' });
  sun.shadow.cascades = 3;
  sun.shadow.cascadeDistance = 220;
  sun.shadow.cascadeLambda = 0.6;
  sun.shadow.bias = 0.0006;
  sun.shadow.normalBias = 0.05;
  sun.shadow.radius = 1.5;
  scene.addChild(sun);

  const post = app.renderer.postProcess;
  if (post && app.quality !== 'low') {
    Object.assign(post, { bloomThreshold: 1.3, bloomIntensity: 0.32, saturation: 1.08, contrast: 1.06, vignette: 0.22, ssaoRadius: 0.9, ssaoIntensity: 0.7 });
  }

  // ——— The camera over the realm ———
  const view = { x: 1300, z: 1000, d: 160, tx: 1300, tz: 1000, td: 160, glide: 0 };
  /** How far the camera tilts: steep when far, lower when near. */
  const pitchOf = (d) => (64 - 22 * (1 - (d - ZOOM.near) / (ZOOM.far - ZOOM.near)) ** 1.6) * (Math.PI / 180);
  let groundAt = () => 0;
  function place() {
    const pitch = pitchOf(view.d);
    const gy = groundAt(view.x, view.z);
    const cy = gy + Math.sin(pitch) * view.d,
      cz = view.z + Math.cos(pitch) * view.d;
    camera.setPosition(view.x, cy, cz);
    camera.lookAt(view.x, gy, view.z);
    // The sun follows the view so its shadows cover what is seen.
    sun.setPosition(view.x - 230, gy + 210, view.z + 120);
    sun.lookAt(view.x, gy, view.z);
    sun.shadow.cascadeDistance = Math.min(320, view.d * 2.2 + 40);
    scene.fog = { kind: 'linear', color: hazeColour, near: view.d * 1.4 + 60, far: view.d * 3.6 + 260 };
  }
  const clampView = (v) => {
    v.x = Math.max(0, Math.min(MAP.width, v.x));
    v.z = Math.max(0, Math.min(MAP.height, v.z));
  };
  const raycaster = new Raycaster3D();
  const rig = {
    view,
    /** The ground height the camera should look at (the land's, once it is made). */
    setGround(fn) {
      groundAt = fn;
    },
    /** Move toward the target each frame; a glide eases, otherwise the view follows closely. */
    update(seconds) {
      const k = view.glide > 0 ? 1 - Math.exp(-seconds * 3.2) : 1 - Math.exp(-seconds * 14);
      view.x += (view.tx - view.x) * k;
      view.z += (view.tz - view.z) * k;
      view.d += (view.td - view.d) * k;
      if (view.glide > 0) view.glide = Math.max(0, view.glide - seconds);
      place();
    },
    snap() {
      view.x = view.tx;
      view.z = view.tz;
      view.d = view.td;
      place();
    },
    panBy(dx, dz) {
      view.glide = 0;
      view.tx += dx;
      view.tz += dz;
      const t = { x: view.tx, z: view.tz };
      clampView(t);
      view.tx = t.x;
      view.tz = t.z;
    },
    zoomBy(factor, about) {
      view.glide = 0;
      const before = view.td;
      view.td = Math.max(ZOOM.near, Math.min(ZOOM.far, view.td / factor));
      // Zoom toward the point under the pointer.
      if (about && before !== view.td) {
        const k = 1 - view.td / before;
        view.tx += (about.x - view.tx) * k;
        view.tz += (about.z - view.tz) * k;
      }
    },
    glideTo(x, z, d = view.td, seconds = 1.2) {
      view.tx = x;
      view.tz = z;
      view.td = Math.max(ZOOM.near, Math.min(ZOOM.far, d));
      view.glide = seconds;
    },
    jumpTo(x, z, d = view.td) {
      view.tx = x;
      view.tz = z;
      view.td = Math.max(ZOOM.near, Math.min(ZOOM.far, d));
      rig.snap();
    },
    /** The ground point under a point of the canvas (CSS pixels from its corner), or null. */
    groundOf(px, py, width, height, heightAt) {
      raycaster.setFromCamera((px / width) * 2 - 1, 1 - (py / height) * 2, camera);
      const o = raycaster.origin,
        d = raycaster.direction;
      if (d[1] >= -1e-4) return null;
      // March to the flat plane at the view's ground height, then refine against the land twice.
      let y = groundAt(view.x, view.z),
        t = (y - o[1]) / d[1];
      for (let i = 0; i < 3; i++) {
        const x = o[0] + d[0] * t,
          z = o[2] + d[2] * t;
        y = heightAt(x, z);
        t = (Math.max(y, 0) - o[1]) / d[1];
      }
      return { x: o[0] + d[0] * t, z: o[2] + d[2] * t };
    }
  };
  place();
  return { app, scene, camera, sun, sky, rig, haze: hazeColour };
}
