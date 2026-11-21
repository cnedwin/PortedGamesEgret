// 存档：新档、设置与整座县城写入后读回、历任记录只记最快、坏档另存后重新开始、版本过新或县城形状不对时重新开始、
// 存储拒绝写入时不报错。
// The save: a fresh one, the settings and a whole county read back after a write, the record keeping only the
// fastest term, an unreadable save set aside and started again, a save too new or with a county of the wrong shape
// started again, and a storage that refuses writes without an error.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { SAVE_KEY, freshSave, openSave, recordTerm, countyLooksRight } = await import('../src/saves.mjs');
const { advance, createCounty } = await import('../src/sim/world.mjs');

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

test('a fresh save speaks the page language and holds no county yet', () => {
  const save = openSave(memory(), 'en');
  assert.deepEqual(save.data, freshSave('en'));
  assert.equal(save.data.county, null);
});

test('the settings and the whole county come back after opening the save again', () => {
  const storage = memory(),
    county = createCounty({ seed: 5, now: 1000 });
  advance(county, 1000 + 3600, { active: false });
  openSave(storage).update((data) => {
    data.settings.language = 'en';
    data.county = JSON.parse(JSON.stringify(county));
  });
  const again = openSave(storage);
  assert.equal(again.data.settings.language, 'en');
  assert.ok(countyLooksRight(again.data.county));
  assert.deepEqual(again.data.county, JSON.parse(JSON.stringify(county)));
});

test('the record counts terms and keeps only the fastest', () => {
  const data = freshSave();
  assert.equal(recordTerm(data, 90), true);
  assert.equal(recordTerm(data, 120), false);
  assert.equal(recordTerm(data, 80.04), true);
  assert.equal(data.record.fastest, 80);
  assert.equal(data.record.terms, 3);
});

test('a broken save is started again and the old text kept aside', () => {
  const problems = [],
    storage = memory({ [SAVE_KEY]: '{not json' }),
    save = openSave(storage, 'zh', (problem) => problems.push(problem.kind));
  assert.deepEqual(save.data, freshSave('zh'));
  assert.ok(problems.length > 0);
  assert.ok([...storage.items.keys()].some((key) => key !== SAVE_KEY && key.startsWith(SAVE_KEY)));
});

test('a county of the wrong shape, or a save from a newer build, is started again', () => {
  const bad = { ...freshSave(), county: { version: 1, time: 0, rank: 0, plots: [] } };
  const wrong = openSave(memory({ [SAVE_KEY]: JSON.stringify({ version: 1, savedAt: '', data: bad }) }));
  assert.equal(wrong.data.county, null);
  const problems = [],
    newer = openSave(memory({ [SAVE_KEY]: JSON.stringify({ version: 99, savedAt: '', data: freshSave() }) }), 'zh', (problem) => problems.push(problem.kind));
  assert.equal(newer.data.record.terms, 0);
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
