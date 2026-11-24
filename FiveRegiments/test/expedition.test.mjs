import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFight, step } from '../src/sim/fight.mjs';
import { expeditionReady, planExpedition } from '../src/sim/expedition.mjs';

test('the route has three successive fields and a fresh roster per run', () => {
  const stages = planExpedition();
  assert.deepEqual(stages.map(stage => stage.index), [0, 1, 2]);
  assert.equal(new Set(stages.map(stage => stage.place)).size, 3);
  stages[0].foes.length = 0;
  assert.ok(planExpedition()[0].foes.length);
});

test('an expedition exit needs a cleared field and the fighter inside the gate', () => {
  const exit = { x: 0, z: -9, r: 1 };
  const game = createFight({ hero: { regiment: 'tiger', at: [0, -9] }, foes: [{ regiment: 'yulin' }], exit });
  step(game, {});
  assert.equal(game.over, null, 'the gate cannot be used while defenders remain');
  game.men[1].alive = false;
  game.hero.z = -6;
  step(game, {});
  assert.equal(game.over, null, 'defeating defenders does not end an expedition at a distance');
  for (let i = 0; i < 150 && !game.over; i++) step(game, { hero: { move: [0, -1], face: Math.PI } });
  assert.equal(game.over, 'won');
});

test('regiment sentries wake along the road and keep the light infantry loadout', () => {
  const stage = planExpedition()[1];
  const troop = stage.units.find(unit => unit.regiment === 'plume');
  const game = createFight({ hero: { regiment: 'tiger', at: [0, 10] }, foes: [troop] });
  const guard = game.men[1];
  assert.equal(guard.rank, 'troop');
  assert.equal(guard.horse, null);
  assert.deepEqual(guard.skills, []);
  assert.ok(guard.hp < guard.r.health * 0.35 && guard.power < 1);
  assert.equal(expeditionReady(guard, game.hero), false);
  game.hero.z = guard.wakeZ;
  assert.equal(expeditionReady(guard, game.hero), true);
  assert.equal(createFight({ hero: { regiment: 'plume' }, foes: [] }).hero.mounted, true);
});
