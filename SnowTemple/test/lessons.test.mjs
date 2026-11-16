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
