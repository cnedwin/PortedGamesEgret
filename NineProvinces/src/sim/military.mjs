// 兵事：出征编军、寻路、每日行军、路上遭遇、到城下攻城或围城、战斗的摆阵与结算、得城失城、撤退与回城。
// 战斗本身在 battle.mjs；玩家亲自指挥的战斗放进 inbox，由界面打完后交回 `finishBattle`。
// War: mustering armies, finding the way, the day's march, meeting the enemy on the road, assaulting or besieging a
// city, setting out a battle and settling it, taking and losing places, retreating and going home. The battle itself is
// in battle.mjs; a battle the player commands goes into the inbox and the view hands its result back to `finishBattle`.
import { UNITS } from '../data/battle.mjs';
import { GENERALS } from '../data/generals.mjs';
import { ADJACENT, NODES } from '../data/map.mjs';
import { autoBattle } from './battle.mjs';
import { clamp, generalEffect, note, random, serving, stat, techEffect } from './core.mjs';
import { capture, die } from './people.mjs';
import { hexAt } from './hexgrid.mjs';
import { FOOTPRINTS } from './land.mjs';
import { along, routeLine } from './ways.mjs';

export function activeTreaty(state, a, b) {
  const treaty = state.factions[a]?.treaties[b];
  return treaty?.until > state.day ? treaty : null;
}

/** Whether two factions fight: anyone not allied or at truce; the unowned are everyone's enemy. */
export function hostile(state, a, b) {
  if (a === b) return false;
  return !activeTreaty(state, a, b);
}
export const allied = (state, a, b) => a !== b && activeTreaty(state, a, b)?.kind === 'ally';

/** Kilometres-a-day of an army, as map units a day, on a kind of link. */
export function speedOf(state, army, kind) {
  const u = UNITS[army.unit];
  let base = { inf: 26, bow: 26, cav: 38, siege: 16, navy: 18 }[u.group];
  if (u.group === 'navy') base = kind === 'land' ? 14 : 44;
  else if (kind === 'river') base *= 0.85;
  else if (kind === 'sea') base = 30;
  const bonus = (army.commander ? generalEffect(state, army.commander, 'march') : 0) + techEffect(state, army.faction, 'march');
  return base * (1 + bonus / 100);
}

/** Whether an army may pass through a place on its way (not stop there). */
function passable(state, factionId, nodeId) {
  const owner = state.nodes[nodeId].owner;
  return owner === factionId || allied(state, factionId, owner);
}

/** The quickest way for an army from a place to another: a list of places after the first, or null. */
export function route(state, army, from, to) {
  const dist = { [from]: 0 },
    prev = {},
    open = new Set([from]);
  while (open.size) {
    let here = null,
      best = Infinity;
    for (const n of open)
      if (dist[n] < best) {
        best = dist[n];
        here = n;
      }
    open.delete(here);
    if (here === to) break;
    if (here !== from && !passable(state, army.faction, here)) continue;
    for (const { to: next, link } of ADJACENT[here]) {
      if (link.kind === 'sea' && !(NODES[here].kind === 'port' || NODES[here].traits.includes('c')) && !(NODES[next].kind === 'port' || NODES[next].traits.includes('c'))) continue;
      const d = dist[here] + link.length / speedOf(state, army, link.kind);
      if (d < (dist[next] ?? Infinity)) {
        dist[next] = d;
        prev[next] = here;
        open.add(next);
      }
    }
  }
  if (dist[to] === undefined) return null;
  const path = [];
  for (let n = to; n !== from; n = prev[n]) path.unshift(n);
  return { path, days: Math.ceil(dist[to]) };
}

/** Most soldiers one general leads. */
export function troopCap(state, id) {
  return Math.round((3000 + stat(state, id, 'lead') * 120) * (1 + generalEffect(state, id, 'troops') / 100));
}

