// 声音：引擎的混音器分两路总线（音乐、音效），由网页的 Web Audio 发声；所有声音由 synth.mjs 合成。
// Sound: the engine's mixer with two buses, music and effects, sounding through the page's Web Audio. The
// sounds are made by synth.mjs and handed to the mixer as WAV bytes the kit encodes. The mixer waits for the
// first press of the page before it sounds, as a browser asks.
import { encodeWav } from '@egret/engine/kit';
import { createBrowserAudio } from '@egret/engine/web/audio';
import { EFFECTS, RATE, music } from './synth.mjs';

/** What each event of the city sounds like, and how loud. */
const FOR_EVENT = {
  shot: ['shot', 0.8],
  break: ['crack', 0.9],
  cut: ['snap', 0.8],
  tip: ['thump', 0.9],
  spring: ['boing', 0.7],
  plate: ['grind', 0.7],
  boom: ['boom', 1],
  lock: ['unlock', 0.9],
  win: ['victory', 0.9],
  lose: ['fail', 0.8]
};

/** The two buses of the game: music under the effects, so the clatter of the city is heard over it. */
export const BUSES = [
  { name: 'music', volume: 0.5 },
  { name: 'effects', volume: 0.85 }
];

/** The page's sound: a mixer on Web Audio from `createBrowserAudio`, with the game's sounds on it. */
export async function createSound(scope, settings = {}) {
  let audio;
  try {
    audio = scope.use(createBrowserAudio({ buses: BUSES, limiter: true }));
  } catch (cause) {
    if (cause?.code !== 'AUDIO_HOST_UNAVAILABLE') throw cause;
    // A browser may omit Web Audio altogether; sound must not gate the game's title.
    console.warn('Web Audio is unavailable; Mechanism City continues without sound.');
    return { play() {}, event() {}, async music() {}, setEffects() {}, setMusic() {} };
  }
  return soundBoard(audio.mixer, scope, settings);
}

/**
 * The game's sounds on any engine mixer: the page's, or one made by `createAudioMixer` over another backend
 * (the tests use one that only records what it is asked to play).
 */
export async function soundBoard(mixer, scope, { effects = true, music: musicOn = true } = {}) {
  const decode = (channel) => mixer.decode(encodeWav([channel], RATE));
  const sounds = {};
  // Short sounds are decoded whole; they are small.
  await Promise.all(Object.entries(EFFECTS).map(async ([name, make]) => (sounds[name] = scope.use(await decode(make())))));
  const pieces = {};
  /** The two pieces are made the first time they are asked for: making one takes a moment. */
  async function piece(name) {
    pieces[name] ??= decode(name === 'city' ? music({ bars: 16, tempo: 84, seed: 7, mood: 1 }) : music({ bars: 12, tempo: 66, seed: 3, mood: 0 })).then((sound) => scope.use(sound));
    return pieces[name];
  }
  mixer.bus('effects').setMuted(!effects);
  mixer.bus('music').setMuted(!musicOn);

  return {
    mixer,
    /** Play a named sound. `rate` shifts its pitch, `pan` from -1 (left) to 1 (right). */
    play(name, { volume = 1, rate = 1, pan = 0 } = {}) {
      const sound = sounds[name];
      if (sound) mixer.play(sound, { bus: 'effects', volume, rate, pan, maxInstances: 4 });
    },
    /** What the city does, heard: the place of the event pans it, its force sets how loud. */
    event(event, viewX = 0.5) {
      const pan = Math.max(-0.8, Math.min(0.8, (viewX - 0.5) * 1.6));
      if (event.type === 'hit' && event.speed > 140) {
        const name = event.on === 'block' || event.on === 'crate' || event.on === 'seesaw' ? 'wood' : event.on === 'gate' || event.on === 'lock' || event.on === 'spring' ? 'metal' : 'stone';
        this.play(name, { volume: Math.min(1, event.speed / 900), rate: 0.9 + Math.random() * 0.2, pan });
        return;
      }
      const cue = FOR_EVENT[event.type];
      if (cue) this.play(cue[0], { volume: cue[1], pan });
      if (event.type === 'score' && event.combo > 1) this.play('tap', { volume: 0.5, rate: 1 + event.combo * 0.12 });
    },
    async music(name) {
      mixer.playMusic(await piece(name), { fade: 1.2 });
    },
    setEffects: (on) => mixer.bus('effects').setMuted(!on),
    setMusic: (on) => mixer.bus('music').setMuted(!on)
  };
}
