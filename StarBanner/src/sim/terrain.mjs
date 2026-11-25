// 地形：每种地形的防御星数（负数是骷髅，受伤加重）、各种移动方式走一格的花费（没写的走不了）、属于陆地还是水面、
// 是否遮挡视线。数值按原作规则表。
// Terrain: each kind's defence stars (negative ones are skulls, which make wounds worse), what one step costs each way
// of moving (a way not listed cannot enter), whether it counts as land or water, and whether it hides what lies behind.
// The numbers follow the original's rules.

/** Ways of moving. */
export const MOVES = ['walking', 'riding', 'wheels', 'flying', 'sailing', 'amphibious'];

export const TERRAIN = {
  plains: { zh: '平原', en: 'Plains', defence: 1, group: 'land', cost: { walking: 1, riding: 1, flying: 1, wheels: 2, amphibious: 2 } },
  road: { zh: '道路', en: 'Road', defence: 0, group: 'land', cost: { walking: 1, riding: 1, flying: 1, wheels: 1, amphibious: 2 } },
  forest: { zh: '森林', en: 'Forest', defence: 3, group: 'land', cover: true, cost: { walking: 2, riding: 3, flying: 1, amphibious: 4 } },
  mountain: { zh: '山地', en: 'Mountain', defence: 4, group: 'land', cover: true, cost: { walking: 3, flying: 1 } },
  bridge: { zh: '桥', en: 'Bridge', defence: 0, group: 'land', cost: { walking: 1, riding: 1, flying: 1, wheels: 1, amphibious: 2, sailing: 2 }, noStop: ['sailing'] },
  river: { zh: '河流', en: 'River', defence: -2, group: 'land', cost: { walking: 2, riding: 4, flying: 1, amphibious: 1 } },
  beach: { zh: '沙滩', en: 'Beach', defence: -1, group: 'land', cost: { walking: 1, riding: 1, flying: 1, amphibious: 2, sailing: 2 } },
  sea: { zh: '浅海', en: 'Sea', defence: 1, group: 'water', cost: { sailing: 2, flying: 1, amphibious: 1 } },
  ocean: { zh: '深海', en: 'Deep sea', defence: 0, group: 'water', cost: { sailing: 1, flying: 1, amphibious: 1 } },
  reef: { zh: '礁石', en: 'Reef', defence: 2, group: 'water', cover: true, cost: { sailing: 4, flying: 1, amphibious: 2 } },
  // The ground under a building: a building stands on it, so the cost is only for a unit passing its own building.
  floor: { zh: '城砖', en: 'Courtyard', defence: 0, group: 'land', cost: { walking: 1, riding: 1, flying: 1, wheels: 1, amphibious: 2 } },
  dock: { zh: '港湾', en: 'Harbour', defence: 0, group: 'water', cost: { sailing: 1, flying: 1, amphibious: 1 } }
};

/** One letter a tile in the map texts (src/sim/maps.mjs). */
export const LETTERS = {
  '.': 'plains',
  '=': 'road',
  T: 'forest',
  '^': 'mountain',
  '#': 'bridge',
  '~': 'river',
  ',': 'beach',
  s: 'sea',
  o: 'ocean',
  r: 'reef'
};

/** The cost for `move` to enter `terrain`; Infinity when it cannot. */
export function stepCost(terrain, move) {
  return TERRAIN[terrain]?.cost[move] ?? Infinity;
}
