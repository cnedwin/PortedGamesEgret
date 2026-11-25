// 合成：本作的音效和音乐全部由代码生成，不用任何录音或现成曲子。这里是纯计算的部分（能在 Node 里跑）：几种乐器音色、
// 一个按小节写谱的小音序器、本作原创的几段曲子，以及按键、刀剑、弓箭、魔法、占领、招募等音效。
// Synthesis: every sound and every bar of music in this game is made in code, with no recordings and no existing
// tunes. This is the pure part (it runs in Node): a few instrument voices, a small sequencer that reads bars, this
// game's own pieces, and the effects for cursor, blades, bows, magic, capture, recruiting and the rest.

export const RATE = 32000;
const TAU = Math.PI * 2;

/** Frequency of a note name like 'C5', 'F#4', 'Bb3'. */
export function freq(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error('note ' + name);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = base + (Number(m[3]) + 1) * 12;
  return 440 * 2 ** ((midi - 69) / 12);
}

/** A seeded noise source so every build of a sound is the same. */
function noiseSource(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 4294967296) * 2 - 1;
  };
}

/** Adds one note of `voice` into `out` at `start` seconds for `length` seconds. */
function addNote(out, voice, f, start, length, gain) {
  const n0 = Math.round(start * RATE);
  const tail = VOICES[voice].tail ?? 0.15;
  const total = Math.round((length + tail) * RATE);
  VOICES[voice].render(out, n0, total, f, length, gain);
}

// Each voice writes samples straight into the buffer.
const VOICES = {
  // A bright brass lead: a few saw harmonics, the higher ones opening with the attack.
  brass: {
    tail: 0.12,
    render(out, n0, total, f, length, gain) {
      for (let i = 0; i < total && n0 + i < out.length; i++) {
        const t = i / RATE;
        const env = Math.min(1, t / 0.03) * (t < length ? 1 - 0.25 * Math.min(1, t / 0.4) : 0.75 * Math.exp(-(t - length) * 30));
        const open = 0.45 + 0.55 * Math.exp(-t * 6);
        const vib = 1 + 0.004 * Math.sin(TAU * 5.5 * t) * Math.min(1, t * 3);
        let v = 0;
        for (let h = 1; h <= 6; h++) v += (Math.sin(TAU * f * h * vib * t) / h) * (h === 1 ? 1 : open);
        out[n0 + i] += v * env * gain * 0.5;
      }
    }
  },
  // A plucked lute-like note.
  pluck: {
    tail: 0.4,
    render(out, n0, total, f, length, gain) {
      for (let i = 0; i < total && n0 + i < out.length; i++) {
        const t = i / RATE;
        const env = Math.min(1, t / 0.004) * Math.exp(-t * 7);
        const v = Math.sin(TAU * f * t) + 0.45 * Math.sin(TAU * f * 2 * t) * Math.exp(-t * 12) + 0.2 * Math.sin(TAU * f * 3 * t) * Math.exp(-t * 18);
        out[n0 + i] += v * env * gain * 0.55;
      }
    }
  },
  // Soft strings: two detuned saws with a slow swell.
  strings: {
    tail: 0.35,
    render(out, n0, total, f, length, gain) {
      for (let i = 0; i < total && n0 + i < out.length; i++) {
        const t = i / RATE;
        const env = Math.min(1, t / 0.18) * (t < length ? 1 : Math.exp(-(t - length) * 8));
        let v = 0;
        for (const d of [0.997, 1.003]) for (let h = 1; h <= 4; h++) v += Math.sin(TAU * f * d * h * t) / (h * 1.6);
        out[n0 + i] += v * env * gain * 0.22;
      }
    }
  },
  // Short bowed staccato for the darker pieces.
  staccato: {
    tail: 0.06,
    render(out, n0, total, f, length, gain) {
      for (let i = 0; i < total && n0 + i < out.length; i++) {
        const t = i / RATE;
        const env = Math.min(1, t / 0.008) * Math.exp(-t * 14);
        let v = 0;
        for (let h = 1; h <= 5; h++) v += Math.sin(TAU * f * h * t) / h;
        out[n0 + i] += v * env * gain * 0.4;
      }
    }
  },
  bass: {
    tail: 0.08,
    render(out, n0, total, f, length, gain) {
      for (let i = 0; i < total && n0 + i < out.length; i++) {
        const t = i / RATE;
        const env = Math.min(1, t / 0.01) * (t < length ? Math.exp(-t * 2) : Math.exp(-(t - length) * 25));
        const tri = (2 / Math.PI) * Math.asin(Math.sin(TAU * f * t));
        out[n0 + i] += (tri * 0.8 + 0.3 * Math.sin(TAU * f * 2 * t)) * env * gain * 0.6;
      }
    }
  },
  bell: {
    tail: 1.0,
    render(out, n0, total, f, length, gain) {
      for (let i = 0; i < total && n0 + i < out.length; i++) {
        const t = i / RATE;
        const env = Math.min(1, t / 0.002) * Math.exp(-t * 3.5);
        const v = Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t * 6) + 0.25 * Math.sin(TAU * f * 5.4 * t) * Math.exp(-t * 9);
        out[n0 + i] += v * env * gain * 0.3;
      }
    }
  },
  flute: {
    tail: 0.1,
    render(out, n0, total, f, length, gain) {
      for (let i = 0; i < total && n0 + i < out.length; i++) {
        const t = i / RATE;
        const env = Math.min(1, t / 0.05) * (t < length ? 1 : Math.exp(-(t - length) * 20));
        const vib = 1 + 0.006 * Math.sin(TAU * 5 * t) * Math.min(1, t * 2);
        out[n0 + i] += (Math.sin(TAU * f * vib * t) + 0.12 * Math.sin(TAU * f * 2 * vib * t)) * env * gain * 0.45;
      }
    }
  }
};

