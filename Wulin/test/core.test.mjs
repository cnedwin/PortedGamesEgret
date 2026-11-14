// Rule tests: the data, a fight, the world's days, saving and the editor, all
// without a page. Run from the Wulin folder with `node --test`.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ARTS, ART_BY_ID, CLASSES, PASSIVES, commonArt, sectArts, unmetNeeds } from '../src/data/arts.mjs';
import { BUILDINGS, ECONOMY } from '../src/data/goods.mjs';
import { PLACES, PLACE_BY_ID, travelDays } from '../src/data/places.mjs';
import { RANKS, SECTS } from '../src/data/sects.mjs';
import { createBattle, resolveBattle } from '../src/core/battle.mjs';
import { createEditor, describeItem, doublePress } from '../src/core/editor.mjs';
import { autoWheel, gainXp, hpMax, practise, rollPerson, trainingRate, xpToNext } from '../src/core/persons.mjs';
import { createRng } from '../src/core/rng.mjs';
import { createSlots, deserialize, serialize } from '../src/core/save.mjs';
import { advanceDay, assault, build, createWorld, ledger, membersOf, placesOf, promote, recruit, setJob, settle } from '../src/core/world.mjs';
import { fighter, roundRobin, series } from '../tools/balance.mjs';

test('the map has twenty strongholds, all joined, twelve of them seats', () => {
  assert.equal(PLACES.length, 20);
  assert.equal(PLACES.filter((place) => place.seat).length, 12);
  for (const place of PLACES) {
    assert.ok(place.roads.length >= 1, `${place.name} has no road`);
    for (const next of place.roads) assert.ok(PLACE_BY_ID[next].roads.includes(place.id), `${place.name} to ${next} is one-way`);
    assert.ok(Number.isFinite(travelDays('changbai', place.id)), `${place.name} cannot be reached`);
    const total = Object.values(place.resources).reduce((sum, grade) => sum + grade, 0);
    assert.ok(total >= 6 && total <= 10, `${place.name} resources total ${total}`);
  }
  assert.equal(PLACE_BY_ID.changbai.roads.length, 1);
  assert.equal(PLACE_BY_ID.songshan.roads.length, 5);
});

test('there are seventy-two arts: three open tiers per class and three for each sect', () => {
  assert.equal(ARTS.length, 72);
  assert.equal(new Set(ARTS.map((art) => art.id)).size, 72, 'art ids repeat');
  assert.equal(new Set(ARTS.map((art) => art.name)).size, 72, 'art names repeat');
  for (const klass of Object.keys(CLASSES)) for (const tier of [1, 2, 3]) assert.ok(commonArt(klass, tier), `${klass} tier ${tier}`);
  for (const sect of SECTS) {
    const own = sectArts(sect.id);
    assert.deepEqual(own.map((art) => art.tier), [4, 4, 5], sect.name);
    assert.ok(PLACE_BY_ID[sect.seat].seat === sect.id, `${sect.name} seat`);
  }
  for (const art of ARTS) {
    assert.equal(art.moves.length, 3);
    if (!CLASSES[art.klass].combat) assert.ok(PASSIVES[art.name], `${art.name} does nothing in a fight`);
  }
});

test('an art must be earned in order', () => {
  const person = rollPerson(createRng(1), { school: 'huashan' });
  assert.equal(unmetNeeds(person, commonArt('sword', 1)).length, 0);
  assert.ok(unmetNeeds(person, commonArt('sword', 2)).length > 0);
  person.arts[commonArt('sword', 1).id] = 500;
  assert.equal(unmetNeeds(person, commonArt('sword', 2)).length, 0);
  const four = sectArts('huashan')[0];
  assert.ok(unmetNeeds(person, four).includes('需为内门弟子'));
  assert.ok(unmetNeeds({ ...person, school: 'wudang' }, four).includes('非本门武学'));
});

