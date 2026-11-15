import assert from 'node:assert/strict';
import { test } from 'node:test';
import { movePlot } from '../src/core/extras.mjs';
import { seatLayout } from '../src/core/seat-layout.mjs';
import { deserialize, serialize } from '../src/core/save.mjs';
import { build, createWorld, upgrade, upgradeAvailability } from '../src/core/world.mjs';

test('selected empty plots retain the new building through a save and reject occupied plots', () => {
  const sect = 'shaolin', home = 'songshan';
  const world = createWorld({ playerSect: sect, seed: 9 });
  const buildings = world.places[home].buildings;
  const initial = seatLayout(buildings);
  const occupied = initial.placements.find(({ plot, building }) => plot !== null && building.plot === undefined);
  const plot = initial.emptyPlots[0];
  const silver = world.sects[sect].silver;
  assert.equal(build(world, sect, home, 'dorm', occupied.plot).ok, false);
  assert.equal(world.sects[sect].silver, silver);
  assert.ok(build(world, sect, home, 'dorm', plot).ok);
  assert.equal(buildings.at(-1).plot, plot);
  assert.equal(build(world, sect, home, 'dorm', plot).ok, false);
  const loaded = deserialize(serialize(world));
  assert.equal(loaded.ok, true);
  assert.equal(loaded.state.places[home].buildings.at(-1).plot, plot);
});

test('moving to an automatically occupied plot swaps the displayed buildings', () => {
  const sect = 'shaolin', home = 'songshan';
  const world = createWorld({ playerSect: sect, seed: 2 });
  const buildings = world.places[home].buildings;
  const [left, right] = seatLayout(buildings).placements.filter(({ plot }) => plot !== null);
  assert.ok(movePlot(world, sect, home, left.index, right.plot).ok);
  assert.equal(buildings[left.index].plot, right.plot);
  assert.equal(buildings[right.index].plot, left.plot);
  const dorm = buildings.findIndex((building) => building.kind === 'dorm' && building.level < 3);
  const expansion = upgradeAvailability(world, sect, home, dorm);
  assert.ok(expansion.ok);
  const silver = world.sects[sect].silver;
  assert.ok(upgrade(world, sect, home, dorm).ok);
  assert.equal(world.sects[sect].silver, silver - expansion.cost);
});
