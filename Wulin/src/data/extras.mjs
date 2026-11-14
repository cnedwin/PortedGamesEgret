// More of the game's data: named weapons, the meridians, what a branch may
// specialise in, how a game may begin, and how hard the other sects play.

/**
 * Named weapons: [id, name, slot, attack, the tale told when it surfaces].
 * They cannot be made; they come to light through an event.
 */
const RELIC_ROWS = [
  ['r-sword1', '照胆', 'sword', 170, '相传照见人心胆气的古剑'], ['r-sword2', '听潮', 'sword', 160, '剑身有潮纹，挥动如闻涛声'], ['r-sword3', '孤鸿', 'sword', 180, '一代剑客埋骨时所佩'], ['r-sword4', '裁云', 'sword', 155, '薄如蝉翼，可断飞絮'],
  ['r-saber1', '破阵', 'saber', 175, '边军名将的佩刀'], ['r-saber2', '断岳', 'saber', 180, '重四十九斤，开山裂石'], ['r-saber3', '雁翎', 'saber', 160, '形如雁翎，出鞘无声'], ['r-saber4', '饮雪', 'saber', 165, '关外雪原上传下来的刀'],
  ['r-spear1', '惊蛰', 'spear', 175, '枪出如春雷乍动'], ['r-spear2', '定澜', 'spear', 165, '治水的将军留下的长枪'], ['r-spear3', '穿云', 'spear', 180, '据说曾一枪挑落城楼上的旗'],
  ['r-staff1', '镇岳', 'staff', 170, '古寺镇山之宝'], ['r-staff2', '行者', 'staff', 160, '行脚僧走了万里路的铁棍'], ['r-staff3', '盘龙', 'staff', 175, '棍身盘着一条铜龙'],
  ['r-glove1', '伏虎', 'glove', 165, '猎户世家传了七代的拳套'], ['r-glove2', '金丝', 'glove', 155, '金丝织就，刀剑不入'], ['r-glove3', '裂石', 'glove', 175, '指节嵌着寒铁'],
  ['r-stylus1', '点星', 'stylus', 160, '笔尖一点寒星'], ['r-stylus2', '判官', 'stylus', 170, '旧时刑名师爷的铁笔'], ['r-stylus3', '春秋', 'stylus', 180, '一支写过史也杀过人的笔'],
  ['r-dart1', '流萤', 'dart', 160, '夜里出手，只见一点微光'], ['r-dart2', '梨花', 'dart', 175, '机括一响，漫天银针'], ['r-dart3', '燕尾', 'dart', 165, '镖尾分叉，去而复返'], ['r-dart4', '无声', 'dart', 180, '中者不闻其声'],
];
export const RELICS = RELIC_ROWS.map(([id, name, slot, power, tale]) => ({ id, name, slot, power, tale }));
export const RELIC_BY_ID = Object.fromEntries(RELICS.map((relic) => [relic.id, relic]));

/** The eight meridians, opened in order; each offers two gifts. */
export const MERIDIANS = [
  { name: '任脉', a: { label: '养气', nei: 20 }, b: { label: '强身', vigor: 0.03 } },
  { name: '督脉', a: { label: '发劲', arm: 15 }, b: { label: '稳桩', waist: 15 } },
  { name: '冲脉', a: { label: '养气', nei: 20 }, b: { label: '轻身', agi: 12 } },
  { name: '带脉', a: { label: '稳桩', waist: 15 }, b: { label: '健步', leg: 15 } },
  { name: '阴跷', a: { label: '轻身', agi: 12 }, b: { label: '明目', dart: 15 } },
  { name: '阳跷', a: { label: '健步', leg: 15 }, b: { label: '发劲', arm: 15 } },
  { name: '阴维', a: { label: '养气', nei: 25 }, b: { label: '开悟', wit: 6 } },
  { name: '阳维', a: { label: '强身', vigor: 0.05 }, b: { label: '养气', nei: 30 } },
];

/** What a branch may be given over to; each adds a share to the work done there. */
export const FOCUSES = {
  none: { name: '不设专精', does: '无增减' },
  mine: { name: '矿场', does: '此处采集多三成', gather: 0.3 },
  craft: { name: '工坊', does: '此处制造多三成', craft: 0.3 },
  drill: { name: '演武', does: '此处修练快一成半', train: 0.15 },
  fort: { name: '关隘', does: '此处守城防御加一成半', defense: 0.15 },
};

/** How a game may begin. */
export const SCENARIOS = {
  many: { name: '群雄并起', does: '十二派各守一方，实力相若。' },
  sides: { name: '正邪对峙', does: '邪派两家各多一处据点、多五名弟子，正派彼此交好。' },
  five: { name: '五强争霸', does: '只余五家大派，各据三处，本派必在其中。' },
  lone: { name: '孤峰独立', does: '本派开局只有掌门与四名弟子，银两减半。' },
};

/** How hard the sects the game runs press the player: a share of income added or taken away, and the years they leave the player in peace. */
export const DIFFICULTIES = [
  { name: '从容', income: -0.25, peace: 5 },
  { name: '寻常', income: 0, peace: 3 },
  { name: '艰难', income: 0.3, peace: 2 },
  { name: '绝境', income: 0.7, peace: 1 },
];

/** Travel: what a day on the road may bring, as [chance, what]. */
export const ROAD = { xp: 36, hurt: 0.015, find: 0.02, days: 30 };
