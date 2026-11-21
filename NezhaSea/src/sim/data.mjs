// 数据：哪吒的三种样子、六件法宝（各四阶）和三件合成神器、十六种宝物、六种水族兵、两个首领、二十波和三档难度。
// 只有数字，不碰页面也不碰引擎。
// The data: three forms of Nezha, six treasures (four tiers each) and three divine treasures made by merging, sixteen
// items, six kinds of sea soldier, two bosses, twenty waves and three dangers. Numbers only, free of the page and the
// engine.

/** The sea, in the game's own units: a tall stage that a phone held upright shows whole. */
export const FIELD = { width: 540, height: 960, margin: 24 };

/** What every form of Nezha starts from. Percentages are whole numbers: 10 is +10%. */
export const BASE_STATS = {
  maxHp: 24,
  regen: 0,
  lifesteal: 0,
  damage: 0,
  attackSpeed: 0,
  crit: 5,
  range: 0,
  armor: 0,
  dodge: 0,
  speed: 0,
  luck: 0,
  harvest: 0,
  pickup: 0
};

/** The three forms of Nezha. `unlock` is what opens one: `null` from the start. */
export const HEROES = {
  boy: { stats: {}, slots: 6, weapon: 'ring', unlock: null },
  lotus: { stats: { maxHp: 8, regen: 3, speed: -5 }, slots: 6, weapon: 'ribbon', unlock: 'wave10' },
  sixArms: { stats: { damage: -10, attackSpeed: 10 }, slots: 8, weapon: 'spear', unlock: 'win' }
};
export const HERO_KINDS = Object.keys(HEROES);

/**
 * The treasures. Each has four tiers; two of the same treasure and tier merge into the next. `kind` is how it
 * strikes: `throw` (out to its reach and back, through everything), `sweep` (an arc in front), `thrust` (a line),
 * `lob` (lands on a spot and bursts), `orbit` (circles Nezha) and `nova` (a ring of fire around her).
 */
export const WEAPONS = {
  ring: { kind: 'throw', damage: [8, 14, 24, 40], cooldown: [1.1, 1.0, 0.9, 0.8], reach: [150, 160, 172, 185], price: 13, knock: 8 },
  ribbon: { kind: 'sweep', damage: [10, 17, 28, 46], cooldown: [1.0, 0.92, 0.85, 0.75], reach: [95, 102, 110, 120], arc: 120, price: 12, knock: 14 },
  spear: { kind: 'thrust', damage: [14, 24, 40, 66], cooldown: [1.2, 1.1, 1.0, 0.9], reach: [120, 130, 142, 155], width: 16, price: 13, knock: 10 },
  brick: { kind: 'lob', damage: [16, 28, 46, 76], cooldown: [1.8, 1.65, 1.5, 1.35], reach: [200, 210, 222, 235], splash: [44, 48, 54, 60], price: 16, knock: 18 },
  wheels: { kind: 'orbit', damage: [5, 9, 15, 25], cooldown: [0.45, 0.42, 0.38, 0.34], reach: [62, 66, 72, 78], count: [2, 2, 3, 4], price: 15, knock: 6 },
  dome: { kind: 'nova', damage: [9, 15, 25, 42], cooldown: [2.2, 2.0, 1.8, 1.6], reach: [90, 100, 110, 125], price: 15, knock: 24 }
};
export const WEAPON_KINDS = Object.keys(WEAPONS);
export const TIERS = 4;

/**
 * The divine treasures: two treasures of the third tier or above, merged, make one. Each strikes as both did and more.
 * Binding the Dragon: the ring and the ribbon, as Nezha bound Ao Bing. Fire-Wheel Spear: the spear on the wheels.
 * Nine-Dragon Brick: the brick under the fire dome.
 */
export const DIVINE = {
  bindDragon: { from: ['ring', 'ribbon'], kind: 'throw', also: 'sweep', damage: 50, cooldown: 0.7, reach: 200, arc: 160, knock: 20 },
  fireSpear: { from: ['spear', 'wheels'], kind: 'orbit', also: 'thrust', damage: 34, cooldown: 0.32, reach: 96, count: 4, width: 22, knock: 14 },
  dragonBrick: { from: ['brick', 'dome'], kind: 'nova', also: 'lob', damage: 60, cooldown: 1.4, reach: 150, splash: 80, knock: 30 }
};
export const DIVINE_KINDS = Object.keys(DIVINE);
/** The lowest tier either treasure may be for a divine merge. */
export const DIVINE_TIER = 2;

/** What a treasure of a tier costs in the shop: the first tier's price, more for each tier above. */
export const weaponPrice = (kind, tier, wave = 0) => Math.round(WEAPONS[kind].price * (1 + tier * 1.3) * (1 + wave * 0.12));

