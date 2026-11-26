export const PROFESSIONS = Object.freeze({
  guard: {
    id:'guard', name:'玄甲', description:'近身破阵，持盾承伤。气血与持续输出最高。',
    weaponType:'剑', starterWeapon:'bronze-sword', maxHp:100, hpGrowth:15, attack:4, attackGrowth:2,
    defense:1, speed:185, reach:88, chaseRange:70, attackCooldown:.48, attackWindup:.12,
    active:{id:'shield-break',name:'玄甲震阵',description:'重剑斩击周围邪祟，短暂护住自身。',cooldown:7,
      radius:140,range:108,damageMultiplier:2,duration:0,ward:2},
    rage:{id:'iron-tide',name:'铁甲断潮',description:'聚怒挥出重剑风压，横断阵前。',radius:158,range:175,
      windup:.34,damageMultiplier:3.4}
  },
  ritualist: {
    id:'ritualist', name:'方士', description:'以符杖远攻，布阵封住怪群。生存依赖走位和护身符。',
    weaponType:'杖', starterWeapon:'willow-staff', maxHp:91, hpGrowth:14, attack:4, attackGrowth:2,
    defense:0, speed:183, reach:252, chaseRange:222, attackCooldown:.90, attackWindup:.24,
    active:{id:'spirit-array',name:'缚雷符阵',description:'在选中敌人脚下结阵，三道符雷依次震开并迟滞敌人。',cooldown:8,
      radius:155,range:276,damageMultiplier:1.38,duration:2.6,ward:0},
    rage:{id:'thunder-court',name:'九霄雷庭',description:'引雷压阵，覆盖远处聚集的敌群。',radius:210,range:296,
      windup:.44,damageMultiplier:1.55}
  },
  ranger: {
    id:'ranger', name:'游侠', description:'以长弓追击，跑位快，擅长拉开距离和点杀精英。',
    weaponType:'弓', starterWeapon:'bamboo-bow', maxHp:83, hpGrowth:13, attack:3, attackGrowth:2,
    defense:0, speed:205, reach:232, chaseRange:205, attackCooldown:.60, attackWindup:.18,
    active:{id:'piercing-volley',name:'追星穿云',description:'朝瞄准方向射出三支穿透箭，横扫远处的敌列。',cooldown:6,
      radius:66,range:302,damageMultiplier:1.85,duration:0,ward:0},
    rage:{id:'star-rain',name:'裂空星雨',description:'以快弓连射，把怒气聚到远处一小片落点。',radius:108,range:332,
      windup:.26,damageMultiplier:1.9}
  }
});

export function professionStats(professionId, level = 1) {
  const role = Object.hasOwn(PROFESSIONS, professionId) ? PROFESSIONS[professionId] : PROFESSIONS.guard;
  const rank = Math.max(0, level - 1);
  return {
    attack:role.attack + rank * role.attackGrowth, defense:role.defense,
    maxHp:role.maxHp + rank * role.hpGrowth, speed:role.speed
  };
}

const SLOTS = ['weapon', 'offhand', 'armor', 'boots', 'ring'];
const ART_IDS = {offhand:'shield',armor:'armor',boots:'boots',ring:'ring'};
const SLOT_NAMES = {weapon:'武器', offhand:'副手', armor:'衣甲', boots:'鞋履', ring:'戒印'};
const BASIC_LEVELS = [4,8,12];
const FORGE_LEVELS = [3,7,11];
const RARE_LEVELS = [1,5,8];
const EPIC_LEVELS = [3,6,9];
const element = (id, name, slot, tier, requiredLevel, sellPrice, detail) => ({
  id, name, slot, tier, requiredLevel, sellPrice, artId:ART_IDS[slot], ...detail
});