/** Gather an army at a place from its garrison and the generals there. */
export function muster(state, factionId, nodeId, { commander, deputies = [], troops, unit = 'spear', formation = 'fishscale', target = null, attack = false }) {
  const node = state.nodes[nodeId],
    f = state.factions[factionId];
  if (node.owner !== factionId) return { why: 'notOurs' };
  if (attack) {
    if (!state.nodes[target]) return { why: 'noWay' };
    if (!hostile(state, factionId, state.nodes[target].owner)) return { why: 'protectedTarget' };
  }
  const here = serving(state, factionId, nodeId);
  const team = [commander, ...deputies].filter(Boolean);
  if (!team.length || !team.every((id) => here.includes(id) && !(state.generals[id].busyUntil > state.day))) return { why: 'generals' };
  const u = UNITS[unit];
  if (!u || !unitAllowed(state, factionId, team, unit)) return { why: 'unit' };
  if (u.group === 'navy' && !(NODES[nodeId].traits.includes('r') || NODES[nodeId].traits.includes('c') || NODES[nodeId].kind === 'port')) return { why: 'water' };
  const most = troopCap(state, commander) + deputies.reduce((s, d) => s + troopCap(state, d) * 0.25, 0);
  const n = Math.min(troops, node.troops, Math.round(most));
  if (n < 500) return { why: 'troops' };
  // Kinds beyond spears cost to equip; the army carries sixty days of grain.
  const coin = Math.round(((u.cost.coin - 100) * n) / 1000);
  const grain = Math.round((n / 400) * 60);
  if (f.coin < coin) return { why: 'coin' };
  if (f.grain < grain * 0.5) return { why: 'grain' };
  f.coin -= coin;
  const carried = Math.min(grain, f.grain);
  f.grain -= carried;
  node.troops -= n;
  const army = {
    id: 'a' + state.nextId++,
    faction: factionId,
    commander,
    deputies: deputies.slice(0, 2),
    troops: n,
    unit,
    formation,
    morale: 70 + Math.round(node.training / 5),
    training: node.training,
    grain: carried,
    at: nodeId,
    link: null,
    path: [],
    home: nodeId,
    target: null,
    besieging: null
  };
  state.armies[army.id] = army;
  for (const id of team) {
    state.generals[id].at = army.id;
    if (node.governor === id) node.governor = null;
  }
  if (target) order(state, army.id, target);
  return { ok: true, army: army.id };
}

/** Whether a faction may raise a kind of troops under these generals. */
export function unitAllowed(state, factionId, team, unit) {
  const need = UNITS[unit].need;
  if (!need) return true;
  // Some troops are granted by the story (the Qingzhou Corps).
  if (state.flags[unit] === factionId) return true;
  if (need.kind === 'tech') return state.factions[factionId].techs.includes(need.id);
  if (need.kind === 'faction') return factionId === need.id || GENERALS[state.factions[factionId].ruler].camp === 'W';
  return team.some((id) => GENERALS[id].traits.includes(need.id));
}

/** Send an army to a place: it marches there, and attacks it if it is hostile. */
export function order(state, armyId, to) {
  const a = state.armies[armyId];
  if (!a || a.link) {
    if (a?.link) a.next = to;
    return a ? { ok: true, later: true } : { why: 'gone' };
  }
  if (a.at === to) return { why: 'here' };
  const r = route(state, a, a.at, to);
  if (!r) return { why: 'noWay' };
  a.besieging = null;
  a.path = r.path;
  a.target = to;
  return { ok: true, days: r.days };
}

/** Put an army back into a place's garrison. */
export function disband(state, armyId) {
  const a = state.armies[armyId];
  if (!a || a.link || state.nodes[a.at]?.owner !== a.faction) return { why: 'cannot' };
  const node = state.nodes[a.at];
  node.training = Math.round((node.training * node.troops + a.training * a.troops) / Math.max(1, node.troops + a.troops));
  node.troops += a.troops;
  state.factions[a.faction].grain += a.grain;
  for (const id of [a.commander, ...a.deputies]) if (id) state.generals[id].at = a.at;
  delete state.armies[armyId];
  return { ok: true };
}

