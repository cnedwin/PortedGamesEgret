// The score, played live by a small step sequencer. It has one tempo and one
// four-bar harmony throughout and changes character by which parts play: a
// pad and a sparse figure when all is quiet, then a bass line, a kick, hats
// and a snare that come in as soldiers close on the operator.

const TEMPO = 104,
  STEP = 60 / TEMPO / 4; // a sixteenth note, in seconds
// Four bars: D minor, B flat, F, C. Each is a root (as a MIDI note) and the notes of its chord above it.
const BARS = [
  { root: 38, chord: [0, 3, 7, 12] },
  { root: 34, chord: [0, 4, 7, 12] },
  { root: 41, chord: [0, 4, 7, 12] },
  { root: 36, chord: [0, 4, 7, 12] },
];
const hertz = (midi) => 440 * 2 ** ((midi - 69) / 12);

/** `context` is the page's audio context and `destination` where the music is sent. */
export function createMusic(context, destination) {
  const bus = context.createGain();
  bus.gain.value = 0.5;
  bus.connect(destination);
  // An echo for the high figure.
  const echo = context.createDelay(1),
    feedback = context.createGain(),
    echoOut = context.createGain();
  echo.delayTime.value = STEP * 3;
  feedback.gain.value = 0.38;
  echoOut.gain.value = 0.5;
  echo.connect(feedback).connect(echo);
  echo.connect(echoOut).connect(bus);
  const noise = context.createBuffer(1, context.sampleRate, context.sampleRate),
    samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

  function note(type, midi, at, length, gain, { cutoff = 0, attack = 0.01, detune = 0, send } = {}) {
    const osc = context.createOscillator(),
      level = context.createGain();
    osc.type = type;
    osc.frequency.value = hertz(midi);
    osc.detune.value = detune;
    level.gain.setValueAtTime(0.0001, at);
    level.gain.exponentialRampToValueAtTime(gain, at + attack);
    level.gain.exponentialRampToValueAtTime(0.0001, at + length);
    let tail = osc;
    if (cutoff) {
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      tail = osc.connect(filter);
    }
    tail.connect(level).connect(bus);
    if (send) level.connect(echo);
    osc.start(at);
    osc.stop(at + length + 0.05);
  }
  function hit(at, length, gain, type, freq, q = 1) {
    const source = context.createBufferSource(),
      filter = context.createBiquadFilter(),
      level = context.createGain();
    source.buffer = noise;
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    level.gain.setValueAtTime(gain, at);
    level.gain.exponentialRampToValueAtTime(0.0001, at + length);
    source.connect(filter).connect(level).connect(bus);
    source.start(at, Math.random() * 0.5);
    source.stop(at + length + 0.02);
  }
  function kick(at, gain) {
    const osc = context.createOscillator(),
      level = context.createGain();
    osc.frequency.setValueAtTime(130, at);
    osc.frequency.exponentialRampToValueAtTime(42, at + 0.12);
    level.gain.setValueAtTime(gain, at);
    level.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
    osc.connect(level).connect(bus);
    osc.start(at);
    osc.stop(at + 0.25);
  }

  let nextAt = 0,
    step = 0,
    heat = 0,
    mood = 'title';
  function schedule(at) {
    const s = step % 16,
      bar = BARS[Math.floor(step / 16) % BARS.length],
      quiet = mood === 'title' || mood === 'menu';
    // Pad: the chord, held for the bar, opening up as things heat.
    if (s === 0)
      for (const [i, interval] of bar.chord.slice(0, 3).entries())
        note('sawtooth', bar.root + 12 + interval, at, STEP * 16.5, quiet ? 0.035 : 0.026, {
          cutoff: 380 + heat * 900,
          attack: 0.6,
          detune: i * 7 - 7,
        });
    // A sparse figure high up: more of it on the title screen, a note or two in the field.
    if (quiet ? s % 4 === 2 : s === 6 || (s === 14 && heat < 0.4))
      note('triangle', bar.root + 36 + bar.chord[(step >> 2) % 4], at, STEP * 3, quiet ? 0.05 : 0.032, { send: true });
    if (heat > 0.2) {
      // Bass: eighth notes on the root, jumping the octave at the end of each half bar.
      if (s % 2 === 0)
        note('sawtooth', bar.root + (s % 8 === 6 ? 12 : 0), at, STEP * 1.7, 0.13 * heat, {
          cutoff: 240 + heat * 520,
          attack: 0.005,
        });
      if (s % 4 === 0 || (heat > 0.75 && s === 10)) kick(at, 0.5 * heat);
      if (s % 2 === 1) hit(at, 0.035, 0.07 * heat, 'highpass', 7200);
      if (heat > 0.5 && (s === 4 || s === 12)) {
        hit(at, 0.14, 0.2 * heat, 'bandpass', 1700, 0.8);
        note('triangle', 50, at, 0.08, 0.1 * heat, { attack: 0.002 });
      }
    }
    // Once the helicopter is called, a rising line over the top.
    if (mood === 'extract' && [0, 3, 6, 8, 11, 14].includes(s))
      note('square', bar.root + 24 + bar.chord[(s + (step >> 4)) % 4], at, STEP * 1.6, 0.03, { cutoff: 1800, send: true });
    step++;
  }

  return {
    /**
     * Keep the music going. `nextMood` is 'title', 'field', 'extract' or
     * 'menu'; `target` is how hard the fight is, 0 to 1.
     */
    update(dt, nextMood, target) {
      mood = nextMood;
      heat += (target - heat) * Math.min(1, dt * (target > heat ? 1.2 : 0.35));
      const now = context.currentTime;
      if (nextAt < now) nextAt = now + 0.05;
      // Schedule a little ahead, so timing does not depend on the frame rate.
      while (nextAt < now + 0.3) {
        schedule(nextAt);
        nextAt += STEP;
      }
    },
    setVolume(value) {
      bus.gain.setTargetAtTime(value, context.currentTime, 0.1);
    },
    /** A short phrase over the top: 'won', 'dead' or 'terminal'. */
    sting(kind) {
      const at = context.currentTime + 0.05,
        notes = kind === 'won' ? [62, 65, 69, 74, 77] : kind === 'dead' ? [62, 58, 53, 50] : [69, 74];
      notes.forEach((midi, i) =>
        note('triangle', midi, at + i * (kind === 'dead' ? 0.32 : 0.14), kind === 'terminal' ? 0.4 : 1.2, 0.09, { send: true }),
      );
    },
  };
}
