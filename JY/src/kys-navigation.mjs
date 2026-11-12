const directions = [
  { dx: 0, dy: -1, facing: 0 },
  { dx: 1, dy: 0, facing: 1 },
  { dx: -1, dy: 0, facing: 2 },
  { dx: 0, dy: 1, facing: 3 },
];
const tileKey = (x, y) => `${x},${y}`;

/** Invert the KYS 18-by-9 isometric projection from the tile (0, 0) origin. */
export function screenToTile(screenX, screenY, originX, originY, scale = 1) {
  if (!Number.isFinite(scale) || scale <= 0) throw new RangeError('Tile scale must be positive.');
  const difference = (screenX - originX) / (18 * scale);
  const sum = (screenY - originY) / (9 * scale);
  return { x: Math.floor((sum + difference) / 2 + 0.5), y: Math.floor((sum - difference) / 2 + 0.5) };
}

/** Return the steps after start to the nearest reachable target, or null. */
export function findTilePath(start, targets, canWalk, { maxVisited = 4096 } = {}) {
  if (!Number.isSafeInteger(maxVisited) || maxVisited < 1) throw new RangeError('maxVisited must be a positive integer.');
  const goals = new Set(targets.map(({ x, y }) => tileKey(x, y)));
  if (!goals.size) return null;
  const first = tileKey(start.x, start.y);
  if (goals.has(first)) return [];
  const queue = [{ x: start.x, y: start.y, parent: null }];
  const visited = new Set([first]);

  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    for (const { dx, dy, facing } of directions) {
      const x = current.x + dx;
      const y = current.y + dy;
      const key = tileKey(x, y);
      if (visited.has(key) || !canWalk(x, y)) continue;
      if (visited.size >= maxVisited) return null;
      visited.add(key);
      const next = { x, y, facing, parent: current };
      if (goals.has(key)) {
        const path = [];
        for (let tile = next; tile.parent; tile = tile.parent) path.push({ x: tile.x, y: tile.y, facing: tile.facing });
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return null;
}
