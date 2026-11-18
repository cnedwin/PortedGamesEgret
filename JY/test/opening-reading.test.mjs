import assert from 'node:assert/strict';
import test from 'node:test';
import { createOpeningReading } from '../web/opening-reading.mjs';

test('opening fast-forward uses earlier acknowledgments and stops at unread dialogue', () => {
  const store = new Map();
  const storage = { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) };
  const first = createOpeningReading('edition', storage);
  assert.equal(first.start(1), false);
  first.acknowledge(1);
  first.acknowledge(3);
  assert.equal(first.start(1), false);

  const replay = createOpeningReading('edition', storage);
  assert.equal(replay.start(1), true);
  assert.equal(replay.shouldSkip(3), true);
  assert.equal(replay.shouldSkip(4), false);
  assert.equal(replay.shouldSkip(1), false);
  assert.equal(createOpeningReading('other-edition', storage).start(1), false);
});
