// Original ink-sea score and foley. Mono PCM makes four loopable themes inexpensive to decode.
export const RATE = 32000;

// These scores are mono. Encode their 16-bit PCM in the same task that renders the samples.
function monoWav(samples) {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const header = new DataView(bytes.buffer);
  header.setUint32(0, 0x52494646); // RIFF
  header.setUint32(4, bytes.length - 8, true);
  header.setUint32(8, 0x57415645); // WAVE
  header.setUint32(12, 0x666d7420); // fmt
  header.setUint32(16, 16, true);
  header.setUint16(20, 1, true); // PCM
  header.setUint16(22, 1, true); // mono
  header.setUint32(24, RATE, true);
  header.setUint32(28, RATE * 2, true);
  header.setUint16(32, 2, true);
  header.setUint16(34, 16, true);
  header.setUint32(36, 0x64617461); // data
  header.setUint32(40, bytes.length - 44, true);
  for (let frame = 0; frame < samples.length; frame++) {
    const sample = Math.max(-1, Math.min(1, samples[frame] || 0));
    header.setInt16(44 + frame * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
  }
  return bytes;
}

export function renderWavs(phase) {
  const tracks = phase ? { track: loopOf(phase) } : effectSamples();
  return Object.fromEntries(Object.entries(tracks).map(([name, samples]) => [name, monoWav(samples)]));
}
const TAU = 2 * Math.PI;
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
const buffer = seconds => new Float32Array(Math.ceil(seconds * RATE));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x80000000 - 1;
  };
}

export function peak(samples) {
  let top = 0;
  for (const sample of samples) top = Math.max(top, Math.abs(sample));
  return top;
}

function shape(samples, gain, release = 0.022) {
  const scale = gain / Math.max(peak(samples), 0.00001);
  const fade = Math.min(samples.length / 2, release * RATE);
  for (let i = 0; i < samples.length; i++)
    samples[i] *= scale * Math.min(1, i / 36, (samples.length - 1 - i) / fade);
  return samples;
}

function add(target, source, seconds, gain = 1) {
  const start = Math.round(seconds * RATE), length = Math.min(source.length, target.length - start);
  for (let i = 0; i < length; i++) target[start + i] += source[i] * gain;
  return target;
}

function mode(target, from, to, settling, ratios) {
  for (const [ratio, amplitude, damping] of ratios) {
    let phase = ratio * .35, color = from - to, level = amplitude;
    const settle = Math.exp(-1 / (settling * RATE)), decay = Math.exp(-damping / RATE);
    for (let i = 0; i < target.length; i++) {
      phase += TAU * (to + color) * ratio / RATE;
      target[i] += Math.sin(phase) * level;
      color *= settle;
      level *= decay;
    }
  }
  return target;
}

function spray(target, seed, from, to, falloff, intensity) {
  const next = random(seed);
  let lower = 0, upper = 0, level = intensity;
  const fade = Math.exp(-falloff / RATE);
  for (let i = 0; i < target.length; i++) {
    const cutoff = from + (to - from) * i / target.length;
    const sample = next();
    lower += (sample - lower) * clamp(TAU * cutoff * .48 / RATE, 0, .91);
    upper += (sample - upper) * clamp(TAU * cutoff * 1.8 / RATE, 0, .95);
    target[i] += (upper - lower) * level;
    level *= fade;
  }
  return target;
}

function pipa(midi, seconds, bright = false) {
  const pitch = hz(midi), sound = mode(buffer(seconds), pitch * 1.008, pitch, .017, [
    [1, 1, 5.8], [2.003, .57, 8.5], [3.009, bright ? .43 : .27, 13],
    [4.022, .18, 19], [6.043, .085, 30]
  ]);
  spray(sound, midi * 73, bright ? 2990 : 1990, 870, 86, .48);
  return shape(sound, .84, .035);
}

