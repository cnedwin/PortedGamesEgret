import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../src/sim/maps.mjs';
import { createGame } from '../src/sim/rules.mjs';
import { battleSight, knownBattle, sightTile } from '../src/sim/fog.mjs';

function wheat() {
  return createGame(MAPS[0], [{ commander: 'seline' }, { commander: 'garron', ai: true }], 25);
}

test('sight uses the owning side’s scouts and buildings without leaking enemy state', () => {
  const game = wheat();
  const visible = battleSight(game, 0);
  const foe = game.units.find((u) => u.owner === 1 && u.type === 'commander');
  const enemyHold = game.buildings.find((b) => b.kind === 'hq' && b.owner === 1);
  const known = knownBattle(game, 0, visible);
  assert.ok(game.units.filter((unit) => unit.owner === 0).every((unit) => known.units.includes(unit)));
  assert.ok(!visible.has(sightTile(game, foe.x, foe.y)));
  assert.ok(!known.units.includes(foe));
  assert.equal(known.buildings.find((b) => b.id === enemyHold.id).owner, -1);
  assert.equal(enemyHold.owner, 1);
  assert.equal(knownBattle(game, 0, null), game);
});

test('a scout’s new position reveals enemies while leaving prior distant tiles outside sight', () => {
  const game = wheat();
  const scout = game.units.find((u) => u.owner === 0 && u.type === 'swordsman');
  const foe = game.units.find((u) => u.owner === 1 && u.type === 'commander');
  const before = battleSight(game, 0);
  const originalTile = sightTile(game, foe.x, foe.y);
  assert.ok(!before.has(originalTile));
  scout.x = foe.x;
  scout.y = foe.y + 1;
  const after = battleSight(game, 0);
  assert.ok(after.has(originalTile));
  assert.ok(knownBattle(game, 0, after).units.includes(foe));
  assert.ok(!after.has(sightTile(game, 0, 0)));
});
