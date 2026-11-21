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
    [2.17, 0.22, 13], [2.93, 0.17, 16], [3.53, 0.08, 26], [5.82, 0.06, 40]
  ]);
  texture(body, 3400, 1.4, seeded(light ? 88 : 83), 0.34, 44);
  return strikeShape(body, gain, 0.07);
}
export const ling = () => tai(0.32, true);

/** Cymbals flash and wash away instead of sounding like a steady hiss. */
export function cai(gain = 0.56) {
  const random = seeded(452);
  const body = resonator(0.58, 2140, 1960, 0.027, [
    [1, 0.25, 11], [1.182, 0.2, 12], [1.559, 0.16, 11],
    [2.061, 0.19, 15], [2.707, 0.1, 19], [3.11, 0.07, 30]
  ]);
  texture(body, 2780, 0.83, random, 0.68, 12);
  texture(body, 7450, 0.72, random, 1.1, 16);
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
const BODY = makeCycle([1, 0.7, 0.34, 0.3, 0.13, 0.06]);
const REED = makeCycle([0.6, 0.19, 0.46, 0.54, 0.25, 0.29, 0.11, 0.16, 0.08, 0.034]);

/** Bow pressure, formant colour and restrained portamento keep the jinghu line phrased. */
export function fiddle(midi, seconds, gain = 0.27, slide = 0.035) {
  const out = buffer(seconds);
  const target = hz(midi);
  const horsehair = bandNoise(out.length, 3360, 1.3, seeded(midi * 17 + Math.round(seconds * 100)));
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const swell = Math.sin(Math.PI * t / seconds);
    const pitch = target * (1 - slide * Math.exp(-t / 0.033) +
      (0.0067 * Math.sin(TAU * 5.3 * t) + 0.0019 * Math.sin(TAU * 8.3 * t)) * Math.min(1, t * 4));
    phase = (phase + pitch * BODY.length / RATE) % BODY.length;
    const left = phase | 0, right = (left + 1) % BODY.length, fraction = phase - left;
    const warm = BODY[left] + (BODY[right] - BODY[left]) * fraction;
    const bright = REED[left] + (REED[right] - REED[left]) * fraction;
    const bite = 0.42 + 0.23 * Math.exp(-t / 0.055) + 0.06 * swell;
    const bow = warm * (1 - bite) + bright * bite + horsehair[i] * (0.035 + 0.13 * Math.exp(-t / 0.037));
    const envelope = Math.min(1, t / 0.028, (seconds - t) / 0.053) * (0.77 + 0.23 * swell);
    out[i] = bow * gain * envelope;
  }
  return out;
}

function pluck(midi, seconds, mellow) {
  const pitch = hz(midi);
  const body = resonator(seconds, pitch * 1.008, pitch, 0.017, [
    [1, 0.8, 8], [2, 0.54, 12], [3.01, mellow ? 0.22 : 0.44, 16],
    [4.02, 0.32, 22], [5.03, 0.16, 33], [7.04, 0.1, 48]
  ]);
  texture(body, 3200, 1.4, seeded(midi + 25), 0.54, 112);
  return strikeShape(body, 0.85, 0.055);
}

/** The D pentatonic used by the three original themes. A phrase row is [duration in beats, scale degree]. */
export const SCALE = [69, 71, 74, 76, 78, 81, 83, 86];
const ARRANGEMENT = {
  qiba: {
    bars: [
      [[1, 2], [0.5, 4], [0.5, 5], [2, 7]], [[0.5, 6], [0.5, 5], [1, 4], [2, 2]],
      [[1.5, 4], [0.5, 5], [0.5, 7], [0.5, 6], [1, 5]], [[1, 4], [0.5, 3], [0.5, 4], [2, 2]]
    ],
    ostinato: [[0, 50, 0.092], [1.5, 57, 0.045], [2.5, 62, 0.073]],
    melody: 0.29, drum: 0.11, bustle: 0.038, close: [74, 78, 81, 86]
  },
  tangma: {
    bars: [
      [[0.5, 2], [0.5, 3], [1, 4], [0.5, 5], [0.5, 4], [1, 3]], [[0.5, 4], [0.5, 3], [0.5, 2], [0.5, 1], [2, 0]],
      [[0.5, 2], [0.5, 3], [0.5, 4], [0.5, 5], [1, 6], [1, 5]], [[0.5, 6], [0.5, 5], [0.5, 4], [0.5, 3], [2, 2]]
    ],
    ostinato: [[0, 50, 0.094], [0.5, 57, 0.058], [1.5, 62, 0.092], [2, 57, 0.081], [2.5, 59, 0.052], [3.5, 57, 0.083]],
    melody: 0.27, drum: 0.086, bustle: 0.064, close: [69, 74, 78, 81]
  },
  jijifeng: {
    bars: [
      [[0.5, 5], [0.5, 7], [0.5, 5], [0.5, 4], [0.5, 5], [0.5, 6], [1, 7]],
      [[0.5, 6], [0.5, 5], [0.5, 4], [0.5, 3], [2, 2]],
      [[0.5, 2], [0.5, 4], [0.5, 5], [0.5, 7], [0.5, 6], [0.5, 5], [1, 4]],
      [[0.5, 5], [0.5, 4], [0.5, 3], [0.5, 1], [2, 2]]
    ],
    ostinato: [[0, 50, 0.117], [0.5, 62, 0.063], [1, 57, 0.073], [1.5, 62, 0.073],
      [2, 50, 0.1], [2.5, 62, 0.063], [3, 57, 0.072], [3.5, 62, 0.080]],
    melody: 0.3, drum: 0.112, bustle: 0.065, close: [74, 81, 86]
  }
};

