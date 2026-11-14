// Martial arts. Twelve classes, five tiers each. Tiers one to three are open
// to every sect; tiers four and five belong to one sect. Every art has three
// moves, learned at mastery levels 1, 4 and 7.
//
// Names come from traditional Chinese martial arts and classical texts.

/**
 * A class of art.
 *   family    which side of the weapon triangle it is on ('hand' beats 'pole',
 *             'pole' beats 'edge', 'edge' beats 'hand'); null stays out of it
 *   aptitude  the recruit aptitude that speeds its training
 *   attrs     the attributes that drive its damage (averaged)
 *   weapon    the weapon slot it needs, or null for bare hands
 *   combat    whether its moves are strikes (false: a passive or support art)
 *   range     reach in metres
 */
export const CLASSES = {
  fist: { name: '拳', family: 'hand', aptitude: 'fist', attrs: ['arm'], weapon: 'glove', combat: true, range: 1.6 },
  palm: { name: '掌', family: 'hand', aptitude: 'fist', attrs: ['arm', 'nei'], weapon: 'glove', combat: true, range: 1.6 },
  leg: { name: '腿', family: null, aptitude: 'fist', attrs: ['leg'], weapon: null, combat: true, range: 1.9 },
  point: { name: '点穴', family: 'hand', aptitude: 'fist', attrs: ['agi', 'nei'], weapon: 'stylus', combat: true, range: 1.5 },
  saber: { name: '刀', family: 'edge', aptitude: 'blade', attrs: ['arm', 'waist'], weapon: 'saber', combat: true, range: 2.1 },
  sword: { name: '剑', family: 'edge', aptitude: 'blade', attrs: ['waist', 'agi'], weapon: 'sword', combat: true, range: 2.2 },
  spear: { name: '枪', family: 'pole', aptitude: 'pole', attrs: ['waist', 'leg'], weapon: 'spear', combat: true, range: 3.0 },
  staff: { name: '棍', family: 'pole', aptitude: 'pole', attrs: ['arm', 'waist'], weapon: 'staff', combat: true, range: 2.8 },
  dart: { name: '暗器', family: null, aptitude: 'dart', attrs: ['dart', 'agi'], weapon: 'dart', combat: true, range: 9.0 },
  inner: { name: '内功', family: null, aptitude: 'inner', attrs: ['nei'], weapon: null, combat: false, range: 0 },
  light: { name: '轻功', family: null, aptitude: 'inner', attrs: ['leg', 'agi'], weapon: null, combat: false, range: 0 },
  craft: { name: '奇术', family: null, aptitude: 'inner', attrs: ['wit'], weapon: null, combat: false, range: 0 },
};
export const CLASS_KEYS = Object.keys(CLASSES);

/** What beats what: the key's family deals more to the value's family. */
export const BEATS = { hand: 'pole', pole: 'edge', edge: 'hand' };

/** Base power of a move by its art's tier (index = tier). */
export const TIER_POWER = [0, 40, 60, 85, 115, 150];

