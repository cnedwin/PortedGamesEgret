// 规则：向听数和听牌、拆牌；台数表里的每一类牌型；吃只能吃上家、截胡、碰优先于吃、搶槓、补花、流局连庄、换庄、
// 圈数到了终局；每一把的收支加起来是零；四家电脑能把一整将打完。
// The rules: shanten, waits and splits; each kind of hand in the tai table; chow only from the seat before, the
// nearest winner, pong before chow, robbing a kong, flowers, an exhausted wall keeping the deal, the deal passing, the
// game ending after its rounds; every hand's payments summing to zero; four computer players finishing a whole game.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { playMatch } from '../src/sim/bot.mjs';
import { act, createMatch, kindOf, liveLeft, optionsFor, RULES, startHand, waiting } from '../src/sim/game.mjs';
import { countsOf, shanten, splits, waitsOf } from '../src/sim/hand.mjs';
import { scoreWin } from '../src/sim/score.mjs';

// Kinds: 0–8 characters, 9–17 dots, 18–26 bamboo, 27–30 winds, 31–33 dragons, 34–41 flowers.
const M = (n) => n - 1,
  P = (n) => 8 + n,
  S = (n) => 17 + n,
  E = 27,
  SOUTH = 28,
  W = 29,
  N = 30,
  RED = 31,
  GREEN = 32,
  WHITE = 33;

/** Tile ids for kinds, each kind's copies taken in turn. */
function idsFor(kinds) {
  const used = new Map();
  return kinds.map((kind) => {
    if (kind >= 34) return 136 + (kind - 34);
    const n = used.get(kind) ?? 0;
    used.set(kind, n + 1);
    return kind * 4 + n;
  });
}

/** A hand state for scoring: seat 0 holds `concealed` (with the win tile) and `melds`. */
function scored({ concealed, melds = [], flowers = [], win, self = false, dealer = 0, seat = 0, wind = 0, streak = 0, ...ctx }) {
  const ids = idsFor([...concealed, ...melds.flatMap((m) => m.kinds), ...flowers]);
  let at = 0;
  const take = (n) => ids.slice(at, (at += n));
  const hand = take(concealed.length),
    meldList = melds.map((m) => ({ type: m.type, how: m.how ?? (m.type === 'kong' ? 'open' : undefined), tiles: take(m.kinds.length) })),
    flowerIds = take(flowers.length);
  const players = [0, 1, 2, 3].map(() => ({ hand: [], melds: [], flowers: [], discards: [], firstTurn: false }));
  players[seat] = { hand, melds: meldList, flowers: flowerIds, discards: [], firstTurn: false };
  const winTile = hand.find((id) => kindOf(id) === win);
  const match = { dealer, wind, streak, hand: { players } };
  return scoreWin(match, seat, { from: self ? null : 1, winTile, robbed: false, kongDraw: false, lastTile: false, firstTurn: false, ...ctx });
}
const keys = (score) => score.items.map((i) => i.key).sort();

test('shanten: a winning hand, a ready one and its waits', () => {
  const win = [M(1), M(2), M(3), P(4), P(5), P(6), S(7), S(8), S(9), E, E, E, RED, RED, RED, WHITE, WHITE];
  assert.equal(shanten(countsOf(win), 5), -1);
  assert.equal(shanten(countsOf(win.slice(0, 16)), 5), 0);
  assert.deepEqual(waitsOf(countsOf(win.slice(0, 16)), 5), [WHITE]);
  // Two-sided wait 4–7 of characters.
  const ready = [M(5), M(6), P(1), P(2), P(3), P(4), P(5), P(6), S(1), S(2), S(3), S(9), S(9), S(9), N, N];
  assert.deepEqual(waitsOf(countsOf(ready), 5), [M(4), M(7)]);
  // With two sets called, three are needed.
  assert.equal(shanten(countsOf([M(1), M(2), M(3), P(1), P(1), P(1), S(5), S(6), S(7), E, E]), 3), -1);
  // A scattered hand is far.
  assert.ok(shanten(countsOf([M(1), M(4), M(7), P(2), P(5), P(8), S(3), S(6), S(9), E, SOUTH, W, N, RED, GREEN, WHITE]), 5) >= 6);
});

