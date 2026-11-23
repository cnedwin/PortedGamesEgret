// 人：武将的登场与谢世、君主的继承、忠诚的起落、寻访与登用、招贤令、俘虏的处置、宝物的赏赐、武将的调动。
// People: generals coming of age and passing away, the succession of rulers, loyalty rising and falling, searching
// and persuading, the order for talent, what becomes of captives, gifts of treasure, and moving generals about.
import { GENERALS } from '../data/generals.mjs';
import { ADJACENT, NODES } from '../data/map.mjs';
import { TREASURES } from '../data/treasures.mjs';
import { chance, clamp, dateOf, generalEffect, note, random, reserved, serving, stat, surname, techEffect } from './core.mjs';

/** A stable month (1-12) for a general's coming of age or death, from his id. */
function monthFor(id, salt) {
  let h = salt;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 1 + (h % 12);
}

/** Each month: generals who come of age this month appear; those whose time has come die. */
// Deaths the tales of history tell themselves: in those tales the man lives on until his event has been played.
const TOLD = { hejin: ['history', 'eunuchs'], dingyuan: ['history', 'lvbuTurns'], dongzhuo: ['history', 'chain'], sunjian: ['sunjian', 's_xianshan'], sunce: ['sunjian', 's_sunce'], yuanshao: ['yuanshao', 'y_heir'] };
const toldLater = (state, id, year) => {
  const told = TOLD[id];
  return Boolean(told) && state.branch !== 'free' && (told[0] === 'history' || told[0] === state.branch) && !state.fired[told[1]] && year <= state.generals[id].died + 1;
};

export function comeOfAge(state) {
  const { year, month } = dateOf(state.day);
  for (const id in state.generals) {
    const s = state.generals[id],
      g = GENERALS[id];
    if (s.status === 'unborn' && g.born + 15 <= year && (g.born + 15 < year || monthFor(id, 7) <= month) && s.died >= year) debut(state, id);
    else if (s.status !== 'dead' && s.status !== 'unborn' && (s.died < year || (s.died === year && monthFor(id, 3) <= month)) && !toldLater(state, id, year)) die(state, id);
  }
}

function debut(state, id) {
  const s = state.generals[id],
    g = GENERALS[id];
  let faction = null;
  if (g.start?.house && state.factions[g.start.house]?.alive) faction = g.start.house;
  else if (g.start?.kin) {
    const kin = state.generals[g.start.kin];
    if (kin?.status === 'serving' && state.factions[kin.faction]?.alive) faction = kin.faction;
  }
  if (faction) {
    const f = state.factions[faction];
    Object.assign(s, { status: 'serving', faction, at: f.capital, loyalty: 75 + generalEffect(state, id, 'loyal') });
    if (faction === state.player) note(state, 'logDebutJoin', { general: id });
  } else {
    Object.assign(s, { status: 'free', faction: null, at: g.home, known: false });
  }
}

/** A general dies: his treasures go to his lord's treasury (or are lost), and a ruler is succeeded. */
export function die(state, id, how = 'age') {
  const s = state.generals[id];
  const was = s.status,
    faction = s.faction;
  if (was === 'dead') return;
  const isRuler = was === 'serving' && state.factions[faction]?.ruler === id;
  s.status = 'dead';
  s.deathDay = state.day;
  // Treasures pass to the next holder: a kinsman or the lord's store.
  if (faction && state.factions[faction]) (state.factions[faction].store ??= []).push(...s.treasures);
  s.treasures = [];
  if (was === 'serving') {
    for (const a of Object.values(state.armies)) if (a.commander === id || a.deputies.includes(id)) leaveArmy(state, a, id);
    for (const nid in state.nodes) if (state.nodes[nid].governor === id) state.nodes[nid].governor = null;
  }
  if (faction === state.player || isRuler) note(state, how === 'battle' ? 'logFell' : how === 'executed' ? 'logExecuted' : 'logDied', { general: id, faction });
  if (isRuler) succeed(state, faction);
}

function leaveArmy(state, army, id) {
  army.deputies = army.deputies.filter((d) => d !== id);
  if (army.commander === id) army.commander = army.deputies.shift() ?? null;
}

