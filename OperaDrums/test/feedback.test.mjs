import assert from 'node:assert/strict';
import { test } from 'node:test';
import { explainStrike } from '../src/sim/feedback.mjs';

const next = { kind: 'gong', t: 2, roll: 0 };
const previous = { ...next, t: 1.5 };

test('explain early, late, accurate and wrong-pad input from real judge results', () => {
  const judged = { type: 'judged', note: next, judgement: 'ok' };
  assert.deepEqual(explainStrike({ ...judged, off: -0.083 }, 'gong', 1.917, next), { key: 'timingEarly', n: 83 });
  assert.deepEqual(explainStrike({ ...judged, off: 0.072 }, 'gong', 2.072, next), { key: 'timingLate', n: 72 });
  assert.deepEqual(explainStrike({ ...judged, judgement: 'great', off: 0 }, 'gong', 2, null), { key: 'timingExact' });
  assert.deepEqual(explainStrike({ ...judged, judgement: 'miss', off: 0 }, 'drum', 2, null), { key: 'timingUseGong' });
});

test('an out-of-window stroke can explain a nearby missed note without creating a match', () => {
  const empty = { type: 'empty' };
  assert.deepEqual(explainStrike(empty, 'gong', 1.84, next, previous), { key: 'timingEarly', n: 160 });
  assert.deepEqual(explainStrike(empty, 'gong', 1.66, next, previous), { key: 'timingLate', n: 160 });
  assert.equal(explainStrike(empty, 'gong', 1, next, previous), null);
  assert.equal(explainStrike(empty, 'drum', 1.84, next, previous), null);
});
