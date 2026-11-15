// The map: a hydropower station below a dam, described as plain boxes. The
// rules build collision and the walking grid from this list, and the view
// draws the same boxes, so what is seen is exactly what stops a bullet.
//
// Axes: +X is east, +Z is south, +Y is up. A yaw of 0 looks north (-Z).

/** The playable rectangle, in metres. */
export const BOUNDS = { minX: -38, maxX: 38, minZ: -30, maxZ: 32 };

/** Side of one walking-grid cell, and how far obstacles are grown so soldiers keep off walls. */
export const CELL = 0.5;
const CLEARANCE = 0.35;
// NavCrowd also narrows the internal triangle portals by the agent's diameter.
// The grid already has obstacle clearance, so its navigation radius must fit a grid edge.
export const CROWD_RADIUS = CELL * 0.44;

/**
 * Every box of the map: centre `x, y, z`, size `w` (along X), `h` (up), `d`
 * (along Z), a `kind` the view picks a surface for, an optional `tint`, and
 * `solid` (false for things that are only drawn).
 */
export const BOXES = [];

/** Named places the rules and the view both need. */
export const PLACES = {
  spawn: { x: 0, z: 28.5, yaw: 0 },
  /** The terminal screen's yaw and two positions used to check the signal in each sector. */
  terminals: [
    { key: 'yard', x: -32.6, z: 8, facing: -Math.PI / 2, relays: [{ x: -26.8, z: 7.5 }, { x: -25.5, z: 14.4 }] },
    { key: 'plant', x: 4, z: -24.6, facing: Math.PI, relays: [{ x: -1, z: -20.5 }, { x: 10.7, z: -21 }] },
    { key: 'office', x: 34.4, z: -18, facing: Math.PI / 2, relays: [{ x: 30, z: -16.4 }, { x: 27.9, z: -11 }] },
  ],
  helipad: { x: 27, z: 21, radius: 5.5 },
  /** Where guards stand at the start: [x, z, kind]. */
  guards: [
    [-27, 9, 'rifle'],
    [-20, 15, 'rush'],
    [1, -14, 'rifle'],
    [8, -20, 'rifle'],
    [29, -14, 'rifle'],
    [27, -4, 'rush'],
    [12, 4, 'rifle'],
    [-21, -7, 'rifle'],
    [30, 8, 'rush'],
  ],
  /** Where reinforcements come in. */
  entries: [
    [-35, -26],
    [-35, 28.5],
    [19, -27.5],
    [36, 8],
    [35, 29],
    [-12, 30],
    [-36, -6],
    [18, 30],
  ],
  /** Supply crates to search: [x, z, turn]. */
  crates: [
    [-34.5, 20, 0],
    [-15, 0.5, 1.57],
    [-25, -8, 0],
    [14.5, -24.5, 0],
    [-6.5, -10, 1.57],
    [23.2, -19, 0],
    [34.5, -1, 1.57],
    [9, 16, 0.4],
    [-8, 20, 0],
    [20, 6, 1.2],
  ],
  /** Lamps: [x, y, z, strength]. */
  lamps: [
    [-22, 6.5, 6, 1],
    [-2, 6.9, -17, 1.3],
    [10, 6.9, -17, 1.3],
    [29, 3.4, -14, 0.8],
    [29, 3.4, -4, 0.8],
    [20.5, 5.5, 15, 1],
    [2, 6.5, 12, 1],
  ],
};

function box(kind, x, z, w, d, h, y0 = 0, more) {
  const item = { kind, x, y: y0 + h / 2, z, w, h, d, solid: true, ...more };
  BOXES.push(item);
  return item;
}

/**
 * A wall along X at depth `z`, from `x0` to `x1`, with openings. Each opening
 * is `[centre, width, sill, top]`: a door has no sill, a window has one, and
 * the wall continues above `top`.
 */
