// Original music for 島夜雀室. Rebuild with: node tools/compose-score.mjs <ffmpeg executable>
import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ffmpeg = process.argv[2] ?? 'ffmpeg';
const target = new URL('../assets/audio/', import.meta.url);
const RATE = 32000;
const TAU = 2 * Math.PI;
const pitch = (midi) => 440 * 2 ** ((midi - 69) / 12);

// Bass, close lower voicing, then the upper answer to leave room for the melody.
const chords = {
  D: [38, 54, 57, 61, 64], A: [37, 55, 57, 61, 64],
  Bm: [35, 54, 57, 61, 62], G: [43, 54, 57, 59, 62],
  Em: [40, 55, 59, 62, 66], A13: [45, 55, 59, 61, 66],
  'F#m': [42, 52, 57, 61, 64], B7: [35, 57, 60, 63, 66],
  Gm: [43, 53, 57, 58, 62]
};

// [beat, pitch, beats, velocity]. The motif F♯–E–B–A returns in three arrangements.
const opening = [
  [[.68, 78, .62, .78], [1.6, 76, .75, .70], [2.78, 71, .42, .63], [3.32, 69, .54, .67]],
  [[.50, 67, 1.1, .75], [1.94, 69, .55, .61], [2.76, 73, 1.0, .70]],
  [[.20, 74, .78, .72], [1.48, 73, .4, .59], [2.18, 71, 1.45, .67]],
  [[.82, 69, .6, .67], [1.70, 67, .58, .64], [2.56, 66, 1.1, .60]],
  [[.40, 67, .64, .64], [1.32, 71, .50, .67], [2.23, 74, .96, .73]],
  [[.25, 73, .68, .67], [1.24, 71, .6, .65], [2.12, 69, 1.3, .70]],
  [[.68, 76, .62, .74], [1.60, 74, .75, .68], [2.78, 69, .42, .63], [3.32, 66, .54, .60]],
  [[.66, 67, .65, .60], [1.53, 69, 1.57, .74]]
];
const middle = [
  [[.6, 69, .5, .74], [1.34, 71, .65, .65], [2.44, 74, .92, .69]],
  [[.20, 73, 1.28, .68], [2.31, 69, .65, .58]],
  [[.55, 66, .65, .66], [1.42, 69, .50, .72], [2.40, 73, 1.12, .72]],
  [[.20, 71, .9, .68], [1.8, 66, .46, .57], [2.48, 63, .85, .58]],
  [[.80, 67, .62, .69], [1.72, 64, .75, .62], [2.71, 59, .52, .57]],
  [[.44, 61, .65, .61], [1.68, 64, .53, .67], [2.60, 69, .78, .73]],
  [[.55, 78, .70, .79], [1.55, 76, .58, .69], [2.52, 71, .8, .63]],
  [[.00, 69, .83, .67], [1.1, 67, .73, .61], [2.16, 66, 1.12, .63]]
];
const settles = [
  [[.45, 66, .74, .72], [1.5, 64, .8, .63], [2.64, 59, .64, .57], [3.5, 57, .7, .61]],
  [[.4, 55, 1.3, .61], [2.14, 57, .67, .58]],
  [[.58, 59, .7, .68], [1.57, 62, .8, .67], [2.73, 66, .8, .63]],
  [[.48, 64, 1.68, .64], [2.62, 61, .55, .53]],
  [[.50, 62, .76, .64], [1.42, 59, .76, .56], [2.56, 55, 1.02, .64]],
  [[.55, 58, .84, .65], [2.00, 57, 1.05, .60]],
  [[.82, 57, .6, .59], [1.7, 61, .57, .64], [2.52, 64, .78, .66]],
  [[.1, 62, 2.05, .68]]
];

