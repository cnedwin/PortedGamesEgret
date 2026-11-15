// The Sword Meet: every three years each sect sends one disciple to fight
// for the name of the best of the younger generation. Elders and leaders
// stay home, so it is the disciples a sect has raised who are tested.
//
// A world nobody is watching holds the meet in a day. A watched world stops
// for it: the player picks who goes (`enterTourney`), fights each of their
// bouts on the field, and reports how it went (`settleBout`); the other
// bouts are settled here. The meet draws on a random source of its own, so
// the rest of the world runs the same whoever wins.
import { DAYS_PER_YEAR } from '../data/goods.mjs';
import { SECT_BY_ID, SECTS } from '../data/sects.mjs';
import { resolveBattle } from './battle.mjs';
import { grow, remember } from './disciples.mjs';
import { addManual, lackingArts } from './library.mjs';
import { bestCombatArt, prowess } from './persons.mjs';
import { clamp, createRng } from './rng.mjs';

export const TOURNEY = {
  /** Years between meets, and the day of the year it is held on (the first of the ninth month). */
  every: 3,
  dayOfYear: 240,
  /** Days of warning the sects are given. */
  notice: 30,
  /** The most who take the field. */
  field: 8,
  /** Renown and silver for the winner's sect, the runner-up's and the two others of the last four. */
  renown: [30, 15, 6],
  silver: [1000, 400, 0],
  /** Experience for each bout fought. */
  xp: 400,
  /** The highest standing that may enter: a personal disciple. */
  rank: 3,
};
const HISTORY = 6;

/** The meet that is next to be held, counting one being held today: `{ edition, day }`. */
export function nextTourney(state) {
  const span = TOURNEY.every * DAYS_PER_YEAR,
    first = span - DAYS_PER_YEAR + TOURNEY.dayOfYear;
  const nextEdition = (state.tourneys?.at(-1)?.edition ?? 0) + 1;
  const edition = Math.max(nextEdition, Math.ceil((state.day - first) / span) + 1);
  return { edition, day: first + (edition - 1) * span };
}

const members = (state, sectId) => Object.values(state.persons).filter((person) => person.school === sectId);

/**
 * Those of a sect who may enter: disciples it has raised (not elders, and not the
 * wanderers who came to it already made), fit to fight and with an art to fight with.
 */
export const eligible = (state, sectId) =>
  members(state, sectId)
    .filter((person) => person.rank <= TOURNEY.rank && !person.talent && (person.wounds ?? 0) < 0.3 && bestCombatArt(person))
    .sort((a, b) => prowess(b) - prowess(a));

/** The disciples the other sects send, strongest first, leaving room for the player's own. */
function rivals(state) {
  return SECTS.filter((sect) => sect.id !== state.playerSect && state.sects[sect.id].alive)
    .map((sect) => eligible(state, sect.id)[0])
    .filter(Boolean)
    .sort((a, b) => prowess(b) - prowess(a))
    .slice(0, TOURNEY.field - 1);
}

const sourceOf = (state, edition) => createRng(((state.seed ?? 1) * 31 + edition * 7919) >>> 0 || 1);
const note = (state, type, text, data = {}) => state.log.push({ day: state.day, type, text, ...data });
const watched = (state) => !!state.options?.interactive && !state.options.autoPlayer && state.sects[state.playerSect]?.alive;

/** Each day: gives notice of a meet a month ahead, and opens it when its day comes. */
export function dayOfTourney(state) {
  const { edition, day } = nextTourney(state);
  if (state.day === day - TOURNEY.notice) note(state, 'tourney-call', `第 ${edition} 届论剑大会定于三十日后举行。各派可遣一名弟子出战，掌门与长老不得下场。`, { sect: state.playerSect });
  if (state.day !== day || state.tourney) return;
  const others = rivals(state);
  const own = state.sects[state.playerSect]?.alive ? eligible(state, state.playerSect) : [];
  if (others.length + (own.length ? 1 : 0) < 2) return;
  state.tourney = { edition, stage: 'call', others: others.map((person) => person.id), alive: [], out: [], fought: {}, round: 0, mine: null };
  // Unwatched, the sect sends its best and the whole meet is over by nightfall.
  if (!watched(state)) {
    enterTourney(state, own[0]?.id ?? null);
    while (state.tourney) settleBout(state, null);
  }
}

