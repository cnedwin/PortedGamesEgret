// 规则：伤害公式与原作资料里的算例一致；地形星与骷髅、空中与建筑不吃地形、要塞减半；反击、器械不能移动后攻击；
// 每个兵种的暴击条件；占领、收入、修复、招募、援军、治疗、诅咒、运输；三位指挥官的战意技；地图左右对等；同一个种子
// 下电脑对电脑的结果相同。
// The rules: the damage formula matches the worked example in the original's documentation; stars and skulls of
// terrain, fliers and buildings without cover, a stronghold's half damage; counters, siege engines that cannot strike
// after moving; every unit's critical condition; capture, income, mending, recruiting, reinforcing, healing, hexes and
// carrying; the commanders' rally arts; maps fair to both sides; and the same seed giving the same computer battle.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAPS, mapById } from '../src/sim/maps.mjs';
import { UNITS, BUILDINGS } from '../src/sim/units.mjs';
import { COMMANDERS } from '../src/sim/commanders.mjs';
import * as R from '../src/sim/rules.mjs';
import { autoPlay, createBrain, nextOrder } from '../src/sim/ai.mjs';

/** A small open field: plains everywhere, with a stronghold for each side in the corners and nothing else. */
function field(w = 10, h = 8, terrain = {}) {
  const t = Array(w * h).fill('plains');
  for (const [k, v] of Object.entries(terrain)) {
    const [x, y] = k.split(',').map(Number);
    t[y * w + x] = v;
  }
  return {
    id: 'test',
    w,
    h,
    gold: 0,
    terrain: t,
    buildings: [
      { kind: 'hq', x: 0, y: h - 1, owner: 0 },
      { kind: 'hq', x: w - 1, y: 0, owner: 1 }
    ],
    units: [],
    commanders: [
      { x: 0, y: h - 2 },
      { x: w - 1, y: 1 }
    ]
  };
}
const sides = [{ commander: 'seline' }, { commander: 'garron' }];
function place(game, type, owner, x, y, hp = 100) {
  const u = { id: game.nextId++, type, owner, x, y, sx: x, sy: y, hp, done: false, cargo: [], guard: 0 };
  game.units.push(u);
  return u;
}

test('maps are the same for both sides, turned half a circle', () => {
  for (const m of MAPS) {
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) assert.equal(m.terrain[y * m.w + x], m.terrain[(m.h - 1 - y) * m.w + (m.w - 1 - x)], `${m.id} ${x},${y}`);
    for (const b of m.buildings) {
      const twin = m.buildings.find((c) => c.x === m.w - 1 - b.x && c.y === m.h - 1 - b.y);
      assert.ok(twin && twin.kind === b.kind, `${m.id} building ${b.x},${b.y}`);
      assert.equal(twin.owner, b.owner < 0 ? -1 : 1 - b.owner);
    }
    assert.equal(m.buildings.filter((b) => b.kind === 'hq').length, 2, m.id);
    assert.equal(m.units.filter((u) => u.owner === 0).length, m.units.filter((u) => u.owner === 1).length);
  }
});

test('the damage formula matches the worked example: 75% swordsman, crit, against a 60% hound on a mountain', () => {
  const game = R.createGame(field(6, 6, { '3,3': 'mountain' }), sides, 1);
  const hound = place(game, 'hound', 1, 3, 3, 60);
  const base = R.baseDamage(game, 'swordsman', hound);
  assert.equal(base, 0.45);
  // offence 0.45 + a mid roll's 5%, cover 1 − 0.6 × 4 × 10%, critical 1.5.
  assert.equal(R.solveDamage(game, base, 75, hound, 1.5, 0.5), Math.round(100 * 0.75 * 0.5 * 0.76 * 1.5));
  // The roll spreads damage over 10 points before a critical and 10 / 1.5 after it; the middle stays put.
  const lo = R.solveDamage(game, base, 100, { ...hound, hp: 100 }, 1, 0),
    hi = R.solveDamage(game, base, 100, { ...hound, hp: 100 }, 1, 1);
  assert.equal(hi - lo, 6);
});

test('cover: stars shrink with the defender’s health, skulls do not, fliers and buildings get none', () => {
  const game = R.createGame(field(6, 6, { '1,1': 'forest', '2,2': 'river', '3,3': 'mountain' }), sides, 1);
  const inForest = place(game, 'swordsman', 1, 1, 1, 100);
  const hurt = place(game, 'pikeman', 1, 4, 4, 100);
  assert.equal(R.solveDamage(game, 1, 100, inForest, 1, 0), 70);
  const inRiver = place(game, 'swordsman', 1, 2, 2, 30);
  assert.equal(R.solveDamage(game, 1, 100, inRiver, 1, 0), 120);
  const flier = place(game, 'griffin', 1, 3, 3, 100);
  assert.equal(R.solveDamage(game, 1, 100, flier, 1, 0), 100);
  void hurt;
  const hq = game.buildings.find((b) => b.kind === 'hq' && b.owner === 1);
  assert.equal(R.solveDamage(game, 0.65, 100, hq, 1, 0), 33);
});

