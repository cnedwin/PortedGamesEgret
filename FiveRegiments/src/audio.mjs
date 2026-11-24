// Sound, all made in code and played through the engine's mixer: blades through the air, steel on steel (a bright
// ring for a deflection), blows into armour and flesh, the kick, the bow, arrows, the blast, war drums under the
// fights and a plucked tune under the pages. Nothing sounds before the first key or click, as browsers ask.
import { encodeWav } from '@egret/engine/kit';
import { createBrowserAudio } from '@egret/engine/web/audio';

export const RATE = 32000;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const buffer = (seconds) => new Float32Array(Math.round(seconds * RATE));

/** Filtered noise with an envelope; `tone(t)` sets the brightness 0..1 over time. */
function noise(seconds, env, { tone = () => 0.5, gain = 0.5, seed = 1 } = {}) {
  const out = buffer(seconds),
    r = rng(seed);
  let lo = 0,
    hi = 0;
  for (let n = 0; n < out.length; n++) {
    const t = n / RATE;
    const w = r() * 2 - 1;
    const k = Math.max(0.02, Math.min(0.98, 1 - tone(t)));
    lo = lo * k + w * (1 - k);
    hi = w - lo;
    out[n] = (lo * (1 - tone(t)) + hi * tone(t)) * env(t, seconds) * gain;
  }
  return out;
}
/** Inharmonic partials ringing down: the sound of struck steel. */
function ring(seconds, base, { partials = [1, 2.76, 5.4, 8.93], decay = 9, gain = 0.3, seed = 2 } = {}) {
  const out = buffer(seconds),
    r = rng(seed);
  const ph = partials.map(() => r() * 6.28);
  for (let n = 0; n < out.length; n++) {
    const t = n / RATE;
    let v = 0;
    partials.forEach((p, i) => (v += (Math.sin(2 * Math.PI * base * p * t + ph[i]) * Math.exp(-t * decay * (1 + i * 0.6))) / (1 + i * 0.7)));
    out[n] = v * gain * Math.min(1, t * 3000);
  }
  return out;
}
function tone(seconds, f0, f1, { decay = 8, gain = 0.5 } = {}) {
  const out = buffer(seconds);
  let ph = 0;
  for (let n = 0; n < out.length; n++) {
    const t = n / RATE;
    const f = f0 + (f1 - f0) * Math.min(1, t / seconds);
    ph += (2 * Math.PI * f) / RATE;
    out[n] = Math.sin(ph) * Math.exp(-t * decay) * gain * Math.min(1, t * 2000);
  }
  return out;
}
function mix(seconds, parts) {
  const out = buffer(seconds);
  for (const [samples, at = 0, g = 1] of parts) {
    const s = Math.round(at * RATE);
    for (let k = 0; k < samples.length && s + k < out.length; k++) out[s + k] += samples[k] * g;
  }
  return out;
}
function pluck(f, seconds, { gain = 0.4, damping = 0.996, seed = 3 } = {}) {
  const out = buffer(seconds),
    period = Math.max(2, Math.round(RATE / f)),
    line = new Float32Array(period),
    r = rng(seed);
  for (let k = 0; k < period; k++) line[k] = r() * 2 - 1;
  let at = 0;
  for (let n = 0; n < out.length; n++) {
    const next = line[(at + 1) % period];
    const v = damping * 0.5 * (line[at] + next);
    line[at] = v;
    at = (at + 1) % period;
    out[n] = v * gain;
  }
  return out;
}
const swoosh = (len, seed, gain = 0.45) => noise(len, (t, s) => Math.sin((Math.PI * t) / s) ** 2, { tone: (t) => 0.2 + 0.6 * Math.sin((Math.PI * t) / len), gain, seed });
const thud = (f, len, gain = 0.6) => mix(len, [[tone(len, f * 1.6, f, { decay: 14, gain })], [noise(len * 0.5, (t) => Math.exp(-t * 40), { tone: () => 0.3, gain: gain * 0.6, seed: 7 })]]);
const bladeAir = (len, rise, seed, brightness, gain) => noise(len, (t) => {
  const x = t / rise;
  return x * Math.exp(1 - x) * (1 - t / len);
}, { tone: (t) => 0.2 + brightness * Math.exp(-(((t - rise) / (rise * 0.8)) ** 2)), seed, gain });
const contactNoise = (len, decay, brightness, gain, seed) => noise(len, (t) => Math.min(1, t * 2600) * Math.exp(-t * decay), {
  tone: () => brightness, gain, seed
});

