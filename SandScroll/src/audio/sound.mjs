// 原创配乐与音效用单声道合成，经白鹭混音器播放。浏览器在首次操作后开启声音。
import { encodeWav } from '@egret/engine/kit';
import { createBrowserAudio } from '@egret/engine/web/audio';
import { createRandom } from '../sim/sand.mjs';

export const RATE = 32000;

/** A decaying tone with a few partials, `seconds` long, as one channel of samples. */
export function tone(frequency, seconds, { decay = 18, partials = [[1, 1]], gain = 0.4 } = {}) {
  const out = new Float32Array(Math.round(seconds * RATE));
  for (let n = 0; n < out.length; n++) {
    const t = n / RATE,
      envelope = Math.min(1, t * 400, (seconds - t) * 100) * Math.exp(-t * decay);
    let value = 0;
    for (const [ratio, amount] of partials) value += Math.sin(2 * Math.PI * frequency * ratio * t) * amount;
    out[n] = value * envelope * gain;
  }
  return out;
}

/** Noise shaped by `envelope(t)`, smoothed by `smooth` (0 bright … 0.95 dull), with sparse clicks for grains. */
export function noise(seconds, envelope, { smooth = 0.6, gain = 0.4, grains = 0, seed = 5 } = {}) {
  const out = new Float32Array(Math.round(seconds * RATE)),
    rng = createRandom(seed);
  let low = 0;
  for (let n = 0; n < out.length; n++) {
    const t = n / RATE;
    low = low * smooth + (rng() * 2 - 1) * (1 - smooth);
    let v = low;
    if (grains && rng() < grains) v += (rng() * 2 - 1) * 0.9;
    out[n] = v * envelope(t, seconds) * Math.min(1, t * 900, (seconds - t) * 110) * gain;
  }
  return out;
}

/** A plucked string (Karplus-Strong): a burst of noise through a delay line that loses a little each pass. */
export function pluck(frequency, seconds, { gain = 0.5, damping = 0.996, bright = 0.5, seed = 3 } = {}) {
  const out = new Float32Array(Math.round(seconds * RATE)),
    period = Math.max(2, Math.round(RATE / frequency)),
    line = new Float32Array(period),
    rng = createRandom(seed);
  for (let k = 0; k < period; k++) line[k] = rng() * 2 - 1;
  let at = 0,
    last = 0;
  for (let n = 0; n < out.length; n++) {
    const next = at + 1 === period ? 0 : at + 1;
    const value = damping * (bright * line[at] + (1 - bright) * (line[at] + line[next]) * 0.5);
    line[at] = value;
    at = next;
    // A gentle body: a little of the last sample, so it rings like a box and not a wire.
    last = last * 0.3 + value * 0.7;
    out[n] = last * gain * Math.min(1, n / 40, (out.length - n) / 1500);
  }
  return out;
}

function mix(length, parts) {
  const out = new Float32Array(Math.round(length * RATE));
  for (const [samples, at = 0, gain = 1] of parts) {
    const start = Math.round(at * RATE);
    for (let k = 0; k < samples.length && start + k < out.length; k++) out[start + k] += samples[k] * gain;
  }
  return out;
}

const D4 = 293.665;
const pitch = (semitones) => D4 * 2 ** (semitones / 12);
const breath = (t, length) => Math.sin(Math.PI * (t / length)) ** 2;
const grain = (speed) => (t) => Math.exp(-t * speed);

/** Soft breath and a little octave colour above a bamboo flute's fundamental. */
function bamboo(frequency, seconds, gain) {
  const out = new Float32Array(Math.round(seconds * RATE));
  for (let n = 0; n < out.length; n++) {
    const t = n / RATE;
    const phase = 2 * Math.PI * frequency * t + Math.sin(31 * t) * 0.19 * Math.min(1, t / 0.3);
    const envelope = Math.min(1, t / 0.11, (seconds - t) / 0.27) * (0.92 + 0.08 * Math.sin(19 * t));
    const air = 0.05 * Math.sin(phase * 4.02) + 0.03 * Math.sin(phase * 6.09);
    out[n] = (Math.sin(phase) + 0.2 * Math.sin(phase * 2) + air) * envelope * gain;
  }
  return out;
}

