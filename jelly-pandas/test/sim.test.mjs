// Checks of the rules, run with `node --test` from this game's folder.
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

register('../tools/egret-resolve.mjs', import.meta.url);
const { BOSSES, CHARMS, CHARM_BY_KEY, ENEMIES, RUN, SKINS, TEXT, TOYS, TOY_BY_KEY } = await import('../src/data.mjs');
const { ISLAND, groundHeight, isWater } = await import('../src/island.mjs');
const { createGame } = await import('../src/sim.mjs');

const idle = { moveX: 0, moveZ: 0, jump: false, slam: false, roll: false };
const run = (game, seconds, input = idle) => {
  for (let i = 0; i < seconds * 60 && game.state === 'play'; i++) {
    game.update(1 / 60, input);
    game.events.length = 0;
  }
};
const friends = (count, seed) =>
  createGame({ seed, party: Array.from({ length: count }, (_, index) => ({ skin: index, human: false })) });

test('content tables are complete and refer to each other correctly', () => {
  assert.equal(SKINS.length, 8);
  assert.equal(TOYS.length, 12);
  assert.equal(CHARMS.length, 12);
  assert.equal(ENEMIES.length, 7);
  assert.equal(BOSSES.length, 3);
  for (const skin of SKINS) assert.ok(skin.start in TOY_BY_KEY, `${skin.key} starts with a known toy`);
  for (const toy of TOYS) {
    assert.ok(toy.charm in CHARM_BY_KEY, `${toy.key} evolves with a known charm`);
    assert.equal(toy.levels.length, RUN.maxToyLevel - 1, `${toy.key} has an entry for every level after the first`);
    for (const field of ['en', 'zh', 'den', 'dzh']) assert.ok(toy[field] && toy.evo[field], `${toy.key} has ${field} text`);
  }
  // Every toy has its own evolution charm.
  assert.equal(new Set(TOYS.map((toy) => toy.charm)).size, TOYS.length);
  for (const [key, entry] of Object.entries(TEXT)) assert.ok(entry.en && entry.zh, `${key} is written in both languages`);
});

test('the island is dry in the middle and under water far out', () => {
  assert.ok(groundHeight(0, 0) > ISLAND.sea);
  assert.equal(isWater(0, 0), false);
  assert.equal(isWater(ISLAND.half - 2, 0), true);
  for (let angle = 0; angle < 6.28; angle += 0.4)
    assert.equal(
      isWater(Math.cos(angle) * (ISLAND.playRadius - 2), Math.sin(angle) * (ISLAND.playRadius - 2)),
      false,
      'the play area is dry land',
    );
});

test('a party fights for two minutes without leaving the island or the numbers', () => {
  const game = friends(3, 11);
  run(game, 120);
  assert.ok(game.kills > 50, `squashed ${game.kills}`);
  assert.ok(game.level > 3, `reached level ${game.level}`);
  for (const panda of game.pandas) {
    assert.ok(Number.isFinite(panda.x + panda.y + panda.z + panda.hp));
    assert.ok(Math.hypot(panda.x, panda.z) < ISLAND.half);
    assert.ok(panda.toys.length >= 1 && panda.toys.every((toy) => toy.level >= 1 && toy.level <= RUN.maxToyLevel));
  }
  for (const enemy of game.enemies) assert.ok(Number.isFinite(enemy.x + enemy.y + enemy.z + enemy.hp));
});

test('the same seed plays the same run', () => {
  const a = friends(2, 5),
    b = friends(2, 5);
  run(a, 40);
  run(b, 40);
  assert.equal(a.kills, b.kills);
  assert.equal(a.pandas[0].x, b.pandas[0].x);
});

