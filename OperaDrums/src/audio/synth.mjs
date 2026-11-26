// Game-authored opera instruments and arrangements. This module is also used by the score worker.
import { LEAD, timeAt, timelineOf } from '../sim/chart.mjs';
import { seeded } from '../sim/bot.mjs';

export const RATE = 32000;
const TAU = Math.PI * 2;
const buffer = (seconds) => new Float32Array(Math.ceil(seconds * RATE));
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

export function mix(target, source, at, gain = 1) {
  const start = Math.round(at * RATE);
  const end = Math.min(source.length, target.length - start);
  for (let i = Math.max(0, -start); i < end; i++) target[start + i] += source[i] * gain;
  return target;
}

export const peakOf = (samples) => samples.reduce((peak, v) => Math.max(peak, Math.abs(v)), 0);

function level(samples, peak) {
  const most = peakOf(samples);
  if (most > 0) {
    const gain = peak / most;
    for (let i = 0; i < samples.length; i++) samples[i] *= gain;
  }
  return samples;
}

function fadeTail(samples, seconds) {
  const frames = Math.min(samples.length, Math.round(seconds * RATE));
  const start = samples.length - frames;
  for (let i = start; i < samples.length; i++) samples[i] *= (samples.length - 1 - i) / frames;
  return samples;
}

/** White noise filtered into the band of a mallet, wooden rim or sheet of brass. */
function bandNoise(length, frequency, q, random) {
  const out = new Float32Array(length);
  const radians = TAU * frequency / RATE;
  const alpha = Math.sin(radians) / (2 * q);
  const feed = alpha / (1 + alpha);
  const previous = 2 * Math.cos(radians) / (1 + alpha);
  const previous2 = (alpha - 1) / (1 + alpha);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < length; i++) {
    const x = random() * 2 - 1;
    const y = feed * (x - x2) + previous * y1 + previous2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    out[i] = y;
  }
  return out;
}

/** Partial ratios use independent damping so the attack can brighten before the body rings out. */
function resonator(seconds, from, to, glide, modes) {
  const out = buffer(seconds);
  for (const [ratio, gain, damping] of modes) {
    let phase = ratio * 0.23;
    let energy = gain;
    let slide = from - to;
    const damp = Math.exp(-damping / RATE);
    const settle = Math.exp(-1 / (RATE * glide));
    for (let i = 0; i < out.length; i++) {
      phase += TAU * ratio * (to + slide) / RATE;
      out[i] += Math.sin(phase) * energy;
      slide *= settle;
      energy *= damp;
    }
  }
  return out;
}

function texture(target, frequency, q, random, gain, decay) {
  const noise = bandNoise(target.length, frequency, q, random);
  const damping = Math.exp(-decay / RATE);
  for (let i = 0; i < target.length; i++) {
    target[i] += noise[i] * gain;
    gain *= damping;
  }
  return target;
}

function strikeShape(samples, gain, tail = 0.03) {
  for (let i = 0; i < 32; i++) samples[i] *= i / 32;
  return level(fadeTail(samples, tail), gain);
}

/** Danpi gu: the main skin stroke, a stronger centre stroke, and a short roll tap. */
export function drum(gain = 0.73, stroke = 'ba') {
  const deep = stroke === 'da', rim = stroke === 'roll';
  const random = seeded(deep ? 371 : rim ? 382 : 369);
  const from = deep ? 530 : rim ? 735 : 650, to = deep ? 310 : rim ? 505 : 390;
  const body = resonator(rim ? 0.125 : 0.208, from, to, 0.009, [
    [0.59, deep ? 0.42 : 0.21, 42], [1, 1, rim ? 51 : 36], [1.57, 0.51, 62],
    [2.13, 0.31, 81], [3.14, 0.18, 110]
  ]);
  texture(body, 1900, 1.1, random, 0.69, 93);
  texture(body, rim ? 4700 : 3650, 1.0, random, rim ? 0.82 : 0.45, 143);
  return strikeShape(body, gain);
}

/** A compact, bright small gong; the light touch is damped by the hand. */
export function tai(gain = 0.56, light = false) {
  const body = resonator(light ? 0.37 : 0.82, light ? 1060 : 1010, light ? 1071 : 1110, 0.065, [
    [1, 0.93, light ? 14 : 5.5], [1.24, 0.19, 7], [1.92, 0.32, 9],
    [2.17, 0.22, 13], [2.93, 0.17, 16], [3.53, 0.08, 26], [5.82, 0.035, 40]
  ]);
  texture(body, 2850, 1.5, seeded(light ? 88 : 83), 0.26, 44);
  return strikeShape(body, gain, 0.07);
}
export const ling = () => tai(0.40, true);

