// A look at one character and his motion: ?who=yulin&set=high&clip=walk&frame=12 (a still) or &play (moving).
// For checking models, materials and retargeted clips in the engine's own renderer.
import { Scene3D, Object3D, Mesh3D, createPerspectiveCamera3D, createDirectionalLight3D, createHemisphereLight3D, createStandardMaterial3D, createPlaneGeometry3D, loadGltf3D } from '@egret/engine/world3d';
import { createWorld3DApp } from '@egret/engine/webgl2/world3d';
import { createAnimator, loadMotion } from '../src/view/motion.mjs';

const params = new URLSearchParams(location.search);
const who = params.get('who') ?? 'yulin',
  set = params.get('set') ?? 'high';
const canvas = document.querySelector('#stage');
const app = await createWorld3DApp(canvas, { quality: 'high', dynamicResolution: false });
const scene = new Scene3D();
scene.background = [0.55, 0.62, 0.7];
const camera = createPerspectiveCamera3D({ fov: 32, near: 0.1, far: 100 });
scene.addChild(camera);
scene.addChild(createHemisphereLight3D({ color: 0xc8d8f0, groundColor: 0x5a4a3a, intensity: 0.75 }));
const sun = createDirectionalLight3D({ color: 0xfff0dc, intensity: 2.6, castShadow: true });
sun.setPosition(4, 8, 5);
sun.lookAt(0, 0.8, 0);
Object.assign(sun.shadow, { mapSize: 2048, extent: 4, near: 0.5, far: 30 });
scene.addChild(sun);
const ground = new Mesh3D(createPlaneGeometry3D({ width: 30, height: 30 }), createStandardMaterial3D({ color: 0x8a7d68, roughness: 0.95 }));
ground.setRotation(-Math.PI / 2, 0, 0);
ground.receiveShadow = true;
scene.addChild(ground);

const bytes = new Uint8Array(await (await fetch(`../assets/characters/${who}-${set}.glb`)).arrayBuffer());
const asset = await loadGltf3D(bytes, {
  decodeImage: async ({ bytes, mimeType }) => createImageBitmap(new Blob([bytes], { type: mimeType }), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
});
const holder = new Object3D();
holder.addChild(asset.scene);
scene.addChild(holder);
asset.scene.traverse((n) => {
  if (n instanceof Mesh3D) {
    n.castShadow = true;
    n.receiveShadow = true;
  }
});
const motion = await loadMotion(new URL(`../assets/motion/${params.get('motion') ?? 'full'}`, import.meta.url));
const animator = createAnimator(asset.scene, motion, { height: Number(params.get('height') ?? 1.78) });
holder.setScale(animator.scale, animator.scale, animator.scale);
holder.setRotation(0, animator.turn + Number(params.get('yaw') ?? 0), 0);
let clip = params.get('clip') ?? motion.clips[0].name;
let fixed = params.has('frame') ? Number(params.get('frame')) : null;
let time = 0;
let dist = Number(params.get('dist') ?? 4.2),
  around = Number(params.get('around') ?? 0.5);
window.look = {
  ready: false,
  motion,
  animator,
  /** Show one frame of a clip, and the camera from `angle` radians round. */
  set(name, frame, angle = around, far = dist) {
    clip = name;
    fixed = frame;
    around = angle;
    dist = far;
  }
};
app.show(scene, camera, {
  onUpdate(dt) {
    time += params.has('play') ? dt : 0;
    const c = motion.clip(clip);
    const t = fixed !== null ? fixed / c.fps : time;
    animator.pose(clip, t);
    camera.setPosition(Math.sin(around) * dist, 1.15, Math.cos(around) * dist);
    camera.lookAt(0, 0.95, 0);
    window.look.ready = true;
    window.look.frame = Math.floor(t * c.fps) % c.frames;
  }
});
