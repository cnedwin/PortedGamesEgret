// 声音全部由代码合成：古琴（拨弦，带走手的滑音和琴身的共鸣）、洞箫（带气声的竖吹）、编钟（不谐和泛音的钟）、木鱼。
// 曲子用五声音阶写成，安静、留白、带一点悬疑；音效是翻卷、落印、落笔、放词、核验对错。这一层不碰页面，能在 Node 里跑；
// 曲子由 tools/assets/music.mjs 预先渲染成 MP3，音效在页面里现合成。
// Every sound is made in code: a guqin (a plucked string with the sliding left hand and the body's resonance), a xiao
// (an end-blown flute with breath in it), bianzhong (bells with inharmonic partials) and a wooden fish. The pieces are
// pentatonic, quiet and spacious, with a little suspense; the effects are a scroll turning, a seal coming down, a
// brush stroke, a word set down, and a check right or wrong. This layer touches no page and runs in Node; the pieces
// are rendered to MP3 ahead of time by tools/assets/music.mjs and the effects are made in the page.

export const RATE = 32000;
const TAU = Math.PI * 2;
const NAMES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

/** Frequency of a note name such as "A4" or "F#3". */
export function freq(name) {
  const m = /^([A-G]#?)(-?\d)$/.exec(name);
  if (!m) throw Error('note ' + name);
  return 440 * 2 ** ((NAMES[m[1]] + (Number(m[2]) + 1) * 12 - 69) / 12);
}

function rng(seed = 7) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
}

const VOICES = {
  // Guqin: a soft pluck whose upper partials die fast, a slow downward slide after the attack, and a body hum.
  qin: {
    tail: 2.2,
    render(out, n0, total, f, length, gain, opts = {}) {
      const slide = opts.slide ?? -0.012;
      let phase = 0,
        p2 = 0,
        p3 = 0;
      for (let i = 0; i < total && n0 + i < out.length; i++) {
        const t = i / RATE;
        const bend = 1 + slide * Math.min(1, t / 0.35);
        const ff = f * bend * (1 + 0.0025 * Math.sin(TAU * 4.2 * t) * Math.min(1, t));
        phase += (TAU * ff) / RATE;
        p2 += (TAU * ff * 2.003) / RATE;
        p3 += (TAU * ff * 3.01) / RATE;
        const env = Math.min(1, t / 0.006) * Math.exp(-t * 1.6);
        const v = Math.sin(phase) + 0.42 * Math.sin(p2) * Math.exp(-t * 4) + 0.18 * Math.sin(p3) * Math.exp(-t * 7) + 0.08 * Math.sin(phase * 0.5);
        out[n0 + i] += v * env * gain * 0.5;
      }
    }
  },
  // Xiao: a sine with a little second harmonic, a slow swell, gentle vibrato and breath noise.
  xiao: {
    tail: 0.25,
    render(out, n0, total, f, length, gain) {
      const r = rng(Math.round(f));
      let phase = 0,
        lp = 0;
      for (let i = 0; i < total && n0 + i < out.length; i++) {
        const t = i / RATE;
        const env = Math.min(1, t / 0.12) * (t < length ? 1 - 0.15 * Math.min(1, t / 1.5) : Math.exp(-(t - length) * 9));
        const vib = 1 + 0.005 * Math.sin(TAU * 4.6 * t) * Math.min(1, Math.max(0, t - 0.25) * 2);
        phase += (TAU * f * vib) / RATE;
        lp += (r() - lp) * 0.08;
        out[n0 + i] += (Math.sin(phase) + 0.1 * Math.sin(phase * 2) + lp * 0.35) * env * gain * 0.32;
      }
    }
  },
  // Bianzhong: a struck bronze bell with partials at inharmonic ratios.
  zhong: {
    tail: 3,
    render(out, n0, total, f, length, gain) {
      for (let i = 0; i < total && n0 + i < out.length; i++) {
        const t = i / RATE;
        const env = Math.min(1, t / 0.002);
        const v =
          Math.sin(TAU * f * t) * Math.exp(-t * 1.2) +
          0.55 * Math.sin(TAU * f * 2.42 * t) * Math.exp(-t * 2.4) +
          0.3 * Math.sin(TAU * f * 3.87 * t) * Math.exp(-t * 4) +
          0.2 * Math.sin(TAU * f * 5.9 * t) * Math.exp(-t * 7);
        out[n0 + i] += v * env * gain * 0.28;
      }
    }
  },
  // Wooden fish: a short hollow knock.
  muyu: {
    tail: 0.15,
    render(out, n0, total, f, length, gain) {
      for (let i = 0; i < Math.min(total, RATE * 0.2) && n0 + i < out.length; i++) {
        const t = i / RATE;
        const env = Math.min(1, t / 0.001) * Math.exp(-t * 38);
        out[n0 + i] += (Math.sin(TAU * f * t) + 0.4 * Math.sin(TAU * f * 1.6 * t)) * env * gain * 0.5;
      }
    }
  },
  // A low bowed drone under the pieces.
  drone: {
    tail: 1.5,
    render(out, n0, total, f, length, gain) {
      for (let i = 0; i < total && n0 + i < out.length; i++) {
        const t = i / RATE;
        const env = Math.min(1, t / 1.2) * (t < length ? 1 : Math.exp(-(t - length) * 2));
        let v = 0;
        for (let h = 1; h <= 4; h++) v += Math.sin(TAU * f * h * (1 + 0.0015 * Math.sin(TAU * 0.2 * t + h)) * t) / (h * h);
        out[n0 + i] += v * env * gain * 0.2;
      }
    }
  }
};

