// The five regiments: their arms, their blows, their regiment skills and their talents, as plain numbers.
// Nothing here draws or plays; the fight in fight.mjs reads these tables.
//
// Distances are metres, times seconds, angles radians, damage in hit points.
// A blow comes from one of four lines: L (from his left), R (from his right), O (overhead) and T (a thrust).
//
// Where the numbers come from (docs/DESIGN.md lists every one):
// - The professions, their weapon kinds (shield, one-handed, two-handed, polearm, bow), the names of the skills and
//   talents, and the skill numbers from the game's published notes: the profession release (March 2025) and the
//   seasonal notes of S1 (14 April 2026), S2 (24 June 2026), S3 (31 August 2026) and S4 (18 November 2026),
//   the latest value where a season changed it. Skill damage is a share of the weapon's damage.
// - From S2 every active profession skill waits 5 s longer; the official cooldowns below include it.
// - Stamina: the official costs are kept in proportion, ×0.25, since a man here has 100 stamina.
// - Health: about what each profession has in the game (from a player). Weapon damage and the weapon arts (X, Z):
//   from in-game item cards of high-quality weapons, one of each kind.
// - Everything else (armour is left out, timings, reaches and the numbers the notes do not give) is this demo's own,
//   and each such number is listed as "not published" in docs/DESIGN.md.

export const LINES = ['L', 'R', 'O', 'T'];

const deg = (d) => (d * Math.PI) / 180;
/** An official stamina cost in this game's stamina (a man has 100). */
const stamina = (official) => Math.round(official * 0.25 * 10) / 10;

/** Critical blows, the same for every man (the base rate is not published; talents add to it). */
export const CRIT = { chance: 0.1, power: 1.5 };

/**
 * Weapon damage by kind, from item cards: cuts (挥砍) come from every direction but straight down, which is the
 * thrust (穿刺) — on the polearm axe the lower diagonals thrust too. The bow's card multiplies the arrow (×9.042);
 * the arrow's own damage is not on it.
 */
export const WEAPONS = {
  oneHanded: { zh: '单手/利刃', cut: 762, thrust: 842 },
  twoHandedAxe: { zh: '双手/斧钺', cut: 1062, thrust: 909 },
  polearmAxe: { zh: '长杆/斧钺', cut: 998, thrust: 759 },
  polearmBlade: { zh: '长杆/利刃', cut: 0, thrust: 1091 },
  shield: { zh: '盾牌/轻盾', blunt: 123 }
};

/**
 * Armour by kind, from in-game item cards (one high-quality set of each): head, body and legs each guard against cuts,
 * thrusts and blunt blows; light armour also deflects, 33% of blows at half damage (its card).
 */
export const ARMOUR = {
  // `slow`: the three pieces' movement penalties together (heavy 6% + 10% + 6%, light 3% + 7.5% + 4.5%).
  heavy: { zh: '重甲', en: 'heavy armour', head: { cut: 2603, thrust: 2343, blunt: 2083 }, body: { cut: 2603, thrust: 2343, blunt: 2083 }, legs: { cut: 2108, thrust: 1897, blunt: 1686 }, deflect: null, slow: 0.22 },
  light: { zh: '轻甲', en: 'light armour', head: { cut: 1379, thrust: 1510, blunt: 1762 }, body: { cut: 1116, thrust: 1223, blunt: 1426 }, legs: { cut: 1116, thrust: 1223, blunt: 1426 }, deflect: { chance: 0.33, less: 0.5 }, slow: 0.15 }
};

/**
 * Walking pace: an unarmoured man's (the demo's) less his armour's movement penalty and his gear's (a shield or a bow
 * card says −5%, the blades and axes 0%).
 */
const BASE_SPEED = 4.2;
const pace = (armour, gear = 0) => Math.round(BASE_SPEED * (1 - ARMOUR[armour].slow - gear) * 100) / 100;

/**
 * The damage formula. The game does not publish one, so this one is worked out from the cards and the health above
 * (tools/formula.mjs prints its table) to give fights that go back and forth:
 *
 *   raw    = weapon damage for the blow's kind × the move's share (a skill's or an art's official %, ×1.6 at most for a
 *            held blow) × crit × talents × the horse's speed
 *   dealt  = raw × POWER × K / (K + armour of that kind on that part) × half if light armour deflects it
 *   taken  = health × x / (1 + x / CAP), where x = dealt / health
 *
 * POWER stands for what levels and proficiency add (the cards show a weapon before them); K sets how much armour
 * matters; the last line bends very big blows so that none takes more than about CAP of a man's health. With these, an
 * ordinary blow takes 6–13% of a man's health, a held blow or a skill 10–25%, and the biggest weapon art with a crit
 * about 31%: no one falls to a single blow, and a fight is ten to sixteen clean blows.
 */