// class, tier, sect (null = open to all), name, three move names
const ROWS = [
  // ---- open to every sect ----------------------------------------------------------------
  ['fist', 1, null, '太祖长拳', ['懒扎衣', '七星拳', '探马势']],
  ['fist', 2, null, '六合拳', ['六合冲拳', '拗步横拳', '贴身靠']],
  ['fist', 3, null, '形意拳', ['劈拳', '崩拳', '虎扑']],
  ['palm', 1, null, '擒拿手', ['缠丝擒', '反关节', '锁喉扣']],
  ['palm', 2, null, '绵掌', ['云手', '推波', '绵里藏针']],
  ['palm', 3, null, '八卦掌', ['单换掌', '双换掌', '游身回环']],
  ['leg', 1, null, '弹腿', ['冲弹', '十字腿', '连环弹']],
  ['leg', 2, null, '戳脚', ['玉环步', '鸳鸯戳', '蹶子脚']],
  ['leg', 3, null, '鸳鸯腿', ['前扫', '后摆', '连环鸳鸯']],
  ['point', 1, null, '认穴法', ['点肩井', '封曲池', '打环跳']],
  ['point', 2, null, '鹰爪力', ['鹰爪擒', '分筋手', '错骨爪']],
  ['point', 3, null, '一指禅', ['点石', '透劲', '定身指']],
  ['saber', 1, null, '劈挂刀', ['缠头裹脑', '劈山', '连环劈挂']],
  ['saber', 2, null, '五虎刀', ['猛虎下山', '虎尾横扫', '五虎齐出']],
  ['saber', 3, null, '八卦刀', ['走圈削', '翻身劈', '八方风雨']],
  ['sword', 1, null, '青萍剑', ['仙人指路', '白蛇吐信', '青萍点水']],
  ['sword', 2, null, '三才剑', ['天时', '地利', '人和']],
  ['sword', 3, null, '两仪剑', ['阴阳分', '刚柔济', '两仪合璧']],
  ['spear', 1, null, '梨花枪', ['拦枪', '拿枪', '梨花摆头']],
  ['spear', 2, null, '六合枪', ['中平枪', '回马枪', '六合连环']],
  ['spear', 3, null, '杨家枪', ['凤点头', '青龙探爪', '百鸟朝凤']],
  ['staff', 1, null, '齐眉棍', ['泰山压顶', '横扫千军', '拨草寻蛇']],
  ['staff', 2, null, '五郎棍', ['拦路虎', '盖顶砸', '八卦游龙']],
  ['staff', 3, null, '八仙棍', ['仙人过桥', '醉步连棍', '八仙庆寿']],
  ['dart', 1, null, '飞蝗石', ['单飞', '连珠', '满天星']],
  ['dart', 2, null, '袖箭', ['袖里箭', '回身箭', '梅花箭']],
  ['dart', 3, null, '金钱镖', ['直镖', '旋镖', '天女散花']],
  ['inner', 1, null, '吐纳术', ['调息', '归元', '固本']],
  ['inner', 2, null, '八段锦', ['理三焦', '调脾胃', '固肾腰']],
  ['inner', 3, null, '五禽戏', ['虎势', '鹤势', '熊经']],
  ['light', 1, null, '提纵术', ['提气', '纵跃', '登高']],
  ['light', 2, null, '草上飞', ['疾行', '踏草', '无痕']],
  ['light', 3, null, '八步赶蝉', ['抢步', '追风', '赶蝉']],
  ['craft', 1, null, '岐黄术', ['诊脉', '施针', '续骨']],
  ['craft', 2, null, '辨毒术', ['辨毒', '解毒', '用毒']],
  ['craft', 3, null, '奇门遁甲', ['布阵', '藏形', '八门']],
  // ---- sect arts: two at tier four, one at tier five ---------------------------------------
  ['fist', 4, 'shaolin', '罗汉十八手', ['罗汉撞钟', '降魔推山', '十八罗汉阵']],
  ['staff', 4, 'shaolin', '达摩棍', ['拨云见日', '一苇渡江', '达摩面壁']],
  ['inner', 5, 'shaolin', '易筋经', ['易筋', '洗髓', '金刚不坏']],
  ['sword', 4, 'wudang', '太极剑', ['三环套月', '燕子抄水', '凤凰展翅']],
  ['palm', 4, 'wudang', '太极拳', ['揽雀尾', '野马分鬃', '如封似闭']],
  ['inner', 5, 'wudang', '太极十三势', ['掤捋挤按', '采挒肘靠', '进退顾盼']],
  ['sword', 4, 'emei', '金顶剑', ['金顶佛光', '云海翻涛', '日照金山']],
  ['point', 4, 'emei', '峨嵋刺', ['穿针', '引线', '分花拂柳']],
  ['sword', 5, 'emei', '白猿通臂剑', ['白猿献果', '通臂连环', '灵猿摘星']],
  ['sword', 4, 'huashan', '云台剑', ['云台望月', '苍松迎客', '天外飞云']],
  ['sword', 4, 'huashan', '苍龙剑', ['苍龙出海', '龙脊回锋', '苍龙摆尾']],
  ['sword', 5, 'huashan', '希夷剑', ['视之不见', '听之不闻', '大音希声']],
  ['palm', 4, 'gaibang', '莲花落掌', ['莲花初绽', '步步生莲', '落花流水']],
  ['staff', 4, 'gaibang', '九路乞儿棍', ['打草惊蛇', '拦门讨债', '九路归一']],
  ['fist', 5, 'gaibang', '百家拳', ['东家长', '西家短', '吃遍百家']],
  ['palm', 4, 'mingjiao', '明暗掌', ['明尊照世', '暗影随形', '明暗交替']],
  ['saber', 4, 'mingjiao', '弯月刀', ['新月斩', '残月回旋', '满月轮']],
  ['inner', 5, 'mingjiao', '三际心法', ['初际', '中际', '后际']],
  ['spear', 4, 'kunlun', '雪岭枪', ['雪岭飞鸿', '冰河解冻', '雪崩']],
  ['leg', 4, 'kunlun', '踏雪腿', ['踏雪寻梅', '飞雪连环', '风卷残雪']],
  ['spear', 5, 'kunlun', '奔雷枪', ['惊雷', '奔雷贯日', '雷霆万钧']],
  ['staff', 4, 'caobang', '分水篙', ['撑篙点水', '分波逐浪', '横江锁']],
  ['light', 4, 'caobang', '踏浪步', ['踏浪', '乘风', '逐流']],
  ['staff', 5, 'caobang', '定波篙法', ['中流砥柱', '定海', '百川归海']],
  ['saber', 4, 'yaowang', '柳叶刀', ['柳叶飘', '回春斩', '杨柳依依']],
  ['craft', 4, 'yaowang', '青囊针法', ['金针度穴', '回阳九针', '起死回生']],
  ['inner', 5, 'yaowang', '千金养气诀', ['养气', '培元', '生生不息']],
  ['point', 4, 'chongsheng', '拈花指', ['拈花一笑', '弹指', '花开见佛']],
  ['fist', 4, 'chongsheng', '伏虎拳', ['伏虎式', '虎啸山林', '降龙伏虎']],
  ['point', 5, 'chongsheng', '三塔禅指', ['千寻塔影', '三塔鼎立', '一指禅定']],
  ['sword', 4, 'quanzhen', '纯阳剑', ['纯阳初动', '紫气东来', '三花聚顶']],
  ['sword', 4, 'quanzhen', '七星剑', ['天枢', '摇光', '七星连珠']],
  ['inner', 5, 'quanzhen', '金丹功', ['筑基', '结丹', '还虚']],
  ['dart', 4, 'tangmen', '追魂镖', ['追魂', '夺魄', '无影']],
  ['craft', 4, 'tangmen', '百草毒经', ['淬毒', '迷烟', '腐骨']],
  ['dart', 5, 'tangmen', '飞星手', ['流星赶月', '繁星点点', '星落如雨']],
];

