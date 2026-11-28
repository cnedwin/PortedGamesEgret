import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
const { Object3D, Mesh3D, createBoxGeometry3D, createStandardMaterial3D } = await import('@egret/engine/world3d');
const { collectTitleProgramRequests, prepareTitlePrograms } = await import('../src/view/title-programs.mjs');

const material = options => createStandardMaterial3D(options);
const mesh = (m, g = createBoxGeometry3D()) => new Mesh3D(g, m);
const options = { fog: true, environment: true, shadowsEnabled: true };

test('title preparation uses material groups, real visibility and cast/receive flags', () => {
  const root = new Object3D(), hidden = new Object3D();
  hidden.visible = false;
  hidden.addChild(mesh(material())); root.addChild(hidden);
  const g = createBoxGeometry3D(); g.clearGroups();
  g.addGroup(0, 6, 1); g.addGroup(6, 6, 1); g.addGroup(12, 6, 2);
  const spare = material(), used = material(), invisible = material({ visible: false });
  invisible.visible = false;
  const actor = mesh([spare, used, invisible], g);
  actor.castShadow = true; actor.receiveShadow = true; root.addChild(actor);
  const ground = mesh(material()); ground.castShadow = false; ground.receiveShadow = false; root.addChild(ground);
  const got = collectTitleProgramRequests(root, options);
  assert.deepEqual(got.map(r => [r.mesh, r.material, r.pass]), [
    [actor, used, 'color'], [actor, used, 'shadow'], [ground, ground.material, 'color']
  ]);
  assert.equal(got[0].receiveShadows, true);
  assert.equal(got[2].receiveShadows, false);
  assert.ok(got.filter(r => r.pass === 'color').every(r => r.fog && r.environment));
  const low = collectTitleProgramRequests(root, { ...options, shadowsEnabled: false });
  assert.ok(low.every(r => r.pass === 'color' && !r.receiveShadows));
});

test('only a visible transparent depth-softened surface requires the opaque depth prepass', () => {
  const root = new Object3D(), solid = mesh(material()), nonWriting = mesh(material({ depthWrite: false }));
  const soft = mesh(material({ alphaMode: 'blend', depthWrite: false, softness: 0.08 }));
  soft.material.softness = 0.08; soft.visible = false;
  for (const item of [solid, nonWriting, soft]) { item.castShadow = false; root.addChild(item); }
  assert.ok(collectTitleProgramRequests(root, options).every(r => r.pass === 'color' && !r.softDepth));
  soft.visible = true;
  const got = collectTitleProgramRequests(root, options);
  assert.deepEqual(got.filter(r => r.pass === 'depth-prepass').map(r => r.mesh), [solid]);
  assert.ok(got.find(r => r.mesh === soft && r.pass === 'color').softDepth);
  assert.ok(got.filter(r => r.mesh !== soft).every(r => !r.softDepth));
});

test('preparation forwards the detached actual mesh to the renderer with auto-instance coverage', async () => {
  const node = mesh(material()); node.castShadow = false;
  let seen;
  const renderer = { shadowsEnabled: false, async preparePrograms(requests, options) { seen = [requests, options]; } };
  const count = await prepareTitlePrograms(renderer, [node], { fog: true, environment: true });
  assert.equal(count, 1);
  assert.equal(seen[0][0].mesh, node);
  assert.deepEqual(seen[1], { includeAutoInstancing: true });
  assert.equal(await prepareTitlePrograms({}, [node]), 0);
});
