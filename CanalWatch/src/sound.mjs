// Original instruments and foley for the Bian canal. PCM is made once off the game thread;
// the engine mixer owns audio output, fades, focus, memory and voice limits.
export const SAMPLE_RATE = 22050;
const TAU = 2 * Math.PI;
const SCORE_PHASES = ['ready', 'battle', 'boss'];
const host = typeof document === 'undefined' ? null : await Promise.all([
  import('../vendor/engine/dist/web/audio.js'),
  import('@egret/engine/kit')
]).then(([audio, kit]) => ({ createAudio: audio.createBrowserAudio, encode: kit.encodeWav }));

const frequencies = {
  qin: [[1, 0.71], [2, 0.28], [3.01, 0.14], [4.02, 0.07], [6.03, 0.035]],
  pipa: [[1, 0.51], [1.998, 0.38], [3.022, 0.23], [4.04, 0.12], [5.91, 0.045]],
  flute: [[1, 0.83], [2, 0.19], [3, 0.14], [5, 0.04]],
  drum: [[1, 0.85], [1.59, 0.28], [2.12, 0.21], [3.63, 0.10]],
  bronze: [[1, 0.45], [1.46, 0.36], [2.14, 0.30], [2.79, 0.26], [3.73, 0.14], [5.27, 0.06]],
  timber: [[1, 0.53], [1.61, 0.43], [2.58, 0.31], [3.71, 0.16]],
  spring: [[1, 0.65], [2.07, 0.31], [3.2, 0.19], [5.66, 0.12]]
};
const envelopes = {
  qin: [0.006, 2.4, -0.014],
  pipa: [0.0025, 4.2, -0.016],
  flute: [0.075, 0.55, 0.011],
  drum: [0.004, 5.0, -0.24],
  bronze: [0.008, 2.15, -0.006],
  timber: [0.002, 6.7, -0.13],
  spring: [0.0016, 5.8, -0.20]
};

function seeded(seed) {
  let value = seed;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 2147483648 - 1;
  };
}

function oscillate(samples, instrument, at, length, hz, gain) {
  const from = Math.round(at * SAMPLE_RATE), span = Math.min(samples.length - from, Math.round(length * SAMPLE_RATE));
  const partials = frequencies[instrument], [attack, damp, glide] = envelopes[instrument];
  const flute = instrument === 'flute', release = Math.min(length * 0.42, flute ? 0.15 : 0.07);
  for (let i = 0; i < span; i++) {
    const t = i / SAMPLE_RATE, age = t / length;
    const slope = Math.min(1, t / attack, (span - i - 1) / SAMPLE_RATE / release);
    const bend = TAU * t * hz * (1 + glide * Math.min(0.66, age));
    const vibrato = flute ? Math.sin(t * 33) * Math.min(0.19, t * 0.5) : 0;
    let point = 0, edge = 1;
    for (const [ratio, weight] of partials) {
      point += Math.sin(bend * ratio + vibrato) * weight * edge;
      edge *= 1 - age * 0.52;
    }
    samples[from + i] += point * gain * slope * Math.exp(-age * damp);
  }
}

// A damped colour band is enough to make the difference between cloth, wood, spray and flame audible.
function grit(samples, type, at, length, gain, random) {
  const [color, body, damp] = {
    air: [0.17, 0.52, 3.1], grit: [0.22, 0.22, 4.4],
    water: [0.078, 0.86, 2.45], fire: [0.52, 0.35, 3.8], rain: [0.12, 0.96, 0.08]
  }[type];
  const from = Math.round(at * SAMPLE_RATE),
    span = Math.min(samples.length - from, Math.round(length * SAMPLE_RATE));
  let low = 0, lag = 0;
  for (let i = 0; i < span; i++) {
    const t = i / SAMPLE_RATE, age = t / length, white = random();
    low += color * (white - low);
    const grain = (white - low) * (1 - body) + (low - lag * 0.22) * body * 2.1;
    lag = low;
    const slope = Math.min(1, t / 0.011, (span - i - 1) / SAMPLE_RATE / Math.min(0.065, length / 4));
    samples[from + i] += grain * gain * slope * Math.exp(-damp * age);
  }
}

