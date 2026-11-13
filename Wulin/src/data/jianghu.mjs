// The wider martial world: battle formations, a sect's house rules, the
// wanderers who may be won over, and the events that come to a leader's door.
//
// Everything here is data. core/jianghu.mjs applies it.

/**
 * What a talent, a house rule or a formation changes. Each number is a share
 * added to the usual value (0.1 is ten per cent more) unless noted:
 *   train, gather, craft   how fast the sect's people train and work
 *   income                 silver every ten days (an amount, not a share)
 *   wages                  share taken off the wage bill
 *   heal                   wounds mended each day, added to the usual 0.02
 *   insight                share added to the chance of a breakthrough in seclusion
 *   recruit                added to the chance that someone comes to the board
 *   loyalty                loyalty every ten days (an amount)
 *   court                  standing with the court every ten days (an amount)
 *   attack, defense        in a fight for a stronghold
 */
export const TALENTS = {
  teach: { name: '授业', does: '全派修练加快一成', mods: { train: 0.1 } },
  heal: { name: '回春', does: '全派养伤加快', mods: { heal: 0.03 } },
  trade: { name: '聚财', does: '每旬多入银六十两', mods: { income: 60 } },
  craft: { name: '巧匠', does: '制造所得多两成半', mods: { craft: 0.25 } },
  gather: { name: '识地', does: '采集所得多两成半', mods: { gather: 0.25 } },
  guard: { name: '守御', does: '守城时全队防御加一成', mods: { defense: 0.1 } },
  vanguard: { name: '先登', does: '出战时全队攻势加半成', mods: { attack: 0.05 } },
  scout: { name: '识人', does: '来投者更多', mods: { recruit: 0.15 } },
  sage: { name: '点拨', does: '闭关更易有悟', mods: { insight: 0.5 } },
  steward: { name: '理事', does: '薪俸开支省一成', mods: { wages: 0.1 } },
  cheer: { name: '同乐', does: '每旬全派忠诚加一', mods: { loyalty: 1 } },
  court: { name: '通达', does: '朝廷关系每旬加一', mods: { court: 1 } },
};

/** A sect's house rules: one is in force at a time. */
export const HOUSE_RULES = {
  plain: { name: '循旧例', does: '不增不减', mods: {} },
  strict: { name: '严规', does: '修练加快一成，每旬忠诚减一', mods: { train: 0.1, loyalty: -1 } },
  kind: { name: '宽和', does: '每旬忠诚加一，修练慢半成', mods: { loyalty: 1, train: -0.05 } },
  martial: { name: '尚武', does: '出战攻势加半成，采集少一成', mods: { attack: 0.05, gather: -0.1 } },
  thrift: { name: '重商', does: '制造所得多一成半，修练慢半成', mods: { craft: 0.15, train: -0.05 } },
};

/**
 * Formations. `width` is how many stand in a rank; the rest are shares added
 * for the whole side, and `regen` is added to what each bar refills a second.
 * A sect's own formation needs one of its elders or its leader in the party.
 */
