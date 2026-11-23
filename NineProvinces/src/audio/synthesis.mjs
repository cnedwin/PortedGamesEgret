// Original short sounds: silk-string modes, wood, stretched skin, breath and
// bronze. Rendered once at boot, never synthesized in the battle update loop.
export const RATE = 32000;
const TAU = Math.PI * 2;
const blank = seconds => new Float32Array(Math.ceil(seconds * RATE));
const noiseSource = seed => {
  let state = seed >>> 0;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2147483648 - 1);
};

export function tone(frequency, seconds, { decay = 14, partials = [[1, 1]], gain = .3, attack = 600, sweep = 0 } = {}) {
  const out = blank(seconds), phase = partials.map(() => 0);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    let sample = 0;
    for (let j = 0; j < partials.length; j++) {
      const [ratio, level] = partials[j];
      phase[j] += TAU * frequency * (1 + sweep * t) * ratio / RATE;
      sample += Math.sin(phase[j]) * level * Math.exp(-t * decay * (1 + j * .13));
    }
    out[i] = sample * gain * Math.min(1, t * attack);
  }
  return out;
}

function noise(seconds, { seed = 184, gain = .2, low = .32, high = .025, decay = 10, attack = 500 } = {}) {
  const out = blank(seconds), random = noiseSource(seed);
  let lp = 0, dc = 0;
  for (let i = 0; i < out.length; i++) {
    lp += (random() - lp) * low;
    dc += (lp - dc) * high;
    const t = i / RATE;
    out[i] = (lp - dc) * gain * Math.exp(-t * decay) * Math.min(1, t * attack);
  }
  return out;
}

function mix(out, sample, at = 0, gain = 1) {
  const start = Math.round(at * RATE);
  for (let i = 0; i < sample.length && start + i < out.length; i++) out[start + i] += sample[i] * gain;
  return out;
}

function silk(f, seconds, seed = 1, mellow = false) {
  const random = noiseSource(seed), out = blank(seconds);
  const phases = Array.from({ length: 12 }, () => random() * .12);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    let sample = 0;
    for (let h = 1; h <= phases.length; h++) {
      const brightness = 1 / (1 + (h * f / (mellow ? 2500 : 4700)) ** 2);
      const amplitude = Math.sin(Math.PI * h * .21) * brightness / h ** 1.25;
      sample += Math.sin(TAU * f * h * Math.sqrt(1 + .000035 * h * h) * t + phases[h - 1])
        * amplitude * Math.exp(-t * (1.5 + h * .28));
    }
    out[i] = sample * Math.min(1, t / .003) * .36;
  }
  return out;
}

function skin(seed, low = true) {
  const out = blank(low ? .65 : .30), hiss = noise(.12, { seed, gain: .21, decay: 50, low: .20, high: .03 });
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    phase += TAU * ((low ? 62 : 112) + 45 * Math.exp(-t / .025)) / RATE;
    out[i] = (Math.sin(phase) * Math.exp(-t * (low ? 9 : 18))
      + .22 * Math.sin(phase * 1.57) * Math.exp(-t * 25)) * Math.min(1, t / .0015) * .52;
  }
  return mix(out, hiss);
}

function bronze(f = 185, seconds = 1.8, gain = .35) {
  return tone(f, seconds, { decay: 2.7, gain, attack: 450,
    partials: [[1, .8], [1.49, .35], [2.06, .24], [2.83, .12], [3.37, .08], [4.23, .035]] });
}

function breath(f, seconds, seed = 4) {
  const out = blank(seconds), air = noise(seconds, { seed, gain: .065, decay: 2.0, low: .20, high: .09, attack: 25 });
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    phase += TAU * f * (1 + .0018 * Math.sin(TAU * 5 * t)) / RATE;
    const envelope = Math.min(1, t / .04) * Math.min(1, (seconds - t) / .10) * Math.exp(-t * 1.4);
    out[i] = (Math.sin(phase) + .17 * Math.sin(2 * phase) + air[i]) * envelope * .25;
  }
  return out;
}

/** Headroom and boundary ramps are applied to every effect, including variants. */
function master(out, peak = .42) {
  let dc = 0;
  for (const value of out) dc += value;
  dc /= out.length;
  let maximum = 0;
  const head = Math.min(48, out.length), tail = Math.min(480, out.length);
  for (let i = 0; i < out.length; i++) {
    out[i] = (out[i] - dc) * Math.min(1, i / head, (out.length - 1 - i) / tail);
    maximum = Math.max(maximum, Math.abs(out[i]));
  }
  const gain = Math.min(2.8, peak / Math.max(maximum, 1e-8));
  for (let i = 0; i < out.length; i++) out[i] *= gain;
  return out;
}

