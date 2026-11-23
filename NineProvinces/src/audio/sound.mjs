// 声音：全部在代码里合成——木鱼似的按键、拨弦、铜钱、战鼓、兵刃相交、箭雨、火、号角、铜锣、印章落下——再加两段
// 无缝循环的配乐：天下图上是古琴似的拨弦配着低持续音（五声音阶，徵调），战场上是战鼓和急促的琵琶轮指。
// 声音和配乐交给引擎的混音器（两条总线），由网页的 Web Audio 发声；第一次按键或触屏之后才响，这是浏览器的要求。
// Sound: all made in code — a woodblock tap, plucked strings, coins, war drums, clashing blades, a hail of arrows, fire,
// horns, a gong, a seal coming down — and two seamless themes: on the map of the realm, plucked strings like a guqin
// over a low drone (pentatonic); on the field, war drums and the quick tremolo of a pipa. They go to the engine's
// mixer (two buses) and sound through the page's Web Audio; nothing sounds before the first key or touch, as browsers ask.
import { encodeWav } from '@egret/engine/kit';
import { createBrowserAudio } from '@egret/engine/web/audio';

export const RATE = 32000;

/** A small seeded random, so every build of the sounds is the same. */
function noiseSource(seed = 7) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2147483648 - 1);
}

/** A decaying tone with a few partials. */
export function tone(frequency, seconds, { decay = 18, partials = [[1, 1]], gain = 0.4, attack = 400, sweep = 0 } = {}) {
  const out = new Float32Array(Math.round(seconds * RATE));
  const phase = partials.map(() => 0);
  for (let n = 0; n < out.length; n++) {
    const t = n / RATE,
      envelope = Math.min(1, t * attack) * Math.exp(-t * decay);
    const f = frequency * (1 + sweep * t);
    let value = 0;
    partials.forEach(([ratio, amount], k) => {
      phase[k] += (2 * Math.PI * f * ratio) / RATE;
      value += Math.sin(phase[k]) * amount;
    });
    out[n] = value * envelope * gain;
  }
  return out;
}

/** Noise through a simple band: `low` and `high` are the one-pole cut-offs (0..1), shaped by an envelope. */
function noise(seconds, { decay = 12, gain = 0.4, low = 0.3, high = 0.02, attack = 300, seed = 3 } = {}) {
  const out = new Float32Array(Math.round(seconds * RATE)),
    r = noiseSource(seed);
  let lp = 0,
    hp = 0;
  for (let n = 0; n < out.length; n++) {
    const t = n / RATE;
    lp += (r() - lp) * low;
    hp += (lp - hp) * high;
    out[n] = (lp - hp) * Math.min(1, t * attack) * Math.exp(-t * decay) * gain * 3;
  }
  return out;
}

/** A plucked string (Karplus–Strong): bright at first, mellowing as it rings. */
function pluck(frequency, seconds, { gain = 0.35, damp = 0.996, bright = 0.5, seed = 11 } = {}) {
  const out = new Float32Array(Math.round(seconds * RATE)),
    r = noiseSource(seed);
  const n = Math.max(2, Math.round(RATE / frequency));
  const ring = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    lp += (r() - lp) * bright;
    ring[i] = lp;
  }
  let at = 0;
  for (let k = 0; k < out.length; k++) {
    const next = (at + 1) % n;
    const v = (ring[at] + ring[next]) * 0.5 * damp;
    out[k] = ring[at] * gain;
    ring[at] = v;
    at = next;
  }
  // A soft start, so the attack does not click.
  for (let k = 0; k < Math.min(out.length, 40); k++) out[k] *= k / 40;
  return out;
}

/** Mix `part` into `out` at a time, wrapping round the end when `wrap` (for loops). */
function mix(out, part, at, volume = 1, wrap = false) {
  const start = Math.round(at * RATE);
  for (let k = 0; k < part.length; k++) {
    let i = start + k;
    if (i >= out.length) {
      if (!wrap) break;
      i %= out.length;
    }
    out[i] += part[k] * volume;
  }
  return out;
}

const silence = (seconds) => new Float32Array(Math.round(seconds * RATE));

/** A war drum: a falling low thump and a slap of skin. */
const drum = (gain = 0.6, pitch = 72) => mix(tone(pitch, 0.9, { decay: 7, partials: [[1, 1], [1.6, 0.3]], gain, attack: 2000, sweep: -0.5 }), noise(0.12, { decay: 40, gain: gain * 0.5, low: 0.15, high: 0.05, seed: 5 }), 0);

