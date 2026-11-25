// 兵种：价格、移动方式与步数、视野、武器（射程、能否移动后攻击、能打陆地/水面/空中哪一类）、对每个兵种的基础伤害、
// 暴击倍率与暴击条件、能做的事（占领、治疗、诅咒、运输）。基础伤害、价格、移动、射程和暴击条件按原作规则表，名字、
// 外观和设定是本作自己的。
// The units: price, how and how far they move, sight, the weapon (range, whether it can strike after moving, whether it
// reaches land, water or air), the base damage against each kind, the critical multiplier and when it applies, and what
// else they can do (capture, heal, hex, carry). Base damage, prices, movement, ranges and critical conditions follow
// the original's rules; the names, looks and story are this game's own.

/** Base damage of each attacker against each defender kind, as a fraction of a full-health unit. */
const SWORDSMAN = { archer: 0.65, swordsman: 0.55, pikeman: 0.35, hound: 0.45, wagon: 0.35, knight: 0.15, trebuchet: 0.3, merfolk: 0.55, mage: 0.55, structure: 0.35, commander: 0.1, ballista: 0.35, giant: 0.05 };
const HOUND = { archer: 0.75, swordsman: 0.75, pikeman: 0.45, hound: 0.65, wagon: 0.3, knight: 0.1, trebuchet: 0.35, ballista: 0.4, giant: 0.05, merfolk: 0.75, mage: 0.55, structure: 0.2, commander: 0.15 };
const PIKEMAN = { archer: 0.7, swordsman: 0.75, pikeman: 0.55, hound: 0.8, wagon: 0.45, knight: 0.7, trebuchet: 0.5, ballista: 0.55, giant: 0.1, merfolk: 0.75, mage: 0.65, structure: 0.5, commander: 0.15 };
const ARCHER = { archer: 0.65, swordsman: 0.7, hound: 0.75, pikeman: 0.6, balloon: 0.2, wagon: 0.35, mage: 0.75, griffin: 0.3, knight: 0.4, witch: 0.2, ballista: 0.3, trebuchet: 0.25, giant: 0.1, wyvern: 0.1, structure: 0.2, commander: 0.05, warship: 0.2, harpoonship: 0.2, turtle: 0.2, ferry: 0.2, merfolk: 0.7 };
const MAGE = { archer: 0.85, swordsman: 0.85, pikeman: 0.75, hound: 0.8, wagon: 0.55, knight: 0.3, trebuchet: 0.45, ballista: 0.3, witch: 1.3, warship: 0.15, ferry: 0.2, wyvern: 0.8, merfolk: 0.55, mage: 0.35, turtle: 0.2, griffin: 1.4, structure: 0.35, balloon: 1.0, giant: 0.2, commander: 0.2 };
const KNIGHT = { archer: 1, swordsman: 0.9, pikeman: 0.45, hound: 1.2, wagon: 0.55, knight: 0.55, trebuchet: 0.8, ballista: 0.85, merfolk: 0.85, mage: 1.1, structure: 0.65, giant: 0.25, commander: 0.25 };
const BALLISTA = { witch: 0.95, wyvern: 0.85, griffin: 1.3, balloon: 1.1, archer: 0.3, swordsman: 0.4, hound: 0.5, pikeman: 0.3, wagon: 0.3, mage: 0.4, knight: 0.25, ballista: 0.2, trebuchet: 0.1, giant: 0.1, structure: 0.3, commander: 0.1, warship: 0.2, harpoonship: 0.2, turtle: 0.2, ferry: 0.2, merfolk: 0.4 };
const TREBUCHET = { archer: 1.2, swordsman: 1, pikeman: 0.8, hound: 1.1, wagon: 0.7, knight: 0.8, trebuchet: 0.8, ballista: 0.85, mage: 0.9, structure: 0.85, giant: 0.55, commander: 0.25, warship: 0.75, harpoonship: 0.65, turtle: 0.45, ferry: 0.8, merfolk: 1 };
const GIANT = { archer: 1.5, swordsman: 1.3, pikeman: 1, hound: 1.5, wagon: 0.75, knight: 0.85, trebuchet: 1.05, ballista: 1, merfolk: 1.3, mage: 1.1, structure: 0.85, giant: 0.45, commander: 0.35 };
const GRIFFIN = { archer: 0.75, swordsman: 0.65, pikeman: 0.45, hound: 0.55, wagon: 0.35, knight: 0.75, balloon: 0.55, trebuchet: 0.55, ballista: 0.35, witch: 0.3, wyvern: 0.35, mage: 0.25, griffin: 0.55, structure: 0.5, giant: 0.1, commander: 0.15, warship: 0.45, harpoonship: 0.25, turtle: 0.25, ferry: 0.35, merfolk: 0.65 };
const WITCH = { witch: 0.35, wyvern: 0.35, griffin: 0.6, balloon: 0.5 };
const WYVERN = { archer: 1.4, swordsman: 1.2, pikeman: 1.2, hound: 1.5, wagon: 0.8, knight: 1, trebuchet: 1.05, ballista: 1.1, mage: 0.65, structure: 0.65, commander: 0.35, giant: 0.65, warship: 0.9, harpoonship: 0.7, turtle: 0.75, ferry: 1.1, merfolk: 1.2 };
const TURTLE = { structure: 0.45, warship: 0.8, harpoonship: 0.35, turtle: 0.5, ferry: 0.55, merfolk: 1.1 };
const HARPOON = { witch: 0.8, wyvern: 0.7, griffin: 1.3, balloon: 0.8, structure: 0.3, warship: 0.15, harpoonship: 0.3, turtle: 0.75, merfolk: 0.3, ferry: 0.45 };
const WARSHIP = { archer: 1.2, swordsman: 1, pikeman: 0.75, hound: 1.1, wagon: 0.6, knight: 0.7, trebuchet: 0.8, ballista: 0.85, mage: 0.8, structure: 0.75, giant: 0.55, commander: 0.25, warship: 0.55, turtle: 0.3, harpoonship: 0.8, merfolk: 0.75, ferry: 0.65 };
const MERFOLK = { archer: 0.35, swordsman: 0.35, pikeman: 0.25, hound: 0.45, wagon: 0.35, knight: 0.15, trebuchet: 0.2, mage: 0.45, structure: 0.15, commander: 0.1, ballista: 0.25, giant: 0.05, warship: 0.05, harpoonship: 0.3, ferry: 0.1, turtle: 0.1, merfolk: 0.25 };
const COMMANDER = { archer: 1.3, swordsman: 1.15, pikeman: 0.75, hound: 1.15, wagon: 0.7, knight: 0.55, trebuchet: 0.55, ballista: 0.6, wyvern: 0.35, mage: 0.8, giant: 0.4, structure: 0.7, balloon: 0.55, griffin: 0.9, witch: 0.7, commander: 0.4, warship: 0.55, harpoonship: 0.45, turtle: 0.55, ferry: 0.6, merfolk: 0.95 };
/** What a building's garrison strikes back with: always at full strength, however hurt the building is. */
export const GARRISON = { archer: 0.3, swordsman: 0.3, hound: 0.35, pikeman: 0.3, balloon: 0.2, wagon: 0.35, mage: 0.35, griffin: 0.3, knight: 0.1, witch: 0.2, ballista: 0.25, trebuchet: 0.2, giant: 0.05, wyvern: 0.05, commander: 0.05, warship: 0.2, harpoonship: 0.2, turtle: 0.2, ferry: 0.2, merfolk: 0.3 };

