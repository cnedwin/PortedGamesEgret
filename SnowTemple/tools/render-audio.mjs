// Original score and Foley for SnowTemple. Run with Node; no samples, packages or encoder required.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const TAU = Math.PI * 2;
const output = new URL('../assets/audio/', import.meta.url);
let seed = 0x871a;
const random = () => {
  seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
  return (seed / 0x100000000) * 2 - 1;
};
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const envelope = (t, length, attack, release) => Math.max(0, Math.min(1, t / attack, (length - t) / release));

function paint(track, start, duration, sample) {
  let index = Math.round(start * RATE);
  const frames = Math.ceil(duration * RATE);
  for (let i = 0; i < frames; i++, index++) {
    if (index >= track.length) index = 0;
    track[index] += sample(i / RATE, i);
  }
}

// Absorbing delay-line string with a brief upright-bridge knock and body resonances.
function pluck(track, at, midi, gain, duration = 1.8, muted = false) {
  const f = hz(midi);
  const delay = new Float32Array(Math.round(RATE / f));
  let last = 0;
  for (let i = 0; i < delay.length; i++) {
    last = last * 0.44 + random() * 0.56;
    delay[i] = last;
  }
  paint(track, at, duration, (t, i) => {
    const point = i % delay.length;
    const pick = delay[point];
    delay[point] = (pick * 0.51 + delay[(point + 1) % delay.length] * 0.49) * (muted ? 0.975 : 0.996);
    const body = Math.sin(TAU * f * t) * Math.exp(-t * 3.6) * 0.26 + Math.sin(TAU * 183 * t) * Math.exp(-t * 45) * 0.18;
    return (pick * 0.78 + body) * envelope(t, duration, 0.006, 0.12) * gain;
  });
}

// The breath line bends into pitch before its characteristic light vibrato.
function flute(track, at, midi, duration, gain) {
  const f = hz(midi);
  let phase = 0, breath = 0;
  paint(track, at, duration, (t) => {
    phase += (TAU * f / RATE) * (1 - 0.037 * Math.exp(-t * 24) + Math.sin(TAU * 5.1 * t) * 0.0045 * Math.min(1, t * 4));
    breath = breath * 0.81 + random() * 0.19;
    const reeds = Math.sin(phase) * 0.72 + Math.sin(phase * 2 + 0.08) * 0.23 + Math.sin(phase * 3) * 0.09;
    return (reeds + breath * (0.32 + Math.exp(-t * 16) * 0.36)) * envelope(t, duration, 0.12, 0.19) * gain;
  });
}

function bow(track, at, midi, duration, gain) {
  const f = hz(midi);
  paint(track, at, duration, (t) => {
    const phase = TAU * f * t + Math.sin(TAU * 4.6 * t) * 0.07;
    const body = Math.sin(phase) + Math.sin(phase * 2) * 0.44 + Math.sin(phase * 3) * 0.18 + Math.sin(phase * 6) * 0.045;
    return body * envelope(t, duration, 0.21, 0.24) * gain * (0.84 + Math.sin(TAU * 2.6 * t) * 0.12);
  });
}

function ring(track, at, f, duration, gain, partials = [1, 1.51, 2.76, 4.1, 6.8]) {
  paint(track, at, duration, (t) => {
    let body = 0;
    for (let i = 0; i < partials.length; i++) {
      body += Math.sin(TAU * f * partials[i] * t + i * 0.13) * Math.exp(-t * (2 + i * 4.3) / duration) / (1 + i * 0.72);
    }
    return body * envelope(t, duration, 0.004, duration * 0.16) * gain;
  });
}

function drum(track, at, f, gain, duration = 0.45) {
  let phase = 0, skin = 0;
  paint(track, at, duration, (t) => {
    phase += (TAU * f / RATE) * (1 + 1.75 * Math.exp(-t * 48));
    skin = skin * 0.59 + random() * 0.41;
    const body = (Math.sin(phase) + Math.sin(phase * 1.61) * 0.30) * Math.exp(-t * 11 / (duration + 0.45));
    return (body + skin * Math.exp(-t * 58) * 1.7) * envelope(t, duration, 0.003, 0.06) * gain;
  });
}

