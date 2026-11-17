import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';

register('../tools/egret-resolve.mjs', import.meta.url);
const { createBoxGeometry3D, createPerspectiveCamera3D, createStandardMaterial3D, Mesh3D, Object3D, Scene3D } = await import('@egret/engine/world3d');
const { addModel, batchModels, describeModel, loadModels } = await import('../src/asset-models.mjs');
const { repeatSceneModel } = await import('../src/scene-modules.mjs');
const { createGame } = await import('../src/sim.mjs');
const { createView } = await import('../src/view.mjs');

test('shipped GLBs match every manifest part and contain their buffers and textures', async () => {
  const directory = new URL('../assets/models/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('index.json', directory), 'utf8'));
  const files = [...new Set(Object.values(manifest).map(entry => entry.file))].sort();
  assert(files.length > 0);
  assert.deepEqual((await readdir(directory)).filter(file => file.endsWith('.glb')).sort(), files);
  for (const file of files) {
    const bytes = await readFile(new URL(file, directory));
    assert.equal(bytes.toString('ascii', 0, 4), 'glTF', file);
    assert.equal(bytes.readUInt32LE(4), 2, file);
    assert.equal(bytes.readUInt32LE(8), bytes.length, file);
    assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, file);
    const model = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
    assert(model.buffers.every(buffer => !buffer.uri), file + ' has an external buffer');
    assert(model.images.every(image => !image.uri && Number.isInteger(image.bufferView)), file + ' has an external texture');
    const nodes = new Set(model.nodes.map(node => node.name));
    for (const [role, entry] of Object.entries(manifest)) {
      if (entry.file !== file) continue;
      for (const selector of Object.values(entry.parts ?? {})) {
        for (const name of [selector].flat()) assert(nodes.has(name), role + ' is missing part ' + name);
      }
    }
  }
});

function source() {
  const root = new Object3D();
  const pivot = new Object3D().setPosition(0, 0.5, 0);
  pivot.name = 'Helmet assembly';
  const box = new Mesh3D(
    createBoxGeometry3D({ width: 2, height: 1, depth: 1 }),
    createStandardMaterial3D({ color: 0xeaeaea }),
  );
  pivot.addChild(box);
  root.addChild(pivot);
  return root;
}

test('a named render part fits its joint-local bounds and keeps the source material', () => {
  const model = describeModel(source(), {
    yaw: Math.PI / 2,
    parts: { head: 'Helmet assembly' },
  });
  const root = new Object3D();
  const head = addModel(root, model.parts.head, [-1, 0, -2, 1, 2, 2], { stretch: true });
  assert.equal(head.parent, root);
  assert.equal(head.children[0].material, model.parts.head.meshes[0].material);
  root.updateWorldMatrices();
  const matrix = head.children[0].matrixWorld;
  assert(Math.abs(matrix[13] - 1) < 1e-6);
});

test('variable-size stationary props keep one draw from the same model part', () => {
  const model = describeModel(source());
  const root = new Object3D();
  batchModels(root, model, [
    { at: [5, 0, 2], slot: [-1, 0, -0.5, 1, 1, 0.5] },
    { at: [-3, 2, -5], slot: [-2, 0, -1, 2, 2, 1], yaw: Math.PI / 2 },
  ]);
  assert.equal(root.children.length, 1);
  const batch = root.children[0];
  assert.equal(batch.count, 2);
  assert.deepEqual(Array.from(batch.instanceMatrices.slice(28, 31)), [-3, 3, -5]);
});

test('an authored joint transform uses one shared scale without squeezing the part', () => {
  const model = describeModel(source());
  const root = new Object3D();
  const group = addModel(root, model, [-0.1, 0, -1, 0.1, 4, 1], {
    transform: { scale: 2, position: [3, -0.5, 7] },
  });
  assert.deepEqual(Array.from(group.scale), [2, 2, 2]);
  root.updateWorldMatrices();
  assert.deepEqual(Array.from(group.children[0].matrixWorld.slice(12, 15)), [3, 0.5, 7]);
});

test('props preserve their aspect ratios by default and can fit one chosen axis', () => {
  const model = describeModel(source());
  const root = new Object3D();
  batchModels(root, model, [
    { at: [0, 0, 0], slot: [-0.2, 0, -2, 0.2, 3, 2] },
    { at: [6, 0, 0], slot: [-2, 0, -2, 2, 3, 2], fit: 'height' },
  ]);
  const first = root.children[0].instanceMatrices;
  for (const index of [0, 5, 10]) assert(Math.abs(first[index] - 0.2) < 1e-6);
  for (const index of [16, 21, 26]) assert(Math.abs(first[index] - 3) < 1e-6);
});

