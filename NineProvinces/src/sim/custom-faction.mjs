// Founding is a new-game transaction, not a way to clone a historical officer
// or change a running save. Original historical snapshots remain untouched.
import { GENERALS } from '../data/generals.mjs';
import { NODES, ADJACENT } from '../data/map.mjs';
import { normalizeRoster } from '../custom-officers.mjs';
import { addRosterOfficers } from './newblood.mjs';
import { dateOf, forgetGeneralIds } from './core.mjs';

export const CUSTOM_FACTION_ID = 'player';
export const COMPANION_LIMIT = 3;
export const WITHDRAWAL_TRUCE_DAYS = 540;
export const BANNER_COLOURS = [0x85643f, 0x397a72, 0x596ca0, 0xa65749, 0x74558d, 0x647b42];
const clean = value => typeof value === 'string' ? value.trim().replace(/[\u0000-\u001f\u007f]/g, '') : '';

/** Explain exclusions using the selected year's actual state, not only a name list. */
export function foundingOfficerReason(state, id) {
  const g = GENERALS[id];
  const s = state.generals[id];
  const year = dateOf(state.day).year;
  if (!g || g.made || !s) return 'unknown';
  if (g.born + 15 > year) return 'underage';
  if (g.died < year || s.status === 'dead') return 'dead';
  if (Object.values(state.factions).some(f => f.alive && f.ruler === id)) return 'ruler';
  if (!['serving', 'free'].includes(s.status) || !state.nodes[s.at]) return 'unavailable';
  return null;
}

/** Read-only candidates. Only the final chosen alternate site is detached. */
export function customFactionOptions(state, input = []) {
  const year = dateOf(state.day).year;
  const roster = normalizeRoster(input);
  const cities = Object.values(NODES).filter(n => n.kind === 'city');
  const vacant = cities.filter(n => !state.nodes[n.id].owner);
  let candidates = vacant;
  if (!vacant.length) {
    const capitals = new Set(Object.values(state.factions).filter(f => f.alive).map(f => f.capital));
    const counts = {};
    for (const n of cities) {
      const owner = state.nodes[n.id].owner;
      if (owner) counts[owner] = (counts[owner] ?? 0) + 1;
    }
    const frontier = n => ADJACENT[n.id].some(({ to }) => state.nodes[to].owner !== state.nodes[n.id].owner);
    const available = cities.filter(n => !capitals.has(n.id) && n.size <= 3 && counts[state.nodes[n.id].owner] > 1)
      .sort((a, b) => Number(frontier(b)) - Number(frontier(a)) || a.size - b.size || a.id.localeCompare(b.id));
    // Spread choices across powers, rather than listing only Cao's small towns.
    const used = {};
    candidates = [];
    for (const n of available) {
      const owner = state.nodes[n.id].owner;
      if ((used[owner] ?? 0) >= 2) continue;
      used[owner] = (used[owner] ?? 0) + 1;
      candidates.push(n);
      if (candidates.length >= 8) break;
    }
  }
  // Multi-seed tests found Anding and Changsha exposed to early third-party
  // armies. Offer quieter defaults without removing those challenge starts or
  // changing any ownership in the ordinary historical snapshot.
  const recommended = ({ '200': 'baxi', '208': 'lingling' })[state.scenario] ?? null;
  if (recommended) candidates.sort((a, b) => Number(b.id === recommended) - Number(a.id === recommended));
  const towns = candidates.map(n => ({ id: n.id, zh: n.zh, en: n.en, size: n.size, formerOwner: state.nodes[n.id].owner ?? null,
    alternateHistory: !vacant.length, ...(n.id === recommended ? { recommended: true } : {}) }));
  const historical = Object.keys(state.generals).filter(id => foundingOfficerReason(state, id) === null).map(id => {
    const g = GENERALS[id];
    const s = state.generals[id];
    return { ref: 'history:' + id, source: 'history', id, zh: g.zh, en: g.en, age: year - g.born, formerFaction: s.faction ?? null, stats: { ...g.stats } };
  });
  historical.sort((a, b) => (b.stats.lead + b.stats.cha + b.stats.pol) - (a.stats.lead + a.stats.cha + a.stats.pol) || a.id.localeCompare(b.id));
  const officers = [...roster.map(g => ({ ...g, ref: 'roster:' + g.id, source: 'roster', formerFaction: null })), ...historical];
  return { towns, officers, alternateHistory: !vacant.length, companionLimit: COMPANION_LIMIT };
}

