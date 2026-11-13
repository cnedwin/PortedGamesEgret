// More things a leader can do: fit people out, hand down named weapons, make
// and take pills, write manuals, found an art, open meridians, give a branch
// a speciality, plant a spy, and send someone up on the duelling stage.
//
// Each action returns `{ ok: true }` or `{ ok: false, why }`, like those in
// world.mjs, and changes nothing when it refuses.
import { ART_BY_ID, CLASSES, MOVE_LEVELS, levelOf, registerArt } from '../data/arts.mjs';
import { FOCUSES, MERIDIANS, RELIC_BY_ID, RELICS } from '../data/extras.mjs';
import { GRADES, PILLS } from '../data/goods.mjs';
import { STAT_CAP, autoWheel, bestCombatArt, equipFor, gainXp, growTo, rollPerson } from './persons.mjs';
import { clamp } from './rng.mjs';

const refuse = (why) => ({ ok: false, why });
const done = (more = {}) => ({ ok: true, ...more });
const levelIn = (state, sectId, kind) => Math.max(0, ...Object.values(state.places).filter((place) => place.owner === sectId).flatMap((place) => place.buildings.filter((b) => b.kind === kind).map((b) => b.level)));
const note = (state, type, text, sect) => state.log.push({ day: state.day, type, text, sect });

// ---- gear, named weapons and pills ---------------------------------------------------------------------

/** What the next grade of gear would cost a person, or why they cannot have it. */
export function gearOffer(state, personId) {
  const person = state.persons[personId];
  const next = (person?.gear.armor ?? 0) + 1;
  if (!person || next > 6) return refuse('已是可造之极');
  if (levelIn(state, person.school, 'forge') < next) return refuse(`需${next}级铸剑坊`);
  return done({ grade: next, silver: GRADES[next].cost, iron: 5 * next });
}

/** Makes a person the next grade of weapon and robe. A named weapon is kept. */
export function upgradeGear(state, personId) {
  const offer = gearOffer(state, personId);
  if (!offer.ok) return offer;
  const person = state.persons[personId],
    books = state.sects[person.school];
  if (books.silver < offer.silver || books.res.iron < offer.iron) return refuse('银两或铁矿不足');
  books.silver -= offer.silver;
  books.res.iron -= offer.iron;
  const relic = person.gear.weapon?.relic ? person.gear.weapon : null;
  equipFor(person, offer.grade);
  if (relic) person.gear.weapon = relic;
  return done();
}

/** A named weapon nobody holds yet comes into a sect's keeping. Returns it, or null when all are found. */
export function findRelic(state, sectId, rng) {
  const held = new Set(Object.values(state.sects).flatMap((books) => books.relics ?? []));
  const free = RELICS.filter((relic) => !held.has(relic.id));
  if (!free.length) return null;
  const relic = rng.pick(free);
  (state.sects[sectId].relics ??= []).push(relic.id);
  note(state, 'event', `神兵「${relic.name}」现世，归于本派：${relic.tale}。`, sectId);
  return relic;
}

/** Hands a named weapon to someone whose best art uses that kind of weapon. */
export function giveRelic(state, personId, relicId) {
  const person = state.persons[personId],
    relic = RELIC_BY_ID[relicId];
  if (!person || !relic || !state.sects[person.school].relics?.includes(relicId)) return refuse('本派没有这件神兵');
  const art = bestCombatArt(person);
  if (!art || CLASSES[art.klass].weapon !== relic.slot) return refuse('此人所长的武学用不上这件兵器');
  // Whoever held it before goes back to an ordinary weapon.
  for (const other of Object.values(state.persons)) if (other.gear.weapon?.relic === relicId) other.gear.weapon = { slot: relic.slot, grade: other.gear.armor || 1 };
  person.gear.weapon = { slot: relic.slot, grade: 7, power: relic.power, relic: relicId };
  return done();
}

/** Makes one pill in the sect's still, from herbs. */
export function makePill(state, sectId, pillId) {
  const pill = PILLS[pillId],
    books = state.sects[sectId];
  if (!pill) return refuse('没有这种丹药');
  if (levelIn(state, sectId, 'still') < pill.needs) return refuse(`需${pill.needs}级丹房`);
  const herb = Math.ceil(pill.cost / 6);
  if (books.res.herb < herb) return refuse(`药材不足（需 ${herb}）`);
  books.res.herb -= herb;
  books.stock['pill:' + pillId] = (books.stock['pill:' + pillId] ?? 0) + 1;
  return done();
}

