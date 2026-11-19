// 三十张卡。
//
// 每张卡的效果是一串动词，不写函数。这样数值能整体外置、能被测试逐条跑，
// 也能让"这张卡到底改了什么"一眼看完——牌多了之后，函数式效果一定会失控。
//
// 三条硬规矩（来自设计文档 5.2）：
//   1. 费用色 = 它要的消除色。没有"任意色"的万能牌。
//   2. 至少四成卡要改造棋盘，纯伤害卡不超过一半。
//   3. 文字描述不超过两行。

export const FIRE = 'fire';
export const EARTH = 'earth';
export const METAL = 'metal';
export const WATER = 'water';
export const WOOD = 'wood';

export const ELEMENT_ORDER = [FIRE, EARTH, METAL, WATER, WOOD];

export const ELEMENT_INFO = {
  fire: { name: '火', color: '#e8564d', deep: '#8f2320', role: '爆发直伤', shape: 'diamond' },
  earth: { name: '土', color: '#d9a441', deep: '#7a5718', role: '护盾反击', shape: 'hex' },
  metal: { name: '金', color: '#cfd8e3', deep: '#6b7785', role: '破甲暴击', shape: 'square' },
  water: { name: '水', color: '#4f8fd6', deep: '#1d3f6b', role: '控场改盘', shape: 'circle' },
  wood: { name: '木', color: '#5aa86b', deep: '#245c33', role: '持续成长', shape: 'leaf' },
};

/** 器物标签，用来判羁绊。 */
export const TAGS = {
  SWORD: '剑',
  SHIELD: '盾',
  TALISMAN: '符',
  PILL: '丹',
  LUTE: '琴',
};

