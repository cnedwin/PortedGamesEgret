// 战斗：回合状态机、能量、牌库、伤害结算、羁绊。
//
// 这一层不碰显示对象，也不自己播动画：它只改状态、吐事件。
// 表现层拿到事件表自己决定怎么演。判定和演出分开，改动画才不会崩判定。

import {
  ELEMENTS,
  EMPTY,
  WILD,
  adjacent,
  collapse,
  createBoard,
  findAndClear,
  findRuns,
  hasMove,
  index,
  reshuffle,
  spreadSpecials,
  swapCells,
  xOf,
  yOf,
} from './board.mjs';
import { CARDS, CARD_BY_ID, ELEMENT_ORDER, STARTER_DECK, cardById } from './cards.mjs';
import { createRng } from './rng.mjs';

/** 相生（字符串版）：木生火、火生土、土生金、金生水、水生木。 */
export const FEEDS = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
/** 相克：木克土、土克水、水克火、火克金、金克木。 */
export const BEATS = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };

export const ENERGY_CAP = 10;
export const HAND_CAP = 5;
export const STEPS_PER_TURN = 3;

/** 连锁倍率：1 / 1.25 / 1.6 / 2.0 / 2.5 / 3.0，第六层封顶。 */
export const CHAIN_STEPS = [1, 1.25, 1.6, 2, 2.5, 3];
export const chainMultiplier = (chain) => CHAIN_STEPS[Math.min(Math.max(chain, 1), CHAIN_STEPS.length) - 1];

/** 消除产出：三消 1 能量，四消 2，五消及以上 3。 */
export const energyFor = (clearedCount) => (clearedCount >= 5 ? 3 : clearedCount >= 4 ? 2 : 1);

export const ENEMIES = [
  {
    id: 'shanjiao',
    name: '山魈',
    title: '守林的山魈',
    element: 'earth',
    maxHp: 520,
    maxCountdown: 4,
    moves: [
      { name: '扑击', damage: 85 },
      { name: '抓挠', damage: 70, weaken: 1 },
      { name: '咆哮', damage: 110 },
    ],
  },
  {
    id: 'chijiao',
    name: '赤蛟',
    title: '断桥下的赤蛟',
    element: 'water',
    maxHp: 900,
    maxCountdown: 3,
    moves: [
      { name: '翻浪', damage: 105 },
      { name: '毒涎', damage: 70, poison: { amount: 35, turns: 3 } },
      { name: '卷浪', damage: 140 },
    ],
  },
  {
    id: 'hundun',
    name: '混沌',
    title: '阵眼的混沌',
    element: 'metal',
    maxHp: 1500,
    maxCountdown: 3,
    moves: [
      { name: '碾压', damage: 130 },
      { name: '凝甲', damage: 60, shield: 160 },
      { name: '崩解', damage: 180 },
    ],
  },
];

export const BONDS = {
  swordShield: {
    name: '剑盾同源',
    text: '打出护盾卡的当回合，攻击额外造成「当前护盾 50%」的伤害。',
    hint: '先盾后攻',
  },
  samadhi: {
    name: '三昧',
    text: '每打出 3 张火卡，免费触发一次全屏灼烧。',
    hint: '为了凑第 3 张会留牌',
  },
  echo: {
    name: '残响',
    text: '辅助卡之后的第一张攻击卡，效果再触发一次。',
    hint: '出牌顺序变成核心思考',
  },
  chainBody: {
    name: '连锁体质',
    text: '连锁 3 层以上时，所有伤害 +30%。',
    hint: '会为了拉连锁放弃眼前的好消',
  },
  starlane: {
    name: '星轨',
    text: '消除万能块时，随机一张手牌费用 -1。',
    hint: '会优先找万能块',
  },
};

/** 牌组里够格触发哪些羁绊。 */
export function detectBonds(cards) {
  const bonds = [];
  const hasTag = (tag) => cards.some((card) => card.tags.includes(tag));
  const countOf = (element) => cards.filter((card) => card.element === element).length;
  if (hasTag('盾') && hasTag('剑')) bonds.push('swordShield');
  if (countOf('fire') >= 3) bonds.push('samadhi');
  if (cards.some((card) => card.kind === 'support') && cards.some((card) => card.kind === 'attack')) bonds.push('echo');
  if (cards.filter((card) => card.chain).length >= 2) bonds.push('chainBody');
  if (cards.length >= 2) bonds.push('starlane');
  return bonds;
}