const weapons = {
  guard:{
    artId:'sword',
    common:[
      ['camp-sword','西岐巡卫剑',21], ['rivet-sword','重铆战剑',30], ['frontier-sword','前军制式剑',40]
    ],
    fine:[
      ['fine-guard-1','叠锋精钢剑',23], ['fine-guard-2','七锤军锋',33], ['fine-guard-3','百炼虎齿剑',43]
    ],
    rare:[
      ['soul-cleaver','岐山斩魄剑',24], ['ford-breaker','丹霞破浪剑',34], ['dusk-sentinel','朝歌斜阳剑',44]
    ],
    epic:[
      ['violet-sword','紫电裂山剑',28], ['red-river-sword','照水龙吟剑',39], ['astral-cleaver','封神断星剑',50]
    ],
    legendary:[['celestial-sword','昆吾镇天剑',57]]
  },
  ritualist:{
    artId:'staff',
    common:[
      ['camp-staff','青纹法杖',24], ['copper-staff','铜节行法杖',33], ['frontier-staff','三环制式杖',45]
    ],
    fine:[
      ['fine-ritualist-1','镇纹桃木杖',26], ['fine-ritualist-2','叠符引雷杖',37], ['fine-ritualist-3','九节法坛杖',48]
    ],
    rare:[
      ['threadseal-staff','牵雷结印杖',27], ['ford-staff','丹霞烟水杖',38], ['dusk-staff','朝歌落焰杖',49]
    ],
    epic:[
      ['white-cloud-staff','玉虚照影杖',31], ['red-river-staff','赤潮辟邪杖',43], ['astral-staff','封神号雷令',55]
    ],
    legendary:[['celestial-staff','洞玄惊神杖',62]]
  },
  ranger:{
    artId:'bow',
    common:[
      ['camp-bow','西岐角弓',23], ['laminate-bow','双层硬木弓',32], ['frontier-bow','前军制式弓',43]
    ],
    fine:[
      ['fine-ranger-1','精筋追影弓',25], ['fine-ranger-2','双螭鸣风弓',35], ['fine-ranger-3','锻骨惊鹊弓',46]
    ],
    rare:[
      ['hawksight-bow','鹰眼伏林弓',26], ['ford-bow','丹霞渡潮弓',36], ['dusk-bow','朝歌逐日弓',47]
    ],
    epic:[
      ['cloud-piercer','穿云逐魄弓',30], ['red-river-bow','赤鲤破潮弓',41], ['astral-bow','封神挽月弓',53]
    ],
    legendary:[['celestial-bow','天河射斗弓',60]]
  }
};