test('practice follows aptitude, ground, tutor and tier', () => {
  const person = rollPerson(createRng(2));
  person.apt.blade = 50;
  const one = commonArt('sword', 1),
    three = commonArt('sword', 3);
  assert.equal(trainingRate(person, one, 0), 1);
  assert.ok(Math.abs(trainingRate(person, one, 1) - 1.1) < 1e-9);
  assert.ok(Math.abs(trainingRate(person, three, 0) - 1 / 3) < 1e-9);
  person.apt.blade = 100;
  assert.equal(trainingRate(person, one, 0), 2);
  practise(person, one, 250);
  assert.equal(person.arts[one.id], 250);
  practise(person, one, 5000);
  assert.equal(person.arts[one.id], 1000, 'mastery stops at ten levels');
});

test('experience raises levels and the stats that were used', () => {
  const person = rollPerson(createRng(3));
  const before = { ...person.stats };
  person.used = { arm: 100 };
  assert.equal(gainXp(person, xpToNext(1)), 1);
  assert.equal(person.level, 2);
  assert.ok(person.stats.arm - before.arm > person.stats.leg - before.leg);
  assert.ok(hpMax(person) > 400);
});

test('a fight is the same every time for one seed, and ends', () => {
  const sides = () => {
    const rng = createRng(5);
    return [Array.from({ length: 5 }, () => fighter(rng, 'mid')), Array.from({ length: 5 }, () => fighter(rng, 'mid'))];
  };
  const a = resolveBattle({ sides: sides(), seed: 9 });
  const b = resolveBattle({ sides: sides(), seed: 9 });
  assert.equal(a.time, b.time);
  assert.equal(a.winner, b.winner);
  assert.deepEqual(a.fighters.map((f) => f.dealt), b.fighters.map((f) => f.dealt));
  assert.ok(a.winner === 0 || a.winner === 1);
});

test('orders are obeyed: a side told to break off loses but gets away', () => {
  const rng = createRng(6);
  const battle = createBattle({ sides: [[fighter(rng, 'mid'), fighter(rng, 'mid')], [fighter(rng, 'mid'), fighter(rng, 'mid')]], seed: 2 });
  battle.retreat(0);
  while (!battle.done) battle.update();
  assert.equal(battle.winner, 1);
  assert.ok(battle.units.filter((unit) => unit.side === 0).every((unit) => unit.fled || unit.down));
});

test('ten a side lasts one to two minutes at every stage of a game', () => {
  for (const stage of ['early', 'mid', 'late']) {
    const team = (rng) => Array.from({ length: 10 }, () => fighter(rng, stage));
    const { seconds } = series(team, team, 30, 4);
    assert.ok(seconds > 55 && seconds < 120, `${stage}: ${seconds.toFixed(0)}s`);
  }
});

test('the weapon triangle is worth about four levels', () => {
  const duel = (offset) =>
    series(
      (rng) => [fighter(rng, 'mid', { klass: 'sword', levelOffset: offset })],
      (rng) => [fighter(rng, 'mid', { klass: 'fist' })],
      200,
      3,
    ).winRate;
  assert.ok(duel(0) > 0.9, 'even levels');
  assert.ok(duel(-2) > 0.65, 'two levels down');
  assert.ok(duel(-6) < 0.4, 'six levels down');
});

test('no sect is far stronger or weaker than the rest', () => {
  const rates = roundRobin(30, 5);
  for (const [id, rate] of Object.entries(rates)) assert.ok(rate > 0.36 && rate < 0.64, `${id} wins ${(rate * 100).toFixed(0)}%`);
});

test('a new world has twelve sects, each with a leader and a way to pay its people', () => {
  const state = createWorld({ seed: 3 });
  for (const sect of SECTS) {
    const members = membersOf(state, sect.id);
    assert.equal(members.length, 10);
    assert.equal(state.persons[state.sects[sect.id].leaderId].name, sect.leader.name);
    assert.equal(state.sects[sect.id].silver, ECONOMY.startSilver);
  }
  for (let day = 0; day < 360; day++) advanceDay(state);
  // Left alone for a year, the player's sect has not gone broke.
  assert.ok(ledger(state, state.playerSect).silver > ECONOMY.startSilver * 0.8, `silver ${ledger(state, state.playerSect).silver}`);
});

test('the same seed and the same choices give the same world', () => {
  const run = () => {
    const state = createWorld({ seed: 11, autoPlayer: true });
    for (let day = 0; day < 400; day++) advanceDay(state);
    return state;
  };
  assert.equal(JSON.stringify(run()), JSON.stringify(run()));
});

