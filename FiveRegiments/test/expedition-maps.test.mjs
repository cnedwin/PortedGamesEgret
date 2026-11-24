import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
const { EXPEDITION_ARENAS, describePlace } = await import('../src/view/stage.mjs');

test('the expedition paths lead from entry to visible, reachable exits', () => {
  for (const name of Object.keys(EXPEDITION_ARENAS)) {
    const { layout, place } = describePlace(name);
    const { radius, posts, spawn, exit } = place;
    assert.ok(spawn.z > 0 && exit.z < 0, name);
    assert.ok(Math.hypot(exit.x, exit.z) + exit.r < radius, name);
    assert.ok(Math.hypot(spawn.x, spawn.z) < radius, name);
    assert.ok(layout.some(({ prop, x, z }) => prop.startsWith('gate') && x === exit.x && z < exit.z && exit.z - z < 5), name);
    for (const { x, z, r } of posts) {
      const fromPath = Math.hypot(x - exit.x, z - Math.min(spawn.z, Math.max(exit.z, z)));
      assert.ok(fromPath > r + exit.r, `${name} runway obstructed at ${x}, ${z}`);
    }
  }
  const training = describePlace('county').place;
  assert.equal(training.exit, undefined);
  assert.equal(training.platforms, undefined);
});

test('all three original arenas use locally bundled sky, surfaces and props at every quality', async () => {
  const skies = new Set();
  for (const name of Object.keys(EXPEDITION_ARENAS)) {
    const { look, route, layout } = describePlace(name);
    skies.add(look.sky);
    const files = [`skies/${look.sky}.jpg`];
    for (const material of new Set([look.ground.material, route.path])) {
      files.push(...['diff', 'nor', 'arm'].map((map) => `materials/${material}_${map}.jpg`));
    }
    for (const prop of new Set(layout.map((item) => item.prop))) {
      files.push(...['low', 'mid', 'high'].map((set) => `props/${prop}-${set}.glb`));
    }
    await Promise.all(files.map((name) => access(new URL(`../assets/${name}`, import.meta.url))));
  }
  assert.equal(skies.size, 3);
});
