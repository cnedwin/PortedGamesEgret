// The world: sects, strongholds and people, and what a day does to them.
//
// Everything lives in one plain `state` object, so saving is writing it out
// and the built-in editor is changing its fields. Nothing here touches the
// page; main.mjs draws the state and passes on the player's choices.
//
// A day: everyone works their job. Every ten days (a xun): wages, grain,
// loyalty, newcomers at the gate, and the other sects make their moves.
import { ART_BY_ID, CLASSES, CLASS_KEYS, commonArt, levelOf, sectArts, unmetNeeds } from '../data/arts.mjs';
import { BUILDINGS, DAYS_PER_XUN, DAYS_PER_YEAR, ECONOMY, GRADES, PILLS, WATCHES_PER_DAY } from '../data/goods.mjs';
import { PLACE_BY_ID, PLACES, RESOURCES } from '../data/places.mjs';
import { ELDERS, OFFICES, RANKS, SECT_BY_ID, SECTS, applyIdentity } from '../data/sects.mjs';
import { DIFFICULTIES, ROAD } from '../data/extras.mjs';
import { focusBoost, gearOffer, giveRelic, innerLevels, meridianNeed, openMeridian, spyBoost, upgradeGear, xunOfSpies } from './extras.mjs';
import { formationOf, modsOf, xunOfJianghu, yearOfJianghu } from './jianghu.mjs';
import { resolveBattle } from './battle.mjs';
import { TRAITS, autoWheel, equipFor, gainXp, growTo, hpMax, learnableArts, makeLeader, practise, prowess, rollPerson, trainingRate } from './persons.mjs';
import { BOOK_PRICE, addManual, heldArts, lackingArts, lootManuals } from './library.mjs';
import { clamp, createRng } from './rng.mjs';

export const SAVE_VERSION = 1;
const WORK_WATCHES = 8;
/** How much more a day's training teaches for each tier of the art above the first, and under a master. */
const TRAIN_XP = { perTier: 0.2, master: 0.25 };
const LOG_LIMIT = 300;
/** Shops one stronghold's town has room for. */
export const SHOP_LIMIT = 4;

/** Mastery points a manual adds per day, and how far below its author it stops. */
const MANUAL_POINTS = 30;

// ---- making a world -----------------------------------------------------------------------------

/** The share of applicants who arrive already knowing an art. */
const GIFTED_CHANCE = 0.125;
const uniqueBuildings = new Set(['hall', 'gate', 'board', 'mess', 'store', 'library', 'clinic', 'council']);

/** The buildings a sect's seat starts with. */
function startingBuildings(place, sect) {
  const list = [
    ['hall', 2],
    ['gate', 1],
    ['board', 1],
    ['dorm', 1],
    ['dorm', 1],
    ['dorm', 1],
    ['mess', 1],
    ['store', 1],
    ['yard', 1],
    ['range', 1],
    ['cell', 1],
  ];
  const pits = { gold: 'goldPit', wood: 'lumber', stone: 'quarry', iron: 'ironPit', herb: 'garden' };
  for (const key of RESOURCES) if (place.resources[key] >= 2) list.push([pits[key], 1]);
  list.push([sect.second === 'craft' ? 'still' : 'forge', 1]);
  return list.map(([kind, level]) => ({ kind, level, xp: 0 }));
}

/**
 * @param options.seed        repeats the same world
 * @param options.playerSect  the sect the player leads
 * @param options.succession  optional rule: people age and leaders must hand over
 * @param options.autoPlayer  let the game run the player's sect too (for unattended runs)
 */
export function createWorld({ seed = 1, playerSect = 'huashan', succession = false, autoPlayer = false, scenario = 'many', difficulty = 1, custom = null } = {}) {
  applyIdentity(custom);
  const rng = createRng(seed);
  const state = {
    version: SAVE_VERSION,
    seed,
    rng: 0,
    day: 0,
    playerSect,
    options: { succession, autoPlayer, scenario, difficulty, custom },
    sects: {},
    places: {},
    persons: {},
    nextId: 1,
    log: [],
    flags: { editorUsed: false },
    outcome: null,
  };
  for (const place of PLACES) state.places[place.id] = { owner: place.seat, buildings: [], applicants: [], shops: 0 };
  for (const sect of SECTS) {
    state.sects[sect.id] = {
      alive: true,
      silver: ECONOMY.startSilver,
      grain: 80,
      res: Object.fromEntries(RESOURCES.map((key) => [key, 30])),
      /** Finished goods by item id, such as `weapon:sword:3` or `pill:heal1`. */
      stock: {},
      /** Righteous (+) or unorthodox (-), -1000 to 1000. */
      virtue: sect.standing * 300,
      /** Renown, 0 to 1000. */
      renown: 100,
      /** Standing with the court, -100 to 100. */
      court: 0,
      relations: Object.fromEntries(SECTS.filter((other) => other.id !== sect.id).map((other) => [other.id, sect.standing * other.standing * 20])),
      offices: {},
      leaderId: 0,
      manuals: {},
    };
    state.places[sect.seat].buildings = startingBuildings(PLACE_BY_ID[sect.seat], sect);
    const leader = adopt(state, makeLeader(rng, sect.id, 30));
    state.sects[sect.id].leaderId = leader.id;
    // Two elders, three inner and four outer disciples to begin with.
    const starters = [
      [4, 22, 60],
      [4, 20, 58],
      [2, 12, 55],
      [2, 11, 52],
      [2, 10, 50],
      [1, 6, 46],
      [1, 5, 46],
      [1, 4, 44],
      [1, 3, 44],
    ];
    const elders = [...(ELDERS[sect.id] ?? [])];
    for (const [rank, level, quality] of starters) {
      // The two elders are people in their own right, with a name and a face.
      const known = rank >= 4 ? elders.shift() : undefined;
      const person = rollPerson(rng, { quality, lean: PLACE_BY_ID[sect.seat].lean, school: sect.id, place: sect.seat, female: known?.female });
      if (known) Object.assign(person, { name: known.name, age: known.age, portraitId: known.portraitId, origin: '长老' });
      person.rank = rank;
      growTo(person, level);
      const tiers = rank >= 4 ? 3 : rank >= 2 ? 2 : 1;
      for (const klass of new Set([sect.main, 'inner'])) for (let tier = 1; tier <= tiers; tier++) person.arts[commonArt(klass, tier).id] = tier === tiers ? 400 : 700;
      if (rank >= 4) for (const art of sectArts(sect.id).filter((a) => a.tier === 4 && CLASSES[a.klass].combat)) {
        for (let tier = 1; tier <= 3; tier++) person.arts[commonArt(art.klass, tier).id] ??= 600;
        person.arts[art.id] = 400;
      }
      equipFor(person, rank >= 4 ? 3 : rank >= 2 ? 2 : 1);
      person.wheel = autoWheel(person);
      adopt(state, person);
    }
    planJobs(state, sect.id);
  }
  shape(state, scenario, rng);
  state.rng = rng.state;
  note(state, 'start', `承和元年，${SECT_BY_ID[playerSect].name}立派于${PLACE_BY_ID[SECT_BY_ID[playerSect].seat].name}。`);
  return state;
}

