import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
import { UNITS } from '../src/data/battle.mjs';

const { figureOf, isSiegeFigure } = await import('../src/view3d/troops.mjs');
const { siegeRam, siegeRamBeam } = await import('../src/view3d/siege-ram.mjs');
const { siegeTower, catapult } = await import('../src/view3d/siege-tall-equipment.mjs');

const triangles = ({ plain, coat }) => (plain.index.data.length + coat.index.data.length) / 3;

test('each siege unit selects its own 3D figure on the map and battlefield', () => {
  const ids = Object.values(UNITS).filter(unit => unit.group === 'siege').map(unit => unit.id);
  assert.deepEqual(ids.map(figureOf), ids);
  assert.ok(ids.every(id => isSiegeFigure(figureOf(id))));
  assert.equal(isSiegeFigure(figureOf('archer')), false);
});

test('each siege figure keeps both instance surfaces and scales down geometry at low quality', () => {
  for (const make of [detail => siegeRam(detail, true), siegeTower, catapult]) {
    const full = make(true), low = make(false);
    assert.ok(full.plain.index.data.length > 0);
    assert.ok(full.coat.index.data.length > 0);
    assert.ok(triangles(low) < triangles(full));
    assert.ok(triangles(full) < 3200);
  }
  for (const detail of [true, false]) {
    assert.equal(triangles(siegeRam(detail, false)) + triangles(siegeRamBeam(detail)),
      triangles(siegeRam(detail, true)), 'Splitting the moving striker preserves the model budget');
  }
});
