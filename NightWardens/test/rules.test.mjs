// 规则：同一个种子走出同一夜；符弩移动、瞄准、射击、击杀、魂珠和升级；邪祟咬城墙；三选一的符法；天雷符；
// 首领现身、倒下后这一夜守住；城墙破了这一夜失守；每种符法的效果；以及替身玩家整夜跑三夜，时长落在三到五分钟。
// The rules: one seed plays out one night; the crossbow moves, aims, fires, kills, gathers souls and gains levels;
// haunts bite the wall; the choice of wards; the thunder talisman; the warden comes and, once it falls, the night is
// held; a broken wall loses it; what each ward does; and the stand-in player's whole nights last three to five minutes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBot } from '../src/sim/bot.mjs';
import { HAUNTS, NIGHTS, WARDS, soulsFor } from '../src/sim/data.mjs';
import { FIELD, SOUL_FLIGHT, choose, createWorld, starsFor, step, thunderReady, turretStats, wardLevel } from '../src/sim/world.mjs';

const STEP = 1 / 60;
const run = (world, seconds, input = {}) => {
  const events = [];
  for (let t = 0; t < seconds && world.state === 'play' && !world.offer; t += STEP) events.push(...step(world, input, STEP));
  return events;
};
/** A world with nothing coming: its night's spawn table emptied, for tests that place their own haunts. */
function quiet(options = {}) {
  const world = createWorld(options);
  world.plan = { ...world.plan, bossAt: Infinity, phases: [{ until: Infinity, rates: {} }] };
  return world;
}
const place = (world, kind, x, y) => {
  const h = HAUNTS[kind],
    haunt = { id: world.nextId++, kind, x, y, hp: h.hp, max: h.hp, radius: h.radius, age: 1, phase: 0, slow: 0, burn: 0, burnDps: 0, stun: 0, summonTimer: 99, shootTimer: 99, stompTimer: 99, biteTimer: 0, driftTo: x, dead: false };
  world.haunts.push(haunt);
  return haunt;
};

test('the same seed and input play out the same night', () => {
  const a = createWorld({ night: 2, seed: 9 }),
    b = createWorld({ night: 2, seed: 9 });
  for (let i = 0; i < 60 * 40; i++) {
    const input = { move: Math.sin(i / 50) };
    if (a.offer) choose(a, a.offer[0]);
    if (b.offer) choose(b, b.offer[0]);
    step(a, input, STEP);
    step(b, input, STEP);
  }
  assert.equal(a.stats.kills, b.stats.kills);
  assert.equal(a.haunts.length, b.haunts.length);
  assert.deepEqual(a.wards, b.wards);
  assert.ok(a.stats.kills > 10, `${a.stats.kills} kills in forty seconds`);
});

test('the crossbow moves along the wall and stays on it', () => {
  const world = quiet();
  run(world, 3, { move: 1 });
  assert.equal(world.turret.x, FIELD.right);
  run(world, 4, { move: -1 });
  assert.equal(world.turret.x, FIELD.left);
});

test('the crossbow aims at the haunt nearest the wall, or at one spitting fire', () => {
  const world = quiet();
  const far = place(world, 'paper', 200, 200),
    near = place(world, 'paper', 340, 520);
  step(world, {}, STEP);
  assert.equal(world.turret.target, near.id);
  const spitter = place(world, 'lantern', 120, 400);
  step(world, {}, STEP);
  assert.equal(world.turret.target, spitter.id, 'a lantern ghost counts as nearer than it stands');
  assert.ok(far.id);
});

test('a bolt kills a paper doll, and its soul flies home and counts', () => {
  const world = quiet();
  place(world, 'paper', FIELD.width / 2, 520);
  const events = run(world, 2);
  assert.ok(events.some((e) => e.type === 'shot'));
  assert.ok(events.some((e) => e.type === 'kill' && e.kind === 'paper'));
  assert.equal(world.stats.kills, 1);
  run(world, SOUL_FLIGHT + 0.1);
  assert.equal(world.souls + (world.level - 1) * 0, HAUNTS.paper.soul);
});

test('a haunt that reaches the wall bites it and is gone', () => {
  const world = quiet();
  world.turret.x = FIELD.left;
  world.turret.cooldown = 99;
  const doll = place(world, 'paper', FIELD.right - 10, FIELD.wallY - HAUNTS.paper.radius - 1);
  const events = run(world, 0.2);
  assert.ok(events.some((e) => e.type === 'bite' && e.amount === HAUNTS.paper.bite));
  assert.equal(world.wall.hp, world.wall.max - HAUNTS.paper.bite);
  assert.ok(!world.haunts.includes(doll));
});

test('enough souls gain a level and offer three different wards; nothing moves until one is chosen', () => {
  const world = quiet();
  world.souls = soulsFor(1) - 1;
  world.orbs.push({ x: 100, y: 100, soul: 1, time: 0 });
  const events = run(world, SOUL_FLIGHT + 0.05);
  assert.ok(events.some((e) => e.type === 'level' && e.level === 2));
  assert.equal(world.offer.length, 3);
  assert.equal(new Set(world.offer).size, 3);
  const time = world.time;
  step(world, { move: 1 }, 1);
  assert.equal(world.time, time, 'the night waits while the choice is open');
  assert.equal(choose(world, 'not-a-ward'), false);
  const id = world.offer[1];
  assert.equal(choose(world, id), true);
  assert.equal(wardLevel(world, id), 1);
  assert.equal(world.offer, null);
});

