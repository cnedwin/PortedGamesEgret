// 规则：地图（建造位不压道、每个都够得着一条道、闸在水道上）、建塔升级拆塔和银子、瞄准和伤害（盾、船、溅射、
// 燃烧、锣）、闸门拦船不拦人、沉船跳岸、波次、输赢、星数，以及电脑玩家在寻常难度能守住、不建塔必败。
// The rules: the map (no plot on a way, every plot in reach of one, the gates on the canal), building, raising and
// selling and the silver, aiming and damage (shields, boats, splash, burning, gongs), a gate holding boats but not
// men, a sinking crew going ashore, the waves, winning and losing, the stars, and the computer player holding on
// normal while a game with no towers is lost.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DIFFICULTY, GATE, GATES, PLOTS, RAIDERS, TOWERS, TOWER_KINDS, WAVES, WIDTH, stars } from '../src/sim/data.mjs';
import { PLAN, playOut } from '../src/sim/bot.mjs';
import { WAYS, build, callWave, createWorld, damageTo, sell, shutGate, starsOf, step, targetOf, upgrade } from '../src/sim/world.mjs';

/** A world with no waves coming, and raiders placed by hand. */
function quiet(seed = 1) {
  const world = createWorld(seed);
  world.state = 'break';
  world.breakLeft = 1e9;
  world.wave = 0;
  return world;
}
function put(world, kind, s, way = RAIDERS[kind].way) {
  const before = world.raiders.length;
  world.queue.push({ kind, at: world.time });
  step(world, 0);
  const raider = world.raiders[before];
  raider.way = way;
  raider.s = s;
  raider.lane = 0;
  step(world, 0);
  return raider;
}
const run = (world, seconds) => {
  const events = [];
  for (let t = 0; t < seconds; t += 0.05) events.push(...step(world, 0.05));
  return events;
};

test('no plot sits on a way, and every plot reaches one with its cheapest tower', () => {
  for (const [x, y] of PLOTS) {
    const water = WAYS.water.nearest(x, y).distance,
      road = WAYS.road.nearest(x, y).distance;
    assert.ok(water > WIDTH.water / 2 + 18, `plot ${x},${y} is in the canal`);
    assert.ok(road > WIDTH.road / 2 + 18, `plot ${x},${y} is on the towpath`);
    assert.ok(Math.min(water, road) < TOWERS.crossbow.levels[0].range, `plot ${x},${y} reaches nothing`);
  }
  for (const gate of GATES) assert.ok(gate.at > 0 && gate.at < WAYS.water.length);
});

test('the same seed gives the same game', () => {
  const a = playOut({ seed: 5 }),
    b = playOut({ seed: 5 });
  assert.equal(a.lives, b.lives);
  assert.equal(a.kills, b.kills);
  assert.equal(a.time, b.time);
});

test('building, raising and selling move the silver, and what cannot be paid is refused', () => {
  const world = createWorld(1);
  const start = world.silver;
  assert.deepEqual(build(world, 0, 'crossbow'), { ok: true });
  assert.equal(world.silver, start - TOWERS.crossbow.levels[0].cost);
  assert.equal(build(world, 0, 'fire').why, 'taken');
  assert.equal(build(world, 99, 'fire').why, 'plot');
  assert.equal(build(world, 1, 'cannon').why, 'kind');
  world.silver = 10;
  assert.equal(build(world, 1, 'gong').why, 'silver');
  assert.equal(upgrade(world, 0).why, 'silver');
  world.silver = 1000;
  assert.ok(upgrade(world, 0).ok && upgrade(world, 0).ok);
  assert.equal(upgrade(world, 0).why, 'top');
  const paid = TOWERS.crossbow.levels.reduce((sum, level) => sum + level.cost, 0);
  const back = sell(world, 0);
  assert.equal(back.silver, Math.floor(paid * 0.7));
  assert.equal(world.towers[0], null);
  assert.equal(sell(world, 0).why, 'empty');
});

test('a tower aims at the raider furthest along, and only within its reach', () => {
  const world = quiet();
  build(world, 10, 'crossbow');
  const tower = world.towers[10];
  const near = put(world, 'raider', WAYS.road.nearest(tower.x, tower.y).s - 40);
  const ahead = put(world, 'raider', WAYS.road.nearest(tower.x, tower.y).s + 40);
  put(world, 'raider', 20);
  assert.equal(targetOf(world, tower), ahead);
  ahead.s = WAYS.road.length - 1;
  step(world, 0);
  assert.equal(targetOf(world, tower), near);
});

