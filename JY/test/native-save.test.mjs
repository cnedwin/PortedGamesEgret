import assert from 'node:assert/strict';
import { mkdtemp, readFile, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { unzipSync, zipSync } from '../third-party/fflate/index.js';
import { createNativeSaveCodec } from '../tools/native-save.mjs';

async function fixture(t) {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'kys-save-test-'));
  t.after(async () => {
    for (const file of ['baseline.db', 'export.db']) {
      await unlink(join(temporaryDirectory, file)).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
    await rmdir(temporaryDirectory);
  });
  const path = join(temporaryDirectory, 'baseline.db');
  const db = new DatabaseSync(path);
  try {
    db.exec(`
      CREATE TABLE base (乘船 INTEGER, 子场景内 INTEGER, 主地图X INTEGER, 主地图Y INTEGER,
        子场景X INTEGER, 子场景Y INTEGER, 面朝方向 INTEGER, 队友1 INTEGER, 队友2 INTEGER,
        队友3 INTEGER, 队友4 INTEGER, 队友5 INTEGER, 队友6 INTEGER, 船X INTEGER);
      INSERT INTO base VALUES (0, -1, 357, 235, 45, 29, 1, 0, -1, -1, -1, -1, -1, 123);
      CREATE TABLE bag (物品编号 INTEGER, 物品数量 INTEGER);
      INSERT INTO bag VALUES (7, 2), (-1, 0), (-1, 0);
      CREATE TABLE role (编号 INTEGER, 名字 TEXT, 生命 INTEGER, 等级 INTEGER, 声望 INTEGER,
        所会武功1 INTEGER, 武功等级1 INTEGER, 所会武功2 INTEGER, 武功等级2 INTEGER,
        武器 INTEGER, 防具 INTEGER, 修炼物品 INTEGER);
      INSERT INTO role VALUES (42, '原名', 30, 1, 9, 2, 100, 0, 0, 0, -1, -1), (9, '同伴', 20, 2, 5, 0, 0, 3, 100, -1, -1, -1);
      CREATE TABLE item (编号 INTEGER, 物品名 TEXT, 使用人 INTEGER, 物品类型 INTEGER, 装备类型 INTEGER);
      INSERT INTO item VALUES (7, '兵器甲', 0, 1, 0), (9, '兵器乙', -1, 1, 0);
      CREATE TABLE submap (编号 INTEGER, 名称 TEXT, 进入条件 INTEGER);
      INSERT INTO submap VALUES (5, '開場', 0), (7, '山屋', 1);
      CREATE TABLE magic (编号 INTEGER);
      CREATE TABLE shop (物品编号1 INTEGER, 物品总量1 INTEGER, 物品价格1 INTEGER);
      INSERT INTO shop VALUES (0, 5, 80), (1, 3, 60);
    `);
  } finally {
    db.close();
  }
  const map = Buffer.alloc(2 * 49152);
  const events = Buffer.alloc(2 * 4400);
  events.writeInt16LE(691, 8);
  return {
    temporaryDirectory, path,
    members: { '1.db': await readFile(path), 's1.grp': map, 'd1.grp': events, 'extra.dat': Uint8Array.of(7, 21) },
  };
}

