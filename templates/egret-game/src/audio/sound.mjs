// 声音：两段合成的短音（按键、拾取）交给引擎的混音器，由网页的 Web Audio 发声。第一次按键或触屏之后才响，这是
// 浏览器的要求。新游戏在 SOUNDS 里加自己的声音。
// Sound: two short synthesized sounds (a tap, a pick-up) handed to the engine's mixer, sounding through the page's
// Web Audio. Nothing sounds before the first key or touch, as browsers ask. A new game adds its sounds to SOUNDS.
import { encodeWav } from '@egret/engine/kit';
import { createBrowserAudio } from '@egret/engine/web/audio';

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

/** The sounds of the game, by name. */
export const SOUNDS = {
  tap: () => tone(760, 0.12, { decay: 40, partials: [[1, 1], [2.7, 0.2]] }),
  light: () => tone(1180, 0.6, { decay: 7, partials: [[1, 1], [2, 0.3], [3.01, 0.15]], gain: 0.3 }),
  done: () => {
    // Four rising notes, a little apart.
    const out = new Float32Array(Math.round(1.4 * RATE));
    [0, 4, 7, 12].forEach((step, i) => {
      const note = tone(523.25 * 2 ** (step / 12), 1, { decay: 4, partials: [[1, 1], [2, 0.25]], gain: 0.25 }),
        at = Math.round(i * 0.12 * RATE);
      for (let k = 0; k < note.length && at + k < out.length; k++) out[at + k] += note[k];
    });
    return out;
  }
};

/** The page's sound: the engine's mixer on Web Audio, with the game's sounds decoded onto it. */
export async function createSound(scope, { on = true } = {}) {
  const audio = scope.use(createBrowserAudio({ buses: [{ name: 'effects', volume: 0.8 }], limiter: true })),
    mixer = audio.mixer,
    sounds = {};
  await Promise.all(Object.entries(SOUNDS).map(async ([name, make]) => (sounds[name] = scope.use(await mixer.decode(encodeWav([make()], RATE))))));
  mixer.bus('effects').setMuted(!on);
  return {
    play(name, { volume = 1, rate = 1 } = {}) {
      if (sounds[name]) mixer.play(sounds[name], { bus: 'effects', volume, rate, maxInstances: 4 });
    },
    setOn: (value) => mixer.bus('effects').setMuted(!value)
  };
}
