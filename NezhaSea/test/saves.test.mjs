// 存档：新档只有少年哪吒；纪录记最远的一波；守过第 10 波解锁莲花身，守住一局解锁三头六臂；坏档另存后重新开始；
// 版本过新、内容不对时重新开始；存储拒绝写入时不报错。
// The save: a fresh one has only Young Nezha; the record keeps the furthest wave; holding wave 10 unlocks Lotus Body
// and a win Three Heads, Six Arms; an unreadable save set aside and started again; a save too new or of the wrong
// shape started again; a storage that refuses writes without an error.
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

test('a fresh save speaks the browser language and has only Young Nezha', () => {
  const save = openSave(memory(), 'en');
  assert.deepEqual(save.data, freshSave('en'));
  assert.deepEqual(save.data.unlocked, ['boy']);
});

test('the furthest wave is kept, and settings survive opening the save again', () => {
  const storage = memory(),
    save = openSave(storage);
  save.update((data) => {
    data.settings.music = false;
    recordGame(data, 'boy', 1, 7, false);
  });
  save.update((data) => void recordGame(data, 'boy', 1, 5, false));
  const again = openSave(storage);
  assert.equal(again.data.settings.music, false);
  assert.equal(again.data.best.boy[1], 7);
  assert.equal(again.data.plays, 2);
});

test('holding wave 10 unlocks Lotus Body; a win unlocks Three Heads, Six Arms and counts as past the last wave', () => {
  const data = freshSave();
  assert.deepEqual(recordGame(data, 'boy', 0, 10, false).unlocked, [], 'lost on wave 10: not held');
  assert.deepEqual(recordGame(data, 'boy', 0, 11, false).unlocked, ['lotus']);
  const win = recordGame(data, 'lotus', 2, 20, true);
  assert.deepEqual(win.unlocked, ['sixArms']);
  assert.ok(win.best);
  assert.equal(data.best.lotus[2], 21);
  assert.equal(data.wins, 1);
  assert.deepEqual(data.unlocked, ['boy', 'lotus', 'sixArms']);
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
  const wrong = openSave(memory({ [SAVE_KEY]: JSON.stringify({ version: 1, savedAt: '', data: { ...freshSave(), unlocked: ['boy', 'dragon'] } }) }));
  assert.deepEqual(wrong.data.unlocked, ['boy']);
  const problems = [],
    newer = openSave(memory({ [SAVE_KEY]: JSON.stringify({ version: 99, savedAt: '', data: freshSave() }) }), 'zh', (problem) => problems.push(problem.kind));
  assert.equal(newer.data.plays, 0);
  assert.ok(problems.includes('too-new'));
});

test('a storage that refuses to write does not stop the game', () => {
  const problems = [],
    save = openSave(memory({}, { refuse: true }), 'zh', (problem) => problems.push(problem.kind));
  assert.equal(save.update((data) => void (data.settings.sound = false)), false);
  assert.ok(problems.includes('write-failed'));
});