function wallX(kind, z, x0, x1, h, thick, openings = [], more) {
  let from = x0;
  for (const [centre, width, sill = 0, top = 2.4] of [...openings].sort((a, b) => a[0] - b[0])) {
    const a = centre - width / 2,
      b = centre + width / 2;
    if (a > from) box(kind, (from + a) / 2, z, a - from, thick, h, 0, more);
    if (sill > 0) box(kind, centre, z, width, thick, sill, 0, more);
    if (top < h) box(kind, centre, z, width, thick, h - top, top, more);
    from = b;
  }
  if (x1 > from) box(kind, (from + x1) / 2, z, x1 - from, thick, h, 0, more);
}
/** The same along Z at `x`. */
function wallZ(kind, x, z0, z1, h, thick, openings = [], more) {
  let from = z0;
  for (const [centre, width, sill = 0, top = 2.4] of [...openings].sort((a, b) => a[0] - b[0])) {
    const a = centre - width / 2,
      b = centre + width / 2;
    if (a > from) box(kind, x, (from + a) / 2, thick, a - from, h, 0, more);
    if (sill > 0) box(kind, x, centre, thick, width, sill, 0, more);
    if (top < h) box(kind, x, centre, thick, width, h - top, top, more);
    from = b;
  }
  if (z1 > from) box(kind, x, (from + z1) / 2, thick, z1 - from, h, 0, more);
}

const CONTAINER_TINTS = [0x8a3b2e, 0x2f5d7c, 0x4c6b3c, 0xb08a2e, 0x6d6f73, 0x1f6e68, 0x93512a];
let containerCount = 0;
/** A shipping container; `along` is 'x' or 'z', `length` 6 or 12 metres, `level` 0 on the ground or 1 stacked. */
function container(x, z, along, length = 6, level = 0, tint) {
  const w = along === 'x' ? length : 2.44,
    d = along === 'x' ? 2.44 : length;
  return box('container', x, z, w, d, 2.6, level * 2.6, {
    tint: tint ?? CONTAINER_TINTS[containerCount++ % CONTAINER_TINTS.length],
    along,
  });
}
const crateStack = (x, z, size = 1.1, high = 1) => {
  for (let i = 0; i < high; i++) box('crate', x + (i % 2) * 0.08, z - (i % 2) * 0.06, size, size, size, i * size);
};
/** A low concrete road barrier, `length` metres long. */
const barrier = (x, z, along, length = 3) =>
  box('barrier', x, z, along === 'x' ? length : 0.6, along === 'x' ? 0.6 : length, 1.05);
/** A sandbag wall, chest high. */
const sandbags = (x, z, along, length = 3) =>
  box('sandbag', x, z, along === 'x' ? length : 0.8, along === 'x' ? 0.8 : length, 1.15);
/** A cargo truck: cab and covered bed. */
function truck(x, z, along, tint = 0x4a5a3a) {
  const sign = along === 'x' ? [1, 0] : [0, 1];
  box('truck-bed', x - sign[0] * 1.2, z - sign[1] * 1.2, along === 'x' ? 4.6 : 2.5, along === 'x' ? 2.5 : 4.6, 2.9, 0, {
    tint,
    along,
  });
  box('truck-cab', x + sign[0] * 2.3, z + sign[1] * 2.3, along === 'x' ? 2.2 : 2.4, along === 'x' ? 2.4 : 2.2, 2.4, 0, {
    tint,
    along,
  });
}

// ---- the edges of the map ----------------------------------------------------------------
// North: the foot of the dam. South, east and west: the compound wall.
box('dam', 0, BOUNDS.minZ - 3, 90, 6, 26);
box('dam-step', 0, BOUNDS.minZ + 0.5, 90, 1.4, 1.2);
wallX('compound', BOUNDS.maxZ + 0.5, BOUNDS.minX - 1, BOUNDS.maxX + 1, 4.2, 1);
wallZ('compound', BOUNDS.minX - 0.5, BOUNDS.minZ, BOUNDS.maxZ, 4.2, 1);
wallZ('compound', BOUNDS.maxX + 0.5, BOUNDS.minZ, BOUNDS.maxZ, 4.2, 1);

// ---- the gate, where the mission starts ---------------------------------------------------
box('booth', 5.5, 27.5, 3, 3, 2.8);
barrier(-5, 25.5, 'x', 4);
barrier(3.2, 23.4, 'x', 3);
sandbags(-2.5, 21.5, 'x', 3.2);