/** Leave headroom before WAV encoding, with a short attack and click-free tail. */
function contactMix(seconds, parts) {
  const out = mix(seconds, parts);
  let peak = 0;
  for (let i = 0; i < out.length; i++) {
    out[i] *= Math.min(1, i / (RATE * 0.0006), (out.length - 1 - i) / (RATE * 0.016));
    peak = Math.max(peak, Math.abs(out[i]));
  }
  if (peak > 0.88) {
    const headroom = 0.88 / peak;
    for (let i = 0; i < out.length; i++) out[i] *= headroom;
  }
  return out;
}

function skillImpact(armour) {
  const texture = armour
    ? ring(0.27, 510, { partials: [1, 1.59, 2.83, 4.12], gain: 0.31, decay: 14, seed: 47 })
    : tone(0.19, 680, 310, { decay: 19, gain: 0.28 });
  return contactMix(0.34, [
    [thud(78, 0.3, 0.56)],
    [contactNoise(0.1, 37, armour ? 0.77 : 0.48, 0.45, 46)],
    [texture, 0.006],
    [contactNoise(0.115, 53, armour ? 0.65 : 0.34, 0.22, 48), 0.036]
  ]);
}

export const SOUNDS = {
  swing: () => bladeAir(0.22, 0.038, 11, 0.56, 0.51),
  heavy: () => bladeAir(0.31, 0.054, 12, 0.32, 0.66),
  // Commit quickly from the saddle. Let the separate hit or guard carry the weight.
  mountedCut: () => contactMix(0.14, [
    [bladeAir(0.13, 0.012, 51, 0.52, 0.66)],
    [bladeAir(0.096, 0.008, 52, 0.20, 0.25)],
    [tone(0.075, 360, 146, { decay: 50, gain: 0.11 }), 0.002]
  ]),
  steelReady: () => mix(0.13, [[contactNoise(0.09, 38, 0.67, 0.3, 33)], [ring(0.13, 516, { gain: 0.1, decay: 30, seed: 34 })]]),
  bladeWave: () => mix(0.34, [[bladeAir(0.32, 0.027, 35, 0.73, 0.53)], [tone(0.24, 290, 105, { decay: 12, gain: 0.23 })]]),
  spearPlant: () => mix(0.18, [[tone(0.13, 493, 220, { decay: 22, gain: 0.43 })], [contactNoise(0.16, 25, 0.32, 0.45, 42)]]),
  spearThrust: () => mix(0.28, [[bladeAir(0.28, 0.024, 43, 0.66, 0.55)], [tone(0.21, 930, 435, { decay: 11, gain: 0.32 })]]),
  clash: () => contactMix(0.25, [[ring(0.24, 732, { gain: 0.32, decay: 21, seed: 4 })], [contactNoise(0.08, 56, 0.87, 0.35, 5)]]),
  deflect: () => contactMix(0.45, [
    [ring(0.44, 1230, { partials: [1, 1.78, 2.9, 4.22], gain: 0.35, decay: 10, seed: 6 })],
    [ring(0.33, 1770, { gain: 0.15, decay: 14, seed: 9 }), 0.023],
    [contactNoise(0.045, 94, 0.92, 0.31, 8)]
  ]),
  shield: () => contactMix(0.26, [[thud(134, 0.22, 0.49)], [ring(0.23, 411, { gain: 0.19, decay: 24, seed: 10 })], [contactNoise(0.057, 62, 0.46, 0.32, 16)]]),
  hit: () => contactMix(0.19, [
    [thud(106, 0.17, 0.47)], [tone(0.10, 560, 260, { gain: 0.21, decay: 23 })],
    [contactNoise(0.085, 55, 0.49, 0.38, 13)]
  ]),
  armourHit: () => contactMix(0.26, [
    [thud(118, 0.18, 0.27)], [ring(0.25, 615, { partials: [1, 1.51, 2.41, 3.66], gain: 0.37, decay: 20, seed: 29 })],
    [contactNoise(0.073, 61, 0.81, 0.35, 30)]
  ]),
  heavyHit: () => contactMix(0.31, [
    [thud(79, 0.30, 0.62)], [tone(0.17, 476, 204, { gain: 0.29, decay: 20 })],
    [contactNoise(0.13, 45, 0.53, 0.37, 26)]
  ]),
  skillHit: () => skillImpact(false),
  skillArmourHit: () => skillImpact(true),
  horseRam: () => mix(0.34, [[thud(62, 0.33, 0.7)], [contactNoise(0.15, 39, 0.27, 0.36, 44)], [ring(0.21, 362, { gain: 0.13, decay: 24, seed: 45 }), 0.024]]),
  crit: () => contactMix(0.38, [
    [thud(87, 0.3, 0.51)], [ring(0.34, 935, { gain: 0.26, decay: 16, seed: 14 })],
    [ring(0.23, 1640, { gain: 0.13, decay: 24, seed: 32 }), 0.014],
    [contactNoise(0.08, 59, 0.79, 0.4, 15)]
  ]),
  kick: () => thud(70, 0.3, 0.8),
  break: () => contactMix(0.33, [
    [contactNoise(0.085, 56, 0.77, 0.56, 16)],
    [tone(0.17, 428, 181, { gain: 0.30, decay: 20 })],
    [thud(84, 0.25, 0.55), 0.009],
    [contactNoise(0.11, 51, 0.58, 0.36, 49), 0.031],
    [ring(0.21, 355, { gain: 0.16, decay: 21, seed: 50 }), 0.035]
  ]),
  step: () => noise(0.25, (t, s) => Math.sin((Math.PI * t) / s), { tone: () => 0.25, gain: 0.3, seed: 17 }),
  draw: () => noise(0.7, (t, s) => (t / s) * Math.exp(-((t - s) ** 2)), { tone: (t) => 0.1 + t * 0.4, gain: 0.18, seed: 18 }),
  bowDraw: () => contactMix(0.28, [
    [noise(0.27, (t, s) => Math.sin(Math.PI * t / s) ** 1.3, { tone: (t) => 0.25 + t * 1.8, gain: 0.23, seed: 64 })],
    [tone(0.16, 204, 264, { decay: 17, gain: 0.065 }), 0.065]
  ]),
  loose: () => mix(0.6, [[tone(0.5, 180, 120, { decay: 9, gain: 0.35 })], [swoosh(0.25, 19, 0.35), 0.02]]),
  bowLoose: () => contactMix(0.19, [
    [pluck(327, 0.12, { gain: 0.53, damping: 0.955, seed: 65 })],
    [contactNoise(0.045, 93, 0.78, 0.33, 66)],
    [tone(0.084, 248, 151, { decay: 42, gain: 0.19 }), 0.002],
    [bladeAir(0.13, 0.011, 67, 0.68, 0.30), 0.004]
  ]),
  fanLoose: () => mix(0.24, [[pluck(244, 0.16, { gain: 0.27, damping: 0.966, seed: 36 })], [bladeAir(0.23, 0.025, 37, 0.69, 0.32), 0.008]]),
  galeLoose: () => mix(0.44, [[pluck(145, 0.18, { gain: 0.27, damping: 0.955, seed: 39 })], [bladeAir(0.41, 0.033, 38, 0.36, 0.45)], [tone(0.3, 184, 56, { decay: 10, gain: 0.24 })]]),
  arrowHit: () => mix(0.3, [[thud(150, 0.25, 0.5)], [noise(0.08, (t) => Math.exp(-t * 70), { tone: () => 0.7, gain: 0.3, seed: 20 })]]),
  blast: () => mix(1.6, [[tone(1.4, 90, 38, { decay: 3, gain: 0.8 })], [noise(1.5, (t) => Math.exp(-t * 3.5), { tone: (t) => 0.5 - t * 0.3, gain: 0.7, seed: 21 })]]),
  mist: () => noise(1.2, (t, s) => Math.sin((Math.PI * t) / s), { tone: () => 0.75, gain: 0.25, seed: 22 }),
  web: () => swoosh(0.4, 23, 0.3),
  shout: () => mix(1.2, [[tone(1.1, 140, 95, { decay: 2.5, gain: 0.35 })], [noise(1.0, (t, s) => Math.sin((Math.PI * t) / s), { tone: () => 0.35, gain: 0.25, seed: 24 })]]),
  fall: () => thud(55, 0.6, 0.8),
  drum: () => thud(62, 0.6, 0.9),
  gong: () => ring(3.2, 168, { partials: [1, 1.48, 2.01, 2.73, 3.6], decay: 1.1, gain: 0.32, seed: 25 }),
  click: () => tone(0.08, 900, 700, { decay: 40, gain: 0.2 })
};

