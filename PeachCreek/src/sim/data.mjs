// 桃溪县的数值表：资源、县等、坊的侧重、建筑、资源点、人才、来敌和民情。时间以秒计，产出按小时计。
// tools/pacing.mjs 从不同上线频率复算升格、来敌和升迁节奏。
// Peach Creek balance data. Times are seconds and outputs are per hour.
// tools/pacing.mjs measures upgrades, raids and promotions at different visit intervals.

export const HOUR = 3600;

/** Resources, in the order the top bar shows them. `price` is what a market pays a unit. */
export const RESOURCES = {
  coin: { price: 0 },
  grain: { price: 1 },
  wood: { price: 0 },
  stone: { price: 0 },
  iron: { price: 0 },
  mulberry: { price: 0 },
  clay: { price: 0 },
  wine: { price: 10 },
  silk: { price: 36 },
  tea: { price: 48 },
  porcelain: { price: 110 }
};
/** Goods the markets sell, dearest first. */
export const GOODS = ['porcelain', 'tea', 'silk', 'wine', 'grain'];

export const START = { coin: 720, grain: 300, wood: 200, stone: 0, iron: 0, mulberry: 0, clay: 0, wine: 0, silk: 0, tea: 0, porcelain: 0, pop: 30, fame: 0 };

/** Each person eats this much grain an hour and pays this much tax an hour (before livelihood). */
export const PEOPLE = { eat: 0.5, tax: 10, salary: 600, growHalfLife: 900, villageGrowHalfLife: 720 };

/**
 * County ranks. `maxLevel` caps every building, `builders` is how many works run at once, `districts` preserves the
 * old automatic ward count for save migration. `need` is what the yamen needs to rise, and `time` its works in seconds.
 */
export const RANKS = [
  { key: 'r0', maxLevel: 5, builders: 2, districts: 3, need: null, time: 0 },
  { key: 'r1', maxLevel: 10, builders: 2, districts: 4, need: { pop: 80, coin: 800, wood: 150 }, time: 10 * 60 },
  { key: 'r2', maxLevel: 20, builders: 2, districts: 5, need: { pop: 400, life: 50, coin: 6000, wood: 1500, stone: 150 }, time: 1 * HOUR },
  { key: 'r3', maxLevel: 30, builders: 3, districts: 6, need: { pop: 650, life: 55, coin: 20000, stone: 400, silk: 150 }, time: 3 * HOUR },
  { key: 'r4', maxLevel: 45, builders: 3, districts: 6, need: { pop: 1500, life: 60, coin: 100000, stone: 4000, iron: 600, porcelain: 150 }, time: 6 * HOUR },
  { key: 'r5', maxLevel: 60, builders: 4, districts: 6, need: { pop: 3000, life: 64, coin: 300000, iron: 2000, tea: 300 }, time: 8 * HOUR },
  { key: 'r6', maxLevel: 80, builders: 4, districts: 6, need: { pop: 4500, life: 68, coin: 900000, stone: 12000, porcelain: 800 }, time: 12 * HOUR }
];
export const FINAL_RANK = RANKS.length - 1;

/** Optional ward focuses. The uses of individual lots stay free. */
export const ZONES = ['home', 'market', 'farm', 'craft', 'garden'];
/** A building in a ward with its preferred focus works this much better. */
export const ZONE_BONUS = 0.2;

/**
 * Buildings on ward plots. `zone` lists compatible planning themes; `out` is per level per hour (coin, goods, people
 * housed, livelihood points, fame); `use` is what each level eats an hour; `cost` the first level's price, each next
 * level ×`grow`; `time` the first level's works in seconds, ×1.16 a level up to `maxTime`.
 */