export function createBattle({ seed = 1, deck = STARTER_DECK, enemy = ENEMIES[0], heroHp = 1000 } = {}) {
  const rng = createRng(seed);
  const deckCards = deck.map((id) => cardById(id)).filter(Boolean);

  const battle = {
    seed,
    rng,
    turn: 1,
    steps: STEPS_PER_TURN,
    phase: 'player',
    board: createBoard({ size: 7, rng, weights: dropWeights(deckCards) }),
    energy: Object.fromEntries(ELEMENT_ORDER.map((element) => [element, 0])),
    hero: { hp: heroHp, maxHp: heroHp, shield: 0, poison: 0, poisonTurns: 0, regrow: 0 },
    enemy: {
      ...enemy,
      hp: enemy.maxHp,
      shield: 0,
      countdown: enemy.maxCountdown,
      poison: 0,
      poisonTurns: 0,
      moveIndex: 0,
    },
    deck: deckCards.map((card) => ({ ...card, uid: `${card.id}-${rng.int(1e9)}` })),
    hand: [],
    discard: [],
    bonds: detectBonds(deckCards),
    buffs: { nextAttack: 1, shieldStrike: 0, echoReady: false },
    firePlayed: 0,
    turnChain: 0,
    bestChain: 0,
    previousCard: null,
    playedThisTurn: [],
    log: [],
    floodKind: null,
    over: null,
  };

  // 起手五张
  drawCards(battle, 5);
  return battle;
}

/** 掉落权重向牌组倾斜：主元素三成，其余均分，避免"全火牌组十分钟不掉火"。 */
export function dropWeights(cards) {
  const tally = Object.fromEntries(ELEMENT_ORDER.map((element) => [element, 0]));
  for (const card of cards) tally[card.element] += 1;
  const total = cards.length || 1;
  return ELEMENT_ORDER.map((element) => 0.12 + (tally[element] / total) * 1.4);
}

// ── 牌库 ────────────────────────────────────────────────────────

export function drawCards(battle, n) {
  const drawn = [];
  for (let i = 0; i < n; i += 1) {
    if (battle.hand.length >= HAND_CAP) break;
    if (!battle.deck.length) {
      if (!battle.discard.length) break;
      battle.deck = battle.rng.shuffle(battle.discard);
      battle.discard = [];
    }
    const card = battle.deck.pop();
    battle.hand.push(card);
    drawn.push(card);
  }
  return drawn;
}

export const totalEnergy = (battle) => ELEMENT_ORDER.reduce((sum, element) => sum + battle.energy[element], 0);

export const canPlay = (battle, uid) => {
  const card = battle.hand.find((item) => item.uid === uid);
  if (!card) return false;
  if (battle.phase !== 'player') return false;
  if (battle.energy[card.element] < card.cost) return false;
  return true;
};

// ── 出牌 ────────────────────────────────────────────────────────

/**
 * 打出一张牌。返回事件表，交给表现层去演。
 * 牌不合法就返回 null，什么都不改。
 */
