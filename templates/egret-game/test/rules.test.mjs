// 规则：同一个种子摆出同样的场地，角色不出界，碰到光点就收下，全部收齐算一局。
// The rules: one seed lays out the same field, the character stays on it, a light within reach is taken, and taking
// them all ends a round.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FIELD, REACH, SPEED, cleared, createWorld, step } from '../src/sim/world.mjs';

test('one seed lays out the same field, and another seed a different one', () => {
  assert.deepEqual(createWorld(7).lights, createWorld(7).lights);
  assert.notDeepEqual(createWorld(7).lights, createWorld(8).lights);
  for (const light of createWorld(3).lights) {
    assert.ok(light.x >= FIELD.margin && light.x <= FIELD.width - FIELD.margin);
    assert.ok(Math.hypot(light.x - FIELD.width / 2, light.y - FIELD.height / 2) >= 80);
  }
});

test('the character walks at its speed, diagonals no faster, and stays on the field', () => {
  const world = createWorld(1);
  step(world, { x: 1, y: 0 }, 0.5);
  assert.equal(world.hero.x, FIELD.width / 2 + SPEED * 0.5);
  const diagonal = createWorld(1);
  step(diagonal, { x: 1, y: 1 }, 0.1);
  assert.ok(Math.abs(Math.hypot(diagonal.hero.x - FIELD.width / 2, diagonal.hero.y - FIELD.height / 2) - SPEED * 0.1) < 1e-9);
  for (let i = 0; i < 100; i++) step(world, { x: 1, y: -1 }, 0.1);
  assert.equal(world.hero.x, FIELD.width - FIELD.margin);
  assert.equal(world.hero.y, FIELD.margin + 40);
  assert.equal(world.hero.facing, 1);
});

test('a light within reach is taken once, and taking them all clears the round', () => {
  const world = createWorld(5);
  const first = world.lights[0];
  world.hero.x = first.x + REACH - 1;
  world.hero.y = first.y;
  assert.deepEqual(step(world, { x: 0, y: 0 }, 0.016), [first]);
  assert.deepEqual(step(world, { x: 0, y: 0 }, 0.016), []);
  assert.equal(cleared(world), false);
  for (const light of world.lights) {
    world.hero.x = light.x;
    world.hero.y = light.y;
    step(world, { x: 0, y: 0 }, 0.016);
  }
  assert.equal(cleared(world), true);
  assert.equal(world.taken, world.lights.length);
});