/** The day's march of every army: moving, eating, meeting enemies and reaching places. */
export function marchArmies(state) {
  for (const a of Object.values(state.armies)) {
    if (!state.armies[a.id]) continue;
    // Eating: a day's grain for every four hundred; without it, morale and men drain away.
    const eat = (a.troops / 400) * (1 - ((a.commander ? generalEffect(state, a.commander, 'supply') : 0) + techEffect(state, a.faction, 'supply')) / 100);
    a.grain -= eat;
    if (a.grain < 0) {
      a.grain = 0;
      a.morale = Math.max(0, a.morale - 4);
      a.troops = Math.floor(a.troops * 0.985);
    }
    if (!a.commander || a.troops < 100) {
      dissolve(state, a);
      continue;
    }
    if (!a.link && state.nodes[a.at]) {
      // At a friendly place: take on grain and recover.
      if (state.nodes[a.at].owner === a.faction) {
        const f = state.factions[a.faction],
          want = (a.troops / 400) * 60 - a.grain;
        if (want > 0 && f.grain > 0) {
          const g = Math.min(want, f.grain);
          f.grain -= g;
          a.grain += g;
        }
        a.morale = Math.min(100, a.morale + 1);
      }
      if (a.besieging) {
        siegeDay(state, a);
        continue;
      }
      if (!a.path.length) continue;
      const next = a.path[0];
      const link = ADJACENT[a.at].find((l) => l.to === next).link;
      a.link = { from: a.at, to: next, kind: link.kind, length: link.length, done: 0 };
      a.at = null;
    }
    if (a.link) {
      a.link.done += speedOf(state, a, a.link.kind);
      if (meetOnTheRoad(state, a)) continue;
      if (a.link.done >= a.link.length) arrive(state, a);
    }
  }
}

function dissolve(state, a) {
  const home = Object.keys(state.nodes).find((n) => state.nodes[n].owner === a.faction);
  for (const id of [a.commander, ...a.deputies]) if (id && state.generals[id].status === 'serving') state.generals[id].at = home ?? null;
  delete state.armies[a.id];
}

/** Two hostile armies on one road, coming towards each other, fight where they meet. */
function meetOnTheRoad(state, a) {
  for (const b of Object.values(state.armies)) {
    if (b === a || !b.link || !hostile(state, a.faction, b.faction)) continue;
    const same = b.link.from === a.link.to && b.link.to === a.link.from;
    if (!same || a.link.done + b.link.done < a.link.length) continue;
    battle(state, { kind: a.link.kind === 'land' ? 'field' : 'naval', place: { link: [a.link.from, a.link.to] }, attackers: [a.id], defenders: [b.id] });
    return true;
  }
  return false;
}

/** An army reaches the end of a road. */
function arrive(state, a) {
  const at = a.link.to;
  const back = a.link.from;
  const atDestination = at === a.target && a.path.length === 1;
  a.link = null;
  a.at = at;
  a.path.shift();
  a.cameFrom = back;
  const node = state.nodes[at];
  if (a.next) {
    const n = a.next;
    a.next = null;
    order(state, a.id, n);
  }
  if (!hostile(state, a.faction, node.owner)) {
    if (!a.path.length) a.target = null;
    if (atDestination && a.faction === state.player && node.owner !== a.faction) {
      note(state, 'logTreatyArrival', { faction: a.faction, general: a.commander, place: at });
    }
    return;
  }
  // A hostile place: stop and take it, or fight for it.
  a.path = [];
  const guards = Object.values(state.armies).filter((b) => b.at === at && !b.link && b.faction === node.owner);
  if (node.troops <= 0 && !guards.length) return take(state, a, at);
  a.besieging = at;
  a.siegeDays = 0;
  // Storm at once only with clearly more men than the defence; otherwise sit down before the walls and wait for more.
  const defence = node.troops + guards.reduce((s, b) => s + b.troops, 0);
  if (a.troops > defence * 1.5 || NODES[at].kind === 'port') assault(state, a);
}

/** Each day of a siege: walls crumble a little, the garrison tires, and every ten days the besiegers attack. */
function siegeDay(state, a) {
  const node = state.nodes[a.besieging];
  if (!hostile(state, a.faction, node.owner)) {
    a.besieging = null;
    return;
  }
  a.siegeDays++;
  if (UNITS[a.unit].group === 'siege') node.wall = Math.max(0, node.wall - 0.2);
  node.training = Math.max(10, node.training - 0.3);
  // After ten days cut off, a garrison loses men to hunger and desertion, day by day.
  if (a.siegeDays > 10 && a.besieging) node.troops = Math.floor(node.troops * 0.994);
  if (a.morale < 25 || (a.grain <= 0 && a.siegeDays > 5)) return retreat(state, a);
  if (a.siegeDays % 10 !== 0) return;
  // The player is asked every ten days; the computer storms only when it has engines, has waited twenty days, or clearly
  // has the men — otherwise it sits and lets hunger work.
  if (a.faction !== state.player) {
    const besiegers = Object.values(state.armies).filter((b) => b.besieging === a.besieging && b.faction === a.faction);
    if (besiegers[0] !== a) return;
    const mine = besiegers.reduce((n, b) => n + b.troops, 0),
      guards = Object.values(state.armies).filter((b) => b.at === a.besieging && !b.link && b.faction === node.owner).reduce((n, b) => n + b.troops, 0);
    const engines = state.factions[a.faction].techs.includes('engines') || a.siegeDays >= 20;
    if (!engines && mine < (node.troops + guards) * 1.3) return;
  }
  assault(state, a);
}