/** A new ruler for a faction whose ruler died: a kinsman first, else the ablest, else the faction falls apart. */
export function succeed(state, factionId) {
  const f = state.factions[factionId],
    old = f.ruler;
  const here = serving(state, factionId).filter((id) => id !== old);
  if (!here.length) {
    f.alive = false;
    for (const nid in state.nodes) if (state.nodes[nid].owner === factionId) state.nodes[nid].owner = null;
    for (const a of Object.values(state.armies)) if (a.faction === factionId) delete state.armies[a.id];
    note(state, 'logFall', { faction: factionId });
    if (factionId === state.player) state.over = { kind: 'fallen', day: state.day };
    return null;
  }
  const kin = here.filter((id) => surname(id) === surname(old));
  const score = (id) => stat(state, id, 'cha') + stat(state, id, 'lead') * 0.5 + stat(state, id, 'pol') * 0.5;
  const pool = kin.length ? kin : here;
  pool.sort((a, b) => score(b) - score(a));
  const heir = pool[0];
  f.ruler = heir;
  state.generals[heir].loyalty = 100;
  // A change of ruler shakes loyalty, less so for an heir of the same house.
  for (const id of here) if (id !== heir) state.generals[id].loyalty = clamp(state.generals[id].loyalty - (kin.length ? 4 : 12), 0, 100);
  note(state, 'logSucceed', { faction: factionId, general: heir });
  return heir;
}

/** Once a year: nothing extra yet beyond the monthly checks (kept for the calendar's sake). */
export function yearlyPeople(state) {
  for (const id in state.generals) {
    const s = state.generals[id];
    // Experience: a year of service raises a little of what was used.
    if (s.status === 'serving' && s.service) {
      for (const k in s.service) if (s.service[k] >= 6) s.exp[k] = Math.min(10, (s.exp[k] ?? 0) + 1);
      s.service = {};
    }
  }
}

/** Each month: loyalty drifts, the wounded mend, the order for talent brings someone, free generals move on. */
export function monthlyPeople(state) {
  for (const id in state.generals) {
    const s = state.generals[id];
    if (s.status === 'serving') {
      const f = state.factions[s.faction];
      if (f.ruler === id) continue;
      const lord = f.ruler,
        sameCamp = GENERALS[lord].camp === GENERALS[id].camp ? 2 : 0;
      const pull = 70 + generalEffect(state, id, 'loyal') + sameCamp * 4 - generalEffect(state, id, 'betray') / 2 + (stat(state, lord, 'cha') - 70) / 3;
      s.loyalty = clamp(s.loyalty + (pull - s.loyalty) * 0.08, 0, 100);
      if (s.wounded) s.wounded = Math.max(0, s.wounded - 1);
    } else if (s.status === 'free') {
      // A wanderer sometimes moves to a neighbouring city.
      if (random(state) < 0.04) {
        const next = ADJACENT[s.at].map((l) => l.to).filter((n) => NODES[n].kind === 'city');
        if (next.length) (s.at = next[Math.floor(random(state) * next.length)]), (s.known = false);
      }
    }
  }
  for (const f of Object.values(state.factions)) if (f.alive && f.talentOrder > state.day) talentAnswers(state, f.id);
}

/** Free generals in a faction's land, or near it, may answer its order for talent. */
function talentAnswers(state, factionId) {
  const f = state.factions[factionId],
    camp = GENERALS[f.ruler].camp;
  const ours = new Set(Object.keys(state.nodes).filter((n) => state.nodes[n].owner === factionId));
  for (const id in state.generals) {
    const s = state.generals[id];
    if (s.status !== 'free' || reserved(state, id, factionId)) continue;
    const near = ours.has(s.at) || ADJACENT[s.at].some((l) => ours.has(l.to));
    if (!near) continue;
    const g = GENERALS[id],
      worth = (g.stats.lead + g.stats.war + g.stats.int + g.stats.pol + g.stats.cha) / 5;
    const p = 0.05 + f.fame / 6000 + (camp === g.camp ? 0.06 : 0) - Math.max(0, worth - 70) / 250 + techEffect(state, factionId, 'search') / 400;
    if (random(state) < p) {
      join(state, id, factionId, ours.has(s.at) ? s.at : f.capital);
      if (factionId === state.player) note(state, 'logAnswered', { general: id });
    }
  }
}