/** Mastery levels at which an art's three moves are learned. */
export const MOVE_LEVELS = [1, 4, 7];
/** Mastery points per level, and the top level. */
export const POINTS_PER_LEVEL = 100;
export const MAX_LEVEL = 10;

export const ARTS = ROWS.map(([klass, tier, sect, name, moveNames], index) => ({
  id: `${klass}${tier}${sect ? '_' + sect : ''}${ROWS.slice(0, index).filter((r) => r[0] === klass && r[1] === tier && r[2] === sect).length || ''}`,
  name,
  klass,
  tier,
  sect,
  moves: moveNames.map((moveName, slot) => ({
    name: moveName,
    /** The third move hits harder and costs double. */
    power: TIER_POWER[tier] * (slot === 2 ? 1.3 : 1),
    nei: 10 * tier * (slot === 2 ? 2 : 1),
    stamina: 6 * tier * (slot === 2 ? 2 : 1),
    level: MOVE_LEVELS[slot],
  })),
}));

export const ART_BY_ID = Object.fromEntries(ARTS.map((art) => [art.id, art]));

/** The open art of a class and tier (tiers 1 to 3). */
export const commonArt = (klass, tier) => ARTS.find((art) => art.klass === klass && art.tier === tier && !art.sect);

/** A sect's own arts, lowest tier first. */
export const sectArts = (sect) => ARTS.filter((art) => art.sect === sect).sort((a, b) => a.tier - b.tier);

/** Mastery level (0 to 10) for a number of mastery points. */
export const levelOf = (points) => Math.min(MAX_LEVEL, Math.floor(points / POINTS_PER_LEVEL));

/**
 * What a person must already have to start an art, as a list of unmet needs
 * (empty when they may start). `person` is described in persons.mjs.
 * @param held the arts the person's sect can teach (see core/library.mjs); left out, nothing is asked on that score
 */
