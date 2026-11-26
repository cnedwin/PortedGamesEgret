// Original score and county sounds. Prepare audio only when the player uses it.
import { encodeWav } from '@egret/engine/kit';
import { createBrowserAudio } from '../vendor/engine/dist/web/audio.js';

const RATE = 22050;
const TAU = Math.PI * 2;
const SCORE = new URL('../assets/audio/peach-creek.mp3', import.meta.url);
const METAL = [[1, 1], [2.26, 0.26], [3.76, 0.16], [5.31, 0.07]];
const WOOD = [[1, 1], [2.9, 0.28], [5.4, 0.1]];
const STONE = [[1, 1], [2.37, 0.32], [4.12, 0.11]];
const STRING = [[1, 1], [2, 0.34], [3, 0.17], [4, 0.06]];

const ring = (at, hz, seconds, gain, partials = STONE, bend = 0) => ({ at, hz, seconds, gain, partials, bend });
const brush = (at, seconds, gain, colour) => ({ at, seconds, gain, colour });
const wood = (at, hz, gain) => ring(at, hz, 0.14, gain, WOOD, 0.035);
const notes = (pitches, spacing, gain) => pitches.map((hz, index) => ring(index * spacing, hz, 0.55, gain, STRING));

const CUES = {
  tap: [brush(0, 0.038, 0.19, 0.36), wood(0.002, 328, 0.21)],
  coins: [
    brush(0, 0.1, 0.11, 0.44),
    ring(0.005, 1416, 0.25, 0.21, METAL), ring(0.063, 1867, 0.27, 0.18, METAL),
    ring(0.13, 1174, 0.34, 0.19, METAL)
  ],
  mallet: [
    brush(0.002, 0.11, 0.21, 0.18), wood(0, 182, 0.44),
    brush(0.105, 0.06, 0.14, 0.28), wood(0.105, 242, 0.23)
  ],
  chime: [
    ring(0, 587.33, 0.7, 0.31), ring(0.12, 739.99, 0.73, 0.23),
    ring(0.25, 880, 0.85, 0.18)
  ],
  stone: [
    brush(0, 0.16, 0.13, 0.19), ring(0.035, 293.66, 0.88, 0.34),
    ring(0.16, 440, 0.78, 0.23), ring(0.32, 587.33, 0.84, 0.20)
  ],
  drum: [
    ring(0, 91, 0.4, 0.47, WOOD, 0.16), brush(0, 0.18, 0.3, 0.10),
    ring(0.29, 77, 0.63, 0.5, WOOD, 0.13), brush(0.29, 0.28, 0.25, 0.07)
  ],
  defense: [
    brush(0, 0.16, 0.31, 0.13), wood(0.015, 164, 0.37),
    brush(0.15, 0.13, 0.21, 0.19), ring(0.16, 397, 0.38, 0.26, METAL)
  ],
  deploy: [
    wood(0, 217, 0.27), brush(0.007, 0.10, 0.19, 0.13),
    wood(0.10, 197, 0.33), brush(0.10, 0.093, 0.17, 0.14),
    ring(0.19, 432, 0.49, 0.28, WOOD)
  ],
  win: [...notes([293.66, 369.99, 440, 587.33], 0.135, 0.31), ring(0.4, 293.66, 1.1, 0.16)],
  lose: [...notes([440, 369.99, 293.66], 0.19, 0.28), ring(0.39, 146.83, 0.93, 0.2, WOOD)]
};

/** A damped resonance and a filtered contact noise give each interaction a distinct material. */
export function renderCue(name) {
  const layers = CUES[name];
  const samples = new Float32Array(Math.ceil(Math.max(...layers.map((layer) => layer.at + layer.seconds)) * RATE));
  let random = 0x4531aec7;
  for (const layer of layers) {
    const length = Math.floor(layer.seconds * RATE);
    const first = Math.round(layer.at * RATE);
    let filtered = 0;
    for (let index = 0; index < length; index++) {
      const time = index / RATE;
      const progress = index / length;
      const edge = Math.min(1, time / 0.004, (1 - progress) * 12);
      let value = 0;
      if (layer.partials) {
        const phase = TAU * layer.hz * (time + layer.bend * (1 - Math.exp(-36 * time)) / 36);
        for (const [ratio, gain] of layer.partials) value += Math.sin(phase * ratio) * gain * Math.exp(-progress * (3.6 + ratio * 0.8));
      } else {
        random ^= random << 13;
        random ^= random >>> 17;
        random ^= random << 5;
        filtered += (((random >>> 0) / 0x80000000 - 1) - filtered) * layer.colour;
        value = filtered * Math.exp(-progress * 5);
      }
      samples[first + index] += edge * layer.gain * value;
    }
  }
  return samples;
}

export function createSound(game, { sound = true, music = true } = {}) {
  const decoded = new Map();
  let audio;
  let score;
  let soundOn = sound;
  let musicOn = music;
  let lastTurn = 0;

  function prepare() {
    if (!audio) {
      try {
        audio = game.scope.use(createBrowserAudio({
          limiter: true,
          buses: [{ name: 'effects', volume: 0.8 }, { name: 'score', volume: 0.72 }]
        }));
      } catch {
        // Audio setup is optional on browsers without Web Audio.
        return null;
      }
      if (audio.context.state === 'suspended') void audio.context.resume().catch(() => {});
    }
    return audio.mixer;
  }

  function startScore() {
    if (!musicOn) return;
    const mixer = prepare();
    if (!mixer) return;
    mixer.bus('score').setMuted(false);
    if (mixer.music) {
      mixer.music.resume();
      return;
    }

    // Load the compact original recording after the first gesture, outside the game's boot path.
    score ??= fetch(SCORE).then((response) => {
      if (!response.ok) throw new Error('Score unavailable');
      return response.arrayBuffer();
    }).then((bytes) => mixer.decode(bytes)).catch(() => {
      score = undefined;
      return null;
    });
    void score.then((track) => {
      if (track && musicOn && game.scope.state === 'open' && !mixer.music) {
        mixer.playMusic(track, { bus: 'score', volume: 0.68, loop: true, fade: 0.8 });
      }
    }).catch(() => {});
  }

  return {
    play(name) {
      if (!soundOn || !Object.hasOwn(CUES, name)) return;
      const mixer = prepare();
      if (!mixer) return;
      const at = performance.now();
      if (!decoded.has(name)) {
        const ready = mixer.decode(encodeWav([renderCue(name)], RATE)).catch(() => {
          decoded.delete(name);
          return null;
        });
        decoded.set(name, ready);
      }
      void decoded.get(name).then((clip) => {
        if (!clip || !soundOn || game.scope.state !== 'open' || performance.now() - at > 180) return;
        const rate = 1 + [0, -0.025, 0.018][lastTurn++ % 3];
        mixer.play(clip, { bus: 'effects', maxInstances: 2, rate });
      }).catch(() => {});
    },
    setSound(on) {
      soundOn = on;
      const mixer = audio?.mixer;
      mixer?.bus('effects').setMuted(!on);
      if (!on) mixer?.stopAll({ bus: 'effects' });
    },
    setMusic(on) {
      musicOn = on;
      if (on) startScore();
      else {
        audio?.mixer.bus('score').setMuted(true);
        audio?.mixer.music?.pause();
      }
    },
    start: startScore
  };
}
