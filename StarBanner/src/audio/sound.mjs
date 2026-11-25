// 声音：把 src/audio/synth.mjs 合成的音效和曲子交给引擎的混音器，由网页的 Web Audio 发声。音效和音乐各走一条总线，
// 可分别开关；曲子在后台一段段合成，合成好之前不出声也不卡画面。第一次按键或触屏之后才响，这是浏览器的要求。
// Sound: the effects and pieces made by src/audio/synth.mjs, handed to the engine's mixer and played through the
// page's Web Audio. Effects and music each have a bus that can be turned off; pieces are synthesized in the background
// one at a time, silent until ready and never holding up the picture. Nothing sounds before the first key or touch,
// as browsers ask.
import { encodeWav } from '@egret/engine/kit';
import { createBrowserAudio } from '@egret/engine/web/audio';
import { EFFECTS, PIECES, RATE, renderPiece } from './synth.mjs';

const MUSIC_LEVEL = 0.42;
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
  /** Makes (once) and decodes a buffer, one at a time with a breath between, so the page stays smooth. */
  function prepare(cache, name, make) {
    if (cache.has(name)) return cache.get(name);
    const entry = { buffer: null };
    entry.ready = queue = queue
      .then(nextTask)
      .then(() => (open() ? mixer.decode(encodeWav([make()], RATE)) : null))
      .then((buffer) => (entry.buffer = buffer))
      .catch((cause) => {
        console.warn('sound', name, cause);
        return null;
      });
    cache.set(name, entry);
    return entry;
  }
  // The interface sounds first, then the rest.
  for (const name of ['cursor', 'select', 'confirm', 'cancel', ...Object.keys(EFFECTS)]) prepare(effects, name, EFFECTS[name]);
  return {
    play(name, { volume = 1, rate = 1 } = {}) {
      if (!open() || !EFFECTS[name]) return;
      const entry = prepare(effects, name, EFFECTS[name]);
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
      const entry = prepare(pieces, name, () => renderPiece(PIECES[name], { loop: !jingle }));
      void entry.ready.then((buffer) => {
        if (buffer && wanted === name && open()) mixer.playMusic(buffer, { loop: !jingle, fade: 0.6 });
      });
    },
    setSound: (on) => mixer.bus('effects').setMuted(!on),
    setMusic: (on) => mixer.bus('music').setMuted(!on)
  };
}
