import test from 'node:test';
import assert from 'node:assert/strict';
import * as sim from '../src/sim.mjs';
import {
  FIRST_EVENING, freshFirstEvening, offerFirstEvening, firstEveningStatus,
  markFirstEveningRead, takeFirstEveningNotice, beginFirstEvening, finishFirstEvening,
  firstEveningTime, firstEveningAction,
} from '../src/first-evening.mjs';
import { FIRST_EVENING_SCRIPT } from '../src/story/first-evening.mjs';

const term = (day = 1, slot = 0) => ({ ...sim.newGame({ seed: 183 }), day, slot, firstEvening: freshFirstEvening() });
const clockAndResources = s => JSON.stringify({ day: s.day, slot: s.slot, energy: s.energy, money: s.money, girls: s.girls });

test('legacy saves without the feature remain unchanged, including after deserialize', () => {
  const legacy = sim.newGame({ seed: 137 });
  delete legacy.firstEvening;
  for (const s of [legacy, sim.deserialize(sim.serialize(legacy))]) {
    const before = sim.serialize(s);
    assert.equal(offerFirstEvening(s), false);
    assert.equal(firstEveningStatus(s), null);
    assert.equal(markFirstEveningRead(s), false);
    assert.equal(takeFirstEveningNotice(s), false);
    assert.equal(beginFirstEvening(s), null);
    assert.equal(finishFirstEvening(s), false);
    assert.equal(sim.serialize(s), before);
    assert.equal(Object.hasOwn(s, 'firstEvening'), false);
  }
});

test('a completed classroom activity delivers the first invite only in a new term', () => {
  const s = sim.newGame({ seed: 137 });
  const legacy = sim.deserialize(sim.serialize(s));
  delete legacy.firstEvening;
  sim.enter(s, 'classroom');
  sim.enter(legacy, 'classroom');
  assert.ok(sim.act(s, 'classroom', 'lecture'));
  assert.ok(sim.act(legacy, 'classroom', 'lecture'));
  assert.equal(s.slot, 1);
  assert.equal(firstEveningStatus(s).phase, 'upcoming');
  assert.equal(firstEveningStatus(legacy), null);
  assert.equal(s.stats.intellect, legacy.stats.intellect);
  assert.equal(s.energy, legacy.energy);
});

test('first offer uses the actual action day and can only happen once', () => {
  const s = term(3, 1), other = freshFirstEvening();
  assert.equal(firstEveningStatus(s), null);
  assert.equal(takeFirstEveningNotice(s), false);
  assert.equal(markFirstEveningRead(s), false);
  assert.equal(offerFirstEvening(s), true);
  assert.deepEqual(firstEveningStatus(s), { day: 3, phase: 'upcoming', read: false, resumable: false });
  assert.equal(offerFirstEvening(s), false);
  s.day = 4;
  assert.equal(offerFirstEvening(s), false);
  assert.equal(firstEveningStatus(s).day, 3);
  assert.equal(other.invited, false);
});

test('notice and read acknowledgements survive a save and are idempotent', () => {
  const s = term();
  offerFirstEvening(s);
  assert.equal(takeFirstEveningNotice(s), true);
  assert.equal(takeFirstEveningNotice(s), false);
  const copy = sim.deserialize(sim.serialize(s));
  assert.equal(takeFirstEveningNotice(copy), false);
  assert.equal(firstEveningStatus(copy).read, false);
  assert.equal(markFirstEveningRead(copy), true);
  assert.equal(markFirstEveningRead(copy), false);
  assert.equal(firstEveningStatus(sim.deserialize(sim.serialize(copy))).read, true);
});

test('the invitation opens at evening and remains available that night', () => {
  const s = term(2, 0);
  offerFirstEvening(s);
  assert.equal(beginFirstEvening(s), null);
  s.slot = 1;
  assert.equal(beginFirstEvening(s), null);
  s.slot = 2;
  assert.equal(firstEveningStatus(s).phase, 'ready');
  assert.deepEqual(beginFirstEvening(s), { id: 'first-evening', done: {}, choices: {}, cursor: null });
  assert.equal(firstEveningStatus(s).read, true);
  s.slot = 3;
  assert.equal(firstEveningStatus(s).phase, 'ready');
  assert.ok(beginFirstEvening(s));
});

test('a paused choice checkpoint is reused, including after a save round trip', () => {
  const s = term(1, 2);
  offerFirstEvening(s);
  const clock = clockAndResources(s);
  const checkpoint = beginFirstEvening(s);
  checkpoint.done['3'] = true;
  checkpoint.choices['7'] = 1;
  checkpoint.cursor = '7.choice1.1';
  assert.strictEqual(beginFirstEvening(s), checkpoint);
  assert.equal(firstEveningStatus(s).resumable, true);
  const copy = sim.deserialize(sim.serialize(s));
  const resumed = beginFirstEvening(copy);
  assert.deepEqual(resumed, checkpoint);
  assert.strictEqual(beginFirstEvening(copy), resumed);
  assert.equal(clockAndResources(copy), clock);
});

