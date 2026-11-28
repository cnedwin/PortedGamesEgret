// The engine mixes the pre-rendered accompaniment and independent strikes. The backing voice is the chart's clock.
import { encodeWav } from '@egret/engine/kit';
import { createBrowserAudio } from '@egret/engine/web/audio';
import { RATE, backingOf, clicksOf, effectsOf } from './synth.mjs';

export const STROKE_SOUND = { 仓: 'cang', 才: 'cai', 台: 'tai', 令: 'ling', 八: 'drum', 大: 'da', 嘟: 'roll' };

async function renderAudio(signal, song) {
  if (signal.aborted) throw signal.reason;
  if (typeof Worker === 'function') {
    try {
      const worker = new Worker(new URL('./render-audio.mjs', import.meta.url), { type: 'module' });
      return await new Promise((resolve, reject) => {
        function settle(complete, value) {
          worker.terminate();
          signal.removeEventListener('abort', cancel);
          complete(value);
        }
        const cancel = () => settle(reject, signal.reason);
        worker.addEventListener('message', ({ data }) => settle(resolve, data), { once: true });
        worker.addEventListener('error', (error) => {
          error.preventDefault();
          settle(reject, error);
        }, { once: true });
        signal.addEventListener('abort', cancel, { once: true });
        try {
          worker.postMessage({ song });
        } catch (error) {
          settle(reject, error);
        }
      });
    } catch (error) {
      if (signal.aborted) throw error;
      // The same score also works on hosts where module workers are unavailable.
    }
  }
  return song ? { score: backingOf(song).samples } : effectsOf();
}

export function createSound(scope, { on = true, music = 0.8 } = {}) {
  // The rhythm clock requires actual audio output. Keep the title/settings available,
  // but never simulate a successful score or create a fake audio clock on an unsupported host.
  if (typeof globalThis.AudioContext !== 'function') {
    const unavailable = async () => { throw new Error('Web Audio is unavailable'); };
    return { unavailable: true, start: unavailable, clicks: unavailable, stop() {}, strike() {}, cue() {},
      pause() {}, resume() {}, setOn() {}, setMusic() {}, heardAt: () => 0 };
  }
  const audio = scope.use(createBrowserAudio({
    buses: [{ name: 'music', volume: music }, 'effects', { name: 'calibration', volume: 0.86 }],
    limiter: true,
    maxVoices: 20
  }));
  const { mixer, context } = audio;
  mixer.master.setMuted(!on);
  const decode = (samples) => mixer.decode(encodeWav([samples], RATE));

  const effects = new Map();
  const effectsReady = renderAudio(scope.signal).then((samples) => Promise.all(
    Object.entries(samples).map(async ([name, channel]) => effects.set(name, await decode(channel)))
  ));
  // The title does not wait for this job. A run and calibration do, before starting the clock.
  effectsReady.catch(() => {});
  const backings = new Map();
  const variations = [1, 1.017, 0.988, 1.008];
  const strikeCounts = new Map();
  let voice = null;
  let clickAsset = null;
  let playback = 0;
  let lastGongAt = -Infinity, ringingGong = null;

  const sound = {
    mixer,
    context,
    strike(name) {
      if (mixer.master.muted) return;
      const bigGong = name === 'cang';
      const rapid = bigGong && context.currentTime - lastGongAt < 0.34;
      const effect = effects.get(rapid ? 'cangRapid' : name) ?? effects.get('drum');
      if (!effect) return;
      // Repeat strokes have a restrained change in pitch; it never delays their onset.
      const count = strikeCounts.get(name) ?? 0;
      strikeCounts.set(name, (count + 1) % variations.length);
      if (rapid && ringingGong?.state === 'playing') ringingGong.stop({ fade: 0.044 });
      const hit = mixer.play(effect, { bus: 'effects', rate: variations[count], maxInstances: bigGong ? 3 : 5 });
      if (bigGong) {
        lastGongAt = context.currentTime;
        ringingGong = rapid ? null : hit;
      }
    },
    cue(name) {
      if (mixer.master.muted) return;
      const effect = effects.get(name);
      if (effect) mixer.play(effect, { bus: 'effects', maxInstances: 1 });
    },
    prepare(song) {
      let loading = backings.get(song.id);
      if (!loading) {
        loading = renderAudio(scope.signal, song).then(({ score }) => decode(score)).catch((error) => {
          backings.delete(song.id);
          throw error;
        });
        backings.set(song.id, loading);
      }
      return loading;
    },
    async start(song, offset = 0) {
      sound.stop();
      const request = playback;
      const [backing] = await Promise.all([sound.prepare(song), effectsReady]);
      if (request !== playback) return null;
      voice = mixer.play(backing, { bus: 'music', whileSilent: 'start', offset });
      return voice;
    },
    async clicks(beats, gap, lead) {
      sound.stop();
      const request = playback;
      const [clicks] = await Promise.all([decode(clicksOf(beats, gap, lead)), effectsReady]);
      if (request !== playback) {
        clicks.release();
        return null;
      }
      clickAsset = clicks;
      // Muting the backing in settings must not mute the calibration reference.
      voice = mixer.play(clicks, { bus: 'calibration', whileSilent: 'start' });
      return voice;
    },
    stop() {
      playback++;
      lastGongAt = -Infinity;
      ringingGong = null;
      voice?.stop();
      voice = null;
      clickAsset?.release();
      clickAsset = null;
    },
    get playing() {
      return voice !== null && voice.state !== 'ended';
    },
    /** Convert page event time to the part of the score leaving the speakers, not the part being queued. */
    heardAt(ms = performance.now()) {
      if (!voice) return 0;
      const position = voice.position;
      if (mixer.state !== 'running') return position;
      const stamp = typeof context.getOutputTimestamp === 'function' ? context.getOutputTimestamp() : null;
      if (stamp && stamp.performanceTime > 0) {
        const late = context.currentTime - stamp.contextTime;
        return position - late + (ms - stamp.performanceTime) / 1000;
      }
      return position - (context.outputLatency || context.baseLatency || 0) + (ms - performance.now()) / 1000;
    },
    pause: () => mixer.suspend('game'),
    resume: () => mixer.resume('game'),
    setOn: (value) => mixer.master.setMuted(!value),
    setMusic: (value) => mixer.bus('music').setVolume(value),
    get state() {
      return mixer.state;
    }
  };
  return sound;
}
