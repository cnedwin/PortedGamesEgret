import assert from 'node:assert/strict';
import test from 'node:test';
import { createBattle, resolveBattle, summarize } from '../src/core/battle.mjs';
import { createRng } from '../src/core/rng.mjs';
import { deserialize, serialize } from '../src/core/save.mjs';
import { DAYS_PER_YEAR } from '../src/data/goods.mjs';
import * as world from '../src/core/world.mjs';

const home = 'huashan', enemy = 'shaolin';
const team = (state, id) => world.membersOf(state, id).map(person => person.id);

function ready(difficulty = 1) {
  const state = world.createWorld({ seed: 9, playerSect: home, difficulty });
  state.day = world.openingProtection(state).until;
  return state;
}

function losingDefense(state) {
  for (const person of world.membersOf(state, home)) person.wounds = 0.6;
  const prepared = world.assaultSides(state, enemy, home, team(state, enemy));
  assert.ok(prepared.ok, prepared.why);
  const summary = resolveBattle({ ...prepared, seed: 313 });
  assert.equal(summary.winner, 0);
  return summary;
}

test('the first defeat at the only home holds once with actual battle costs and losses', () => {
  const state = ready();
  state.sects[home].silver = 5127.25;
  state.sects[home].grain = 83.2;
  const summary = losingDefense(state);
  const leaderId = state.sects[home].leaderId;
  const candidates = structuredClone(state.places[home].applicants);
  assert.ok(world.canFallBackAtHome(state, enemy, home));
  const rng = createRng(8);
  const trial = createRng(8);
  const expectedFallen = summary.fighters.filter(fighter => fighter.down && trial.chance(0.15)).map(fighter => state.persons[fighter.id].name);
  assert.ok(expectedFallen.length > 0, 'sample must exercise normal casualties');
  const result = world.settleAssault(state, enemy, home, summary, rng);
  assert.deepEqual(result, { won: true, held: true, losses: { silver: 1025, grain: 16 }, fallen: expectedFallen });
  assert.equal(state.places[home].owner, home);
  assert.deepEqual(state.places[home].applicants, candidates);
  assert.equal(state.sects[home].silver, 4102.25);
  assert.equal(state.sects[home].grain, 67.2);
  assert.equal(state.sects[home].renown, 60);
  assert.equal(state.sects[enemy].truce[home], state.day + 2 * DAYS_PER_YEAR);
  assert.equal(state.sects[home].truce[enemy], state.day + 2 * DAYS_PER_YEAR);
  assert.equal(rng.state, trial.state);
  assert.ok(state.log.some(entry => entry.type === 'fallback' && entry.sect === home));
  assert.equal(state.outcome, null);
  assert.ok(state.persons[state.sects[home].leaderId].wounds > 0 || !state.persons[leaderId]);

  const saved = deserialize(serialize(state));
  assert.ok(saved.ok);
  assert.equal(world.canFallBackAtHome(saved.state, enemy, home), false);
  saved.state.day += 2 * DAYS_PER_YEAR;
  const next = world.settleAssault(saved.state, enemy, home, losingDefense(saved.state), createRng(12));
  assert.equal(next.won, true);
  assert.equal(next.held, false);
  assert.equal(next.losses, null);
  assert.equal(saved.state.sects[home].alive, false);
  assert.equal(saved.state.outcome.result, 'lost');
});

test('a winning first eligible defense consumes the chance and pays the usual reward', () => {
  const state = ready(0);
  const prepared = world.assaultSides(state, enemy, home, team(state, enemy));
  const fight = createBattle({ ...prepared, seed: 71 });
  fight.retreat(0);
  while (!fight.done) fight.update();
  assert.equal(fight.winner, 1);
  assert.ok(world.canFallBackAtHome(state, enemy, home));
  const result = world.settleAssault(state, enemy, home, summarize(fight), createRng(15));
  assert.deepEqual(result, { won: false, held: true, losses: null, fallen: [] });
  assert.equal(state.sects[home].renown, 130);
  assert.equal(world.canFallBackAtHome(state, enemy, home), false);
});