test('splits finds every way a winning hand divides', () => {
  const all = splits(countsOf([M(1), M(1), M(1), M(2), M(2), M(2), M(3), M(3), M(3), P(5), P(6), P(7), S(1), S(2), S(3), E, E]), 5);
  assert.ok(all.length >= 2, 'three pongs or three runs');
  assert.ok(all.every((split) => split.length === 6 && split.filter((g) => g.type === 'pair').length === 1));
});

test('a plain hand: five chows, no honours or flowers, a two-sided wait, on a discard', () => {
  const s = scored({ concealed: [M(1), M(2), M(3), M(4), M(5), M(6), P(2), P(3), P(4), P(6), P(7), P(8), S(3), S(4), S(5), S(8), S(8)], win: M(6) });
  assert.deepEqual(keys(s), ['concealed', 'plain']);
  assert.equal(s.total, 3);
});

test('a concealed self-draw is three tai, not concealed plus self-drawn', () => {
  const s = scored({ concealed: [M(1), M(2), M(3), M(4), M(5), M(6), P(2), P(3), P(4), P(6), P(7), P(8), S(3), S(4), S(5), E, E], win: M(6), self: true });
  assert.deepEqual(keys(s), ['concealedSelf']);
  assert.equal(s.total, 3);
});

test('a single wait, and a triplet finished by a discard not counted hidden', () => {
  // Edge wait 1-2 waiting on 3.
  const edge = scored({ concealed: [M(1), M(2), M(3), P(1), P(1), P(1), P(5), P(5), P(5), S(7), S(7), S(7), S(2), S(3), S(4), W, W], win: M(3) });
  assert.ok(keys(edge).includes('singleWait'));
  assert.ok(keys(edge).includes('threeConcealed'));
  // The same pongs, but the win completes one of them on a discard: only two hidden.
  const shared = scored({ concealed: [M(1), M(2), M(3), P(1), P(1), P(1), P(5), P(5), P(5), S(7), S(7), S(7), S(2), S(3), S(4), W, W], win: S(7) });
  assert.ok(!keys(shared).includes('threeConcealed'));
  const drawn = scored({ concealed: [M(1), M(2), M(3), P(1), P(1), P(1), P(5), P(5), P(5), S(7), S(7), S(7), S(2), S(3), S(4), W, W], win: S(7), self: true });
  assert.ok(keys(drawn).includes('threeConcealed'));
});

test('all pongs, one suit, mixed suit, all honours', () => {
  const pongs = scored({ concealed: [M(2), M(2), M(2), P(3), P(3), P(3), S(4), S(4), S(4), M(7), M(7)], melds: [{ type: 'pong', kinds: [P(9), P(9), P(9)] }, { type: 'pong', kinds: [S(1), S(1), S(1)] }], win: M(7) });
  assert.ok(keys(pongs).includes('allTriplets'));
  const pure = scored({ concealed: [P(1), P(2), P(3), P(2), P(3), P(4), P(5), P(5), P(5), P(6), P(7), P(8), P(9), P(9), P(9), P(4), P(4)], win: P(8) });
  assert.ok(keys(pure).includes('pureSuit') && !keys(pure).includes('mixedSuit'));
  const mixed = scored({ concealed: [S(1), S(2), S(3), S(4), S(5), S(6), S(7), S(8), S(9), E, E, E, RED, RED, RED, S(2), S(2)], win: S(9) });
  assert.ok(keys(mixed).includes('mixedSuit'));
  assert.ok(keys(mixed).includes('dragon') && keys(mixed).includes('seatWind') && keys(mixed).includes('roundWind'));
  const honours = scored({ concealed: [E, E, E, SOUTH, SOUTH, SOUTH, W, W, W, RED, RED, RED, GREEN, GREEN, GREEN, WHITE, WHITE], win: WHITE });
  assert.ok(keys(honours).includes('allHonours'));
  assert.ok(keys(honours).includes('smallThreeDragons') && !keys(honours).includes('dragon'), 'small three dragons replaces the dragon pongs');
});

