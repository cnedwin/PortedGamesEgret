import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSandboxBattle } from '../src/sim/battle-sandbox.mjs';
import { command, idx, stepBattle } from '../src/sim/battle.mjs';
import { MAX_BATTLE_PLAN_ORDERS, previewBattleCommandPlan, commitBattleCommandPlan } from '../src/sim/battle-command-plan.mjs';

function field() {
  const battle = createSandboxBattle({
    map: 'plain', seed: 41,
    armies: [
      [{ unit: 'spear', troops: 6000 }, { unit: 'archer', troops: 4500 }, { unit: 'lightcav', troops: 4000 }],
      [{ unit: 'sword', troops: 5500 }, { unit: 'halberd', troops: 5000 }]
    ]
  });
  [idx(3, 5), idx(2, 9), idx(4, 10), idx(15, 5), idx(15, 10)].forEach((position, i) => {
    battle.units[i].pos = position;
    command(battle, i, 'hold');
    command(battle, i, 'autoTactic', false);
  });
  return battle;
}

const orders = () => [
  { unit: 0, kind: 'attack', target: 3 },
  { unit: 1, kind: 'move', hex: idx(7, 9) },
  { unit: 2, kind: 'attack', target: 4 }
];
const snapshot = battle => JSON.stringify({
  ...battle, random: null,
  units: battle.units.map(unit => ({ ...unit, target: unit.target?.id ?? null }))
});

test('a mixed explicit assault preview is detached, uses real paths, and never consumes RNG', () => {
  const battle = field(), before = snapshot(battle), input = orders();
  let randomCalls = 0;
  battle.random = () => { randomCalls++; return .5; };
  const plan = previewBattleCommandPlan(battle, 0, input);
  assert.equal(plan.valid, true);
  assert.equal(plan.orders.length, 3);
  assert(plan.orders.every(row => row.path.length > 0));
  assert(plan.orders[0].combat.projected);
  assert(plan.orders[0].combat.inReach);
  assert(plan.orders[0].combat.weaponMultiplier > 0);
  assert.equal(randomCalls, 0);
  assert.equal(snapshot(battle), before);
  plan.orders[0].path.length = 0;
  assert.equal(battle.units[0].path.length, 0);
  assert.deepEqual(input, orders());
});

test('an atomic plan produces exactly the same normal simulation as the same individual commands', () => {
  const planned = field(), individual = field(), before = snapshot(planned);
  const result = commitBattleCommandPlan(planned, 0, orders());
  assert.equal(result.ok, true);
  assert.equal(result.actions.length, 3);
  assert.notEqual(snapshot(planned), before);
  for (const action of result.actions) assert(command(individual, action.unit, action.what, action.arg));
  assert.equal(snapshot(planned), snapshot(individual));
  for (let i = 0; i < 200 && !planned.over; i++) {
    stepBattle(planned, .1, 0);
    stepBattle(individual, .1, 0);
  }
  assert.equal(snapshot(planned), snapshot(individual));
  assert(planned.units[0].pos !== idx(3, 5));
  assert(planned.units.some(unit => unit.record.damage > 0));
});

test('duplicate units and shared explicit move destinations are rejected without touching any order', () => {
  const battle = field(), before = snapshot(battle);
  const duplicate = previewBattleCommandPlan(battle, 0, [orders()[0], orders()[0]]);
  assert.equal(duplicate.valid, false);
  assert.equal(duplicate.reason, 'duplicateUnit');
  const collision = commitBattleCommandPlan(battle, 0, [
    { unit: 0, kind: 'move', hex: idx(8, 7) },
    { unit: 1, kind: 'move', hex: idx(8, 7) }
  ]);
  assert.equal(collision.ok, false);
  assert.equal(collision.plan.reason, 'destinationConflict');
  assert.deepEqual(collision.plan.conflicts[0].units, [0, 1]);
  assert.equal(snapshot(battle), before);
});