export const FORMATIONS = {
  line: { name: '长蛇阵', does: '寻常阵势', width: 5 },
  wedge: { name: '锋矢阵', does: '攻势加三分，防御减六分，阵形收窄', width: 4, attack: 0.03, defense: -0.06 },
  circle: { name: '方圆阵', does: '防御加一成，攻势减四分', width: 5, defense: 0.1, attack: -0.04 },
  crane: { name: '鹤翼阵', does: '两翼展开包抄，攻势加两分', width: 6, attack: 0.02 },
  shaolin: { name: '罗汉阵', sect: 'shaolin', does: '防御加一成二', width: 5, defense: 0.12 },
  wudang: { name: '真武阵', sect: 'wudang', does: '防御加六分，气力回复加快', width: 5, defense: 0.06, regen: 0.002 },
  emei: { name: '金顶剑阵', sect: 'emei', does: '攻势加六分', width: 5, attack: 0.06 },
  huashan: { name: '两仪阵', sect: 'huashan', does: '攻势加八分，防御减两分', width: 5, attack: 0.08, defense: -0.02 },
  gaibang: { name: '莲花阵', sect: 'gaibang', does: '攻守各加半成', width: 6, attack: 0.05, defense: 0.05 },
  mingjiao: { name: '圣火阵', sect: 'mingjiao', does: '攻势加七分', width: 5, attack: 0.07 },
  kunlun: { name: '雪岭冲阵', sect: 'kunlun', does: '攻势加六分，防御减三分，阵形收窄', width: 4, attack: 0.06, defense: -0.03 },
  caobang: { name: '分水阵', sect: 'caobang', does: '防御加半成，攻势加四分', width: 6, defense: 0.05, attack: 0.04 },
  yaowang: { name: '回春阵', sect: 'yaowang', does: '防御加六分，气力回复大为加快', width: 5, defense: 0.06, regen: 0.004 },
  chongsheng: { name: '三塔阵', sect: 'chongsheng', does: '防御加七分', width: 5, defense: 0.07 },
  quanzhen: { name: '北斗阵', sect: 'quanzhen', does: '攻势加半成，气力回复加快', width: 5, attack: 0.05, regen: 0.002 },
  tangmen: { name: '雁翅阵', sect: 'tangmen', does: '两翼展开，攻势加六分', width: 6, attack: 0.06 },
};

/**
 * The wanderers: [portrait, name, woman, age, talent, aptitude, level, how they are met].
 * Each may be won over once; their portraits are in art-handoff.
 */