export const BUILDINGS = {
  house: { zone: ['home'], rank: 0, cost: { coin: 60, wood: 12 }, grow: 1.14, time: 20, house: 18 },
  manor: { zone: ['home'], rank: 3, cost: { coin: 24000, wood: 2400, stone: 1800 }, grow: 1.15, time: 15 * 60, house: 90, life: 0.5 },
  paddy: { zone: ['farm'], rank: 0, cost: { coin: 50, wood: 8 }, grow: 1.14, time: 20, out: { grain: 40 } },
  mulberry: { zone: ['farm'], rank: 1, cost: { coin: 900, wood: 120 }, grow: 1.15, time: 4 * 60, out: { mulberry: 30 } },
  teaGarden: { zone: ['farm'], rank: 3, cost: { coin: 60000, wood: 4000, stone: 2000 }, grow: 1.15, time: 40 * 60, out: { tea: 9 } },
  brewery: { zone: ['craft'], rank: 1, cost: { coin: 500, wood: 90 }, grow: 1.15, time: 90, out: { wine: 6 }, use: { grain: 24 }, smoke: 0.4 },
  loom: { zone: ['craft'], rank: 1, cost: { coin: 1500, wood: 200 }, grow: 1.15, time: 6 * 60, out: { silk: 8 }, use: { mulberry: 24 }, smoke: 0.6 },
  kiln: { zone: ['craft'], rank: 2, cost: { coin: 12000, wood: 1500, stone: 800 }, grow: 1.15, time: 20 * 60, out: { porcelain: 8 }, use: { clay: 20, wood: 16 }, smoke: 1.2 },
  market: { zone: ['market'], rank: 0, cost: { coin: 120, wood: 25 }, grow: 1.15, time: 40, sell: 40 },
  teahouse: { zone: ['market', 'home'], rank: 1, cost: { coin: 400, wood: 70 }, grow: 1.15, time: 60, out: { coin: 30 }, life: 1.2, visitors: true },
  inn: { zone: ['market'], rank: 3, cost: { coin: 30000, wood: 2600, stone: 1600 }, grow: 1.15, time: 15 * 60, out: { coin: 900, fame: 6 }, visitors: true },
  dock: { zone: ['market'], rank: 3, cost: { coin: 50000, wood: 5000, stone: 2000 }, grow: 1.16, time: 25 * 60, sell: 120, export: 1.4, riverside: true },
  clinic: { zone: ['home', 'market'], rank: 1, cost: { coin: 700, wood: 100 }, grow: 1.15, time: 90, life: 2 },
  school: { zone: ['home', 'garden'], rank: 2, cost: { coin: 3000, wood: 400 }, grow: 1.15, time: 5 * 60, life: 1.5, out: { fame: 4 } },
  temple: { zone: ['garden', 'home'], rank: 2, cost: { coin: 5000, wood: 500, stone: 500 }, grow: 1.15, time: 8 * 60, life: 2.5, out: { fame: 3 } },
  theatre: { zone: ['market'], rank: 3, cost: { coin: 45000, wood: 3000, stone: 2000 }, grow: 1.15, time: 20 * 60, life: 3, out: { coin: 500 }, visitors: true },
  garden: { zone: ['garden'], rank: 1, cost: { coin: 300, wood: 40 }, grow: 1.15, time: 45, life: 1.2, beauty: 1 },
  pagoda: { zone: ['garden'], rank: 4, cost: { coin: 300000, wood: 12000, stone: 16000 }, grow: 1.16, time: 60 * 60, life: 5, out: { fame: 20 }, beauty: 3 },
  granary: { zone: ['farm', 'craft'], rank: 1, cost: { coin: 800, wood: 120 }, grow: 1.18, time: 3 * 60, store: 0.5, cap: 16 }
};

/** Resource points outside the wards, found by surveying; `rank` is when they can be found. */
export const NODES = {
  forest: { rank: 0, cost: { coin: 80 }, grow: 1.14, time: 30, out: { wood: 50 } },
  quarry: { rank: 1, cost: { coin: 400, wood: 80 }, grow: 1.15, time: 2 * 60, out: { stone: 40 } },
  clay: { rank: 2, cost: { coin: 3000, wood: 300 }, grow: 1.15, time: 6 * 60, out: { clay: 30 } },
  iron: { rank: 2, cost: { coin: 10000, wood: 1200, stone: 600 }, grow: 1.15, time: 15 * 60, out: { iron: 40 } }
};
/** The order points are found in, and the works a survey takes (the nth survey takes the nth time). */
export const SURVEY_ORDER = ['forest', 'forest', 'quarry', 'quarry', 'clay', 'iron', 'forest', 'iron', 'clay', 'quarry', 'iron', 'forest'];
export const SURVEY_TIME = [0, 3 * 60, 10 * 60, 30 * 60, HOUR, 1.5 * HOUR, 2 * HOUR, 3 * HOUR, 4 * HOUR, 5 * HOUR, 6 * HOUR, 8 * HOUR];
export const SURVEY_COST = (n) => Math.round(150 * 2.2 ** n);

