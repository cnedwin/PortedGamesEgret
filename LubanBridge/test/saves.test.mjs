// 存档：读不懂的档重新开始，印章一旦拿到就留着，最省的造价留最低的，关卡按顺序打开，图纸存进去读得回来。
// The save: an unreadable save starts again, a seal once won stays, the lowest cost is kept, levels open in order,
// and a drawing kept is read back.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { createMemorySaveStorage } = await import('@egret/engine/kit');
const { designOf, keepDesign, nextLevel, openSave, recordCrossing, sealCount, unlocked, validSave, freshSave } = await import('../src/saves.mjs');
const { levelById } = await import('../src/sim/levels.mjs');

test('a fresh save, and one that cannot be read', () => {
  const storage = createMemorySaveStorage();
  storage.setItem('luban-bridge', '{not json');
  const problems = [];
  const store = openSave(storage, 'en', (p) => problems.push(p.kind));
  assert.equal(store.data.settings.language, 'en');
  assert.ok(problems.length > 0);
  assert.ok(validSave(freshSave()));
  assert.ok(!validSave({ settings: { language: 'fr' } }));
});

test('seals stay once won, and the lowest cost is kept', () => {
  const data = freshSave(),
    level = levelById('1-2');
  let fresh = recordCrossing(data, level, { won: true, cost: level.budget + 50, broken: 2 });
  assert.deepEqual(fresh, { pass: true });
  fresh = recordCrossing(data, level, { won: true, cost: level.budget - 10, broken: 0 });
  assert.deepEqual(fresh, { thrift: true, intact: true });
  recordCrossing(data, level, { won: false, cost: 1, broken: 9 });
  assert.equal(data.progress['1-2'].best, level.budget - 10);
  assert.deepEqual(data.progress['1-2'].seals, { pass: true, thrift: true, intact: true });
  assert.deepEqual(sealCount(data), { got: 3, of: 75 });
});

test('levels open in order; the sandbox is always open', () => {
  const data = freshSave();
  assert.ok(unlocked(data, '1-1') && !unlocked(data, '1-2') && unlocked(data, 'sandbox') && unlocked(data, '5-5', true));
  recordCrossing(data, levelById('1-1'), { won: true, cost: 10, broken: 0 });
  assert.ok(unlocked(data, '1-2'));
  assert.equal(nextLevel(data), '1-2');
});

test('a drawing kept is read back, and kept through the store', () => {
  const store = openSave(createMemorySaveStorage(), 'zh');
  const design = { members: [[0, 0, 4, 0, 'plank']], pontoons: [[4, 2]], piers: [1] };
  store.update((d) => keepDesign(d, '4-1', design));
  store.update((d) => keepDesign(d, 'sandbox', design));
  assert.deepEqual(designOf(store.data, '4-1'), design);
  assert.deepEqual(designOf(store.data, 'sandbox'), design);
});
