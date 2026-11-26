import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
import * as world from '../src/sim/world.mjs';
const { exportText, importText } = await import('../src/saves.mjs');

function city() {
  const s = world.createGame({ faction: 'zhangmiao', seed: 31, branch: 'free' });
  const id = 'chenliu', node = s.nodes[id];
  node.troops = 1000;
  node.support = 70;
  s.factions.zhangmiao.coin = 5000;
  s.factions.zhangmiao.grain = 20000;
  return { s, id, node };
}

test('legacy cities have no implicit delegation and status reads never mutate them', () => {
  assert.equal(typeof world.governorRecruitment, 'function');
  const { s, id } = city(), before = JSON.stringify(s);
  const status = world.governorRecruitment(s, id);
  assert.equal(status.enabled, false);
  assert.equal(status.available, true);
  assert.equal(status.status, 'off');
  assert.equal(JSON.stringify(s), before);
});

test('delegation calls the original recruit rules, at most once per five days with the same costs', () => {
  const { s, id, node } = city();
  assert.equal(world.setGovernorRecruitment(s, 'zhangmiao', id, true).ok, true);
  world.processGovernorRecruitment(s);
  assert.equal(node.troops, 1000);
  s.day += 5;
  const expected = structuredClone(s);
  const original = world.recruit(expected, 'zhangmiao', id, 500);
  world.processGovernorRecruitment(s);
  assert.equal(node.troops, expected.nodes[id].troops);
  assert.equal(s.factions.zhangmiao.coin, expected.factions.zhangmiao.coin);
  assert.equal(node.people, expected.nodes[id].people);
  assert.equal(node.support, expected.nodes[id].support);
  assert.equal(node.training, expected.nodes[id].training);
  assert.equal(world.governorRecruitment(s, id).lastGot, original.got);
  const after = node.troops;
  world.processGovernorRecruitment(s);
  s.day += 4; world.processGovernorRecruitment(s);
  assert.equal(node.troops, after);
});

test('stopping and restarting does not reset the last successful batch cooldown', () => {
  const { s, id, node } = city();
  world.setGovernorRecruitment(s, 'zhangmiao', id, true);
  s.day += 5; world.processGovernorRecruitment(s);
  const count = node.troops;
  world.setGovernorRecruitment(s, 'zhangmiao', id, false);
  world.setGovernorRecruitment(s, 'zhangmiao', id, true);
  world.processGovernorRecruitment(s);
  assert.equal(node.troops, count);
});

test('resources pause a live delegation without spending, weakening support or adding inbox entries', () => {
  for (const [reason, change] of [
    ['support', ({ node }) => { node.support = 60; }],
    ['coin', ({ s }) => { s.factions.zhangmiao.coin = 611; }],
    ['grain', ({ s }) => { s.factions.zhangmiao.grain = 100; }],
    ['people', ({ node }) => { node.levied = Math.floor(node.people * .05); }]
  ]) {
    const fixture = city(), { s, id, node } = fixture;
    world.setGovernorRecruitment(s, 'zhangmiao', id, true);
    s.day += 5; change(fixture);
    const before = [node.troops, node.people, node.support, s.factions.zhangmiao.coin, JSON.stringify(s.inbox)];
    world.processGovernorRecruitment(s);
    assert.equal(world.governorRecruitment(s, id).status, reason);
    assert.deepEqual([node.troops, node.people, node.support, s.factions.zhangmiao.coin, JSON.stringify(s.inbox)], before);
  }
});

test('actual absent/busy governors, siege and pending battle prevent delegated recruitment', () => {
  for (const [reason, change] of [
    ['noGovernor', ({ node }) => { node.governor = null; }],
    ['noGovernor', ({ s, node }) => { s.generals[node.governor].at = 'puyang'; }],
    ['busy', ({ s, node }) => { s.generals[node.governor].busyUntil = s.day + 10; }],
    ['siege', ({ s, id }) => { s.armies.auditor = { faction: 'yuanshao', troops: 1000, besieging: id, at: id }; }],
    ['pendingBattle', ({ s, id }) => { s.inbox.push({ kind: 'battle', blocks: true, setup: { place: { node: id } } }); }]
  ]) {
    const fixture = city(), { s, id, node } = fixture;
    world.setGovernorRecruitment(s, 'zhangmiao', id, true);
    s.day += 5; change(fixture);
    world.processGovernorRecruitment(s);
    assert.equal(node.troops, 1000);
    assert.equal(world.governorRecruitment(s, id).status, reason);
  }
});

