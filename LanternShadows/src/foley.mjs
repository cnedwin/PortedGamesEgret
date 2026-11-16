// Close-miked theater foley synthesized from resonant wood, skin and bronze,
// plus band-limited contact and fabric noise. Everything is original.
const RATE = 32000;
const TAU = 2 * Math.PI;
const PITCH = [1, 0.937, 1.064, 0.973];

// A mode is [frequency in Hz, relative amplitude, decay time in seconds].
const WOOD = [[436, 0.72, 0.025], [711, 0.54, 0.019], [1063, 0.31, 0.013], [1641, 0.17, 0.009], [2479, 0.07, 0.006]];
const BAMBOO = [[392, 0.53, 0.038], [706, 0.47, 0.026], [1028, 0.32, 0.025], [1471, 0.10, 0.013], [2129, 0.09, 0.007]];
const BOARD = [[289, 0.53, 0.036], [461, 0.61, 0.022], [794, 0.39, 0.016], [1303, 0.15, 0.009], [1943, 0.06, 0.006]];
const SKIN = [[128, 0.77, 0.078], [208, 0.51, 0.058], [336, 0.35, 0.038], [482, 0.30, 0.030], [729, 0.20, 0.022], [1091, 0.09, 0.009]];
const SHIELD = [[402, 0.46, 0.028], [579, 0.52, 0.046], [987, 0.33, 0.039], [1378, 0.23, 0.027], [1892, 0.15, 0.016], [2743, 0.08, 0.011]];
const EDGE = [[626, 0.56, 0.050], [953, 0.47, 0.083], [1418, 0.31, 0.073], [1843, 0.14, 0.057], [2417, 0.13, 0.022], [2971, 0.07, 0.018]];
const BOWL = [[445, 0.64, 0.163], [461, 0.31, 0.153], [706, 0.45, 0.161], [1057, 0.26, 0.116], [1547, 0.17, 0.064], [2189, 0.07, 0.030]];
const PLATE = [[168, 0.51, 0.340], [171, 0.35, 0.320], [263, 0.38, 0.257], [391, 0.43, 0.266], [593, 0.29, 0.209], [717, 0.18, 0.139], [1129, 0.12, 0.087]];
const STRING = [[436, 0.72, 0.161], [872, 0.32, 0.071], [1308, 0.16, 0.030], [1747, 0.08, 0.022]];

const body = (modes, gain, pitch = 1, start = 0, rise = 0.0015) => ({ modes, gain, pitch, start, rise });
const texture = (gain, low, high, decay, rise, start = 0) => ({ gain, low, high, decay, rise, start });