/** A loop of war drums, 8 seconds of 4/4 at 90 beats a minute. */
function drums() {
  const seconds = 8,
    out = buffer(seconds),
    beat = 60 / 90;
  const big = thud(58, 0.9, 0.9),
    small = thud(110, 0.35, 0.45),
    rim = noise(0.05, (t) => Math.exp(-t * 90), { tone: () => 0.8, gain: 0.3, seed: 31 });
  const add = (s, at, g) => {
    const start = Math.round(at * RATE);
    for (let k = 0; k < s.length; k++) out[(start + k) % out.length] += s[k] * g;
  };
  for (let b = 0; b < 12; b++) {
    const at = b * beat;
    add(big, at, b % 4 === 0 ? 1 : 0.55);
    if (b % 2 === 1) add(small, at + beat / 2, 0.7);
    if (b % 4 === 3) add(rim, at + beat * 0.75, 1);
  }
  return out;
}
/** A slow plucked air on the pentatonic scale for the pages between fights. */
function air() {
  const seconds = 20,
    out = buffer(seconds),
    r = rng(77);
  const steps = [0, 2, 4, 7, 9, 12, 14],
    base = 196;
  let at = 0,
    i = 3;
  while (at < seconds - 2) {
    i = Math.max(0, Math.min(steps.length - 1, i + Math.floor(r() * 5) - 2));
    const note = pluck(base * 2 ** (steps[i] / 12), 3, { gain: 0.22, damping: 0.9975, seed: Math.floor(r() * 1e6) });
    const s = Math.round(at * RATE);
    for (let k = 0; k < note.length; k++) out[(s + k) % out.length] += note[k];
    at += r() < 0.3 ? 1.6 : 0.8;
  }
  return out;
}

