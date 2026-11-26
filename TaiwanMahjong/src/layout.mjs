// 牌桌的几何：1280×720 的桌面上每张牌放在哪里、朝哪个方向、多大。四家的牌河绕着中间的方框排成风车形，互不重叠；
// 玩家在下方，下家在右，对家在上，上家在左。画静态牌桌（felt.mjs）和播动画（view.mjs）都用这里的坐标。
// Where every tile of the table sits on a 1280 × 720 stage, which way it faces and how large it is. The four rivers
// wind round the centre square like a pinwheel and never overlap; the player is at the bottom, the next seat on the
// right, the opposite seat at the top, the one before on the left. The still table (felt.mjs) and the motion
// (view.mjs) both take their places from here.
import { CELL } from './tiles.mjs';

export const STAGE = { width: 1280, height: 720 };
export const STAGE_SCALE = 0.75;
export const CENTRE = { x: 640, y: 360, half: 76 };

/** Preserve the logical table and pick enough native pixels for its actual display size.
 * The 2× ceiling keeps both the render target and Egret's text atlas within the existing mobile budget.
 */
export function displayPixelRatio(cssWidth, cssHeight, tall, deviceRatio) {
  const width = (tall ? STAGE.height : STAGE.width) * STAGE_SCALE;
  const height = (tall ? STAGE.width : STAGE.height) * STAGE_SCALE;
  const dpr = Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1;
  const displayDensity = Math.min(cssWidth / width, cssHeight / height) * dpr;
  return Math.min(2, Math.max(1, dpr, displayDensity));
}

/** Scales of a tile cell (128 × 172 pixels) in each place. */
export const SCALE = { hand: 0.54, meld: 0.42, river: 0.25, small: 0.25, back: 0.28, side: 0.26, flower: 0.2 };

const ROTATION = [0, -Math.PI / 2, Math.PI, Math.PI / 2];

/** Turn a point given from a seat's own view (u to its right, v away from the centre) to the stage. */
function fromSeat(seat, u, v) {
  const a = ROTATION[seat],
    cos = Math.cos(a),
    sin = Math.sin(a);
  return { x: CENTRE.x + u * cos - v * sin, y: CENTRE.y + u * sin + v * cos };
}

const RIVER_ROW = 9;
const STEP = { river: CELL.width * SCALE.river, riverRow: 152 * SCALE.river };

/** Where a seat's `index`-th discard lies. */
export function riverSlot(seat, index) {
  const row = Math.floor(index / RIVER_ROW),
    col = index % RIVER_ROW;
  const u = -CENTRE.half + (col + 0.5) * STEP.river,
    v = CENTRE.half + 4 + (row + 0.5) * STEP.riverRow;
  return { ...fromSeat(seat, u, v), rotation: ROTATION[seat], scale: SCALE.river };
}

/** The player's concealed tiles: centres of `count` tiles, the last apart when it was just drawn. */
export function handSlots(count, drawnApart) {
  const step = CELL.width * SCALE.hand - 4,
    out = [];
  for (let i = 0; i < count; i++) {
    const gap = drawnApart && i === count - 1 ? 16 : 0;
    out.push({ x: 30 + step / 2 + i * step + gap, y: 660, rotation: 0, scale: SCALE.hand });
  }
  return out;
}

/** A tile the player's hand is wide: for laying out the melds beside it. */
export const HAND_STEP = CELL.width * SCALE.hand - 4;

/**
 * The tiles of each seat's melds, as { kind | back, x, y, rotation, scale }. The player's melds lie to the right of
 * the hand; the others' in a row between their hand and their river.
 */
export function meldTiles(seat, melds, kindOf) {
  const out = [];
  if (seat === 0) {
    const step = CELL.width * SCALE.meld - 3;
    let right = 1252;
    for (let m = melds.length - 1; m >= 0; m--) {
      const tiles = melds[m].tiles;
      for (let i = tiles.length - 1; i >= 0; i--) {
        const hidden = melds[m].how === 'closed' && (i === 0 || i === 3);
        out.push({ kind: hidden ? null : kindOf(tiles[i]), x: right - step / 2, y: 672, rotation: 0, scale: SCALE.meld });
        right -= step;
      }
      right -= 10;
    }
    return out;
  }
  const step = CELL.width * SCALE.small - 1,
    total = melds.reduce((sum, m) => sum + m.tiles.length * step + 8, -8);
  let u = -total / 2;
  const v = seat === 2 ? 262 : 520;
  for (const meld of melds) {
    meld.tiles.forEach((id, i) => {
      const hidden = meld.how === 'closed' && (i === 0 || i === 3);
      out.push({ kind: hidden ? null : kindOf(id), ...fromSeat(seat, u + step / 2, v), rotation: ROTATION[seat], scale: SCALE.small });
      u += step;
    });
    u += 8;
  }
  return out;
}

/** The backs (or, at the end, faces) of another seat's concealed tiles. */
export function concealedSlots(seat, count) {
  const out = [];
  if (seat === 2) {
    const step = CELL.width * SCALE.back - 2;
    for (let i = 0; i < count; i++) out.push({ x: 640 + (count / 2 - i - 0.5) * step, y: 46, rotation: Math.PI, scale: SCALE.back });
    return out;
  }
  const step = 24,
    x = seat === 1 ? 1226 : 54;
  for (let i = 0; i < count; i++) {
    const offset = (i - count / 2 + 0.5) * step;
    out.push({ x, y: 318 + (seat === 1 ? -offset : offset), rotation: ROTATION[seat], scale: SCALE.side });
  }
  return out;
}

/** Where a seat's flowers sit, beside its name plate. */
export function flowerSlot(seat, index) {
  const step = CELL.width * SCALE.flower + 1;
  // Beside each plate: right of it for the player and the seat before, left of it for the next, below for the far one.
  const at = [
    { x: 214 + index * step, y: 553 },
    { x: 1104 + index * step, y: 500 },
    { x: 934 + index * step, y: 104 },
    { x: 214 + index * step, y: 51 }
  ][seat];
  return { ...at, rotation: 0, scale: SCALE.flower };
}

/** Where a seat's name plate sits (page pixels on the stage). */
export const PLATES = [
  { x: 24, y: 520 },
  { x: 1096, y: 520 },
  { x: 920, y: 22 },
  { x: 24, y: 22 }
];

/** The middle of a seat's hand, where its discards fly from. */
export function handCentre(seat) {
  return [
    { x: 560, y: 660 },
    { x: 1226, y: 318 },
    { x: 640, y: 46 },
    { x: 54, y: 318 }
  ][seat];
}
