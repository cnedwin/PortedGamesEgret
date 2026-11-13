// Sound, all made with Web Audio as the game runs: the engine, tyre squeal,
// one-shot effects, and a pentatonic tune that is calm on the menus, quicker
// in a race and quicker still on the final lap.

/** Pentatonic scale (gong, shang, jue, zhi, yu) as semitones above the key note. */
const SCALE = [0, 2, 4, 7, 9];
const KEY = 293.66; // D4
/** Scale step (may run past one octave or below zero) to a frequency. */
const pitch = (step) => KEY * 2 ** ((SCALE[((step % 5) + 5) % 5] + 12 * Math.floor(step / 5)) / 12);

// Tunes as scale steps, one entry per half beat; undefined is a rest.
const _ = undefined;
const TUNES = {
  menu: {
    tempo: 96,
    lead: [5, _, 7, 8, 9, _, 8, 7, 5, _, 4, 5, 3, _, _, _, 4, _, 5, 7, 8, _, 7, 5, 4, _, 3, 2, 3, _, _, _],
    bass: [0, _, _, _, 3, _, _, _, 0, _, _, _, -2, _, _, _],
  },
  race: {
    tempo: 148,
    lead: [5, 5, 7, 8, 9, 8, 7, 5, 7, _, 9, 10, 9, _, 7, _, 8, 8, 9, 10, 12, 10, 9, 8, 7, 5, 7, 8, 5, _, _, _],
    bass: [0, 0, 5, 0, 3, 3, 8, 3, -1, -1, 4, -1, -2, -2, 3, -2],
  },
};

