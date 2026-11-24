import { NODES } from '../data/map.mjs';

export const FERRY_HOLD_SECONDS = 18;
const APPROACH = 4;
const CONTEST = 2;

export function isFerryBattle(setup) {
  // The playable campaign draws the crossing from the world map footprint.
  return setup.kind === 'field' && !setup.special && Boolean(setup.grid) &&
    NODES[setup.place?.node]?.kind === 'port';
}

export function createFerryObjective(setup, keep) {
  return isFerryBattle(setup) && Number.isInteger(keep) ? { at: keep, engaged: false, secured: 0 } : null;
}

/** The defending side can drive off a real approach by securing the crossing. */
export function advanceFerryObjective(battle, dt, distance) {
  const objective = battle.ferry;
  if (!objective) return;
  const standing = unit => !unit.gone && !unit.routed && unit.troops > 0 && unit.pos >= 0;
  let danger = Infinity, garrison = false;
  for (const unit of battle.units) {
    if (!standing(unit)) continue;
    if (unit.side === 0) danger = Math.min(danger, distance(unit.pos, objective.at));
    else if (unit.pos === objective.at) garrison = true;
  }
  if (!objective.engaged && danger <= APPROACH) {
    objective.engaged = true;
    battle.events.push({ t: battle.time, kind: 'ferryEngaged', at: objective.at });
  }
  if (!objective.engaged) return;
  if (garrison && danger > CONTEST) objective.secured = Math.min(FERRY_HOLD_SECONDS, objective.secured + dt);
  else objective.secured = 0;
}
