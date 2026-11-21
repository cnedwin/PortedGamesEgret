// 存档：新档、设置写入、每首每难度的最好一次（名次先比、同名次比分数）、坏档另存后重新开始、版本过新时重新开始、
// 存储拒绝写入时不报错。
// The save: a fresh one, settings written, the best run of each chart (rank first, then score), an unreadable save set
// aside and started again, a save too new started again, and a storage that refuses writes without an error.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { SAVE_KEY, freshSave, openSave, recordRun } = await import('../src/saves.mjs');

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

test('a fresh save speaks the browser language and has nothing played', () => {
  const save = openSave(memory(), 'en');
  assert.deepEqual(save.data, freshSave('en'));
});

test('settings and the best run survive opening the save again', () => {
  const storage = memory(),
    save = openSave(storage);
  assert.equal(
    save.update((data) => {
      data.settings.offset = 40;
      data.settings.speed = 2;
      recordRun(data, 'qiba', 'hard', { rank: 'clear', score: 51000, maxCombo: 88 });
    }),
    true
  );
  const again = openSave(storage);
  assert.equal(again.data.settings.offset, 40);
  assert.equal(again.data.settings.speed, 2);
  assert.deepEqual(again.data.best.qiba.hard, { rank: 'clear', score: 51000, combo: 88 });
  assert.equal(again.data.plays, 1);
});

test('a better rank wins over a higher score, and within a rank the higher score wins', () => {
  const data = freshSave();
  assert.equal(recordRun(data, 'tangma', 'normal', { rank: 'fail', score: 90000, maxCombo: 50 }), true);
  assert.equal(recordRun(data, 'tangma', 'normal', { rank: 'clear', score: 40000, maxCombo: 30 }), true);
  assert.equal(recordRun(data, 'tangma', 'normal', { rank: 'clear', score: 39000, maxCombo: 30 }), false);
  assert.equal(recordRun(data, 'tangma', 'normal', { rank: 'fail', score: 99999, maxCombo: 90 }), false);
  assert.equal(recordRun(data, 'tangma', 'normal', { rank: 'clear', score: 45000, maxCombo: 31 }), true);
  assert.deepEqual(data.best.tangma.normal, { rank: 'clear', score: 45000, combo: 31 });
  assert.equal(data.plays, 5);
});

test('settings out of range are not kept', () => {
  const save = openSave(memory());
  assert.equal(save.update((data) => void (data.settings.speed = 9)), false);
  assert.equal(save.update((data) => void (data.settings.offset = 1000)), false);
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
  const wrong = openSave(memory({ [SAVE_KEY]: JSON.stringify({ version: 1, savedAt: '', data: { ...freshSave(), best: { qiba: { easy: { rank: 'great' } } } } }) }));
  assert.deepEqual(wrong.data.best, {});
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