/** Rearranges a new world for the way of beginning that was chosen; see SCENARIOS in data/extras.mjs. */
function shape(state, scenario, rng) {
  const player = state.playerSect;
  const recruits = (sectId, count, level) => {
    for (let i = 0; i < count; i++) {
      const person = rollPerson(rng, { quality: 50, school: sectId, place: SECT_BY_ID[sectId].seat });
      person.rank = 1;
      growTo(person, level);
      for (const klass of new Set([SECT_BY_ID[sectId].main, 'inner'])) person.arts[commonArt(klass, 1).id] = 500;
      equipFor(person, 1);
      person.wheel = autoWheel(person);
      adopt(state, person);
    }
  };
  const take = (sectId, count) => {
    for (let i = 0; i < count; i++) {
      const mine = placesOf(state, sectId);
      const next = mine.flatMap((id) => PLACE_BY_ID[id].roads).find((id) => !state.places[id].owner);
      if (!next) return;
      state.places[next].owner = sectId;
      state.places[next].buildings = [['hall', 1], ['board', 1], ['dorm', 1]].map(([kind, level]) => ({ kind, level, xp: 0 }));
    }
  };
  if (scenario === 'sides') {
    for (const sect of SECTS) {
      if (sect.standing < 0) take(sect.id, 1), recruits(sect.id, 5, 8);
      for (const other of SECTS) if (other.id !== sect.id && sect.standing > 0 && other.standing > 0) state.sects[sect.id].relations[other.id] = 60;
    }
  } else if (scenario === 'five') {
    // The player's sect and the four strongest seats nearest the middle of the map stay; the rest give way.
    const keep = new Set([player, ...['shaolin', 'wudang', 'gaibang', 'mingjiao', 'kunlun'].filter((id) => id !== player).slice(0, 4)]);
    for (const sect of SECTS) {
      if (keep.has(sect.id)) continue;
      state.sects[sect.id].alive = false;
      for (const person of membersOf(state, sect.id)) delete state.persons[person.id];
      for (const id of placesOf(state, sect.id)) Object.assign(state.places[id], { owner: null, buildings: [], applicants: [] });
    }
    for (const id of keep) take(id, 2), recruits(id, 6, 8);
  } else if (scenario === 'lone') {
    const books = state.sects[player];
    books.silver = Math.round(books.silver / 2);
    const mine = membersOf(state, player).sort((a, b) => b.rank - a.rank || b.level - a.level);
    for (const person of mine.slice(5)) delete state.persons[person.id];
  }
  for (const sect of SECTS) if (state.sects[sect.id].alive) planJobs(state, sect.id);
}

function adopt(state, person) {
  person.id = state.nextId++;
  state.persons[person.id] = person;
  return person;
}

function note(state, type, text, data = {}) {
  state.log.push({ day: state.day, type, text, ...data });
  if (state.log.length > LOG_LIMIT) state.log.splice(0, state.log.length - LOG_LIMIT);
}

// ---- reading the state ----------------------------------------------------------------------------

export const membersOf = (state, sectId) => Object.values(state.persons).filter((person) => person.school === sectId);
export const residents = (state, placeId) => Object.values(state.persons).filter((person) => person.place === placeId && person.school === state.places[placeId].owner);
export const placesOf = (state, sectId) => Object.keys(state.places).filter((id) => state.places[id].owner === sectId);
export const buildingLevel = (state, placeId, kind) => Math.max(0, ...state.places[placeId].buildings.filter((b) => b.kind === kind).map((b) => b.level));
export const beds = (state, placeId) => state.places[placeId].buildings.filter((b) => b.kind === 'dorm').reduce((sum, b) => sum + BUILDINGS.dorm.beds[b.level], 0);
export const usedCells = (state, placeId) => state.places[placeId].buildings.reduce((sum, b) => sum + BUILDINGS[b.kind].cells, 0);
/** How strong a group is, for the game's own sects to weigh a fight. */
export const strength = (people) => people.reduce((sum, person) => sum + prowess(person), 0);
export const year = (state) => 1 + Math.floor(state.day / DAYS_PER_YEAR);
export const dateText = (state) => `承和${year(state)}年${1 + Math.floor((state.day % DAYS_PER_YEAR) / 30)}月${1 + (state.day % 30)}日`;

/** The ground that suits training an art at a stronghold: its level, or 0. */
function siteLevel(state, placeId, klass) {
  let best = 0;
  for (const building of state.places[placeId].buildings) if (BUILDINGS[building.kind].trains?.includes(klass)) best = Math.max(best, building.level);
  return best;
}

/** Sum of the office bonuses that apply to one kind of work at a stronghold. */
function officeBoost(state, sectId, placeId, kind) {
  let boost = 0;
  for (const [key, holder] of Object.entries(state.sects[sectId].offices)) {
    const [office, where] = key.split('@');
    const spec = OFFICES[office];
    const person = state.persons[holder];
    if (!spec || !person || !spec.boosts.includes(kind)) continue;
    if (spec.scope === 'place' && where !== placeId) continue;
    boost += spec.amount * (0.5 + person.stats.wit / 200);
  }
  return boost;
}

// ---- the player's (and the other sects') choices -----------------------------------------------------

/** Each returns { ok: true } or { ok: false, why }. */
const refuse = (why) => ({ ok: false, why });
const done = (extra = {}) => ({ ok: true, ...extra });

export function setJob(state, personId, job) {
  const person = state.persons[personId];
  if (!person) return refuse('查无此人');
  if (job.kind === 'train' || job.kind === 'seclude') {
    const art = ART_BY_ID[job.art];
    if (!art) return refuse('没有这门武学');
    const needs = unmetNeeds(person, art, heldArts(state, person.school)).filter((need) => !(job.kind === 'seclude' && need === '需闭关领悟'));
    if (needs.length) return refuse(needs.join('；'));
  }
  person.job = { ...job, days: 0 };
  return done();
}

