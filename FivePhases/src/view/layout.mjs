// 屏幕分区，只此一份。
//
// 画布和 DOM 上的 HUD 必须对得上，所以坐标写在同一个地方：
// canvas 按这些数字画，CSS 变量也从这些数字来。两边各写一遍，迟早会差几个像素，
// 而"点了没反应"十有八九就是差的那几个像素。

export const STAGE = { width: 750, height: 1624 };

export const BOARD = {
  x: 32,
  y: 836,
  cell: 98,
  size: 7,
};

export const REGIONS = {
  enemy: { y: 0, height: 340 },
  hero: { y: 340, height: 316 },
  hand: { y: 656, height: 180 },
  board: { y: BOARD.y, height: BOARD.cell * BOARD.size },
  footer: { y: 1522, height: 102 },
};

/** 棋盘上某一格的中心（舞台坐标）。 */
export const cellCentre = (index) => ({
  x: BOARD.x + (index % BOARD.size) * BOARD.cell + BOARD.cell / 2,
  y: BOARD.y + Math.floor(index / BOARD.size) * BOARD.cell + BOARD.cell / 2,
});

/** 各角色图集锚点和在战斗区的绘制宽度。 */
export const HERO_SPOT = { x: 218, y: 767, width: 362 };
export const ENEMY_SPOT = {
  x: 520,
  y: 190,
  placement: {
    shanjiao: { x: 522, y: 343, width: 316 },
    chijiao: { x: 523, y: 349, width: 341 },
    hundun: { x: 523, y: 348, width: 351 },
  },
};

/** 能量面板的五个坑，按五行顺序。两列三行，最后一颗居中收尾。 */
export const ENERGY_SLOTS = [
  { x: 500, y: 380 },
  { x: 630, y: 380 },
  { x: 500, y: 456 },
  { x: 630, y: 456 },
  { x: 565, y: 532 },
];
