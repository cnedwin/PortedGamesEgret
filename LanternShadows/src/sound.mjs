// The percussion of the play. A shadow play is accompanied by gongs, drums and clappers, and here every blow has
// its beat. Nothing is recorded: each sound is worked out from a few decaying tones and a burst of noise, written
// out as the bytes of a WAV file, and played through the engine's mixer.
import { createBrowserAudio } from '@egret/engine/web/audio';

const RATE = 32000;

function wav(samples) {
  const bytes = new Uint8Array(44 + samples.length * 2),
    view = new DataView(bytes.buffer),
    text = (at, value) => [...value].forEach((letter, i) => (bytes[at + i] = letter.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, RATE, true);
  view.setUint32(28, RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), true);
  return bytes;
}

/** Noise that is the same every time, so that a sound is the same every time. */
function noise(seed) {
  let state = seed >>> 0 || 1;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2147483648 - 1);
}

/**
 * A struck thing: `tones` are `[frequency, loudness, decay, bend]`, each a sine that dies away (decay is the
 * seconds to fall to about a third) and whose pitch slides by `bend` octaves as it does; `hiss` is a burst of noise
 * `[loudness, decay, brightness]`, brightness from 0 (dull) to 1 (sharp).
 */
function struck(seconds, tones, hiss, seed = 1) {
  const samples = new Float32Array(Math.round(seconds * RATE)),
    random = noise(seed),
    phases = tones.map(() => 0);
  let low = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / RATE;
    let value = 0;
    tones.forEach(([frequency, loudness, decay, bend = 0], n) => {
      phases[n] += (2 * Math.PI * frequency * 2 ** (bend * (1 - Math.exp(-t / decay)))) / RATE;
      value += loudness * Math.sin(phases[n]) * Math.exp(-t / decay);
    });
    if (hiss) {
      const raw = random();
      low += (raw - low) * (0.04 + 0.9 * hiss[2]);
      value += hiss[0] * low * Math.exp(-t / hiss[1]);
    }
    // A short ramp at each end keeps the cut from clicking.
    samples[i] = value * Math.min(1, t / 0.002, (seconds - t) / 0.01);
  }
  return wav(samples);
}

const SOUNDS = {
  // The clappers: two slabs of hardwood. The lightest beat, for a level blow.
  clap: () => struck(0.16, [[1850, 0.5, 0.012], [2760, 0.3, 0.008], [920, 0.25, 0.02]], [0.5, 0.012, 0.9], 3),
  // The small gong, whose pitch rises as it rings: for the blow that lifts.
  smallGong: () => struck(0.7, [[640, 0.42, 0.22, 0.16], [1290, 0.22, 0.16, 0.16], [1960, 0.12, 0.1, 0.16], [2630, 0.07, 0.07, 0.1]], [0.25, 0.02, 0.7], 5),
  // The great gong, whose pitch falls: for the blow that ends the combination.
  gong: () => struck(1.3, [[236, 0.5, 0.5, -0.12], [474, 0.3, 0.4, -0.12], [712, 0.2, 0.3, -0.1], [1160, 0.12, 0.2, -0.08], [1730, 0.07, 0.12]], [0.4, 0.03, 0.5], 7),
  // The drum: a low skin, for jumping off and landing.
  drum: () => struck(0.3, [[150, 0.8, 0.07, -0.5], [224, 0.3, 0.05, -0.4]], [0.3, 0.015, 0.25], 11),
  // The staff through the air, and the tumble of the cloud somersault: noise alone.
  swish: () => struck(0.2, [], [0.55, 0.05, 0.5], 13),
  whirl: () => struck(0.34, [[330, 0.12, 0.12, 0.9]], [0.5, 0.11, 0.3], 17),
  // A footfall on the terrace.
  tap: () => struck(0.07, [[420, 0.2, 0.012, -0.6]], [0.3, 0.008, 0.35], 19)
};

export function createSound() {
  const sounds = {};
  let audio, ready;
  // The mixer is made on the first press: a page may not sound before the player has touched it.
  const begin = () => {
    if (ready) return ready;
    ready = (async () => {
      audio = createBrowserAudio({ volume: 0.8, buses: [{ name: 'effects', volume: 1 }], onError: () => {} });
      await Promise.all(Object.entries(SOUNDS).map(async ([name, make]) => (sounds[name] = await audio.mixer.decode(make()))));
    })().catch(() => {});
    return ready;
  };
  for (const type of ['pointerdown', 'keydown']) addEventListener(type, begin, { once: true, capture: true });
  return {
    /** Makes the mixer and the sounds, if a press has not already; resolves when they can be played. */
    begin,
    /** Plays a sound by name. `pan` is from -1 (left) to 1; `rate` raises or lowers it. */
    play(name, { volume = 1, rate = 1, pan = 0 } = {}) {
      const sound = sounds[name];
      if (!sound || this.muted) return;
      try {
        audio.mixer.play(sound, { bus: 'effects', volume, rate, pan: Math.max(-1, Math.min(1, pan)), maxInstances: 4 });
      } catch {
        // A sound that cannot play is not worth stopping the play for.
      }
    },
    muted: false
  };
}
