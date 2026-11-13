// Sound, all made with Web Audio as the game runs. The music is a small
// ensemble in a pentatonic key: a plucked zither, a bowed fiddle, a bamboo
// flute, a bass, drum, woodblock, cymbals and a gong, playing a calm tune on
// the menus and a quick one in a race that speeds up and rises a tone on the
// final lap. Around it: the engine, tyres, wind, the crowd and the effects.

/** Pentatonic scale (gong, shang, jue, zhi, yu) as semitones above the key note. */
const SCALE = [0, 2, 4, 7, 9];
const KEY = 293.66; // D4

/**
 * Tunes are written on a grid of eight notes to the bar. A number is a step
 * of the scale (5 is an octave up), `-` holds the note before it, `.` is a
 * rest and `|` only marks the bar lines.
 */
const line = (text) => {
  const notes = [];
  text
    .split(/\s+/)
    .filter((token) => token && token !== '|')
    .forEach((token, at) => {
      if (token === '-') notes[notes.length - 1].length++;
      else if (token !== '.') notes.push({ at, step: Number(token), length: 1 });
    });
  return notes;
};
const REST_BAR = '. . . . . . . . | ';

const TUNES = {
  menu: {
    tempo: 84,
    bars: 8,
    flute: line(`
      7 - - 8 9 - - - | 8 - 7 - 5 - - - | 4 - 5 7 8 - 7 - | 5 - - - . . . . |
      9 - - 10 12 - - - | 10 - 9 - 8 - 7 - | 5 - 7 8 9 - 8 7 | 5 - - - - - . .`),
    roots: [0, 0, 3, 0, 4, 3, 3, 0],
    ripple: [0, 2, 4, 5, 7, 5, 4, 2],
  },
  race: {
    tempo: 152,
    bars: 16,
    fiddle: line(`
      5 5 7 8 9 - 8 7 | 8 - 7 5 7 - - . | 5 5 7 8 9 - 10 9 | 8 - 9 10 12 - - . |
      12 12 10 9 10 - 9 8 | 9 9 8 7 8 - 7 5 | 4 5 7 8 9 8 7 5 | 7 - 5 4 5 - - .`),
    // The flute rests for eight bars, then answers.
    flute: line(
      REST_BAR.repeat(8) +
        `10 - 12 - 13 12 10 9 | 10 - - 9 8 - - . | 9 - 10 - 12 10 9 8 | 7 - - 8 9 - - . |
         10 10 12 13 14 - 13 12 | 13 - 12 10 12 - - . | 9 10 12 10 9 8 7 8 | 5 - 7 9 10 - - .`,
    ),
    roots: [0, 0, 3, 3, 4, 4, 3, 0, 4, 4, 3, 3, 0, 0, 3, 0],
    ripple: [5, 7, 9, 7, 5, 7, 9, 7],
  },
};