/** Each name is stable for game callers. A variant is a deterministic rotation. */
export const SOUNDS = {
  tap: () => master(mix(tone(615, .085, { decay: 66, gain: .24, partials: [[1, 1], [1.73, .35], [2.49, .13]], attack: 1600 }),
    noise(.025, { gain: .12, seed: 11, decay: 140, low: .40, high: .11 })), .19),
  open: () => master(mix(mix(blank(.45), silk(392, .44, 21, true)), silk(587.33, .32, 22, true), .07, .55), .26),
  close: () => master(mix(blank(.27), silk(293.66, .26, 25, true)), .22),
  coin: () => master(mix(mix(blank(.60), bronze(1244.5, .58, .13)), bronze(1661, .40, .07), .075), .29),
  build: (variant = 0) => {
    const out = blank(.43);
    mix(out, tone(155 + variant * 7, .22, { decay: 25, gain: .36, attack: 2000 }));
    mix(out, noise(.07, { gain: .20, decay: 60, low: .30, high: .045, seed: 31 + variant }));
    mix(out, tone(222, .20, { decay: 33, gain: .19, attack: 2000 }), .16);
    return master(out, .34);
  },
  drum: () => master(skin(42), .43),
  march: () => master(mix(mix(mix(blank(.78), skin(49)), skin(50, false), .19, .6), skin(51), .40, .78), .40),
  clash: (variant = 0) => {
    const out = blank(.34), f = 1080 + variant * 93;
    mix(out, tone(f, .32, { decay: 18, gain: .11, attack: 2400, partials: [[1, 1], [1.41, .6], [2.13, .18], [3.19, .04]] }));
    mix(out, noise(.18, { seed: 70 + variant, gain: .26, decay: 28, low: .72, high: .24 }));
    mix(out, skin(81 + variant, false), .008, .25);
    return master(out, .39);
  },
  arrows: (variant = 0) => {
    const out = blank(.55);
    for (let i = 0; i < 3; i++) mix(out, noise(.24, { seed: 91 + variant * 7 + i, gain: .16, decay: 10, attack: 35, low: .50, high: .17 }), i * .065);
    mix(out, tone(660 + variant * 27, .11, { decay: 48, gain: .09 }), .30);
    return master(out, .32);
  },
  fire: (variant = 0) => {
    const out = noise(.95, { seed: 131 + variant, gain: .22, low: .085, high: .004, decay: 3.8, attack: 12 });
    for (let i = 0; i < 7; i++) mix(out, noise(.045, { seed: 151 + variant * 11 + i, gain: .065, decay: 65, low: .45, high: .13 }), .06 + i * .103);
    return master(out, .37);
  },
  horn: () => {
    const out = blank(1.28);
    mix(out, tone(146.83, 1.18, { decay: 2.1, gain: .17, attack: 14, partials: [[1, 1], [2, .4], [3, .24], [4, .09]] }));
    mix(out, tone(220, .72, { decay: 2.2, gain: .11, attack: 16, partials: [[1, 1], [2, .35], [3, .12]] }), .31);
    return master(out, .40);
  },
  gong: () => master(bronze(146.83, 2.1, .4), .43),
  seal: () => master(mix(tone(91, .29, { decay: 22, gain: .45, attack: 2100, sweep: -.20 }),
    noise(.07, { seed: 171, gain: .17, decay: 60, low: .25, high: .035 })), .37),
  tactic: (variant = 0) => {
    const out = blank(.80);
    mix(out, noise(.42, { seed: 190 + variant, gain: .21, decay: 6, attack: 16, low: .40, high: .10 }));
    mix(out, bronze(293.66, .65, .16), .06);
    mix(out, silk(587.33, .48, 201 + variant), .14, .48);
    return master(out, .39);
  },
  heal: () => {
    const out = blank(1.05);
    for (const [i, f] of [392, 440, 587.33].entries()) mix(out, breath(f, .64, 220 + i), i * .14, .65);
    return master(out, .33);
  },
  rally: () => {
    const out = blank(.85);
    mix(out, noise(.52, { seed: 241, gain: .12, low: .12, high: .018, attack: 14, decay: 4 }));
    mix(out, skin(243), .03, .60);
    mix(out, skin(244, false), .22, .6);
    mix(out, skin(245, false), .42, .72);
    return master(out, .40);
  },
  win: () => {
    const out = blank(1.85);
    [293.66, 392, 440, 587.33].forEach((f, i) => mix(out, silk(f, 1.2, 261 + i), i * .16, .65));
    mix(out, bronze(146.83, 1.2, .16), .43);
    return master(out, .44);
  },
  lose: () => {
    const out = blank(1.80);
    [220, 196, 174.61, 146.83].forEach((f, i) => mix(out, silk(f, 1.2, 291 + i, true), i * .18, .62));
    return master(out, .37);
  },
  event: () => master(mix(mix(mix(blank(.85), silk(293.66, .80, 311, true)), silk(329.63, .70, 312, true), .10, .60), silk(392, .60, 313, true), .22, .50), .30),
};

export const CUE_PROFILE = {
  tap: { gap: 70, max: 2 }, open: { gap: 110, max: 1 }, close: { gap: 110, max: 1 },
  coin: { gap: 150, max: 2 }, build: { gap: 160, max: 2, variants: 3 },
  drum: { gap: 200, max: 2 }, march: { gap: 350, max: 1 },
  clash: { gap: 140, max: 2, variants: 3, impact: true }, arrows: { gap: 180, max: 2, variants: 3, impact: true },
  fire: { gap: 450, max: 1, variants: 2, impact: true },
  horn: { gap: 800, max: 1, duck: 900 }, gong: { gap: 1000, max: 1, duck: 1000 },
  seal: { gap: 180, max: 2 }, tactic: { gap: 240, max: 2, variants: 2, duck: 500 },
  heal: { gap: 300, max: 2, duck: 500 }, rally: { gap: 400, max: 1, duck: 650 },
  win: { gap: 1200, max: 1, duck: 1350 }, lose: { gap: 1200, max: 1, duck: 1350 },
  event: { gap: 400, max: 1 },
};
