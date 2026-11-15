// Rule tests for raising disciples: the grade of their gifts, ranking, their
// records and pleas, one-step work, the Sword Meet and the order in which a
// new sect is handed its affairs. Run from the Wulin folder with `node --test`.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DAYS_PER_YEAR } from '../src/data/goods.mjs';
import { PLEAS, QUALITIES, RANKINGS, aptitudeScore, attention, grow, pleaFor, pleaView, promotable, qualityOf, ranked, rankingValue, recommendJobs, remember, resolvePlea } from '../src/core/disciples.mjs';
import { pendingView, resolvePending } from '../src/core/jianghu.mjs';
import { TRAITS, prowess } from '../src/core/persons.mjs';
import { createRng } from '../src/core/rng.mjs';
import { deserialize, serialize } from '../src/core/save.mjs';
import { TOURNEY, eligible, enterTourney, nextTourney, settleBout, tourneyBout, tourneyField } from '../src/core/tourney.mjs';
import { FEATURES, checkUnlocks, isOpen, openAll, startUnlocks, stillToCome } from '../src/core/unlocks.mjs';
import { advanceDay, createWorld, membersOf, promote, setJob } from '../src/core/world.mjs';

/** A world with a player watching it, as the page makes one. */
function watchedWorld(options = {}) {
  const world = createWorld({ seed: 7, playerSect: 'wudang', ...options });
  world.options.interactive = true;
  return world;
}
const withApt = (values) => ({ apt: Object.fromEntries(['fist', 'blade', 'pole', 'inner', 'light'].map((key, index) => [key, values[index]])) });
const days = (world, count) => {
  for (let i = 0; i < count; i++) {
    advanceDay(world);
    // Whatever comes to the door is answered with its first choice.
    if (world.pending) {
      const rng = createRng(1);
      rng.state = world.rng;
      if (world.pending.kind === 'siege') world.pending = null;
      else resolvePending(world, 0, rng);
      world.rng = rng.state;
    }
  }
};

test('a grade is read from aptitude: the best gift counts most', () => {
  assert.equal(QUALITIES.length, 5);
  assert.equal(aptitudeScore(withApt([50, 50, 50, 50, 50])), 50);
  // One great gift lifts a person further than the same points spread thin.
  assert.ok(aptitudeScore(withApt([95, 60, 40, 40, 40])) > aptitudeScore(withApt([55, 55, 55, 55, 55])));
  assert.equal(qualityOf(withApt([30, 30, 30, 30, 30])), 0);
  assert.equal(qualityOf(withApt([55, 55, 55, 55, 55])), 1);
  assert.equal(qualityOf(withApt([65, 65, 65, 65, 65])), 2);
  assert.equal(qualityOf(withApt([75, 75, 75, 75, 75])), 3);
  assert.equal(qualityOf(withApt([95, 90, 80, 80, 80])), 4);
  // A grade never falls as any one aptitude rises.
  for (let best = 20; best < 100; best += 5) assert.ok(qualityOf(withApt([best + 5, 50, 50, 50, 50])) >= qualityOf(withApt([best, 50, 50, 50, 50])));
});

test('a new world has every grade but mostly the lower ones', () => {
  const world = createWorld({ seed: 3 });
  const counts = [0, 0, 0, 0, 0];
  for (const person of Object.values(world.persons)) counts[qualityOf(person)]++;
  assert.ok(counts[0] + counts[1] > counts[3] + counts[4], `grades ${counts}`);
  assert.ok(counts.filter(Boolean).length >= 3, `grades ${counts}`);
});

test('a roster can be ranked by any core attribute, either way', () => {
  const world = createWorld({ seed: 5 });
  const people = membersOf(world, 'shaolin');
  const keys = RANKINGS.map(([key]) => key);
  for (const key of ['prowess', 'quality', 'level', 'arm', 'waist', 'leg', 'nei', 'agi', 'wit', 'dart', 'apt:fist', 'apt:inner', 'loyalty', 'age']) assert.ok(keys.includes(key), `no ranking by ${key}`);
  for (const key of keys) {
    const down = ranked(people, key),
      up = ranked(people, key, true);
    assert.equal(down.length, people.length);
    for (let i = 1; i < down.length; i++) assert.ok(rankingValue(down[i - 1], key) >= rankingValue(down[i], key), `${key} is out of order`);
    for (let i = 1; i < up.length; i++) assert.ok(rankingValue(up[i - 1], key) <= rankingValue(up[i], key), `${key} is out of order upward`);
    assert.ok(Number.isFinite(rankingValue(people[0], key)));
  }
  assert.equal(rankingValue(people[0], 'prowess'), prowess(people[0]));
  // Ranking leaves the list it was given alone.
  const before = people.map((person) => person.id);
  ranked(people, 'wit');
  assert.deepEqual(people.map((person) => person.id), before);
});

