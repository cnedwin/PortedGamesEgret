// An explicit group of player orders, not another AI or movement scheduler.
// Confirm together; units still move, collide, repath and fight by the original rules.
import { UNITS } from '../data/battle.mjs';
import { command, combatPreview, distance, previewBattleOrder } from './battle.mjs';

export const MAX_BATTLE_PLAN_ORDERS = 8;

function detachedBattle(battle) {
  const units = battle.units.map(unit => ({ ...unit, path: unit.path.slice() }));
  for (const unit of units) unit.target = unit.target ? units[unit.target.id] : null;
  return { ...battle, units };
}

function emptyPlan(reason) {
  return { valid: false, reason, orders: [], conflicts: [] };
}

function orderPreview(battle, side, order) {
  const row = {
    unit: order?.unit ?? null, kind: order?.kind ?? null,
    valid: false, reason: null, path: [], destination: null
  };
  if (!order || !Number.isInteger(order.unit)) return { ...row, reason: 'invalidOrder' };
  const unit = battle.units[order.unit];
  if (!unit || unit.gone || unit.routed || unit.troops <= 0 || unit.pos < 0) return { ...row, reason: 'unitUnavailable' };
  if (unit.side !== side) return { ...row, reason: 'notOwned' };
  if (!['move', 'attack'].includes(order.kind)) return { ...row, reason: 'unsupportedOrder' };
  const arg = Object.hasOwn(order, 'arg') ? order.arg : order.kind === 'move' ? order.hex : order.target;
  const preview = previewBattleOrder(battle, unit.id, order.kind, arg);
  if (!preview) return { ...row, reason: order.kind === 'attack' ? 'invalidTarget' : 'invalidDestination' };
  return {
    ...row, ...preview, arg, path: preview.path.slice(),
    reason: preview.valid ? null : 'unreachable',
    destination: preview.path.at(-1) ?? unit.pos
  };
}

/** Pure, detached preview. The caller owns the UI's fight/deployment phase. */
export function previewBattleCommandPlan(battle, side, orders) {
  if (!battle || battle.setup?.kind !== 'field' || battle.setup.special) return emptyPlan('unsupportedBattle');
  if (battle.over) return emptyPlan('battleOver');
  if (side !== 0 && side !== 1) return emptyPlan('invalidSide');
  if (!Array.isArray(orders) || !orders.length) return emptyPlan('emptyPlan');
  if (orders.length > MAX_BATTLE_PLAN_ORDERS) return emptyPlan('tooManyOrders');
  const rows = orders.map(order => orderPreview(battle, side, order));
  const conflicts = [];
  const byUnit = new Map();
  for (const row of rows) {
    if (!byUnit.has(row.unit)) byUnit.set(row.unit, []);
    byUnit.get(row.unit).push(row);
  }
  for (const [unit, matches] of byUnit) {
    if (matches.length < 2) continue;
    conflicts.push({ kind: 'duplicateUnit', units: [unit] });
    for (const row of matches) { row.valid = false; row.reason = 'duplicateUnit'; }
  }

  const destinations = new Map();
  for (const row of rows) {
    // An attack's approach hex follows a moving enemy; it is never a reservation.
    if (!row.valid || row.kind !== 'move') continue;
    const occupant = battle.units.find(unit => !unit.gone && unit.troops > 0 && unit.id !== row.unit && unit.pos === row.destination);
    if (occupant) {
      row.valid = false;
      row.reason = 'occupiedDestination';
      conflicts.push({ kind: row.reason, hex: row.destination, units: [row.unit, occupant.id] });
      continue;
    }
    if (!destinations.has(row.destination)) destinations.set(row.destination, []);
    destinations.get(row.destination).push(row);
  }
  for (const [hex, matches] of destinations) {
    if (matches.length < 2) continue;
    conflicts.push({ kind: 'destinationConflict', hex, units: matches.map(row => row.unit) });
    for (const row of matches) { row.valid = false; row.reason = 'destinationConflict'; }
  }

  // Explain each attack at its own projected approach, alongside explicit moves.
  // Other attacks are not projected into the same hex or counted as certain flankers.
  // This forecasts current stats, never promised arrival time, damage or charge.
  const projected = detachedBattle(battle);
  for (const row of rows) if (row.valid && row.kind === 'move') projected.units[row.unit].pos = row.destination;
  for (const row of rows) {
    if (!row.valid || row.kind !== 'attack') continue;
    const unit = projected.units[row.unit], target = projected.units[row.target];
    const originalPosition = unit.pos;
    unit.pos = row.destination;
    const combat = combatPreview(projected, unit, target);
    row.combat = combat ? {
      ...combat, projected: true,
      inReach: distance(unit.pos, target.pos) <= UNITS[unit.kind].range,
      fromHex: unit.pos, targetHex: target.pos
    } : null;
    unit.pos = originalPosition;
  }
  return { valid: rows.every(row => row.valid), reason: rows.find(row => !row.valid)?.reason ?? null, orders: rows, conflicts };
}

/**
 * Revalidate now, stage every real command on detached units, then commit only
 * command fields. Existing unit identities, RNG, battle time and stats survive.
 */
export function commitBattleCommandPlan(battle, side, orders) {
  const plan = previewBattleCommandPlan(battle, side, orders);
  if (!plan.valid) return { ok: false, reason: plan.reason, plan, actions: [] };
  const staged = detachedBattle(battle);
  staged.random = () => { throw new Error('Command plans must not consume battle RNG'); };
  const actions = plan.orders.map(row => ({
    unit: row.unit, what: row.kind, arg: row.arg
  }));
  try {
    for (const action of actions) {
      if (!command(staged, action.unit, action.what, action.arg)) {
        return { ok: false, reason: 'commandRejected', plan, actions: [] };
      }
    }
  } catch {
    return { ok: false, reason: 'commandRejected', plan, actions: [] };
  }
  for (const action of actions) {
    const source = staged.units[action.unit], destination = battle.units[action.unit];
    destination.order = source.order;
    destination.goal = source.goal;
    destination.target = source.target ? battle.units[source.target.id] : null;
    destination.atGate = source.atGate;
    destination.path = source.path.slice();
  }
  return { ok: true, reason: null, plan, actions };
}
