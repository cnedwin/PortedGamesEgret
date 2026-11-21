// 存档：新档、设置与整座县城写入后读回、历任记录只记最快、坏档另存后重新开始、版本过新或县城形状不对时重新开始、
// 存储拒绝写入时不报错。
// The save: a fresh one, the settings and a whole county read back after a write, the record keeping only the
// fastest term, an unreadable save set aside and started again, a save too new or with a county of the wrong shape
// started again, and a storage that refuses writes without an error.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { SAVE_KEY, freshSave, openSave, openSaveSlots, recordTerm, countyLooksRight } = await import('../src/saves.mjs');
const { advance, answer, createCounty, expandWard, moveDock, plotPlan, rates, wardIsOpen } = await import('../src/sim/world.mjs');

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
  assert.equal(expandWard(county, 8).why, undefined);
  advance(county, 1000 + 3600, { active: false });
  openSave(storage).update((data) => {
    data.settings.language = 'en';
    data.county = JSON.parse(JSON.stringify(county));
  });
  const again = openSave(storage);
  assert.equal(again.data.settings.language, 'en');
  assert.ok(countyLooksRight(again.data.county));
  assert.deepEqual(again.data.county, JSON.parse(JSON.stringify(county)));
  assert.equal(wardIsOpen(again.data.county, 3), false);
  assert.equal(wardIsOpen(again.data.county, 8), true);
});

test('the old save is slot one and supplies initial preferences without rewriting progress', () => {
  const storage = memory();
  openSave(storage, 'en').update((data) => {
    data.settings.sound = false;
    data.settings.reducedMotion = true;
    data.county = createCounty({ seed: 45, now: 1000 });
    recordTerm(data, 90);
  });
  const original = storage.getItem(SAVE_KEY);
  const { slots, preferences } = openSaveSlots(storage, 'zh');

  assert.equal(slots.length, 3);
  assert.equal(slots[0].data.county.seed, 45);
  assert.deepEqual(slots[0].data.record, { terms: 1, fastest: 90 });
  assert.equal(slots[1].data.county, null);
  assert.equal(slots[2].data.county, null);
  assert.deepEqual(preferences.data, { language: 'en', sound: false, music: true, reducedMotion: true });
  assert.deepEqual([...storage.items.keys()], [SAVE_KEY]);

  preferences.update((settings) => {
    settings.language = 'zh';
    settings.music = false;
  });
  assert.equal(storage.getItem(SAVE_KEY), original);
  assert.deepEqual(openSaveSlots(storage, 'en').preferences.data, {
    language: 'zh', sound: false, music: false, reducedMotion: true
  });
});

test('all three slots keep independent counties, time stamps and term records', () => {
  const storage = memory();
  const { slots } = openSaveSlots(storage);
  for (const [index, slot] of slots.entries()) {
    slot.update((data) => {
      data.county = createCounty({ seed: index + 10, now: 1000 + index * 600 });
      recordTerm(data, 84 + index);
    });
  }
  const first = storage.getItem(SAVE_KEY);
  const third = storage.getItem(SAVE_KEY + '-slot-3');
  slots[1].update((data) => {
    advance(data.county, 2100, { active: false });
    recordTerm(data, 82);
  });
  const again = openSaveSlots(storage).slots;
  assert.deepEqual(again.map((slot) => slot.data.county.seed), [10, 11, 12]);
  assert.deepEqual(again.map((slot) => slot.data.county.time), [1000, 2100, 2200]);
  assert.deepEqual(again.map((slot) => slot.data.record), [
    { terms: 1, fastest: 84 }, { terms: 2, fastest: 82 }, { terms: 1, fastest: 86 }
  ]);
  assert.equal(storage.getItem(SAVE_KEY), first);
  assert.equal(storage.getItem(SAVE_KEY + '-slot-3'), third);
});

test('an unreadable second slot is backed up without discarding the others', () => {
  const storage = memory();
  const { slots } = openSaveSlots(storage);
  for (const index of [0, 2]) {
    slots[index].update((data) => { data.county = createCounty({ seed: 1 + index, now: 1000 }); });
  }
  const secondKey = SAVE_KEY + '-slot-2';
  storage.setItem(secondKey, '{not json');
  const problems = [];
  const again = openSaveSlots(storage, 'zh', (problem) => problems.push(problem)).slots;
  assert.deepEqual(again.map((slot) => slot.data.county?.seed ?? null), [1, null, 3]);
  assert.equal(storage.getItem(secondKey + '.unread'), '{not json');
  assert.deepEqual(problems.map(({ key }) => key), [secondKey]);
});

test('the record counts terms and keeps only the fastest', () => {
  const data = freshSave();
  assert.equal(recordTerm(data, 90), true);
  assert.equal(recordTerm(data, 120), false);
  assert.equal(recordTerm(data, 80.04), true);
  assert.equal(data.record.fastest, 80);
  assert.equal(data.record.terms, 3);
});