const TRACKS = { air, drums };
const MUSIC_LEVEL = 0.38;
const TRACK_FADE = 0.42;
const EFFECT_DEADLINE_MS = 120;
const nextAudioTask = () => new Promise(resolve => setTimeout(resolve, 0));

export function createSound(scope, { on = true } = {}) {
  const audio = scope.use(
    createBrowserAudio({
      buses: [
        { name: 'effects', volume: 0.9, muted: !on },
        { name: 'music', volume: MUSIC_LEVEL, muted: !on }
      ],
      limiter: true
    })
  );
  const mixer = audio.mixer;
  const effectsBus = mixer.bus('effects');
  const musicBus = mixer.bus('music');
  const sounds = new Map(), tunes = new Map(), waiting = new Map();
  let paused = false, enabled = on, generation = 0;
  let synthesis = Promise.resolve(), choice;
  const open = () => mixer.state !== 'closed';

  function prepare(cache, name, make) {
    const previous = cache.get(name);
    if (previous) return previous;
    const entry = { buffer: null, ready: null };
    cache.set(name, entry);
    // The WAV encoding is synchronous. Give the browser a turn between cues, even during a tune change.
    const wav = synthesis.then(nextAudioTask).then(() => open() ? encodeWav([make()], RATE) : null);
    synthesis = wav.then(() => {}, () => {});
    entry.ready = wav.then(bytes => bytes && open() ? mixer.decode(bytes) : null).then(buffer => {
      entry.buffer = buffer;
      return buffer;
    }).catch(error => {
      cache.delete(name);
      if (open()) console.warn('Unable to prepare game audio', name, error);
      return null;
    });
    return entry;
  }

  // Prepare the opening cue first, then let each remaining effect decode in the background.
  async function warmEffects() {
    const order = ['drum', ...Object.keys(SOUNDS).filter(name => name !== 'drum')];
    for (const name of order) {
      if (!open()) break;
      await prepare(sounds, name, SOUNDS[name]).ready;
    }
  }
  void warmEffects();

  function clearEffects() {
    generation++;
    waiting.clear();
    if (open()) mixer.stopAll({ bus: 'effects', fade: 0.045 });
  }

  return {
    play(name, { volume = 1, rate = 1 } = {}) {
      if (!enabled || paused || !open() || !Object.hasOwn(SOUNDS, name)) return;
      const entry = prepare(sounds, name, SOUNDS[name]);
      const options = { bus: 'effects', volume, rate, maxInstances: 5 };
      if (entry.buffer) {
        mixer.play(entry.buffer, options);
        return;
      }
      if (waiting.has(name)) return;
      const request = generation;
      const requestedAt = performance.now();
      waiting.set(name, request);
      void entry.ready.then(buffer => {
        if (waiting.get(name) !== request) return;
        waiting.delete(name);
        if (buffer && open() && performance.now() - requestedAt <= EFFECT_DEADLINE_MS) mixer.play(buffer, options);
      });
    },
    music(name) {
      if (!open() || name && !Object.hasOwn(TRACKS, name)) return;
      if (choice && choice.name === name) return choice.ready;
      const request = choice = { name, ready: null };
      if (!name) {
        mixer.stopMusic({ fade: TRACK_FADE });
        return;
      }
      request.ready = prepare(tunes, name, TRACKS[name]).ready.then(buffer => {
        if (choice !== request || !open()) return;
        if (buffer) mixer.playMusic(buffer, { loop: true, volume: name === 'drums' ? 0.8 : 1, fade: TRACK_FADE });
        else choice = undefined;
      });
      return request.ready;
    },
    setPaused(value) {
      if (paused === value) return;
      paused = value;
      if (value) clearEffects();
      musicBus.setVolume(MUSIC_LEVEL * (value ? 0.45 : 1), { fade: 0.22 });
    },
    setOn(value) {
      if (enabled === value) return;
      enabled = value;
      if (!value) clearEffects();
      effectsBus.setMuted(!value);
      musicBus.setMuted(!value);
    },
    clearEffects
  };
}
