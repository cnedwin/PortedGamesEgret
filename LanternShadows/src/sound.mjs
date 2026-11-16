// Stage music and the booth's original foley share the Egret mixer.
import { createBrowserAudio } from '@egret/engine/web/audio';
import { createFoley } from './foley.mjs';

const SCORE = {
  act1: 'act1-gate.mp3',
  act2: 'act2-orchard.mp3',
  act3: 'act3-furnace.mp3',
};
const CROSSFADE = 0.9;

// A busy crowd can keep moving without every puppet getting its own beat.
const DETAIL = new Set(['tap', 'clap', 'swish', 'whirl', 'jump', 'land', 'ember']);
const INTERVAL = {
  tap: 0.075, clap: 0.155, swish: 0.055, whirl: 0.10, jump: 0.10, land: 0.105, ember: 0.27,
  staff: 0.045, uplift: 0.06, smash: 0.09, guard: 0.075, parry: 0.09, hurt: 0.12,
  drum: 0.12, smallGong: 0.22, gong: 0.85, magic: 0.30, confirm: 0.08, cancel: 0.08,
};

const preference = key => {
  try { return localStorage.getItem('lantern-' + key) === 'off'; } catch { return false; }
};
const remember = (key, value) => {
  try { localStorage.setItem('lantern-' + key, value ? 'off' : 'on'); } catch { /* Session settings still work. */ }
};

export function createSound() {
  const cues = new Map();
  let audio, ready, wanted, loading, active, fading, lastError;
  let scoreDecode = Promise.resolve();
  let muted = preference('effects'), musicMuted = preference('music'), dim = false, court = false;
  const musicLevel = () => dim ? 0.23 : court ? 0.59 : 0.78;
  const mix = () => audio?.mixer.bus('music').setVolume(musicLevel(), { fade: 0.42 });
  const report = cause => { lastError = cause?.code ?? cause?.message ?? String(cause); };

  // Create the context inside the first touch or key so the browser can allow playback.
  function begin() {
    if (ready) return ready;
    ready = (async () => {
      audio = createBrowserAudio({
        volume: 0.84,
        buses: [{ name: 'effects', volume: 0.80, muted }, { name: 'music', volume: musicLevel(), muted: musicMuted }],
        onError: report,
      });
      // Leave the natural transients alone and catch only unusually dense overlaps.
      const limiter = audio.context.createDynamicsCompressor();
      limiter.threshold.value = -7;
      limiter.knee.value = 4;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.16;
      audio.output.disconnect(audio.context.destination);
      audio.output.connect(limiter);
      limiter.connect(audio.context.destination);
      await Promise.all(Object.entries(createFoley()).map(async ([name, takes]) => {
        const sounds = await Promise.all(takes.map(bytes => audio.mixer.decode(bytes)));
        cues.set(name, { sounds, next: 0, lastAt: -Infinity, voices: [] });
      }));
    })().catch(report);
    return ready;
  }

  function releaseFading() {
    const track = fading;
    fading = undefined;
    track?.sound.release();
  }

  function retire(track) {
    if (!track) return;
    releaseFading();
    fading = track;
    // A rapid stage change can free a still-fading deck before decoding the next one.
    void track.voice.ended.then(() => {
      if (fading === track) fading = undefined;
      track.sound.release();
    }).catch(report);
  }

  async function score(act) {
    if (act === wanted && (loading || active?.act === act)) return;
    wanted = act;
    loading?.abort();
    loading = undefined;
    if (!SCORE[act]) {
      audio?.mixer.stopMusic({ fade: CROSSFADE });
      retire(active);
      active = undefined;
      return;
    }
    if (musicMuted) return;
    void begin();
    if (!audio) return;

    const request = new AbortController();
    loading = request;
    try {
      const response = await fetch(new URL('../assets/music/' + SCORE[act], import.meta.url), { signal: request.signal });
      if (!response.ok) throw new Error('Score ' + response.status);
      const bytes = await response.arrayBuffer();
      // Only the playing deck and its replacement need decoded music in memory.
      const prepare = scoreDecode.then(async () => {
        if (request.signal.aborted) return;
        releaseFading();
        const sound = await audio.mixer.decode(bytes);
        try {
          if (request.signal.aborted) return;
          const voice = audio.mixer.playMusic(sound, { bus: 'music', loop: true, fade: CROSSFADE });
          if (voice.state === 'ended') return;
          retire(active);
          active = { act, sound, voice };
        } finally {
          if (active?.sound !== sound) sound.release();
        }
      });
      scoreDecode = prepare.catch(() => {});
      await prepare;
    } catch (cause) {
      if (!request.signal.aborted) report(cause);
    } finally {
      if (loading === request) loading = undefined;
    }
  }

  for (const type of ['pointerdown', 'keydown']) addEventListener(type, begin, { once: true, capture: true });
  return {
    begin,
    get ready() { return cues.size; },
    play(name, { volume = 1, rate = 1, pan = 0 } = {}) {
      const cue = cues.get(name);
      if (!cue || muted || audio.mixer.state !== 'running') return;
      const quiet = DETAIL.has(name), now = audio.context.currentTime;
      if (now - cue.lastAt < (INTERVAL[name] ?? 0.06) ||
          audio.mixer.bus('effects').voices >= (quiet ? 4 : 8)) return;
      cue.voices = cue.voices.filter(voice => voice.state !== 'ended');
      if (cue.voices.length >= (quiet || name === 'gong' ? 1 : 2)) return;
      try {
        const voice = audio.mixer.play(cue.sounds[cue.next], {
          bus: 'effects', volume, rate, pan: Math.max(-0.62, Math.min(0.62, pan * 0.7)),
        });
        if (voice.state === 'ended') return;
        cue.voices.push(voice);
        cue.next = (cue.next + 1) % cue.sounds.length;
        cue.lastAt = now;
      } catch (cause) {
        report(cause);
      }
    },
    score,
    dim(value) { dim = value; mix(); },
    court(value) { court = value; mix(); },
    get muted() { return muted; },
    set muted(value) {
      muted = value;
      remember('effects', value);
      audio?.mixer.bus('effects').setMuted(value);
    },
    get musicMuted() { return musicMuted; },
    set musicMuted(value) {
      musicMuted = value;
      remember('music', value);
      audio?.mixer.bus('music').setMuted(value);
      if (value) {
        loading?.abort();
        loading = undefined;
      } else if (active?.act !== wanted) void score(wanted);
    },
    state() {
      return {
        theme: active?.act, voice: active?.voice.state, position: active?.voice.position,
        duration: active?.sound.duration, context: audio?.context.state,
        scoreDecks: Number(Boolean(active)) + Number(Boolean(fading)),
        effectsVoices: audio?.mixer.bus('effects').voices,
        dim, court, muted, musicMuted, error: lastError,
      };
    },
  };
}
