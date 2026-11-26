// 声音：引擎的网页混音器，两条总线（音效、音乐）和限幅器。音效在页面里由 synth.mjs 现合成、编成 WAV 交给混音器解码；
// 曲子是预先渲染的 MP3，循环播放，换曲时淡入淡出。浏览器在玩家第一次按键或点击之前不出声，这里照常排队。
// Sound: the engine's web mixer with two buses (effects and music) and a limiter. Effects are made in the page by
// synth.mjs, encoded as WAV and decoded by the mixer; the pieces are MP3s rendered ahead of time, looped and
// cross-faded. The browser makes no sound until the player's first key or tap; requests before that queue as usual.
import { encodeWav } from '@egret/engine/kit';
import { createBrowserAudio } from '@egret/engine/web/audio';
import { EFFECTS, RATE } from './synth.mjs';

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

export function createSound(scope, { sound = true, music = true } = {}) {
  let audio;
  try {
    audio = scope.use(
      createBrowserAudio({
        buses: [
          { name: 'effects', volume: 0.8, muted: !sound },
          { name: 'music', volume: 0.42, muted: !music }
        ],
        limiter: true
      })
    );
  } catch (cause) {
    console.warn('sound', cause);
    return { play() {}, music() {}, setSound() {}, setMusic() {}, setHidden() {} };
  }
  const mixer = audio.mixer;
  const effects = new Map(),
    pieces = new Map();
  let queue = Promise.resolve(),
    wanted = null;
  const open = () => mixer.state !== 'closed';
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
      const ready = fetch(new URL(`../../assets/music/${name}.mp3`, import.meta.url))
        .then((r) => {
          if (!r.ok) throw Error(`HTTP ${r.status}`);
          return r.arrayBuffer();
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
  for (const name of Object.keys(EFFECTS)) prepareEffect(name);
  const state = { sound, music, hidden: false };
  const apply = () => {
    if (!open()) return;
    mixer.bus('effects').setMuted(!state.sound || state.hidden);
    mixer.bus('music').setMuted(!state.music || state.hidden);
  };
  return {
    play(name, { volume = 1, rate = 1 } = {}) {
      if (!open() || !EFFECTS[name]) return;
      const entry = prepareEffect(name);
      if (entry.buffer) mixer.play(entry.buffer, { bus: 'effects', volume, rate, maxInstances: 3 });
    },
    /** Play a piece, looping (or once for the closing jingle); null stops the music. */
    music(name) {
      if (!open() || wanted === name) return;
      wanted = name;
      if (!name) return void mixer.stopMusic({ fade: 0.8 });
      void preparePiece(name).then((buffer) => {
        if (buffer && wanted === name && open()) mixer.playMusic(buffer, { loop: name !== 'closed', fade: 1.2 });
      });
    },
    setSound: (on) => {
      state.sound = on;
      apply();
    },
    setMusic: (on) => {
      state.music = on;
      apply();
    },
    /** While the page or the mini game is hidden, both buses are quiet; coming back gives them back as set. */
    setHidden: (hidden) => {
      state.hidden = hidden;
      apply();
    }
  };
}