/** The sounds of the game, by name. */
export const SOUNDS = {
  tap: () => mix(tone(1180, 0.09, { decay: 60, partials: [[1, 1], [2.76, 0.3]], gain: 0.28, attack: 3000 }), noise(0.02, { decay: 200, gain: 0.12, low: 0.8, high: 0.2 }), 0),
  open: () => pluck(392, 0.9, { gain: 0.3, damp: 0.993 }),
  close: () => pluck(294, 0.6, { gain: 0.24, damp: 0.99 }),
  coin: () => mix(tone(2093, 0.4, { decay: 14, partials: [[1, 1], [2.4, 0.4], [3.9, 0.2]], gain: 0.16, attack: 3000 }), tone(2637, 0.35, { decay: 16, partials: [[1, 1], [2.4, 0.3]], gain: 0.13, attack: 3000 }), 0.06),
  build: () => mix(mix(mix(silence(0.36), noise(0.08, { decay: 50, gain: 0.35, low: 0.5, high: 0.1, seed: 9 }), 0), tone(180, 0.2, { decay: 30, gain: 0.3, attack: 3000 }), 0), noise(0.08, { decay: 50, gain: 0.3, low: 0.5, high: 0.1, seed: 13 }), 0.16),
  drum: () => drum(0.5),
  march: () => mix(mix(mix(silence(1.6), drum(0.42), 0), drum(0.38, 68), 0.32), drum(0.5, 64), 0.64),
  clash: () => mix(noise(0.35, { decay: 14, gain: 0.32, low: 0.9, high: 0.4, seed: 21 }), tone(1870, 0.4, { decay: 12, partials: [[1, 1], [1.41, 0.6], [2.13, 0.4]], gain: 0.12, attack: 3000 }), 0),
  arrows: () => {
    const out = silence(0.9);
    for (let i = 0; i < 7; i++) mix(out, noise(0.25, { decay: 10, gain: 0.12, low: 0.6, high: 0.3, attack: 40, seed: 30 + i }), i * 0.08);
    return out;
  },
  fire: () => {
    const out = noise(1.2, { decay: 2.5, gain: 0.16, low: 0.1, high: 0.01, attack: 8, seed: 41 }),
      r = noiseSource(42);
    for (let i = 0; i < 18; i++) mix(out, noise(0.03, { decay: 120, gain: 0.25, low: 0.7, high: 0.3, seed: 50 + i }), Math.abs(r()) * 1.1);
    return out;
  },
  horn: () => {
    const out = tone(110, 1.6, { decay: 1.1, partials: [[1, 1], [2, 0.6], [3, 0.4], [4, 0.2], [5, 0.12]], gain: 0.2, attack: 5 });
    return mix(out, tone(164.8, 1.2, { decay: 1.4, partials: [[1, 1], [2, 0.5], [3, 0.3]], gain: 0.12, attack: 6 }), 0.5);
  },
  gong: () => tone(98, 3, { decay: 1.2, partials: [[1, 1], [1.48, 0.6], [2.03, 0.5], [2.74, 0.35], [3.9, 0.2]], gain: 0.3, attack: 900 }),
  seal: () => mix(tone(120, 0.3, { decay: 22, gain: 0.45, attack: 3000, sweep: -0.6 }), noise(0.06, { decay: 70, gain: 0.3, low: 0.4, high: 0.08 }), 0),
  tactic: () => mix(tone(520, 0.7, { decay: 4, partials: [[1, 1], [2, 0.4], [3, 0.2]], gain: 0.2, attack: 20, sweep: 1.4 }), noise(0.5, { decay: 6, gain: 0.12, low: 0.7, high: 0.3, attack: 30 }), 0),
  win: () => {
    const out = silence(2.2);
    [293.66, 329.63, 392, 440, 587.33].forEach((f, i) => mix(out, pluck(f, 1.6, { gain: 0.3, seed: 60 + i }), i * 0.13));
    return mix(out, drum(0.5), 0.6);
  },
  lose: () => {
    const out = silence(2.4);
    [440, 392, 329.63, 293.66, 220].forEach((f, i) => mix(out, pluck(f, 1.8, { gain: 0.28, damp: 0.994, seed: 70 + i }), i * 0.2));
    return out;
  },
  event: () => {
    const out = silence(2.4);
    mix(out, pluck(146.83, 2.4, { gain: 0.3, damp: 0.998, bright: 0.35, seed: 80 }), 0);
    mix(out, pluck(220, 2.2, { gain: 0.24, damp: 0.998, bright: 0.35, seed: 81 }), 0.05);
    return mix(out, pluck(293.66, 2, { gain: 0.2, damp: 0.997, bright: 0.4, seed: 82 }), 0.1);
  }
};

