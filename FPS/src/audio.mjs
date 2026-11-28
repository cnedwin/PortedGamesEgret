// Sound, all of it synthesised with the Web Audio API as it is needed: shots
// are shaped noise, clicks and thumps; the valley wind, the generators' hum
// and the helicopter are loops built from filtered noise and a few tones.

import { createBrowserAudio } from '@egret/engine/web/audio';
import { createMusic } from './music.mjs';

export function createAudio() {
  let context, nativeAudio, master, noiseBuffer, ambience, rooms, music;
  let closed = false, disposing;
  let inside = false,
    chirpIn = 3;
  let volume = 0.8;
  const audio = { ready: false };

  function start() {
    if (closed) return false;
    if (context) return true;
    const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Context) return false;
    context = new Context();
    // Keep one lazily created context for the procedural score and effects.
    // Egret owns the host master/limiter; all existing graph tails still
    // connect to this master. Explicit compressor defaults preserve the old
    // Web Audio sound, rather than adopting the engine's different preset.
    nativeAudio = createBrowserAudio({
      context, volume,
      limiter: { threshold: -14, knee: 30, ratio: 5, attack: 0.003, release: 0.25 },
      // Non-gameplay pause/visibility behavior is unchanged by this migration.
      pauseWhenHidden: false,
    });
    master = nativeAudio.output;
    // Two seconds of white noise, reused by every noisy sound.
    noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    // Two rooms to send sounds into: the open valley, and the hard walls indoors.
    rooms = { valley: room(2.8, 0.55), hall: room(1.0, 0.25) };
    music = createMusic(context, master);
    ambience = startAmbience();
    audio.ready = true;
    return true;
  }
  /** Browsers only allow sound after a click or key press; call this from one. */
  audio.resume = () => {
    // The first caller is already inside a trusted gesture. Because the
    // graph is created lazily, the engine's newly attached gesture listener
    // may not have seen this event; resume now and let it track later unlocks.
    if (start() && context.state === 'suspended') void context.resume().catch(() => {});
  };
  audio.setVolume = (value) => {
    if (!Number.isFinite(value)) return;
    volume = Math.max(0, Math.min(1, value));
    nativeAudio?.mixer.master.setVolume(volume);
  };
  audio.dispose = () => {
    if (disposing) return disposing;
    closed = true;
    audio.ready = false;
    const owningContext = context, host = nativeAudio;
    context = nativeAudio = master = noiseBuffer = ambience = rooms = music = undefined;
    // The engine disposes its buses/listeners. This context is ours; closing
    // it also retires every looping procedural source and its custom graph.
    disposing = (async () => {
      try { host?.dispose(); }
      finally { if (owningContext && owningContext.state !== 'closed') await owningContext.close(); }
    })();
    return disposing;
  };
  audio.setPaused = (paused) => {
    if (ambience) ambience.out.gain.setTargetAtTime(paused ? 0.25 : 1, context.currentTime, 0.2);
  };

  /** A reverberant space: `seconds` of fading noise used as an impulse response; a larger `dull` loses its highs sooner. */
  function room(seconds, dull) {
    const length = Math.floor(context.sampleRate * seconds),
      impulse = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      let last = 0;
      for (let i = 0; i < length; i++) {
        const fade = (1 - i / length) ** 2.6;
        // A one-pole low-pass whose weight grows along the tail, so the echo darkens as it dies.
        last += (Math.random() * 2 - 1 - last) * (1 - dull * (0.4 + (0.6 * i) / length));
        data[i] = last * fade;
      }
    }
    const convolver = context.createConvolver(),
      level = context.createGain();
    convolver.buffer = impulse;
    level.gain.value = 0.9;
    convolver.connect(level).connect(master);
    return convolver;
  }
  function echoSend(node, amount) {
    const send = context.createGain();
    send.gain.value = amount;
    node.connect(send).connect(inside ? rooms.hall : rooms.valley);
  }

  // ---- building blocks -----------------------------------------------------------------------
  const out = (pan) => {
    if (!pan || !context.createStereoPanner) return master;
    const node = context.createStereoPanner();
    node.pan.value = Math.max(-1, Math.min(1, pan));
    node.connect(master);
    return node;
  };
  /** A burst of filtered noise. `freq` may sweep to `to`. */
  function noise({
    at = 0,
    dur = 0.1,
    freq = 1000,
    to,
    q = 1,
    type = 'bandpass',
    gain = 0.5,
    attack = 0.002,
    pan = 0,
    rate = 1,
    wet = 0,
  }) {
    if (!audio.ready) return;
    const t = context.currentTime + at,
      source = context.createBufferSource(),
      filter = context.createBiquadFilter(),
      level = context.createGain();
    source.buffer = noiseBuffer;
    source.loop = true;
    source.playbackRate.value = rate;
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(freq, t);
    if (to) filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    level.gain.setValueAtTime(0.0001, t);
    level.gain.exponentialRampToValueAtTime(gain, t + attack);
    level.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    source.connect(filter).connect(level).connect(out(pan));
    if (wet) echoSend(level, wet);
    source.start(t, Math.random() * 1.5);
    source.stop(t + dur + 0.05);
  }
  /** A note that may glide from `freq` to `to`. */
  function tone({ at = 0, dur = 0.1, freq = 440, to, type = 'sine', gain = 0.3, attack = 0.003, pan = 0, wet = 0 }) {
    if (!audio.ready) return;
    const t = context.currentTime + at,
      osc = context.createOscillator(),
      level = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(10, to), t + dur);
    level.gain.setValueAtTime(0.0001, t);
    level.gain.exponentialRampToValueAtTime(gain, t + attack);
    level.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(level).connect(out(pan));
    if (wet) echoSend(level, wet);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
  const jitter = (spread) => 1 + (Math.random() - 0.5) * spread;

  // ---- loops: wind, generators, helicopter, a low bed of tension -----------------------------
  function startAmbience() {
    const outGain = context.createGain();
    outGain.connect(master);
    const loop = (freq, type, q, gain) => {
      const source = context.createBufferSource(),
        filter = context.createBiquadFilter(),
        level = context.createGain();
      source.buffer = noiseBuffer;
      source.loop = true;
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      level.gain.value = gain;
      source.connect(filter).connect(level).connect(outGain);
      source.start(0, Math.random());
      return { filter, level };
    };
    const hum = (freq, gain) => {
      const osc = context.createOscillator(),
        level = context.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      level.gain.value = gain;
      osc.connect(level).connect(outGain);
      osc.start();
      return level;
    };
    const rain = loop(5200, 'highpass', 0.5, 0),
      patter = loop(900, 'bandpass', 0.6, 0);
    const wind = loop(420, 'lowpass', 0.4, 0.05),
      water = loop(110, 'lowpass', 0.7, 0.16),
      generators = [hum(50, 0), hum(100, 0), hum(150, 0)],
      rotor = loop(170, 'bandpass', 1.2, 0),
      rotorLow = hum(46, 0);
    // The rotor's chop: its loudness beats twenty-odd times a second.
    const chop = context.createOscillator(),
      chopDepth = context.createGain();
    chop.frequency.value = 23;
    chopDepth.gain.value = 0;
    chop.connect(chopDepth).connect(rotor.level.gain);
    chop.start();
    // Tension: two detuned low notes that swell while soldiers are hunting.
    const bed = context.createGain(),
      bedFilter = context.createBiquadFilter();
    bed.gain.value = 0;
    bedFilter.type = 'lowpass';
    bedFilter.frequency.value = 260;
    for (const freq of [55, 55.7, 82.4]) {
      const osc = context.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.connect(bedFilter);
      osc.start();
    }
    bedFilter.connect(bed).connect(outGain);
    return { out: outGain, rain, patter, wind, water, generators, rotor, rotorLow, chopDepth, bed };
  }
  let heartbeat = 0;
  /** Follow the game each frame: where the operator is, how hot the fight is, how near the helicopter. */
  audio.update = (dt, game, helicopter, mode) => {
    if (!audio.ready) return;
    const p = game.player,
      now = context.currentTime,
      indoors = game.isIndoors(p.x, p.z),
      inPlant = indoors && p.x < 16;
    // Rain: a hiss in the open, a duller drumming on the roof indoors.
    ambience.rain.level.gain.setTargetAtTime(indoors ? 0.006 : 0.03, now, 0.4);
    ambience.patter.level.gain.setTargetAtTime(indoors ? 0.07 : 0.012, now, 0.4);
    const gust = 0.045 + 0.03 * Math.sin(now * 0.31) + 0.015 * Math.sin(now * 1.3);
    ambience.wind.level.gain.setTargetAtTime(indoors ? gust * 0.35 : gust, now, 0.3);
    // The spillway is to the north; it grows louder towards the dam.
    ambience.water.level.gain.setTargetAtTime((indoors ? 0.05 : 0.1) + Math.max(0, (10 - p.z) / 40) * 0.14, now, 0.4);
    const nearPlant = Math.max(0, 1 - Math.hypot(p.x - 4, p.z + 17) / 34);
    ambience.generators.forEach((level, i) =>
      level.gain.setTargetAtTime((inPlant ? 0.09 : nearPlant * 0.03) / (i + 1), now, 0.3),
    );
    ambience.rotor.level.gain.setTargetAtTime(helicopter * 0.5, now, 0.2);
    ambience.chopDepth.gain.setTargetAtTime(helicopter * 0.4, now, 0.2);
    ambience.rotorLow.gain.setTargetAtTime(helicopter * 0.12, now, 0.2);
    let hunting = 0;
    for (const enemy of game.enemies) if (!enemy.dead && enemy.aware) hunting++;
    ambience.bed.gain.setTargetAtTime(0, now, 0.5);
    // Music follows the fight: quiet while unnoticed, driving once hunted, urgent when it is time to leave.
    const leaving = game.terminalsDone === game.terminals.length;
    music.update(
      dt,
      mode === 'title' ? 'title' : mode !== 'play' ? 'menu' : leaving ? 'extract' : 'field',
      mode === 'play' && game.state === 'play' ? Math.min(1, hunting * 0.22 + (leaving ? 0.35 : 0)) : 0,
    );
    inside = indoors;
    // Birds at first light, when nobody is shooting.
    chirpIn -= dt;
    if (chirpIn <= 0) {
      chirpIn = 1.5 + Math.random() * 5;
      if (!indoors && hunting === 0) {
        const pitch = 2600 + Math.random() * 2200,
          side = Math.random() * 2 - 1;
        for (let i = 0; i < 2 + Math.floor(Math.random() * 4); i++)
          tone({
            at: i * 0.11,
            freq: pitch * (1 + (i % 2) * 0.12),
            to: pitch * 1.25,
            dur: 0.07,
            gain: 0.018,
            pan: side,
            wet: 0.5,
          });
      }
    }
    // A heartbeat when badly hurt.
    if (game.state === 'play' && p.health < 30) {
      heartbeat -= dt;
      if (heartbeat <= 0) {
        heartbeat = 0.85;
        tone({ freq: 62, to: 40, dur: 0.14, gain: 0.5 });
        tone({ at: 0.2, freq: 55, to: 36, dur: 0.14, gain: 0.35 });
      }
    }
  };

  // ---- one-shot sounds -----------------------------------------------------------------------
  function gunshot(kind, indoors) {
    const rifle = kind === 'rifle';
    noise({ dur: rifle ? 0.11 : 0.08, freq: rifle ? 2100 : 2800, to: 320, q: 0.6, gain: 0.95, rate: jitter(0.08), wet: 0.5 });
    // The action cycling: a small metallic clack just after the shot.
    noise({ at: 0.05, dur: 0.025, freq: 3400, q: 4, gain: 0.16 });
    noise({ dur: 0.03, freq: 5200, type: 'highpass', gain: 0.5 });
    tone({ freq: rifle ? 165 : 210, to: 48, dur: rifle ? 0.1 : 0.07, gain: 0.85, wet: 0.35 });
    // The report rolling round the valley, or slapping off the walls indoors.
    noise({
      at: 0.03,
      dur: indoors ? 0.3 : 0.75,
      freq: indoors ? 1400 : 760,
      to: 180,
      type: 'lowpass',
      gain: indoors ? 0.32 : 0.2,
    });
  }
  const ui = {
    click: () => tone({ freq: 880, to: 660, dur: 0.05, type: 'triangle', gain: 0.12 }),
  };
  audio.click = () => ui.click();

  audio.handle = (event, game) => {
    if (!audio.ready) return;
    const p = game.player;
    /** Loudness and left/right placement for something happening at (x, z). */
    const where = (x, z) => {
      const dx = x - p.x,
        dz = z - p.z,
        distance = Math.hypot(dx, dz),
        side = (dx * Math.cos(p.yaw) - dz * Math.sin(p.yaw)) / (distance || 1);
      return { distance, pan: side * 0.8, near: 1 / (1 + distance * 0.07) };
    };
    switch (event.type) {
      case 'shot':
        gunshot(event.weapon, game.isIndoors(p.x, p.z));
        // The spent case rings on the ground a moment later.
        for (const [i, delay] of [0.42, 0.5, 0.56].entries())
          tone({
            at: delay + Math.random() * 0.05,
            freq: 3600 + Math.random() * 1400,
            dur: 0.05,
            gain: 0.035 / (i + 1),
            pan: 0.4,
          });
        if (event.surface) {
          // What the round hit: steel rings, everything else thuds.
          const w = where(event.toX, event.toZ),
            delay = Math.min(0.3, w.distance / 340),
            steel =
              ['container', 'generator', 'roof', 'transformer', 'barrel', 'tank', 'penstock', 'cabinet', 'server'].includes(
                event.surface,
              ) || event.surface.startsWith('truck');
          if (steel)
            tone({
              at: delay,
              freq: 1900 + Math.random() * 1600,
              to: 1500,
              dur: 0.18,
              type: 'triangle',
              gain: 0.22 * w.near,
              pan: w.pan,
              wet: 0.3,
            });
          noise({ at: delay, dur: 0.06, freq: steel ? 4200 : 900, q: 1.2, gain: 0.3 * w.near, pan: w.pan, wet: 0.2 });
        }
        if (event.enemy) {
          tone({ at: 0.02, freq: event.head ? 2300 : 1500, dur: 0.045, type: 'square', gain: 0.1 });
          if (event.killed) {
            tone({ at: 0.06, freq: 980, dur: 0.09, type: 'triangle', gain: 0.2 });
            tone({ at: 0.13, freq: event.head ? 1960 : 1470, dur: 0.16, type: 'triangle', gain: 0.2 });
          }
        }
        break;
      case 'enemyShot': {
        const w = where(event.fromX, event.fromZ),
          delay = Math.min(0.25, w.distance / 340);
        noise({
          at: delay,
          dur: 0.09,
          freq: 1700 * (0.6 + w.near * 0.6),
          to: 260,
          q: 0.6,
          gain: 0.75 * w.near + 0.05,
          wet: 0.6,
          pan: w.pan,
        });
        tone({ at: delay, freq: 130, to: 50, dur: 0.08, gain: 0.5 * w.near, pan: w.pan });
        // A miss cracks past the ear.
        if (!event.hit)
          noise({ at: delay * 0.5, dur: 0.07, freq: 3600, to: 900, q: 4, gain: 0.16, pan: (Math.random() - 0.5) * 1.6 });
        break;
      }
      case 'playerHit':
        tone({ freq: 110, to: 55, dur: 0.16, gain: 0.6 });
        noise({ dur: 0.12, freq: event.armor ? 2600 : 700, q: 1.5, gain: 0.35 });
        break;
      case 'playerDown':
        music.sting('dead');
        tone({ freq: 220, to: 40, dur: 1.1, type: 'sawtooth', gain: 0.25 });
        break;
      case 'reload': {
        const T = event.seconds;
        noise({ at: T * 0.14, dur: 0.05, freq: 2400, q: 3, gain: 0.3 });
        tone({ at: T * 0.14, freq: 320, dur: 0.04, type: 'square', gain: 0.08 });
        noise({ at: T * 0.58, dur: 0.06, freq: 1800, q: 3, gain: 0.34 });
        tone({ at: T * 0.6, freq: 240, dur: 0.05, type: 'square', gain: 0.1 });
        if (event.empty) noise({ at: T * 0.86, dur: 0.07, freq: 3000, q: 2, gain: 0.34 });
        break;
      }
      case 'dry':
        tone({ freq: 1400, dur: 0.025, type: 'square', gain: 0.1 });
        break;
      case 'switch':
        noise({ dur: 0.18, freq: 900, type: 'lowpass', gain: 0.14 });
        noise({ at: 0.22, dur: 0.04, freq: 2600, q: 3, gain: 0.2 });
        break;
      case 'step':
        noise({
          dur: 0.07,
          freq: (event.indoors ? 900 : 480) * jitter(0.3),
          type: 'lowpass',
          gain: (event.sprint ? 0.2 : 0.12) * (event.indoors ? 1.3 : 1),
        });
        break;
      case 'jump':
        noise({ dur: 0.1, freq: 600, type: 'lowpass', gain: 0.12 });
        break;
      case 'land':
        noise({ dur: 0.12, freq: 380, type: 'lowpass', gain: Math.min(0.4, 0.1 + event.speed * 0.025) });
        break;
      case 'throw':
        noise({ dur: 0.22, freq: 500, to: 1800, q: 1.2, gain: 0.16 });
        break;
      case 'explosion': {
        const w = where(event.x, event.z);
        noise({ dur: 1.3, freq: 1400, to: 70, type: 'lowpass', gain: 1.1 * (0.35 + w.near), pan: w.pan * 0.6, wet: 0.7 });
        tone({ freq: 80, to: 28, dur: 0.9, gain: 0.9 * (0.3 + w.near) });
        noise({ at: 0.35, dur: 1.6, freq: 500, to: 120, type: 'lowpass', gain: 0.22 });
        break;
      }
      case 'healStart':
        noise({ dur: 0.5, freq: 1500, q: 0.8, gain: 0.1 });
        noise({ at: 0.7, dur: 0.6, freq: 1100, q: 0.8, gain: 0.1 });
        break;
      case 'uplinkRange':
        tone({ freq: event.inRange ? 660 : 330, to: event.inRange ? 880 : 220, dur: 0.18, type: 'square', gain: 0.1 });
        break;
      case 'healed':
        tone({ freq: 520, to: 780, dur: 0.22, type: 'triangle', gain: 0.14 });
        break;
      case 'useStart':
        for (let i = 0; i < (event.kind === 'terminal' ? 8 : 3); i++)
          tone({
            at: i * 0.3,
            freq: event.kind === 'terminal' ? 1200 + (i % 3) * 180 : 300,
            dur: 0.05,
            type: 'square',
            gain: 0.045,
          });
        break;
      case 'loot': {
        noise({ dur: 0.07, freq: 1500, q: 3, gain: 0.3 });
        const best = Math.max(...event.items.map((item) => item.rarity));
        // The rarer the find, the longer the chime climbs.
        for (let i = 0; i < Math.max(2, best); i++)
          tone({ at: 0.1 + i * 0.07, freq: 520 * 2 ** ([0, 4, 7, 12, 16, 19][i] / 12), dur: 0.22, type: 'triangle', gain: 0.13 });
        break;
      }
      case 'terminal':
        music.sting('terminal');
        for (const [i, semitone] of [0, 7, 12].entries())
          tone({ at: i * 0.1, freq: 660 * 2 ** (semitone / 12), dur: 0.3, type: 'triangle', gain: 0.16 });
        break;
      case 'comms':
        noise({ dur: 0.06, freq: 2400, q: 2, gain: 0.14 });
        tone({ at: 0.07, freq: 1250, dur: 0.07, type: 'square', gain: 0.05 });
        break;
      case 'bark': {
        // A shouted word or two: a rough voiced tone with a breath of noise, one beat per syllable.
        const w = where(event.enemy.x, event.enemy.z),
          beats = { contact: 2, reload: 3, cover: 2, flank: 4, grenade: 2 }[event.key] ?? 2,
          pitch = 120 + (event.enemy.id % 5) * 12;
        for (let i = 0; i < beats; i++) {
          tone({
            at: i * 0.13,
            freq: pitch * (i % 2 ? 1.18 : 1),
            to: pitch * 0.9,
            dur: 0.11,
            type: 'sawtooth',
            gain: 0.1 * w.near + 0.012,
            pan: w.pan,
            wet: 0.5,
          });
          noise({
            at: i * 0.13,
            dur: 0.09,
            freq: 1100 + (i % 2) * 500,
            q: 2.5,
            gain: 0.12 * w.near + 0.01,
            pan: w.pan,
            wet: 0.4,
          });
        }
        break;
      }
      case 'enemyReload': {
        const w = where(event.enemy.x, event.enemy.z);
        noise({ at: 0.3, dur: 0.05, freq: 2200, q: 3, gain: 0.2 * w.near, pan: w.pan });
        noise({ at: 1.3, dur: 0.06, freq: 1700, q: 3, gain: 0.24 * w.near, pan: w.pan });
        break;
      }
      case 'enemyDown': {
        const w = where(event.enemy.x, event.enemy.z);
        noise({ at: 0.25, dur: 0.14, freq: 300, type: 'lowpass', gain: 0.3 * w.near, pan: w.pan });
        break;
      }
      case 'won':
        music.sting('won');
        for (const [i, semitone] of [0, 4, 7, 12].entries())
          tone({ at: 0.3 + i * 0.16, freq: 440 * 2 ** (semitone / 12), dur: 0.6, type: 'triangle', gain: 0.16 });
        break;
      default:
    }
  };

  return audio;
}
