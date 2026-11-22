export const ITEMS = Object.freeze({
  'bronze-sword': { id: 'bronze-sword', name: '青铜剑', slot: 'weapon', attack: 13, tier: 'common', description: '西岐军中制式兵器。' },
  'iron-sword': { id: 'iron-sword', name: '岐山破邪剑', slot: 'weapon', attack: 22, tier: 'rare', description: '剑脊刻有破邪符，攻击明显提升。' },
  'linen-armor': { id: 'linen-armor', name: '布甲', slot: 'armor', defense: 1, tier: 'common', description: '轻便的护身布甲。' },
  'scale-armor': { id: 'scale-armor', name: '玄甲鳞衣', slot: 'armor', defense: 5, tier: 'rare', description: '鳞片卸去锋芒，降低受击伤害。' },
  'jade-seal': { id: 'jade-seal', name: '岐山镇邪印', slot: 'charm', attack: 4, defense: 2, tier: 'epic', description: '镇住古道邪气的法印，可装备护身。' },
  potion: { id: 'potion', name: '回春散', tier: 'common', description: '回复 45 点气血。' },
  gold: { id: 'gold', name: '铜钱', tier: 'common' }
});

export const QUEST = Object.freeze({
  name: '古道除祟', requiredKills: 6,
  descriptions: {
    unaccepted: '与姜尚交谈，领取古道除祟之托。',
    hunt: '前往岐山古道，击败六名邪祟。拾取并装备破邪剑，按法宝键施展乾坤圈。',
    boss: '古道深处邪将现身。避开蓄力攻击，以乾坤圈往返破阵。',
    return: '邪将已伏。拾取镇邪印，经古道归营点回城，向姜尚复命。',
    complete: '古道已经平定。镇邪印与赏钱归你，可继续探索和检视装备。'
  }
});

export const MAPS = Object.freeze({
  city: {
    id: 'city', name: '西岐城', width: 1600, height: 1100, spawn: { x: 800, y: 810 },
    portal: { id: 'portal', name: '前往岐山古道', x: 1450, y: 840, radius: 72, to: 'trail' },
    npcs: [{ id: 'elder', name: '姜尚', x: 800, y: 460, radius: 24 }, { id: 'smith', name: '军需官', x: 1120, y: 460, radius: 24 }],
    obstacles: [
      { x: 180, y: 180, width: 350, height: 220, kind: 'house' },
      { x: 970, y: 140, width: 360, height: 240, kind: 'house' },
      { x: 270, y: 670, width: 260, height: 190, kind: 'house' },
      { x: 650, y: 450, width: 90, height: 90, kind: 'well' },
      { x: 1050, y: 780, width: 170, height: 130, kind: 'tree' },
      { x: 0, y: 0, width: 1600, height: 85, kind: 'wall' }
    ]
  },
  trail: {
    id: 'trail', name: '岐山古道', width: 1800, height: 1400, spawn: { x: 180, y: 1190 },
    portal: { id: 'portal', name: '归营阵 · 返回西岐', x: 140, y: 1260, radius: 72, to: 'city' }, npcs: [],
    obstacles: [
      { x: 430, y: 250, width: 170, height: 650, kind: 'cliff' },
      { x: 830, y: 700, width: 360, height: 120, kind: 'cliff' },
      { x: 1220, y: 360, width: 130, height: 360, kind: 'ruin' },
      { x: 850, y: 100, width: 210, height: 160, kind: 'rock' }
    ]
  }
});
export const NPCS = MAPS.city.npcs;
export const ENEMIES = Object.freeze({
  wolf: { name: '山魈獠兽', hp: 32, attack: 6, speed: 110, radius: 19, range: 61, windup: .5, cooldown: 1.5, xp: 14 },
  raider: { name: '蚀心兵卒', hp: 43, attack: 8, speed: 82, radius: 21, range: 65, windup: .65, cooldown: 1.7, xp: 18 },
  shaman: { name: '役火妖人', hp: 36, attack: 9, speed: 65, radius: 21, range: 250, windup: .9, cooldown: 2.2, xp: 20 },
  boss: { name: '蚀甲邪将', hp: 340, attack: 17, speed: 68, radius: 35, range: 106, windup: .85, cooldown: 1.8, xp: 90 }
});
export const SPAWNS = [
  ['wolf', 300, 1050], ['raider', 440, 1110], ['wolf', 710, 1100], ['raider', 750, 910],
  ['shaman', 790, 560], ['raider', 1120, 520], ['wolf', 1130, 1010], ['shaman', 1470, 810]
];
