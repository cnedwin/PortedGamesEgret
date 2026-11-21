// 电脑对手：打哪张看向听数和有效牌数（还没见到的、能让向听数下降的牌有几张），再按性格加减：稳健的人看到别家
// 快听牌就打安全牌，爱做大牌的会留一门花色和字牌对子，急攻的人能吃就吃、能碰就碰。难度「入门」会随手打错。
// The computer players: a discard is chosen by shanten and by how many unseen tiles would lower it, then shaded by
// character: the steady one plays safe once another seat looks ready, the one after big hands keeps to a suit and
// honour pairs, the eager one calls whatever helps. On the easiest level they make mistakes.
import { countsOf, improvements, isHonour, shanten } from './hand.mjs';
import { act, createMatch, kindOf, liveLeft, needOf, optionsFor, seatWind, seenBy, startHand, waiting } from './game.mjs';

/** The three characters at the table, and how each plays. */
export const CHARACTERS = Object.freeze({
  steady: { call: 0, defend: 1.4, big: 0 },
  eager: { call: 1, defend: 0.5, big: 0 },
  grand: { call: 0.4, defend: 0.8, big: 1 }
});

/** Levels: how often a discard is a slip, and how far defence counts. */
export const LEVELS = Object.freeze({
  easy: { slip: 0.25, defend: 0.2 },
  normal: { slip: 0.05, defend: 1 },
  hard: { slip: 0, defend: 1.3 }
});

const kindsOf = (ids) => ids.map(kindOf);

/** How likely another seat is ready, 0–1, from its calls, its river and the wall. */
export function threatOf(match, seat) {
  const hand = match.hand,
    player = hand.players[seat];
  const calls = player.melds.filter((m) => m.how !== 'closed').length,
    river = player.discards.length,
    late = 1 - liveLeft(hand) / (144 - 16 - 65);
  return Math.max(0, Math.min(1, calls * 0.18 + river * 0.03 + late * 0.35 - 0.15));
}

/** How dangerous a kind is to discard against a seat, 0–1. */
export function dangerOf(match, kind, seat, seen) {
  const hand = match.hand,
    river = hand.players[seat].discards.map((d) => kindOf(d.id));
  if (seen[kind] >= 4) return 0;
  let danger = isHonour(kind) ? 0.45 : kind % 9 === 0 || kind % 9 === 8 ? 0.55 : kind % 9 === 1 || kind % 9 === 7 ? 0.75 : 1;
  if (isHonour(kind) && seen[kind] >= 3) danger = 0.05;
  else if (isHonour(kind) && seen[kind] === 2) danger *= 0.6;
  if (river.includes(kind)) danger *= 0.35;
  // Just passed by everyone since: the last discard of the table that nobody took.
  const last = hand.discard;
  if (last && kindOf(last.id) === kind && last.seat !== seat) danger *= 0.6;
  return danger;
}

/**
 * What a big-hand player is aiming at: a flush in its main suit (with honours) when most of its tiles and all its
 * calls fit, or all pongs when it holds many pairs and has called no chow.
 */
export function planOf(counts, melds) {
  const suitCounts = [0, 1, 2].map((s) => counts.slice(s * 9, s * 9 + 9).reduce((a, b) => a + b, 0)),
    honours = counts.slice(27, 34).reduce((a, b) => a + b, 0),
    main = suitCounts.indexOf(Math.max(...suitCounts));
  const meldKinds = melds.map((m) => Math.min(...m.tiles.map(kindOf)));
  const fits = meldKinds.every((k) => k >= 27 || Math.floor(k / 9) === main);
  const share = suitCounts[main] + honours + melds.length * 3;
  const flush = fits && share >= 11,
    sure = fits && share >= 13;
  const pairs = counts.filter((n) => n >= 2).length + melds.filter((m) => m.type !== 'chow').length;
  const pongs = pairs >= 6 && melds.every((m) => m.type !== 'chow');
  return { main, flush, sure, pongs };
}

/** Pick an action for a seat. `brain` = { character, level, random }. */
export function decide(match, seat, brain) {
  const options = optionsFor(match, seat);
  if (!options) return null;
  if (options.win) return { type: 'win' };
  if (options.type === 'act') return ownTurn(match, seat, options, brain);
  if (options.type === 'rob') return { type: 'pass' };
  return claim(match, seat, options, brain);
}

function ownTurn(match, seat, options, brain) {
  const hand = match.hand,
    player = hand.players[seat],
    counts = countsOf(kindsOf(player.hand)),
    need = needOf(player),
    seen = seenBy(match, seat);
  const choice = bestDiscard(match, seat, counts, need, seen, brain, player.melds);
  for (const kong of options.kongs) {
    if (kong.type === 'added') return { type: 'kong', kind: kong.kind };
    const after = counts.slice();
    after[kong.kind] -= 4;
    if (shanten(after, need - 1) <= choice.shanten) return { type: 'kong', kind: kong.kind };
  }
  const id = player.hand.filter((t) => kindOf(t) === choice.kind).at(-1);
  return { type: 'discard', id };
}

