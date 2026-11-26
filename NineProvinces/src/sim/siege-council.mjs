// Read models for the first campaign council. No march, RNG, calendar, or save
// mutation here: the existing military system remains the authority.
import { ADJACENT } from '../data/map.mjs';
import { generalEffect, techEffect } from './core.mjs';

export const COUNCIL_NODE = 'nanpi';

export function councilSnapshot(state, setup) {
  if (!setup || setup.kind !== 'siege' || setup.special || setup.place?.node !== COUNCIL_NODE || setup.factions?.[0] !== state.player) return null;
  return state.inbox.find(message => message.kind === 'battle' && message.setup?.id === setup.id)?.setup ?? null;
}

export function councilArmy(state, army) {
  const supply = (army.commander ? generalEffect(state, army.commander, 'supply') : 0) + techEffect(state, army.faction, 'supply');
  const dailyGrain = (army.troops / 400) * (1 - supply / 100);
  const origin = state.nodes[army.home] ? army.home : null;
  return {
    armyId: army.id, commander: army.commander, unit: army.unit,
    troops: army.troops, grain: army.grain,
    grainDays: dailyGrain > 0 ? Math.max(0, Math.floor(army.grain / dailyGrain)) : null,
    at: army.at, origin,
    originGarrison: origin ? state.nodes[origin].troops : null,
    originOwner: origin ? state.nodes[origin].owner : null
  };
}

export function arrivedArmies(state, faction, nodeId = COUNCIL_NODE) {
  return Object.values(state.armies).filter(army =>
    army.faction === faction && !army.link && army.at === nodeId && army.besieging === nodeId && army.troops >= 100);
}

/** Each road consumes a whole number of days: actual marching discards excess speed at a stop. */
export function supportArrival(state, army, faction, services, nodeId = COUNCIL_NODE) {
  const fail = reason => ({ reachable: false, arrived: false, etaDays: null, arrivalDay: null, reason });
  if (!army || army.troops < 100 || !army.commander) return fail('supportGone');
  if (army.faction !== faction) return fail('supportChanged');
  if (army.inBattle) return fail('supportInBattle');
  if ((army.next ?? army.target) !== nodeId) return fail('supportRedirected');
  if (!army.link && army.at === nodeId && army.besieging === nodeId) {
    return { reachable: true, arrived: true, etaDays: 0, arrivalDay: state.day, reason: null };
  }
  let from = army.at;
  let remaining = army.path?.slice() ?? [];
  let days = 0;
  if (army.link) {
    const link = army.link;
    const speed = services.speedOf(state, army, link.kind);
    if (!state.nodes[link.to] || !Number.isFinite(link.length) || !Number.isFinite(link.done) || !(speed > 0)) {
      return fail('supportBlocked');
    }
    days = Math.max(1, Math.ceil(Math.max(0, link.length - link.done) / speed));
    from = link.to;
    if (remaining[0] === from) remaining.shift();
    if (army.next) {
      const route = from === nodeId ? { path: [] } : services.route(state, army, from, nodeId);
      if (!route) return fail('supportBlocked');
      remaining = route.path;
    }
  }
  if (!from || !state.nodes[from] || (from !== nodeId && remaining.at(-1) !== nodeId)) return fail('supportBlocked');
  for (const to of remaining) {
    const needsPassage = from !== nodeId && from !== army.at;
    const owner = state.nodes[from].owner;
    if (needsPassage && owner !== faction && !services.allied(state, faction, owner)) return fail('supportBlocked');
    const road = ADJACENT[from]?.find(edge => edge.to === to)?.link;
    if (!road || !state.nodes[to]) return fail('supportBlocked');
    const speed = services.speedOf(state, army, road.kind);
    if (!(speed > 0)) return fail('supportBlocked');
    days += Math.max(1, Math.ceil(road.length / speed));
    from = to;
  }
  if (from !== nodeId || days === 0) return fail('supportBlocked');
  return { reachable: true, arrived: false, etaDays: days, arrivalDay: state.day + days, reason: null };
}

export function incomingArmies(state, faction, services, nodeId = COUNCIL_NODE) {
  return Object.values(state.armies)
    .filter(army => army.faction === faction && (army.next ?? army.target) === nodeId &&
      !(army.at === nodeId && !army.link && army.besieging === nodeId))
    .map(army => ({
      ...councilArmy(state, army),
      from: army.link?.from ?? army.at,
      to: army.link?.to ?? army.path?.[0] ?? nodeId,
      ...supportArrival(state, army, faction, services, nodeId)
    }))
    .sort((a, b) => (a.etaDays ?? Infinity) - (b.etaDays ?? Infinity) || a.armyId.localeCompare(b.armyId));
}

export function siegeWaitModel(state, services, nodeId = COUNCIL_NODE) {
  const plan = state.siegeCouncilWaits?.[nodeId];
  if (!plan || !Array.isArray(plan.armyIds)) return null;
  const rows = plan.armyIds.map(id => {
    const army = state.armies[id];
    const identity = army ? councilArmy(state, army) : { armyId: id, commander: null, unit: null };
    return { ...identity, ...supportArrival(state, army, plan.faction, services, nodeId) };
  });
  return {
    ...plan,
    armyIds: plan.armyIds.slice(),
    attackerIds: plan.attackerIds?.slice() ?? [],
    arrived: rows.filter(row => row.arrived),
    incoming: rows.filter(row => !row.arrived),
    etaDays: rows.every(row => row.reachable) ? Math.max(0, ...rows.map(row => row.etaDays)) : null,
    reason: rows.find(row => !row.reachable)?.reason ?? null
  };
}
