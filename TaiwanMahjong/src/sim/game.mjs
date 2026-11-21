// 一场对局的规则：洗牌、发牌、补花、摸牌、打牌、吃碰槓、胡、搶槓、流局、连庄和换庄。不碰页面也不碰引擎，电脑
// 对局和测试都直接用它。四个座位按出牌顺序编号 0–3，0 号是玩家；下一家是 (座位+1)%4，只有下一家能吃。
// 一张牌放炮时，按出牌顺序最靠近放炮者的一家胡（截胡）。
// The rules of a match: shuffle, deal, flower replacement, draw, discard, chow, pong, kong, win, robbing a kong, an
// exhausted wall, and the dealer keeping or passing the deal. Free of the page and the engine. Seats 0–3 in play
// order, 0 the player; the next seat is (seat + 1) % 4, and only it may chow. When several could win on one discard,
// the nearest after the discarder takes it (截胡).
import { countsOf, isFlower, isWinning, SETS, suitOf, waitsOf } from './hand.mjs';
import { scoreWin } from './score.mjs';

export const RULES = Object.freeze({
  /** Tiles at the end of the wall never drawn; each kong keeps one more. */
  reserve: 16,
  /** A payment is the base plus tai × per tai. */
  base: 300,
  perTai: 100
});

/** Tile ids 0–143: 0–135 are four of each kind 0–33, 136–143 the eight flowers 34–41. */
export const kindOf = (id) => (id < 136 ? id >> 2 : 34 + (id - 136));

