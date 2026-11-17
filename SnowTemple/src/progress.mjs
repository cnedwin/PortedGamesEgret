// What a player has earned across visits: how high the climb is open, the best mark at each tier, and
// the farthest wave held in the yard. Kept in the browser; a private window simply starts from nothing.
const KEY = 'snow-temple-progress';
const ORDER = '丁丙乙甲';

export function loadProgress() {
  const fresh = { open: 1, tier: 1, marks: {}, wave: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    const open = Math.max(1, Math.floor(saved.open) || 1);
    return { open, tier: Math.min(open, Math.max(1, Math.floor(saved.tier) || 1)), marks: { ...(saved.marks ?? {}) }, wave: Math.max(0, Math.floor(saved.wave) || 0) };
  } catch {
    return fresh;
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    /* ignored */
  }
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
