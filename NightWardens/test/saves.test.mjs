// 存档：新档、设置写入、守住一夜后的星数、最快用时和开下一夜、失守只记一次游玩、坏档另存后重新开始、
// 版本过新时重新开始、存储拒绝写入时不报错。
// The save: a fresh one, settings written, a held night's stars, fastest time and the next night opened, a lost night
// counted only as a play, an unreadable save set aside and started again, a save too new started again, and a storage
// that refuses writes without an error.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { SAVE_KEY, freshSave, openSave, recordNight } = await import('../src/saves.mjs');

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

test('a fresh save speaks the page language and has only the first night open', () => {
  const save = openSave(memory(), 'en');
  assert.deepEqual(save.data, freshSave('en'));
  assert.equal(save.data.open, 1);
});

test('a held night keeps its best stars and fastest time, opens the next, and survives opening the save again', () => {
  const storage = memory(),
    save = openSave(storage);
  let result;
  save.update((data) => {
    result = recordNight(data, 1, { won: true, stars: 2, seconds: 240.4 });
  });
  assert.deepEqual(result, { best: true, opened: true });
  save.update((data) => {
    result = recordNight(data, 1, { won: true, stars: 3, seconds: 250 });
  });
  assert.deepEqual(result, { best: false, opened: false });
  save.update((data) => {
    data.settings.sound = false;
  });
  const again = openSave(storage);
  assert.deepEqual(again.data.nights[1], { stars: 3, best: 240 });
  assert.equal(again.data.open, 2);
  assert.equal(again.data.plays, 2);
  assert.equal(again.data.settings.sound, false);
});

test('a lost night counts as a play and changes nothing else; the last night opens nothing more', () => {
  const data = freshSave();
  assert.deepEqual(recordNight(data, 1, { won: false, stars: 0, seconds: 100 }), { best: false, opened: false });
  assert.deepEqual(data.nights, {});
  assert.equal(data.plays, 1);
  data.open = 3;
  assert.deepEqual(recordNight(data, 3, { won: true, stars: 1, seconds: 260 }), { best: true, opened: false });
  assert.equal(data.open, 3);
});

test('an unreadable save is set aside and started again', () => {
  const problems = [],
    storage = memory({ [SAVE_KEY]: '{broken' }),
    save = openSave(storage, 'zh', (problem) => problems.push(problem.kind));
  assert.deepEqual(save.data, freshSave('zh'));
  assert.ok(problems.length > 0);
  assert.ok([...storage.items.keys()].some((key) => key.startsWith(`${SAVE_KEY}.unread`)));
});

test('a save with a night out of range is started again', () => {
  const storage = memory({ [SAVE_KEY]: JSON.stringify({ version: 1, data: { ...freshSave(), open: 9 } }) });
  assert.equal(openSave(storage).data.open, 1);
});

test('a storage that refuses to write gives no error, and the play goes on with the save in memory', () => {
  const save = openSave(memory({}, { refuse: true }));
  let result;
  const kept = save.update((data) => {
    result = recordNight(data, 1, { won: true, stars: 3, seconds: 200 });
  });
  assert.equal(kept, false);
  assert.equal(result.opened, true);
  assert.equal(save.data.open, 2, 'the next night opens for this visit even though it was not written');
});

test('an update written as an expression arrow is refused, as the engine documents', () => {
  const save = openSave(memory());
  assert.equal(save.update((data) => (data.plays = 5)), false);
  assert.equal(save.data.plays, 0);
});