function flute(midi, seconds, breathier = false) {
  const out = buffer(seconds), next = random(midi * 82 + 167);
  let phase = 0, breath = 0;
  const pitch = hz(midi), fade = Math.min(.15, seconds * .33);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE, swell = Math.sin(Math.PI * t / seconds);
    const pressure = Math.max(0, Math.min(1, t / .051, (seconds - t) / fade)) * (0.62 + 0.38 * swell);
    const trem = Math.min(1, t * 3.5) * Math.sin(TAU * 4.9 * t) * .0043;
    phase += TAU * pitch * (1 - Math.exp(-t / .044) * .022 + trem) / RATE;
    breath += (next() - breath) * .21;
    out[i] = pressure * (.72 * Math.sin(phase) + .18 * Math.sin(phase * 2) +
      (breathier ? .12 : .064) * Math.sin(phase * 3) + breath * (breathier ? .101 : .059));
  }
  return out;
}

function drum(seconds, pitch, gain, grit = .42) {
  const out = mode(buffer(seconds), pitch * 1.66, pitch, .021, [
    [1, 1, 13], [1.54, .42, 24], [2.14, .28, 31], [3.05, .105, 55]
  ]);
  spray(out, pitch + 31, 1430, 410, 57, grit);
  return shape(out, gain);
}

function bronze(seconds, pitch, gain) {
  const out = mode(buffer(seconds), pitch * 1.06, pitch, .12, [
    [1, .91, 4.5], [1.43, .35, 4.2], [1.81, .42, 5.2], [2.37, .28, 6.8],
    [3.04, .28, 9.7], [4.65, .11, 14], [6.78, .071, 21]
  ]);
  spray(out, pitch * 41, 3250, 590, 16, .63);
  return shape(out, gain, .12);
}

function gust(seconds, seed, from, to, color, gain) {
  const out = spray(buffer(seconds), seed, from, to, color, 1);
  for (let i = 0; i < out.length; i++) {
    const p = i / out.length;
    out[i] *= Math.sin(Math.PI * p) ** .48;
  }
  return shape(out, gain, .028);
}

function layered(seconds, layers) {
  const out = buffer(seconds);
  for (const [at, clip, gain] of layers) add(out, clip, at, gain ?? 1);
  return out;
}

function flourish(seconds, notes, ring = false) {
  return layered(seconds, notes.map(([at, midi, gain]) => [at,
    ring ? bronze(Math.min(.43, seconds - at), hz(midi), .67) : pipa(midi, Math.min(.42, seconds - at), true), gain]));
}

export function effectSamples() {
  return {
    throw: layered(.227, [[0, gust(.221, 105, 760, 2300, 5, .32)], [.011, bronze(.214, 584, .30), .7]]),
    sweep: layered(.291, [[0, gust(.286, 61, 1240, 4400, 2.4, .40)], [.046, gust(.18, 64, 3870, 1100, 11, .20)]]),
    thrust: layered(.129, [[0, gust(.12, 19, 2850, 780, 12, .33)], [.004, drum(.11, 275, .32, .75)]]),
    lob: layered(.24, [[0, gust(.21, 73, 490, 1560, 5, .24)], [.023, flute(64, .2, true), .22]]),
    land: layered(.371, [[0, drum(.32, 104, .53, .84)], [.009, gust(.355, 87, 2170, 420, 11, .35)]]),
    nova: layered(.524, [[0, drum(.32, 84, .47, .9)], [.017, bronze(.49, 186, .38)], [.055, gust(.425, 82, 1080, 3700, 4.5, .28)]]),
    hitSoft: layered(.089, [[0, drum(.084, 225, .30, .82)], [0, gust(.068, 12, 3300, 1000, 23, .18)]]),
    splash: layered(.241, [[0, gust(.24, 243, 2180, 428, 11.2, .33)], [.018, pipa(64, .141), .14]]),
    pearl: flourish(.192, [[0, 81, .31], [.048, 86, .18]], true),
    ouch: layered(.247, [[0, drum(.24, 142, .57, .76)], [.022, gust(.15, 431, 2790, 580, 18, .31)]]),
    levelUp: flourish(.71, [[0, 69, .48], [.09, 74, .46], [.19, 81, .47], [.32, 86, .42]]),
    boss: layered(1.13, [[0, bronze(1.13, 123, .72)], [.013, drum(.55, 77, .54)], [.214, bronze(.67, 184, .46)]]),
    wave: flourish(.611, [[0, 62, .43], [.09, 69, .35], [.22, 74, .37]], true),
    merge: flourish(.433, [[0, 74, .42], [.073, 81, .42], [.156, 86, .41]]),
    divine: layered(1.04, [[0, bronze(.79, 197, .54)], [.05,
      flourish(.95, [[0, 69, .43], [.111, 74, .42], [.226, 81, .47], [.355, 86, .42], [.53, 93, .36]])]]),
    select: flourish(.136, [[0, 69, .31]]),
    confirm: flourish(.292, [[0, 69, .31], [.07, 74, .33]]),
    acquire: flourish(.352, [[0, 78, .33], [.066, 81, .28], [.134, 86, .26]], true),
    sell: flourish(.277, [[0, 81, .31], [.073, 74, .27]]),
    win: layered(1.18, [[0, drum(.34, 92, .43)], [.014, bronze(.98, 147, .45)], [.043,
      flourish(.99, [[0, 62, .44], [.108, 69, .45], [.224, 72, .37], [.36, 81, .40], [.51, 86, .44]])]]),
    lose: layered(.894, [[0, bronze(.87, 147, .43)], [.071, flute(65, .62), .25], [.32, pipa(62, .48), .32]])
  };
}

