// Original modal scores and short instrument sounds. The native Egret mixer
// owns the Web Audio graph, trusted-gesture unlock and hidden-page suspension.
import { encodeWav } from '@egret/engine/kit';
import { createBrowserAudio } from '@egret/engine/web/audio';
import { RATE, SOUNDS, CUE_PROFILE } from './synthesis.mjs';
export { RATE, tone, SOUNDS } from './synthesis.mjs';

const MIB = 1024 * 1024;
const BUDGET = 112 * MIB;
const TRACKS = Object.freeze({ title: 101.053, realm: 120, battle: 106.667 });
const clamp = (value, fallback = 1) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

/**
 * Effects are prepared once. Compressed scores load on scene entry, keeping at
 * most two decoded music decks (not three full stereo songs in phone memory).
 * A failed or superseded load leaves the current music and gameplay intact.
 */
export async function createSound(scope, { sound = true, music = true, musicVolume = .55, effectsVolume = .8 } = {}, {onThemeFailure} = {}) {
  let disposed = false, wanted = null, request = 0, queue = Promise.resolve(), pending = null;
  let musicLevel = clamp(musicVolume, .55), effectsLevel = clamp(effectsVolume, .8);
  let soundOn = !!sound, musicOn = !!music, duckUntil = 0, duckTimer;
  const errors = [], scores = new Map(), effects = new Map(), controllers = new Set(), musicVoices = new Set();
  const played = new Map(), variants = new Map(), impacts = [];
  const counts = { effects: 0, rateLimited: 0, dense: 0, loads: 0, transitions: 0 };
  let nativeAudio;
  try { nativeAudio = createBrowserAudio({
    buses: [{ name: 'effects', volume: effectsLevel, muted: !soundOn }, { name: 'music', volume: musicLevel, muted: !musicOn }],
    limiter: true, pauseWhenHidden: true, maxVoices: 24, maxDecodedBytes: BUDGET,
    onError: error => remember(error)
  }); } catch (error) {
    if (error?.code !== 'AUDIO_HOST_UNAVAILABLE') throw error;
    // Some browser hosts omit Web Audio entirely. Music/effects are optional;
    // leave the game usable rather than failing its startup. Real Web Audio
    // hosts still follow Egret's normal gesture-unlock and mixer path below.
    remember(error);
    return {
      play() { return null; },
      theme(name) { wanted = name ?? null; return Promise.resolve(null); },
      setSound(on) { soundOn = !!on; },
      setMusic(on) { musicOn = !!on; },
      setVolumes({music: nextMusic, effects: nextEffects} = {}) {
        if (nextMusic !== undefined) musicLevel = clamp(nextMusic, musicLevel);
        if (nextEffects !== undefined) effectsLevel = clamp(nextEffects, effectsLevel);
      },
      snapshot() { return { state: 'unavailable', wanted, cache: [], budgetBytes: BUDGET,
        levels: {music: musicLevel, effects: effectsLevel}, soundOn, musicOn, ducked: false,
        counters: {...counts}, errors: [...errors] }; },
      get state() { return 'unavailable'; },
      get music() { return wanted; },
    };
  }
  const audio = scope.use(nativeAudio);
  const mixer = audio.mixer;
  function remember(error) {
    errors.push(String(error?.code ?? error?.message ?? error));
    if (errors.length > 8) errors.shift();
  }
  function applyMusicLevel(fade = 0) {
    mixer.bus('music').setVolume(musicLevel * (performance.now() < duckUntil ? .48 : 1), { fade });
  }
  function duck(milliseconds) {
    duckUntil = Math.max(duckUntil, performance.now() + milliseconds);
    applyMusicLevel(.025);
    clearTimeout(duckTimer);
    const restore = () => {
      if (disposed) return;
      const left = duckUntil - performance.now();
      if (left > 0) duckTimer = setTimeout(restore, left + 2);
      else applyMusicLevel(.60);
    };
    duckTimer = setTimeout(restore, milliseconds + 2);
  }
  // Register before asynchronous decode: closing during initialization must not
  // retain a partly prepared bank or let a late request resurrect a music deck.
  scope.use({ dispose() {
    if (disposed) return;
    disposed = true; request++;
    clearTimeout(duckTimer);
    for (const controller of controllers) controller.abort();
    controllers.clear();
    for (const voice of musicVoices) voice.stop();
    musicVoices.clear();
    for (const entry of scores.values()) entry.sound.release();
    scores.clear();
    for (const bank of effects.values()) for (const entry of bank) entry.release();
    effects.clear();
  } });

  for (const [name, make] of Object.entries(SOUNDS)) {
    const bank = [];
    effects.set(name, bank);
    for (let i = 0; i < (CUE_PROFILE[name].variants ?? 1); i++) {
      try {
        const entry = await mixer.decode(encodeWav([make(i)], RATE));
        if (disposed) { entry.release(); break; }
        bank.push(entry);
      } catch (error) {
        if (!disposed) remember(error);
      }
    }
    if (disposed) break;
  }

  async function retire(name) {
    const entry = scores.get(name);
    if (!entry) return;
    // A third rapid scene switch may still have a fading former deck. Give it
    // a short ramp, using wall time so suspension cannot strand the decode queue.
    let fading = false;
    for (const voice of musicVoices) if (voice.sound === entry.sound && voice.state !== 'ended') {
      voice.stop({ fade: .025 }); fading = true;
    }
    if (fading) await delay(40);
    entry.sound.release(); scores.delete(name);
  }
  async function makeRoom(name) {
    const estimate = Math.ceil(TRACKS[name] * audio.context.sampleRate) * 2 * 4;
    // At 44.1/48kHz two decks crossfade. Unusually high-rate output devices may
    // need to retire the current deck first rather than exceed decoded memory.
    for (const [other, entry] of [...scores]) {
      if (other === name) continue;
      if (scores.size < 2 && mixer.snapshot().decodedBytes + estimate <= BUDGET) break;
      if (entry.sound === mixer.music?.sound && scores.size > 1) continue;
      await retire(other);
    }
    if (mixer.snapshot().decodedBytes + estimate > BUDGET) {
      for (const other of [...scores.keys()]) if (other !== name) await retire(other);
    }
  }
  async function enterTheme(name, token) {
    if (disposed || wanted !== name || token !== request) return null;
    let entry = scores.get(name);
    if (!entry) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      controllers.add(controller);
      let bytes;
      try {
        const response = await fetch(new URL(`../../assets/audio/${name}-score.mp3`, import.meta.url), { signal: controller.signal });
        if (!response.ok) throw new Error(`Music ${name}: HTTP ${response.status}`);
        bytes = await response.arrayBuffer();
      } finally {
        clearTimeout(timeout); controllers.delete(controller);
      }
      if (disposed || wanted !== name || token !== request) return null;
      await makeRoom(name);
      if (disposed || wanted !== name || token !== request) return null;
      const decoded = await mixer.decode(bytes);
      if (disposed || wanted !== name || token !== request) { decoded.release(); return null; }
      entry = { sound: decoded };
      scores.set(name, entry); counts.loads++;
    }
    if (disposed || wanted !== name || token !== request) return null;
    const before = mixer.music;
    const voice = mixer.playMusic(entry.sound, { bus: 'music', fade: .85 });
    musicVoices.add(voice);
    voice.ended.then(() => musicVoices.delete(voice));
    if (voice !== before) counts.transitions++;
    return voice;
  }

  return {
    play(name, { volume = 1, rate = 1, pan = 0 } = {}) {
      const bank = effects.get(name), profile = CUE_PROFILE[name];
      if (disposed || !soundOn || !bank?.length) return null;
      const now = performance.now();
      if (now - (played.get(name) ?? -Infinity) < profile.gap) { counts.rateLimited++; return null; }
      if (profile.impact) {
        while (impacts.length && now - impacts[0] > 1000) impacts.shift();
        if (impacts.length >= 6) { counts.dense++; return null; }
        impacts.push(now);
      }
      const index = (variants.get(name) ?? 0) % bank.length;
      variants.set(name, index + 1); played.set(name, now);
      const voice = mixer.play(bank[index], {
        bus: 'effects', volume: clamp(volume), rate: Number.isFinite(rate) ? Math.min(2, Math.max(.5, rate)) : 1,
        pan: Number.isFinite(pan) ? Math.min(1, Math.max(-1, pan)) : 0, maxInstances: profile.max
      });
      counts.effects++;
      if (profile.duck) duck(profile.duck);
      return voice;
    },
    theme(name) {
      if (disposed || (name !== null && name !== undefined && !Object.hasOwn(TRACKS, name))) return Promise.resolve(null);
      name = name ?? null;
      if (wanted === name && pending) return pending;
      wanted = name;
      const token = ++request;
      for (const controller of controllers) controller.abort();
      if (name === null) { mixer.stopMusic({ fade: .65 }); return Promise.resolve(null); }
      // A rejection must not poison later scene requests; callers may safely
      // fire-and-forget a title request that occurs before the first gesture.
      const task = queue.then(() => enterTheme(name, token)).catch(error => {
        // A current timeout/refused fetch is a genuine recoverable resource
        // failure. Superseded and disposed requests must not raise a prompt.
        if(!disposed&&token===request){
          remember(error);
          if(musicOn&&onThemeFailure)onThemeFailure(name);
        }
        return null;
      });
      queue = task.then(() => undefined);
      pending = task;
      task.finally(() => { if (pending === task) pending = null; });
      return task;
    },
    setSound(on) { soundOn = !!on; mixer.bus('effects').setMuted(!soundOn); },
    setMusic(on) { musicOn = !!on; mixer.bus('music').setMuted(!musicOn); },
    setVolumes({ music: nextMusic, effects: nextEffects } = {}) {
      if (nextMusic !== undefined) musicLevel = clamp(nextMusic, musicLevel);
      if (nextEffects !== undefined) effectsLevel = clamp(nextEffects, effectsLevel);
      applyMusicLevel(.05); mixer.bus('effects').setVolume(effectsLevel, { fade: .05 });
    },
    snapshot() {
      return { ...mixer.snapshot(), wanted, cache: [...scores.keys()], budgetBytes: BUDGET,
        levels: { music: musicLevel, effects: effectsLevel }, ducked: performance.now() < duckUntil,
        counters: { ...counts }, errors: [...errors] };
    },
    get state() { return mixer.state; },
    get music() { return wanted; }
  };
}