export function unmetNeeds(person, art, held = null) {
  const needs = [];
  const mastery = (id) => levelOf(person.arts[id] ?? 0);
  // An art must be had from somewhere: a teacher, a manual, or what one already knows of it.
  if (held && !held.has(art.id) && !(person.arts[art.id] > 0)) needs.push('本门无人能授，阁中亦无秘笈');
  if (art.sect && art.sect !== person.school) needs.push('非本门武学');
  // An art a sect made for itself asks for the third tier of its class and inner standing.
  if (art.custom) {
    const below = commonArt(art.klass, Math.min(3, art.tier - 1));
    if (below && mastery(below.id) < 5) needs.push(`${below.name}需达五重`);
    if (person.rank < 2) needs.push('需为内门弟子');
    return needs;
  }
  if (art.tier > 1 && art.tier <= 3) {
    const below = commonArt(art.klass, art.tier - 1);
    if (mastery(below.id) < 5) needs.push(`${below.name}需达五重`);
  }
  if (art.tier === 4) {
    const below = commonArt(art.klass, 3);
    if (mastery(below.id) < 5) needs.push(`${below.name}需达五重`);
    if (mastery(commonArt('inner', 3).id) < 5) needs.push('五禽戏需达五重');
    if (person.rank < 2) needs.push('需为内门弟子');
  }
  if (art.tier === 5) {
    for (const four of sectArts(art.sect).filter((a) => a.tier === 4))
      if (mastery(four.id) < 7) needs.push(`${four.name}需达七重`);
    if (person.rank < 3) needs.push('需为亲传弟子');
    if (!person.insights?.includes(art.id)) needs.push('需闭关领悟');
  }
  return needs;
}

/**
 * What the arts that are not strikes do in a fight, at mastery level ten;
 * the effect grows evenly with the level.
 *   attack, defense  own damage and defence, as a share
 *   regen            extra refill of both bars per second, as a share
 *   mend             own health regained per second, as a share of the maximum
 *   dodge            taken off an attacker's chance to hit
 *   reflect          share of a blow's damage returned to the attacker
 *   drain            inner strength taken from the target per point of damage
 *   heal             an ally's health restored every three seconds, as a share of the healer's maximum
 *   rally            attack given to the whole side
 *   ward             defence given to the whole side
 *   venom            strikes with hidden weapons poison the target
 *   immune           poisons do nothing
 */
export const PASSIVES = {
  吐纳术: { regen: 0.001 },
  八段锦: { regen: 0.002, defense: 0.05 },
  五禽戏: { regen: 0.003, defense: 0.08, attack: 0.03 },
  提纵术: { dodge: 0.02 },
  草上飞: { dodge: 0.04 },
  八步赶蝉: { dodge: 0.06 },
  岐黄术: { heal: 0.006 },
  辨毒术: { immune: 1 },
  奇门遁甲: { ward: 0.05 },
  易筋经: { defense: 0.5, attack: 0.12, regen: 0.004 },
  太极十三势: { reflect: 0.2, defense: 0.3, attack: 0.1 },
  三际心法: { drain: 0.5, attack: 0.2 },
  千金养气诀: { mend: 0.003, attack: 0.15, defense: 0.2 },
  金丹功: { rally: 0.08, regen: 0.006, attack: 0.15 },
  踏浪步: { dodge: 0.12 },
  青囊针法: { heal: 0.012 },
  百草毒经: { venom: 1, attack: 0.05 },
};

/** A person's passive effects added up, each scaled by its art's mastery level. */
export function passivesOf(person) {
  const total = {};
  for (const [id, points] of Object.entries(person.arts)) {
    const art = ART_BY_ID[id];
    const effects = art && PASSIVES[art.name];
    if (!effects) continue;
    const scale = levelOf(points) / MAX_LEVEL;
    for (const [key, value] of Object.entries(effects)) total[key] = (total[key] ?? 0) + value * scale;
  }
  return total;
}

/**
 * Strength of each sect's own arts, as a multiplier on their damage. The
 * sects differ in style, so these are set by running sect against sect many
 * times (tools/balance.mjs --tune) until each wins about half its fights.
 */
export const SECT_TUNING = {
  shaolin: 1.35,
  wudang: 0.9,
  emei: 1.07,
  huashan: 1.07,
  gaibang: 1.54,
  mingjiao: 1.1,
  kunlun: 1.04,
  caobang: 0.81,
  yaowang: 0.69,
  chongsheng: 1.54,
  quanzhen: 1.04,
  tangmen: 0.89,
};

/**
 * Adds an art a sect made for itself to the lists, so everything that looks an
 * art up by id finds it. A save carries its own; they are added when it loads.
 */
export function registerArt(art) {
  if (ART_BY_ID[art.id]) return;
  ARTS.push(art);
  ART_BY_ID[art.id] = art;
}
