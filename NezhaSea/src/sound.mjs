// Independently mix the score and the action. Music transitions use the engine's own crossfade.
import { createBrowserAudio } from '../vendor/engine/dist/web/audio.js';
import { renderWavs } from './audio-synth.mjs';

const MOODS = { title: .66, battle: .65, boss: .64, market: .62 };
const ALIASES = { gong: 'boss' };
const IMPORTANT = new Set(['ouch', 'levelUp', 'boss', 'wave', 'divine', 'win', 'lose']);
const REPEAT = { hitSoft: .09, splash: .12, pearl: .11, nova: .18, land: .14, ouch: .19, boss: .8 };
const PITCHES = [1, .979, 1.027, .993];

async function renderOffThread(signal, phase) {
  if (signal.aborted) throw signal.reason;
  if (typeof Worker === 'function') {
    try {
      const worker = new Worker(new URL('./audio-render.mjs', import.meta.url), { type: 'module' });
      return await new Promise((resolve, reject) => {
        function settle(complete, value) {
          worker.terminate();
          signal.removeEventListener('abort', abort);
          complete(value);
        }
        const abort = () => settle(reject, signal.reason);
        worker.addEventListener('message', ({data}) => settle(resolve, data), { once: true });
        worker.addEventListener('error', (error) => {
          error.preventDefault();
          settle(reject, error);
        }, { once: true });
        signal.addEventListener('abort', abort, { once: true });
        try {
          worker.postMessage({ phase });
        } catch (error) {
          settle(reject, error);
        }
      });
    } catch (error) {
      if (signal.aborted) throw error;
    }
  }
  return renderWavs(phase);
}

/** The score keeps its position under the music switch, and the effects switch is separate. */
export function createSound(game, { on = true, music = true } = {}) {
  game.sfx.muted = true;
  const owner = game.scope;
  let audio;
  try {
    audio = owner.use(createBrowserAudio({
      buses: ['music', 'effects'], limiter: true, maxVoices: 14, maxDecodedBytes: 40 * 1024 * 1024
    }));
  } catch (cause) {
    if (cause?.code !== 'AUDIO_HOST_UNAVAILABLE') throw cause;
    // Missing browser audio is not a failed character atlas or other game asset.
    console.warn('Web Audio is unavailable; NezhaSea continues without sound.');
    const silent = () => {};
    return Object.assign(silent, { setOn() {}, setMusic() {}, music() {}, stopMusic() {}, pause() {}, resume() {} });
  }
  const { mixer, context } = audio;
  const musicBus = mixer.bus('music'), effectBus = mixer.bus('effects');
  musicBus.setMuted(!music);
  effectBus.setMuted(!on);
  const recent = new Map(), effects = new Map(), songs = new Map();

  // Decode short effects once. A cold title never waits for their synthesis.
  renderOffThread(owner.signal).then((tracks) => Promise.all(Object.entries(tracks).map(async ([name, wav]) => {
    effects.set(name, await mixer.decode(wav));
  }))).catch(() => {});

  let generation = 0, wanted = null, playing = null, intensity = 0.3;
  const scoreVolume = (phase) => MOODS[phase] * (0.84 + 0.19 * intensity);
  function startScore(phase) {
    const revision = ++generation;
    let waiting = songs.get(phase);
    if (!waiting) {
      waiting = renderOffThread(owner.signal, phase).then(({ track }) => mixer.decode(track)).catch((error) => {
        songs.delete(phase);
        throw error;
      });
      songs.set(phase, waiting);
    }
    waiting.then((decoded) => {
      if (owner.signal.aborted || revision !== generation || wanted !== phase || musicBus.muted) return;
      mixer.playMusic(decoded, { bus: 'music', volume: scoreVolume(phase), fade: 0.58 });
      playing = phase;
    }).catch(() => {});
  }

  const sound = (name, { volume = 1, pitch, every = 0.05 } = {}) => {
    if (effectBus.muted || mixer.state !== 'running') return;
    name = ALIASES[name] ?? name;
    const effect = effects.get(name);
    if (!effect) return;
    const priority = IMPORTANT.has(name);
    // Keep rapid hits out of the reserved room for damage, promotions and major cues.
    if (effectBus.voices >= (priority ? 10 : 6)) return;
    const limit = Math.max(every, REPEAT[name] ?? 0.05);
    const now = context.currentTime, previous = recent.get(name);
    if (previous && now - previous.at < limit) return;
    const count = (previous === undefined ? 0 : previous.count + 1) % PITCHES.length;
    recent.set(name, { at: now, count });
    const scale = priority ? (name === 'boss' ? 0.87 : 0.91) : 0.77;
    mixer.play(effect, {
      bus: 'effects', volume: Math.max(0, Math.min(1, volume * scale)),
      rate: pitch ?? (priority ? 1 : PITCHES[count]), maxInstances: priority ? 1 : 2
    });
  };

  sound.setOn = (value) => effectBus.setMuted(!value);
  sound.setMusic = (value) => {
    musicBus.setMuted(!value);
    if (value && wanted && playing !== wanted) startScore(wanted);
  };
  sound.music = (phase, share = 0.3) => {
    const next = phase === 'calm' ? 'market' : phase;
    if (MOODS[next] === undefined) return;
    intensity = Math.max(0.15, Math.min(1, share));
    if (wanted !== next) {
      wanted = next;
      if (!musicBus.muted) startScore(next);
    } else if (playing === next && mixer.music && Math.abs(mixer.music.volume - scoreVolume(next)) > 0.012) {
      mixer.music.setVolume(scoreVolume(next), { fade: 0.3 });
    }
  };
  sound.stopMusic = () => {
    wanted = null;
    playing = null;
    generation++;
    mixer.stopMusic({ fade: 0.58 });
  };
  sound.pause = () => mixer.suspend('game');
  sound.resume = () => mixer.resume('game');
  return sound;
}
