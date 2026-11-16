import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRecordBook, createTrialBook, TRIAL_GOALS } from '../src/records.mjs';
import { createAct, stepAct, tuftReady } from '../src/rules/act.mjs';
import { HAIRS } from '../src/rules/clones.mjs';
import { flatLevel } from '../src/rules/level.mjs';

const step = 1 / 120;
const level = flatLevel(1920, 432, [{ type: 'spawn', x: 200, y: 432 }, { type: 'post', x: 264, y: 432 }]);
const input = { move: 0, jump: false, jumpHeld: false, attack: false, dash: false, special: false };

test('a staff trial disables conjuring and keeps staff blows and the campaign intact', () => {
  const solo = createAct(level, { solo: true });
  const regular = createAct(level);
  for (const act of [solo, regular]) {
    for (let frame = 0; frame < 60; frame++) stepAct(act, { ...input, attack: frame === 0 }, step);
    assert.equal(act.posts[0].hits, 1);
  }
  assert.equal(solo.hairs, 0);
  assert.equal(regular.hairs, 1);

  solo.hairs = regular.hairs = HAIRS.need;
  assert.equal(tuftReady(solo), false);
  assert.equal(tuftReady(regular), true);
  assert(!stepAct(solo, { ...input, special: true }, step).some(event => event.type === 'conjure'));
  assert(stepAct(regular, { ...input, special: true }, step).some(event => event.type === 'conjure'));
});

test('staff trial medals persist using separate targets and storage from the campaign', () => {
  const keys = new Map([
    ['lantern-shadows-ranks', '{"act2":"A"}'],
  ]);
  const storage = { getItem: key => keys.get(key), setItem: (key, value) => keys.set(key, value) };
  const campaign = createRecordBook(storage);
  const trial = createTrialBook(storage);
  const goal = TRIAL_GOALS.act2;
  assert.equal(trial.get('act2'), undefined);
  trial.record('act2', { rank: 'C', time: goal.time, best: goal.combo, falls: 0 });
  trial.record('act2', { rank: 'B', time: goal.time + 4, best: goal.combo - 1, falls: 1 });
  assert.deepEqual(createTrialBook(storage).get('act2'), {
    rank: 'B', time: goal.time, combo: goal.combo, noFalls: true, goals: [true, true, true],
  });
  assert.equal(campaign.get('act2').rank, 'A');
  assert.deepEqual(createRecordBook(storage).get('act2').goals, [false, false, false]);
  assert.equal(keys.has('lantern-shadows-records'), false);
  assert.equal(keys.has('lantern-shadows-trials'), true);
});
