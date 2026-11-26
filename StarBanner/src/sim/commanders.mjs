// 指挥官与他们的「战意技」：四位都是本作原创人物，分属晨星王国与夜鸦公国。战意槽的规则同原作：每回合结束、主动攻击、
// 反击、击倒敌人各涨一些，满了就能在指挥官行动时放出一次。
// The commanders and their rally arts. All four are this game's own people, two of the Morningstar Kingdom and two of
// the Nightraven Duchy. The meter follows the original's rule: it fills a little at the end of each turn, on an
// attack, on a counterattack and on a kill, and when full the commander may spend it as their action.

export const FACTIONS = {
  dawn: { zh: '晨星王国', en: 'Morningstar Kingdom' },
  raven: { zh: '夜鸦公国', en: 'Nightraven Duchy' }
};

/**
 * `art.kind` picks how the art is aimed in src/sim/rules.mjs: `line` (a direction from the commander), `blast` (a tile
 * within `reach`, everything within `radius` of it), `aura` (everything within `radius` of the commander).
 * `charge` is what fills the meter: `turn` at the end of each of the side's turns, `attack`, `counter`, `kill`.
 */
export const COMMANDERS = {
  seline: {
    zh: '赛琳',
    en: 'Seline',
    faction: 'dawn',
    title: { zh: '晨星见习圣骑士', en: 'Squire-Paladin of the Morning Star' },
    blurb: {
      zh: '王国最年轻的圣骑士候补，银发双辫，枪尖挂着王国的星旗。冲锋时从不回头。',
      en: 'The kingdom’s youngest paladin candidate, silver braids flying, the star banner tied to her lance. She never looks back in a charge.'
    },
    art: {
      kind: 'line',
      length: 3,
      power: 1,
      zh: '破晓突刺',
      en: 'Daybreak Lance',
      text: { zh: '朝一个方向连刺三格，三格内每个敌人都按满血吃她一枪。', en: 'Thrusts three tiles in one direction; every foe in the line takes a full-strength blow.' }
    },
    meter: 150,
    charge: { turn: 10, attack: 20, counter: 10, kill: 30 }
  },
  edmund: {
    zh: '埃德蒙',
    en: 'Edmund',
    faction: 'dawn',
    title: { zh: '宫廷大法师', en: 'Archmage of the Court' },
    blurb: {
      zh: '侍奉过三代国王的老法师，眼镜永远滑到鼻尖。据说他的星图比王国的地图还准。',
      en: 'Archmage to three kings, spectacles always at the tip of his nose. They say his star charts are truer than the kingdom’s maps.'
    },
    art: {
      kind: 'blast',
      reach: 5,
      radius: 1,
      amount: 30,
      zh: '星落',
      en: 'Starfall',
      text: { zh: '选五格内一处，那里和四周一格的敌人各掉 30 点生命（指挥官和建筑至少留 1 点）。', en: 'Pick a tile within five; foes on it and next to it lose 30 health (commanders and buildings keep at least 1).' }
    },
    meter: 200,
    charge: { turn: 10, attack: 20, counter: 10, kill: 30 }
  },
  vireta: {
    zh: '维蕾塔',
    en: 'Vireta',
    faction: 'raven',
    title: { zh: '夜鸦女公爵', en: 'Duchess of the Nightravens' },
    blurb: {
      zh: '黑羽披肩、银冠红瞳的年轻女公爵。她说话很轻，鸦群却总为她而来。',
      en: 'A young duchess in a shawl of black feathers, a silver tiara and crimson eyes. She speaks softly, yet the ravens always come for her.'
    },
    art: {
      kind: 'aura',
      radius: 2,
      amount: 20,
      drain: 0.5,
      zh: '鸦羽契约',
      en: 'Raven Pact',
      text: { zh: '身边两格内的敌人各掉 20 点生命（至少留 1 点），她回复吸走总量的一半。', en: 'Foes within two tiles lose 20 health (keeping at least 1); she regains half of all that was drained.' }
    },
    meter: 150,
    charge: { turn: 10, attack: 20, counter: 10, kill: 30 }
  },
  garron: {
    zh: '格伦',
    en: 'Garron',
    faction: 'raven',
    title: { zh: '黑铁骑士团长', en: 'Marshal of the Iron Order' },
    blurb: {
      zh: '身经百战的黑甲骑士团长，脸上的伤疤比勋章还多。只要他站着，公国的阵线就不会退。',
      en: 'A black-armoured marshal with more scars than medals. While he stands, the duchy’s line does not give ground.'
    },
    art: {
      kind: 'aura',
      radius: 2,
      heal: 10,
      guard: 0.4,
      zh: '黑铁号令',
      en: 'Iron Command',
      text: { zh: '他和身边两格内的友军回复 10 点生命，直到他下回合开始前受到的伤害减少 40%。', en: 'He and allies within two tiles regain 10 health and take 40% less damage until his next turn.' }
    },
    meter: 100,
    charge: { turn: 10, attack: 20, counter: 10, kill: 30 }
  }
};

export const COMMANDER_ORDER = ['seline', 'edmund', 'vireta', 'garron'];
