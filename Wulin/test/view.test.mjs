// The 3D scenes, built without a renderer: they must assemble from any world
// and follow it as it changes. What they look like is checked by eye.
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

register('../tools/egret-resolve.mjs', import.meta.url);
const { createBattle } = await import('../src/core/battle.mjs');
const { advanceDay, assaultSides, build, createWorld, membersOf } = await import('../src/core/world.mjs');
const { BUILDINGS } = await import('../src/data/goods.mjs');
const { SECTS, SECT_BY_ID } = await import('../src/data/sects.mjs');
const { createArena } = await import('../src/view/arena.mjs');
const { createBuilding } = await import('../src/view/buildings.mjs');
const { ACTION_NAMES, createFigure } = await import('../src/view/figure.mjs');
const { createSeat } = await import('../src/view/seat.mjs');

/** Stands in for the stage: the scenes only ask it for the quality and the camera rig. */
const stage = { quality: 'medium', orbit: { yaw: 0, set() {}, apply() {}, project: () => null } };
const count = (node) => {
  let total = 0;
  node.traverse(() => total++);
  return total;
};

test('every building kind has a model at every level', () => {
  for (const [kind, spec] of Object.entries(BUILDINGS)) for (let level = 1; level <= (spec.max ?? 1); level++) assert.ok(count(createBuilding(kind, level)) >= 1, kind);
});

test('a figure plays every action', () => {
  const figure = createFigure({ weapon: 'sword', seed: 3 });
  for (const action of ACTION_NAMES) {
    figure.play(action);
    for (let i = 0; i < 40; i++) figure.update(0.05);
  }
  assert.ok(count(figure.node) > 10);
});

test('a seat is built for every sect and follows the world', () => {
  for (const sect of SECTS) {
    const world = createWorld({ seed: 5, playerSect: sect.id, autoPlayer: true });
    const seat = createSeat(stage, () => world, sect.seat);
    const before = count(seat.scene);
    world.sects[sect.id].silver = 1e6;
    assert.ok(build(world, sect.id, sect.seat, 'library').ok);
    for (let day = 0; day < 40; day++) advanceDay(world);
    seat.refresh();
    for (let i = 0; i < 30; i++) seat.update(0.05);
    assert.notEqual(count(seat.scene), before);
  }
});

test('an arena plays a battle to its end', () => {
  const world = createWorld({ seed: 9, playerSect: 'huashan' });
  const target = SECT_BY_ID.shaolin.seat;
  const prepared = assaultSides(world, 'huashan', target, membersOf(world, 'huashan').map((person) => person.id));
  assert.ok(prepared.ok, prepared.why);
  const battle = createBattle({ sides: prepared.sides, formations: prepared.formations, seed: 4 });
  const events = [];
  let ended = 0;
  const arena = createArena(stage, battle, { colors: [0x4466aa, 0xccaa33], layer: null, onEvent: (event) => events.push(event.type), onEnd: () => ended++ });
  arena.enter();
  arena.speed = 4;
  for (let i = 0; i < 20000 && !ended; i++) arena.update(0.05);
  assert.ok(battle.done);
  assert.equal(ended, 1);
  assert.ok(events.includes('hit') && events.at(-1) === 'end');

  // Skipping gives the same result as watching.
  const again = createBattle({ sides: prepared.sides, formations: prepared.formations, seed: 4 });
  createArena(stage, again, { colors: [1, 2], layer: null }).skip();
  assert.equal(again.winner, battle.winner);
  assert.equal(again.time, battle.time);
});