// Eight bars in D minor pentatonic. Each entry gives a beat, semitones from D4, and an optional accent.
const themes = {
  classic: {
    bpm: 78,
    strings: [
      [0, 0], [1.5, 7, 0.7], [2.5, 10], [3.5, 12, 0.8], [5, 7], [6.5, 5, 0.65],
      [8, 3], [9, 5, 0.75], [10.5, 7], [12, 0], [14, -2, 0.7],
      [16, 0], [17.5, 7, 0.75], [18.5, 12], [20, 15, 0.85], [21.5, 12],
      [23, 7], [24, 10], [25.5, 7, 0.75], [27, 5], [28, 3], [30, 0, 0.8]
    ],
    bamboo: [[5.55, 12, 1.6], [7.2, 10, 0.8], [11.3, 7, 1.3], [21.9, 15, 0.9], [23.1, 12, 1.3], [27.5, 7, 1.6]],
    bass: [[0, -12], [4, -5], [8, -9], [12, -12], [16, -12], [20, -2], [24, -5], [28, -12]]
  },
  endless: {
    bpm: 88,
    strings: [
      [0, 0], [0.75, 7, 0.7], [1.5, 10], [2.5, 12, 0.8], [3, 10, 0.6], [4, 7],
      [6, 5], [7, 3, 0.75], [8, 0], [9.5, 5, 0.7], [10.5, 7], [11.5, 10, 0.64], [13, 7], [15, 3, 0.7],
      [16, 0], [16.75, 7, 0.7], [17.5, 10], [18.5, 12, 0.9], [19.5, 15], [21, 12], [23, 10, 0.62],
      [24, 7], [25.5, 5, 0.75], [27, 7], [28, 3], [29.5, 0]
    ],
    bamboo: [[4.5, 12, 1.1], [6.25, 10, 1.1], [12.2, 15, 0.9], [13.45, 12, 1.2], [20.25, 17, 1.2], [22, 12, 1.25], [28.6, 7, 1.45]],
    bass: [[0, -12], [2.5, -5], [4, -12], [8, -9], [12, -5], [16, -12], [18.5, -5], [20, -2], [24, -5], [28, -12]]
  },
  unpaint: {
    bpm: 72,
    strings: [
      [0, 7], [2.5, 10, 0.85], [4, 7], [6, 5, 0.75], [8, 3], [10.5, 5, 0.8], [12, 0], [14.5, -2, 0.6],
      [16, 7], [18.5, 10, 0.85], [20, 12], [22, 7, 0.75], [24, 5], [25.5, 3, 0.7], [28, 0], [30, -5, 0.7]
    ],
    bamboo: [[1.1, 12, 1.9], [5.25, 10, 1.5], [9.2, 7, 1.85], [17.2, 12, 1.6], [21, 15, 1], [23.25, 12, 1.35], [27, 7, 1.8]],
    bass: [[0, -12], [4, -5], [8, -9], [12, -12], [16, -12], [20, -2], [24, -5], [28, -12]]
  }
};

/** Wrap the sounds' decay and echo into the next pass so the loop has no abrupt cut. */
function* composeMusic(mode) {
  const theme = Object.hasOwn(themes, mode) ? themes[mode] : themes.classic;
  const beat = 60 / theme.bpm;
  const out = new Float32Array(Math.round(32 * beat * RATE));
  const stringTones = new Map();
  function add(samples, at, level) {
    const start = Math.round(at * beat * RATE) % out.length;
    const beforeWrap = Math.min(samples.length, out.length - start);
    for (let i = 0; i < beforeWrap; i++) out[start + i] += samples[i] * level;
    for (let i = beforeWrap; i < samples.length; i++) out[i - beforeWrap] += samples[i] * level;
  }
  for (const [at, step, accent = 1] of theme.strings) {
    if (!stringTones.has(step)) {
      stringTones.set(step, pluck(pitch(step), 1.95, { gain: 0.32, damping: 0.996, bright: 0.41, seed: 201 + step }));
    }
    const string = stringTones.get(step);
    add(string, at, accent);
    add(string, at + 0.75, accent * 0.17);
    yield;
  }
  for (const [at, step, length] of theme.bamboo) {
    const wind = bamboo(pitch(step), length * beat, mode === 'unpaint' ? 0.094 : 0.076);
    add(wind, at, 1);
    add(wind, at + 0.55, 0.12);
    yield;
  }
  for (const [index, [at, step]] of theme.bass.entries()) {
    const body = pluck(pitch(step), 1.85, { gain: 0.18, damping: 0.995, bright: 0.29, seed: 116 + index });
    add(body, at, 1);
    yield;
  }
  return out;
}