/** A general enters a faction's service at a place. */
export function join(state, id, factionId, at) {
  Object.assign(state.generals[id], { status: 'serving', faction: factionId, at, loyalty: 65 + generalEffect(state, id, 'loyal') / 2, known: true });
  if (factionId === state.player) state.stats.generalsRecruited++;
}

/** Search a city for unattached talent and hidden treasures. Takes the searcher's time; the result comes at once here. */
export function searchCity(state, factionId, searcher, nodeId) {
  const s = state.generals[searcher];
  if (s.status !== 'serving' || s.faction !== factionId || s.at !== nodeId) return { why: 'notHere' };
  if (s.busyUntil > state.day) return { why: 'busy' };
  s.busyUntil = state.day + 10;
  const found = [],
    skill = stat(state, searcher, 'int') * 0.5 + stat(state, searcher, 'cha') * 0.5 + generalEffect(state, searcher, 'search') + techEffect(state, factionId, 'search');
  for (const id in state.generals) {
    const g = state.generals[id];
    if (g.status === 'free' && g.at === nodeId && !g.known && random(state) < 0.35 + skill / 200) {
      g.known = true;
      found.push({ general: id });
    }
  }
  const hidden = state.hiddenTreasures.filter((t) => t.at === nodeId);
  for (const t of hidden)
    if (random(state) < 0.12 + skill / 600) {
      state.hiddenTreasures.splice(state.hiddenTreasures.indexOf(t), 1);
      (state.factions[factionId].store ??= []).push(t.id);
      found.push({ treasure: t.id });
    }
  (s.service ??= {}).int = (s.service.int ?? 0) + 1;
  return { ok: true, found };
}

/** The chance that `recruiter` persuades `target` to serve `factionId`. */
export function persuadeChance(state, factionId, recruiter, target) {
  const t = state.generals[target],
    g = GENERALS[target],
    f = state.factions[factionId];
  const worth = (g.stats.lead + g.stats.war + g.stats.int + g.stats.pol + g.stats.cha) / 5;
  let p = 0.35 + (stat(state, recruiter, 'cha') - 60) / 120 + f.fame / 4000 + (GENERALS[f.ruler].camp === g.camp ? 0.15 : 0) - Math.max(0, worth - 65) / 120;
  p += (generalEffect(state, recruiter, 'persuade') + techEffect(state, factionId, 'persuade')) / 100;
  if (t.status === 'captive') p -= (t.loyalty ?? 50) / 140 + generalEffect(state, target, 'loyal') / 200;
  if (t.status === 'serving') p -= t.loyalty / 90 + generalEffect(state, target, 'loyal') / 150;
  if (t.refused?.[factionId] > state.day) p -= 0.25;
  return clamp(p, 0.02, 0.95);
}

/** Ask a free general, a captive or an enemy officer to serve. */
export function persuade(state, factionId, recruiter, target) {
  const r = state.generals[recruiter],
    t = state.generals[target];
  if (r.status !== 'serving' || r.faction !== factionId) return { why: 'notOurs' };
  if (r.busyUntil > state.day) return { why: 'busy' };
  const ok = t.status === 'free' || (t.status === 'captive' && t.captor === factionId) || (t.status === 'serving' && t.faction !== factionId);
  if (!ok || state.factions[factionId].ruler === target) return { why: 'cannot' };
  if (t.status === 'serving' && state.factions[t.faction].ruler === target) return { why: 'cannot' };
  r.busyUntil = state.day + 5;
  const p = persuadeChance(state, factionId, recruiter, target);
  if (chance(state, p)) {
    const at = t.status === 'free' && state.nodes[t.at]?.owner === factionId ? t.at : r.at && state.nodes[r.at] ? r.at : state.factions[factionId].capital;
    const from = t.status === 'serving' ? t.faction : null;
    join(state, target, factionId, at);
    if (from) {
      for (const a of Object.values(state.armies)) if (a.commander === target || a.deputies.includes(target)) leaveArmy(state, a, target);
      for (const nid in state.nodes) if (state.nodes[nid].governor === target) state.nodes[nid].governor = null;
    }
    return { ok: true, joined: true };
  }
  (t.refused ??= {})[factionId] = state.day + 60;
  return { ok: true, joined: false };
}