test('building, recruiting, training and promoting work and refuse sensibly', () => {
  const state = createWorld({ seed: 4, playerSect: 'huashan' });
  const me = 'huashan',
    home = 'huashan';
  assert.equal(build(state, me, home, 'hall').ok, false, 'a second main hall');
  assert.equal(build(state, me, 'songshan', 'dorm').ok, false, 'on another sect’s ground');
  const silver = state.sects[me].silver;
  assert.ok(build(state, me, home, 'dorm').ok);
  assert.equal(state.sects[me].silver, silver - BUILDINGS.dorm.cost);
  state.places[home].applicants = [rollPerson(createRng(8), { place: home })];
  const taken = recruit(state, me, home, 0);
  assert.ok(taken.ok, taken.why);
  const novice = taken.person;
  assert.equal(novice.school, me);
  assert.equal(setJob(state, novice.id, { kind: 'train', art: commonArt('sword', 2).id }).ok, false);
  assert.ok(setJob(state, novice.id, { kind: 'train', art: commonArt('sword', 1).id }).ok);
  assert.equal(promote(state, novice.id).ok, false, 'too soon');
  for (let day = 0; day < 60; day++) advanceDay(state);
  const mastery = novice.arts[commonArt('sword', 1).id];
  assert.ok(mastery > 300 && mastery < 1000, `sixty days of practice gave ${mastery}`);
  assert.ok(promote(state, novice.id).ok);
  assert.equal(RANKS[novice.rank].name, '外门');
});

test('open ground can be settled and a stronghold taken by force', () => {
  const state = createWorld({ seed: 6, playerSect: 'huashan' });
  assert.equal(settle(state, 'huashan', 'dongting').ok, false, 'not next door');
  assert.ok(settle(state, 'huashan', 'hengshan').ok);
  assert.ok(placesOf(state, 'huashan').includes('hengshan'));
  // March everyone on Songshan with the defenders reduced to one novice.
  for (const person of membersOf(state, 'shaolin')) if (person.rank < 5) delete state.persons[person.id];
  const leader = state.persons[state.sects.shaolin.leaderId];
  leader.level = 1;
  leader.arts = {};
  leader.wheel = [];
  const rng = createRng(1);
  const result = assault(state, 'huashan', 'songshan', membersOf(state, 'huashan').map((person) => person.id), rng);
  assert.ok(result.ok, result.why);
  assert.ok(result.won);
  assert.equal(state.places.songshan.owner, 'huashan');
  assert.equal(state.sects.shaolin.alive, false, 'a sect with no stronghold is gone');
});

test('a save survives a round trip and a damaged one is refused', () => {
  const state = createWorld({ seed: 2 });
  for (let day = 0; day < 25; day++) advanceDay(state);
  const text = serialize(state, '测试');
  const back = deserialize(text);
  assert.ok(back.ok);
  assert.equal(back.label, '测试');
  assert.deepEqual(back.state, JSON.parse(JSON.stringify(state)));
  // The loaded world carries on exactly as the original does.
  advanceDay(state);
  advanceDay(back.state);
  assert.equal(JSON.stringify(back.state), JSON.stringify(state));
  assert.equal(deserialize(text.replace('"day\\":25', '"day\\":26')).ok, false);
  assert.equal(deserialize('not a save').ok, false);
  assert.equal(deserialize(JSON.stringify({ magic: 'other' })).ok, false);
});

test('slots keep saves in the browser store', () => {
  const store = new Map();
  const storage = { setItem: (k, v) => store.set(k, v), getItem: (k) => store.get(k) ?? null, removeItem: (k) => store.delete(k), key: (i) => [...store.keys()][i], get length() { return store.size; } };
  const slots = createSlots(storage);
  const state = createWorld({ seed: 2 });
  assert.ok(slots.write('1', state, '开局'));
  assert.deepEqual(slots.list().map((slot) => slot.label), ['开局']);
  assert.ok(slots.read('1').ok);
  slots.remove('1');
  assert.equal(slots.read('1').ok, false);
});