test('the thunder talisman fills, then strikes every haunt on the road and stuns it', () => {
  const world = quiet();
  const a = place(world, 'jiangshi', 100, 300),
    b = place(world, 'paper', 400, 200);
  assert.equal(thunderReady(world), false);
  step(world, { thunder: true }, STEP);
  assert.equal(world.stats.thunders, 0, 'not before it is full');
  world.thunder = 1;
  const events = step(world, { thunder: true }, STEP);
  assert.ok(events.some((e) => e.type === 'thunder' && e.points.length === 2));
  assert.ok(b.dead, 'a paper doll does not survive it');
  assert.ok(a.hp < a.max && a.stun > 0);
  assert.equal(world.thunder < 0.01, true);
});

test('the warden comes at its hour; the night is held once it falls and the road is clear', () => {
  const world = createWorld({ night: 1, seed: 4 });
  world.plan = { ...world.plan, bossAt: 1, phases: [{ until: Infinity, rates: {} }] };
  const events = run(world, 1.1);
  assert.ok(events.some((e) => e.type === 'bossCame' && e.kind === 'general'));
  assert.equal(world.boss.kind, 'general');
  world.boss.hp = 1;
  world.boss.y = 500;
  const end = run(world, 5);
  assert.ok(end.some((e) => e.type === 'bossDown'));
  assert.equal(world.state, 'won');
  assert.equal(starsFor(world), 3);
});

test('a broken wall loses the night, and stars follow the wall left', () => {
  const world = quiet();
  world.wall.hp = 2;
  world.turret.cooldown = 99;
  world.turret.x = FIELD.left;
  place(world, 'jiangshi', FIELD.right - 10, FIELD.wallY - HAUNTS.jiangshi.radius - 1);
  run(world, 0.5);
  assert.equal(world.state, 'lost');
  assert.equal(starsFor(world), 0);
  const held = quiet();
  held.state = 'won';
  held.wall.hp = held.wall.max * 0.5;
  assert.equal(starsFor(held), 2);
  held.wall.hp = held.wall.max * 0.2;
  assert.equal(starsFor(held), 1);
});

test('each ward does what its line says', () => {
  const base = turretStats(createWorld()),
    strong = turretStats(createWorld({ wards: { volley: 2, haste: 2, cinnabar: 2, pierce: 1, crit: 1 } }));
  assert.equal(strong.bolts, base.bolts + 2);
  assert.ok(strong.interval < base.interval * 0.75);
  assert.equal(strong.damage, base.damage * 1.5);
  assert.equal(strong.pierce, 1);
  assert.ok(strong.crit > base.crit);
  const walled = createWorld({ wards: { wall: 1 } });
  assert.equal(walled.wall.max, 125);

  // Fire burns, frost slows.
  const fire = quiet({ wards: { fire: 1, frost: 1 } });
  const target = place(fire, 'jiangshi', FIELD.width / 2, 400);
  run(fire, 1.2);
  assert.ok(target.burn > 0 || target.dead, 'burning');
  assert.ok(target.slow > 0 || target.dead, 'slowed');

  // The ink line burns what lies across it; the mirror's beam strikes straight up the road.
  const ink = quiet({ wards: { ink: 1 } });
  ink.inkTimer = 0;
  ink.turret.cooldown = 99;
  const crossing = place(ink, 'jiangshi', 60, 560);
  run(ink, 0.5);
  assert.ok(crossing.hp < crossing.max);
  const mirror = quiet({ wards: { mirror: 1 } });
  mirror.mirrorTimer = 0;
  mirror.turret.cooldown = 99;
  const above = place(mirror, 'jiangshi', mirror.turret.x, 200);
  run(mirror, 0.05);
  assert.ok(above.hp <= above.max - 85);

  // Pierce: one bolt through two in a line.
  const line = quiet({ wards: { pierce: 1 } });
  const first = place(line, 'paper', FIELD.width / 2, 600),
    second = place(line, 'paper', FIELD.width / 2, 520);
  first.hp = second.hp = 5;
  line.turret.cooldown = 0;
  step(line, {}, STEP);
  line.turret.cooldown = 99;
  run(line, 0.8);
  assert.ok(first.dead && second.dead);
  assert.equal(line.stats.shots, 1, 'one shot took both');
});

test('wards stop being offered at their most, and a maxed crossbow mends the wall instead', () => {
  const all = Object.fromEntries(Object.entries(WARDS).map(([id, ward]) => [id, ward.max]));
  const world = quiet({ wards: all });
  world.wall.hp = 50;
  world.souls = soulsFor(1) - 1;
  world.orbs.push({ x: 0, y: 0, soul: 1, time: 0 });
  run(world, SOUL_FLIGHT + 0.05);
  assert.equal(world.offer, null);
  assert.ok(world.wall.hp > 50);
});

test('whole nights with the stand-in player last three to five minutes, and the first night is held', () => {
  for (const night of [1, 2, 3])
    for (const seed of [1, 2, 3]) {
      const world = createWorld({ night, seed }),
        bot = createBot(world);
      while (world.state === 'play' && world.time < 600) step(world, bot.think(), STEP);
      assert.notEqual(world.state, 'play', `night ${night} seed ${seed} never ended`);
      if (world.state === 'won') assert.ok(world.time > 180 && world.time < 330, `night ${night} seed ${seed}: ${Math.round(world.time)} s`);
      if (night === 1) assert.equal(world.state, 'won', `night 1 seed ${seed} fell`);
      assert.ok(world.time >= NIGHTS[night - 1].bossAt || world.state === 'lost');
    }
});