export function buildAvailability(state, sectId, placeId, kind) {
  const spec = BUILDINGS[kind],
    place = state.places[placeId],
    sect = state.sects[sectId];
  if (!spec) return refuse('没有这种建筑');
  if (place.owner !== sectId) return refuse('不是本派据点');
  if (kind !== 'hall' && !buildingLevel(state, placeId, 'hall')) return refuse('需先建正殿');
  if (uniqueBuildings.has(kind) && buildingLevel(state, placeId, kind)) return refuse('已有此建筑');
  if (usedCells(state, placeId) + spec.cells > PLACE_BY_ID[placeId].cells) return refuse('建地不足');
  if (sect.silver < spec.cost) return refuse('银两不足');
  return done();
}

export function build(state, sectId, placeId, kind) {
  const availability = buildAvailability(state, sectId, placeId, kind);
  if (!availability.ok) return availability;
  const place = state.places[placeId], sect = state.sects[sectId];
  sect.silver -= BUILDINGS[kind].cost;
  place.buildings.push({ kind, level: 1, xp: 0 });
  return done();
}

export function upgrade(state, sectId, placeId, index) {
  const place = state.places[placeId],
    building = place.buildings[index],
    sect = state.sects[sectId];
  if (place.owner !== sectId || !building) return refuse('没有这座建筑');
  const spec = BUILDINGS[building.kind];
  if (building.level >= spec.max) return refuse('已是最高等级');
  const cost = spec.cost * (building.level + 1);
  // Workshops also need practice before they can grow.
  if (spec.makes && building.xp < 400 * building.level) return refuse('生产经验不足');
  if (sect.silver < cost) return refuse('银两不足');
  sect.silver -= cost;
  building.level++;
  return done();
}

/** Takes in one of the people waiting at a stronghold's board. */
export function recruit(state, sectId, placeId, index) {
  const place = state.places[placeId];
  if (place.owner !== sectId) return refuse('不是本派据点');
  const person = place.applicants[index];
  if (!person) return refuse('此人已离去');
  if (state.persons[state.sects[sectId].leaderId]?.place !== placeId) return refuse('需掌门亲至面试');
  if (residents(state, placeId).length >= Math.min(beds(state, placeId), ECONOMY.headcountCap)) return refuse('厢房已满');
  place.applicants.splice(index, 1);
  Object.assign(person, { school: sectId, place: placeId });
  adopt(state, person);
  state.sects[sectId].silver += person.fee;
  return done({ person });
}

/** The renown a sect needs before the summit will hear of making it leader of them all. */
export const SUMMIT_RENOWN = 700;
const PERSONAL_LIMIT = 5;
/** Elders a sect may seat before counting its strongholds. */
const ELDER_SEATS = 3;
export function promote(state, personId) {
  const person = state.persons[personId];
  if (!person) return refuse('查无此人');
  const best = Math.max(0, ...Object.entries(person.arts).map(([id, points]) => (ART_BY_ID[id] ? ART_BY_ID[id].tier * 10 + levelOf(points) : 0)));
  if (person.rank === 0 && (person.loyalty < 50 || best < 13)) return refuse('需忠诚五十、一门武学三重');
  if (person.rank === 1 && (person.level < 10 || best < 25)) return refuse('需十级、二阶武学五重');
  if (person.rank === 2) {
    if (person.level < 20 || !person.master) return refuse('需二十级并已拜师');
    if (membersOf(state, person.school).filter((p) => p.rank === 3).length >= PERSONAL_LIMIT) return refuse('亲传名额已满');
  }
  if (person.rank === 3) {
    if (person.level < 30) return refuse('需三十级');
    // A sect seats only so many elders: a few at the head of it and one more for each stronghold it holds.
    const seats = ELDER_SEATS + placesOf(state, person.school).length;
    if (membersOf(state, person.school).filter((p) => p.rank === 4).length >= seats) return refuse(`长老之位已满（${seats} 席）`);
  }
  if (person.rank >= 4) return refuse('已是长老');
  person.rank++;
  person.loyalty = clamp(person.loyalty + 8, 0, 100);
  return done();
}

export function setMaster(state, personId, masterId) {
  const person = state.persons[personId],
    master = state.persons[masterId];
  if (!person || !master || master.school !== person.school || master.rank < 4) return refuse('师父须是本门长老或掌门');
  person.master = masterId;
  return done();
}

export function appoint(state, sectId, office, placeId, personId) {
  const spec = OFFICES[office],
    person = state.persons[personId];
  if (!spec || !person || person.school !== sectId) return refuse('无法任命');
  const offices = state.sects[sectId].offices;
  for (const key of Object.keys(offices)) if (offices[key] === personId) delete offices[key];
  offices[spec.scope === 'place' ? `${office}@${placeId}` : office] = personId;
  return done();
}

/** Sends silver to another sect to warm relations. */
export function gift(state, fromId, toId, silver) {
  const from = state.sects[fromId];
  if (silver <= 0 || from.silver < silver) return refuse('银两不足');
  from.silver -= silver;
  state.sects[toId].silver += silver;
  const warmth = Math.round(silver / 50);
  from.relations[toId] = clamp(from.relations[toId] + warmth, -100, 100);
  state.sects[toId].relations[fromId] = clamp(state.sects[toId].relations[fromId] + warmth, -100, 100);
  return done({ warmth });
}

/** Moves a person to another of the sect's strongholds. */
export function relocate(state, personId, placeId) {
  const person = state.persons[personId];
  if (!person || state.places[placeId]?.owner !== person.school) return refuse('只能调往本派据点');
  person.place = placeId;
  return done();
}

/** Claims an empty stronghold next to one the sect holds; the price is a main hall. */
export function settle(state, sectId, placeId) {
  const place = state.places[placeId];
  if (place.owner) return refuse('此地已有主');
  if (!PLACE_BY_ID[placeId].roads.some((id) => state.places[id].owner === sectId)) return refuse('需与本派据点相邻');
  if (state.sects[sectId].silver < BUILDINGS.hall.cost) return refuse('银两不足');
  state.sects[sectId].silver -= BUILDINGS.hall.cost;
  place.owner = sectId;
  place.buildings = [
    { kind: 'hall', level: 1, xp: 0 },
    { kind: 'board', level: 1, xp: 0 },
    { kind: 'dorm', level: 1, xp: 0 },
  ];
  state.sects[sectId].renown = clamp(state.sects[sectId].renown + 20, 0, 1000);
  note(state, 'settle', `${SECT_BY_ID[sectId].name}在${PLACE_BY_ID[placeId].name}开设分舵。`, { sect: sectId, place: placeId });
  return done();
}

// ---- fighting over a stronghold ---------------------------------------------------------------------

/**
 * Who meets whom when a sect attacks a stronghold: the chosen party against
 * everyone the owner has there (at most ten a side).
 */
