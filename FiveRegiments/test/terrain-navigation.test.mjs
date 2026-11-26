import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const [{ createBrain }, { createFight, step, TICK }, { describePlace }, { mountedDetour }] = await Promise.all([
  import('../src/sim/brain.mjs'), import('../src/sim/fight.mjs'), import('../src/view/stage.mjs'), import('../src/sim/terrain-navigation.mjs')
]);

test('the expedition horse turns around a platform while retaining the original order on open ground', () => {
  const { place } = describePlace('citadel');
  const point = [4.4, -6.6];
  const game = createFight({ hero: { regiment: 'plume', at: [12.9, 7.1] }, foes: [{ regiment: 'tiger', at: point }], place, seed: 25 });
  const brain = createBrain(game.hero, { level: .7, rng: game.rng });
  const foe = game.men[1];
  assert.equal(mountedDetour(describePlace('county').place, game.hero, point), point);
  assert.notDeepEqual(mountedDetour(place, game.hero, point), point);
  assert.ok(game.hero.mounted);
  for (let i = 0; i < 28 / TICK && foe.hp === foe.maxHp; i++) {
    step(game, { hero: brain.think(game, TICK) });
    assert.equal(game.hero.floor, 0);
  }
  assert.ok(foe.hp < foe.maxHp, 'rode round the platform and reached a valid fighting angle');
  assert.ok(game.hero.mounted);
});

test('a shield fighter can pursue a stationary enemy onto the citadel ramp', () => {
  const { place } = describePlace('citadel');
  const [deck] = place.platforms;
  const target = [(deck.minX + deck.maxX) / 2, deck.minZ + .8];
  const game = createFight({ hero: { regiment: 'yulin', at: [6.1, -5.8] }, foes: [{ regiment: 'archer', at: target }], place, seed: 9 });
  const brain = createBrain(game.hero, { level: .7, rng: game.rng });
  const foe = game.men[1];
  assert.equal(game.hero.floor, 0);
  assert.equal(foe.floor, deck.height);
  let reachedRamp = false;
  for (let i = 0; i < 25 / TICK && foe.hp === foe.maxHp; i++) {
    step(game, { hero: brain.think(game, TICK) });
    reachedRamp ||= game.hero.floor > .3 && game.hero.floor < deck.height - .3 && game.hero.z > deck.ramp.minZ;
  }
  assert.ok(reachedRamp);
  assert.ok(game.hero.floor >= deck.height - .1);
  assert.ok(foe.hp < foe.maxHp, 'followed the approach onto the deck and landed a normal blow');
});