export function createAudio() {
  let context, master, music, effects, echo, noise, engine, squeal, wind, crowd;
  let muted = false,
    tune,
    mode,
    tempo = 1,
    lift = 0,
    step = 0,
    nextTime = 0,
    timer;
  /** Scale step to a frequency in the current key. */
  const pitch = (degree) => KEY * 2 ** ((SCALE[((degree % 5) + 5) % 5] + 12 * Math.floor(degree / 5) + lift) / 12);

  /** An oscillator through a gain shaped by `shape(gain.gain)`; returns the oscillator for pitch tricks. */
  function voice(type, frequency, when, length, shape, out = effects) {
    const oscillator = context.createOscillator(),
      gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    gain.gain.setValueAtTime(0.0001, when);
    shape(gain.gain);
    oscillator.connect(gain).connect(out);
    oscillator.start(when);
    oscillator.stop(when + length + 0.05);
    return oscillator;
  }
  /** A quick attack and a fade of `length` seconds. */
  const struck = (when, length, volume) => (gain) => {
    gain.exponentialRampToValueAtTime(volume, when + 0.006);
    gain.exponentialRampToValueAtTime(0.0001, when + length);
  };
  /** A swell that is held and then let go. */
  const blown =
    (when, length, volume, attack = 0.05) =>
    (gain) => {
      gain.linearRampToValueAtTime(volume, when + attack);
      gain.setValueAtTime(volume, when + Math.max(attack, length - 0.08));
      gain.linearRampToValueAtTime(0.0001, when + length);
    };
  /** A burst of filtered noise: drums, bangs, splashes and whooshes. `sweep` moves the filter over the burst. */
  function hiss(when, length, frequency, volume, q = 1, sweep = 0, type = 'bandpass', out = effects) {
    const source = context.createBufferSource(),
      filter = context.createBiquadFilter(),
      gain = context.createGain();
    source.buffer = noise;
    source.loop = true;
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, when);
    if (sweep) filter.frequency.exponentialRampToValueAtTime(sweep, when + length);
    filter.Q.value = q;
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
    source.connect(filter).connect(gain).connect(out);
    source.start(when, Math.random());
    source.stop(when + length + 0.05);
  }

  // ---- the ensemble --------------------------------------------------------------------
  /** Zither: a bright pluck that bends into the note and rings on. */
  function zither(frequency, when, length, volume) {
    const string = voice('triangle', frequency * 1.025, when, length, struck(when, length, volume), music);
    string.frequency.exponentialRampToValueAtTime(frequency, when + 0.05);
    voice('sawtooth', frequency * 2.003, when, length * 0.4, struck(when, length * 0.4, volume * 0.16), music);
  }
  /** Fiddle: a bowed tone that slides up into the note, with vibrato that grows as it is held. */
  function fiddle(frequency, when, length, volume) {
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = Math.min(3200, frequency * 2.4);
    filter.Q.value = 0.9;
    filter.connect(music);
    filter.connect(echo);
    const bow = voice('sawtooth', frequency * 0.97, when, length, blown(when, length, volume, 0.04), filter);
    bow.frequency.exponentialRampToValueAtTime(frequency, when + 0.06);
    const wobble = context.createOscillator(),
      depth = context.createGain();
    wobble.frequency.value = 5.8;
    depth.gain.setValueAtTime(0, when);
    depth.gain.linearRampToValueAtTime(frequency * 0.012, when + Math.min(length, 0.3));
    wobble.connect(depth).connect(bow.frequency);
    wobble.start(when);
    wobble.stop(when + length + 0.05);
  }
  /** Flute: a clear tone with a breath of air at the start. */
  function flute(frequency, when, length, volume) {
    const send = context.createGain();
    send.connect(music);
    send.connect(echo);
    voice('sine', frequency, when, length, blown(when, length, volume, 0.035), send);
    voice('triangle', frequency * 2, when, length, blown(when, length, volume * 0.14, 0.035), send);
    hiss(when, 0.09, frequency * 3, volume * 0.5, 1.5, 0, 'bandpass', send);
  }
  const bass = (frequency, when, length, volume) =>
    voice('triangle', frequency, when, length, struck(when, length, volume), music);
  /** The big drum: a falling thump with a slap of skin. */
  function drum(when, volume, out = music) {
    voice('sine', 150, when, 0.3, struck(when, 0.3, volume), out).frequency.exponentialRampToValueAtTime(48, when + 0.22);
    hiss(when, 0.06, 900, volume * 0.5, 0.8, 0, 'lowpass', out);
  }
  function woodblock(when, volume, out = music) {
    voice('sine', 1480, when, 0.06, struck(when, 0.06, volume), out);
    voice('sine', 2240, when, 0.04, struck(when, 0.04, volume * 0.5), out);
  }
  const cymbal = (when, volume, out = music) => hiss(when, 0.5, 6500, volume, 0.6, 0, 'highpass', out);
  /** A gong: several clashing partials that bloom and fade slowly. */
  function gong(when, volume, out = music) {
    for (const [ratio, level] of [
      [1, 1],
      [1.32, 0.7],
      [1.71, 0.5],
      [2.58, 0.35],
      [3.4, 0.2],
    ]) {
      const fade = 2.4 / Math.sqrt(ratio);
      const partial = voice(
        'sine',
        148 * ratio,
        when,
        fade,
        (gain) => {
          gain.exponentialRampToValueAtTime(volume * level, when + 0.03);
          gain.exponentialRampToValueAtTime(0.0001, when + fade);
        },
        out,
      );
      partial.frequency.linearRampToValueAtTime(148 * ratio * 1.03, when + 0.5);
    }
    hiss(when, 0.5, 2600, volume * 0.5, 0.5, 700, 'bandpass', out);
  }

  /** Schedule the tune a little ahead of the clock, one grid step at a time. */
  function sequence() {
    if (!context || !tune) return;
    const grid = 30 / (tune.tempo * tempo),
      total = tune.bars * 8;
    while (nextTime < context.currentTime + 0.18) {
      const at = step % total,
        bar = Math.floor(at / 8),
        beat = at % 8,
        root = tune.roots[bar % tune.roots.length],
        racing = tune === TUNES.race;
      for (const note of tune.fiddle ?? [])
        if (note.at === at) fiddle(pitch(note.step), nextTime, note.length * grid * 0.96, 0.085);
      for (const note of tune.flute ?? [])
        if (note.at === at) flute(pitch(note.step), nextTime, note.length * grid * 0.94, racing ? 0.11 : 0.13);
      // The zither ripples through the chord; the bass walks under it.
      zither(pitch(root + tune.ripple[beat]), nextTime, grid * (racing ? 2.2 : 3.4), racing ? 0.05 : 0.085);
      if (racing) {
        if (beat === 0 || beat === 3 || beat === 6) bass(pitch(root) / 4, nextTime, grid * 1.9, 0.2);
        if (beat === 4) bass(pitch(root + 5) / 4, nextTime, grid * 1.9, 0.16);
        if (beat === 0 || beat === 4) drum(nextTime, 0.34);
        if (beat === 2 || beat === 6) woodblock(nextTime, 0.13);
        if (beat === 3 || beat === 7) woodblock(nextTime, 0.05);
        // A drum roll into each new section, and a crash on it.
        if (bar % 8 === 7 && beat >= 4) drum(nextTime, 0.14 + (beat - 4) * 0.06);
        if (bar % 8 === 0 && beat === 0) cymbal(nextTime, 0.16);
        if (bar === 0 && beat === 0) gong(nextTime, 0.1);
      } else if (beat === 0) bass(pitch(root) / 4, nextTime, grid * 7, 0.14);
      step++;
      nextTime += grid;
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
      // Everything meets in a compressor so loud moments do not clip.
      const squeeze = context.createDynamicsCompressor();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.8;
      master.connect(squeeze).connect(context.destination);
      music = context.createGain();
      music.gain.value = 0.62;
      music.connect(master);
      effects = context.createGain();
      effects.gain.value = 0.9;
      effects.connect(master);

      noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      // A hall for the fiddle and flute: noise that dies away, used as an echo.
      const hall = context.createBuffer(2, Math.floor(context.sampleRate * 1.6), context.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = hall.getChannelData(channel);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
      }
      const room = context.createConvolver(),
        wet = context.createGain();
      room.buffer = hall;
      wet.gain.value = 0.28;
      echo = context.createGain();
      echo.connect(room).connect(wet).connect(music);

      // The engine: two detuned saws and a low square through a filter that opens with
      // speed, chopped by a putter that smooths out as the revs rise.
      const filter = context.createBiquadFilter(),
        gain = context.createGain(),
        chop = context.createGain(),
        putter = context.createOscillator(),
        putterDepth = context.createGain();
      filter.type = 'lowpass';
      gain.gain.value = 0;
      putter.type = 'sawtooth';
      putter.connect(putterDepth).connect(chop.gain);
      putter.start();
      const voices = [
        ['sawtooth', 1],
        ['sawtooth', 1.506],
        ['square', 0.5],
      ].map(([type, ratio]) => {
        const oscillator = context.createOscillator();
        oscillator.type = type;
        oscillator.connect(filter);
        oscillator.start();
        return { oscillator, ratio };
      });
      filter.connect(chop).connect(gain).connect(effects);
      engine = { voices, filter, gain, putter, putterDepth };

      /** A looping band of noise whose loudness and colour the game steers. */
      const band = (type, frequency, q) => {
        const source = context.createBufferSource(),
          shape = context.createBiquadFilter(),
          level = context.createGain();
        source.buffer = noise;
        source.loop = true;
        shape.type = type;
        shape.frequency.value = frequency;
        shape.Q.value = q;
        level.gain.value = 0;
        source.connect(shape).connect(level).connect(effects);
        source.start(0, Math.random());
        return { shape, level };
      };
      squeal = band('bandpass', 1500, 9);
      wind = band('highpass', 900, 0.4);
      crowd = band('bandpass', 950, 0.7);
      nextTime = context.currentTime + 0.1;
      timer = setInterval(sequence, 40);
    },

    setMuted(value) {
      muted = value;
      if (master) master.gain.value = muted ? 0 : 0.8;
    },

    /** Which tune plays: 'menu', 'race', 'final' (the race tune, faster and a tone higher) or nothing. */
    music(next) {
      if (next === mode) return;
      const wanted = next === 'menu' ? TUNES.menu : next === 'race' || next === 'final' ? TUNES.race : undefined;
      tempo = next === 'final' ? 1.14 : 1;
      lift = next === 'final' ? 2 : 0;
      // Going into the final lap the tune carries on from where it is.
      if (wanted !== tune) step = 0;
      tune = wanted;
      mode = next;
      if (context) nextTime = Math.max(nextTime, context.currentTime + 0.08);
    },

    /**
     * Follow the player's kart. `speed` is a share of top speed, `drift` the
     * drift's charge level (-1 when not drifting), `rough` whether it is on
     * grass or in mud, `boost` whether it is boosting and `cheer` how loud
     * the crowd is (0 to 1). With `active` false the engine falls silent.
     */
    drive({ speed = 0, throttle = 0, drift = -1, rough = false, boost = false, cheer = 0, active = false }) {
      if (!context) return;
      const now = context.currentTime,
        rev = 58 + speed * 128 + throttle * 16 + (boost ? 26 : 0);
      for (const { oscillator, ratio } of engine.voices) oscillator.frequency.setTargetAtTime(rev * ratio, now, 0.05);
      engine.filter.frequency.setTargetAtTime(420 + speed * 2400 + (boost ? 900 : 0), now, 0.08);
      engine.gain.gain.setTargetAtTime(active ? 0.07 + throttle * 0.05 : 0, now, 0.1);
      engine.putter.frequency.setTargetAtTime(rev / 4, now, 0.05);
      engine.putterDepth.gain.setTargetAtTime(Math.max(0, 0.45 - speed * 0.7), now, 0.1);
      squeal.shape.frequency.setTargetAtTime(rough ? 320 : 1300 + Math.max(0, drift) * 420, now, 0.05);
      squeal.level.gain.setTargetAtTime(active && (drift >= 0 || (rough && speed > 0.15)) ? (rough ? 0.14 : 0.11) : 0, now, 0.05);
      wind.level.gain.setTargetAtTime(active ? speed * speed * 0.16 : 0, now, 0.15);
      wind.shape.frequency.setTargetAtTime(700 + speed * 1500, now, 0.2);
      crowd.level.gain.setTargetAtTime(cheer * 0.2, now, 0.4);
      crowd.shape.frequency.setTargetAtTime(850 + cheer * 450 + Math.sin(now * 2.3) * 120, now, 0.2);
    },

    /** Play a one-shot effect by name; `detail` carries the event it answers. */
    play(name, detail = {}) {
      if (!context || muted) return;
      const now = context.currentTime;
      const tone = (frequency, at, length, type = 'triangle', volume = 0.16, slideTo = 0) => {
        const oscillator = voice(type, frequency, now + at, length, struck(now + at, length, volume));
        if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + at + length);
      };
      const run = (steps, gap, length, type = 'triangle', volume = 0.16) =>
        steps.forEach((value, index) => tone(pitch(value), index * gap, length, type, volume));
      const effect = EFFECTS[name];
      if (effect) effect({ now, tone, run, detail });
    },

    dispose() {
      clearInterval(timer);
      context?.close();
    },
  };

  /** One-shot effects by name. Each gets the time now, `tone` and `run` helpers and the event's detail. */
  const EFFECTS = {
    click: ({ now }) => woodblock(now, 0.2, effects),
    count: ({ now }) => gong(now, 0.22, effects),
    go({ now, run }) {
      gong(now, 0.3, effects);
      cymbal(now, 0.3, effects);
      run([10, 12, 15], 0.07, 0.5, 'triangle', 0.14);
    },
    boost({ now, tone }) {
      tone(170, 0, 0.45, 'sawtooth', 0.1, 760);
      hiss(now, 0.5, 900, 0.22, 0.8, 4200);
    },
    turbo({ now, run, detail }) {
      const up = detail.level * 2;
      run([5 + up, 7 + up, 10 + up, 12 + up], 0.045, 0.2);
      hiss(now, 0.3, 1500, 0.14, 1, 5000);
    },
    driftLevel: ({ tone, detail }) => tone(pitch(8 + detail.level * 2), 0, 0.16, 'square', 0.07),
    hop: ({ tone }) => tone(260, 0, 0.1, 'sine', 0.1, 430),
    jump: ({ tone }) => tone(220, 0, 0.32, 'sine', 0.12, 700),
    trick: ({ run }) => run([10, 12, 14, 17], 0.04, 0.14, 'sine', 0.12),
    land({ now, tone }) {
      tone(110, 0, 0.14, 'sine', 0.25, 55);
      hiss(now, 0.14, 500, 0.22, 0.7, 0, 'lowpass');
    },
    wall({ now, tone }) {
      tone(125, 0, 0.14, 'square', 0.12, 60);
      hiss(now, 0.1, 900, 0.22, 1);
    },
    bump: (helpers) => EFFECTS.wall(helpers),
    // Stone, or the skin of a rolling drum.
    thud({ now, tone, detail }) {
      if (detail.drum) return drum(now, 0.5, effects);
      tone(90, 0, 0.18, 'sine', 0.35, 45);
      return hiss(now, 0.12, 2400, 0.25, 2);
    },
    box: ({ run }) => run([10, 12, 14], 0.04, 0.12, 'sine', 0.12),
    roulette: ({ now, detail }) => woodblock(now, 0.06 + (detail.tick % 3) * 0.02, effects),
    item: ({ run }) => run([7, 10, 12, 15], 0.06, 0.24),
    use: ({ tone }) => tone(520, 0, 0.16, 'triangle', 0.12, 260),
    // The ring of a coin: two high partials. A full purse plays a little run.
    coin({ tone, run, detail }) {
      if (detail.full) return run([12, 14, 15, 17, 19], 0.05, 0.3, 'sine', 0.12);
      tone(pitch(17), 0, 0.3, 'sine', 0.13);
      return tone(pitch(19), 0.05, 0.35, 'sine', 0.1);
    },
    gate({ now, run }) {
      hiss(now, 0.6, 500, 0.2, 0.6, 3600);
      run([9, 12, 14], 0.06, 0.35, 'sine', 0.1);
    },
    draft: ({ now }) => hiss(now, 0.7, 700, 0.2, 0.5, 5200),
    mud({ now, tone }) {
      tone(140, 0, 0.3, 'sine', 0.2, 50);
      hiss(now, 0.3, 700, 0.3, 1.2, 180, 'lowpass');
    },
    hit({ now, tone }) {
      tone(400, 0, 0.5, 'sawtooth', 0.14, 70);
      hiss(now, 0.3, 700, 0.25, 1);
    },
    blocked({ now, tone }) {
      tone(pitch(19), 0, 0.5, 'sine', 0.16);
      tone(pitch(22), 0.03, 0.4, 'sine', 0.1);
      hiss(now, 0.2, 7000, 0.12, 2);
    },
    // A string of firecrackers.
    pop({ now }) {
      for (let k = 0; k < 8; k++) hiss(now + k * 0.045 + Math.random() * 0.02, 0.06, 2500 + Math.random() * 2500, 0.32, 1.5);
    },
    explosion({ now, tone }) {
      tone(90, 0, 0.9, 'sine', 0.5, 30);
      hiss(now, 0.9, 400, 0.5, 0.5);
      for (let k = 0; k < 6; k++) hiss(now + 0.25 + k * 0.07, 0.08, 3000 + Math.random() * 3000, 0.16, 1.5);
    },
    // A drum roll, then the crack and its rumble.
    thunder({ now }) {
      for (let k = 0; k < 6; k++) drum(now + k * 0.07, 0.3, effects);
      hiss(now + 0.42, 0.2, 5000, 0.5, 0.4);
      hiss(now + 0.45, 1.6, 600, 0.5, 0.3, 90, 'lowpass');
    },
    gong: ({ now }) => gong(now, 0.5, effects),
    ink({ now, tone }) {
      tone(300, 0, 0.25, 'sine', 0.16, 80);
      hiss(now, 0.25, 1200, 0.3, 1.5, 250, 'lowpass');
    },
    cloud({ now, run }) {
      hiss(now, 1.1, 400, 0.24, 0.6, 5000);
      run([5, 7, 9, 10, 12, 14, 15, 17], 0.05, 0.3, 'sine', 0.09);
    },
    jade: ({ run }) => run([14, 17, 19], 0.07, 0.5, 'sine', 0.11),
    overtake: ({ run }) => run([9, 12], 0.07, 0.22, 'triangle', 0.13),
    lap: ({ run }) => run([7, 9, 12], 0.08, 0.25),
    final({ now, run }) {
      gong(now, 0.25, effects);
      run([7, 9, 12, 14, 17], 0.07, 0.3);
    },
    finish({ now, run }) {
      gong(now, 0.3, effects);
      cymbal(now, 0.3, effects);
      run([5, 7, 9, 10, 12, 14, 15, 17], 0.09, 0.5);
    },
    stall: ({ tone }) => tone(160, 0, 0.6, 'sawtooth', 0.12, 50),
  };
  return audio;
}
