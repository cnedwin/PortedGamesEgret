// The five regiments: their arms, their blows, their regiment skills and their talents, as plain numbers.
// Nothing here draws or plays; the fight in fight.mjs reads these tables.
//
// Distances are metres, times seconds, angles radians, damage in hit points (a man has about a thousand).
// A blow comes from one of four lines: L (from his left), R (from his right), O (overhead) and T (a thrust).

export const LINES = ['L', 'R', 'O', 'T'];

const deg = (d) => (d * Math.PI) / 180;

/**
 * A weapon's four blows. `wind` is the raise before the blow, `recover` the time after it before the next,
 * `reach` how far it carries past his own body, `arc` the half-width of the swept angle, `cost` stamina.
 * `heavy` multiplies damage when the blow is held and let go (it also costs more and jolts a guard more).
 */
const blade = (base, { wind = 0.4, recover = 0.42, reach = 2.0, arc = 60, cost = 12, overBonus = 1.15, thrust = {} } = {}) => ({
  L: { damage: base, wind, recover, reach, arc: deg(arc), cost },
  R: { damage: base, wind, recover, reach, arc: deg(arc), cost },
  O: { damage: Math.round(base * overBonus), wind: wind + 0.08, recover: recover + 0.04, reach: reach + 0.1, arc: deg(22), cost: cost + 2 },
  T: { damage: Math.round(base * (thrust.k ?? 0.95)), wind: wind + (thrust.wind ?? 0.04), recover, reach: reach + (thrust.reach ?? 0.3), arc: deg(thrust.arc ?? 16), cost }
});

