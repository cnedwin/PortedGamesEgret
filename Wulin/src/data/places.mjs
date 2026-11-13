// The map: twenty strongholds laid out after the real geography of China.
// Twelve start as a sect's seat; eight are open ground to fight over.
//
// Resources are graded 0 to 3 (none, scarce, fair, rich). `plot` is how many
// building cells the stronghold has. `lean` is the aptitude its recruits
// tend to bring. `at` places it on the strategic map, x east and y south,
// in map units.

/** @typedef {'gold'|'wood'|'stone'|'iron'|'herb'} Resource */
export const RESOURCES = ['gold', 'wood', 'stone', 'iron', 'herb'];
export const RESOURCE_NAMES = { gold: '金矿', wood: '木材', stone: '石矿', iron: '铁矿', herb: '药材' };

export const PLOT_CELLS = { small: 180, medium: 240, large: 280 };

/** Aptitude keys a recruit rolls; see persons.mjs. */
export const APTITUDES = ['fist', 'blade', 'pole', 'dart', 'inner'];

// id, name, seat-of, plot, gold wood stone iron herb, lean, map position, note
const ROWS = [
  ['changbai', '长白山', 'yaowang', 'medium', 0, 3, 1, 1, 3, 'inner', 86, 8, '体魄强健，懂药性'],
  ['shuntian', '顺天府', null, 'small', 2, 0, 1, 2, 1, 'inner', 70, 20, '富家子弟多，束修丰厚'],
  ['hengshan', '恒山', null, 'medium', 1, 1, 2, 2, 1, 'blade', 58, 24, '边地多剑客'],
  ['taishan', '泰山', null, 'large', 0, 2, 3, 1, 1, 'pole', 74, 34, '石料丰足，民风尚武'],
  ['songshan', '嵩山', 'shaolin', 'large', 1, 1, 2, 1, 2, 'fist', 60, 40, '四通八达，兵家必争'],
  ['huashan', '华山', 'huashan', 'medium', 1, 2, 1, 2, 1, 'blade', 48, 38, '奇险天下第一山'],
  ['zhongnan', '终南山', 'quanzhen', 'medium', 0, 2, 2, 1, 2, 'inner', 42, 42, '道家洞天'],
  ['kunlun', '昆仑山', 'kunlun', 'large', 0, 1, 2, 3, 1, 'pole', 14, 36, '产玄铁，地广人稀'],
  ['yingtian', '应天府', 'gaibang', 'small', 1, 0, 2, 2, 2, 'fist', 76, 50, '人烟稠密，来投者多'],
  ['yangzhou', '扬州', 'caobang', 'small', 3, 1, 0, 1, 1, 'pole', 80, 46, '漕运枢纽，商贾云集'],
  ['wudang', '武当山', 'wudang', 'medium', 0, 2, 3, 1, 1, 'blade', 54, 50, '石峰林立'],
  ['emei', '峨嵋山', 'emei', 'medium', 2, 2, 1, 0, 2, 'blade', 30, 58, '女弟子多'],
  ['yuzhou', '渝州', 'tangmen', 'medium', 1, 2, 1, 2, 2, 'dart', 40, 58, '山城多巧匠'],
  ['dongting', '洞庭湖', null, 'large', 1, 2, 0, 1, 3, 'pole', 58, 62, '土地肥沃，水路通达'],
  ['huangshan', '黄山', null, 'medium', 1, 3, 2, 0, 2, 'inner', 74, 58, '松石云海'],
  ['tiantai', '天台山', null, 'medium', 1, 2, 2, 1, 2, 'inner', 84, 60, '佛道并立'],
  ['quanzhou', '泉州', 'mingjiao', 'medium', 2, 1, 1, 2, 1, 'fist', 80, 74, '海港，番商往来'],
  ['lingnan', '岭南', null, 'small', 2, 2, 2, 2, 2, 'fist', 64, 84, '资源齐全，地方狭小'],
  ['guilin', '桂林', null, 'large', 1, 2, 3, 1, 1, 'pole', 50, 76, '山多地广'],
  ['dali', '大理', 'chongsheng', 'medium', 2, 1, 2, 1, 2, 'inner', 28, 76, '佛国，四季如春'],
];