const SCORE = {
  ready: {
    tempo: 78,
    melody: [
      [[0.45, 62], [2.35, 69]], [[0.4, 67], [1.65, 64], [3.2, 62]],
      [[0.5, 55], [2.2, 62]], [[0.8, 60], [2.7, 57]],
      [[0.35, 62], [2.08, 69]], [[0.45, 72], [1.7, 69], [3.18, 67]],
      [[0.55, 64], [2.1, 67]], [[0.4, 62], [2.1, 55]]
    ],
    bass: [38, 43, 48, 45, 38, 43, 45, 38]
  },
  battle: {
    tempo: 108,
    melody: [
      [[0, 62], [0.75, 67], [1.5, 69], [2.5, 72], [3.15, 69]],
      [[0.15, 67], [0.9, 64], [1.75, 67], [2.45, 62], [3.35, 57]],
      [[0, 60], [0.65, 62], [1.55, 64], [2.6, 67], [3.18, 72]],
      [[0, 69], [0.76, 67], [1.45, 64], [2.1, 62], [3.05, 57]],
      [[0, 62], [0.75, 67], [1.5, 69], [2.5, 74], [3.15, 72]],
      [[0.15, 69], [0.9, 67], [1.75, 64], [2.45, 69], [3.35, 67]],
      [[0, 64], [0.65, 67], [1.55, 69], [2.6, 67], [3.18, 64]],
      [[0, 62], [0.76, 57], [1.45, 62], [2.1, 55], [3.05, 62]]
    ],
    bass: [38, 43, 48, 45, 38, 43, 48, 38]
  },
  boss: {
    tempo: 126,
    melody: [
      [[0, 50], [0.75, 62], [1.5, 67], [2.12, 64], [2.75, 62], [3.35, 57]],
      [[0, 48], [0.75, 60], [1.5, 64], [2.12, 67], [2.75, 60], [3.35, 57]],
      [[0, 43], [0.75, 55], [1.5, 67], [2.12, 72], [2.75, 69], [3.35, 67]],
      [[0, 45], [0.75, 57], [1.5, 69], [2.12, 64], [2.75, 62], [3.35, 57]],
      [[0, 50], [0.75, 62], [1.5, 74], [2.12, 72], [2.75, 69], [3.35, 67]],
      [[0, 48], [0.75, 60], [1.5, 72], [2.12, 69], [2.75, 67], [3.35, 64]],
      [[0, 43], [0.75, 55], [1.5, 67], [2.12, 64], [2.75, 62], [3.35, 60]],
      [[0, 38], [0.75, 50], [1.5, 62], [2.12, 57], [2.75, 55], [3.35, 50]]
    ],
    bass: [38, 36, 31, 33, 38, 36, 31, 38]
  }
};
const midi = (step) => 440 * 2 ** ((step - 69) / 12);
function finish(samples, target) {
  const edge = Math.min(Math.round(SAMPLE_RATE * 0.014), samples.length / 8);
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  for (let i = 0; i < samples.length; i++) {
    samples[i] *= target / (peak || 1) * Math.min(1, i / edge, (samples.length - i - 1) / edge);
  }
  samples[0] = samples[samples.length - 1] = 0;
  return samples;
}