/** The best kind to let go of, with its shanten after. */
export function bestDiscard(match, seat, counts, need, seen, brain, melds = []) {
  const character = CHARACTERS[brain.character] ?? CHARACTERS.steady,
    level = LEVELS[brain.level] ?? LEVELS.normal,
    random = brain.random ?? Math.random;
  const threats = [1, 2, 3].map((i) => (seat + i) % 4).map((s) => ({ seat: s, threat: threatOf(match, s) }));
  // A big hand is given up once another seat looks ready and this one is still far.
  const danger = Math.max(...threats.map((x) => x.threat)),
    plan = character.big && !(danger > 0.45 && shanten(counts, need) >= 3) ? planOf(counts, melds) : null;
  const wind = seatWind(match, seat);
  const candidates = [];
  for (let kind = 0; kind < 34; kind++) {
    if (!counts[kind]) continue;
    counts[kind]--;
    const result = improvements(counts, need, seen);
    counts[kind]++;
    let value = -result.shanten * 100 + result.total;
    // Lone honours and terminals go first; honours that pay tai are kept a little longer.
    if (isHonour(kind) && counts[kind] === 1) value += kind >= 31 || kind === 27 + wind || kind === 27 + match.wind ? 1 : 3;
    if (plan?.flush) {
      // Off-suit tiles go even at the cost of a step.
      const suit = kind < 27 ? Math.floor(kind / 9) : 3;
      if (suit < 3 && suit !== plan.main) value += plan.sure ? 130 : 45;
      if (isHonour(kind) && counts[kind] >= 2) value -= 30;
    }
    if (plan?.pongs) {
      if (counts[kind] >= 2) value -= 60;
      else value += 30;
    }
    // Defence: the more another seat looks ready and the further this hand is, the more danger costs.
    const far = Math.max(0, result.shanten) + 1;
    let danger = 0;
    for (const { seat: other, threat } of threats) danger = Math.max(danger, threat * dangerOf(match, kind, other, seen));
    value -= danger * far * 18 * character.defend * level.defend;
    candidates.push({ kind, value, shanten: result.shanten });
  }
  candidates.sort((a, b) => b.value - a.value);
  if (level.slip && random() < level.slip && candidates.length > 1) return candidates[1 + Math.floor(random() * Math.min(3, candidates.length - 1))];
  return candidates[0];
}

/** The best shanten a hand of 3·need + 2 reaches with one discard. */
function bestAfter(counts, need) {
  let best = 99;
  for (let kind = 0; kind < 34; kind++) {
    if (!counts[kind]) continue;
    counts[kind]--;
    best = Math.min(best, shanten(counts, need));
    counts[kind]++;
  }
  return best;
}

function claim(match, seat, options, brain) {
  const character = CHARACTERS[brain.character] ?? CHARACTERS.steady,
    hand = match.hand,
    player = hand.players[seat],
    counts = countsOf(kindsOf(player.hand)),
    need = needOf(player),
    kind = kindOf(hand.discard.id),
    now = shanten(counts, need),
    open = player.melds.some((m) => m.how !== 'closed'),
    wind = seatWind(match, seat);
  const paysTai = kind >= 31 || kind === 27 + wind || kind === 27 + match.wind;
  const plan = character.big ? planOf(counts, player.melds) : null,
    offPlan = plan?.flush && kind < 27 && Math.floor(kind / 9) !== plan.main;
  if (options.kong) {
    const after = counts.slice();
    after[kind] -= 3;
    if (shanten(after, need - 1) <= now) return { type: 'kong' };
  }
  if (options.pong && plan?.pongs) return { type: 'pong' };
  if (options.pong && !offPlan) {
    const after = counts.slice();
    after[kind] -= 2;
    const then = bestAfter(after, need - 1);
    if (then < now && (open || character.call >= 0.4 || paysTai || now <= 2)) return { type: 'pong' };
    if (then === now && paysTai && character.call > 0) return { type: 'pong' };
  }
  if (options.chows && !offPlan && !plan?.pongs) {
    let best = null;
    for (const ids of options.chows) {
      const after = counts.slice();
      for (const id of ids) after[kindOf(id)]--;
      const then = bestAfter(after, need - 1);
      if (!best || then < best.then) best = { ids, then };
    }
    if (best && best.then < now && (open || character.call >= 1 || now <= 1))
      return { type: 'chow', ids: best.ids };
  }
  return { type: 'pass' };
}

/** Play a whole match among four computer players; returns the match. */
export function playMatch({ seed = 1, rounds = 1, brains, limit = 64 } = {}) {
  const match = createMatch({ seed, rounds });
  const table = brains ?? [
    { character: 'steady', level: 'normal' },
    { character: 'eager', level: 'normal' },
    { character: 'grand', level: 'normal' },
    { character: 'steady', level: 'normal' }
  ];
  table.forEach((brain) => (brain.random ??= match.random));
  while (!match.over && match.played < limit) {
    const hand = startHand(match);
    let steps = 0;
    while (!hand.result) {
      if (++steps > 2000) throw new Error('hand did not end');
      const seats = waiting(match);
      act(match, seats[0], decide(match, seats[0], table[seats[0]]));
    }
  }
  return match;
}
