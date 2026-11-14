// What a sect can teach. An art is not learned from nowhere: somebody in the
// sect must know it well enough to teach it, or the sect must hold a manual
// of it. A sect begins with its own arts and the lines its masters practise;
// every other art has to be found — bought from a pedlar of books, asked of a
// friendly sect, carried off from a library that has fallen, or brought in
// by someone who joins already knowing it.
import { ARTS, ART_BY_ID, commonArt, levelOf } from '../data/arts.mjs';
import { SECT_BY_ID } from '../data/sects.mjs';
import { createRng } from './rng.mjs';

/** The mastery level from which a person can teach an art to others. */
export const TEACH_LEVEL = 6;
/** What a pedlar asks for a manual, by the art's tier, and the level of the copy he sells. */
export const BOOK_PRICE = [0, 300, 900, 2400];
export const BOOK_LEVEL = 5;
/** Asking a sect to teach: how friendly it must be by the art's tier, what it costs in silver and in goodwill. */
export const TEACHING = { relation: [0, 40, 55, 70], silver: [0, 400, 1100, 2800], goodwill: 8 };
/** How many manuals are carried off when a stronghold with a library is taken. */
export const LOOT_COUNT = 2;
const SEASON = 90;

const members = (state, sectId) => Object.values(state.persons).filter((person) => person.school === sectId);

/**
 * The arts a sect can teach, as a set of ids:
 *   its own arts, which are cut in the stone of its hall and never lost;
 *   the first lessons of its main class and of inner strength, which anyone there can give;
 *   every art it holds a manual of;
 *   every art one of its people has taken to the teaching level.
 */
export function heldArts(state, sectId) {
  const held = new Set();
  const sect = SECT_BY_ID[sectId];
  for (const art of ARTS) if (art.sect === sectId) held.add(art.id);
  if (sect) for (const klass of [sect.main, 'inner']) held.add(commonArt(klass, 1).id);
  for (const id of Object.keys(state.sects[sectId]?.manuals ?? {})) if (ART_BY_ID[id]) held.add(id);
  for (const person of members(state, sectId)) for (const [id, points] of Object.entries(person.arts)) if (levelOf(points) >= TEACH_LEVEL && ART_BY_ID[id]) held.add(id);
  return held;
}

/** The arts open to every sect, as a list; these are what there is to collect. */
export const commonArts = () => ARTS.filter((art) => !art.sect && !art.custom);

/** The common arts a sect has yet to find, lowest tier first. */
export function lackingArts(state, sectId, held = heldArts(state, sectId)) {
  return commonArts()
    .filter((art) => !held.has(art.id))
    .sort((a, b) => a.tier - b.tier);
}

/** Puts a manual in a sect's library, unless a better copy is there already. Returns whether it was new to the sect. */
export function addManual(state, sectId, artId, level = BOOK_LEVEL) {
  const books = state.sects[sectId];
  const fresh = !heldArts(state, sectId).has(artId);
  books.manuals[artId] = Math.max(books.manuals[artId] ?? 0, level);
  return fresh;
}

/**
 * What the pedlar of books has this season: up to three manuals the sect lacks, the same
 * however often the list is asked for, and different each season. Mostly first lessons;
 * a third-tier book is a rare find.
 */
export function bookOffers(state, sectId) {
  const season = Math.floor(state.day / SEASON);
  const rng = createRng((state.seed ?? 1) * 7919 + season * 104729 + sectId.length * 31 + sectId.charCodeAt(0));
  const sold = state.sects[sectId].bought?.season === season ? state.sects[sectId].bought.ids : [];
  // What was bought this season stays in the reckoning, so that buying one book does not change the others on offer.
  const held = heldArts(state, sectId);
  const pool = commonArts()
    .filter((art) => !held.has(art.id) || sold.includes(art.id))
    .sort((a, b) => a.tier - b.tier);
  const offers = [];
  while (offers.length < 3 && pool.length) {
    // The pedlar carries first lessons most often, and something rarer now and then.
    const weights = pool.map((art) => [0, 6, 3, 1][art.tier]);
    let roll = rng.next() * weights.reduce((sum, weight) => sum + weight, 0),
      index = 0;
    while (roll >= weights[index]) roll -= weights[index++];
    const [art] = pool.splice(index, 1);
    offers.push({ id: art.id, price: BOOK_PRICE[art.tier] });
  }
  return offers.filter((offer) => !sold.includes(offer.id));
}

/** Buys one of this season's manuals. */
export function buyManual(state, sectId, artId) {
  const books = state.sects[sectId];
  const offer = bookOffers(state, sectId).find((entry) => entry.id === artId);
  if (!offer) return { ok: false, why: '书贩手里没有这一部' };
  if (books.silver < offer.price) return { ok: false, why: '银两不足' };
  books.silver -= offer.price;
  const season = Math.floor(state.day / SEASON);
  if (books.bought?.season !== season) books.bought = { season, ids: [] };
  books.bought.ids.push(artId);
  addManual(state, sectId, artId);
  return { ok: true, art: ART_BY_ID[artId] };
}

/** The common arts another sect could teach this one, and what each would take. */
export function teachingOffers(state, sectId, otherId) {
  const mine = heldArts(state, sectId),
    theirs = heldArts(state, otherId),
    relation = state.sects[sectId].relations?.[otherId] ?? 0;
  return commonArts()
    .filter((art) => theirs.has(art.id) && !mine.has(art.id))
    .sort((a, b) => a.tier - b.tier)
    .map((art) => ({ id: art.id, silver: TEACHING.silver[art.tier], relation: TEACHING.relation[art.tier], open: relation >= TEACHING.relation[art.tier] }));
}

/** Asks a friendly sect for a copy of an art it teaches. It costs silver, and a favour asked is goodwill spent. */
export function askTeaching(state, sectId, otherId, artId) {
  const offer = teachingOffers(state, sectId, otherId).find((entry) => entry.id === artId);
  const books = state.sects[sectId],
    other = state.sects[otherId];
  if (!offer) return { ok: false, why: '对方并无此艺可授' };
  if (!offer.open) return { ok: false, why: `交情未到（需 ${offer.relation}）` };
  if (books.silver < offer.silver) return { ok: false, why: '银两不足' };
  books.silver -= offer.silver;
  other.silver += offer.silver;
  books.relations[otherId] -= TEACHING.goodwill;
  if (other.relations) other.relations[sectId] -= TEACHING.goodwill;
  addManual(state, sectId, artId);
  return { ok: true, art: ART_BY_ID[artId] };
}

/** Carries off manuals from a sect whose stronghold has fallen: common arts it teaches that the taker lacks. Returns the arts. */
export function lootManuals(state, takerId, loserId, rng, count = LOOT_COUNT) {
  const mine = heldArts(state, takerId),
    theirs = heldArts(state, loserId);
  const pool = commonArts().filter((art) => theirs.has(art.id) && !mine.has(art.id));
  const taken = [];
  while (taken.length < count && pool.length) {
    const [art] = pool.splice(rng.int(0, pool.length - 1), 1);
    addManual(state, takerId, art.id);
    taken.push(art);
  }
  return taken;
}

/** A manual found by chance: one of the first or second lessons the sect lacks. Returns the art, or null if it lacks none. */
export function findManual(state, sectId, rng) {
  const pool = lackingArts(state, sectId).filter((art) => art.tier <= 2);
  if (!pool.length) return null;
  const art = pool[rng.int(0, pool.length - 1)];
  addManual(state, sectId, art.id);
  return art;
}
