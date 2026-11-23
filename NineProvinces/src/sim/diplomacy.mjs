// 外交：各势力之间的好感（-100 到 100）、同盟与停战（有期限）、赠礼、劝降、请求援军与联合进攻。电脑按好感、强弱、
// 共同的敌人和阵营决定答应与否；每月好感会慢慢回到常态，接壤的势力会互相猜忌。
// Diplomacy: the regard between powers (-100 to 100), alliances and truces (which run out), gifts, demands to submit,
// asking for help and attacking together. The computer answers by regard, strength, a shared enemy and camp; each
// month regard drifts back towards the ordinary, and neighbours grow wary of each other.
import { GENERALS } from '../data/generals.mjs';
import { ADJACENT, NODES } from '../data/map.mjs';
import { clamp, generalEffect, note, random, serving, stat, techEffect } from './core.mjs';
import { join } from './people.mjs';

const BASE = (a, b) => {
  if (a.camp === 'Y' || b.camp === 'Y') return a.camp === b.camp ? 30 : -50;
  if (a.camp === 'N' || b.camp === 'N') return a.camp === b.camp ? 20 : -20;
  return a.camp === b.camp ? 15 : 0;
};

export function startingRelations(state) {
  const list = Object.values(state.factions);
  for (const a of list) for (const b of list) if (a !== b) a.relations[b.id] = BASE(a, b);
  // The court and the rebels are at open war.
  for (const f of list) if (f.camp === 'Y') (state.factions.han.relations[f.id] = -100), (f.relations.han = -100);
}

export const regard = (state, a, b) => state.factions[a]?.relations[b] ?? 0;
function shift(state, a, b, by) {
  const fa = state.factions[a],
    fb = state.factions[b];
  fa.relations[b] = clamp((fa.relations[b] ?? 0) + by, -100, 100);
  fb.relations[a] = clamp((fb.relations[a] ?? 0) + by, -100, 100);
}

/** Whether two powers touch: one holds a place next to the other's. */
export function neighbours(state, a, b) {
  for (const id in state.nodes)
    if (state.nodes[id].owner === a) for (const { to } of ADJACENT[id]) if (state.nodes[to].owner === b) return true;
  return false;
}

function strength(state, f) {
  let s = 0;
  for (const id in state.nodes) if (state.nodes[id].owner === f) s += state.nodes[id].troops + (NODES[id].kind === 'city' ? 3000 : 0);
  for (const a of Object.values(state.armies)) if (a.faction === f) s += a.troops;
  return s;
}

/** How well an envoy speaks: the best charm and diplomacy among the sender's officers. */
function eloquence(state, f) {
  let best = 40;
  for (const id of serving(state, f)) best = Math.max(best, stat(state, id, 'cha') * 0.6 + stat(state, id, 'int') * 0.4 + generalEffect(state, id, 'diplo'));
  return best + techEffect(state, f, 'diplo');
}

/** Send a gift of coin: regard rises with the gift and the envoy. */
export function gift(state, from, to, coin) {
  const f = state.factions[from];
  if (f.coin < coin || coin < 100) return { why: 'coin' };
  f.coin -= coin;
  state.factions[to].coin += coin;
  const by = Math.round((coin / 120) * (eloquence(state, from) / 70));
  shift(state, from, to, Math.min(30, by));
  return { ok: true, by: Math.min(30, by) };
}

/** Propose a treaty ('ally' for two years or 'truce' for one): the other side answers at once. */
export function propose(state, from, to, kind) {
  const a = state.factions[from],
    b = state.factions[to];
  if (!b?.alive || from === to) return { why: 'cannot' };
  if (a.treaties[to]?.until > state.day && a.treaties[to].kind === kind) return { why: 'already' };
  const r = regard(state, to, from),
    weaker = strength(state, to) < strength(state, from) * 0.6;
  // A common enemy brings powers together.
  let common = 0;
  for (const c of Object.values(state.factions))
    if (c.alive && c.id !== from && c.id !== to && regard(state, from, c.id) < -30 && regard(state, to, c.id) < -30) common = 15;
  const words = (eloquence(state, from) - 60) / 4;
  const need = kind === 'ally' ? 45 : 5;
  const score = r + common + words + (weaker ? 12 : 0) + (kind === 'truce' && atWarLosing(state, to, from) ? 25 : 0);
  if (score < need + random(state) * 12) {
    shift(state, from, to, -2);
    return { ok: true, accepted: false };
  }
  const until = state.day + (kind === 'ally' ? 720 : 360);
  a.treaties[to] = { kind, until };
  b.treaties[from] = { kind, until };
  shift(state, from, to, kind === 'ally' ? 10 : 4);
  if (from === state.player || to === state.player) note(state, kind === 'ally' ? 'logAlly' : 'logTruce', { faction: from === state.player ? to : from });
  return { ok: true, accepted: true };
}

function atWarLosing(state, f, other) {
  return strength(state, f) < strength(state, other) * 0.7;
}

/** Break a treaty: regard falls everywhere, more with the one betrayed. */
export function breakTreaty(state, from, to) {
  const a = state.factions[from],
    b = state.factions[to];
  if (!(a.treaties[to]?.until > state.day)) return { why: 'none' };
  delete a.treaties[to];
  delete b.treaties[from];
  shift(state, from, to, -40);
  for (const c of Object.values(state.factions)) if (c.alive && c.id !== from && c.id !== to) c.relations[from] = clamp((c.relations[from] ?? 0) - 6, -100, 100);
  a.fame = Math.max(0, a.fame - 20);
  return { ok: true };
}

