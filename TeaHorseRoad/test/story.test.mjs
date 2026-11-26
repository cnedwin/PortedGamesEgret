import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ending } from '../src/play/story.mjs';

test('the top ending distinguishes a complete load from a small loss', () => {
  const complete = ending(72 / 72);
  const nearComplete = ending(71 / 72);
  assert.deepEqual(complete.title, { zh: '茶到了，一捆不少', en: 'The tea arrived, every bundle' });
  assert.deepEqual(nearComplete.title, { zh: '茶到了，只少了几捆', en: 'The tea arrived, almost every bundle' });
  assert.deepEqual(complete.lines, nearComplete.lines);
});