export function playCard(battle, uid) {
  const handIndex = battle.hand.findIndex((item) => item.uid === uid);
  if (handIndex < 0) return null;
  const card = battle.hand[handIndex];
  if (!canPlay(battle, uid)) return null;

  battle.energy[card.element] -= card.cost;
  battle.hand.splice(handIndex, 1);
  battle.discard.push(card);
  // 相生要看"上一张"，所以在把这张塞进记录之前先记住上一张
  battle.previousCard = battle.playedThisTurn.at(-1) ?? null;
  battle.playedThisTurn.push(card);

  const events = [{ type: 'cast', card }];
  const times = battle.buffs.echoReady && card.kind === 'attack' ? 2 : 1;
  if (times > 1) {
    battle.buffs.echoReady = false;
    events.push({ type: 'echo' });
  }

  for (let round = 0; round < times; round += 1) {
    for (const effect of card.effects) applyEffect(battle, card, effect, events, round);
  }

  // 剑盾同源：护盾卡之后的攻击，按当前护盾加一刀
  if (battle.bonds.includes('swordShield')) {
    if (card.kind === 'guard') battle.buffs.shieldStrike = Math.round(battle.hero.shield * 0.5);
    else if (card.kind === 'attack' && battle.buffs.shieldStrike > 0) {
      const bonus = battle.buffs.shieldStrike;
      battle.buffs.shieldStrike = 0;
      events.push({ type: 'bond', id: 'swordShield' });
      dealDamage(battle, bonus, { pierce: false, source: '剑盾同源', events });
    }
  }

  // 残响：辅助卡让下一张攻击卡再触发一次
  if (battle.bonds.includes('echo') && card.kind === 'support') battle.buffs.echoReady = true;

  // 三昧：每三张火卡免费灼烧
  if (battle.bonds.includes('samadhi') && card.element === 'fire') {
    battle.firePlayed += 1;
    if (battle.firePlayed % 3 === 0) {
      events.push({ type: 'bond', id: 'samadhi' });
      scorchBoard(battle, 'fire', events);
      dealDamage(battle, 150, { pierce: true, source: '三昧', events });
    }
  }

  if (battle.enemy.hp <= 0) {
    finish(battle, 'win', events);
    return events;
  }

  // 卡牌改了棋盘就得接着结算，否则会留下一条空洞
  if (events.some((event) => event.type === 'paint' || event.type === 'clear' || event.type === 'flood')) {
    events.push(...settle(battle, 1));
  }
  return events;
}

function applyEffect(battle, card, effect, events, round) {
  switch (effect.do) {
    case 'damage': {
      const hits = effect.hits ?? 1;
      for (let hit = 0; hit < hits; hit += 1) {
        const amount = damageOf(battle, card, effect);
        dealDamage(battle, amount, { pierce: effect.pierce, source: card.name, events, crit: effect.pierce });
      }
      break;
    }
    case 'shield': {
      battle.hero.shield += effect.amount;
      events.push({ type: 'shield', amount: effect.amount });
      break;
    }
    case 'heal': {
      const before = battle.hero.hp;
      battle.hero.hp = Math.min(battle.hero.maxHp, battle.hero.hp + effect.amount);
      events.push({ type: 'heal', amount: battle.hero.hp - before });
      break;
    }
    case 'poison': {
      battle.enemy.poison = Math.max(battle.enemy.poison, effect.amount);
      battle.enemy.poisonTurns = Math.max(battle.enemy.poisonTurns, effect.turns);
      events.push({ type: 'poison', amount: effect.amount, turns: effect.turns });
      break;
    }
    case 'regrow': {
      battle.hero.regrow += effect.amount;
      events.push({ type: 'regrow', amount: effect.amount });
      break;
    }
    case 'draw': {
      const drawn = drawCards(battle, effect.n);
      events.push({ type: 'draw', cards: drawn });
      break;
    }
    case 'delay': {
      battle.enemy.countdown += effect.n;
      events.push({ type: 'delay', amount: effect.n });
      break;
    }
    case 'buff': {
      if (effect.nextAttack) battle.buffs.nextAttack = effect.nextAttack;
      events.push({ type: 'buff', nextAttack: effect.nextAttack });
      break;
    }
    case 'paint': {
      const cells = paintCells(battle, effect.where, effect.kind);
      if (cells.length) events.push({ type: 'paint', cells, kind: effect.kind });
      break;
    }
    case 'clear': {
      const cells = clearCells(battle, effect.where);
      if (cells.length) events.push({ type: 'clear', cells });
      break;
    }
    case 'flood': {
      battle.floodKind = effect.kind;
      events.push({ type: 'flood', kind: effect.kind });
      break;
    }
    default:
      break;
  }
  void round;
}

