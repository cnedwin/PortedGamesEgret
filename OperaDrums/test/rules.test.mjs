// 规则：锣鼓经的点子每个都是整小节、字都认识；谱面按时间排好、三个难度一个比一个密、易只在正拍上；判定窗口、
// 打错手、太早、漏打、大音符双手、滚奏、连击、得分和「彩」槽；电脑玩家稳的能过关、乱敲的过不了。
// The rules: every pattern fills whole bars with known syllables; charts are in time order, each difficulty busier
// than the one before, easy only on the beat; the judging windows, the wrong hand, too early, a note let pass, both
// hands on a big note, rolls, the combo, the score and the cheer gauge; a steady computer player clears every chart
// and random striking clears none.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { playOut } from '../src/sim/bot.mjs';
import { LEAD, buildChart, densityOf, songOf, timeAt, timelineOf } from '../src/sim/chart.mjs';
import { CLEAR, DOUBLE, WINDOW, advance, createRun, resultOf, rollAt, strike } from '../src/sim/judge.mjs';
import { CELLS, DIFFICULTIES, ROMAN, SONGS, SYLLABLES, beatsOf, strokesOf } from '../src/sim/songs.mjs';

/** A chart made by hand: notes at the given times. */
function chartOf(notes, difficulty = 'normal') {
  const list = notes.map((note, index) => ({ beat: 0, kind: 'drum', big: false, roll: 0, syllable: '大', ...note, index }));
  return { song: 'test', difficulty, bpm: 120, notes: list, beats: 0, end: (list.at(-1)?.t ?? 0) + 1 };
}

test('every pattern fills whole bars, and every syllable is known and has a reading', () => {
  for (const [name, cell] of Object.entries(CELLS)) {
    assert.equal(beatsOf(name) % 4, 0, `${name} has ${beatsOf(name)} beats`);
    for (const stroke of strokesOf(name)) {
      assert.ok(stroke.syllable in SYLLABLES, `${name}: ${stroke.syllable}`);
      assert.ok(ROMAN[stroke.syllable], stroke.syllable);
      assert.ok(stroke.beats > 0);
    }
    assert.ok(cell.zh && cell.en);
  }
  for (const song of SONGS) for (const [cell] of song.sections) assert.ok(CELLS[cell], `${song.id}: ${cell}`);
});

test('charts are in time order, inside the song, and busier on each harder difficulty', () => {
  for (const song of SONGS) {
    const charts = DIFFICULTIES.map((difficulty) => buildChart(song, difficulty));
    for (const chart of charts) {
      const { notes } = chart;
      assert.ok(notes.length > 60, `${song.id} ${chart.difficulty}: ${notes.length}`);
      for (let i = 1; i < notes.length; i++) assert.ok(notes[i].t > notes[i - 1].t, `${song.id} ${chart.difficulty} note ${i}`);
      assert.ok(notes[0].t >= timeAt(song, LEAD.beats) - 1e-9, 'nothing in the count-in');
      assert.ok(notes.at(-1).t + notes.at(-1).roll < chart.end);
      notes.forEach((note, index) => assert.equal(note.index, index));
    }
    assert.ok(densityOf(charts[0]) < densityOf(charts[1]) && densityOf(charts[1]) < densityOf(charts[2]), song.id);
    for (const note of charts[0].notes) if (!note.roll) assert.equal(note.beat % 1, 0, `easy ${song.id} beat ${note.beat}`);
    for (const note of charts[1].notes) assert.equal((note.beat * 2) % 1, 0, `normal ${song.id} beat ${note.beat}`);
  }
});

test('cang is a big gong note, du a roll of the drum, ba and da drum notes', () => {
  const chart = buildChart(songOf('qiba'), 'normal');
  const by = (syllable) => chart.notes.filter((note) => note.syllable === syllable);
  assert.ok(by('仓').length && by('仓').every((note) => note.kind === 'gong' && note.big));
  assert.ok(by('嘟').length && by('嘟').every((note) => note.kind === 'drum' && note.roll > 0));
  assert.ok(by('大').every((note) => note.kind === 'drum' && !note.big));
  assert.ok(by('台').every((note) => note.kind === 'gong'));
  const { beats } = timelineOf(songOf('qiba'));
  assert.equal(beats, LEAD.beats + songOf('qiba').sections.reduce((sum, [cell, times]) => sum + beatsOf(cell) * times, 0));
});

test('a stroke is great within its window, good a little further, and a miss beyond or with the wrong hand', () => {
  const chart = chartOf([{ t: 1 }, { t: 2 }, { t: 3 }, { t: 4 }, { t: 5, kind: 'gong' }]);
  const run = createRun(chart);
  assert.equal(strike(run, 'drum', 1 + WINDOW.great - 0.001).judgement, 'great');
  assert.equal(strike(run, 'drum', 2 - WINDOW.ok + 0.001).judgement, 'ok');
  assert.equal(strike(run, 'drum', 3 - WINDOW.miss + 0.001).judgement, 'miss');
  assert.equal(strike(run, 'gong', 4.02).judgement, 'miss', 'the wrong hand');
  assert.equal(strike(run, 'drum', 4.6).type, 'empty', 'nothing near');
  assert.equal(strike(run, 'gong', 5.01).judgement, 'great');
  assert.deepEqual(run.counts, { great: 2, ok: 1, miss: 2 });
});

