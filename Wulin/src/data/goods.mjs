// Buildings, equipment and pills, and the prices of running a sect.

/** Calendar: a day has twelve watches, a xun ten days, a year 360 days. */
export const WATCHES_PER_DAY = 12;
export const DAYS_PER_XUN = 10;
export const DAYS_PER_YEAR = 360;

export const ECONOMY = {
  startSilver: 3000,
  /** Silver worth of raw resource one worker gathers in a xun at grade 2. */
  gatherPerXun: 30,
  /** Finished goods are worth this many times their materials. */
  craftMarkup: 2,
  /** Grain one person eats in a xun, and what a shi of grain costs. */
  grainPerXun: 1,
  grainPrice: 4,
  /** Nobody more than this may live in one stronghold. */
  headcountCap: 40,
  /** What each village sends its stronghold every xun. */
  villageGrain: 8,
  villageTribute: 45,
  /** Offerings per point of renown every xun. */
  offeringPerRenown: 0.2,
  /** Raw resources a sect keeps of each kind; the rest is sold at one silver a unit. */
  reserve: 60,
  shopCost: 2000,
  /** Silver every ten days from a road between two of a sect's own strongholds, more for each shop at either end; and from a road to a friendly sect's stronghold. */
  routeIncome: 14,
  routeShopBonus: 4,
  allyRouteIncome: 8,
  allyRelation: 40,
  /** The worth of goods one shop can sell in ten days, and the share it gets over the price at the gate. */
  /** Goods sold at the gate in ten days fetch full price up to this worth, and this share of it beyond. */
  marketDepth: 500,
  glutPrice: 0.35,
  /** What one act of giving costs, and the renown it earns. */
  donation: 1000,
  donationRenown: 5,
  /** Giving raises renown no higher than this. */
  donationCeiling: 400,
  /** Each year a sect loses this share of the renown it has above the level at which a name rests. */
  renownRest: 300,
  renownFade: 0.06,
  shopMoves: 150,
  shopPremium: 0.25,
  shopIncome: [80, 150],
};

/**
 * Buildings. `cells` is the ground one takes, `cost` its silver price at
 * level one (level n costs n times as much), `max` its top level.
 */
export const BUILDINGS = {
  hall: { name: '正殿', cells: 16, cost: 1500, max: 5, does: '分舵核心，设职位' },
  gate: { name: '山门', cells: 6, cost: 600, max: 5, does: '守战防线' },
  board: { name: '招贤榜', cells: 2, cost: 100, max: 1, does: '招收弟子' },
  dorm: { name: '厢房', cells: 6, cost: 300, max: 3, does: '住人', beds: [0, 4, 6, 8] },
  mess: { name: '膳堂', cells: 8, cost: 400, max: 3, does: '存粮，安人心' },
  store: { name: '库房', cells: 8, cost: 400, max: 5, does: '储物' },
  goldPit: { name: '金矿坑', cells: 8, cost: 300, max: 5, does: '采金', posts: 4, yields: 'gold' },
  quarry: { name: '采石场', cells: 8, cost: 300, max: 5, does: '采石', posts: 4, yields: 'stone' },
  ironPit: { name: '铁矿坑', cells: 8, cost: 300, max: 5, does: '采铁', posts: 4, yields: 'iron' },
  lumber: { name: '伐木场', cells: 8, cost: 300, max: 5, does: '伐木', posts: 4, yields: 'wood' },
  garden: { name: '药圃', cells: 8, cost: 300, max: 5, does: '种药', posts: 4, yields: 'herb' },
  forge: { name: '铸剑坊', cells: 10, cost: 800, max: 7, does: '造兵器、暗器', posts: 3, makes: 'weapon' },
  loom: { name: '织造坊', cells: 10, cost: 800, max: 7, does: '造衣、鞋、饰品', posts: 3, makes: 'armor' },
  still: { name: '丹房', cells: 10, cost: 800, max: 7, does: '炼丹', posts: 3, makes: 'pill' },
  yard: { name: '演武场', cells: 12, cost: 500, max: 5, does: '练拳、掌、腿、点穴', seats: 6, trains: ['fist', 'palm', 'leg', 'point'] },
  range: { name: '兵器场', cells: 12, cost: 500, max: 5, does: '练刀、剑、枪、棍、暗器', seats: 6, trains: ['saber', 'sword', 'spear', 'staff', 'dart'] },
  cell: { name: '静室', cells: 4, cost: 600, max: 5, does: '闭关，练内功、轻功、奇术', seats: 1, trains: ['inner', 'light', 'craft'] },
  library: { name: '藏经阁', cells: 10, cost: 1200, max: 5, does: '存秘笈', seats: 4 },
  clinic: { name: '医馆', cells: 8, cost: 600, max: 5, does: '疗伤解毒' },
  tower: { name: '箭楼', cells: 4, cost: 500, max: 3, does: '守战远程火力' },
  council: { name: '议事堂', cells: 10, cost: 1000, max: 3, does: '外交、探子' },
};