test('the next calendar day keeps message history but cannot resume or finish a missed meeting', () => {
  const s = term(4, 3);
  offerFirstEvening(s);
  beginFirstEvening(s);
  s.day = 5;
  s.slot = 0;
  assert.deepEqual(firstEveningStatus(s), { day: 4, phase: 'missed', read: true, resumable: false });
  assert.equal(beginFirstEvening(s), null);
  assert.equal(finishFirstEvening(s), false);
  assert.equal(s.firstEvening.invited, true);
  assert.equal(firstEveningStatus(sim.deserialize(sim.serialize(s))).phase, 'missed');
});

test('finish requires a start and cannot grant completion twice or alter resources', () => {
  const s = term(1, 2);
  offerFirstEvening(s);
  const before = clockAndResources(s);
  assert.equal(finishFirstEvening(s), false);
  beginFirstEvening(s);
  assert.equal(finishFirstEvening(s), true);
  assert.equal(finishFirstEvening(s), false);
  assert.equal(beginFirstEvening(s), null);
  assert.deepEqual(firstEveningStatus(s), { day: 1, phase: 'completed', read: true, resumable: false });
  s.day = 2;
  assert.equal(firstEveningStatus(s).phase, 'completed');
  s.day = 1;
  assert.equal(clockAndResources(s), before);
});

test('shared time and action copy follows the invitation day and phase without mutation', () => {
  assert.equal(firstEveningTime(null), null);
  assert.equal(firstEveningAction(null), null);
  const upcoming = { day: 3, phase: 'upcoming', read: false, resumable: false };
  const before = JSON.stringify(upcoming);
  assert.deepEqual(firstEveningTime(upcoming), ['第3天 · 傍晚至夜晚', 'Day 3 · Evening or night']);
  assert.deepEqual(firstEveningAction(upcoming), ['等到傍晚赴约', 'Wait until evening and meet']);
  assert.deepEqual(firstEveningAction({ ...upcoming, phase: 'ready' }), ['赴约', 'Go to the meeting']);
  assert.deepEqual(firstEveningAction({ ...upcoming, phase: 'ready', resumable: true }), ['继续赴约', 'Resume the meeting']);
  assert.equal(firstEveningAction({ ...upcoming, phase: 'completed' }), null);
  assert.equal(firstEveningAction({ ...upcoming, phase: 'missed' }), null);
  assert.equal(JSON.stringify(upcoming), before);
});

test('invitation copy and short story use existing scenes and one recalled choice without rewards', () => {
  assert.equal(FIRST_EVENING.girl, 'linxia');
  assert.equal(FIRST_EVENING.place, 'gate');
  assert.equal(FIRST_EVENING.slot, 2);
  assert.deepEqual(FIRST_EVENING.venue, ['樱花道', 'Cherry-tree Walk']);
  assert.deepEqual(FIRST_EVENING.time, ['傍晚至夜晚', 'Evening or night']);
  for (const key of ['title', 'time', 'venue', 'task', 'message']) {
    assert.equal(FIRST_EVENING[key].length, 2);
    assert.ok(FIRST_EVENING[key].every(text => typeof text === 'string' && text.length));
  }
  const choices = FIRST_EVENING_SCRIPT.filter(step => step[0] === 'pick');
  assert.equal(choices.length, 1);
  assert.equal(choices[0][1].length, 2);
  const inspect = steps => {
    for (const step of steps) {
      assert.ok(['music', 'bg', 'in', 'n', 'me', 'linxia', 'pick'].includes(step[0]));
      if (step[0] === 'bg') assert.deepEqual(step, ['bg', 'gate']);
      if (step[0] === 'pick') {
        for (const option of step[1]) {
          assert.equal(option.fx, undefined);
          assert.ok(option.t.every(text => typeof text === 'string' && text.length));
          assert.ok(option.then.some(item => item[0] === 'linxia'));
          inspect(option.then);
        }
      }
      if (step[0] === 'n' || step[0] === 'me') assert.ok(step[1] && step[2]);
      if (step[0] === 'linxia') assert.ok(step[2] && step[3]);
    }
  };
  inspect(FIRST_EVENING_SCRIPT);
  assert.notDeepEqual(choices[0][1][0].then, choices[0][1][1].then);
  for (const option of choices[0][1]) {
    const path = FIRST_EVENING_SCRIPT.flatMap(step => step[0] === 'pick' ? option.then : [step]);
    const lines = path.filter(step => ['n', 'me', 'linxia'].includes(step[0]));
    assert.ok(lines.length >= 10 && lines.length <= 13);
  }
});
