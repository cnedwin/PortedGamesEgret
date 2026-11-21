// 声音：收税的铜钱声、动工的木槌、完工的风铃、访贤的磬、擂鼓、胜负，都用 play 的音效合成器定义，没有音频文件；
// 配乐用 play 的配乐，从容的曲子。
// Sound: coins at the yamen, a mallet when work starts, wind chimes when it ends, a chime stone for a worthy, drums,
// victory and loss — all defined on play's synthesiser, with no sound files; the music is play's own, unhurried.
const EFFECTS = {
  coins: [
    { wave: 'triangle', from: 1568, seconds: 0.05, volume: 0.25, decay: 6 },
    { wave: 'triangle', from: 2093, seconds: 0.06, volume: 0.22, decay: 6 },
    { wave: 'triangle', from: 1760, seconds: 0.08, volume: 0.2, decay: 6 }
  ],
  mallet: [
    { wave: 'noise', from: 1800, to: 600, seconds: 0.05, volume: 0.35, decay: 8 },
    { wave: 'triangle', from: 220, seconds: 0.08, volume: 0.3, decay: 6 }
  ],
  chime: [
    { wave: 'sine', from: 1318, seconds: 0.12, volume: 0.22, decay: 3 },
    { wave: 'sine', from: 1976, seconds: 0.3, volume: 0.18, decay: 4 }
  ],
  tap: { wave: 'triangle', from: 880, to: 990, seconds: 0.04, volume: 0.15, decay: 6 },
  stone: [
    { wave: 'sine', from: 523, seconds: 0.4, volume: 0.3, decay: 2 },
    { wave: 'sine', from: 784, seconds: 0.6, volume: 0.22, decay: 2 }
  ],
  drum: [
    { wave: 'sine', from: 110, to: 60, seconds: 0.18, volume: 0.6, decay: 4 },
    { wave: 'noise', from: 400, to: 200, seconds: 0.05, volume: 0.3, decay: 6 }
  ],
  win: [
    { wave: 'triangle', from: 523, seconds: 0.1, volume: 0.3, decay: 1 },
    { wave: 'triangle', from: 659, seconds: 0.1, volume: 0.3, decay: 1 },
    { wave: 'triangle', from: 784, seconds: 0.3, volume: 0.3, decay: 3 }
  ],
  lose: [
    { wave: 'triangle', from: 392, seconds: 0.16, volume: 0.28, decay: 1.5 },
    { wave: 'triangle', from: 311, seconds: 0.36, volume: 0.28, decay: 3 }
  ]
};

export function createSound(game, { sound = true, music = true, seed = 1 } = {}) {
  for (const [name, recipe] of Object.entries(EFFECTS)) game.sfx.define(name, recipe);
  game.sfx.muted = !sound;
  let musicOn = music,
    started = false;
  const start = () => {
    if (!musicOn) return;
    started = true;
    try {
      game.music.play({ mood: 'calm', seed, tempo: 72 }).catch(() => {});
      game.music.volume = 0.3;
    } catch {
      // Music waits for the page to be touched.
    }
  };
  return {
    play(name) {
      try {
        game.sfx.play(name);
      } catch {
        // Not heard before the page is touched.
      }
    },
    setSound(on) {
      game.sfx.muted = !on;
    },
    setMusic(on) {
      musicOn = on;
      if (!on) game.music.stop?.();
      else start();
    },
    start: () => started || start()
  };
}
