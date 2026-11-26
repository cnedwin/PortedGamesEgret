import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
import { dailyChallenge } from '../src/daily.mjs';
import { createGame, ENDLESS } from '../src/sim/sand.mjs';

const { freshSave, recordDailyRound } = await import('../src/saves.mjs');

test('the daily scroll and its initial pieces depend on the UTC day, not the choice of time zone', () => {
  const first = dailyChallenge(new Date('2026-11-23T23:30:00Z'));
  const same = dailyChallenge(new Date('2026-11-24T07:30:00+08:00'));
  const tomorrow = dailyChallenge(new Date('2026-11-24T00:00:00Z'));
  assert.deepEqual(first, same);
  assert.equal(first.day, '2026-11-23');
  assert.equal(tomorrow.day, '2026-11-24');
  assert(first.level >= 0 && first.level < ENDLESS);
  assert.notEqual(first.level, tomorrow.level);
  assert.notEqual(first.seed, tomorrow.seed);
  assert.deepEqual(createGame(first.seed, first.level).tray, createGame(same.seed, same.level).tray);
});

test('a daily best and completion are independent from the original scores and unlocks', () => {
  const save = freshSave();
  const day = '2026-11-23';
  assert.equal(recordDailyRound(save, { day, score: 1200, won: false }), true);
  assert.equal(recordDailyRound(save, { day, score: 1000, won: true }), false);
  assert.deepEqual(save.daily, { day, score: 1200, finished: true });
  assert.equal(save.best, 0);
  assert.equal(save.bestEndless, 0);
  assert.equal(save.plays, 0);
  assert.deepEqual(save.finished, []);
});

test('a run kept open across midnight cannot replace a newer daily result', () => {
  const save = freshSave();
  recordDailyRound(save, { day: '2026-11-23', score: 1200, won: true });
  recordDailyRound(save, { day: '2026-11-24', score: 500, won: false });
  assert.equal(recordDailyRound(save, { day: '2026-11-23', score: 2200, won: true }), false);
  assert.deepEqual(save.daily, { day: '2026-11-24', score: 500, finished: false });
});