/** A small seeded generator (mulberry32). */
export function seeded(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A new match; `rounds` is 1 (East round only) or 4 (a full game, 一將). */
export function createMatch({ seed = 1, rounds = 1, dealer = 0 } = {}) {
  return {
    seed,
    random: seeded(seed),
    rounds,
    wind: 0,
    dealer,
    firstDealer: dealer,
    /** How many times the deal has moved on within this wind. */
    passes: 0,
    streak: 0,
    scores: [0, 0, 0, 0],
    played: 0,
    history: [],
    hand: null,
    over: false
  };
}

/** The seat wind of a seat (0 east … 3 north) with the current dealer. */
export const seatWind = (match, seat) => (seat - match.dealer + 4) % 4;

/** Tiles still drawable from the live wall. */
export const liveLeft = (hand) => hand.back - hand.front - (RULES.reserve + hand.kongs);

/** Deal a new hand of the match. */
export function startHand(match) {
  const wall = Array.from({ length: 144 }, (_, i) => i);
  for (let i = wall.length - 1; i > 0; i--) {
    const j = Math.floor(match.random() * (i + 1));
    [wall[i], wall[j]] = [wall[j], wall[i]];
  }
  const hand = {
    number: match.played,
    dealer: match.dealer,
    wind: match.wind,
    passes: match.passes,
    streak: match.streak,
    wall,
    front: 0,
    back: 144,
    kongs: 0,
    players: [0, 1, 2, 3].map(() => ({ hand: [], melds: [], flowers: [], discards: [], firstTurn: true })),
    turn: match.dealer,
    phase: 'act',
    drawn: null,
    selfDrew: true,
    kongDraw: false,
    discard: null,
    claims: null,
    answers: null,
    rob: null,
    called: false,
    events: [],
    result: null
  };
  match.hand = hand;
  for (let round = 0; round < 16; round++)
    for (let i = 0; i < 4; i++) {
      const seat = (match.dealer + i) % 4;
      hand.players[seat].hand.push(wall[hand.front++]);
    }
  hand.players[match.dealer].hand.push(wall[hand.front++]);
  hand.drawn = hand.players[match.dealer].hand.at(-1);
  hand.events.push({ type: 'deal' });
  // Flowers on the deal are replaced in order from the dealer, again and again until none is left.
  for (let pass = 0; pass < 8; pass++) {
    let any = false;
    for (let i = 0; i < 4 && !hand.result; i++) {
      const seat = (match.dealer + i) % 4,
        player = hand.players[seat];
      for (let k = player.hand.length - 1; k >= 0 && !hand.result; k--) {
        const id = player.hand[k];
        if (!isFlower(kindOf(id))) continue;
        any = true;
        player.hand.splice(k, 1);
        takeFlower(match, seat, id);
        if (hand.result) break;
        const fresh = hand.wall[--hand.back];
        player.hand.push(fresh);
        if (seat === match.dealer && hand.drawn === id) hand.drawn = fresh;
        hand.events.push({ type: 'replace', seat, id: fresh });
      }
    }
    if (!any) break;
  }
  if (!hand.result && !hand.players[match.dealer].hand.includes(hand.drawn)) hand.drawn = hand.players[match.dealer].hand.at(-1);
  return hand;
}

/** A flower goes to the player's flowers; eight flowers win at once, and the eighth drawn beside seven is robbed. */
function takeFlower(match, seat, id) {
  const hand = match.hand,
    player = hand.players[seat];
  player.flowers.push(id);
  hand.events.push({ type: 'flower', seat, id });
  if (player.flowers.length === 8) return finishWin(match, seat, null, { special: 'eightFlowers' });
  const holder = hand.players.findIndex((other, s) => s !== seat && other.flowers.length === 7);
  if (holder >= 0) {
    // 七搶一: the one with seven takes the eighth, paid by the one who drew it.
    player.flowers.pop();
    hand.players[holder].flowers.push(id);
    return finishWin(match, holder, seat, { special: 'sevenRobOne' });
  }
}

/** Draw for a seat from the front or, after a kong or a flower, from the back; flowers are replaced. */
function draw(match, seat, fromBack) {
  const hand = match.hand;
  if (liveLeft(hand) <= 0) return exhausted(match);
  let id = fromBack ? hand.wall[--hand.back] : hand.wall[hand.front++];
  let replaced = fromBack;
  while (isFlower(kindOf(id))) {
    takeFlower(match, seat, id);
    if (hand.result) return;
    if (liveLeft(hand) <= 0) return exhausted(match);
    id = hand.wall[--hand.back];
    replaced = true;
  }
  hand.players[seat].hand.push(id);
  hand.turn = seat;
  hand.phase = 'act';
  hand.drawn = id;
  hand.selfDrew = true;
  hand.kongDraw = replaced;
  hand.events.push({ type: 'draw', seat, id, back: replaced });
}

function exhausted(match) {
  const hand = match.hand;
  hand.phase = 'done';
  hand.result = { kind: 'draw' };
  hand.events.push({ type: 'exhausted' });
  closeHand(match);
}

/** Melds needed still, from a player's calls. */
export const needOf = (player) => SETS - player.melds.length;

const kindsIn = (ids) => ids.map(kindOf);

/** What a seat may do now, or null. */
export function optionsFor(match, seat) {
  const hand = match.hand;
  if (!hand || hand.result) return null;
  const player = hand.players[seat];
  if (hand.phase === 'act' && hand.turn === seat) {
    const counts = countsOf(kindsIn(player.hand)),
      need = needOf(player),
      kongs = [];
    if (hand.selfDrew && liveLeft(hand) > 0) {
      for (let kind = 0; kind < 34; kind++) if (counts[kind] === 4) kongs.push({ type: 'closed', kind });
      for (const meld of player.melds) if (meld.type === 'pong' && counts[kindOf(meld.tiles[0])] >= 1) kongs.push({ type: 'added', kind: kindOf(meld.tiles[0]) });
    }
    return { type: 'act', discard: player.hand.slice(), win: hand.selfDrew && isWinning(counts, need), kongs };
  }
  if (hand.phase === 'claim' && hand.claims?.[seat]) return { type: 'claim', ...hand.claims[seat] };
  if (hand.phase === 'rob' && hand.claims?.[seat]) return { type: 'rob', ...hand.claims[seat] };
  return null;
}

/** Seats whose answer the hand waits for, in order. */
export function waiting(match) {
  const hand = match.hand;
  if (!hand || hand.result) return [];
  if (hand.phase === 'act') return [hand.turn];
  const from = hand.phase === 'rob' ? hand.rob.seat : hand.discard.seat;
  return [1, 2, 3].map((i) => from + i).map((s) => s % 4).filter((s) => hand.claims[s] && !hand.answers[s]);
}

/** Do an action for a seat: discard, win, kong, pong, chow, pass. Throws on an illegal one. */
export function act(match, seat, action) {
  const hand = match.hand,
    options = optionsFor(match, seat);
  if (!options) throw new Error(`seat ${seat} has nothing to do`);
  if (options.type === 'act') return own(match, seat, action, options);
  if (action.type === 'win' && !options.win) throw new Error('cannot win');
  if (action.type === 'pong' && !options.pong) throw new Error('cannot pong');
  if (action.type === 'kong' && !options.kong) throw new Error('cannot kong');
  if (action.type === 'chow' && !options.chows?.some((pair) => pair.every((id) => action.ids.includes(id)))) throw new Error('cannot chow');
  hand.answers[seat] = action;
  if (waiting(match).length === 0) (hand.phase === 'rob' ? resolveRob : resolveClaims)(match);
}

function own(match, seat, action, options) {
  const hand = match.hand,
    player = hand.players[seat];
  if (action.type === 'win') {
    if (!options.win) throw new Error('cannot win');
    return finishWin(match, seat, null, {});
  }
  if (action.type === 'kong') {
    const choice = options.kongs.find((k) => k.kind === action.kind);
    if (!choice) throw new Error('cannot kong');
    if (choice.type === 'closed') {
      const ids = player.hand.filter((id) => kindOf(id) === action.kind);
      player.hand = player.hand.filter((id) => kindOf(id) !== action.kind);
      player.melds.push({ type: 'kong', how: 'closed', tiles: ids, from: seat });
      hand.kongs++;
      hand.called = true;
      hand.events.push({ type: 'kong', seat, how: 'closed', kind: action.kind });
      return draw(match, seat, true);
    }
    // Added kong: others may rob it.
    const id = player.hand.find((t) => kindOf(t) === action.kind);
    const claims = {};
    for (let i = 1; i < 4; i++) {
      const other = (seat + i) % 4,
        them = hand.players[other],
        counts = countsOf(kindsIn(them.hand));
      counts[action.kind]++;
      if (isWinning(counts, needOf(them))) claims[other] = { win: true };
    }
    hand.events.push({ type: 'addKong', seat, kind: action.kind, id });
    if (Object.keys(claims).length) {
      hand.phase = 'rob';
      hand.rob = { seat, id, kind: action.kind };
      hand.claims = claims;
      hand.answers = {};
      return;
    }
    return completeAddedKong(match, seat, id);
  }
  if (action.type !== 'discard') throw new Error('unknown action ' + action.type);
  const at = player.hand.indexOf(action.id);
  if (at < 0) throw new Error('not in hand');
  player.hand.splice(at, 1);
  player.discards.push({ id: action.id, taken: false });
  player.firstTurn = false;
  hand.discard = { seat, id: action.id };
  hand.drawn = null;
  hand.events.push({ type: 'discard', seat, id: action.id });
  openClaims(match);
}

function completeAddedKong(match, seat, id) {
  const hand = match.hand,
    player = hand.players[seat],
    kind = kindOf(id);
  player.hand.splice(player.hand.indexOf(id), 1);
  const meld = player.melds.find((m) => m.type === 'pong' && kindOf(m.tiles[0]) === kind);
  meld.type = 'kong';
  meld.how = 'added';
  meld.tiles.push(id);
  hand.kongs++;
  hand.called = true;
  hand.events.push({ type: 'kong', seat, how: 'added', kind });
  draw(match, seat, true);
}

/** After a discard: who may take it. */
function openClaims(match) {
  const hand = match.hand,
    { seat, id } = hand.discard,
    kind = kindOf(id),
    last = liveLeft(hand) <= 0,
    claims = {};
  for (let i = 1; i < 4; i++) {
    const other = (seat + i) % 4,
      them = hand.players[other],
      counts = countsOf(kindsIn(them.hand)),
      option = {};
    counts[kind]++;
    if (isWinning(counts, needOf(them))) option.win = true;
    counts[kind]--;
    if (!last) {
      if (counts[kind] >= 2) option.pong = true;
      if (counts[kind] >= 3) option.kong = true;
      if (i === 1 && kind < 27) {
        const chows = chowsFor(them.hand, kind);
        if (chows.length) option.chows = chows;
      }
    }
    if (Object.keys(option).length) claims[other] = option;
  }
  hand.claims = claims;
  hand.answers = {};
  hand.phase = 'claim';
  if (Object.keys(claims).length === 0) nextTurn(match);
}

/** The pairs of tile ids in a hand that run with a discarded kind. */
export function chowsFor(ids, kind) {
  const suit = suitOf(kind),
    rank = kind % 9,
    out = [];
  const pick = (k) => ids.find((id) => kindOf(id) === k);
  for (const [a, b] of [
    [-2, -1],
    [-1, 1],
    [1, 2]
  ]) {
    const ra = rank + a,
      rb = rank + b;
    if (ra < 0 || rb > 8) continue;
    const ka = suit * 9 + ra,
      kb = suit * 9 + rb,
      ia = pick(ka),
      ib = pick(kb);
    if (ia !== undefined && ib !== undefined) out.push([ia, ib]);
  }
  return out;
}

function nextTurn(match) {
  const hand = match.hand,
    next = (hand.discard.seat + 1) % 4;
  hand.claims = null;
  hand.answers = null;
  if (liveLeft(hand) <= 0) return exhausted(match);
  draw(match, next, false);
}

function resolveClaims(match) {
  const hand = match.hand,
    { seat: from, id } = hand.discard,
    order = [1, 2, 3].map((i) => (from + i) % 4);
  const winner = order.find((s) => hand.answers[s]?.type === 'win');
  if (winner !== undefined) {
    hand.players[winner].hand.push(id);
    takeDiscard(hand, from);
    return finishWin(match, winner, from, { winTile: id });
  }
  const taker = order.find((s) => ['pong', 'kong'].includes(hand.answers[s]?.type)) ?? order.find((s) => hand.answers[s]?.type === 'chow');
  if (taker === undefined) return nextTurn(match);
  const answer = hand.answers[taker],
    player = hand.players[taker],
    kind = kindOf(id);
  takeDiscard(hand, from);
  hand.called = true;
  hand.claims = null;
  hand.answers = null;
  let tiles;
  if (answer.type === 'chow') {
    tiles = [...answer.ids.slice(0, 2), id].sort((a, b) => kindOf(a) - kindOf(b));
    for (const t of answer.ids.slice(0, 2)) player.hand.splice(player.hand.indexOf(t), 1);
  } else {
    const count = answer.type === 'kong' ? 3 : 2,
      mine = player.hand.filter((t) => kindOf(t) === kind).slice(0, count);
    for (const t of mine) player.hand.splice(player.hand.indexOf(t), 1);
    tiles = [...mine, id];
  }
  player.melds.push({ type: answer.type, how: answer.type === 'kong' ? 'open' : undefined, tiles, from, taken: id });
  hand.events.push({ type: answer.type, seat: taker, from, id, tiles });
  hand.turn = taker;
  if (answer.type === 'kong') {
    hand.kongs++;
    return draw(match, taker, true);
  }
  hand.phase = 'act';
  hand.drawn = null;
  hand.selfDrew = false;
  hand.kongDraw = false;
}

function takeDiscard(hand, from) {
  const pile = hand.players[from].discards;
  pile[pile.length - 1].taken = true;
}

function resolveRob(match) {
  const hand = match.hand,
    { seat, id } = hand.rob,
    order = [1, 2, 3].map((i) => (seat + i) % 4),
    winner = order.find((s) => hand.answers[s]?.type === 'win');
  hand.claims = null;
  hand.answers = null;
  hand.phase = 'act';
  if (winner === undefined) {
    hand.rob = null;
    return completeAddedKong(match, seat, id);
  }
  hand.players[seat].hand.splice(hand.players[seat].hand.indexOf(id), 1);
  hand.players[winner].hand.push(id);
  hand.rob = null;
  finishWin(match, winner, seat, { robbed: true, winTile: id });
}

/** A win: score it, pay it, close the hand. `from` is the payer on a discard, null on a self-draw. */
function finishWin(match, seat, from, flags) {
  const hand = match.hand,
    winTile = flags.special ? null : from === null ? hand.drawn : flags.winTile;
  const score = scoreWin(match, seat, {
    from,
    winTile,
    special: flags.special,
    robbed: !!flags.robbed,
    kongDraw: from === null && hand.kongDraw,
    lastTile: liveLeft(hand) <= 0,
    firstTurn: !hand.called && hand.players[seat].firstTurn
  });
  const payments = [0, 0, 0, 0],
    payers = from === null ? [0, 1, 2, 3].filter((s) => s !== seat) : [from],
    dealerTai = 1 + 2 * match.streak;
  for (const payer of payers) {
    const extra = seat === match.dealer || payer === match.dealer ? dealerTai : 0,
      amount = RULES.base + (score.total + extra) * RULES.perTai;
    payments[payer] -= amount;
    payments[seat] += amount;
  }
  hand.phase = 'done';
  hand.result = { kind: 'win', seat, from, score, payments, dealerTai, winTile };
  hand.events.push({ type: 'win', seat, from, self: from === null });
  closeHand(match);
}

/** Pay, record, and move the deal on or keep it. */
function closeHand(match) {
  const hand = match.hand,
    result = hand.result;
  if (result.payments) for (let s = 0; s < 4; s++) match.scores[s] += result.payments[s];
  const keeps = result.kind === 'draw' || result.seat === match.dealer;
  match.history.push({ number: match.played, wind: match.wind, dealer: match.dealer, streak: match.streak, calls: hand.players.map((p) => p.melds.filter((m) => m.how !== 'closed').length), result: { ...result, score: result.score && { items: result.score.items, total: result.score.total } } });
  match.played++;
  if (keeps) match.streak++;
  else {
    match.streak = 0;
    match.dealer = (match.dealer + 1) % 4;
    match.passes++;
    if (match.passes >= 4) {
      match.passes = 0;
      match.wind++;
      if (match.wind >= match.rounds) match.over = true;
    }
  }
}

/** The tiles a seat can see: its own hand, every discard left in a river, every meld. */
export function seenBy(match, seat) {
  const hand = match.hand,
    seen = countsOf(kindsIn(hand.players[seat].hand));
  for (const player of hand.players) {
    for (const d of player.discards) if (!d.taken) seen[kindOf(d.id)]++;
    for (const meld of player.melds) {
      if (meld.how === 'closed' && player !== hand.players[seat]) continue;
      for (const id of meld.tiles) seen[kindOf(id)]++;
    }
  }
  return seen.map((n) => Math.min(4, n));
}

/** The kinds a seat's hand waits on now (for a hand of 3·need + 1). */
export function waitsFor(match, seat) {
  const player = match.hand.players[seat];
  return waitsOf(countsOf(kindsIn(player.hand)), needOf(player));
}
