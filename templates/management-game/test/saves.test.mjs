import test from 'node:test';
import assert from 'node:assert/strict';
import { readProgress, writeProgress } from '../src/saves.mjs';
import { words } from '../src/i18n.mjs';

test('save restores the finished location and preferences but never a preview', () => {
  const stored = new Map();
  const game = { save: (key, val) => stored.set(key, val), load: (key, fallback) => stored.get(key) ?? fallback };
  writeProgress(game, { house: 'ford', selected: 'willow' }, { language: 'zh', muted: true });
  assert.deepEqual(readProgress(game), { house: 'ford', language: 'zh', muted: true });
  assert.deepEqual(readProgress({ load: () => ({ house: 'lake', language: 'xx', muted: 1 }) }),
    { house: null, language: null, muted: false });
});

test('every on-screen message has both translations', () => {
  for (const pair of Object.values(words)) {
    assert.ok(pair.zh.trim());
    assert.ok(pair.en.trim());
  }
});
