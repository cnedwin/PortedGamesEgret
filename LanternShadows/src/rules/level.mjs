// The ground of a level: which cells are solid, which are clouds that hold only from above, and where things
// stand. A level is read from the Tiled map that tools/author.mjs writes; lengths here are stage units.

export const CELL = 48;
const EMPTY = 0,
  SOLID = 1,
  LEDGE = 2;

/** A level from its Tiled map. */
export function readLevel(map) {
  const scale = CELL / map.tilewidth,
    kindOf = new Map();
  for (const set of map.tilesets)
    for (const tile of set.tiles ?? []) {
      const has = name => tile.properties?.some(property => property.name === name && property.value === true);
      kindOf.set(set.firstgid + tile.id, has('solid') ? SOLID : has('ledge') ? LEDGE : EMPTY);
    }
  const terrain = map.layers.find(layer => layer.type === 'tilelayer'),
    things = map.layers.find(layer => layer.type === 'objectgroup');
  return {
    columns: map.width,
    rows: map.height,
    width: map.width * CELL,
    height: map.height * CELL,
    /** The name of the picture its ground is drawn from. */
    set: map.tilesets[0]?.name,
    kind: Uint8Array.from(terrain.data, gid => kindOf.get(gid) ?? EMPTY),
    things: (things?.objects ?? []).map(object => ({ type: object.type, x: object.x * scale, y: object.y * scale }))
  };
}

/** A level that is one flat terrace, its top at `ground`: for trying the rules on. */
export function flatLevel(width, ground = 432, things = []) {
  const columns = Math.ceil(width / CELL),
    rows = 12,
    kind = new Uint8Array(columns * rows);
  for (let row = Math.round(ground / CELL); row < rows; row++) kind.fill(SOLID, row * columns, (row + 1) * columns);
  return { columns, rows, width: columns * CELL, height: rows * CELL, kind, things };
}

/** Lays solid ground or a cloud over cells of a level made by `flatLevel`. */
export function lay(level, what, column, row, width = 1, height = 1) {
  for (let r = row; r < row + height; r++) level.kind.fill(what === 'cloud' ? LEDGE : SOLID, r * level.columns + column, r * level.columns + column + width);
  return level;
}

const at = (level, column, row) => (column < 0 || column >= level.columns || row >= level.rows ? SOLID : row < 0 ? EMPTY : level.kind[row * level.columns + column]);

/** Whether the point is inside solid ground. */
export const solidAt = (level, x, y) => at(level, Math.floor(x / CELL), Math.floor(y / CELL)) === SOLID;

/** Whether something standing at `x`, `y` has ground under it there. */
export const groundUnder = (level, x, y) => at(level, Math.floor(x / CELL), Math.floor((y + 1) / CELL)) !== EMPTY;

/**
 * Moves a body by its speed for `dt`: sideways until a wall, then up or down until a ceiling or a floor. A body
 * is `{ x, y, vx, vy }` with `y` at its feet; `size` is `{ halfWidth, height }`. Sets `grounded`, and returns
 * `{ wall, landed }`: whether it ran into a wall, and the speed it came down at if it landed on this step.
 */
export function moveBody(body, dt, level, size) {
  const { halfWidth, height } = size;
  let wall = false,
    landed = 0;
  // Sideways. The rows are those the body fills, from its head to just above its feet.
  let x = body.x + body.vx * dt;
  if (body.vx !== 0) {
    const side = Math.sign(body.vx),
      column = Math.floor((x + side * halfWidth) / CELL);
    for (let row = Math.floor((body.y - height) / CELL); row <= Math.floor((body.y - 1) / CELL); row++)
      if (at(level, column, row) === SOLID) {
        x = side > 0 ? column * CELL - halfWidth - 0.001 : (column + 1) * CELL + halfWidth + 0.001;
        wall = true;
        break;
      }
  }
  if (wall) body.vx = 0;
  body.x = Math.min(level.width - halfWidth, Math.max(halfWidth, x));

  // Up or down. Feet are narrower than shoulders, so that he does not stand on air beside a ledge.
  const before = body.y,
    feet = halfWidth * 0.55,
    left = Math.floor((body.x - feet) / CELL),
    right = Math.floor((body.x + feet) / CELL);
  let y = before + body.vy * dt;
  body.grounded = false;
  if (body.vy >= 0) {
    const row = Math.floor(y / CELL),
      top = row * CELL;
    if (before <= top + 0.01 && y >= top)
      for (let column = left; column <= right; column++)
        if (at(level, column, row) !== EMPTY) {
          landed = body.vy;
          y = top;
          body.vy = 0;
          body.grounded = true;
          break;
        }
  } else {
    const row = Math.floor((y - height) / CELL);
    for (let column = left; column <= right; column++)
      if (at(level, column, row) === SOLID) {
        y = (row + 1) * CELL + height + 0.001;
        body.vy = 0;
        break;
      }
  }
  body.y = y;
  return { wall, landed };
}

/** Whether two rectangles `{ x, y, width, height }` overlap. */
export const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
