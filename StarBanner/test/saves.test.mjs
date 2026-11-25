// 存档：新档、设置写入、进行中的一局存下再读回能接着打、战绩、坏档另存后重新开始、版本过新时重新开始、存储拒绝写入
// 时不报错。
// The save: a fresh one, settings written, a battle in progress kept and read back to play on, the record, an
// unreadable save set aside and started again, a save too new started again, and a storage that refuses writes
// without an error.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { SAVE_KEY, freshSave, openSave, recordBattle, battleIsWhole, settingsOf } = await import('../src/saves.mjs');
const { createGame, act, cloneGame } = await import('../src/sim/rules.mjs');
const { mapById } = await import('../src/sim/maps.mjs');
const { createBrain, nextOrder } = await import('../src/sim/ai.mjs');

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

test('a fresh save speaks the page language, has no battle and an empty record', () => {
  const save = openSave(memory(), 'en');
  assert.deepEqual(save.data, freshSave('en'));
  assert.equal(save.data.battle, null);
});

test('settings survive opening the save again, and missing ones are filled in', () => {
  const storage = memory(),
    save = openSave(storage);
  assert.equal(save.update((d) => void Object.assign(d.settings, { language: 'en', speed: 3, music: false })), true);
  const again = openSave(storage);
  assert.equal(again.data.settings.language, 'en');
  assert.equal(again.data.settings.speed, 3);
  const older = settingsOf({ settings: { language: 'zh' } });
  assert.equal(older.sound, true);
});

test('a battle kept mid-way is read back whole and plays on as it would have', () => {
  const storage = memory();
  const save = openSave(storage);
  const game = createGame(mapById('coves'), [{ commander: 'vireta', ai: true }, { commander: 'edmund', ai: true }], 9);
  const brains = [createBrain('normal'), createBrain('normal')];
  for (let i = 0; i < 30; i++) act(game, nextOrder(game, brains[game.current]));
  const setup = { map: 'coves', sides: [{ commander: 'vireta' }, { commander: 'edmund', ai: true }], human: 0, seed: 9 };
  save.update((d) => void (d.battle = { setup, game: cloneGame(game) }));
  const back = openSave(storage).data.battle;
  assert.ok(battleIsWhole(back));
  assert.deepEqual(back.game, cloneGame(game));
  const resumed = { ...back.game, events: [] };
  const a = [createBrain('normal'), createBrain('normal')],
    b = [createBrain('normal'), createBrain('normal')];
  for (let i = 0; i < 30; i++) {
    act(resumed, nextOrder(resumed, a[resumed.current]));
    act(game, nextOrder(game, b[game.current]));
  }
  assert.deepEqual(cloneGame(resumed), cloneGame(game));
});

test('a finished battle goes into the record and the kept battle is cleared', () => {
  const save = openSave(memory());
  save.update((d) => {
    d.battle = { setup: {}, game: {} };
    recordBattle(d, 'wheat', true);
    recordBattle(d, 'wheat', false);
    recordBattle(d, 'spine', true);
  });
  assert.equal(save.data.battle, null);
  assert.deepEqual([save.data.record.won, save.data.record.lost], [2, 1]);
  assert.deepEqual(save.data.record.byMap.wheat, { won: 1, lost: 1 });
});

test('an unreadable save is set aside and a fresh one begins', () => {
  const problems = [];
  const storage = memory({ [SAVE_KEY]: '{not json' });
  const save = openSave(storage, 'zh', (p) => problems.push(p.kind));
  assert.deepEqual(save.data, freshSave('zh'));
  assert.ok(problems.length >= 1);
  assert.ok([...storage.items.keys()].some((k) => k.startsWith(SAVE_KEY) && k !== SAVE_KEY));
});

test('a broken battle inside an otherwise good save is not offered for resuming', () => {
  const storage = memory();
  const save = openSave(storage);
  save.update((d) => void (d.battle = { setup: { map: 'wheat' }, game: { w: 2, h: 2, terrain: [1], units: [], buildings: [], players: [] } }));
  const again = openSave(storage);
  assert.equal(battleIsWhole(again.data.battle), false);
});

test('a save from a newer version starts fresh, and a storage that refuses writes does not throw', () => {
  const storage = memory({ [SAVE_KEY]: JSON.stringify({ version: 99, data: { settings: {} } }) });
  const save = openSave(storage, 'en');
  assert.equal(save.data.settings.language, 'en');
  const refusing = openSave(memory({}, { refuse: true }));
  assert.equal(refusing.update((d) => void (d.settings.sound = false)), false);
});
