// 存档：每关的星数和最高分、开到哪一关、看没看过开场、声音设置。由引擎的存档库读写。
// The save: stars and best score of each level, how far the city is open, whether the opening film has
// been seen, and the sound settings. Kept through the engine's save store: versioned, an unreadable save
// set aside under `<key>.unread` rather than lost, and a write the browser refuses never throws.
import { createSaveStore } from '@egret/engine/kit';

export const SAVE_KEY = 'mechanism-city';

/** What someone who has never played has. */
export const freshSave = () => ({ levels: {}, open: 1, seenIntro: false, settings: { effects: true, music: true } });

/** Open the save in `storage`: the page's (from `browserSaveStorage()`), or one in memory for tests. */
export function openSave(storage) {
  return createSaveStore({
    key: SAVE_KEY,
    version: 1,
    defaults: freshSave,
    storage,
    // A save that does not have the shape of this game's is started again; the old text is kept aside.
    validate: (data) => data && typeof data === 'object' && typeof data.levels === 'object' && Number.isInteger(data.open) && typeof data.settings === 'object'
  });
}

/**
 * A level cleared: keep the better of the stars and of the score, and open the next level.
 * Returns what changed, for the result screen.
 */
export function recordClear(data, index, { stars, score }, count) {
  const id = String(index + 1),
    before = data.levels[id] ?? { stars: 0, score: 0 },
    better = { stars: Math.max(before.stars, stars), score: Math.max(before.score, score) };
  data.levels[id] = better;
  const opened = index + 2 > data.open && index + 1 < count;
  if (opened) data.open = index + 2;
  return { newStars: stars > before.stars, newBest: score > before.score, opened };
}

/** All the stars in the save. */
export const totalStars = (data) => Object.values(data.levels).reduce((sum, level) => sum + (level.stars ?? 0), 0);
