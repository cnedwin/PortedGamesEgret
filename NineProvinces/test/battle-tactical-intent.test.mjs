import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
import * as battle from '../src/sim/battle.mjs';
import { previewBattleCommandPlan } from '../src/sim/battle-command-plan.mjs';

const { createBattle, command, stepBattle, combatPreview, previewBattleOrder, idx, neighbours, distance } = battle;

function field(kinds = ['spear', 'spear', 'spear']) {
  const b = createBattle({
    id: 'tactical-intents', kind: 'field', seed: 731, wall: 0,
    place: { link: ['pingyuan', 'nanpi'] }, factions: ['liubei', 'yuanshao'],
    terrain: { hills: 0, woods: 0, water: 0, marsh: 0 },
    units: kinds.map((unit, i) => ({
      side: i === 1 ? 1 : 0, unit, general: null,
      faction: i === 1 ? 'yuanshao' : 'liubei', troops: 10000,
      morale: 90, training: 60, formation: 'square'
    }))
  });
  for (const u of b.units) {
    command(b, u.id, 'hold');
    command(b, u.id, 'autoTactic', false);
    u.pos = idx(5 + u.id * 3, 7);
    u.think = 0;
  }
  return b;
}

function tick(b, seconds = 3, side = 0) {
  for (let n = 0; n < seconds * 10 && !b.over; n++) stepBattle(b, .1, side);
}

function encirclement(directionA, directionB) {
  const b = field(), centre = idx(10, 7), around = neighbours(centre);
  b.units[1].pos = centre;
  b.units[0].pos = around[directionA];
  b.units[2].pos = around[directionB];
  return b;
}

test('hex flanking needs separated approaches, consistently on all six sides', () => {
  for (let direction = 0; direction < 6; direction++) {
    const same = encirclement(direction, (direction + 1) % 6);
    const spread = encirclement(direction, (direction + 2) % 6);
    const opposite = encirclement(direction, (direction + 3) % 6);
    assert.equal(combatPreview(same, same.units[0], same.units[1]).tags.includes('flank'), false);
    assert.equal(combatPreview(spread, spread.units[0], spread.units[1]).tags.includes('flank'), true);
    assert.equal(combatPreview(opposite, opposite.units[0], opposite.units[1]).tags.includes('flank'), true);
  }
});

test('unavailable or nonadjacent supporting units cannot supply a flank', () => {
  for (const unavailable of ['gone', 'routed', 'friendly', 'far']) {
    const b = encirclement(0, 3), support = b.units[2];
    if (unavailable === 'gone') support.gone = true;
    if (unavailable === 'routed') support.routed = true;
    if (unavailable === 'friendly') support.side = 1;
    if (unavailable === 'far') support.pos = idx(1, 1);
    assert.equal(combatPreview(b, b.units[0], b.units[1]).tags.includes('flank'), false);
  }
});

test('hit records and command-plan combat previews use the same directional flank', () => {
  for (const [direction, expected] of [[1, false], [3, true]]) {
    const b = encirclement(0, direction), attacker = b.units[0], defender = b.units[1];
    const preview = combatPreview(b, attacker, defender);
    const plan = previewBattleCommandPlan(b, 0, [{ unit: 0, kind: 'attack', arg: 1 }]);
    assert.equal(plan.orders[0].combat.tags.includes('flank'), expected);
    for (const u of b.units) { u.cd = 10; u.think = 10; }
    attacker.cd = 0;
    command(b, 0, 'attack', 1);
    stepBattle(b, .1, 0);
    assert.equal(attacker.record.flankHits, Number(expected));
    assert.equal(attacker.lastAttack.flank, expected);
    assert.equal(preview.tags.includes('flank'), expected);
    const cues = b.events.filter(event => event.kind === 'flankContact');
    assert.equal(cues.length, Number(expected));
    if (expected) {
      assert.deepEqual(cues[0].approaches, [attacker.pos, b.units[2].pos]);
      assert.equal(cues[0].at, defender.pos);
      attacker.cd = 0;
      stepBattle(b, .1, 0);
      assert.equal(b.events.filter(event => event.kind === 'flankContact').length, 1);
    }
  }
});

