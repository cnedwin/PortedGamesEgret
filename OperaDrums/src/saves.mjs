// 存档：设置（语言、声音、伴奏音量、流速、延迟校准、减弱动画）和每首曲子每个难度最好的一次。由引擎的存档库读写：
// 有版本号，读不懂的旧档放到一边而不是丢掉，浏览器拒绝写入（隐私模式、空间满）也不报错。
// The save: the settings (language, sound, backing volume, note speed, delay, reduced motion) and the best run of each
// song on each difficulty. Kept by the engine's save store: versioned, an unreadable save set aside rather than lost,
// and a write the browser refuses never throws.
import { createSaveStore } from '@egret/engine/kit';
import { RANKS, betterRank } from './sim/judge.mjs';

export const SAVE_KEY = 'opera-drums';
export const SPEEDS = [1, 1.5, 2, 2.5, 3];

/** What someone who has never played has. */
export const freshSave = (language = 'zh') => ({
  best: {},
  plays: 0,
  settings: { language, sound: true, music: 0.8, speed: 1.5, offset: 0, reducedMotion: false }
});

const isBest = (entry) => entry && typeof entry === 'object' && RANKS.includes(entry.rank) && Number.isFinite(entry.score) && Number.isInteger(entry.combo);

/** Open the save in `storage`. `onProblem` hears of a save that could not be read or written. */
export function openSave(storage, language = 'zh', onProblem = () => {}) {
  return createSaveStore({
    key: SAVE_KEY,
    version: 1,
    defaults: () => freshSave(language),
    storage,
    onProblem,
    validate: (data) => {
      if (!data || typeof data !== 'object' || !data.best || typeof data.best !== 'object' || !Number.isInteger(data.plays)) return false;
      for (const song of Object.values(data.best)) {
        if (!song || typeof song !== 'object') return false;
        for (const entry of Object.values(song)) if (!isBest(entry)) return false;
      }
      const s = data.settings;
      return (
        Boolean(s) &&
        (s.language === 'zh' || s.language === 'en') &&
        typeof s.sound === 'boolean' &&
        Number.isFinite(s.music) &&
        s.music >= 0 &&
        s.music <= 1 &&
        SPEEDS.includes(s.speed) &&
        Number.isFinite(s.offset) &&
        Math.abs(s.offset) <= 300
      );
    }
  });
}

/**
 * A run of `song` on `difficulty` ended with `result`. The best keeps the better rank, and the higher score within
 * the same rank. Returns whether it is a new best.
 */
export function recordRun(data, song, difficulty, result) {
  data.plays++;
  const kept = data.best[song]?.[difficulty];
  const better = !kept || betterRank(result.rank, kept.rank) || (result.rank === kept.rank && result.score > kept.score);
  if (better) {
    data.best[song] ??= {};
    data.best[song][difficulty] = { rank: result.rank, score: result.score, combo: result.maxCombo };
  }
  return better;
}
