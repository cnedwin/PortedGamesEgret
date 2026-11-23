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

export const SOUNDS = {
  swing: () => swoosh(0.32, 11),
  heavy: () => swoosh(0.5, 12, 0.6),
  clash: () => mix(0.9, [[ring(0.9, 820, { gain: 0.32, seed: 4 })], [noise(0.08, (t) => Math.exp(-t * 60), { tone: () => 0.9, gain: 0.5, seed: 5 })]]),
  deflect: () => mix(1.4, [[ring(1.4, 1240, { gain: 0.36, decay: 5, seed: 6 })], [ring(1.2, 1870, { gain: 0.16, decay: 7, seed: 9 })], [noise(0.06, (t) => Math.exp(-t * 80), { tone: () => 0.95, gain: 0.5, seed: 8 })]]),
  shield: () => mix(0.6, [[thud(120, 0.4, 0.7)], [ring(0.5, 560, { gain: 0.14, decay: 14, seed: 10 })]]),
  hit: () => mix(0.45, [[thud(90, 0.35, 0.65)], [noise(0.2, (t) => Math.exp(-t * 22), { tone: () => 0.45, gain: 0.45, seed: 13 })]]),
  crit: () => mix(0.7, [[thud(70, 0.5, 0.8)], [ring(0.6, 980, { gain: 0.12, decay: 9, seed: 14 })], [noise(0.3, (t) => Math.exp(-t * 14), { tone: () => 0.6, gain: 0.5, seed: 15 })]]),
  kick: () => thud(70, 0.3, 0.8),
  break: () => mix(0.9, [[ring(0.8, 410, { gain: 0.3, decay: 7, seed: 16 })], [thud(60, 0.5, 0.7)]]),
  step: () => noise(0.25, (t, s) => Math.sin((Math.PI * t) / s), { tone: () => 0.25, gain: 0.3, seed: 17 }),
  draw: () => noise(0.7, (t, s) => (t / s) * Math.exp(-((t - s) ** 2)), { tone: (t) => 0.1 + t * 0.4, gain: 0.18, seed: 18 }),
  loose: () => mix(0.6, [[tone(0.5, 180, 120, { decay: 9, gain: 0.35 })], [swoosh(0.25, 19, 0.35), 0.02]]),
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

export async function createSound(scope, { on = true } = {}) {
  const audio = scope.use(
    createBrowserAudio({
      buses: [
        { name: 'effects', volume: 0.9 },
        { name: 'music', volume: 0.38 }
      ],
      limiter: true
    })
  );
  const mixer = audio.mixer;
  const sounds = {};
  await Promise.all(Object.entries(SOUNDS).map(async ([name, make]) => (sounds[name] = scope.use(await mixer.decode(encodeWav([make()], RATE))))));
  const tunes = {};
  let playing = null,
    playingName = null;
  const setOn = (value) => {
    mixer.bus('effects').setMuted(!value);
    mixer.bus('music').setMuted(!value);
  };
  setOn(on);
  return {
    play(name, { volume = 1, rate = 1 } = {}) {
      if (sounds[name]) mixer.play(sounds[name], { bus: 'effects', volume, rate, maxInstances: 5 });
    },
    async music(name) {
      if (playingName === name) return;
      playing?.stop?.();
      playing = null;
      playingName = name;
      if (!name) return;
      tunes[name] ??= scope.use(await mixer.decode(encodeWav([name === 'drums' ? drums() : air()], RATE)));
      if (playingName === name) playing = mixer.play(tunes[name], { bus: 'music', loop: true, volume: name === 'drums' ? 0.8 : 1 });
    },
    setOn
  };
}
