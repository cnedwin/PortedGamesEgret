// 自制器乐与拟音：五声音阶的琴、箫与木质节奏，工地水声及材料各自的质感。
// Original workshop score and foley, entirely synthesized. No external audio samples or downloads.
// The engine mixer owns playback, independent volumes, mute, lifecycle and the first-gesture audio lock.
import { createAudioMixer } from '@egret/engine/audio';
import { encodeWav } from '@egret/engine/kit';
import { createWebAudioBackend } from '@egret/engine/web/audio';

export const RATE = 32000;
const TAU = Math.PI * 2;
const size = (seconds) => Math.round(seconds * RATE);
const turn = () => new Promise((resolve) => setTimeout(resolve, 0));

function noise(seed = 7) {
  let s = seed;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2147483648 - 1);
}
/** Damped resonant modes, using a recurrence rather than a trigonometric call for each sample. */
function modal(freq, seconds, modes, { gain = 1, attack = 0.003, seed = 11 } = {}) {
  const result = new Float32Array(size(seconds)), random = noise(seed);
  for (const [ratio, amplitude, damp] of modes) {
    const w = TAU * freq * ratio / RATE;
    if (w >= Math.PI * 0.87) continue;
    const c = Math.cos(w), s = Math.sin(w), phase = random() * 0.7;
    const fade = Math.exp(-damp / RATE);
    let re = Math.cos(phase) * amplitude * gain, im = Math.sin(phase) * amplitude * gain;
    for (let i = 0; i < result.length; i++) {
      result[i] += im;
      const next = re * c - im * s;
      im = (im * c + re * s) * fade;
      re = next * fade;
    }
  }
  for (let i = 0; i < result.length; i++)
    result[i] *= Math.min(1, i / Math.max(1, attack * RATE), (result.length - 1 - i) / (RATE * 0.035));
  return result;
}
function texture(seconds, { gain = 0.4, low = 0.15, high = 0.55, seed = 43, shape = (t) => Math.exp(-t * 10) } = {}) {
  const out = new Float32Array(size(seconds)), random = noise(seed);
  let a = 0, b = 0;
  for (let i = 0; i < out.length; i++) {
    const v = random();
    a += (v - a) * low;
    b += (v - b) * high;
    out[i] = (b - a * 0.76) * gain * shape(i / RATE);
  }
  return out;
}
function mix(...parts) {
  const out = new Float32Array(Math.max(...parts.map((p) => p.length)));
  for (const p of parts) for (let i = 0; i < p.length; i++) out[i] += p[i];
  return out;
}
function delay(part, seconds) {
  const at = size(seconds), out = new Float32Array(part.length + at);
  out.set(part, at);
  return out;
}
function clean(part, peak = 0.71) {
  let highest = 0;
  for (let i = 0; i < part.length; i++) {
    part[i] *= Math.min(1, i / 18, (part.length - 1 - i) / 96);
    highest = Math.max(highest, Math.abs(part[i]));
  }
  if (highest > peak) for (let i = 0; i < part.length; i++) part[i] *= peak / highest;
  return part;
}

/** Resonant string: lower modes linger, overtones decay, and a brief fingertip noise marks the pluck. */
export function pluck(freq, seconds, { bright = 0.5, gain = 0.4, seed = 3 } = {}) {
  const modes = Array.from({ length: 8 }, (_, i) => {
    const h = i + 1;
    return [
      h * Math.sqrt(1 + 0.000025 * h * h),
      (0.76 + bright * 0.28) / h ** (1.12 - bright * 0.2),
      1.45 + h * h * (0.1 + (1 - bright) * 0.13)
    ];
  });
  const string = modal(freq, seconds, modes, { gain, attack: 0.0035, seed });
  return mix(string, texture(0.09, { gain: gain * 0.12, low: 0.025, high: 0.49, seed: seed + 131, shape: (t) => Math.exp(-t * 58) }));
}