test('a note let pass is a miss once it is behind, and breaks the combo', () => {
  const run = createRun(chartOf([{ t: 1 }, { t: 1.5 }, { t: 2 }]));
  strike(run, 'drum', 1);
  assert.equal(run.combo, 1);
  assert.deepEqual(advance(run, 1.5 + WINDOW.miss - 0.01), []);
  assert.equal(advance(run, 1.5 + WINDOW.miss + 0.01).length, 1);
  assert.equal(run.combo, 0);
  assert.equal(strike(run, 'drum', 2).judgement, 'great');
  assert.equal(run.maxCombo, 1);
});

test('the second hand on a big note doubles it without striking the next note', () => {
  const run = createRun(chartOf([{ t: 1, kind: 'gong', big: true, syllable: '仓' }, { t: 1.2, kind: 'gong', syllable: '才' }]));
  const first = strike(run, 'gong', 1, 'd');
  const score = run.score;
  assert.equal(first.judgement, 'great');
  assert.notEqual(strike(run, 'gong', 1 + DOUBLE - 0.01, 'd').type, 'double', 'the same hand again does not double it');
  const again = createRun(chartOf([{ t: 1, kind: 'gong', big: true }, { t: 1.2, kind: 'gong' }]));
  strike(again, 'gong', 1, 'd');
  assert.equal(strike(again, 'gong', 1.02, 'k').type, 'double');
  assert.equal(again.doubles, 1);
  assert.ok(again.score > score);
  assert.equal(strike(again, 'gong', 1.2, 'd').judgement, 'great');
  const late = createRun(chartOf([{ t: 1, kind: 'gong', big: true }, { t: 1.5 }]));
  strike(late, 'gong', 1, 'd');
  assert.equal(strike(late, 'gong', 1 + DOUBLE + 0.02, 'k').type, 'empty', 'too late for the second hand');
});

test('a roll counts every stroke while it lasts and is never a miss', () => {
  const run = createRun(chartOf([{ t: 1, roll: 1, syllable: '嘟' }, { t: 3 }]));
  assert.equal(rollAt(run, 1.5)?.syllable, '嘟');
  for (let t = 1; t < 2; t += 0.1) assert.equal(strike(run, 'drum', t).type, 'roll');
  assert.equal(run.rolls, 10);
  assert.equal(strike(run, 'drum', 2.4).type, 'empty');
  advance(run, 2.9);
  assert.equal(run.counts.miss, 0);
});

test('the combo adds to the score, and the gauge rises with greats and falls with misses', () => {
  const notes = Array.from({ length: 40 }, (_, i) => ({ t: 1 + i * 0.5 }));
  const run = createRun(chartOf(notes));
  for (let i = 0; i < 20; i++) strike(run, 'drum', 1 + i * 0.5);
  assert.equal(run.combo, 20);
  assert.equal(run.score, 20 * 300 + 10 * 10 + 1 * 20);
  const gauge = run.gauge;
  assert.ok(Math.abs(gauge - 20 * run.unit) < 1e-9);
  advance(run, 1 + 21 * 0.5);
  assert.ok(run.gauge < gauge, 'two misses take the gauge down');
  for (let i = 22; i < 40; i++) strike(run, 'drum', 1 + i * 0.5);
  advance(run, 30);
  const result = resultOf(run);
  assert.equal(result.rank, result.gauge >= CLEAR.normal ? 'clear' : 'fail');
});

test('ranks: every note great is a full house, no miss a full combo, enough cheer a clear', () => {
  const chart = buildChart(songOf('qiba'), 'easy');
  assert.equal(playOut(chart, { spread: 0 }).rank, 'perfect');
  const fair = playOut(chart, { spread: 0.04, seed: 2 });
  assert.ok(['clear', 'fullCombo'].includes(fair.rank), fair.rank);
  assert.equal(playOut(chart, { mash: 8 }).rank, 'fail');
});

test('a steady player clears every chart; random striking clears none', () => {
  for (const song of SONGS)
    for (const difficulty of DIFFICULTIES) {
      const chart = buildChart(song, difficulty);
      for (let seed = 1; seed <= 3; seed++) assert.ok(playOut(chart, { seed, spread: 0.03, slip: 0.01 }).cleared, `${song.id} ${difficulty} seed ${seed}`);
      assert.ok(!playOut(chart, { mash: 8 }).cleared, `${song.id} ${difficulty} mashed`);
      assert.ok(!playOut(chart, { mash: 12, seed: 4 }).cleared, `${song.id} ${difficulty} mashed fast`);
    }
});
