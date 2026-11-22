// The original notes are rendered once. Egret owns playback, music looping,
// browser unlock, hidden-page suspension, volume and sound lifetimes.
import { createBrowserAudio } from '@egret/engine/web/audio';

/** Chords of the background loop as semitone offsets from A3. */
const CHORDS = [
  [3, 7, 10, 14],
  [10, 14, 17, 21],
  [0, 3, 7, 12],
  [8, 12, 15, 19],
];
const BEAT = 0.42;
const RATE = 32000;
const hz = semitone => 220 * 2 ** (semitone / 12);
const SCENE_MUSIC = new Set(['bailu-zero-night', 'bailu-zero-mystery', 'bailu-zero-warm', 'campus-social-day']);
const SETTINGS_KEY = 'love-elective-audio-v1';
const DIALOGUE_MUSIC_LEVEL = 0.23;
const DIALOGUE_MUSIC_ATTACK = 0.04;
const DIALOGUE_MUSIC_HOLD_MS = 120;
const DIALOGUE_MUSIC_RELEASE = 0.36;

/** Notes are [frequency, start, length, volume, waveform]. */
function tune() {
  const notes = [];
  for (let step = 0; step < 32; step++) {
    const chord = CHORDS[Math.floor(step / 8)], i = step % 8, start = step * BEAT;
    notes.push([hz(chord[[0, 1, 2, 3, 2, 1, 2, 3][i]] + 12), start, BEAT * 2.2, 0.05, 'triangle']);
    if (i === 0) {
      notes.push([hz(chord[0] - 12), start, BEAT * 7.5, 0.07]);
      notes.push([hz(chord[2]), start, BEAT * 7.5, 0.03]);
    }
    if (i === 4 && Math.floor(step / 8) % 2) notes.push([hz(chord[3] + 24), start, BEAT * 3, 0.025]);
  }
  return notes;
}
const EFFECTS = {
  tap: [[880, 0, 0.08, 0.05]],
  page: [[660, 0, 0.06, 0.03]],
  good: [[784, 0, 0.18, 0.06], [1175, 0.09, 0.3, 0.06]],
  bad: [[330, 0, 0.22, 0.05, 'triangle'], [262, 0.1, 0.3, 0.05, 'triangle']],
  heart: [1047, 1319, 1568, 2093].map((frequency, i) => [frequency, i * 0.08, 0.4, 0.05]),
};

/** A small PCM WAV lets the native mixer decode code-authored sound normally. */
async function render(notes, duration, loop = false) {
  const length = Math.ceil(duration * RATE), samples = new Float32Array(length);
  let index = 0;
  for (const [frequency, start, seconds, volume, kind] of notes) {
    const offset = Math.round(start * RATE), frames = Math.ceil((seconds + 0.01) * RATE);
    for (let i = 0; i < frames; i++) {
      const t = i / RATE, phase = frequency * t;
      const wave = kind === 'triangle' ? 1 - 4 * Math.abs((phase + 0.25) % 1 - 0.5) : Math.sin(2 * Math.PI * phase);
      const envelope = t < 0.02 ? volume * t / 0.02 :
        t < seconds ? volume * Math.exp(Math.log(0.0001 / volume) * (t - 0.02) / (seconds - 0.02)) :
          0.0001 * Math.max(0, 1 - (t - seconds) / 0.01);
      const at = loop ? (offset + i) % length : offset + i;
      if (at < length) samples[at] += wave * envelope;
    }
    // Yield while preparing the longer music so the first interaction can paint.
    if (++index % 8 === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }
  const bytes = new Uint8Array(44 + length * 2), header = new DataView(bytes.buffer);
  const text = (offset, value) => [...value].forEach((letter, i) => { bytes[offset + i] = letter.charCodeAt(0); });
  text(0, 'RIFF');
  header.setUint32(4, bytes.length - 8, true);
  text(8, 'WAVEfmt ');
  header.setUint32(16, 16, true);
  header.setUint16(20, 1, true);
  header.setUint16(22, 1, true);
  header.setUint32(24, RATE, true);
  header.setUint32(28, RATE * 2, true);
  header.setUint16(32, 2, true);
  header.setUint16(34, 16, true);
  text(36, 'data');
  header.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i++) header.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), true);
  return bytes;
}

