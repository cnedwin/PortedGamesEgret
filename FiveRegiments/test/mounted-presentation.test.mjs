import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMountedPresentation } from '../src/view/mounted-presentation.mjs';

const tick = 1 / 60;
const newRider = () => ({
  x: 0, z: 0, face: Math.PI - 0.02, alive: true, mounted: true,
  horse: { x: 0, z: 0, face: Math.PI - 0.03, speed: 9 },
  act: { kind: 'swing', t: 0.2, struck: false, awaitingRelease: false }
});

test('horse and rider use one intermediate pose, without changing combat position or the swing clock', () => {
  const rider = newRider();
  const render = createMountedPresentation(tick);
  render.capture(rider);
  rider.face = -Math.PI + 0.02;
  rider.x = rider.horse.x = 0.15;
  rider.horse.face = -Math.PI + 0.03;
  rider.act.t += tick;
  const visible = render.pose(rider, 0.5);
  assert.equal(visible.x, 0.075);
  assert.equal(visible.horse.x, visible.x);
  assert.ok(Math.abs(Math.abs(visible.horse.face) - Math.PI) < 1e-10);
  assert.ok(Math.abs(Math.abs(visible.face) - Math.PI) < 1e-10);
  assert.ok(Math.abs(visible.act.t - (0.2 + tick / 2)) < 1e-10);
  assert.equal(render.pose(rider, 0.75).act, visible.act);
  assert.equal(rider.x, 0.15);
  assert.equal(rider.act.t, 0.2 + tick);
});

test('releases, contact ticks, dismounts and leaps between positions use the current state', () => {
  const rider = newRider();
  const render = createMountedPresentation(tick);
  render.capture(rider);
  rider.act.struck = true;
  rider.act.t += tick;
  assert.equal(render.pose(rider, 0.25).act.t, rider.act.t);
  rider.mounted = false;
  assert.equal(render.pose(rider, 0.25), rider);
  render.capture(rider);
  rider.mounted = true;
  assert.equal(render.pose(rider, 0.25), rider);
  render.capture(rider);
  rider.horse.x += 1;
  assert.equal(render.pose(rider, 0.25), rider);
});