// ---- the cargo yard (west) ----------------------------------------------------------------
container(-30, 24, 'x', 12);
container(-17.5, 24, 'x', 6);
container(-30, 24, 'x', 6, 1);
container(-26, 17, 'x', 6);
container(-17, 17.5, 'x', 12);
container(-17, 17.5, 'x', 6, 1);
container(-14.5, 9, 'z', 6);
container(-22.5, 10.2, 'z', 6);
container(-28, 2.5, 'x', 12);
container(-30.5, 2.5, 'x', 6, 1);
container(-17, 2.6, 'x', 6);
container(-33, -6, 'z', 12);
container(-24, -4.5, 'x', 6);
container(-16, -9, 'z', 6);
container(-16, -9, 'z', 6, 1);
container(-28, -14, 'x', 12);
container(-18, -19, 'x', 6);
container(-30.5, -22, 'x', 6);
crateStack(-20.5, 5.6, 1.1, 2);
crateStack(-19.2, 5.8, 1.1, 1);
crateStack(-29, 12.5, 1.2, 1);
crateStack(-11.5, 14, 1.1, 2);
crateStack(-22, -12, 1.2, 2);
crateStack(-12, -15, 1.1, 1);
crateStack(-35, 13, 1.1, 2);
// The yard terminal sits in a field post against the west wall.
sandbags(-33.5, 5.6, 'x', 4.2);
sandbags(-33.5, 10.4, 'x', 4.2);
box('canopy', -34, 8, 5, 4.4, 0.12, 2.9, { solid: false });
for (const [px, pz] of [
  [-36.3, 6],
  [-31.7, 6],
  [-36.3, 10],
  [-31.7, 10],
])
  box('post', px, pz, 0.12, 0.12, 2.9);

// ---- the powerhouse (north, middle) -------------------------------------------------------
const PLANT = { x0: -8, x1: 16, z0: -26, z1: -8, h: 8 };
wallX('plant', PLANT.z1, PLANT.x0, PLANT.x1, PLANT.h, 0.5, [
  [-2, 3.6, 0, 3.4],
  [11, 2.2],
]);
wallX('plant', PLANT.z0, PLANT.x0, PLANT.x1, PLANT.h, 0.5);
wallZ('plant', PLANT.x0, PLANT.z0, PLANT.z1, PLANT.h, 0.5, [
  [-16, 2.2],
  [-21.5, 2.4, 1.1, 2.3],
]);
wallZ('plant', PLANT.x1, PLANT.z0, PLANT.z1, PLANT.h, 0.5, [
  [-12, 2.2],
  [-20, 2.4, 1.1, 2.3],
]);
box('roof', (PLANT.x0 + PLANT.x1) / 2, (PLANT.z0 + PLANT.z1) / 2, PLANT.x1 - PLANT.x0 + 1, PLANT.z1 - PLANT.z0 + 1, 0.4, PLANT.h);
// Three generators in a row, with the control desk behind them.
for (const gx of [-2.5, 4, 10.5]) box('generator', gx, -16.5, 3.4, 3.4, 2.3);
box('console', 4, -25.2, 5, 0.9, 1.1);
box('pipe-rack', -6.6, -23.5, 1.4, 3, 2.2);
box('cabinet', 14.6, -15.5, 1, 2.4, 2.1);
box('cabinet', 0.5, -9.2, 2.4, 0.9, 2.1);
crateStack(8, -10, 1.1, 2);
crateStack(-5.5, -12.5, 1.1, 1);
crateStack(12.5, -22.5, 1.2, 1);