/** Issue the order for talent for a number of months. */
export function issueTalentOrder(state, factionId, months = 6) {
  const f = state.factions[factionId];
  const cost = 300;
  if (f.coin < cost) return { why: 'coin' };
  f.coin -= cost;
  f.talentOrder = Math.max(f.talentOrder, state.day) + months * 30;
  return { ok: true };
}

/** Give a treasure from the store to a general: his ability rises and so does his loyalty. */
export function giveTreasure(state, factionId, treasure, general) {
  const f = state.factions[factionId],
    s = state.generals[general];
  if (!(f.store ?? []).includes(treasure) || s.status !== 'serving' || s.faction !== factionId) return { why: 'cannot' };
  f.store.splice(f.store.indexOf(treasure), 1);
  s.treasures.push(treasure);
  s.loyalty = clamp(s.loyalty + 8 + TREASURES[treasure].amount * 2, 0, 100);
  return { ok: true };
}

/** Send a general to another place the faction holds (he arrives after some days). */
export function moveGeneral(state, factionId, general, to) {
  const s = state.generals[general];
  if (s.status !== 'serving' || s.faction !== factionId || state.nodes[to]?.owner !== factionId) return { why: 'cannot' };
  if (!state.nodes[s.at]) return { why: 'inArmy' };
  for (const nid in state.nodes) if (state.nodes[nid].governor === general) state.nodes[nid].governor = null;
  s.at = to;
  s.busyUntil = state.day + 6;
  return { ok: true };
}

/** What becomes of captives: the player is asked about his; the computer decides about its own. */
export function settleCaptives(state) {
  for (const id in state.generals) {
    const s = state.generals[id];
    if (s.status !== 'captive') continue;
    if (!state.factions[s.captor]?.alive) {
      Object.assign(s, { status: 'free', faction: null, at: GENERALS[id].home, captor: null, known: false });
      continue;
    }
    if (s.captor === state.player) continue;
    // The computer tries to win him over, and in time lets him go, or rarely puts him to death.
    const f = state.factions[s.captor],
      ruler = f.ruler;
    const r = persuade(state, s.captor, ruler, id);
    if (r.joined) continue;
    s.held = (s.held ?? 0) + 1;
    if (s.held > 3) {
      if (generalEffect(state, ruler, 'support') < 0 && random(state) < 0.3) die(state, id, 'executed');
      else release(state, id);
    }
  }
}

export function release(state, id) {
  const s = state.generals[id],
    home = s.faction && state.factions[s.faction]?.alive ? state.factions[s.faction].capital : null;
  if (home) Object.assign(s, { status: 'serving', at: home, captor: null, held: 0, loyalty: clamp(s.loyalty + 5, 0, 100) });
  else Object.assign(s, { status: 'free', faction: null, at: GENERALS[id].home, captor: null, held: 0, known: false });
}

/** Take a general captive after a battle. */
export function capture(state, id, captor) {
  const s = state.generals[id];
  const wasRuler = s.status === 'serving' && state.factions[s.faction]?.ruler === id;
  for (const a of Object.values(state.armies)) if (a.commander === id || a.deputies.includes(id)) leaveArmy(state, a, id);
  for (const nid in state.nodes) if (state.nodes[nid].governor === id) state.nodes[nid].governor = null;
  const seat = state.factions[captor].capital;
  Object.assign(s, { status: 'captive', captor, at: seat, held: 0 });
  if (captor === state.player) state.inbox.push({ kind: 'captive', general: id, blocks: false });
  note(state, 'logCaptured', { general: id, faction: captor });
  if (wasRuler) succeed(state, s.faction);
}