/** Cymbals flash and wash away instead of sounding like a steady hiss. */
export function cai(gain = 0.56) {
  const random = seeded(452);
  const body = resonator(0.58, 2140, 1960, 0.027, [
    [1, 0.25, 11], [1.182, 0.2, 12], [1.559, 0.16, 11],
    [2.061, 0.19, 15], [2.707, 0.1, 19], [3.11, 0.07, 30]
  ]);
  texture(body, 2780, 0.83, random, 0.68, 12);
  texture(body, 6360, 0.78, random, 0.88, 19);
  return strikeShape(body, gain, 0.085);
}

/** Large gong and cymbals together. Keep the bronze body louder than the initial splash. */
export function cang(gain = 0.81) {
  const body = resonator(1.56, 207, 178, 0.19, [
    [1, 0.88, 2.05], [1.19, 0.23, 2.8], [1.49, 0.57, 3.25], [2.03, 0.38, 4.2],
    [2.45, 0.31, 4.8], [3.16, 0.24, 5.8], [4.07, 0.13, 8], [5.23, 0.09, 11],
    [7.11, 0.06, 25], [11.4, 0.08, 38]
  ]);
  texture(body, 1440, 1.3, seeded(787), 0.63, 9);
  mix(body, cai(0.5), 0.004, 0.82);
  return strikeShape(body, gain, 0.15);
}

/** Dry hardwood clapper, with a plain and accented colour on the same beat grid. */
export function ban(strong = true) {
  const frequency = strong ? 1420 : 1660;
  const body = resonator(0.075, frequency, frequency * 0.97, 0.008, [
    [1, 0.63, 126], [1.58, 0.49, 156], [2.19, 0.31, 180], [2.63, 0.19, 210]
  ]);
  texture(body, 3510, 1.3, seeded(strong ? 96 : 91), 0.74, 169);
  return strikeShape(body, strong ? 0.79 : 0.48, 0.02);
}

const makeCycle = (harmonics) => {
  const table = new Float32Array(1024);
  harmonics.forEach((amount, n) => {
    for (let i = 0; i < table.length; i++) table[i] += Math.sin(TAU * (n + 1) * i / table.length + n * 0.16) * amount;
  });
  return level(table, 1);
};
const BODY = makeCycle([1, 0.49, 0.28, 0.155, 0.064, 0.04]);
const REED = makeCycle([1, 0.33, 0.38, 0.27, 0.115, 0.068, 0.048, 0.022]);

/** A warm bowed line with selective bow bite and a slower vibrato on held notes. */
export function fiddle(midi, seconds, gain = 0.27, slide = 0.026) {
  const out = buffer(seconds);
  const target = hz(midi);
  const horsehair = bandNoise(out.length, 2590, 1.55, seeded(midi * 17 + Math.round(seconds * 100)));
  let phase = 0, body = 0;
  const contour = Math.min(0.075, seconds * 0.27);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const swell = Math.sin(Math.PI * t / seconds);
    const breath = Math.max(0, Math.min(1, (t - 0.055) * 8));
    const pitch = target * (1 - slide * Math.exp(-t / 0.046) +
      (0.0044 * Math.sin(TAU * 4.7 * t) + 0.0012 * Math.sin(TAU * 7.2 * t)) * breath);
    phase = (phase + pitch * BODY.length / RATE) % BODY.length;
    const left = phase | 0, right = (left + 1) % BODY.length, fraction = phase - left;
    const warm = BODY[left] + (BODY[right] - BODY[left]) * fraction;
    const bright = REED[left] + (REED[right] - REED[left]) * fraction;
    const bite = 0.24 + 0.24 * Math.exp(-t / 0.043) + 0.05 * swell;
    const bow = warm * (1 - bite) + bright * bite + horsehair[i] * (0.028 + 0.074 * Math.exp(-t / 0.032));
    body += (bow - body) * 0.54;
    const envelope = Math.min(1, t / 0.034, (seconds - t) / contour) * (0.64 + 0.36 * swell);
    out[i] = body * gain * envelope;
  }
  return out;
}