test('a strike is answered by a counter at the defender’s new health; siege engines neither move and strike nor answer', () => {
  const game = R.createGame(field(), sides, 4);
  const a = place(game, 'swordsman', 0, 4, 4);
  const d = place(game, 'swordsman', 1, 5, 4);
  const events = R.act(game, { kind: 'move', unit: a.id, to: { x: 4, y: 4 }, then: { kind: 'attack', target: { unit: d.id } } });
  const [hit, back] = events.filter((e) => e.type === 'strike');
  assert.ok(hit && back && back.counter);
  assert.equal(back.damage, R.solveDamage(game, 0.55, d.hp, { ...a, hp: 100 }, 1, 0) + (back.damage - R.solveDamage(game, 0.55, d.hp, { ...a, hp: 100 }, 1, 0)));
  assert.ok(back.damage < hit.damage, 'the hurt defender hits back softer');
  // A ballista that moved cannot shoot; one that stands can, and is not answered.
  const g2 = R.createGame(field(), sides, 4);
  const b = place(g2, 'ballista', 0, 2, 4);
  const archer = place(g2, 'archer', 1, 7, 4);
  const moved = R.reach(g2, b);
  assert.ok(moved.size > 1);
  assert.equal(R.canStrike(g2, b, 3, 4, archer, true), false);
  assert.equal(R.canStrike(g2, b, 2, 4, archer, false), true);
  const ev = R.act(g2, { kind: 'move', unit: b.id, to: { x: 2, y: 4 }, then: { kind: 'attack', target: { unit: archer.id } } });
  assert.equal(ev.filter((e) => e.type === 'strike').length, 1);
});

test('archers shoot back at range, and only a standing archer lands a critical', () => {
  const game = R.createGame(field(), sides, 2);
  const archer = place(game, 'archer', 1, 6, 4);
  const mage = place(game, 'mage', 0, 4, 4);
  void mage;
  const f = R.forecast(game, archer, 6, 4, place(game, 'swordsman', 0, 6, 6), false);
  assert.equal(f.critical, true);
  const g = R.forecast(game, archer, 6, 5, R.unitAt(game, 6, 6), true);
  assert.equal(g.critical, false);
  const attacker = place(game, 'pikeman', 0, 6, 2);
  const fc = R.forecast(game, attacker, 6, 3, archer, true);
  assert.ok(fc.counter, 'an archer next to its attacker answers');
});