const pieces = {
  title: {
    tempo: 74, seed: 1142, rain: .024, peak: .45,
    harmony: 'D A Bm G Em A13 D A13 G A F#m B7 Em A13 G D'.split(' '),
    phrases: [...opening, ...middle],
    music: [1, .67, .76, .64, .71, .66, .84, .72, .81, .68, .7, .62, .60, .74, .89, .72]
  },
  table: {
    tempo: 86, seed: 8701, rain: .014, peak: .45,
    harmony: 'D A Bm G D A Bm G Em A13 F#m B7 Em A13 D A13 D A Bm G Em Gm A13 D'.split(' '),
    phrases: [opening[0], [], [], opening[3], [], [], opening[6], [],
      middle[0], [], middle[2], [], [], middle[5], [], [], opening[0], opening[1],
      [], [], opening[4], [], opening[5], []],
    music: [.65, .72, .68, .70, .72, .65, .70, .71, .65, .73, .70, .67, .70, .76, .68, .70, .74, .67, .68, .68, .71, .70, .71, .67],
    groove: true
  },
  result: {
    tempo: 75, seed: 6523, rain: .021, peak: .41,
    harmony: 'D A Bm F#m G Gm A13 D'.split(' '),
    phrases: settles,
    music: [.79, .72, .8, .66, .74, .76, .67, .82]
  }
};