export function assaultSides(state, attackerId, placeId, partyIds) {
  const place = state.places[placeId];
  if (!place.owner || place.owner === attackerId) return refuse('无可攻之敌');
  if (!PLACE_BY_ID[placeId].roads.some((id) => state.places[id].owner === attackerId)) return refuse('需与本派据点相邻');
  const party = partyIds.map((id) => state.persons[id]).filter((person) => person?.school === attackerId).slice(0, 10);
  if (!party.length) return refuse('无人出战');
  const guard = residents(state, placeId).sort((a, b) => prowess(b) - prowess(a)).slice(0, 10);
  // Gates and towers stand with the defenders.
  // Each side stands in its formation; talents and house rules add to it, and gates and towers stand with the defenders.
  const attack = formationOf(state, attackerId, party, { attack: modsOf(state, attackerId).attack + spyBoost(state, attackerId, place.owner) });
  const defend = formationOf(state, place.owner, guard, { defense: 0.04 * buildingLevel(state, placeId, 'gate') + modsOf(state, place.owner).defense + focusBoost(state, placeId, 'defense'), attack: 0.03 * buildingLevel(state, placeId, 'tower') });
  return done({ sides: [party, guard], formations: [attack, defend], defender: place.owner });
}

/**
 * Gives silver away in the sect's name: alms, bridges and schools for an
 * upright sect, largesse to its followers for any other. Renown rises, and a
 * sect's name for good or ill deepens the way it already leans.
 */
export function donate(state, sectId) {
  const books = state.sects[sectId];
  if (books.silver < ECONOMY.donation) return refuse('银两不足');
  books.silver -= ECONOMY.donation;
  // Giving makes a good name, but only so good a name: past that, renown has to be earned by deeds.
  if (books.renown < ECONOMY.donationCeiling) books.renown = Math.min(ECONOMY.donationCeiling, books.renown + ECONOMY.donationRenown);
  books.virtue = clamp(books.virtue + (books.virtue < 0 ? -10 : 10), -1000, 1000);
  return done();
}

/** Opens a shop in the town below a stronghold; each brings in silver every ten days. */
export function openShop(state, sectId, placeId) {
  const place = state.places[placeId];
  if (place.owner !== sectId) return refuse('非本派据点');
  if (place.shops >= SHOP_LIMIT) return refuse('此地店铺已满');
  if (state.sects[sectId].silver < ECONOMY.shopCost) return refuse('银两不足');
  state.sects[sectId].silver -= ECONOMY.shopCost;
  place.shops++;
  return done();
}

/** Applies a finished fight for a stronghold to the world. */
export function settleAssault(state, attackerId, placeId, summary, rng) {
  const place = state.places[placeId],
    defenderId = place.owner;
  const attacker = state.sects[attackerId],
    defender = state.sects[defenderId];
  const fallen = [];
  for (const fighter of summary.fighters) {
    const person = state.persons[fighter.id];
    if (!person) continue;
    gainXp(person, fighter.xp);
    person.wounds = clamp(1 - fighter.hpLeft, 0, 1) * 0.5;
    // One in seven of those struck down does not get up again.
    if (fighter.down && rng.chance(0.15)) fallen.push(person);
  }
  // Neither side marches on the other again for two years.
  (attacker.truce ??= {})[defenderId] = state.day + 2 * DAYS_PER_YEAR;
  (defender.truce ??= {})[attackerId] = state.day + 2 * DAYS_PER_YEAR;
  attacker.relations[defenderId] = clamp(attacker.relations[defenderId] - 40, -100, 100);
  defender.relations[attackerId] = clamp(defender.relations[attackerId] - 60, -100, 100);
  const won = summary.winner === 0;
  if (won) {
    // Whoever is left at the stronghold falls back to another of their sect's, or scatters.
    const refuge = placesOf(state, defenderId).find((id) => id !== placeId);
    for (const person of residents(state, placeId)) {
      if (refuge) person.place = refuge;
      else if (person.id !== defender.leaderId) delete state.persons[person.id];
    }
    place.owner = attackerId;
    place.applicants = [];
    // Half of the party stays to hold what it took.
    const party = summary.fighters.filter((fighter) => fighter.side === 0 && !fighter.down && state.persons[fighter.id]);
    for (const fighter of party.slice(0, Math.ceil(party.length / 2))) state.persons[fighter.id].place = placeId;
    attacker.renown = clamp(attacker.renown + 60, 0, 1000);
    defender.renown = clamp(defender.renown - 40, 0, 1000);
    // Where there was a library, some of its books go with the victors.
    const looted = buildingLevel(state, placeId, 'library') ? lootManuals(state, attackerId, defenderId, rng) : [];
    note(state, 'conquer', `${SECT_BY_ID[attackerId].name}攻下${PLACE_BY_ID[placeId].name}${looted.length ? `，得秘笈${looted.map((art) => `《${art.name}》`).join('')}` : ''}。`, { sect: attackerId, place: placeId });
  } else {
    defender.renown = clamp(defender.renown + 30, 0, 1000);
    note(state, 'repel', `${SECT_BY_ID[defenderId].name}在${PLACE_BY_ID[placeId].name}击退${SECT_BY_ID[attackerId].name}。`, { sect: defenderId, place: placeId });
  }
  for (const person of fallen) bury(state, person);
  if (!placesOf(state, defenderId).length) dissolve(state, defenderId, attackerId);
  return { won, fallen: fallen.map((person) => person.name) };
}

function bury(state, person) {
  const sect = state.sects[person.school];
  delete state.persons[person.id];
  note(state, 'death', `${person.name}战殁。`, { sect: person.school });
  if (sect && sect.leaderId === person.id) succeed(state, person.school);
}

/** A sect whose leader is gone passes to its best personal disciple or elder, if it has one. */
function succeed(state, sectId) {
  const sect = state.sects[sectId];
  const heir = membersOf(state, sectId)
    .filter((person) => person.rank >= 3)
    .sort((a, b) => prowess(b) - prowess(a))[0];
  if (!heir) return dissolve(state, sectId, null);
  heir.rank = 5;
  sect.leaderId = heir.id;
  note(state, 'succession', `${heir.name}继任${SECT_BY_ID[sectId].name}掌门。`, { sect: sectId });
}

function dissolve(state, sectId, byId) {
  const sect = state.sects[sectId];
  if (!sect.alive) return;
  sect.alive = false;
  for (const person of membersOf(state, sectId)) delete state.persons[person.id];
  for (const id of placesOf(state, sectId)) (state.places[id].owner = byId), (state.places[id].applicants = []);
  note(state, 'fall', `${SECT_BY_ID[sectId].name}就此除名江湖。`, { sect: sectId });
  if (sectId === state.playerSect) state.outcome = { result: 'lost', day: state.day };
}