test('long station modules retain their original cross-section and share their material', () => {
  const model = describeModel(source()), original = model.bounds.slice();
  const repeated = repeatSceneModel(model, 2, 6, 2);
  const spans = repeated.bounds.slice(0, 3).map((min, axis) => repeated.bounds[axis + 3] - min);
  for (const [axis, expected] of [4, 2, 6].entries()) assert(Math.abs(spans[axis] - expected) < 1e-5);
  assert.equal(repeated.meshes[0].material, model.meshes[0].material);
  assert.deepEqual(model.bounds, original);
});

test('a missing role or invalid filename keeps the other visual replacements usable', async (t) => {
  let loads = 0, disposals = 0;
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({
    barrel: { file: 'shared.glb' },
    crate: { file: 'shared.glb' },
    booth: { file: '../outside.glb' },
    ignored: { file: 'never.glb' },
  }) }));
  const bundle = await loadModels(async url => {
    assert(url.pathname.endsWith('/shared.glb'));
    loads++;
    return { scene: source(), dispose() { disposals++; } };
  });
  assert.deepEqual(Object.keys(bundle.models).sort(), ['barrel', 'crate']);
  assert.deepEqual(Object.keys(bundle.failures), ['booth']);
  assert.equal(loads, 1);
  bundle.dispose();
  assert.equal(disposals, 1);
});

test('imported scene props and replacements follow the existing drawing and reload pivots', () => {
  const sourceModel = describeModel(source(), { parts: { upper: 'Helmet assembly', body: 'Helmet assembly', lid: 'Helmet assembly' } });
  const named = name => ({ ...sourceModel, name });
  const scene = new Scene3D();
  const camera = createPerspectiveCamera3D({ near: 0.03, far: 460 });
  scene.addChild(camera);
  const view = createView(scene, camera, { models: {
    container: named('test-container'), truck: named('test-truck'), sandbag: named('test-sandbag'),
    'soldier-rifle': named('test-soldier'), 'weapon-rifle': named('test-rifle'),
    'weapon-marksman': named('test-marksman'), 'supply-crate': named('test-supply'),
  } });
  const game = createGame({ seed: 1 });
  view.attach(game);
  view.update(0.016, game, 'play', 0.016);
  const counts = {};
  for (const node of scene.children.filter(node => /^test-/.test(node.name))) {
    counts[node.name] = (counts[node.name] ?? 0) + node.count;
  }
  assert.deepEqual(counts, { 'test-sandbag': 14, 'test-container': 18, 'test-truck': 3 });

  const rifle = camera.children[0].children.find(node => node.name === 'weapon-rifle');
  const magazine = rifle.children.find(node => node.name === 'magazine');
  const initialHeight = magazine.position[1];
  view.gun.reload(1);
  game.weapons.rifle.reloading = 0.55;
  view.update(0.016, game, 'play', 0.032);
  assert(magazine.position[1] < initialHeight);
  assert.equal(magazine.parent, rifle);
  assert(rifle.children.some(node => node.children.some(child => child.name === 'body')));

  const crate = game.crates[0];
  const crateNode = scene.children.find(node =>
    Math.abs(node.position[0] - crate.x) < 1e-3 && Math.abs(node.position[2] - crate.z) < 1e-3 &&
    node.children.some(child => child.children.some(mesh => mesh.name === 'lid')));
  const lid = crateNode.children.find(node => node.children.some(mesh => mesh.name === 'lid'));
  const closed = Array.from(lid.quaternion);
  const lidMesh = lid.children[0].children[0], bounds = lidMesh.geometry.boundingBox;
  const front = [(bounds[0] + bounds[3]) / 2, bounds[4], bounds[2]];
  const frontHeight = () => {
    scene.updateWorldMatrices();
    const matrix = lidMesh.matrixWorld;
    return matrix[1] * front[0] + matrix[5] * front[1] + matrix[9] * front[2] + matrix[13];
  };
  const closedFront = frontHeight();
  crate.opened = true;
  const enemy = game.enemies.find(enemy => enemy.kind === 'rifle');
  enemy.dead = true;
  enemy.fallYaw = 0;
  game.player.weapon = 'marksman';
  game.player.aim = 1;
  view.update(0.016, game, 'play', 0.048);
  assert.notDeepEqual(Array.from(lid.quaternion), closed);
  assert(frontHeight() > closedFront, 'The opened lid must lift away from its contents');
  assert.equal(camera.children[0].children.find(node => node.name === 'weapon-marksman').visible, false);
});