export const REGIMENTS = {
  yulin: {
    name: { zh: '羽林卫', en: 'Yulin Guard' },
    arms: { zh: '环首刀 · 圆盾', en: 'Ring-pommel sabre · round shield' },
    way: { zh: '盾挡一面，挡下就反击。稳。', en: 'The shield takes a whole side; every guard is a chance to answer. Steady.' },
    weapon: 'sabre',
    offhand: 'shield',
    health: 1100,
    speed: 3.05,
    blows: blade(74, { wind: 0.4, recover: 0.42, reach: 1.95, arc: 58, cost: 12 }),
    // A shield covers left, right and thrusts whichever line the guard is set to; overhead still needs the line.
    shield: { lines: ['L', 'R', 'T'], arrowArc: deg(70) },
    guardCost: 0.38,
    skills: ['counter', 'bull', 'turning', 'moon'],
    talents: ['ironWall', 'againstStream', 'burntBoats', 'shieldBash', 'strongWalls', 'recoil'],
    picks: { skills: ['counter', 'moon'], talents: ['ironWall', 'burntBoats', 'shieldBash', 'recoil'] }
  },
  tiger: {
    name: { zh: '虎步', en: 'Tiger Step' },
    arms: { zh: '汉剑', en: 'Han sword' },
    way: { zh: '快剑贴身，暴击、毒和放血。', en: 'A quick sword close in: critical cuts, poison and bleeding.' },
    weapon: 'jian',
    health: 1000,
    speed: 3.5,
    blows: blade(84, { wind: 0.3, recover: 0.3, reach: 1.95, arc: 54, cost: 10, thrust: { k: 1.05, reach: 0.4 } }),
    crit: { chance: 0.2, power: 1.6 },
    guardCost: 0.5,
    skills: ['swing', 'spin', 'mist'],
    talents: ['bloodletting', 'lastThread', 'tenThousand', 'cicada', 'quickFeet', 'venom'],
    picks: { skills: ['swing', 'mist'], talents: ['bloodletting', 'lastThread', 'tenThousand', 'cicada'] }
  },
  vanguard: {
    name: { zh: '陷阵营', en: 'Vanguard' },
    arms: { zh: '斩马刀（双手）', en: 'Two-handed horse-cutter' },
    way: { zh: '大开大合，一刀扫一片。战吼回血硬扛。', en: 'Wide, heavy arcs that take in everyone near. A shout that heals him through it.' },
    weapon: 'zhanma',
    health: 1250,
    speed: 2.9,
    blows: blade(145, { wind: 0.52, recover: 0.5, reach: 2.55, arc: 82, cost: 18, overBonus: 1.2 }),
    // A two-handed blow lands on a guard like a falling beam.
    heft: 1.4,
    guardCost: 0.42,
    skills: ['whirl', 'wave', 'down', 'leap', 'shout'],
    talents: ['valour', 'fatal', 'shieldBreaker', 'lastStand', 'unstoppable', 'bloodThirst'],
    picks: { skills: ['leap', 'shout'], talents: ['valour', 'fatal', 'unstoppable', 'bloodThirst'] }
  },
  plume: {
    name: { zh: '银翎卫', en: 'Silver Plume' },
    arms: { zh: '长枪', en: 'Long spear' },
    way: { zh: '一枪之距，冲锋突刺，压住乱跑的人。', en: 'A spear’s length away; charges, thrusts, and pins down a man who runs.' },
    weapon: 'spear',
    health: 950,
    speed: 3.2,
    blows: {
      L: { damage: 80, wind: 0.5, recover: 0.52, reach: 2.65, arc: deg(60), cost: 14 },
      R: { damage: 80, wind: 0.5, recover: 0.52, reach: 2.65, arc: deg(60), cost: 14 },
      O: { damage: 94, wind: 0.56, recover: 0.52, reach: 2.8, arc: deg(20), cost: 16 },
      T: { damage: 88, wind: 0.46, recover: 0.48, reach: 3.05, arc: deg(12), cost: 12 }
    },
    guardCost: 0.45,
    skills: ['flowers', 'boar', 'drop'],
    talents: ['ironHorse', 'oneThrust', 'dragon', 'longArm', 'turningSpear', 'steady'],
    picks: { skills: ['flowers', 'boar'], talents: ['ironHorse', 'oneThrust', 'dragon', 'longArm'] }
  },
  archer: {
    name: { zh: '武射史', en: 'Archer' },
    arms: { zh: '角弓 · 短刀', en: 'Horn bow · short knife' },
    way: { zh: '拉开距离放箭，被贴身就后撤、下网。', en: 'Keeps his distance and shoots; caught close, he steps back and throws a web.' },
    weapon: 'bow',
    offhand: 'knife',
    health: 880,
    speed: 3.35,
    // The knife, for when a man gets inside the bow.
    blows: blade(58, { wind: 0.3, recover: 0.36, reach: 1.55, arc: 50, cost: 9 }),
    bow: { draw: 1.05, full: 92, least: 30, speed: 44, sway: 1.6, cost: 9 },
    guardCost: 0.6,
    skills: ['gale', 'fan', 'backStep', 'blast', 'web'],
    talents: ['hundredPaces', 'steadyBow', 'pearls', 'piercing', 'swiftWind', 'shortKnife'],
    picks: { skills: ['backStep', 'web'], talents: ['hundredPaces', 'steadyBow', 'pearls', 'shortKnife'] }
  }
};

export const ORDER = ['yulin', 'tiger', 'vanguard', 'plume', 'archer'];

/**
 * Regiment skills. `cool` is the wait after use, `cost` its stamina. The fight looks up how each one moves and
 * strikes by its id; the numbers live here.
 */
