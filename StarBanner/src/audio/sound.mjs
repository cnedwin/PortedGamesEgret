// 短音效实时合成，长配乐从原曲谱预先生成，避免主线程在开战和换回合时合成整首曲子。
// Short effects are synthesized on demand. The longer pieces are rendered from the same scores ahead of time
// so opening a battle and changing turns do not require synthesizing a whole piece on the main thread.
import { encodeWav } from '@egret/engine/kit';
import { createBrowserAudio } from '@egret/engine/web/audio';
import { EFFECTS, RATE } from './synth.mjs';
import { assetUrl } from '../asset-url.mjs';

const MUSIC_LEVEL = 0.42;
const TURN_PIECES = ['dawn', 'raven'];
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

export function createSound(scope, { sound = true, music = true } = {}) {
  const audio = scope.use(
    createBrowserAudio({
      buses: [
        { name: 'effects', volume: 0.85, muted: !sound },
        { name: 'music', volume: MUSIC_LEVEL, muted: !music }
      ],
      limiter: true
    })
  );
  const mixer = audio.mixer;
  const effects = new Map(),
    pieces = new Map();
  let queue = Promise.resolve();
  let wanted = null;
  const open = () => mixer.state !== 'closed';
  /** Prepare the short effects in small tasks; music loading is independent of this queue. */
  function prepareEffect(name) {
    if (effects.has(name)) return effects.get(name);
    const entry = { buffer: null };
    entry.ready = queue = queue
      .then(nextTask)
      .then(() => (open() ? mixer.decode(encodeWav([EFFECTS[name]()], RATE)) : null))
      .then((buffer) => (entry.buffer = buffer))
      .catch((cause) => {
        console.warn('sound', name, cause);
        return null;
      });
    effects.set(name, entry);
    return entry;
  }
  function preparePiece(name) {
    if (!pieces.has(name)) {
      const ready = fetch(assetUrl(`music/${name}.mp3`))
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.arrayBuffer();
        })
        .then((bytes) => (open() ? mixer.decode(new Uint8Array(bytes)) : null))
        .catch((cause) => {
          pieces.delete(name);
          console.warn('sound', name, cause);
          return null;
        });
      pieces.set(name, ready);
    }
    return pieces.get(name);
  }
  // The interface sounds first, then the rest.
  for (const name of Object.keys(EFFECTS)) prepareEffect(name);
  return {
    play(name, { volume = 1, rate = 1 } = {}) {
      if (!open() || !EFFECTS[name]) return;
      const entry = prepareEffect(name);
      if (entry.buffer) mixer.play(entry.buffer, { bus: 'effects', volume, rate, maxInstances: 4 });
    },
    /** Play a piece (looping, or once for a jingle); null stops the music. */
    music(name) {
      if (!open() || wanted === name) return;
      wanted = name;
      if (!name) {
        mixer.stopMusic({ fade: 0.5 });
        return;
      }
      const jingle = name === 'victory' || name === 'defeat';
      void preparePiece(name).then((buffer) => {
        if (buffer && wanted === name && open()) mixer.playMusic(buffer, { loop: !jingle, fade: 0.6 });
        // Let the requested cue load first; the next player/AI turn can then cross-fade immediately.
        if (!jingle && open()) for (const turn of TURN_PIECES) if (turn !== name) void preparePiece(turn);
      });
    },
    setSound: (on) => mixer.bus('effects').setMuted(!on),
    setMusic: (on) => mixer.bus('music').setMuted(!on)
  };
}
