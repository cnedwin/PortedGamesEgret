// 桃溪县的数值表：资源、县等、坊的区划、建筑、资源点、人才、来敌和民情。所有时间都是真实的秒，产出按每小时写。
// 数值由 tools/pacing.mjs 的模拟玩家调过（醒着时每隔一段时间看一次、夜里睡八小时）：每二十分钟看一次约 3.5 天升到
// 「州」，每一个半小时看一次约 5 天，每四小时看一次约 7.5 天；第二任各约 3、5、9 天。县衙每次升格的工期和所需的
// 人口、货物把节奏压住（见 README「数值与节奏」）。
// The numbers of Peach Creek: resources, ranks, district zones, buildings, resource points, talents, raids and
// petitions. Times are real seconds; outputs are written per hour. Tuned by tools/pacing.mjs (a simulated player who
// looks in every so often while awake and sleeps eight hours): looking in every twenty minutes reaches the prefecture
// in about 3.5 days, every ninety minutes about 5, every four hours about 7.5; the second term about 3, 5 and 9. The
// works on each rise of the yamen, and the people and goods each asks for, hold the pace (README, "Numbers and pace").

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

export const START = { coin: 600, grain: 300, wood: 200, stone: 0, iron: 0, mulberry: 0, clay: 0, wine: 0, silk: 0, tea: 0, porcelain: 0, pop: 30, fame: 0 };

/** Each person eats this much grain an hour and pays this much tax an hour (before livelihood). */
export const PEOPLE = { eat: 0.5, tax: 10, salary: 600, growHalfLife: 900 };

/**
 * County ranks. `maxLevel` caps every building, `builders` is how many works run at once, `districts` how many of
 * the six wards are open. `need` is what the yamen needs to rise to this rank, and `time` its works in seconds.
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

/** The five zones a ward may be planned as. */
export const ZONES = ['home', 'market', 'farm', 'craft', 'garden'];
/** A building in a ward of its own zone works this much better. */
export const ZONE_BONUS = 0.2;

/**
 * Buildings on ward plots. `zone` lists where they may stand; `out` is per level per hour (coin, goods, people
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
  camp: { rank: 3, cost: { coin: 30000, wood: 2000 }, grow: 1.16, time: 15 * 60, power: 60 }
};

/** Raids: the first comes when the county becomes 上县; then one every `every` seconds. */
export const RAIDS = {
  every: 4 * HOUR,
  warn: HOUR,
  power: (n, rank, pop) => Math.round(40 * (1 + rank) * (pop / 300) ** 0.75 * (1 + 0.03 * n)),
  kinds: ['bandits', 'pirates', 'rebels', 'raiders'],
  /** A lost defence takes this share of coin and goods, and this much livelihood for two hours. */
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

/** Seasons turn every six hours of real time. */
export const SEASONS = { length: 6 * HOUR, effects: [{ grain: 1.1, life: 2 }, { tea: 1.2, mulberry: 1.15 }, { grain: 1.25 }, { grain: 0.8, sell: 1.15, life: -2 }] };

/** Petitions come about every forty minutes while the magistrate is there; each has two answers. */
export const PETITIONS = {
  every: 40 * 60,
  list: [
    { id: 'lanterns', a: { coin: -0.05, life: 6, hours: 3 }, b: { fame: 20 } },
    { id: 'bridge', a: { coin: -0.08, life: 4, hours: 6, fame: 30 }, b: { life: -3, hours: 2 } },
    { id: 'wedding', a: { coin: -0.02, fame: 25 }, b: { life: 2, hours: 2 } },
    { id: 'drought', a: { grain: -0.25, life: 6, hours: 4 }, b: { life: -6, hours: 3, coin: 0.05 } },
    { id: 'scholar', a: { coin: -0.06, talent: true }, b: { fame: 15 } },
    { id: 'merchants', a: { sellBoost: 0.3, hours: 4 }, b: { coin: 0.04 } },
    { id: 'flood', a: { wood: -0.2, life: 5, hours: 4 }, b: { life: -8, hours: 3 } },
    { id: 'monk', a: { coin: -0.03, fame: 40 }, b: { life: 2, hours: 2 } },
    { id: 'harvest', a: { grain: 0.3 }, b: { life: 5, hours: 4 } },
    { id: 'thief', a: { coin: -0.02, life: 3, hours: 3 }, b: { fame: 10, life: -2, hours: 2 } },
    { id: 'kite', a: { life: 4, hours: 3 }, b: { fame: 12 } },
    { id: 'cats', a: { grain: -0.02, life: 3, hours: 6 }, b: { fame: 6 } }
  ]
};

/** A finished term is rewarded in rank of office: each makes everything this much better in the next term. */
export const PROMOTION = { bonus: 0.2, grow: 0.8 };
