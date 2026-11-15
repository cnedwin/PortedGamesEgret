// Checks on the rules, run with `node --test` from this folder.
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

register('../tools/egret-resolve.mjs', import.meta.url);
const { createGame, idleInput } = await import('../src/sim.mjs');
const { createBot } = await import('../src/bot.mjs');
const { PLACES, BOXES, walkable } = await import('../src/level.mjs');
const { MISSION, PLAYER, WEAPONS } = await import('../src/data.mjs');

const STEP = 1 / 60;
/** Advance a game by `seconds`, building each step's input with `press(input, t)`. */
function run(game, seconds, press = () => {}) {
  const events = [];
  for (let t = 0; t < seconds; t += STEP) {
    const input = idleInput();
    press(input, t);
    game.update(STEP, input);
    events.push(...game.events);
    game.events.length = 0;
  }
  return events;
}
/** A game past its briefing, ready to act. */
function started(seed = 7) {
  const game = createGame({ seed });
  run(game, MISSION.introSeconds + 0.1);
  assert.equal(game.state, 'play');
  return game;
}
function playOut(seed, limit = 600) {
  const game = createGame({ seed }),
    bot = createBot(game);
  for (let t = 0; t < limit && game.state !== 'won' && game.state !== 'dead'; t += STEP) {
    game.update(STEP, bot.think(STEP));
    game.events.length = 0;
  }
  return game;
}

test('the map leaves room to stand where soldiers and the operator start', () => {
  assert.ok(walkable(PLACES.spawn.x, PLACES.spawn.z));
  assert.ok(walkable(PLACES.helipad.x, PLACES.helipad.z));
  for (const [x, z] of [...PLACES.guards, ...PLACES.entries]) assert.ok(walkable(x, z), `blocked at ${x}, ${z}`);
  assert.ok(BOXES.length > 100);
});

test('every terminal and the helipad can be walked to from the gate', () => {
  const game = createGame({ seed: 1 });
  for (const t of [
    ...game.terminals.map((t) => [t.x - Math.sin(t.facing) * 1.3, t.z - Math.cos(t.facing) * 1.3]),
    [PLACES.helipad.x, PLACES.helipad.z],
  ]) {
    const path = game.navMesh.findPath([PLACES.spawn.x, 0, PLACES.spawn.z], [t[0], 0, t[1]], { snapDistance: 3 });
    assert.ok(path?.complete, `no way to ${t}`);
  }
});

test('the briefing holds the operator still, then the run begins', () => {
  const game = createGame({ seed: 2 });
  const events = run(game, 1, (input) => (input.moveZ = 1));
  assert.equal(game.state, 'intro');
  assert.ok(Math.abs(game.player.z - PLACES.spawn.z) < 0.05);
  assert.ok(events.some((event) => event.type === 'comms' && event.key === 'intro'));
  run(game, MISSION.introSeconds);
  assert.equal(game.state, 'play');
});

test('walking, sprinting and turning move the operator as asked', () => {
  const game = started();
  const z0 = game.player.z;
  run(game, 1, (input) => (input.moveZ = 1));
  const walked = z0 - game.player.z;
  assert.ok(walked > PLAYER.walk * 0.7 && walked < PLAYER.walk * 1.1, `walked ${walked}`);
  const z1 = game.player.z;
  run(game, 1, (input) => {
    input.moveZ = 1;
    input.sprint = true;
  });
  assert.ok(z1 - game.player.z > walked * 1.25);
  // A positive turn is to the left: facing west, forward is -X.
  run(game, 0.1, (input, t) => (input.lookYaw = t === 0 ? Math.PI / 2 : 0));
  const x0 = game.player.x;
  run(game, 0.5, (input) => (input.moveZ = 1));
  assert.ok(game.player.x < x0 - 1);
});

test('nobody shoots an operator they have not seen', () => {
  const game = started();
  run(game, 6);
  assert.equal(game.player.health, PLAYER.health);
  assert.ok(game.enemies.every((enemy) => !enemy.aware));
});

test('firing spends rounds, reports where they went, and reloading refills the magazine', () => {
  const game = started();
  const rifle = game.weapons.rifle;
  const events = run(game, 0.5, (input) => (input.fire = true));
  const shots = events.filter((event) => event.type === 'shot');
  assert.ok(shots.length >= 4 && shots.length <= 7, `fired ${shots.length}`);
  assert.equal(rifle.ammo, WEAPONS.rifle.mag - shots.length);
  assert.ok(shots.every((shot) => Number.isFinite(shot.toX) && (shot.enemy || shot.surface)));
  assert.equal(game.stats.shots, shots.length);
  run(game, 0.05, (input) => (input.reload = true));
  assert.ok(rifle.reloading > 0);
  run(game, WEAPONS.rifle.reload + 0.1);
  assert.equal(rifle.ammo, WEAPONS.rifle.mag);
  assert.equal(rifle.reserve, WEAPONS.rifle.reserve - shots.length);
});

test('the pistol fires once per pull and never runs out of spare rounds', () => {
  const game = started();
  run(game, 0.6, (input, t) => (input.weapon = t === 0 ? 'pistol' : ''));
  assert.equal(game.player.weapon, 'pistol');
  const held = run(game, 0.6, (input) => (input.fire = true)).filter((event) => event.type === 'shot');
  assert.equal(held.length, 1);
  assert.equal(game.weapons.pistol.reserve, Infinity);
});

test('gunfire brings the guards', () => {
  const game = started();
  run(game, 0.3, (input) => (input.fire = true));
  assert.ok(game.enemies.some((enemy) => enemy.aware));
});

test('a grenade at the feet hurts, and armour takes its share', () => {
  const game = started();
  run(game, 0.2, (input, t) => {
    input.lookPitch = t === 0 ? -1.4 : 0;
    input.grenade = true;
  });
  assert.equal(game.player.grenades, PLAYER.grenades - 1);
  const events = run(game, 3);
  assert.ok(events.some((event) => event.type === 'explosion'));
  assert.ok(game.player.health < PLAYER.health);
  assert.ok(game.player.armor < PLAYER.armor);
  assert.ok(game.stats.damageTaken > 0);
});

test('supply crates each hold one supply and one or two valuables', () => {
  const game = createGame({ seed: 5 });
  assert.equal(game.crates.length, PLACES.crates.length);
  for (const crate of game.crates) {
    assert.ok(crate.items[0].give);
    assert.ok(crate.items.length >= 2 && crate.items.length <= 3);
    assert.ok(crate.items.slice(1).every((item) => item.value > 0));
  }
});

test('the same seed plays the same run', () => {
  const a = playOut(11, 25),
    b = playOut(11, 25);
  assert.equal(a.player.x, b.player.x);
  assert.equal(a.player.z, b.player.z);
  assert.deepEqual(a.stats, b.stats);
  assert.equal(a.enemies.length, b.enemies.length);
});

test('a run can be finished: three terminals, then the helicopter', () => {
  for (const seed of [1, 2]) {
    const game = playOut(seed);
    assert.equal(game.state, 'won', `seed ${seed} ended ${game.state}`);
    assert.equal(game.terminalsDone, 3);
    assert.ok(game.lootValue >= 3 * MISSION.intelValue);
    assert.ok(game.stats.kills > 0);
    assert.match(game.rating(), /^[SABC]$/);
  }
});
