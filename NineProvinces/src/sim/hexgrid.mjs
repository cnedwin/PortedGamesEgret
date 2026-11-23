// 天下的六角格：尖顶朝上，奇数行右移半格（与战场的格子同一种排法），格宽三个地图单位。地图上的每一点都落在一格里，
// 每一格都有自己的中心；战斗时把战场的二十二乘十四格对到城或路边的天下格上（必要时转半圈），所以仗就打在地图上。
// The realm's hexes: pointy tops, odd rows pushed right by half a hex (the same layout as the battlefield's), three map
// units wide. Every point of the map lies in one hex, and every hex has its centre; a battle lays its twenty-two by
// fourteen hexes onto the realm's hexes at the city or on the road (turned half round when the attackers come from the
// east), so the battle is fought on the map itself.

/** Width of a hex in map units, its corner radius and the distance between rows. */
export const HEX_W = 3;
export const HEX_R = HEX_W / Math.sqrt(3);
export const HEX_H = HEX_R * 1.5;

/** The centre of hex (c, r) in map units. */
export function hexCenter(c, r) {
  return { x: (c + (r & 1) / 2) * HEX_W, z: r * HEX_H };
}

/** The hex a map point lies in, as [column, row]. */
export function hexAt(x, z) {
  // Axial coordinates for pointy-top hexes, rounded in cube space, then back to odd-r offset.
  const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * z) / HEX_R;
  const r = ((2 / 3) * z) / HEX_R;
  let rx = Math.round(q),
    rz = Math.round(r),
    ry = Math.round(-q - r);
  const dx = Math.abs(rx - q),
    dy = Math.abs(ry - (-q - r)),
    dz = Math.abs(rz - r);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy <= dz) rz = -rx - ry;
  return [rx + (rz - (rz & 1)) / 2, rz];
}

/** Hex distance between two hexes in offset coordinates. */
export function hexDistance(c1, r1, c2, r2) {
  const x1 = c1 - (r1 - (r1 & 1)) / 2,
    x2 = c2 - (r2 - (r2 & 1)) / 2;
  const dx = x1 - x2,
    dz = r1 - r2;
  return Math.max(Math.abs(dx), Math.abs(dz), Math.abs(dx + dz));
}

/** Battlefield size, which the battle rules share. */
export const FIELD_COLS = 22;
export const FIELD_ROWS = 14;

/**
 * Where a battlefield lies on the realm: `c0`, `r0` (always an even row, so odd rows stay odd) and `flip` (turned half
 * round, for attackers from the east). Returns the realm hex of battle hex (c, r).
 */
export function fieldToWorld(grid, c, r) {
  if (grid.flip) {
    c = FIELD_COLS - 1 - c;
    r = FIELD_ROWS - 1 - r;
  }
  return [grid.c0 + c, grid.r0 + r];
}

/** The battle hex of a realm hex, or null when it lies outside the field. */
export function worldToField(grid, c, r) {
  let fc = c - grid.c0,
    fr = r - grid.r0;
  if (grid.flip) {
    fc = FIELD_COLS - 1 - fc;
    fr = FIELD_ROWS - 1 - fr;
  }
  return fc >= 0 && fc < FIELD_COLS && fr >= 0 && fr < FIELD_ROWS ? [fc, fr] : null;
}

/**
 * Lay a battlefield so that battle hex (fc, fr) falls on realm hex (wc, wr). Only the row may move by one so that the
 * field's first row stays even; the returned `fr` says which battle row the realm hex then is.
 */
export function placeField(wc, wr, fc, fr, flip) {
  // Without the flip: r0 = wr - fr. With it: r0 = wr - (FIELD_ROWS - 1 - fr).
  let r0 = flip ? wr - (FIELD_ROWS - 1 - fr) : wr - fr;
  if (r0 & 1) {
    fr += flip ? -1 : 1;
    r0 = flip ? wr - (FIELD_ROWS - 1 - fr) : wr - fr;
  }
  const c0 = flip ? wc - (FIELD_COLS - 1 - fc) : wc - fc;
  return { c0, r0, flip: Boolean(flip), fc, fr };
}