/** Original pentatonic score. Qin, pipa, bamboo flute, bronze, hide drums and rain have independent parts. */
export function synthesizeScore(phase) {
  const piece = SCORE[phase], ready = phase === 'ready', boss = phase === 'boss';
  const beat = 60 / piece.tempo, barTime = beat * 4, length = barTime * piece.melody.length;
  const random = seeded(phase === 'ready' ? 8123 : phase === 'boss' ? 8419 : 8353);
  const pcm = new Float32Array(Math.round(SAMPLE_RATE * length));
  grit(pcm, 'rain', 0, length, ready ? 0.05 : 0.032, random);
  for (let bar = 0; bar < piece.melody.length; bar++) {
    const time = bar * barTime, root = piece.bass[bar];
    for (const [pulse, note] of piece.melody[bar]) {
      const at = time + pulse * beat, pluck = ready ? 'qin' : 'pipa';
      oscillate(pcm, pluck, at, ready ? 0.81 : boss ? 0.34 : 0.45, midi(note), pulse % 1 === 0 ? 0.26 : 0.19);
      oscillate(pcm, pluck, at + 0.139, 0.39, midi(note), 0.024);
    }
    for (const pulse of ready ? [0.15, 2.21] : [0, 1.5, 2.78]) {
      oscillate(pcm, 'qin', time + pulse * beat, ready ? 1.13 : 0.68, midi(root + (pulse < 2 ? 0 : 12)), ready ? 0.155 : 0.185);
    }
    if (bar % 2 === 1 || ready) {
      const pitch = [74, 72, 74, 69, 74, 76, 67, 62][bar];
      const at = time + beat * (ready ? 1.12 : 2.1), span = beat * (ready ? 1.55 : 0.96);
      oscillate(pcm, 'flute', at, span, midi(pitch), ready ? 0.18 : 0.13);
      grit(pcm, 'air', at + 0.052, span * 0.68, 0.021, random);
    }
    if (ready) {
      if (bar === 0 || bar === 4) oscillate(pcm, 'bronze', time + 0.05, 1.85, midi(root + 12), 0.07);
    } else {
      const drumPattern = boss ? [0, 0.76, 1.46, 2.5, 3.17] : [0, 1.52, 2.74];
      for (const pulse of drumPattern) {
        const at = time + pulse * beat, downbeat = pulse === 0;
        oscillate(pcm, 'drum', at, boss ? 0.45 : 0.32, (boss ? 69 : 92) + pulse * 7.5, downbeat ? 0.23 : 0.13);
        grit(pcm, 'grit', at, 0.065, 0.072, random);
      }
      for (const pulse of [0.48, 1.92, 3.38]) oscillate(pcm, 'timber', time + pulse * beat, 0.11, 236 + pulse * 49, boss ? 0.10 : 0.073);
      if (bar % (boss ? 2 : 4) === 0) oscillate(pcm, 'bronze', time + 0.13, 2.1, boss ? 102 : 155, boss ? 0.18 : 0.09);
    }
    if (bar % 2 === 0) {
      const at = time + 1.32 * beat;
      grit(pcm, 'water', at, 0.26, ready ? 0.067 : 0.025, random);
      oscillate(pcm, 'spring', at + 0.058, 0.18, 294 + bar * 13, 0.021);
    }
  }
  return finish(pcm, ready ? 0.65 : boss ? 0.74 : 0.71);
}