export function createAudio() {
  const sounds = new Map();
  const files = new Map(), pendingFiles = new Map();
  let host, preparing, disposed = false, lastError;
  let desiredMusic = 'campus', musicRequest = 0, voiceRequest = 0, currentVoice, lastVoice;
  let musicDucked = false, musicRecovery;
  let musicDecode = Promise.resolve();
  const audio = { muted: false };
  const report = error => { lastError = error?.code ?? error?.message ?? String(error); };
  const preferences = {
    music: { muted: false, volume: 0.80 },
    effects: { muted: false, volume: 1 },
    voice: { muted: false, volume: 1 },
  };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null');
    for (const name of Object.keys(preferences)) {
      const value = saved?.[name];
      if (typeof value?.muted === 'boolean') preferences[name].muted = value.muted;
      if (Number.isFinite(value?.volume) && value.volume >= 0 && value.volume <= 1) preferences[name].volume = value.volume;
    }
  } catch { /* Defaults apply when browser storage is unavailable. */ }

  function mixMusic() {
    const bus = host?.mixer.bus('music');
    const volume = preferences.music.volume * (musicDucked ? DIALOGUE_MUSIC_LEVEL : 1);
    // Reapplying the same target restarts the engine's fade during scene changes.
    if (bus && bus.volume !== volume) {
      bus.setVolume(volume, { fade: musicDucked ? DIALOGUE_MUSIC_ATTACK : DIALOGUE_MUSIC_RELEASE });
    }
  }

  function duckMusicForVoice() {
    clearTimeout(musicRecovery);
    musicRecovery = undefined;
    musicDucked = true;
    mixMusic();
  }

  function recoverMusicAfterVoice() {
    if (!musicDucked || musicRecovery !== undefined) return;
    // Bridge the voice fade-out and brief gaps between adjacent lines.
    musicRecovery = setTimeout(() => {
      musicRecovery = undefined;
      musicDucked = false;
      mixMusic();
    }, DIALOGUE_MUSIC_HOLD_MS);
  }

  function releaseRetiredMusic() {
    const current = host?.mixer.music?.sound;
    for (const [key, sound] of files) {
      if (key.startsWith('music/') && sound !== current) {
        sound.release();
        files.delete(key);
      }
    }
  }

  async function loadFile(kind, id) {
    const key = kind + '/' + id;
    if (files.has(key)) return files.get(key);
    if (pendingFiles.has(key)) return pendingFiles.get(key);
    const loading = (async () => {
      const response = await fetch(new URL('../assets/audio/' + key + '.mp3', import.meta.url),
        { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Audio ' + response.status + ' ' + id);
      const bytes = await response.arrayBuffer();
      if (disposed) return;
      const decode = async () => {
        if (disposed) return;
        if (kind === 'music' && id !== (desiredMusic === 'campus' ? 'campus-social-day' : desiredMusic)) return;
        // Only the playing music and its replacement need decoded samples.
        // A fast second transition retires the oldest fading deck first.
        if (kind === 'music') releaseRetiredMusic();
        return host.mixer.decode(bytes);
      };
      const task = kind === 'music' ? musicDecode.then(decode) : decode();
      if (kind === 'music') musicDecode = task.catch(() => {});
      const sound = await task;
      if (!sound) return;
      if (disposed) { sound.release(); return; }
      if (kind === 'music' && id !== (desiredMusic === 'campus' ? 'campus-social-day' : desiredMusic)) {
        sound.release();
        return;
      }
      files.set(key, sound);
      return sound;
    })().finally(() => { pendingFiles.delete(key); });
    pendingFiles.set(key, loading);
    return loading;
  }

  async function applyMusic() {
    const requested = desiredMusic, token = ++musicRequest;
    try {
      const cue = requested === 'campus' ? 'campus-social-day' : requested;
      let sound;
      try { sound = await loadFile('music', cue); }
      catch (error) {
        report(error);
        if (requested === 'campus') sound = sounds.get('music');
      }
      if (!sound || disposed || token !== musicRequest || requested !== desiredMusic) return;
      const before = host.mixer.music;
      host.mixer.playMusic(sound, { bus: 'music', fade: 0.65 });
      if (before && before.sound !== sound) void before.ended.then(releaseRetiredMusic);
      mixMusic();
    } catch (error) { report(error); }
  }

  async function prepare() {
    if (preparing) return preparing;
    const current = host;
    const add = async (name, notes, duration, loop = false) => {
      if (sounds.has(name)) return;
      try {
        const bytes = await render(notes, duration, loop);
        if (disposed) return;
        const sound = await current.mixer.decode(bytes);
        if (disposed) sound.release();
        else sounds.set(name, sound);
      } catch (error) { report(error); }
    };
    preparing = Promise.all([
      add('music', tune(), CHORDS.length * 8 * BEAT, true),
      ...Object.entries(EFFECTS).map(([name, notes]) =>
        add(name, notes, Math.max(...notes.map(note => note[1] + note[2])) + 0.01)),
    ]).catch(report).finally(() => { preparing = undefined; });
    return preparing;
  }

  /** Entered directly from the player's touch or key to unlock browser sound. */
  function unlock() {
    if (disposed) return Promise.resolve();
    try {
      host ??= createBrowserAudio({
        muted: audio.muted, limiter: true, pauseWhenHidden: true,
        buses: Object.entries(preferences).map(([name, value]) => ({ name, ...value })), onError: report,
      });
      if (host.context.state === 'suspended') void host.context.resume().catch(report);
      return prepare();
    } catch (error) {
      report(error);
      return Promise.resolve();
    }
  }
  audio.unlock = () => unlock().then(() => { if (!disposed) void applyMusic(); }).catch(report);
  audio.setMuted = muted => {
    audio.muted = Boolean(muted);
    host?.mixer.master.setMuted(audio.muted);
    mixMusic();
  };
  /** kind: 'tap' | 'good' | 'bad' | 'heart' | 'page'. */
  audio.play = kind => {
    if (!host || disposed || audio.muted || preferences.effects.muted || !Object.hasOwn(EFFECTS, kind)) return;
    const play = () => {
      const sound = sounds.get(kind);
      if (!disposed && !audio.muted && !preferences.effects.muted && sound) {
        try { host.mixer.play(sound, { bus: 'effects', maxInstances: 4 }); }
        catch (error) { report(error); }
      }
    };
    if (sounds.has(kind)) play();
    else void prepare().then(play).catch(report);
  };
  /** The regular campus tune returns when the special episode closes. */
  audio.setMusic = scene => {
    if (scene !== 'campus' && !SCENE_MUSIC.has(scene)) return Promise.resolve();
    desiredMusic = scene;
    return unlock().then(() => { if (!disposed) return applyMusic(); }).catch(report);
  };
  audio.stopVoice = () => {
    voiceRequest++;
    currentVoice?.stop({ fade: 0.04 });
    currentVoice = undefined;
    recoverMusicAfterVoice();
  };
  /** Resolves on playback start; dialogue advance never waits for speech to end. */
  audio.voice = async id => {
    audio.stopVoice();
    if (!/^(bailu-zero-(0[1-9]|1[0-9]|2[0-2])|social-(pool|pajama|lounge)-0[1-5])$/.test(id)) return null;
    lastVoice = id;
    const token = voiceRequest;
    try {
      await unlock();
      if (disposed || token !== voiceRequest || audio.muted || preferences.voice.muted) return null;
      const sound = await loadFile('voice', id);
      if (!sound || disposed || token !== voiceRequest || audio.muted || preferences.voice.muted) return null;
      duckMusicForVoice();
      const voice = host.mixer.play(sound, { bus: 'voice', maxInstances: 1 });
      if (voice.state === 'ended') {
        recoverMusicAfterVoice();
        return null;
      }
      currentVoice = voice;
      void voice.ended.then(() => {
        if (currentVoice === voice) {
          currentVoice = undefined;
          recoverMusicAfterVoice();
        }
      });
      return voice;
    } catch (error) {
      if (token === voiceRequest) recoverMusicAfterVoice();
      report(error);
      return null;
    }
  };
  audio.replayVoice = () => lastVoice ? audio.voice(lastVoice) : Promise.resolve(null);
  audio.settings = () => Object.fromEntries(Object.entries(preferences).map(([name, values]) => [name, { ...values }]));
  audio.setBus = (name, values) => {
    if (!Object.hasOwn(preferences, name) || !values) return;
    const value = preferences[name];
    if (typeof values.muted === 'boolean') value.muted = values.muted;
    if (Number.isFinite(values.volume)) value.volume = Math.max(0, Math.min(1, values.volume));
    host?.mixer.bus(name).setMuted(value.muted);
    if (name === 'voice' && value.muted) audio.stopVoice();
    if (name !== 'music') host?.mixer.bus(name).setVolume(value.volume, { fade: 0.10 });
    mixMusic();
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(preferences)); } catch { /* Session settings still work. */ }
  };
  audio.snapshot = () => ({ ...host?.mixer.snapshot(), musicScene: desiredMusic,
    voiceId: currentVoice ? lastVoice : undefined, voicePosition: currentVoice?.position, error: lastError });
  audio.dispose = () => {
    if (disposed) return;
    audio.stopVoice();
    clearTimeout(musicRecovery);
    disposed = true;
    musicRequest++;
    host?.dispose();
    sounds.clear();
    files.clear();
  };
  return audio;
}