// [seconds, sample peak, variant count, layers]
const SOUNDS = {
  // Clappers on the crowd path are light, dry and shorter than the player's staff.
  clap: [0.135, 0.12, 3, [
    body(WOOD, 0.82, 0.93), texture(0.27, 380, 2350, 0.010, 0.001),
    body(WOOD, 0.22, 1.19, 0.012),
  ]],
  smallGong: [0.77, 0.24, 2, [
    body(BOWL, 1, 0.96, 0.002, 0.019), body(BOARD, 0.40, 1.06),
    texture(0.19, 290, 1690, 0.013, 0.002),
  ]],
  gong: [1.60, 0.40, 2, [
    body(PLATE, 0.94, 1, 0.004, 0.044), body(SKIN, 0.39, 0.82, 0, 0.007),
    texture(0.17, 120, 1350, 0.060, 0.006), body(BOWL, 0.18, 0.71, 0.031, 0.058),
  ]],
  drum: [0.40, 0.28, 3, [
    body(SKIN, 1.04, 1, 0, 0.002), body(BOARD, 0.32, 0.89, 0.003),
    texture(0.24, 128, 1430, 0.026, 0.002),
  ]],
  swish: [0.23, 0.15, 4, [
    texture(0.92, 300, 2050, 0.039, 0.025), texture(0.58, 175, 895, 0.048, 0.037, 0.018),
    body(BAMBOO, 0.07, 0.75, 0.04),
  ]],
  whirl: [0.37, 0.19, 3, [
    texture(0.82, 172, 1010, 0.080, 0.029), texture(0.44, 310, 1770, 0.070, 0.029, 0.075),
    body(BAMBOO, 0.09, 0.72, 0.05), texture(0.21, 185, 1090, 0.048, 0.029, 0.143),
  ]],
  tap: [0.103, 0.085, 4, [
    body(BOARD, 0.55, 0.93), texture(0.32, 166, 1620, 0.013, 0.002),
    texture(0.09, 215, 1890, 0.018, 0.008, 0.018),
  ]],
  staff: [0.181, 0.25, 4, [
    body(BAMBOO, 0.86, 0.97), body(BOARD, 0.47, 1.01, 0.005),
    texture(0.35, 205, 2000, 0.013, 0.001),
  ]],
  uplift: [0.275, 0.27, 4, [
    body(BAMBOO, 0.89, 1.07), body(BOARD, 0.37, 0.92, 0.003),
    texture(0.35, 295, 1700, 0.013, 0.001), texture(0.32, 360, 2040, 0.053, 0.038, 0.023),
    body(WOOD, 0.19, 1.24, 0.047),
  ]],
  smash: [0.447, 0.38, 3, [
    body(SKIN, 0.91, 0.79, 0.004), body(BOARD, 0.58, 0.83),
    texture(0.42, 103, 1660, 0.027, 0.002), texture(0.16, 201, 1050, 0.072, 0.020, 0.030),
    body(WOOD, 0.17, 0.92, 0.038),
  ]],
  guard: [0.234, 0.27, 3, [
    body(SHIELD, 0.91, 0.96), body(WOOD, 0.42, 0.86),
    texture(0.39, 360, 2750, 0.019, 0.001), body(BOARD, 0.16, 0.89, 0.015),
  ]],
  parry: [0.444, 0.31, 3, [
    body(EDGE, 0.83, 1, 0.003, 0.005), body(SHIELD, 0.45, 1.06),
    texture(0.27, 337, 2670, 0.020, 0.001), body(EDGE, 0.15, 0.992, 0.032, 0.013),
  ]],
  jump: [0.171, 0.13, 3, [
    body(BOARD, 0.31, 0.92), texture(0.51, 235, 1560, 0.031, 0.014),
    texture(0.19, 338, 2000, 0.025, 0.018, 0.033),
  ]],
  land: [0.21, 0.24, 3, [
    body(SKIN, 0.58, 0.92), body(BOARD, 0.62, 0.86),
    texture(0.37, 136, 1420, 0.032, 0.002), body(WOOD, 0.11, 0.95, 0.018),
  ]],
  hurt: [0.25, 0.27, 3, [
    body(SKIN, 0.58, 0.84), body(BOARD, 0.43, 1.18, 0.004),
    texture(0.75, 222, 1770, 0.031, 0.003), texture(0.27, 189, 1090, 0.036, 0.018, 0.034),
  ]],
  confirm: [0.36, 0.16, 2, [
    body(WOOD, 0.29, 0.86), body(STRING, 0.64, 0.83, 0.004, 0.005),
    body(STRING, 0.42, 1.105, 0.055, 0.006), texture(0.18, 370, 1880, 0.012, 0.002),
  ]],
  cancel: [0.165, 0.11, 2, [
    body(BOARD, 0.45, 1.13), body(WOOD, 0.24, 0.91, 0.043),
    texture(0.32, 295, 1560, 0.018, 0.006),
  ]],
  ember: [0.50, 0.15, 3, [
    texture(0.86, 112, 1050, 0.101, 0.035), texture(0.40, 337, 1850, 0.051, 0.008, 0.069),
    texture(0.28, 310, 2040, 0.040, 0.007, 0.15), body(SKIN, 0.12, 0.76, 0, 0.022),
  ]],
  magic: [0.70, 0.25, 3, [
    texture(0.70, 191, 1700, 0.099, 0.036), body(BAMBOO, 0.25, 0.82, 0.028),
    body(BOWL, 0.46, 0.82, 0.065, 0.019), body(STRING, 0.36, 1.075, 0.133, 0.015),
  ]],
};

