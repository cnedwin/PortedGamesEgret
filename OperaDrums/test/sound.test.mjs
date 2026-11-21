// The complete backing follows the chart clock, quoted melodies stay on the score,
// and every instrument and the fixed calibration click stays finite and below full scale.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RATE, SCALE, backingOf, ban, cai, cang, clicksOf, drum, effectsOf, fiddle, ling, peakOf, tai } from '../src/audio/synth.mjs';
import { LEAD, buildChart, timeAt, timelineOf } from '../src/sim/chart.mjs';
import { ENCORE_SONG } from '../src/sim/encore.mjs';
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

test('the backing of each song lasts the song, stays below full scale and reprises its motif across percussion sections and bridges', () => {
  for (const song of [...SONGS, ENCORE_SONG]) {
    const { samples, tune } = backingOf(song);
    const { sections, beats } = timelineOf(song);
    assert.ok(samples.length / RATE >= buildChart(song).end + 0.49, song.id);
    const close = Math.round(timeAt(song, beats) * RATE);
    assert.ok(peakOf(samples.slice(close, close + RATE / 2)) > 0.13, song.id + ': closing accent');
    assert.ok(finite(samples) && peakOf(samples) < 1, `${song.id}: ${peakOf(samples)}`);
    assert.ok(tune.length > 10, song.id);
    const firstBridge = sections.find((section) => section.cell === 'guomen');
    const firstPhrase = tune.filter((note) => note.beat >= LEAD.beats && note.beat < LEAD.beats + 4);
    const bridgePhrase = tune.filter((note) => note.beat >= firstBridge.beat && note.beat < firstBridge.beat + 4);
    assert.ok(firstPhrase.length >= 3 && bridgePhrase.length >= 3);
    assert.deepEqual(bridgePhrase.map((note) => note.midi), firstPhrase.map((note) => note.midi), song.id + ': opening motif returns');
    assert.ok(tune.some((note) => !note.bridge && note.beat >= beats - 8), song.id + ': ending reprise');
    for (const note of tune) {
      assert.ok(SCALE.includes(note.midi), `${song.id}: ${note.midi}`);
      assert.equal((note.beat * 2) % 1, 0, 'on a half beat');
      const section = sections.find(({ beat, beats }) => note.beat >= beat && note.beat < beat + beats);
      assert.ok(section);
      assert.equal(note.bridge, section.cell === 'guomen');
      assert.ok(note.beat + note.beats <= beats, song.id + ': no motif crosses the ending');
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

test('a roll has a distinct tight attack, and menu and result cues have different envelopes', () => {
  const effects = effectsOf();
  assert.ok(effects.roll.length < effects.drum.length);
  assert.notDeepEqual(effects.da, effects.drum);
  assert.ok(effects.clear.length > effects.retry.length && effects.retry.length > effects.open.length);
  assert.ok(effects.rally.length / RATE < 0.4 && peakOf(effects.rally) < 0.28);
  for (const [name, samples] of Object.entries(effects)) {
    assert.ok(finite(samples) && peakOf(samples) <= 0.85, name);
    assert.ok(peakOf(samples.slice(0, Math.round(RATE * 0.008))) > 0.07, `${name}: audible attack`);
  }
});

test('a light gong and a rally still cut through the first phrase', () => {
  const { ling, tai, rally } = effectsOf();
  const attack = (samples) => {
    const window = samples.subarray(0, Math.round(0.028 * RATE));
    return Math.sqrt(window.reduce((square, value) => square + value * value, 0) / window.length);
  };
  // Keep the light gong below the ordinary one, with enough body against the accompaniment.
  assert.ok(attack(ling) >= 0.148 && attack(ling) <= 0.76 * attack(tai));
  // The rally's two notes can be heard after the activating gong's onset.
  const afterStrike = rally.subarray(Math.round(0.080 * RATE), Math.round(0.220 * RATE));
  assert.ok(peakOf(afterStrike) >= 0.196 && peakOf(rally) < 0.28);
});