test('one step puts everyone to work that suits them, and changes nothing until applied', () => {
  const world = watchedWorld();
  const people = membersOf(world, 'wudang');
  for (const person of people) person.job = { kind: 'rest' };
  const jobs = people.map((person) => JSON.stringify(person.job));
  const plan = recommendJobs(world, 'wudang');
  assert.deepEqual(people.map((person) => JSON.stringify(person.job)), jobs);
  assert.ok(plan.length >= people.length - 2, `only ${plan.length} of ${people.length} given work`);
  assert.ok(plan.some(({ job }) => job.kind === 'train'));
  for (const { person, job, why } of plan) {
    assert.ok(why, 'a job comes with its reason');
    assert.ok(setJob(world, person.id, job).ok, `${person.name} cannot ${job.kind}`);
  }
  // Applied, there is nothing left to change, and nobody is idle.
  assert.equal(recommendJobs(world, 'wudang').length, 0);
  assert.equal(attention(world, 'wudang').idle.length, 0);
  // Asked only about the idle, those already at work are left alone.
  const one = people.find((person) => person.id !== world.sects.wudang.leaderId);
  one.job = { kind: 'rest' };
  assert.deepEqual(recommendJobs(world, 'wudang', { idleOnly: true }).map(({ person }) => person.id), [one.id]);
});

test('what waits on the leader is listed, and the promotable can be promoted', () => {
  const world = watchedWorld();
  const watch = attention(world, 'wudang');
  for (const key of ['idle', 'promotable', 'unhappy', 'wounded', 'masterless']) assert.ok(Array.isArray(watch[key]), key);
  const people = membersOf(world, 'wudang');
  const junior = people.find((person) => person.rank <= 1);
  junior.loyalty = 10;
  junior.wounds = 0.5;
  const after = attention(world, 'wudang');
  assert.ok(after.unhappy.includes(junior) && after.wounded.includes(junior));
  for (const person of people) assert.equal(promotable(world, person), promote(world, person.id).ok, `${person.name} at rank ${person.rank}`);
});

test("a disciple's record is kept only for the sect being played, and is bounded", () => {
  const world = watchedWorld();
  const mine = membersOf(world, 'wudang')[1],
    theirs = membersOf(world, 'shaolin')[1];
  remember(world, mine, '下山行侠');
  remember(world, theirs, '下山行侠');
  assert.equal(mine.life.length, 1);
  assert.equal(theirs.life, undefined);
  // A moment goes into the chronicle with the person it belongs to.
  remember(world, mine, '初次登擂便得胜', { moment: true });
  assert.deepEqual({ type: world.log.at(-1).type, person: world.log.at(-1).person }, { type: 'moment', person: mine.id });
  for (let i = 0; i < 80; i++) remember(world, mine, `第 ${i} 件事`);
  assert.equal(mine.life.length, 40);
  assert.equal(mine.life[0].text, '下山行侠', 'the first line of a record is kept');
  // Levels worth telling are written down as they are passed.
  const lines = mine.life.length;
  mine.level = 9;
  mine.xp = 0;
  grow(world, mine, 1e6);
  assert.ok(mine.level >= 10);
  assert.ok(mine.life.length <= 40 && mine.life.some((entry) => entry.text.includes('修为到了 10 级')), `${lines} lines`);
  // A sect run by the game keeps no records.
  const auto = createWorld({ seed: 7, playerSect: 'wudang', autoPlayer: true });
  remember(auto, membersOf(auto, 'wudang')[1], '下山行侠');
  assert.equal(membersOf(auto, 'wudang')[1].life, undefined);
});

test('every temper has something to ask, and every answer can be given', () => {
  for (const key of Object.keys(PLEAS)) assert.ok(TRAITS[key], `${key} is not a temper`);
  const world = watchedWorld();
  world.sects.wudang.silver = 5000;
  const person = membersOf(world, 'wudang').find((p) => p.rank <= 3 && p.id !== world.sects.wudang.leaderId);
  for (const [trait, plea] of Object.entries(PLEAS)) {
    assert.ok(plea.choices.length >= 2, `${trait} has one answer`);
    plea.choices.forEach((choice, index) => {
      person.traits = [trait];
      const pending = { kind: 'plea', person: person.id, trait };
      const view = pleaView(world, pending);
      assert.ok(view.title && view.text && view.choices[index].label && view.choices[index].hint, `${trait} ${index}`);
      const silver = world.sects.wudang.silver;
      const result = resolvePlea(world, pending, index);
      assert.ok(result.ok && result.text, `${trait} ${index}`);
      assert.ok(world.sects.wudang.silver >= silver - (choice.cost ?? 0) - 1);
      assert.ok(person.loyalty >= 0 && person.loyalty <= 100);
    });
  }
  // Having been heard, the same disciple waits before asking again; the leader never asks.
  const rng = createRng(11);
  for (let i = 0; i < 60; i++) {
    const plea = pleaFor(world, rng);
    if (!plea) continue;
    assert.notEqual(plea.person, person.id);
    assert.notEqual(plea.person, world.sects.wudang.leaderId);
    assert.ok(world.persons[plea.person].rank <= 3);
  }
});