function assault(state, a) {
  const at = a.besieging,
    node = state.nodes[at];
  const attackers = Object.values(state.armies).filter((b) => b.besieging === at && !hostile(state, b.faction, a.faction) && b.faction === a.faction).map((b) => b.id);
  const defenders = Object.values(state.armies)
    .filter((b) => b.at === at && !b.link && b.faction === node.owner)
    .map((b) => b.id);
  const walled = NODES[at].kind !== 'port' && node.wall > 5;
  battle(state, { kind: walled ? 'siege' : 'field', place: { node: at }, attackers, defenders, garrison: at });
}

/** Fall back to where the army came from (or the nearest friendly place). */
export function retreat(state, a) {
  a.besieging = null;
  const back = a.cameFrom && !hostile(state, a.faction, state.nodes[a.cameFrom].owner) ? a.cameFrom : nearestFriendly(state, a.faction, a.at);
  if (!back) return dissolve(state, a);
  const r = route(state, a, a.at, back);
  if (!r) return dissolve(state, a);
  a.path = r.path;
  a.target = back;
}

export function nearestFriendly(state, factionId, from) {
  const seen = new Set([from]),
    queue = [from];
  while (queue.length) {
    const here = queue.shift();
    if (here !== from && state.nodes[here].owner === factionId) return here;
    for (const { to } of ADJACENT[here])
      if (!seen.has(to)) {
        seen.add(to);
        queue.push(to);
      }
  }
  return null;
}

/** A place changes hands: the army goes in, the old lord's generals there flee or are taken. */
function take(state, a, at) {
  const node = state.nodes[at],
    old = node.owner;
  for (const id of serving(state, old ?? '__', at)) {
    const flee = nearestFriendly(state, old, at);
    if (flee && random(state) < 0.6 + stat(state, id, 'war') / 300) state.generals[id].at = flee;
    else capture(state, id, a.faction);
  }
  const tally = (state.tally ??= {});
  tally.taken = (tally.taken ?? 0) + 1;
  if (!old) tally.takenNeutral = (tally.takenNeutral ?? 0) + 1;
  node.owner = a.faction;
  node.governor = null;
  node.work = null;
  node.siege = null;
  // A quarter of the army stays behind as the new garrison.
  const stay = Math.min(a.troops - 200, Math.max(500, Math.round(a.troops * 0.25)));
  node.troops = Math.max(0, stay);
  a.troops -= node.troops;
  node.training = a.training;
  node.support = clamp(node.support - 15 + techEffect(state, a.faction, 'morale'), 0, 100);
  node.order = clamp(node.order - 20, 0, 100);
  node.people = Math.round(node.people * 0.96);
  a.besieging = null;
  a.target = null;
  if (a.faction === state.player) state.stats.citiesTaken++;
  if (a.faction === state.player || old === state.player) note(state, 'logTaken', { place: at, faction: a.faction, from: old });
  state.factions[a.faction].fame += NODES[at].kind === 'city' ? 6 + NODES[at].size * 2 : 2;
  if (old) {
    const f = state.factions[old];
    if (f.capital === at) {
      const next = Object.keys(state.nodes).find((n) => state.nodes[n].owner === old && NODES[n].kind === 'city') ?? Object.keys(state.nodes).find((n) => state.nodes[n].owner === old);
      if (next) f.capital = next;
    }
    fallCheck(state, old);
  }
  // The commander takes charge of the place until another is appointed.
  state.generals[a.commander].at = a.id;
}

