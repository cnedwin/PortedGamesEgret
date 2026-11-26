import assert from 'node:assert/strict';
import { test } from 'node:test';
import { command, createBattle, previewBattleOrder, stepBattle } from '../src/sim/battle.mjs';
import { createNanpiTrial } from '../src/sim/nanpi-trial.mjs';

function playThreeArms(first, presentation = true) {
  const { state, setup } = createNanpiTrial();
  const before = JSON.stringify(state);
  if (!presentation) delete setup.presentation;
  const battle = createBattle(setup, state);
  const issue = (unit, kind, target) => assert.equal(command(battle, unit, kind, target), true);
  const until = (condition) => {
    for (let i = 0; i < 3900 && !battle.over && !condition(); i++) stepBattle(battle, 0.1, 0);
  };
  for (const {id} of battle.units.filter(u => u.side === 0)) {
    issue(id, 'hold');
    issue(id, 'autoTactic', false);
  }
  const orders = {ram: [2, 'attack', 3], bow: [1, 'attack', 4]};
  issue(...orders[first]);
  until(() => battle.time >= 9 - 1e-7);
  issue(...orders[first === 'ram' ? 'bow' : 'ram']);
  until(() => battle.gate.open);
  assert.equal(battle.gate.open, true);
  issue(0, 'move', battle.keep);
  issue(1, 'attack', 3);
  until(() => false);
  assert.equal(JSON.stringify(state), before);
  return battle;
}

test('Nanpi order preview reads the real closed-gate path without committing an order', () => {
  const { state, setup } = createNanpiTrial();
  const battle = createBattle(setup, state);
  const ram = battle.units[2];
  const before = { at: ram.atGate, path: ram.path, order: ram.order, target: ram.target, time: battle.time };
  const plan = previewBattleOrder(battle, ram.id, 'attack', 3);
  assert.ok(plan.valid && plan.gate && plan.path.length > 0);
  assert.equal(plan.hex, battle.gate.at);
  assert.deepEqual({ at: ram.atGate, path: ram.path, order: ram.order, target: ram.target, time: battle.time }, before);
  assert.equal(previewBattleOrder(battle, ram.id, 'move', battle.gate.at).valid, false);
  assert.equal(previewBattleOrder(battle, ram.id, 'attack', 0), null);
  assert.ok(command(battle, ram.id, 'attack', 3));
  assert.deepEqual(ram.path, plan.path);
});

test('the same arms and battle rules produce two different Nanpi outcomes', () => {
  const ramFirst = playThreeArms('ram');
  const bowFirst = playThreeArms('bow');
  const normal = playThreeArms('ram', false);
  assert.deepEqual(ramFirst.over, {winner: 0, why: 'keep'});
  assert.ok(ramFirst.keepHeld >= 10);
  assert.deepEqual(bowFirst.over, {winner: 0, why: 'broken'});
  assert.ok(bowFirst.keepHeld > 0);
  const breakAt = battle => battle.events.find(event => event.kind === 'gateOpen').t;
  assert.ok(breakAt(ramFirst) < breakAt(bowFirst));
  const hits = ramFirst.events.filter(event => event.kind === 'structureHit');
  assert.ok(hits.length > 1 && hits.every(event => event.unit === 2 && event.at === ramFirst.gate.at && event.amount > 0));
  assert.equal(hits.at(-1).t, breakAt(ramFirst));
  assert.deepEqual(ramFirst.over, normal.over);
  assert.equal(ramFirst.keepHeld, normal.keepHeld);
  assert.deepEqual(ramFirst.units.map(({troops,pos,morale})=>({troops,pos,morale})),
    normal.units.map(({troops,pos,morale})=>({troops,pos,morale})));
  assert.deepEqual(ramFirst.events.filter(event => event.kind !== 'structureHit'), normal.events);
});