// D pentatonic: gong, shang, jue, zhi, yu, starting in the lower register.
const SCALE = [146.8324, 164.8138, 184.9972, 220, 246.9417];
const note = (step) => SCALE[((step % 5) + 5) % 5] * 2 ** Math.floor(step / 5);
function flute(freq, seconds, gain, seed) {
  const out = new Float32Array(size(seconds)), random = noise(seed);
  let low = 0, high = 0, phase = 0, vibrato = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const envelope = Math.min(1, t / 0.14, (seconds - t) / 0.27) * (0.92 + 0.08 * Math.sin(t * 2.4));
    vibrato += TAU * 4.65 / RATE;
    phase += TAU * freq * (1 - 0.012 * Math.exp(-t * 16) + 0.0038 * Math.sin(vibrato) * Math.min(1, t * 1.2)) / RATE;
    const v = random();
    low += (v - low) * 0.035;
    high += (v - high) * 0.17;
    out[i] = (Math.sin(phase) * 0.67 + Math.sin(phase * 2 + 0.45) * 0.19 + Math.sin(phase * 3 + 0.2) * 0.075 + (high - low) * 0.21) * envelope * gain;
  }
  return out;
}
const wood = (freq, gain, seed, time = 0.23) => mix(
  modal(freq, time, [[1, 1, 29], [2.39, 0.48, 45], [4.18, 0.14, 70], [6.2, 0.09, 90]], { gain, seed, attack: 0.0011 }),
  texture(0.07, { gain: gain * 0.48, low: 0.025, high: 0.52, seed: seed + 9, shape: (t) => Math.exp(-t * 67) })
);
const mineral = (freq, gain, seed) => mix(
  modal(freq, 0.32, [[1, 0.7, 20], [2.77, 0.5, 47], [4.11, 0.14, 74]], { gain, seed, attack: 0.001 }),
  texture(0.17, { gain: gain * 0.70, low: 0.05, high: 0.71, seed: seed + 91, shape: (t) => Math.exp(-t * 27) })
);
const metal = (freq, gain, seed, time = 0.44) => mix(
  modal(freq, time, [[1, 0.54, 15], [1.5, 0.33, 24], [2.74, 0.48, 12], [4.52, 0.19, 33], [6.18, 0.06, 46]], { gain, seed, attack: 0.001 }),
  texture(0.08, { gain: gain * 0.48, low: 0.1, high: 0.9, seed, shape: (t) => Math.exp(-t * 50) })
);
const rope = (freq, gain, seed) => mix(
  pluck(freq, 0.38, { bright: 0.3, gain: gain * 0.66, seed }),
  texture(0.30, { gain, low: 0.02, high: 0.20, seed: seed + 8, shape: (t) => Math.min(1, t * 36) * Math.exp(-t * 13) * (0.6 + 0.4 * Math.sin(t * 88) ** 2) })
);
function slide(seconds, seed, gain) {
  return texture(seconds, { seed, low: 0.035, high: 0.38, gain,
    shape: (t) => Math.sin(Math.PI * t / seconds) * (0.68 + 0.32 * Math.sin(t * 74 + seed) ** 2) });
}
function splinter(seed, bright) {
  return mix(
    wood(bright ? 330 : 153, 0.58, seed, 0.28),
    delay(texture(0.18, { seed: seed + 6, high: 0.83, low: 0.08, gain: 0.48, shape: (t) => Math.exp(-t * 26) }), 0.025),
    delay(wood(bright ? 240 : 124, 0.25, seed + 10, 0.24), 0.075)
  );
}