// Each bar's [beat, duration, MIDI] entries are phrases, with explicit rests for the battle effects.
const SCORES = {
  title: {
    bpm: 76, bars: 12, root: [50, 50, 53, 48], gain: .34, wood: false,
    notes: [
      [[0, 1.43, 62], [1.75, .49, 65], [2.5, 1.22, 69]],
      [[0, .91, 72], [1.25, .66, 69], [2.3, .72, 65]],
      [[0, 1.36, 67], [1.75, .6, 69], [2.48, 1.2, 74]],
      [[0, .88, 72], [1.25, .45, 69], [2.18, 1.35, 62]]
    ],
    low: [[0, 0, .125], [2.5, 7, .08]], taps: []
  },
  battle: {
    bpm: 122, bars: 16, root: [50, 50, 53, 48], gain: .38, wood: true,
    notes: [
      [[0, .47, 62], [.5, .39, 65], [1, .64, 69], [2, .47, 69], [2.5, .43, 72], [3, .78, 74]],
      [[0, .43, 72], [.5, .39, 69], [1, 1.16, 65], [2.65, .42, 67], [3.25, .55, 69]],
      [[0, .48, 65], [.5, .43, 69], [1, .74, 72], [2.48, .57, 77], [3.22, .57, 74]],
      [[0, .58, 72], [.75, .50, 69], [1.5, .45, 67], [2.25, 1.23, 62]]
    ],
    low: [[0, 0, .145], [1.5, 7, .09], [2, 0, .11], [3.5, 12, .065]], taps: [[0, .32], [1.5, .134], [2.5, .167], [3.5, .127]]
  },
  boss: {
    bpm: 144, bars: 16, root: [38, 41, 48, 45], gain: .42, wood: true,
    notes: [
      [[0, .45, 62], [.5, .40, 62], [1, .66, 65], [2, .41, 69], [2.5, .41, 72], [3, .71, 77]],
      [[0, .61, 74], [.75, .45, 72], [1.5, .42, 69], [2.3, 1.33, 62]],
      [[0, .45, 67], [.5, .37, 67], [1, .62, 69], [1.75, .37, 72], [2.25, .58, 77], [3, .72, 81]],
      [[0, .52, 77], [.75, .49, 74], [1.5, .45, 72], [2.25, 1.12, 69]]
    ],
    low: [[0, 0, .18], [.75, 12, .081], [2, 7, .15], [2.75, 12, .095], [3.5, 0, .078]],
    taps: [[0, .43], [.75, .14], [1.5, .21], [2, .27], [2.75, .15], [3.5, .25]]
  },
  market: {
    bpm: 88, bars: 12, root: [50, 57, 54, 52], gain: .34, wood: true,
    notes: [
      [[0, .45, 74], [.5, .44, 78], [1, 1.27, 81], [2.75, .71, 83]],
      [[0, .51, 81], [.75, .59, 78], [1.5, .49, 76], [2.3, 1.09, 74]],
      [[0, .44, 71], [.52, .47, 74], [1.05, .67, 78], [2, .48, 83], [2.55, 1.1, 86]],
      [[0, .42, 83], [.52, .47, 81], [1.05, .66, 78], [2.35, 1.31, 74]]
    ],
    low: [[0, 0, .12], [1.55, 7, .066], [2.5, 12, .068]], taps: [[.5, .09],[2.68, .10]]
  }
};

