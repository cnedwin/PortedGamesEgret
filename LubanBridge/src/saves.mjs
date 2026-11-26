// 存档：设置、每关的印章和最省的造价、每关最后一张图纸、沙盒的图纸。由引擎的存档库读写：有版本号，读不懂的旧档
// 放到一边而不是丢掉，浏览器拒绝写入（隐私模式、空间满）也不报错。小游戏里存在微信的本地存储。
// The save: the settings, each level's seals and lowest cost, the last drawing of each level, and the sandbox's
// drawing. Kept by the engine's save store: versioned, an unreadable save set aside rather than lost, and a write the
// browser refuses (a private window, a full disk) never throws. In a mini game it lives in WeChat's local storage.
import { createSaveStore } from '@egret/engine/kit';
import { browserSaveStorage } from '@egret/engine/web/kit';
import { readDesign } from './sim/design.mjs';
import { LEVELS } from './sim/levels.mjs';

export const SAVE_KEY = 'luban-bridge';

/** What someone who has never played has. */
export const freshSave = (language = 'zh') => ({
  settings: { language, sound: true, music: true, reducedMotion: false },
  progress: {},
  designs: {},
  sandbox: null
});

const isBool = (v) => typeof v === 'boolean';

/** Whether data read back is a save of this version. */
export function validSave(data) {
  if (!data || typeof data !== 'object') return false;
  const s = data.settings;
  if (!s || (s.language !== 'zh' && s.language !== 'en') || !isBool(s.sound) || !isBool(s.music) || !isBool(s.reducedMotion)) return false;
  if (!data.progress || typeof data.progress !== 'object' || !data.designs || typeof data.designs !== 'object') return false;
  for (const p of Object.values(data.progress)) if (!p || typeof p !== 'object' || !isBool(p.passed) || !(p.best === null || Number.isFinite(p.best))) return false;
  return true;
}

/** Storage for the place the game runs: WeChat's in a mini game, the page's otherwise. */
export function hostStorage(host) {
  if (host && typeof host.getStorageSync === 'function')
    return {
      getItem: (key) => {
        const v = host.getStorageSync(key);
        return typeof v === 'string' && v !== '' ? v : null;
      },
      setItem: (key, text) => host.setStorageSync(key, text),
      removeItem: (key) => host.removeStorageSync(key)
    };
  return browserSaveStorage();
}

/** Open the save in `storage` (the page's, WeChat's, or one in memory for tests). */
export function openSave(storage, language = 'zh', onProblem = () => {}) {
  return createSaveStore({ key: SAVE_KEY, version: 1, defaults: () => freshSave(language), storage, onProblem, validate: validSave });
}

/** The record of a level, made when first needed. */
export const recordOf = (data, id) => (data.progress[id] ??= { passed: false, best: null, seals: { pass: false, thrift: false, intact: false } });

/**
 * A crossing ended: keep the seals won (a seal once won stays) and the lowest cost that crossed. Returns which seals
 * are new.
 */
export function recordCrossing(data, level, { won, cost, broken }) {
  const rec = recordOf(data, level.id);
  const seals = { pass: won, thrift: won && cost <= level.budget, intact: won && broken === 0 };
  const fresh = {};
  for (const k of Object.keys(seals)) {
    if (seals[k] && !rec.seals[k]) fresh[k] = true;
    rec.seals[k] ||= seals[k];
  }
  if (won) {
    rec.passed = true;
    if (rec.best === null || cost < rec.best) rec.best = cost;
  }
  return fresh;
}

/** Whether a level may be played: the first, and each after a passed one. `all` opens every level (for tests). */
export function unlocked(data, id, all = false) {
  if (all || id === 'sandbox') return true;
  const i = LEVELS.findIndex((l) => l.id === id);
  return i <= 0 || !!data.progress[LEVELS[i - 1].id]?.passed;
}

/** The level to go on with: the first not passed, or the last. */
export function nextLevel(data) {
  return (LEVELS.find((l) => !data.progress[l.id]?.passed) ?? LEVELS[LEVELS.length - 1]).id;
}

/** The drawing kept for a level, read back safely. */
export const designOf = (data, id) => readDesign(id === 'sandbox' ? data.sandbox : data.designs[id]);

/** Keep a level's drawing. */
export function keepDesign(data, id, design) {
  const plain = { members: design.members.map((m) => [...m]), pontoons: design.pontoons.map((p) => [...p]), piers: [...design.piers] };
  if (id === 'sandbox') data.sandbox = plain;
  else data.designs[id] = plain;
}

/** Seals won over all levels, and how many there are. */
export function sealCount(data) {
  let got = 0;
  for (const l of LEVELS) {
    const s = data.progress[l.id]?.seals;
    if (s) got += (s.pass ? 1 : 0) + (s.thrift ? 1 : 0) + (s.intact ? 1 : 0);
  }
  return { got, of: LEVELS.length * 3 };
}
