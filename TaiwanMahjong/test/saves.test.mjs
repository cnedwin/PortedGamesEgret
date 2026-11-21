// 存档：新档、设置和战绩写入后再读、只认合法的设置、坏档另存后重新开始、版本过新时重新开始、存储拒绝写入时不报错，
// 以及战绩怎么记：胡几把、自摸、放槍、最大一把、最好一场。
// The save: a fresh one, settings and the record kept across opening again, only sound settings accepted, an
// unreadable save set aside and started again, a save too new started again, a storage that refuses writes without
// an error, and how the record counts wins, self-draws, deal-ins, the biggest hand and the best game.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { SAVE_KEY, freshSave, openSave, recordGame, recordHand } = await import('../src/saves.mjs');

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

test('a fresh save speaks the page language and has an empty record', () => {
  const save = openSave(memory(), 'en');
  assert.deepEqual(save.data, freshSave('en'));
  assert.equal(save.data.record.bestGame, null);
});

test('settings, the setup and the record survive opening the save again', () => {
  const storage = memory(),
    save = openSave(storage);
  save.update((data) => {
    data.settings.pace = 'brisk';
    data.setup.rounds = 4;
    data.setup.level = 'hard';
    recordHand(data, { kind: 'win', seat: 0, from: null, score: { total: 5 } });
    recordGame(data, 2400, 1);
  });
  const again = openSave(storage);
  assert.equal(again.data.settings.pace, 'brisk');
  assert.deepEqual(again.data.setup, { rounds: 4, level: 'hard' });
  assert.equal(again.data.record.wins, 1);
  assert.equal(again.data.record.selfDraws, 1);
  assert.equal(again.data.record.bestTai, 5);
  assert.equal(again.data.record.bestGame, 2400);
  assert.equal(again.data.record.firsts, 1);
});

test('the record counts deal-ins and draws, and keeps only a better game', () => {
  const data = freshSave();
  recordHand(data, { kind: 'win', seat: 2, from: 0, score: { total: 3 } });
  recordHand(data, { kind: 'draw' });
  recordHand(data, { kind: 'win', seat: 0, from: 3, score: { total: 2 } });
  assert.deepEqual([data.record.hands, data.record.dealIns, data.record.wins, data.record.selfDraws, data.record.bestTai], [3, 1, 1, 0, 2]);
  assert.equal(recordGame(data, -500, 3), true);
  assert.equal(recordGame(data, -900, 4), false);
  assert.equal(recordGame(data, 100, 2), true);
  assert.equal(data.record.bestGame, 100);
  assert.equal(data.record.games, 3);
  assert.equal(data.record.firsts, 0);
});

test('a broken save is started again and the old text kept aside', () => {
  const problems = [],
    storage = memory({ [SAVE_KEY]: '{not json' }),
    save = openSave(storage, 'zh', (problem) => problems.push(problem.kind));
  assert.deepEqual(save.data, freshSave('zh'));
  assert.ok(problems.length > 0);
  assert.ok([...storage.items.keys()].some((key) => key !== SAVE_KEY && key.startsWith(SAVE_KEY)));
});

test('a save of another shape, with a bad setting, or from a newer build is started again', () => {
  const bad = freshSave();
  bad.settings.pace = 'warp';
  assert.equal(openSave(memory({ [SAVE_KEY]: JSON.stringify({ version: 1, savedAt: '', data: bad }) })).data.settings.pace, 'calm');
  const wrong = openSave(memory({ [SAVE_KEY]: JSON.stringify({ version: 1, savedAt: '', data: { record: 'many' } }) }));
  assert.equal(wrong.data.record.games, 0);
  const problems = [],
    newer = openSave(memory({ [SAVE_KEY]: JSON.stringify({ version: 99, savedAt: '', data: freshSave() }) }), 'zh', (problem) => problems.push(problem.kind));
  assert.equal(newer.data.record.games, 0);
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
