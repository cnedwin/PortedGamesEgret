// 存档：设置的新档与写入；一整局写进存档位再读出来一模一样，读出来还能接着走、和没存过的走得一样；坏档另放一边、
// 存档位回到空；浏览器拒绝写入时不报错只回报失败；导出的文件能导入，别的文件不行；自己生成的新人随存档回来。
// The save: fresh settings and settings written; a whole game written into a slot and read back as it was, and going
// on from there exactly as the unsaved one does; an unreadable slot set aside and empty again; a refusing browser
// reported, not thrown; an exported file imported, and other files refused; the game's own new officers back with it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { OFFICERS_KEY, SAVE_KEY, SLOTS, freshSettings, openOfficerRoster, openSettings, openSlot, writeSlot, exportText, importText, importSaveText, gameLooksRight } = await import('../src/saves.mjs');
const W = await import('../src/sim/world.mjs');
const { registerCustom } = await import('../src/sim/newblood.mjs');
const { GENERALS } = await import('../src/data/generals.mjs');

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
const play = (s, days) => {
  for (let i = 0; i < days; i++) if (!W.advance(s)) s.inbox = s.inbox.filter((m) => !m.blocks);
  return s;
};

test('fresh settings speak the page language; a change is kept', () => {
  const storage = memory();
  const st = openSettings(storage, 'en');
  assert.deepEqual(st.data, freshSettings('en'));
  st.update((d) => {
    d.settings.sound = false;
    d.settings.language = 'zh';
  });
  const again = openSettings(storage, 'en');
  assert.equal(again.data.settings.sound, false);
  assert.equal(again.data.settings.language, 'zh');
  assert.ok(storage.items.has(SAVE_KEY));
});

test('registered officers have their own durable roster and a refused write leaves the last list readable', () => {
  const storage = memory();
  const roster = openOfficerRoster(storage);
  const officer = { id: 'u1', zh: '卫青霜', en: 'Wei Qingshuang', age: 25, female: true, portrait: 18,
    service: 'player', stats: { lead: 72, war: 65, int: 69, pol: 70, cha: 71 }, trait: 'bingfa' };
  assert.equal(roster.write([officer]), true);
  assert.deepEqual(openOfficerRoster(storage).read(), [officer]);
  assert.ok(storage.items.has(OFFICERS_KEY));
  assert.equal(storage.items.size, 1);
  storage.setItem = () => { throw new Error('quota'); };
  assert.equal(roster.write([]), false);
  assert.deepEqual(roster.read(), [officer]);
});

test('a game written into a slot comes back the same, and goes on as the unsaved one does', () => {
  const storage = memory();
  const s = play(W.createGame({ seed: 21, faction: 'sunjian', branch: 'sunjian', command: false }), 400);
  assert.ok(writeSlot(openSlot(storage, '1'), s, 3));
  const back = openSlot(storage, '1').data;
  assert.equal(back.summary.faction, 'sunjian');
  assert.equal(back.summary.day, s.day);
  assert.deepEqual(back.game, JSON.parse(JSON.stringify(s)));
  registerCustom(back.game);
  play(s, 200);
  play(back.game, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(back.game)), JSON.parse(JSON.stringify(s)));
  assert.deepEqual(SLOTS, ['auto', '1', '2', '3']);
});

test("the game's own new officers come back with it", () => {
  const s = play(W.createGame({ seed: 22, faction: 'caocao', branch: 'free', command: false }), 360 * 2 + 10);
  assert.ok(s.custom.length > 0);
  const text = JSON.stringify(s),
    id = s.custom[0].id;
  // Another game drops them from the roll; loading this one enters them again.
  W.createGame({ seed: 1, faction: 'liubei', branch: 'free' });
  assert.equal(GENERALS[id], undefined);
  registerCustom(JSON.parse(text));
  assert.equal(GENERALS[id].zh, s.custom[0].zh);
});

test('an unreadable slot is set aside and the slot is empty again', () => {
  const storage = memory({ [`${SAVE_KEY}.2`]: '{not json' });
  const problems = [];
  const slot = openSlot(storage, '2', (p) => problems.push(p.kind));
  assert.equal(slot.data.game, null);
  assert.ok(problems.length > 0);
  const kept = [...storage.items.keys()].filter((k) => k.startsWith(`${SAVE_KEY}.2`) && k !== `${SAVE_KEY}.2`);
  assert.ok(kept.length > 0, 'the old save is kept aside');
});

test('a game from a newer build is not taken', () => {
  const s = W.createGame({ seed: 2, faction: 'caocao' });
  assert.ok(gameLooksRight(s));
  assert.equal(gameLooksRight({ ...s, version: 99 }), false);
  assert.equal(gameLooksRight(null), false);
});

test('a browser that refuses to write is reported, not thrown', () => {
  const storage = memory({}, { refuse: true });
  const s = W.createGame({ seed: 3, faction: 'caocao' });
  let kept;
  assert.doesNotThrow(() => (kept = writeSlot(openSlot(storage, '3'), s, 1)));
  assert.equal(kept, false);
});

test('an exported save imports again; other files do not', () => {
  const s = play(W.createGame({ seed: 4, faction: 'yuanshao', branch: 'yuanshao', command: false }), 100);
  const back = importText(exportText(s));
  assert.deepEqual(back, JSON.parse(JSON.stringify(s)));
  assert.equal(importText('{"kind":"other","game":{}}'), null);
  assert.equal(importText('nonsense'), null);
});

test('optional view metadata survives slots and files while old files remain compatible', () => {
  const storage = memory();
  const game = W.createGame({ seed: 39 });
  const view = { paused: false, speed: 1, selection: { node: game.factions[game.player].capital }, camera: { x: 30, z: 40, d: 60 } };
  assert.equal(writeSlot(openSlot(storage, '1'), game, 1, view), true);
  const slot = openSlot(storage, '1').data;
  assert.equal(slot.summary.scenario, '184');
  assert.equal(slot.view.paused, false);
  assert.deepEqual(slot.view.camera, view.camera);
  assert.equal(importSaveText(exportText(game, view)).view.paused, false);
  assert.deepEqual(importText(exportText(game, view)), JSON.parse(JSON.stringify(game)));
  assert.equal(importSaveText(exportText(game)).view, null);
  view.camera.x = 999;
  assert.equal(slot.view.camera.x, 30);
});