export function music(mode = 'classic') {
  const score = composeMusic(mode);
  let part = score.next();
  while (!part.done) part = score.next();
  return part.value;
}

async function renderMusic(mode) {
  const yieldTurn = () => new Promise((resolve) => setTimeout(resolve, 0));
  await yieldTurn();
  const score = composeMusic(mode);
  let started = performance.now();
  let part = score.next();
  while (!part.done) {
    if (performance.now() - started >= 6) {
      await yieldTurn();
      started = performance.now();
    }
    part = score.next();
  }
  return part.value;
}

const ceramic = [[1, 1], [2.22, 0.33], [3.04, 0.14]];
const wood = [[1, 1], [1.71, 0.26], [2.96, 0.15]];
const chime = (step, length, gain, seed) => pluck(pitch(step), length, { gain, seed, damping: 0.992, bright: 0.68 });

/** Each cue marks a specific material or game event, with space left for busy chains. */
export const SOUNDS = {
  tap: () => tone(610, 0.08, { decay: 62, partials: wood, gain: 0.26 }),
  pick: () => mix(0.13, [
    [noise(0.07, grain(45), { smooth: 0.39, gain: 0.21, seed: 5 })],
    [tone(840, 0.12, { decay: 39, partials: wood, gain: 0.22 }), 0.01]
  ]),
  turn: () => mix(0.12, [
    [tone(940, 0.05, { decay: 78, partials: wood, gain: 0.19 })],
    [tone(1170, 0.08, { decay: 50, partials: wood, gain: 0.22 }), 0.032]
  ]),
  drop: () => noise(0.27, breath, { smooth: 0.62, gain: 0.49, grains: 0.008, seed: 9 }),
  land: () => mix(0.37, [
    [tone(138, 0.12, { decay: 30, partials: wood, gain: 0.18 })],
    [noise(0.37, grain(9), { smooth: 0.54, gain: 0.35, grains: 0.019, seed: 11 })]
  ]),
  shine: () => mix(0.78, [
    [chime(12, 0.78, 0.37, 21)],
    [tone(pitch(24), 0.49, { decay: 9, partials: ceramic, gain: 0.085 }), 0.014]
  ]),
  clear: () => mix(0.88, [
    [noise(0.52, breath, { smooth: 0.66, gain: 0.36, grains: 0.016, seed: 13 })],
    [chime(7, 0.58, 0.29, 29), 0.04],
    [chime(12, 0.68, 0.33, 27), 0.17]
  ]),
  collect: () => mix(0.31, [
    [noise(0.28, breath, { smooth: 0.45, gain: 0.32, grains: 0.028, seed: 14 })],
    [tone(690, 0.17, { decay: 24, partials: ceramic, gain: 0.19 }), 0.101]
  ]),
  merge: () => mix(0.54, [
    [tone(410, 0.19, { decay: 25, partials: ceramic, gain: 0.3 })],
    [tone(610, 0.36, { decay: 16, partials: ceramic, gain: 0.25 }), 0.065],
    [chime(19, 0.43, 0.18, 33), 0.11]
  ]),
  bucket: () => mix(0.53, [
    [tone(296, 0.42, { decay: 14, partials: ceramic, gain: 0.31 })],
    [tone(444, 0.43, { decay: 12, partials: ceramic, gain: 0.22 }), 0.096]
  ]),
  boom: () => mix(0.68, [
    [noise(0.09, grain(34), { smooth: 0.21, gain: 0.48, seed: 51 })],
    [tone(117, 0.38, { decay: 11, partials: wood, gain: 0.31 }), 0.018],
    [noise(0.075, grain(40), { smooth: 0.17, gain: 0.53, seed: 52 }), 0.051],
    [noise(0.58, grain(6), { smooth: 0.52, gain: 0.27, grains: 0.035, seed: 53 }), 0.087]
  ]),
  warn: () => mix(0.37, [
    [tone(224, 0.23, { decay: 13, partials: wood, gain: 0.34 })],
    [tone(181, 0.25, { decay: 13, partials: wood, gain: 0.21 }), 0.113]
  ]),
  won: () => mix(1.86, [[0, 0], [7, 0.14], [10, 0.27], [12, 0.43], [19, 0.57]]
    .map(([step, at], k) => [chime(step, 1.26, 0.33, 30 + k), at])),
  lost: () => mix(1.22, [
    [chime(5, 0.77, 0.33, 41)],
    [chime(0, 0.96, 0.32, 42), 0.25]
  ])
};