/** 一次伤害的数值：卡面数值 × 相生 × 相克 × 加成。 */
export function damageOf(battle, card, effect) {
  let amount = effect.scaleShield ? Math.round(battle.hero.shield * effect.scaleShield) : effect.amount;
  if (effect.perChain) amount += battle.turnChain * effect.perChain;

  if (battle.previousCard && FEEDS[battle.previousCard.element] === card.element) amount *= 1.5;
  if (BEATS[card.element] === battle.enemy.element) amount *= 1.3;
  else if (BEATS[battle.enemy.element] === card.element) amount *= 0.7;

  if (card.kind === 'attack' && battle.buffs.nextAttack > 1) {
    amount *= battle.buffs.nextAttack;
    battle.buffs.nextAttack = 1;
  }
  if (battle.bonds.includes('chainBody') && battle.turnChain >= 3) amount *= 1.3;
  return Math.round(amount);
}

function dealDamage(battle, amount, { pierce = false, source = '', events, crit = false } = {}) {
  let left = amount;
  if (!pierce && battle.enemy.shield > 0) {
    const absorbed = Math.min(battle.enemy.shield, left);
    battle.enemy.shield -= absorbed;
    left -= absorbed;
    events.push({ type: 'absorb', amount: absorbed });
  }
  battle.enemy.hp = Math.max(0, battle.enemy.hp - left);
  events.push({ type: 'damage', amount: left, total: amount, source, crit, to: 'enemy' });
  if (battle.enemy.hp <= 0) finish(battle, 'win', events);
  return left;
}

function finish(battle, result, events) {
  if (battle.over) return;
  battle.over = result;
  battle.phase = 'over';
  events.push({ type: 'over', result });
}

// ── 改棋盘 ──────────────────────────────────────────────────────

export function paintCells(battle, where, kind) {
  const board = battle.board;
  const colour = ELEMENTS.indexOf(kind);
  if (colour < 0) return [];
  const targets = [];
  const push = (i) => {
    if (board.kind[i] === EMPTY) return;
    if (board.kind[i] === colour) return;
    targets.push(i);
  };

  if (where.type === 'col') {
    for (let y = 0; y < board.size; y += 1) push(index(board, where.index, y));
  } else if (where.type === 'row') {
    for (let x = 0; x < board.size; x += 1) push(index(board, x, where.index));
  } else if (where.type === 'random') {
    const pool = [];
    for (let i = 0; i < board.kind.length; i += 1) if (board.kind[i] !== EMPTY && board.kind[i] !== colour) pool.push(i);
    battle.rng.shuffle(pool);
    for (const i of pool.slice(0, where.count)) push(i);
  } else if (where.type === 'all') {
    for (let i = 0; i < board.kind.length; i += 1) push(i);
  }

  for (const i of targets) {
    board.kind[i] = colour;
    board.special[i] = 0;
  }
  return targets;
}

export function clearCells(battle, where) {
  const board = battle.board;
  const seeds = [];
  if (where.type === 'row') {
    for (let x = 0; x < board.size; x += 1) seeds.push(index(board, x, where.index));
  } else if (where.type === 'col') {
    const cols = [];
    if (where.index === 'random') {
      for (let x = 0; x < board.size; x += 1) cols.push(x);
      battle.rng.shuffle(cols);
    } else cols.push(where.index);
    const count = where.count ?? 1;
    for (const x of cols.slice(0, count)) for (let y = 0; y < board.size; y += 1) seeds.push(index(board, x, y));
  } else if (where.type === 'rows') {
    for (let y = where.from; y <= where.to; y += 1) for (let x = 0; x < board.size; x += 1) seeds.push(index(board, x, y));
  } else if (where.type === 'cross') {
    const cx = battle.rng.int(board.size);
    const cy = battle.rng.int(board.size);
    for (let x = 0; x < board.size; x += 1) seeds.push(index(board, x, cy));
    for (let y = 0; y < board.size; y += 1) seeds.push(index(board, cx, y));
  }

  const { cells } = spreadSpecials(board, seeds, {});
  const cleared = [];
  for (const i of cells) {
    if (board.kind[i] === EMPTY) continue;
    cleared.push(i);
    board.kind[i] = EMPTY;
    board.special[i] = 0;
  }
  return cleared;
}

