import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
const {
  Mesh3D, Object3D, Scene3D, createBoxGeometry3D, createPerspectiveCamera3D, createStandardMaterial3D,
} = await import('@egret/engine/world3d');
const { addTrackModel, createTrackModelBatch, describeTrackModel, loadTrackModels } = await import('../src/track-models.mjs');
const { createRace } = await import('../src/sim.mjs');
const { createTrack } = await import('../src/track.mjs');
const { createView } = await import('../src/view.mjs');

function example() {
  const scene = new Scene3D();
  const parent = new Object3D().setPosition(2, 4, -1);
  const material = createStandardMaterial3D({ color: 0xaa3377 });
  const mesh = new Mesh3D(createBoxGeometry3D({ width: 2, height: 4, depth: 1 }), material);
  parent.addChild(mesh);
  scene.addChild(parent);
  return { scene, material };
}

test('a rotated GLB keeps its material and seats its foot at the native slot', () => {
  const { scene, material } = example();
  const asset = describeTrackModel(scene, { yaw: Math.PI / 2 });
  const slot = [-2, 1, -2, 2, 9, 2];
  const parent = new Object3D();
  const root = addTrackModel(parent, asset, slot, { shadow: false });
  parent.updateWorldMatrices();
  assert.equal(parent.children[0], root);
  assert.equal(root.children[0].material, material);
  assert.equal(root.children[0].castShadow, false);
  const bottom = root.children[0].localToWorld(new Float32Array(3), [0, -2, 0]);
  assert.ok(Math.abs(bottom[0]) < 0.0001);
  assert.ok(Math.abs(bottom[1] - 1) < 0.0001);
  assert.ok(Math.abs(bottom[2]) < 0.0001);
});

test('instance batches apply the fitted part transform and keep counts in step', () => {
  const parent = new Object3D();
  const asset = describeTrackModel(example().scene);
  const batch = createTrackModelBatch(parent, asset, [-1, 0, -1, 1, 4, 1], 2);
  batch.setTransformAt(0, [5, 2, 3], [0, 0, 0, 1], 1);
  batch.count = 1;
  const mesh = parent.children[0];
  assert.equal(mesh.count, 1);
  assert.equal(mesh.isInstanced, true);
  assert.deepEqual(Array.from(mesh.instanceMatrices.slice(12, 15)), [5, 4, 3]);
});

test('only manifest-listed roles load and one failed model preserves other assets', async t => {
  const { scene } = example();
  let disposed = 0;
  const calls = [];
  t.mock.method(globalThis, 'fetch', async () => Response.json({
    'lion-kart': { file: 'lion-kart.glb' }, 'lion-driver': { file: 'lion-driver.glb' },
    'panda-kart': { file: 'kart.glb' }, 'guardian-lion': { file: 'lion.glb' },
    pagoda: { file: '../no.glb' }, irrelevant: { file: 'other.glb' }
  }));
  const bundle = await loadTrackModels(async url => {
    calls.push(url.pathname.split('/').at(-1));
    if (url.pathname.endsWith('lion.glb')) throw Error('Cannot decode');
    return { scene, dispose() { disposed++; } };
  });
  assert.deepEqual(calls.sort(), ['kart.glb', 'lion-driver.glb', 'lion-kart.glb', 'lion.glb']);
  assert.deepEqual(Object.keys(bundle.models).sort(), ['lion-driver', 'lion-kart', 'panda-kart']);
  assert.match(bundle.failures['guardian-lion'], /Cannot decode/);
  assert.match(bundle.failures.pagoda, /manifest/i);
  bundle.dispose();
  bundle.dispose();
  assert.equal(disposed, 3);
});

test('race and selection mount model slots without moving pickups or obstacles', t => {
  const original = globalThis.document;
  const ink = new Proxy({
    getImageData: (_, __, w, h) => ({ data: new Uint8Array(w * h * 4) }),
  }, { get: (context, key) => context[key] ?? (() => {}) });
  globalThis.document = { createElement: () => ({ getContext: () => ink }) };
  t.after(() => { if (original === undefined) delete globalThis.document; else globalThis.document = original; });
  const scene = new Scene3D(), camera = createPerspectiveCamera3D({}), track = createTrack();
  const art = describeTrackModel(example().scene);
  const roles = ['lion-kart', 'lion-head', 'panda-kart', 'panda-driver', 'monkey-kart', 'monkey-head', 'paper-lantern', 'guardian-lion', 'pagoda', 'cloud-gate', 'drum', 'start-gate'];
  const trackModels = Object.fromEntries(roles.map(name => [name, { ...art, name }]));
  const view = createView(scene, camera, track, { trackModels });
  const demo = createRace({ track, entries: [{ racer: 0, human: false }, { racer: 1, human: false }] });
  view.attach(demo);
  view.update(1 / 60, demo, 'title');
  const race = createRace({ track, entries: [{ racer: 0, human: true }, { racer: 1, human: false }, { racer: 2, human: false }] });
  const obstacles = structuredClone({ drums: race.drums, boxes: race.boxes, lions: track.lions, gates: track.gates });
  view.attach(race);
  view.update(1 / 60, race, 'race');
  for (const role of roles) assert.ok(scene.getObjectByName(role), role);
  assert.ok(scene.getObjectByName('Start gate plaque'));
  assert.equal(scene.getObjectByName('drum').count, race.drums.length);
  assert.deepEqual({ drums: race.drums, boxes: race.boxes, lions: track.lions, gates: track.gates }, obstacles);
  view.showcase(0);
  view.update(1 / 60, race, 'select');
  let lionKarts = 0;
  scene.traverse(node => { if (node.name === 'lion-kart') lionKarts++; });
  assert.equal(lionKarts, 2, 'both the default racing kart and selection preview use the asset');
});