function addNote(out, voice, f, start, length, gain, opts) {
  const n0 = Math.round(start * RATE);
  const total = Math.round((length + VOICES[voice].tail) * RATE);
  VOICES[voice].render(out, n0, total, f, length, gain, opts);
}

/**
 * Render a piece: { tempo (beats a minute), bars (beats per bar), parts: [{ voice, gain, bars: ['D4:1 r:1 A4:2', …] }] }.
 * A note is "NAME:beats", several sounding together "A3+E4:beats", a rest "r:beats". `loop` folds the tail back to
 * the start so the piece repeats without a seam.
 */
export function renderPiece(piece, { loop = true } = {}) {
  const beat = 60 / piece.tempo;
  const bars = Math.max(...piece.parts.map((p) => p.bars.length));
  const seconds = bars * piece.beatsPerBar * beat;
  const tail = loop ? 0 : 3;
  const out = new Float32Array(Math.round((seconds + tail + 3.5) * RATE));
  for (const part of piece.parts) {
    let at = 0;
    for (const bar of part.bars)
      for (const tok of bar.split(/\s+/).filter(Boolean)) {
        const [name, b] = tok.split(':');
        const beats = Number(b);
        if (name !== 'r') for (const n of name.split('+')) addNote(out, part.voice, freq(n), at, beats * beat * (part.legato ?? 0.95), part.gain ?? 0.5, part);
        at += beats * beat;
      }
  }
  const n = Math.round((seconds + tail) * RATE);
  if (loop) for (let i = n; i < out.length; i++) out[i - n] += out[i];
  return finish(out.subarray(0, n), 0.82);
}

function finish(out, level) {
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  const k = peak > 0 ? level / peak : 1;
  const res = new Float32Array(out.length);
  for (let i = 0; i < out.length; i++) res[i] = Math.tanh(out[i] * k * 1.1) / Math.tanh(1.1);
  return res;
}

// D gong mode pentatonic (D E F# A B), slow, with space.
export const PIECES = {
  title: {
    tempo: 56,
    beatsPerBar: 4,
    parts: [
      { voice: 'qin', gain: 0.55, slide: -0.01, bars: ['A3:2 D4:1 E4:1', 'F#4:3 E4:1', 'D4:2 B3:1 A3:1', 'B3:4', 'A3:1 B3:1 D4:2', 'E4:2 F#4:1 A4:1', 'B4:3 A4:1', 'F#4:4', 'E4:2 D4:1 B3:1', 'A3:2 B3:2', 'D4:1 E4:1 D4:1 B3:1', 'A3:4'] },
      { voice: 'xiao', gain: 0.38, bars: ['r:4', 'r:4', 'A4:4', 'F#4:2 E4:2', 'D4:4', 'r:4', 'D5:2 B4:2', 'A4:4', 'r:4', 'E4:2 F#4:2', 'A4:3 B4:1', 'A4:4'] },
      { voice: 'drone', gain: 0.4, legato: 1, bars: ['D2+A2:8', '', 'G2+D3:8', '', 'D2+A2:8', '', 'B1+F#2:8', '', 'G2+D3:8', '', 'A1+E2:4 D2+A2:4', ''] }
    ]
  },
  scene: {
    tempo: 50,
    beatsPerBar: 4,
    parts: [
      { voice: 'qin', gain: 0.5, slide: -0.016, bars: ['E3:3 r:1', 'B3:2 A3:2', 'r:2 G3:2', 'E3:4', 'r:1 E3:1 G3:1 A3:1', 'B3:3 r:1', 'D4:2 B3:1 A3:1', 'B3:4'] },
      { voice: 'muyu', gain: 0.3, bars: ['C5:1 r:3', 'r:2 C5:1 r:1', 'C5:1 r:3', 'r:4', 'C5:1 r:3', 'r:2 C5:1 r:1', 'C5:1 r:1 C5:0.5 r:1.5', 'r:4'] },
      { voice: 'drone', gain: 0.35, legato: 1, bars: ['E2+B2:8', '', 'C2+G2:8', '', 'E2+B2:8', '', 'A1+E2:8', ''] },
      { voice: 'xiao', gain: 0.24, bars: ['r:4', 'r:4', 'r:4', 'r:2 B4:2', 'G4:4', 'r:4', 'r:4', 'E4:4'] }
    ]
  },
  closed: {
    tempo: 66,
    beatsPerBar: 4,
    parts: [
      { voice: 'zhong', gain: 0.6, bars: ['D4:1 A4:1 F#4:1 D5:1', 'A4:4'] },
      { voice: 'qin', gain: 0.45, bars: ['D3:2 A3:2', 'D4:4'] }
    ]
  },
  ending: {
    tempo: 52,
    beatsPerBar: 4,
    parts: [
      { voice: 'xiao', gain: 0.4, bars: ['D5:3 B4:1', 'A4:2 F#4:2', 'E4:3 D4:1', 'E4:4', 'F#4:2 A4:2', 'B4:2 D5:2', 'A4:3 F#4:1', 'D4:4'] },
      { voice: 'qin', gain: 0.45, bars: ['D3:2 A3:2', 'F#3:2 A3:2', 'E3:2 B3:2', 'A3:4', 'D3:2 A3:2', 'G3:2 B3:2', 'A3:2 E4:2', 'D4:4'] },
      { voice: 'zhong', gain: 0.35, bars: ['D5:4', 'r:4', 'r:4', 'A4:4', 'r:4', 'r:4', 'r:4', 'D5:4'] }
    ]
  }
};

