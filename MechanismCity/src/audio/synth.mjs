// 声音全部由代码合成：拨弦（似筝）、木鱼、铜锣、木头的碰撞、机括的弹响，以及两段五声音阶的循环配乐。
// Every sound is made here, from numbers: a plucked string after the zheng (a Karplus–Strong string), a
// wooden fish, a bronze bell, knocks of wood and stone, the snap of the bow, and two looping pieces in the
// pentatonic scale. Nothing is recorded. Each function returns the samples of one channel; the engine's kit
// encodes them as WAV and its mixer decodes and plays them.

export const RATE = 32000;

/** A seeded random number in [0, 1), so the same sound is made every time. */
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

const samples = (seconds) => new Float32Array(Math.max(1, Math.round(seconds * RATE)));

/** Add a plucked string at `at` seconds: a delay line of noise, averaged as it goes round, so it rings and fades. */
export function pluck(out, at, frequency, { gain = 0.5, decay = 0.996, brightness = 0.5, seed = 1, length = 2.4 } = {}) {
  const random = seeded(seed),
    period = Math.max(2, Math.round(RATE / frequency)),
    line = new Float32Array(period);
  for (let i = 0; i < period; i++) line[i] = random() * 2 - 1;
  const start = Math.round(at * RATE),
    end = Math.min(out.length, start + Math.round(length * RATE));
  let index = 0,
    last = 0;
  for (let n = start; n < end; n++) {
    const value = line[index];
    // The average of two neighbours, leaning on the newer as `brightness` grows: higher partials die sooner.
    const next = line[(index + 1) % period],
      blended = (value * (0.5 + brightness * 0.5) + next * (0.5 - brightness * 0.5)) * decay;
    line[index] = blended;
    index = (index + 1) % period;
    // The first moment of a pluck is its attack; a short ramp keeps it from clicking.
    const ramp = Math.min(1, (n - start) / 40);
    last = value * gain * ramp;
    out[n] += last;
  }
  return out;
}

/** Add a decaying sine with a falling pitch: the body of a knock or a wooden fish. */
function tone(out, at, frequency, { gain = 0.5, decay = 12, drop = 0, length = 0.6, partials = [[1, 1]] } = {}) {
  const start = Math.round(at * RATE),
    end = Math.min(out.length, start + Math.round(length * RATE));
  let phase = partials.map(() => 0);
  for (let n = start; n < end; n++) {
    const t = (n - start) / RATE,
      f = frequency * (1 + drop * Math.exp(-t * 30)),
      envelope = Math.exp(-t * decay) * Math.min(1, t * 2000);
    let value = 0;
    partials.forEach(([ratio, weight], i) => {
      phase[i] += (2 * Math.PI * f * ratio) / RATE;
      value += Math.sin(phase[i]) * weight * Math.exp(-t * decay * (0.6 + ratio * 0.25));
    });
    out[n] += value * gain * envelope;
  }
  return out;
}

/** Add a burst of noise through a simple low-pass: a hit, a crack, a breath. */
function noise(out, at, { gain = 0.4, decay = 20, length = 0.4, tone: smooth = 0.6, seed = 2 } = {}) {
  const random = seeded(seed),
    start = Math.round(at * RATE),
    end = Math.min(out.length, start + Math.round(length * RATE));
  let low = 0;
  for (let n = start; n < end; n++) {
    const t = (n - start) / RATE;
    low = low * smooth + (random() * 2 - 1) * (1 - smooth);
    out[n] += low * gain * Math.exp(-t * decay) * Math.min(1, t * 3000);
  }
  return out;
}

/** Keep the loudest sample under one. */
function settle(out, peak = 0.9) {
  let max = 0;
  for (const value of out) max = Math.max(max, Math.abs(value));
  if (max > peak) for (let i = 0; i < out.length; i++) out[i] *= peak / max;
  return out;
}

