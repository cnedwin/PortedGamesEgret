// 天下的局面与日月推移。`createGame` 摆好中平元年的天下；`advance` 一天一天往前走：军队行军、交战、围城，营建进度，
// 每月初结算钱粮、人口、民心、治安和研究，每十天各势力的君主（电脑）想一次对策，每年初武将登场与谢世。
// 需要玩家拿主意的事（亲自指挥的战斗、演义事件、使者、俘虏）放进 `inbox`，界面看到就停下时间。
// The state of the realm and the passing of days. `createGame` sets out the realm in the first year of Zhongping;
// `advance` moves it on a day at a time: armies march, fight and besiege, works go on, at each month's start coin and
// grain, people, support, order and research are settled, every ten days each computer ruler thinks again, and each year
// generals come of age and pass away. What needs the player's decision (a battle he commands, a story event, an envoy, a
// captive) goes into `inbox`, and the view stops time when it sees one.
import { FACTIONS } from '../data/factions.mjs';
import { GENERALS } from '../data/generals.mjs';
import { ADJACENT, NODES } from '../data/map.mjs';
import { TECHS } from '../data/techs.mjs';
import { TREASURES } from '../data/treasures.mjs';
import { thinkAll } from './ai.mjs';
import { clamp, dateOf, DAYS_IN_MONTH, dayOf, END_YEAR, generalEffect, note, random, serving, stat, techEffect } from './core.mjs';
import { monthlyDiplomacy, startingRelations } from './diplomacy.mjs';
import { marchArmies } from './military.mjs';
import { addRosterOfficers, registerCustom, yearlyNewBlood } from './newblood.mjs';
import { applyScenario, scenarioOf } from './scenarios.mjs';
import { foundCustomFaction } from './custom-faction.mjs';
import { comeOfAge, monthlyPeople, settleCaptives, yearlyPeople } from './people.mjs';
import { checkStory } from './story.mjs';

export const VERSION = 1;

/** Ceilings of a place's four works: fields, markets, walls, offices. */
export function caps(nodeId) {
  const n = NODES[nodeId];
  if (n.kind === 'pass') return { farm: 0, market: 0, wall: 40 + n.hard * 20, office: 0 };
  if (n.kind === 'port') return { farm: 0, market: 20, wall: 30, office: 0 };
  const walls = n.traits.includes('w') ? 20 : 0;
  return { farm: 20 + n.size * 18, market: 20 + n.size * 18, wall: 30 + n.size * 14 + walls, office: 10 + n.size * 10 };
}

/** Most people a city can hold. */
export const peopleCap = (nodeId) => Math.round(NODES[nodeId].people * 1.8 + 40000);