const LAND = ['land'],
  ALL = ['land', 'water', 'air'];

/**
 * `crit` names the rule in src/sim/rules.mjs (CRITICAL) that says when a strike is critical; `power` multiplies it.
 * `weapon.reach` lists the kinds of place a target may be in: land, water, or air for a flier.
 */
export const UNITS = {
  swordsman: { zh: '剑士', en: 'Swordsman', cost: 100, move: 'walking', steps: 4, sight: 2, tags: ['light'], capture: true, weapon: { min: 1, max: 1, mobile: true, reach: LAND, damage: SWORDSMAN }, crit: { rule: 'nearCommander', power: 1.5 } },
  hound: { zh: '猎犬', en: 'Hound', cost: 150, move: 'walking', steps: 5, sight: 3, tags: ['light'], weapon: { min: 1, max: 1, mobile: true, reach: LAND, damage: HOUND }, crit: { rule: 'packHunt', power: 1.5 } },
  pikeman: { zh: '枪兵', en: 'Pikeman', cost: 250, move: 'walking', steps: 3, sight: 2, tags: ['light'], capture: true, weapon: { min: 1, max: 1, mobile: true, reach: LAND, damage: PIKEMAN }, crit: { rule: 'shieldWall', power: 1.5 } },
  wagon: { zh: '补给马车', en: 'Supply Wagon', cost: 300, move: 'wheels', steps: 12, sight: 2, tags: ['heavy'], carry: { room: 1, takes: ['light', 'amphibious'] } },
  mage: { zh: '法师', en: 'Mage', cost: 400, move: 'walking', steps: 5, sight: 2, tags: ['light'], capture: true, heal: { price: 300, reach: 2, radius: 1, amount: 20 }, weapon: { min: 1, max: 1, mobile: true, reach: ['land', 'air'], damage: MAGE }, crit: { rule: 'highGround', power: 1.5 } },
  archer: { zh: '弓手', en: 'Archer', cost: 500, move: 'walking', steps: 3, sight: 2, tags: ['light'], capture: true, weapon: { min: 1, max: 3, mobile: true, reach: ALL, damage: ARCHER }, crit: { rule: 'standing', power: 1.35 } },
  knight: { zh: '骑士', en: 'Knight', cost: 600, move: 'riding', steps: 6, sight: 2, tags: ['heavy'], weapon: { min: 1, max: 1, mobile: true, reach: LAND, damage: KNIGHT }, crit: { rule: 'fullCharge', power: 1.5 } },
  ballista: { zh: '弩车', en: 'Ballista', cost: 800, move: 'wheels', steps: 6, sight: 2, tags: ['heavy'], weapon: { min: 2, max: 6, mobile: false, reach: ALL, damage: BALLISTA }, crit: { rule: 'pointBlank', power: 1.5 } },
  trebuchet: { zh: '投石车', en: 'Trebuchet', cost: 1000, move: 'wheels', steps: 6, sight: 2, tags: ['heavy'], weapon: { min: 2, max: 5, mobile: false, reach: ['land', 'water'], damage: TREBUCHET }, crit: { rule: 'longShot', power: 1.5 } },
  giant: { zh: '巨人', en: 'Giant', cost: 1200, move: 'walking', steps: 5, sight: 2, tags: ['heavy'], weapon: { min: 1, max: 1, mobile: true, reach: LAND, damage: GIANT }, crit: { rule: 'lastStand', power: 2.5 } },
  balloon: { zh: '热气球', en: 'Balloon', cost: 450, move: 'flying', steps: 6, sight: 3, tags: ['air'], carry: { room: 2, takes: ['light', 'amphibious'] } },
  griffin: { zh: '狮鹫骑兵', en: 'Griffin Rider', cost: 600, move: 'flying', steps: 5, sight: 3, tags: ['air'], weapon: { min: 1, max: 1, mobile: true, reach: ALL, damage: GRIFFIN }, crit: { rule: 'aerie', power: 1.25 } },
  witch: { zh: '扫帚魔女', en: 'Broom Witch', cost: 800, move: 'flying', steps: 7, sight: 4, tags: ['air'], hex: { price: 300, radius: 4, amount: 10 }, weapon: { min: 1, max: 1, mobile: true, reach: ['air'], damage: WITCH }, crit: { rule: 'loneFlier', power: 2 } },
  wyvern: { zh: '飞龙', en: 'Wyvern', cost: 1250, move: 'flying', steps: 8, sight: 3, tags: ['air'], weapon: { min: 1, max: 1, mobile: true, reach: ['land', 'water'], damage: WYVERN }, crit: { rule: 'onRoad', power: 2 } },
  ferry: { zh: '渡船', en: 'Ferry', cost: 200, move: 'sailing', steps: 10, sight: 3, tags: ['sea'], carry: { room: 2, takes: ['light', 'heavy', 'amphibious'] } },
  turtle: { zh: '战龟', en: 'War Turtle', cost: 400, move: 'sailing', steps: 12, sight: 4, tags: ['sea'], weapon: { min: 1, max: 1, mobile: true, reach: ['water'], damage: TURTLE }, crit: { rule: 'deepWater', power: 1.5 } },
  harpoonship: { zh: '鱼叉船', en: 'Harpoon Ship', cost: 550, move: 'sailing', steps: 4, sight: 3, tags: ['sea'], weapon: { min: 3, max: 6, mobile: true, reach: ['air', 'water'], damage: HARPOON }, crit: { rule: 'reefAmbush', power: 1.5 } },
  warship: { zh: '战舰', en: 'Galleon', cost: 900, move: 'sailing', steps: 8, sight: 2, tags: ['sea'], weapon: { min: 2, max: 4, mobile: true, reach: ['land', 'water'], damage: WARSHIP }, crit: { rule: 'shoreline', power: 1.5 } },
  merfolk: { zh: '鱼人', en: 'Merfolk', cost: 350, move: 'amphibious', steps: 5, sight: 2, tags: ['amphibious'], capture: true, weapon: { min: 1, max: 2, mobile: true, reach: ['land', 'water'], damage: MERFOLK }, crit: { rule: 'inWater', power: 2 } },
  commander: { zh: '指挥官', en: 'Commander', cost: 500, move: 'walking', steps: 4, sight: 3, tags: ['light', 'commander'], capture: true, regen: 5, weapon: { min: 1, max: 1, mobile: true, reach: ALL, damage: COMMANDER }, crit: null }
};

