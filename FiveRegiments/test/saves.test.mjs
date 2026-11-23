// 存档：新档、设置和评等写入后再打开还在、只有更好的评等才替换、坏档另存后重新开始、版本过新或形状不对时重新开始、
// 存储拒绝写入时不报错。
// The save: a fresh one, settings and marks still there when opened again, only a better mark replacing the best, an
// unreadable save set aside and started again, a save too new or of the wrong shape started again, and a storage that
// refuses writes without an error.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { SAVE_KEY, SETTINGS, freshSave, openSave, recordRun, settingsOf, validSave } = await import('../src/saves.mjs');

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

test('a fresh save has the default settings and no marks', () => {
  const save = openSave(memory());
  assert.deepEqual(save.data, freshSave());
  assert.deepEqual(settingsOf(save.data), { ...SETTINGS });
});

test('settings and a mark survive opening the save again', () => {
  const storage = memory(),
    save = openSave(storage);
  assert.equal(
    save.update((data) => {
      data.settings = { ...settingsOf(data), language: 'en', blood: false, control: 'classic' };
      recordRun(data, 'plume', 'yi');
    }),
    true
  );
  const again = openSave(storage);
  assert.equal(again.data.settings.language, 'en');
  assert.equal(settingsOf(again.data).blood, false);
  assert.equal(settingsOf(again.data).control, 'classic');
  assert.deepEqual(again.data.marks, { plume: 'yi' });
  assert.equal(again.data.plays, 1);
});

test('only a better mark replaces the best, and every finished road is counted', () => {
  const data = freshSave();
  assert.equal(recordRun(data, 'tiger', 'bing'), true);
  assert.equal(recordRun(data, 'tiger', 'ding'), false);
  assert.equal(recordRun(data, 'tiger', 'bing'), false);
  assert.equal(recordRun(data, 'tiger', 'jia'), true);
  assert.equal(recordRun(data, 'archer', 'yi'), true);
  assert.deepEqual(data.marks, { tiger: 'jia', archer: 'yi' });
  assert.equal(data.plays, 5);
  assert.throws(() => recordRun(data, 'cavalry', 'jia'));
  assert.throws(() => recordRun(data, 'tiger', 'best'));
});

test('a broken save is started again and the old text kept aside', () => {
  const problems = [],
    storage = memory({ [SAVE_KEY]: '{not json' }),
    save = openSave(storage, (problem) => problems.push(problem.kind));
  assert.deepEqual(save.data, freshSave());
  assert.ok(problems.includes('unreadable'));
  assert.ok([...storage.items.keys()].some((key) => key !== SAVE_KEY && key.startsWith(SAVE_KEY)));
});

test('a save of another shape or from a newer build is started again', () => {
  const shapes = [
    { settings: {}, marks: { tiger: 'excellent' }, plays: 1 },
    { settings: {}, marks: { cavalry: 'jia' }, plays: 1 },
    { settings: { sensitivity: 'fast' }, marks: {}, plays: 0 },
    { settings: {}, marks: {}, plays: -2 }
  ];
  for (const data of shapes) {
    assert.equal(validSave(data), false, JSON.stringify(data));
    const problems = [],
      save = openSave(memory({ [SAVE_KEY]: JSON.stringify({ version: 1, savedAt: '', data }) }), (problem) => problems.push(problem.kind));
    assert.deepEqual(save.data, freshSave());
    assert.ok(problems.includes('invalid'));
  }
  const problems = [],
    newer = openSave(memory({ [SAVE_KEY]: JSON.stringify({ version: 99, savedAt: '', data: freshSave() }) }), (problem) => problems.push(problem.kind));
  assert.equal(newer.data.plays, 0);
  assert.ok(problems.includes('too-new'));
});

test('a storage that refuses to write does not stop the game', () => {
  const problems = [],
    save = openSave(memory({}, { refuse: true }), (problem) => problems.push(problem.kind));
  assert.equal(
    save.update((data) => void recordRun(data, 'yulin', 'jia')),
    false
  );
  assert.equal(save.data.marks.yulin, 'jia');
  assert.ok(problems.includes('write-failed'));
});
