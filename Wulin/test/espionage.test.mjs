import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as extras from '../src/core/extras.mjs';
import { deserialize, serialize } from '../src/core/save.mjs';
import { createWorld } from '../src/core/world.mjs';

test('espionage keeps its effects and gives the player one report for both directions', () => {
  const state = createWorld({ seed: 2, playerSect: 'tangmen' });
  const pairs = [['tangmen', 'wudang'], ['wudang', 'tangmen'], ['huashan', 'shaolin']];
  const books = state.sects;
  for (const [from, to] of pairs) {
    books[from].relations[to] = books[to].relations[from] = 0;
    const silver = books[from].silver;
    assert.ok(extras.plantSpy(state, from, to).ok);
    assert.equal(books[from].silver, silver - extras.SPY_COST);
    assert.equal(extras.spyBoost(state, from, to), 0.08);
  }
  assert.ok(extras.plantSpy(state, 'tangmen', 'gaibang').ok);
  books.gaibang.alive = false;
  state.day = 10;
  const before = state.log.length;
  const odds = [];
  extras.xunOfSpies(state, { chance: (probability) => (odds.push(probability), true) });

  assert.deepEqual(odds, [0.04, 0.04, 0.04]);
  assert.equal(extras.spyBoost(state, 'tangmen', 'gaibang'), 0);
  for (const [from, to] of pairs) assert.equal(extras.spyBoost(state, from, to), 0);
  assert.equal(books.tangmen.relations.wudang, -50);
  assert.equal(books.wudang.relations.tangmen, -50);
  assert.equal(books.huashan.relations.shaolin, -25);
  assert.equal(books.shaolin.relations.huashan, -25);
  const reports = state.log.slice(before);
  assert.equal(reports.length, 1);
  const [report] = reports;
  assert.equal(report.type, 'intel');
  assert.equal(report.sect, state.playerSect);
  assert.equal(report.day, 10);
  assert.deepEqual(report.incidents.map(({ by, target }) => `${by}:${target}`).sort(), ['tangmen:wudang', 'wudang:tangmen']);
  assert.match(report.text, /本派派往武当派的卧底败露/);
  assert.match(report.text, /本派查获武当派安插的卧底/);
  assert.doesNotMatch(report.text, /华山|少林/);

  extras.xunOfSpies(state, { chance: () => assert.fail('A discovered spy should not be checked again') });
  assert.equal(state.log.length, before + 1);
});

test('the chronicle keeps genuine old player intelligence without changing the save', () => {
  const state = createWorld({ seed: 2, playerSect: 'tangmen' });
  state.log = [
    { day: 20, type: 'event', sect: 'huashan', text: '安插在他派的卧底败露。' },
    { day: 20, type: 'event', sect: 'tangmen', text: '安插在他派的卧底败露。' },
    { day: 20, type: 'event', sect: 'wudang', text: '安插在本派的卧底败露。' },
    { day: 20, type: 'event', sect: 'huashan', text: '有奇人来访。' },
    { day: 30, type: 'event', sect: 'tangmen', text: '安插在他派的卧底败露。' },
  ];
  const loaded = deserialize(serialize(state)).state;
  const before = serialize(loaded);
  const records = extras.chronicleEntries(loaded);
  assert.deepEqual(records.map(({ day, type, sect }) => [day, type, sect]), [
    [20, 'intel', 'tangmen'], [20, 'event', 'huashan'], [30, 'intel', 'tangmen'],
  ]);
  assert.match(records[0].text, /本派一名外派卧底败露/);
  assert.match(records[0].text, /本派查获武当派安插的卧底/);
  assert.equal(records[1].text, '有奇人来访。');
  assert.equal(serialize(loaded), before);
});