test('ownership, gone/routed units, invalid targets and occupied endpoints block the entire group', () => {
  for (const change of ['enemy', 'gone', 'routed', 'target', 'occupied']) {
    const battle = field(), input = orders();
    if (change === 'enemy') input[2].unit = 4;
    if (change === 'gone') battle.units[2].gone = true;
    if (change === 'routed') battle.units[2].routed = true;
    if (change === 'target') input[2].target = 0;
    if (change === 'occupied') input[1].hex = battle.units[0].pos;
    const before = snapshot(battle);
    assert.equal(commitBattleCommandPlan(battle, 0, input).ok, false, change);
    assert.equal(snapshot(battle), before, change);
  }
});

test('confirmation rechecks current targets and terrain instead of trusting a stale preview', () => {
  for (const change of ['target', 'terrain']) {
    const battle = field(), input = orders();
    assert(previewBattleCommandPlan(battle, 0, input).valid);
    if (change === 'target') battle.units[4].gone = true;
    else battle.tiles[input[1].hex] = 'water';
    const before = snapshot(battle);
    const result = commitBattleCommandPlan(battle, 0, input);
    assert.equal(result.ok, false, change);
    assert.deepEqual(result.actions, []);
    assert.equal(snapshot(battle), before, change);
  }
});

test('several units can focus one enemy from distinct reachable standing hexes', () => {
  const battle = field();
  battle.units[0].pos = idx(10, 4);
  battle.units[1].pos = idx(10, 8);
  battle.units[3].pos = idx(12, 6);
  const plan = previewBattleCommandPlan(battle, 0, [
    { unit: 0, kind: 'attack', target: 3 }, { unit: 1, kind: 'attack', target: 3 }
  ]);
  assert.equal(plan.valid, true);
  assert.notEqual(plan.orders[0].destination, plan.orders[1].destination);
});

test('plans are bounded explicit field orders, never tactics, naval or siege automation', () => {
  const battle = field(), before = snapshot(battle);
  for (const input of [[], Array(MAX_BATTLE_PLAN_ORDERS + 1).fill(orders()[0]), [{ unit: 0, kind: 'auto' }], null]) {
    assert.equal(commitBattleCommandPlan(battle, 0, input).ok, false);
  }
  for (const kind of ['siege', 'naval']) {
    const other = field();
    other.setup.kind = kind;
    assert.equal(previewBattleCommandPlan(other, 0, orders()).reason, 'unsupportedBattle');
  }
  battle.over = { winner: 0, why: 'broken' };
  assert.equal(commitBattleCommandPlan(battle, 0, orders()).reason, 'battleOver');
  battle.over = null;
  assert.equal(snapshot(battle), before);
});

test('one-unit road orders accept canonical arg and commit without consuming time, rage or RNG', () => {
  const battle = field();
  let calls = 0;
  battle.random = () => { calls++; return .5; };
  const unit = battle.units[0], before = { time: battle.time, rage: unit.rage, troops: unit.troops };
  const result = commitBattleCommandPlan(battle, 0, [{ unit: 0, kind: 'attack', arg: 3 }]);
  assert(result.ok);
  assert.deepEqual(result.actions, [{ unit: 0, what: 'attack', arg: 3 }]);
  assert.equal(unit.target, battle.units[3]);
  assert.deepEqual({ time: battle.time, rage: unit.rage, troops: unit.troops }, before);
  assert.equal(calls, 0);
});

test('two attacking units may share a projected reach hex because it is not a reserved move destination', () => {
  const battle = field();
  battle.units[0].pos = 294;
  battle.units[2].pos = 292;
  battle.units[3].pos = 15;
  const input = [{ unit: 0, kind: 'attack', arg: 3 }, { unit: 2, kind: 'attack', arg: 3 }];
  const plan = previewBattleCommandPlan(battle, 0, input);
  assert.equal(plan.orders[0].destination, plan.orders[1].destination);
  assert.equal(plan.valid, true);
  assert.deepEqual(plan.conflicts, []);
  assert(commitBattleCommandPlan(battle, 0, input).ok);
  assert.equal(battle.units[0].target, battle.units[3]);
  assert.equal(battle.units[2].target, battle.units[3]);
});