/** Overland roads. Each pair is listed once. */
const ROADS = [
  ['changbai', 'shuntian'],
  ['shuntian', 'hengshan'],
  ['shuntian', 'taishan'],
  ['hengshan', 'huashan'],
  ['hengshan', 'songshan'],
  ['taishan', 'songshan'],
  ['taishan', 'yingtian'],
  ['taishan', 'yangzhou'],
  ['songshan', 'huashan'],
  ['songshan', 'wudang'],
  ['songshan', 'yingtian'],
  ['huashan', 'zhongnan'],
  ['huashan', 'wudang'],
  ['zhongnan', 'kunlun'],
  ['zhongnan', 'emei'],
  ['kunlun', 'emei'],
  ['wudang', 'yuzhou'],
  ['wudang', 'dongting'],
  ['emei', 'yuzhou'],
  ['emei', 'dali'],
  ['yuzhou', 'dongting'],
  ['yuzhou', 'guilin'],
  ['dongting', 'huangshan'],
  ['dongting', 'guilin'],
  ['dongting', 'lingnan'],
  ['yingtian', 'yangzhou'],
  ['yingtian', 'huangshan'],
  ['yangzhou', 'tiantai'],
  ['huangshan', 'tiantai'],
  ['huangshan', 'quanzhou'],
  ['tiantai', 'quanzhou'],
  ['quanzhou', 'lingnan'],
  ['lingnan', 'guilin'],
  ['guilin', 'dali'],
];

/** Water routes: goods move twice as fast between any two ports on one line. */
export const WATERWAYS = [
  { name: '长江', ports: ['yangzhou', 'yingtian', 'dongting', 'yuzhou'] },
  { name: '海路', ports: ['yangzhou', 'quanzhou', 'lingnan'] },
];

export const PLACES = ROWS.map(([id, name, seat, plot, gold, wood, stone, iron, herb, lean, x, y, note]) => ({
  id,
  name,
  /** The sect whose seat this is at the start, if any. */
  seat,
  plot,
  cells: PLOT_CELLS[plot],
  resources: { gold, wood, stone, iron, herb },
  lean,
  at: { x, y },
  note,
  /** Ids of the strongholds one road away; filled in below. */
  roads: [],
  /** Villages attached to the stronghold: food, people and one resource. */
  villages: plot === 'small' ? 1 : 2,
}));

export const PLACE_BY_ID = Object.fromEntries(PLACES.map((place) => [place.id, place]));

for (const [a, b] of ROADS) {
  PLACE_BY_ID[a].roads.push(b);
  PLACE_BY_ID[b].roads.push(a);
}

/** Whether two strongholds share a water route. */
export function sharesWaterway(a, b) {
  return WATERWAYS.some((line) => line.ports.includes(a) && line.ports.includes(b));
}

/**
 * Days for a party to travel between two strongholds along the roads, or
 * Infinity when there is no way. A road takes its map length in days divided
 * by `pace` (1 for a plain party; qinggong raises it).
 */
export function travelDays(from, to, pace = 1) {
  if (from === to) return 0;
  const best = { [from]: 0 };
  const open = [from];
  while (open.length) {
    open.sort((p, q) => best[p] - best[q]);
    const here = open.shift();
    if (here === to) return Math.ceil(best[here] / pace);
    for (const next of PLACE_BY_ID[here].roads) {
      const a = PLACE_BY_ID[here].at,
        b = PLACE_BY_ID[next].at;
      const cost = best[here] + Math.hypot(a.x - b.x, a.y - b.y) / 4;
      if (best[next] === undefined || cost < best[next]) {
        best[next] = cost;
        if (!open.includes(next)) open.push(next);
      }
    }
  }
  return Infinity;
}