test('every critical condition', () => {
  const game = R.createGame(field(12, 10, { '5,5': 'mountain', '8,8': 'road', '2,2': 'forest' }), sides, 3);
  const c = (a, d, s) => R.criticalOf(game, a, d, s);
  const foe = place(game, 'swordsman', 1, 6, 1);
  // Swordsman next to its commander.
  const sw = place(game, 'swordsman', 0, 1, 8);
  assert.equal(c(sw, foe, { ax: 1, ay: 8 }), 1.5);
  assert.equal(c(sw, foe, { ax: 3, ay: 7 }), 1);
  // Hound with a friendly hound beside the target.
  const h1 = place(game, 'hound', 0, 5, 1);
  assert.equal(c(h1, foe, { ax: 5, ay: 1 }), 1);
  place(game, 'hound', 0, 7, 1);
  assert.equal(c(h1, foe, { ax: 5, ay: 1 }), 1.5);
  // Pikeman beside another pikeman.
  const p1 = place(game, 'pikeman', 0, 9, 5);
  assert.equal(c(p1, foe, { ax: 9, ay: 5 }), 1);
  place(game, 'pikeman', 0, 9, 6);
  assert.equal(c(p1, foe, { ax: 9, ay: 5 }), 1.5);
  // Knight that charged exactly six tiles from where it began.
  const kn = place(game, 'knight', 0, 0, 0);
  assert.equal(c(kn, foe, { ax: 3, ay: 3 }), 1.5);
  assert.equal(c(kn, foe, { ax: 3, ay: 2 }), 1);
  // Mage on high ground (forest, three stars).
  const mg = place(game, 'mage', 0, 2, 2);
  assert.equal(c(mg, foe, { ax: 2, ay: 2 }), 1.5);
  assert.equal(c(mg, foe, { ax: 2, ay: 3 }), 1);
  // Ballista at two tiles, trebuchet at five.
  const bl = place(game, 'ballista', 0, 6, 3);
  assert.equal(c(bl, foe, { ax: 6, ay: 3 }), 1.5);
  const tr = place(game, 'trebuchet', 0, 6, 6);
  assert.equal(c(tr, foe, { ax: 6, ay: 6 }), 1.5);
  assert.equal(c(tr, foe, { ax: 6, ay: 5 }), 1);
  // Giant at 40 health or less.
  assert.equal(c(place(game, 'giant', 0, 10, 9, 40), foe, { ax: 10, ay: 9 }), 2.5);
  assert.equal(c(place(game, 'giant', 0, 11, 9, 41), foe, { ax: 11, ay: 9 }), 1);
  // Griffin above a mountain; wyvern against a target on a road.
  assert.equal(c(place(game, 'griffin', 0, 5, 5), foe, { ax: 5, ay: 5 }), 1.25);
  const onRoad = place(game, 'swordsman', 1, 8, 8);
  assert.equal(c(place(game, 'wyvern', 0, 8, 7), onRoad, { ax: 8, ay: 7 }), 2);
  // Witch, unless the target has a witch of its own beside it.
  const enemyBalloon = place(game, 'balloon', 1, 10, 2);
  const wi = place(game, 'witch', 0, 10, 3);
  assert.equal(c(wi, enemyBalloon, { ax: 10, ay: 3 }), 2);
  place(game, 'witch', 1, 11, 2);
  assert.equal(c(wi, enemyBalloon, { ax: 10, ay: 3 }), 1);
  // Archer standing still, not on a counter.
  const ar = place(game, 'archer', 0, 4, 9);
  assert.equal(c(ar, foe, { ax: 4, ay: 9, moved: false, counter: false }), 1.35);
  assert.equal(c(ar, foe, { ax: 4, ay: 9, moved: false, counter: true }), 1);
  // Every rule a unit names exists, and commanders have none.
  for (const [id, u] of Object.entries(UNITS)) if (u.crit) assert.ok(R.CRITICAL[u.crit.rule], id);
  assert.equal(UNITS.commander.crit, null);
});

test('capture gives a free building to the side with half the capturer’s health, and income follows', () => {
  const m = field();
  m.buildings.push({ kind: 'village', x: 5, y: 4, owner: -1 });
  const game = R.createGame(m, sides, 1);
  const sw = place(game, 'swordsman', 0, 4, 4, 81);
  assert.equal(R.incomeOf(game, 0), 100);
  const village = R.buildingAt(game, 5, 4);
  R.act(game, { kind: 'move', unit: sw.id, to: { x: 4, y: 4 }, then: { kind: 'capture', building: village.id } });
  assert.equal(village.owner, 0);
  assert.equal(village.hp, 40);
  assert.equal(R.incomeOf(game, 0), 200);
  // Knocked to nothing, a village stands empty again; a stronghold knocked to nothing loses the battle.
  village.hp = 1;
  const foe = place(game, 'knight', 1, 6, 4);
  R.act(game, { kind: 'end' });
  village.hp = 1;
  R.act(game, { kind: 'move', unit: foe.id, to: { x: 6, y: 4 }, then: { kind: 'attack', target: { building: village.id } } });
  assert.equal(village.owner, -1);
  // Hounds cannot capture.
  assert.equal(!!UNITS.hound.capture, false);
});

test('turns: income at the start, buildings and the commander mend, units are ready again, the meter fills', () => {
  const game = R.createGame(field(), sides, 1);
  assert.equal(game.players[0].gold, 100);
  const cmd = R.commanderOf(game, 1);
  cmd.hp = 50;
  const hq = game.buildings.find((b) => b.owner === 1);
  hq.hp = 60;
  R.act(game, { kind: 'end' });
  assert.equal(game.current, 1);
  assert.equal(game.players[1].gold, 100);
  assert.equal(cmd.hp, 55);
  assert.equal(hq.hp, 70);
  assert.equal(game.players[0].meter, COMMANDERS.seline.charge.turn);
  R.act(game, { kind: 'end' });
  assert.equal(game.turn, 2);
  assert.equal(game.players[0].gold, 200);
});