function noise(track, at, duration, gain, colour, contour = (u) => Math.sin(Math.PI * u) ** 1.5) {
  let slow = 0, fast = 0;
  paint(track, at, duration, (t) => {
    const grain = random();
    slow += (grain - slow) * colour;
    fast += (grain - fast) * Math.min(1, colour * 5.7);
    return (fast - slow) * contour(t / duration) * gain;
  });
}

function room(track, loop, amount) {
  const dry = new Float32Array(track);
  for (const [offset, level] of [[0.027, 0.40], [0.042, 0.31], [0.071, 0.26], [0.107, 0.19], [0.163, 0.14], [0.221, 0.09], [0.302, 0.064]]) {
    const distance = Math.round(RATE * offset);
    let reflection = 0;
    for (let i = 0; i < track.length; i++) {
      const index = i - distance;
      const source = index >= 0 ? dry[index] : loop ? dry[track.length + index] : 0;
      reflection += (source - reflection) * 0.33;
      track[i] += reflection * level * amount;
    }
  }
}

function wav(samples, peak) {
  let highest = 0;
  for (const value of samples) highest = Math.max(highest, Math.abs(value));
  const scale = 32767 * peak / Math.max(highest, 0.001);
  const file = Buffer.alloc(44 + samples.length * 2);
  file.write('RIFF');
  file.writeUInt32LE(file.length - 8, 4);
  file.write('WAVEfmt ', 8);
  file.writeUInt32LE(16, 16);
  file.writeUInt16LE(1, 20);
  file.writeUInt16LE(1, 22);
  file.writeUInt32LE(RATE, 24);
  file.writeUInt32LE(RATE * 2, 28);
  file.writeUInt16LE(2, 32);
  file.writeUInt16LE(16, 34);
  file.write('data', 36);
  file.writeUInt32LE(file.length - 44, 40);
  for (let i = 0; i < samples.length; i++) file.writeInt16LE(Math.round(samples[i] * scale), 44 + i * 2);
  return file;
}