/** 全屏灼烧：把某色的格子全清掉（三昧用）。 */
function scorchBoard(battle, kind, events) {
  const colour = ELEMENTS.indexOf(kind);
  const seeds = [];
  for (let i = 0; i < battle.board.kind.length; i += 1) if (battle.board.kind[i] === colour) seeds.push(i);
  const { cells } = spreadSpecials(battle.board, seeds, {});
  const cleared = [];
  for (const i of cells) {
    if (battle.board.kind[i] === EMPTY) continue;
    cleared.push(i);
    battle.board.kind[i] = EMPTY;
    battle.board.special[i] = 0;
  }
  if (cleared.length) events.push({ type: 'clear', cells: cleared, scorch: true });
}

// ── 交换与连锁 ──────────────────────────────────────────────────

/**
 * 玩家把 a 拖到 b，并把这一手彻底走完：交换 → 清空 → 下落 → 再判定，直到没有可消的。
 *
 * 一次调用走完，是因为设计文档那条硬要求：判定在交换确认的同一帧完成，动画只是事后表演。
 * 判定和动画分两次算，一旦有一帧对不上，就会出现"我明明消了它没反应"。
 *
 * 返回事件表；交换不合法返回 null，棋盘原样退回。
 *
 * 特殊块和任何一格交换都算合法——这是三消里最基础的期待，
 * 少了它，玩家把彩虹块拖到别的格子上没反应会觉得游戏坏了。
 */
export function swapAndSettle(battle, a, b) {
  if (battle.phase !== 'player') return null;
  if (battle.steps <= 0) return null;
  const board = battle.board;
  if (!adjacent(board, a, b)) return null;
  if (board.kind[a] === EMPTY || board.kind[b] === EMPTY) return null;

  const specialA = board.special[a];
  const specialB = board.special[b];
  const specialSwap = specialA !== 0 || specialB !== 0;

  swapCells(board, a, b);
  const { runs } = findRuns(board);
  if (!runs.length && !specialSwap) {
    swapCells(board, a, b);
    return null;
  }

  battle.steps -= 1;
  battle.enemy.countdown -= 1;
  const events = [{ type: 'swap', a, b, special: specialSwap }];

  if (specialA !== 0 && specialB !== 0) {
    // 两个特殊块一起换：全屏清。这是全场最该爽的一下，演出预算往这儿堆
    events.push({ type: 'combo' });
    const cells = [];
    for (let i = 0; i < board.kind.length; i += 1) {
      if (board.kind[i] === EMPTY) continue;
      cells.push({ index: i, kind: board.kind[i], special: board.special[i], x: xOf(board, i), y: yOf(board, i) });
      board.kind[i] = EMPTY;
      board.special[i] = 0;
    }
    events.push({ type: 'clearStep', chain: 1, cleared: cells, spawned: [], triggered: [], combo: true });
  } else {
    // 只换了一个特殊块时，拿另一个的颜色去触发彩虹
    const rainbowKind = specialA !== 0 ? board.kind[a] : board.kind[b];
    const result = findAndClear(board, { swap: [a, b], rainbowKind: specialSwap ? rainbowKind : null });
    if (result) {
      events.push({ type: 'clearStep', chain: 1, ...result });
      applyClearEnergy(battle, [events.at(-1)]);
    }
  }

  events.push(...settle(battle, 1));
  return events;
}

/**
 * 补下落，再看有没有新的一手，一直跑到没有可消的。
 *
 * 交换之后要走一遍，卡牌改完棋盘之后也要走一遍——不然打了张"清一整行"的卡，
 * 棋盘上会留着一条空洞，玩家会以为游戏坏了。
 */
export function settle(battle, startChain = 1) {
  const events = [];
  const board = battle.board;
  let chain = startChain;
  let guard = 0;
  for (;;) {
    const { drops, fills } = collapse(board, battle.rng, { fillKind: battle.floodKind });
    battle.floodKind = null;
    events.push({ type: 'fall', drops, fills, chain });
    const result = findAndClear(board, {});
    if (!result) break;
    chain += 1;
    events.push({ type: 'clearStep', chain, ...result });
    applyClearEnergy(battle, [events.at(-1)]);
    guard += 1;
    if (guard > 40) break;
  }

  battle.turnChain = Math.max(battle.turnChain, chain);
  battle.bestChain = Math.max(battle.bestChain, chain);

  if (!hasMove(board)) {
    reshuffle(board, battle.rng);
    events.push({ type: 'reshuffle' });
  }
  return events;
}