/** The items. `stats` are added to Nezha's; `rarity` 0 to 2 sets the price and how late it turns up. */
export const ITEMS = {
  lotusRoot: { stats: { maxHp: 5 }, rarity: 0 },
  peach: { stats: { regen: 2 }, rarity: 0 },
  dragonScale: { stats: { armor: 2, speed: -2 }, rarity: 0 },
  elixir: { stats: { damage: 6 }, rarity: 0 },
  windCharm: { stats: { speed: 6 }, rarity: 0 },
  conch: { stats: { pickup: 30 }, rarity: 0 },
  coral: { stats: { luck: 10 }, rarity: 0 },
  shell: { stats: { harvest: 6 }, rarity: 0 },
  primordialPearl: { stats: { crit: 6 }, rarity: 1 },
  seaPearl: { stats: { lifesteal: 3 }, rarity: 1 },
  goldLotus: { stats: { dodge: 6 }, rarity: 1 },
  demonMirror: { stats: { range: 15 }, rarity: 1 },
  drumOfWar: { stats: { attackSpeed: 10, maxHp: -3 }, rarity: 1 },
  dragonPearl: { stats: { damage: 15, armor: -2 }, rarity: 2 },
  heavenlyArmor: { stats: { armor: 5, maxHp: 8 }, rarity: 2 },
  skyRing: { stats: { attackSpeed: 15, crit: 5, speed: -4 }, rarity: 2 }
};
export const ITEM_KINDS = Object.keys(ITEMS);
export const itemPrice = (kind, wave = 0) => Math.round([15, 28, 45][ITEMS[kind].rarity] * (1 + wave * 0.12));

/** The stat raises offered at each level gained, four at a time. */
export const LEVEL_UPS = [
  { maxHp: 3 },
  { regen: 2 },
  { lifesteal: 2 },
  { damage: 5 },
  { attackSpeed: 5 },
  { crit: 4 },
  { range: 10 },
  { armor: 1 },
  { dodge: 4 },
  { speed: 4 },
  { luck: 8 },
  { harvest: 5 }
];
/** Pearls to the next level: grows with each level. */
export const xpToLevel = (level) => Math.round(12 + level * 6 + level * level * 0.8);

/**
 * The sea soldiers. `speed` in units a second; `pearls` dropped; `touch` damage on contact. `ai`: `chase`, `drift`
 * (slow and wavering), `charge` (rushes when near), `burst` (swells and bursts beside Nezha), `shoot` (keeps away and
 * spits water), `boss`.
 */
export const ENEMIES = {
  shrimp: { hp: 8, speed: 70, touch: 3, radius: 11, pearls: 1, ai: 'chase', from: 1 },
  crab: { hp: 26, speed: 42, touch: 5, radius: 15, pearls: 2, ai: 'chase', from: 3 },
  jelly: { hp: 14, speed: 34, touch: 4, radius: 12, pearls: 1, ai: 'drift', from: 2 },
  shark: { hp: 20, speed: 58, touch: 6, radius: 14, pearls: 2, ai: 'charge', from: 5 },
  puffer: { hp: 12, speed: 52, touch: 0, radius: 12, pearls: 2, ai: 'burst', blast: 9, from: 4 },
  conch: { hp: 16, speed: 40, touch: 3, radius: 12, pearls: 2, ai: 'shoot', shot: 4, from: 6 },
  yaksha: { hp: 900, speed: 62, touch: 10, radius: 30, pearls: 40, ai: 'boss', boss: true },
  aoBing: { hp: 3200, speed: 70, touch: 14, radius: 34, pearls: 0, ai: 'boss', boss: true }
};
export const SOLDIER_KINDS = ['shrimp', 'crab', 'jelly', 'shark', 'puffer', 'conch'];

/** How hard a game is. `hp` and `hurt` multiply the soldiers' strength and damage; `more` multiplies their numbers. */
export const DANGER = [
  { hp: 0.85, hurt: 0.85, more: 1 },
  { hp: 1.1, hurt: 1.1, more: 1 },
  { hp: 1.45, hurt: 1.35, more: 1.1 }
];

export const WAVES = 20;
/** Seconds a wave lasts: short at first, 45 from the eighth on. */
export const waveSeconds = (wave) => Math.min(45, 15 + wave * 4);
/** The wave with a boss, and which. */
export const BOSS_WAVES = { 10: 'yaksha', 20: 'aoBing' };
/** Soldiers a second in a wave, and how much stronger they are than on the first. */
export const spawnRate = (wave) => 0.5 + wave * 0.34 + Math.max(0, wave - 8) * 0.45;
export const strengthOf = (wave) => 1 + (wave - 1) * 0.22 + Math.max(0, wave - 7) ** 2 * 0.1;
/** How much harder soldiers hit than on the first wave. */
export const fierceOf = (wave) => 1 + (wave - 1) * 0.08 + Math.max(0, wave - 10) * 0.15;
/** At most this many soldiers on the field at once. */
export const MAX_ON_FIELD = 140;

/** The shop: offers shown, the price of a reroll (rising with each one in a wave), and what a sale returns. */
/** Pearls Nezha starts with, and pearls the sea gives her at the end of every wave besides her harvest. */
export const START_PEARLS = 15,
  WAVE_PEARLS = 4;

export const SHOP = { offers: 4, reroll: (wave, count) => 2 + Math.floor(wave / 2) + count * (1 + Math.floor(wave / 4)), refund: 0.4 };
