// 声音全部由代码合成：柴油机的低吼、溪水、马铃（马帮的铜铃）、汽笛、狼嚎、山匪的吆喝、撞击和水花，以及一段
// 用五声音阶写的马帮小调。没有一段是录来的。每个函数返回一个声道的采样，交给 Web Audio 的 AudioBuffer。
//
// Every sound is made here, from numbers: the growl of a diesel, a stream, the bronze bells of a caravan, the horn, a
// wolf's howl, a bandit's shout, knocks and splashes, and a caravan tune in the pentatonic scale. Nothing is recorded.
// Each function returns the samples of one channel, for a Web Audio `AudioBuffer`.

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


/** Make a loop seamless: cross-fade its last `seconds` into its start. */
function loop(out, seconds = 0.12) {
  const n = Math.round(seconds * RATE);
  for (let i = 0; i < n; i++) {
    const k = i / n;
    out[i] = out[i] * k + out[out.length - n + i] * (1 - k);
  }
  return out.subarray(0, out.length - n);
}

// The scale of the tune: gong, shang, jue, zhi, yu, in G.
const SCALE = [196, 220, 246.94, 293.66, 329.63];
const note = (degree, octave = 0) => SCALE[((degree % 5) + 5) % 5] * 2 ** (octave + Math.floor(degree / 5));