/** Drum hits: kick, snare, hat, timpani roll. */
function addDrum(out, kind, start, gain, rnd) {
  const n0 = Math.round(start * RATE);
  const len = Math.round((kind === 'timp' ? 0.9 : kind === 'kick' ? 0.25 : kind === 'snare' ? 0.18 : 0.05) * RATE);
  for (let i = 0; i < len && n0 + i < out.length; i++) {
    const t = i / RATE;
    let v = 0;
    if (kind === 'kick') v = Math.sin(TAU * (50 + 90 * Math.exp(-t * 30)) * t) * Math.exp(-t * 14);
    else if (kind === 'snare') v = (rnd() * 0.75 + 0.35 * Math.sin(TAU * 190 * t)) * Math.exp(-t * 22);
    else if (kind === 'hat') v = rnd() * Math.exp(-t * 80) * 0.5;
    else if (kind === 'timp') v = Math.sin(TAU * (98 + 6 * Math.exp(-t * 6)) * t) * Math.exp(-t * 4.5) + rnd() * 0.08 * Math.exp(-t * 20);
    out[n0 + i] += v * gain;
  }
}

/**
 * Renders a piece: `bpm`, `bars` of `beats`, and parts. A melodic part is a list of bars, each a string of
 * "note:beats" tokens ("r" for a rest, "C5+E5" for a chord); a drum part is one bar of "kind:beats" tokens repeated.
 */
export function renderPiece(piece, { loop = true } = {}) {
  const beat = 60 / piece.bpm;
  const barCount = piece.parts.find((p) => p.bars)?.bars.length ?? 1;
  const seconds = barCount * piece.beats * beat + (loop ? 0 : 1.5);
  const out = new Float32Array(Math.round(seconds * RATE));
  const rnd = noiseSource(7);
  for (const part of piece.parts) {
    if (part.drums) {
      for (let b = 0; b < barCount; b++) {
        if (part.skipLast && b === barCount - 1) continue;
        let at = b * piece.beats * beat;
        for (const token of part.drums.trim().split(/\s+/)) {
          const [kind, len] = token.split(':');
          if (kind !== 'r') addDrum(out, kind, at, part.gain ?? 0.5, rnd);
          at += Number(len) * beat;
        }
      }
      continue;
    }
    part.bars.forEach((bar, b) => {
      let at = b * piece.beats * beat;
      for (const token of bar.trim().split(/\s+/)) {
        const [notes, len] = token.split(':');
        const beats = Number(len);
        if (notes !== 'r')
          for (const note of notes.split('+')) addNote(out, part.voice, freq(note) * (part.octave ? 2 ** part.octave : 1), at, beats * beat * (part.legato ?? 0.9), part.gain ?? 0.5);
        at += beats * beat;
      }
    });
  }
  if (loop) {
    // Fade the last few milliseconds into the first so the loop joins without a click.
    const k = Math.round(0.01 * RATE);
    for (let i = 0; i < k; i++) out[out.length - 1 - i] *= i / k;
  }
  return finish(out, piece.level ?? 0.7);
}