/** 把一步消掉的格子折成能量，顺手结算星轨。 */
function applyClearEnergy(battle, events) {
  let clearedTotal = 0;
  let wildCleared = 0;
  let colour = -1;
  for (const event of events) {
    const cells = event.cleared ?? [];
    for (const cell of cells) {
      clearedTotal += 1;
      if (cell.kind === WILD) wildCleared += 1;
      else if (colour < 0) colour = cell.kind;
    }
  }
  if (!clearedTotal) return;

  // 能量给"这一步消得最多的那种颜色"——玩家消什么就攒什么，因果才对得上
  const tally = new Map();
  for (const event of events) {
    for (const cell of event.cleared ?? []) {
      if (cell.kind === WILD) continue;
      tally.set(cell.kind, (tally.get(cell.kind) ?? 0) + 1);
    }
  }
  let best = colour >= 0 ? colour : 0;
  let count = -1;
  for (const [value, n] of tally) {
    if (n > count) {
      count = n;
      best = value;
    }
  }

  const gain = energyFor(clearedTotal);
  const element = ELEMENTS[best];
  battle.energy[element] = Math.min(ENERGY_CAP, battle.energy[element] + gain);

  // 能量球的起点取这一手消掉格子的重心：眼睛要看到"我消的是这儿，能量飞到那儿"
  let sum = 0;
  let n = 0;
  for (const event of events) for (const cell of event.cleared ?? []) {
    sum += cell.index;
    n += 1;
  }
  events.push({ type: 'energy', element, amount: gain, from: n ? Math.round(sum / n) : -1 });

  if (wildCleared && battle.bonds.includes('starlane')) {
    const candidates = battle.hand.filter((card) => card.cost > 1);
    if (candidates.length) {
      const card = battle.rng.pick(candidates);
      card.cost -= 1;
      events.push({ type: 'bond', id: 'starlane', card });
    }
  }
}

/**
 * 拖动时的预览：这一换会让哪些格子消失。
 * 设计文档 4.1 那条"实时高亮将被消除的格子"靠它——不做这一步，玩家会觉得游戏不听话。
 */
export function previewSwap(battle, a, b) {
  const board = battle.board;
  if (!adjacent(board, a, b)) return [];
  if (board.kind[a] === EMPTY || board.kind[b] === EMPTY) return [];
  swapCells(board, a, b);
  const { runs } = findRuns(board);
  swapCells(board, a, b);
  const cells = new Set();
  for (const run of runs) for (const i of run.cells) cells.add(i);
  if (board.special[a] !== 0 || board.special[b] !== 0) {
    cells.add(a);
    cells.add(b);
  }
  return [...cells];
}

// ── 回合 ────────────────────────────────────────────────────────

export function endTurn(battle) {
  if (battle.phase !== 'player') return [];
  const events = [];
  battle.phase = 'enemy';
  events.push(...enemyTurn(battle));
  if (battle.over) return events;

  battle.turn += 1;
  battle.steps = STEPS_PER_TURN;
  battle.turnChain = 0;
  battle.playedThisTurn = [];
  battle.previousCard = null;
  battle.buffs.shieldStrike = 0;
  battle.hero.shield = 0;
  battle.phase = 'player';
  const drawn = drawCards(battle, 2);
  events.push({ type: 'turn', turn: battle.turn, drawn });

  if (!hasMove(battle.board)) {
    reshuffle(battle.board, battle.rng);
    events.push({ type: 'reshuffle' });
  }
  return events;
}

