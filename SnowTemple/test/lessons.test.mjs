import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLessons } from '../src/lessons.mjs';

test('combat tips are contextual and only shown once per run', () => {
  const lesson = createLessons();
  assert.equal(lesson({ type: 'pickup' }), null);
  assert.match(lesson({ type: 'stage', stage: 'yard' }), /格挡/);
  assert.equal(lesson({ type: 'stage', stage: 'yard' }), null);
  assert.match(lesson({ type: 'parry' }), /回马枪/);
  assert.equal(lesson({ type: 'block' }), null);
  assert.equal(lesson({ type: 'parry' }), null);
});

test('successful counters suppress obsolete counter instructions', () => {
  const lesson = createLessons();
  lesson({ type: 'riposte' });
  assert.equal(lesson({ type: 'block' }), null);
  assert.match(lesson({ type: 'guardBreak' }), /气力/);
  assert.equal(lesson({ type: 'guardBreak' }), null);
  assert.match(lesson({ type: 'stage', stage: 'boss' }), /闪避/);
});

test('a guard-breaking block does not teach an unavailable counter or consume its reminder', () => {
  const lesson = createLessons();
  assert.equal(lesson({ type: 'block' }, false), null);
  assert.match(lesson({ type: 'guardBreak' }, false), /气力/);
  assert.match(lesson({ type: 'block' }, true), /回马枪/);
});

test('on-screen combat hints identify their action and stay short enough for touch play', () => {
  const lesson = createLessons({ structured: true });
  const hints = [
    lesson({ type: 'stage', stage: 'yard' }),
    lesson({ type: 'parry' }),
    lesson({ type: 'guardBreak' }),
    lesson({ type: 'stage', stage: 'boss' })
  ];
  assert.deepEqual(hints.map(({ action }) => action), ['guard', 'attack', null, 'dodge']);
  assert.ok(hints.every(({ text }) => text.length <= 24));
  assert.match(hints[3].text, /斜纹/);
});
