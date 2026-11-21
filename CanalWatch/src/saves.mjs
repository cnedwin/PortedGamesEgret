// 存档：设置（语言、音效、配乐、减弱动画）和两种难度各自最好的星数。由引擎的存档库读写：有版本号，读不懂的旧档
// 放到一边而不是丢掉，浏览器拒绝写入（隐私模式、空间满）也不报错。
// The save: the settings (language, sound, music, reduced motion) and the best stars on each difficulty. Kept by the
// engine's save store: versioned, an unreadable save set aside rather than lost, and a write the browser refuses (a
// private window, a full disk) never throws.
import { createSaveStore } from '@egret/engine/kit';

export const SAVE_KEY = 'canal-watch';

/** What someone who has never played has. `language` starts from the browser's language. */
export const freshSave = (language = 'zh') => ({
  best: { normal: 0, hard: 0 },
  plays: 0,
  wins: 0,
  settings: { language, sound: true, music: true, reducedMotion: false }
});

const isStars = (n) => Number.isInteger(n) && n >= 0 && n <= 3;

/**
 * Open the save in `storage`: the page's (`browserSaveStorage()`), or one in memory for tests. `onProblem` hears of a
 * save that could not be read (it starts again, the old text kept under `<key>.unread`) or written.
 */
export function openSave(storage, language = 'zh', onProblem = () => {}) {
  return createSaveStore({
    key: SAVE_KEY,
    version: 1,
    defaults: () => freshSave(language),
    storage,
    onProblem,
    validate: (data) =>
      Boolean(data) &&
      typeof data === 'object' &&
      typeof data.best === 'object' &&
      data.best !== null &&
      isStars(data.best.normal) &&
      isStars(data.best.hard) &&
      Number.isInteger(data.plays) &&
      Number.isInteger(data.wins) &&
      typeof data.settings === 'object' &&
      data.settings !== null &&
      (data.settings.language === 'zh' || data.settings.language === 'en')
  });
}

/** A game ended on `difficulty` with `stars` (0 when lost). Returns whether it is a new best. */
export function recordGame(data, difficulty, stars) {
  data.plays++;
  if (stars > 0) data.wins++;
  const best = stars > (data.best[difficulty] ?? 0);
  if (best) data.best[difficulty] = stars;
  return best;
}