// A take is a short composition of resonances and air movements. Rows are
// [sound, start, duration, frequency if pitched, gain].
export const EFFECTS = {
  wave: [['drum',0,0.66,124,0.60],['bronze',0.08,1.25,246,0.38],['timber',0.22,0.12,805,0.18],['drum',0.43,0.78,101,0.44]],
  flagship: [['bronze',0,1.95,103,0.46],['drum',0.04,1.0,71,0.65],['timber',0.24,0.20,517,0.24],['drum',0.31,0.7,82,0.52],['drum',0.59,1.1,66,0.63],['bronze',0.64,1.4,147,0.25]],
  build: [['timber',0,0.1,488,0.50],['qin',0.065,0.33,440,0.44],['qin',0.20,0.38,587.33,0.36]],
  gate: [['timber',0,0.18,331,0.44],['timber',0.095,0.17,245,0.52],['timber',0.19,0.17,196,0.53],['drum',0.28,0.62,81,0.48],['water',0.28,0.47,0,0.48]],
  'gate-open': [['timber',0,0.15,235,0.42],['timber',0.09,0.14,398,0.43],['bronze',0.17,0.43,321,0.26],['water',0.21,0.38,0,0.32]],
  crossbow: [['spring',0,0.12,785,0.61],['timber',0.014,0.075,458,0.39],['air',0.031,0.15,0,0.45]],
  trebuchet: [['timber',0,0.17,221,0.61],['drum',0.024,0.21,108,0.34],['air',0.045,0.39,0,0.43],['spring',0.19,0.20,201,0.20]],
  fire: [['grit',0,0.07,0,0.60],['fire',0.028,0.36,0,0.61],['flute',0.043,0.20,270,0.18],['grit',0.18,0.11,0,0.20]],
  timber: [['timber',0,0.125,372,0.57],['grit',0.014,0.10,0,0.57],['timber',0.041,0.10,273,0.48]],
  shield: [['bronze',0,0.48,631,0.54],['timber',0.006,0.10,950,0.36],['air',0.034,0.15,0,0.19]],
  stone: [['drum',0,0.53,86,0.63],['grit',0.011,0.21,0,0.92],['timber',0.071,0.17,233,0.30],['grit',0.16,0.19,0,0.51]],
  water: [['water',0,0.35,0,0.68],['drum',0.014,0.27,148,0.21],['spring',0.075,0.18,291,0.17]],
  sizzle: [['fire',0,0.25,0,0.77],['grit',0.050,0.09,0,0.51],['timber',0.108,0.08,749,0.17],['fire',0.123,0.095,0,0.34]],
  gong: [['bronze',0,1.12,214,0.56],['timber',0.008,0.14,340,0.21],['drum',0.021,0.24,94,0.14]],
  ashore: [['water',0,0.25,0,0.49],['timber',0.052,0.18,189,0.36],['grit',0.099,0.13,0,0.48],['timber',0.197,0.19,158,0.42]],
  sink: [['drum',0,0.70,87,0.57],['water',0.008,0.95,0,0.82],['timber',0.04,0.18,245,0.45],['spring',0.37,0.23,182,0.22],['spring',0.52,0.17,213,0.18],['water',0.52,0.38,0,0.23]],
  down: [['timber',0,0.13,180,0.59],['air',0.017,0.15,0,0.43],['grit',0.065,0.11,0,0.39]],
  leak: [['drum',0,0.40,113,0.42],['bronze',0.034,0.66,236,0.47],['bronze',0.245,0.66,176,0.53]],
  win: [['drum',0,0.65,117,0.39],['qin',0.025,0.50,293.66,0.45],['pipa',0.25,0.55,392,0.43],['pipa',0.45,0.61,440,0.36],['flute',0.61,1.26,587.33,0.35],['bronze',0.64,1.39,220,0.37],['qin',1.09,0.93,293.66,0.24]],
  lose: [['bronze',0,1.64,144,0.49],['drum',0.01,0.64,74,0.52],['qin',0.31,0.84,220,0.38],['qin',0.61,0.94,196,0.32],['flute',0.79,0.87,146.83,0.30]]
};
const fallback = {
  crossbow:'shoot',trebuchet:'hit',fire:'explosion',timber:'hit',shield:'bounce',stone:'explosion',
  water:'pop',sizzle:'hurt',gong:'coin',ashore:'pop',sink:'explosion',down:'hurt',leak:'hurt',
  gate:'hit','gate-open':'pop',build:'coin',wave:'powerup',flagship:'explosion',win:'win',lose:'lose'
};
const impacts = {crossbow:'timber', shield:'shield', trebuchet:'stone', water:'water', fire:'sizzle'};
const duck = {wave:0.95,flagship:1.8,gate:0.55,'gate-open':0.24,win:1.6,lose:1.55,leak:0.52};
const gap = {crossbow:0.065,trebuchet:0.10,fire:0.105,timber:0.078,shield:0.12,stone:0.12,water:0.095,
  sizzle:0.086,gong:0.41,ashore:0.15,sink:0.23,down:0.095,leak:0.35,gate:0.18,'gate-open':0.20,build:0.12,wave:0.45,flagship:0.50,win:1,lose:1};

