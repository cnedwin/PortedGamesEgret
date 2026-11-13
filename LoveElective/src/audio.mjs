// Sound, all synthesised with the Web Audio API: a soft looping background
// tune and a few short interface sounds. Nothing is loaded from files.

/** Chords of the background loop as semitone offsets from A3. */
const CHORDS = [
  [3, 7, 10, 14],
  [10, 14, 17, 21],
  [0, 3, 7, 12],
  [8, 12, 15, 19],
];
const BEAT = 0.42;

export function createAudio() {
  let ctx = null,
    master = null,
    nextTime = 0,
    step = 0;
  const audio = { muted: false };
  const hz = semitone => 220 * 2 ** (semitone / 12);

  function tone(freq, start, length, volume, type = 'sine') {
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + length + 0.05);
  }

  /** Queue the next few notes of the tune a little ahead of time. */
  function schedule() {
    while (nextTime < ctx.currentTime + 0.6) {
      const chord = CHORDS[Math.floor(step / 8) % CHORDS.length],
        i = step % 8;
      tone(hz(chord[[0, 1, 2, 3, 2, 1, 2, 3][i]] + 12), nextTime, BEAT * 2.2, 0.05, 'triangle');
      if (i === 0) {
        tone(hz(chord[0] - 12), nextTime, BEAT * 7.5, 0.07);
        tone(hz(chord[2]), nextTime, BEAT * 7.5, 0.03);
      }
      if (i === 4 && Math.floor(step / 8) % 2) tone(hz(chord[3] + 24), nextTime, BEAT * 3, 0.025);
      nextTime += BEAT;
      step++;
    }
  }

  /** Browsers only allow sound after a tap or key press; call this from one. */
  audio.unlock = () => {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctx) return;
    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = audio.muted ? 0 : 1;
    master.connect(ctx.destination);
    nextTime = ctx.currentTime + 0.1;
    setInterval(schedule, 200);
  };

  audio.setMuted = muted => {
    audio.muted = muted;
    if (master) master.gain.value = muted ? 0 : 1;
  };

  /** kind: 'tap' | 'good' | 'bad' | 'heart' | 'page'. */
  audio.play = kind => {
    if (!ctx || audio.muted) return;
    const t = ctx.currentTime;
    if (kind === 'tap') tone(880, t, 0.08, 0.05);
    if (kind === 'page') tone(660, t, 0.06, 0.03);
    if (kind === 'good') {
      tone(784, t, 0.18, 0.06);
      tone(1175, t + 0.09, 0.3, 0.06);
    }
    if (kind === 'bad') {
      tone(330, t, 0.22, 0.05, 'triangle');
      tone(262, t + 0.1, 0.3, 0.05, 'triangle');
    }
    if (kind === 'heart') [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.08, 0.4, 0.05));
  };

  return audio;
}
