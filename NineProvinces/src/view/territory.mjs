import { MAP, NODES } from '../data/map.mjs';
import { isTerritoryLand } from '../sim/land.mjs';

/** Each parcel belongs to the nearest town or smaller stronghold within reach. */
export function buildTerritoryGrid(cell = 8) {
  const cols = Math.ceil(MAP.width / cell), rows = Math.ceil(MAP.height / cell);
  const dx = MAP.width / cols, dz = MAP.height / rows;
  const ids = Object.keys(NODES);
  const grid = new Int16Array(cols * rows).fill(-1);
  const closest = new Float32Array(grid.length).fill(245 ** 2);
  for (const [index, id] of ids.entries()) {
    const n = NODES[id], weight = n.kind === 'city' ? 1 : 2.1;
    const radius = 245 / Math.sqrt(weight);
    const left = Math.max(0, Math.floor((n.x - radius) / dx));
    const right = Math.min(cols - 1, Math.floor((n.x + radius) / dx));
    const top = Math.max(0, Math.floor((n.y - radius) / dz));
    const bottom = Math.min(rows - 1, Math.floor((n.y + radius) / dz));
    for (let row = top; row <= bottom; row++) {
      const vertical = ((row + 0.5) * dz - n.y) ** 2;
      for (let col = left; col <= right; col++) {
        const at = row * cols + col;
        const distance = (((col + 0.5) * dx - n.x) ** 2 + vertical) * weight;
        if (distance >= closest[at]) continue;
        closest[at] = distance;
        grid[at] = index;
      }
    }
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const at = row * cols + col;
    if (grid[at] !== -1 && !isTerritoryLand((col + 0.5) * dx, (row + 0.5) * dz)) grid[at] = -1;
  }
  return { cols, rows, ids, grid };
}

/** RGB is the owner's seal colour; alpha distinguishes inner land from its border. */
export function territoryPixels({ grid, cols, rows }, owners, colourOf) {
  const pixels = new Uint8ClampedArray(grid.length * 4);
  const colours = owners.map(id => id ? colourOf(id) : 0);
  const different = (at, owner) => grid[at] >= 0 && owners[grid[at]] !== owner;
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const at = row * cols + col, place = grid[at], owner = owners[place];
    if (!owner) continue;
    const edge = (col > 0 && different(at - 1, owner)) || (col + 1 < cols && different(at + 1, owner)) ||
      (row > 0 && different(at - cols, owner)) || (row + 1 < rows && different(at + cols, owner));
    const c = colours[place], k = at * 4;
    pixels[k] = c >> 16 & 255;
    pixels[k + 1] = c >> 8 & 255;
    pixels[k + 2] = c & 255;
    pixels[k + 3] = edge ? 184 : 91;
  }
  return pixels;
}