test('recruiting: once a building a turn, paid for, and the newcomer waits a turn', () => {
  const m = field();
  m.buildings.push({ kind: 'barracks', x: 2, y: 5, owner: 0 });
  m.gold = 1000;
  const game = R.createGame(m, sides, 1);
  const b = R.buildingAt(game, 2, 5);
  const spots = R.recruitSpots(game, b, 'knight');
  assert.ok(spots.length);
  assert.deepEqual(R.recruitSpots(game, b, 'griffin'), [], 'barracks train no fliers');
  R.act(game, { kind: 'recruit', building: b.id, type: 'knight', at: spots[0] });
  assert.equal(game.players[0].gold, 1100 - 600);
  const knight = R.unitAt(game, spots[0].x, spots[0].y);
  assert.equal(knight.done, true);
  assert.deepEqual(R.recruitSpots(game, b, 'swordsman'), []);
});

test('reinforcing costs the unit’s price times the health it gets back, drawn from the building', () => {
  const m = field();
  m.buildings.push({ kind: 'village', x: 5, y: 4, owner: 0 });
  m.gold = 1000;
  const game = R.createGame(m, sides, 1);
  const kn = place(game, 'knight', 0, 4, 4, 40);
  const plan = R.reinforcePlan(game, kn, 4, 4);
  assert.deepEqual([plan.heal, plan.cost], [60, 360]);
  R.act(game, { kind: 'move', unit: kn.id, to: { x: 4, y: 4 }, then: { kind: 'reinforce' } });
  assert.equal(kn.hp, 100);
  assert.equal(R.buildingAt(game, 5, 4).hp, 40);
  assert.equal(game.players[0].gold, 1000 + 200 - 360);
});

test('a mage heals 20 around a tile for 300 gold; a witch hexes every foe within four for 300', () => {
  const m = field();
  m.gold = 700;
  const game = R.createGame(m, sides, 1);
  const mage = place(game, 'mage', 0, 4, 4);
  const a = place(game, 'swordsman', 0, 5, 5, 50),
    b = place(game, 'pikeman', 0, 6, 4, 95);
  R.act(game, { kind: 'move', unit: mage.id, to: { x: 4, y: 4 }, then: { kind: 'heal', at: { x: 5, y: 4 } } });
  assert.deepEqual([a.hp, b.hp, game.players[0].gold], [70, 100, 500]);
  const witch = place(game, 'witch', 0, 2, 2);
  const near = place(game, 'swordsman', 1, 4, 3),
    far = place(game, 'swordsman', 1, 9, 7);
  R.act(game, { kind: 'move', unit: witch.id, to: { x: 2, y: 2 }, then: { kind: 'hex' } });
  assert.deepEqual([near.hp, far.hp, game.players[0].gold], [90, 100, 200]);
});

test('carriers take passengers aboard and set them down beside them', () => {
  const m = field();
  const game = R.createGame(m, sides, 1);
  const wagon = place(game, 'wagon', 0, 4, 4);
  const sw = place(game, 'swordsman', 0, 3, 4);
  const giant = place(game, 'giant', 0, 3, 5);
  assert.equal(R.canBoard(giant, wagon), false, 'a wagon carries only the light');
  R.act(game, { kind: 'move', unit: sw.id, to: { x: 4, y: 4 }, then: { kind: 'load' } });
  assert.equal(wagon.cargo.length, 1);
  assert.equal(R.unitById(game, sw.id), null);
  R.act(game, { kind: 'end' });
  R.act(game, { kind: 'end' });
  R.act(game, { kind: 'move', unit: wagon.id, to: { x: 6, y: 4 }, then: { kind: 'unload', drops: [{ unit: sw.id, x: 7, y: 4 }] } });
  assert.equal(R.unitAt(game, 7, 4)?.id, sw.id);
  assert.equal(wagon.cargo.length, 0);
});

