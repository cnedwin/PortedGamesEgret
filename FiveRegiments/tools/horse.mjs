// A look at the war horse and its gaits: ?speed=9&t=1.2 (a still after that many seconds at that pace) or &play,
// ?around=1.2 to turn round, ?rear or ?dead. For checking the model and the gaits in the engine's own renderer.
import { Scene3D, Mesh3D, createPerspectiveCamera3D, createDirectionalLight3D, createHemisphereLight3D, createStandardMaterial3D, createPlaneGeometry3D, loadGltf3D } from '@egret/engine/world3d';
import { createWorld3DApp } from '@egret/engine/webgl2/world3d';
import { createHorse } from '../src/view/horse.mjs';

const params = new URLSearchParams(location.search);
const set = params.get('set') ?? 'high';
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
Object.assign(sun.shadow, { mapSize: 2048, extent: 5, near: 0.5, far: 30 });
scene.addChild(sun);
const ground = new Mesh3D(createPlaneGeometry3D({ width: 30, height: 30 }), createStandardMaterial3D({ color: 0x8a7d68, roughness: 0.95 }));
ground.setRotation(-Math.PI / 2, 0, 0);
ground.receiveShadow = true;
scene.addChild(ground);
const file = params.get('model') ? `../assets/${params.get('model')}.glb` : `../assets/characters/horse-${set}.glb`;
const bytes = new Uint8Array(await (await fetch(file)).arrayBuffer());
const asset = await loadGltf3D(bytes, { decodeImage: async ({ bytes, mimeType }) => createImageBitmap(new Blob([bytes], { type: mimeType }), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }) });
// ?model=props/gate-mid shows any model as it is, scaled to ?height metres.
if (params.get('model')) {
  const k = Number(params.get('height') ?? 3);
  asset.scene.setScale(k, k, k);
  scene.addChild(asset.scene);
}
const horse = params.get('model') ? { update() {}, seat: () => null } : createHorse({ body: asset, world: scene });
const h = { x: 0, z: 0, face: Number(params.get('yaw') ?? 0), speed: Number(params.get('speed') ?? 0), alive: !params.has('dead') };
const rearing = params.has('rear');
for (let t = 0; t < Number(params.get('t') ?? 0); t += 1 / 60) horse.update(h, 1 / 60, { rearing });
const dist = Number(params.get('dist') ?? 6.5),
  around = Number(params.get('around') ?? 1.5707);
window.look = { ready: false };
app.show(scene, camera, {
  onUpdate(dt) {
    if (params.has('play')) horse.update(h, dt, { rearing });
    else horse.update(h, 0, { rearing });
    camera.setPosition(Math.sin(around) * dist, 1.5, Math.cos(around) * dist);
    camera.lookAt(0, 1.0, 0);
    window.look.seat = horse.seat();
    window.look.ready = true;
  }
});
