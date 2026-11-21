// 声音：引擎 play 在代码里合成的音效，按法宝和事件起名；配乐是 play 写的曲子，波次里是「战斗」，集市里是「平静」，
// 越往后的波声部越多。一个声音文件也不加载。
// Sound: effects the engine's play makes in code, named for the treasures and the events; the music is play's, 'battle'
// in a wave and 'calm' in the market, with more parts as the waves go on. No sound file is loaded.
export const EFFECTS = {
  throw: { wave: 'noise', from: 1800, to: 600, seconds: 0.16, volume: 0.18, decay: 4 },
  sweep: { wave: 'noise', from: 900, to: 2400, seconds: 0.14, volume: 0.16, decay: 5 },
  thrust: { wave: 'saw', from: 520, to: 260, seconds: 0.09, volume: 0.16, decay: 6, noise: 0.3 },
  lob: { wave: 'triangle', from: 300, to: 500, seconds: 0.12, volume: 0.14, decay: 4 },
  land: { wave: 'noise', from: 500, to: 80, seconds: 0.25, volume: 0.3, decay: 5 },
  nova: { wave: 'noise', from: 300, to: 1400, seconds: 0.3, volume: 0.22, decay: 3 },
  hitSoft: { wave: 'square', from: 300, to: 160, seconds: 0.05, volume: 0.1, decay: 8, noise: 0.4 },
  splash: { wave: 'noise', from: 1400, to: 300, seconds: 0.18, volume: 0.16, decay: 6 },
  pearl: { wave: 'sine', from: 1500, to: 1900, seconds: 0.06, volume: 0.1, decay: 6 },
  ouch: { wave: 'saw', from: 260, to: 110, seconds: 0.2, volume: 0.3, decay: 4, noise: 0.2 },
  levelUp: [
    { wave: 'triangle', from: 660, seconds: 0.08, volume: 0.3, decay: 2 },
    { wave: 'triangle', from: 880, seconds: 0.08, volume: 0.3, decay: 2 },
    { wave: 'triangle', from: 1320, seconds: 0.2, volume: 0.3, decay: 4 }
  ],
  gong: { wave: 'sine', from: 160, seconds: 1.4, volume: 0.45, decay: 2, noise: 0.08 },
  merge: [
    { wave: 'sine', from: 880, seconds: 0.07, volume: 0.3, decay: 2 },
    { wave: 'sine', from: 1175, seconds: 0.18, volume: 0.3, decay: 4 }
  ],
  divine: [
    { wave: 'triangle', from: 523, seconds: 0.1, volume: 0.35, decay: 1 },
    { wave: 'triangle', from: 784, seconds: 0.1, volume: 0.35, decay: 1 },
    { wave: 'triangle', from: 1047, seconds: 0.1, volume: 0.35, decay: 1 },
    { wave: 'triangle', from: 1568, seconds: 0.35, volume: 0.35, decay: 3 }
  ]
};

/** Give play the effects; return `sound(name)` and the music's controls. */
export function createSound(game, { on = true, music = true } = {}) {
  for (const [name, recipe] of Object.entries(EFFECTS)) game.sfx.define(name, recipe);
  game.sfx.muted = !on;
  let musicOn = music,
    mood = null;
  const recent = new Map();
  const sound = (name, { volume, pitch, every = 0.05 } = {}) => {
    if (game.sfx.muted) return;
    // The same effect at most once in `every` seconds, so a crowd of hits is a patter and not a roar.
    const now = game.time;
    if (now - (recent.get(name) ?? -1) < every) return;
    recent.set(name, now);
    game.sfx.play(name, { volume: volume ?? 1, pitch: pitch ?? 0.92 + Math.random() * 0.16 });
  };
  sound.setOn = (value) => (game.sfx.muted = !value);
  sound.setMusic = (value) => {
    musicOn = value;
    if (!value && mood) {
      game.music.stop(0.4);
      mood = null;
    }
  };
  /** Music for `next` ('battle' or 'calm'), louder in parts as `share` (0 to 1) rises. */
  sound.music = (next, share = 0.3) => {
    if (!musicOn) return;
    if (mood !== next) {
      game.music.play({ mood: next, seed: next === 'battle' ? 31 : 8, tempo: next === 'battle' ? 132 : 84 });
      game.music.volume = 0.32;
      mood = next;
    }
    game.music.intensity = Math.max(0.15, Math.min(1, share));
  };
  sound.stopMusic = () => {
    if (mood) game.music.stop(0.8);
    mood = null;
  };
  return sound;
}