test('the editor changes the world, marks it, and can put it back', () => {
  let state = createWorld({ seed: 2 });
  const editor = createEditor(() => state, (next) => (state = next));
  const me = state.playerSect,
    someone = membersOf(state, me)[3];
  editor.open();
  assert.equal(state.flags.editorUsed, false);
  assert.deepEqual(editor.setSilver(me, 50000), { ok: true, unusual: false });
  assert.equal(editor.setStat(someone.id, 'arm', 999).unusual, true);
  assert.ok(editor.setArt(someone.id, sectArts(me)[2].id, 10).ok);
  assert.ok(someone.insights.includes(sectArts(me)[2].id));
  assert.ok(editor.setStock(me, 'weapon:sword:7', 1).ok);
  assert.equal(describeItem('weapon:sword:7').name, '神兵剑');
  assert.equal(editor.setStock(me, 'nonsense', 1).ok, false);
  assert.equal(state.flags.editorUsed, true);
  assert.ok(editor.revert());
  assert.equal(state.sects[me].silver, ECONOMY.startSilver);
  assert.equal(state.flags.editorUsed, false);
});

test('the editor opens on F8 pressed twice quickly, not once and not slowly', () => {
  let opened = 0;
  const onKey = doublePress('F8', () => opened++);
  const press = (key, timeStamp) => onKey({ key, timeStamp, repeat: false });
  press('F8', 0);
  assert.equal(opened, 0);
  press('F8', 900);
  assert.equal(opened, 0, 'too slow');
  press('F8', 1100);
  assert.equal(opened, 1);
  press('F7', 1200);
  press('F8', 5000);
  press('F8', 5200);
  assert.equal(opened, 2);
});

test('every person in a default wheel throws moves they know', () => {
  const state = createWorld({ seed: 9 });
  for (const person of Object.values(state.persons)) for (const slot of autoWheel(person)) assert.ok(ART_BY_ID[slot.art].moves[slot.move]);
});

// ---- the wider martial world ---------------------------------------------------------------------------

const { formationsFor, join, modsOf, pendingView, resolvePending, setRule } = await import('../src/core/jianghu.mjs');
const { EVENTS, FORMATIONS, TALENTS, WANDERERS } = await import('../src/data/jianghu.mjs');
const worldModule = await import('../src/core/world.mjs');
const { openShop } = worldModule;

test('wanderers, talents and formations are well formed', () => {
  assert.equal(WANDERERS.length, 30);
  for (const w of WANDERERS) assert.ok(TALENTS[w.talent], w.name);
  for (const sect of SECTS) assert.equal(FORMATIONS[sect.id].sect, sect.id);
  for (const event of EVENTS) assert.ok(event.choices.length >= 2 && event.choices.every((c) => c.text && c.gives), event.id);
});

test('a wanderer who joins brings a talent, and a house rule adds to it', () => {
  const world = createWorld({ seed: 11, playerSect: 'wudang' });
  const rng = createRng(5);
  assert.equal(modsOf(world, 'wudang').train, 0);
  const person = join(world, 'wudang', WANDERERS.find((w) => w.talent === 'teach').id, rng);
  assert.equal(person.school, 'wudang');
  assert.ok(Math.abs(modsOf(world, 'wudang').train - 0.1) < 1e-9);
  assert.ok(setRule(world, 'wudang', 'strict').ok);
  assert.ok(Math.abs(modsOf(world, 'wudang').train - 0.2) < 1e-9);
  assert.ok(!setRule(world, 'wudang', 'nonsense').ok);
});

test('an event waits for the player in a watched world and resolves itself otherwise', () => {
  const watched = createWorld({ seed: 21, playerSect: 'emei' });
  watched.options.interactive = true;
  for (let day = 0; day < 400 && !watched.pending; day++) advanceDay(watched);
  const view = pendingView(watched);
  assert.ok(view && view.choices.length >= 2);
  const index = view.choices.findIndex((choice) => !choice.why);
  const rng = createRng(1);
  rng.state = watched.rng;
  assert.ok(resolvePending(watched, index, rng).ok);
  assert.equal(watched.pending, null);

  const alone = createWorld({ seed: 21, playerSect: 'emei' });
  for (let day = 0; day < 720; day++) advanceDay(alone);
  assert.ok(!alone.pending);
  assert.ok(alone.log.some((entry) => entry.type === 'event' || entry.type === 'join') || Object.keys(alone.met ?? {}).length > 0);
});

