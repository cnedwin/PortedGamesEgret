// 存档：设置（语言、音效、配乐、减弱动画）、这一任的整座县城（规则的全部状态），和历任的记录。由引擎的存档库读写：
// 有版本号，读不懂的旧档放到一边而不是丢掉，浏览器拒绝写入（隐私模式、空间满）也不报错。
// The save: the settings (language, sound, music, reduced motion), this term's whole county (every bit of the rules'
// state), and the record of past terms. Kept by the engine's save store: versioned, an unreadable save set aside
// rather than lost, and a write the browser refuses never throws.
import { createSaveStore } from '@egret/engine/kit';
import { DISTRICTS, NODE_SLOTS, PLOTS_PER_DISTRICT } from './sim/world.mjs';

export const SAVE_KEY = 'peach-creek';

export const freshSave = (language = 'zh') => ({
  county: null,
  record: { terms: 0, fastest: null },
  settings: { language, sound: true, music: true, reducedMotion: false }
});

/** Whether a county from a save has the shape the rules expect. */
export function countyLooksRight(c) {
  return (
    Boolean(c) &&
    c.version === 1 &&
    Number.isFinite(c.time) &&
    Number.isInteger(c.rank) &&
    c.rank >= 0 &&
    Array.isArray(c.plots) &&
    c.plots.length === DISTRICTS * PLOTS_PER_DISTRICT &&
    Array.isArray(c.nodes) &&
    c.nodes.length === NODE_SLOTS &&
    Array.isArray(c.districts) &&
    c.districts.length === DISTRICTS &&
    Boolean(c.res) &&
    Number.isFinite(c.res.coin) &&
    Array.isArray(c.works) &&
    Array.isArray(c.talents)
  );
}

export function openSave(storage, language = 'zh', onProblem = () => {}) {
  return createSaveStore({
    key: SAVE_KEY,
    version: 1,
    defaults: () => freshSave(language),
    storage,
    onProblem,
    validate: (data) => {
      if (!data || typeof data !== 'object') return false;
      const s = data.settings;
      if (!s || (s.language !== 'zh' && s.language !== 'en') || !['sound', 'music', 'reducedMotion'].every((k) => typeof s[k] === 'boolean')) return false;
      if (!data.record || !Number.isInteger(data.record.terms)) return false;
      return data.county === null || countyLooksRight(data.county);
    }
  });
}

/** A term finished: count it, and keep the fastest in hours. Returns whether it is the fastest. */
export function recordTerm(data, hours) {
  data.record.terms++;
  const fastest = data.record.fastest === null || hours < data.record.fastest;
  if (fastest) data.record.fastest = Math.round(hours * 10) / 10;
  return fastest;
}
