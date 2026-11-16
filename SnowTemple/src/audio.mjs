// Sound, all of it made here from oscillators and noise: wind over the snow, a sparse tune plucked on
// five notes, and the ring, thud and hiss of the fight. Music sits well under the blows.

export function createAudio() {
  let context = null,
    master,
    musicBus,
    noiseBuffer,
    on = true,
    mood = 'road',
    nextNote = 0,
    step = 0;
  const audio = {};

  function start() {
    if (context) return context.resume();
    const Ctx = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctx) return;
    context = new Ctx();
    master = context.createGain();
    master.gain.value = on ? 0.9 : 0;
    const squash = context.createDynamicsCompressor();
    master.connect(squash).connect(context.destination);
    musicBus = context.createGain();
    musicBus.gain.value = 0.3;
    musicBus.connect(master);
    // Seven seconds of noise, long enough that the wind does not audibly repeat.
    noiseBuffer = context.createBuffer(1, context.sampleRate * 7, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = last * 0.985 + (Math.random() * 2 - 1) * 0.12;
      data[i] = last + (Math.random() * 2 - 1) * 0.25;
    }
    for (const [frequency, q, gain, rate] of [
      [320, 1.2, 0.2, 0.07],
      [900, 3, 0.07, 0.11]
    ]) {
      const source = context.createBufferSource(),
        filter = context.createBiquadFilter(),
        level = context.createGain(),
        sway = context.createOscillator(),
        depth = context.createGain();
      source.buffer = noiseBuffer;
      source.loop = true;
      filter.type = 'bandpass';
      filter.frequency.value = frequency;
      filter.Q.value = q;
      level.gain.value = gain;
      sway.frequency.value = rate;
      depth.gain.value = frequency * 0.45;
      sway.connect(depth).connect(filter.frequency);
      source.connect(filter).connect(level).connect(master);
      source.start();
      sway.start();
    }
    nextNote = context.currentTime + 0.5;
  }

  const env = (node, at, attack, hold, peak) => {
    node.gain.setValueAtTime(0.0001, at);
    node.gain.exponentialRampToValueAtTime(peak, at + attack);
    node.gain.exponentialRampToValueAtTime(0.0001, at + attack + hold);
  };
  function tone(frequency, { at = 0, type = 'sine', attack = 0.005, hold = 0.3, peak = 0.3, slide = 0, bus = master } = {}) {
    if (!context) return;
    const t = context.currentTime + at,
      osc = context.createOscillator(),
      gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, frequency * slide), t + attack + hold);
    env(gain, t, attack, hold, peak);
    osc.connect(gain).connect(bus);
    osc.start(t);
    osc.stop(t + attack + hold + 0.05);
  }
  function hiss(frequency, { at = 0, q = 1, attack = 0.005, hold = 0.2, peak = 0.3, slide = 0, type = 'bandpass' } = {}) {
    if (!context) return;
    const t = context.currentTime + at,
      source = context.createBufferSource(),
      filter = context.createBiquadFilter(),
      gain = context.createGain();
    source.buffer = noiseBuffer;
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(frequency, t);
    if (slide) filter.frequency.exponentialRampToValueAtTime(frequency * slide, t + attack + hold);
    env(gain, t, attack, hold, peak);
    source.connect(filter).connect(gain).connect(master);
    source.start(t, Math.random() * 5);
    source.stop(t + attack + hold + 0.05);
  }
  /** Struck metal: a few partials that are not in tune with one another. */
  const ring = (base, peak, hold, at = 0) => [1, 2.76, 5.4, 8.9].forEach((ratio, i) => tone(base * ratio, { at, type: 'sine', hold: hold / (1 + i * 0.5), peak: peak / (1 + i * 0.8) }));

  const SOUNDS = {
    swing: (e) => hiss([1400, 900, 600][e.cut] ?? 1000, { q: 0.9, hold: 0.16, peak: 0.34, slide: 2.6 }),
    hit(e) {
      hiss(e.heavy ? 900 : 1700, { q: 0.7, hold: 0.09, peak: 0.6 });
      tone(e.heavy ? 90 : 140, { type: 'triangle', hold: 0.16, peak: 0.6, slide: 0.5 });
      if (e.heavy) ring(520, 0.12, 0.3);
    },
    deflect: () => (ring(980, 0.3, 0.3), hiss(3000, { hold: 0.05, peak: 0.3 })),
    block: () => (ring(700, 0.4, 0.28), tone(120, { type: 'triangle', hold: 0.12, peak: 0.5 })),
    parry() {
      ring(1320, 0.55, 0.9);
      ring(1980, 0.3, 0.7, 0.03);
      hiss(5200, { hold: 0.08, peak: 0.4 });
    },
    guardBreak: () => (tone(160, { type: 'sawtooth', hold: 0.4, peak: 0.4, slide: 0.4 }), ring(400, 0.3, 0.5)),
    shieldBreak: () => (hiss(700, { hold: 0.25, peak: 0.6 }), ring(360, 0.3, 0.5)),
    postureBreak: () => (ring(300, 0.5, 1.2), tone(60, { type: 'sine', hold: 0.6, peak: 0.7 })),
    interrupt: () => ring(820, 0.4, 0.5),
    dodge: () => hiss(700, { q: 0.6, hold: 0.22, peak: 0.3, slide: 0.4 }),
    slip: () => (tone(1200, { hold: 0.5, peak: 0.16, slide: 0.5 }), hiss(2400, { hold: 0.4, peak: 0.14, slide: 0.3 })),
    hurt: (e) => (tone(e.heavy ? 70 : 100, { type: 'sawtooth', hold: 0.25, peak: 0.6, slide: 0.5 }), hiss(500, { hold: 0.15, peak: 0.5 })),
    fall: () => tone(110, { type: 'sine', hold: 1.6, peak: 0.5, slide: 0.35 }),
    riposte: () => hiss(2200, { hold: 0.2, peak: 0.4, slide: 3 }),
    riposteHit: () => (ring(660, 0.5, 0.8), tone(70, { hold: 0.4, peak: 0.8, slide: 0.5 }), hiss(1200, { hold: 0.25, peak: 0.6 })),
    starsStart: () => tone(520, { hold: 0.24, peak: 0.2, slide: 2 }),
    stars: () => [0, 0.03, 0.06].forEach((at, i) => hiss(2600 + i * 500, { at, hold: 0.25, peak: 0.3, slide: 0.4 })),
    starHit: () => ring(1500, 0.2, 0.3),
    cutArrow: () => (ring(1700, 0.2, 0.2), hiss(4000, { hold: 0.04, peak: 0.3 })),
    rain() {
      for (let i = 0; i < 6; i++) tone(196 * Math.pow(1.335, i), { at: i * 0.08, hold: 1.6, peak: 0.12, type: 'triangle' });
      hiss(600, { hold: 1.2, peak: 0.3, slide: 5, attack: 0.5 });
    },
    spear: () => (hiss(1800, { hold: 0.1, peak: 0.34, slide: 0.3 }), tone(180, { type: 'triangle', hold: 0.12, peak: 0.34, slide: 0.5 })),
    burst: () => (tone(55, { hold: 1.1, peak: 1, slide: 0.5 }), hiss(300, { hold: 0.8, peak: 0.8, q: 0.4 }), ring(392, 0.4, 1.6)),
    windup: (e) => e.kind === 'lu' && tone(e.move.unblockable ? 233 : 175, { type: 'sawtooth', attack: e.time * 0.8, hold: 0.12, peak: 0.12, slide: 1.5 }),
    strike(e) {
      if (e.kind === 'bow') return hiss(3000, { hold: 0.12, peak: 0.3, slide: 0.3 });
      hiss(e.kind === 'lu' ? 500 : 900, { q: 0.8, hold: 0.2, peak: e.kind === 'lu' ? 0.6 : 0.34, slide: 2.2 });
      if (e.move.shape === 'disc' || e.move.shape === 'lines') tone(60, { hold: 0.5, peak: 0.8, slide: 0.5 });
    },
    death: () => tone(150, { type: 'triangle', hold: 0.5, peak: 0.3, slide: 0.4 }),
    dropLand: (e) => [0, 1, 2].slice(0, e.grade + 1).forEach((i) => ring(880 * [1, 1.5, 2][i], 0.1 + e.grade * 0.05, 0.4 + e.grade * 0.5, i * 0.09)),
    pickup: (e) => tone(660 * (1 + e.grade * 0.25), { hold: 0.2, peak: 0.2, slide: 1.5 }),
    drink: () => [0, 0.14, 0.28].forEach((at) => tone(300, { at, hold: 0.1, peak: 0.24, slide: 0.6 })),
    rest: () => [262, 392, 523].forEach((f, i) => tone(f, { at: i * 0.18, hold: 1.4, peak: 0.16, type: 'triangle' })),
    party: () => tone(98, { type: 'sawtooth', hold: 0.8, peak: 0.2 }),
    alert: () => tone(147, { type: 'sawtooth', hold: 0.5, peak: 0.2, slide: 1.3 })
  };
  /** A deep struck bell, for title cards. */
  audio.gong = () => (ring(98, 0.5, 4), tone(49, { hold: 3, peak: 0.5 }));
  audio.play = (event) => context && on && SOUNDS[event.type]?.(event);
  audio.start = start;
  audio.setOn = (value) => {
    on = value;
    if (master) master.gain.value = on ? 0.9 : 0;
  };
  audio.setMood = (value) => (mood = value);

  // The tune: single plucked notes of a five-note scale over a low drone; a drum joins for Lu Qian.
  const SCALE = [146.83, 174.61, 196, 220, 261.63, 293.66, 349.23, 392];
  const LINES = { road: [0, -1, 2, -1, 4, 3, -1, 2, -1, -1, 5, 4, 2, -1, 0, -1], yard: [0, 2, 4, 2, 5, 4, 2, 0, 3, 2, 0, 2, 4, 5, 4, 2], boss: [0, 0, 4, 0, 5, 0, 4, 2, 0, 0, 6, 5, 4, 2, 4, 0] };
  audio.update = () => {
    if (!context || !on) return;
    while (nextNote < context.currentTime + 0.2) {
      const at = nextNote - context.currentTime,
        fast = mood !== 'road',
        line = LINES[mood] ?? LINES.road,
        note = line[step % line.length];
      if (note >= 0) {
        const f = SCALE[note] * (mood === 'boss' ? 1 : 2);
        tone(f, { at, type: 'triangle', attack: 0.004, hold: fast ? 0.5 : 1.6, peak: 0.5, bus: musicBus });
        tone(f * 2.005, { at, type: 'sine', attack: 0.004, hold: 0.25, peak: 0.2, bus: musicBus });
      }
      if (step % 8 === 0) tone(73.4, { at, type: 'sine', attack: 0.4, hold: fast ? 2.4 : 4.5, peak: 0.5, bus: musicBus });
      if (mood === 'boss' && step % 2 === 0) tone(step % 8 === 0 ? 60 : 82, { at, type: 'sine', hold: 0.22, peak: 0.9, slide: 0.5, bus: musicBus });
      nextNote += mood === 'boss' ? 0.24 : mood === 'yard' ? 0.34 : 0.62;
      step++;
    }
  };
  return audio;
}
