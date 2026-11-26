// 声音：全部用代码合成。搭杆是木槌一敲，拆是抽出来的一声；试通时木头吱呀、绳子绷响、断裂的脆响和落水声；
// 过桥是五声音阶的一串琴音。音乐是一段二十四秒的循环：古琴似的拨弦加一点竹笛。
// 混音器是引擎的（@egret/engine/audio），网页这一半是 Web Audio；第一次按键或触屏之后才响，这是浏览器的要求。
// Sound, all made in code. Laying a member is a mallet's knock, taking one down a pull; a test crossing has creaking
// timber, ropes thrumming, the crack of a break and the splash of a fall; crossing is a run of pentatonic plucks. The
// music is a 24-second loop of plucked strings, like a guqin, and a little bamboo flute. The mixer is the engine's
// (@egret/engine/audio), its page half Web Audio; nothing sounds before the first key or touch, as browsers ask.
import { createAudioMixer } from '@egret/engine/audio';
import { encodeWav } from '@egret/engine/kit';
import { createWebAudioBackend } from '@egret/engine/web/audio';

export const RATE = 32000;

/** A seeded noise source, so each sound is the same every load. */
function noise(seed = 7) {
  let s = seed;
  return () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2147483648 - 1);
}

/** A plucked string (a Karplus–Strong string): `freq` hertz for `seconds`. */
export function pluck(freq, seconds, { bright = 0.5, gain = 0.4, seed = 3 } = {}) {
  const out = new Float32Array(Math.round(seconds * RATE)),
    n = Math.max(2, Math.round(RATE / freq)),
    line = new Float32Array(n),
    rnd = noise(seed);
  for (let i = 0; i < n; i++) line[i] = rnd() * (0.5 + bright * 0.5);
  let k = 0;
  for (let i = 0; i < out.length; i++) {
    const a = line[k],
      b = line[(k + 1) % n];
    line[k] = (a + b) * 0.5 * 0.996;
    out[i] = a * gain * Math.min(1, i / 40);
    k = (k + 1) % n;
  }
  return out;
}

/** A tone with partials and a decay. */
function tone(freq, seconds, { decay = 10, partials = [[1, 1]], gain = 0.3, attack = 0.004 } = {}) {
  const out = new Float32Array(Math.round(seconds * RATE));
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE,
      env = Math.min(1, t / attack) * Math.exp(-t * decay);
    let v = 0;
    for (const [r, a] of partials) v += Math.sin(2 * Math.PI * freq * r * t) * a;
    out[i] = v * env * gain;
  }
  return out;
}

/** Noise through a one-pole low-pass, shaped by `shape(t)`. */
function hiss(seconds, { cutoff = 0.2, gain = 0.4, shape = (t) => Math.exp(-t * 10), seed = 11 } = {}) {
  const out = new Float32Array(Math.round(seconds * RATE)),
    rnd = noise(seed);
  let y = 0;
  for (let i = 0; i < out.length; i++) {
    y += (rnd() - y) * cutoff;
    out[i] = y * gain * shape(i / RATE);
  }
  return out;
}

const mix = (...parts) => {
  const out = new Float32Array(Math.max(...parts.map((p) => p.length)));
  for (const p of parts) for (let i = 0; i < p.length; i++) out[i] += p[i];
  return out;
};
const delay = (part, seconds) => {
  const at = Math.round(seconds * RATE),
    out = new Float32Array(part.length + at);
  out.set(part, at);
  return out;
};

// The pentatonic scale on D: gong, shang, jue, zhi, yu.
const SCALE = [293.66, 329.63, 369.99, 440, 493.88];
const note = (step) => SCALE[((step % 5) + 5) % 5] * 2 ** Math.floor(step / 5);

/** The sounds of the game, by name. */
export const EFFECTS = {
  tap: () => tone(880, 0.08, { decay: 50, partials: [[1, 1], [2.4, 0.3]], gain: 0.25 }),
  knock: () => mix(tone(190, 0.18, { decay: 30, partials: [[1, 1], [2.7, 0.4], [5.1, 0.15]], gain: 0.5 }), hiss(0.05, { cutoff: 0.5, gain: 0.25, shape: (t) => Math.exp(-t * 80) })),
  pull: () => mix(tone(330, 0.12, { decay: 30, partials: [[1, 1], [1.5, 0.4]], gain: 0.25 }), hiss(0.1, { cutoff: 0.3, gain: 0.2, shape: (t) => Math.exp(-t * 30) })),
  deny: () => tone(150, 0.2, { decay: 18, partials: [[1, 1], [1.33, 0.5]], gain: 0.3 }),
  creak: () => {
    // A slow, rough rub: a tone sliding down with rasping noise on it.
    const out = new Float32Array(Math.round(0.5 * RATE)),
      rnd = noise(5);
    let phase = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / RATE,
        f = 120 - 50 * t + 20 * Math.sin(t * 40);
      phase += (2 * Math.PI * f) / RATE;
      out[i] = (Math.sign(Math.sin(phase)) * 0.3 + rnd() * 0.25) * Math.sin(Math.PI * Math.min(1, t / 0.5)) * 0.22;
    }
    return out;
  },
  thrum: () => mix(pluck(98, 0.8, { bright: 0.3, gain: 0.35, seed: 9 }), pluck(147, 0.6, { bright: 0.2, gain: 0.15, seed: 4 })),
  crack: () => mix(hiss(0.35, { cutoff: 0.9, gain: 0.7, shape: (t) => Math.exp(-t * 18) }), tone(70, 0.3, { decay: 12, gain: 0.4 })),
  splash: () => hiss(0.9, { cutoff: 0.12, gain: 0.6, shape: (t) => Math.min(1, t * 40) * Math.exp(-t * 4) }),
  roll: () => hiss(0.3, { cutoff: 0.05, gain: 0.25, shape: (t) => Math.sin(Math.PI * t / 0.3) }),
  won: () => mix(...[0, 2, 4, 5, 7].map((s, i) => delay(pluck(note(s + 5), 1.6, { bright: 0.7, gain: 0.3, seed: i + 2 }), i * 0.13))),
  lost: () => mix(tone(110, 1.6, { decay: 2.2, partials: [[1, 1], [2.02, 0.5], [3.1, 0.3]], gain: 0.35 }), hiss(0.6, { cutoff: 0.05, gain: 0.2, shape: (t) => Math.exp(-t * 4) })),
  seal: () => mix(tone(520, 0.4, { decay: 9, partials: [[1, 1], [2.76, 0.3]], gain: 0.3 }), hiss(0.06, { cutoff: 0.4, gain: 0.3, shape: (t) => Math.exp(-t * 60) }))
};

