import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
import * as world from '../src/sim/world.mjs';
const { caps, createGame, advance, governorDuties, setGovernorDuty, processGovernorDuties,
  setGovernorRecruitment, startWork, workQuote } = world;
const { exportText, importText } = await import('../src/saves.mjs');

const faction = 'zhangmiao', id = 'chenliu';
function city() {
  const s = createGame({ faction, seed: 31, branch: 'free' });
  const node = s.nodes[id];
  s.factions[faction].coin = 8000;
  s.factions[faction].grain = 20000;
  return { s, node };
}
const duty = (s, kind, enabled = true) => setGovernorDuty(s, faction, id, kind, enabled);
function tomorrow(s) {
  s.day++;
  processGovernorDuties(s);
}

test('new duties are opt-in and legacy recruitment settings work after loading', () => {
  const { s } = city();
  assert(setGovernorRecruitment(s, faction, id, true).ok);
  const saved = importText(exportText(s));
  const before = JSON.stringify(saved);
  const view = governorDuties(saved, id);
  assert.equal(view.build.enabled, false);
  assert.equal(view.search.enabled, false);
  assert.equal(JSON.stringify(saved), before);
  assert.equal(saved.nodes[id].governorRecruitment.enabled, true);
});

test('works use ordinary coin and caps, favour scarce grain, and complete through the calendar', () => {
  const { s, node } = city();
  const before = node.farm;
  s.factions[faction].grain = 200;
  const cost = workQuote(s, id, 'farm').coin;
  assert(duty(s, 'build').ok);
  assert.equal(governorDuties(s, id).build.kind, 'farm');
  const cash = s.factions[faction].coin;
  assert(advance(s));
  assert.equal(node.work.kind, 'farm');
  assert.equal(node.work.governor, node.governor);
  assert.equal(s.factions[faction].coin, cash - cost);
  const days = node.work.left;
  assert(duty(s, 'build', false).ok);
  for (let d = 0; d < days; d++) assert(advance(s));
  assert.equal(node.farm, before + 1);
  assert.equal(node.work, null);
});

test('delegated works respect the forecast, official attributes, cash reserve, and manual jobs', () => {
  const { s, node } = city();
  Object.assign(node, caps(id));
  node.farm = 4;
  const weak = governorDuties(s, id).build.days;
  s.generals[node.governor].statAdjust = { pol: 100 };
  const strong = governorDuties(s, id).build.days;
  assert(strong < weak);
  assert(duty(s, 'build').ok);
  const { reserveCoin, coin } = governorDuties(s, id).build;
  s.factions[faction].coin = reserveCoin + coin - 1;
  tomorrow(s);
  assert.equal(node.work, null);
  assert.equal(governorDuties(s, id).build.status, 'coin');
  assert(startWork(s, faction, id, 'farm').ok);
  const manual = { ...node.work };
  tomorrow(s);
  assert.deepEqual(node.work, manual);
  assert.equal(governorDuties(s, id).build.status, 'working');
});

test('a delegated search takes time, keeps its date through saves, and resolves once when allowed to finish', () => {
  const { s, node } = city();
  const talent = Object.keys(s.generals).find(key => s.generals[key].status === 'free');
  Object.assign(s.generals[talent], { at: id, known: false });
  assert(duty(s, 'search').ok);
  assert(advance(s));
  assert.equal(s.generals[talent].known, false);
  const job = node.governorDuties.search.job;
  assert(job.dueDay > s.day);
  assert.equal(s.generals[node.governor].busyUntil, job.dueDay);
  const restored = importText(exportText(s));
  assert.deepEqual(restored.nodes[id].governorDuties.search.job, job);
  assert(duty(restored, 'search', false).ok);
  restored.day = job.dueDay - 1;
  restored.rng = 1;
  tomorrow(restored);
  const policy = restored.nodes[id].governorDuties.search;
  assert.equal(policy.job, undefined);
  assert(policy.last.found.includes(talent));
  assert.equal(restored.generals[talent].status, 'free');
  const before = JSON.stringify(restored);
  processGovernorDuties(restored);
  assert.equal(JSON.stringify(restored), before);
});

test('city loss, siege, and a reassigned governor cannot execute stale orders', () => {
  const { s, node } = city();
  assert(duty(s, 'search').ok);
  tomorrow(s);
  const old = node.governor, job = node.governorDuties.search.job;
  s.day = job.dueDay;
  node.siege = { by: 'caocao' };
  processGovernorDuties(s);
  assert.deepEqual(node.governorDuties.search.job, job);
  node.siege = null;
  node.governor = null;
  s.generals[old].at = 'xuchang';
  processGovernorDuties(s);
  assert.equal(node.governorDuties.search.job, undefined);
  node.owner = 'caocao';
  processGovernorDuties(s);
  assert.equal(node.governorDuties, undefined);
});