// The D-yu theme begins D, F, A, G. Each scene arranges it differently over D, C, B-flat and F.
const score = {
  title: {
    bpm: 67, bars: 6, space: 0.69,
    lead: [[0, 62, 0.85], [1, 65, 0.9], [2, 69, 1.35], [3.5, 67, 1.4], [6, 60, 0.8], [7, 62, 2.4], [11, 69, 0.8], [12, 72, 1.9], [14, 69, 0.75], [15, 67, 1.5], [19, 65, 1.3], [21, 62, 2.4]],
    roots: [50, 48, 46, 53, 48, 50],
    pattern: [0, 1.75, 3.25]
  },
  road: {
    bpm: 70, bars: 8, space: 0.64,
    lead: [[1, 62, 1.0], [2, 65, 1.4], [4, 69, 1.5], [6, 67, 2.2], [10, 65, 0.8], [11, 67, 0.8], [12, 69, 2], [15, 65, 1], [18, 60, 1.4], [20, 62, 2.1], [25, 67, 1.1], [26.5, 65, 1], [28, 62, 3]],
    roots: [50, 48, 53, 48, 46, 50, 48, 50],
    pattern: [0, 1.5, 2.75]
  },
  yard: {
    bpm: 94, bars: 8, space: 0.42,
    lead: [[0, 62, 0.5], [0.75, 65, 0.45], [1.5, 69, 0.9], [3, 67, 0.8], [8, 67, 0.65], [9, 65, 0.6], [10, 62, 1.5], [16, 69, 0.65], [17, 72, 0.65], [18, 69, 0.75], [20, 67, 1.2], [24, 65, 0.65], [25, 67, 0.6], [26, 65, 0.7], [28, 62, 2]],
    roots: [50, 50, 48, 50, 53, 48, 53, 50],
    pattern: [0, 0.75, 1.5, 2.5, 3.25],
    drums: [[0, 0.32], [1.5, 0.13], [2.75, 0.22]]
  },
  boss1: {
    bpm: 106, bars: 12, space: 0.44,
    lead: [[1, 50, 1], [2.5, 53, 0.9], [4, 57, 1.1], [6, 55, 1.2], [8, 60, 1], [10, 57, 1.4], [14, 55, 1.2], [16, 57, 0.9], [17.5, 60, 1.4], [20.5, 62, 2], [25, 60, 1], [26.5, 57, 0.8], [28, 55, 1.5], [33, 53, 1.4], [36, 48, 1.3], [40, 50, 2], [44, 55, 1.1], [46, 50, 1.2]],
    roots: [38, 38, 36, 38, 41, 38, 36, 41, 38, 36, 36, 38],
    pattern: [0, 1.5, 2, 3.25],
    drums: [[0, 0.37], [1.75, 0.22], [3, 0.28]],
    boss: true
  },
  boss2: {
    bpm: 124, bars: 12, space: 0.4,
    lead: [[0, 62, 0.65], [0.75, 65, 0.5], [1.5, 69, 0.75], [2.5, 67, 1.1], [5, 72, 0.4], [6, 69, 0.9], [9, 65, 0.65], [10, 67, 0.68], [11, 69, 0.6], [12, 72, 1.2], [16, 74, 0.75], [17, 72, 0.6], [18, 69, 1.3], [21, 65, 0.75], [22, 67, 1.2], [25, 69, 1.1], [27, 65, 0.6], [30, 62, 1.8], [34, 53, 0.75], [36, 57, 1.2], [39, 55, 1.4], [41, 60, 1.2], [44, 62, 1.6]],
    roots: [38, 41, 38, 36, 41, 36, 38, 38, 41, 38, 36, 38],
    pattern: [0, 0.5, 1.25, 2, 2.75, 3.5],
    drums: [[0, 0.43], [0.75, 0.19], [1.5, 0.26], [2.25, 0.20], [3, 0.33]],
    boss: true,
    fierce: true
  },
  end: {
    bpm: 64, bars: 4, space: 0.79,
    lead: [[0.2, 69, 1.1], [1.5, 67, 1.1], [3, 65, 1.75], [6, 62, 2.4], [10, 60, 1.2], [12, 62, 2.4]],
    roots: [50, 48, 53, 50],
    pattern: [0, 2.5]
  }
};

function makeScore(name, part) {
  const beat = 60 / part.bpm;
  const loop = name !== 'end';
  const track = new Float32Array(Math.round(part.bars * 4 * beat * RATE));
  for (let bar = 0; bar < part.bars; bar++) {
    const root = part.roots[bar];
    const at = bar * 4 * beat;
    bow(track, at, root, 3.65 * beat, part.boss ? 0.115 : 0.074);
    if (bar % 2 === 0 && name !== 'yard') pluck(track, at + 0.04, root + 12, 0.19, beat * 1.6);
    for (const [i, pulse] of part.pattern.entries()) {
      const bass = [0, 7, 12, 7, 0, 12][i];
      pluck(track, at + (pulse + (i % 2 ? 0.025 : 0)) * beat, root + bass + (part.boss ? 12 : 24), i % 2 ? 0.11 : 0.17, beat * 1.7, !!part.drums);
    }
    for (const [pulse, level] of part.drums ?? []) drum(track, at + pulse * beat, (part.boss ? 88 : 132) + pulse * 12, level);
    if (part.fierce && bar % 2 === 0) ring(track, at + beat * 2.25, 302, 0.64, 0.062, [1, 1.82, 3.2, 5.7]);
  }
  for (const [i, [at, midi, length]] of part.lead.entries()) {
    const gain = (i % 3 === 1 ? 0.22 : 0.27) * (part.drums ? 0.8 : 1);
    if (name === 'boss1') bow(track, at * beat, midi, length * beat, gain);
    else flute(track, at * beat, midi, length * beat, gain);
    if (i % 3 === 0) pluck(track, (at + 0.12) * beat, midi + 12, gain * 0.67, beat * 1.7, false);
  }
  if (name === 'end') {
    ring(track, beat * 0.04, 98, 3.3, 0.16);
    ring(track, beat * 12, 196, 2.2, 0.08);
  }
  room(track, loop, part.space);
  if (!loop) {
    const fade = Math.round(RATE * 0.7);
    for (let i = 0; i < fade; i++) track[track.length - 1 - i] *= i / fade;
  }
  return wav(track, 0.77);
}

