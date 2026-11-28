// 声音：全部用代码合成，没有音频文件。每个音效先算成采样、编码成 WAV 交给引擎的混音器（createAudioMixer），
// 网页这一半由 createWebAudioBackend 接上 Web Audio；再用 createAudioCues 给每个音效设冷却、同时发声的上限和
// 随机的音高，满屏打怪时也不会糊成一片。背景乐是一段 16 秒的循环：低沉的弦音、木鱼和五声音阶的拨弦。
// 第一次按键或触屏之后才响，这是浏览器的要求。
// Sound, all made in code with no audio files. Each sound is computed as samples, encoded as WAV and handed to the
// engine's mixer (createAudioMixer), whose page half is createWebAudioBackend on Web Audio; createAudioCues then gives
// each sound a cooldown, a cap on voices at once and a spread of pitch, so a road full of kills never turns to mush.
// The music is a 16-second loop: a low bowed drone, a wooden fish and pentatonic plucks. Nothing sounds before the
// first key or touch, as browsers ask.
import { createAudioMixer } from '@egret/engine/audio';
import { createAudioCues, encodeWav } from '@egret/engine/kit';
import { createWebAudioBackend } from '@egret/engine/web/audio';

export const RATE = 32000;

/** A small seeded noise source, so the sounds are the same each load. */
function noiseSource(seed = 7) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 2147483648 - 1;
  };
}

/** A decaying tone with a few partials and a pitch slide, `seconds` long. */
export function tone(frequency, seconds, { decay = 18, partials = [[1, 1]], gain = 0.4, slide = 0, attack = 400 } = {}) {
  const out = new Float32Array(Math.round(seconds * RATE));
  let phase = 0;
  for (let n = 0; n < out.length; n++) {
    const t = n / RATE,
      f = frequency * (1 + slide * t),
      envelope = Math.min(1, t * attack) * Math.exp(-t * decay);
    phase += (2 * Math.PI * f) / RATE;
    let value = 0;
    for (const [ratio, amount] of partials) value += Math.sin(phase * ratio) * amount;
    out[n] = value * envelope * gain;
  }
  return out;
}

/** Noise through a simple low-pass, decaying: hits, paper, thunder. `colour` 0..1 is how dark. */
export function noise(seconds, { decay = 20, gain = 0.4, colour = 0.6, seed = 7, attack = 2000 } = {}) {
  const out = new Float32Array(Math.round(seconds * RATE)),
    random = noiseSource(seed);
  let low = 0;
  for (let n = 0; n < out.length; n++) {
    const t = n / RATE;
    low += (random() - low) * (1 - colour);
    out[n] = low * Math.min(1, t * attack) * Math.exp(-t * decay) * gain;
  }
  return out;
}

/** Lay `part` into `out` at `seconds`. */
function mix(out, part, seconds, gain = 1) {
  const at = Math.round(seconds * RATE);
  for (let k = 0; k < part.length && at + k < out.length; k++) out[at + k] += part[k] * gain;
  return out;
}

/** Give short transients room for their resonant tail and keep their combined peak below full scale. */
function layered(seconds, parts) {
  const out = new Float32Array(Math.round(seconds * RATE));
  for (const [part, at = 0, gain = 1] of parts) mix(out, part, at, gain);
  let peak = 0;
  for (const value of out) peak = Math.max(peak, Math.abs(value));
  const scale = peak > .86 ? .86 / peak : 1;
  const edge = Math.round(.003 * RATE);
  for (let index = 0; index < out.length; index++) out[index] *= scale * Math.min(1, index / edge, (out.length - 1 - index) / edge);
  return out;
}

