import { CUES } from './audio-cues.mjs';

const ASSETS = new URL('../../assets/audio/', import.meta.url);
const TRACKS = new Set(['title', 'shanjiao', 'chijiao', 'hundun']);
const MUTE_KEY = 'fivephases.audio.muted';
const MUSIC_LEVEL = 0.38;
const EFFECT_LEVEL = 0.73;
const MAX_VOICES = 8;
const FADE = 0.44;

function persistedMute() {
  try {
    return globalThis.localStorage?.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function createAudio() {
  let context = null;
  let master;
  let music;
  let effects;
  let muted = persistedMute();
  let scene = null;
  let playing = null;
  let pendingTrack = null;
  let bank = null;
  let bankLoad = null;
  const voices = new Set();
  const lastCue = new Map();

  const audible = () => context?.state === 'running' && !muted;

  async function decode(filename, signal) {
    const response = await fetch(new URL(filename, ASSETS), { signal });
    if (!response.ok) throw new Error('Could not load game audio: ' + filename);
    const bytes = await response.arrayBuffer();
    if (signal?.aborted) throw signal.reason;
    return context.decodeAudioData(bytes);
  }

  function prepareBank() {
    if (bank || bankLoad) return;
    bankLoad = decode('effects.mp3')
      .then((decoded) => {
        bank = decoded;
      })
      .catch(() => {}) // A failed download leaves the game playable. Retry on a later gesture.
      .finally(() => {
        bankLoad = null;
      });
  }

  function fadeTrack(track) {
    if (!track) return;
    const at = context.currentTime;
    track.level.gain.cancelScheduledValues(at);
    track.level.gain.setTargetAtTime(0, at, FADE / 5);
    track.source.stop(at + FADE);
  }

  function stopLoadingTrack() {
    pendingTrack?.abort.abort();
    pendingTrack = null;
  }

  function syncMusic() {
    if (!audible() || !scene) {
      stopLoadingTrack();
      fadeTrack(playing);
      playing = null;
      return;
    }
    if (pendingTrack?.name === scene) return;
    stopLoadingTrack();
    if (playing?.name === scene) return;

    const request = { name: scene, abort: new AbortController() };
    pendingTrack = request;
    decode(request.name + '.mp3', request.abort.signal).then((decoded) => {
      // Decode may finish after another scene or mute has won the race.
      if (pendingTrack !== request || !audible() || scene !== request.name) return;
      const source = context.createBufferSource();
      const level = context.createGain();
      source.buffer = decoded;
      source.loop = true;
      source.connect(level).connect(music);
      source.onended = () => {
        source.disconnect();
        level.disconnect();
      };
      const at = context.currentTime;
      level.gain.setValueAtTime(0, at);
      level.gain.linearRampToValueAtTime(1, at + FADE);
      source.start(at);
      fadeTrack(playing);
      playing = { name: request.name, source, level };
    }).catch(() => {}).finally(() => {
      if (pendingTrack === request) pendingTrack = null;
    });
  }

  function activate() {
    if (!audible()) return;
    prepareBank();
    syncMusic();
  }

  /** Call from a user gesture so playback works with mobile autoplay policies. */
  function unlock() {
    if (context?.state === 'running') {
      activate();
      return;
    }
    // On a touch screen, pointerdown precedes activation. pointerup/click can retry.
    if (globalThis.navigator?.userActivation?.isActive === false) return;
    try {
      if (!context) {
        const Audio = globalThis.AudioContext ?? globalThis.webkitAudioContext;
        if (!Audio) return;
        context = new Audio();
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -9;
        limiter.knee.value = 7;
        limiter.ratio.value = 9;
        limiter.attack.value = 0.004;
        limiter.release.value = 0.095;
        limiter.connect(context.destination);
        master = context.createGain();
        master.gain.value = muted ? 0 : 0.94;
        master.connect(limiter);
        music = context.createGain();
        music.gain.value = MUSIC_LEVEL;
        music.connect(master);
        effects = context.createGain();
        effects.gain.value = EFFECT_LEVEL;
        effects.connect(master);
      }
      // An earlier resume can still be pending after an interruption. Keep later gestures eligible.
      Promise.resolve(context.resume()).then(activate).catch(() => {});
    } catch {
      // Audio can be disabled by the browser. Game controls remain available.
    }
  }

  function setScene(name) {
    const next = TRACKS.has(name) ? name : null;
    if (next === scene) return;
    scene = next;
    syncMusic();
  }

  function toggleMute() {
    muted = !muted;
    try {
      globalThis.localStorage?.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {}
    if (context) {
      const at = context.currentTime;
      master.gain.cancelScheduledValues(at);
      master.gain.setTargetAtTime(muted ? 0 : 0.94, at, 0.014);
      if (muted) {
        for (const source of voices) source.stop(at + 0.036);
        lastCue.clear();
        syncMusic();
      } else {
        activate();
      }
    }
    return muted;
  }

  function effect(name, { family = name, gap = 0.055, priority = false } = {}) {
    if (!audible() || !bank) return;
    const at = context.currentTime;
    if (at - (lastCue.get(family) ?? -Infinity) < gap) return;
    if (voices.size >= MAX_VOICES) {
      if (!priority) return;
      const oldest = voices.values().next().value;
      oldest.stop();
      voices.delete(oldest);
    }

    const [offset, duration] = CUES[name];
    const source = context.createBufferSource();
    source.buffer = bank;
    source.connect(effects);
    source.onended = () => {
      voices.delete(source);
      source.disconnect();
    };
    voices.add(source);
    lastCue.set(family, at);
    source.start(at, offset, duration);

    if (priority) {
      music.gain.cancelScheduledValues(at);
      music.gain.setTargetAtTime(MUSIC_LEVEL * 0.59, at, 0.027);
      music.gain.setTargetAtTime(MUSIC_LEVEL, at + Math.min(0.46, duration * 0.52), 0.14);
    }
  }

  return {
    unlock,
    setScene,
    toggleMute,
    get ready() {
      return context?.state === 'running';
    },
    get muted() {
      return muted;
    },
    swap: () => effect('swap'),
    refuse: () => effect('refuse'),
    clear(chain = 1) {
      const level = Math.max(1, Math.min(7, Math.floor(chain) || 1));
      effect('clear-' + level, { family: 'clear', gap: 0.081 });
    },
    boom: () => effect('boom', { priority: true }),
    combo: () => effect('combo', { priority: true }),
    cast: (ult = false) => effect(ult ? 'ultimate' : 'cast', { priority: ult }),
    hit: () => effect('hit'),
    heal: () => effect('heal'),
    guard: () => effect('guard'),
    enemyHit: () => effect('enemy-hit', { priority: true }),
    draw: () => effect('draw'),
    ui: () => effect('ui'),
    reward: () => effect('reward'),
    win: () => effect('win', { priority: true }),
    lose: () => effect('lose', { priority: true }),
  };
}
