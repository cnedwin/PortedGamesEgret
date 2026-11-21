// 声音：牌落桌的「喀」、摸牌、吃碰、槓、胡、补花和按钮声，都用 play 的音效合成器定义，没有音频文件；配乐用 play
// 的配乐，平时是从容的曲子，胡牌时换成欢庆的一段。
// The sound: the clack of a tile on the table, a draw, a call, a kong, a win, a flower and a button, each defined on
// play's effect synthesiser, with no sound files; the music is play's own, calm in play and triumphant after a win.

const EFFECTS = {
  clack: [
    { wave: 'noise', from: 5200, to: 2400, seconds: 0.035, volume: 0.55, decay: 9 },
    { wave: 'triangle', from: 1450, to: 1180, seconds: 0.05, volume: 0.32, decay: 7 }
  ],
  draw: { wave: 'noise', from: 3600, to: 2200, seconds: 0.03, volume: 0.25, decay: 9 },
  select: { wave: 'triangle', from: 980, to: 1240, seconds: 0.045, volume: 0.22, decay: 6 },
  call: [
    { wave: 'noise', from: 4800, to: 1800, seconds: 0.04, volume: 0.5, decay: 8 },
    { wave: 'square', from: 660, seconds: 0.07, volume: 0.22, decay: 3 },
    { wave: 'square', from: 880, seconds: 0.12, volume: 0.22, decay: 4 }
  ],
  kong: [
    { wave: 'noise', from: 4800, to: 1600, seconds: 0.05, volume: 0.55, decay: 7 },
    { wave: 'triangle', from: 392, seconds: 0.09, volume: 0.35, decay: 2 },
    { wave: 'triangle', from: 523, seconds: 0.09, volume: 0.35, decay: 2 },
    { wave: 'triangle', from: 659, seconds: 0.18, volume: 0.35, decay: 4 }
  ],
  flower: [
    { wave: 'sine', from: 1046, seconds: 0.06, volume: 0.3, decay: 2 },
    { wave: 'sine', from: 1568, seconds: 0.16, volume: 0.3, decay: 5 }
  ],
  win: [
    { wave: 'triangle', from: 523, seconds: 0.09, volume: 0.4, decay: 1 },
    { wave: 'triangle', from: 659, seconds: 0.09, volume: 0.4, decay: 1 },
    { wave: 'triangle', from: 784, seconds: 0.09, volume: 0.4, decay: 1 },
    { wave: 'triangle', from: 1047, seconds: 0.4, volume: 0.42, decay: 3 }
  ],
  lose: [
    { wave: 'triangle', from: 392, seconds: 0.14, volume: 0.32, decay: 1.5 },
    { wave: 'triangle', from: 330, seconds: 0.3, volume: 0.32, decay: 3 }
  ]
};

/** The game's sound over play's sfx and music. */
export function createSound(game, { sound = true, music = true, seed = 1 } = {}) {
  for (const [name, recipe] of Object.entries(EFFECTS)) game.sfx.define(name, recipe);
  game.sfx.muted = !sound;
  let musicOn = music,
    mood = null;
  const playMusic = (next) => {
    mood = next;
    if (!musicOn) return;
    try {
      game.music.play({ mood: next, seed, tempo: next === 'triumph' ? 112 : 84 }).catch(() => {});
      game.music.volume = 0.35;
    } catch {
      // Music needs the page to have been touched first; it starts on the next change.
    }
  };
  return {
    play(name) {
      try {
        game.sfx.play(name);
      } catch {
        // A sound before the page was touched is simply not heard.
      }
    },
    setSound(on) {
      game.sfx.muted = !on;
    },
    setMusic(on) {
      musicOn = on;
      if (!on) game.music.stop?.();
      else if (mood) playMusic(mood);
    },
    music: playMusic
  };
}