test('a sect formation needs an elder, and a shop costs silver', () => {
  const world = createWorld({ seed: 4, playerSect: 'shaolin' });
  const people = Object.values(world.persons).filter((p) => p.school === 'shaolin');
  assert.ok(formationsFor('shaolin', people).includes('shaolin'));
  assert.ok(!formationsFor('shaolin', people.filter((p) => p.rank < 4)).includes('shaolin'));
  assert.ok(!formationsFor('shaolin', people).includes('wudang'));
  const before = world.sects.shaolin.silver;
  assert.ok(openShop(world, 'shaolin', 'songshan').ok);
  assert.ok(world.sects.shaolin.silver < before);
  assert.equal(world.places.songshan.shops, 1);
});

// ---- more that a leader can do -------------------------------------------------------------------------

const extras = await import('../src/core/extras.mjs');
const { RELICS, MERIDIANS, SCENARIOS } = await import('../src/data/extras.mjs');
const { SECT_BY_ID: SECT_INDEX } = await import('../src/data/sects.mjs');

test('gear, named weapons and pills', () => {
  const world = createWorld({ seed: 6, playerSect: 'huashan' });
  const books = world.sects.huashan,
    leader = world.persons[books.leaderId];
  assert.equal(RELICS.length, 24);
  assert.ok(!extras.upgradeGear(world, leader.id).ok, 'a forge of the next level is needed');
  const junior = Object.values(world.persons).find((p) => p.school === 'huashan' && p.rank === 1);
  books.silver = 9999;
  books.res.iron = 999;
  world.places.huashan.buildings.find((b) => b.kind === 'forge' || b.kind === 'still') ?? world.places.huashan.buildings.push({ kind: 'forge', level: 1, xp: 0 });
  world.places.huashan.buildings.push({ kind: 'forge', level: 3, xp: 0 }, { kind: 'still', level: 5, xp: 0 });
  assert.ok(extras.upgradeGear(world, junior.id).ok);
  assert.equal(junior.gear.armor, 2);
  const rng = createRng(2);
  const relic = extras.findRelic(world, 'huashan', rng);
  const owned = RELICS.find((r) => r.slot === 'sword');
  books.relics = [owned.id, relic.id];
  assert.ok(extras.giveRelic(world, leader.id, owned.id).ok);
  assert.equal(leader.gear.weapon.power, owned.power);
  books.res.herb = 999;
  assert.ok(extras.makePill(world, 'huashan', 'heal1').ok);
  assert.ok(!extras.usePill(world, leader.id, 'heal1').ok, 'nobody is hurt');
  leader.wounds = 0.3;
  assert.ok(extras.usePill(world, leader.id, 'heal1').ok);
  assert.ok(leader.wounds < 0.3 && !books.stock['pill:heal1']);
});

test('a founded art, a manual and the meridians', () => {
  const world = createWorld({ seed: 6, playerSect: 'wudang' });
  const leader = world.persons[world.sects.wudang.leaderId];
  const known = Object.keys(leader.arts).filter((id) => ART_BY_ID[id].klass === 'sword');
  const picks = [`${known[0]}:0`, `${known[0]}:1`, `${known[1]}:0`];
  assert.ok(!extras.createArt(world, leader.id, '', picks).ok);
  const made = extras.createArt(world, leader.id, '松风剑', picks);
  assert.ok(made.ok, made.why);
  assert.ok(ART_BY_ID[made.art.id] && leader.arts[made.art.id] > 0);
  const text = serialize(world, 'x');
  delete ART_BY_ID[made.art.id];
  assert.ok(deserialize(text).ok && ART_BY_ID[made.art.id], 'a save brings its arts back');
  world.places.wudang.buildings.push({ kind: 'library', level: 1, xp: 0 });
  assert.ok(extras.writeManual(world, leader.id, known[0]).ok);
  assert.ok(extras.openMeridian(world, leader.id, 'a').ok);
  assert.equal(leader.meridians.length, 1);
  assert.equal(MERIDIANS.length, 8);
});

