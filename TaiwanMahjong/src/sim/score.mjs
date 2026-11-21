// 台数：按台湾十六张常见的台数表算一手胡牌值几台。所有拆法和胡的那张牌放进哪一组都试一遍，取台数最多的。
// 庄家和连庄的台不在这里，结算时按谁是庄另外加（见 game.mjs 的 finishWin）。
// Tai: what a winning hand is worth under a common Taiwanese sixteen-tile table. Every split of the hand, and every
// group the winning tile could have completed, is tried, and the most is kept. The dealer's tai are added at payment,
// by who is dealer (game.mjs, finishWin).
import { countsOf, isHonour, splits, waitsOf } from './hand.mjs';

/** Each pattern, its tai, in the order the breakdown lists them. */
export const TAI = Object.freeze({
  heavenly: 16,
  earthly: 16,
  human: 16,
  eightFlowers: 8,
  sevenRobOne: 8,
  bigFourWinds: 16,
  smallFourWinds: 8,
  bigThreeDragons: 8,
  smallThreeDragons: 4,
  allHonours: 8,
  pureSuit: 8,
  mixedSuit: 4,
  allTriplets: 4,
  fiveConcealed: 8,
  fourConcealed: 5,
  threeConcealed: 2,
  allCalledDiscard: 2,
  allCalledSelf: 1,
  plain: 2,
  concealedSelf: 3,
  concealed: 1,
  selfDrawn: 1,
  singleWait: 1,
  dragon: 1,
  seatWind: 1,
  roundWind: 1,
  flower: 1,
  flowerSet: 2,
  lastTile: 1,
  lastDiscard: 1,
  kongBloom: 1,
  robbedKong: 1
});

const kindOf = (id) => (id < 136 ? id >> 2 : 34 + (id - 136));

/**
 * Score a win for `seat`. ctx: { from (payer seat or null for self-drawn), winTile, special, robbed, kongDraw,
 * lastTile, firstTurn }.
 */
export function scoreWin(match, seat, ctx) {
  const hand = match.hand,
    player = hand.players[seat],
    wind = (seat - match.dealer + 4) % 4,
    self = ctx.from === null,
    flowers = flowerItems(player.flowers.map(kindOf), wind);
  if (ctx.special) return total([{ key: ctx.special, tai: TAI[ctx.special] }]);

  const melds = player.melds.map((m) => ({ type: m.type === 'chow' ? 'run' : 'triplet', kind: Math.min(...m.tiles.map(kindOf)), open: m.how !== 'closed' }));
  const concealed = player.hand.map(kindOf),
    counts = countsOf(concealed),
    need = 5 - melds.length,
    winKind = kindOf(ctx.winTile);
  const before = counts.slice();
  before[winKind]--;
  const waits = waitsOf(before, need);
  const closed = player.melds.every((m) => m.how === 'closed');

  if (ctx.firstTurn && self && seat === match.dealer) return total([{ key: 'heavenly', tai: TAI.heavenly }, ...flowers]);
  if (ctx.firstTurn && self) return total([{ key: 'earthly', tai: TAI.earthly }, ...flowers]);
  if (ctx.firstTurn && !self) return total([{ key: 'human', tai: TAI.human }, ...flowers]);

  let best = null;
  for (const split of splits(counts, need))
    for (let g = 0; g < split.length; g++) {
      const group = split[g];
      if (!holds(group, winKind)) continue;
      const items = itemsOf({ match, wind, self, ctx, melds, split, winGroup: g, waits, closed, flowers, player });
      const scored = total(items);
      if (!best || scored.total > best.total) best = scored;
    }
  return best ?? total(flowers);
}

const holds = (group, kind) => (group.type === 'run' ? kind >= group.kind && kind <= group.kind + 2 : group.kind === kind);

function total(items) {
  return { items, total: items.reduce((sum, item) => sum + item.tai, 0) };
}

