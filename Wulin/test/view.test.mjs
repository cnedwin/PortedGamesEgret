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
  const contacts = [];
  let cleared = 0;
  let ended = 0;
  const arena = createArena(stage, battle, {
    colors: [0x4466aa, 0xccaa33], layer: null, onEvent: (event) => events.push(event.type),
    onContact: (cue) => contacts.push(cue), onEnd: () => ended++,
  });
  arena.enter();
  arena.speed = 4;
  for (let i = 0; i < 20000 && !ended; i++) arena.update(0.05);
  assert.ok(battle.done);
  assert.equal(ended, 1);
  assert.ok(events.includes('hit') && events.at(-1) === 'end');
  assert.ok(contacts.some(cue => cue.type === 'hit' && cue.klass && Number.isFinite(cue.x)));

  // Skipping gives the same result as watching.
  const again = createBattle({ sides: prepared.sides, formations: prepared.formations, seed: 4 });
  createArena(stage, again, {
    colors: [1, 2], layer: null,
    onContact: () => assert.fail('Fast resolution should not play contact audio'),
    onClearSounds: () => cleared++,
  }).skip();
  assert.equal(cleared, 1);
  assert.equal(again.winner, battle.winner);
  assert.equal(again.time, battle.time);
});

test('a figure is one skinned body: even the weapon and robe panels follow the rig', () => {
  const figure = createFigure({ school: 'emei', female: true, rank: 4, seed: 5, weapon: 'sword' });
  assert.equal(figure.mesh.skeleton.bones.length, 14);
  assert.equal(figure.node.children.length, 1);
  const weights = figure.mesh.geometry.getAttribute('weights').data,
    joints = figure.mesh.geometry.getAttribute('joints').data;
  for (let i = 0; i < weights.length; i += 4) assert.ok(Math.abs(weights[i] + weights[i + 1] + weights[i + 2] + weights[i + 3] - 1) < 1e-5);
  assert.ok(joints.every((index) => index < figure.bones.length));
  for (const name of ['grip', 'clothFront', 'clothBack']) {
    const joint = figure.bones.find((bone) => bone.name === name).index;
    assert.ok(joints.some((index, at) => index === joint && weights[at] > 0), name);
  }
  const elbow = figure.bones.find((bone) => bone.name === 'elbowR'),
    before = [...elbow.quaternion];
  figure.play('punch', { base: 'guard' });
  for (let i = 0; i < 6; i++) figure.update(0.05);
  assert.ok(before.some((value, i) => Math.abs(value - elbow.quaternion[i]) > 0.05));
  // A one-off gives way to the stance it came from.
  for (let i = 0; i < 20; i++) figure.update(0.05);
  assert.equal(figure.action, 'guard');
});

test('flora: a model file is read into a shape one unit tall, coloured by this game', async () => {
  const { readFile } = await import('node:fs/promises');
  const { FLORA_FILES, addFlora, floraGeometry, readGlb } = await import('../src/view/flora.mjs');
  for (const name of FLORA_FILES) {
    const file = await readFile(new URL(`../assets/flora/${name}.glb`, import.meta.url));
    const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    const shape = readGlb(buffer);
    assert.ok(shape.indices.length >= 30 && shape.indices.length % 3 === 0, name);
    assert.ok(shape.indices.every((index) => index < shape.positions.length / 3), name);
    addFlora(name, buffer);
  }
  const tree = floraGeometry('common_tree_1', 'maple');
  const box = tree.boundingBox;
  assert.ok(Math.abs(box[1]) < 1e-5 && Math.abs(box[4] - 1) < 1e-5);
  assert.equal(floraGeometry('common_tree_1', 'maple'), tree);
  assert.equal(floraGeometry('no_such_tree'), null);
});