function fallCheck(state, factionId) {
  const f = state.factions[factionId];
  if (!f?.alive) return;
  if (Object.values(state.nodes).some((n) => n.owner === factionId)) return;
  // No place left: the remaining armies scatter, and the faction ends.
  for (const b of Object.values(state.armies)) if (b.faction === factionId) dissolve(state, b);
  f.alive = false;
  for (const id of serving(state, factionId)) Object.assign(state.generals[id], { status: 'free', faction: null, loyalty: 0, at: GENERALS[id].home, known: false });
  note(state, 'logFall', { faction: factionId });
  if (factionId === state.player) state.over = { kind: 'fallen', day: state.day };
}

/** What a special battle changes beyond itself: grain burnt at Wuchao, a fleet lost at the Red Cliffs. */
function aftermath(state, setup, won) {
  const winner = setup.factions[won],
    loser = setup.factions[1 - won];
  if (!winner || !loser) return;
  const lose = state.factions[loser];
  if (setup.special === 'wuchao' && won === 0) {
    lose.grain = Math.floor(lose.grain * 0.4);
    for (const a of Object.values(state.armies)) if (a.faction === loser) (a.troops = Math.floor(a.troops * 0.75)), (a.morale = Math.max(10, a.morale - 30)), (a.grain = 0);
  }
  if (setup.special === 'chibi') {
    for (const a of Object.values(state.armies)) if (a.faction === loser) (a.troops = Math.floor(a.troops * 0.6)), (a.morale = Math.max(10, a.morale - 30));
    for (const id in state.nodes) if (state.nodes[id].owner === loser && NODES[id].prov === 'jing') state.nodes[id].troops = Math.floor(state.nodes[id].troops * 0.6);
  }
  state.factions[winner].fame += 80;
  note(state, 'logSpecial', { special: setup.special, winner, loser });
}

/** The units a side brings: each army is one unit; a garrison is split among the generals there. */
function sideUnits(state, armyIds, garrisonAt, side) {
  const units = [];
  for (const id of armyIds) {
    const a = state.armies[id];
    units.push({ side, army: id, faction: a.faction, general: a.commander, deputies: a.deputies, troops: a.troops, unit: a.unit, formation: a.formation, morale: a.morale, training: a.training });
  }
  if (garrisonAt) {
    const node = state.nodes[garrisonAt];
    let left = node.troops;
    const officers = serving(state, node.owner ?? '__', garrisonAt).sort((x, y) => stat(state, y, 'lead') - stat(state, x, 'lead'));
    for (const g of officers.slice(0, 5)) {
      if (left < 300) break;
      const n = Math.min(left, troopCap(state, g));
      units.push({ side, garrison: garrisonAt, faction: node.owner, general: g, deputies: [], troops: n, unit: bestDefender(state, node.owner, g), formation: 'square', morale: 60 + node.training / 4, training: node.training });
      left -= n;
    }
    // Soldiers with no general to lead them fight under their own captains.
    while (left >= 300 && units.filter((u) => u.garrison).length < 6) {
      const n = Math.min(left, 5000);
      units.push({ side, garrison: garrisonAt, faction: node.owner, general: null, deputies: [], troops: n, unit: 'spear', formation: 'square', morale: 55, training: node.training });
      left -= n;
    }
  }
  return units;
}

function bestDefender(state, factionId, general) {
  if (!factionId) return 'spear';
  for (const u of ['repeater', 'crossbow']) if (unitAllowed(state, factionId, [general], u)) return u;
  return stat(state, general, 'int') > stat(state, general, 'war') ? 'archer' : 'spear';
}

/**
 * Where on the realm a battle is fought: the twenty-two by fourteen hexes laid over the place, the walls toward the far
 * end and the attackers' end toward where they came from; or over the point of the road where two armies meet. `axis`
 * is the attackers' way in, as a unit vector in map units.
 */