test('pleas come only to a watched world, and through the door every event uses', () => {
  const unwatched = createWorld({ seed: 7, playerSect: 'wudang' });
  for (let i = 0; i < 400; i++) {
    advanceDay(unwatched);
    assert.notEqual(unwatched.pending?.kind, 'plea');
    unwatched.pending = null;
  }
  const world = watchedWorld();
  let seen = 0;
  for (let i = 0; i < 720 && !world.outcome; i++) {
    advanceDay(world);
    if (!world.pending) continue;
    if (world.pending.kind === 'plea') {
      seen++;
      const view = pendingView(world);
      assert.equal(view.kind, 'plea');
      assert.equal(view.person.school, 'wudang');
    }
    const rng = createRng(1);
    rng.state = world.rng;
    if (world.pending.kind === 'siege') world.pending = null;
    else assert.ok(resolvePending(world, 0, rng).ok);
    world.rng = rng.state;
  }
  assert.ok(seen >= 2 && seen <= 30, `${seen} pleas in two years`);
});

test('the Sword Meet falls on the first of the ninth month every third year', () => {
  const first = 2 * DAYS_PER_YEAR + TOURNEY.dayOfYear;
  assert.deepEqual(nextTourney({ day: 0 }), { edition: 1, day: first });
  assert.deepEqual(nextTourney({ day: first }), { edition: 1, day: first });
  assert.deepEqual(nextTourney({ day: first + 1 }), { edition: 2, day: first + 3 * DAYS_PER_YEAR });
  assert.deepEqual(nextTourney({ day: first + 3 * DAYS_PER_YEAR + 1 }), { edition: 3, day: first + 6 * DAYS_PER_YEAR });
});

test('only disciples a sect has raised may enter: no elders, no wanderers, nobody badly hurt', () => {
  const world = watchedWorld();
  const people = membersOf(world, 'wudang');
  const able = eligible(world, 'wudang');
  assert.ok(able.length > 0);
  for (const person of able) assert.ok(person.rank <= TOURNEY.rank && !person.talent && (person.wounds ?? 0) < 0.3);
  for (let i = 1; i < able.length; i++) assert.ok(prowess(able[i - 1]) >= prowess(able[i]));
  assert.ok(!able.includes(people.find((person) => person.id === world.sects.wudang.leaderId)));
  able[0].wounds = 0.6;
  assert.ok(!eligible(world, 'wudang').includes(able[0]));
  able[1].talent = 'healer';
  assert.ok(!eligible(world, 'wudang').includes(able[1]));
});

/** Runs a watched world up to the day of its first meet. */
function worldAtMeet(seed = 7) {
  const world = watchedWorld({ seed });
  const { day } = nextTourney(world);
  days(world, day);
  return world;
}

test('a watched world stops for the meet; the player picks who goes and fights each round', () => {
  const world = worldAtMeet();
  assert.ok(world.log.some((entry) => entry.type === 'tourney-call'), 'notice was given a month ahead');
  assert.equal(world.tourney?.stage, 'call');
  const field = tourneyField(world);
  assert.ok(field.others.length >= 3 && field.others.length <= TOURNEY.field - 1);
  assert.equal(new Set(field.others.map((person) => person.school)).size, field.others.length, 'one from each sect');
  assert.ok(field.others.every((person) => person.school !== 'wudang'));
  // An elder cannot be sent.
  const leader = world.sects.wudang.leaderId;
  assert.equal(enterTourney(world, leader).ok, false);
  const mine = field.own[0];
  assert.ok(enterTourney(world, mine.id).ok);
  assert.equal(world.tourney.stage, 'bouts');
  // The meet survives a save in the middle of it.
  const kept = deserialize(serialize(world)).state;
  assert.deepEqual(kept.tourney, world.tourney);
  const renown = world.sects.wudang.renown,
    silver = world.sects.wudang.silver,
    manuals = Object.keys(world.sects.wudang.manuals).length;
  let rounds = 0;
  while (world.tourney) {
    const bout = tourneyBout(world);
    assert.ok(bout && bout.mine === mine && bout.rival && bout.round, 'the player has a bout each round they are in');
    assert.ok(settleBout(world, true).ok);
    assert.ok(++rounds <= 4);
  }
  // Winning every bout wins the meet.
  const record = world.tourneys.at(-1);
  assert.deepEqual(record.mine, { id: mine.id, name: mine.name, place: '魁首' });
  assert.equal(record.champion.sect, 'wudang');
  assert.equal(mine.laurels, 1);
  assert.equal(world.sects.wudang.renown, Math.min(1000, renown + TOURNEY.renown[0]));
  assert.equal(world.sects.wudang.silver, silver + TOURNEY.silver[0]);
  if (record.prize) assert.equal(Object.keys(world.sects.wudang.manuals).length, manuals + 1);
  assert.ok(mine.life.some((entry) => entry.text.includes('论剑大会夺魁')));
  assert.equal(world.log.at(-1).type, 'tourney');
  assert.ok(world.log.some((entry) => entry.type === 'moment' && entry.person === mine.id));
});