/** The whole of an attack settled at once, for the game's own sects and for quick fights. */
export function assault(state, attackerId, placeId, partyIds, rng) {
  const prepared = assaultSides(state, attackerId, placeId, partyIds);
  if (!prepared.ok) return prepared;
  const summary = resolveBattle({ sides: prepared.sides, formations: prepared.formations, seed: rng.int(1, 1e9) });
  return done({ summary, ...settleAssault(state, attackerId, placeId, summary, rng) });
}

// ---- the game's own sects ------------------------------------------------------------------------------

/** Gives everyone in a sect something sensible to do. */
export function planJobs(state, sectId) {
  const held = heldArts(state, sectId);
  const sect = SECT_BY_ID[sectId];
  for (const placeId of placesOf(state, sectId)) {
    const people = residents(state, placeId).sort((a, b) => b.rank - a.rank || prowess(b) - prowess(a));
    const yields = state.places[placeId].buildings.filter((b) => BUILDINGS[b.kind].yields);
    const workshops = state.places[placeId].buildings.filter((b) => BUILDINGS[b.kind].makes);
    // The more a sect cares about building, the more of its junior disciples work; a sect short of silver sends more.
    const wages = membersOf(state, sectId).reduce((sum, person) => sum + RANKS[person.rank].pay, 0);
    const pressed = state.sects[sectId].silver < wages * 3 ? 0.3 : 0;
    let workers = Math.round(people.filter((p) => p.rank <= 2).length * Math.min(0.9, 0.3 + 0.08 * sect.temper.build + pressed));
    let pit = 0;
    for (const person of [...people].reverse()) {
      if (person.rank <= 2 && workers > 0 && (yields.length || workshops.length)) {
        workers--;
        const turn = pit++;
        if (workshops.length && turn % 4 === 3) {
          const shop = workshops[turn % workshops.length];
          person.job = { kind: 'craft', make: BUILDINGS[shop.kind].makes, days: 0 };
        } else if (yields.length) person.job = { kind: 'gather', res: BUILDINGS[yields[turn % yields.length].kind].yields, days: 0 };
        continue;
      }
      // Everyone else trains: their sect's classes first, then inner strength.
      const options = learnableArts(person, held).filter((art) => art.tier < 5);
      const wanted =
        options.filter((art) => art.sect).sort((a, b) => b.tier - a.tier)[0] ??
        options.filter((art) => art.klass === sect.main).sort((a, b) => b.tier - a.tier)[0] ??
        options.filter((art) => art.klass === 'inner').sort((a, b) => b.tier - a.tier)[0] ??
        options[0];
      person.job = wanted ? { kind: 'train', art: wanted.id, days: 0 } : { kind: 'rest' };
    }
  }
}

function runSect(state, sectId, rng) {
  const sect = SECT_BY_ID[sectId],
    books = state.sects[sectId];
  // The player's sect is the player's to run, unless they hand it over.
  if (sectId === state.playerSect && !state.options.autoPlayer) return;
  planJobs(state, sectId);
  for (const placeId of placesOf(state, sectId)) {
    const place = state.places[placeId];
    // Take in newcomers while there is room.
    const wages = membersOf(state, sectId).reduce((sum, person) => sum + RANKS[person.rank].pay, 0);
    while (place.applicants.length && books.silver > wages * 4 && residents(state, placeId).length < Math.min(beds(state, placeId), ECONOMY.headcountCap)) {
      const person = place.applicants.shift();
      Object.assign(person, { school: sectId, place: placeId });
      adopt(state, person);
      books.silver += person.fee;
    }
    // Spend spare silver: beds first, then training grounds, then upgrades.
    const full = residents(state, placeId).length >= beds(state, placeId);
    if (books.silver > 1200 && full && build(state, sectId, placeId, 'dorm').ok) continue;
    if (books.silver > 2500) {
      const missing = ['yard', 'range', 'cell', 'mess', 'store', 'gate', 'clinic'].find((kind) => !buildingLevel(state, placeId, kind));
      if (missing) build(state, sectId, placeId, missing);
      else {
        const index = place.buildings.findIndex((b) => b.level < BUILDINGS[b.kind].max && BUILDINGS[b.kind].cost * (b.level + 1) < books.silver * 0.4);
        if (index >= 0) upgrade(state, sectId, placeId, index);
      }
    }
  }
  for (const person of membersOf(state, sectId)) {
    if (person.rank < 3 && !person.master && person.rank >= 2) person.master = books.leaderId;
    promote(state, person.id);
    if (!person.wheel.length || rng.chance(0.2)) person.wheel = autoWheel(person);
    if (person.gear.armor < Math.min(5, 1 + Math.floor(person.level / 8)) && books.silver > 800) {
      const grade = Math.min(5, 1 + Math.floor(person.level / 8));
      books.silver -= GRADES[grade].cost;
      equipFor(person, grade);
    }
  }
  // Reach outward: open ground first, then a weaker neighbour it dislikes.
  if (!rng.chance(sect.temper.expand / 25)) return;
  const frontier = new Set();
  for (const placeId of placesOf(state, sectId)) for (const next of PLACE_BY_ID[placeId].roads) if (state.places[next].owner !== sectId) frontier.add(next);
  const open = [...frontier].filter((id) => !state.places[id].owner);
  if (open.length && books.silver >= BUILDINGS.hall.cost + 500) {
    const target = rng.pick(open);
    if (settle(state, sectId, target).ok) {
      const movers = membersOf(state, sectId).filter((person) => person.rank <= 2).slice(0, 3);
      for (const person of movers) person.place = target;
    }
    return;
  }
  const army = membersOf(state, sectId)
    .filter((person) => person.wounds < 0.2)
    .sort((a, b) => prowess(b) - prowess(a))
    .slice(0, 10);
  for (const target of [...frontier].filter((id) => state.places[id].owner)) {
    const foe = state.places[target].owner;
    // Ambition grows with the years: in time a sect turns even on those it is on fair terms with.
    if (books.relations[foe] > 20 - sect.temper.expand * 10 + year(state) * 3 || (books.truce?.[foe] ?? 0) > state.day) continue;
    // A player is left in peace for the first years, fewer the harder the game.
    if (foe === state.playerSect && !state.options.autoPlayer && state.day < (DIFFICULTIES[state.options.difficulty ?? 1]?.peace ?? 3) * DAYS_PER_YEAR) continue;
    const guard = residents(state, target).sort((a, b) => prowess(b) - prowess(a)).slice(0, 10);
    if (strength(army) > strength(guard) * (1.6 - sect.temper.expand * 0.08)) {
      // Where the column set out from, for whoever is watching the map.
      const from = PLACE_BY_ID[target].roads.find((id) => state.places[id].owner === sectId);
      state.marches = [...(state.marches ?? []).slice(-5), { day: state.day, by: sectId, from, to: target }];
      // A player who is watching defends in person; the attack waits at the gate for them.
      if (foe === state.playerSect && state.options.interactive && !state.options.autoPlayer) {
        if (!state.pending) state.pending = { kind: 'siege', attacker: sectId, place: target, party: army.map((person) => person.id) };
        return;
      }
      assault(state, sectId, target, army.map((person) => person.id), rng);
      return;
    }
  }
}