export function createAudio() {
  let context,
    master,
    noise,
    engine,
    squeal,
    muted = false;
  let tune,
    tempo = 1,
    step = 0,
    nextTime = 0,
    timer;

  /** A pitched note with a quick attack and a decay of `length` seconds. */
  function note(frequency, when, length, type, volume, slideTo) {
    const oscillator = context.createOscillator(),
      gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, when + length);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
    oscillator.connect(gain).connect(master);
    oscillator.start(when);
    oscillator.stop(when + length + 0.02);
  }
  /** A burst of filtered noise: drums, bangs and skids. */
  function hiss(when, length, frequency, volume, q = 1) {
    const source = context.createBufferSource(),
      filter = context.createBiquadFilter(),
      gain = context.createGain();
    source.buffer = noise;
    source.loop = true;
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = q;
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
    source.connect(filter).connect(gain).connect(master);
    source.start(when, Math.random());
    source.stop(when + length + 0.02);
  }

  /** Schedule the tune a little ahead of the clock. */
  function sequence() {
    if (!context || !tune) return;
    const half = 30 / (tune.tempo * tempo);
    while (nextTime < context.currentTime + 0.15) {
      const lead = tune.lead[step % tune.lead.length],
        bass = tune.bass[step % tune.bass.length];
      // The lead is plucked, like a zither: a bright start and a long fade, doubled an octave up.
      if (lead !== undefined) {
        note(pitch(lead), nextTime, half * 2.6, 'triangle', 0.11);
        note(pitch(lead) * 2.003, nextTime, half * 1.2, 'sine', 0.035);
      }
      if (bass !== undefined) note(pitch(bass) / 4, nextTime, half * 1.8, 'sine', 0.16);
      if (tune === TUNES.race) {
        // Drum on the beat, woodblock off it.
        if (step % 4 === 0) note(110, nextTime, 0.16, 'sine', 0.3, 45);
        if (step % 4 === 2) hiss(nextTime, 0.05, 2400, 0.1, 6);
        if (step % 8 === 6) hiss(nextTime, 0.09, 5200, 0.05, 2);
      }
      step++;
      nextTime += half;
    }
  }

  const audio = {
    /** Browsers only allow sound after a click or key press; call this from one. */
    unlock() {
      if (context) {
        if (context.state === 'suspended') context.resume();
        return;
      }
      const AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!AudioContext) return;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.7;
      master.connect(context.destination);
      noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

      // The engine: two detuned saws through a low-pass filter that opens with speed.
      const filter = context.createBiquadFilter(),
        gain = context.createGain();
      filter.type = 'lowpass';
      gain.gain.value = 0;
      const voices = [1, 1.51].map((ratio) => {
        const oscillator = context.createOscillator();
        oscillator.type = 'sawtooth';
        oscillator.connect(filter);
        oscillator.start();
        return { oscillator, ratio };
      });
      filter.connect(gain).connect(master);
      engine = { voices, filter, gain };

      // Tyre squeal: a narrow band of noise, heard while drifting.
      const source = context.createBufferSource(),
        band = context.createBiquadFilter(),
        level = context.createGain();
      source.buffer = noise;
      source.loop = true;
      band.type = 'bandpass';
      band.Q.value = 9;
      level.gain.value = 0;
      source.connect(band).connect(level).connect(master);
      source.start();
      squeal = { band, level };
      nextTime = context.currentTime + 0.1;
      timer = setInterval(sequence, 50);
    },

    setMuted(value) {
      muted = value;
      if (master) master.gain.value = muted ? 0 : 0.7;
    },

    /** Which tune plays: 'menu', 'race', 'final' (the race tune, faster) or nothing. */
    music(mode) {
      const wanted = mode === 'menu' ? TUNES.menu : mode === 'race' || mode === 'final' ? TUNES.race : undefined;
      tempo = mode === 'final' ? 1.16 : 1;
      if (wanted === tune) return;
      tune = wanted;
      step = 0;
      if (context) nextTime = context.currentTime + 0.1;
    },

    /** Follow the player's kart: speed as a share of top speed, and the drift's charge level (-1 when not drifting). */
    drive(speed, throttle, driftLevel, active) {
      if (!context) return;
      const now = context.currentTime,
        rev = 62 + speed * 118 + throttle * 14;
      for (const voice of engine.voices) voice.oscillator.frequency.setTargetAtTime(rev * voice.ratio, now, 0.05);
      engine.filter.frequency.setTargetAtTime(500 + speed * 2200, now, 0.08);
      engine.gain.gain.setTargetAtTime(active ? 0.05 + throttle * 0.035 : 0, now, 0.1);
      squeal.band.frequency.setTargetAtTime(1300 + Math.max(0, driftLevel) * 420, now, 0.05);
      squeal.level.gain.setTargetAtTime(active && driftLevel >= 0 ? 0.1 : 0, now, 0.05);
    },

    /** Play a one-shot effect by name. */
    play(name, detail = {}) {
      if (!context || muted) return;
      const now = context.currentTime;
      const run = (steps, gap, length, type = 'triangle', volume = 0.16) =>
        steps.forEach((value, index) => note(pitch(value), now + index * gap, length, type, volume));
      switch (name) {
        case 'click':
          return note(pitch(5), now, 0.09, 'triangle', 0.14);
        case 'count':
          // A gong for each number.
          note(196, now, 0.5, 'sine', 0.3);
          return note(196 * 2.01, now, 0.3, 'triangle', 0.1);
        case 'go':
          note(392, now, 0.9, 'sine', 0.32);
          note(392 * 2.01, now, 0.6, 'triangle', 0.12);
          return hiss(now, 0.5, 6000, 0.12, 0.7);
        case 'boost':
          note(180, now, 0.4, 'sawtooth', 0.1, 720);
          return hiss(now, 0.4, 1800, 0.16, 0.8);
        case 'turbo':
          return run([5 + detail.level * 2, 7 + detail.level * 2, 10 + detail.level * 2], 0.05, 0.16);
        case 'driftLevel':
          return note(pitch(8 + detail.level * 2), now, 0.14, 'square', 0.06);
        case 'hop':
          return note(260, now, 0.1, 'sine', 0.1, 420);
        case 'jump':
          return note(220, now, 0.3, 'sine', 0.12, 660);
        case 'land':
          return hiss(now, 0.12, 300, 0.25, 0.8);
        case 'wall':
        case 'bump':
          note(120, now, 0.14, 'square', 0.12, 60);
          return hiss(now, 0.1, 900, 0.2, 1);
        case 'box':
          return run([10, 12, 14], 0.04, 0.1, 'sine', 0.12);
        case 'roulette':
          return note(pitch(5 + (detail.tick % 5)), now, 0.05, 'square', 0.05);
        case 'item':
          return run([7, 10, 12, 15], 0.06, 0.2);
        case 'use':
          return note(520, now, 0.16, 'triangle', 0.12, 260);
        case 'hit':
          note(400, now, 0.5, 'sawtooth', 0.14, 70);
          return hiss(now, 0.3, 700, 0.25, 1);
        case 'pop':
          // A string of firecrackers.
          for (let k = 0; k < 7; k++) hiss(now + k * 0.045 + Math.random() * 0.02, 0.06, 2500 + Math.random() * 2500, 0.3, 1.5);
          return undefined;
        case 'explosion':
          note(90, now, 0.9, 'sine', 0.5, 30);
          return hiss(now, 0.9, 400, 0.5, 0.5);
        case 'thunder':
          // A drum roll, then the crack.
          for (let k = 0; k < 6; k++) note(80, now + k * 0.07, 0.12, 'sine', 0.3, 50);
          return hiss(now + 0.42, 1.1, 1200, 0.5, 0.3);
        case 'lap':
          return run([7, 9, 12], 0.08, 0.25);
        case 'final':
          return run([7, 9, 12, 14, 17], 0.07, 0.3);
        case 'finish':
          return run([5, 7, 9, 10, 12, 14, 15, 17], 0.09, 0.5);
        case 'stall':
          return note(160, now, 0.6, 'sawtooth', 0.12, 50);
        default:
          return undefined;
      }
    },

    dispose() {
      clearInterval(timer);
      context?.close();
    },
  };
  return audio;
}