/** A new game: the realm of 184, the player's faction, the chosen story branch and the rules asked for. */
export function createGame({ seed = 1, faction = 'caocao', branch = 'free', lifespan = 'history', command = true, difficulty = 'normal', scenario = '184', officers = [], customFaction = null } = {}) {
  const start = scenarioOf(scenario);
  const state = {
    version: VERSION,
    seed,
    rng: seed >>> 0,
    day: dayOf(start.year, start.month, 1),
    startedDay: dayOf(start.year, start.month, 1),
    scenario: start.id,
    player: faction,
    branch,
    options: { lifespan, command, difficulty },
    factions: {},
    nodes: {},
    generals: {},
    armies: {},
    nextId: 1,
    inbox: [],
    log: [],
    flags: {},
    fired: {},
    over: null,
    stats: { battlesWon: 0, battlesLost: 0, citiesTaken: 0, generalsRecruited: 0 },
    custom: []
  };
  registerCustom(state);
  for (const f of Object.values(FACTIONS))
    state.factions[f.id] = {
      id: f.id,
      name: null,
      ruler: f.ruler,
      alive: true,
      capital: f.seat,
      colour: f.colour,
      flag: f.flag,
      camp: f.camp,
      coin: 3000 + f.places.length * 600,
      grain: 12000 + f.places.length * 3000,
      fame: 100,
      techs: [],
      research: { current: null, points: 0 },
      way: null,
      tax: 'normal',
      relations: {},
      treaties: {},
      talentOrder: 0,
      ai: { cooldown: 0, target: null }
    };
  for (const id in NODES) {
    const n = NODES[id],
      c = caps(id),
      owner = Object.values(FACTIONS).find((f) => f.places.includes(id))?.id ?? null,
      share = owner ? 0.35 : 0.2;
    state.nodes[id] = {
      owner,
      people: n.people,
      support: owner ? 55 : 45,
      order: owner ? 60 : 50,
      farm: Math.round(c.farm * share),
      market: Math.round(c.market * share),
      wall: Math.round(c.wall * (n.kind === 'city' ? 0.5 : 0.7)),
      office: Math.round(c.office * share),
      troops: n.kind === 'city' ? n.size * (owner ? 2600 : 1400) : n.kind === 'pass' ? n.hard * (owner ? 1400 : 900) : owner ? 800 : 500,
      training: owner ? 50 : 35,
      governor: null,
      work: null,
      siege: null
    };
  }
  // Generals of age in 184 stand where their faction's seat is, or at home; the rest wait to come of age.
  for (const g of Object.values(GENERALS)) {
    const s = { status: 'unborn', faction: null, at: null, loyalty: 0, exp: {}, treasures: [], died: deathYear(state, g) };
    // A fictional lifespan must not erase a historically living founder that
    // the 184 setup just offered. Keep this floor confined to custom starts;
    // the normal historical/fictional campaign path remains unchanged.
    if (customFaction && lifespan === 'fiction' && start.year === 184 && g.born + 15 <= 184 && g.died >= 184) {
      s.died = Math.max(s.died, 187);
    }
    state.generals[g.id] = s;
    if (g.born + 15 > 184 || s.died < 184) continue;
    if (g.start?.faction && state.factions[g.start.faction]) {
      const seat = FACTIONS[g.start.faction].seat;
      Object.assign(s, { status: 'serving', faction: g.start.faction, at: state.nodes[g.home]?.owner === g.start.faction ? g.home : seat, loyalty: 70 + generalEffect(state, g.id, 'loyal') });
    } else Object.assign(s, { status: 'free', at: g.home, known: false });
  }
  for (const f of Object.values(state.factions)) {
    state.generals[f.ruler].loyalty = 100;
    state.generals[f.ruler].at = f.capital;
  }
  startingRelations(state);
  applyScenario(state, start);
  for (const t of Object.values(TREASURES)) if (t.holder?.general && state.generals[t.holder.general]) {
    const holder = state.generals[t.holder.general];
    // Equipment of a man already gone before this snapshot is not resurrected
    // on his corpse. It re-enters the ordinary search pool at his home city.
    if (holder.status !== 'dead') holder.treasures.push(t.id);
  }
  state.hiddenTreasures = Object.values(TREASURES)
    .filter((t) => t.holder?.city || (start.year > 184 && state.generals[t.holder?.general]?.status === 'dead'))
    .map((t) => ({ id: t.id, at: t.holder.city ?? GENERALS[t.holder.general].home }));
  // A removed historical house cannot be selected through a stale URL or an
  // old title fixture; use a valid surviving power rather than a broken state.
  if (state.player !== null && !state.factions[state.player]?.alive) state.player = 'caocao';
  if (customFaction) foundCustomFaction(state, customFaction, officers);
  else addRosterOfficers(state, officers);
  for (const id in state.nodes) appointGovernor(state, id);
  // Harder computer rulers start richer.
  const more = { easy: 0.8, normal: 1, hard: 1.3 }[difficulty] ?? 1;
  for (const f of Object.values(state.factions))
    if (f.id !== state.player) {
      f.coin = Math.round(f.coin * more);
      f.grain = Math.round(f.grain * more);
    }
  note(state, 'logStart', { faction: state.player });
  checkStory(state);
  return state;
}

/** The year a general dies: his own, or with a made-up span about it. */
function deathYear(state, g) {
  if (state.options.lifespan !== 'fiction') return g.died;
  const span = g.died - g.born;
  return Math.round(g.born + Math.max(30, span + (random(state) - 0.5) * 24 + generalEffect(state, g.id, 'life')));
}

/** Put the best administrator at a place in charge of it, if none is. */
export function appointGovernor(state, nodeId) {
  const node = state.nodes[nodeId];
  if (!node.owner) return (node.governor = null);
  const here = serving(state, node.owner, nodeId);
  if (node.governor && here.includes(node.governor)) return node.governor;
  let best = null,
    score = -1;
  for (const id of here) {
    const s = stat(state, id, 'pol') + stat(state, id, 'lead') * 0.4;
    if (s > score) (score = s), (best = id);
  }
  return (node.governor = best);
}

/** How fast works go at a place: its governor and the officials there. */
function workSpeed(state, nodeId, kind) {
  const node = state.nodes[nodeId],
    here = serving(state, node.owner, nodeId);
  const key = kind === 'wall' ? 'lead' : 'pol';
  let best = 30,
    help = 0;
  for (const id of here) {
    const v = stat(state, id, key);
    if (v > best) (help += best * 0.15), (best = v);
    else help += v * 0.15;
  }
  const bonus = 1 + (techEffect(state, node.owner, 'build') + (node.governor ? generalEffect(state, node.governor, 'build') : 0)) / 100;
  return ((best + Math.min(help, 40)) / 60) * bonus;
}