/** The sounds of the game, by name. */
export const SOUNDS = {
  tap: () => tone(760, 0.12, { decay: 40, partials: [[1, 1], [2.7, 0.2]] }),
  shot: () => layered(.15, [
    [tone(225, .1, { decay: 48, partials: [[1, 1], [2.7, .2]], gain: .24, slide: -1.3 })],
    [noise(.07, { decay: 55, gain: .3, colour: .35, seed: 41 })],
    [noise(.1, { decay: 34, gain: .13, colour: .1, seed: 43 }), .018]
  ]),
  hit: () => layered(.13, [
    [noise(.08, { decay: 50, gain: .48, colour: .32, seed: 3 })],
    [tone(175, .12, { decay: 35, gain: .31, slide: -.8 })]
  ]),
  crit: () => layered(.28, [
    [noise(.1, { decay: 35, gain: .55, colour: .4, seed: 5 })],
    [tone(118, .19, { decay: 22, gain: .32, slide: -.6 })],
    [tone(1175, .25, { decay: 16, partials: [[1, 1], [2.76, .25]], gain: .16 }), .008]
  ]),
  paper: () => layered(.26, [
    [noise(.19, { decay: 18, gain: .36, colour: .13, seed: 9 })],
    [noise(.1, { decay: 30, gain: .17, colour: .22, seed: 47 }), .045],
    [tone(740, .22, { decay: 20, gain: .08 }), .03]
  ]),
  pop: () => layered(.3, [
    [tone(245, .24, { decay: 17, gain: .27, slide: -1.4 })],
    [noise(.15, { decay: 25, gain: .3, colour: .6, seed: 11 })],
    [tone(590, .2, { decay: 20, gain: .09 }), .045]
  ]),
  bite: () => mix(tone(70, 0.35, { decay: 12, partials: [[1, 1], [2, 0.3]], gain: 0.55 }), noise(0.25, { decay: 16, gain: 0.4, colour: 0.85, seed: 13 }), 0),
  spit: () => tone(240, 0.3, { decay: 10, gain: 0.18, slide: 1.5, partials: [[1, 1], [1.5, 0.5]] }),
  soul: () => tone(1560, 0.16, { decay: 28, partials: [[1, 1], [2, 0.2]], gain: 0.12 }),
  level: () => {
    const out = new Float32Array(Math.round(0.9 * RATE));
    [0, 3, 7, 10].forEach((step, i) => mix(out, tone(660 * 2 ** (step / 12), 0.7, { decay: 6, partials: [[1, 1], [2, 0.25], [3, 0.1]], gain: 0.16 }), i * 0.07));
    return out;
  },
  ward: () => tone(220, 1.4, { decay: 3.2, partials: [[1, 1], [2.76, 0.45], [5.4, 0.2], [8.9, 0.08]], gain: 0.3 }),
  chain: () => layered(.23, [
    [noise(.065, { decay: 34, gain: .4, colour: .08, seed: 17 })],
    [tone(985, .18, { decay: 21, gain: .13, slide: -1.5 })],
    [noise(.09, { decay: 35, gain: .16, colour: .15, seed: 53 }), .035]
  ]),
  mirror: () => tone(880, 0.6, { decay: 5, partials: [[1, 1], [1.5, 0.6], [2, 0.3]], gain: 0.16, slide: 0.3 }),
  ink: () => noise(0.4, { decay: 7, gain: 0.25, colour: 0.4, seed: 19, attack: 30 }),
  thunder: () => layered(1.35, [
    [noise(.17, { decay: 24, gain: .64, colour: .1, seed: 29 })],
    [tone(56, 1.15, { decay: 4, partials: [[1, 1], [1.47, .35]], gain: .35 }), .025],
    [noise(1.2, { decay: 3.7, gain: .7, colour: .9, seed: 23 }), .04],
    [noise(.22, { decay: 12, gain: .19, colour: .55, seed: 59 }), .14]
  ]),
  stomp: () => mix(tone(48, 0.7, { decay: 6, partials: [[1, 1], [1.5, 0.4]], gain: 0.7 }), noise(0.5, { decay: 8, gain: 0.35, colour: 0.9, seed: 31 }), 0),
  boss: () => {
    // A great gong struck twice.
    const out = new Float32Array(Math.round(3 * RATE)),
      gong = tone(98, 2.6, { decay: 1.6, partials: [[1, 1], [2.32, 0.6], [3.9, 0.35], [5.1, 0.2]], gain: 0.42, attack: 120 });
    return mix(mix(out, gong, 0), gong, 0.55, 0.7);
  },
  alert: () => layered(.8, [
    [tone(196, .7, { decay: 4.5, partials: [[1, 1], [2.32, .4]], gain: .25 })],
    [tone(147, .48, { decay: 5, partials: [[1, 1], [2.76, .25]], gain: .2 }), .23]
  ]),
  bossDown: () => layered(2.1, [
    [noise(.3, { decay: 14, gain: .5, colour: .65, seed: 61 })],
    [tone(73.42, 1.7, { decay: 2.7, partials: [[1, 1], [2.32, .45], [3.9, .15]], gain: .36 })],
    [tone(587.33, 1.25, { decay: 3.5, partials: [[1, 1], [2.76, .2]], gain: .16 }), .18],
    [noise(.5, { decay: 6, gain: .15, colour: .2, seed: 67 }), .05]
  ]),
  won: () => {
    const out = new Float32Array(Math.round(2.2 * RATE));
    [0, 2, 4, 7, 9, 12].forEach((step, i) => mix(out, tone(523.25 * 2 ** (step / 12), 1.2, { decay: 3.5, partials: [[1, 1], [2, 0.25]], gain: 0.18 }), i * 0.13));
    return out;
  },
  lost: () => {
    const out = new Float32Array(Math.round(2.4 * RATE));
    [7, 5, 3, 0].forEach((step, i) => mix(out, tone(196 * 2 ** (step / 12), 1, { decay: 3, partials: [[1, 1], [2, 0.3]], gain: 0.22 }), i * 0.35));
    return out;
  }
};