test('an earlier 48-lot save keeps its built sites, personnel, work, walls and settings', () => {
  const data = freshSave('en'), county = data.county = createCounty({ seed: 6 });
  county.version = 1;
  county.rank = 3;
  county.districts = Array.from({ length: 6 }, (_, i) => ({ zone: ['home', 'farm', 'market'][i] ?? null }));
  county.plots = Array.from({ length: 48 }, () => ({ kind: null, level: 0 }));
  county.plots[35] = { kind: 'clinic', level: 2 };
  county.defence = { wall: 2, tower: [1, 2, 3, 4], camp: 1 };
  county.works.push({ type: 'plot', key: 35, level: 3, starts: 0, ends: 10, duration: 10 });
  county.works.push({ type: 'wall', key: 'wall', level: 3, starts: 0, ends: 11, duration: 11 });
  county.talents.push({ id: 'suShi', post: { type: 'plot', key: 35 }, level: 1, exp: 0, stars: 1 });
  county.log.push({ at: 0, type: 'done', work: { type: 'plot', key: 35, level: 2 } });
  data.record.terms = 2;
  const store = memory({ [SAVE_KEY]: JSON.stringify({ version: 1, data }) });
  const opened = openSave(store);
  const loaded = opened.data.county;
  assert.ok(countyLooksRight(loaded));
  assert.equal(opened.loadedVersion, 1);
  assert.equal(opened.data.settings.language, 'en');
  assert.equal(opened.data.record.terms, 2);
  assert.equal(loaded.plots.length, 144);
  assert.deepEqual(loaded.plots[51], { kind: 'clinic', level: 2 });
  assert.equal(loaded.talents[0].post.key, 51);
  assert.equal(loaded.log[0].work.key, 51);
  assert.deepEqual(loaded.defence.wall, [2, 2, 2, 2]);
  assert.deepEqual(loaded.defence.tower, [1, 2, 3, 4]);
  advance(loaded, 20);
  assert.equal(loaded.plots[51].level, 3);
  assert.deepEqual(loaded.defence.wall, [3, 3, 3, 3]);
  assert.deepEqual(loaded.defence.troops, [0, 0, 0, 0]);
});

test('a 72-lot save retains historic building and work positions, holdings and acquired wards', () => {
  const data = freshSave('en'), county = data.county = createCounty({ seed: 7, now: 1000 });
  county.version = 2;
  county.rank = 2;
  delete county.petitionCount;
  delete county.petitionRecent;
  county.petition = { id: 'flood', at: 1000 };
  county.districts = Array.from({ length: 6 }, (_, i) => ({ zone: ['home', 'farm', 'market', 'garden'][i] ?? null }));
  county.plots = Array.from({ length: 72 }, () => ({ kind: null, level: 0 }));
  county.plots[12] = { kind: 'paddy', level: 1 };
  county.plots[55] = { kind: 'temple', level: 4 };
  county.res.coin = 4321;
  county.defence.wall[3] = 3;
  county.defence.troops[2] = 12;
  county.works.push({ type: 'plot', key: 55, level: 5, starts: 1000, ends: 1010, duration: 10 });
  county.talents.push({ id: 'suShi', post: { type: 'plot', key: 55 }, level: 1, exp: 0, stars: 1 });
  const opened = openSave(memory({ [SAVE_KEY]: JSON.stringify({ version: 2, data }) }));
  const loaded = opened.data.county;
  assert.ok(countyLooksRight(loaded));
  assert.equal(opened.loadedVersion, 2);
  assert.deepEqual(loaded.plots.slice(0, 72), county.plots);
  assert.deepEqual(loaded.res, county.res);
  assert.deepEqual(loaded.defence, county.defence);
  assert.deepEqual(loaded.talents, county.talents);
  assert.deepEqual(loaded.works, county.works);
  assert.deepEqual(loaded.petition, county.petition);
  assert.ok(!answer(loaded, 'b').why);
  assert.deepEqual(loaded.petitionRecent, ['flood']);
  assert.deepEqual(loaded.districts.slice(0, 6).map((ward) => ward.zone), county.districts.map((ward) => ward.zone));
  assert.deepEqual(loaded.districts.map((ward) => ward.open), [true, true, true, true, true, false, false, false, false, false, false, false]);
  advance(loaded, 1020);
  assert.equal(loaded.plots[55].level, 5);
});

test('an older dock keeps shipping before a bank opens, and keeps its migration after reloading', () => {
  const data = freshSave(), county = data.county = createCounty({ seed: 8 });
  county.version = 2;
  county.rank = 3;
  county.districts = Array.from({ length: 6 }, () => ({ zone: null }));
  county.plots.length = 72;
  const old = 68, bank = 120;
  county.plots[old] = { kind: 'dock', level: 2 };
  county.talents.push({ id: 'suShi', post: { type: 'plot', key: old }, level: 1, exp: 0, stars: 1 });
  county.works.push({ type: 'plot', key: old, level: 3, starts: 0, ends: 100, duration: 100 });
  county.res.coin = 10000;
  const storage = memory({ [SAVE_KEY]: JSON.stringify({ version: 2, data }) });
  const opened = openSave(storage), loaded = opened.data.county;
  assert.ok(rates(loaded).export > 0);
  assert.equal(plotPlan(loaded, old).linked, true, 'the former bank still has its legacy route');
  assert.equal(moveDock(loaded, old, bank).why, 'closed');
  assert.equal(loaded.plots[old].level, 2);
  assert.equal(loaded.works[0].key, old);
  assert.ok(!expandWard(loaded, 10).why);
  assert.ok(!moveDock(loaded, old, bank).why);
  opened.update((save) => { save.county = loaded; });
  const again = openSave(storage).data.county;
  assert.deepEqual(again.plots[old], { kind: null, level: 0 });
  assert.deepEqual(again.plots[bank], { kind: 'dock', level: 2 });
  assert.equal(again.talents[0].post.key, bank);
  assert.equal(again.works[0].key, bank);
  advance(again, 110);
  assert.equal(again.plots[bank].level, 3);
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