function noise(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2147483648 - 1;
  };
}

function applyBody(samples, layer, variant, random) {
  const start = Math.floor(layer.start * RATE);
  const rise = layer.rise * RATE;
  for (const [frequency, level, decay] of layer.modes) {
    const angle = TAU * frequency * layer.pitch * PITCH[variant] * (1 + random() * 0.012) / RATE;
    const damping = Math.exp(-1 / (RATE * decay * (1 + random() * 0.09)));
    const step = 2 * Math.cos(angle) * damping;
    let last = 0, current = Math.sin(angle) * damping * level * layer.gain * (1 + random() * 0.12);
    const end = Math.min(samples.length, start + Math.ceil(decay * RATE * 8));
    for (let i = start; i < end; i++) {
      samples[i] += last * Math.min(1, (i - start) / rise);
      const next = step * current - damping * damping * last;
      last = current;
      current = next;
    }
  }
}

function applyTexture(samples, layer, random) {
  const offset = layer.start + (layer.start ? random() * 0.007 : 0);
  const start = Math.round(offset * RATE);
  const attack = layer.rise * RATE;
  const low = 1 - Math.exp(-TAU * layer.low / RATE);
  const high = 1 - Math.exp(-TAU * layer.high / RATE);
  const damping = Math.exp(-1 / (layer.decay * RATE));
  let lows = 0, highs = 0, energy = layer.gain;
  const end = Math.min(samples.length, start + Math.ceil(layer.decay * RATE * 8));
  for (let i = start; i < end; i++) {
    const white = random();
    lows += (white - lows) * low;
    highs += (white - highs) * high;
    samples[i] += (highs - lows) * energy * Math.min(1, (i - start) / attack);
    energy *= damping;
  }
}

function booth(samples) {
  // Two soft, short reflections put all cues inside the same small wooden space.
  const dry = samples.slice();
  let near = 0, far = 0;
  const first = Math.round(RATE * 0.014), second = Math.round(RATE * 0.032);
  for (let i = first; i < samples.length; i++) {
    near += (dry[i - first] - near) * 0.39;
    far += ((dry[i - second] ?? 0) - far) * 0.29;
    samples[i] += near * 0.105 + far * 0.047;
  }
}

function writeWav(samples, targetPeak) {
  const bytes = new Uint8Array(44 + samples.length * 2), view = new DataView(bytes.buffer);
  const text = (at, word) => [...word].forEach((letter, index) => view.setUint8(at + index, letter.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, bytes.length - 8, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, RATE, true);
  view.setUint32(28, RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, bytes.length - 44, true);

  let peak = 0;
  const fade = RATE * 0.020;
  for (let i = 0; i < samples.length; i++) {
    samples[i] *= Math.min(1, (samples.length - 1 - i) / fade);
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  const scale = targetPeak * 32767 / peak;
  for (let i = 0; i < samples.length; i++) view.setInt16(44 + 2 * i, Math.round(samples[i] * scale), true);
  return bytes;
}

/** Builds reproducible and distinct mono WAV variations for the engine's mixer. */
export function createFoley() {
  return Object.fromEntries(Object.entries(SOUNDS).map(([name, [seconds, peak, variants, layers]], sound) => [
    name,
    Array.from({ length: variants }, (_, variant) => {
      const samples = new Float32Array(Math.round(seconds * RATE));
      const random = noise(5273 + sound * 811 + variant * 283);
      for (const layer of layers) {
        if (layer.modes) applyBody(samples, layer, variant, random);
        else applyTexture(samples, layer, random);
      }
      booth(samples);
      return writeWav(samples, peak * (1 + random() * 0.038));
    }),
  ]));
}