/** What a work of a kind costs at a place now, and how many days it takes. */
export function workQuote(state, nodeId, kind) {
  const node = state.nodes[nodeId],
    level = node[kind],
    size = NODES[nodeId].size;
  const coin = Math.round(120 + level * 14 + size * 30);
  const days = Math.max(6, Math.round(24 / workSpeed(state, nodeId, kind)));
  return { coin, days, full: level >= caps(nodeId)[kind] };
}

/** Start raising one of a place's works by a level. */
export function startWork(state, factionId, nodeId, kind) {
  const node = state.nodes[nodeId],
    f = state.factions[factionId];
  if (node.owner !== factionId) return { why: 'notOurs' };
  if (node.work) return { why: 'busy' };
  if (!['farm', 'market', 'wall', 'office'].includes(kind)) return { why: 'kind' };
  const q = workQuote(state, nodeId, kind);
  if (q.full) return { why: 'full' };
  if (f.coin < q.coin) return { why: 'coin' };
  f.coin -= q.coin;
  node.work = { kind, left: q.days, of: q.days };
  return { ok: true };
}

/** Raise troops at a city from its people: costs coin and support, and lowers training. */
export function recruit(state, factionId, nodeId, amount) {
  const node = state.nodes[nodeId],
    f = state.factions[factionId];
  if (node.owner !== factionId) return { why: 'notOurs' };
  if (NODES[nodeId].kind !== 'city') return { why: 'notCity' };
  const room = Math.max(0, Math.floor(node.people * 0.05) - (node.levied ?? 0)),
    asked = Math.max(0, Math.min(amount, room, Math.floor(f.coin / 0.12)));
  if (asked < 100) return { why: room < 100 ? 'people' : 'coin' };
  const bonus = 1 + (techEffect(state, factionId, 'recruit') + (node.governor ? generalEffect(state, node.governor, 'recruit') : 0)) / 100;
  const got = Math.round(asked * bonus);
  f.coin -= Math.round(asked * 0.12);
  node.people -= asked;
  node.levied = (node.levied ?? 0) + asked;
  node.training = Math.round((node.training * node.troops + 20 * got) / (node.troops + got));
  node.troops += got;
  node.support = clamp(node.support - asked / Math.max(2000, node.people / 40), 0, 100);
  return { ok: true, got };
}

/** Move soldiers from a place to a neighbouring one the faction holds (they march there in a few days). */
export function transfer(state, factionId, from, to, amount) {
  const a = state.nodes[from],
    b = state.nodes[to];
  if (a.owner !== factionId || b.owner !== factionId) return { why: 'notOurs' };
  if (!NODES_ADJ(from).includes(to)) return { why: 'far' };
  const n = Math.min(amount, a.troops);
  if (n < 100) return { why: 'troops' };
  a.troops -= n;
  b.training = Math.round((b.training * b.troops + a.training * n) / (b.troops + n));
  b.troops += n;
  return { ok: true, moved: n };
}
const NODES_ADJ = (id) => ADJACENT[id].map((l) => l.to);

/** Research points a faction makes in a month. */
export function researchRate(state, factionId) {
  let points = 6;
  for (const id in state.nodes) if (state.nodes[id].owner === factionId) points += state.nodes[id].office * 0.35;
  let best = 0;
  for (const id of serving(state, factionId)) best = Math.max(best, stat(state, id, 'int') + stat(state, id, 'pol'));
  return points * (1 + best / 300) * (1 + techEffect(state, factionId, 'tech') / 100);
}

/** Whether a faction may study an invention now. */
export function canStudy(state, factionId, techId) {
  const f = state.factions[factionId],
    t = TECHS[techId];
  if (!t || f.techs.includes(techId)) return false;
  if (!t.needs.every((n) => f.techs.includes(n))) return false;
  if (t.tier >= 4 && f.way && f.way !== t.way) return false;
  return true;
}

export function study(state, factionId, techId) {
  if (!canStudy(state, factionId, techId)) return { why: 'cannot' };
  state.factions[factionId].research.current = techId;
  return { ok: true };
}

const TAX = { low: { coin: 0.7, support: 1.2 }, normal: { coin: 1, support: 0 }, high: { coin: 1.35, support: -2 } };

