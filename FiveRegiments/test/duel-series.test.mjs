import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planDuelSeries, recordDuelRound, seriesStanding } from '../src/sim/duel-series.mjs';

test('a duel series rotates three existing arenas and keeps one opponent and difficulty', () => {
  const rounds = planDuelSeries('snow', 'tiger', 0.64);
  assert.deepEqual(rounds.map(stage => stage.place), ['snow', 'palace', 'county']);
  assert.deepEqual(rounds.map(stage => stage.index), [0, 1, 2]);
  for (const stage of rounds) {
    assert.deepEqual(stage.foes, ['tiger']);
    assert.equal(stage.level, 0.64);
    assert.ok(!stage.double && !stage.expedition);
  }
});

test('an opening loss advances the series and a decider finishes two to one', () => {
  const opening = recordDuelRound(seriesStanding(), false);
  assert.deepEqual(opening, { wins: 0, losses: 1, finished: false });
  const tied = recordDuelRound(opening, true);
  assert.deepEqual(tied, { wins: 1, losses: 1, finished: false });
  const final = recordDuelRound(tied, true);
  assert.deepEqual(final, { wins: 2, losses: 1, finished: true });
  assert.equal(recordDuelRound(final, false), final);
});

test('either fighter can finish the series in two and a rematch starts at zero', () => {
  for (const won of [true, false]) {
    const first = recordDuelRound(seriesStanding(), won);
    const final = recordDuelRound(first, won);
    assert.ok(final.finished);
    assert.equal(final.wins + final.losses, 2);
  }
  assert.deepEqual(seriesStanding(), { wins: 0, losses: 0, finished: false });
});
