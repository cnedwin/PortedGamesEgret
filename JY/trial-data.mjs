export const width = 26;
export const height = 20;
export const start = { x: 6, y: 11, facing: 1 };
export const mentor = { x: 17, y: 9, facing: 2 };
export const bridge = { x0: 10, x1: 14, y0: 9, y1: 10 };
export const arena = { x0: 16, x1: 23, y0: 8, y1: 15 };
export const trees = [
  [1, 4], [2, 6], [3, 2], [4, 7], [6, 2], [7, 3], [8, 6], [9, 1],
  [1, 15], [2, 17], [4, 16], [5, 18], [7, 16], [8, 18], [9, 15],
  [14, 1], [15, 4], [16, 2], [18, 1], [24, 2], [25, 5], [25, 8],
  [15, 16], [16, 18], [19, 17], [21, 18], [23, 17], [24, 15], [25, 18],
];
export const rocks = [[3, 9], [7, 7], [9, 13], [10, 2], [10, 17], [14, 6], [14, 14], [16, 6], [23, 6], [25, 11]];
const obstacles = new Set([...trees, ...rocks, [mentor.x, mentor.y]].map(([x, y]) => x + ',' + y));

export const isWater = (x, y) => x >= 11 && x <= 13 && (y < bridge.y0 || y > bridge.y1);
export const insideArena = (x, y) => x >= arena.x0 && x <= arena.x1 && y >= arena.y0 && y <= arena.y1;
export const isPath = (x, y) =>
  x >= 4 && x <= 9 && y === 11 || x === 9 && y >= 9 && y <= 11
  || x >= 9 && x <= 17 && (y === 9 || y === 10) || x === 17 && y >= 5 && y <= 10
  || x >= 17 && x <= 21 && y === 5;
export const canWalk = (x, y) => x > 0 && x < width - 1 && y > 0 && y < height - 1
  && !isWater(x, y) && !obstacles.has(x + ',' + y) && !(x >= 19 && x <= 23 && y >= 2 && y <= 4);

const fighter = (id, x, y, stats) => ({
  id, x, y, level: 1, exp: 0, lifeGrowth: 4, maxMp: 100, mp: 100, physicalPower: 100,
  weaponId: -1, armorId: -1, fist: 22, defence: 8, speed: 70,
  learnedMagics: [{ id: 1, level: 0 }], equippedMagics: [1, 1, 1, 1],
  fightFrames: [1, 8, 6, 1, 1], ...stats,
});
export const battleData = {
  id: 1, width, height, exp: 15, levelUpExp: [100, 250],
  blocked: Uint8Array.from({ length: width * height }, (_, i) => Number(!insideArena(i % width, Math.floor(i / width)))),
  layers: { earth: new Int16Array(width * height), building: new Int16Array(width * height) },
  team: [fighter(0, 17, 11, { name: '行旅者', hp: 85, maxHp: 85, attack: 46, facing: 1 })],
  enemy: [fighter(1, 20, 11, { name: '青衣守驿人', hp: 48, maxHp: 48, attack: 19, facing: 2 })],
  magics: { 1: { id: 1, name: '渡风剑', magicType: 1, effectId: 1, hurtType: 0, attackArea: 0, needMp: 2,
    selectDistance: [2], moveDistance: [2], attackDistance: [2], attack: [86], poison: 0, soundId: -1 } },
};

export function trialRandom() {
  let seed = 5;
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
}