/** Equipment grades. Grade 6 is each sect's own make; grade 7 cannot be made. */
export const GRADES = [
  null,
  { name: '凡铁', attack: 20, defense: 10, cost: 50 },
  { name: '精钢', attack: 40, defense: 20, cost: 100 },
  { name: '百炼', attack: 60, defense: 30, cost: 200 },
  { name: '寒铁', attack: 80, defense: 40, cost: 400 },
  { name: '玄铁', attack: 100, defense: 50, cost: 800 },
  { name: '门派专属', attack: 120, defense: 60, cost: 1600 },
  { name: '神兵', attack: 165, defense: 80, cost: 0 },
];

/** Weapon slots and what each is called. */
export const WEAPONS = {
  glove: '拳套',
  stylus: '点穴笔',
  saber: '刀',
  sword: '剑',
  spear: '枪',
  staff: '棍',
  dart: '镖囊',
};

/** Name of a made weapon or robe, such as 百炼剑. */
export const weaponName = (slot, grade) => GRADES[grade].name + WEAPONS[slot];
export const armorName = (grade) => GRADES[grade].name + (grade >= 4 ? '甲衣' : '布衣');

/** The four poisons; each has its own antidote. */
export const POISONS = { snake: '蛇毒', flower: '花毒', spider: '蛛毒', gu: '蛊毒' };

/** Pills. `needs` is the still level required. */
export const PILLS = {
  heal1: { name: '回气丹', needs: 1, cost: 30, effect: { hp: 150 } },
  heal2: { name: '续气丹', needs: 3, cost: 90, effect: { hp: 400 } },
  heal3: { name: '还魂丹', needs: 5, cost: 240, effect: { hp: 900 } },
  nei1: { name: '聚元丹', needs: 1, cost: 30, effect: { nei: 200 } },
  nei2: { name: '培元丹', needs: 3, cost: 90, effect: { nei: 500 } },
  nei3: { name: '归元丹', needs: 5, cost: 240, effect: { nei: 1200 } },
  antiSnake: { name: '雄黄丸', needs: 2, cost: 40, effect: { cure: 'snake' } },
  antiFlower: { name: '清心丸', needs: 2, cost: 40, effect: { cure: 'flower' } },
  antiSpider: { name: '化蛛散', needs: 2, cost: 40, effect: { cure: 'spider' } },
  antiGu: { name: '驱蛊丹', needs: 4, cost: 120, effect: { cure: 'gu' } },
  bone: { name: '壮骨丹', needs: 4, cost: 300, effect: { stat: 1 }, limit: 20 },
  marrow: { name: '洗髓丹', needs: 6, cost: 1500, effect: { aptitude: 5 } },
  breach: { name: '破障丹', needs: 5, cost: 500, effect: { insight: 0.05 } },
};
