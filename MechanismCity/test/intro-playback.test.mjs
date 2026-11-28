import test from 'node:test';
import assert from 'node:assert/strict';
import { startOptionalIntro } from '../src/intro-playback.mjs';

function manualClock() {
  let task;
  return { schedule(fn) { task = fn; return 1; }, cancel() { task = undefined; }, expire() { const fn = task; task = undefined; fn?.(); } };
}

test('a video play promise that never settles cannot hold the game in a blank opening screen', () => {
  const clock = manualClock(); let skipped = 0;
  const control = startOptionalIntro({ play: () => new Promise(() => {}) }, { fallback: () => skipped++, schedule: clock.schedule, cancel: clock.cancel });
  clock.expire(); clock.expire();
  assert.equal(skipped, 1);
  control.dispose();
});

test('opening video remains optional, but a real first frame cancels its startup timeout', async () => {
  const clock = manualClock(); let skipped = 0, reject;
  const control = startOptionalIntro({ play: () => new Promise((_, fail) => { reject = fail; }) }, { fallback: () => skipped++, schedule: clock.schedule, cancel: clock.cancel });
  control.shown(); clock.expire(); assert.equal(skipped, 0);
  control.dispose(); reject(new Error('closed old media')); await Promise.resolve();
  assert.equal(skipped, 0);
});

test('media rejection advances to the requested next screen once', async () => {
  const clock = manualClock(); let skipped = 0;
  const control = startOptionalIntro({ play: () => Promise.reject(new Error('not supported')) }, { fallback: () => skipped++, schedule: clock.schedule, cancel: clock.cancel });
  await Promise.resolve(); clock.expire(); control.failed();
  assert.equal(skipped, 1);
});