const repeatDelay = { land: 48, drop: 48, collect: 65, warn: 380 };
const simultaneous = { shine: 3, merge: 2, land: 2, collect: 2 };

/** Gameplay cues drop while silent. Only the chosen music loop may wait for browser unlock. */
export async function createSound(scope, { on = true } = {}) {
  const { mixer } = scope.use(createBrowserAudio({
    buses: [
      { name: 'effects', volume: 0.79 },
      { name: 'music', volume: 0.47 }
    ],
    limiter: true,
    maxVoices: 12
  }));
  const effects = mixer.bus('effects');
  const melody = mixer.bus('music');
  const sounds = new Map();
  const tunes = new Map();
  const lastCue = new Map();
  let paused = false;
  let wanted = null;
  let activeMode = null;
  let revision = 0;

  function stopEffects() {
    lastCue.clear();
    mixer.stopAll({ bus: 'effects' });
  }
  function soundFor(mode) {
    if (!tunes.has(mode)) {
      const pending = renderMusic(mode)
        .then((samples) => mixer.decode(encodeWav([samples], RATE)))
        .catch(() => {
          tunes.delete(mode);
          return null;
        });
      tunes.set(mode, pending);
    }
    return tunes.get(mode);
  }
  async function syncMusic() {
    if (!on || paused || !wanted || mixer.state === 'closed') return;
    if (activeMode === wanted && mixer.music) {
      mixer.music.resume();
      return;
    }
    const mode = wanted;
    const request = revision;
    const tune = await soundFor(mode);
    if (!tune || request !== revision || !on || paused || mixer.state === 'closed') return;
    const voice = mixer.playMusic(tune, { bus: 'music', loop: true, fade: 0.22 });
    if (voice.state !== 'ended') activeMode = mode;
  }
  function updateMute() {
    const silent = !on || paused;
    effects.setMuted(silent);
    melody.setMuted(silent);
    if (silent) {
      stopEffects();
      mixer.music?.pause();
    } else {
      void syncMusic();
    }
  }
  mixer.subscribe((state) => {
    if (state === 'locked' || state === 'suspended') stopEffects();
  });
  updateMute();
  // The mixer owns decoded sounds and releases them when the scoped audio is disposed.
  await Promise.all(Object.entries(SOUNDS).map(async ([name, make]) => {
    try {
      sounds.set(name, await mixer.decode(encodeWav([make()], RATE)));
    } catch (error) {
      if (mixer.state !== 'closed') console.warn('SandScroll audio decode', name, error);
    }
  }));
  return {
    play(name, { volume = 1, rate = 1 } = {}) {
      if (!on || paused || mixer.state !== 'running' || !sounds.has(name)) return;
      const now = performance.now();
      const delay = repeatDelay[name] ?? 0;
      if (delay && now - (lastCue.get(name) ?? -Infinity) < delay) return;
      mixer.play(sounds.get(name), { bus: 'effects', volume, rate, maxInstances: simultaneous[name] ?? 1, whileSilent: 'drop' });
      if (delay) lastCue.set(name, now);
    },
    music(mode = 'classic') {
      const next = Object.hasOwn(themes, mode) ? mode : 'classic';
      if (wanted !== next) revision++;
      wanted = next;
      return syncMusic();
    },
    stopMusic() {
      wanted = null;
      activeMode = null;
      revision++;
      mixer.stopAll({ bus: 'music' });
    },
    setOn(value) {
      on = Boolean(value);
      updateMute();
    },
    setPaused(value) {
      paused = Boolean(value);
      updateMute();
    }
  };
}