test('desktop ZIP converts both ways while retaining unrelated native data', async t => {
  const { temporaryDirectory, members } = await fixture(t);
  const initialSave = zipSync(members);
  const codec = await createNativeSaveCodec({ initialSave, openingSceneId: 0, temporaryDirectory });
  const initial = await codec.importSave(initialSave);
  assert.deepEqual(initial.location, { id: 'world', x: 357, y: 235, facing: 1 });
  assert.equal(initial.openingDone, false);
  assert.deepEqual(initial.inventory, [[7, 2]]);
  assert.deepEqual(initial.party, [0]);

  const changed = {
    ...initial,
    location: { id: 1, x: 10, y: 11, facing: 3 },
    mainX: 400, mainY: 200, inventory: [[9, 3]], party: [0, 1],
    roleState: [{ id: 0, hp: 25, level: 2, fame: 25 }, { id: 1, hp: 19,
      learnedMagics: [{ id: 3, level: 200, slot: 1, levelIndex: 2 }] }],
    openingEvents: [{ ...initial.openingEvents[0], event3: -1 }, initial.openingEvents[1]],
    scenePatches: [[1, { events: [[2, { event1: 1030, x: 7, y: 9 }]], eventTiles: [[583, 2]],
      layers: { building: [[245, -7]] }, entranceCondition: 0 }]],
  };
  const exported = await codec.exportSave(changed);
  const restored = await codec.importSave(exported);
  assert.equal(restored.openingDone, true);
  assert.deepEqual(restored.location, changed.location);
  assert.deepEqual(restored.inventory, changed.inventory);
  assert.deepEqual(restored.party, changed.party);
  assert.deepEqual(restored.roleState, changed.roleState);
  assert.equal(restored.openingEvents[0].event3, -1);
  const scenePatch = new Map(restored.scenePatches).get(1);
  assert.deepEqual(scenePatch.layers, changed.scenePatches[0][1].layers);
  assert.deepEqual(scenePatch.eventTiles, [[583, 2]]);
  assert.equal(scenePatch.entranceCondition, 0);
  assert.deepEqual(scenePatch.events[0], [2, { event1: 1030, x: 7, y: 9 }]);

  const output = unzipSync(exported);
  assert.deepEqual(output['extra.dat'], Uint8Array.of(7, 21));
  const dbPath = join(temporaryDirectory, 'export.db');
  await writeFile(dbPath, output['1.db']);
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    assert.equal(db.prepare('SELECT 船X FROM base').get()['船X'], 123);
    assert.equal(db.prepare('SELECT 声望 FROM role ORDER BY rowid').get()['声望'], 25);
    assert.equal(db.prepare('SELECT 所会武功1 FROM role WHERE 编号 = 9').get()['所会武功1'], 0);
    assert.equal(db.prepare('SELECT 所会武功2 FROM role WHERE 编号 = 9').get()['所会武功2'], 3);
  } finally {
    db.close();
  }
  assert.deepEqual(unzipSync(initialSave)['d1.grp'], new Uint8Array(members['d1.grp']));
});

test('shop totals and assigned item users use the native columns', async t => {
  const { temporaryDirectory, members } = await fixture(t);
  const initialSave = zipSync(members);
  const codec = await createNativeSaveCodec({ initialSave, openingSceneId: 0, temporaryDirectory });
  const initial = await codec.importSave(initialSave);
  const exportPath = join(temporaryDirectory, 'export.db');
  const changed = await codec.exportSave({ ...initial, flags: { shopSold: [['1:0', 2]] }, roleState: [{ id: 0, weaponId: 0 }, { id: 1, weaponId: 0 }] });
  const restored = await codec.importSave(changed);
  assert.deepEqual(restored.flags.shopSold, [['1:0', 2]]);
  assert.deepEqual(restored.roleState, [{ id: 0, weaponId: -1 }, { id: 1, weaponId: 0 }]);
  const output = unzipSync(changed);
  await writeFile(exportPath, output['1.db']);
  const db = new DatabaseSync(exportPath, { readOnly: true });
  try {
    assert.equal(db.prepare('SELECT 使用人 FROM item WHERE rowid = 1').get()['使用人'], 1);
    assert.equal(db.prepare('SELECT 物品总量1 FROM shop WHERE rowid = 2').get()['物品总量1'], 1);
    assert.equal(db.prepare('SELECT 物品价格1 FROM shop WHERE rowid = 2').get()['物品价格1'], 60);
  } finally {
    db.close();
  }
  const reexported = unzipSync(await codec.exportSave(restored));
  assert.deepEqual(reexported['1.db'], output['1.db']);
});

test('desktop save rejects missing files and writes outside map records', async t => {
  const { temporaryDirectory, members } = await fixture(t);
  const initialSave = zipSync(members);
  const codec = await createNativeSaveCodec({ initialSave, openingSceneId: 0, temporaryDirectory });
  const { 'd1.grp': _, ...incomplete } = members;
  await assert.rejects(codec.importSave(zipSync(incomplete)), /d1\.grp/);
  await assert.rejects(codec.importSave(zipSync({ ...members, '../unsafe.dat': Uint8Array.of(1) })), /ZIP.*name/i);
  const snapshot = await codec.importSave(initialSave);
  await assert.rejects(codec.exportSave({
    ...snapshot, scenePatches: [[1, { events: [], eventTiles: [[4096, 1]] }]],
  }), /cell.*4096/i);
});
