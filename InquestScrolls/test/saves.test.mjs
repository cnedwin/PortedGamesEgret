// 存档：新档、读回、坏档另存、设置补全、拒绝写入不报错。
// The save: a new one, reading it back, a broken one set aside, settings filled in, a refused write without a throw.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../vendor/node-register.mjs';

const { SAVE_KEY, caseIsWhole, freshSave, openSave, saveIsWhole, settingsOf } = await import('../src/saves.mjs');
const { caseState, collect, seeSpot } = await import('../src/sim/rules.mjs');
const { CASES } = await import('../src/sim/cases/index.mjs');

const memory = () => {
  const m = new Map();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

test('a new save has settings and empty progress, and is whole', () => {
  const s = freshSave('en');
  assert.equal(s.settings.language, 'en');
  assert.deepEqual(s.progress.cases, {});
  assert.ok(saveIsWhole(s));
});

test('progress written is read back', () => {
  const storage = memory();
  const store = openSave(storage);
  store.update((d) => {
    const st = caseState(d.progress, 'c1');
    seeSpot(st, CASES[0], 'vat');
    collect(st, CASES[0], 'sash');
    st.notes = '孙大的手背有抓痕';
  });
  const again = openSave(storage);
  assert.deepEqual(again.data.progress.cases.c1.found, ['sash']);
  assert.equal(again.data.progress.cases.c1.notes, '孙大的手背有抓痕');
});

test('a broken save starts again and the old one is kept aside', () => {
  const storage = memory();
  storage.setItem(SAVE_KEY, '{broken');
  const problems = [];
  const store = openSave(storage, 'zh', (p) => problems.push(p.kind));
  assert.deepEqual(store.data.progress.cases, {});
  assert.ok(problems.length > 0);
});

test('a save with a malformed case or an unknown case is refused', () => {
  const s = freshSave();
  s.progress.cases.c1 = { seen: 'x' };
  assert.equal(saveIsWhole(s), false);
  const t = freshSave();
  t.progress.cases.c9 = caseState({ cases: {} }, 'c9');
  assert.equal(saveIsWhole(t), false);
  assert.equal(caseIsWhole(caseState({ cases: {} }, 'c1')), true);
});

test('settings missing from an old save are filled in', () => {
  const s = settingsOf({ settings: { language: 'en', music: false } });
  assert.equal(s.music, false);
  assert.equal(s.sound, true);
  assert.equal(s.textSize, 1);
});

test('a storage that refuses writes does not throw', () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('full'); }, removeItem: () => {} };
  const problems = [];
  const store = openSave(storage, 'zh', (p) => problems.push(p.kind));
  assert.doesNotThrow(() => store.update((d) => void (d.settings.music = false)));
  assert.ok(problems.length > 0);
});