test('losing a bout ends the meet for the player, and it is settled without them', () => {
  const world = worldAtMeet();
  const mine = tourneyField(world).own[0];
  enterTourney(world, mine.id);
  const result = settleBout(world, false);
  assert.ok(result.ok && result.over);
  assert.equal(world.tourney, undefined);
  const record = world.tourneys.at(-1);
  assert.notEqual(record.mine.place, '魁首');
  assert.notEqual(record.champion.sect, 'wudang');
  assert.ok(mine.wounds >= 0.1, 'the beaten go home bruised');
});

test('a sect may stay away, and an unwatched world holds the meet in a day', () => {
  const world = worldAtMeet();
  assert.ok(enterTourney(world, null).ok);
  assert.equal(world.tourney, undefined);
  assert.equal(world.tourneys.at(-1).mine, null);

  const quiet = createWorld({ seed: 7, playerSect: 'wudang' });
  const other = createWorld({ seed: 7, playerSect: 'wudang' });
  const { day } = nextTourney(quiet);
  for (let i = 0; i < day; i++) advanceDay(quiet), advanceDay(other);
  assert.equal(quiet.tourney, undefined);
  assert.equal(quiet.tourneys.length, 1);
  // The meet draws on a source of its own: the same world gives the same meet.
  assert.deepEqual(quiet.tourneys, other.tourneys);
  assert.equal(serialize(quiet), serialize(other));
});

test('a new sect is handed its affairs a few at a time; an older save keeps them all', () => {
  const old = createWorld({ seed: 2, playerSect: 'wudang' });
  for (const feature of FEATURES) assert.ok(isOpen(old, feature.id), `${feature.id} is shut in a world without a list`);
  assert.deepEqual(checkUnlocks(old), []);
  assert.deepEqual(stillToCome(old), []);

  const world = watchedWorld({ seed: 2 });
  startUnlocks(world);
  checkUnlocks(world);
  // The seat, the disciples, the chronicle and the saves are there from the first day.
  for (const page of ['seat', 'disciples', 'arts', 'chronicle', 'saves']) assert.ok(isOpen(world, page), page);
  assert.ok(!isOpen(world, 'world') && !isOpen(world, 'battle') && !isOpen(world, 'spy'));
  const order = [];
  for (let i = 0; i < 2 * DAYS_PER_YEAR && !world.outcome; i++) {
    days(world, 1);
    for (const feature of checkUnlocks(world)) {
      order.push(feature.id);
      assert.ok(feature.name && feature.about && feature.hint);
    }
  }
  assert.equal(order[0], 'world');
  assert.equal(order.length, FEATURES.length, `opened ${order}`);
  assert.equal(new Set(order).size, order.length, 'nothing opens twice');
  assert.deepEqual(stillToCome(world), []);
  // Nothing is told twice, and the list survives a save.
  assert.deepEqual(checkUnlocks(world), []);
  assert.deepEqual(deserialize(serialize(world)).state.unlocks, world.unlocks);

  const eager = watchedWorld({ seed: 2 });
  startUnlocks(eager);
  openAll(eager);
  assert.deepEqual(stillToCome(eager), []);
  assert.ok(isOpen(eager, 'spy'));
});

test('raising disciples leaves the rules of an unwatched world as they were', () => {
  // Two worlds from one seed, one of them watched but never asked anything, keep the same people and holdings.
  const a = createWorld({ seed: 9, playerSect: 'emei', autoPlayer: true }),
    b = createWorld({ seed: 9, playerSect: 'emei', autoPlayer: true });
  for (let i = 0; i < 500; i++) advanceDay(a), advanceDay(b);
  assert.equal(serialize(a), serialize(b));
  assert.ok(Object.values(a.persons).every((person) => !person.life), 'no records are kept where nobody is watching');
});