test('flank metadata names only the real contributing adjacent pair without RNG or mutation', () => {
  assert.equal(typeof battle.battleFlankers, 'function');
  const b = encirclement(0, 3), before = JSON.stringify(b.units);
  b.random = () => { throw new Error('flank read must not use RNG'); };
  assert.deepEqual(battle.battleFlankers(b, b.units[1]), [0, 2]);
  assert.equal(JSON.stringify(b.units), before);
  b.units[2].pos = neighbours(b.units[1].pos)[1];
  assert.deepEqual(battle.battleFlankers(b, b.units[1]), []);
});

test('intent options reject unsupported battles and ineligible range intent without mutation', () => {
  assert.equal(typeof battle.battleIntentOptions, 'function');
  const b = field(), before = JSON.stringify(b.units[0]);
  assert.equal(battle.battleIntentOptions(b, 0).find(o => o.kind === 'range').available, false);
  assert.equal(command(b, 0, 'intent', 'range'), false);
  assert.equal(command(b, 0, 'intent', 'missing'), false);
  assert.equal(JSON.stringify(b.units[0]), before);
  for (const kind of ['siege', 'naval']) {
    b.setup.kind = kind;
    assert.equal(command(b, 0, 'intent', 'guard'), false);
  }
  b.setup.kind = 'field'; b.setup.special = 'wuchao';
  assert.equal(command(b, 0, 'intent', 'guard'), false);
});

test('guard line pursues only within its anchor and retains the duty after a target disappears', () => {
  const b = field(), u = b.units[0], enemy = b.units[1];
  u.pos = idx(8, 7); enemy.pos = idx(10, 7); b.units[2].pos = idx(2, 2);
  assert.equal(command(b, 0, 'intent', 'guard'), true);
  assert.equal(command(b, 0, 'attack', 1), true);
  const anchor = u.pos;
  tick(b, 3);
  assert(distance(anchor, u.pos) <= 2);
  enemy.pos = idx(17, 7);
  for (let n = 0; n < 100 && !b.over; n++) {
    stepBattle(b, .1, 0);
    assert(distance(anchor, u.pos) <= 2);
  }
  assert.equal(u.intent, 'guard');
  assert.equal(u.pos, anchor);
  assert.equal(u.target, null);
});

test('guard preview and command both reject a chase outside its defended area', () => {
  const b = field(), u = b.units[0];
  u.pos = idx(6, 7); b.units[1].pos = idx(16, 7);
  command(b, 0, 'intent', 'guard');
  const before = JSON.stringify(u);
  assert.equal(previewBattleOrder(b, 0, 'attack', 1).valid, false);
  assert.equal(command(b, 0, 'attack', 1), false);
  assert.equal(JSON.stringify(u), before);
});

test('engage releases a stationed unit from guard or hold, while keeping an explicit move', () => {
  const b = field(), u = b.units[0];
  assert.equal(command(b, 0, 'intent', 'guard'), true);
  assert.equal(u.order, 'hold');
  assert.equal(command(b, 0, 'intent', 'direct'), true);
  assert.equal(u.order, 'auto');
  assert.equal(u.intentAnchor, undefined);
  const goal = neighbours(u.pos).find(hex => b.tiles[hex] === 'plain');
  assert.equal(command(b, 0, 'move', goal), true);
  assert.equal(command(b, 0, 'intent', 'direct'), true);
  assert.equal(u.goal, goal);
  assert.equal(u.order, 'move');
});

test('guard intent actively meets a nearby threat without requiring a second attack order', () => {
  const b = field(), u = b.units[0];
  u.pos = idx(8, 7); b.units[1].pos = idx(10, 7); b.units[2].pos = idx(2, 2);
  command(b, 0, 'intent', 'guard');
  tick(b, 4);
  assert.notEqual(u.pos, idx(8, 7));
  assert.equal(distance(u.pos, b.units[1].pos), 1);
  assert.equal(u.intent, 'guard');
});