export const DAMAGE = { power: 2.8, armourK: 6000, cap: 0.4 };

/**
 * A weapon's four blows. `wind` is the raise before the blow, `recover` the time after it before the next,
 * `reach` how far it carries past his own body, `arc` the half-width of the swept angle, `cost` stamina.
 * `heavy` multiplies damage when the blow is held and let go (it also costs more and jolts a guard more).
 */
const blade = (kind, { wind = 0.4, recover = 0.42, reach = 2.0, arc = 60, cost = 12, thrust = {} } = {}) => ({
  L: { damage: kind.cut, wind, recover, reach, arc: deg(arc), cost },
  R: { damage: kind.cut, wind, recover, reach, arc: deg(arc), cost },
  O: { damage: kind.cut, wind: wind + 0.08, recover: recover + 0.04, reach: reach + 0.1, arc: deg(22), cost: cost + 2 },
  T: { damage: kind.thrust, wind: wind + (thrust.wind ?? 0.04), recover, reach: reach + (thrust.reach ?? 0.3), arc: deg(thrust.arc ?? 16), cost }
});

export const REGIMENTS = {
  yulin: {
    name: { zh: '羽林卫', en: 'Imperial Guard' },
    arms: { zh: '环首刀（单手利刃）· 盾', en: 'Ring-pommel sabre (one-handed blade) · shield' },
    way: { zh: '盾牌职业：持盾格挡。X 是刀的战技，Z 是盾的战技。', en: 'The shield profession: guards behind a shield. X is the blade’s weapon art, Z the shield’s.' },
    weapon: 'sabre',
    offhand: 'shield',
    armour: 'heavy',
    health: 18000,
    speed: pace('heavy', 0.05),
    blows: blade(WEAPONS.oneHanded, { wind: 0.44, recover: 0.46, reach: 1.95, arc: 58, cost: 12 }),
    // A shield covers left, right and thrusts whichever line the guard is set to; overhead still needs the line.
    shield: { lines: ['L', 'R', 'T'], arrowArc: deg(70), damage: WEAPONS.shield.blunt },
    // Stamina a guard spends for each thousand points of the blow it stops.
    guardCost: 26,
    art: 'finisher',
    offArt: 'shieldSlam',
    skills: ['charge', 'bull', 'counter', 'turning', 'moon'],
    talents: ['deterrence'],
    picks: { skills: ['charge', 'bull'], talents: ['deterrence'] }
  },
  tiger: {
    name: { zh: '虎步', en: 'Tiger Step' },
    arms: { zh: '汉剑（单手利刃）', en: 'Han sword (one-handed blade)' },
    way: { zh: '单手武器职业：一把单手剑，近身快攻。', en: 'The one-handed profession: a single sword, quick and close.' },
    weapon: 'jian',
    // Light armour: a low movement penalty, so the quickest on his feet; light armour deflects too.
    armour: 'light',
    health: 12000,
    speed: pace('light'),
    blows: blade(WEAPONS.oneHanded, { wind: 0.27, recover: 0.27, reach: 1.95, arc: 54, cost: 10, thrust: { reach: 0.4 } }),
    guardCost: 42,
    art: 'finisher',
    skills: ['spin', 'swing', 'mist'],
    talents: ['solo', 'lingering'],
    picks: { skills: ['spin', 'swing'], talents: ['solo', 'lingering'] }
  },
  vanguard: {
    name: { zh: '陷阵营', en: 'Berserker Battalion' },
    arms: { zh: '长斧（双手斧钺）', en: 'Long axe (two-handed axe)' },
    way: { zh: '双手武器职业：一把双手长斧，劈砍范围大。', en: 'The two-handed profession: a long two-handed axe with wide cuts.' },
    weapon: 'axe',
    armour: 'heavy',
    health: 20000,
    speed: pace('heavy'),
    blows: blade(WEAPONS.twoHandedAxe, { wind: 0.52, recover: 0.5, reach: 2.55, arc: 82, cost: 18 }),
    // A two-handed blow lands on a guard like a falling beam.
    heft: 1.25,
    guardCost: 35,
    art: 'axeSmash',
    skills: ['down', 'wave', 'whirl', 'leap', 'shout'],
    talents: ['heavyBane'],
    picks: { skills: ['down', 'wave'], talents: ['heavyBane'] }
  },
  plume: {
    name: { zh: '银翎卫', en: 'Silver Wing Guard' },
    arms: { zh: '方天戟（长杆斧钺）· 披甲战马', en: 'Fangtian ji (polearm axe) · armoured horse' },
    way: { zh: '长杆武器职业：骑马时挥砍、突刺，按 X 架枪；下马后 X 是斧钺猛击，职业技能也要下马才能施放。', en: 'The polearm profession: from the saddle he cuts and thrusts and couches the ji with X; on foot X is the Axe Smash, and his profession skills need him on foot too.' },
    weapon: 'ji',
    armour: 'heavy',
    health: 13000,
    speed: pace('heavy'),
    // His horse: speeds in metres a second, turns in radians a second (quick at a walk, wide at a gallop), the time to
    // get up and down, how near it must be, how fast it comes when called, its wind for galloping.
    horse: {
      health: 5700,
      walk: 2.4,
      canter: 6.2,
      gallop: 9.2,
      accel: 4.4,
      brake: 7,
      turn: { slow: 2.8, fast: 1.3 },
      mount: 1.1,
      dismount: 0.8,
      near: 3,
      call: 7,
      gallopCost: 10,
      body: 0.95,
      // Blows land on man or horse where they meet; with no bodies to hit here, a blow on a rider is split evenly.
      share: 0.5
    },
    // Blows from the saddle: the same weapon (its card gives mounted effect 100%), cuts to either side, an overhead cut
    // and a thrust; worth more the faster the horse goes.
    mounted: {
      L: { damage: WEAPONS.polearmAxe.cut, wind: 0.5, recover: 0.55, reach: 3.1, arc: deg(70), cost: 13 },
      R: { damage: WEAPONS.polearmAxe.cut, wind: 0.5, recover: 0.55, reach: 3.1, arc: deg(70), cost: 13 },
      O: { damage: WEAPONS.polearmAxe.cut, wind: 0.58, recover: 0.6, reach: 3.0, arc: deg(26), cost: 15 },
      T: { damage: WEAPONS.polearmAxe.thrust, wind: 0.46, recover: 0.5, reach: 3.5, arc: deg(14), cost: 12 }
    },
    saddle: { momentum: 0.35 },
    blows: {
      L: { damage: WEAPONS.polearmAxe.cut, wind: 0.5, recover: 0.52, reach: 2.65, arc: deg(60), cost: 14 },
      R: { damage: WEAPONS.polearmAxe.cut, wind: 0.5, recover: 0.52, reach: 2.65, arc: deg(60), cost: 14 },
      O: { damage: WEAPONS.polearmAxe.cut, wind: 0.56, recover: 0.52, reach: 2.8, arc: deg(20), cost: 16 },
      T: { damage: WEAPONS.polearmAxe.thrust, wind: 0.46, recover: 0.48, reach: 3.05, arc: deg(12), cost: 12 }
    },
    guardCost: 37,
    art: 'poleAxeSmash',
    mountedArt: 'couch',
    skills: ['returnSpear', 'stepCut', 'boar', 'flowers', 'drop'],
    talents: ['cavalry', 'centaur', 'equipped', 'vigour', 'armourBane'],
    playerSkills: ['returnSpear', 'boar'],
    picks: { skills: ['stepCut', 'boar'], talents: ['cavalry', 'centaur', 'equipped', 'vigour'] }
  },
  archer: {
    name: { zh: '武射史', en: 'Martial Archery Expert' },
    arms: { zh: '角弓 · 铁制狩猎刀', en: 'Horn bow · iron hunting knife' },
    way: { zh: '弓箭职业：拉开距离放箭；快捷栏 2 号是一把狩猎刀，被贴身时用。', en: 'The bow profession: keeps his distance and shoots; slot 2 holds a hunting knife for when a man gets close.' },
    weapon: 'bow',
    offhand: 'knife',
    armour: 'light',
    health: 11000,
    speed: pace('light', 0.05),
    // The knife, for when a man gets inside the bow (taken as a one-handed blade).
    blows: blade(WEAPONS.oneHanded, { wind: 0.3, recover: 0.36, reach: 1.55, arc: 50, cost: 9 }),
    // A full draw: the bow's card multiplies the arrow ×9.042; the arrow itself is not on a card and is taken as 140.
    bow: { draw: 1.05, full: 1266, least: 380, speed: 44, sway: 1.6, cost: 9 },
    guardCost: 50,
    art: 'volley',
    skills: ['fan', 'gale', 'backStep', 'blast', 'web'],
    talents: [],
    picks: { skills: ['fan', 'gale'], talents: [] }
  }
};