/** The sounds of the road, by name. */
export const SOUNDS = {
  /** A diesel at idle, one second that loops: firing pulses through a muffled pipe. Its pitch is raised with speed. */
  engine: () => {
    const out = samples(1.12),
      random = seeded(31);
    let low = 0,
      low2 = 0;
    for (let n = 0; n < out.length; n++) {
      const t = n / RATE,
        // Four cylinders at 900 rpm: 30 firings a second, each a short knock.
        phase = (t * 30) % 1,
        pulse = Math.exp(-phase * 9) * (0.8 + 0.2 * Math.sin(t * 7.3)),
        grit = random() * 2 - 1;
      low = low * 0.92 + (pulse + grit * 0.25) * 0.08;
      low2 = low2 * 0.8 + low * 0.2;
      out[n] = low2 * 2.4 + Math.sin(2 * Math.PI * 60 * t) * 0.05 + Math.sin(2 * Math.PI * 30 * t) * 0.08;
    }
    return settle(loop(out), 0.7);
  },
  /** Running water over stones, three seconds that loop: bands of noise that bubble at different rates. */
  stream: () => {
    const out = samples(3.15),
      random = seeded(41);
    let a = 0,
      b = 0;
    for (let n = 0; n < out.length; n++) {
      const t = n / RATE,
        white = random() * 2 - 1;
      a = a * 0.6 + white * 0.4;
      b = b * 0.97 + white * 0.03;
      const gurgle = 0.6 + 0.4 * Math.sin(t * 13 + Math.sin(t * 3.1) * 3) * Math.sin(t * 5.7);
      out[n] = (a - b) * 0.35 * gurgle + b * 0.6;
    }
    // Drops: small rising tones scattered over the water.
    for (let i = 0; i < 26; i++) {
      const at = random() * 2.9,
        f = 500 + random() * 900,
        start = Math.round(at * RATE);
      let phase = 0;
      for (let n = start; n < Math.min(out.length, start + 2400); n++) {
        const t = (n - start) / RATE;
        phase += (2 * Math.PI * f * (1 + t * 9)) / RATE;
        out[n] += Math.sin(phase) * 0.06 * Math.exp(-t * 60);
      }
    }
    return settle(loop(out, 0.15), 0.6);
  },
  /** A caravan bell: a bronze cup with a clapper, its partials out of tune with each other as a cast bell's are. */
  bell: () => {
    const out = samples(1.6);
    tone(out, 0, 1260, { gain: 0.32, decay: 4.5, length: 1.6, partials: [[1, 1], [1.51, 0.55], [2.32, 0.35], [3.17, 0.2], [4.6, 0.1]] });
    tone(out, 0.13, 1262, { gain: 0.16, decay: 6, length: 1.4, partials: [[1, 1], [1.51, 0.5], [2.32, 0.3]] });
    return settle(out, 0.7);
  },
  /** The truck's horn: two reeds a minor third apart, held and let go. */
  horn: () => {
    const out = samples(0.9);
    for (let n = 0; n < out.length; n++) {
      const t = n / RATE,
        envelope = Math.min(1, t * 40) * Math.min(1, (0.9 - t) * 12),
        saw = (f) => ((t * f) % 1) * 2 - 1;
      out[n] = (saw(370) * 0.5 + saw(440) * 0.4 + Math.sin(2 * Math.PI * 185 * t) * 0.3) * envelope * 0.5;
    }
    let low = 0;
    for (let n = 0; n < out.length; n++) out[n] = low = low * 0.55 + out[n] * 0.45;
    return settle(out, 0.8);
  },
  /** A wolf's howl: a rising, wavering, falling voice with breath in it. */
  howl: () => {
    const out = samples(2.8),
      random = seeded(51);
    let phase = 0,
      low = 0;
    for (let n = 0; n < out.length; n++) {
      const t = n / RATE,
        shape = t < 0.5 ? t / 0.5 : t < 2.1 ? 1 : (2.8 - t) / 0.7,
        f = 380 + 260 * Math.min(1, t / 0.6) - 120 * Math.max(0, t - 1.8) + Math.sin(t * 31) * 8;
      phase += (2 * Math.PI * f) / RATE;
      low = low * 0.9 + (random() * 2 - 1) * 0.1;
      out[n] = (Math.sin(phase) * 0.6 + Math.sin(phase * 2) * 0.18 + low * 0.5) * Math.max(0, shape) * 0.5;
    }
    return settle(out, 0.7);
  },
  /** A bandit's shout: a short open vowel, two formants over a rough voice. */
  shout: () => {
    const out = samples(0.55),
      random = seeded(61);
    let phase = 0;
    for (let n = 0; n < out.length; n++) {
      const t = n / RATE,
        envelope = Math.min(1, t * 30) * Math.exp(-Math.max(0, t - 0.25) * 9),
        f = 150 - t * 60;
      phase += (2 * Math.PI * f) / RATE;
      const voice = Math.sin(phase) + 0.5 * Math.sin(phase * 2) + 0.3 * (random() * 2 - 1);
      out[n] = voice * (Math.sin(2 * Math.PI * 720 * t) * 0.5 + Math.sin(2 * Math.PI * 1180 * t) * 0.3 + 0.4) * envelope * 0.4;
    }
    return settle(out, 0.7);
  },
  /** A body against a bumper: a dull thud and a scatter of gravel. */
  thud: () => settle(noise(tone(samples(0.6), 0, 80, { gain: 0.9, decay: 14, drop: 0.9 }), 0, { gain: 0.5, decay: 18, length: 0.4, tone: 0.75, seed: 71 })),
  /** A wolf yelps and is gone. */
  yelp: () => {
    const out = samples(0.4);
    let phase = 0;
    for (let n = 0; n < out.length; n++) {
      const t = n / RATE;
      phase += (2 * Math.PI * (900 - t * 1400)) / RATE;
      out[n] = Math.sin(phase) * Math.min(1, t * 200) * Math.exp(-t * 9) * 0.5;
    }
    return settle(out, 0.7);
  },
  /** A wheel through water: a rush of noise that opens and closes. */
  splash: () => settle(noise(samples(0.7), 0, { gain: 0.8, decay: 5, length: 0.7, tone: 0.35, seed: 81 }), 0.7),
  /** Wind over the snow, four seconds that loop. */
  wind: () => {
    const out = samples(4.2),
      random = seeded(91);
    let low = 0,
      lower = 0;
    for (let n = 0; n < out.length; n++) {
      const t = n / RATE;
      low = low * 0.985 + (random() * 2 - 1) * 0.015;
      lower = lower * 0.9995 + low * 0.0005;
      out[n] = (low * 6 - lower * 30) * (0.6 + 0.4 * Math.sin(t * 1.3) * Math.sin(t * 0.7 + 1));
    }
    return settle(loop(out, 0.2), 0.5);
  },
  /** A press on a control: a small wooden clapper. */
  tap: () => settle(tone(samples(0.15), 0, 760, { gain: 0.35, decay: 45, drop: 0.2, partials: [[1, 1], [2.7, 0.2]] })),
  /** A station reached: three bell strokes and a rising phrase on the string. */
  arrive: () => {
    const out = samples(3);
    for (let i = 0; i < 3; i++) tone(out, i * 0.28, 1260, { gain: 0.22, decay: 4, length: 1.4, partials: [[1, 1], [1.51, 0.5], [2.32, 0.3]] });
    [0, 2, 3, 4, 7].forEach((degree, i) => pluck(out, 0.5 + i * 0.16, note(degree, 1), { gain: 0.35, decay: 0.997, seed: 100 + i, length: 1.8 }));
    return settle(out);
  },
  /** A bundle lost: a low string falling. */
  lost: () => {
    const out = samples(1.2);
    [3, 1].forEach((degree, i) => pluck(out, i * 0.2, note(degree, -1), { gain: 0.5, decay: 0.995, seed: 110 + i, length: 1 }));
    return settle(out);
  }
};

