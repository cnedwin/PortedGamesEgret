// 存档：设置（语言、声音、配乐、减弱动画）、解锁的哪吒、每种哪吒每档难度最远到过第几波、守住的局数。由引擎的存档库
// 读写：有版本号，读不懂的旧档放到一边而不是丢掉，浏览器拒绝写入（隐私模式、空间满）也不报错。
// The save: the settings (language, sound, music, reduced motion), the forms of Nezha unlocked, the furthest wave of
// each form on each danger, and the games won. Kept by the engine's save store: versioned, an unreadable save set
// aside rather than lost, and a write the browser refuses never throws.
import { createSaveStore } from '@egret/engine/kit';
import { HERO_KINDS, WAVES } from './sim/data.mjs';

export const SAVE_KEY = 'nezha-sea';

export const freshSave = (language = 'zh') => ({
  unlocked: ['boy'],
  best: {},
  plays: 0,
  wins: 0,
  settings: { language, sound: true, music: true, reducedMotion: false }
});

const isWave = (n) => Number.isInteger(n) && n >= 0 && n <= WAVES + 1;

/** Open the save in `storage`. `onProblem` hears of a save that could not be read or written. */
export function openSave(storage, language = 'zh', onProblem = () => {}) {
  return createSaveStore({
    key: SAVE_KEY,
    version: 1,
    defaults: () => freshSave(language),
    storage,
    onProblem,
    validate: (data) => {
      if (!data || typeof data !== 'object' || !Array.isArray(data.unlocked) || !data.unlocked.every((hero) => HERO_KINDS.includes(hero))) return false;
      if (!data.best || typeof data.best !== 'object' || !Number.isInteger(data.plays) || !Number.isInteger(data.wins)) return false;
      for (const [hero, dangers] of Object.entries(data.best)) {
        if (!HERO_KINDS.includes(hero) || !dangers || typeof dangers !== 'object') return false;
        for (const wave of Object.values(dangers)) if (!isWave(wave)) return false;
      }
      const s = data.settings;
      return Boolean(s) && (s.language === 'zh' || s.language === 'en') && typeof s.sound === 'boolean' && typeof s.music === 'boolean';
    }
  });
}

/**
 * A game with `hero` on `danger` ended at `wave` (21 for a game won). Keeps the furthest, counts the game and unlocks
 * what it earned. Returns `{ best, unlocked }`: whether it is the furthest yet, and the forms it unlocked.
 */
export function recordGame(data, hero, danger, wave, won) {
  data.plays++;
  if (won) data.wins++;
  const reached = won ? WAVES + 1 : wave;
  data.best[hero] ??= {};
  const best = reached > (data.best[hero][danger] ?? 0);
  if (best) data.best[hero][danger] = reached;
  const unlocked = [];
  const open = (form) => {
    if (!data.unlocked.includes(form)) {
      data.unlocked.push(form);
      unlocked.push(form);
    }
  };
  if (wave >= 11 || won) open('lotus');
  if (won) open('sixArms');
  return { best, unlocked };
}