export const ORDER = ['yulin', 'tiger', 'vanguard', 'plume', 'archer'];

/**
 * Weapon arts (战技): X for the weapon in the main hand (from the saddle, the mounted art), Z for the shield. Each comes
 * from an in-game item card: its damage, its cooldown and the rage it spends. Rage fills in the fight and an art needs
 * its whole cost; a man's rage bar holds as much as his dearest art, so "full" is when the art can go. How much each
 * happening adds to rage is not published; these are this demo's.
 */
export const RAGE = { landed: 3.5, graze: 1.5, taken: 2.5, guarded: 1.5, deflected: 4, broke: 3, arrow: 3 };
export const ARTS = {
  finisher: {
    name: { zh: '终结打击', en: 'Finishing Strike' }, weapon: { zh: '单手/利刃', en: 'one-handed blade' },
    damage: 3.613, cool: 16.0, rage: 32.2, refund: 10, reach: 2.4,
    text: { zh: '向前进行攻击，造成 361.3% 武器伤害；如果击杀敌人，立刻刷新冷却，并返还 10 点怒气。', en: 'An attack forward for 361.3% weapon damage; a kill resets its cooldown at once and gives back 10 rage.' }
  },
  shieldSlam: {
    name: { zh: '盾牌猛击', en: 'Shield Slam' }, weapon: { zh: '盾牌/轻盾', en: 'light shield' },
    damage: 2.371, cool: 38.4, rage: 35.0, reach: 1.7,
    text: { zh: '猛烈地对敌人进行一次盾击，造成 237.1% 武器伤害，并击倒第 1 个命中的敌人。', en: 'A hard blow with the shield for 237.1% weapon damage that knocks down the first man it meets.' }
  },
  axeSmash: {
    name: { zh: '斧钺猛击', en: 'Axe Smash' }, weapon: { zh: '双手/斧钺', en: 'two-handed axe' },
    damage: 4.302, cool: 16.2, rage: 32.4, reach: 2.8,
    text: { zh: '对敌人进行大力挥击，总计造成 430.2% 武器伤害。', en: 'A mighty swing for 430.2% weapon damage in all.' }
  },
  poleAxeSmash: {
    name: { zh: '斧钺猛击', en: 'Axe Smash' }, weapon: { zh: '长杆/斧钺', en: 'polearm axe' },
    damage: 3.221, cool: 17.3, rage: 32.7, reach: 3.1,
    text: { zh: '对敌人进行大力挥击，总计造成 322.1% 武器伤害。', en: 'A mighty swing for 322.1% weapon damage in all.' }
  },
  volley: {
    name: { zh: '多重射击', en: 'Multi-Shot' }, weapon: { zh: '弓/短弓', en: 'short bow' },
    damage: 3.149, shots: 3, cool: 17.7, rage: 34.8,
    text: { zh: '快速拔出三支箭，连续进行三次射击，总计最多造成 314.9% 穿刺伤害。', en: 'Three arrows drawn quickly and loosed one after another, up to 314.9% piercing damage in all.' }
  },
  // The mounted art: the couched lance, needing the horse at a run (its card is a polearm blade's; a player confirms the
  // fangtian ji couches from the saddle too). A player's guide adds that its reach is shorter than a thrust's and that
  // the man it takes is best on the horse's right, the point held off the horse's head toward two o'clock. How long it
  // is held is this demo's.
  couch: {
    name: { zh: '架枪', en: 'Couched Lance' }, weapon: { zh: '长杆/利刃', en: 'polearm blade' },
    mounted: true, damage: 1.25, cool: 9.6, rage: 0, refund: 5, run: 5.5,
    last: 3.2, reach: 2.9, aim: deg(-60), arc: deg(18), stun: 1.1,
    text: { zh: '马上战技：骑乘战马、跑起来时可以架枪，对命中的敌人造成 125% 武器伤害；如果击杀敌人，立刻重置冷却，并返还 5 点怒气。', en: 'A mounted art: with the horse at a run he couches the ji; the man it meets takes 125% weapon damage, and a kill resets its cooldown and gives back 5 rage.' }
  }
};