// ---- time ------------------------------------------------------------------------------------------------

function workDay(state, person, rng) {
  const sectId = person.school,
    books = state.sects[sectId],
    placeId = person.place;
  const mods = modsOf(state, sectId);
  if (person.wounds > 0) person.wounds = Math.max(0, person.wounds - 0.02 - mods.heal - 0.01 * buildingLevel(state, placeId, 'clinic'));
  const job = person.job ?? { kind: 'rest' };
  job.days = (job.days ?? 0) + 1;
  const diligence = person.traits.reduce((sum, key) => sum + (TRAITS[key]?.train ?? 0), 0) + (person.loyalty < 30 ? -0.5 : 0);
  if (job.kind === 'train') {
    const art = ART_BY_ID[job.art];
    if (!art || unmetNeeds(person, art).length) return void (person.job = { kind: 'rest' });
    const master = state.persons[person.master];
    const tutor = master ? Math.min(0.3, levelOf(master.arts[art.id] ?? 0) * 0.03) : 0;
    const boost = officeBoost(state, sectId, placeId, 'train') + diligence + mods.train + focusBoost(state, placeId, 'train');
    let points = trainingRate(person, art, siteLevel(state, placeId, art.klass), tutor, boost) * WORK_WATCHES;
    // A manual in the library speeds the art it describes.
    const manual = books.manuals[art.id];
    if (manual && buildingLevel(state, placeId, 'library') && levelOf(person.arts[art.id] ?? 0) < manual - 2) points += MANUAL_POINTS / art.tier;
    practise(person, art, points);
    // Harder arts teach more, and a master's eye more again.
    gainXp(person, 2 * WORK_WATCHES * (1 + TRAIN_XP.perTier * (art.tier - 1)) * (master ? 1 + TRAIN_XP.master : 1));
  } else if (job.kind === 'seclude') {
    const art = ART_BY_ID[job.art];
    if (!art || person.insights.includes(art.id)) return void (person.job = { kind: 'rest' });
    const chance = (person.stats.wit / 2000) * (1 + mods.insight) + (job.pill ? PILLS.breach.effect.insight : 0);
    if (job.days >= 60 || rng.chance(chance)) {
      person.insights.push(art.id);
      person.job = { kind: 'train', art: art.id, days: 0 };
      note(state, 'insight', `${person.name}闭关${job.days}日，悟出${art.name}。`, { sect: sectId, person: person.id });
    }
  } else if (job.kind === 'gather') {
    const grade = PLACE_BY_ID[placeId].resources[job.res] ?? 0;
    const pit = state.places[placeId].buildings.find((b) => BUILDINGS[b.kind].yields === job.res);
    if (!pit || !grade) return void (person.job = { kind: 'rest' });
    const boost = officeBoost(state, sectId, placeId, 'gather') + diligence + mods.gather + focusBoost(state, placeId, 'gather');
    books.res[job.res] += (ECONOMY.gatherPerXun / DAYS_PER_XUN) * (grade / 2) * (1 + 0.1 * (pit.level - 1)) * (1 + boost);
    person.used.arm = (person.used.arm ?? 0) + 4;
    gainXp(person, 4);
  } else if (job.kind === 'craft') {
    const shop = state.places[placeId].buildings.find((b) => BUILDINGS[b.kind].makes === job.make);
    if (!shop) return void (person.job = { kind: 'rest' });
    const feed = job.make === 'pill' ? 'herb' : job.make === 'weapon' ? 'iron' : 'wood';
    const used = Math.min(books.res[feed], 3);
    books.res[feed] -= used;
    const worth = used * ECONOMY.craftMarkup * (1 + officeBoost(state, sectId, placeId, job.make === 'pill' ? 'pill' : 'forge') + diligence + mods.craft + focusBoost(state, placeId, 'craft'));
    shop.xp += worth;
    // What the workshops finish is kept as goods until the ten-day reckoning, when it is sold.
    books.goods = (books.goods ?? 0) + worth;
    gainXp(person, 4);
  } else if (job.kind === 'travel') {
    // On the road: quick to learn from, with a chance of a wound or a find, and home again after a month.
    gainXp(person, ROAD.xp);
    if (rng.chance(ROAD.hurt)) person.wounds = clamp((person.wounds ?? 0) + 0.2, 0, 0.8);
    if (rng.chance(ROAD.find)) {
      const key = rng.pick(['arm', 'waist', 'leg', 'nei', 'agi']);
      person.stats[key] = Math.min(300, person.stats[key] + 2);
      books.silver += 20;
    }
    if (job.days >= ROAD.days) person.job = { kind: 'rest' };
  } else if (job.kind === 'patrol' || job.kind === 'extort') {
    const sign = job.kind === 'patrol' ? 1 : -1;
    if (rng.chance(0.2)) books.virtue = clamp(books.virtue + 2 * sign, -1000, 1000);
    if (sign < 0) books.silver += 4;
    books.renown = clamp(books.renown + 0.05, 0, 1000);
    gainXp(person, 6);
  }
}

