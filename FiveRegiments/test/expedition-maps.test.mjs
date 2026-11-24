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
    assert.ok(layout.some(({ prop, x, z }) => prop.startsWith('gate') && x === exit.x && z < exit.z && exit.z - z < 9), name);
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
    for (const material of new Set([look.ground.material, route.path, route.deck, route.support])) {
      files.push(...['diff', 'nor', 'arm'].map((map) => `materials/${material}_${map}.jpg`));
    }
    for (const prop of new Set(layout.map((item) => item.prop))) {
      files.push(...['low', 'mid', 'high'].map((set) => `props/${prop}-${set}.glb`));
    }
    await Promise.all(files.map((name) => access(new URL(`../assets/${name}`, import.meta.url))));
  }
  assert.equal(skies.size, 3);
});

test('each lookout has a clear ramp leading continuously from ground to an elevated deck', () => {
  for (const name of Object.keys(EXPEDITION_ARENAS)) {
    const { place } = describePlace(name);
    assert.equal(place.platforms.length, 1, name);
    for (const deck of place.platforms) {
      const { ramp } = deck;
      assert.equal(ramp.minZ, deck.maxZ, name);
      assert.ok(ramp.minX >= deck.minX && ramp.maxX <= deck.maxX, name);
      assert.ok(ramp.maxX - ramp.minX > 2.5 && deck.height / (ramp.maxZ - ramp.minZ) < 0.35, name);
      for (const rect of [deck, ramp]) {
        assert.ok(Math.hypot(Math.max(Math.abs(rect.minX), Math.abs(rect.maxX)),
          Math.max(Math.abs(rect.minZ), Math.abs(rect.maxZ))) < place.radius, name);
        assert.ok(rect.minX > place.exit.r || rect.maxX < -place.exit.r, name);
        for (const { x, z, r } of place.posts) {
          const dx = Math.max(0, rect.minX - x, x - rect.maxX);
          const dz = Math.max(0, rect.minZ - z, z - rect.maxZ);
          assert.ok(Math.hypot(dx, dz) > r + .35, `${name} lookout obstructed at ${x}, ${z}`);
        }
      }
    }
  }
});