test('big three dragons and the four winds replace their single tai', () => {
  const big = scored({ concealed: [RED, RED, RED, GREEN, GREEN, GREEN, WHITE, WHITE, WHITE, M(1), M(2), M(3), P(4), P(5), P(6), S(9), S(9)], win: S(9) });
  assert.ok(keys(big).includes('bigThreeDragons') && !keys(big).includes('dragon'));
  const winds = scored({ concealed: [E, E, E, SOUTH, SOUTH, SOUTH, W, W, W, N, N, N, M(1), M(2), M(3), P(5), P(5)], win: P(5) });
  assert.ok(keys(winds).includes('bigFourWinds') && !keys(winds).includes('seatWind') && !keys(winds).includes('roundWind'));
  const small = scored({ concealed: [E, E, E, SOUTH, SOUTH, SOUTH, W, W, W, N, N, M(1), M(2), M(3), P(5), P(5), P(5)], win: P(5) });
  assert.ok(keys(small).includes('smallFourWinds'));
});

test('all called: two tai on a discard, one self-drawn, never a single wait as well', () => {
  const melds = [
    { type: 'chow', kinds: [M(1), M(2), M(3)] },
    { type: 'pong', kinds: [P(5), P(5), P(5)] },
    { type: 'chow', kinds: [S(2), S(3), S(4)] },
    { type: 'pong', kinds: [M(8), M(8), M(8)] },
    { type: 'chow', kinds: [P(6), P(7), P(8)] }
  ];
  const discard = scored({ concealed: [S(9), S(9)], melds, win: S(9) });
  assert.deepEqual(keys(discard), ['allCalledDiscard']);
  const self = scored({ concealed: [S(9), S(9)], melds, win: S(9), self: true });
  assert.deepEqual(keys(self), ['allCalledSelf', 'selfDrawn']);
});

test('flowers: one tai for the seat flower, two for a whole set', () => {
  const base = { concealed: [M(1), M(2), M(3), M(4), M(5), M(6), P(2), P(3), P(4), P(6), P(7), P(8), S(3), S(4), S(5), S(8), S(8)], win: M(6) };
  // Seat 0 is east while seat 0 deals: spring (34) and plum (38) are its flowers.
  const own = scored({ ...base, flowers: [34, 39] });
  assert.deepEqual(keys(own), ['concealed', 'flower'], 'a flower spoils a plain hand and only the seat flower counts');
  const set = scored({ ...base, flowers: [34, 35, 36, 37] });
  assert.ok(keys(set).includes('flowerSet') && !keys(set).includes('flower'));
  // South seat (seat 1 with seat 0 dealing) owns summer and orchid.
  const south = scored({ ...base, flowers: [35], seat: 1 });
  assert.ok(keys(south).includes('flower'));
});

test('last tile, last discard, a win on a replacement and robbing a kong add a tai each', () => {
  const base = { concealed: [M(1), M(2), M(3), M(4), M(5), M(6), P(2), P(3), P(4), P(6), P(7), P(8), S(3), S(4), S(5), E, E], win: M(6) };
  assert.ok(keys(scored({ ...base, self: true, lastTile: true })).includes('lastTile'));
  assert.ok(keys(scored({ ...base, lastTile: true })).includes('lastDiscard'));
  assert.ok(keys(scored({ ...base, self: true, kongDraw: true })).includes('kongBloom'));
  assert.ok(keys(scored({ ...base, robbed: true })).includes('robbedKong'));
});

test('heavenly, earthly and human hands stand alone', () => {
  const base = { concealed: [M(1), M(2), M(3), M(4), M(5), M(6), P(2), P(3), P(4), P(6), P(7), P(8), S(3), S(4), S(5), E, E], win: M(6), firstTurn: true };
  assert.deepEqual(keys(scored({ ...base, self: true, dealer: 0 })), ['heavenly']);
  assert.deepEqual(keys(scored({ ...base, self: true, dealer: 1 })), ['earthly']);
  assert.deepEqual(keys(scored({ ...base, dealer: 1 })), ['human']);
});

