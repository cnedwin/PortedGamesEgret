// 存档：走到了哪个驿站、每辆车还剩几捆茶、路上的记录，每个驿站的营地布置（引擎 serializeScene3D 写出的场景文档），
// 以及设置。由引擎的存档库（createSaveStore）读写：有版本号，读不懂的旧档放到一边而不是丢掉，浏览器拒绝写入也不报错。
//
// The save: which station the convoy reached, how many bundles each truck still carries, the record of the road, the
// camp laid out at each station (a scene document written by the engine's `serializeScene3D`), and the settings. Kept
// by the engine's save store (`createSaveStore`): versioned, an unreadable save set aside rather than lost, and a write
// the browser refuses never throws.
import { createSaveStore } from '@egret/engine/kit';

export const SAVE_KEY = 'tea-horse-road';

/** The settings someone who has never played starts with. `quality` is `auto` until chosen. */
export const freshSettings = () => ({ quality: 'auto', volume: 80, music: true, touch: 'auto', camera: 'chase' });

/** What someone who has never played has. */
export const freshSave = () => ({
  journey: null,
  camps: {},
  best: null,
  seenIntro: false,
  settings: freshSettings()
});

/** A journey just begun at the first station; `cargo` is the bundles on each truck. */
export const freshJourney = (cargo) => ({
  station: 0,
  cargo: [...cargo],
  stolen: 0,
  recovered: 0,
  knocked: 0,
  seconds: 0,
  startedAt: Date.now()
});

/** Open the save in `storage`: the page's (from `browserSaveStorage()`), or one in memory for tests. */
export function openSave(storage) {
  return createSaveStore({
    key: SAVE_KEY,
    version: 1,
    defaults: freshSave,
    storage,
    // A save without this game's shape is started again; the old text is kept aside by the store.
    validate: (data) =>
      Boolean(data) &&
      typeof data === 'object' &&
      typeof data.camps === 'object' &&
      data.camps !== null &&
      typeof data.settings === 'object' &&
      data.settings !== null &&
      (data.journey === null || (typeof data.journey === 'object' && Number.isInteger(data.journey.station) && Array.isArray(data.journey.cargo)))
  });
}

/** Keep the better of two finished journeys: more tea delivered, then less time. */
export function better(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.delivered !== b.delivered) return a.delivered > b.delivered ? a : b;
  return a.seconds <= b.seconds ? a : b;
}