// The pentatonic scale of the pieces: gong, shang, jue, zhi, yu, in D.
const SCALE = [293.66, 329.63, 369.99, 440, 493.88];
const note = (degree, octave = 0) => SCALE[((degree % 5) + 5) % 5] * 2 ** (octave + Math.floor(degree / 5));

/** The sound effects of the game, by name. */
export const EFFECTS = {
  /** The bow is loosed: a low string and the rush of air. */
  shot: () => settle(noise(pluck(samples(0.6), 0, 110, { gain: 0.6, decay: 0.99, brightness: 0.8, length: 0.5, seed: 3 }), 0, { gain: 0.35, decay: 14, length: 0.4, tone: 0.3 })),
  /** A pellet strikes wood. */
  wood: () => settle(noise(tone(samples(0.35), 0, 190, { gain: 0.6, decay: 22, drop: 0.6, partials: [[1, 1], [2.4, 0.3]] }), 0, { gain: 0.25, decay: 40, length: 0.15, tone: 0.5 })),
  /** On stone. */
  stone: () => settle(noise(tone(samples(0.3), 0, 120, { gain: 0.5, decay: 28, drop: 0.3 }), 0, { gain: 0.4, decay: 45, length: 0.2, tone: 0.75, seed: 5 })),
  /** On bronze: a clang that rings. */
  metal: () => settle(tone(samples(1.1), 0, 520, { gain: 0.4, decay: 5, partials: [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.9, 0.12]] })),
  /** A crate gives way: a crack and a scatter of boards. */
  crack: () => {
    const out = samples(0.8);
    noise(out, 0, { gain: 0.8, decay: 12, length: 0.5, tone: 0.2, seed: 7 });
    for (let i = 0; i < 6; i++) tone(out, 0.05 + i * 0.07, 160 + i * 37, { gain: 0.25, decay: 30, drop: 0.5 });
    return settle(out);
  },
  /** A rope is cut. */
  snap: () => settle(noise(pluck(samples(0.5), 0, 660, { gain: 0.5, decay: 0.985, brightness: 0.9, length: 0.4, seed: 9 }), 0, { gain: 0.3, decay: 60, length: 0.1, tone: 0.1 })),
  /** A seesaw comes down. */
  thump: () => settle(noise(tone(samples(0.5), 0, 70, { gain: 0.8, decay: 12, drop: 0.8 }), 0, { gain: 0.3, decay: 25, length: 0.3, tone: 0.8 })),
  /** A spring throws something up. */
  boing: () => {
    const out = samples(0.6),
      start = 0;
    let phase = 0;
    for (let n = start; n < out.length; n++) {
      const t = n / RATE;
      phase += (2 * Math.PI * (220 + 300 * t + Math.sin(t * 60) * 30)) / RATE;
      out[n] += Math.sin(phase) * 0.5 * Math.exp(-t * 6);
    }
    return settle(out);
  },
  /** A plate is pressed and a gate grinds open. */
  grind: () => {
    const out = samples(1.2);
    noise(out, 0, { gain: 0.5, decay: 2.2, length: 1.2, tone: 0.92, seed: 11 });
    for (let i = 0; i < 9; i++) tone(out, i * 0.12, 90 + (i % 3) * 20, { gain: 0.2, decay: 40 });
    return settle(out);
  },
  /** Thunder: a deep burst and its rumble. */
  boom: () => settle(tone(noise(samples(1.6), 0, { gain: 1, decay: 3.5, length: 1.6, tone: 0.95, seed: 13 }), 0, 48, { gain: 0.9, decay: 4, drop: 1.5, length: 1.4 })),
  /** A lock opens: a bell and three rising notes on the string. */
  unlock: () => {
    const out = samples(2.2);
    tone(out, 0, note(0, 1), { gain: 0.35, decay: 2.2, length: 2.2, partials: [[1, 1], [2.01, 0.4], [3.2, 0.2], [4.6, 0.1]] });
    [2, 3, 5].forEach((degree, i) => pluck(out, 0.12 + i * 0.11, note(degree, 1), { gain: 0.35, decay: 0.997, seed: 20 + i, length: 1.6 }));
    return settle(out);
  },
  /** The city's heart is open: a falling run, then a gong. */
  victory: () => {
    const out = samples(3.4);
    [9, 7, 5, 4, 2, 0].forEach((degree, i) => pluck(out, i * 0.1, note(degree, 0), { gain: 0.4, decay: 0.997, seed: 30 + i, length: 2 }));
    tone(out, 0.7, 98, { gain: 0.6, decay: 1.4, length: 2.6, partials: [[1, 1], [1.48, 0.5], [2.1, 0.35], [2.9, 0.2]] });
    return settle(out);
  },
  /** No pellets left and the lock shut. */
  fail: () => {
    const out = samples(1.4);
    [3, 1, 0].forEach((degree, i) => pluck(out, i * 0.18, note(degree, -1), { gain: 0.45, decay: 0.995, seed: 40 + i, length: 1 }));
    return settle(out);
  },
  /** A press on a control: a small wooden fish. */
  tap: () => settle(tone(samples(0.15), 0, 880, { gain: 0.35, decay: 45, drop: 0.2, partials: [[1, 1], [2.7, 0.2]] })),
  /** A page turns: a soft breath. */
  page: () => settle(noise(samples(0.35), 0, { gain: 0.25, decay: 9, length: 0.35, tone: 0.85, seed: 17 }))
};