const genericGear = {
  offhand:{
    common:[
      ['travel-guard','行军手甲',3,6], ['rivet-guard','铁铆护手',4,12], ['frontier-guard','前军护臂',5,18]
    ],
    fine:[
      ['fine-guardpiece-1','双扣精钢护臂',4,8], ['fine-guardpiece-2','叠片虎纹护臂',5,13], ['fine-guardpiece-3','百炼玄纹护臂',6,18]
    ],
    rare:[
      ['beastguard','兽牙小盾',3,10], ['ford-guard','渡军鳞腕',5,16], ['dusk-guard','玄日护符',6,22]
    ],
    epic:[
      ['jade-ward','辟祟玉璧',4,14], ['tidal-ward','镇水铜璧',6,22], ['astral-ward','封神玄甲腕',7,29]
    ],
    legendary:[['celestial-ward','昊天执御璧',9,36]]
  },
  armor:{
    common:[
      ['camp-armor','扎带轻甲',4,6], ['rivet-armor','复铆军甲',7,12], ['frontier-armor','前军制式铠',10,16]
    ],
    fine:[
      ['fine-armor-1','双层精缝甲',5,7], ['fine-armor-2','叠鳞轻战衣',8,13], ['fine-armor-3','百锻银丝铠',11,22]
    ],
    rare:[
      ['beast-armor','伏林行者衣',5,9], ['ford-armor','分水蛟纹衣',8,15], ['dusk-armor','朝歌战鎏衣',11,22]
    ],
    epic:[
      ['cloud-armor','青云护体锦',6,12], ['tidal-armor','赤潮重片甲',10,22], ['astral-armor','封神雁翎铠',13,30]
    ],
    legendary:[['celestial-armor','玄鸟降真袍',15,38]]
  },
  boots:{
    common:[
      ['camp-boots','软皮军履',1,0,15], ['rivet-boots','步营束靴',2,0,18], ['frontier-boots','前军战履',3,0,21]
    ],
    fine:[
      ['fine-boots-1','双线紧缝履',2,0,14], ['fine-boots-2','双层踏风履',3,0,18], ['fine-boots-3','虎步轻裘靴',4,0,22]
    ],
    rare:[
      ['beast-boots','伏林鞋',1,0,17], ['ford-boots','越涧踏石靴',3,0,20], ['dusk-boots','奔日云纹履',4,0,23]
    ],
    epic:[
      ['cloud-boots','云缝疾步履',2,0,20], ['tidal-boots','赤潮踏浪履',4,0,23], ['astral-boots','封神无影履',5,0,26]
    ],
    legendary:[['celestial-boots','天门遁光靴',6,0,30]]
  },
  ring:{
    common:[
      ['wayfarer-ring','行旅铜瑗',1,5,0,3], ['copper-seal','叠纹军印',1,9,0,5], ['frontier-ring','前军石髓印',2,12,0,7]
    ],
    fine:[
      ['fine-travel-ring','细刻行旅印',1,7,0,4], ['fine-river-ring','重缠纹玉瑗',2,12,0,6], ['fine-sun-ring','三炼日轮印',3,18,0,8]
    ],
    rare:[
      ['beast-ring','松魂石环',1,9,0,4], ['ford-ring','丹霞双鲤瑗',2,14,0,6], ['dusk-ring','朝歌残日印',3,18,0,8]
    ],
    epic:[
      ['cloud-ring','霜脉青金戒',2,12,0,5], ['tidal-ring','赤潮凝血印',3,17,0,8], ['astral-ring','封神火脉印',4,23,0,10]
    ],
    legendary:[['celestial-ring','无量灼光印',5,27,0,13]]
  }
};

const roleOffhands = {
  guard:{
    artId:'shield',description:'玄甲专用厚盾，适合扛住正面刀锋。',
    common:[
      ['camp-bulwark','重口行军盾',4,5], ['rivet-bulwark','铆面虎头盾',5,12], ['frontier-bulwark','前军玄铁盾',7,16]
    ],
    rare:[
      ['soul-bulwark','斩魄兽首盾',4,11], ['ford-bulwark','渡口雄关盾',6,17], ['dusk-bulwark','朝歌逆锋盾',8,20]
    ]
  },
  ritualist:{
    artId:'ring',description:'方士专用法印，以符力增强进攻，防护较轻。',
    common:[
      ['camp-focus','行法铜箓',0,3,2], ['copper-focus','细箓五雷印',1,6,4], ['frontier-focus','前军聚雷令',1,8,6]
    ],
    rare:[
      ['soul-focus','松魂雷印',1,7,3], ['ford-focus','渡水咒雷鉴',1,11,5], ['dusk-focus','朝歌返照箓',2,15,7]
    ]
  },
  ranger:{
    artId:'shield',description:'游侠专用软质弓护手，方便跑动中抬弓。',
    common:[
      ['camp-bracer','软皮护弦甲',1,3,1,7], ['rivet-bracer','轻骨弓护手',1,5,2,8], ['frontier-bracer','前军鹰羽腕',2,7,3,10]
    ],
    rare:[
      ['soul-bracer','鹰眼游猎腕',1,6,2,9], ['ford-bracer','燕羽踏浪腕',2,9,4,11], ['dusk-bracer','朝歌乘风护手',2,12,5,13]
    ]
  }
};

