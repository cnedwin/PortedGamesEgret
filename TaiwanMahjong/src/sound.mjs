// The short tile sounds use Egret's existing Play audio mixer. The authored
// score has its own media transport so a new renderer can keep a running song.
import { createTableVoice } from './voice.mjs';

const tone = (from, to, seconds, volume, decay, noise = 0) => ({ wave: 'triangle', from, to, seconds, volume, decay, noise });
const brush = (from, to, seconds, volume, decay) => ({ wave: 'noise', from, to, seconds, volume, decay });
const ring = (from, seconds, volume, decay) => ({ wave: 'sine', from, seconds, volume, decay });
const EFFECTS = {
  ui: [tone(660, 485, .027, .22, 5, .13), ring(659.25, .052, .13, 4)],
  select: [tone(1240, 950, .023, .27, 4, .18), ring(592, .028, .11, 5)],
  deal: [brush(2600, 1380, .051, .20, 2), tone(680, 470, .044, .22, 5, .20),
    brush(2100, 860, .060, .21, 4), tone(780, 460, .055, .30, 5, .21)],
  draw: [brush(3150, 1410, .050, .26, 4), tone(950, 710, .033, .21, 4, .29)],
  discard: [tone(1670, 1120, .020, .56, 5, .25), tone(930, 510, .064, .39, 4, .16),
    brush(1570, 610, .028, .13, 5)],
  chow: [brush(3980, 1740, .042, .28, 3), tone(1260, 890, .030, .41, 4, .19),
    ring(554, .069, .29, 3), ring(740, .134, .29, 5)],
  pong: [tone(1320, 930, .055, .50, 5, .23), tone(1130, 725, .062, .48, 5, .21),
    tone(466, 432, .136, .31, 4)],
  kong: [tone(1120, 745, .044, .41, 4, .26), tone(995, 668, .055, .43, 4, .23),
    tone(885, 595, .057, .45, 5, .22), tone(679, 352, .100, .48, 5, .26),
    ring(293.66, .166, .33, 5)],
  flower: [tone(1840, 1380, .028, .25, 4, .16), ring(988, .065, .25, 3), ring(1480, .150, .24, 4)],
  win: [tone(1060, 755, .045, .44, 3, .20), ring(440, .085, .45, 2),
    ring(554.37, .085, .43, 2), ring(659.25, .114, .45, 2), ring(740, .205, .47, 4)],
  selfDraw: [tone(1390, 950, .037, .43, 4, .18), ring(587.33, .078, .44, 2),
    ring(739.99, .084, .43, 2), ring(880, .098, .44, 2), ring(1174.66, .23, .43, 4)],
  opponentWin: [tone(1190, 870, .042, .36, 4, .17), ring(493.88, .098, .26, 2), ring(587.33, .173, .30, 4)],
  dealIn: [tone(920, 570, .055, .35, 4, .16), ring(369.99, .108, .34, 2), ring(293.66, .192, .30, 4)],
  drawn: [brush(2040, 1170, .055, .18, 3), ring(440, .097, .26, 3), ring(329.63, .189, .24, 4)]
};
const TABLE_PAN = [0, .38, 0, -.38];
const SCORE_MODES = { title: .85, table: .72, result: .82 };

export function createSound({ sound = true, music = true, voice = true, onSpeakerChanged } = {}) {
  const score = new Audio();
  score.preload = 'auto';
  score.loop = true;
  score.volume = .5;
  // Media volume is not writable on some mobile browsers. The files already
  // have appropriate average levels, and playback still follows phase changes.
  const canFade = score.volume === .5;
  let sfx, variant = 0;
  let soundOn = sound, musicOn = music, paused = false, reacted = false;
  let wanted, current, fade = 0, speaking = false;
  const scoreLevel = () => SCORE_MODES[current] * (speaking ? .47 : 1);
  const voices = createTableVoice(voice, (next) => {
    if (next === speaking) return;
    speaking = next;
    if (!current || current !== wanted || score.paused) return;
    cancelAnimationFrame(fade);
    easeVolume(scoreLevel(), speaking ? 85 : 260);
  }, onSpeakerChanged);

  function start() {
    if (score.paused) score.play()?.catch(() => {});
  }

  function load(phase) {
    current = phase;
    score.src = new URL(`../assets/audio/${phase}.mp3`, import.meta.url).href;
  }

  function easeVolume(to, duration, finish) {
    if (!canFade || to === score.volume) {
      finish?.();
      return;
    }
    const from = score.volume, began = performance.now();
    const step = (now) => {
      const share = Math.max(0, Math.min(1, (now - began) / duration));
      score.volume = from + (to - from) * share;
      if (share < 1) fade = requestAnimationFrame(step);
      else {
        fade = 0;
        finish?.();
      }
    };
    fade = requestAnimationFrame(step);
  }

  function sync() {
    cancelAnimationFrame(fade);
    fade = 0;
    if (!musicOn || paused || document.hidden) {
      score.pause();
      return;
    }
    if (!wanted) return;
    if (!reacted) {
      if (current !== wanted) load(wanted);
      return;
    }
    if (current === wanted) {
      start();
      easeVolume(scoreLevel(), 180);
      return;
    }
    const switchPiece = () => {
      load(wanted);
      if (canFade) score.volume = 0;
      start();
      easeVolume(scoreLevel(), 270);
    };
    if (score.paused) switchPiece();
    else easeVolume(0, 135, switchPiece);
  }

  function gesture(event) {
    if (!event.isTrusted || (reacted && !score.paused)) return;
    reacted = true;
    sync();
  }
  // A touch's activation can arrive on pointerup. Keyboard-only sessions get
  // the same score without needing a separate click on the board.
  for (const event of ['pointerdown', 'pointerup', 'click', 'keydown']) {
    window.addEventListener(event, gesture, { capture: true, passive: true });
  }
  document.addEventListener('visibilitychange', sync);

  return {
    attach(game) {
      sfx = game.sfx;
      for (const [name, recipe] of Object.entries(EFFECTS)) sfx.define(name, recipe);
      sfx.muted = !soundOn;
    },
    play(name, seat) {
      if (!soundOn || paused || document.hidden) return;
      const normalVariation = name === 'draw' || name === 'discard';
      const pitch = normalVariation ? [1, .979, 1.021][variant++ % 3] : 1;
      const volume = seat !== undefined && seat !== 0 ? .78 : 1;
      sfx?.play(name, { pitch, pan: TABLE_PAN[seat] ?? 0, volume });
    },
    setSound(on) {
      soundOn = on;
      if (sfx) sfx.muted = !on;
    },
    setMusic(on) {
      musicOn = on;
      sync();
    },
    setVoice: voices.setOn,
    say: voices.say,
    music(phase) {
      if (!Object.hasOwn(SCORE_MODES, phase) || wanted === phase) return;
      wanted = phase;
      if (phase === 'title') {
        voices.stop();
        voices.prepare();
      }
      sync();
    },
    pause(on) {
      paused = on;
      voices.pause(on);
      sync();
    }
  };
}