/** A soft room: two feedback echoes, then a gentle limiter. */
function finish(out, level) {
  const a = Math.round(0.061 * RATE),
    b = Math.round(0.089 * RATE);
  for (let i = 0; i < out.length; i++) {
    if (i >= a) out[i] += out[i - a] * 0.18;
    if (i >= b) out[i] += out[i - b] * 0.12;
  }
  let peak = 0;
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
  const k = peak > 0 ? level / peak : 1;
  for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i] * k * 1.2) / Math.tanh(1.2);
  return out;
}

// ---- this game's own pieces ------------------------------------------------------------------------------------

const MARCH = 'kick:1 snare:1 kick:1 snare:0.5 snare:0.5';
const HATS = 'hat:0.5 hat:0.5 hat:0.5 hat:0.5 hat:0.5 hat:0.5 hat:0.5 hat:0.5';

export const PIECES = {
  // The title: a bright march in C major.
  title: {
    bpm: 116,
    beats: 4,
    level: 0.62,
    parts: [
      { voice: 'brass', gain: 0.5, bars: ['C5:1 G4:0.5 C5:0.5 E5:1 G5:1', 'F5:1.5 E5:0.5 D5:2', 'E5:1 C5:0.5 E5:0.5 G5:1 C6:1', 'B5:1.5 A5:0.5 G5:2', 'A5:1 F5:0.5 A5:0.5 C6:1 A5:1', 'G5:1 E5:0.5 G5:0.5 C6:1 G5:1', 'F5:1 E5:1 D5:1 G5:1', 'C5:3 r:1'] },
      { voice: 'strings', gain: 0.45, legato: 1, bars: ['C4+E4+G4:4', 'F4+A4+C5:4', 'C4+E4+G4:4', 'G3+B3+D4:4', 'F4+A4+C5:4', 'C4+E4+G4:4', 'D4+F4+A4:2 G3+B3+D4:2', 'C4+E4+G4:4'] },
      { voice: 'bass', gain: 0.55, bars: ['C3:1 C3:1 G2:1 C3:1', 'F2:1 F2:1 C3:1 F2:1', 'C3:1 C3:1 G2:1 C3:1', 'G2:1 G2:1 D3:1 G2:1', 'F2:1 F2:1 C3:1 F2:1', 'C3:1 C3:1 G2:1 C3:1', 'D3:1 D3:1 G2:1 G2:1', 'C3:2 G2:1 C3:1'] },
      { drums: MARCH, gain: 0.32 },
      { drums: HATS, gain: 0.12 }
    ]
  },
  // The player's turn: a plucky, hopeful tune in G major.
  dawn: {
    bpm: 132,
    beats: 4,
    level: 0.6,
    parts: [
      { voice: 'flute', gain: 0.45, bars: ['G4:0.5 B4:0.5 D5:0.5 G5:0.5 F#5:1 D5:1', 'E5:0.5 G5:0.5 E5:0.5 C5:0.5 D5:2', 'B4:0.5 D5:0.5 G5:0.5 B5:0.5 A5:1 G5:1', 'F#5:0.5 E5:0.5 D5:0.5 E5:0.5 F#5:2', 'G5:1 D5:0.5 B4:0.5 C5:1 E5:1', 'D5:1 B4:0.5 G4:0.5 A4:2', 'B4:0.5 C5:0.5 D5:0.5 E5:0.5 F#5:1 A5:1', 'G5:3 r:1'] },
      { voice: 'pluck', gain: 0.32, bars: ['G3+D4:1 B4:1 G3+D4:1 B4:1', 'C4+G4:1 E4:1 C4+G4:1 E4:1', 'G3+D4:1 B4:1 G3+D4:1 B4:1', 'D4+A4:1 F#4:1 D4+A4:1 F#4:1', 'C4+G4:1 E4:1 C4+G4:1 E4:1', 'G3+D4:1 B4:1 G3+D4:1 B4:1', 'A3+E4:1 C4:1 D4+A4:1 F#4:1', 'G3+D4+B4:2 r:2'] },
      { voice: 'bass', gain: 0.5, bars: ['G2:1 r:0.5 G2:0.5 D3:1 G2:1', 'C3:1 r:0.5 C3:0.5 G2:1 C3:1', 'G2:1 r:0.5 G2:0.5 D3:1 G2:1', 'D3:1 r:0.5 D3:0.5 A2:1 D3:1', 'C3:1 r:0.5 C3:0.5 G2:1 C3:1', 'G2:1 r:0.5 G2:0.5 D3:1 G2:1', 'A2:1 C3:1 D3:1 F#2:1', 'G2:2 D3:1 G2:1'] },
      { drums: 'kick:1 hat:0.5 hat:0.5 snare:1 hat:0.5 hat:0.5', gain: 0.26 }
    ]
  },
  // The enemy's turn: a driving minor theme in E minor.
  raven: {
    bpm: 126,
    beats: 4,
    level: 0.6,
    parts: [
      { voice: 'staccato', gain: 0.5, bars: ['E4:0.5 E4:0.5 G4:0.5 B4:0.5 C5:1 B4:1', 'A4:0.5 G4:0.5 F#4:0.5 G4:0.5 E4:2', 'E4:0.5 G4:0.5 B4:0.5 E5:0.5 D5:1 C5:1', 'B4:0.5 A4:0.5 G4:0.5 A4:0.5 B4:2', 'C5:1 E5:0.5 C5:0.5 B4:1 D#5:1', 'E5:1 B4:0.5 G4:0.5 F#4:2', 'A4:0.5 B4:0.5 C5:0.5 A4:0.5 B4:1 D#5:1', 'E5:3 r:1'] },
      { voice: 'brass', gain: 0.32, octave: -1, bars: ['E4:4', 'A4:2 E4:2', 'E4:4', 'B3:4', 'C4:4', 'E4:2 B3:2', 'A3:2 B3:2', 'E4:4'] },
      { voice: 'bass', gain: 0.55, bars: ['E2:0.5 E2:0.5 E2:0.5 E2:0.5 E2:0.5 E2:0.5 G2:0.5 B2:0.5', 'A2:0.5 A2:0.5 A2:0.5 A2:0.5 E2:0.5 E2:0.5 E2:0.5 E2:0.5', 'E2:0.5 E2:0.5 E2:0.5 E2:0.5 E2:0.5 E2:0.5 G2:0.5 B2:0.5', 'B1:0.5 B1:0.5 B1:0.5 B1:0.5 B1:0.5 B1:0.5 D#2:0.5 F#2:0.5', 'C2:0.5 C2:0.5 C2:0.5 C2:0.5 C2:0.5 C2:0.5 C2:0.5 C2:0.5', 'E2:0.5 E2:0.5 E2:0.5 E2:0.5 B1:0.5 B1:0.5 B1:0.5 B1:0.5', 'A1:0.5 A1:0.5 A1:0.5 A1:0.5 B1:0.5 B1:0.5 B1:0.5 B1:0.5', 'E2:1 r:1 E2:1 r:1'] },
      { drums: 'kick:0.5 kick:0.5 snare:1 kick:0.5 kick:0.5 snare:0.5 snare:0.5', gain: 0.3 }
    ]
  },
  victory: {
    bpm: 120,
    beats: 4,
    level: 0.7,
    parts: [
      { voice: 'brass', gain: 0.55, bars: ['C5:0.5 E5:0.5 G5:0.5 C6:1.5 G5:0.5 C6:0.5', 'D6:0.5 C6:0.5 B5:0.5 C6:2.5'] },
      { voice: 'strings', gain: 0.4, legato: 1, bars: ['C4+E4+G4:4', 'G3+B3+D4:1.5 C4+E4+G4:2.5'] },
      { voice: 'bell', gain: 0.25, bars: ['r:2 C6:2', 'r:1.5 C6:2.5'] },
      { drums: 'timp:1 r:1 timp:0.5 timp:0.5 timp:1', gain: 0.4 }
    ]
  },
  defeat: {
    bpm: 72,
    beats: 4,
    level: 0.55,
    parts: [
      { voice: 'strings', gain: 0.5, legato: 1, bars: ['A4:1 G4:1 F4:1 E4:1', 'D4:2 E4:2'] },
      { voice: 'bass', gain: 0.45, bars: ['A2:2 F2:2', 'D2:2 E2:2'] },
      { voice: 'bell', gain: 0.18, bars: ['r:3 A5:1', 'r:2 E5:2'] }
    ]
  }
};

