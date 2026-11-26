// 地图：三张本作原创的双人遭遇战地图。每张图只写上半边，下半边是上半边绕中心转半圈（180°），双方的地形、建筑和兵力
// 因而完全对等。字母见 src/sim/terrain.mjs 的 LETTERS；建筑：H 要塞、B 兵营、A 飞羽塔、P 港口、V 村庄。
// The maps: three two-player skirmish maps of this game's own. Only the top half of each is written; the bottom half
// is the top turned half a circle about the centre, so both sides have the same ground, buildings and troops. The
// letters are LETTERS in src/sim/terrain.mjs; buildings: H stronghold, B barracks, A aerie, P harbour, V village.
import { LETTERS } from './terrain.mjs';

const BUILDING_LETTERS = { H: 'hq', B: 'barracks', A: 'tower', P: 'port', V: 'village' };

/**
 * A map from its top half. `own` names the buildings of the side at the top (side 1) by "x,y"; turned, they become
 * side 0's. `units` are side 1's starting troops [type, x, y]; `commander` is where side 1's commander stands.
 */
function mirrored({ id, name, blurb, gold, top, own, units = [], commander, look }) {
  const w = top[0].length,
    h = top.length * 2;
  const rows = [...top, ...top.map((row) => [...row].reverse().join('')).reverse()];
  const terrain = [],
    buildings = [];
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`${id}: row ${y} is ${row.length} wide`);
    [...row].forEach((ch, x) => {
      const kind = BUILDING_LETTERS[ch];
      if (kind) {
        terrain.push(kind === 'port' ? 'dock' : 'floor');
        const upper = y < h / 2;
        const sx = upper ? x : w - 1 - x,
          sy = upper ? y : h - 1 - y;
        const mine = own.includes(`${sx},${sy}`);
        buildings.push({ kind, x, y, owner: mine ? (upper ? 1 : 0) : -1 });
      } else {
        const t = LETTERS[ch];
        if (!t) throw new Error(`${id}: unknown letter ${ch}`);
        terrain.push(t);
      }
    });
  });
  const turn = ([type, x, y], owner) => (owner === 1 ? { type, x, y, owner } : { type, x: w - 1 - x, y: h - 1 - y, owner });
  return {
    id,
    name,
    blurb,
    gold,
    w,
    h,
    terrain,
    buildings,
    look,
    units: [...units.map((u) => turn(u, 0)), ...units.map((u) => turn(u, 1))],
    commanders: [
      { x: w - 1 - commander[0], y: h - 1 - commander[1] },
      { x: commander[0], y: commander[1] }
    ]
  };
}

export const MAPS = [
  mirrored({
    id: 'wheat',
    name: { zh: '麦浪渡口', en: 'Wheatwater Ford' },
    blurb: { zh: '小河斜穿麦田，两座石桥是兵家必争之地。适合第一次上手。', en: 'A stream cuts across the wheat; its two stone bridges are what everyone fights over. A good first battle.' },
    gold: 100,
    look: 'meadow',
    top: [
      '^^^..TT..V...T..',
      '^^.V..T..===B=H.',
      '.^.....T.=..V.=.',
      '~~~#.T...=....=T',
      '..~~~~#..=...==.',
      '.V...~~~#=.TT...'
    ],
    own: ['14,1', '12,1'],
    units: [
      ['swordsman', 13, 2],
      ['pikeman', 11, 2]
    ],
    commander: [13, 3]
  }),
  mirrored({
    id: 'coves',
    name: { zh: '双子海湾', en: 'Twin Coves' },
    blurb: { zh: '两座港湾隔着礁石相望，陆路狭窄，船队与飞兵决定胜负。', en: 'Two harbours face each other across the reefs. The land route is narrow; fleets and fliers decide it.' },
    gold: 300,
    look: 'coast',
    top: [
      'oooooosssss,,..T..^^',
      'ooorsssss,,,.V...H^.',
      'oosssss,,,..==B==..A',
      'oosssrsP,...=.TT..V.',
      'ooossss,,..==...T...',
      'oooosss,...=..V..^^.',
      'oorooss,,T.=.....^..'
    ],
    own: ['17,1', '14,2', '19,2'],
    units: [
      ['swordsman', 16, 2],
      ['archer', 18, 3]
    ],
    commander: [16, 3]
  }),
  mirrored({
    id: 'spine',
    name: { zh: '龙脊隘口', en: 'Dragonspine Pass' },
    blurb: { zh: '群山把战场分成三条路。中路最短也最险，山顶是狮鹫的巢。', en: 'The mountains split the field into three roads. The middle is shortest and most perilous; the peaks belong to griffins.' },
    gold: 200,
    look: 'highland',
    top: [
      '..TT..^^^^...V..TT..',
      '.V..=====^^..=====H.',
      '..T.=..T.^^V.=...B..',
      'TT..=...^^^..=.A..V.',
      '^^..=.V.^^...=.TT...',
      '^^^.=...=====.....T.',
      '.^^.==..=.^^^.V.....',
      '..~~~#~~=~~^^...TT..'
    ],
    own: ['18,1', '17,2', '15,3'],
    units: [
      ['swordsman', 17, 1],
      ['pikeman', 16, 2],
      ['hound', 19, 2]
    ],
    commander: [18, 2]
  })
];

export const mapById = (id) => MAPS.find((m) => m.id === id) ?? MAPS[0];
