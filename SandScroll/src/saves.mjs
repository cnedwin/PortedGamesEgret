// 存档：设置（语言、声音、减弱动画）、最高分、玩过几局、每一卷画成没有。由引擎的存档库读写：有版本号，读不懂的
// 旧档放到一边而不是丢掉，浏览器拒绝写入（隐私模式、空间满）也不报错。
// The save: the settings (language, sound, reduced motion), the best score, the rounds played and which scrolls are
// finished. Kept by the engine's save store: versioned, an unreadable save set aside rather than lost, and a write the
// browser refuses (a private window, a full disk) never throws.
import { createSaveStore } from '@egret/engine/kit';

export const SAVE_KEY = 'sand-scroll';

/** What someone who has never played has. `language` starts from the page's language. */
export const freshSave = (language = 'zh') => ({ best: 0, bestEndless: 0, plays: 0, finished: [], unpainted: [], settings: { language, sound: true, reducedMotion: false } });

/** A save from before a field existed gets the field's fresh value, so old saves keep working. */
export function fillSave(data) {
  data.bestEndless ??= 0;
  data.unpainted ??= [];
  return data;
}

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
      Number.isInteger(data.best) &&
      data.best >= 0 &&
      Number.isInteger(data.plays) &&
      Array.isArray(data.finished) &&
      data.finished.every((id) => typeof id === 'string') &&
      (data.bestEndless === undefined || (Number.isInteger(data.bestEndless) && data.bestEndless >= 0)) &&
      (data.unpainted === undefined || (Array.isArray(data.unpainted) && data.unpainted.every((id) => typeof id === 'string'))) &&
      typeof data.settings === 'object' &&
      data.settings !== null &&
      (data.settings.language === 'zh' || data.settings.language === 'en')
  });
}

/**
 * A round ended with `score`, on scroll `scroll`, finished or not; on the endless tray its best is kept apart.
 * Returns whether the score is a new best.
 */
export function recordRound(data, { score, scroll, won, endless = false }) {
  fillSave(data);
  data.plays++;
  if (won && !data.finished.includes(scroll)) data.finished.push(scroll);
  const key = endless ? 'bestEndless' : 'best',
    best = score > data[key];
  if (best) data[key] = score;
  return best;
}

/** A painting of the unpaint mode collected to the last grain. */
export function recordUnpaint(data, id) {
  fillSave(data);
  data.plays++;
  if (!data.unpainted.includes(id)) data.unpainted.push(id);
}