/** A match with a hand dealt by hand: each seat's concealed kinds, the next tiles of the wall, a dealer. */
function rigged({ hands, wall = [], dealer = 0, turn = dealer }) {
  const match = createMatch({ seed: 1, dealer });
  const hand = startHand(match);
  const used = new Map(),
    id = (kind) => {
      const n = used.get(kind) ?? 0;
      used.set(kind, n + 1);
      return kind >= 34 ? 136 + kind - 34 : kind * 4 + n;
    };
  hand.players.forEach((player, seat) => {
    player.hand = hands[seat].map(id);
    player.melds = [];
    player.flowers = [];
    player.discards = [];
    player.firstTurn = false;
  });
  const front = wall.map(id);
  const all = new Set([...hand.players.flatMap((p) => p.hand), ...front]);
  const rest = Array.from({ length: 144 }, (_, i) => i).filter((i) => !all.has(i) && i < 136);
  hand.wall = [...front, ...rest];
  hand.front = 0;
  hand.back = hand.wall.length;
  hand.turn = turn;
  hand.phase = 'act';
  hand.drawn = hand.players[turn].hand.at(-1);
  hand.selfDrew = true;
  hand.called = true;
  hand.events = [];
  return match;
}

test('only the next seat may chow, and a pong is taken before a chow', () => {
  // Seat 0 discards 5 dots. Seat 1 can chow it (4,6), seat 2 can pong it.
  const match = rigged({
    hands: [
      [P(5), M(1), M(2), M(3), M(4), M(5), M(6), M(7), M(8), M(9), S(1), S(2), S(3), S(4), S(5), S(6), S(7)],
      [P(4), P(6), M(1), M(1), M(1), S(9), S(9), S(9), E, E, E, N, N, N, WHITE, GREEN],
      [P(5), P(5), M(2), M(2), M(2), S(8), S(8), S(8), SOUTH, SOUTH, SOUTH, W, W, W, RED, GREEN],
      [P(9), P(9), P(9), M(3), M(3), M(3), S(7), S(7), S(7), RED, RED, RED, WHITE, WHITE, WHITE, GREEN]
    ]
  });
  const hand = match.hand;
  act(match, 0, { type: 'discard', id: hand.players[0].hand[0] });
  assert.ok(optionsFor(match, 1).chows, 'the next seat may chow');
  assert.ok(!optionsFor(match, 2).chows, 'the opposite seat may not');
  assert.ok(optionsFor(match, 2).pong);
  assert.equal(optionsFor(match, 3), null, 'a seat with nothing to do is not asked');
  assert.deepEqual(waiting(match), [1, 2]);
  act(match, 1, { type: 'chow', ids: optionsFor(match, 1).chows[0] });
  act(match, 2, { type: 'pong' });
  assert.equal(hand.turn, 2, 'the pong wins over the chow');
  assert.equal(hand.players[2].melds[0].type, 'pong');
  assert.ok(hand.players[0].discards[0].taken);
});

test('when two could win on one discard, the nearest after the discarder takes it', () => {
  // Seats 2 and 3 both wait on 9 characters; seat 1 discards it.
  const ready = [M(1), M(2), M(3), P(1), P(2), P(3), S(1), S(2), S(3), E, E, E, RED, RED, RED, M(9)];
  const match = rigged({
    hands: [
      [M(4), M(4), M(5), M(5), M(6), M(6), M(7), M(7), M(8), M(8), P(7), P(7), P(8), P(8), S(6), S(6)],
      [M(9), P(9), P(9), P(9), S(9), S(9), S(9), W, W, W, WHITE, WHITE, WHITE, SOUTH, SOUTH, SOUTH, P(7)],
      ready,
      [M(1), M(2), M(3), P(4), P(5), P(6), S(4), S(5), S(6), N, N, N, GREEN, GREEN, GREEN, M(9)]
    ],
    dealer: 1
  });
  act(match, 1, { type: 'discard', id: match.hand.players[1].hand[0] });
  assert.ok(optionsFor(match, 2).win && optionsFor(match, 3).win);
  act(match, 3, { type: 'win' });
  act(match, 2, { type: 'win' });
  const result = match.hand.result;
  assert.equal(result.seat, 2);
  assert.equal(result.from, 1);
  assert.equal(result.payments.reduce((a, b) => a + b, 0), 0);
  // Seat 1 dealt and paid: the dealer's tai are added to its payment.
  assert.equal(result.payments[1], -(RULES.base + (result.score.total + result.dealerTai) * RULES.perTai));
  assert.equal(match.dealer, 2, 'the deal passes when the dealer does not win');
});