/** Open bamboo colour for the answer in Riding Through. */
function flute(midi, seconds) {
  const out = buffer(seconds), frequency = hz(midi);
  const wind = bandNoise(out.length, 1850, 1.9, seeded(17 * midi + 159));
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const pressure = Math.min(1, t / 0.053, (seconds - t) / 0.064);
    phase += TAU * frequency * (1 - 0.014 * Math.exp(-t / 0.025) + 0.0031 * Math.sin(TAU * 3.8 * t)) / RATE;
    out[i] = pressure * (0.56 * Math.sin(phase) + 0.182 * Math.sin(2 * phase) +
      0.105 * Math.sin(3 * phase) + wind[i] * 0.072);
  }
  return out;
}

function pluck(midi, seconds, mellow) {
  const pitch = hz(midi);
  const body = resonator(seconds, pitch * 1.006, pitch, 0.021, [
    [1, 0.8, 7], [2, 0.48, 11], [3.007, mellow ? 0.19 : 0.31, 17],
    [4.012, 0.225, 23], [5.018, 0.12, 33], [6.025, 0.061, 47]
  ]);
  texture(body, mellow ? 1680 : 2370, 1.55, seeded(midi + 25), mellow ? 0.29 : 0.36, 108);
  return strikeShape(body, 0.8, 0.064);
}

/** The D pentatonic covers both registers. Each motif note is [offset, beats, MIDI pitch]. */
export const SCALE = [57, 59, 62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86];
const ARRANGEMENT = {
  qiba: {
    bars: [
      [[0, 1.15, 62], [1.5, 0.43, 66], [2, 1.5, 69]],
      [[0, 0.48, 74], [0.5, 0.43, 71], [1, 0.82, 69], [2, 1.35, 66]],
      [[0, 0.88, 66], [1, 0.44, 69], [1.5, 0.91, 74], [2.5, 1.16, 78]],
      [[0, 0.46, 76], [0.5, 0.48, 74], [1, 0.63, 69], [2, 1.52, 62]]
    ],
    bass: [[0, 50, 0.1], [1.5, 57, 0.055], [2.5, 62, 0.078]],
    line: 0.3, drum: 0.11, taps: [3.5], close: [62, 66, 69, 74]
  },
  tangma: {
    bars: [
      [[0, 0.46, 69], [0.5, 0.43, 74], [1, 0.41, 76], [1.5, 0.72, 74], [2.5, 0.38, 71], [3, 0.72, 69]],
      [[0, 0.44, 71], [0.5, 0.43, 74], [1, 0.65, 76], [2, 0.41, 74], [2.5, 0.45, 71], [3, 0.72, 69]],
      [[0, 0.44, 69], [0.5, 0.44, 74], [1, 0.38, 76], [1.5, 0.81, 78], [2.5, 0.43, 81], [3, 0.8, 78]],
      [[0, 0.41, 76], [0.5, 0.46, 74], [1, 0.75, 71], [2, 0.75, 69], [3, 0.69, 74]]
    ],
    bass: [[0, 50, 0.090], [0.5, 57, 0.045], [1.5, 62, 0.093], [2, 57, 0.067], [2.5, 59, 0.055], [3.5, 57, 0.071]],
    line: 0.3, drum: 0.094, taps: [1.5, 3.5], close: [62, 69, 74, 81], answer: 'flute'
  },
  jijifeng: {
    bars: [
      [[0, 0.38, 74], [0.5, 0.33, 74], [1, 0.43, 78], [1.5, 0.41, 76], [2, 0.7, 74], [3, 0.38, 69], [3.5, 0.37, 74]],
      [[0, 0.39, 78], [0.5, 0.36, 76], [1, 0.40, 74], [1.5, 0.4, 69], [2, 1.25, 74]],
      [[0, 0.36, 74], [0.5, 0.35, 74], [1, 0.43, 78], [1.5, 0.40, 81], [2, 0.66, 78], [3, 0.43, 81], [3.5, 0.37, 83]],
      [[0, 0.40, 81], [0.5, 0.40, 78], [1, 0.43, 76], [1.5, 0.43, 69], [2, 1.24, 74]]
    ],
    bass: [[0, 50, 0.100], [0.5, 62, 0.049], [1, 57, 0.071], [1.5, 62, 0.063],
      [2, 50, 0.086], [2.5, 62, 0.051], [3, 57, 0.069], [3.5, 62, 0.067]],
    line: 0.33, drum: 0.116, taps: [0.75, 1.5, 2.75, 3.5], close: [62, 74, 78, 81]
  },
  encore: {
    bars: [
      [[0, 0.37, 62], [0.5, 0.43, 69], [1, 0.71, 74], [2, 0.46, 76], [2.5, 0.43, 78], [3, 0.75, 81]],
      [[0, 0.46, 81], [0.5, 0.44, 78], [1, 0.50, 76], [2, 1.25, 74]],
      [[0, 0.36, 62], [0.5, 0.42, 69], [1, 0.72, 74], [2, 0.43, 78], [2.5, 0.40, 81], [3, 0.80, 86]],
      [[0, 0.47, 83], [0.5, 0.44, 81], [1, 0.49, 78], [2, 0.69, 74], [3, 0.64, 62]]
    ],
    bass: [[0, 50, 0.113], [0.75, 57, 0.07], [1.5, 62, 0.068], [2, 50, 0.09], [2.75, 57, 0.073], [3.5, 62, 0.075]],
    line: 0.335, drum: 0.122, taps: [1.5, 2.75, 3.5], close: [62, 69, 74, 86]
  }
};

