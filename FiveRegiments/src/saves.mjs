// 存档：设置和每营最好的评等。由引擎的存档库读写：有版本号，读不懂的旧档另存一份再重新开始，浏览器拒绝写入（隐私
// 模式、空间满）也不报错，只把问题告诉页面。
// The save: the settings and the best mark of each regiment. Kept by the engine's save store: versioned, an unreadable
// save set aside before starting again, and a write the browser refuses (a private window, a full disk) never throws;
// the page is told of the problem.
import { createSaveStore } from '@egret/engine/kit';
import { ORDER } from './sim/regiments.mjs';

export const SAVE_KEY = 'five-regiments';
/** The marks of a whole road, best first. */
export const MARKS = ['jia', 'yi', 'bing', 'ding'];
export const SETTINGS = Object.freeze({ quality: 'auto', control: 'directional', assist: true, blood: true, sound: true, invertY: false, sensitivity: 1, language: null });

/** What someone who has never played has. */
export const freshSave = () => ({ settings: { ...SETTINGS }, marks: {}, plays: 0 });

const validSettings = (s) =>
  Boolean(s) &&
  typeof s === 'object' &&
  (s.language == null || s.language === 'zh' || s.language === 'en') &&
  (s.sensitivity === undefined || (typeof s.sensitivity === 'number' && s.sensitivity > 0 && s.sensitivity < 5)) &&
  ['assist', 'blood', 'sound', 'invertY'].every((k) => s[k] === undefined || typeof s[k] === 'boolean');

/** Whether `data` is a save this build can read. */
export const validSave = (data) =>
  Boolean(data) &&
  typeof data === 'object' &&
  validSettings(data.settings) &&
  Boolean(data.marks) &&
  typeof data.marks === 'object' &&
  Object.entries(data.marks).every(([regiment, mark]) => ORDER.includes(regiment) && MARKS.includes(mark)) &&
  Number.isInteger(data.plays) &&
  data.plays >= 0;

/**
 * Open the save in `storage`: the page's (`browserSaveStorage()`), or one in memory for tests. `onProblem` hears of a
 * save that could not be read (it starts again, the old text kept aside) or written.
 */
export function openSave(storage, onProblem = () => {}) {
  return createSaveStore({ key: SAVE_KEY, version: 1, storage, onProblem, defaults: freshSave, validate: validSave });
}

/** The settings to play with: the defaults, with whatever the save holds over them. */
export const settingsOf = (data) => ({ ...SETTINGS, ...data.settings });

/** A whole road finished with `mark` by `regiment`: counted, and kept when it beats the best. Returns whether it did. */
export function recordRun(data, regiment, mark) {
  if (!ORDER.includes(regiment) || !MARKS.includes(mark)) throw Error(`No mark ${mark} for ${regiment}`);
  data.plays++;
  const was = data.marks[regiment];
  if (was && MARKS.indexOf(was) <= MARKS.indexOf(mark)) return false;
  data.marks[regiment] = mark;
  return true;
}