test('shields turn arrows, stones and fire hit boats harder', () => {
  const shield = { kind: 'shield', way: 'road' },
    man = { kind: 'raider', way: 'road' },
    junk = { kind: 'junk', way: 'water' };
  assert.equal(damageTo(man, 'crossbow', 20), 20);
  assert.ok(Math.abs(damageTo(shield, 'crossbow', 20) - 20 * (1 - RAIDERS.shield.armor)) < 1e-9);
  assert.equal(damageTo(shield, 'trebuchet', 20), 20);
  assert.equal(damageTo(junk, 'trebuchet', 20), 20 * TOWERS.trebuchet.vsBoat);
  assert.equal(damageTo(junk, 'fire', 20), 20 * TOWERS.fire.vsBoat);
});

test('a crossbow wears a raider down and is paid its bounty', () => {
  const world = quiet();
  build(world, 10, 'crossbow');
  const raider = put(world, 'raider', WAYS.road.nearest(PLOTS[10][0], PLOTS[10][1]).s - 60);
  const silver = world.silver;
  const events = run(world, 6);
  assert.ok(events.some((e) => e.type === 'shot' && e.tower === 'crossbow'));
  assert.ok(events.some((e) => e.type === 'kill' && e.id === raider.id));
  assert.equal(world.silver, silver + RAIDERS.raider.bounty);
});

test('a stone hurts every raider near where it lands', () => {
  const world = quiet();
  world.silver = 1000;
  build(world, 4, 'trebuchet');
  const s = WAYS.road.nearest(PLOTS[4][0], PLOTS[4][1]).s + 30;
  const a = put(world, 'shield', s),
    b = put(world, 'shield', s + 8);
  // Held still, so the stone lands on them.
  const keep = RAIDERS.shield.speed;
  RAIDERS.shield.speed = 0;
  try {
    run(world, 4);
  } finally {
    RAIDERS.shield.speed = keep;
  }
  assert.ok(a.hp < a.max && b.hp < b.max, 'both were hit');
});

test('fire leaves a raider burning after the hit', () => {
  const world = quiet();
  world.silver = 1000;
  build(world, 9, 'fire');
  const skiff = put(world, 'skiff', WAYS.water.nearest(PLOTS[9][0], PLOTS[9][1]).s - 40);
  const events = run(world, 0.8);
  assert.ok(events.some((e) => e.type === 'hit' && e.tower === 'fire') || skiff.burnLeft > 0);
  assert.ok(skiff.burnLeft > 0 && skiff.burn > 0);
});

test('a gong slows raiders near it and quickens towers near it', () => {
  const world = quiet();
  world.silver = 1000;
  build(world, 7, 'gong');
  const [x, y] = PLOTS[7];
  const skiff = put(world, 'skiff', WAYS.water.nearest(x, y).s);
  const before = skiff.s;
  step(world, 0.1);
  const moved = skiff.s - before;
  assert.ok(Math.abs(moved - RAIDERS.skiff.speed * 0.1 * (1 - TOWERS.gong.levels[0].slow)) < 1e-6, `moved ${moved}`);
  // A crossbow beside the gong reloads faster than one out of its reach.
  build(world, 6, 'crossbow');
  build(world, 0, 'crossbow');
  assert.ok(Math.hypot(PLOTS[6][0] - x, PLOTS[6][1] - y) <= TOWERS.gong.levels[0].aura);
  const near = world.towers[6],
    far = world.towers[0];
  near.cooldown = far.cooldown = 5;
  step(world, 0.1);
  assert.ok(Math.abs(near.cooldown - (5 - 0.1 * (1 + TOWERS.gong.levels[0].haste))) < 1e-6, `near ${near.cooldown}`);
  assert.ok(Math.abs(far.cooldown - (5 - 0.1)) < 1e-6, `far ${far.cooldown}`);
});