function ringStage(out, start) {
  const first = Math.round(RATE * 0.026), second = Math.round(RATE * 0.047);
  // Reflect the harmonics below the stick attacks without moving a clapper off its beat.
  for (let i = out.length - 1; i > start + second; i--) {
    out[i] += 0.062 * out[i - first] + 0.031 * out[i - first - 1] +
      0.035 * out[i - second] + 0.018 * out[i - second - 1];
  }
}

/** The same motif is voiced in both the sung-style bridges and the playable percussion sections. */
export function backingOf(song) {
  const { sections, beats } = timelineOf(song);
  const shape = ARRANGEMENT[song.id] ?? ARRANGEMENT.qiba;
  const out = buffer(timeAt(song, beats) + 2);
  const strong = ban(), weak = ban(false);
  const deep = drum(0.69, 'da'), tap = drum(0.42, 'roll');
  const cache = new Map();
  const beatSeconds = 60 / song.bpm;
  const tune = [];

  function play(beat, midi, seconds, gain, colour) {
    const length = Math.max(0.07, seconds);
    const key = colour + ':' + midi + ':' + Math.round(length * 1000);
    if (!cache.has(key)) {
      const made = colour === 'bow' ? fiddle(midi, length, 1) : colour === 'flute' ? flute(midi, length) : pluck(midi, length, colour === 'bass');
      cache.set(key, made);
    }
    mix(out, cache.get(key), timeAt(song, beat), gain);
  }

  for (let beat = 0; beat < beats; beat++) {
    const down = beat % 4 === 0;
    mix(out, down ? strong : weak, timeAt(song, beat), beat < LEAD.beats ? 1 : down ? 0.53 : 0.42);
  }

  const bars = (beats - LEAD.beats) / 4;
  let bridgeBar = 0, previousBridge = false;
  for (const section of sections) {
    const inBridge = section.cell === 'guomen';
    if (inBridge && !previousBridge) bridgeBar = 0;
    for (let bar = 0; bar < section.beats / 4; bar++) {
      const beat = section.beat + bar * 4;
      const phrase = (beat - LEAD.beats) / 4;
      const reprise = Math.max(0, phrase - (bars - 4));
      const phraseBar = inBridge ? bridgeBar % 4 : phrase >= bars - 4 ? reprise : phrase % 4;
      const cycle = phrase % 8;
      const breath = cycle === 3 || cycle === 7;
      const arc = phrase === 0 ? 0.76 : phrase >= bars - 4 ? 1.07 : [0.8, 0.91, 1.0, 0.67, 0.91, 1.03, 1.09, 0.73][cycle];
      for (const [at, bass, gain] of shape.bass) {
        if (breath && at > 2.5) continue;
        const midi = phraseBar === 3 && bass === 50 ? 45 : bass;
        play(beat + at, midi, Math.min(0.66, beatSeconds * 1.24), gain * arc * (inBridge ? 0.73 : 1), 'bass');
      }

      const bridgeVoice = shape.answer && phraseBar % 2 === 1 ? shape.answer : 'bow';
      const voice = inBridge ? bridgeVoice : cycle === 2 || cycle === 6 ? 'bow' : 'pluck';
      const line = shape.line * arc * (inBridge ? 1 : voice === 'bow' ? 0.72 : 0.8);
      for (const [at, duration, midi] of shape.bars[phraseBar]) {
        const accent = at === 0 || at === 2 ? 1 : 0.86;
        play(beat + at, midi, duration * beatSeconds, line * accent, voice);
        tune.push({ beat: beat + at, beats: duration, midi, voice, bridge: inBridge });
      }

      if (inBridge) {
        bridgeBar++;
      } else {
        // Played strokes stay in front; these soft off-beat taps only carry the arrangement forward.
        if (phrase > 0) mix(out, deep, timeAt(song, beat), shape.drum * arc);
        if (!breath) {
          for (const at of shape.taps) mix(out, tap, timeAt(song, beat + at), 0.103 * arc);
        }
        if (phraseBar === 2) play(beat + 2, 57, beatSeconds * 1.55, 0.048 * arc, 'bow');
      }
    }
    previousBridge = inBridge;
  }

  const closeAt = timeAt(song, beats);
  mix(out, cang(0.38), closeAt, 0.48);
  shape.close.forEach((midi, index) => {
    mix(out, pluck(midi - 12, 0.54, false), closeAt + index * 0.048, 0.17);
  });
  const finalPitch = shape.close.at(-1);
  mix(out, fiddle(finalPitch, 0.8, 0.19, 0.017), closeAt + 0.07);
  ringStage(out, Math.round(timeAt(song, LEAD.beats + 1) * RATE));
  const peak = peakOf(out);
  if (peak > 0.91) level(out, 0.91);
  return { samples: out, tune };
}