export function loopOf(name) {
  const spec = SCORES[name];
  if (!spec) throw new Error('Unknown score: ' + name);
  const beat = 60 / spec.bpm, out = buffer(4 * spec.bars * beat), cache = new Map();
  const lowDrum = drum(.37, name === 'boss' ? 90 : name === 'battle' ? 126 : 196, .82);
  const stick = drum(.125, 338, .56, .71);
  const ring = bronze(.68, name === 'boss' ? 145 : 269, .54);
  const play = (at, midi, seconds, voice, gain) => {
    const key = voice + ':' + midi + ':' + Math.round(seconds * 1000);
    let sample = cache.get(key);
    if (!sample) {
      sample = voice === 'flute' ? flute(midi, seconds, name !== 'boss') : pipa(midi, seconds, voice === 'bright');
      cache.set(key, sample);
    }
    add(out, sample, at, gain);
  };
  for (let bar = 0; bar < spec.bars; bar++) {
    const phrase = bar % 4, section = Math.floor(bar / 4), at = bar * 4 * beat;
    const emphasis = [0.82, 0.96, 0.73, 1.05][section];
    const wood = spec.wood && !(name === 'battle' && section === 2) && !(name === 'market' && section === 1);
    const voice = wood ? (name === 'boss' || name === 'battle' && section === 3 ? 'bright' : 'pipa') : 'flute';
    const root = spec.root[phrase];
    for (const [offset, interval, gain] of spec.low)
      if (bar !== spec.bars - 1 || offset < 3) play(at + offset * beat, root + interval, .51, 'pipa', gain * emphasis);
    for (const [offset, duration, midi] of spec.notes[phrase]) {
      if (bar === spec.bars - 1 && offset > 2.4) continue;
      const pitch = name === 'title' && section === 1 && offset >= 2.48 ? midi + 12 : midi;
      play(at + offset * beat, pitch, duration * beat, voice, spec.gain * emphasis * (offset === 0 ? 1 : .84));
      if (name === 'title' && section === 2 && offset === 0) play(at + .041, pitch + 12, .4, 'pipa', .078);
    }
    for (const [offset, gain] of spec.taps) {
      if (bar === spec.bars - 1 && offset > 2.8) continue;
      if (section === 2 && phrase === 3 && offset > 1) continue;
      add(out, offset === 0 || name === 'boss' && offset === 2 ? lowDrum : stick, at + offset * beat, gain * emphasis);
    }
    if ((name === 'boss' || name === 'battle') && phrase === 0) add(out, ring, at + .009, name === 'boss' ? .24 : .14);
    if (bar === spec.bars - 1) play(at + 2.68 * beat, name === 'market' ? 74 : 62, .86 * beat, 'flute', .23);
  }

  // A quiet theatre reflection. Only feed it backward from dry earlier samples.
  const reflection = Math.round(.037 * RATE);
  for (let i = out.length - 1; i >= reflection; i--) out[i] += .087 * out[i - reflection];
  return shape(out, name === 'boss' ? .69 : name === 'battle' ? .62 : name === 'title' ? .53 : .51, .045);
}