test('ownership change permanently stops the old delegation, including capture and later recapture', () => {
  const { s, id, node } = city();
  world.setGovernorRecruitment(s, 'zhangmiao', id, true);
  node.owner = 'yuanshao'; s.day += 5;
  world.processGovernorRecruitment(s);
  assert.equal(world.governorRecruitment(s, id).enabled, false);
  node.owner = 'zhangmiao'; s.day += 5;
  world.processGovernorRecruitment(s);
  assert.equal(node.troops, 1000);
  assert.equal(world.governorRecruitment(s, id).enabled, false);
});

test('partial affordable batches preserve 600 coin, and support stays at least sixty', () => {
  const { s, id, node } = city();
  s.factions.zhangmiao.coin = 624;
  node.support = 60.1;
  world.setGovernorRecruitment(s, 'zhangmiao', id, true);
  s.day += 5; world.processGovernorRecruitment(s);
  assert(node.troops >= 1100 && node.troops <= 1200);
  assert(s.factions.zhangmiao.coin >= 600);
  assert(node.support >= 60);
});

test('real advance, save/restore and another five days retain earned batches without duplicate execution', () => {
  const { s, id, node } = city();
  world.setGovernorRecruitment(s, 'zhangmiao', id, true);
  for (let i = 0; i < 5; i++) assert.equal(world.advance(s), true);
  assert.equal(node.troops, 1500);
  const restored = importText(exportText(s));
  assert(restored);
  world.processGovernorRecruitment(restored);
  assert.equal(restored.nodes[id].troops, 1500);
  for (let i = 0; i < 5; i++) assert.equal(world.advance(restored), true);
  assert.equal(restored.nodes[id].troops, 2000);
  assert.equal(restored.inbox.length, 0);
});

test('real recruitment technology cannot exceed the five-hundred batch or three-thousand target', () => {
  const { s, id, node } = city();
  s.factions.zhangmiao.techs.push('levy');
  world.setGovernorRecruitment(s, 'zhangmiao', id, true);
  for (let i = 0; i < 10; i++) {
    s.day += 5;
    const before = node.troops;
    world.processGovernorRecruitment(s);
    const got = node.troops - before;
    assert(got === 0 || (got >= 100 && got <= 500));
    assert(node.troops <= 3000);
  }
  assert(node.troops >= 2900);
  assert.equal(world.governorRecruitment(s, id).status, 'complete');
});

test('a completed duty raises no excess troops and resumes after the garrison is legitimately reduced', () => {
  const { s, id, node } = city();
  node.troops = 3000;
  world.setGovernorRecruitment(s, 'zhangmiao', id, true);
  s.day += 5;
  const before = s.factions.zhangmiao.coin;
  world.processGovernorRecruitment(s);
  assert.equal(node.troops, 3000);
  assert.equal(s.factions.zhangmiao.coin, before);
  node.troops -= 500;
  world.processGovernorRecruitment(s);
  assert.equal(node.troops, 3000);
  assert.equal(world.governorRecruitment(s, id).enabled, true);
});

test('a paused duty resumes only after the actual governor becomes free, while foreign toggles are rejected', () => {
  const { s, id, node } = city();
  assert.equal(world.setGovernorRecruitment(s, 'caocao', id, true).why, 'notOurs');
  assert.equal(node.governorRecruitment, undefined);
  world.setGovernorRecruitment(s, 'zhangmiao', id, true);
  s.generals[node.governor].busyUntil = s.day + 6;
  s.day += 5; world.processGovernorRecruitment(s);
  assert.equal(node.troops, 1000);
  s.day++; world.processGovernorRecruitment(s);
  assert.equal(node.troops, 1500);
  assert.equal(s.inbox.length, 0);
});