export function fieldOf(state, place, attackers) {
  const lead = state.armies[attackers[0]];
  let cx, cz, ax, az;
  if (place.node) {
    const f = FOOTPRINTS[place.node];
    const from = NODES[lead?.cameFrom] ?? NODES[lead?.home];
    ax = from && from.id !== place.node ? f.x - from.x : 0.5;
    az = from && from.id !== place.node ? f.z - from.y : -0.85;
    const l = Math.hypot(ax, az) || 1;
    ax /= l;
    az /= l;
    // Shift the field toward the attackers so the walls stand at its far end.
    const shift = 11 * Math.abs(ax) + 7 * Math.abs(az);
    cx = f.x - ax * shift;
    cz = f.z - az * shift;
  } else {
    const [a, b] = place.link;
    const link = lead?.link;
    const p = along(routeLine(a, b), link ? link.done / link.length : 0.5);
    cx = p.x;
    cz = p.z;
    ax = NODES[b].x - NODES[a].x;
    az = NODES[b].y - NODES[a].y;
    const l = Math.hypot(ax, az) || 1;
    ax /= l;
    az /= l;
  }
  const [cc, rc] = hexAt(cx, cz);
  let c0 = cc - 11,
    r0 = rc - 7;
  // The whole of the walls must lie on the field, a hex in from its edges.
  if (place.node) {
    const f = FOOTPRINTS[place.node];
    c0 = Math.max(f.kc - (21 - f.a - 2), Math.min(f.kc - f.a - 2, c0));
    r0 = Math.max(f.kr - (13 - f.b - 1), Math.min(f.kr - f.b - 1, r0));
  }
  if (r0 & 1) r0 -= 1;
  return { grid: { c0, r0 }, axis: [ax, az] };
}

function involvesPlayer(state, attackers, defenders, garrison) {
  const sides = [...attackers, ...defenders].map((id) => state.armies[id]?.faction);
  if (garrison) sides.push(state.nodes[garrison].owner);
  return sides.includes(state.player);
}

/** Set out a battle. The player's own go to the inbox to be commanded or entrusted; the rest are fought at once. */
export function battle(state, { kind, place, attackers, defenders, garrison = null, special = null }) {
  const nodeId = place.node ?? null;
  const setup = {
    id: 'b' + state.nextId++,
    kind,
    place,
    special,
    seed: Math.floor(random(state) * 2 ** 31),
    wall: nodeId ? state.nodes[nodeId].wall : 0,
    terrain: terrainOf(place),
    // The player's battles are fought on the realm's own ground, where he can watch them; the computer's among
    // themselves, decided at once and out of sight, on ground made from the place's lie of the land.
    ...(involvesPlayer(state, attackers, defenders, garrison) ? fieldOf(state, place, attackers) : {}),
    units: [...sideUnits(state, attackers, null, 0), ...sideUnits(state, defenders, garrison, 1)],
    factions: [state.armies[attackers[0]]?.faction ?? null, garrison ? state.nodes[garrison].owner : state.armies[defenders[0]]?.faction ?? null]
  };
  // Besiegers bring rams if they know siege engines, or build crude ones after twenty days before the walls.
  if (kind === 'siege') {
    const lead = state.armies[attackers[0]];
    const engines = state.factions[lead.faction].techs.includes('engines') || (lead.siegeDays ?? 0) >= 20;
    const big = setup.units.filter((u) => u.side === 0 && u.army).sort((x, y) => y.troops - x.troops)[0];
    if (engines && big && big.troops > 4000 && !setup.units.some((u) => u.side === 0 && UNITS[u.unit].special === 'gate')) {
      const n = Math.max(1500, Math.round(big.troops * 0.15));
      big.troops -= n;
      setup.units.push({ side: 0, army: big.army, part: true, faction: big.faction, general: big.deputies[0] ?? null, deputies: [], troops: n, unit: 'ram', formation: 'square', morale: big.morale, training: big.training });
    }
  }
  if (!setup.units.some((u) => u.side === 1)) {
    // Nobody to defend: the place falls.
    if (nodeId) take(state, state.armies[attackers[0]], nodeId);
    return null;
  }
  for (const id of [...attackers, ...defenders]) if (state.armies[id]) state.armies[id].inBattle = setup.id;
  const mine = setup.factions.includes(state.player);
  if (mine && state.options.command) {
    state.inbox.push({ kind: 'battle', blocks: true, setup });
    return setup;
  }
  finishBattle(state, setup, autoBattle(setup, state));
  return setup;
}

