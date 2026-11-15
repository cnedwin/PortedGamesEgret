import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PLOT_COUNT, availablePlots, seatLayout } from '../src/core/seat-layout.mjs';

test('seat plots keep saved positions and reserve room for automatic placement', () => {
  const buildings = [
    { kind: 'hall', plot: 8 }, { kind: 'gate' }, { kind: 'range', plot: 0 },
    { kind: 'forge' }, { kind: 'yard' },
  ];
  const before = structuredClone(buildings);
  const { placements, emptyPlots } = seatLayout(buildings);
  assert.deepEqual(placements.map(({ index, plot }) => [index, plot]), [
    [0, null], [1, null], [4, 2], [2, 0], [3, 6],
  ]);
  assert.deepEqual(emptyPlots, availablePlots(buildings));
  assert.equal(emptyPlots.length, PLOT_COUNT - 3);
  assert.ok([0, 2, 6].every(plot => !emptyPlots.includes(plot)));
  assert.deepEqual(buildings, before);
});

test('an old save with duplicate, string and invalid plot IDs still has one building per plot', () => {
  const buildings = [{ kind: 'yard', plot: '0' }, { kind: 'forge', plot: 0 }, { kind: 'dorm', plot: -1 }];
  const { placements, emptyPlots } = seatLayout(buildings);
  assert.equal(placements.find(item => item.index === 0).plot, 0);
  assert.equal(new Set(placements.map(item => item.plot)).size, 3);
  assert.equal(emptyPlots.length, PLOT_COUNT - 3);
});