/** Defences: the wall, the gate towers and the militia camp. Power per level. */
export const DEFENCE = {
  wall: { rank: 2, cost: { coin: 6000, wood: 600 }, grow: 1.16, time: 6 * 60, power: 30 },
  tower: { rank: 2, cost: { coin: 4000, wood: 500 }, grow: 1.16, time: 5 * 60, power: 22, count: 4 },
  camp: { rank: 3, cost: { coin: 30000, wood: 2000 }, grow: 1.16, time: 15 * 60, power: 27 }
};

/** Raids: the first comes when the county becomes 上县; then one every `every` seconds. */
export const RAIDS = {
  every: 4 * HOUR,
  warn: HOUR,
  power: (n, rank, pop) => Math.round(34 * (1 + rank) * (pop / 300) ** 0.66 * (1 + 0.014 * n)),
  kinds: ['bandits', 'pirates', 'rebels', 'raiders'],
  /** An undefended loss takes this share of coin and goods, and this much livelihood for two hours. */
  loss: 0.15,
  sorrow: 10
};

/** Upgrades get dearer by `grow` a level; outputs double at these levels. */
export const MILESTONES = [10, 25, 50, 75];

/** Talents: rarity, attributes (rule, farm, craft, trade, arms) and a gift. */
export const RARITY = { clerk: { weight: 60, scale: 1 }, able: { weight: 30, scale: 1.3 }, worthy: { weight: 8.5, scale: 1.7 }, hero: { weight: 1.5, scale: 2.2 } };
export const TALENTS = [
  { id: 'suShi', rarity: 'hero', stats: [70, 55, 40, 80, 20], gift: { visitors: 0.4, life: 3 } },
  { id: 'shenKuo', rarity: 'hero', stats: [60, 50, 95, 40, 30], gift: { works: 0.3 } },
  { id: 'fanZhongyan', rarity: 'hero', stats: [95, 60, 30, 40, 55], gift: { life: 8 } },
  { id: 'yueFei', rarity: 'hero', stats: [50, 40, 40, 20, 98], gift: { defence: 0.4 } },
  { id: 'liQingzhao', rarity: 'worthy', stats: [55, 30, 40, 70, 10], gift: { fame: 0.35 } },
  { id: 'baoZheng', rarity: 'worthy', stats: [90, 40, 30, 45, 40], gift: { tax: 0.2 } },
  { id: 'biSheng', rarity: 'worthy', stats: [40, 30, 85, 50, 20], gift: { recruit: 0.3 } },
  { id: 'zhangZeduan', rarity: 'worthy', stats: [40, 40, 60, 75, 15], gift: { sell: 0.25 } },
  { id: 'songCi', rarity: 'worthy', stats: [80, 40, 50, 30, 30], gift: { life: 4 } },
  { id: 'liangHongyu', rarity: 'worthy', stats: [45, 30, 30, 30, 88], gift: { defence: 0.25 } },
  { id: 'weaver', rarity: 'able', stats: [30, 40, 72, 45, 10], gift: { silk: 0.2 } },
  { id: 'farmer', rarity: 'able', stats: [30, 80, 35, 25, 25], gift: { grain: 0.2 } },
  { id: 'merchant', rarity: 'able', stats: [35, 20, 30, 74, 15], gift: { sell: 0.12 } },
  { id: 'smith', rarity: 'able', stats: [20, 25, 65, 30, 50], gift: { works: 0.1 } },
  { id: 'drillMaster', rarity: 'able', stats: [30, 20, 25, 20, 72], gift: { defence: 0.12 } },
  { id: 'scribe', rarity: 'clerk', stats: [48, 25, 20, 30, 10], gift: {} },
  { id: 'elder', rarity: 'clerk', stats: [40, 45, 20, 20, 15], gift: {} },
  { id: 'broker', rarity: 'clerk', stats: [25, 20, 20, 46, 10], gift: {} },
  { id: 'carpenter', rarity: 'clerk', stats: [20, 25, 46, 20, 20], gift: {} },
  { id: 'militiaman', rarity: 'clerk', stats: [20, 25, 20, 15, 45], gift: {} }
];
export const STATS = ['rule', 'farm', 'craft', 'trade', 'arms'];
/** Which attribute helps which building. */
export const BUILDING_STAT = { house: 'rule', manor: 'rule', paddy: 'farm', mulberry: 'farm', teaGarden: 'farm', brewery: 'craft', loom: 'craft', kiln: 'craft', market: 'trade', teahouse: 'trade', inn: 'trade', dock: 'trade', clinic: 'rule', school: 'rule', temple: 'rule', theatre: 'trade', garden: 'farm', pagoda: 'craft', granary: 'farm', forest: 'craft', quarry: 'craft', clay: 'craft', iron: 'craft', wall: 'arms', tower: 'arms', camp: 'arms' };
/** Offices: the deputy helps everything, the registrar taxes and trade, the sheriff defence. */
export const OFFICES = { deputy: 'rule', registrar: 'trade', sheriff: 'arms' };
export const RECRUIT = { fame: (n) => Math.round(60 * 1.22 ** n), pity: 25, freeEvery: 8 * HOUR, levelExp: (lv) => Math.round(2 * 1.25 ** lv), maxLevel: 20 };