/** The ground of a battle, from its place: plain, hills, mountains, river, coast, walls. */
function terrainOf(place) {
  const ids = place.node ? [place.node] : place.link;
  const t = ids.map((id) => NODES[id].traits).join('');
  const kind = ids.map((id) => NODES[id].kind);
  return {
    hills: /m/.test(t) || kind.includes('pass') ? 0.45 : 0.12,
    woods: /m/.test(t) ? 0.2 : 0.1,
    water: place.link ? 0 : /[rc]/.test(t) ? 0.15 : 0.04,
    marsh: /r/.test(t) ? 0.05 : 0,
    pass: kind.includes('pass'),
    steppe: /b/.test(t)
  };
}

/** Apply a battle's result to the realm: losses, the fate of generals, and who holds the place. */
export function finishBattle(state, setup, result) {
  state.inbox = state.inbox.filter((m) => m.setup?.id !== setup.id);
  const won = result.winner; // 0 attackers, 1 defenders
  const winners = setup.factions[won];
  for (const u of setup.units) {
    const r = result.units[setup.units.indexOf(u)];
    const loss = u.troops - r.troops;
    // A share of the fallen are only wounded and come back to the winner.
    const back = Math.round(loss * (u.side === won ? 0.3 + (u.general ? generalEffect(state, u.general, 'heal') / 200 : 0) : 0.08));
    const left = Math.max(0, r.troops + back);
    if (u.army && state.armies[u.army]) {
      const a = state.armies[u.army];
      // A ram detached from an army returns to it after the battle.
      a.troops = u.part ? a.troops + left : left;
      a.morale = clamp(r.morale ?? a.morale, 0, 100);
      a.inBattle = null;
      a.besieging = a.besieging && u.side === 0 && won === 0 ? a.besieging : u.side === 0 && won !== 0 ? null : a.besieging;
    }
    if (u.garrison) state.nodes[u.garrison].troops = Math.max(0, state.nodes[u.garrison].troops - (u.troops - left));
    // Generals of the losing side may fall or be taken.
    for (const g of [u.general, ...u.deputies].filter(Boolean)) {
      const fate = r.fates?.[g];
      if (fate === 'killed') die(state, g, 'battle');
      else if (fate === 'captured' && winners) capture(state, g, winners);
      else if (state.generals[g]) ((state.generals[g].service ??= {}).lead = (state.generals[g].service.lead ?? 0) + 1), (state.generals[g].service.war = (state.generals[g].service.war ?? 0) + 1);
    }
  }
  const winSide = setup.factions[won],
    loseSide = setup.factions[1 - won];
  // A tally of battles, for the balance tools.
  const tally = (state.tally ??= {});
  const key = setup.kind + (won === 0 ? 'Won' : 'Lost');
  tally[key] = (tally[key] ?? 0) + 1;
  const sum = (side) => setup.units.filter((u) => u.side === side).reduce((s, u) => s + u.troops, 0);
  tally.ratio = (tally.ratio ?? 0) + sum(0) / Math.max(1, sum(1));
  if (setup.special) aftermath(state, setup, won);
  if (winSide) state.factions[winSide].fame += 3;
  if (winSide === state.player) state.stats.battlesWon++;
  if (loseSide === state.player) state.stats.battlesLost++;
  if (setup.factions.includes(state.player)) note(state, won === setup.factions.indexOf(state.player) ? 'logBattleWon' : 'logBattleLost', { place: setup.place.node ?? setup.place.link[0], enemy: setup.factions[1 - setup.factions.indexOf(state.player)] });
  // Armies on the losing side fall back; an empty army is gone.
  for (const u of setup.units) {
    const a = u.army && state.armies[u.army];
    if (!a) continue;
    if (a.troops < 200 || !a.commander || state.generals[a.commander].status !== 'serving') {
      dissolve(state, a);
      continue;
    }
    if (u.side !== won) {
      if (a.link) {
        // Turn round on the road.
        const { from, to, length, done } = a.link;
        a.link = { from: to, to: from, kind: a.link.kind, length, done: Math.max(0, length - done) };
        a.path = [from];
        a.target = from;
      } else retreat(state, a);
      a.morale = Math.max(10, a.morale - 15);
    } else if (u.side === 0 && won === 0 && setup.place.node) {
      const node = state.nodes[setup.place.node];
      const guards = Object.values(state.armies).some((b) => b.at === setup.place.node && b.faction === node.owner);
      if (hostile(state, a.faction, node.owner) && (node.troops <= 50 || result.gateTaken) && !guards) take(state, a, setup.place.node);
    }
  }
}
