// 声音：引擎 play 在代码里合成的音效，按塔和事件起名；配乐是 play 写的「紧张」曲，越往后的波，声部越多。
// 一个文件也不用加载。浏览器要求第一次按键或点击之后才出声。
// Sound: effects the engine's play makes in code, named for the towers and the events; the music is play's 'tense'
// piece, with more of its parts as the waves go on. No file is loaded. Browsers sound nothing before the first key or
// click.

/** The effects of the game, as play's tone recipes. */
export const EFFECTS = {
  crossbow: { wave: 'triangle', from: 1400, to: 500, seconds: 0.07, volume: 0.22, decay: 8, noise: 0.3 },
  trebuchet: { wave: 'saw', from: 180, to: 90, seconds: 0.18, volume: 0.25, decay: 4, noise: 0.4 },
  fire: { wave: 'noise', from: 2200, to: 800, seconds: 0.16, volume: 0.18, decay: 5 },
  crash: { wave: 'noise', from: 900, to: 80, seconds: 0.3, volume: 0.35, decay: 5 },
  down: { wave: 'square', from: 300, to: 140, seconds: 0.09, volume: 0.18, decay: 6, noise: 0.2 },
  sink: [
    { wave: 'noise', from: 600, to: 120, seconds: 0.4, volume: 0.4, decay: 3 },
    { wave: 'sine', from: 160, to: 60, seconds: 0.5, volume: 0.35, decay: 3 }
  ],
  leak: [
    { wave: 'square', from: 220, seconds: 0.12, volume: 0.3, decay: 1 },
    { wave: 'square', from: 165, seconds: 0.22, volume: 0.3, decay: 3 }
  ],
  gong: { wave: 'sine', from: 196, seconds: 1.2, volume: 0.4, decay: 2.5, noise: 0.05 },
  gate: { wave: 'saw', from: 90, to: 60, seconds: 0.4, volume: 0.25, decay: 2, noise: 0.5 },
  build: [
    { wave: 'triangle', from: 392, seconds: 0.06, volume: 0.35, decay: 2 },
    { wave: 'triangle', from: 587, seconds: 0.14, volume: 0.35, decay: 4 }
  ],
  wave: [
    { wave: 'sine', from: 147, seconds: 0.5, volume: 0.45, decay: 2 },
    { wave: 'sine', from: 147, seconds: 0.9, volume: 0.4, decay: 2.5 }
  ]
};

/** Give play the effects, and return `sound(name, detail)` that the view and the interface call. */
export function createSound(game, { on = true, music = true } = {}) {
  for (const [name, recipe] of Object.entries(EFFECTS)) game.sfx.define(name, recipe);
  game.sfx.muted = !on;
  let musicOn = music,
    playing = false;
  const sound = (name, detail) => {
    if (game.sfx.muted) return;
    const effect = name === 'shot' ? detail : name;
    if (effect === 'gong' || !EFFECTS[effect] && !game.sfx.names.includes(effect)) return;
    game.sfx.play(effect, name === 'shot' ? { volume: 0.7, pitch: 0.9 + Math.random() * 0.2 } : undefined);
  };
  sound.setOn = (value) => (game.sfx.muted = !value);
  sound.setMusic = (value) => {
    musicOn = value;
    if (!value && playing) {
      game.music.stop(0.4);
      playing = false;
    }
  };
  /** Music for a wave in play: started once, louder in parts as `share` (0 to 1) rises. */
  sound.music = (share) => {
    if (!musicOn) return;
    if (!playing) {
      game.music.play({ mood: 'tense', seed: 7, tempo: 96 });
      game.music.volume = 0.35;
      playing = true;
    }
    game.music.intensity = Math.max(0.15, Math.min(1, share));
  };
  sound.stopMusic = () => {
    if (playing) game.music.stop(1);
    playing = false;
  };
  return sound;
}