/** 敌人行动。倒计时归零才动手。 */
export function enemyTurn(battle) {
  const events = [];

  if (battle.enemy.poisonTurns > 0) {
    const tick = battle.enemy.poison;
    battle.enemy.hp = Math.max(0, battle.enemy.hp - tick);
    battle.enemy.poisonTurns -= 1;
    events.push({ type: 'poisonTick', amount: tick, to: 'enemy' });
    if (battle.enemy.hp <= 0) {
      finish(battle, 'win', events);
      return events;
    }
  }

  if (battle.hero.regrow > 0) {
    const before = battle.hero.hp;
    battle.hero.hp = Math.min(battle.hero.maxHp, battle.hero.hp + battle.hero.regrow);
    events.push({ type: 'heal', amount: battle.hero.hp - before, regrow: true });
  }

  if (battle.hero.poisonTurns > 0) {
    battle.hero.hp = Math.max(0, battle.hero.hp - battle.hero.poison);
    battle.hero.poisonTurns -= 1;
    events.push({ type: 'poisonTick', amount: battle.hero.poison, to: 'hero' });
    if (battle.hero.hp <= 0) {
      finish(battle, 'lose', events);
      return events;
    }
  }

  if (battle.enemy.countdown > 0) {
    events.push({ type: 'wait', countdown: battle.enemy.countdown });
    return events;
  }

  const move = battle.enemy.moves[battle.enemy.moveIndex % battle.enemy.moves.length];
  battle.enemy.moveIndex += 1;
  battle.enemy.countdown = battle.enemy.maxCountdown;

  let damage = move.damage;
  if (BEATS[battle.enemy.element] === 'fire') damage = Math.round(damage * 1.0);
  let left = damage;
  if (battle.hero.shield > 0) {
    const absorbed = Math.min(battle.hero.shield, left);
    battle.hero.shield -= absorbed;
    left -= absorbed;
    events.push({ type: 'absorb', amount: absorbed, to: 'hero' });
  }
  battle.hero.hp = Math.max(0, battle.hero.hp - left);
  events.push({ type: 'damage', amount: left, total: damage, to: 'hero', source: move.name });

  if (move.shield) {
    battle.enemy.shield += move.shield;
    events.push({ type: 'shield', amount: move.shield, to: 'enemy' });
  }
  if (move.poison) {
    battle.hero.poison = Math.max(battle.hero.poison, move.poison.amount);
    battle.hero.poisonTurns = Math.max(battle.hero.poisonTurns, move.poison.turns);
    events.push({ type: 'poison', amount: move.poison.amount, turns: move.poison.turns, to: 'hero' });
  }

  if (battle.hero.hp <= 0) finish(battle, 'lose', events);
  return events;
}

/** 敌人下一手是什么，用来在血条下面写意图。 */
export function enemyIntent(battle) {
  if (battle.enemy.countdown > 0) return null;
  const move = battle.enemy.moves[battle.enemy.moveIndex % battle.enemy.moves.length];
  return move;
}

// ── 奖励与牌组 ──────────────────────────────────────────────────

/** 三选一：优先给牌组里没有的元素，避免奖励全是同一色。 */
export function rewardChoices(battle, count = 3) {
  const owned = new Set([...battle.deck, ...battle.hand, ...battle.discard].map((card) => card.id));
  const ownedElements = new Set([...battle.deck, ...battle.hand, ...battle.discard].map((card) => card.element));
  const pool = CARDS.filter((card) => !owned.has(card.id));
  const fresh = pool.filter((card) => !ownedElements.has(card.element));
  const picks = [];
  const takeFrom = (list) => {
    const copy = battle.rng.shuffle([...list]);
    for (const card of copy) {
      if (picks.length >= count) break;
      if (picks.some((item) => item.id === card.id)) continue;
      picks.push(card);
    }
  };
  takeFrom(fresh);
  takeFrom(pool);
  return picks;
}

export function addCard(battle, card) {
  battle.deck.push({ ...card, uid: `${card.id}-${battle.rng.int(1e9)}` });
  battle.bonds = detectBonds([...battle.deck, ...battle.hand, ...battle.discard]);
}

/** 给测试和调试用：把棋盘摆成指定样子。 */
export function debugSetBoard(battle, rows) {
  const board = battle.board;
  rows.forEach((row, y) => {
    [...row.replaceAll(' ', '')].forEach((char, x) => {
      const i = index(board, x, y);
      board.kind[i] = char === '.' ? EMPTY : Number(char);
      board.special[i] = 0;
    });
  });
  return board;
}

export const cellX = (battle, i) => xOf(battle.board, i);
export const cellY = (battle, i) => yOf(battle.board, i);
export const cardOf = (uid) => CARD_BY_ID.get(uid);
