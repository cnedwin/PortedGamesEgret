// 存档：新档、旅程、营地文档、坏档另存、两趟旅程取较好的。
// The save: a fresh save, a journey, camp documents, an unreadable save set aside, and the better of two journeys.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { SAVE_KEY, better, freshJourney, openSave } = await import('../src/saves.mjs');

function memory(initial = {}) {
  const items = new Map(Object.entries(initial));
  return { getItem: (key) => items.get(key) ?? null, setItem: (key, value) => void items.set(key, String(value)), removeItem: (key) => void items.delete(key), items };
}

test('a fresh save has no journey, no camps and the default settings', () => {
  const save = openSave(memory());
  assert.equal(save.data.journey, null);
  assert.deepEqual(save.data.camps, {});
  assert.equal(save.data.settings.quality, 'auto');
  assert.equal(save.data.settings.touch, 'auto');
});

test('a journey and a camp survive opening the save again', () => {
  const storage = memory(),
    save = openSave(storage);
  save.update((data) => {
    data.journey = { ...freshJourney([24, 24, 24]), station: 1, cargo: [24, 22, 23] };
    data.camps.creek = { format: 'egret.world3d.scene', version: 1, root: 0, nodes: [{ name: 'camp' }], geometries: [], materials: [], textures: [], skeletons: [], skipped: [] };
  });
  const again = openSave(storage);
  assert.equal(again.data.journey.station, 1);
  assert.deepEqual(again.data.journey.cargo, [24, 22, 23]);
  assert.equal(again.data.camps.creek.nodes[0].name, 'camp');
});

test('a save of another shape is started again, the old text kept aside', () => {
  const storage = memory({ [SAVE_KEY]: JSON.stringify({ version: 1, data: { journey: 3, camps: null } }) }),
    save = openSave(storage);
  assert.equal(save.data.journey, null);
  assert.ok([...storage.items.keys()].some((key) => key.startsWith(SAVE_KEY) && key !== SAVE_KEY));
});

test('the better journey delivers more tea, then takes less time', () => {
  const a = { delivered: 60, seconds: 700 },
    b = { delivered: 66, seconds: 900 },
    c = { delivered: 66, seconds: 800 };
  assert.equal(better(a, b), b);
  assert.equal(better(b, c), c);
  assert.equal(better(null, a), a);
});
