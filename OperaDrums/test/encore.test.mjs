import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildChart } from '../src/sim/chart.mjs';
import { createEncore, ENCORE_POWER, ENCORE_SONG, updateEncore } from '../src/sim/encore.mjs';
import { advance, createRun, resultOf, SCORE, strike } from '../src/sim/judge.mjs';
import { SONGS } from '../src/sim/songs.mjs';

test('the short encore builds from lighter patterns to an accelerating final section without replacing the scorebook', () => {
  const chart = buildChart(ENCORE_SONG);
  const countDuring = (start, end) => chart.notes.filter((note) => note.t >= start && note.t < end).length;
  assert.ok(chart.end >= 40 && chart.end <= 55, String(chart.end));
  assert.ok(countDuring(27, 39) > countDuring(3, 15));
  assert.ok(chart.notes.some((note) => note.roll && chart.end - note.t < 10));
  assert.ok(chart.notes.at(-1).big, 'The last note is a two-hand gong');
  assert.deepEqual(SONGS.map(({ id }) => id), ['qiba', 'tangma', 'jijifeng']);
});

function performer() {
  const run = createRun(buildChart(ENCORE_SONG));
  let state = createEncore();
  function apply(result, time) {
    const next = updateEncore(Object.freeze(state), result, run, time);
    state = next.state;
    run.score += next.award;
    return next;
  }
  return {
    run,
    get state() { return state; },
    play(note, hand = 'a', time = note.t) { return apply(strike(run, note.kind, time, hand), time); },
    fastForward(time) {
      advance(run, time);
      return apply(null, time);
    }
  };
}

test('clean strokes build power and only a second hand can trigger a double-scored flurry', () => {
  const player = performer();
  const early = player.run.chart.notes.slice(0, 6);
  for (const note of early.slice(0, 4)) assert.equal(player.play(note).award, 0);
  assert.equal(player.state.charge, ENCORE_POWER.capacity);
  const big = early[4];
  assert.ok(big.big);
  assert.equal(player.play(big).activated, false);
  assert.equal(player.play(big, 'a', big.t + 0.01).activated, false);
  const hit = player.play(big, 'b', big.t + 0.02);
  assert.equal(hit.activated, true);
  assert.equal(hit.award, SCORE.great * 2);
  assert.equal(player.state.rallies, 1);
  assert.equal(player.state.charge, 0);
  assert.equal(player.state.activeUntil, big.t + 0.02 + ENCORE_POWER.seconds);
  assert.equal(player.play(early[5]).award, SCORE.great);
  assert.equal(player.state.bonus, SCORE.great * 3);
});

test('a missed note breaks the flurry and expired time cannot award bonus', () => {
  const player = performer();
  const early = player.run.chart.notes.slice(0, 6);
  for (const note of early.slice(0, 5)) player.play(note);
  assert.ok(player.play(early[4], 'b', early[4].t + 0.015).activated);
  const expired = updateEncore(player.state, { type: 'roll' }, player.run, player.state.activeUntil);
  assert.equal(expired.award, 0);
  assert.equal(expired.state.activeUntil, 0);
  player.fastForward(early[5].t + 0.136);
  assert.equal(player.state.activeUntil, 0);
  assert.equal(player.state.charge, 0);
  assert.equal(player.state.missed, 1);
  assert.equal(player.state.rallies, 1);
});

test('the entire encore is playable with natural rolls and multiple flurries', () => {
  const player = performer();
  const chart = player.run.chart;
  for (const note of chart.notes) {
    player.fastForward(note.t);
    player.play(note);
    if (note.big) player.play(note, 'b', note.t + 0.015);
    for (let dt = 0.12; dt < note.roll; dt += 0.12) player.play(note, 'a', note.t + dt);
  }
  player.fastForward(chart.end);
  assert.equal(resultOf(player.run).rank, 'perfect');
  assert.ok(player.state.rallies >= 3, String(player.state.rallies));
  assert.ok(player.state.bonus > 3000, String(player.state.bonus));
  assert.ok(player.run.rolls > 15);
});
