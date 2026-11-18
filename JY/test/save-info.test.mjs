import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeSaveSlot } from '../web/save-info.mjs';

const scenes = [{ id: 70, name: '小蝦米居' }];
const roles = { 0: { name: '小蝦米' }, 53: { name: '段譽' } };

test('save cards distinguish locations and list saved companions for legacy slots without dates', () => {
  const card = describeSaveSlot({ location: { id: 70 }, party: [0, 53, -1] }, scenes, roles);
  assert.equal(card.location, '小蝦米居');
  assert.match(card.detail, /2 人隊伍 · 小蝦米、段譽/);
  assert.doesNotMatch(card.detail, /Invalid|1970/);
  assert.equal(describeSaveSlot({ location: { id: 'world' } }, scenes, roles).detail, '');
});

test('completed saves retain a distinguishable location and explicit write date', () => {
  const card = describeSaveSlot({
    location: { id: 'world' }, flags: { finished: true }, savedAt: '2026-11-19T18:30:00.000Z', party: [0],
  }, scenes, roles);
  assert.equal(card.location, '已通關 · 江湖大地圖');
  assert.match(card.detail, /儲存於 2026/);
  assert.match(card.detail, /1 人隊伍 · 小蝦米/);
});
