import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BREAK, GATE, GATES, RAIDERS, WAVES } from '../src/sim/data.mjs';
import * as rules from '../src/sim/world.mjs';

function quiet() {
  const world = rules.createWorld(7, 'normal', { mode: 'intercept' });
  world.breakLeft = Infinity;
  return world;
}

function put(world, kind, s) {
  const { way, hp } = RAIDERS[kind];
  const raider = { id: world.nextId++, kind, way, s, hp, max: hp, slow: 0, burn: 0, burnLeft: 0, lane: 0, ...rules.WAYS[way].at(s) };
  world.raiders.push(raider);
  return raider;
}

function run(world, seconds) {
  const events = [];
  for (let i = 0; i < Math.round(seconds * 20); i++) events.push(...rules.step(world, 0.05));
  return events;
}

test('intercept has its own mixed waves and leaves the standard schedule and economy intact', () => {
  const standard = rules.createWorld(7);
  const challenge = rules.createWorld(7, 'normal', { mode: 'intercept' });
  assert.equal(standard.mode, 'standard');
  assert.equal(standard.waves, WAVES);
  assert.equal(standard.breakLeft, BREAK * 2.5);
  assert.equal(standard.intercept, undefined);
  assert.equal(challenge.mode, 'intercept');
  assert.ok(challenge.waves.length >= 4 && challenge.waves.length < WAVES.length);
  assert.ok(challenge.breakLeft > 0 && challenge.breakLeft < standard.breakLeft);
  assert.deepEqual(new Set(challenge.waves[0].map(({ kind }) => kind)), new Set(['skiff', 'raider']));
  assert.ok(challenge.waves[1].some(({ kind }) => kind === 'junk'));
  assert.deepEqual(challenge.intercept, { held: [0, 0], landed: 0, crewStopped: 0, crewLeaked: 0 });
  const ordinary = rules.callWave(standard);
  assert.equal(ordinary.silver, 60);
  assert.equal(standard.queue.length, WAVES[0][0].count);
  assert.ok(standard.queue.every(({ kind }) => kind === 'raider'));
  challenge.wave = challenge.waves.length - 1;
  challenge.state = 'wave';
  assert.ok(rules.step(challenge, 0.05).some(({ type }) => type === 'won'));
  assert.equal(challenge.state, 'won');
});

test('a live boat counts only when its motion is stopped by that gate, once per gate', () => {
  const world = quiet();
  const skiff = put(world, 'skiff', GATES[0].at - 200);
  const man = put(world, 'raider', 180);
  assert.equal(rules.shutGate(world, 0).ok, true);
  run(world, 0.15);
  assert.deepEqual(world.intercept.held, [0, 0]);
  assert.ok(skiff.s > GATES[0].at - 200);
  run(world, 3);
  assert.deepEqual(world.intercept.held, [1, 0]);
  assert.ok(skiff.s < GATES[0].at && man.s > 180);
  const extra = run(world, GATE.shut - 2);
  assert.deepEqual(world.intercept.held, [1, 0]);
  assert.ok(extra.some(e => e.type === 'gate' && e.gate === 0 && e.open));
  assert.equal(rules.shutGate(world, 1).ok, true);
  skiff.s = GATES[1].at - 100;
  run(world, 3);
  assert.deepEqual(world.intercept.held, [1, 1]);
  assert.ok(skiff.s < GATES[1].at);
});

test('a far pair only counts when its queue reaches the gate', () => {
  const world = quiet();
  put(world, 'skiff', GATES[0].at - 300);
  put(world, 'skiff', GATES[0].at - 304);
  assert.equal(rules.shutGate(world, 0).ok, true);
  run(world, 0.5);
  assert.deepEqual(world.intercept.held, [0, 0], 'space between boats does not count as a gate intercept before the queue arrives');
  run(world, 4.5);
  assert.deepEqual(world.intercept.held, [2, 0]);
});

test('sinking before the queue adds no hold and only landed crew count as stopped or leaked', () => {
  const world = quiet(), junk = put(world, 'junk', GATES[0].at - 210);
  assert.equal(rules.shutGate(world, 0).ok, true);
  junk.hp = 1;
  junk.burn = 100;
  junk.burnLeft = 1;
  const events = rules.step(world, 0.05);
  const { s, x, y, angle } = rules.landingPoint(junk);
  assert.deepEqual({ x, y, angle }, rules.WAYS.road.at(s));
  assert.equal(s, rules.WAYS.road.nearest(junk.x, junk.y).s);
  assert.equal(events.filter(({ type }) => type === 'ashore').length, RAIDERS.junk.crew);
  assert.deepEqual(world.intercept, { held: [0, 0], landed: 2, crewStopped: 0, crewLeaked: 0 });
  const [caught, through] = world.raiders;
  assert.equal(caught.crewFrom, junk.id);
  assert.equal(through.crewFrom, junk.id);

  const ordinary = put(world, 'raider', 0);
  caught.hp = ordinary.hp = 1;
  caught.burn = ordinary.burn = 100;
  caught.burnLeft = ordinary.burnLeft = 1;
  through.s = rules.WAYS.road.length - 1;
  put(world, 'raider', rules.WAYS.road.length - 1);
  rules.step(world, 0.05);
  assert.deepEqual(world.intercept, { held: [0, 0], landed: 2, crewStopped: 1, crewLeaked: 1 });
});