// ---- effects ---------------------------------------------------------------------------------------------------

/** A short sweep or tone; the building block of the interface sounds. */
function blip(seconds, f0, f1, { wave = 'sine', decay = 20, gain = 0.4, attack = 0.002 } = {}) {
  const out = new Float32Array(Math.round(seconds * RATE));
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const f = f0 + (f1 - f0) * (t / seconds);
    phase += (TAU * f) / RATE;
    const raw = wave === 'square' ? Math.sign(Math.sin(phase)) * 0.5 : wave === 'tri' ? (2 / Math.PI) * Math.asin(Math.sin(phase)) : Math.sin(phase);
    out[i] = raw * Math.min(1, t / attack) * Math.exp(-t * decay) * gain;
  }
  return out;
}
function mixInto(out, part, at, gain = 1) {
  const n0 = Math.round(at * RATE);
  for (let i = 0; i < part.length && n0 + i < out.length; i++) out[n0 + i] += part[i] * gain;
  return out;
}
function noise(seconds, { decay = 20, gain = 0.4, lowpass = 0.3, seed = 3 } = {}) {
  const out = new Float32Array(Math.round(seconds * RATE));
  const rnd = noiseSource(seed);
  let y = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    y += (rnd() - y) * lowpass;
    out[i] = y * Math.exp(-t * decay) * gain;
  }
  return out;
}
function notes(list, step, voice = 'bell', gain = 0.5, extra = 0.6) {
  const out = new Float32Array(Math.round((list.length * step + extra) * RATE));
  list.forEach((n, i) => n && addNote(out, voice, freq(n), i * step, step * 0.9, gain));
  return out;
}