// Gusts and crackle are cut from synthetic textures with overlap at the loop seam.
function ambience(scene) {
  const seconds = scene === 'wind' ? 12 : scene === 'embers' ? 9 : 11;
  const file = new Float32Array((seconds + 1) * RATE);
  noise(file, 0, seconds + 1, 0.75, 0.027, (u) => 0.50 + Math.sin(TAU * u * 2.2) * 0.16 + Math.sin(TAU * u * 5.3) * 0.13);
  noise(file, 0, seconds + 1, scene === 'wind' ? 0.24 : 0.11, 0.06, (u) => 0.32 + Math.cos(u * TAU * 3.2) * 0.19);
  if (scene === 'embers') {
    for (let i = 0; i < 82; i++) {
      const at = 0.13 + (random() + 1) * 4.46;
      noise(file, at, 0.018 + (random() + 1) * 0.065, 0.22 + (random() + 1) * 0.18, 0.15);
      if (i % 7 === 0) drum(file, at, 135, 0.075, 0.12);
    }
  } else if (scene === 'temple') {
    for (const at of [1.7, 3.9, 7.4, 10.1]) {
      bow(file, at, at < 5 ? 43 : 46, 0.4, 0.042);
      noise(file, at + 0.12, 0.53, 0.48, 0.016);
    }
  }
  const samples = file.subarray(RATE, (seconds + 1) * RATE);
  for (let i = 0; i < RATE; i++) {
    const mix = i / RATE;
    samples[samples.length - RATE + i] = samples[samples.length - RATE + i] * (1 - mix) + file[i] * mix;
  }
  const seam = samples[0] - samples[samples.length - 1];
  for (let i = 0; i < 64; i++) {
    const mix = i / 63;
    samples[samples.length - 64 + i] += seam * mix * mix;
  }
  return wav(samples, 0.65);
}