/** The theme of the realm: a slow pentatonic line of plucked strings over a low fifth, 32 seconds, seamless. */
export function realmTheme() {
  const seconds = 32,
    out = silence(seconds);
  // The drone: D and A, breathing slowly; whole cycles of the loop so the seam is silent.
  for (let n = 0; n < out.length; n++) {
    const t = n / RATE,
      swell = 0.6 + 0.4 * Math.sin((2 * Math.PI * t) / seconds);
    out[n] = (Math.sin(2 * Math.PI * 73.4166 * t) * 0.05 + Math.sin(2 * Math.PI * 110.0 * t) * 0.03) * swell;
  }
  // The line, in the D zhi mode (D E G A B), phrase by phrase.
  const scale = [146.83, 164.81, 196, 220, 246.94, 293.66, 329.63, 392, 440];
  const phrases = [
    [5, 3, 4, 3, 2, 0],
    [2, 3, 5, 6, 5, 3],
    [7, 6, 5, 3, 5, 4],
    [3, 2, 0, 2, 3, 5]
  ];
  const r = noiseSource(97);
  let at = 0.4;
  for (const phrase of phrases) {
    phrase.forEach((step, i) => {
      const long = i === phrase.length - 1;
      mix(out, pluck(scale[step], long ? 3.2 : 2.2, { gain: 0.34, damp: 0.9975, bright: 0.38, seed: 100 + Math.floor(Math.abs(r()) * 1000) }), at, 1, true);
      // Now and then the note below, softly, as a guqin's second string.
      if (i % 3 === 0) mix(out, pluck(scale[Math.max(0, step - 2)] / 2, 2.5, { gain: 0.2, damp: 0.998, bright: 0.3, seed: 300 + i }), at + 0.02, 1, true);
      at += long ? 2.2 : 0.9 + (i % 2) * 0.3;
    });
    at += 0.4;
  }
  return out;
}

/** The theme of battle: drums in a driving pattern, a low horn and a pipa's tremolo, 16 seconds, seamless. */
export function battleTheme() {
  const seconds = 16,
    beat = 0.5,
    out = silence(seconds);
  const pattern = [1, 0, 0.6, 0, 1, 0.5, 0.6, 0];
  for (let b = 0; b < seconds / beat; b++) {
    const v = pattern[b % pattern.length];
    if (v) mix(out, drum(0.42 * v, b % 8 === 0 ? 62 : 74), b * beat, 1, true);
    if (b % 2 === 1) mix(out, noise(0.08, { decay: 50, gain: 0.08, low: 0.6, high: 0.2, seed: 200 + b }), b * beat + 0.25, 1, true);
  }
  // A horn at the start of each half.
  for (const at of [0, 8]) mix(out, tone(110, 2.6, { decay: 0.9, partials: [[1, 1], [2, 0.5], [3, 0.3], [4, 0.15]], gain: 0.07, attack: 4 }), at, 1, true);
  // The pipa: quick repeated plucks on a falling line.
  const line = [293.66, 293.66, 261.63, 220, 246.94, 220, 196, 220];
  line.forEach((f, i) => {
    const start = 1 + i * 1.8;
    for (let k = 0; k < 10; k++) mix(out, pluck(f * 2, 0.28, { gain: 0.07, damp: 0.99, bright: 0.6, seed: 400 + i * 10 + k }), start + k * 0.07, 1, true);
  });
  return out;
}

/** The page's sound: the engine's mixer on Web Audio, effects decoded at once, the themes when first asked for. */
export async function createSound(scope, { sound = true, music = true } = {}) {
  const audio = scope.use(createBrowserAudio({ buses: [{ name: 'effects', volume: 0.8 }, { name: 'music', volume: 0.55 }], limiter: true })),
    mixer = audio.mixer,
    sounds = {},
    themes = {};
  await Promise.all(Object.entries(SOUNDS).map(async ([name, make]) => (sounds[name] = scope.use(await mixer.decode(encodeWav([make()], RATE))))));
  mixer.bus('effects').setMuted(!sound);
  mixer.bus('music').setMuted(!music);
  let wanted = null,
    played = {};
  const makers = { realm: realmTheme, battle: battleTheme };
  return {
    play(name, { volume = 1, rate = 1 } = {}) {
      if (!sounds[name]) return;
      // The same sound twice within a tenth of a second is one sound.
      const now = performance.now();
      if (now - (played[name] ?? 0) < 90) return;
      played[name] = now;
      mixer.play(sounds[name], { bus: 'effects', volume, rate, maxInstances: 3 });
    },
    async theme(name) {
      wanted = name;
      if (!name) return mixer.stopMusic({ fade: 1 });
      themes[name] ??= mixer.decode(encodeWav([makers[name]()], RATE)).then((s) => scope.use(s));
      const sound = await themes[name];
      if (wanted === name) mixer.playMusic(sound, { fade: 1.5 });
    },
    setSound: (on) => mixer.bus('effects').setMuted(!on),
    setMusic: (on) => mixer.bus('music').setMuted(!on),
    get state() {
      return mixer.state;
    },
    get music() {
      return wanted;
    }
  };
}