export const SKILLS = {
  // Yulin Guard
  counter: { owner: 'yulin', name: { zh: '格挡反击', en: 'Guard and Counter' }, cool: 9, cost: 18, hold: 1.5, damage: 2.2, stun: 0.9,
    text: { zh: '举盾 1.5 秒，挡下一击立刻反斩，对手震晕。', en: 'Shield up for 1.5 s; a blow taken is answered at once with a cut that stuns.' } },
  bull: { owner: 'yulin', name: { zh: '蛮牛冲击', en: 'Bull Charge' }, cool: 11, cost: 30, range: 8, damage: 1.5, knock: 1.1,
    text: { zh: '举盾冲出 8 米，撞倒第一个人。', en: 'Eight metres behind the shield; the first man met is knocked down.' } },
  turning: { owner: 'yulin', name: { zh: '回身斩', en: 'Turning Cut' }, cool: 8, cost: 22, damage: 2.8, reach: 2.4,
    text: { zh: '转身一圈，四周的人都吃 280%。', en: 'A full turn; everyone round him takes 280%.' } },
  moon: { owner: 'yulin', name: { zh: '圆月斩', en: 'Full-Moon Cut' }, cool: 10, cost: 24, damage: 3.0, reach: 2.8,
    text: { zh: '前方大半圆一刀 300%，出手快。', en: 'One wide arc ahead for 300%, quick from the hand.' } },
  // Tiger Step
  swing: { owner: 'tiger', name: { zh: '挥砍', en: 'Swing Cut' }, cool: 7, cost: 26, damage: 1.05, hits: 3, reach: 2.1,
    text: { zh: '三连斩，每下 105%，可以暴击。', en: 'Three cuts at 105% each, any of them can be critical.' } },
  spin: { owner: 'tiger', name: { zh: '回旋击', en: 'Spinning Strike' }, cool: 9, cost: 26, damage: 1.6, dash: 4.2,
    text: { zh: '旋身穿过对手，一路带伤，落到他背后。', en: 'Spins through the foe, cutting on the way, and lands behind him.' } },
  mist: { owner: 'tiger', name: { zh: '毒瘴', en: 'Poison Mist' }, cool: 14, cost: 20, radius: 4, last: 6, dps: 28, immune: 8,
    text: { zh: '4 米毒雾，中毒六秒；毒过的人一阵子不再中毒。', en: 'A 4 m cloud that poisons for six seconds; a man who has had it is immune for a while.' } },
  // Vanguard
  whirl: { owner: 'vanguard', name: { zh: '旋风斩', en: 'Whirlwind' }, cool: 12, cost: 34, damage: 0.6, hits: 5, reach: 2.6,
    text: { zh: '边走边转，五段斩，扫到的人都吃。', en: 'Five spinning cuts on the move; everyone in reach takes them.' } },
  wave: { owner: 'vanguard', name: { zh: '剑气斩', en: 'Blade Wave' }, cool: 9, cost: 22, damage: 1.25, speed: 18, range: 14,
    text: { zh: '一刀劈出一道飞出去的刀气。', en: 'A cut whose edge flies on across the ground.' } },
  down: { owner: 'vanguard', name: { zh: '下劈', en: 'Downward Cut' }, cool: 8, cost: 24, damage: 2.4, reach: 2.7,
    text: { zh: '高举重劈 240%，挡住也要掉一大截体力。', en: 'A raised, heavy cut for 240%; even a guard loses much stamina to it.' } },
  leap: { owner: 'vanguard', name: { zh: '跳劈', en: 'Leap Cut' }, cool: 9, cost: 24, damage: 1.235, dash: 6.5, reach: 2.4,
    text: { zh: '扑出六七米再劈 123.5%，追人用。', en: 'A leap of six or seven metres into a cut for 123.5%; for catching a runner.' } },
  shout: { owner: 'vanguard', name: { zh: '昂扬战吼', en: 'Rallying Shout' }, cool: 20, cost: 10, last: 10, every: 2, mend: 0.05,
    text: { zh: '十秒内每两秒回 5% 已损生命。', en: 'For ten seconds, 5% of lost health back every two.' } },
  // Silver Plume
  flowers: { owner: 'plume', name: { zh: '枪花乱舞', en: 'Spear Flowers' }, cool: 8, cost: 30, damage: 0.44, hits: 6, reach: 3.2, slow: 0.1,
    text: { zh: '六连刺，每下 44%，出枪时自己慢一成。', en: 'Six thrusts at 44% each; he moves a tenth slower while they last.' } },
  boar: { owner: 'plume', name: { zh: '猪突猛进', en: 'Boar’s Rush' }, cool: 10, cost: 30, damage: [0.8, 1.5], dash: 7,
    text: { zh: '两段冲刺：先冲一段，再一枪顶出去，第二段更重。', en: 'A rush in two parts: a dash, then a driving thrust that hits harder.' } },
  drop: { owner: 'plume', name: { zh: '千斤坠', en: 'Thousand-Weight Drop' }, cool: 11, cost: 26, damage: 1.7, radius: 2.6, pin: 7, cap: 2.2,
    text: { zh: '跃起砸地；被砸中还在跑的人，7 秒内跑不快。', en: 'A leaping slam; a man it catches on the move is held to a walk for 7 s.' } },
  // Archer
  gale: { owner: 'archer', name: { zh: '飓风箭', en: 'Gale Arrows' }, cool: 12, cost: 28, damage: 0.7, shots: 5, gap: 0.12,
    text: { zh: '连发五箭，每箭 70%。', en: 'Five arrows in a stream at 70% each.' } },
  fan: { owner: 'archer', name: { zh: '扇形射击', en: 'Fan Shot' }, cool: 8, cost: 20, damage: 0.65, shots: 5, spread: deg(34),
    text: { zh: '一弓五箭成扇面，近处躲不开。', en: 'Five arrows from one draw, in a fan; hard to avoid up close.' } },
  backStep: { owner: 'archer', name: { zh: '后撤步', en: 'Back Step' }, cool: 6, cost: 18, damage: 0.9, dash: 4,
    text: { zh: '向后一跃拉开距离，落地前放一箭。', en: 'A hop back out of reach, loosing one arrow before he lands.' } },
  blast: { owner: 'archer', name: { zh: '爆炸箭', en: 'Blast Arrow' }, cool: 10, cost: 26, damage: 1.1, radius: 2.4,
    text: { zh: '箭落处炸开 110%，格挡挡不住爆炸。', en: 'Bursts where it lands for 110%; a guard does not stop the blast.' } },
  web: { owner: 'archer', name: { zh: '蛛网束缚', en: 'Web' }, cool: 12, cost: 18, radius: 3.4, last: 5, slow: 0.4,
    text: { zh: '射出一张网，网里的人慢四成。', en: 'Shoots out a web; inside it a man moves four tenths slower.' } }
};