/** Income of a place in a month (before upkeep): coin and grain. */
export function income(state, nodeId) {
  const node = state.nodes[nodeId],
    owner = node.owner,
    tax = TAX[state.factions[owner]?.tax ?? 'normal'];
  const g = node.governor;
  const farm = 1 + (techEffect(state, owner, 'farm') + (g ? generalEffect(state, g, 'farm') : 0)) / 100;
  const trade = 1 + (techEffect(state, owner, 'trade') + (g ? generalEffect(state, g, 'trade') : 0)) / 100;
  const order = 0.5 + node.order / 200,
    people = Math.sqrt(node.people / 300000);
  return {
    coin: Math.round((node.market * 14 * people + node.people / 3000) * order * tax.coin * trade),
    grain: Math.round(node.farm * 20 * people * order * farm)
  };
}

/** Upkeep of a faction in a month: soldiers eat grain and are paid, officers draw pay. */
export function upkeep(state, factionId) {
  let troops = 0;
  for (const id in state.nodes) if (state.nodes[id].owner === factionId) troops += state.nodes[id].troops;
  for (const a of Object.values(state.armies)) if (a.faction === factionId) troops += a.troops;
  const officers = serving(state, factionId).length;
  return { grain: Math.round(troops / 16), coin: Math.round(troops / 60 + officers * 15), troops };
}

/** One month's settling: income, upkeep, growth, support and order, research, people. */
function monthly(state) {
  const { month } = dateOf(state.day);
  for (const f of Object.values(state.factions)) {
    if (!f.alive) continue;
    let coin = 0,
      grain = 0;
    for (const id in state.nodes) {
      const node = state.nodes[id];
      if (node.owner !== f.id) continue;
      const i = income(state, id);
      coin += i.coin;
      grain += i.grain;
      // The autumn harvest.
      if (month === 8) grain += Math.round(node.farm * 160 * Math.sqrt(node.people / 300000));
    }
    const u = upkeep(state, f.id);
    f.coin = Math.max(0, f.coin + coin - u.coin);
    f.grain = f.grain + grain - u.grain;
    if (f.grain < 0) {
      // Hunger: soldiers desert and the people suffer.
      f.grain = 0;
      for (const id in state.nodes)
        if (state.nodes[id].owner === f.id) {
          state.nodes[id].troops = Math.floor(state.nodes[id].troops * 0.92);
          state.nodes[id].support = clamp(state.nodes[id].support - 4, 0, 100);
        }
      if (f.id === state.player) note(state, 'logHunger', {});
    }
    // Research.
    if (f.research.current) {
      f.research.points += researchRate(state, f.id);
      const t = TECHS[f.research.current];
      if (f.research.points >= t.cost) {
        f.research.points -= t.cost;
        f.techs.push(t.id);
        if (t.tier >= 4) f.way = t.way;
        if (f.id === state.player) note(state, 'logTech', { tech: t.id });
        f.research.current = null;
      }
    }
    // The order for talent costs coin each month.
    if (f.talentOrder > state.day) f.coin = Math.max(0, f.coin - 80);
    f.fame = Math.max(0, f.fame + (f.talentOrder > state.day ? 2 : 0));
  }
  for (const f of Object.values(state.factions)) f.size = 0;
  for (const id in state.nodes) if (state.nodes[id].owner && NODES[id].kind === 'city') state.factions[state.nodes[id].owner].size++;
  for (const id in state.nodes) monthlyPlace(state, id);
  monthlyPeople(state);
  monthlyDiplomacy(state);
  settleCaptives(state);
}