test('a shut gate holds the boats above it for its time, and lets men walk on', () => {
  const world = quiet();
  const gate = GATES[0].at;
  const skiff = put(world, 'skiff', gate - 120),
    junk = put(world, 'junk', gate - 200),
    man = put(world, 'raider', 100);
  assert.ok(shutGate(world, 0).ok);
  assert.equal(shutGate(world, 0).why, 'cooling');
  run(world, GATE.shut - 0.5);
  assert.ok(skiff.s < gate, 'the skiff waits above the gate');
  assert.ok(junk.s < skiff.s, 'the junk waits behind it');
  assert.ok(man.s > 100 + RAIDERS.raider.speed * 4, 'the man walked on');
  run(world, 2);
  assert.ok(skiff.s > gate, 'the skiff goes on once the gate opens');
  assert.ok(world.gates[0].cooldownLeft > 0);
  run(world, GATE.cooldown);
  assert.ok(shutGate(world, 0).ok, 'the gate can be shut again after its cooldown');
});

test('a sunk junk puts its crew ashore on the towpath', () => {
  const world = quiet();
  const junk = put(world, 'junk', 600);
  junk.hp = 1;
  world.silver = 1000;
  build(world, 6, 'crossbow');
  junk.s = WAYS.water.nearest(PLOTS[6][0], PLOTS[6][1]).s;
  const events = run(world, 2);
  const ashore = events.filter((e) => e.type === 'ashore');
  assert.equal(ashore.length, RAIDERS.junk.crew);
  assert.ok(world.raiders.filter((r) => r.way === 'road').length >= 1);
});

test('a raider that reaches the wall costs lives; none left loses the game', () => {
  const world = quiet();
  const junk = put(world, 'junk', WAYS.water.length - 1);
  const events = run(world, 0.2);
  assert.ok(events.some((e) => e.type === 'leak' && e.lives === RAIDERS.junk.leak));
  assert.equal(world.lives, DIFFICULTY.normal.lives - RAIDERS.junk.leak);
  assert.ok(!world.raiders.includes(junk));
  world.lives = 1;
  put(world, 'skiff', WAYS.water.length - 1);
  const end = run(world, 0.2);
  assert.equal(world.state, 'lost');
  assert.ok(end.some((e) => e.type === 'lost'));
  assert.equal(starsOf(world), 0);
  assert.equal(build(world, 3, 'crossbow').why, 'over');
});

test('calling a wave early pays for the seconds left, and waves come in order', () => {
  const world = createWorld(1);
  const silver = world.silver,
    left = world.breakLeft;
  const call = callWave(world);
  assert.ok(call.ok);
  assert.equal(call.silver, Math.floor(left * 2));
  assert.equal(world.wave, 0);
  assert.ok(world.silver > silver);
  assert.equal(callWave(world).why, 'busy');
  const count = WAVES[0].reduce((sum, group) => sum + group.count, 0);
  assert.equal(world.queue.length, count);
});

test('every wave has raiders of known kinds, and the last brings the flagship', () => {
  assert.equal(WAVES.length, 12);
  for (const wave of WAVES) for (const group of wave) assert.ok(RAIDERS[group.kind] && group.count > 0 && group.gap > 0, JSON.stringify(group));
  assert.ok(WAVES.at(-1).some((group) => group.kind === 'flagship'));
  assert.deepEqual(TOWER_KINDS, ['crossbow', 'trebuchet', 'fire', 'gong']);
});

test('hard starts with fewer lives and less silver, and its raiders are stronger', () => {
  const normal = createWorld(1, 'normal'),
    hard = createWorld(1, 'hard');
  assert.ok(hard.lives < normal.lives && hard.silver <= normal.silver);
  callWave(normal);
  callWave(hard);
  run(normal, 0.1);
  run(hard, 0.1);
  assert.ok(hard.raiders[0].max > normal.raiders[0].max);
  assert.equal(createWorld(1, 'nightmare').difficulty, 'normal');
});

test('stars follow the lives kept', () => {
  assert.equal(stars(20, 20), 3);
  assert.equal(stars(18, 20), 3);
  assert.equal(stars(17, 20), 2);
  assert.equal(stars(10, 20), 2);
  assert.equal(stars(9, 20), 1);
  assert.equal(stars(0, 20), 0);
});

test('with no towers the game is lost; the computer player holds normal on every seed tried', () => {
  const none = playOut({ seed: 1, plan: [] });
  assert.equal(none.state, 'lost');
  for (let seed = 1; seed <= 4; seed++) {
    const world = playOut({ seed, plan: PLAN });
    assert.equal(world.state, 'won', `seed ${seed}`);
    assert.ok(starsOf(world) >= 2, `seed ${seed}: ${starsOf(world)} stars`);
  }
});
