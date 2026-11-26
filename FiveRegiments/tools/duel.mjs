// Two (or three) brains fight while the figures follow: ?men=yulin,tiger&level=0.6&seed=3&set=mid&cam=side
// For checking figures, motion, weapons and lines of cut together. `window.duel.at(seconds)` jumps the fight on.
import { Scene3D, Mesh3D, createPerspectiveCamera3D, createDirectionalLight3D, createHemisphereLight3D, createStandardMaterial3D, createPlaneGeometry3D, loadGltf3D } from '@egret/engine/world3d';
import { createWorld3DApp } from '@egret/engine/webgl2/world3d';
import { loadMotion } from '../src/view/motion.mjs';
import { createFigure } from '../src/view/figure.mjs';
import { createFight, step, TICK } from '../src/sim/fight.mjs';
import { createBrains } from '../src/sim/brain.mjs';

const params = new URLSearchParams(location.search);
const men = (params.get('men') ?? 'yulin,tiger').split(',');
const set = params.get('set') ?? 'mid';
const canvas = document.querySelector('#stage');
const app = await createWorld3DApp(canvas, { quality: params.get('quality') ?? 'high', dynamicResolution: false });
const scene = new Scene3D();
scene.background = [0.55, 0.62, 0.7];
const camera = createPerspectiveCamera3D({ fov: 40, near: 0.1, far: 200 });
scene.addChild(camera);
scene.addChild(createHemisphereLight3D({ color: 0xc8d8f0, groundColor: 0x5a4a3a, intensity: 0.8 }));
const sun = createDirectionalLight3D({ color: 0xfff0dc, intensity: 2.6, castShadow: true });
sun.setPosition(6, 12, 7);
sun.lookAt(0, 0, 0);
Object.assign(sun.shadow, { mapSize: 2048, extent: 10, near: 0.5, far: 40 });
scene.addChild(sun);
const ground = new Mesh3D(createPlaneGeometry3D({ width: 40, height: 40 }), createStandardMaterial3D({ color: 0x8a7d68, roughness: 0.95 }));
ground.setRotation(-Math.PI / 2, 0, 0);
ground.receiveShadow = true;
scene.addChild(ground);

const decode = async ({ bytes, mimeType }) => createImageBitmap(new Blob([bytes], { type: mimeType }), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
async function body(who) {
  const bytes = new Uint8Array(await (await fetch(`../assets/characters/${who}-${set}.glb`)).arrayBuffer());
  const asset = await loadGltf3D(bytes, { decodeImage: decode });
  return { scene: asset.scene, dispose: () => asset.dispose() };
}
const game = createFight({ hero: { regiment: men[0] }, foes: men.slice(1).map((regiment) => ({ regiment })), seed: Number(params.get('seed') ?? 3) });
const brains = createBrains(game, { level: Number(params.get('level') ?? 0.6), hero: true });
const figures = [];
for (const man of game.men) {
  const motion = await loadMotion(new URL(`../assets/motion/${man.regiment}`, import.meta.url));
  figures.push(createFigure({ regiment: man.regiment, body: await body(man.regiment), motion, world: scene, height: man.regiment === 'vanguard' ? 1.86 : 1.8 }));
}
let carry = 0,
  paused = params.has('still');
const log = [];
function advance(dt) {
  carry += dt;
  while (carry >= TICK) {
    carry -= TICK;
    const inputs = {};
    for (const [id, b] of Object.entries(brains)) inputs[id] = b.think(game, TICK);
    for (const e of step(game, inputs)) {
      log.push(e);
      if (e.type === 'hit' && !e.quiet) figures[game.men.findIndex((m) => m.id === e.who)]?.struck(e.heavy ?? 0);
    }
  }
}
window.duel = {
  ready: false,
  game,
  log,
  /** Run the fight on to `seconds` at once (figures keep up at 60 frames a second). */
  at(seconds) {
    while (game.time < seconds && !game.over) {
      advance(TICK);
      game.men.forEach((m, i) => figures[i].update(m, game, TICK));
    }
  },
  pause(v) {
    paused = v;
  }
};
// ?pose=guard:R or ?pose=swing:O:0.3 freezes everyone in one pose, side by side, for looking at.
const posed = params.get('pose');
if (posed) {
  game.men.forEach((m, i) => {
    m.x = (i - (game.men.length - 1) / 2) * 2.2;
    m.z = 0;
    m.face = 0;
  });
}
function holdPose(man) {
  const [kind, line, at] = posed.split(':');
  man.vx = man.vz = 0;
  man.guard = kind === 'guard';
  man.guardLine = line ?? 'R';
  man.act = null;
  man.draw = kind === 'draw' ? { t: Number(line ?? 1) } : null;
  if (kind === 'swing') {
    const blow = man.r.blows[line];
    const t = Number(at ?? 0.2);
    man.act = { kind: 'swing', line, t, wind: blow.wind, held: 0, struck: t > blow.wind, strikeAt: blow.wind, recover: blow.recover, blow, reach: blow.reach };
  }
  if (kind === 'skill') man.act = { kind: 'skill', id: line, t: Number(at ?? 0.3) };
}
app.show(scene, camera, {
  onUpdate(dt) {
    if (posed) {
      game.men.forEach((m, i) => {
        holdPose(m);
        figures[i].update(m, game, 1 / 60);
      });
      camera.setPosition(Number(params.get('cx') ?? 0), Number(params.get('cy') ?? 1.5), Number(params.get('cz') ?? 5.5));
      camera.lookAt(0, 1.1, 0);
      window.duel.ready = true;
      return;
    }
    if (!paused) advance(Math.min(dt, 0.05));
    game.men.forEach((m, i) => figures[i].update(m, game, paused ? 0 : Math.min(dt, 0.05)));
    const [a, b] = game.men;
    const mx = (a.x + b.x) / 2,
      mz = (a.z + b.z) / 2;
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const d = Math.hypot(dx, dz) || 1;
    const side = params.get('cam') === 'behind' ? [-dx / d * 3.2, -dz / d * 3.2] : [-dz / d * 5, dx / d * 5];
    camera.setPosition(mx + side[0], 1.7, mz + side[1]);
    camera.lookAt(mx, 1.1, mz);
    window.duel.ready = true;
  }
});