export function validateCustomFaction(state, input, roster = []) {
  const raw = input && typeof input === 'object' ? input : {};
  const errors = [];
  const zh = clean(raw.zh);
  const en = clean(raw.en) || zh;
  const flag = clean(raw.flag);
  const colour = Number(raw.colour);
  const options = customFactionOptions(state, roster);
  if (!zh || [...zh].length > 12 || /[<>]/.test(zh) || en.length > 48 || /[<>]/.test(en)) errors.push('name');
  if ([...flag].length !== 1 || /[<>]/.test(flag)) errors.push('flag');
  if (!Number.isInteger(colour) || colour < 0 || colour > 0xffffff) errors.push('colour');
  if (!options.towns.some(n => n.id === raw.town)) errors.push('town');
  if (state.factions[CUSTOM_FACTION_ID]) errors.push('existing');
  const known = new Set(options.officers.map(g => g.ref));
  if (!known.has(raw.ruler)) errors.push('ruler');
  const companions = Array.isArray(raw.companions) ? raw.companions.slice() : [];
  if ((raw.companions !== undefined && !Array.isArray(raw.companions)) || companions.length > COMPANION_LIMIT) errors.push('companions');
  if (new Set(companions).size !== companions.length || companions.includes(raw.ruler) || companions.some(ref => !known.has(ref))) errors.push('companions');
  return { ok: !errors.length, errors: [...new Set(errors)], config: { zh, en, flag, colour, town: raw.town, ruler: raw.ruler, companions }, options };
}

/** Validate everything before touching entity ownership; each selected person moves once. */
export function foundCustomFaction(state, input, roster = []) {
  const result = validateCustomFaction(state, input, roster);
  if (!result.ok) throw new Error('CUSTOM_FACTION_INVALID:' + result.errors.join(','));
  const c = result.config;
  const town = state.nodes[c.town];
  const formerOwner = town.owner ?? null;
  if (formerOwner) {
    const capital = state.factions[formerOwner].capital;
    const home = state.nodes[capital];
    const total = home.troops + town.troops;
    home.training = total ? Math.round((home.training * home.troops + town.training * town.troops) / total) : home.training;
    home.troops = total;
    // Only this border town changes status in the alternate-history fork. Its
    // existing troops and officers go home; they are not awarded to the player.
    for (const s of Object.values(state.generals)) {
      if (s.faction === formerOwner && s.at === c.town) s.at = capital;
    }
  }
  const id = CUSTOM_FACTION_ID;
  const f = {
    id,
    name: { zh: c.zh, en: c.en },
    ruler: null,
    alive: true,
    capital: c.town,
    colour: c.colour,
    flag: c.flag,
    camp: 'H',
    coin: 6500,
    grain: 24000 + NODES[c.town].size * 2000,
    fame: 120,
    techs: [],
    research: { current: null, points: 0 },
    way: null,
    tax: 'normal',
    relations: {},
    treaties: {},
    talentOrder: 0,
    ai: { cooldown: 0, target: null }
  };
  state.factions[id] = f;
  state.player = id;
  Object.assign(town, { owner: id, troops: Math.max(6000, NODES[c.town].size * 1800), training: 55, support: 62, order: 62, governor: null, work: null, siege: null });
  const refs = [c.ruler, ...c.companions];
  const records = normalizeRoster(roster);
  const needed = new Set(refs.filter(ref => ref.startsWith('roster:')).map(ref => ref.slice(7)));
  const added = addRosterOfficers(state, records.filter(g => needed.has(g.id)).map(g => ({ ...g, service: 'player' })));
  const runtime = new Map(added.map(key => [GENERALS[key].rosterId, key]));
  const resolve = ref => ref.startsWith('roster:') ? runtime.get(ref.slice(7)) : ref.slice(8);
  const members = refs.map(resolve);
  const origins = {};
  f.ruler = members[0];
  f.camp = GENERALS[f.ruler].camp;
  for (let i = 0; i < members.length; i++) {
    const key = members[i];
    const s = state.generals[key];
    origins[key] = s.faction === id ? null : s.faction;
    for (const node of Object.values(state.nodes)) {
      if (node.governor === key) node.governor = null;
    }
    Object.assign(s, { status: 'serving', faction: id, at: c.town, loyalty: i === 0 ? 100 : 90, known: true });
    delete s.busyUntil;
    delete s.captor;
    delete s.held;
    // Keep the campaign's custom snapshot authoritative on reload. The
    // independent title roster still has its original values.
    const saved = state.custom.find(g => g.id === key && g.userCreated);
    if (saved) {
      saved.camp = f.camp;
      GENERALS[key].camp = saved.camp;
    }
  }
  for (const other of Object.values(state.factions)) {
    if (other.id === id) continue;
    let regard = other.camp === f.camp ? 15 : other.camp === 'Y' || f.camp === 'Y' ? -50 : 0;
    if (Object.values(origins).includes(other.id)) regard = Math.min(regard, -15);
    f.relations[other.id] = regard;
    other.relations[id] = regard;
  }
  if (formerOwner) {
    // A negotiated evacuation buys a small independent town time to organise;
    // it does not stop any third power or change normal diplomacy/expiry rules.
    const treaty = { kind: 'truce', until: state.day + WITHDRAWAL_TRUCE_DAYS };
    f.treaties[formerOwner] = { ...treaty };
    state.factions[formerOwner].treaties[id] = { ...treaty };
  }
  state.branch = 'free';
  state.inbox = [];
  state.fired = {};
  state.flags = {};
  state.founding = {
    kind: 'custom', scenario: state.scenario, town: c.town, ruler: f.ruler,
    companions: members.slice(1), origins, formerOwner, alternateHistory: !!formerOwner,
    day: state.day, name: { ...f.name },
    ...(formerOwner ? { withdrawalTruceUntil: state.day + WITHDRAWAL_TRUCE_DAYS } : {})
  };
  forgetGeneralIds(state);
  return state.founding;
}
