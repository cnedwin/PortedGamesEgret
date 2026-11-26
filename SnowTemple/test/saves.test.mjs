// What is kept between visits, checked against a storage in memory.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { createMemorySaveStorage } = await import('@egret/engine/kit');
const { openProgress, recordClear, recordStand } = await import('../src/progress.mjs');
const { openSave, snowSaveStorage } = await import('../src/saves.mjs');

test('browser storage stays available for reads when writes exceed quota', () => {
  const legacy = { open: 3, tier: 2, marks: { 1: '乙' }, wave: 7 };
  const stored = createMemorySaveStorage({ 'snow-temple-progress': JSON.stringify(legacy) });
  let writes = 0;
  stored.setItem = () => {
    writes++;
    throw new Error('quota');
  };
  const storage = snowSaveStorage(() => stored);
  assert.equal(writes, 0);
  assert.deepEqual(openProgress(storage).progress, legacy);
});

test('unreadable browser storage uses memory for the current visit', () => {
  const storage = snowSaveStorage(() => ({ getItem() { throw new Error('denied'); } }));
  const { progress, save } = openProgress(storage);
  recordClear(progress, 1, '甲');
  assert.ok(save());
  assert.equal(openProgress(storage).progress.open, 2);
});

test('what is earned is kept: a clear opens the next tier, and only a better mark or a farther wave replaces the old', () => {
  const storage = createMemorySaveStorage(),
    { progress, save } = openProgress(storage);
  assert.deepEqual(progress, { open: 1, tier: 1, marks: {}, wave: 0 });
  assert.deepEqual(recordClear(progress, 1, '丙'), { improved: true, opened: true });
  assert.equal(progress.open, 2);
  assert.deepEqual(recordClear(progress, 1, '丁'), { improved: false, opened: false });
  assert.deepEqual(recordClear(progress, 1, '甲'), { improved: true, opened: false });
  assert.deepEqual(progress.marks, { 1: '甲' });
  assert.equal(progress.open, 2, 'clearing the first tier again opens nothing more');
  assert.ok(recordStand(progress, 5) && !recordStand(progress, 5) && !recordStand(progress, 3));
  progress.tier = 2;
  assert.ok(save());

  // The next visit reads what this one wrote.
  assert.deepEqual(openProgress(storage).progress, { open: 2, tier: 2, marks: { 1: '甲' }, wave: 5 });
  const kept = JSON.parse(storage.getItem('snow-temple-progress'));
  assert.equal(kept.version, 1);
  assert.ok(Date.parse(kept.savedAt) > 0);
});

test('a record from before saves carried a version is read, not set aside', () => {
  const storage = createMemorySaveStorage({ 'snow-temple-progress': JSON.stringify({ open: 3, tier: 2, marks: { 1: '乙' }, wave: 7 }) });
  assert.deepEqual(openProgress(storage).progress, { open: 3, tier: 2, marks: { 1: '乙' }, wave: 7 });
  assert.equal(storage.getItem('snow-temple-progress.unread'), null);
  assert.equal(JSON.parse(storage.getItem('snow-temple-progress')).version, 1);

  const settings = createMemorySaveStorage({ 'snow-temple-settings': JSON.stringify({ quality: 'low', keys: { dodge: 'KeyC' } }) });
  assert.deepEqual(openSave(settings, 'snow-temple-settings', { defaults: () => ({}) }).data, { quality: 'low', keys: { dodge: 'KeyC' } });
});

test('a valid legacy record remains usable if writing its version envelope fails', () => {
  const key = 'snow-temple-progress';
  const legacy = { open: 3, tier: 2, marks: { 1: '甲', 2: '乙' }, wave: 7 };
  const original = JSON.stringify(legacy);
  const storage = createMemorySaveStorage({ [key]: original });
  const write = storage.setItem;
  storage.setItem = (keyToWrite, value) => {
    if (keyToWrite === key) throw new Error('quota');
    write(keyToWrite, value);
  };
  const { progress, save } = openProgress(storage);
  assert.deepEqual(progress, legacy);
  assert.equal(storage.getItem(key + '.unread'), null);
  assert.ok(recordStand(progress, 9));
  assert.equal(save(), false);
  assert.equal(storage.getItem(key), original);
  assert.equal(progress.wave, 9);
});

test('a record that cannot be trusted starts again within bounds, and the old text is kept', () => {
  // A tier chosen above what is open, and numbers that are not numbers.
  const odd = createMemorySaveStorage({ 'snow-temple-progress': JSON.stringify({ open: 2, tier: 9, marks: null, wave: 'far' }) });
  assert.deepEqual(openProgress(odd).progress, { open: 2, tier: 2, marks: {}, wave: 0 });

  const broken = createMemorySaveStorage({ 'snow-temple-progress': '{"open":' });
  assert.deepEqual(openProgress(broken).progress, { open: 1, tier: 1, marks: {}, wave: 0 });
  assert.equal(broken.getItem('snow-temple-progress.unread'), '{"open":');

  // Written by a later build than this one.
  const later = createMemorySaveStorage({ 'snow-temple-progress': JSON.stringify({ version: 9, savedAt: '2030-01-01T00:00:00.000Z', data: { open: 5 } }) });
  assert.equal(openProgress(later).progress.open, 1);
  assert.ok(later.getItem('snow-temple-progress.unread').includes('"version":9'));
});

test('a storage that refuses to write loses nothing but the write', () => {
  const full = { getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem() {} };
  const { progress, save } = openProgress(full);
  recordClear(progress, 1, '甲');
  assert.equal(save(), false);
  assert.equal(progress.open, 2);
});