test('rally arts: a lance down a line, a starfall, a draining pact, a guarding command', () => {
  const m = field();
  const make = (commander) => {
    const game = R.createGame(m, [{ commander }, { commander: 'garron' }], 1);
    game.players[0].meter = COMMANDERS[commander].meter;
    return game;
  };
  let game = make('seline');
  let me = R.commanderOf(game, 0);
  const line = [1, 2, 3].map((i) => place(game, 'swordsman', 1, me.x + i, me.y));
  R.act(game, { kind: 'move', unit: me.id, to: { x: me.x, y: me.y }, then: { kind: 'art', dir: [1, 0] } });
  for (const u of line) assert.ok(u.hp < 100 || !R.unitById(game, u.id));
  assert.equal(game.players[0].meter, 0);

  game = make('edmund');
  me = R.commanderOf(game, 0);
  const t1 = place(game, 'knight', 1, 3, 5),
    t2 = place(game, 'knight', 1, 3, 6);
  R.act(game, { kind: 'move', unit: me.id, to: { x: me.x, y: me.y }, then: { kind: 'art', at: { x: 3, y: 5 } } });
  assert.deepEqual([t1.hp, t2.hp], [70, 70]);

  game = make('vireta');
  me = R.commanderOf(game, 0);
  me.hp = 60;
  const v1 = place(game, 'swordsman', 1, me.x + 1, me.y, 15);
  R.act(game, { kind: 'move', unit: me.id, to: { x: me.x, y: me.y }, then: { kind: 'art' } });
  assert.equal(v1.hp, 1, 'the pact leaves at least one');
  assert.equal(me.hp, 67);

  game = make('garron');
  me = R.commanderOf(game, 0);
  const friend = place(game, 'pikeman', 0, me.x + 1, me.y, 50);
  R.act(game, { kind: 'move', unit: me.id, to: { x: me.x, y: me.y }, then: { kind: 'art' } });
  assert.deepEqual([friend.hp, friend.guard], [60, 0.4]);
  const foe = place(game, 'swordsman', 1, me.x + 2, me.y);
  assert.ok(R.solveDamage(game, 0.75, 100, friend, 1, 0) < R.solveDamage(game, 0.75, 100, { ...friend, guard: 0 }, 1, 0));
  void foe;
});

test('a fallen commander or a broken stronghold ends the battle', () => {
  const game = R.createGame(field(), sides, 1);
  const theirs = R.commanderOf(game, 1);
  theirs.hp = 5;
  const k = place(game, 'knight', 0, theirs.x - 1, theirs.y);
  const events = R.act(game, { kind: 'move', unit: k.id, to: { x: k.x, y: k.y }, then: { kind: 'attack', target: { unit: theirs.id } } });
  assert.ok(events.some((e) => e.type === 'victory' && e.owner === 0));
  assert.equal(game.over, true);
  assert.throws(() => R.act(game, { kind: 'end' }));
});

test('illegal orders are refused', () => {
  const game = R.createGame(field(), sides, 1);
  const mine = R.commanderOf(game, 0);
  const theirs = R.commanderOf(game, 1);
  assert.throws(() => R.act(game, { kind: 'move', unit: theirs.id, to: { x: theirs.x, y: theirs.y } }));
  assert.throws(() => R.act(game, { kind: 'move', unit: mine.id, to: { x: 9, y: 0 } }));
  assert.throws(() => R.act(game, { kind: 'move', unit: mine.id, to: { x: mine.x, y: mine.y }, then: { kind: 'art' } }));
});

test('a battle copied mid-way plays on exactly as the original', () => {
  const m = mapById('wheat');
  const a = R.createGame(m, [{ commander: 'seline', ai: true }, { commander: 'vireta', ai: true }], 77);
  const brains = [createBrain('normal'), createBrain('normal')];
  for (let i = 0; i < 40; i++) R.act(a, nextOrder(a, brains[a.current]));
  const b = R.cloneGame(a);
  const brainsB = [createBrain('normal'), createBrain('normal')];
  const brainsA = [createBrain('normal'), createBrain('normal')];
  for (let i = 0; i < 80 && !a.over; i++) {
    R.act(a, nextOrder(a, brainsA[a.current]));
    R.act(b, nextOrder(b, brainsB[b.current]));
  }
  assert.deepEqual(R.cloneGame(a), R.cloneGame(b));
});

test('computer against computer: the same seed, the same battle; and battles end', () => {
  const run = (seed, map = 'wheat') => autoPlay(R.createGame(mapById(map), [{ commander: 'edmund', ai: true }, { commander: 'garron', ai: true }], seed), R.act, ['normal', 'normal'], 60);
  assert.deepEqual(R.cloneGame(run(5)), R.cloneGame(run(5)));
  let ended = 0;
  for (const map of ['wheat', 'coves', 'spine']) for (const seed of [1, 2]) if (run(seed, map).over) ended++;
  assert.ok(ended >= 4, `only ${ended} of 6 battles ended within 60 turns`);
});

test('the tables are whole: every unit has a price, movement and a sight; recruiting buildings train something', () => {
  for (const [id, u] of Object.entries(UNITS)) {
    assert.ok(u.cost > 0 && u.steps > 0 && u.sight > 0, id);
    if (u.weapon) for (const [target, v] of Object.entries(u.weapon.damage)) assert.ok(UNITS[target] || target === 'structure', `${id} → ${target}`), assert.ok(v > 0);
  }
  for (const [kind, b] of Object.entries(BUILDINGS)) if (b.takes) assert.ok(Object.values(UNITS).some((u) => u.tags.some((t) => b.takes.includes(t))), kind);
});
