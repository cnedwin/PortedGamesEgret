import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFight, inSweep, step } from '../src/sim/fight.mjs';
import { floorAt, settleFooting } from '../src/sim/terrain.mjs';

const platform = { minX: 0.65, maxX: 2.5, minZ: -0.65, maxZ: 0.85, height: 1.32,
  ramp: { minX: 0.65, maxX: 1.65, minZ: 0.85, maxZ: 4.85 } };
const place = { radius: 18, posts: [], platforms: [platform] };
const exit = { x: 0, z: -15, r: 1 };

test('a foot fighter walks continuously up a ramp and a horse stays off the same slope', () => {
  assert.equal(floorAt(place, 1, 4.85), 0);
  assert.ok(Math.abs(floorAt(place, 1, 2.85) - 0.66) < 1e-7);
  assert.equal(floorAt(place, 1, 0.85), 1.32);
  const game = createFight({ hero: { regiment: 'archer', at: [1, 5] }, foes: [], place, exit });
  for (let i = 0; i < 120; i++) step(game, { hero: { move: [0, -1], face: Math.PI } });
  assert.ok(game.hero.z < 1.4);
  const horse = { x: 1, z: 2.85, mounted: true, floor: 0, vx: 0, vz: -1 };
  settleFooting(place, horse, 1, 4.85, 1 / 60);
  assert.equal(horse.z, 4.85);
  assert.equal(horse.floor, 0);
});

test('walking stops at a low wall, while a jump mantles it and protects against ground-level cuts', () => {
  const game = createFight({ hero: { regiment: 'tiger', at: [0, 0] }, foes: [{ regiment: 'yulin', at: [-1, 0] }], place, exit });
  for (let i = 0; i < 20; i++) step(game, { hero: { move: [1, 0], face: Math.PI / 2 } });
  assert.ok(game.hero.x < platform.minX);
  assert.equal(game.hero.floor, 0);
  const events = step(game, { hero: { step: true, move: [1, 0], face: Math.PI / 2 } });
  assert.ok(events.some(event => event.type === 'mantleBegin'));
  assert.equal(game.hero.act.kind, 'mantle');
  let landed = false;
  for (let i = 0; i < 35; i++) if (step(game, {}).some(event => event.type === 'mantle')) landed = true;
  assert.ok(landed);
  assert.equal(game.hero.floor, platform.height);
  assert.equal(inSweep(game.men[1], game.hero, 4, Math.PI), false);
});

test('an archer releases at the height of a platform', () => {
  const game = createFight({ hero: { regiment: 'archer', at: [1, 0] }, foes: [], place, exit });
  for (let i = 0; i < 40; i++) step(game, { hero: { attack: true } });
  const fired = step(game, { hero: {} });
  assert.ok(fired.some(event => event.type === 'loose'));
  assert.ok(game.shots[0].y > 2.6);
});