/** A two-hour year. Except for life points, each seasonal effect is an output multiplier. */
export const SEASONS = {
  length: 30 * 60,
  effects: [
    { grain: 1.12, wood: 1.08, life: 2 },
    { grain: 0.92, tea: 1.22, mulberry: 1.16, wood: 0.94 },
    { grain: 1.24, sell: 1.10, visitors: 1.10 },
    { grain: 0.82, craft: 1.14, visitors: 0.88, life: -2 }
  ]
};

const allSeasons = [0, 1, 2, 3];
/** A petition has two outcomes. Costs and material grants scale by rank, never by treasury balance. */
export const PETITIONS = {
  first: 5 * 60,
  every: 18 * 60,
  jitter: 8 * 60,
  recent: 3,
  scale: [1, 2, 5, 12, 25, 50, 80],
  list: [
    { id: 'seedFair', seasons: [0], a: { coin: -45, grain: 90 }, b: { fame: 16, life: 2, minutes: 18 } },
    { id: 'dragonBoat', seasons: [1], rank: 1, a: { wood: -24, life: 3, sellBoost: 0.18, minutes: 24 }, b: { coin: 48, fame: 12 } },
    { id: 'granaryCheck', seasons: [2], rank: 1, a: { wood: -16, grain: 105, life: 2, minutes: 20 }, b: { coin: 54 } },
    { id: 'winterSoup', seasons: [3], a: { grain: -40, life: 5, minutes: 24 }, b: { fame: 10, sellBoost: 0.1, minutes: 16 } },
    { id: 'lanterns', seasons: [0, 3], a: { coin: -50, life: 5, sellBoost: 0.1, minutes: 24 }, b: { fame: 14 } },
    { id: 'bridge', seasons: [0, 1, 2], rank: 1, a: { coin: -75, life: 4, fame: 20, minutes: 28 }, b: { life: -1, minutes: 14 } },
    { id: 'wedding', seasons: allSeasons, a: { coin: -25, fame: 26 }, b: { life: 2, minutes: 20 } },
    { id: 'drought', seasons: [1], rank: 2, a: { grain: -55, life: 4, minutes: 24 }, b: { life: -2, minutes: 18 } },
    { id: 'scholar', seasons: allSeasons, rank: 2, a: { coin: -85, talent: true }, b: { fame: 22 } },
    { id: 'merchants', seasons: [1, 2], rank: 1, a: { sellBoost: 0.24, minutes: 25 }, b: { coin: 60 } },
    { id: 'flood', seasons: [0, 1], rank: 2, a: { wood: -36, life: 4, minutes: 26 }, b: { life: -3, minutes: 18 } },
    { id: 'monk', seasons: allSeasons, a: { coin: -35, fame: 32 }, b: { life: 2, minutes: 22 } },
    { id: 'harvest', seasons: [2], a: { grain: 90 }, b: { life: 4, minutes: 22 } },
    { id: 'thief', seasons: allSeasons, rank: 1, a: { coin: -20, life: 3, minutes: 18 }, b: { fame: 8, life: -1, minutes: 12 } },
    { id: 'kite', seasons: [0, 1, 2], a: { life: 3, minutes: 20 }, b: { fame: 12 } },
    { id: 'cats', seasons: allSeasons, a: { grain: -12, life: 3, minutes: 24 }, b: { fame: 8 } }
  ]
};

/** A finished term is rewarded in rank of office: each makes everything this much better in the next term. */
export const PROMOTION = { bonus: 0.2, grow: 0.8 };
