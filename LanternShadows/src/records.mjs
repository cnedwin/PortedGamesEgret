// Only complete acts belong in this book. The caller keeps boss-only exhibitions out.
export const ACT_GOALS = {
  act1: { time: 150, combo: 18 },
  act2: { time: 165, combo: 20 },
  act3: { time: 180, combo: 22 },
};

const RECORDS = 'lantern-shadows-records';
const LEGACY = 'lantern-shadows-ranks';
const RANKS = ['C', 'B', 'A', 'S'];
const bestRank = (a, b) => RANKS[Math.max(RANKS.indexOf(a), RANKS.indexOf(b))];
const runTime = value => Number.isFinite(value) && value >= 0 ? value : undefined;
const hitCount = value => Number.isSafeInteger(value) && value >= 0 ? value : undefined;

function read(storage, key) {
  try {
    const data = JSON.parse(storage?.getItem(key) ?? 'null');
    if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  } catch {
    // The player can still keep records for this visit.
  }
  return {};
}

export function createRecordBook(storage) {
  const saved = read(storage, RECORDS), legacy = read(storage, LEGACY);
  const entries = {};
  for (const act of Object.keys(ACT_GOALS)) {
    const row = saved[act], rank = bestRank(row?.rank, legacy[act]);
    if (rank) entries[act] = { rank, time: runTime(row?.time), combo: hitCount(row?.combo), noFalls: row?.noFalls === true };
  }

  function get(act) {
    if (!Object.hasOwn(entries, act)) return undefined;
    const row = entries[act], target = ACT_GOALS[act];
    return { ...row, goals: [row.time <= target.time, row.combo >= target.combo, row.noFalls] };
  }

  function record(act, result) {
    if (!Object.hasOwn(ACT_GOALS, act) || !RANKS.includes(result?.rank)) return undefined;
    const old = entries[act];
    const time = runTime(result.time), combo = hitCount(result.best);
    entries[act] = {
      rank: bestRank(old?.rank, result.rank),
      time: time === undefined ? old?.time : Math.min(old?.time ?? time, time),
      combo: combo === undefined ? old?.combo : Math.max(old?.combo ?? combo, combo),
      noFalls: old?.noFalls === true || result.falls === 0,
    };
    try {
      storage?.setItem(RECORDS, JSON.stringify(entries));
    } catch {
      // Keep the entry in memory when there is nowhere to save.
    }
    return get(act);
  }

  return { get, record };
}