function endOfXun(state, rng) {
  for (const [sectId, books] of Object.entries(state.sects)) {
    if (!books.alive) continue;
    const members = membersOf(state, sectId);
    // Wages and grain. Short pay hurts loyalty below.
    const wages = Math.round(members.reduce((sum, person) => sum + RANKS[person.rank].pay, 0) * (1 - modsOf(state, sectId).wages));
    const paid = books.silver >= wages;
    books.silver = Math.max(0, books.silver - wages);
    const grain = members.length * ECONOMY.grainPerXun;
    const villages = placesOf(state, sectId).reduce((sum, id) => sum + PLACE_BY_ID[id].villages, 0);
    books.grain += villages * ECONOMY.villageGrain - grain;
    // Villages pay tribute, admirers send offerings, and raw goods beyond a reserve are sold.
    // The sects the game runs are better or worse off by the difficulty chosen.
    const ease = sectId === state.playerSect && !state.options.autoPlayer ? 1 : 1 + (DIFFICULTIES[state.options.difficulty ?? 1]?.income ?? 0);
    books.silver += (villages * ECONOMY.villageTribute + books.renown * ECONOMY.offeringPerRenown) * ease;
    for (const key of RESOURCES)
      if (books.res[key] > ECONOMY.reserve) (books.silver += books.res[key] - ECONOMY.reserve), (books.res[key] = ECONOMY.reserve);
    if (books.grain < 0) (books.silver = Math.max(0, books.silver + books.grain * ECONOMY.grainPrice)), (books.grain = 0);
    for (const placeId of placesOf(state, sectId)) books.silver += state.places[placeId].shops * rng.int(...ECONOMY.shopIncome);
    books.silver += tradeRoutes(state, sectId).reduce((sum, route) => sum + route.income, 0);
    // Raw stuff becomes goods in the workshops, and goods become silver: at the gate for what they are
    // worth, or through the sect's own shops, each of which can move so much and gets a better price.
    const goods = books.goods ?? 0,
      shops = placesOf(state, sectId).reduce((sum, placeId) => sum + state.places[placeId].shops, 0),
      retail = Math.min(goods, shops * ECONOMY.shopMoves);
    // A market can take only so much: what a sect sells at the gate beyond that fetches less.
    const atGate = goods - retail,
      glut = Math.max(0, atGate - ECONOMY.marketDepth);
    books.silver += goods + retail * ECONOMY.shopPremium - glut * (1 - ECONOMY.glutPrice);
    books.sold = { goods: Math.round(goods), retail: Math.round(retail), glut: Math.round(glut) };
    books.goods = 0;

    // A stronghold holds only so many. When a sect that has lost ground crowds into what it has left,
    // those with the least standing are sent on their way.
    for (const placeId of placesOf(state, sectId)) {
      const here = residents(state, placeId);
      const excess = here.length - ECONOMY.headcountCap;
      if (excess <= 0) continue;
      const leaving = here.filter((person) => person.id !== books.leaderId).sort((a, b) => a.rank - b.rank || a.loyalty - b.loyalty).slice(0, excess);
      for (const person of leaving) delete state.persons[person.id];
      note(state, 'desert', `${PLACE_BY_ID[placeId].name}人满为患，${SECT_BY_ID[sectId].name}遣散了 ${leaving.length} 人。`, { sect: sectId, place: placeId });
    }

    for (const person of members) {
      if (person.id === books.leaderId) continue;
      const crowded = residents(state, person.place).length > beds(state, person.place);
      let change = (paid ? 1 : -3) + (crowded ? -2 : 1) + (person.master ? 1 : 0);
      const kind = person.job?.kind;
      change += kind === 'train' || kind === 'seclude' ? 2 : person.rank === 0 ? 0 : -1;
      for (const key of person.traits) {
        const trait = TRAITS[key];
        change += trait.loyalty ?? 0;
        if (trait.wants === 'train' && kind === 'train') change += 1;
        if (trait.wants === 'pay' && !paid) change -= 2;
        if (trait.wants === 'rank' && person.rank < 2 && person.level >= 12) change -= 1;
      }
      change += officeBoost(state, sectId, person.place, 'morale') * 5 + buildingLevel(state, person.place, 'mess') * 0.5;
      person.loyalty = clamp(person.loyalty + change, 0, 100);
      // Renown keeps people a little longer than their mood alone would.
      if (person.loyalty < 15 - books.renown / 200 && rng.chance(0.2)) {
        delete state.persons[person.id];
        note(state, 'desert', `${person.name}不辞而别。`, { sect: sectId });
      }
    }
    // People come to the boards; the better known the sect, the better they are.
    for (const placeId of placesOf(state, sectId)) {
      const place = state.places[placeId];
      if (!buildingLevel(state, placeId, 'board')) continue;
      place.applicants = place.applicants.filter(() => rng.chance(0.6));
      const quality = 40 + books.renown / 25 + Math.abs(books.virtue) / 50;
      const arrivals = rng.chance(0.15 + books.renown / 3000 + modsOf(state, sectId).recruit) ? 1 + (rng.chance(0.2) ? 1 : 0) : 0;
      for (let i = 0; i < arrivals && place.applicants.length < 4; i++) {
        const comer = rollPerson(rng, { quality, lean: PLACE_BY_ID[placeId].lean, place: placeId });
        // One in eight comes already trained in something, and a few of those well enough to teach it.
        if (rng.chance(GIFTED_CHANCE)) {
          const art = commonArt(rng.pick(CLASS_KEYS), rng.chance(0.25) ? 2 : 1);
          if (art.tier === 2) comer.arts[commonArt(art.klass, 1).id] = 600;
          comer.arts[art.id] = rng.int(3, 7) * 100;
        }
        place.applicants.push(comer);
      }
    }
    for (const other of Object.keys(books.relations)) books.relations[other] += Math.sign(SECT_BY_ID[sectId].standing * SECT_BY_ID[other].standing * 20 - books.relations[other]) * 0.5;
  }
  for (const sect of SECTS) if (state.sects[sect.id].alive) runSect(state, sect.id, rng);
  xunOfSpies(state, rng);
  xunOfJianghu(state, rng);
}