// ---- effects ----
function blank(seconds) {
  return new Float32Array(Math.round(seconds * RATE));
}
function mixNote(out, voice, note, at, length, gain, opts) {
  addNote(out, voice, typeof note === 'number' ? note : freq(note), at, length, gain, opts);
}
function rustle(out, at, seconds, gain, seed, bright = 0.3) {
  const r = rng(seed);
  let lp = 0;
  const n0 = Math.round(at * RATE);
  for (let i = 0; i < seconds * RATE && n0 + i < out.length; i++) {
    const t = i / RATE;
    lp += (r() - lp) * bright;
    const env = Math.sin(Math.PI * Math.min(1, t / seconds)) * (0.6 + 0.4 * Math.sin(TAU * 23 * t));
    out[n0 + i] += lp * env * gain;
  }
}

export const EFFECTS = {
  tap() {
    const o = blank(0.2);
    mixNote(o, 'muyu', 'A5', 0, 0.1, 0.5);
    return finish(o, 0.5);
  },
  paper() {
    const o = blank(0.45);
    rustle(o, 0, 0.4, 0.9, 11, 0.35);
    return finish(o, 0.45);
  },
  brush() {
    const o = blank(0.35);
    rustle(o, 0, 0.3, 0.8, 23, 0.12);
    return finish(o, 0.35);
  },
  collect() {
    const o = blank(1.2);
    mixNote(o, 'qin', 'A4', 0, 0.3, 0.6, { slide: 0.01 });
    mixNote(o, 'qin', 'D5', 0.09, 0.3, 0.5, { slide: 0.008 });
    return finish(o, 0.55);
  },
  place() {
    const o = blank(0.9);
    mixNote(o, 'qin', 'D4', 0, 0.2, 0.6);
    rustle(o, 0, 0.12, 0.4, 5, 0.5);
    return finish(o, 0.5);
  },
  seal() {
    const o = blank(0.7);
    mixNote(o, 'muyu', 'D3', 0, 0.2, 1);
    mixNote(o, 'muyu', 'A3', 0.004, 0.2, 0.6);
    rustle(o, 0, 0.08, 0.6, 3, 0.6);
    return finish(o, 0.75);
  },
  right() {
    const o = blank(2.6);
    mixNote(o, 'zhong', 'D5', 0.25, 1, 0.7);
    mixNote(o, 'zhong', 'A5', 0.5, 1, 0.5);
    return finish(o, 0.6);
  },
  near() {
    const o = blank(1.8);
    mixNote(o, 'qin', 'E4', 0, 0.4, 0.6, { slide: -0.03 });
    mixNote(o, 'qin', 'B3', 0.25, 0.6, 0.5, { slide: -0.03 });
    return finish(o, 0.5);
  },
  wrong() {
    const o = blank(1.6);
    mixNote(o, 'qin', 'C4', 0, 0.5, 0.6, { slide: -0.06 });
    mixNote(o, 'muyu', 'C4', 0.02, 0.2, 0.5);
    return finish(o, 0.5);
  },
  hint() {
    const o = blank(2.2);
    mixNote(o, 'zhong', 'A5', 0, 1, 0.45);
    return finish(o, 0.4);
  },
  open() {
    const o = blank(1.4);
    rustle(o, 0, 0.6, 0.7, 41, 0.25);
    mixNote(o, 'qin', 'A3', 0.15, 0.4, 0.4);
    return finish(o, 0.5);
  }
};
