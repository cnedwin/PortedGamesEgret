// 合成：单皮鼓、小锣、大锣、铙钹、板和京胡的声音都在这里用数算出来，得到一串采样；伴奏（板眼和过门里京胡的曲调）
// 按曲子的拍子整首排好。只是数，不碰页面也不碰引擎，所以能在 Node 里测长度、音量和对拍。
// Synthesis: the single-skin drum, the small gong, the big gong, the cymbals, the clapper and the jinghu fiddle are
// all worked out here as samples, and the backing (the clapper's beat, and the fiddle's tune in the bridges) is laid
// out for a whole song on its beats. Numbers only, free of the page and the engine, so lengths, levels and timing can
// be checked in Node.
import { LEAD, timeAt, timelineOf } from '../sim/chart.mjs';
import { seeded } from '../sim/bot.mjs';

export const RATE = 32000;
const TAU = Math.PI * 2;

/** A buffer of `seconds`. */
const buffer = (seconds) => new Float32Array(Math.ceil(seconds * RATE));

/** Add `source` into `target` from `at` seconds, times `gain`. */
export function mix(target, source, at, gain = 1) {
  const start = Math.round(at * RATE);
  for (let i = 0; i < source.length && start + i < target.length; i++) if (start + i >= 0) target[start + i] += source[i] * gain;
  return target;
}

/** White noise passed through a band-pass filter around `frequency`. */
function bandNoise(length, frequency, q, random) {
  const out = new Float32Array(length);
  const w = (TAU * frequency) / RATE,
    alpha = Math.sin(w) / (2 * q),
    a0 = 1 + alpha,
    b0 = alpha / a0,
    b2 = -alpha / a0,
    a1 = (-2 * Math.cos(w)) / a0,
    a2 = (1 - alpha) / a0;
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < length; i++) {
    const x = random() * 2 - 1,
      y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    out[i] = y;
  }
  return out;
}

/** `samples` scaled so their loudest is `peak`. */
export function level(samples, peak) {
  let most = 0;
  for (const v of samples) most = Math.max(most, Math.abs(v));
  if (most > 0) for (let i = 0; i < samples.length; i++) samples[i] *= peak / most;
  return samples;
}

/** Partials `[ratio, amount, decay]` over a pitch that glides from `from` to `to` over `glide` seconds. */
function partials(seconds, from, to, glide, list, gain) {
  const out = buffer(seconds);
  const phases = list.map(() => 0);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE,
      base = to + (from - to) * Math.exp(-t / Math.max(glide, 1e-4));
    let v = 0;
    list.forEach(([ratio, amount, decay], k) => {
      phases[k] += (TAU * base * ratio) / RATE;
      v += Math.sin(phases[k]) * amount * Math.exp(-t * decay);
    });
    out[i] = v * gain * Math.min(1, t * 2000);
  }
  return out;
}

/** The single-skin drum (danpi gu): a hard, high, dry knock. */
export function drum(gain = 0.8) {
  const random = seeded(3);
  const body = partials(0.22, 620, 380, 0.012, [
    [1, 1, 26],
    [1.58, 0.45, 38],
    [2.3, 0.2, 50]
  ], gain);
  const snap = bandNoise(body.length, 2600, 1.2, random);
  for (let i = 0; i < body.length; i++) body[i] += snap[i] * gain * 0.9 * Math.exp((-i / RATE) * 90);
  return level(body, gain);
}

/** The small gong (xiao luo, "tai"): bright, its pitch falling a little. */
export function tai(gain = 0.5) {
  return level(partials(0.9, 1180, 1000, 0.08, [
    [1, 1, 4.5],
    [2.04, 0.35, 7],
    [2.9, 0.2, 9],
    [4.1, 0.08, 12]
  ], gain), gain);
}

/** A light touch on the small gong ("ling"). */
export const ling = () => tai(0.25);

/** The cymbals (nao bo, "cai"): a splash of bright noise. */
export function cai(gain = 0.45) {
  const random = seeded(5);
  const out = buffer(0.7);
  const high = bandNoise(out.length, 5200, 0.8, random),
    mid = bandNoise(out.length, 3100, 1.5, random);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    out[i] = (high[i] * Math.exp(-t * 6) + mid[i] * 0.6 * Math.exp(-t * 9)) * gain * Math.min(1, t * 3000);
  }
  return level(out, gain);
}

/** The big gong with the cymbals ("cang"): a low, wide crash whose pitch rises a little, under the cymbals. */
export function cang(gain = 0.7) {
  const random = seeded(7);
  const gong = partials(1.6, 150, 176, 0.25, [
    [1, 1, 1.6],
    [1.47, 0.6, 2.2],
    [2.09, 0.45, 2.8],
    [2.76, 0.3, 3.5],
    [3.62, 0.2, 4.5]
  ], gain);
  const wash = bandNoise(gong.length, 900, 0.7, random);
  for (let i = 0; i < gong.length; i++) gong[i] += wash[i] * gain * 0.5 * Math.exp((-i / RATE) * 5);
  return level(mix(gong, cai(gain * 0.7), 0), gain);
}

