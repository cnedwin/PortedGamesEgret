import { UNITS } from './units.mjs';

export const sightTile = (game, x, y) => y * game.w + x;

/** The board is known. Troops and ownership are reported only within friendly sight. */
export function battleSight(game, owner) {
  const visible = new Set();
  const reveal = (x, y, radius) => {
    for (let dy = -radius; dy <= radius; dy++) {
      const sy = y + dy;
      if (sy < 0 || sy >= game.h) continue;
      const row = radius - Math.abs(dy);
      for (let sx = Math.max(0, x - row); sx <= Math.min(game.w - 1, x + row); sx++) {
        visible.add(sightTile(game, sx, sy));
      }
    }
  };
  for (const unit of game.units) if (unit.owner === owner) reveal(unit.x, unit.y, UNITS[unit.type].sight);
  for (const building of game.buildings) {
    if (building.owner === owner) reveal(building.x, building.y, building.kind === 'hq' || building.kind === 'tower' ? 3 : 2);
  }
  return visible;
}

export function knownBattle(game, owner, visible) {
  if (!visible) return game;
  return {
    ...game,
    units: game.units.filter((unit) => unit.owner === owner || visible.has(sightTile(game, unit.x, unit.y))),
    buildings: game.buildings.map((building) => building.owner === owner || visible.has(sightTile(game, building.x, building.y))
      ? building
      : { ...building, owner: -1, hp: 100 })
  };
}