const chip = (t, pitch, gain = 0.68) => {
  drum(t, 0, pitch, gain, 0.23);
  noise(t, 0, 0.07, gain, 0.18);
};
const swipe = (t, span, strength, roughness) => {
  noise(t, 0, span, strength, roughness, (u) => Math.sin(Math.PI * u ** 0.67) ** 2);
};
const SHOTS = {
  'ui-start': [0.45, (t) => { chip(t, 290, 0.32); pluck(t, 0.055, 69, 0.46, 0.36); }],
  'ui-open': [0.26, (t) => { chip(t, 320, 0.47); ring(t, 0.035, 420, 0.2, 0.11); }],
  'ui-close': [0.24, (t) => { chip(t, 250, 0.44); }],
  'ui-select': [0.18, (t) => { noise(t, 0, 0.07, 0.46, 0.12); drum(t, 0, 338, 0.48, 0.12); }],
  'ui-confirm': [0.48, (t) => { chip(t, 320, 0.34); ring(t, 0.08, 475, 0.36, 0.25); }],
  'ui-back': [0.26, (t) => { swipe(t, 0.18, 0.51, 0.09); chip(t, 204, 0.44); }],
  gong: [2.8, (t) => { ring(t, 0, 76, 2.65, 0.65, [1, 1.38, 1.98, 2.83, 4.21, 6.42]); drum(t, 0, 82, 0.40, 0.79); }],
  'step-snow-a': [0.24, (t) => { swipe(t, 0.17, 0.82, 0.14); noise(t, 0.06, 0.095, 0.48, 0.26); }],
  'step-snow-b': [0.24, (t) => { swipe(t, 0.12, 0.69, 0.17); noise(t, 0.08, 0.12, 0.48, 0.22); }],
  'step-stone-a': [0.24, (t) => { chip(t, 280, 0.52); swipe(t, 0.18, 0.41, 0.12); }],
  'step-stone-b': [0.25, (t) => { chip(t, 390, 0.52); swipe(t, 0.14, 0.39, 0.16); }],
  'swing-short': [0.24, (t) => { swipe(t, 0.20, 0.8, 0.13); }],
  'swing-wide': [0.33, (t) => { swipe(t, 0.27, 0.87, 0.093); noise(t, 0.13, 0.16, 0.43, 0.19); }],
  'swing-heavy': [0.41, (t) => { swipe(t, 0.31, 1.0, 0.043); drum(t, 0.13, 98, 0.24, 0.22); }],
  'weapon-ready': [0.19, (t) => { swipe(t, 0.16, 0.67, 0.07); }],
  'hit-light': [0.36, (t) => { drum(t, 0, 136, 0.78, 0.25); noise(t, 0.003, 0.12, 0.58, 0.075); }],
  'hit-heavy': [0.5, (t) => { drum(t, 0, 80, 0.92, 0.4); ring(t, 0.013, 235, 0.4, 0.15); noise(t, 0, 0.22, 0.97, 0.060); }],
  'hit-riposte': [0.72, (t) => { drum(t, 0, 73, 0.88, 0.49); ring(t, 0.02, 372, 0.62, 0.38); swipe(t, 0.27, 0.84, 0.13); }],
  deflect: [0.33, (t) => { chip(t, 230, 0.46); ring(t, 0.012, 625, 0.28, 0.31); }],
  block: [0.46, (t) => { ring(t, 0, 290, 0.39, 0.38); drum(t, 0.006, 155, 0.75, 0.29); swipe(t, 0.12, 0.55, 0.11); }],
  parry: [0.83, (t) => { ring(t, 0, 746, 0.72, 0.49); ring(t, 0.057, 1118, 0.69, 0.41); noise(t, 0, 0.09, 0.62, 0.31); }],
  'guard-break': [0.58, (t) => { drum(t, 0, 85, 0.84, 0.49); ring(t, 0.042, 211, 0.49, 0.29); }],
  'shield-break': [0.57, (t) => { chip(t, 149, 0.66); noise(t, 0, 0.26, 1.07, 0.12); chip(t, 244, 0.48); }],
  'posture-break': [0.95, (t) => { drum(t, 0, 65, 1.01, 0.68); ring(t, 0.059, 220, 0.76, 0.56); }],
  interrupt: [0.38, (t) => { chip(t, 164, 0.57); ring(t, 0.05, 630, 0.28, 0.23); }],
  dodge: [0.37, (t) => { swipe(t, 0.28, 0.8, 0.11); noise(t, 0.03, 0.22, 0.52, 0.21); }],
  slip: [0.52, (t) => { swipe(t, 0.42, 0.9, 0.07); ring(t, 0.09, 591, 0.37, 0.30); }],
  glide: [0.46, (t) => { swipe(t, 0.39, 0.9, 0.12); noise(t, 0.06, 0.29, 0.53, 0.26); }],
  'hurt-light': [0.39, (t) => { drum(t, 0, 83, 0.89, 0.36); noise(t, 0, 0.25, 0.64, 0.042); }],
  'hurt-heavy': [0.62, (t) => { drum(t, 0, 61, 1.15, 0.58); noise(t, 0.012, 0.41, 0.81, 0.027); }],
  fall: [1.00, (t) => { swipe(t, 0.51, 0.75, 0.074); bow(t, 0.09, 38, 0.87, 0.29); }],
  'body-land': [0.69, (t) => { drum(t, 0, 78, 0.82, 0.53); noise(t, 0.02, 0.45, 0.76, 0.05); noise(t, 0.055, 0.28, 0.60, 0.13); }],
  riposte: [0.38, (t) => { swipe(t, 0.32, 0.91, 0.09); noise(t, 0.07, 0.21, 0.48, 0.17); }],
  'riposte-thrust': [0.44, (t) => { swipe(t, 0.32, 0.87, 0.14); ring(t, 0.04, 520, 0.28, 0.15); }],
  'stars-ready': [0.47, (t) => { ring(t, 0, 420, 0.41, 0.34); ring(t, 0.08, 677, 0.35, 0.26); }],
  stars: [0.52, (t) => { for (const [i, at] of [0, 0.045, 0.10].entries()) { noise(t, at, 0.24, 0.72, 0.13 + i * 0.06); ring(t, at, 580 + i * 91, 0.28, 0.18); } }],
  'star-hit': [0.34, (t) => { ring(t, 0, 1160, 0.31, 0.46); }],
  'cut-arrow': [0.40, (t) => { ring(t, 0, 1050, 0.34, 0.43); noise(t, 0, 0.135, 0.95, 0.26); }],
  rain: [1.42, (t) => { ring(t, 0.04, 112, 1.31, 0.62); for (const [i, note] of [50, 57, 62, 65].entries()) pluck(t, 0.08 + i * 0.17, note, 0.44, 0.72); noise(t, 0.1, 1.04, 0.66, 0.039); }],
  'spear-a': [0.31, (t) => { noise(t, 0, 0.18, 0.86, 0.12); drum(t, 0.043, 120, 0.47, 0.24); }],
  'spear-b': [0.35, (t) => { noise(t, 0, 0.23, 0.83, 0.17); drum(t, 0.055, 160, 0.44, 0.24); }],
  burst: [1.26, (t) => { drum(t, 0, 52, 0.94, 0.76); ring(t, 0.04, 114, 1.11, 0.44); noise(t, 0.01, 0.81, 1.08, 0.05); }],
  'warn-guard': [0.34, (t) => { chip(t, 286, 0.55); noise(t, 0.05, 0.18, 0.69, 0.136); }],
  'warn-danger': [0.72, (t) => { drum(t, 0, 113, 0.71, 0.45); ring(t, 0.08, 558, 0.53, 0.36); ring(t, 0.17, 775, 0.49, 0.33); }],
  'warn-arrow': [0.35, (t) => { pluck(t, 0, 62, 0.68, 0.32, true); swipe(t, 0.24, 0.83, 0.14); }],
  'strike-blade': [0.38, (t) => { swipe(t, 0.34, 0.96, 0.109); ring(t, 0.04, 190, 0.29, 0.28); }],
  'strike-shield': [0.47, (t) => { drum(t, 0, 126, 0.70, 0.4); swipe(t, 0.22, 0.71, 0.056); }],
  'strike-arrow': [0.37, (t) => { pluck(t, 0, 48, 0.67, 0.34, true); noise(t, 0.008, 0.21, 1.1, 0.19); }],
  'strike-earth': [0.77, (t) => { drum(t, 0, 62, 0.92, 0.55); noise(t, 0.024, 0.60, 0.83, 0.035); }],
  'strike-fire': [0.98, (t) => { drum(t, 0, 70, 0.59, 0.7); noise(t, 0.012, 0.79, 1.0, 0.052); noise(t, 0.1, 0.60, 0.83, 0.19); }],
  death: [0.59, (t) => { drum(t, 0.08, 90, 0.58, 0.43); swipe(t, 0.46, 0.72, 0.11); }],
  'drop-metal': [0.43, (t) => { ring(t, 0.03, 593, 0.34, 0.34); ring(t, 0.085, 743, 0.30, 0.24); }],
  'drop-paper': [0.34, (t) => { swipe(t, 0.22, 0.69, 0.26); noise(t, 0.10, 0.18, 0.52, 0.18); }],
  'drop-bottle': [0.36, (t) => { drum(t, 0.042, 214, 0.69, 0.23); ring(t, 0.052, 386, 0.27, 0.20, [1, 1.61, 2.35]); }],
  'pick-metal': [0.36, (t) => { ring(t, 0, 633, 0.29, 0.47); ring(t, 0.07, 797, 0.24, 0.33); }],
  'pick-paper': [0.47, (t) => { swipe(t, 0.20, 0.91, 0.22); pluck(t, 0.08, 69, 0.55, 0.35); }],
  'pick-bottle': [0.38, (t) => { ring(t, 0, 500, 0.33, 0.43, [1, 1.32, 2.25]); noise(t, 0.03, 0.14, 0.49, 0.18); }],
  'drink-start': [0.24, (t) => { chip(t, 314, 0.43); swipe(t, 0.18, 0.73, 0.13); }],
  drink: [0.49, (t) => { for (const [i, at] of [0, 0.13, 0.29].entries()) drum(t, at, 244 - i * 25, 0.37, 0.16); noise(t, 0.018, 0.39, 0.57, 0.065); }],
  rest: [1.05, (t) => { swipe(t, 0.64, 0.73, 0.14); pluck(t, 0.20, 57, 0.50, 0.65); pluck(t, 0.43, 62, 0.35, 0.6); }],
  revive: [1.21, (t) => { ring(t, 0.03, 138, 1.10, 0.45); flute(t, 0.12, 50, 0.92, 0.31); }],
  party: [0.67, (t) => { drum(t, 0.02, 121, 0.77, 0.41); drum(t, 0.19, 107, 0.57, 0.38); }],
  alert: [0.47, (t) => { chip(t, 151, 0.5); noise(t, 0.03, 0.26, 0.79, 0.08); }],
  rise: [0.53, (t) => { swipe(t, 0.42, 0.86, 0.11); ring(t, 0.10, 244, 0.35, 0.29); }],
  gate: [0.88, (t) => { noise(t, 0, 0.71, 0.86, 0.071); chip(t, 143, 0.56); drum(t, 0.48, 111, 0.63, 0.32); }],
  rage: [1.71, (t) => { drum(t, 0, 66, 0.88, 0.55); ring(t, 0.14, 110, 1.35, 0.53); noise(t, 0.08, 1.25, 1.05, 0.023); }]
};

