import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
import { UNITS } from '../src/data/battle.mjs';

const { figureOf, isSiegeFigure } = await import('../src/view3d/troops.mjs');
const { siegeRam, siegeRamBeam } = await import('../src/view3d/siege-ram.mjs');
const { siegeTower, catapult, catapultBase, catapultArm, catapultStone, towerBoardingDeck } =
  await import('../src/view3d/siege-tall-equipment.mjs');
const { catapultPitch, CATAPULT_RELEASE_PITCH, CATAPULT_RELEASE_TIME, CATAPULT_RESET_TIME, siegeMount } =
  await import('../src/view3d/siege-motion.mjs');
const { createSiegeShots } = await import('../src/view3d/siege-shots.mjs');
const { Scene3D } = await import('@egret/engine/world3d');

const triangles = ({ plain, coat }) => (plain.index.data.length + (coat?.index.data.length ?? 0)) / 3;

test('each siege unit selects its own 3D figure on the map and battlefield', () => {
  const ids = Object.values(UNITS).filter(unit => unit.group === 'siege').map(unit => unit.id);
  assert.deepEqual(ids.map(figureOf), ids);
  assert.ok(ids.every(id => isSiegeFigure(figureOf(id))));
  assert.equal(isSiegeFigure(figureOf('archer')), false);
});

test('the arm, stone and base keep the full catapult budget and use the chassis heading', () => {
  for (const detail of [true, false]) {
    assert.equal([catapultBase, catapultArm, catapultStone].reduce((sum, make) => sum + triangles(make(detail)), 0),
      triangles(catapult(detail)));
    assert.ok(triangles(towerBoardingDeck(detail)) < 200);
  }
  assert.equal(Math.abs(catapultPitch(0)), 0);
  assert.equal(catapultPitch(CATAPULT_RELEASE_TIME), CATAPULT_RELEASE_PITCH);
  assert.equal(Math.abs(catapultPitch(CATAPULT_RESET_TIME)), 0);
  const turned = siegeMount(5, 2, 10, Math.PI / 2, 2, [0, 1, 0], [0, 0, 1], -Math.PI / 2);
  assert.deepEqual(turned.map(v => Number(v.toFixed(4))), [5, 6, 10]);
});

test('a launched stone arcs once, impacts once and is disposed with its battle', () => {
  const scene = new Scene3D(), impacts = [], target = { x: 9, y: 0, z: 0, at: 4 };
  const geometry = catapultStone(false).plain;
  const shots = createSiegeShots(scene, geometry, at => impacts.push(at));
  const mesh = scene.getObjectByName('battle-siege-stones');
  shots.launch([0, 1, 0], target, .11, false);
  shots.update(.1);
  assert.equal(mesh.count, 0);
  shots.update(.22);
  assert.equal(mesh.count, 1);
  assert.ok(mesh.instanceMatrices[13] > 1);
  shots.update(.5);
  shots.update(.5);
  assert.equal(mesh.count, 0);
  assert.deepEqual(impacts, [target]);
  shots.launch([0, 1, 0], target, .11, true);
  assert.deepEqual(impacts, [target, target]);
  assert.equal(mesh.count, 0);
  shots.destroy();
  assert.equal(scene.children.length, 0);
  assert.equal(geometry.isDisposed, true);
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