/** The night's music: 16 seconds that loop, quiet under the fight. */
export function nightMusic() {
  const seconds = 16,
    out = new Float32Array(seconds * RATE);
  // A low drone on D with a slow tremble, rising and falling.
  let phase = 0;
  for (let n = 0; n < out.length; n++) {
    const t = n / RATE,
      swell = 0.55 + 0.45 * Math.sin((2 * Math.PI * t) / seconds),
      vibrato = 1 + 0.004 * Math.sin(2 * Math.PI * 5 * t);
    phase += (2 * Math.PI * 73.42 * vibrato) / RATE;
    out[n] = (Math.sin(phase) + 0.45 * Math.sin(phase * 2) + 0.2 * Math.sin(phase * 3.01)) * 0.06 * swell;
  }
  // The wooden fish, steady, a little uneven.
  for (let beat = 0; beat < seconds / 0.75; beat++) mix(out, tone(beat % 4 === 0 ? 420 : 380, 0.12, { decay: 55, partials: [[1, 1], [2.4, 0.3]], gain: 0.18 }), beat * 0.75 + (beat % 3) * 0.01);
  // Plucks on the minor pentatonic, sparse.
  const scale = [293.66, 349.23, 392, 440, 523.25, 587.33],
    tune = [0, 2, 1, -1, 3, 2, 0, -1, 4, 3, 1, -1, 2, 0, 1, -1];
  tune.forEach((note, i) => {
    if (note < 0) return;
    mix(out, tone(scale[note], 1.2, { decay: 4.5, partials: [[1, 1], [2, 0.5], [3, 0.2], [4.2, 0.08]], gain: 0.09, attack: 900 }), i * 1 + 0.02);
  });
  // Fade the ends together so the loop does not click.
  const edge = Math.round(0.05 * RATE);
  for (let n = 0; n < edge; n++) {
    out[n] *= n / edge;
    out[out.length - 1 - n] *= n / edge;
  }
  return out;
}

/** How each sound plays: cooldowns, voices at once and a spread of pitch, so many at once stay clear. */
const CUES = {
  tap: {},
  shot: { cooldown: 0.075, maxVoices: 2, rate: [0.96, 1.04], volume: [.45, .58] },
  hit: { cooldown: 0.055, maxVoices: 3, rate: [0.94, 1.06], volume: [.55, .7] },
  crit: { cooldown: 0.12, maxVoices: 2, rate: [0.98, 1.02], volume: .82 },
  paper: { cooldown: 0.075, maxVoices: 2, rate: [.94, 1.08], volume: [.42, .58] },
  pop: { cooldown: 0.075, maxVoices: 2, rate: [.94, 1.06], volume: [.5, .65] },
  bite: { cooldown: 0.12, maxVoices: 2, rate: [0.9, 1.1] },
  spit: { cooldown: 0.2, maxVoices: 2, rate: [0.9, 1.1] },
  soul: { cooldown: 0.04, maxVoices: 3, rate: [0.9, 1.3], volume: 0.6 },
  level: { maxVoices: 1 },
  ward: { maxVoices: 1 },
  chain: { cooldown: 0.1, maxVoices: 2, rate: [0.9, 1.1] },
  mirror: { maxVoices: 1 },
  ink: { maxVoices: 1 },
  thunder: { maxVoices: 1 },
  stomp: { cooldown: 0.4, maxVoices: 1 },
  boss: { maxVoices: 1 },
  alert: { cooldown: 1, maxVoices: 1, volume: .8 },
  bossDown: { maxVoices: 1, volume: .9 },
  won: { maxVoices: 1 },
  lost: { maxVoices: 1 }
};

/**
 * The page's sound: the engine's mixer on a Web Audio backend, the sounds decoded onto it and played by cue. `on` is the
 * setting; music plays on its own bus, a little lower.
 */
export async function createSound(scope, { on = true } = {}) {
  let backend;
  try {
    backend = createWebAudioBackend({ limiter: true });
  } catch (cause) {
    if (cause?.code !== 'AUDIO_HOST_UNAVAILABLE') throw cause;
    console.warn('Web Audio is unavailable; Night Wardens continues without sound.');
    return { play() {}, async music() {}, setOn() {} };
  }
  const mixer = scope.use(createAudioMixer({ backend, locked: backend.locked, buses: [{ name: 'effects', volume: 0.8 }, { name: 'music', volume: 0.45 }] }));
  backend.attach(mixer);
  const decoded = {};
  await Promise.all(Object.entries(SOUNDS).map(async ([name, make]) => (decoded[name] = scope.use(await mixer.decode(encodeWav([make()], RATE))))));
  const cues = createAudioCues(mixer, Object.fromEntries(Object.entries(CUES).map(([name, cue]) => [name, { sounds: [decoded[name]], bus: 'effects', ...cue }])));
  let music = null;
  mixer.master.setMuted(!on);
  return {
    play(name, options) {
      if (decoded[name]) cues.play(name, options);
    },
    /** Starts the night's music, made the first time it is asked for. */
    async music(play = true) {
      if (!play) return mixer.stopMusic({ fade: 1.2 });
      music ??= scope.use(await mixer.decode(encodeWav([nightMusic()], RATE)));
      mixer.playMusic(music, { fade: 2, loop: true });
    },
    setOn: (value) => mixer.master.setMuted(!value)
  };
}
