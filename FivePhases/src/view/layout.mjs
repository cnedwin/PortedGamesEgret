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

/** 立绘摆位。敌人往上抬、缩一圈，把 y 372 以下的右半屏让给能量面板。
 *
 * 缩放不是随手给的，按上下两条边界倒推：
 * - 上边界：横幅占 336–380、血条占 384–424，所以头顶不能高于 428。
 * - 下边界：手牌从 660 起，裙子再往下就被卡面挡住（挡住是对的，人站在卡后面）。
 * 骨骼清单里头顶在 y=340、胯在 1150，头顶到胯 810；胯落在 695，于是
 *   695 − 810 × s = 428  →  s ≈ 0.33
 * 0.33 时露出的是"头顶到大腿"——膝盖以下本来就被手牌挡住，等于一张半身像。
 * 0.2 时脸只有 12 像素高，五官全糊成一团红影。 */
export const HERO_SPOT = { x: 152, y: 695, scale: 0.33 };
export const ENEMY_SPOT = { x: 520, y: 190, width: 250, height: 250 };

/** 能量面板的五个坑，按五行顺序。两列三行，最后一颗居中收尾。 */
export const ENERGY_SLOTS = [
  { x: 500, y: 380 },
  { x: 630, y: 380 },
  { x: 500, y: 456 },
  { x: 630, y: 456 },
  { x: 565, y: 532 },
];