const STARTING_GEAR = {
  'recovery-pill':{id:'recovery-pill',name:'回春丹',tier:'common',artId:'potion',heal:65,consumable:'tonics',sellPrice:5,
    description:'回复65点气血。八级药铺开启，与回春散分开持有。'},
  'willow-staff':element('willow-staff','青柳符杖','weapon','common',1,8,{
    artId:'staff',professions:['ritualist'],attack:16,description:'方士用青柳箓引出第一缕符雷。'
  }),
  'bamboo-bow':element('bamboo-bow','竹背猎弓','weapon','common',1,8,{
    artId:'bow',professions:['ranger'],attack:16,description:'游侠以山竹片压制成的轻弓。'
  }),
  'camp-guard':element('camp-guard','行伍皮护腕','offhand','common',1,6,{
    defense:1,maxHp:4,description:'略能护住手腕，亦是伯衡收用的铸造底料。'
  }),
  'trail-boots':element('trail-boots','粗皮行履','boots','common',1,14,{
    defense:1,speed:12,description:'西岐行脚人常穿的皮靴，底纹能咬住石地。'
  })
};

const LEVELS_BY_TIER = {
  common:BASIC_LEVELS, fine:FORGE_LEVELS, rare:RARE_LEVELS, epic:EPIC_LEVELS, legendary:[11]
};
const SELL_PRICES = {
  common:[18,32,52], fine:[20,37,57], rare:[42,70,102], epic:[72,110,155], legendary:[245]
};
const TIER_DESCRIPTIONS = {
  common:'西岐工匠备制的行军物资。',
  fine:'铁匠熔入旧材重新锻制，附带随机属性。',
  rare:'野外战斗偶有所得，兵刃仍留有原主气息。',
  epic:'从凶险阵地夺得的重宝。',
  legendary:'朝歌外城主将败阵时方有机会现世。'
};

function buildItems() {
  const items = {...STARTING_GEAR};
  for (const [roleId, {artId, ...tiers}] of Object.entries(weapons)) {
    for (const [tier, rows] of Object.entries(tiers)) {
      rows.forEach(([id, name, attack], grade) => {
        items[id] = element(id, name, 'weapon', tier, LEVELS_BY_TIER[tier][grade], SELL_PRICES[tier][grade],
          {attack, artId, professions:[roleId], description:TIER_DESCRIPTIONS[tier]});
      });
    }
  }
  for (const [slot, tiers] of Object.entries(genericGear)) {
    for (const [tier, rows] of Object.entries(tiers)) {
      rows.forEach(([id, name, defense, maxHp, speed = 0, attack = 0], grade) => {
        items[id] = element(id, name, slot, tier, LEVELS_BY_TIER[tier][grade],
          Math.floor(SELL_PRICES[tier][grade] * .76), {defense, maxHp, speed, attack, description:TIER_DESCRIPTIONS[tier]});
      });
    }
  }
  for (const [roleId, {artId, description, ...tiers}] of Object.entries(roleOffhands)) {
    for (const [tier, rows] of Object.entries(tiers)) {
      rows.forEach(([id, name, defense, maxHp, attack = 0, speed = 0], grade) => {
        items[id] = element(id, name, 'offhand', tier, LEVELS_BY_TIER[tier][grade],
          Math.floor(SELL_PRICES[tier][grade] * .76), {defense,maxHp,attack,speed,artId,description,professions:[roleId]});
      });
    }
  }
  return Object.freeze(items);
}

export const ARSENAL_ITEMS = buildItems();

export function canEquip(item, professionId = 'guard', level = 1) {
  return Boolean(item?.slot && (item.requiredLevel ?? 1) <= level &&
    (!item.professions || item.professions.includes(professionId)));
}

const offer = (npcId, itemId, price, unlockLevel = 1, quantity = 1, label = '') => ({
  id:npcId + '-' + (label || itemId), itemId, price, quantity, unlockLevel, stock:null
});

const weaponOffers = BASIC_LEVELS.flatMap((level, grade) =>
  Object.values(weapons).map(role => offer('smith', role.common[grade][0], [92,163,258][grade], level)));
const specialistOffers = BASIC_LEVELS.flatMap((level, grade) =>
  Object.values(roleOffhands).map(role => offer('smith', role.common[grade][0], [82,146,237][grade], level)));
const gearOffers = (npcId, slots, prices) => BASIC_LEVELS.flatMap((level, grade) =>
  slots.map(slot => offer(npcId, genericGear[slot].common[grade][0], prices[grade], level)));