// ---- the office block (east) --------------------------------------------------------------
const OFFICE = { x0: 22, x1: 36, z0: -20, z1: 2, h: 4 };
wallX('office', OFFICE.z1, OFFICE.x0, OFFICE.x1, OFFICE.h, 0.4, [
  [32, 2.2],
  [26, 2.2, 1, 2.2],
]);
wallX('office', OFFICE.z0, OFFICE.x0, OFFICE.x1, OFFICE.h, 0.4);
wallZ('office', OFFICE.x0, OFFICE.z0, OFFICE.z1, OFFICE.h, 0.4, [
  [-3.5, 2.2],
  [-14, 2.6, 1, 2.2],
]);
wallZ('office', OFFICE.x1, OFFICE.z0, OFFICE.z1, OFFICE.h, 0.4);
wallX('office', -9, OFFICE.x0, OFFICE.x1, OFFICE.h, 0.3, [[28.5, 2.2]]);
box(
  'roof',
  (OFFICE.x0 + OFFICE.x1) / 2,
  (OFFICE.z0 + OFFICE.z1) / 2,
  OFFICE.x1 - OFFICE.x0 + 0.8,
  OFFICE.z1 - OFFICE.z0 + 0.8,
  0.3,
  OFFICE.h,
);
box('server', 35.1, -18, 1, 2.6, 2.1);
box('desk', 31, -12.5, 1.8, 0.9, 0.78);
box('desk', 25, -17, 0.9, 1.8, 0.78);
box('cabinet', 23, -10.2, 1.6, 0.6, 1.9);
box('desk', 26, -5.5, 1.8, 0.9, 0.78);
box('desk', 33.5, -4, 0.9, 1.8, 0.78);
box('cabinet', 35.3, -7, 0.6, 2.2, 1.9);
box('sofa', 24, 0.6, 2.2, 0.9, 0.8);

// ---- the open ground between them ----------------------------------------------------------
truck(-3.5, 6, 'z');
truck(11, -2, 'x', 0x5b5f55);
truck(17.5, 22, 'x', 0x3f4f5f);
barrier(-7, 13.5, 'x', 4);
barrier(6, 12, 'z', 4);
barrier(14, 9, 'x', 3);
barrier(1.5, 0, 'x', 4);
barrier(19, -8, 'z', 4);
barrier(-10, -3, 'z', 4);
barrier(20, 14, 'x', 3);
sandbags(-1, -5, 'x', 3.6);
sandbags(18.6, 1.5, 'z', 3.6);
sandbags(9, 22.5, 'z', 3.2);
crateStack(4, 18, 1.2, 2);
crateStack(13.5, 15.5, 1.1, 1);
crateStack(-9.5, 6, 1.1, 2);
crateStack(21, -24, 1.2, 2);
crateStack(18.5, -17, 1.1, 1);
// Transformers beside the powerhouse.
for (const tz of [-24.5, -21]) box('transformer', 19.4, tz, 1.8, 2.2, 2.4);
// A water tower: four legs and a tank overhead.
for (const [lx, lz] of [
  [10.6, 26.4],
  [13.4, 26.4],
  [10.6, 29.2],
  [13.4, 29.2],
])
  box('leg', lx, lz, 0.3, 0.3, 7);
box('tank', 12, 27.8, 4, 4, 3, 7);
// The helipad's edge lights and wind cover.
sandbags(21, 25.5, 'z', 4);
barrier(27, 28.6, 'x', 5);
barrier(33.5, 17, 'z', 4);

// ---- loose things lying about: barrels, pallets, tyres, cable reels --------------------------
const barrels = (x, z, count = 1) => {
  for (let i = 0; i < count; i++)
    box('barrel', x + (i % 2) * 0.66, z + Math.floor(i / 2) * 0.66, 0.6, 0.6, 0.9, 0, {
      tint: [0x2f5d7c, 0x8a3b2e, 0x4c6b3c][Math.abs(i + Math.round(x)) % 3],
    });
};
barrels(-12.5, 21, 3);
barrels(-21, -1.2, 2);
barrels(16.8, -6.5, 4);
barrels(7, 26.5, 2);
barrels(-36.6, -1, 3);
barrels(13.5, -13, 2);
barrels(31, 13, 3);
barrels(-6.8, -19, 2);
barrels(24.5, 5, 2);
for (const [x, z] of [
  [-9, 10.5],
  [-27.5, 20.5],
  [2.5, 15.5],
  [17, -2.2],
  [-33.5, -19],
  [33, 26],
])
  box('pallet', x, z, 1.2, 1, 0.42);