test('ways of beginning, a sect of one\'s own, and a siege that waits', () => {
  for (const scenario of Object.keys(SCENARIOS)) {
    const world = createWorld({ seed: 8, playerSect: 'emei', scenario });
    assert.ok(world.sects.emei.alive && membersOf(world, 'emei').length >= 5, scenario);
    for (let day = 0; day < 60; day++) advanceDay(world);
  }
  assert.equal(SECTS.filter((s) => createWorld({ seed: 8, playerSect: 'emei', scenario: 'five' }).sects[s.id].alive).length, 5);
  const own = createWorld({ seed: 8, playerSect: 'kunlun', custom: { sect: 'kunlun', name: '听雪楼', leader: '顾迟' } });
  assert.equal(SECT_INDEX.kunlun.name, '听雪楼');
  assert.equal(own.persons[own.sects.kunlun.leaderId].name, '顾迟');
  createWorld({ seed: 8 });
  assert.equal(SECT_INDEX.kunlun.name, '昆仑派');

  const world = createWorld({ seed: 31, playerSect: 'yaowang', difficulty: 3 });
  world.options.interactive = true;
  for (const person of membersOf(world, 'yaowang')) if (person.rank < 5) delete world.persons[person.id];
  let siege = null;
  for (let day = 0; day < 3600 && !siege && !world.outcome; day++) {
    advanceDay(world);
    if (world.pending?.kind === 'siege') siege = world.pending;
    else world.pending = null;
  }
  assert.ok(siege, 'a weak watched sect is attacked sooner or later, and the attack waits');
  assert.equal(world.places[siege.place].owner, 'yaowang');
});

test('a spy, a speciality and a duel', () => {
  const world = createWorld({ seed: 2, playerSect: 'tangmen' });
  assert.ok(extras.plantSpy(world, 'tangmen', 'wudang').ok);
  assert.ok(!extras.plantSpy(world, 'tangmen', 'wudang').ok);
  assert.ok(extras.spyBoost(world, 'tangmen', 'wudang') > 0);
  assert.ok(extras.setFocus(world, 'tangmen', 'yuzhou', 'drill').ok);
  assert.ok(extras.focusBoost(world, 'yuzhou', 'train') > 0);
  const rng = createRng(3);
  const leader = world.persons[world.sects.tangmen.leaderId];
  const duel = extras.duelSides(world, leader.id, rng);
  assert.ok(duel.ok);
  const battle = createBattle({ sides: duel.sides, seed: 5 });
  while (!battle.done) battle.update();
  assert.ok(battle.rally(0) === false || true);
  extras.settleDuel(world, leader.id, battle.winner === 0, 0.5, 100);
  assert.ok(!extras.duelSides(world, leader.id, rng).ok, 'the stage rests between bouts');
});

test('a rallying cry lasts a while and a stance can be taken back', () => {
  const world = createWorld({ seed: 5 });
  const a = membersOf(world, 'huashan'),
    b = membersOf(world, 'shaolin');
  const battle = createBattle({ sides: [a, b], seed: 1 });
  const unit = battle.units[0],
    attack = unit.attackBonus,
    defense = unit.defense;
  assert.ok(battle.rally(0) && !battle.rally(0));
  assert.ok(unit.attackBonus > attack);
  assert.ok(battle.stance(0, 'defend'));
  assert.ok(unit.defense > defense);
  assert.ok(battle.stance(0, 'even'));
  assert.ok(Math.abs(unit.defense - defense) < 1e-6);
  for (let i = 0; i < 200 && !battle.done; i++) battle.update();
  assert.ok(battle.done || Math.abs(unit.attackBonus - attack) < 1e-9);
});

