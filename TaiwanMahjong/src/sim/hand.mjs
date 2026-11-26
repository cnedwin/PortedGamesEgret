// 手牌分析：向听数、能胡的牌、所有胡牌拆法。十六张麻将胡牌是五组面子加一对眼，已经吃碰槓的面子不再算，所以要的
// 面子数是 5 减去副露数。牌的种类 0–33：萬 0–8、筒 9–17、條 18–26、東南西北 27–30、中發白 31–33；花 34–41。
// Hand analysis: shanten, the tiles that win, and every way a winning hand splits. A sixteen-tile hand wins with five
// sets and a pair; sets already called count as made, so the sets needed are 5 less the calls. Kinds 0–33: characters
// 0–8, dots 9–17, bamboo 18–26, winds 27–30, dragons 31–33; flowers 34–41.

export const KINDS = 34;
export const SETS = 5;
export const isHonour = (kind) => kind >= 27 && kind < 34;
export const isFlower = (kind) => kind >= 34;
export const suitOf = (kind) => (kind < 27 ? Math.floor(kind / 9) : 3);
export const rankOf = (kind) => (kind < 27 ? kind % 9 : -1);
export const isTerminal = (kind) => kind < 27 && (kind % 9 === 0 || kind % 9 === 8);

/** Counts of each kind 0–33 in a list of kinds. */
export function countsOf(kinds) {
  const counts = new Array(KINDS).fill(0);
  for (const kind of kinds) if (kind < KINDS) counts[kind]++;
  return counts;
}

// For one suit (nine counts) or the honours (seven, no runs): every (sets, partials, pair) it can make, kept when no
// other choice is at least as good in all three. Memoised by the counts.
const memo = new Map();
function blocksOf(counts, start, length, runs) {
  const key = (runs ? 's' : 'h') + counts.slice(start, start + length).join('');
  const known = memo.get(key);
  if (known) return known;
  const local = counts.slice(start, start + length),
    found = new Set();
  const walk = (at, sets, partials, pair) => {
    while (at < length && local[at] === 0) at++;
    if (at >= length) {
      found.add(sets * 100 + partials * 10 + pair);
      return;
    }
    if (local[at] >= 3) {
      local[at] -= 3;
      walk(at, sets + 1, partials, pair);
      local[at] += 3;
    }
    if (runs && at + 2 < length && local[at + 1] && local[at + 2]) {
      local[at]--, local[at + 1]--, local[at + 2]--;
      walk(at, sets + 1, partials, pair);
      local[at]++, local[at + 1]++, local[at + 2]++;
    }
    if (local[at] >= 2) {
      local[at] -= 2;
      if (!pair) walk(at, sets, partials, 1);
      walk(at, sets, partials + 1, pair);
      local[at] += 2;
    }
    if (runs && at + 1 < length && local[at + 1]) {
      local[at]--, local[at + 1]--;
      walk(at, sets, partials + 1, pair);
      local[at]++, local[at + 1]++;
    }
    if (runs && at + 2 < length && local[at + 2]) {
      local[at]--, local[at + 2]--;
      walk(at, sets, partials + 1, pair);
      local[at]++, local[at + 2]++;
    }
    // Leave one tile of this kind alone.
    local[at]--;
    walk(at, sets, partials, pair);
    local[at]++;
  };
  walk(0, 0, 0, 0);
  const all = [...found].map((code) => [Math.floor(code / 100), Math.floor(code / 10) % 10, code % 10]);
  const kept = all.filter((a) => !all.some((b) => b !== a && b[0] >= a[0] && b[1] >= a[1] && b[2] >= a[2] && (b[0] > a[0] || b[1] > a[1] || b[2] > a[2])));
  memo.set(key, kept);
  if (memo.size > 200000) memo.clear();
  return kept;
}

/**
 * Shanten of the concealed counts with `need` sets still to make: −1 is a winning hand, 0 is ready (聽牌).
 * Counts hold 3·need + 1 or 3·need + 2 tiles.
 */
export function shanten(counts, need) {
  const parts = [blocksOf(counts, 0, 9, true), blocksOf(counts, 9, 9, true), blocksOf(counts, 18, 9, true), blocksOf(counts, 27, 7, false)];
  let best = -1;
  for (const a of parts[0])
    for (const b of parts[1])
      for (const c of parts[2])
        for (const d of parts[3]) {
          const pairs = a[2] + b[2] + c[2] + d[2];
          if (pairs > 1) {
            // Only one pair can be the head; the others become partials.
            const sets = a[0] + b[0] + c[0] + d[0],
              partials = a[1] + b[1] + c[1] + d[1] + pairs - 1;
            best = Math.max(best, score(sets, partials, 1, need));
          } else {
            const sets = a[0] + b[0] + c[0] + d[0],
              partials = a[1] + b[1] + c[1] + d[1];
            best = Math.max(best, score(sets, partials, pairs, need));
          }
        }
  return 2 * need - best;
}

function score(sets, partials, pair, need) {
  const s = Math.min(sets, need),
    p = Math.min(partials, need - s);
  return 2 * s + p + pair;
}

/** Kinds that would complete the hand (counts hold 3·need + 1 tiles). */
export function waitsOf(counts, need) {
  const waits = [];
  for (let kind = 0; kind < KINDS; kind++) {
    if (counts[kind] >= 4) continue;
    counts[kind]++;
    if (shanten(counts, need) === -1) waits.push(kind);
    counts[kind]--;
  }
  return waits;
}

/** Whether the counts (3·need + 2 tiles) are a winning hand. */
export const isWinning = (counts, need) => shanten(counts, need) === -1;

/**
 * Every way the counts split into `need` sets and a pair: lists of groups, each
 * { type: 'run' | 'triplet' | 'pair', kind } (a run's kind is its lowest tile).
 */
export function splits(counts, need) {
  const local = counts.slice(),
    out = [],
    groups = [];
  const walk = (at, sets, pair) => {
    while (at < KINDS && local[at] === 0) at++;
    if (at >= KINDS) {
      if (sets === need && pair) out.push(groups.slice());
      return;
    }
    if (local[at] >= 3 && sets < need) {
      local[at] -= 3;
      groups.push({ type: 'triplet', kind: at });
      walk(at, sets + 1, pair);
      groups.pop();
      local[at] += 3;
    }
    if (at < 27 && at % 9 <= 6 && local[at + 1] && local[at + 2] && sets < need) {
      local[at]--, local[at + 1]--, local[at + 2]--;
      groups.push({ type: 'run', kind: at });
      walk(at, sets + 1, pair);
      groups.pop();
      local[at]++, local[at + 1]++, local[at + 2]++;
    }
    if (local[at] >= 2 && !pair) {
      local[at] -= 2;
      groups.push({ type: 'pair', kind: at });
      walk(at, sets, true);
      groups.pop();
      local[at] += 2;
    }
  };
  walk(0, 0, false);
  return out;
}

/**
 * Tiles that would lower the shanten of a 3·need + 1 hand, with how many of each are not yet seen.
 * `seen` counts the kinds visible to this player (its own hand included).
 */
export function improvements(counts, need, seen) {
  const now = shanten(counts, need),
    out = [];
  let total = 0;
  for (let kind = 0; kind < KINDS; kind++) {
    const left = 4 - seen[kind];
    if (left <= 0 || counts[kind] >= 4) continue;
    counts[kind]++;
    if (shanten(counts, need) < now) {
      out.push(kind);
      total += left;
    }
    counts[kind]--;
  }
  return { kinds: out, total, shanten: now };
}