/** Fixed clapper transients at the exact positions used by the delay measurement. */
export function clicksOf(beats, gap, lead = 0.5) {
  const out = buffer(lead + beats * gap + 0.5);
  const strong = ban(), weak = ban(false);
  for (let i = 0; i < beats; i++) mix(out, i % 4 === 0 ? strong : weak, lead + i * gap);
  return out;
}

const CUE_SECONDS = { clear: 1.15, retry: 0.65, rally: 0.36, 'rally-ready': 0.31, 'rally-end': 0.27, 'rally-break': 0.17 };

export function cueOf(name) {
  const out = buffer(CUE_SECONDS[name] ?? 0.25);
  if (name === 'select') return mix(out, ban(false), 0, 0.36);
  if (name === 'open') {
    mix(out, drum(0.47, 'roll'), 0, 0.49);
    return mix(out, pluck(74, 0.2, false), 0.026, 0.23);
  }
  if (name === 'rally-ready') {
    mix(out, pluck(69, 0.16, true), 0, 0.20);
    return mix(out, pluck(74, 0.18, true), 0.095, 0.22);
  }
  if (name === 'rally-end') {
    mix(out, pluck(74, 0.14, true), 0, 0.20);
    return mix(out, pluck(62, 0.16, true), 0.094, 0.18);
  }
  if (name === 'rally-break') {
    mix(out, drum(0.42, 'roll'), 0, 0.40);
    return mix(out, pluck(57, 0.115, true), 0.047, 0.16);
  }
  if (name === 'rally') {
    // Leave room for both gong attacks, then answer them with two higher notes.
    mix(out, drum(0.37, 'roll'), 0, 0.44);
    mix(out, pluck(81, 0.14, true), 0.082, 0.251);
    return mix(out, pluck(86, 0.17, true), 0.154, 0.237);
  }
  if (name === 'clear') {
    mix(out, pluck(74, 0.42, false), 0, 0.31);
    mix(out, pluck(81, 0.46, false), 0.09, 0.28);
    mix(out, pluck(86, 0.55, false), 0.18, 0.24);
    return mix(out, tai(0.34), 0.18, 0.49);
  }
  mix(out, drum(0.44, 'da'), 0, 0.7);
  return mix(out, pluck(69, 0.42, true), 0.09, 0.19);
}

export const double = () => tai(0.47, true);

export function effectsOf() {
  const bronze = cang();
  return {
    drum: drum(),
    da: drum(0.82, 'da'),
    roll: drum(0.49, 'roll'),
    double: double(),
    tai: tai(),
    ling: ling(),
    cai: cai(),
    cang: bronze,
    // Keep the same mallet attack and damp the tail when consecutive gongs are close together.
    cangRapid: fadeTail(bronze.slice(0, Math.round(0.39 * RATE)), 0.28),
    select: cueOf('select'),
    open: cueOf('open'),
    clear: cueOf('clear'),
    retry: cueOf('retry'),
    rally: cueOf('rally'),
    'rally-ready': cueOf('rally-ready'),
    'rally-end': cueOf('rally-end'),
    'rally-break': cueOf('rally-break')
  };
}