// Material-specific cues retain the original generic names as fallbacks.
const foley = {
  tap: () => wood(520, 0.18, 13, 0.12),
  knock: () => wood(182, 0.49, 28),
  'knock-bamboo': () => wood(362, 0.38, 55),
  'knock-stone': () => mineral(242, 0.43, 51),
  'knock-rope': () => rope(160, 0.38, 77),
  'knock-chain': () => mix(metal(450, 0.34, 61), delay(metal(232, 0.16, 57), 0.08)),
  'knock-pontoon': () => mix(wood(136, 0.39, 90), delay(slide(0.42, 45, 0.42), 0.06)),
  pull: () => mix(slide(0.15, 9, 0.46), delay(wood(240, 0.17, 49, 0.12), 0.08)),
  'pull-rope': () => rope(113, 0.40, 72),
  'pull-stone': () => mix(slide(0.24, 21, 0.54), delay(mineral(200, 0.22, 39), 0.13)),
  'pull-chain': () => mix(delay(metal(270, 0.22, 4, 0.20), 0.05), metal(370, 0.20, 3, 0.28), delay(metal(180, 0.18, 6, 0.26), 0.12)),
  deny: () => mix(wood(142, 0.27, 31, 0.12), delay(wood(105, 0.22, 50, 0.14), 0.085)),
  creak: () => mix(slide(0.58, 36, 0.25), rope(92, 0.18, 23), delay(rope(112, 0.17, 72), 0.14)),
  thrum: () => mix(rope(76, 0.38, 9), delay(pluck(132, 0.48, { bright: 0.2, gain: 0.12, seed: 15 }), 0.09)),
  crack: () => splinter(18, false),
  'crack-bamboo': () => splinter(34, true),
  'crack-stone': () => mix(mineral(140, 0.49, 14),
    delay(texture(0.38, { gain: 0.50, low: 0.05, high: 0.78, seed: 67, shape: (t) => Math.exp(-t * 16) * (0.58 + 0.42 * Math.sin(t * 129) ** 2) }), 0.04),
    delay(mineral(280, 0.17, 8), 0.12)),
  'crack-rope': () => mix(rope(93, 0.52, 51), texture(0.14, { gain: 0.37, seed: 89, high: 0.7, shape: (t) => Math.exp(-t * 48) })),
  'crack-chain': () => mix(metal(245, 0.46, 102, 0.6), delay(metal(450, 0.25, 83, 0.38), 0.07), delay(metal(320, 0.16, 26, 0.24), 0.15)),
  splash: () => mix(
    texture(0.75, { gain: 0.68, low: 0.012, high: 0.28, seed: 24, shape: (t) => Math.min(1, t * 77) * Math.exp(-t * 4.4) }),
    texture(0.22, { gain: 0.42, low: 0.12, high: 0.9, seed: 94, shape: (t) => Math.min(1, t * 90) * Math.exp(-t * 17) }),
    delay(rope(150, 0.26, 0.11, 79), 0.13), delay(rope(220, 0.19, 0.065, 45), 0.26)
  ),
  roll: () => mix(slide(0.95, 14, 0.21), ...[0, 0.17, 0.35, 0.53, 0.73].map((at, i) => delay(wood(93 + i * 7, 0.17, 16 + i, 0.17), at))),
  won: () => mix(...[5, 7, 8, 10, 12].map((step, i) => delay(pluck(note(step), 1.45, { bright: 0.60, gain: 0.23, seed: i + 21 }), [0, 0.16, 0.37, 0.59, 0.94][i])),
    delay(modal(note(5), 0.90, [[1, 0.65, 4], [2.03, 0.25, 7], [3.49, 0.08, 12]], { gain: 0.13, seed: 61 }), 0.63)),
  lost: () => mix(pluck(note(4), 1.2, { bright: 0.25, gain: 0.20, seed: 21 }),
    delay(pluck(note(2), 1.2, { bright: 0.2, gain: 0.19, seed: 12 }), 0.31),
    delay(pluck(note(0), 1.55, { bright: 0.18, gain: 0.24, seed: 45 }), 0.65)),
  seal: () => mix(wood(170, 0.36, 34, 0.16), delay(modal(note(9), 0.49, [[1, 0.7, 10], [2.53, 0.31, 16]], { gain: 0.15, seed: 48 }), 0.04))
};
export const EFFECTS = Object.fromEntries(Object.entries(foley).map(([name, make]) => [name, () => clean(make())]));
const materialKind = { wood: 'wood', plank: 'wood', bamboo: 'bamboo', stone: 'stone', slab: 'stone', rope: 'rope', chain: 'chain', pontoon: 'pontoon' };
function effectName(name, material) {
  const candidate = name + '-' + materialKind[material];
  return Object.hasOwn(EFFECTS, candidate) ? candidate : name;
}