export const BASIC_SHOPS = Object.freeze({
  smith:{name:'伯衡铁铺',offers:[
    offer('smith','bronze-sword',35), offer('smith','willow-staff',35), offer('smith','bamboo-bow',35),
    offer('smith','linen-armor',25), offer('smith','camp-guard',25), ...weaponOffers,
    ...gearOffers('smith',['offhand','armor'],[70,127,208]), ...specialistOffers
  ]},
  apothecary:{name:'辛夷药铺',offers:[
    offer('apothecary','potion',12), offer('apothecary','potion',32,1,3,'field-kit'),
    offer('apothecary','potion',50,4,5,'trail-kit'), offer('apothecary','potion',76,8,8,'guard-kit'),
    offer('apothecary','potion',103,12,11,'siege-kit'),offer('apothecary','recovery-pill',20,8)
  ]},
  merchant:{name:'阿槐行囊',offers:[
    offer('merchant','trail-boots',55), offer('merchant','silver-ring',70), offer('merchant','potion',12),
    ...gearOffers('merchant',['boots','ring'],[76,128,202])
  ]}
});

export function stockOffers(npcId, professionId = 'guard') {
  return (BASIC_SHOPS[npcId]?.offers ?? []).filter(({itemId}) => {
    if (itemId === 'bronze-sword') return professionId === 'guard';
    const allowed = ARSENAL_ITEMS[itemId]?.professions;
    return !allowed || allowed.includes(professionId);
  });
}

export function shopOffers(npcId, level, professionId) {
  return stockOffers(npcId, professionId).filter(offer => offer.unlockLevel <= level);
}

export const FORGE_RECIPES = Object.freeze(FORGE_LEVELS.flatMap((unlockLevel, grade) =>
  SLOTS.map(slot => ({
    id:`fine-${slot}-${grade + 1}`, name:`${['精锻','重锻','百炼'][grade]}${SLOT_NAMES[slot]}`,
    slot, grade, unlockLevel, minInputLevel:[1,4,8][grade], count:grade === 2 ? 3 : 2,
    gold:[44,86,135][grade], parts:[2,3,5][grade]
  }))));

export function isForgeIngredient(item, recipe, professionId) {
  return Boolean(recipe && item?.tier === 'common' && item.slot === recipe.slot
    && (item.requiredLevel ?? 1) >= recipe.minInputLevel && canEquip(item, professionId, recipe.unlockLevel));
}

export function forgeResult(recipe, professionId) {
  return recipe ? gearAt(professionId, recipe.slot, 'fine', recipe.grade) : null;
}

export function rareWeaponFor(professionId, tier = 1) {
  return gearAt(professionId, 'weapon', 'rare', Math.max(0, tier - 1));
}

function gearAt(professionId, slot, tier, grade) {
  const professionGear = Object.hasOwn(weapons, professionId) ? weapons[professionId] : weapons.guard;
  const choices = (slot === 'weapon' ? professionGear : genericGear[slot])[tier];
  return choices[Math.min(grade, choices.length - 1)][0];
}

export const AFFIX_LABELS = Object.freeze({attack:'攻击',defense:'防御',maxHp:'气血',speed:'移速'});
const STAT_KEYS = Object.keys(AFFIX_LABELS);
const AFFIX_MIN = {attack:1,defense:1,maxHp:4,speed:3};
const AFFIX_MAX = {attack:5,defense:3,maxHp:18,speed:10};
const AFFIXES_BY_SLOT = {
  weapon:['attack','speed'], offhand:['defense','maxHp'], armor:['defense','maxHp'],
  boots:['speed','defense'], ring:['attack','maxHp']
};
function makeRandom(seed) {
  let next = seed >>> 0;
  return {
    get seed() { return next; },
    draw() {
      next = (Math.imul(next, 1664525) + 1013904223) >>> 0;
      return next / 4294967296;
    }
  };
}