test('an explicit move relocates the guard line on actual arrival, without autonomous drift', () => {
  const b = field(), u = b.units[0], destination = idx(8, 9);
  u.pos = idx(7, 9); b.units[1].pos = idx(19, 2); b.units[2].pos = idx(2, 2);
  command(b, 0, 'intent', 'guard');
  assert.equal(command(b, 0, 'move', destination), true);
  tick(b, 8);
  assert.equal(u.pos, destination);
  assert.equal(u.intentAnchor, destination);
  assert.equal(u.intent, 'guard');
  assert.equal(u.path.length, 0);
});

test('explicit range intent retreats using real walkable hexes and keeps its selected target', () => {
  const b = field(['archer', 'spear', 'spear']), u = b.units[0], enemy = b.units[1];
  u.pos = idx(8, 7); enemy.pos = idx(9, 7); b.units[2].pos = idx(2, 2);
  const start = u.pos;
  assert.equal(command(b, 0, 'intent', 'range'), true);
  assert.equal(command(b, 0, 'attack', 1), true);
  tick(b, 5);
  assert.notEqual(u.pos, start);
  assert(distance(u.pos, enemy.pos) > 1);
  assert.equal(u.target, enemy);
  assert.equal(u.intent, 'range');
});

test('range intent does not promise an impossible retreat or enter blocked water', () => {
  const b = field(['archer', 'spear', 'spear']), u = b.units[0];
  u.pos = idx(8, 7); b.units[1].pos = idx(9, 7); b.units[2].pos = idx(2, 2);
  for (const at of neighbours(u.pos)) if (at !== b.units[1].pos) b.tiles[at] = 'water';
  assert.equal(command(b, 0, 'intent', 'range'), true);
  assert.equal(command(b, 0, 'attack', 1), true);
  tick(b, 3);
  assert.equal(u.pos, idx(8, 7));
  assert.equal(u.path.length, 0);
});

test('range intent keeps its role after its explicit target dies and respects a later explicit hold', () => {
  const b = field(['archer', 'spear', 'spear', 'spear']), u = b.units[0];
  u.pos = idx(8, 7); b.units[1].pos = idx(10, 7); b.units[2].pos = idx(2, 2);
  b.units[3].side = 1; b.units[3].pos = idx(9, 7);
  command(b, 0, 'intent', 'range'); command(b, 0, 'attack', 1);
  b.units[1].gone = true;
  tick(b, 4);
  assert.equal(u.target, b.units[3]);
  assert.equal(u.intent, 'range');
  command(b, 0, 'hold');
  const heldAt = u.pos;
  tick(b, 4);
  assert.equal(u.pos, heldAt);
});

test('intent movement is deterministic and previewing guard orders cannot mutate anchor or consume RNG', () => {
  const a = field(), c = field();
  for (const b of [a, c]) {
    b.units[0].pos = idx(8, 7); b.units[1].pos = idx(10, 7); b.units[2].pos = idx(2, 2);
    command(b, 0, 'intent', 'guard');
  }
  const before = JSON.stringify(a.units);
  previewBattleCommandPlan(a, 0, [{ unit: 0, kind: 'attack', arg: 1 }]);
  assert.equal(JSON.stringify(a.units), before);
  tick(a, 20); tick(c, 20);
  const visible = b => b.units.map(u => [u.pos, u.troops, u.rage, u.morale, u.intent, u.intentAnchor, u.record]);
  assert.deepEqual(visible(a), visible(c));
});

test('legacy absent intent remains direct and explicit intent commands consume no time, stats or RNG', () => {
  const b = field(['archer', 'spear', 'spear']), u = b.units[0];
  assert.equal(battle.battleIntentOptions(b, 0).find(o => o.kind === 'direct').active, true);
  const vitals = [b.time, u.troops, u.rage, u.morale];
  b.random = () => { throw new Error('intent must not use RNG'); };
  assert.equal(command(b, 0, 'intent', 'range'), true);
  assert.equal(command(b, 0, 'intent', 'direct'), true);
  assert.deepEqual([b.time, u.troops, u.rage, u.morale], vitals);
  assert.equal(u.intent, 'direct');
});