const BAR = 3;
const SCORE_SECONDS = 48;
// A recurring theme over sixteen bars, changing its register and cadence rather than looping one scale.
const MELODY = [
  [[0, 5], [0.75, 7], [1.5, 8], [2.25, 7]],
  [[0, 4], [1.25, 5], [2.25, 2]],
  [[0, 5], [0.5, 7], [1.5, 10], [2.5, 9]],
  [[0, 8], [1.4, 7], [2.15, 5]],
  [[0.15, 3], [1.45, 5], [2.2, 7]],
  [[0, 8], [1, 7], [2.3, 5]],
  [[0.4, 4], [1.2, 7], [2.25, 6]],
  [[0, 5], [1.65, 3], [2.35, 2]],
  [[0, 5], [0.7, 8], [1.4, 10], [2.3, 8]],
  [[0, 7], [0.85, 9], [1.65, 12], [2.5, 10]],
  [[0, 8], [0.55, 7], [1.6, 5], [2.35, 7]],
  [[0, 4], [1.1, 5], [2.2, 2]],
  [[0, 5], [0.75, 7], [1.6, 8], [2.35, 10]],
  [[0, 9], [1.1, 7], [2.2, 5]],
  [[0.15, 4], [1.45, 2], [2.25, 0]],
  [[0, 5], [1.15, 0]]
];
function* scoreEvents() {
  for (const [bar, phrase] of MELODY.entries()) {
    const start = bar * BAR;
    for (const [beat, step] of phrase) {
      yield [pluck(note(step), 1.8 + (beat < 0.02 ? 0.35 : 0), { gain: beat < 0.02 ? 0.105 : 0.076, bright: 0.43, seed: 31 + bar * 11 + Math.round(beat * 12) }), start + beat, -0.26];
    }
    const bass = [0, -2, -1, 0, -2, 0, -1, 0, 0, 2, -2, 0, -1, -2, 0, 0][bar];
    yield [pluck(note(bass), 2.75, { gain: 0.13, bright: 0.18, seed: 106 + bar }), start + 0.03, -0.42];
    if (bar % 4 === 1 || bar % 4 === 3) yield [pluck(note(bass + 3), 2.1, { bright: 0.23, gain: 0.055, seed: 115 + bar }), start + 1.7, 0.25];
    if (bar % 4 === 2) yield [wood(84, 0.027, 85 + bar, 0.18), start + 0.04, 0.14];
  }
  const winds = [
    [4, 0.35, 10, 2.4], [5, 0.1, 8, 1.5], [5, 1.7, 7, 1.07], [6, 0.3, 8, 2.2], [7, 0.46, 5, 1.85],
    [8, 0.42, 8, 1.7], [8, 2.1, 10, 0.85], [9, 0.08, 12, 2.4], [10, 0.1, 10, 1.35], [10, 1.55, 8, 1.27], [11, 0.5, 5, 2.2],
    [12, 0.5, 10, 2.1], [13, 0.21, 8, 2.4], [14, 0.19, 7, 1.5], [15, 0.24, 5, 2.1]
  ];
  for (const [bar, at, step, len] of winds) yield [flute(note(step), len, 0.064, 80 + bar * 11 + Math.round(at * 7)), bar * BAR + at, 0.34];
  yield [modal(note(0), 2.4, [[1, 0.56, 1.7], [2.04, 0.30, 3.8], [3.76, 0.1, 7]], { gain: 0.042, seed: 29 }), 0, 0.12];
}
function emptyScore() {
  return [new Float32Array(size(SCORE_SECONDS)), new Float32Array(size(SCORE_SECONDS))];
}
function addScore(channels, [part, at, pan]) {
  const length = channels[0].length, origin = size(at);
  const l = Math.sqrt((1 - pan) * 0.5), r = Math.sqrt((1 + pan) * 0.5);
  for (let i = 0; i < part.length; i++) {
    const v = part[i], idx = (i + origin) % length;
    channels[0][idx] += v * l;
    channels[1][idx] += v * r;
    // Cross-channel early reflections; circular indexing carries tails through the loop boundary.
    channels[0][(idx + 4480) % length] += v * r * 0.09;
    channels[1][(idx + 5600) % length] += v * l * 0.09;
    channels[0][(idx + 8320) % length] += v * l * 0.035;
    channels[1][(idx + 7360) % length] += v * r * 0.035;
  }
}
/** Synchronous mono score for deterministic analysis; the game uses the cooperative stereo renderer. */
export function music() {
  const channels = emptyScore();
  for (const event of scoreEvents()) addScore(channels, event);
  return channels[0].map((v, i) => (v + channels[1][i]) * 0.5);
}
export async function stereoMusic(pause = turn, alive = () => true) {
  const channels = emptyScore();
  let count = 0;
  for (const event of scoreEvents()) {
    if (!alive()) return null;
    addScore(channels, event);
    if (++count % 2 === 0) await pause();
  }
  return alive() ? channels : null;
}
/** Quiet riverbank ambience; the sample at the seam is crossfaded into the beginning. */
export function ambience() {
  const seconds = 12, fade = size(0.22), out = new Float32Array(size(seconds) + fade);
  const random = noise(224);
  let low = 0, mid = 0, high = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE, v = random();
    low += (v - low) * 0.0025;
    mid += (v - mid) * 0.045;
    high += (v - high) * 0.17;
    const current = 0.73 + 0.18 * Math.sin(TAU * t / 4) + 0.08 * Math.sin(TAU * t / 1.5);
    out[i] = current * ((mid - low) * 0.28 + (high - mid) * 0.036 + low * 0.20);
  }
  for (let i = 0; i < fade; i++) {
    const blend = i / fade;
    out[i] = out[size(seconds) + i] * (1 - blend) + out[i] * blend;
  }
  return out.slice(0, size(seconds));
}

