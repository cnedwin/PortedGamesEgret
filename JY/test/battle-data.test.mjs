import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeBattleList, decodeBattlefield, isBattleParty } from '../tools/battle-data.mjs';

test('war.sta retains battle ordinals, teams, coordinates, and signed placeholders', () => {
  const bytes = Buffer.alloc(186 * 2, 0xff);
  const base = 186;
  bytes.writeInt16LE(74, base);
  bytes.write('Name\0', base + 2, 'ascii');
  bytes.writeInt16LE(5, base + 12);
  bytes.writeInt16LE(100, base + 14);
  bytes.writeInt16LE(19, base + 16);
  bytes.writeInt16LE(0, base + 18);
  bytes.writeInt16LE(14, base + 30);
  bytes.writeInt16LE(29, base + 42);
  bytes.writeInt16LE(20, base + 54);
  bytes.writeInt16LE(35, base + 66);
  bytes.writeInt16LE(31, base + 106);
  bytes.writeInt16LE(24, base + 146);
  const [, battle] = decodeBattleList(bytes);
  assert.equal(battle.id, 1);
  assert.equal(battle.sourceId, 74);
  assert.equal(battle.name, 'Name');
  assert.deepEqual([battle.battlefieldId, battle.exp, battle.music], [5, 100, 19]);
  assert.deepEqual([battle.teamMate[0], battle.autoTeamMate[0], battle.teamX[0], battle.teamY[0]], [0, 14, 29, 20]);
  assert.deepEqual([battle.enemy[0], battle.enemy[19], battle.enemyX[0], battle.enemyY[0]], [35, -1, 31, 24]);
  assert.throws(() => decodeBattleList(bytes.subarray(1)), /186/);
});

test('warfld consumes first two raw signed layers within the indexed record', () => {
  const bytes = Buffer.alloc(20480);
  bytes.writeInt16LE(1394, 2 * (23 + 24 * 64));
  bytes.writeInt16LE(-3, 8192 + 2 * (23 + 24 * 64));
  bytes.writeInt16LE(17, 16384);
  const map = decodeBattlefield(bytes);
  assert.equal(map.width, 64);
  assert.equal(map.height, 64);
  assert.equal(map.layers.earth[23 + 24 * 64], 1394);
  assert.equal(map.layers.building[23 + 24 * 64], -3);
  assert.throws(() => decodeBattlefield(bytes.subarray(0, 16383)), /16384/);
});

test('battle requests accept up to six distinct canonical party members including the protagonist', () => {
  const roles = Array.from({ length: 54 }, (_, id) => ({ id }));
  assert.equal(isBattleParty([0, 53], roles), true);
  assert.equal(isBattleParty([0, 1, 2, 3, 4, 53], roles), true);
  assert.equal(isBattleParty([53], roles), false);
  assert.equal(isBattleParty([0, 53, 53], roles), false);
  assert.equal(isBattleParty([0, 54], roles), false);
  assert.equal(isBattleParty([0, '53'], roles), false);
  assert.equal(isBattleParty([0, 1, 2, 3, 4, 5, 53], roles), false);
});