const WANDERER_ROWS = [
  ['river-cartographer', '宋折汐', true, 32, 'gather', 'inner', 14, '走了半生水路，替人画渡口与暗礁的图。'],
  ['bronze-bellmaker', '莫问铎', false, 56, 'craft', 'fist', 18, '铸了一辈子钟，一锤下去知道铜里有没有砂眼。'],
  ['ridge-escort', '祝凌驿', true, 44, 'guard', 'blade', 22, '押了二十年镖，没丢过一趟。'],
  ['tea-physician', '舒眠蘅', true, 35, 'heal', 'inner', 15, '茶摊上替人把脉，药方写在茶票背面。'],
  ['night-ferryman', '田照渡', false, 63, 'scout', 'pole', 20, '夜里撑船，渡过的人他都记得。'],
  ['travelling-printmaker', '闻刻舟', false, 29, 'sage', 'dart', 12, '背着一箱雕版走江湖，刻过不少失传的拳谱。'],
  ['thunder-luthier', '聂远音', true, 49, 'cheer', 'inner', 19, '一张琴弹得人忘了饥寒。'],
  ['snow-tracker', '庞白麓', false, 36, 'vanguard', 'pole', 21, '雪地里追得上狼，也追得上人。'],
  ['cloud-scout', '晏飞岑', true, 25, 'scout', 'dart', 16, '轻功极好，城墙对她只是个台阶。'],
  ['lantern-keeper', '汪拾焰', false, 41, 'guard', 'fist', 17, '守了半辈子烽燧，听风就知道来了多少人。'],
  ['iron-cook', '屈锅山', false, 50, 'cheer', 'fist', 16, '一口铁锅喂饱过三百号人，锅铲也能当兵器。'],
  ['deepwood-medic', '樊木息', true, 58, 'heal', 'inner', 20, '深山采药四十年，断骨接得比原来还直。'],
  ['silk-merchant', '卓连城', true, 39, 'trade', 'dart', 13, '三条商路上的丝价，她一句话就能动。'],
  ['old-surveyor', '许定圭', false, 69, 'gather', 'inner', 17, '量过大昭一半的山，知道哪座山肚子里有铁。'],
  ['marsh-hunter', '俞伏苇', true, 31, 'vanguard', 'dart', 19, '芦苇荡里长大，箭比话快。'],
  ['salt-caravaner', '柏行盐', false, 48, 'trade', 'pole', 18, '带着盐队走过大漠，认得每一处水井。'],
  ['loach-puppeteer', '阮栖槐', true, 46, 'scout', 'fist', 14, '演傀儡戏的，十里八乡的闲话都进她的耳朵。'],
  ['wandering-astrologer', '谈井宿', false, 61, 'sage', 'inner', 18, '观星的，说人各有其时，急不得。'],
  ['horseshoe-healer', '宁抚辔', true, 37, 'steward', 'pole', 16, '医马的，顺手把马帮的账也理得清清楚楚。'],
  ['bridge-architect', '邢梁安', false, 35, 'craft', 'blade', 15, '造桥的，看一眼就知道一根梁吃多少力。'],
  ['lake-drummers', '姬鸣沼', true, 28, 'cheer', 'pole', 15, '湖上击鼓的，鼓点一起，桨就齐了。'],
  ['ink-swordsman', '梁挽墨', false, 34, 'teach', 'blade', 26, '以笔意入剑，不肯入任何门派，除非那门派值得。'],
  ['courthouse-archivist', '戚听简', true, 53, 'court', 'inner', 12, '在衙门管了三十年卷宗，知道每道公文该递给谁。'],
  ['migrating-trapper', '蒋留隼', false, 44, 'gather', 'dart', 18, '随候鸟迁徙的猎户，山里的东西没有他找不到的。'],
  ['frost-weaver', '尹裁寒', true, 62, 'craft', 'dart', 17, '织的寒蚕甲衣，刀砍上去只留一道白印。'],
  ['mountain-porter', '方捧岩', false, 27, 'steward', 'fist', 17, '挑山工，一副肩膀挑过整座庙的梁柱。'],
  ['river-poet', '荆晚蓼', true, 33, 'teach', 'blade', 23, '诗写得狂，剑使得更狂。'],
  ['market-broker', '程走街', false, 40, 'trade', 'fist', 12, '牙行里的人精，买卖双方都觉得占了便宜。'],
  ['bamboo-scribe', '石简秋', true, 55, 'court', 'inner', 14, '替人写了半辈子状纸，官面上的门道一清二楚。'],
  ['trail-monk', '明琮', false, 65, 'sage', 'fist', 24, '行脚僧，走到哪里讲到哪里，不收徒，只指路。'],
];
export const WANDERERS = WANDERER_ROWS.map(([key, name, female, age, talent, aptitude, level, about]) => ({ id: 'wanderer-' + key, name, female, age, talent, aptitude, level, about }));
export const WANDERER_BY_ID = Object.fromEntries(WANDERERS.map((w) => [w.id, w]));

/**
 * Events. A choice may cost silver (`cost`), need something (`needs`, checked
 * against the sect's books) and gives an effect; `risk` is a chance of a
 * second effect instead of the first. Effects:
 *   silver, grain, renown, virtue, court   added to the sect's books
 *   loyalty                                added to every member
 *   relations                              added to relations with every other sect
 *   res: { iron: 20 }                      raw resources
 *   applicant: 70                          someone of that quality comes to the board
 *   wound: 0.3                             the sect's best fighter is hurt
 * `when` limits an event to sects it suits.
 */