test('a level-up offers three cards, waits for the player and applies the choice', () => {
  const game = createGame({ seed: 3, party: [{ skin: 0, human: true }] }),
    panda = game.pandas[0];
  assert.equal(panda.toys.length, 1);
  assert.equal(panda.toys[0].key, SKINS[0].start);
  game.addExperience(game.xpNeed);
  assert.equal(game.level, 2);
  assert.equal(game.waitingForChoice(), true);
  assert.equal(panda.offer.length, 3);
  const rerolls = panda.rerolls;
  assert.equal(game.reroll(0), true);
  assert.equal(panda.rerolls, rerolls - 1);
  const before = panda.toys.length + panda.charms.size + panda.toys[0].level;
  assert.equal(game.choose(0, 0), true);
  assert.equal(game.waitingForChoice(), false);
  assert.equal(panda.toys.length + panda.charms.size + panda.toys[0].level, before + 1);
  assert.equal(game.choose(0, 0), false, 'nothing to choose once the offer is taken');
});

test('a maxed toy with its charm is offered an evolution', () => {
  const game = createGame({ seed: 9, party: [{ skin: 0, human: true }] }),
    panda = game.pandas[0],
    toy = panda.toys[0];
  // Raise the toy to its top level and give the matching charm through ordinary picks.
  let guard = 0;
  while ((toy.level < RUN.maxToyLevel || !panda.charms.has(CHARM_BY_KEY[TOYS[toy.id].charm])) && guard++ < 400) {
    game.addExperience(game.xpNeed);
    while (panda.offer) {
      const wanted = panda.offer.findIndex(
        (card) =>
          (card.type === 'toy' && card.id === toy.id) || (card.type === 'charm' && card.id === CHARM_BY_KEY[TOYS[toy.id].charm]),
      );
      game.choose(0, Math.max(0, wanted));
    }
  }
  assert.equal(toy.level, RUN.maxToyLevel);
  game.addExperience(game.xpNeed);
  const evolve = panda.offer.findIndex((card) => card.type === 'evo' && card.id === toy.id);
  assert.ok(evolve >= 0, 'the evolution card is offered');
  const damage = toy.s.damage;
  game.choose(0, evolve);
  assert.equal(toy.evo, true);
  assert.ok(toy.s.damage > damage);
});

test('a lone panda that falls ends the run; a friend can revive one', () => {
  const solo = createGame({ seed: 1, party: [{ skin: 0, human: true }] });
  solo.hurt(solo.pandas[0], 9999, 0, 0);
  assert.equal(solo.state, 'lost');

  const pair = friends(2, 1),
    [first, second] = pair.pandas;
  pair.hurt(first, 9999, 0, 0);
  assert.equal(first.down, true);
  assert.equal(pair.state, 'play');
  // The friend walks over and stands by until the fallen panda is back up.
  run(pair, 30);
  assert.equal(first.down, false, `revived (friend at ${Math.hypot(second.x - first.x, second.z - first.z).toFixed(1)} m)`);
});

test('enemies are rigid bodies: they rest on the ground, stack instead of overlapping and leave the world when squashed', () => {
  const game = friends(1, 4);
  const bodies = game.world.bodies.length;
  const crowd = Array.from({ length: 12 }, (_, i) => game.spawnEnemy(0, 10 + (i % 4) * 0.2, 10 + Math.floor(i / 4) * 0.2));
  assert.equal(game.world.bodies.length, bodies + 12);
  run(game, 1.5);
  const living = crowd.filter((enemy) => !enemy.dead);
  for (const a of living) {
    assert.ok(a.y > groundHeight(a.x, a.z) - 0.2, 'no enemy sinks into the ground');
    for (const b of living)
      if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) > (a.r + b.r) * 0.7, 'bodies push each other apart');
  }
  const before = game.world.bodies.length;
  game.damage(living[0], 1e6, game.pandas[0]);
  assert.equal(living[0].dead, true);
  assert.equal(game.world.bodies.length, before - 1);
});

test('thrown enemies that land in the sea are gone', () => {
  const game = friends(1, 2);
  const enemy = game.spawnEnemy(0, ISLAND.playRadius - 1, 0);
  // Knock it hard toward the open sea.
  game.damage(enemy, 0, game.pandas[0], 60, 0, 12);
  run(game, 4);
  assert.equal(enemy.dead, true);
});
