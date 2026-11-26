import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LEAD, timeAt } from '../src/sim/chart.mjs';
import { LESSON_CLICKS, LESSON_SONG, LESSON_STEPS, buildLesson, lessonStepAt } from '../src/sim/lesson.mjs';
import { advance, createRun, strike } from '../src/sim/judge.mjs';

test('the lesson has four distinct skills, time to read ahead, and closes during the backing', () => {
  const lesson = buildLesson();
  const beatDuration = 60 / LESSON_SONG.bpm;
  assert.deepEqual(LESSON_STEPS.map(step => step.skill), ['drum', 'gong', 'double', 'roll']);
  for (const [index, step] of LESSON_STEPS.entries()) {
    assert.equal(lessonStepAt(timeAt(LESSON_SONG, step.beat) - 0.25), index);
    assert.equal(lesson.notes.find(note => note.beat === step.beat).t, timeAt(LESSON_SONG, step.beat));
  }
  assert.ok(lesson.notes.at(-1).t + lesson.notes.at(-1).roll < lesson.end);
  assert.ok(lesson.end + .3 < LEAD.seconds + LESSON_CLICKS * beatDuration);
});

test('practice uses the real timing judge, two different hands, and timed rolls', () => {
  const lesson = buildLesson();
  const run = createRun(lesson);
  for (const note of lesson.notes) {
    if (note.roll) {
      for (let i = 0; i < 4; i++) assert.equal(strike(run, 'drum', note.t + i * .15, 'f').type, 'roll');
      continue;
    }
    assert.equal(strike(run, note.kind, note.t, 'a').judgement, 'great');
    if (note.big) assert.equal(strike(run, 'gong', note.t + .02, 'b').type, 'double');
  }
  advance(run, lesson.end);
  assert.equal(run.done, true);
  assert.equal(run.doubles, 2);
  assert.equal(run.rolls, 4);
});

test('replaying one step brings just that skill in after a new count-in', () => {
  for (const [index, step] of LESSON_STEPS.entries()) {
    const complete = buildLesson();
    const single = buildLesson(step.skill);
    const right = LESSON_STEPS[index + 1]?.beat ?? complete.beats;
    const expected = complete.notes.filter(note => note.beat >= step.beat && note.beat < right);
    assert.deepEqual(single.notes.map(({ kind, big, roll }) => ({ kind, big, roll })),
      expected.map(({ kind, big, roll }) => ({ kind, big, roll })));
    assert.equal(single.notes[0].beat, LEAD.beats);
    assert.ok(single.end < complete.end);
    assert.ok(single.notes.at(-1).t + single.notes.at(-1).roll < single.end);
  }
});