/**
 * A piece that loops: a drone of open fifths, a plucked bass on the beat, a wooden clapper, and a melody that
 * walks the scale, one phrase per bar. `seed` chooses the melody; `tempo` is in beats a minute.
 */
export function music({ bars = 16, tempo = 76, seed = 1, mood = 0 } = {}) {
  const beat = 60 / tempo,
    bar = beat * 4,
    out = samples(bars * bar),
    random = seeded(seed);
  // The drone: two soft sines a fifth apart that swell with each bar.
  for (let n = 0; n < out.length; n++) {
    const t = n / RATE,
      swell = 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / (bar * 2));
    out[n] += (Math.sin(2 * Math.PI * 73.4 * t) * 0.05 + Math.sin(2 * Math.PI * 110 * t) * 0.035) * (0.6 + swell * 0.4);
  }
  let degree = 2;
  const bass = mood === 0 ? [0, 0, 3, 4] : [0, 4, 3, 1];
  for (let b = 0; b < bars; b++) {
    const at = b * bar;
    pluck(out, at, note(bass[b % 4], -2), { gain: 0.32, decay: 0.998, brightness: 0.3, seed: 100 + b, length: bar });
    pluck(out, at + beat * 2, note(bass[b % 4] + 2, -2), { gain: 0.2, decay: 0.997, brightness: 0.3, seed: 200 + b, length: beat * 2 });
    if (mood === 1 || b % 2 === 1) for (let k = 0; k < 4; k++) tone(out, at + k * beat + beat * 0.5, 1180, { gain: 0.06, decay: 60, partials: [[1, 1], [2.3, 0.3]] });
    // A phrase: steps of the scale, with a rest and now and then a leap, ending long.
    let t = at;
    while (t < at + bar - 0.01) {
      const length = random() < 0.25 ? beat * 2 : random() < 0.5 ? beat : beat / 2;
      if (random() > 0.18) pluck(out, t, note(degree, 0), { gain: 0.24, decay: 0.9975, brightness: 0.55, seed: Math.floor(random() * 1e6), length: length * 2.5 });
      const move = random() < 0.15 ? (random() < 0.5 ? -3 : 3) : random() < 0.5 ? -1 : 1;
      degree = Math.max(0, Math.min(9, degree + move));
      t += length;
    }
  }
  // The end of the loop leads into its start: the last fraction of a second fades so the seam is soft.
  const fade = Math.round(RATE * 0.05);
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;
  return settle(out, 0.8);
}