/** Gives a person a pill from the sect's stock. */
export function usePill(state, personId, pillId) {
  const person = state.persons[personId],
    pill = PILLS[pillId];
  const books = state.sects[person?.school];
  const key = 'pill:' + pillId;
  if (!person || !pill || !(books.stock[key] > 0)) return refuse('库中没有这种丹药');
  const effect = pill.effect;
  if (effect.stat) {
    if ((person.bones ?? 0) >= (pill.limit ?? 20)) return refuse('此丹对其已无效');
    person.bones = (person.bones ?? 0) + 1;
    for (const stat of ['arm', 'waist', 'leg', 'nei']) person.stats[stat] = Math.min(STAT_CAP[stat], person.stats[stat] + effect.stat);
  } else if (effect.hp) {
    if (!(person.wounds > 0)) return refuse('此人无伤');
    person.wounds = Math.max(0, person.wounds - effect.hp / 1500);
  } else if (effect.nei) gainXp(person, effect.nei / 2);
  else if (effect.cure) person.wounds = Math.max(0, (person.wounds ?? 0) - 0.05);
  else if (effect.insight) {
    if (person.job?.kind !== 'seclude') return refuse('此丹须在闭关时服用');
    person.job.pill = true;
  } else if (effect.aptitude) {
    const low = Object.entries(person.apt).sort((a, b) => a[1] - b[1])[0][0];
    person.apt[low] = Math.min(100, person.apt[low] + effect.aptitude);
  }
  if (--books.stock[key] <= 0) delete books.stock[key];
  return done();
}

// ---- manuals, new arts and meridians -------------------------------------------------------------------

/** Writes down an art one has taken to the seventh level, for the library. */
export function writeManual(state, personId, artId) {
  const person = state.persons[personId],
    level = levelOf(person?.arts[artId] ?? 0);
  if (!person || level < 7) return refuse('需将此武学练至七重');
  const place = state.places[person.place];
  if (!place.buildings.some((b) => b.kind === 'library')) return refuse('此处没有藏经阁');
  const manuals = state.sects[person.school].manuals;
  if ((manuals[artId] ?? 0) >= level) return refuse('阁中已有不逊于此的抄本');
  manuals[artId] = level;
  note(state, 'insight', `${person.name}著成《${ART_BY_ID[artId].name}》秘笈，藏于阁中。`, person.school);
  return done();
}

/** How many arts of its own a sect may found. */
export const CUSTOM_ART_LIMIT = 3;

/**
 * Founds an art from three moves its founder already knows.
 * @param picks three strings `artId:moveIndex`; all must use the same kind of weapon
 */
export function createArt(state, personId, name, picks) {
  const person = state.persons[personId];
  if (!person || person.rank < 3) return refuse('需亲传以上方可自创武学');
  const title = String(name ?? '').trim().slice(0, 8);
  if (!title) return refuse('请为武学起名');
  const customs = (state.customArts ??= []);
  if (customs.filter((art) => art.sect === person.school).length >= CUSTOM_ART_LIMIT) return refuse(`每派至多自创 ${CUSTOM_ART_LIMIT} 门`);
  if (customs.some((art) => art.name === title) || Object.values(ART_BY_ID).some((art) => art.name === title)) return refuse('已有同名武学');
  if (picks.length !== 3 || new Set(picks).size !== 3) return refuse('需选三个不同的招式');
  const moves = [];
  for (const pick of picks) {
    const [artId, slot] = pick.split(':');
    const art = ART_BY_ID[artId],
      move = art?.moves[Number(slot)];
    if (!move || levelOf(person.arts[artId] ?? 0) < move.level) return refuse('有招式尚未学会');
    moves.push({ art, move });
  }
  const weapon = CLASSES[moves[0].art.klass].weapon;
  if (!CLASSES[moves[0].art.klass].combat || moves.some(({ art }) => CLASSES[art.klass].weapon !== weapon)) return refuse('三招须用同一种兵器（或同为空手）');
  const art = {
    id: `custom_${person.school}_${state.day}_${customs.length}`,
    name: title,
    klass: moves[0].art.klass,
    tier: Math.max(...moves.map(({ art: from }) => from.tier)),
    sect: person.school,
    custom: true,
    founder: person.name,
    moves: moves.map(({ move }, i) => ({ name: move.name, power: move.power, nei: move.nei, stamina: move.stamina, level: MOVE_LEVELS[i] })),
  };
  customs.push(art);
  registerArt(art);
  person.arts[art.id] = 700;
  person.wheel = autoWheel(person);
  note(state, 'insight', `${person.name}融会所学，自创「${title}」。`, person.school);
  return done({ art });
}

/** Makes the arts a world's sects founded known to the rest of the program. Call after loading a world. */
export const registerCustom = (state) => (state.customArts ?? []).forEach(registerArt);

/** The inner strength a person has built, as the sum of the levels of their inner arts. */
export const innerLevels = (person) => Object.entries(person.arts).reduce((sum, [id, points]) => sum + (ART_BY_ID[id]?.klass === 'inner' ? levelOf(points) : 0), 0);
/** What opening the next meridian asks. */
export const meridianNeed = (person) => 5 * ((person.meridians?.length ?? 0) + 1);

