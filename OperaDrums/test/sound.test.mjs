// 合成：每种声音长度合理、不爆音、没有坏数；伴奏和曲子一样长，板眼的每一下都落在拍上，京胡的每个音都在过门里、
// 在五声音阶上、在拍上开始。
// Synthesis: every sound is of a sensible length, never clips and holds no bad numbers; the backing is as long as the
// song, every clapper click falls on a beat, and every note of the fiddle is in a bridge, on the scale and on a beat.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RATE, SCALE, backingOf, ban, cai, cang, clicksOf, drum, fiddle, ling, peakOf, tai } from '../src/audio/synth.mjs';
import { LEAD, timeAt, timelineOf } from '../src/sim/chart.mjs';
import { SONGS } from '../src/sim/songs.mjs';

const finite = (samples) => samples.every((v) => Number.isFinite(v));

test('each instrument is short, below full scale and made of real numbers', () => {
  for (const [name, make, longest] of [
    ['drum', drum, 0.3],
    ['tai', tai, 1],
    ['ling', ling, 1],
    ['cai', cai, 0.8],
    ['cang', cang, 1.8],
    ['ban', ban, 0.1]
  ]) {
    const samples = make();
    assert.ok(samples.length > 0 && samples.length <= longest * RATE, `${name}: ${samples.length}`);
    assert.ok(finite(samples), name);
    assert.ok(peakOf(samples) > 0.1 && peakOf(samples) <= 1, `${name}: ${peakOf(samples)}`);
  }
  assert.ok(finite(fiddle(74, 0.5)) && peakOf(fiddle(74, 0.5)) <= 1);
});

test('the backing of each song lasts the song, stays below full scale and plays its tune in the bridges', () => {
  for (const song of SONGS) {
    const { samples, tune } = backingOf(song);
    const { sections, beats } = timelineOf(song);
    assert.ok(samples.length / RATE >= timeAt(song, beats), song.id);
    assert.ok(finite(samples) && peakOf(samples) < 1, `${song.id}: ${peakOf(samples)}`);
    assert.ok(tune.length > 10, song.id);
    const bridges = sections.filter((section) => section.cell === 'guomen');
    for (const note of tune) {
      assert.ok(SCALE.includes(note.midi), `${song.id}: ${note.midi}`);
      assert.equal((note.beat * 2) % 1, 0, 'on a half beat');
      assert.ok(bridges.some((section) => note.beat >= section.beat && note.beat < section.beat + section.beats), `${song.id}: beat ${note.beat}`);
    }
  }
});

test('the clapper sounds on every beat from the count-in on', () => {
  const song = SONGS[0];
  const { samples } = backingOf(song);
  for (let beat = 0; beat < LEAD.beats + 8; beat++) {
    const at = Math.round(timeAt(song, beat) * RATE);
    const window = samples.slice(at, at + Math.round(0.01 * RATE));
    assert.ok(peakOf(window) > 0.1, `beat ${beat}`);
    const before = samples.slice(at - Math.round(0.03 * RATE), at - Math.round(0.02 * RATE));
    assert.ok(peakOf(before) < peakOf(window), `beat ${beat} starts on time`);
  }
});

test('the clicks for setting the delay fall where they are said to', () => {
  const samples = clicksOf(8, 0.6, 1);
  for (let i = 0; i < 8; i++) {
    const at = Math.round((1 + i * 0.6) * RATE);
    assert.ok(peakOf(samples.slice(at, at + 200)) > 0.3, `click ${i}`);
    assert.ok(peakOf(samples.slice(at - 600, at - 200)) < 0.05, `quiet before click ${i}`);
  }
});
