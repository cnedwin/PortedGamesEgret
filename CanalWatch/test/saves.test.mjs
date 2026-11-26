// 存档：新档、设置写入、两种难度各自的最好星数、坏档另存后重新开始、版本过新时重新开始、存储拒绝写入时不报错。
// The save: a fresh one, settings written, the best stars of each difficulty, an unreadable save set aside and started
// again, a save too new started again, and a storage that refuses writes without an error.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { SAVE_KEY, freshSave, openSave, recordGame } = await import('../src/saves.mjs');

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

test('a fresh save speaks the browser language and has no stars', () => {
  const save = openSave(memory(), 'en');
  assert.deepEqual(save.data, freshSave('en'));
});

test('settings and the best stars survive opening the save again', () => {
  const storage = memory(),
    save = openSave(storage);
  assert.equal(
    save.update((data) => {
      data.settings.language = 'en';
      recordGame(data, 'hard', 2);
    }),
    true
  );
  const again = openSave(storage);
  assert.equal(again.data.settings.language, 'en');
  assert.deepEqual(again.data.best, { normal: 0, hard: 2 });
  assert.equal(again.data.wins, 1);
  assert.equal(again.data.plays, 1);
});

test('only more stars on the same difficulty is a new best; a lost game counts as played', () => {
  const data = freshSave();
  assert.equal(recordGame(data, 'normal', 1), true);
  assert.equal(recordGame(data, 'normal', 0), false);
  assert.equal(recordGame(data, 'normal', 1), false);
  assert.equal(recordGame(data, 'normal', 3), true);
  assert.equal(recordGame(data, 'hard', 1), true);
  assert.deepEqual(data.best, { normal: 3, hard: 1 });
  assert.equal(data.plays, 5);
  assert.equal(data.wins, 4);
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
  const wrong = openSave(memory({ [SAVE_KEY]: JSON.stringify({ version: 1, savedAt: '', data: { ...freshSave(), best: { normal: 7, hard: 0 } } }) }));
  assert.deepEqual(wrong.data.best, { normal: 0, hard: 0 });
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