/** The weapon arts a regiment can use, and the rage his bar holds: as much as the dearest of them. */
export const artsOf = (r) => [r.art, r.offArt, r.mountedArt].filter((id) => ARTS[id]);
export const rageOf = (r) => Math.max(0, ...artsOf(r).map((id) => ARTS[id].rage));

/**
 * Regiment skills. `cool` is the wait after use, `cost` its stamina. The fight looks up how each one moves and
 * strikes by its id; the numbers live here. Each `text` says only what the published notes say of the skill.
 */
export const SKILLS = {
  // Imperial Guard
  charge: { owner: 'yulin', name: { zh: '冲锋突刺', en: 'Charge and Thrust' }, cool: 12, cost: 18, range: 6, damage: 1.5,
    text: { zh: '向前冲锋，冲到身前突刺。', en: 'A charge forward into a thrust.' } },
  bull: { owner: 'yulin', name: { zh: '蛮牛冲击', en: 'Bull Charge' }, cool: 15, cost: stamina(75), range: 8, damage: 1.0, daze: 4, dazeGuarded: 2,
    text: { zh: '冲撞：被撞中的人 4 秒内无法攻击和防御（格挡时更短）；撞中骑兵会使其落马。', en: 'A barging charge: the man struck can neither attack nor defend for 4 s (less if he was guarding); a rider struck is unhorsed.' } },
  counter: { owner: 'yulin', name: { zh: '格挡反击', en: 'Parry and Counter' }, cool: 12, cost: stamina(62), hold: 1.5, damage: 2.6,
    text: { zh: '格挡住攻击后立即反击，伤害 260%。', en: 'A blow caught on the guard is answered at once, for 260%.' } },
  turning: { owner: 'yulin', name: { zh: '回身斩', en: 'Spinning Slash' }, cool: 10, cost: 22, damage: 2.8, reach: 2.4,
    text: { zh: '回身一斩，伤害 280%。', en: 'A turning cut for 280%.' } },
  moon: { owner: 'yulin', name: { zh: '圆月斩', en: 'Full Moon Slash' }, cool: 10, cost: 24, damage: 1.0, extra: 1.5, reach: 2.6,
    text: { zh: '体力越多伤害越高，体力带来的额外伤害最高 150%。', en: 'The more stamina, the harder: up to 150% more from stamina.' } },
  // Tiger Step
  swing: { owner: 'tiger', name: { zh: '挥砍', en: 'Swing Slash' }, cool: 10, cost: stamina(90), damage: 1.05, hits: 3, reach: 2.1,
    text: { zh: '连续挥砍，每次伤害 105%。', en: 'Repeated cuts at 105% each.' } },
  spin: { owner: 'tiger', name: { zh: '回旋击', en: 'Spinning Strike' }, cool: 10, cost: stamina(90), damage: 2.0, reach: 2.3,
    text: { zh: '回旋一击，打到身边所有人。', en: 'A whirling strike at everyone around him.' } },
  mist: { owner: 'tiger', name: { zh: '毒瘴', en: 'Poison Mist' }, cool: 23, cost: 20, radius: 4, cloud: 6, total: 240 * 6, last: 6, spread: 2, immune: 8,
    text: { zh: '放出毒瘴：中毒伤害 240（每秒），可传染给身边的人；中毒结束后 8 秒内不会再中这种毒。', en: 'A poison cloud: 240 poison damage a second, passing to those close by; once over, the same poison cannot take him for 8 s.' } },
  // Berserker Battalion
  down: { owner: 'vanguard', name: { zh: '下劈', en: 'Downward Slash' }, cool: 14, cost: stamina(80), damage: 2.4, radius: 2.5, ahead: 1.3,
    text: { zh: '下劈，伤害 240%，伤害范围半径 2.5 米。', en: 'A cut from above for 240%, over a 2.5 m radius.' } },
  wave: { owner: 'vanguard', name: { zh: '剑气斩', en: 'Sword Qi Slash' }, cool: 11, cost: stamina(105), damage: 1.7, speed: 18, range: 14,
    text: { zh: '劈出一道剑气，伤害 170%。', en: 'A cut that sends its edge flying, for 170%.' } },
  whirl: { owner: 'vanguard', name: { zh: '旋风斩', en: 'Whirlwind Slash' }, cool: 15, cost: stamina(60), damage: 0.345, hits: 5, reach: 2.6,
    text: { zh: '旋风斩，每次命中伤害 34.5%。', en: 'A whirlwind of cuts, 34.5% each.' } },
  leap: { owner: 'vanguard', name: { zh: '跳劈', en: 'Leap Slash' }, cool: 10, cost: 20, damage: 1.235, radius: 3, dash: 6.5,
    text: { zh: '跳起劈下，伤害 123.5%，伤害范围半径 3 米。', en: 'A leaping cut for 123.5%, over a 3 m radius.' } },
  shout: { owner: 'vanguard', name: { zh: '昂扬战吼', en: 'Spirited Battle Cry' }, cool: 25, cost: 10, last: 10, every: 2, mend: 0.05,
    text: { zh: '战吼：每 2 秒恢复已损失生命值的 5%。', en: 'A battle cry: 5% of lost health back every 2 s.' } },
  // Silver Wing Guard (on foot)
  returnSpear: { owner: 'plume', name: { zh: '回马枪', en: 'Returning Spear' }, cool: 10, cost: 18, damage: 1.12, reach: 3.05,
    sideDistance: 0.85, backDistance: 0.3, stepTime: 0.26, turnTime: 0.5, release: 0.55, duration: 0.92,
    text: { zh: '下马后横撤转身，再刺出一枪，造成 112% 突刺伤害。闪身可被打断。', en: 'On foot, step aside and turn into a single thrust for 112% thrust damage. A hit can interrupt the step.' } },
  stepCut: { owner: 'plume', name: { zh: '上步挥砍', en: 'Forward Slash' }, cool: 10, cost: 20, damage: 2.44, step: 1.8, reach: 3.0,
    text: { zh: '上步挥砍，伤害 244%。', en: 'A step in and a cut for 244%.' } },
  boar: { owner: 'plume', name: { zh: '猪突猛进', en: 'Ferocious Charge' }, cool: 14, cost: stamina(155), damage: [0.75, 0.9], dash: 7,
    text: { zh: '两段攻击：第一段伤害 75%，第二段 90%。', en: 'Two strikes: 75%, then 90%.' } },
  flowers: { owner: 'plume', name: { zh: '枪花乱舞', en: 'Spear Dance' }, cool: 14, cost: stamina(50), damage: 0.44, hits: 6, reach: 3.2, slow: 0.1,
    text: { zh: '连续刺击，每次伤害 44%；释放期间自身移动速度降低 10%。', en: 'A run of thrusts at 44% each; he moves 10% slower while it lasts.' } },
  drop: { owner: 'plume', name: { zh: '千斤坠', en: 'Thousand-Pound Descend' }, cool: 12, cost: 22, damage: 1.5, radius: 4.2, pin: 7, cap: 2.2,
    text: { zh: '攻击半径 4.2 米；命中高速移动的目标后，7 秒内限制其移动速度。', en: 'A 4.2 m radius; a man caught moving fast is held to a slow pace for 7 s.' } },
  // Martial Archery Expert
  fan: { owner: 'archer', name: { zh: '扇形射击', en: 'Scatter Shot' }, cool: 11, cost: 20, damage: [0.33, 2.1], near: 2, far: 12, shots: 5, spread: deg(34),
    text: { zh: '扇形射出一片箭，对范围内目标造成 33%–210% 的伤害。', en: 'A fan of arrows: 33%–210% to those in its spread.' } },
  gale: { owner: 'archer', name: { zh: '飓风箭', en: 'Storm Arrow' }, cool: 15, cost: stamina(90), damage: 1.05, width: 1.2,
    text: { zh: '飓风箭，伤害 105%。', en: 'A storm arrow for 105%.' } },
  backStep: { owner: 'archer', name: { zh: '后撤步', en: 'Back Step' }, cool: 9, cost: 18, damage: 1.48, dash: 4,
    text: { zh: '后撤一步并放箭，伤害 148%。', en: 'A step back with an arrow for 148%.' } },
  blast: { owner: 'archer', name: { zh: '爆炸箭', en: 'Explosive Arrow' }, cool: 12, cost: stamina(90), damage: 1.1, radius: 3.5,
    text: { zh: '命中后爆炸，伤害 110%，爆炸半径 3.5 米。', en: 'Bursts where it strikes, 110%, over 3.5 m.' } },
  web: { owner: 'archer', name: { zh: '蛛网束缚', en: 'Web Shot' }, cool: 14, cost: 18, damage: 0.828, radius: 3.4, last: 5, slow: 0.4,
    text: { zh: '命中伤害 82.8%，张开蛛网；网中的目标持续减速 40%。', en: 'Hits for 82.8% and spreads a web; inside it a man is slowed by 40%.' } }
};