/** What the meet looks like before it starts: who the others send, and who of the player's may go. */
export function tourneyField(state) {
  const meet = state.tourney;
  if (!meet) return null;
  return { edition: meet.edition, others: meet.others.map((id) => state.persons[id]).filter(Boolean), own: eligible(state, state.playerSect) };
}

/** Sends a disciple of the player's (or nobody, with null) and draws the first round. */
export function enterTourney(state, personId) {
  const meet = state.tourney;
  if (!meet || meet.stage !== 'call') return { ok: false, why: '大会尚未召集' };
  const person = personId === null ? null : state.persons[personId];
  if (personId !== null && !eligible(state, state.playerSect).includes(person)) return { ok: false, why: '此人不能出战' };
  const rng = sourceOf(state, meet.edition);
  const field = meet.others.filter((id) => state.persons[id]);
  if (person) field.push(person.id);
  // The draw: shuffled by the meet's own source.
  for (let i = field.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [field[i], field[j]] = [field[j], field[i]];
  }
  Object.assign(meet, { stage: 'bouts', alive: field, mine: person?.id ?? null, entrants: [...field], rng: rng.state });
  // With nobody of the player's in it, the meet runs itself.
  if (!person && watched(state)) while (state.tourney) settleBout(state, null);
  return { ok: true };
}

const ROUND_NAMES = { 2: '决战', 3: '四强战', 4: '四强战' };
/** The name of the round about to be fought, by how many are left. */
export const roundName = (left) => ROUND_NAMES[left] ?? (left <= 8 ? '八强战' : '初战');

/** Pairs off those still in; with an odd number, the last sits the round out. */
function pairsOf(alive) {
  const pairs = [];
  for (let i = 0; i + 1 < alive.length; i += 2) pairs.push([alive[i], alive[i + 1]]);
  return { pairs, bye: alive.length % 2 ? alive.at(-1) : null };
}

/**
 * The player's bout in the round about to be fought, or null for a bye.
 * The draw fixes both sides and the seed for live and delegated fights.
 */
export function tourneyBout(state) {
  const meet = state.tourney;
  if (!meet || meet.stage !== 'bouts' || meet.mine === null) return null;
  const { pairs } = pairsOf(meet.alive);
  const index = pairs.findIndex((pair) => pair.includes(meet.mine));
  if (index < 0) return null;
  const pair = pairs[index], side = pair[0] === meet.mine ? 0 : 1;
  const rng = createRng(1);
  rng.state = meet.rng;
  // Looking ahead never consumes the round's random sequence.
  for (let i = 0; i < index; i++) rng.int(1, 1e9);
  return { mine: state.persons[meet.mine], rival: state.persons[pair[1 - side]], round: roundName(meet.alive.length), side, seed: rng.int(1, 1e9) };
}

/** A bout called level goes to the stronger on paper, with the draw order breaking ties. */
export const boutWinner = (a, b, winner) => winner === -1 ? Number(prowess(a) < prowess(b)) : winner;

/**
 * Fights one round. `mineWon` is how the player's own bout went, when they
 * fought it themselves; with null, that bout is settled here like the rest.
 * When one fighter is left the meet ends and its honours are given.
 */
