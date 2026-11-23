// 征途：每营都是四场单挑（另外四营各一次）加一场以一敌二，地点依次换；评分与评等。
// The road: for every regiment, four duels (each of the other four once) and one fight against two, each in its own
// place; the score and the mark.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ORDER } from '../src/sim/regiments.mjs';
import { PLACES, grade, planRoad, stageScore } from '../src/sim/road.mjs';

test('each road meets the other four, then two at once, in five places', () => {
  for (const r of ORDER) {
    const road = planRoad(r);
    assert.equal(road.length, 5);
    const duels = road.slice(0, 4).map((s) => s.foes[0]);
    assert.deepEqual([...duels].sort(), ORDER.filter((x) => x !== r).sort());
    assert.deepEqual(road.map((s) => s.place), PLACES);
    const last = road[4];
    assert.ok(last.double && last.foes.length === 2 && !last.foes.includes(r));
    for (let i = 1; i < 4; i++) assert.ok(road[i].level > road[i - 1].level, 'harder along the road');
  }
});

test('cleaner wins score higher, and the mark follows the scores', () => {
  const clean = stageScore({ time: 25, taken: 2, deflects: 4, broken: 2, healthLeft: 0.9 });
  const rough = stageScore({ time: 70, taken: 14, deflects: 0, broken: 0, healthLeft: 0.1 });
  assert.ok(clean > rough);
  assert.equal(grade([2400, 2200]), 'jia');
  assert.equal(grade([1600]), 'yi');
  assert.equal(grade([1200, 900]), 'bing');
  assert.equal(grade([400]), 'ding');
});