/** Opens the next meridian and takes one of its two gifts ('a' or 'b'). */
export function openMeridian(state, personId, choice) {
  const person = state.persons[personId];
  const index = person?.meridians?.length ?? 0;
  const node = MERIDIANS[index];
  if (!person || !node) return refuse('八脉已通');
  if (innerLevels(person) < meridianNeed(person)) return refuse(`内功根基不足（各门内功重数合计需 ${meridianNeed(person)}）`);
  const gift = node[choice];
  if (!gift) return refuse('请择其一');
  for (const [key, amount] of Object.entries(gift)) {
    if (key === 'label') continue;
    if (key === 'vigor') person.vigor = Math.round((person.vigor + amount) * 100) / 100;
    else person.stats[key] = Math.min(STAT_CAP[key], person.stats[key] + amount);
  }
  (person.meridians ??= []).push(choice);
  return done();
}

// ---- branches and spies --------------------------------------------------------------------------------

/** Gives a stronghold over to one kind of work. Needs a hall of the second level. */
export function setFocus(state, sectId, placeId, focus) {
  const place = state.places[placeId];
  if (place?.owner !== sectId || !FOCUSES[focus]) return refuse('无法设置');
  if (focus !== 'none' && !place.buildings.some((b) => b.kind === 'hall' && b.level >= 2)) return refuse('需二级正殿');
  place.focus = focus;
  return done();
}
/** The share a stronghold's speciality adds to one kind of work there. */
export const focusBoost = (state, placeId, kind) => FOCUSES[state.places[placeId]?.focus ?? 'none']?.[kind] ?? 0;

export const SPY_COST = 300;
/** Plants someone in another sect. A sect that is watched is easier to fight. */
export function plantSpy(state, sectId, targetId) {
  const books = state.sects[sectId];
  if (!state.sects[targetId]?.alive || targetId === sectId) return refuse('无此门派');
  if (targetId in (books.spies ?? {})) return refuse('已有卧底在内');
  if (books.silver < SPY_COST) return refuse('银两不足');
  books.silver -= SPY_COST;
  (books.spies ??= {})[targetId] = state.day;
  return done();
}
/** The share added to a sect's attack when it fights one it has a spy in. */
export const spyBoost = (state, sectId, targetId) => (targetId in (state.sects[sectId].spies ?? {}) ? 0.08 : 0);
/** Every ten days a spy may be found out, which costs standing with that sect. */
export function xunOfSpies(state, rng) {
  for (const [sectId, books] of Object.entries(state.sects))
    for (const targetId of Object.keys(books.spies ?? {})) {
      if (!state.sects[targetId].alive) delete books.spies[targetId];
      else if (rng.chance(0.04)) {
        delete books.spies[targetId];
        books.relations[targetId] = clamp(books.relations[targetId] - 25, -100, 100);
        state.sects[targetId].relations[sectId] = clamp(state.sects[targetId].relations[sectId] - 25, -100, 100);
        note(state, 'event', `安插在${targetId === state.playerSect ? '本派' : '他派'}的卧底败露。`, sectId);
      }
    }
}

// ---- the duelling stage --------------------------------------------------------------------------------

export const DUEL_REST = 30;
/** Finds someone a match on the stage: a stranger of about their level. */
export function duelSides(state, personId, rng) {
  const person = state.persons[personId],
    books = state.sects[person?.school];
  if (!person) return refuse('无人上台');
  if (person.wounds > 0.2) return refuse('此人带伤，不宜上台');
  if ((books.duelDay ?? -DUEL_REST) + DUEL_REST > state.day) return refuse(`擂台每 ${DUEL_REST} 日一开`);
  const rival = rollPerson(rng, { quality: 60, school: person.school, place: person.place });
  Object.assign(rival, { id: -1, name: rng.pick(['过路刀客', '关外来客', '无名剑士', '江南拳师', '游方道人']), school: null });
  growTo(rival, Math.max(1, person.level + rng.int(-2, 2)));
  for (const [id, points] of Object.entries(person.arts)) if (ART_BY_ID[id] && !ART_BY_ID[id].sect) rival.arts[id] = Math.max(100, points - 100);
  if (!Object.keys(rival.arts).length) rival.arts.fist1 = 300;
  equipFor(rival, Math.max(1, person.gear.armor));
  rival.wheel = autoWheel(rival);
  return done({ sides: [[person], [rival]], rival });
}
/** Applies a duel's result: renown and experience for a win, wounds either way. */
export function settleDuel(state, personId, won, hpLeft, dealt) {
  const person = state.persons[personId],
    books = state.sects[person.school];
  books.duelDay = state.day;
  gainXp(person, dealt);
  person.wounds = clamp(1 - hpLeft, 0, 1) * 0.3;
  if (won) books.renown = clamp(books.renown + 6, 0, 1000);
  note(state, 'event', `${person.name}登擂${won ? '获胜，本派威望有增' : '落败'}。`, person.school);
  return done();
}