/** Demand that a weak power submit: it hands over its places and officers, or refuses. */
export function demandSurrender(state, from, to) {
  const b = state.factions[to];
  if (!b?.alive) return { why: 'cannot' };
  const ratio = strength(state, from) / Math.max(1, strength(state, to));
  const r = regard(state, to, from);
  const cities = Object.keys(state.nodes).filter((id) => state.nodes[id].owner === to && NODES[id].kind === 'city').length;
  const p = (ratio - 4) / 10 + r / 200 + (eloquence(state, from) - 60) / 200 - cities / 20;
  if (ratio < 3 || random(state) > p) {
    shift(state, from, to, -8);
    return { ok: true, accepted: false };
  }
  absorb(state, from, to);
  return { ok: true, accepted: true };
}

/** One power takes in another whole: its places, its soldiers and its officers. */
export function absorb(state, into, from) {
  for (const id in state.nodes) if (state.nodes[id].owner === from) state.nodes[id].owner = into;
  for (const a of Object.values(state.armies)) if (a.faction === from) a.faction = into;
  for (const id of serving(state, from)) {
    const s = state.generals[id];
    join(state, id, into, state.nodes[s.at] ? s.at : state.factions[into].capital);
  }
  const f = state.factions[from];
  state.factions[into].coin += f.coin;
  state.factions[into].grain += f.grain;
  f.alive = false;
  note(state, 'logSubmitted', { faction: from, to: into });
}

/** Ask an ally to march on a place: it sends an army if it can spare one. */
export function askAttack(state, from, ally, target) {
  if (state.factions[from].treaties[ally]?.kind !== 'ally') return { why: 'notAlly' };
  const f = state.factions[ally];
  f.ai.target = target;
  f.ai.cooldown = 0;
  f.ai.joint = { with: from, target, until: state.day + 120 };
  shift(state, from, ally, -3);
  return { ok: true };
}

/** Each month: treaties run out, regard drifts, neighbours grow wary, and the computer seeks friends. */
export function monthlyDiplomacy(state) {
  const list = Object.values(state.factions).filter((f) => f.alive);
  for (const a of list) {
    for (const id of Object.keys(a.treaties)) if (a.treaties[id].until <= state.day) delete a.treaties[id];
    for (const b of list) {
      if (a === b || a.id > b.id) continue;
      const base = BASE(a, b);
      let r = a.relations[b.id] ?? 0;
      r += (base - r) * 0.03;
      if (neighbours(state, a.id, b.id) && !a.treaties[b.id]) r -= 0.8;
      a.relations[b.id] = b.relations[a.id] = clamp(r, -100, 100);
    }
  }
  // A power holding a quarter of the land frightens the rest: they draw together against it.
  const total = Object.values(NODES).filter((n) => n.kind === 'city').length;
  for (const big of list) {
    if ((big.size ?? 0) < total * 0.4) continue;
    for (const o of list) if (o !== big && !o.treaties[big.id]) o.relations[big.id] = big.relations[o.id] = clamp((o.relations[big.id] ?? 0) - 4, -100, 100);
  }
  // The computer looks for an ally against its strongest neighbour, now and then.
  for (const a of list) {
    if (a.id === state.player || random(state) > 0.08) continue;
    const others = list.filter((b) => b !== a && b.id !== state.player && !a.treaties[b.id] && regard(state, a.id, b.id) > 30);
    if (others.length) propose(state, a.id, others[Math.floor(random(state) * others.length)].id, regard(state, a.id, others[0].id) > 55 ? 'ally' : 'truce');
  }
  // A great power calls on a small neighbour to submit, now and then (never the player, who is asked by no one).
  for (const a of list) {
    if (a.id === state.player || (a.size ?? 0) < 12 || random(state) > 0.06) continue;
    const small = list.filter((b) => b !== a && b.id !== state.player && b.id !== 'han' && (b.size ?? 0) <= 2 && neighbours(state, a.id, b.id) && !a.treaties[b.id]);
    if (small.length) demandSurrender(state, a.id, small[Math.floor(random(state) * small.length)].id);
  }
  // Now and then an envoy comes to the player.
  const me = state.factions[state.player];
  if (me?.alive && random(state) < 0.12) {
    const friends = list.filter((b) => b.id !== state.player && !me.treaties[b.id] && regard(state, b.id, state.player) > 35);
    if (friends.length) {
      const b = friends[Math.floor(random(state) * friends.length)];
      state.inbox.push({ kind: 'envoy', faction: b.id, offer: regard(state, b.id, state.player) > 60 ? 'ally' : 'truce', blocks: false });
    }
  }
}

/** Accept or turn away an envoy's offer. */
export function answerEnvoy(state, message, yes) {
  state.inbox = state.inbox.filter((m) => m !== message);
  if (!yes) {
    shift(state, state.player, message.faction, -4);
    return { ok: true };
  }
  const until = state.day + (message.offer === 'ally' ? 720 : 360);
  state.factions[state.player].treaties[message.faction] = { kind: message.offer, until };
  state.factions[message.faction].treaties[state.player] = { kind: message.offer, until };
  shift(state, state.player, message.faction, 8);
  note(state, message.offer === 'ally' ? 'logAlly' : 'logTruce', { faction: message.faction });
  return { ok: true };
}

export const camps = (state, f) => GENERALS[state.factions[f].ruler].camp;