for (const [x, z] of [
  [-4, 12],
  [22, 28.5],
  [-18.5, -14.5],
])
  box('tyres', x, z, 0.8, 0.8, 0.75);
for (const [x, z] of [
  [9.5, 9],
  [-31, 16.5],
  [20.5, -19.5],
])
  box('reel', x, z, 0.9, 1.3, 1.3);
box('forklift', -24.5, 20.6, 1.3, 2.6, 2.1);
// Big steel pipes carry water from the dam into the back of the powerhouse.
for (const px of [-2.5, 4, 10.5]) box('penstock', px, -28.1, 2.2, 3.6, 2.4, 1.4);
// A floodlight tower by the gate and another in the yard.
box('tower', -8.5, 26, 0.5, 0.5, 9);
box('tower', -36.4, -11, 0.5, 0.5, 9);

// Supply crates are solid too, so soldiers walk round them.
for (const [cx, cz, turn] of PLACES.crates) {
  const sideways = Math.abs(Math.sin(turn)) > 0.7;
  box('supply', cx, cz, sideways ? 0.62 : 1.05, sideways ? 1.05 : 0.62, 0.6, 0, { turn });
}

// ---- the walking grid ----------------------------------------------------------------------
export const GRID = {
  cols: Math.round((BOUNDS.maxX - BOUNDS.minX) / CELL),
  rows: Math.round((BOUNDS.maxZ - BOUNDS.minZ) / CELL),
};
/** 1 where a soldier may stand, 0 where something is in the way. */
export const WALKABLE = (() => {
  const grid = new Uint8Array(GRID.cols * GRID.rows).fill(1);
  for (const b of BOXES) {
    // Only things at body height block the way; roofs and lintels do not.
    if (!b.solid || b.y - b.h / 2 > 1.7 || b.y + b.h / 2 < 0.35) continue;
    const c0 = Math.floor((b.x - b.w / 2 - CLEARANCE - BOUNDS.minX) / CELL),
      c1 = Math.floor((b.x + b.w / 2 + CLEARANCE - BOUNDS.minX) / CELL),
      r0 = Math.floor((b.z - b.d / 2 - CLEARANCE - BOUNDS.minZ) / CELL),
      r1 = Math.floor((b.z + b.d / 2 + CLEARANCE - BOUNDS.minZ) / CELL);
    for (let r = Math.max(0, r0); r <= Math.min(GRID.rows - 1, r1); r++)
      for (let c = Math.max(0, c0); c <= Math.min(GRID.cols - 1, c1); c++) grid[r * GRID.cols + c] = 0;
  }
  return grid;
})();

/** True when a soldier can stand at (x, z). */
export function walkable(x, z) {
  const c = Math.floor((x - BOUNDS.minX) / CELL),
    r = Math.floor((z - BOUNDS.minZ) / CELL);
  return c >= 0 && r >= 0 && c < GRID.cols && r < GRID.rows && WALKABLE[r * GRID.cols + c] === 1;
}

/** The walking grid as triangles for the engine's navigation mesh: one quad per open cell, corners shared. */
export function createWalkMesh() {
  const positions = [],
    indices = [],
    corner = new Int32Array((GRID.cols + 1) * (GRID.rows + 1)).fill(-1);
  const vertex = (c, r) => {
    const key = r * (GRID.cols + 1) + c;
    if (corner[key] < 0) {
      corner[key] = positions.length / 3;
      positions.push(BOUNDS.minX + c * CELL, 0, BOUNDS.minZ + r * CELL);
    }
    return corner[key];
  };
  for (let r = 0; r < GRID.rows; r++)
    for (let c = 0; c < GRID.cols; c++) {
      if (!WALKABLE[r * GRID.cols + c]) continue;
      const a = vertex(c, r),
        b = vertex(c + 1, r),
        d = vertex(c, r + 1),
        e = vertex(c + 1, r + 1);
      indices.push(a, d, b, b, d, e);
    }
  return { positions, indices };
}