export const TALENTS = {
  ironWall: { owner: 'yulin', name: { zh: '铁壁', en: 'Iron Wall' }, text: { zh: '格挡耗体力少三成。', en: 'Guarding costs 30% less stamina.' } },
  againstStream: { owner: 'yulin', name: { zh: '逆流而上', en: 'Against the Stream' }, text: { zh: '举盾挡箭的角度更大。', en: 'The shield catches arrows over a wider arc.' } },
  burntBoats: { owner: 'yulin', name: { zh: '破釜沉舟', en: 'Burnt Boats' }, text: { zh: '受击时三成几率六秒减伤两成，三十秒一次。', en: 'On a hit taken, a 30% chance of 20% less damage for 6 s; once in 30 s.' } },
  shieldBash: { owner: 'yulin', name: { zh: '盾击', en: 'Shield Bash' }, text: { zh: '踢腿换成盾撞，晕得更久。', en: 'The kick becomes a shield bash that stuns longer.' } },
  strongWalls: { owner: 'yulin', name: { zh: '坚城', en: 'Strong Walls' }, text: { zh: '生命多一成。', en: '10% more health.' } },
  recoil: { owner: 'yulin', name: { zh: '反震', en: 'Recoil' }, text: { zh: '被挡下的人多掉体力。', en: 'A man guarded against loses more stamina.' } },
  bloodletting: { owner: 'tiger', name: { zh: '放血', en: 'Bloodletting' }, text: { zh: '中剑后一秒内还在走动，再掉一截血。', en: 'A man still moving a second after a cut loses more blood.' } },
  lastThread: { owner: 'tiger', name: { zh: '命悬一线', en: 'Last Thread' }, text: { zh: '生命跌破一半时，立刻回一成五，一局一次。', en: 'When health falls below half, 15% comes back at once; once a bout.' } },
  tenThousand: { owner: 'tiger', name: { zh: '万人敌', en: 'Match for Ten Thousand' }, text: { zh: '暴击伤害多 25%。', en: 'Critical cuts 25% harder.' } },
  cicada: { owner: 'tiger', name: { zh: '金蝉脱壳', en: 'Cicada Shell' }, text: { zh: '闪步后一秒内减伤 35%。', en: '35% less damage for a second after a step.' } },
  quickFeet: { owner: 'tiger', name: { zh: '疾步', en: 'Quick Feet' }, text: { zh: '走得快 8%。', en: '8% faster on his feet.' } },
  venom: { owner: 'tiger', name: { zh: '淬毒', en: 'Venom' }, text: { zh: '普通出剑带轻毒。', en: 'Ordinary cuts carry a light poison.' } },
  valour: { owner: 'vanguard', name: { zh: '勇武', en: 'Valour' }, text: { zh: '伤害多 12%。', en: '12% more damage.' } },
  fatal: { owner: 'vanguard', name: { zh: '致命一击', en: 'Fatal Blow' }, text: { zh: '15% 几率无视格挡。', en: 'A 15% chance to cut straight through a guard.' } },
  shieldBreaker: { owner: 'vanguard', name: { zh: '破盾者', en: 'Shield Breaker' }, text: { zh: '砍在格挡上掉对方更多体力。', en: 'Blows on a guard take more of his stamina.' } },
  lastStand: { owner: 'vanguard', name: { zh: '死战', en: 'Last Stand' }, text: { zh: '生命越低伤害越高，最多多三成。', en: 'The lower his health, the harder he hits, up to 30%.' } },
  unstoppable: { owner: 'vanguard', name: { zh: '霸体', en: 'Unstoppable' }, text: { zh: '蓄力重劈时挨打不会被打断。', en: 'A held heavy cut is not interrupted by blows.' } },
  bloodThirst: { owner: 'vanguard', name: { zh: '嗜血', en: 'Blood Thirst' }, text: { zh: '每次砍中回 3% 生命。', en: 'Each hit gives back 3% of his health.' } },
  ironHorse: { owner: 'plume', name: { zh: '金戈铁马', en: 'Iron Horse' }, text: { zh: '冲刺中减伤两成。', en: '20% less damage while charging or sprinting.' } },
  oneThrust: { owner: 'plume', name: { zh: '一枪毙命', en: 'One Thrust' }, text: { zh: '突刺伤害多 15%。', en: 'Thrusts 15% harder.' } },
  dragon: { owner: 'plume', name: { zh: '枪出如龙', en: 'Dragon Spear' }, text: { zh: '冲刺后的第一枪多两成。', en: 'The first blow after a sprint is 20% harder.' } },
  longArm: { owner: 'plume', name: { zh: '长兵', en: 'Long Arm' }, text: { zh: '攻击距离多 0.4 米。', en: '0.4 m more reach.' } },
  turningSpear: { owner: 'plume', name: { zh: '回马枪', en: 'Turning Spear' }, text: { zh: '闪步后立刻出枪，必是一记快刺。', en: 'A blow straight out of a step is always a quick thrust.' } },
  steady: { owner: 'plume', name: { zh: '稳如山', en: 'Steady as a Hill' }, text: { zh: '挨打时踉跄短一半。', en: 'Half as long staggered by blows.' } },
  hundredPaces: { owner: 'archer', name: { zh: '百步穿杨', en: 'Hundred Paces' }, text: { zh: '12 米外伤害 ×1.3，20 米外 ×1.5。', en: '×1.3 past 12 m, ×1.5 past 20 m.' } },
  steadyBow: { owner: 'archer', name: { zh: '能弓善射', en: 'Steady Bow' }, text: { zh: '拉满弓不再抖。', en: 'No sway at full draw.' } },
  pearls: { owner: 'archer', name: { zh: '连珠', en: 'String of Pearls' }, text: { zh: '拉弓快 25%。', en: 'Draws 25% faster.' } },
  piercing: { owner: 'archer', name: { zh: '破甲箭', en: 'Piercing Head' }, text: { zh: '箭被格挡也透过一半伤害。', en: 'Half an arrow’s damage goes through a guard.' } },
  swiftWind: { owner: 'archer', name: { zh: '疾风', en: 'Swift Wind' }, text: { zh: '拉弓时走得快。', en: 'Walks faster while drawing.' } },
  shortKnife: { owner: 'archer', name: { zh: '短刀', en: 'Short Knife' }, text: { zh: '短刀伤害多三成。', en: 'The knife does 30% more.' } }
};

/** The defaults for a regiment, or a checked copy of a chosen loadout (two skills, four talents of his own). */
export function loadout(regiment, chosen = {}) {
  const r = REGIMENTS[regiment];
  if (!r) throw Error('Unknown regiment: ' + regiment);
  const skills = (chosen.skills ?? r.picks.skills).filter((id) => r.skills.includes(id));
  const talents = (chosen.talents ?? r.picks.talents).filter((id) => r.talents.includes(id));
  const unique = (list) => [...new Set(list)];
  const s = unique(skills).slice(0, 2),
    t = unique(talents).slice(0, 4);
  for (const id of r.picks.skills) if (s.length < 2 && !s.includes(id)) s.push(id);
  for (const id of r.picks.talents) if (t.length < 4 && !t.includes(id)) t.push(id);
  return { regiment, skills: s, talents: t };
}