/** The music: plucked phrases over a slow drone, with a flute that comes in on the second half. */
export function music() {
  const seconds = 24,
    out = new Float32Array(seconds * RATE);
  const add = (part, at, gain = 1) => {
    const start = Math.round(at * RATE);
    for (let i = 0; i < part.length && start + i < out.length; i++) out[start + i] += part[i] * gain;
  };
  // A drone on the gong and zhi, low and soft.
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    out[i] += (Math.sin(2 * Math.PI * 73.4 * t) * 0.05 + Math.sin(2 * Math.PI * 110 * t) * 0.03) * (0.7 + 0.3 * Math.sin((2 * Math.PI * t) / seconds));
  }
  const phrase = [0, 2, 3, 2, 4, 3, 2, 0, -1, 0, 2, 1];
  const second = [5, 4, 3, 4, 2, 3, 2, 1, 0, 1, 2, 0];
  phrase.forEach((s, i) => add(pluck(note(s), 2.4, { bright: 0.5, gain: 0.32, seed: i + 1 }), i * 1, 1));
  second.forEach((s, i) => add(pluck(note(s), 2.4, { bright: 0.55, gain: 0.3, seed: i + 20 }), 12 + i * 1, 1));
  // The flute: long breathy notes.
  [
    [7, 12, 3],
    [6, 15, 2],
    [5, 17, 3],
    [4, 20, 3.5]
  ].forEach(([s, at, len]) => {
    const f = note(s),
      part = new Float32Array(Math.round(len * RATE)),
      rnd = noise(s);
    let y = 0;
    for (let i = 0; i < part.length; i++) {
      const t = i / RATE,
        env = Math.min(1, t / 0.4) * Math.min(1, (len - t) / 0.6);
      y += (rnd() - y) * 0.05;
      part[i] = (Math.sin(2 * Math.PI * f * t + 0.6 * Math.sin(2 * Math.PI * 5 * t)) * 0.12 + y * 0.04) * env;
    }
    add(part, at);
  });
  // A soft fade at both ends so the loop joins.
  for (let i = 0; i < RATE * 0.05; i++) {
    out[i] *= i / (RATE * 0.05);
    out[out.length - 1 - i] *= i / (RATE * 0.05);
  }
  return out;
}

const SILENT = { play() {}, music() {}, setSound() {}, setMusic() {}, setHidden() {} };

/** The game's sound on the engine's mixer. A host without sound gives a silent one instead of failing. */
export function createSound(scope, { sound = true, music: musicOn = true } = {}) {
  let mixer;
  try {
    const backend = createWebAudioBackend({ limiter: true });
    mixer = scope.use(createAudioMixer({ backend, locked: backend.locked, buses: [{ name: 'effects', volume: 0.8 }, { name: 'music', volume: 0.4 }] }));
    backend.attach(mixer);
  } catch (cause) {
    console.warn('sound', cause);
    return SILENT;
  }
  const decoded = new Map();
  let queue = Promise.resolve();
  const open = () => mixer.state !== 'closed';
  // Each sound is made in its own turn, so the first frames are not held up.
  for (const [name, make] of Object.entries(EFFECTS))
    queue = queue
      .then(() => new Promise((r) => setTimeout(r, 0)))
      .then(() => (open() ? mixer.decode(encodeWav([make()], RATE)) : null))
      .then((buffer) => buffer && decoded.set(name, buffer))
      .catch((cause) => console.warn('sound', name, cause));
  let musicBuffer = null,
    playing = false;
  const state = { sound, music: musicOn, hidden: false };
  const apply = () => {
    if (!open()) return;
    mixer.bus('effects').setMuted(!state.sound || state.hidden);
    mixer.bus('music').setMuted(!state.music || state.hidden);
  };
  apply();
  return {
    play(name, { volume = 1, rate = 1 } = {}) {
      const buffer = decoded.get(name);
      if (buffer && open()) mixer.play(buffer, { bus: 'effects', volume, rate, maxInstances: 3 });
    },
    /** Start the music (made the first time), or stop it. */
    music(on = true) {
      if (!open()) return;
      if (!on) {
        playing = false;
        return void mixer.stopMusic({ fade: 1 });
      }
      if (playing) return;
      playing = true;
      queue = queue.then(async () => {
        musicBuffer ??= await mixer.decode(encodeWav([music()], RATE));
        if (playing && open()) mixer.playMusic(musicBuffer, { loop: true, fade: 2 });
      });
    },
    setSound(on) {
      state.sound = on;
      apply();
    },
    setMusic(on) {
      state.music = on;
      apply();
    },
    /** While the page or mini game is hidden both buses are quiet. */
    setHidden(hidden) {
      state.hidden = hidden;
      apply();
    }
  };
}
