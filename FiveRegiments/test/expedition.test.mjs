import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBrain } from '../src/sim/brain.mjs';
import { createFight, step, TICK } from '../src/sim/fight.mjs';
import { expeditionReady, planExpedition } from '../src/sim/expedition.mjs';
import { loadout } from '../src/sim/regiments.mjs';

test('the route has three successive fields and a fresh roster per run', () => {
  const stages = planExpedition();
  assert.deepEqual(stages.map(stage => stage.index), [0, 1, 2]);
  assert.equal(new Set(stages.map(stage => stage.place)).size, 3);
  stages[0].foes.length = 0;
  assert.ok(planExpedition()[0].foes.length);
});

test('march and veteran use the same route with different pressure and distinct boss profiles', () => {
  const march = planExpedition();
  const veteran = planExpedition({ veteran: true });
  assert.deepEqual(veteran.map(stage => stage.place), march.map(stage => stage.place));
  assert.ok(veteran.every((stage, index) => stage.level > march[index].level));
  const normalBoss = march[2].units.find(unit => unit.rank === 'boss');
  const hardBoss = veteran[2].units.find(unit => unit.rank === 'boss');
  assert.ok(hardBoss.health > normalBoss.health && hardBoss.power > normalBoss.power);
  assert.deepEqual(normalBoss.phaseSkills, hardBoss.phaseSkills);
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

test('regiment sentries wake along the road and keep the light infantry role', () => {
  const stage = planExpedition()[1];
  const troop = stage.units.find(unit => unit.regiment === 'plume');
  const game = createFight({ hero: { regiment: 'tiger', at: [0, 10] }, foes: [troop] });
  const guard = game.men[1];
  assert.equal(guard.rank, 'troop');
  assert.equal(guard.horse, null);
  assert.equal(guard.mounted, false);
  assert.ok(guard.hp < guard.r.health * 0.35 && guard.power < 1);
  assert.equal(expeditionReady(guard, game.hero), false);
  game.hero.z = guard.wakeZ;
  assert.equal(expeditionReady(guard, game.hero), true);
  assert.equal(createFight({ hero: { regiment: 'plume' }, foes: [] }).hero.mounted, true);
});

test('all five infantry professions use their regular skills with a readable opening', () => {
  const troops = planExpedition().flatMap(stage => stage.units.filter(unit => unit.rank === 'troop'));
  const examples = [
    ['yulin', 4, 'charge'],
    ['tiger', 1.8, 'spin'],
    ['vanguard', 6, 'wave'],
    ['plume', 2.4, 'returnSpear'],
    ['archer', 7, 'fan']
  ];
  for (const [regiment, distance, expectedSkill] of examples) {
    const troop = troops.find(unit => unit.regiment === regiment);
    const game = createFight({
      hero: { regiment: 'tiger', at: [0, 11] },
      foes: [troop],
      exit: { x: 0, z: -18, r: 2 },
      place: { radius: 23, posts: [] }
    });
    const guard = game.men[1];
    const brain = createBrain(guard, { level: 0.38, rng: () => 0 });
    assert.deepEqual(guard.skills, loadout(regiment).skills, regiment);
    assert.equal(brain.think(game, TICK).skill, -1, 'the outpost is still asleep');

    game.hero.z = guard.wakeZ;
    step(game, {});
    assert.equal(guard.waiting, false);
    game.hero.x = guard.x;
    game.hero.z = guard.z + distance;
    game.hero.act = { kind: 'recover', time: 10, t: 0 };
    assert.equal(brain.think(game, TICK).skill, -1, 'a newly alerted guard can be approached');
    for (let i = 0; i < 3 / TICK; i++) step(game, {});

    const input = brain.think(game, TICK);
    assert.equal(guard.skills[input.skill], expectedSkill, regiment);
    const events = step(game, { [guard.id]: input });
    assert.ok(events.some(event => event.type === 'skill' && event.who === guard.id && event.id === expectedSkill), regiment);
    assert.ok(guard.cool[1 - input.skill] >= 6, 'another skill cannot follow immediately');
  }
});

test('the boss wakes at its post and changes stance once after finishing its attack', () => {
  const stage = planExpedition()[2];
  const boss = stage.units.find(unit => unit.rank === 'boss');
  const exit = { x: 0, z: -18, r: 2 };
  const game = createFight({ hero: { regiment: 'tiger' }, foes: [boss], exit });
  const warden = game.men[1];
  assert.equal(warden.waiting, true);
  game.hero.z = boss.wakeZ - 1;
  step(game, {});
  assert.equal(warden.waiting, false);
  game.hero.z = 7;
  step(game, {});
  assert.equal(warden.waiting, false, 'an alerted boss does not forget a retreating player');
  warden.hp = Math.round(warden.maxHp * 0.5);
  warden.act = { kind: 'recover', time: 0.5, t: 0 };
  assert.equal(step(game, {}).some(event => event.type === 'bossPhase'), false);
  warden.act = null;
  assert.equal(step(game, {}).filter(event => event.type === 'bossPhase').length, 1);
  assert.deepEqual(warden.skills, boss.phaseSkills);
  assert.ok(warden.cool.every(time => time > 0.8));
  assert.equal(step(game, {}).some(event => event.type === 'bossPhase'), false);
});