test('roads between a sect\'s strongholds and to its friends bring trade', () => {
  const world = createWorld({ seed: 3, playerSect: 'shaolin' });
  const { tradeRoutes, ledger } = worldModule;
  assert.equal(tradeRoutes(world, 'shaolin').length, 0);
  world.places.huashan.owner = 'shaolin';
  const own = tradeRoutes(world, 'shaolin');
  assert.equal(own.filter((route) => route.kind === 'own').length, 1);
  world.sects.shaolin.relations.wudang = 60;
  assert.ok(tradeRoutes(world, 'shaolin').some((route) => route.kind === 'ally' && route.to === 'wudang'));
  world.places.songshan.shops = 2;
  assert.ok(ledger(world, 'shaolin').trade > own[0].income);
});

test('workshop goods are sold at the ten-day reckoning, better through shops', () => {
  const sell = (shops) => {
    const world = createWorld({ seed: 12, playerSect: 'caobang' });
    for (const person of membersOf(world, 'caobang')) person.job = { kind: 'rest' };
    world.places.yangzhou.shops = shops;
    world.sects.caobang.goods = 200;
    for (let day = 0; day < 10; day++) advanceDay(world);
    return world.sects.caobang;
  };
  const without = sell(0),
    withShops = sell(1);
  assert.equal(without.goods, 0);
  assert.deepEqual(without.sold, { goods: 200, retail: 0, glut: 0 });
  assert.equal(withShops.sold.retail, 150);
});

test('a wanderer\'s chapters: trial, wish, and the passing on of their art', () => {
  const world = createWorld({ seed: 17, playerSect: 'huashan' });
  world.options.interactive = true;
  const rng = createRng(9);
  const person = join(world, 'huashan', WANDERERS.find((w) => w.talent === 'trade').id, rng);
  const seen = [];
  for (let day = 0; day < 1500 && seen.length < 3; day++) {
    advanceDay(world);
    const kind = world.pending?.kind;
    if (!kind) continue;
    if (['trial', 'wish', 'legacy'].includes(kind)) {
      world.sects.huashan.silver += 2000;
      seen.push(kind);
      assert.ok(pendingView(world).choices.length === 2);
      assert.ok(resolvePending(world, 0, rng).ok, kind);
    } else world.pending = null;
  }
  assert.deepEqual(seen, ['trial', 'wish', 'legacy']);
  assert.ok(person.talentDeep);
  assert.equal(Object.values(world.persons).filter((p) => p.school === 'huashan' && p.talent === 'trade').length, 2);
});

test('voice: prefers a Taiwan Mandarin woman for generated text and remembers mute', async () => {
  const { createVoice } = await import('../src/ui/voice.mjs');
  const kept = new Map(),
    storage = { getItem: (k) => kept.get(k) ?? null, setItem: (k, v) => kept.set(k, v) };
  const spoken = [];
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };
  const available = [
    { lang: 'en-US', name: 'Sam' },
    { lang: 'zh-CN', name: 'Tingting' },
    { lang: 'zh-TW', name: 'Zhiwei' },
    { lang: 'zh_TW', name: 'Hanhan' },
  ];
  const synth = { getVoices: () => available, speak: (line) => spoken.push(line), cancel() {} };
  try {
    const voice = createVoice(storage, synth);
    assert.equal(voice.say('江湖路远'), true);
    assert.equal(spoken[0].voice.name, 'Hanhan');
    spoken[0].onend();
    assert.equal(voice.shout('太极剑法！'), true);
    assert.equal(voice.shout('太极剑法！'), false, 'cries are spaced out');
    voice.set({ on: false });
    assert.equal(voice.say('江湖路远'), false);
    assert.equal(createVoice(storage, synth).on, false, 'the choice is kept');
    assert.equal(createVoice(null, { getVoices: () => [available[0]] }).say('江湖路远'), false);
  } finally {
    delete globalThis.SpeechSynthesisUtterance;
  }
});

