// 存档：设置（语言、声音、减弱动画）和最好成绩。由引擎的存档库读写：有版本号，读不懂的旧档放到一边而不是丢掉，
// 浏览器拒绝写入（隐私模式、空间满）也不报错。存档的检查由 kit 的 shapeOf 按新档的形状给出：旧版本存下的档缺了后来
// 加的字段，会先补上默认值，不会被当成坏档。
// The save: the settings (language, sound, reduced motion) and the best time. Kept by the engine's save store:
// versioned, an unreadable save set aside rather than lost, and a write the browser refuses (a private window, a full
// disk) never throws. Its check is shapeOf of the kit, read from the shape of a fresh save: a save from an older build,
// without a field added since, gets that field's default rather than being taken for a broken one.
import { createSaveStore, shapeOf } from '@egret/engine/kit';

export const SAVE_KEY = 'egret-game-template';

/** What someone who has never played has. `language` starts from the page's language. */
export const freshSave = (language = 'zh') => ({ best: null, plays: 0, settings: { language, sound: true, reducedMotion: false } });

/** What a save must be: the shape of a fresh one, a best time that is none or a number of seconds, a known language. */
export const saveShape = shapeOf(freshSave, {
  best: (value) => value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0),
  plays: { int: true, min: 0 },
  'settings.language': ['zh', 'en']
});

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
    validate: saveShape.validate
  });
}

/** A round finished in `seconds`: keep the faster time. Returns whether it is a new best. */
export function recordRound(data, seconds) {
  data.plays++;
  const best = data.best === null || seconds < data.best;
  if (best) data.best = Math.round(seconds * 10) / 10;
  return best;
}