/** The buildings. `takes` lists the tags a recruiting building trains; `income` is gold a turn. */
export const BUILDINGS = {
  hq: { zh: '要塞', en: 'Stronghold', income: 100, taken: 0.5, capturable: false, reinforces: false },
  village: { zh: '村庄', en: 'Village', income: 100, taken: 1, capturable: true, reinforces: true },
  barracks: { zh: '兵营', en: 'Barracks', income: 0, taken: 1, capturable: true, reinforces: true, takes: ['light', 'heavy'] },
  tower: { zh: '飞羽塔', en: 'Aerie', income: 0, taken: 1, capturable: true, reinforces: true, takes: ['air'] },
  port: { zh: '港口', en: 'Harbour', income: 0, taken: 1, capturable: true, reinforces: true, takes: ['sea', 'amphibious'], water: true }
};

/** Health a building gets back each of its owner's turns. */
export const BUILDING_REGEN = 10;

/** The units a building of `kind` trains, cheapest first. */
export function recruitsOf(kind) {
  const takes = BUILDINGS[kind]?.takes ?? [];
  return Object.entries(UNITS)
    .filter(([id, u]) => id !== 'commander' && u.tags.some((tag) => takes.includes(tag)))
    .sort((a, b) => a[1].cost - b[1].cost)
    .map(([id]) => id);
}

/** Whether `type` is a flier, which takes no cover from the ground under it. */
export const isAir = (type) => UNITS[type].tags.includes('air');