/**
 * The caravan tune, which loops: a drone of the open fifth, a plucked bass, the clop of hooves on the half beat, and a
 * melody that walks the scale. `mood` 1 is the tense version for an ambush: faster hooves, a lower drone, the minor
 * turn of the scale.
 */
export function tune({ bars = 16, tempo = 84, seed = 3, mood = 0 } = {}) {
  const beat = 60 / tempo,
    bar = beat * 4,
    out = samples(bars * bar),
    random = seeded(seed),
    root = mood === 1 ? 98 : 98 * 1.0;
  for (let n = 0; n < out.length; n++) {
    const t = n / RATE,
      swell = 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / (bar * 2));
    out[n] += (Math.sin(2 * Math.PI * root * t) * 0.05 + Math.sin(2 * Math.PI * root * 1.5 * t) * 0.03) * (0.6 + swell * 0.4);
  }
  let degree = mood === 1 ? 4 : 2;
  const bass = mood === 0 ? [0, 0, 3, 4] : [4, 4, 1, 3];
  for (let b = 0; b < bars; b++) {
    const at = b * bar;
    pluck(out, at, note(bass[b % 4], -1), { gain: 0.3, decay: 0.998, brightness: 0.3, seed: 300 + b, length: bar });
    // Hooves: a knock of wood on each half beat, lighter on the off-beat.
    for (let k = 0; k < (mood === 1 ? 8 : 4); k++)
      tone(out, at + k * (mood === 1 ? beat / 2 : beat), k % 2 ? 1450 : 980, { gain: k % 2 ? 0.05 : 0.08, decay: 70, partials: [[1, 1], [2.3, 0.3]] });
    let t = at;
    while (t < at + bar - 0.01) {
      const length = random() < 0.25 ? beat * 2 : random() < 0.55 ? beat : beat / 2;
      if (random() > 0.2) pluck(out, t, note(degree, mood === 1 ? 0 : 1), { gain: 0.22, decay: 0.9975, brightness: 0.5, seed: Math.floor(random() * 1e6), length: length * 2.5 });
      const move = random() < 0.15 ? (random() < 0.5 ? -3 : 3) : random() < 0.5 ? -1 : 1;
      degree = Math.max(0, Math.min(9, degree + move));
      t += length;
    }
  }
  const fade = Math.round(RATE * 0.05);
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;
  return settle(out, 0.75);
}