function endOfYear(state, rng) {
  for (const person of Object.values(state.persons)) {
    person.age++;
    // The optional rule: the old may pass away, and a sect must have an heir.
    if (state.options.succession && person.age > 72 && rng.chance((person.age - 72) * 0.06)) {
      note(state, 'death', `${person.name}寿终。`, { sect: person.school });
      const wasLeader = state.sects[person.school]?.leaderId === person.id;
      delete state.persons[person.id];
      if (wasLeader) succeed(state, person.school);
    }
  }
  yearOfJianghu(state);
  revive(state, rng);
  // A name fades unless deeds keep it up: each year a sect loses a share of what it has above the ordinary.
  for (const books of Object.values(state.sects)) if (books.alive && books.renown > ECONOMY.renownRest) books.renown -= (books.renown - ECONOMY.renownRest) * ECONOMY.renownFade;
  // The sects the game runs keep their people fitted out and their meridians open as the player can,
  // so that what a player builds up over the years is matched and not simply out of reach.
  for (const sect of SECTS) {
    const books = state.sects[sect.id];
    if (!books.alive || (sect.id === state.playerSect && !state.options.autoPlayer)) continue;
    // They collect arts as a player does, a book a year when they can afford it: their second class first.
    const lacking = lackingArts(state, sect.id);
    const wanted = lacking.find((art) => art.klass === sect.second) ?? lacking.find((art) => art.tier === 1) ?? lacking[0];
    if (wanted && wanted.tier <= 3 && books.silver > BOOK_PRICE[wanted.tier] * 3 + ECONOMY.reserve * 10) {
      books.silver -= BOOK_PRICE[wanted.tier];
      addManual(state, sect.id, wanted.id);
    }
    for (const person of membersOf(state, sect.id).sort((a, b) => b.rank - a.rank)) {
      const offer = gearOffer(state, person.id);
      if (offer.ok && books.silver > offer.silver * 4 + ECONOMY.reserve * 10 && books.res.iron >= offer.iron) upgradeGear(state, person.id);
      if (innerLevels(person) >= meridianNeed(person)) openMeridian(state, person.id, rng.chance(0.5) ? 'a' : 'b');
    }
    // A named weapon in the armoury goes to the highest of them who can wield it.
    for (const relicId of books.relics ?? []) {
      if (Object.values(state.persons).some((person) => person.gear.weapon?.relic === relicId)) continue;
      for (const person of membersOf(state, sect.id).sort((a, b) => b.rank - a.rank)) if (!person.gear.weapon?.relic && giveRelic(state, person.id, relicId).ok) break;
    }
  }
  // A sect with silver to spare opens a shop where it has room for one.
  for (const sect of SECTS) {
    const books = state.sects[sect.id];
    if (!books.alive || (sect.id === state.playerSect && !state.options.autoPlayer) || books.silver < ECONOMY.shopCost * 3) continue;
    const room = placesOf(state, sect.id).find((placeId) => state.places[placeId].shops < SHOP_LIMIT);
    if (room) openShop(state, sect.id, room);
    // What it still cannot use, it gives away for its name's sake.
    while (books.silver > ECONOMY.donation * 12) donate(state, sect.id);
  }
  // Every fourth year the sects meet; one known and liked widely enough is named leader of them all.
  if (year(state) % 4 === 1 && year(state) > 1) {
    for (const sect of SECTS) {
      const books = state.sects[sect.id];
      if (!books.alive || books.renown < SUMMIT_RENOWN) continue;
      const others = SECTS.filter((other) => other.id !== sect.id && state.sects[other.id].alive);
      const backers = others.filter((other) => state.sects[other.id].relations[sect.id] >= 40).length;
      if (others.length && backers >= Math.ceil((others.length * 2) / 3)) {
        note(state, 'summit', `武林大会推举${sect.name}为盟主。`, { sect: sect.id });
        if (!state.outcome) state.outcome = { result: sect.id === state.playerSect ? 'won-summit' : 'lost', day: state.day, by: sect.id };
      }
    }
  }
}

/**
 * Late in a game a fallen sect's survivors may gather again on open ground,
 * so the map does not empty as the years go by.
 */
function revive(state, rng) {
  if (year(state) < 6 || !rng.chance(0.25)) return;
  const fallen = SECTS.filter((sect) => !state.sects[sect.id].alive && sect.id !== state.playerSect);
  const open = PLACES.filter((place) => !state.places[place.id].owner);
  if (!fallen.length || !open.length) return;
  const sect = rng.pick(fallen),
    home = rng.pick(open),
    books = state.sects[sect.id];
  Object.assign(books, { alive: true, silver: 1500, grain: 60, renown: 60, offices: {} });
  const place = state.places[home.id];
  place.owner = sect.id;
  place.buildings = [['hall', 1], ['board', 1], ['dorm', 1], ['dorm', 1], ['yard', 1]].map(([kind, level]) => ({ kind, level, xp: 0 }));
  const level = 10 + year(state);
  for (let i = 0; i < 8; i++) {
    const person = rollPerson(rng, { quality: 55, lean: home.lean, school: sect.id, place: home.id });
    person.rank = i === 0 ? 5 : i < 3 ? 4 : 2;
    growTo(person, Math.min(40, level + (i === 0 ? 8 : i < 3 ? 4 : 0)));
    for (const klass of new Set([sect.main, 'inner'])) for (let tier = 1; tier <= 3; tier++) person.arts[commonArt(klass, tier).id] = 600;
    if (i < 3) for (const art of sectArts(sect.id).filter((a) => a.tier === 4 && CLASSES[a.klass].combat)) person.arts[art.id] = 400;
    equipFor(person, 3);
    person.wheel = autoWheel(person);
    adopt(state, person);
    if (i === 0) books.leaderId = person.id;
  }
  planJobs(state, sect.id);
  note(state, 'start', `${sect.name}残部在${home.name}重立山门。`, { sect: sect.id, place: home.id });
}

/** Moves the world on by one day. */
export function advanceDay(state) {
  if (state.outcome) return state;
  const rng = createRng(1);
  rng.state = state.rng;
  state.day++;
  for (const person of Object.values(state.persons)) workDay(state, person, rng);
  if (state.day % DAYS_PER_XUN === 0) endOfXun(state, rng);
  if (state.day % DAYS_PER_YEAR === 0) endOfYear(state, rng);
  const alive = SECTS.filter((sect) => state.sects[sect.id].alive);
  if (!state.outcome && alive.length === 1) state.outcome = { result: alive[0].id === state.playerSect ? 'won-conquest' : 'lost', day: state.day, by: alive[0].id };
  state.rng = rng.state;
  return state;
}

/** A sect's books in one line each, for the ledger screen and for checks. */
/**
 * The roads a sect trades along: those joining two of its own strongholds,
 * and those leading to the stronghold of a sect it is on good terms with.
 * Each is `{ from, to, kind: 'own' | 'ally', income }`, income being silver every ten days.
 */
export function tradeRoutes(state, sectId) {
  const routes = [];
  for (const from of placesOf(state, sectId))
    for (const to of PLACE_BY_ID[from].roads) {
      const owner = state.places[to].owner;
      if (owner === sectId) {
        if (from < to) routes.push({ from, to, kind: 'own', income: ECONOMY.routeIncome + ECONOMY.routeShopBonus * (state.places[from].shops + state.places[to].shops) });
      } else if (owner && state.sects[sectId].relations[owner] >= ECONOMY.allyRelation) routes.push({ from, to, kind: 'ally', income: ECONOMY.allyRouteIncome });
    }
  return routes;
}

export function ledger(state, sectId) {
  const members = membersOf(state, sectId);
  return {
    members: members.length,
    places: placesOf(state, sectId).length,
    silver: Math.round(state.sects[sectId].silver),
    wages: members.reduce((sum, person) => sum + RANKS[person.rank].pay, 0),
    trade: tradeRoutes(state, sectId).reduce((sum, route) => sum + route.income, 0),
    strength: strength(members),
    renown: Math.round(state.sects[sectId].renown),
    virtue: Math.round(state.sects[sectId].virtue),
    topHp: Math.max(0, ...members.map(hpMax)),
  };
}

export { WATCHES_PER_DAY };