const initialCue = (name) => name.startsWith('ui-') || name.startsWith('step-') || name === 'gong' || name === 'weapon-ready';

function makeFoley(bank, cues) {
  const clips = [];
  let frames = 0;
  for (const [name, [seconds, draw]] of Object.entries(SHOTS)) {
    if (initialCue(name) !== (bank === 'foley-intro')) continue;
    const length = Math.round((seconds + 0.14) * RATE);
    const clip = new Float32Array(length);
    draw(clip);
    room(clip, false, 0.28);
    // Match the bank's cue levels before runtime priorities and distance attenuation.
    let peak = 0.001;
    for (const value of clip) peak = Math.max(peak, Math.abs(value));
    const fade = Math.round(RATE * 0.02);
    for (let i = 0; i < length; i++) {
      const edge = Math.min(1, i / 45, (length - 1 - i) / fade);
      clip[i] *= edge / peak;
    }
    cues[name] = [bank, frames, length];
    clips.push(clip);
    frames += length;
  }
  const samples = new Float32Array(frames);
  let offset = 0;
  for (const clip of clips) {
    samples.set(clip, offset);
    offset += clip.length;
  }
  return samples;
}

await mkdir(output, { recursive: true });
const assets = await Promise.all([
  ...Object.entries(score).map(async ([name, part]) => {
    const data = makeScore(name, part);
    await writeFile(new URL(name + '.wav', output), data);
    return [name + '.wav', data.length];
  }),
  ...['wind', 'embers', 'temple'].map(async (name) => {
    const data = ambience(name);
    await writeFile(new URL(name + '.wav', output), data);
    return [name + '.wav', data.length];
  })
]);
const cues = {};
for (const bank of ['foley-intro', 'foley']) {
  const file = bank + '.wav';
  const audio = wav(makeFoley(bank, cues), 0.84);
  await writeFile(new URL(file, output), audio);
  assets.push([file, audio.length]);
}
await writeFile(new URL('cues.json', output), JSON.stringify({ sampleRate: RATE, cues }, null, 2) + '\n');
console.log('Rebuilt', assets.length, 'original audio files,', Object.keys(cues).length, 'effects at', fileURLToPath(output));
for (const [name, bytes] of assets) console.log(name.padEnd(13), String(bytes).padStart(8), 'bytes');