function flowerItems(kinds, wind) {
  const items = [];
  for (const set of [0, 1]) {
    const mine = kinds.filter((k) => k >= 34 + set * 4 && k < 38 + set * 4);
    if (mine.length === 4) items.push({ key: 'flowerSet', tai: TAI.flowerSet, set });
    else if (mine.includes(34 + set * 4 + wind)) items.push({ key: 'flower', tai: TAI.flower, kind: 34 + set * 4 + wind });
  }
  return items;
}

function itemsOf({ match, wind, self, ctx, melds, split, winGroup, waits, closed, flowers, player }) {
  const items = [],
    add = (key, extra) => items.push({ key, tai: TAI[key], ...extra });
  // Groups with whether each set is concealed: a triplet finished by a discard is not.
  const sets = [
    ...melds.map((m) => ({ ...m, concealed: !m.open })),
    ...split.filter((g) => g.type !== 'pair').map((g) => ({ ...g, concealed: !(g.type === 'triplet' && !self && split[winGroup] === g) }))
  ];
  const pair = split.find((g) => g.type === 'pair');
  const kinds = [...sets.flatMap((s) => (s.type === 'run' ? [s.kind, s.kind + 1, s.kind + 2] : [s.kind])), pair.kind];
  const triplets = sets.filter((s) => s.type === 'triplet');
  const hasTriplet = (k) => triplets.some((s) => s.kind === k);

  // Winds and dragons.
  const windTriplets = [27, 28, 29, 30].filter(hasTriplet).length,
    windPair = pair.kind >= 27 && pair.kind <= 30;
  const dragonTriplets = [31, 32, 33].filter(hasTriplet).length,
    dragonPair = pair.kind >= 31;
  let windsCounted = false,
    dragonsCounted = false;
  if (windTriplets === 4) (add('bigFourWinds'), (windsCounted = true));
  else if (windTriplets === 3 && windPair) (add('smallFourWinds'), (windsCounted = true));
  if (dragonTriplets === 3) (add('bigThreeDragons'), (dragonsCounted = true));
  else if (dragonTriplets === 2 && dragonPair) (add('smallThreeDragons'), (dragonsCounted = true));

  // One suit, or honours only.
  const suits = new Set(kinds.filter((k) => !isHonour(k)).map((k) => Math.floor(k / 9))),
    honours = kinds.some(isHonour);
  if (suits.size === 0) add('allHonours');
  else if (suits.size === 1 && !honours) add('pureSuit');
  else if (suits.size === 1 && honours) add('mixedSuit');

  if (sets.every((s) => s.type === 'triplet')) add('allTriplets');
  const hidden = triplets.filter((s) => s.concealed).length;
  if (hidden >= 5) add('fiveConcealed');
  else if (hidden === 4) add('fourConcealed');
  else if (hidden === 3) add('threeConcealed');

  const allCalled = melds.length === 5 && melds.every((m) => m.open);
  if (allCalled) add(self ? 'allCalledSelf' : 'allCalledDiscard');

  if (!self && sets.every((s) => s.type === 'run') && !honours && player.flowers.length === 0 && waits.length >= 2) add('plain');

  if (closed && self) add('concealedSelf');
  else {
    if (closed) add('concealed');
    if (self) add('selfDrawn');
  }
  if (waits.length === 1 && !allCalled) add('singleWait');

  if (!dragonsCounted) for (const k of [31, 32, 33]) if (hasTriplet(k)) add('dragon', { kind: k });
  if (!windsCounted) {
    if (hasTriplet(27 + wind)) add('seatWind', { kind: 27 + wind });
    if (hasTriplet(27 + match.wind)) add('roundWind', { kind: 27 + match.wind });
  }
  items.push(...flowers);
  if (ctx.lastTile) add(self ? 'lastTile' : 'lastDiscard');
  if (ctx.kongDraw && self) add('kongBloom');
  if (ctx.robbed) add('robbedKong');
  return items;
}
