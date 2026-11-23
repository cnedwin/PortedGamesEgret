// 声音：全部在代码里合成，交给引擎的混音器，由网页的 Web Audio 发声。沙声是滤过的噪声加细碎的颗粒；消除是筝一样
// 拨弦的声音（Karplus-Strong 算法），连消时按五声音阶一级级往上；背景是一段二十四秒、可以无缝循环的拨弦小曲。
// 第一次按键或触屏之后才响，这是浏览器的要求。
// Sound: everything is synthesized in code, handed to the engine's mixer and played through the page's Web Audio.
// Sand is filtered noise with a crackle of grains; a clear is a plucked string like a zither (the Karplus-Strong
// method), climbing the pentatonic scale through a chain; behind it all, a plucked tune twenty-four seconds long that
// loops without a seam. Nothing sounds before the first key or touch, as browsers ask.
import { encodeWav } from '@egret/engine/kit';
import { createBrowserAudio } from '@egret/engine/web/audio';
import { createRandom } from '../sim/sand.mjs';

export const RATE = 32000;

/** A decaying tone with a few partials, `seconds` long, as one channel of samples. */
export function tone(frequency, seconds, { decay = 18, partials = [[1, 1]], gain = 0.4 } = {}) {
  const out = new Float32Array(Math.round(seconds * RATE));
  for (let n = 0; n < out.length; n++) {
    const t = n / RATE,
      envelope = Math.min(1, t * 400) * Math.exp(-t * decay);
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
    out[n] = v * envelope(t, seconds) * gain;
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
    const next = line[(at + 1) % period],
      value = damping * (bright * line[at] + (1 - bright) * (line[at] + next) * 0.5);
    line[at] = value;
    at = (at + 1) % period;
    // A gentle body: a little of the last sample, so it rings like a box and not a wire.
    last = last * 0.3 + value * 0.7;
    out[n] = last * gain * Math.min(1, n / 40);
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

const C5 = 523.25;
const scale = (step) => C5 * 2 ** (step / 12);

/** The background tune: plucked phrases on the pentatonic scale, with a soft echo, a whole number of bars. */
export function music() {
  const seconds = 24,
    out = new Float32Array(seconds * RATE),
    rng = createRandom(88),
    steps = [-12, -10, -8, -5, -3, 0, 2, 4, 7, 9],
    beat = 0.75;
  let at = 0,
    step = 5;
  while (at < seconds - 1.5) {
    step = Math.max(0, Math.min(steps.length - 1, step + Math.floor(rng() * 5) - 2));
    const note = pluck(scale(steps[step]) / 2, 3, { gain: 0.22, damping: 0.9975, bright: 0.45, seed: Math.floor(rng() * 1e6) });
    const start = Math.round(at * RATE);
    for (let k = 0; k < note.length; k++) out[(start + k) % out.length] += note[k];
    at += beat * (rng() < 0.3 ? 2 : 1);
  }
  // A low drone of the tonic and its fifth, and an echo a beat and a half later; the end wraps onto the start.
  for (let n = 0; n < out.length; n++) {
    const t = n / RATE;
    out[n] += (Math.sin(2 * Math.PI * 130.81 * t) * 0.02 + Math.sin(2 * Math.PI * 196 * t) * 0.012) * (0.8 + 0.2 * Math.sin((2 * Math.PI * t) / seconds));
  }
  const delay = Math.round(beat * 1.5 * RATE),
    copy = out.slice();
  for (let n = 0; n < out.length; n++) out[n] += copy[(n - delay + out.length) % out.length] * 0.35;
  return out;
}

/** The sounds of the game, by name. */
export const SOUNDS = {
  tap: () => tone(760, 0.12, { decay: 40, partials: [[1, 1], [2.7, 0.2]] }),
  pick: () => mix(0.12, [[noise(0.06, (t) => Math.exp(-t * 90), { smooth: 0.2, gain: 0.35 })], [tone(980, 0.1, { decay: 60, gain: 0.18 })]]),
  turn: () => tone(1500, 0.06, { decay: 90, partials: [[1, 1], [2.1, 0.3]], gain: 0.22 }),
  drop: () => noise(0.32, (t, s) => Math.sin((Math.PI * t) / s) ** 2, { smooth: 0.85, gain: 0.5, seed: 9 }),
  land: () => noise(0.55, (t) => Math.min(1, t * 200) * Math.exp(-t * 7), { smooth: 0.55, gain: 0.45, grains: 0.012, seed: 11 }),
  shine: () => mix(1.6, [[pluck(C5, 1.6, { gain: 0.45, seed: 21 })], [pluck(C5 * 2, 1.2, { gain: 0.12, seed: 22 }), 0.01]]),
  clear: () => mix(0.9, [[noise(0.9, (t, s) => Math.min(1, t * 8) * Math.exp(-t * 4), { smooth: 0.75, gain: 0.45, grains: 0.02, seed: 13 })], [tone(90, 0.4, { decay: 10, gain: 0.35 })]]),
  boom: () => mix(1.2, [[noise(0.12, (t) => Math.exp(-t * 30), { smooth: 0.1, gain: 0.7, seed: 51 })], [tone(62, 0.6, { decay: 7, partials: [[1, 1], [1.5, 0.4]], gain: 0.55 })], [noise(1.1, (t) => Math.exp(-t * 3) * 0.6, { smooth: 0.4, gain: 0.35, grains: 0.03, seed: 52 }), 0.08]]),
  warn: () => mix(0.5, [[tone(98, 0.45, { decay: 9, partials: [[1, 1], [1.5, 0.3]], gain: 0.5 })], [noise(0.12, (t) => Math.exp(-t * 40), { smooth: 0.8, gain: 0.3 })]]),
  won: () => mix(2.6, [0, 2, 4, 7, 9, 12].map((s, k) => [pluck(scale(s), 2, { gain: 0.4, seed: 30 + k }), k * 0.14])),
  lost: () => mix(1.8, [[pluck(scale(-5), 1.6, { gain: 0.45, seed: 41 })], [pluck(scale(-8), 1.6, { gain: 0.45, seed: 42 }), 0.35]])
};

/** The page's sound: the engine's mixer on Web Audio, with the game's sounds decoded onto it. */
export async function createSound(scope, { on = true } = {}) {
  const audio = scope.use(
      createBrowserAudio({
        buses: [
          { name: 'effects', volume: 0.8 },
          { name: 'music', volume: 0.45 }
        ],
        limiter: true
      })
    ),
    mixer = audio.mixer,
    sounds = {};
  await Promise.all(Object.entries(SOUNDS).map(async ([name, make]) => (sounds[name] = scope.use(await mixer.decode(encodeWav([make()], RATE))))));
  let tune = null,
    playing = null;
  mixer.bus('effects').setMuted(!on);
  mixer.bus('music').setMuted(!on);
  return {
    play(name, { volume = 1, rate = 1 } = {}) {
      if (sounds[name]) mixer.play(sounds[name], { bus: 'effects', volume, rate, maxInstances: 4 });
    },
    /** Start the background tune, made the first time it is asked for. */
    async music() {
      if (playing) return;
      tune ??= scope.use(await mixer.decode(encodeWav([music()], RATE)));
      playing ??= mixer.play(tune, { bus: 'music', loop: true, volume: 1 });
    },
    setOn(value) {
      mixer.bus('effects').setMuted(!value);
      mixer.bus('music').setMuted(!value);
    }
  };
}