export function settleBout(state, mineWon) {
  const meet = state.tourney;
  if (!meet || meet.stage !== 'bouts') return { ok: false, why: '大会未开' };
  const rng = createRng(1);
  rng.state = meet.rng;
  const { pairs, bye } = pairsOf(meet.alive);
  const next = [];
  for (const [a, b] of pairs) {
    const seed = rng.int(1, 1e9);
    let winner;
    if (mineWon !== null && (a === meet.mine || b === meet.mine)) winner = mineWon ? meet.mine : a === meet.mine ? b : a;
    else {
      const sides = [[state.persons[a]], [state.persons[b]]];
      const result = resolveBattle({ sides, seed }).winner;
      winner = boutWinner(sides[0][0], sides[1][0], result) === 0 ? a : b;
    }
    meet.out.push({ id: winner === a ? b : a, left: meet.alive.length });
    for (const id of [a, b]) meet.fought[id] = (meet.fought[id] ?? 0) + 1;
    next.push(winner);
  }
  if (bye !== null) next.push(bye);
  meet.alive = next;
  meet.round++;
  meet.rng = rng.state;
  if (next.length <= 1) return finish(state);
  // Once the player's disciple is out, the rest needs no watching.
  if (watched(state) && !next.includes(meet.mine)) while (state.tourney) settleBout(state, null);
  return { ok: true, over: !state.tourney };
}

/** Where a fighter finished, in a word. */
const placeOf = (left) => (left <= 2 ? '亚军' : left <= 4 ? '四强' : left <= 8 ? '八强' : '出战');

function finish(state) {
  const meet = state.tourney;
  const champion = state.persons[meet.alive[0]];
  const tier = (left) => (left <= 2 ? 1 : left <= 4 ? 2 : 3);
  const honour = (person, rank) => {
    const books = state.sects[person.school];
    if (!books || rank > 2) return;
    books.renown = clamp(books.renown + TOURNEY.renown[rank], 0, 1000);
    books.silver += TOURNEY.silver[rank];
  };
  // Everyone learns from every bout they fought; those beaten go home bruised.
  for (const id of meet.entrants) {
    const person = state.persons[id];
    if (!person) continue;
    grow(state, person, TOURNEY.xp * Math.max(1, meet.fought[id] ?? 0));
    if (person !== champion) person.wounds = Math.max(person.wounds ?? 0, 0.1);
  }
  honour(champion, 0);
  champion.laurels = (champion.laurels ?? 0) + 1;
  remember(state, champion, `在第 ${meet.edition} 届论剑大会夺魁`, { moment: true });
  for (const { id, left } of meet.out) {
    const person = state.persons[id];
    if (!person) continue;
    honour(person, tier(left));
    remember(state, person, left <= 4 ? `在第 ${meet.edition} 届论剑大会获${placeOf(left)}` : `出战第 ${meet.edition} 届论剑大会`);
  }
  // The winner's sect is given a manual it lacks: the deepest of those to be had.
  const prize = lackingArts(state, champion.school)
    .filter((art) => art.tier <= 3)
    .sort((a, b) => b.tier - a.tier)[0];
  if (prize) addManual(state, champion.school, prize.id);
  const runner = state.persons[meet.out.at(-1)?.id];
  const mine = state.persons[meet.mine];
  const mineOut = meet.out.find((entry) => entry.id === meet.mine);
  const record = {
    edition: meet.edition,
    day: state.day,
    champion: { name: champion.name, sect: champion.school },
    runner: runner ? { name: runner.name, sect: runner.school } : null,
    mine: mine ? { id: mine.id, name: mine.name, place: mine === champion ? '魁首' : placeOf(mineOut?.left ?? 99) } : null,
    prize: prize?.name ?? null,
  };
  (state.tourneys ??= []).push(record);
  if (state.tourneys.length > HISTORY) state.tourneys.splice(0, state.tourneys.length - HISTORY);
  const sect = SECT_BY_ID[champion.school].name;
  note(state, 'tourney', `第 ${meet.edition} 届论剑大会，${sect}${champion.name}夺魁${runner ? `，${SECT_BY_ID[runner.school].name}${runner.name}居次` : ''}${prize ? `。${sect}得赠《${prize.name}》抄本` : ''}。`, { sect: champion.school, person: champion.id });
  delete state.tourney;
  return { ok: true, over: true, record };
}
