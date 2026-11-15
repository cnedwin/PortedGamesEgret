import assert from 'node:assert/strict';
import test from 'node:test';
import { DAYS_PER_YEAR } from '../src/data/goods.mjs';
import { SECT_BY_ID, SECTS } from '../src/data/sects.mjs';
import { rollPerson } from '../src/core/persons.mjs';
import { createRng } from '../src/core/rng.mjs';
import { deserialize, serialize } from '../src/core/save.mjs';
import * as world from '../src/core/world.mjs';

test('stock and custom leaders can take both opening recruits if they remain at home', () => {
  for (const { id: playerSect, seat } of SECTS) {
    const state = world.createWorld({ seed: 27, playerSect });
    const head = state.persons[state.sects[playerSect].leaderId];
    assert.equal(head.rank, 5, playerSect);
    assert.equal(head.place, seat, playerSect);
    const applicants = state.places[seat].applicants;
    assert.equal(applicants.length, 2, playerSect);
    assert.equal(world.recruitAvailability(state, playerSect, seat, 0).person, applicants[0]);
    const room = world.beds(state, seat) - world.residents(state, seat).length;
    for (let i = 0; i < 2; i++) assert.ok(world.recruit(state, playerSect, seat, 0).ok, playerSect);
    assert.equal(world.beds(state, seat) - world.residents(state, seat).length, room - 2, playerSect);
    applicants.push(rollPerson(createRng(8), { place: seat }));
    assert.equal(world.recruitAvailability(state, playerSect, seat, 0).why, '厢房已满');
  }
  for (const scenario of ['many', 'lone', 'sides', 'five']) {
    const playerSect = 'tangmen';
    const state = world.createWorld({ seed: 11, playerSect, scenario, custom: { sect: playerSect, name: '照影门', leader: '顾照影' } });
    const { seat } = SECT_BY_ID[playerSect];
    const head = state.persons[state.sects[playerSect].leaderId];
    assert.equal(head.name, '顾照影');
    assert.equal(world.recruitAvailability(state, playerSect, seat, 0).ok, true, scenario);
    head.place = 'huashan';
    assert.equal(world.recruit(state, playerSect, seat, 0).why, '需掌门亲至面试');
    head.place = seat;
    for (let i = 0; i < 10; i++) world.advanceDay(state);
    assert.ok(world.recruit(state, playerSect, seat, 0).ok, scenario);
    assert.ok(world.recruit(state, playerSect, seat, 0).ok, scenario);
  }
  world.createWorld();
});

test('an actual early offensive launch only removes grace against that opponent', () => {
  const state = world.createWorld({ seed: 6, playerSect: 'huashan' });
  const team = (id) => world.membersOf(state, id).map(p => p.id);
  state.places.hengshan.owner = 'wudang';

  assert.equal(world.openingProtection(state).daysLeft, 5 * DAYS_PER_YEAR);
  assert.equal(world.assaultSides(state, 'shaolin', 'huashan', team('shaolin')).ok, false);
  assert.equal(world.assaultSides(state, 'wudang', 'huashan', team('wudang')).ok, false);
  assert.equal(world.beginAssault(state, 'huashan', 'songshan', []).ok, false);
  assert.equal(world.assaultSides(state, 'huashan', 'songshan', team('huashan')).ok, true);
  assert.deepEqual(world.openingProtection(state).provoked, []);

  // Launch and withdrawal still count as hostilities. A second launch does not restart the clock.
  assert.equal(world.beginAssault(state, 'huashan', 'songshan', team('huashan')).ok, true);
  assert.equal(world.beginAssault(state, 'huashan', 'songshan', team('huashan')).ok, true);
  const saved = deserialize(serialize(state));
  assert.ok(saved.ok);
  assert.deepEqual(world.openingProtection(saved.state).provoked, ['shaolin']);
  assert.equal(world.assaultSides(saved.state, 'shaolin', 'huashan', team('shaolin')).ok, true);
  assert.equal(world.assaultSides(saved.state, 'wudang', 'huashan', team('wudang')).ok, false);
  saved.state.day += world.openingProtection(saved.state).daysLeft;
  assert.equal(world.openingProtection(saved.state).active, false);
  assert.equal(world.assaultSides(saved.state, 'wudang', 'huashan', team('wudang')).ok, true);
});

test('an older saved appointment keeps its authority and original attack rules', () => {
  const state = world.createWorld({ seed: 5, playerSect: 'huashan', succession: true });
  delete state.opening;
  state.places.huashan.applicants = [rollPerson(createRng(8), { place: 'huashan' })];
  const books = state.sects.huashan;
  const former = state.persons[books.leaderId];
  former.rank = 4;
  former.place = 'hengshan';
  const successor = world.membersOf(state, 'huashan').find(p => p.rank === 4 && p !== former);
  successor.rank = 5;
  books.leaderId = successor.id;
  const saved = deserialize(serialize(state));
  assert.ok(saved.ok);
  assert.equal(world.openingProtection(saved.state), null);
  assert.equal(saved.state.sects.huashan.leaderId, successor.id);
  assert.ok(world.recruit(saved.state, 'huashan', 'huashan', 0).ok);
  const team = world.membersOf(saved.state, 'shaolin').map(p => p.id);
  assert.ok(world.assaultSides(saved.state, 'shaolin', 'huashan', team).ok);
});

test('the heir takes over recruitment after the opening head actually dies', () => {
  const state = world.createWorld({ seed: 5, playerSect: 'huashan', succession: true });
  const hall = state.sects.huashan;
  const startingHead = state.persons[hall.leaderId];
  startingHead.age = 100;
  state.day = DAYS_PER_YEAR - 1;
  world.advanceDay(state);
  assert.equal(state.persons[startingHead.id], undefined);
  assert.ok(state.log.some(entry => entry.type === 'succession' && entry.sect === 'huashan'));
  assert.equal(state.persons[hall.leaderId].rank, 5);
  state.places.huashan.applicants.push(rollPerson(createRng(8), { place: 'huashan' }));
  assert.ok(world.recruit(state, 'huashan', 'huashan', 0).ok);
});