test('a kong added to a pong may be robbed', () => {
  const match = rigged({
    hands: [
      [M(5), M(5), M(5), P(1), P(2), P(3), S(1), S(2), S(3), S(4), S(5), S(6), E, E, E, N, M(5)],
      [M(3), M(4), P(4), P(5), P(6), S(7), S(8), S(9), W, W, W, RED, RED, RED, GREEN, GREEN],
      [M(1), M(1), M(1), M(9), M(9), M(9), P(8), P(8), P(8), SOUTH, SOUTH, SOUTH, WHITE, WHITE, WHITE, M(7)],
      [M(2), M(2), M(2), M(8), M(8), M(8), P(7), P(7), P(7), GREEN, GREEN, N, N, N, M(6), M(6)]
    ]
  });
  const me = match.hand.players[0];
  // Seat 0 has ponged 5 characters before and holds the fourth.
  const fives = me.hand.filter((id) => kindOf(id) === M(5)).slice(0, 3);
  me.hand = me.hand.filter((id) => !fives.includes(id));
  me.melds = [{ type: 'pong', tiles: fives, from: 2 }];
  match.hand.drawn = me.hand.at(-1);
  const options = optionsFor(match, 0);
  assert.ok(options.kongs.some((k) => k.type === 'added' && k.kind === M(5)));
  act(match, 0, { type: 'kong', kind: M(5) });
  assert.equal(match.hand.phase, 'rob');
  act(match, 1, { type: 'win' });
  assert.equal(match.hand.result.seat, 1);
  assert.ok(match.hand.result.score.items.some((i) => i.key === 'robbedKong'));
});

test('flowers are set aside and replaced from the back of the wall', () => {
  const match = createMatch({ seed: 5 });
  const hand = startHand(match);
  for (const player of hand.players) assert.ok(player.hand.every((id) => kindOf(id) < 34), 'no flower stays in a hand');
  const flowers = hand.players.reduce((n, p) => n + p.flowers.length, 0);
  assert.equal(hand.back, 144 - flowers, 'one tile from the back for each flower');
  assert.equal(hand.players[match.dealer].hand.length, 17);
});

test('an exhausted wall draws the hand and the dealer keeps the deal', () => {
  const match = createMatch({ seed: 3 });
  startHand(match);
  const hand = match.hand,
    dealer = match.dealer;
  // Leave the live wall empty after this discard.
  hand.front = hand.back - RULES.reserve - hand.kongs;
  assert.equal(liveLeft(hand), 0);
  // Remove every claim by making the discard a flowerless lone tile nobody can use: pass all.
  act(match, dealer, { type: 'discard', id: hand.players[dealer].hand[0] });
  while (!hand.result) for (const seat of waiting(match)) act(match, seat, { type: 'pass' });
  assert.equal(hand.result.kind, 'draw');
  assert.equal(match.dealer, dealer);
  assert.equal(match.streak, 1);
});

test('four computer players finish whole games; every hand pays out to zero', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const match = playMatch({ seed, rounds: 1 });
    assert.ok(match.over, `seed ${seed} ended`);
    assert.equal(match.scores.reduce((a, b) => a + b, 0), 0);
    for (const entry of match.history) if (entry.result.payments) assert.equal(entry.result.payments.reduce((a, b) => a + b, 0), 0);
    assert.ok(match.history.length >= 4, 'at least four hands in a round');
  }
});

test('a full game runs four rounds', () => {
  const match = playMatch({ seed: 2, rounds: 4, limit: 200 });
  assert.ok(match.over);
  assert.equal(match.wind, 4);
  assert.ok(match.history.length >= 16);
});