/** The clapper (ban): a dry click; `strong` on the first beat of a bar. */
export function ban(strong = true) {
  const random = seeded(9);
  const out = buffer(0.08);
  const click = bandNoise(out.length, strong ? 2200 : 2800, 3, random);
  for (let i = 0; i < out.length; i++) out[i] = click[i] * Math.exp((-i / RATE) * 70);
  return level(out, strong ? 0.8 : 0.45);
}

/** One cycle of the fiddle's tone: a bright, reedy wave of twelve partials. */
const CYCLE = (() => {
  const size = 2048,
    out = new Float32Array(size);
  for (let n = 1; n <= 12; n++) {
    const amount = (1 / n ** 0.75) * (n >= 3 && n <= 6 ? 1.6 : 1);
    for (let i = 0; i < size; i++) out[i] += Math.sin((TAU * n * i) / size) * amount;
  }
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  return out.map((v) => v / peak);
})();

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

/** A bowed note of the jinghu: a short slide up into the note, vibrato, and a bowed swell. */
export function fiddle(midi, seconds, gain = 0.3) {
  const out = buffer(seconds + 0.05);
  const target = hz(midi);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const slide = target * (1 - 0.04 * Math.exp(-t / 0.03)),
      vibrato = 1 + 0.007 * Math.sin(TAU * 5.6 * t) * Math.min(1, t * 4),
      f = slide * vibrato;
    phase = (phase + (f * CYCLE.length) / RATE) % CYCLE.length;
    const attack = Math.min(1, t / 0.035),
      release = Math.min(1, Math.max(0, (seconds - t) / 0.06)),
      swell = 0.85 + 0.15 * Math.sin(Math.min(Math.PI, (t / seconds) * Math.PI));
    out[i] = CYCLE[phase | 0] * gain * attack * release * swell;
  }
  return out;
}

/** The notes of the D gong pentatonic the fiddle plays in, from A4 to D6. */
export const SCALE = [69, 71, 74, 76, 78, 81, 83, 86];
const RHYTHMS = [
  [1, 1, 1, 1],
  [0.5, 0.5, 1, 2],
  [1, 0.5, 0.5, 2],
  [2, 1, 1],
  [1.5, 0.5, 1, 1],
  [0.5, 0.5, 0.5, 0.5, 2]
];

/**
 * The fiddle's tune for a bridge of `bars` bars, as `[{ beat, beats, midi }]` from the bridge's first beat: a walk on
 * the scale in two-bar phrases, each ending long on D or A.
 */
export function tuneOf(bars, random) {
  const out = [];
  let step = 2 + Math.floor(random() * 3);
  for (let bar = 0; bar < bars; bar++) {
    const end = bar % 2 === 1;
    const rhythm = end ? [1, 1, 2] : RHYTHMS[Math.floor(random() * RHYTHMS.length)];
    let beat = bar * 4;
    rhythm.forEach((beats, i) => {
      if (end && i === rhythm.length - 1) step = random() < 0.5 ? 2 : 5;
      else step = Math.max(0, Math.min(SCALE.length - 1, step + Math.floor(random() * 5) - 2));
      out.push({ beat, beats, midi: SCALE[step] });
      beat += beats;
    });
  }
  return out;
}

/**
 * The backing of a whole song: the clapper on every beat (stronger on the first of a bar) and the fiddle's tune in the
 * bridges. Returns the samples and the tune, which the tests use to check that every note falls on its beat.
 */
export function backingOf(song) {
  const { sections, beats } = timelineOf(song);
  const out = buffer(timeAt(song, beats) + 2);
  const random = seeded(song.seed);
  const strong = ban(true),
    weak = ban(false);
  for (let beat = 0; beat < beats; beat++) mix(out, beat % 4 === 0 ? strong : weak, timeAt(song, beat), beat < LEAD.beats ? 1 : 0.55);
  const beatSeconds = 60 / song.bpm,
    tune = [];
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (section.cell !== 'guomen') continue;
    // A run of bridges is one tune.
    if (i > 0 && sections[i - 1].cell === 'guomen') continue;
    let bars = 0;
    for (let j = i; j < sections.length && sections[j].cell === 'guomen'; j++) bars += sections[j].beats / 4;
    for (const note of tuneOf(bars, random)) {
      const beat = section.beat + note.beat;
      tune.push({ ...note, beat });
      mix(out, fiddle(note.midi, note.beats * beatSeconds * 0.97), timeAt(song, beat));
    }
  }
  return { samples: out, tune };
}

/** A count of `beats` clapper clicks, `gap` seconds apart, starting after `lead` seconds: for setting the delay. */
export function clicksOf(beats, gap, lead = 0.5) {
  const out = buffer(lead + beats * gap + 0.5);
  for (let i = 0; i < beats; i++) mix(out, ban(i % 4 === 0), lead + i * gap, 1);
  return out;
}

/** The loudest sample, for keeping every sound under 1. */
export const peakOf = (samples) => samples.reduce((peak, v) => Math.max(peak, Math.abs(v)), 0);
