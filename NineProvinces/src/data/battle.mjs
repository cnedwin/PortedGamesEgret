// 战场上的数：二十六种兵种、八种阵型、各种地形。兵种分五类（步、骑、弓、器械、水军），相克是枪克骑、骑克弓、弓克戟、
// 戟克枪；特殊兵种要某位武将、某个势力或某项科技。数值都是每千人的。
// The numbers of the battlefield: twenty-six kinds of troops, eight formations, and the kinds of ground. Troops are of
// five classes (foot, horse, bow, engines, ships); spears beat horse, horse beats bows, bows beat halberds and halberds
// beat spears; the special troops need a certain general, faction or invention. Figures are per thousand soldiers.

/**
 * Kinds of troops. atk and def per thousand, spd in hexes a second, range in hexes, beats: the weapon kinds it does
 * well against. cost: coin and grain to raise a thousand. need: what is needed to raise them (a tech, a trait of the
 * leader, a faction). special: what they do besides.
 */
const UNIT_ROWS = `
spear 枪兵 Spearmen inf spear 10 12 1.0 1 cav 100 100 - brace
halberd 戟兵 Halberdiers inf halberd 12 10 1.0 1 spear 120 100 - -
sword 刀盾兵 Shieldmen inf sword 10 14 1.0 1 bow 120 100 - shield
archer 弓兵 Archers bow bow 9 7 1.0 3 halberd 120 100 - volley
crossbow 弩兵 Crossbowmen bow bow 12 8 0.9 3 halberd 160 110 t:crossbow pierce
repeater 连弩兵 Repeating_Crossbows bow bow 13 8 0.9 3 halberd 260 120 t:repeater rapid
lightcav 轻骑兵 Light_Horse cav cav 10 8 1.8 1 bow 180 140 - swift
cavalry 骑兵 Cavalry cav cav 13 10 1.5 1 bow 220 160 t:stables charge
heavycav 重骑兵 Heavy_Horse cav cav 15 14 1.2 1 bow 320 180 t:barding charge
horsearcher 弓骑兵 Horse_Archers cav bow 9 8 1.7 2 halberd 260 160 t:mounted volley
ram 冲车 Rams siege siege 30 14 0.6 1 - 260 120 t:engines gate
tower 井阑 Siege_Towers siege siege 8 12 0.6 3 - 280 120 t:engines overwall
catapult 投石车 Catapults siege siege 20 6 0.5 5 - 400 150 t:catapult splash
mengchong 艨艟 Mengchong_Rams navy navy 12 10 1.6 1 - 220 120 t:shipyard ram
louchuan 楼船 Tower_Ships navy navy 11 16 0.9 3 - 380 160 t:towerships volley
doujian 斗舰 War_Galleys navy navy 12 12 1.2 2 - 280 140 t:shipyard volley
hubao 虎豹骑 Tiger_and_Leopard_Riders cav cav 18 15 1.6 1 bow 420 200 f:caocao charge
baima 白马义从 White_Horse_Volunteers cav bow 13 10 1.9 2 halberd 380 180 g:baima volley
xianzhen 陷阵营 Formation_Breakers inf halberd 18 16 1.1 1 spear 400 180 g:xianzhen breach
xiandeng 先登死士 First-on-the-Wall_Corps inf sword 15 15 1.1 1 bow 360 160 g:xiandeng shield
wudang 无当飞军 Wudang_Flying_Corps inf bow 13 11 1.3 2 halberd 340 160 g:shanzhan ambush
danyang 丹阳兵 Danyang_Troops inf spear 13 14 1.0 1 cav 260 130 g:danyangb brace
xiliang 西凉铁骑 Liang_Iron_Cavalry cav cav 16 13 1.6 1 bow 360 180 g:xiliang charge
tengjia 藤甲兵 Rattan_Armour inf sword 11 20 1.0 1 bow 240 120 g:tengpai fireweak
elephant 象兵 War_Elephants cav cav 17 18 0.9 1 spear 420 220 g:qushou trample
qingzhou 青州兵 Qingzhou_Corps inf spear 12 12 1.1 1 cav 160 120 g:qingzhou brace
`;

export const UNITS = {};
for (const line of UNIT_ROWS.trim().split('\n')) {
  const [id, zh, en, group, weapon, atk, def, spd, range, beats, coin, grain, need, special] = line.trim().split(/\s+/);
  UNITS[id] = {
    id,
    zh,
    en: en.replace(/_/g, ' '),
    group,
    weapon,
    atk: +atk,
    def: +def,
    spd: +spd,
    range: +range,
    beats: beats === '-' ? null : beats,
    cost: { coin: +coin, grain: +grain },
    need: need === '-' ? null : { kind: { t: 'tech', f: 'faction', g: 'trait' }[need[0]], id: need.slice(2) },
    special: special === '-' ? null : special
  };
}