export function synthesizeCue(name) {
  const rows = EFFECTS[name];
  const length = Math.max(...rows.map(([, at, span]) => at + span));
  const samples = new Float32Array(Math.ceil(length * SAMPLE_RATE));
  const random = seeded(1203 + name.split('').reduce((sum, letter) => sum + letter.charCodeAt(0), 0));
  for (const [voice, at, span, note, gain] of rows) {
    if (note) oscillate(samples, voice, at, span, note, gain);
    else grit(samples, voice, at, span, gain, random);
  }
  return finish(samples, duck[name] ? 0.86 : 0.72);
}

function* soundtrack() {
  for (const name of ['wave','flagship','gate','build','crossbow','timber','win','lose','gate-open','water',
    'trebuchet','stone','gong','shield','fire','sizzle','sink','down','ashore','leak']) yield [name, synthesizeCue(name)];
  for (const phase of SCORE_PHASES) yield [phase, synthesizeScore(phase)];
}

if (!host && typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.onmessage = () => {
    for (const [name, samples] of soundtrack()) self.postMessage({ name, samples }, [samples.buffer]);
    self.postMessage(null);
  };
}

/** The game owns settings and play state. These two audio buses never mute or pause one another. */
export function createSound(game, { on = true, music = true } = {}) {
  let audio, worker, fallbackTimer, disposed = false;
  let effectsOn = on, musicOn = music, paused = false, wanted, active, retiring, share = 0;
  let level = -1, duckUntil = 0, take = 0;
  const media = new Map(), samples = new Map(), decoding = new Set(), last = new Map();
  const page = game.canvas?.ownerDocument ?? globalThis.document;
  const gestures = ['pointerdown','keydown'];
  const pitchVariations = [1, 0.98, 1.02, 1.012, 0.985];
  game.sfx.muted = !effectsOn;

  function balance() {
    if (!audio) return;
    const strength = (0.68 + share * 0.21) * (audio.context.currentTime < duckUntil ? 0.38 : 1);
    if (Math.abs(strength - level) < 0.018) return;
    level = strength;
    audio.mixer.bus('music').setVolume(strength, { fade: audio.context.currentTime < duckUntil ? 0.07 : 0.55 });
  }

  function playScore() {
    if (!audio || !musicOn || paused || !wanted) return;
    balance();
    const clip = media.get(wanted);
    if (!clip) return;
    if (active?.name === wanted && active.voice.state !== 'ended') {
      if (active.voice.state === 'paused') active.voice.resume();
      return;
    }
    retiring?.stop({ fade: 0 });
    const previous = active?.voice;
    const voice = audio.mixer.playMusic(clip, { bus:'music', loop:true, fade:0.76, restart:true, whileSilent:'start' });
    if (voice.state !== 'ended') {
      retiring = previous && previous !== voice ? previous : null;
      active = { name:wanted, voice };
    }
  }

  function decode(name) {
    const pcm = samples.get(name);
    if (!audio || !pcm || decoding.has(name)) return;
    decoding.add(name);
    void audio.mixer.decode(host.encode([pcm], SAMPLE_RATE)).then(clip => {
      if (disposed) return;
      media.set(name, clip);
      if (name === wanted) playScore();
    }).catch(() => { /* The built-in effect covers a cue the browser could not decode. */ }).finally(() => {
      decoding.delete(name);
      samples.delete(name);
    });
  }

  function receive(name, pcm) {
    if (disposed || samples.has(name) || media.has(name)) return;
    samples.set(name, pcm);
    decode(name);
  }

  function prepareOnPage() {
    if (fallbackTimer !== undefined || disposed) return;
    const next = soundtrack();
    const pump = () => {
      if (disposed) return;
      const { value, done } = next.next();
      if (done) return;
      receive(...value);
      fallbackTimer = setTimeout(pump, 16);
    };
    fallbackTimer = setTimeout(pump, 0);
  }

  function openAudio() {
    if (disposed || audio || !host) return;
    try {
      audio = host.createAudio({
        limiter:true, volume:0.85, maxVoices:14, maxDecodedBytes:24 * 1024 * 1024,
        buses:[{ name:'music',volume:0.78,muted:!musicOn }, { name:'effects',volume:0.92,muted:!effectsOn }],
        onError:() => {}
      });
      for (const event of gestures) page?.removeEventListener(event, openAudio, true);
      if (audio.context.state === 'suspended') void audio.context.resume().catch(() => {});
      for (const name of samples.keys()) decode(name);
      playScore();
    } catch {
      // An unavailable audio device never stops a match.
    }
  }

  if (host && typeof globalThis.AudioContext === 'function') {
    for (const event of gestures) page?.addEventListener(event, openAudio, true);
    try {
      worker = new Worker(new URL(import.meta.url), { type:'module', name:'Canal Watch score' });
      worker.onmessage = ({ data }) => {
        if (data) receive(data.name, data.samples);
        else {
          worker?.terminate();
          worker = undefined;
        }
      };
      worker.onerror = event => {
        event.preventDefault();
        worker?.terminate();
        worker = undefined;
        prepareOnPage();
      };
      worker.postMessage('compose');
    } catch {
      worker?.terminate();
      worker = undefined;
      prepareOnPage();
    }
  }

  const sound = (name, detail) => {
    if (!effectsOn || disposed) return;
    const cue = name === 'shot' ? detail : name === 'hit' ? (Object.hasOwn(impacts, detail) ? impacts[detail] : 'timber') : name === 'crash' ? 'stone' : name;
    if (!Object.hasOwn(EFFECTS, cue)) return;
    const now = performance.now() / 1000;
    if (now - (last.get(cue) ?? -Infinity) < gap[cue]) return;
    const clip = media.get(cue);
    if (!audio || !clip || audio.mixer.state !== 'running') {
      const preset = fallback[cue];
      if (game.sfx.names.includes(preset)) {
        game.sfx.play(preset, { volume:duck[cue] ? 0.56 : 0.36 });
        last.set(cue, now);
      }
      return;
    }
    if (!duck[cue] && audio.mixer.bus('effects').voices >= 8) return;
    let voice;
    try {
      voice = audio.mixer.play(clip, {
        bus:'effects', volume:duck[cue] ? 0.97 : 0.79,
        rate:duck[cue] ? 1 : pitchVariations[(take++) % pitchVariations.length],
        maxInstances:duck[cue] || cue === 'gong' ? 1 : 2
      });
    } catch {
      return; // A disappearing audio device must leave combat running.
    }
    if (voice.state === 'ended') return;
    last.set(cue, now);
    if (duck[cue]) {
      duckUntil = Math.max(duckUntil, audio.context.currentTime + duck[cue]);
      balance();
    }
  };

  sound.setOn = (value) => {
    effectsOn = Boolean(value);
    game.sfx.muted = !effectsOn;
    audio?.mixer.bus('effects').setMuted(!effectsOn);
    if (!effectsOn) audio?.mixer.stopAll({ bus:'effects', fade:0.06 });
  };
  sound.setMusic = (value) => {
    musicOn = Boolean(value);
    audio?.mixer.bus('music').setMuted(!musicOn);
    if (musicOn) playScore();
    else {
      retiring?.stop({ fade:0 });
      retiring = undefined;
      active?.voice.pause();
    }
  };
  sound.music = (progress, phase = 'battle') => {
    share = Math.max(0, Math.min(1, Number(progress) || 0));
    wanted = Object.hasOwn(SCORE, phase) ? phase : 'battle';
    paused = false;
    playScore();
  };
  sound.pauseMusic = () => {
    paused = true;
    retiring?.stop({ fade:0 });
    retiring = undefined;
    active?.voice.pause();
    audio?.mixer.stopAll({ bus:'effects', fade:0.065 });
  };
  sound.stopMusic = () => {
    wanted = undefined;
    paused = false;
    if (retiring) retiring.stop({ fade:0 });
    retiring = active?.voice;
    retiring?.stop({ fade:0.43 });
    active = undefined;
    duckUntil = 0;
  };
  game.scope?.use({ dispose() {
    disposed = true;
    clearTimeout(fallbackTimer);
    worker?.terminate();
    for (const event of gestures) page?.removeEventListener(event, openAudio, true);
    audio?.dispose();
    samples.clear();
    media.clear();
  } });
  return sound;
}
