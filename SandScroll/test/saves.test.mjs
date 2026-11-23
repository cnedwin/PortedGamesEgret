// 存档：新档、设置写入、最好成绩、坏档另存后重新开始、版本过新时重新开始、存储拒绝写入时不报错。
// The save: a fresh one, settings written, the best time, an unreadable save set aside and started again, a save too
// new started again, and a storage that refuses writes without an error.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { SAVE_KEY, freshSave, openSave, recordRound } = await import('../src/saves.mjs');

function memory(initial = {}, { refuse = false } = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      if (refuse) throw new Error('QuotaExceededError');
      items.set(key, String(value));
    },
    removeItem: (key) => void items.delete(key)
  };
}

test('a fresh save speaks the page language and has no best score', () => {
  const save = openSave(memory(), 'en');
  assert.deepEqual(save.data, freshSave('en'));
});

test('settings, the best score and a finished scroll survive opening the save again', () => {
  const storage = memory(),
    save = openSave(storage);
  assert.equal(
    save.update((data) => {
      data.settings.language = 'en';
      recordRound(data, { score: 12345, scroll: 'spring', won: true });
    }),
    true
  );
  const again = openSave(storage);
  assert.equal(again.data.settings.language, 'en');
  assert.equal(again.data.best, 12345);
  assert.equal(again.data.plays, 1);
  assert.deepEqual(again.data.finished, ['spring']);
});

test('only a higher score is a new best, and a scroll is counted finished once', () => {
  const data = freshSave();
  assert.equal(recordRound(data, { score: 2000, scroll: 'spring', won: false }), true);
  assert.equal(recordRound(data, { score: 1500, scroll: 'spring', won: true }), false);
  assert.equal(recordRound(data, { score: 9000, scroll: 'spring', won: true }), true);
  assert.equal(data.best, 9000);
  assert.equal(data.plays, 3);
  assert.deepEqual(data.finished, ['spring']);
});

test('a broken save is started again and the old text kept aside', () => {
  const problems = [],
    storage = memory({ [SAVE_KEY]: '{not json' }),
    save = openSave(storage, 'zh', (problem) => problems.push(problem.kind));
  assert.deepEqual(save.data, freshSave('zh'));
  assert.ok(problems.length > 0);
  assert.ok([...storage.items.keys()].some((key) => key !== SAVE_KEY && key.startsWith(SAVE_KEY)));
});

test('a save of another shape or from a newer build is started again', () => {
  const wrong = openSave(memory({ [SAVE_KEY]: JSON.stringify({ version: 1, savedAt: '', data: { best: 'fast' } }) }));
  assert.equal(wrong.data.best, 0);
  const problems = [],
    newer = openSave(memory({ [SAVE_KEY]: JSON.stringify({ version: 99, savedAt: '', data: freshSave() }) }), 'zh', (problem) => problems.push(problem.kind));
  assert.equal(newer.data.plays, 0);
  assert.ok(problems.includes('too-new'));
});

test('a storage that refuses to write does not stop the game', () => {
  const problems = [],
    save = openSave(memory({}, { refuse: true }), 'zh', (problem) => problems.push(problem.kind));
  assert.equal(
    save.update((data) => {
      data.settings.sound = false;
    }),
    false
  );
  assert.equal(save.data.settings.sound, false);
  assert.ok(problems.includes('write-failed'));
});
