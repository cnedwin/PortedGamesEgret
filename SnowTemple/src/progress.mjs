// What a player has earned across visits: how high the climb is open, the best mark at each tier, and
// the farthest wave held in the yard. Kept in the browser; a private window simply starts from nothing.
import { openSave } from './saves.mjs';

const KEY = 'snow-temple-progress';
const ORDER = '丁丙乙甲';

/**
 * Open the progress kept in `storage`. `progress` is the record to read and change; `save()` writes it.
 * Whatever was stored is brought within bounds first, so a hand-edited or damaged record cannot open
 * a tier that does not follow from it.
 */
export function openProgress(storage) {
  const store = openSave(storage, KEY, { defaults: () => ({}) }),
    kept = store.data,
    open = Math.max(1, Math.floor(kept.open) || 1),
    progress = { open, tier: Math.min(open, Math.max(1, Math.floor(kept.tier) || 1)), marks: { ...(kept.marks ?? {}) }, wave: Math.max(0, Math.floor(kept.wave) || 0) };
  return { progress, save: () => store.save(progress) };
}

/** A chapter cleared at `tier` with `mark`: the next tier opens, and a better mark replaces the old one. */
export function recordClear(progress, tier, mark) {
  const best = progress.marks[tier],
    improved = !best || ORDER.indexOf(mark) > ORDER.indexOf(best),
    opened = tier >= progress.open;
  if (improved) progress.marks[tier] = mark;
  if (opened) progress.open = tier + 1;
  return { improved, opened };
}

/** A stand in the yard that ended at `wave`. Returns whether it is the farthest yet. */
export function recordStand(progress, wave) {
  if (wave <= progress.wave) return false;
  progress.wave = wave;
  return true;
}