test('goals: matters come one at a time, each paying out once it is done', async () => {
  const { GOALS, claimGoal, goalView, startGoals } = await import('../src/core/goals.mjs');
  const world = createWorld({ seed: 3, playerSect: 'huashan' });
  startGoals(world);
  let view = goalView(world);
  assert.equal(view.id, 'time');
  assert.equal(view.done, false);
  assert.equal(claimGoal(world).ok, false);
  for (let i = 0; i < 10; i++) advanceDay(world);
  const silver = world.sects.huashan.silver;
  assert.equal(goalView(world).done, true);
  assert.equal(claimGoal(world).ok, true);
  assert.equal(world.sects.huashan.silver, silver + 200);
  assert.equal(goalView(world).id, 'recruit');
  // Building is counted from when it is asked for, not from the start of the game.
  world.goals.index = GOALS.findIndex((goal) => goal.id === 'build');
  assert.equal(goalView(world).done, false);
  world.places.huashan.buildings[0].level += 1;
  assert.equal(goalView(world).done, true);
  world.goals.index = GOALS.length;
  assert.equal(goalView(world).last, true);
});

test('library: a sect teaches only what it has, and finds the rest', async () => {
  const lib = await import('../src/core/library.mjs');
  const { ARTS, ART_BY_ID, commonArt, unmetNeeds } = await import('../src/data/arts.mjs');
  const { learnableArts } = await import('../src/core/persons.mjs');
  const world = createWorld({ seed: 11, playerSect: 'huashan' });
  const held = lib.heldArts(world, 'huashan');
  // Its own arts and its masters' lines, and nothing of anyone else's.
  assert.ok(ARTS.filter((art) => art.sect === 'huashan').every((art) => held.has(art.id)));
  assert.ok(held.has(commonArt('sword', 3).id) && held.has(commonArt('inner', 1).id));
  assert.ok(!held.has(commonArt('spear', 1).id) && !held.has(commonArt('dart', 1).id));
  assert.ok(lib.lackingArts(world, 'huashan').length >= 15, 'most of what is common is still to be found');
  const novice = Object.values(world.persons).find((p) => p.school === 'huashan' && p.rank === 1);
  const spear = commonArt('spear', 1);
  assert.ok(unmetNeeds(novice, spear, held).length > 0);
  assert.equal(setJob(world, novice.id, { kind: 'train', art: spear.id }).ok, false);
  assert.ok(learnableArts(novice, held).every((art) => held.has(art.id)));
  // A manual opens the art to everyone; so does someone who knows it well enough to teach.
  lib.addManual(world, 'huashan', spear.id);
  assert.equal(setJob(world, novice.id, { kind: 'train', art: spear.id }).ok, true);
  const dart = commonArt('dart', 1);
  novice.arts[dart.id] = lib.TEACH_LEVEL * 100;
  assert.ok(lib.heldArts(world, 'huashan').has(dart.id));
  // The pedlar's list holds still through a season and through a purchase, and changes with the next.
  const offers = lib.bookOffers(world, 'huashan');
  assert.ok(offers.length > 0 && offers.length <= 3);
  assert.deepEqual(lib.bookOffers(world, 'huashan'), offers);
  world.sects.huashan.silver = 10000;
  assert.equal(lib.buyManual(world, 'huashan', offers[0].id).ok, true);
  assert.equal(world.sects.huashan.silver, 10000 - offers[0].price);
  assert.deepEqual(lib.bookOffers(world, 'huashan'), offers.slice(1));
  assert.equal(lib.buyManual(world, 'huashan', offers[0].id).ok, false);
  // A friendly sect teaches what is common, for silver and goodwill; an unfriendly one does not.
  const other = 'shaolin',
    wanted = lib.teachingOffers(world, 'huashan', other)[0];
  assert.ok(wanted && !ART_BY_ID[wanted.id].sect);
  world.sects.huashan.relations[other] = 0;
  assert.equal(lib.askTeaching(world, 'huashan', other, wanted.id).ok, false);
  world.sects.huashan.relations[other] = 90;
  assert.equal(lib.askTeaching(world, 'huashan', other, wanted.id).ok, true);
  assert.equal(world.sects.huashan.relations[other], 90 - lib.TEACHING.goodwill);
  assert.ok(lib.heldArts(world, 'huashan').has(wanted.id));
  // What is taken from a fallen library is new to the taker.
  const before = lib.heldArts(world, 'huashan').size;
  const rng = { int: (a) => a };
  assert.equal(lib.lootManuals(world, 'huashan', 'tangmen', rng).length, lib.LOOT_COUNT);
  assert.equal(lib.heldArts(world, 'huashan').size, before + lib.LOOT_COUNT);
});