function render(piece) {
  const beat = 60 / piece.tempo;
  const frames = Math.round(piece.harmony.length * 4 * beat * RATE);
  const left = new Float32Array(frames), right = new Float32Array(frames);
  let seed = piece.seed;
  const noise = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2147483648 - 1;
  };

  function note(kind, start, midi, length, amount, pan) {
    const freq = pitch(midi) * (1 + noise() * .0008);
    const duration = Math.round((length + (kind === 'bass' ? .13 : .44)) * RATE);
    const first = Math.round((start + noise() * .004) * RATE) + frames;
    const l = Math.sqrt((1 - pan) / 2), r = Math.sqrt((1 + pan) / 2);
    const phase = TAU * freq / RATE;
    const attack = kind === 'keys' ? .0048 : kind === 'bass' ? .013 : .006;
    for (let i = 0; i < duration; i++) {
      const t = i / RATE, p = phase * i;
      const release = Math.max(0, t - length);
      const env = Math.min(1, t / attack) * Math.exp(-release * (kind === 'bass' ? 48 : 12));
      let sample;
      if (kind === 'bass') {
        const body = Math.sin(p) * .81 + Math.sin(p * 2.002) * .24 + Math.sin(p * 3.014) * .13;
        sample = body * Math.exp(-3 * t) + noise() * .12 * Math.exp(-85 * t);
      } else if (kind === 'pluck') {
        const bright = Math.sin(p * 2) * .22 + Math.sin(p * 3.008) * .18 + Math.sin(p * 6.032) * .07;
        sample = Math.sin(p + .1 * Math.sin(p * 2)) * .65 * Math.exp(-4.7 * t)
          + bright * Math.exp(-10 * t) + noise() * .09 * Math.exp(-115 * t);
      } else {
        const bright = Math.sin(p * 2.005) * .40 + Math.sin(p * 3.018) * .16 + Math.sin(p * 5.06) * .10;
        sample = Math.sin(p) * .66 * Math.exp(-2.45 * t) + bright * Math.exp(-7.8 * t)
          + Math.sin(p * 1.0009 + .2) * .18 * Math.exp(-3.1 * t)
          + noise() * .055 * Math.exp(-105 * t);
      }
      const at = (first + i) % frames, value = sample * env * amount;
      left[at] += value * l;
      right[at] += value * r;
    }
  }

  function brush(start, amount, pan, length) {
    const first = Math.round(start * RATE), duration = Math.round(length * RATE);
    let slow = 0, fast = 0;
    for (let i = 0; i < duration; i++) {
      const t = i / RATE, white = noise();
      slow += (white - slow) * .145;
      fast += (white - fast) * .55;
      const envelope = Math.min(1, t / .012) * Math.exp(-t * 4.5 / length);
      const at = (first + i) % frames, value = (fast - slow) * envelope * amount;
      left[at] += value * (1 - pan);
      right[at] += value * (1 + pan);
    }
  }

  for (let i = 0; i < piece.harmony.length; i++) {
    const [bass, ...voicing] = chords[piece.harmony[i]];
    const start = 4 * i * beat, music = piece.music[i];
    const sway = piece.groove ? .11 : .23;
    voicing.forEach((tone, index) => {
      const offset = piece.groove ? .08 + index * .026 : .06 + index * .047;
      note('keys', start + offset * beat, tone, beat * 1.65, .112 * music, -.20);
      if (index !== 1) {
        note('pluck', start + (2.26 + index * sway) * beat, tone + (index === 3 ? 12 : 0),
          .56 * beat, .083 * music, .24);
      }
    });
    note('bass', start + .015, bass, beat * 1.45, .20 * music, -.04);
    if (piece.groove) {
      note('bass', start + beat * 1.57, bass + (i % 4 === 2 ? 12 : 7), beat * .53, .133 * music, .03);
      note('bass', start + beat * 2.47, bass + 12, beat * .85, .132 * music, .02);
      note('bass', start + beat * 3.60, chords[piece.harmony[(i + 1) % piece.harmony.length]][0] + (i % 2 === 0 ? -1 : 2),
        beat * .23, .102 * music, -.02);
      brush(start + beat * 1.045, .066, -.25, .24);
      brush(start + beat * 2.58, .038, .34, .14);
      brush(start + beat * 3.07, .078, .21, .24);
    } else if (i % 2 === 0) {
      note('bass', start + beat * 2.65, bass + 7, beat * .76, .104 * music, .03);
    }
    for (const [at, tone, length, velocity] of piece.phrases[i]) {
      note(piece.groove ? 'pluck' : 'keys', start + at * beat, tone, length * beat,
        .255 * velocity, piece.groove ? .11 : .04);
      if (!piece.groove && i % 4 === 3) {
        note('pluck', start + (at + .035) * beat, tone, .46 * beat, .065 * velocity, .28);
      }
    }
  }

  // Short, damped room reflections and quiet stereo rain with continuous loop edges.
  const roomLeft = left.slice(), roomRight = right.slice();
  const taps = [57, 97, 163].map((ms) => Math.floor(ms * RATE / 1000));
  let rainSlow = 0, rainFast = 0, reflectedLeft = 0, reflectedRight = 0, peak = 0;
  for (let i = 0; i < frames; i++) {
    const random = noise();
    rainSlow += (random - rainSlow) * .018;
    rainFast += (random - rainFast) * .14;
    const edge = Math.min(1, i / 1200, (frames - 1 - i) / 1200);
    const rain = edge * piece.rain * (.82 + .16 * Math.cos(TAU * i / frames));
    reflectedLeft += (roomRight[(i + frames - taps[0]) % frames] - reflectedLeft) * .13;
    reflectedRight += (roomLeft[(i + frames - taps[1]) % frames] - reflectedRight) * .11;
    left[i] += reflectedLeft * .155 + roomLeft[(i + frames - taps[2]) % frames] * .052
      + rain * (rainSlow + rainFast * .65);
    right[i] += reflectedRight * .145 + roomRight[(i + frames - taps[2]) % frames] * .048
      + rain * (rainSlow + (rainFast - rainSlow) * .48 + noise() * .13);
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }

  const wav = Buffer.alloc(44 + frames * 4);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(RATE, 24);
  wav.writeUInt32LE(RATE * 4, 28);
  wav.writeUInt16LE(4, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(frames * 4, 40);
  const gain = 32767 * piece.peak / peak;
  for (let i = 0; i < frames; i++) {
    wav.writeInt16LE(Math.round(left[i] * gain), 44 + i * 4);
    wav.writeInt16LE(Math.round(right[i] * gain), 46 + i * 4);
  }
  return wav;
}

await mkdir(target, { recursive: true });
for (const [key, piece] of Object.entries(pieces)) {
  const file = fileURLToPath(new URL(`${key}.mp3`, target));
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', 'pipe:0', '-map_metadata', '-1',
    '-codec:a', 'libmp3lame', '-b:a', '88k', '-id3v2_version', '3', file], { input: render(piece), encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr);
  console.log(`${key} · ${piece.harmony.length} bars at ${piece.tempo} BPM`);
}