export const EVENTS = [
  { id: 'famine', title: '邻乡饥荒', text: '山下几个村子闹了饥荒，乡老带着人跪在山门外求粮。', choices: [
    { label: '开仓放粮', hint: '粮 −30，正邪 +30，威望 +10', needs: { grain: 30 }, gives: { grain: -30, virtue: 30, renown: 10 }, text: '粮车下山，乡民焚香相送。' },
    { label: '施粥三日', hint: '银 −80，正邪 +10', cost: 80, gives: { virtue: 10 }, text: '粥棚搭了三日，聊胜于无。' },
    { label: '闭门不纳', hint: '正邪 −20', gives: { virtue: -20 }, text: '山门紧闭，乡民散去时骂声不绝。' }] },
  { id: 'challenge', title: '踢馆', text: '一名外地拳师抬着“天下无敌”的匾额上山，指名要与本派高手过招。', choices: [
    { label: '派高手应战', hint: '多半得胜，威望 +15；也可能受伤', gives: { renown: 15 }, risk: { chance: 0.3, gives: { renown: -10, wound: 0.3 }, text: '来人确有真功夫，本派高手负伤落败。' }, text: '三十招内，来人的匾额断成两截。' },
    { label: '以礼相待，留饭送客', hint: '正邪 +5', gives: { virtue: 5 }, text: '一顿饭吃完，来人自觉没趣，抬着匾下山去了。' },
    { label: '乱棍打出', hint: '正邪 −10，威望 −5', gives: { virtue: -10, renown: -5 }, text: '此事传开，江湖上颇有微词。' }] },
  { id: 'caravan', title: '商队借道', text: '一支大商队想从本派地界借道，愿奉上买路钱。', choices: [
    { label: '收钱放行', hint: '银 +150', gives: { silver: 150 }, text: '商队平安过境，买路钱如数奉上。' },
    { label: '派人护送，分文不取', hint: '正邪 +15，威望 +8', gives: { virtue: 15, renown: 8 }, text: '商队东家逢人便夸本派仗义。' },
    { label: '黑吃黑', hint: '银 +500，正邪 −60，朝廷 −10', gives: { silver: 500, virtue: -60, court: -10 }, text: '货物入库，官府的海捕文书也跟着贴了出来。' }] },
  { id: 'census', title: '靖武司造册', text: '靖武司的差官上山，依《禁武令》要将本派弟子登记造册，并收缴兵刃。', choices: [
    { label: '如实造册，缴些旧兵刃', hint: '朝廷 +15，全派忠诚 −3', gives: { court: 15, loyalty: -3 }, text: '差官满意而去，弟子们私下里却有些怨言。' },
    { label: '使银子打点', hint: '银 −200，朝廷 +5', cost: 200, gives: { court: 5 }, text: '差官掂了掂银子，在册上随手画了几笔。' },
    { label: '拒不奉令', hint: '朝廷 −20，威望 +15', gives: { court: -20, renown: 15 }, text: '差官拂袖而去，江湖上却传为美谈。' }] },
  { id: 'bounty', title: '悬赏榜', text: '靖武司贴出悬赏：揭发邻近门派私藏兵甲者，赏银三百。', choices: [
    { label: '置之不理', hint: '各派关系 +3', gives: { relations: 3 }, text: '各派听说本派不为所动，暗暗点头。' },
    { label: '揭榜告发', hint: '银 +300，朝廷 +10，各派关系 −15', gives: { silver: 300, court: 10, relations: -15 }, text: '赏银到手，江湖同道却自此侧目。' }] },
  { id: 'manual', title: '残谱', text: '一个落魄书生带着半部残缺的拳谱上山，开价不低。', choices: [
    { label: '买下', hint: '银 −250，全派忠诚 +2，或有所得', cost: 250, gives: { loyalty: 2, renown: 5 }, risk: { chance: 0.35, gives: {}, text: '请人看过，是市面上的坊刻本，白花了银子。' }, text: '残谱虽不全，其中几页心得令弟子们大受启发。' },
    { label: '婉言谢绝', hint: '无事', gives: {}, text: '书生收起残谱，下山另寻买主。' }] },
  { id: 'vein', title: '新矿脉', text: '弟子在后山发现一处露头的矿脉，开采需要先投些本钱。', choices: [
    { label: '投钱开采', hint: '银 −150，铁矿 +40，石矿 +30', cost: 150, gives: { res: { iron: 40, stone: 30 } }, text: '矿石一车车运下山来。' },
    { label: '暂且封存', hint: '无事', gives: {}, text: '矿脉做了记号，留待日后。' }] },
  { id: 'feud', title: '弟子私斗', text: '两名弟子为争一间朝南的厢房动了手，各有一帮人撑腰。', choices: [
    { label: '各打二十板', hint: '全派忠诚 −2，威望 +3', gives: { loyalty: -2, renown: 3 }, text: '板子打完，山门上下肃然。' },
    { label: '好言调解，自掏腰包添置床铺', hint: '银 −60，全派忠诚 +3', cost: 60, gives: { loyalty: 3 }, text: '两人握手言和，还一起来谢了恩。' }] },
  { id: 'envoy', title: '邻派来使', text: '邻近门派遣使送来书信与土产，盼两家多走动。', choices: [
    { label: '厚礼回赠', hint: '银 −120，各派关系 +6', cost: 120, gives: { relations: 6 }, text: '使者满载而归。' },
    { label: '收下土产，回一封信', hint: '各派关系 +2', gives: { relations: 2 }, text: '礼数周全，不卑不亢。' }] },
  { id: 'plague', title: '时疫', text: '山下镇子起了时疫，已有弟子告病。', choices: [
    { label: '延医施药，救治乡里', hint: '银 −180，正邪 +25，威望 +8', cost: 180, gives: { virtue: 25, renown: 8 }, text: '疫情半月而止，乡民送来一块“悬壶济世”的匾。' },
    { label: '封山自保', hint: '全派忠诚 −2，正邪 −10', gives: { loyalty: -2, virtue: -10 }, text: '山上无恙，山下的哭声却传了半个月。' }] },
  { id: 'prodigy', title: '奇童', text: '樵夫领来一个孩子，说是能徒手折断碗口粗的树。', choices: [
    { label: '留下察看', hint: '招贤榜前来一位资质上佳者', gives: { applicant: 78 }, text: '孩子已在招贤榜前候着。' },
    { label: '给些盘缠打发了', hint: '银 −20', cost: 20, gives: {}, text: '樵夫千恩万谢地领着孩子走了。' }] },
  { id: 'harvest', title: '丰年', text: '今年风调雨顺，各村都多打了粮食，乡老们商量着要给山上送些。', choices: [
    { label: '收下', hint: '粮 +40', gives: { grain: 40 }, text: '粮仓堆得冒了尖。' },
    { label: '只收一半，余下让各村留着过冬', hint: '粮 +20，正邪 +10', gives: { grain: 20, virtue: 10 }, text: '乡老们直夸掌门体恤。' }] },
  { id: 'thief', title: '库房失窃', text: '夜里库房的锁被人撬了，少了些银两。有人说看见一个杂役鬼鬼祟祟。', choices: [
    { label: '彻查到底', hint: '或追回银两；全派忠诚 −1', gives: { loyalty: -1, silver: 60 }, risk: { chance: 0.4, gives: { loyalty: -3, silver: -80 }, text: '查了半月一无所获，人心惶惶。' }, text: '贼赃在后山树洞里找到，是山下的惯偷所为。' },
    { label: '不予追究，加派巡夜', hint: '银 −80', gives: { silver: -80 }, text: '此后库房再没出过事。' }] },
  { id: 'tournament', title: '以武会友', text: '左近几家门派发来英雄帖，邀本派弟子赴会切磋。', choices: [
    { label: '派弟子赴会', hint: '威望 +12，各派关系 +3；或有人受伤', gives: { renown: 12, relations: 3 }, risk: { chance: 0.25, gives: { renown: 4, relations: 3, wound: 0.2 }, text: '本派弟子技不如人，带伤而回，好在礼数未失。' }, text: '本派弟子连胜三场，满堂喝彩。' },
    { label: '托辞不去', hint: '各派关系 −2', gives: { relations: -2 }, text: '英雄帖原样退回。' }] },
  { id: 'pardon', title: '特赦', text: '靖武司暗示：若本派肯出一笔“助饷”，往日抗令之事可以一笔勾销。', when: (books) => books.court < -20, choices: [
    { label: '出钱了事', hint: '银 −400，朝廷 +30', cost: 400, gives: { court: 30 }, text: '银子送到，海捕文书悄悄揭了下来。' },
    { label: '一文不给', hint: '威望 +8，朝廷 −5', gives: { renown: 8, court: -5 }, text: '江湖上说本派有骨气。' }] },
  { id: 'raid', title: '官兵围山', text: '靖武司调来官兵围住山门，要本派交出兵甲、遣散弟子。', when: (books) => books.court < -50, choices: [
    { label: '据险死守', hint: '威望 +25，朝廷 −10；高手或有损伤', gives: { renown: 25, court: -10, wound: 0.4 }, text: '官兵攻了三日，丢下几十具尸首退了。' },
    { label: '破财消灾', hint: '银 −600，朝廷 +25', cost: 600, gives: { court: 25 }, text: '带兵的千总收了银子，报了个“查无实据”。' },
    { label: '缴械请降', hint: '朝廷 +40，威望 −40，全派忠诚 −8', gives: { court: 40, renown: -40, loyalty: -8 }, text: '兵刃缴了大半，弟子们抬不起头来。' }] },
  { id: 'favour', title: '钦差过境', text: '钦差大臣路过本派地界，有意见一见掌门。', when: (books) => books.court >= 20, choices: [
    { label: '设宴款待', hint: '银 −150，朝廷 +15', cost: 150, gives: { court: 15 }, text: '钦差临行前留下一句：“贵派他日必有重用。”' },
    { label: '称病不见', hint: '威望 +5，朝廷 −8', gives: { renown: 5, court: -8 }, text: '钦差冷笑一声，起轿走了。' }] },
  { id: 'bandits', title: '山贼', text: '一伙山贼占了附近的隘口，打劫过往行人，还放话要上山“借粮”。', choices: [
    { label: '出兵剿灭', hint: '正邪 +20，威望 +12，银 +100；或有人受伤', gives: { virtue: 20, renown: 12, silver: 100 }, risk: { chance: 0.2, gives: { virtue: 10, wound: 0.3 }, text: '山贼凭险顽抗，本派高手负了伤才将其击溃。' }, text: '贼寨一把火烧了，缴获的财物分了一半给苦主。' },
    { label: '收编为外围', hint: '银 +200，正邪 −30', gives: { silver: 200, virtue: -30 }, text: '山贼头子献上孝敬，从此打着本派的旗号行事。' },
    { label: '严守山门，不去理会', hint: '无事', gives: {}, text: '山贼望着山门上的弓弩，没敢上来。' }] },
  { id: 'relic', title: '神兵现世', text: '传闻一处古墓塌了半边，露出一口刻着铭文的石匣。几路人马都在往那里赶。', choices: [
    { label: '派高手去取', hint: '或得神兵；高手或有损伤', gives: { relic: true, renown: 10 }, risk: { chance: 0.4, gives: { wound: 0.3 }, text: '去晚了一步，石匣已空，还与人动了手。' }, text: '本派高手带回一件神兵，可在弟子页赐予合用之人。' },
    { label: '重金向得主收购', hint: '银 −800，必得神兵', cost: 800, gives: { relic: true }, text: '银货两讫，神兵入库。' },
    { label: '不凑这个热闹', hint: '无事', gives: {}, text: '听说为那口石匣死了不少人。' }] },
  { id: 'pirates', title: '海寇', text: '沿海传来急报：海寇的船队在近海游弋，已有渔村被焚。本派在海边的据点首当其冲。', when: (books, state) => ['yangzhou', 'quanzhou', 'lingnan', 'tiantai'].some((id) => state.places[id].owner === state.playerSect), choices: [
    { label: '整兵迎击', hint: '威望 +20，正邪 +15，朝廷 +8；高手或有损伤', gives: { renown: 20, virtue: 15, court: 8, wound: 0.3 }, text: '海寇在滩头丢下十几条船，退回了海上。' },
    { label: '出钱请官军', hint: '银 −300，朝廷 +5', cost: 300, gives: { court: 5 }, text: '官军的战船到了，海寇闻风而遁。' },
    { label: '坚壁清野', hint: '银 −150，粮 −20', gives: { silver: -150, grain: -20 }, text: '海寇抢走了来不及运走的粮货。' }] },
];
export const EVENT_BY_ID = Object.fromEntries(EVENTS.map((event) => [event.id, event]));