test('the protection only covers a new ordinary or easy world, the last original home, and an unprovoked foe', () => {
  for (const difficulty of [2, 3]) assert.equal(world.canFallBackAtHome(ready(difficulty), enemy, home), false);
  const state = ready();
  state.day--;
  assert.equal(world.canFallBackAtHome(state, enemy, home), false);
  assert.ok(world.beginAssault(state, home, 'songshan', team(state, home)).ok);
  state.day++;
  assert.equal(world.canFallBackAtHome(state, enemy, home), false);
  assert.ok(world.canFallBackAtHome(state, 'wudang', home));
  assert.equal(world.canFallBackAtHome(state, home, 'songshan'), false);
  assert.ok(world.settle(state, home, 'hengshan').ok);
  assert.equal(world.canFallBackAtHome(state, 'wudang', home), false);
  assert.equal(world.canFallBackAtHome(state, 'wudang', 'hengshan'), false);

  const late = ready();
  assert.ok(world.canFallBackAtHome(late, enemy, home));
  assert.ok(world.beginAssault(late, home, 'songshan', team(late, home)).ok);
  assert.equal(world.canFallBackAtHome(late, enemy, home), false);
  assert.ok(world.canFallBackAtHome(late, 'wudang', home));

  const old = ready();
  delete old.opening.homeFallback;
  assert.equal(world.canFallBackAtHome(deserialize(serialize(old)).state, enemy, home), false);
  const automatic = world.createWorld({ seed: 9, playerSect: home, autoPlayer: true });
  automatic.day = 3000;
  assert.equal(world.canFallBackAtHome(automatic, enemy, home), false);
});

test('only the otherwise heirless head escapes a lethal wound during the first fallback', () => {
  const state = ready();
  const books = state.sects[home];
  const head = state.persons[books.leaderId];
  const heirs = world.membersOf(state, home).filter(person => person.rank === 4);
  const summary = losingDefense(state);
  const doomed = new Set([head.id, ...heirs.map(person => person.id)]);
  const down = summary.fighters.filter(fighter => fighter.down).map(fighter => fighter.id);
  assert.ok([...doomed].every(id => down.includes(id)), 'real loss must expose the entire line of succession');
  let draws = 0;
  const result = world.settleAssault(state, enemy, home, summary, { chance: () => doomed.has(down[draws++]) });
  assert.deepEqual(new Set(result.fallen), new Set(heirs.map(person => person.name)));
  assert.equal(draws, down.length);
  assert.equal(state.sects[home].leaderId, head.id);
  assert.equal(state.sects[home].alive, true);
  assert.equal(state.persons[head.id], head);
  assert.ok(head.wounds > 0);
  assert.equal(state.outcome, null);
});

test('the map records a siege column only if the siege is actually queued', () => {
  const state = world.createWorld({ seed: 22, playerSect: home });
  state.options.interactive = true;
  state.day = world.openingProtection(state).until + 9;
  // Fix the frontier and garrison so this xun deterministically schedules one assault when the slot is free.
  for (const id of Object.keys(state.sects)) state.sects[id].alive = id === home || id === enemy;
  for (const [id, place] of Object.entries(state.places)) if (id !== home) place.owner = enemy;
  for (const person of world.membersOf(state, home)) if (person.rank < 5) delete state.persons[person.id];
  const busy = structuredClone(state);
  busy.pending = { kind: 'event', id: 'famine' };

  world.advanceDay(state);
  world.advanceDay(busy);
  assert.equal(state.pending.kind, 'siege');
  assert.deepEqual(state.marches, [{ day: 1810, by: enemy, from: 'hengshan', to: home }]);
  assert.deepEqual(busy.pending, { kind: 'event', id: 'famine' });
  assert.equal(busy.marches, undefined);
});