function monthlyPlace(state, id) {
  const node = state.nodes[id],
    n = NODES[id];
  if (n.kind !== 'city') {
    if (node.owner) node.training = Math.min(80, node.training + 2);
    return;
  }
  const owner = node.owner,
    tax = TAX[state.factions[owner]?.tax ?? 'normal'];
  const g = node.governor;
  node.levied = 0;
  // A wide realm is hard to hold: support and order suffer as it grows.
  const sprawl = owner ? Math.max(0, (state.factions[owner].size ?? 0) - 8) * 0.9 : 0;
  // Support drifts towards what the governor, the taxes and the inventions make of it.
  const target = clamp(
    45 + (g ? (stat(state, g, 'cha') - 50) / 3 : -8) + (owner ? techEffect(state, owner, 'support') + (g ? generalEffect(state, g, 'support') : 0) : 0) + tax.support * 6 + node.office / 6 - sprawl,
    5,
    100
  );
  node.support = clamp(node.support + (target - node.support) * 0.12 + tax.support, 0, 100);
  // Order follows the governor's politics, the offices and the garrison.
  const orderTarget = clamp(40 + (g ? (stat(state, g, 'pol') - 50) / 2.5 : -10) + node.office / 3 + Math.min(15, node.troops / 2000) + (owner ? techEffect(state, owner, 'order') : 0) - sprawl, 5, 100);
  node.order = clamp(node.order + (orderTarget - node.order) * 0.15, 0, 100);
  // People grow with support and room, and fall with disorder.
  const cap = peopleCap(id),
    growth = (0.0035 * (node.support - 30)) / 50 + (owner ? techEffect(state, owner, 'farm') / 20000 : 0);
  node.people = Math.round(clamp(node.people * (1 + growth * (1 - node.people / cap)), 5000, cap));
  // Training of the garrison.
  const drill = g ? stat(state, g, 'lead') : 40;
  node.training = Math.min(30 + drill * 0.6 + (owner ? techEffect(state, owner, 'train') : 0), node.training + 3);
  // Unrest: a city with very low order loses troops and people to bandits.
  if (owner && node.order < 20 && random(state) < 0.3) {
    node.troops = Math.floor(node.troops * 0.9);
    node.people = Math.floor(node.people * 0.97);
    if (owner === state.player) note(state, 'logUnrest', { place: id });
  }
  // A city with no love left for its lord may rise and break away.
  if (owner && node.support < 15 && node.order < 25 && random(state) < 0.04 && state.factions[owner].capital !== id) {
    for (const gid of serving(state, owner, id)) state.generals[gid].at = state.factions[owner].capital;
    Object.assign(node, { owner: null, governor: null, work: null, support: 40, order: 40 });
    note(state, 'logRevolt', { place: id, faction: owner });
  }
  // Neutral cities keep a local garrison.
  if (!owner) node.troops = Math.min(n.size * 1600, node.troops + 80);
}

/** Works go on each day. */
function dailyWorks(state) {
  for (const id in state.nodes) {
    const node = state.nodes[id];
    if (!node.work) continue;
    if (!node.owner) {
      node.work = null;
      continue;
    }
    if (--node.work.left > 0) continue;
    node[node.work.kind] = Math.min(caps(id)[node.work.kind], node[node.work.kind] + 1);
    if (node.owner === state.player) note(state, 'logWorkDone', { place: id, kind: node.work.kind });
    node.work = null;
  }
}

/** A faction's strength in short: cities, soldiers, generals. */
export function power(state, factionId) {
  let cities = 0,
    troops = 0;
  for (const id in state.nodes)
    if (state.nodes[id].owner === factionId) {
      if (NODES[id].kind === 'city') cities++;
      troops += state.nodes[id].troops;
    }
  for (const a of Object.values(state.armies)) if (a.faction === factionId) troops += a.troops;
  return { cities, troops, generals: serving(state, factionId).length };
}

/** End a faction that holds nothing and has no army left. */
export function checkFall(state, factionId) {
  const f = state.factions[factionId];
  if (!f.alive) return;
  const holds = Object.values(state.nodes).some((n) => n.owner === factionId);
  const armies = Object.values(state.armies).some((a) => a.faction === factionId);
  if (holds || armies) return;
  f.alive = false;
  for (const id of serving(state, factionId)) {
    const s = state.generals[id];
    Object.assign(s, { status: 'free', faction: null, loyalty: 0, at: GENERALS[id].home });
  }
  note(state, 'logFall', { faction: factionId });
  if (factionId === state.player) state.over = { kind: 'fallen', day: state.day };
}

/** Whether the game has ended, and how. */
function checkEnd(state) {
  if (state.over) return;
  let total = 0,
    mine = 0;
  for (const id in state.nodes)
    if (NODES[id].kind === 'city') {
      total++;
      if (state.nodes[id].owner === state.player) mine++;
    }
  if (mine === total) state.over = { kind: 'unified', day: state.day };
  else if (dateOf(state.day).year > END_YEAR) state.over = { kind: mine * 3 >= total ? 'tripod' : 'endured', day: state.day, share: mine / total };
}

/**
 * Move the realm on by one day. Returns at once (doing nothing) while the inbox holds something the player must
 * decide, or once the game is over.
 */
export function advance(state) {
  if (state.over || state.inbox.some((m) => m.blocks)) return false;
  state.day++;
  const { day, month } = dateOf(state.day);
  marchArmies(state);
  dailyWorks(state);
  if (day === 1) {
    if (month === 1) {
      yearlyPeople(state);
      yearlyNewBlood(state);
    }
    comeOfAge(state);
    monthly(state);
    checkStory(state);
    checkEnd(state);
  }
  if (state.day % 5 === 0) thinkAll(state, (state.day / 5) % 2);
  return true;
}

/** Days until a date, from the game's day. */
export const daysUntil = (state, year, month) => dayOf(year, month) - state.day;
export { DAYS_IN_MONTH };
