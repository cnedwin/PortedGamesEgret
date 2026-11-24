import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame } from '../src/sim/world.mjs';
import { clamp, generalEffect, stat, techEffect } from '../src/sim/core.mjs';
import { TECHS } from '../src/data/techs.mjs';
import * as people from '../src/sim/people.mjs';

function city() {
  const state = createGame({ faction: 'zhangmiao', seed: 31, branch: 'free' });
  const nodeId = 'chenliu', factionId = 'zhangmiao', searcher = state.nodes[nodeId].governor;
  for (const g of Object.values(state.generals)) if (g.status === 'free' && g.at === nodeId) g.known = true;
  const candidates = Object.keys(state.generals).filter(id => state.generals[id].status === 'free').slice(0, 2);
  for (const id of candidates) Object.assign(state.generals[id], { at: nodeId, known: false });
  return { state, factionId, searcher, nodeId, candidates };
}

test('governor search quote is pure, bounded and uses the existing intelligence/charisma/trait/technology probability', () => {
  assert.equal(typeof people.governorSearchQuote, 'function');
  const { state, factionId, searcher, nodeId } = city();
  const tech = Object.values(TECHS).find(value => value.effects.search > 0);
  if (tech) state.factions[factionId].techs.push(tech.id);
  const before = JSON.stringify(state);
  const skill = .5 * stat(state, searcher, 'int') + .5 * stat(state, searcher, 'cha') +
    generalEffect(state, searcher, 'search') + techEffect(state, factionId, 'search');
  assert.deepEqual(people.governorSearchQuote(state, factionId, searcher, nodeId), {
    days: clamp(Math.round(14 - skill / 10), 5, 12),
    chance: clamp(.35 + skill / 200, 0, 1)
  });
  assert.equal(JSON.stringify(state), before);
  state.generals[searcher].statAdjust = { int: -1000, cha: -1000 };
  const low = people.governorSearchQuote(state, factionId, searcher, nodeId);
  state.generals[searcher].statAdjust = { int: 1000, cha: 1000 };
  const high = people.governorSearchQuote(state, factionId, searcher, nodeId);
  assert(high.chance > low.chance);
  assert(high.days < low.days);
  assert(low.days <= 12 && high.days >= 5);
});

test('invalid quote inputs are harmless and never reveal candidates or mutate the archive', () => {
  const { state, factionId, nodeId } = city(), before = JSON.stringify(state);
  assert.deepEqual(people.governorSearchQuote(state, factionId, 'not-an-officer', nodeId), { days: 12, chance: 0 });
  assert.equal(JSON.stringify(state), before);
});

test('delegated settlement matches original talent rolls without a second busy period or automatic recruitment', () => {
  const { state, factionId, searcher, nodeId, candidates } = city();
  state.hiddenTreasures = [];
  const manual = structuredClone(state);
  const expected = people.searchCity(manual, factionId, searcher, nodeId);
  const before = { day: state.day, coin: state.factions[factionId].coin, joined: state.stats.generalsRecruited };
  const result = people.settleGovernorSearch(state, factionId, searcher, nodeId);
  assert.deepEqual(result, { ok: true, found: expected.found.map(entry => entry.general) });
  assert.equal(state.rng, manual.rng);
  assert.equal(state.generals[searcher].busyUntil, undefined);
  assert.equal(manual.generals[searcher].busyUntil, manual.day + 10);
  assert.equal(state.generals[searcher].service.int, 1);
  assert.equal(state.stats.generalsRecruited, before.joined);
  assert.equal(state.day, before.day);
  assert.equal(state.factions[factionId].coin, before.coin);
  for (const id of candidates) {
    assert.equal(state.generals[id].status, 'free');
    assert.equal(state.generals[id].known, manual.generals[id].known);
  }
});

test('delegated search ignores treasures and never adds notices, logs, inventory or calendar changes', () => {
  const { state, factionId, searcher, nodeId } = city();
  state.hiddenTreasures.push({ at: nodeId, id: 'audit-hidden-treasure' });
  const untouched = s => [s.day, s.hiddenTreasures, s.factions[factionId].store,
    s.inbox, s.log, s.factions[factionId].coin, s.factions[factionId].grain];
  const before = structuredClone(untouched(state));
  assert.equal(people.settleGovernorSearch(state, factionId, searcher, nodeId).ok, true);
  assert.deepEqual(untouched(state), before);
});

test('settlement revalidates actual ownership, governorship, service, location and availability before any roll', () => {
  for (const change of [
    ({ state, nodeId }) => { state.nodes[nodeId].owner = 'caocao'; },
    ({ state, nodeId }) => { state.nodes[nodeId].governor = null; },
    ({ state, searcher }) => { state.generals[searcher].status = 'free'; },
    ({ state, searcher }) => { state.generals[searcher].faction = 'caocao'; },
    ({ state, searcher }) => { state.generals[searcher].at = 'qiao'; },
    ({ state, searcher }) => { state.generals[searcher].busyUntil = state.day + 1; }
  ]) {
    const fixture = city(), { state, factionId, searcher, nodeId } = fixture;
    change(fixture);
    const before = JSON.stringify(state);
    assert(people.settleGovernorSearch(state, factionId, searcher, nodeId).why);
    assert.equal(JSON.stringify(state), before);
  }
});

test('matured work is usable exactly at busyUntil and only unknown local free talent can be found', () => {
  const { state, factionId, searcher, nodeId, candidates } = city();
  state.generals[searcher].busyUntil = state.day;
  state.generals[candidates[0]].known = true;
  state.generals[candidates[1]].at = 'qiao';
  const rng = state.rng;
  const result = people.settleGovernorSearch(state, factionId, searcher, nodeId);
  assert.deepEqual(result, { ok: true, found: [] });
  assert.equal(state.rng, rng);
  assert.equal(state.generals[searcher].service.int, 1);
});

test('old v1 archives without service data settle deterministically without schema or RNG drift from quote reads', () => {
  const { state, factionId, searcher, nodeId } = city();
  delete state.generals[searcher].service;
  const restored = JSON.parse(JSON.stringify(state));
  for (let i = 0; i < 20; i++) people.governorSearchQuote(state, factionId, searcher, nodeId);
  const a = people.settleGovernorSearch(state, factionId, searcher, nodeId);
  const b = people.settleGovernorSearch(restored, factionId, searcher, nodeId);
  assert.deepEqual(a, b);
  assert.deepEqual(state, restored);
  assert.equal(state.version, 1);
});