const SILENT = { play() {}, music() {}, scene() {}, setSound() {}, setMusic() {}, setHidden() {} };
/**
 * A single engine mixer. Effects never queue behind the score or replay after a mute.
 * Optional backend and timing factories let a non-Web-Audio host exercise the same mixer.
 */
export function createSound(scope, { sound = true, music: musicOn = true, backendFactory = createWebAudioBackend, yieldTurn = turn } = {}) {
  let mixer;
  try {
    const backend = backendFactory({ limiter: true });
    mixer = scope.use(createAudioMixer({ backend, locked: backend.locked, buses: [
      { name: 'effects', volume: 0.83 }, { name: 'music', volume: 0.70 }, { name: 'ambience', volume: 0.50 }
    ] }));
    backend.attach(mixer);
  } catch (cause) {
    console.warn('sound', cause);
    return SILENT;
  }
  const decoded = new Map(), state = { sound, music: musicOn, hidden: false, site: false };
  const open = () => mixer.state !== 'closed';
  const apply = () => {
    if (!open()) return;
    mixer.bus('effects').setMuted(!state.sound || state.hidden);
    mixer.bus('ambience').setMuted(!state.sound || state.hidden);
    mixer.bus('music').setMuted(!state.music || state.hidden);
  };
  apply();
  let effectsReady = Promise.resolve();
  // Prioritize tap and construction cues. The longer score is prepared independently, in small turns.
  for (const [name, make] of Object.entries(EFFECTS)) effectsReady = effectsReady
    .then(yieldTurn)
    .then(() => open() ? mixer.decode(encodeWav([make()], RATE)) : null)
    .then((buffer) => { if (buffer && open()) decoded.set(name, buffer); })
    .catch((cause) => console.warn('sound', name, cause));
  let albumTask, riverTask, riverVoice, musicWanted = false, musicRevision = 0, riverRevision = 0;
  const getAlbum = () => albumTask ??= stereoMusic(yieldTurn, open).then(async (channels) => {
    if (!channels || !open()) return null;
    return mixer.decode(encodeWav(channels, RATE));
  }).catch((cause) => { albumTask = undefined; console.warn('music', cause); return null; });
  const getRiver = () => riverTask ??= yieldTurn().then(async () => {
    if (!open()) return null;
    return mixer.decode(encodeWav([ambience()], RATE));
  }).catch((cause) => { riverTask = undefined; console.warn('ambience', cause); return null; });
  function refreshRiver() {
    if (!open()) return;
    const revision = ++riverRevision;
    if (!(state.site && state.sound && !state.hidden)) {
      riverVoice?.stop({ fade: 0.35 });
      riverVoice = undefined;
      return;
    }
    if (riverVoice && riverVoice.state !== 'ended') return;
    getRiver().then((buffer) => {
      if (buffer && open() && revision === riverRevision && state.site && state.sound && !state.hidden)
        riverVoice = mixer.play(buffer, { bus: 'ambience', loop: true, fadeIn: 0.7, whileSilent: 'start', maxInstances: 1 });
    });
  }
  function requestMusic(on) {
    if (!open()) return;
    on = Boolean(on && state.music);
    if (musicWanted === on) return;
    musicWanted = on;
    const revision = ++musicRevision;
    if (!on) {
      mixer.stopMusic({ fade: 0.5 });
      return;
    }
    getAlbum().then((buffer) => {
      if (!open() || revision !== musicRevision || !musicWanted || !state.music) return;
      if (buffer) mixer.playMusic(buffer, { loop: true, fade: 1.15, restart: mixer.music?.state === 'stopping' });
      else musicWanted = false;
    });
  }
  return {
    play(name, { volume = 1, rate = 1, material } = {}) {
      if (!open() || !state.sound || state.hidden) return;
      const resolved = effectName(name, material);
      const buffer = decoded.get(resolved) ?? decoded.get(name);
      if (buffer) mixer.play(buffer, { bus: 'effects', volume, rate, maxInstances: 2, whileSilent: 'drop' });
    },
    music: requestMusic,
    /** River ambience is present only at a construction site and follows the sound setting. */
    scene(name) {
      state.site = name === 'build';
      refreshRiver();
    },
    setSound(on) {
      state.sound = Boolean(on);
      apply();
      refreshRiver();
    },
    setMusic(on) {
      state.music = Boolean(on);
      apply();
      requestMusic(state.music);
    },
    setHidden(hidden) {
      state.hidden = Boolean(hidden);
      apply();
      refreshRiver();
    }
  };
}
