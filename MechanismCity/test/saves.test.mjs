// 存档：星级取最好、下一关解锁、坏档另存不丢。
// The save: the best stars are kept, the next level opens, and a save that cannot be read is set aside.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { openSave, recordClear, totalStars, SAVE_KEY } = await import('../src/saves.mjs');

function memory(initial = {}) {
  const items = new Map(Object.entries(initial));
  return { getItem: (key) => items.get(key) ?? null, setItem: (key, value) => void items.set(key, String(value)), removeItem: (key) => void items.delete(key), items };
}

test('a fresh save opens the first level only, with sound on', () => {
  const save = openSave(memory());
  assert.equal(save.data.open, 1);
  assert.deepEqual(save.data.settings, { effects: true, music: true });
  assert.equal(totalStars(save.data), 0);
});

test('clearing a level keeps the better result and opens the next', () => {
  const storage = memory(),
    save = openSave(storage);
  let change;
  save.update((data) => {
    change = recordClear(data, 0, { stars: 2, score: 900 }, 12);
  });
  assert.deepEqual(change, { newStars: true, newBest: true, opened: true });
  save.update((data) => {
    change = recordClear(data, 0, { stars: 1, score: 1200 }, 12);
  });
  assert.deepEqual(change, { newStars: false, newBest: true, opened: false });
  const again = openSave(storage);
  assert.deepEqual(again.data.levels['1'], { stars: 2, score: 1200 });
  assert.equal(again.data.open, 2);
  assert.equal(totalStars(again.data), 2);
});

test('the last level opens nothing past the end', () => {
  const data = openSave(memory()).data;
  data.open = 12;
  assert.equal(recordClear(data, 11, { stars: 3, score: 1 }, 12).opened, false);
  assert.equal(data.open, 12);
});

test('settings are kept between visits', () => {
  const storage = memory();
  openSave(storage).update((data) => {
    data.settings.music = false;
  });
  assert.equal(openSave(storage).data.settings.music, false);
});

test('a save of another shape is started again, not thrown on', () => {
  const storage = memory({ [SAVE_KEY]: JSON.stringify({ version: 1, data: { nonsense: true } }) });
  const save = openSave(storage);
  assert.equal(save.data.open, 1);
});
