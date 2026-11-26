// Each county has its own progress and term record. Preferences are shared across the three slots.
// The engine keeps unreadable data under the slot's backup key and reports storage errors without throwing.
import { createSaveStore } from '@egret/engine/kit';
import { CORE_WARDS, DISTRICTS, NODE_SLOTS, PLOTS_PER_DISTRICT, SIDES, STARTING_WARDS } from './sim/world.mjs';
import { PETITIONS, RANKS, ZONES } from './sim/data.mjs';

export const SAVE_KEY = 'peach-creek';
const SLOT_KEYS = [SAVE_KEY, SAVE_KEY + '-slot-2', SAVE_KEY + '-slot-3'];
const PREFERENCES_KEY = SAVE_KEY + '-preferences';
const LEGACY_PLOTS = 8;
const SAVE_VERSION = 3;

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
    c.districts.every((ward, i) => typeof ward?.open === 'boolean' &&
      (i >= STARTING_WARDS || ward.open) && (ward.zone === null || ZONES.includes(ward.zone))) &&
    Boolean(c.res) &&
    Number.isFinite(c.res.coin) &&
    (c.petition === null || PETITIONS.list.some(({ id }) => id === c.petition?.id)) &&
    (c.petitionCount === undefined || level(c.petitionCount)) &&
    (c.petitionRecent === undefined || (Array.isArray(c.petitionRecent) && c.petitionRecent.length <= PETITIONS.recent &&
      c.petitionRecent.every((recent) => PETITIONS.list.some(({ id }) => id === recent)))) &&
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
  if (county?.version !== 1 || county.plots?.length !== CORE_WARDS * LEGACY_PLOTS) return data;
  const newParcel = (index) => Math.floor(index / LEGACY_PLOTS) * PLOTS_PER_DISTRICT + index % LEGACY_PLOTS;
  const remap = (reference) => {
    if (reference?.type === 'plot') reference.key = newParcel(reference.key);
  };
  const plotArray = Array.from({ length: CORE_WARDS * PLOTS_PER_DISTRICT }, () => ({ kind: null, level: 0 }));
  county.plots.forEach((plot, index) => { plotArray[newParcel(index)] = plot; });
  county.plots = plotArray;
  county.works.forEach(remap);
  county.talents.forEach((talent) => remap(talent.post));
  county.log.forEach((entry) => remap(entry.work));
  county.defence.wall = SIDES.map(() => county.defence.wall);
  county.defence.troops = SIDES.map(() => 0);
  if (county.raid.last) county.raid.last.side = ((county.seed >>> 0) + county.raid.last.n) % SIDES.length;
  county.version = 2;
  return data;
}

/** Keep old lots and posts in place. Inland docks can run until a player claims a bank slot and moves them. */
function migrateV2(data) {
  const county = data?.county;
  const previousRank = RANKS[county?.rank];
  const corePlots = CORE_WARDS * PLOTS_PER_DISTRICT;
  if (county?.version !== 2 || !previousRank || county.plots?.length !== corePlots || county.districts?.length !== CORE_WARDS) return data;
  county.districts = Array.from({ length: DISTRICTS }, (_, i) => {
    if (i >= CORE_WARDS) return { zone: null, open: false };
    const first = i * PLOTS_PER_DISTRICT;
    const occupied = county.plots.slice(first, first + PLOTS_PER_DISTRICT).some((plot) => plot.kind);
    return { zone: county.districts[i].zone ?? null, open: i < previousRank.districts || occupied };
  });
  for (let i = corePlots; i < DISTRICTS * PLOTS_PER_DISTRICT; i++) county.plots.push({ kind: null, level: 0 });
  county.version = 3;
  return data;
}

const settingsLookRight = (settings) => Boolean(settings) &&
  (settings.language === 'zh' || settings.language === 'en') &&
  ['sound', 'music', 'reducedMotion'].every((key) => typeof settings[key] === 'boolean');

function openCountySave(key, storage, language, onProblem) {
  return createSaveStore({
    key,
    version: SAVE_VERSION,
    migrations: { 1: migrateV1, 2: migrateV2 },
    defaults: () => freshSave(language),
    storage,
    onProblem,
    validate: (data) => {
      if (!data || typeof data !== 'object') return false;
      if (!settingsLookRight(data.settings)) return false;
      if (!data.record || !Number.isInteger(data.record.terms)) return false;
      return data.county === null || countyLooksRight(data.county);
    }
  });
}

export function openSave(storage, language = 'zh', onProblem = () => {}) {
  return openCountySave(SAVE_KEY, storage, language, onProblem);
}

export function openSaveSlots(storage, language = 'zh', onProblem = () => {}) {
  // Slot one keeps the original key and format, so it can still load or migrate single-slot progress.
  const slots = SLOT_KEYS.map((key) => openCountySave(key, storage, language, onProblem));
  const legacySettings = slots[0].data.settings;
  const preferences = createSaveStore({
    key: PREFERENCES_KEY,
    version: 1,
    defaults: () => ({ ...legacySettings }),
    storage,
    onProblem,
    validate: settingsLookRight
  });
  return { slots, preferences };
}

/** A term finished: count it, and keep the fastest in hours. Returns whether it is the fastest. */
export function recordTerm(data, hours) {
  data.record.terms++;
  const fastest = data.record.fastest === null || hours < data.record.fastest;
  if (fastest) data.record.fastest = Math.round(hours * 10) / 10;
  return fastest;
}