function rollAffixes(slot, grade, count, random) {
  const candidates = [...AFFIXES_BY_SLOT[slot]];
  const result = {};
  for (let i = 0; i < count; i++) {
    const [key] = candidates.splice(Math.floor(random.draw() * candidates.length), 1);
    const min = AFFIX_MIN[key];
    const max = Math.floor(min + (AFFIX_MAX[key] - min) * ((grade + 2) / 4));
    result[key] = min + Math.floor(random.draw() * (max - min + 1));
  }
  return result;
}

/** Only rolled gear accepts affixes. This also bounds values read from older or hand-edited saves. */
export function equipmentStats(item, affixes) {
  const affixKeys = ['fine','epic','legendary'].includes(item?.tier) ? AFFIXES_BY_SLOT[item?.slot] ?? [] : [];
  return Object.fromEntries(STAT_KEYS.map(key => {
    const value = affixes?.[key];
    const bonus = affixKeys.includes(key) && Number.isSafeInteger(value)
      ? Math.max(0, Math.min(value, AFFIX_MAX[key])) : 0;
    return [key, (item?.[key] ?? 0) + bonus];
  }));
}

/** The caller validates and consumes inputs only after the recipe has been resolved. */
export function rollForge({recipeId,seed,level,profession}) {
  const recipe = FORGE_RECIPES.find(candidate => candidate.id === recipeId);
  if (!recipe || !Number.isInteger(level) || level < recipe.unlockLevel) return null;
  const random = makeRandom(seed);
  const affixes = rollAffixes(recipe.slot, recipe.grade, recipe.count - 1, random);
  return {seed:random.seed, itemId:forgeResult(recipe, profession), affixes};
}

const MAP_TIERS = {trail:1,pass:1,trial:1,ford:2,siege:3};
const DROP_PROFILES = {
  normal:[[.14,[78,21,1,0]],[.19,[65,31,4,0]],[.23,[54,37,9,0]]],
  elite:[[.42,[49,48,3,0]],[.48,[42,50,8,0]],[.55,[29,54,17,0]]],
  boss:[[.90,[37,54,9,0]],[1,[23,55,22,0]],[1,[13,46,32,9]]]
};
const DROP_TIERS = ['common','rare','epic','legendary'];
const DROP_SLOT_WEIGHTS = [32,18,21,15,14];

function weightedIndex(weights, random) {
  let roll = random.draw() * weights.reduce((sum, weight) => sum + weight, 0);
  return weights.findIndex(weight => (roll -= weight) < 0);
}

export function rollDrop({mapId,kind,level,seed,tier,profession}) {
  if (!Object.hasOwn(MAP_TIERS, mapId)) return {seed:seed >>> 0,itemId:null,affixes:{}};
  const mapTier = MAP_TIERS[mapId];
  const grade = Number.isInteger(tier) ? Math.max(0, Math.min(mapTier, tier) - 1) : mapTier - 1;
  const profile = Object.hasOwn(DROP_PROFILES, kind) ? DROP_PROFILES[kind] : DROP_PROFILES.normal;
  const [chance, weights] = profile[grade];
  const random = makeRandom(seed);
  if (random.draw() >= chance) return {seed:random.seed,itemId:null,affixes:{}};
  const rarity = DROP_TIERS[weightedIndex(weights, random)];
  const slot = SLOTS[weightedIndex(DROP_SLOT_WEIGHTS, random)];
  // Common drops can serve as forge inputs before the corresponding late merchant grade unlocks.
  const itemGrade = rarity === 'common' && level < BASIC_LEVELS[grade] && grade > 0 ? grade - 1 : grade;
  const affixes = rarity === 'epic' || rarity === 'legendary'
    ? rollAffixes(slot, grade, rarity === 'legendary' ? 2 : 1, random) : {};
  const specialist = slot === 'offhand' && rarity === 'rare' && Object.hasOwn(roleOffhands, profession)
    && random.draw() < .65;
  const itemId = specialist ? roleOffhands[profession].rare[itemGrade][0] : gearAt(profession, slot, rarity, itemGrade);
  return {seed:random.seed,itemId,affixes};
}