/** Talents: only those whose effect the published notes state in full. */
export const TALENTS = {
  deterrence: { owner: 'yulin', name: { zh: '强化威慑', en: 'Heightened Deterrence' }, drain: 8,
    text: { zh: '每次成功格挡敌人的攻击，额外扣除敌人 8 点体力。', en: 'Each blow guarded takes 8 more stamina from the man who struck.' } },
  solo: { owner: 'tiger', name: { zh: '万人敌', en: 'Solo Fighter' }, crit: 0.25,
    text: { zh: '暴击伤害提高 25%。', en: 'Critical damage 25% higher.' } },
  lingering: { owner: 'tiger', name: { zh: '命悬一线', en: 'Lingering Life' }, below: 0.5, resist: 0.12,
    text: { zh: '生命值低于 50% 时，抗暴击提高 12%。', en: 'Below 50% health, 12% more resistance to critical blows.' } },
  cavalry: { owner: 'plume', name: { zh: '金戈铁马', en: 'Cavalry' }, less: 0.12,
    text: { zh: '骑乘时受到的伤害降低 12%。', en: 'On horseback, 12% less damage taken.' } },
  centaur: { owner: 'plume', name: { zh: '人马合一', en: 'Centaur' }, more: 0.08,
    text: { zh: '骑乘时造成的伤害提高 8%。', en: 'On horseback, 8% more damage dealt.' } },
  equipped: { owner: 'plume', name: { zh: '装备精良', en: 'Well-Equipped' }, crit: 0.12,
    text: { zh: '暴击伤害提高 12%，骑乘时不生效。', en: 'Critical damage 12% higher; not on horseback.' } },
  heavyBane: { owner: 'vanguard', name: { zh: '克制重甲', en: 'Heavy Armour Counter' }, more: 0.2,
    text: { zh: '对重甲目标伤害提高 20%。', en: '20% more damage against heavy armour.' } },
  armourBane: { owner: 'plume', name: { zh: '重甲克星', en: 'Heavy Armor Nemesis' }, more: 0.1,
    text: { zh: '击中重甲时伤害提高 10%，骑乘时也生效。', en: '10% more damage on heavy armour, on horseback too.' } },
  vigour: { owner: 'plume', name: { zh: '龙精虎猛', en: 'Full Vigour' }, above: 0.85, less: 0.45,
    text: { zh: '生命值高于 85% 时，受到的伤害降低 45%。', en: 'Above 85% health, 45% less damage taken.' } }
};

/** The defaults for a regiment, or a checked copy of a chosen loadout (two skills, up to four talents of his own). */
export function loadout(regiment, chosen = {}, { player = false } = {}) {
  const r = REGIMENTS[regiment];
  if (!r) throw Error('Unknown regiment: ' + regiment);
  const defaults = player && r.playerSkills ? r.playerSkills : r.picks.skills;
  const skills = (chosen.skills ?? defaults).filter((id) => r.skills.includes(id));
  const talents = (chosen.talents ?? r.picks.talents).filter((id) => r.talents.includes(id));
  const unique = (list) => [...new Set(list)];
  const s = unique(skills).slice(0, 2),
    t = unique(talents).slice(0, 4);
  for (const id of defaults) if (s.length < 2 && !s.includes(id)) s.push(id);
  // Talents are as chosen (none is a choice too); with no choice given, the defaults.
  if (!chosen.talents) for (const id of r.picks.talents) if (t.length < 4 && !t.includes(id)) t.push(id);
  return { regiment, skills: s, talents: t };
}

export function playerLoadout(regiment, chosen) {
  return loadout(regiment, chosen, { player: true });
}
