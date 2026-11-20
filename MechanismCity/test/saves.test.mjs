// 存档：星级取最好、下一关解锁、坏档另存不丢。
// The save: the best stars are kept, the next level opens, and a save that cannot be read is set aside.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { openSave, recordClear, totalStars, totalSeals, SAVE_KEY } = await import('../src/saves.mjs');

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

test('a challenge seal survives a normal replay and reloads with earlier progress', () => {
  const data = { levels: { '1': { stars: 3, score: 500 } }, open: 2, seenIntro: true, settings: { effects: false, music: true } };
  const storage = memory({ [SAVE_KEY]: JSON.stringify({ version: 1, data }) });
  const save = openSave(storage);
  assert.equal(totalSeals(save.data), 0);
  save.update((next) => {
    assert.equal(recordClear(next, 0, { stars: 2, score: 450, seal: true }, 12).newSeal, true);
  });
  save.update((next) => {
    assert.equal(recordClear(next, 0, { stars: 2, score: 480 }, 12).newSeal, undefined);
  });
  const again = openSave(storage);
  assert.equal(totalSeals(again.data), 1);
  assert.deepEqual(again.data.levels['1'], { stars: 3, score: 500, seal: true });
  assert.equal(again.data.open, 2);
  assert.equal(again.data.settings.effects, false);
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

test('a change that returns a value instead of editing in place is refused and not written', () => {
  const storage = memory(),
    save = openSave(storage);
  save.update((data) => {
    data.open = 3;
  });
  const before = storage.getItem(SAVE_KEY);
  assert.equal(save.update((data) => (data.open = 5)), false);
  assert.equal(storage.getItem(SAVE_KEY), before);
  // The callback is given the live data, so what it changed before returning stays in memory, unwritten
  // (ENGINE-NOTES.md, item 18). The game's callbacks are blocks that return nothing.
  assert.equal(save.data.open, 5);
  assert.equal(openSave(storage).data.open, 3);
});
