// Sound effects made on the spot with Web Audio: short tones, sweeps and
// noise bursts. Nothing is loaded, and nothing plays before the first input.

export function createAudio() {
  let context, master, noise;
  const last = new Map();
  const audio = { muted: false, volume: 0.5 };
  /** Create the audio graph; call from a click or key press. */
  audio.unlock = () => {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return;
    }
    const AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AudioContext) return;
    try {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = audio.volume;
      master.connect(context.destination);
      noise = context.createBuffer(1, context.sampleRate * 0.5, context.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    } catch {
      context = undefined;
    }
  };
  /** A tone sliding from `from` to `to` hertz. */
  const tone = (from, to, seconds, volume = 0.2, type = 'sine', delay = 0) => {
    const start = context.currentTime + delay,
      oscillator = context.createOscillator(),
      gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    oscillator.connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.02);
  };
  /** Filtered noise, for splashes and thumps. */
  const hiss = (frequency, seconds, volume = 0.2, kind = 'lowpass') => {
    const source = context.createBufferSource(),
      filter = context.createBiquadFilter(),
      gain = context.createGain(),
      start = context.currentTime;
    source.buffer = noise;
    filter.type = kind;
    filter.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    source.connect(filter).connect(gain).connect(master);
    source.start(start);
    source.stop(start + seconds);
  };
  const SOUNDS = {
    hit: [0.05, () => tone(520 + Math.random() * 200, 240, 0.06, 0.06, 'triangle')],
    death: [0.04, () => tone(700 + Math.random() * 300, 180, 0.09, 0.07, 'square')],
    gem: [0.05, () => tone(880 + Math.random() * 500, 1500, 0.07, 0.05)],
    jump: [0.1, (event) => tone(260, 520 + (event.power ?? 0) * 500, 0.18, 0.14)],
    slam: [
      0.1,
      () => {
        hiss(220, 0.35, 0.5);
        tone(140, 40, 0.3, 0.3);
      },
    ],
    bump: [
      0.1,
      () => {
        hiss(900, 0.12, 0.2, 'bandpass');
        tone(300, 120, 0.12, 0.15, 'triangle');
      },
    ],
    land: [0.1, () => hiss(300, 0.1, 0.12)],
    hurt: [0.15, () => tone(300, 90, 0.22, 0.22, 'sawtooth')],
    splash: [0.1, () => hiss(1800, 0.4, 0.25, 'bandpass')],
    splat: [0.08, () => hiss(700, 0.15, 0.15)],
    boom: [
      0.06,
      () => {
        hiss(180, 0.4, 0.45);
        tone(110, 35, 0.35, 0.25);
      },
    ],
    ring: [0.1, () => tone(180, 620, 0.3, 0.14, 'triangle')],
    shock: [
      0.1,
      () => {
        hiss(140, 0.6, 0.6);
        tone(90, 30, 0.6, 0.35);
      },
    ],
    spring: [0.08, () => tone(200, 900, 0.16, 0.15, 'square')],
    pop: [0.06, () => tone(900, 300, 0.07, 0.12)],
    popper: [0.08, () => hiss(3000, 0.12, 0.16, 'highpass')],
    bite: [0.07, () => tone(1200, 600, 0.03, 0.06, 'square')],
    bonk: [0.06, () => tone(420 + Math.random() * 120, 160, 0.08, 0.1, 'triangle')],
    thud: [0.08, () => hiss(260, 0.12, 0.2)],
    levelup: [0.3, () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.16, 0.14, 'triangle', i * 0.07))],
    evolve: [0.5, () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f * 1.01, 0.22, 0.14, 'triangle', i * 0.08))],
    chest: [0.3, () => [659, 784, 988, 1319].forEach((f, i) => tone(f, f, 0.14, 0.13, 'square', i * 0.06))],
    heal: [
      0.3,
      () => {
        tone(440, 880, 0.3, 0.14);
        tone(660, 1320, 0.3, 0.08, 'sine', 0.08);
      },
    ],
    down: [0.5, () => [440, 370, 311, 220].forEach((f, i) => tone(f, f * 0.97, 0.25, 0.18, 'sawtooth', i * 0.14))],
    revived: [0.5, () => [330, 440, 554, 659].forEach((f, i) => tone(f, f, 0.18, 0.15, 'triangle', i * 0.08))],
    bossSpawn: [
      1,
      () => {
        tone(70, 50, 1.4, 0.4, 'sawtooth');
        hiss(120, 1.2, 0.4);
      },
    ],
    announce: [
      0.5,
      () => {
        tone(392, 392, 0.14, 0.12, 'square');
        tone(523, 523, 0.2, 0.12, 'square', 0.15);
      },
    ],
    telegraph: [0.3, () => tone(200, 800, 0.8, 0.15, 'sawtooth')],
    volley: [0.2, () => tone(900, 300, 0.25, 0.14, 'square')],
    won: [2, () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.26, 0.16, 'triangle', i * 0.13))],
    lost: [2, () => [392, 330, 262, 196, 131].forEach((f, i) => tone(f, f * 0.96, 0.4, 0.2, 'sawtooth', i * 0.2))],
    click: [0.03, () => tone(660, 880, 0.05, 0.1, 'triangle')],
  };
  /** Play the sound of an event, unless the same sound played a moment ago. */
  audio.play = (type, event = {}) => {
    const sound = SOUNDS[type];
    if (!sound || !context || audio.muted || context.state !== 'running') return;
    const now = context.currentTime;
    if (now - (last.get(type) ?? -9) < sound[0]) return;
    last.set(type, now);
    try {
      sound[1](event);
    } catch {
      /* a sound that cannot play is not worth stopping the game for */
    }
  };
  // ---- music ---------------------------------------------------------------------------
  // A short tune made of notes scheduled a little ahead of time: bass, a plucked
  // melody and light drums. `level` 0 is the calm title mix, 1 the run, 2 adds
  // drive for surges and bosses.
  const SCALE = [0, 2, 4, 7, 9]; // major pentatonic
  const BASS = [0, 0, 5, 5, 3, 3, 4, 4]; // one root per bar, as scale degrees of C major
  const ROOTS = [130.81, 146.83, 164.81, 174.61, 196.0, 220.0, 246.94];
  const TUNE = [0, 2, 4, 2, 3, 4, 2, 0, 1, 2, 4, 3, 2, 1, 0, -1, 0, 2, 4, 5, 4, 2, 3, 1, 2, 4, 3, 2, 1, 0, 1, -1];
  let musicGain,
    musicLevel = -1,
    nextStep = 0,
    step = 0;
  const pitch = (degree, octave) =>
    261.63 * Math.pow(2, octave + (SCALE[((degree % 5) + 5) % 5] + 12 * Math.floor(degree / 5)) / 12);
  const note = (frequency, at, seconds, volume, type) => {
    const oscillator = context.createOscillator(),
      gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    oscillator.connect(gain).connect(musicGain);
    oscillator.start(at);
    oscillator.stop(at + seconds + 0.03);
  };
  const drum = (at, frequency, seconds, volume, kind) => {
    const source = context.createBufferSource(),
      filter = context.createBiquadFilter(),
      gain = context.createGain();
    source.buffer = noise;
    filter.type = kind;
    filter.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    source.connect(filter).connect(gain).connect(musicGain);
    source.start(at);
    source.stop(at + seconds);
  };
  /** Keep the tune playing at the given level; call every frame. A level below 0 lets it fall silent. */
  audio.music = (level) => {
    if (!context || context.state !== 'running') return;
    if (!musicGain) {
      musicGain = context.createGain();
      musicGain.gain.value = 0;
      musicGain.connect(master);
    }
    if (level !== musicLevel) {
      musicLevel = level;
      musicGain.gain.setTargetAtTime(audio.muted || level < 0 ? 0 : level === 0 ? 0.35 : 0.5, context.currentTime, 0.4);
    }
    if (level < 0 || audio.muted) return;
    // Sixteenth notes; the tempo rises with the level.
    const beat = 60 / (level === 2 ? 148 : level === 1 ? 126 : 96) / 4,
      now = context.currentTime;
    if (nextStep < now) nextStep = now + 0.05;
    while (nextStep < now + 0.25) {
      const bar = Math.floor(step / 16) % BASS.length,
        inBar = step % 16,
        at = nextStep;
      if (inBar % 4 === 0) note(ROOTS[BASS[bar]] / 2, at, beat * 3.6, 0.2, 'triangle');
      if (level > 0 && inBar % 4 === 2) note(ROOTS[BASS[bar]], at, beat * 1.5, 0.07, 'triangle');
      if (inBar % 2 === 0) {
        const degree = TUNE[(step / 2) % TUNE.length] + (BASS[bar] % 2);
        if (degree >= 0)
          note(
            pitch(degree, level === 0 ? 0 : 1),
            at,
            beat * (level === 0 ? 3.5 : 1.8),
            level === 0 ? 0.06 : 0.07,
            level === 0 ? 'sine' : 'square',
          );
      }
      if (level > 0) {
        if (inBar % 8 === 0) {
          note(110, at, 0.14, 0.3, 'sine');
          drum(at, 140, 0.12, 0.25, 'lowpass');
        }
        if (inBar % 8 === 4) drum(at, 1800, 0.1, 0.12, 'bandpass');
        if (level === 2 || inBar % 4 === 2) drum(at, 7000, 0.03, 0.05, 'highpass');
      }
      nextStep += beat;
      step++;
    }
  };

  audio.setMuted = (muted) => {
    audio.muted = muted;
    musicLevel = -2; // the next music() call applies the new volume
  };
  return audio;
}