export const EFFECTS = {
  cursor: () => blip(0.05, 1400, 1500, { wave: 'tri', decay: 60, gain: 0.18 }),
  select: () => mixInto(blip(0.12, 880, 1320, { wave: 'tri', decay: 22, gain: 0.3 }), blip(0.1, 1760, 1760, { decay: 30, gain: 0.12 }), 0.03),
  confirm: () => notes(['E6', 'B6'], 0.06, 'bell', 0.5, 0.3),
  cancel: () => blip(0.12, 900, 520, { wave: 'tri', decay: 18, gain: 0.28 }),
  error: () => mixInto(blip(0.16, 180, 160, { wave: 'square', decay: 12, gain: 0.18 }), blip(0.16, 190, 170, { wave: 'square', decay: 12, gain: 0.12 }), 0),
  step: () => noise(0.06, { decay: 60, gain: 0.25, lowpass: 0.12, seed: 9 }),
  slash: () => mixInto(noise(0.22, { decay: 14, gain: 0.5, lowpass: 0.55, seed: 4 }), blip(0.25, 2400, 1900, { decay: 18, gain: 0.12 }), 0.02),
  clang: () => mixInto(mixInto(blip(0.5, 1250, 1240, { decay: 9, gain: 0.22 }), blip(0.5, 1890, 1880, { decay: 11, gain: 0.15 }), 0), noise(0.08, { decay: 40, gain: 0.4, lowpass: 0.8, seed: 5 }), 0),
  thrust: () => mixInto(noise(0.15, { decay: 22, gain: 0.45, lowpass: 0.35, seed: 6 }), blip(0.15, 300, 120, { decay: 18, gain: 0.3 }), 0),
  thud: () => mixInto(blip(0.25, 140, 50, { decay: 14, gain: 0.6 }), noise(0.15, { decay: 25, gain: 0.35, lowpass: 0.15, seed: 8 }), 0),
  bite: () => mixInto(noise(0.1, { decay: 35, gain: 0.5, lowpass: 0.6, seed: 12 }), blip(0.12, 420, 200, { wave: 'square', decay: 25, gain: 0.15 }), 0.02),
  bow: () => mixInto(blip(0.18, 220, 180, { wave: 'tri', decay: 16, gain: 0.3 }), noise(0.3, { decay: 9, gain: 0.25, lowpass: 0.5, seed: 11 }), 0.05),
  bolt: () => mixInto(blip(0.2, 160, 90, { wave: 'tri', decay: 12, gain: 0.45 }), noise(0.25, { decay: 12, gain: 0.3, lowpass: 0.6, seed: 13 }), 0.02),
  catapult: () => mixInto(blip(0.4, 90, 60, { decay: 6, gain: 0.5 }), noise(0.4, { decay: 7, gain: 0.25, lowpass: 0.1, seed: 14 }), 0),
  crash: () => mixInto(noise(0.6, { decay: 6, gain: 0.6, lowpass: 0.25, seed: 15 }), blip(0.5, 90, 40, { decay: 7, gain: 0.5 }), 0),
  magic: () => mixInto(notes(['C6', 'G6', 'E7'], 0.04, 'bell', 0.45, 0.4), blip(0.4, 600, 1800, { decay: 6, gain: 0.12 }), 0),
  fire: () => noise(0.7, { decay: 3.5, gain: 0.5, lowpass: 0.18, seed: 16 }),
  splash: () => mixInto(noise(0.4, { decay: 8, gain: 0.45, lowpass: 0.4, seed: 17 }), blip(0.3, 700, 300, { decay: 10, gain: 0.08 }), 0),
  critical: () => mixInto(mixInto(blip(0.35, 200, 60, { decay: 8, gain: 0.6 }), noise(0.3, { decay: 10, gain: 0.5, lowpass: 0.7, seed: 18 }), 0), notes(['A6', 'E7'], 0.05, 'bell', 0.45, 0.5), 0.05),
  fall: () => mixInto(blip(0.5, 300, 80, { wave: 'tri', decay: 5, gain: 0.35 }), noise(0.35, { decay: 10, gain: 0.3, lowpass: 0.2, seed: 19 }), 0.1),
  capture: () => notes(['G5', 'C6', 'E6', 'G6'], 0.07, 'brass', 0.45, 0.6),
  coin: () => notes(['B6', 'E7'], 0.07, 'bell', 0.55, 0.4),
  heal: () => notes(['C6', 'E6', 'G6', 'C7', 'E7'], 0.05, 'bell', 0.35, 0.6),
  hex: () => mixInto(blip(0.6, 300, 120, { wave: 'square', decay: 4, gain: 0.12 }), notes(['F#5', 'C5'], 0.12, 'bell', 0.3, 0.4), 0),
  art: () => mixInto(mixInto(notes(['C5', 'G5', 'C6', 'E6', 'G6'], 0.06, 'brass', 0.4, 0.8), blip(0.9, 200, 900, { decay: 2.5, gain: 0.12 }), 0), noise(0.8, { decay: 3, gain: 0.15, lowpass: 0.5, seed: 20 }), 0.1),
  banner: () => mixInto(noise(0.4, { decay: 6, gain: 0.2, lowpass: 0.5, seed: 21 }), notes(['G4', 'C5', 'G5'], 0.07, 'brass', 0.4, 0.4), 0.05),
  menu: () => blip(0.08, 600, 900, { wave: 'tri', decay: 28, gain: 0.22 })
};