export const CARDS = [
  // ── 火 · 爆发直伤 ─────────────────────────────────────────────
  {
    id: 'fire-spark',
    name: '焚心',
    element: FIRE,
    cost: 1,
    rarity: 'common',
    kind: 'attack',
    tags: [TAGS.SWORD],
    chain: true,
    text: '造成 70 伤害。',
    effects: [{ do: 'damage', amount: 70 }],
  },
  {
    id: 'fire-slash',
    name: '烈焰斩',
    element: FIRE,
    cost: 2,
    rarity: 'common',
    kind: 'attack',
    tags: [TAGS.SWORD],
    chain: true,
    text: '造成 130 伤害。\n把最左一列染成火。',
    effects: [
      { do: 'damage', amount: 130 },
      { do: 'paint', where: { type: 'col', index: 0 }, kind: 'fire' },
    ],
  },
  {
    id: 'fire-spread',
    name: '燎原',
    element: FIRE,
    cost: 3,
    rarity: 'rare',
    kind: 'attack',
    tags: [TAGS.TALISMAN],
    chain: true,
    text: '造成 190 伤害。\n本回合每层连锁再 +30。',
    effects: [{ do: 'damage', amount: 190, perChain: 30 }],
  },
  {
    id: 'fire-pierce',
    name: '赤焰突',
    element: FIRE,
    cost: 2,
    rarity: 'rare',
    kind: 'attack',
    tags: [TAGS.SWORD],
    chain: true,
    text: '造成 140 伤害，无视护盾。',
    effects: [{ do: 'damage', amount: 140, pierce: true }],
  },
  {
    id: 'fire-seed',
    name: '火种',
    element: FIRE,
    cost: 1,
    rarity: 'common',
    kind: 'support',
    tags: [TAGS.TALISMAN],
    text: '抽 1 张牌。\n随机 4 格染成火。',
    effects: [
      { do: 'draw', n: 1 },
      { do: 'paint', where: { type: 'random', count: 4 }, kind: 'fire' },
    ],
  },
  {
    id: 'fire-ult',
    name: '三昧真火',
    element: FIRE,
    cost: 4,
    rarity: 'epic',
    kind: 'attack',
    tags: [TAGS.SWORD, TAGS.TALISMAN],
    chain: true,
    ult: true,
    text: '造成 420 伤害。\n清除整行与整列各一道。',
    effects: [
      { do: 'damage', amount: 420 },
      { do: 'clear', where: { type: 'cross' } },
    ],
  },

  // ── 土 · 护盾反击 ─────────────────────────────────────────────
  {
    id: 'earth-wall',
    name: '磐石盾',
    element: EARTH,
    cost: 1,
    rarity: 'common',
    kind: 'guard',
    tags: [TAGS.SHIELD],
    text: '获得 90 护盾。',
    effects: [{ do: 'shield', amount: 90 }],
  },
  {
    id: 'earth-bulwark',
    name: '大地之壁',
    element: EARTH,
    cost: 2,
    rarity: 'common',
    kind: 'guard',
    tags: [TAGS.SHIELD],
    text: '获得 170 护盾，抽 1 张牌。',
    effects: [
      { do: 'shield', amount: 170 },
      { do: 'draw', n: 1 },
    ],
  },
  {
    id: 'earth-rebound',
    name: '反震',
    element: EARTH,
    cost: 2,
    rarity: 'rare',
    kind: 'attack',
    tags: [TAGS.SHIELD, TAGS.SWORD],
    text: '造成相当于当前护盾 70% 的伤害。',
    effects: [{ do: 'damage', amount: 0, scaleShield: 0.7 }],
  },
  {
    id: 'earth-slab',
    name: '厚土',
    element: EARTH,
    cost: 1,
    rarity: 'common',
    kind: 'guard',
    tags: [TAGS.SHIELD],
    text: '获得 60 护盾。\n把最底一行染成土。',
    effects: [
      { do: 'shield', amount: 60 },
      { do: 'paint', where: { type: 'row', index: 6 }, kind: 'earth' },
    ],
  },
  {
    id: 'earth-landslide',
    name: '山崩',
    element: EARTH,
    cost: 3,
    rarity: 'rare',
    kind: 'attack',
    tags: [TAGS.SHIELD],
    chain: true,
    text: '造成 170 伤害，获得 90 护盾。\n清除最底一行。',
    effects: [
      { do: 'damage', amount: 170 },
      { do: 'shield', amount: 90 },
      { do: 'clear', where: { type: 'row', index: 6 } },
    ],
  },
  {
    id: 'earth-ult',
    name: '不动如山',
    element: EARTH,
    cost: 4,
    rarity: 'epic',
    kind: 'guard',
    tags: [TAGS.SHIELD],
    ult: true,
    text: '获得 320 护盾。\n造成相当于护盾 90% 的伤害。',
    effects: [
      { do: 'shield', amount: 320 },
      { do: 'damage', amount: 0, scaleShield: 0.9 },
    ],
  },

  // ── 金 · 破甲暴击 ─────────────────────────────────────────────
  {
    id: 'metal-edge',
    name: '金锋',
    element: METAL,
    cost: 1,
    rarity: 'common',
    kind: 'attack',
    tags: [TAGS.SWORD],
    chain: true,
    text: '造成 60 伤害，无视护盾。',
    effects: [{ do: 'damage', amount: 60, pierce: true }],
  },
  {
    id: 'metal-break',
    name: '断岳',
    element: METAL,
    cost: 2,
    rarity: 'common',
    kind: 'attack',
    tags: [TAGS.SWORD],
    chain: true,
    text: '造成 140 伤害，无视护盾。',
    effects: [{ do: 'damage', amount: 140, pierce: true }],
  },
  {
    id: 'metal-rain',
    name: '万刃',
    element: METAL,
    cost: 3,
    rarity: 'rare',
    kind: 'attack',
    tags: [TAGS.SWORD],
    chain: true,
    text: '造成 90 伤害，连打两次。',
    effects: [{ do: 'damage', amount: 90, hits: 2 }],
  },
  {
    id: 'metal-sever',
    name: '斩金',
    element: METAL,
    cost: 2,
    rarity: 'rare',
    kind: 'board',
    tags: [TAGS.SWORD],
    text: '清除一整列。\n造成 100 伤害，无视护盾。',
    effects: [
      { do: 'clear', where: { type: 'col', index: 'random' } },
      { do: 'damage', amount: 100, pierce: true },
    ],
  },
  {
    id: 'metal-hone',
    name: '磨刃',
    element: METAL,
    cost: 1,
    rarity: 'common',
    kind: 'support',
    tags: [TAGS.SWORD],
    text: '下一张攻击卡伤害 ×1.6。\n抽 1 张牌。',
    effects: [
      { do: 'buff', nextAttack: 1.6 },
      { do: 'draw', n: 1 },
    ],
  },
  {
    id: 'metal-ult',
    name: '白虹',
    element: METAL,
    cost: 4,
    rarity: 'epic',
    kind: 'attack',
    tags: [TAGS.SWORD],
    chain: true,
    ult: true,
    text: '造成 300 伤害，无视护盾。\n清除两列。',
    effects: [
      { do: 'damage', amount: 300, pierce: true },
      { do: 'clear', where: { type: 'col', index: 'random', count: 2 } },
    ],
  },

  // ── 水 · 控场改盘 ─────────────────────────────────────────────
  {
    id: 'water-chill',
    name: '寒潭',
    element: WATER,
    cost: 1,
    rarity: 'common',
    kind: 'support',
    tags: [TAGS.TALISMAN],
    text: '敌方倒计时 +2。',
    effects: [{ do: 'delay', n: 2 }],
  },
  {
    id: 'water-divert',
    name: '引流',
    element: WATER,
    cost: 1,
    rarity: 'common',
    kind: 'board',
    tags: [TAGS.TALISMAN],
    text: '随机 7 格染成水。',
    effects: [{ do: 'paint', where: { type: 'random', count: 7 }, kind: 'water' }],
  },
  {
    id: 'water-tide',
    name: '潮汐',
    element: WATER,
    cost: 2,
    rarity: 'rare',
    kind: 'board',
    tags: [TAGS.TALISMAN],
    text: '清除最底两行。\n新落的方块必为水。',
    effects: [
      { do: 'clear', where: { type: 'rows', from: 5, to: 6 } },
      { do: 'flood', kind: 'water' },
    ],
  },
  {
    id: 'water-freeze',
    name: '冰封',
    element: WATER,
    cost: 2,
    rarity: 'rare',
    kind: 'support',
    tags: [TAGS.TALISMAN],
    text: '敌方倒计时 +4。\n抽 1 张牌。',
    effects: [
      { do: 'delay', n: 4 },
      { do: 'draw', n: 1 },
    ],
  },
  {
    id: 'water-mirror',
    name: '镜花水月',
    element: WATER,
    cost: 3,
    rarity: 'rare',
    kind: 'support',
    tags: [TAGS.TALISMAN],
    text: '抽 2 张牌。\n把随机 10 格染成水。',
    effects: [
      { do: 'draw', n: 2 },
      { do: 'paint', where: { type: 'random', count: 10 }, kind: 'water' },
    ],
  },
  {
    id: 'water-ult',
    name: '归墟',
    element: WATER,
    cost: 4,
    rarity: 'epic',
    kind: 'board',
    tags: [TAGS.TALISMAN],
    ult: true,
    text: '把棋盘全部染成水。\n敌方倒计时 +5。',
    effects: [
      { do: 'paint', where: { type: 'all' }, kind: 'water' },
      { do: 'delay', n: 5 },
    ],
  },

  // ── 木 · 持续成长 ─────────────────────────────────────────────
  {
    id: 'wood-sprout',
    name: '春生',
    element: WOOD,
    cost: 1,
    rarity: 'common',
    kind: 'support',
    tags: [TAGS.PILL],
    text: '回复 110 生命。',
    effects: [{ do: 'heal', amount: 110 }],
  },
  {
    id: 'wood-thorn',
    name: '荆棘术',
    element: WOOD,
    cost: 1,
    rarity: 'common',
    kind: 'support',
    tags: [TAGS.TALISMAN],
    text: '敌方中毒：每回合 40，持续 3 回合。',
    effects: [{ do: 'poison', amount: 40, turns: 3 }],
  },
  {
    id: 'wood-vine',
    name: '藤蔓',
    element: WOOD,
    cost: 2,
    rarity: 'rare',
    kind: 'attack',
    tags: [TAGS.TALISMAN],
    text: '造成 90 伤害。\n敌方中毒：每回合 60，持续 3 回合。',
    effects: [
      { do: 'damage', amount: 90 },
      { do: 'poison', amount: 60, turns: 3 },
    ],
  },
  {
    id: 'wood-renew',
    name: '生生不息',
    element: WOOD,
    cost: 2,
    rarity: 'rare',
    kind: 'support',
    tags: [TAGS.PILL],
    text: '此后每回合结束回复 45。\n随机 5 格染成木。',
    effects: [
      { do: 'regrow', amount: 45 },
      { do: 'paint', where: { type: 'random', count: 5 }, kind: 'wood' },
    ],
  },
  {
    id: 'wood-spring',
    name: '万木归春',
    element: WOOD,
    cost: 3,
    rarity: 'rare',
    kind: 'support',
    tags: [TAGS.PILL],
    text: '回复 200 生命。\n敌方中毒：每回合 70，持续 3 回合。',
    effects: [
      { do: 'heal', amount: 200 },
      { do: 'poison', amount: 70, turns: 3 },
    ],
  },
  {
    id: 'wood-ult',
    name: '长生',
    element: WOOD,
    cost: 4,
    rarity: 'epic',
    kind: 'support',
    tags: [TAGS.PILL, TAGS.TALISMAN],
    ult: true,
    text: '回复 320 生命，获得 200 护盾。\n敌方中毒 90，持续 4 回合。',
    effects: [
      { do: 'heal', amount: 320 },
      { do: 'shield', amount: 200 },
      { do: 'poison', amount: 90, turns: 4 },
    ],
  },
];

export const CARD_BY_ID = new Map(CARDS.map((card) => [card.id, card]));

export const cardById = (id) => CARD_BY_ID.get(id);

/** 起手六张：五个元素各一张 + 一张护盾，保证第一回合五种能量都用得上。 */
export const STARTER_DECK = [
  'fire-slash',
  'earth-wall',
  'metal-edge',
  'water-divert',
  'wood-sprout',
  'fire-spark',
];

/** 改造棋盘的卡：判"四成"那条规矩时用它数。 */
export const boardCards = () => CARDS.filter((card) => card.effects.some((effect) => effect.do === 'paint' || effect.do === 'clear' || effect.do === 'flood'));

/** 纯伤害卡：只有一个 damage 动词，别的什么都不做。 */
export const pureDamageCards = () =>
  CARDS.filter((card) => card.effects.length === 1 && card.effects[0].do === 'damage');
