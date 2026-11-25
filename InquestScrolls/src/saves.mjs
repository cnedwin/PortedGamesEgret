// 存档：设置，以及每一案的进度（看过的证物、收的词、填的空、盖的印、笔录、判词）。由引擎的存档库读写：有版本号，
// 读不懂的旧档放到一边而不是丢掉，浏览器拒绝写入（隐私模式、空间满）也不报错。
// The save: the settings and each case's progress (evidence seen, words collected, blanks filled, pages sealed,
// notes, the verdict). Kept by the engine's save store: versioned, an unreadable save set aside rather than lost, and
// a write the browser refuses (a private window, a full disk) never throws.
import { createSaveStore } from '@egret/engine/kit';
import { freshProgress } from './sim/rules.mjs';
import { CASES } from './sim/cases/index.mjs';

export const SAVE_KEY = 'inquest-scrolls';

export const freshSettings = (language = 'zh') => ({ language, sound: true, music: true, textSize: 1, reducedMotion: false });

/** What someone who has never played has. */
export const freshSave = (language = 'zh') => ({ settings: freshSettings(language), progress: freshProgress() });

const isList = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** Whether one case's kept progress is whole enough to resume. */
export function caseIsWhole(st) {
  return (
    !!st &&
    typeof st === 'object' &&
    isList(st.seen) &&
    isList(st.found) &&
    isList(st.sealed) &&
    typeof st.place === 'object' &&
    st.place !== null &&
    typeof st.notes === 'string' &&
    st.notes.length <= 2000 &&
    typeof st.solved === 'boolean'
  );
}

export function saveIsWhole(data) {
  const ids = new Set(CASES.map((c) => c.id));
  return (
    !!data &&
    typeof data === 'object' &&
    typeof data.settings === 'object' &&
    data.settings !== null &&
    (data.settings.language === 'zh' || data.settings.language === 'en') &&
    typeof data.progress === 'object' &&
    data.progress !== null &&
    typeof data.progress.cases === 'object' &&
    data.progress.cases !== null &&
    Object.entries(data.progress.cases).every(([id, st]) => ids.has(id) && caseIsWhole(st))
  );
}

/** Open the save in `storage`; `onProblem` hears of a save that could not be read or written. */
export function openSave(storage, language = 'zh', onProblem = () => {}) {
  return createSaveStore({ key: SAVE_KEY, version: 1, defaults: () => freshSave(language), storage, onProblem, validate: saveIsWhole });
}

/** Settings with anything missing filled from the defaults. */
export function settingsOf(data) {
  return { ...freshSettings(data?.settings?.language), ...(data?.settings ?? {}) };
}

/** A storage that never throws: the page's own, or one that lasts only this visit when the page has none. */
export function pageStorage() {
  const memory = new Map();
  const fallback = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => void memory.set(k, String(v)), removeItem: (k) => void memory.delete(k) };
  try {
    const s = globalThis.localStorage;
    const probe = '__inquest_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return fallback;
  }
}