function ringStage(out, start) {
  const first = Math.round(RATE * 0.021), second = Math.round(RATE * 0.045);
  // One-way taps make a shallow theatre, without moving a clapper or note off its beat.
  for (let i = out.length - 1; i >= start + second; i--) out[i] += 0.075 * out[i - first] + 0.04 * out[i - second];
  return out;
}

export function backingOf(song) {
  const { sections, beats } = timelineOf(song);
  const shape = ARRANGEMENT[song.id] ?? ARRANGEMENT.qiba;
  const out = buffer(timeAt(song, beats) + 2);
  const strong = ban(), weak = ban(false);
  const deep = drum(0.72, 'da'), tap = drum(0.47, 'roll');
  const plucks = new Map();
  const beatSeconds = 60 / song.bpm;
  const tune = [];

  function pizz(beat, midi, gain) {
    if (!plucks.has(midi)) plucks.set(midi, pluck(midi, Math.min(0.45, beatSeconds * 0.88), midi < 57));
    mix(out, plucks.get(midi), timeAt(song, beat), gain);
  }

  for (let beat = 0; beat < beats; beat++) {
    const down = beat % 4 === 0;
    mix(out, down ? strong : weak, timeAt(song, beat), beat < LEAD.beats ? 1 : down ? 0.57 : 0.49);
  }

  let bridgeBar = 0, bridge = -1, previousBridge = false;
  for (const section of sections) {
    const inBridge = section.cell === 'guomen';
    if (inBridge && !previousBridge) {
      bridge++;
      bridgeBar = 0;
    }
    for (let bar = 0; bar < section.beats / 4; bar++) {
      const beat = section.beat + bar * 4;
      const phrase = (beat - LEAD.beats) / 4;
      const energy = phrase < 2 ? 0.72 : 0.88 + 0.12 * Math.sin(phrase * 0.66);
      for (const [at, original, gain] of shape.ostinato) {
        const midi = phrase % 4 === 3 && original === 50 ? 57 : original;
        pizz(beat + at, midi, gain * energy * (inBridge ? 0.73 : 1));
      }
      if (inBridge) {
        const phraseBar = (bridgeBar + (bridge % 2) * 2) % 4;
        let offset = 0;
        for (const [duration, degree] of shape.bars[phraseBar]) {
          const midi = SCALE[degree];
          const gain = shape.melody * (offset === 0 ? 1 : 0.87) * (bridge === 0 ? 0.89 : 1);
          mix(out, fiddle(midi, duration * beatSeconds * (duration >= 1 ? 0.97 : 0.92), gain), timeAt(song, beat + offset));
          tune.push({ beat: beat + offset, beats: duration, midi });
          offset += duration;
        }
        bridgeBar++;
      } else if (phrase > 0) {
        // Accent the stage arrangement between clapper beats, leaving the player's attacks room.
        mix(out, deep, timeAt(song, beat), shape.drum * energy);
        if (song.id === 'qiba') mix(out, tap, timeAt(song, beat + 3.5), shape.bustle);
        else {
          mix(out, tap, timeAt(song, beat + 1.5), shape.bustle);
          mix(out, tap, timeAt(song, beat + 3.5), shape.bustle * 0.83);
        }
      }
    }
    previousBridge = inBridge;
  }

  const closeAt = timeAt(song, beats);
  mix(out, cang(0.38), closeAt, 0.58);
  shape.close.forEach((midi, index) => {
    mix(out, pluck(midi - 12, 0.47, false), closeAt + index * 0.065, 0.16);
  });
  const finalPitch = shape.close.at(-1);
  mix(out, fiddle(finalPitch, 0.75, 0.17, 0.02), closeAt + 0.065);
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

export function cueOf(name) {
  const out = buffer(name === 'clear' ? 1.15 : name === 'retry' ? 0.65 : 0.25);
  if (name === 'select') return mix(out, ban(false), 0, 0.36);
  if (name === 'open') {
    mix(out, drum(0.47, 'roll'), 0, 0.49);
    return mix(out, pluck(74, 0.2, false), 0.026, 0.23);
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
  return {
    drum: drum(),
    da: drum(0.82, 'da'),
    roll: drum(0.49, 'roll'),
    double: double(),
    tai: tai(),
    ling: ling(),
    cai: cai(),
    cang: cang(),
    select: cueOf('select'),
    open: cueOf('open'),
    clear: cueOf('clear'),
    retry: cueOf('retry')
  };
}
