import test from 'node:test';
import assert from 'node:assert/strict';
import { beginWorld, buildHome, cancelPreview, PLOTS, selectPlot, supplies } from '../src/sim/world.mjs';

test('each site can be previewed, changed or cancelled without consuming timber', () => {
  const world = beginWorld();
  assert.equal(selectPlot(world, 'river'), false);
  for (const { id } of PLOTS) {
    assert.equal(selectPlot(world, id), true);
    assert.deepEqual(supplies(world), { timber: 12, residents: 0 });
  }
  cancelPreview(world);
  assert.equal(buildHome(world), false);
});

test('one confirmed dwelling takes eight timber and houses the waiting family exactly once', () => {
  for (const { id } of PLOTS) {
    const world = beginWorld();
    selectPlot(world, id);
    assert.equal(buildHome(world), true);
    assert.equal(world.house, id);
    assert.equal(selectPlot(world, id), false);
    assert.equal(buildHome(world), false);
    assert.deepEqual(supplies(world), { timber: 4, residents: 2 });
    assert.deepEqual(beginWorld(id), world);
  }
});
