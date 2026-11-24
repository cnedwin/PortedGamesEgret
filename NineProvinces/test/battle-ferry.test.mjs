import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
import { createBattle, stepBattle, distance, outcome } from '../src/sim/battle.mjs';
import { FOOTPRINTS } from '../src/sim/land.mjs';
import { campaignBattleBriefing } from '../src/ui/campaign-battle.mjs';

function atTown(node = 'qiantang') {
  const { kc, kr } = FOOTPRINTS[node];
  const factions = ['sunce', 'wanglang'];
  const b = createBattle({
    id: 'crossing', kind: 'field', seed: 9, wall: 0, factions, place: { node },
    grid: { c0: kc - 11, r0: kr - 7 },
    units: factions.map((faction, side) => ({
      side, faction, general: null, unit: 'spear', troops: 6000,
      morale: 90, formation: 'square'
    }))
  });
  for (const u of b.units) {
    u.think = 999;
    u.cd = 999;
    u.path = [];
  }
  return b;
}

const atDistance = (b, n) => b.tiles.findIndex((tile, i) =>
  ['town', 'plain', 'road', 'forest', 'hill'].includes(tile) && distance(i, b.keep) === n);

function run(b, seconds) {
  for (let i = 0; i < seconds * 4; i++) stepBattle(b, .25, 1);
}

test('a port defender must face a real approach and hold eighteen uninterrupted seconds', () => {
  const b = atTown();
  assert.equal(b.ferry.at, b.keep);
  const [attacker, defender] = b.units;
  const near = atDistance(b, 3), contest = atDistance(b, 2), far = atDistance(b, 5);
  assert(near >= 0 && contest >= 0 && far >= 0);
  attacker.pos = far;
  defender.pos = b.keep;
  run(b, 22);
  assert.deepEqual(b.ferry, { at: b.keep, engaged: false, secured: 0 });
  assert.equal(b.over, null);
  attacker.pos = near;
  run(b, 9);
  assert.equal(b.ferry.secured, 9);
  attacker.pos = contest;
  run(b, 1);
  assert.equal(b.ferry.secured, 0);
  attacker.pos = near;
  run(b, 17);
  assert.equal(b.over, null);
  run(b, 1);
  assert.deepEqual(b.over, { winner: 1, why: 'crossingHeld' });
  assert.equal(outcome(b).gateTaken, false);
  assert.equal(b.events.filter(e => e.kind === 'ferryEngaged').length, 1);
});

test('a port attacker still takes the crossing, and an ordinary town has no hold timer', () => {
  const b = atTown();
  b.units[0].pos = b.keep;
  b.units[1].pos = atDistance(b, 3);
  run(b, 9);
  assert.equal(b.over, null);
  b.units[1].pos = atDistance(b, 1);
  run(b, 1);
  assert.equal(b.keepHeld, 0);
  assert.equal(b.over, null);
  b.units[1].pos = atDistance(b, 3);
  run(b, 9);
  assert.equal(b.over, null);
  run(b, 1);
  assert.deepEqual(b.over, { winner: 0, why: 'crossingTaken' });
  assert(outcome(b).gateTaken);
  const inland = atTown('pingyuan');
  assert.equal(inland.ferry, null);
  assert.match(campaignBattleBriefing(b.setup, 'wanglang').objective[0], /18秒/);
  assert.doesNotMatch(campaignBattleBriefing(inland.setup, 'wanglang').objective[0], /18秒/);
});