/** How much a weapon kind hurts another beyond the ordinary: the triangle, and what shields and walls do. */
export const COUNTER = 1.35;
/** Horse already has the speed/armour to close on bows; its weapon bonus is smaller than the foot triangle. */
export const HORSE_BOW_COUNTER = 1.25;

/**
 * Formations: what they change. atk, def, spd as multipliers minus one; front: extra defence facing the enemy;
 * flank: extra damage when striking from the side; group: which class may take it.
 */
const FORMATION_ROWS = `
fishscale 鱼鳞 Fish_Scales 0.10 0.00 -0.08 0.10 0.00 inf
arrowhead 锋矢 Arrowhead 0.20 -0.10 0.10 0.00 0.10 cav
craneswing 鹤翼 Crane's_Wings 0.05 0.05 -0.05 0.00 0.20 any
square 方圆 Square 0.00 0.25 -0.30 0.20 0.00 any
geese 雁行 Wild_Geese 0.10 -0.12 -0.05 0.00 0.00 bow
longsnake 长蛇 Long_Snake -0.10 -0.15 0.25 0.00 0.00 any
crescent 偃月 Crescent 0.15 0.05 -0.12 0.05 0.05 cav
yoke 衡轭 Yoke 0.00 0.15 -0.10 0.10 0.05 inf
`;

export const FORMATIONS = {};
for (const line of FORMATION_ROWS.trim().split('\n')) {
  const [id, zh, en, atk, def, spd, front, flank, group] = line.trim().split(/\s+/);
  FORMATIONS[id] = { id, zh, en: en.replace(/_/g, ' '), atk: +atk, def: +def, spd: +spd, front: +front, flank: +flank, group };
}

/** Shared by campaign deployment, sandbox configuration and authoritative orders. */
export function formationAllowed(kind, formation) {
  const u=UNITS[kind],f=FORMATIONS[formation];
  return Boolean(u&&f&&(f.group==='any'||f.group===u.group||(u.group==='navy'&&f.group==='inf')));
}
export function defaultFormation(kind) {
  return UNITS[kind]?.group==='cav'?'arrowhead':UNITS[kind]?.group==='bow'?'geese':UNITS[kind]?.group==='inf'?'fishscale':'square';
}

/** Ground on the battlefield: move cost, defence for who stands on it, and who it suits. */
export const TERRAIN = {
  plain: { zh: '平原', en: 'Plain', cost: 1, def: 0, cav: 0.1, colour: 0xc9b98a },
  grass: { zh: '草地', en: 'Grassland', cost: 1, def: 0, cav: 0.15, colour: 0xb5b878 },
  forest: { zh: '树林', en: 'Woods', cost: 2, def: 0.2, cav: -0.25, hide: true, burn: true, colour: 0x6f8a58 },
  hill: { zh: '山地', en: 'Hills', cost: 2, def: 0.25, cav: -0.2, high: true, colour: 0xa08a62 },
  mountain: { zh: '高山', en: 'Mountain', cost: 4, def: 0.4, cav: -0.5, high: true, colour: 0x857258 },
  river: { zh: '浅滩', en: 'Shallows', cost: 3, def: -0.2, cav: -0.3, colour: 0x8fb1b8 },
  water: { zh: '江面', en: 'Open water', cost: 1, def: 0, cav: 0, water: true, colour: 0x6f98a8 },
  marsh: { zh: '沼泽', en: 'Marsh', cost: 3, def: -0.1, cav: -0.4, colour: 0x8a9a6a },
  road: { zh: '道路', en: 'Road', cost: 0.7, def: 0, cav: 0.1, colour: 0xd8c79c },
  wall: { zh: '城墙', en: 'Wall', cost: 99, def: 0.6, cav: 0, wall: true, colour: 0x8c8378 },
  gate: { zh: '城门', en: 'Gate', cost: 99, def: 0.5, cav: 0, gate: true, colour: 0x6e4b33 },
  town: { zh: '城内', en: 'Inside the walls', cost: 1, def: 0.15, cav: -0.1, colour: 0xb7a58a },
  camp: { zh: '营寨', en: 'Camp', cost: 1, def: 0.25, cav: 0, colour: 0xb9a070 },
  ship: { zh: '战船', en: 'Moored ships', cost: 1, def: 0.1, cav: 0, water: true, burn: true, colour: 0x7a5a3c }
};
