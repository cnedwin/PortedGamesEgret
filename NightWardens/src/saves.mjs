// 存档：设置（语言、声音、减弱动画）、开到了第几夜、每一夜的最好星数和最快用时。由引擎的存档库读写：有版本号，
// 读不懂的旧档放到一边而不是丢掉，浏览器拒绝写入（隐私模式、空间满）也不报错。
// The save: the settings (language, sound, reduced motion), how many nights are open, and each night's best stars
// and fastest time. Kept by the engine's save store: versioned, an unreadable save set aside rather than lost, and a
// write the browser refuses (a private window, a full disk) never throws.
import { createSaveStore } from '@egret/engine/kit';

export const SAVE_KEY = 'night-wardens';
export const NIGHT_COUNT = 3;

/** What someone who has never played has. `language` starts from the page's language. */
export const freshSave = (language = 'zh') => ({
  open: 1,
  nights: {},
  plays: 0,
  settings: { language, sound: true, reducedMotion: false }
});

const validNight = (n) => n && typeof n === 'object' && Number.isInteger(n.stars) && n.stars >= 0 && n.stars <= 3 && (n.best === null || typeof n.best === 'number');

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
      Number.isInteger(data.open) &&
      data.open >= 1 &&
      data.open <= NIGHT_COUNT &&
      typeof data.nights === 'object' &&
      data.nights !== null &&
      Object.values(data.nights).every(validNight) &&
      Number.isInteger(data.plays) &&
      typeof data.settings === 'object' &&
      data.settings !== null &&
      (data.settings.language === 'zh' || data.settings.language === 'en')
  });
}

/**
 * A night ended: count the play, keep the better stars and, for a held night, the faster time, and open the next
 * night. Returns whether the time is a new best and whether a new night opened.
 */
export function recordNight(data, night, { won, stars, seconds }) {
  data.plays++;
  if (!won) return { best: false, opened: false };
  const kept = (data.nights[night] ??= { stars: 0, best: null });
  kept.stars = Math.max(kept.stars, stars);
  const best = kept.best === null || seconds < kept.best;
  if (best) kept.best = Math.round(seconds);
  const opened = night < NIGHT_COUNT && data.open <= night;
  if (opened) data.open = night + 1;
  return { best, opened };
}
