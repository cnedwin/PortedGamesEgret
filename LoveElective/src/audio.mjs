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
  let host, preparing, disposed = false, lastError;
  const audio = { muted: false };
  const report = error => { lastError = error?.code ?? error?.message ?? String(error); };

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
    ]).then(() => {
      if (!disposed && sounds.has('music')) current.mixer.playMusic(sounds.get('music'), { fade: 0.15 });
    }).catch(report).finally(() => { preparing = undefined; });
    return preparing;
  }

  /** Entered directly from the player's touch or key to unlock browser sound. */
  audio.unlock = () => {
    if (disposed) return Promise.resolve();
    try {
      host ??= createBrowserAudio({
        muted: audio.muted, limiter: true, pauseWhenHidden: true,
        buses: ['music', 'effects'], onError: report,
      });
      if (host.context.state === 'suspended') void host.context.resume().catch(report);
      return prepare();
    } catch (error) {
      report(error);
      return Promise.resolve();
    }
  };
  audio.setMuted = muted => {
    audio.muted = Boolean(muted);
    host?.mixer.master.setMuted(audio.muted);
  };
  /** kind: 'tap' | 'good' | 'bad' | 'heart' | 'page'. */
  audio.play = kind => {
    if (!host || disposed || audio.muted || !Object.hasOwn(EFFECTS, kind)) return;
    const play = () => {
      const sound = sounds.get(kind);
      if (!disposed && !audio.muted && sound) {
        try { host.mixer.play(sound, { bus: 'effects', maxInstances: 4 }); }
        catch (error) { report(error); }
      }
    };
    if (sounds.has(kind)) play();
    else void prepare().then(play).catch(report);
  };
  audio.snapshot = () => ({ ...host?.mixer.snapshot(), error: lastError });
  audio.dispose = () => {
    if (disposed) return;
    disposed = true;
    host?.dispose();
    sounds.clear();
  };
  return audio;
}
