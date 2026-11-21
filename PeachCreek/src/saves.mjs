// 存档：设置（语言、音效、配乐、减弱动画）、这一任的整座县城（规则的全部状态），和历任的记录。由引擎的存档库读写：
// 有版本号，读不懂的旧档放到一边而不是丢掉，浏览器拒绝写入（隐私模式、空间满）也不报错。
// The save: the settings (language, sound, music, reduced motion), this term's whole county (every bit of the rules'
// state), and the record of past terms. Kept by the engine's save store: versioned, an unreadable save set aside
// rather than lost, and a write the browser refuses never throws.
import { createSaveStore } from '@egret/engine/kit';
import { DISTRICTS, NODE_SLOTS, PLOTS_PER_DISTRICT, SIDES } from './sim/world.mjs';
import { RANKS } from './sim/data.mjs';

export const SAVE_KEY = 'peach-creek';
const LEGACY_PLOTS = 8;
const SAVE_VERSION = 2;

export const freshSave = (language = 'zh') => ({
  county: null,
  record: { terms: 0, fastest: null },
  settings: { language, sound: true, music: true, reducedMotion: false }
});

/** Whether a county from a save has the shape the rules expect. */
const level = (number) => Number.isInteger(number) && number >= 0;
const sideLevels = (list) => Array.isArray(list) && list.length === SIDES.length && list.every(level);

export function countyLooksRight(c) {
  return (
    Boolean(c) &&
    c.version === SAVE_VERSION &&
    Number.isFinite(c.time) &&
    Number.isInteger(c.rank) &&
    c.rank >= 0 &&
    c.rank < RANKS.length &&
    Array.isArray(c.plots) &&
    c.plots.length === DISTRICTS * PLOTS_PER_DISTRICT &&
    Array.isArray(c.nodes) &&
    c.nodes.length === NODE_SLOTS &&
    Array.isArray(c.districts) &&
    c.districts.length === DISTRICTS &&
    Boolean(c.res) &&
    Number.isFinite(c.res.coin) &&
    Array.isArray(c.works) &&
    Array.isArray(c.talents) &&
    sideLevels(c.defence?.wall) &&
    sideLevels(c.defence?.tower) &&
    sideLevels(c.defence?.troops) &&
    level(c.defence?.camp)
  );
}

function migrateV1(data) {
  const county = data?.county;
  if (county?.version !== 1 || county.plots?.length !== DISTRICTS * LEGACY_PLOTS) return data;
  const newParcel = (index) => Math.floor(index / LEGACY_PLOTS) * PLOTS_PER_DISTRICT + index % LEGACY_PLOTS;
  const remap = (reference) => {
    if (reference?.type === 'plot') reference.key = newParcel(reference.key);
  };
  const plotArray = Array.from({ length: DISTRICTS * PLOTS_PER_DISTRICT }, () => ({ kind: null, level: 0 }));
  county.plots.forEach((plot, index) => { plotArray[newParcel(index)] = plot; });
  county.plots = plotArray;
  county.works.forEach(remap);
  county.talents.forEach((talent) => remap(talent.post));
  county.log.forEach((entry) => remap(entry.work));
  county.defence.wall = SIDES.map(() => county.defence.wall);
  county.defence.troops = SIDES.map(() => 0);
  if (county.raid.last) county.raid.last.side = ((county.seed >>> 0) + county.raid.last.n) % SIDES.length;
  county.version = SAVE_VERSION;
  return data;
}

export function openSave(storage, language = 'zh', onProblem = () => {}) {
  return createSaveStore({
    key: SAVE_KEY,
    version: SAVE_VERSION,
    migrations: { 1: migrateV1 },
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
