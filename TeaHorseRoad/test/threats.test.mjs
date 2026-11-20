import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { Scene3D, createPhysicsWorld3D } = await import('@egret/engine/world3d');
const { createConvoy } = await import('../src/play/convoy.mjs');
const { createThreats } = await import('../src/play/threats.mjs');
const { AMBUSHES, heightAt } = await import('../src/world/route.mjs');

function wake(obstacles) {
  const scene = new Scene3D();
  const physics = createPhysicsWorld3D();
  const at = AMBUSHES[0].s - 260;
  const convoy = createConvoy(scene, physics, heightAt, { s: at });
  const threats = createThreats(scene, physics, {
    convoy, land: { heightAt }, flora: { obstacles: () => obstacles }, effects: {}
  });
  convoy.lead.s = at;
  threats.update(0);
  const [forest] = threats.zones;
  assert.equal(forest.state, 'waiting');
  convoy.lead.s += 0.01;
  threats.update(0);
  assert.equal(forest.state, 'awake');
  return forest.nav;
}

test('ambush obstacles block exactly the triangle centers strictly inside each circle', () => {
  const clear = wake([]);
  const center = [0, 0, 0];
  let edge;
  for (let t = 0; t < clear.triangleCount; t++) {
    clear.center(t, center);
    // Choose a walkable triangle adjacent to an absolute grid boundary at a negative coordinate.
    if (clear.isEnabled(t) && center[0] < -6 && center[0] % 3 < -2.5) {
      edge = { t, x: center[0], z: center[2] };
      break;
    }
  }
  assert.ok(edge);
  const radius = 1.5;
  const tangent = { x: edge.x + radius, z: edge.z, r: radius };
  const sparse = [tangent, { x: edge.x - 5, z: edge.z + 4, r: 1.4 }];
  const dense = Array.from({ length: 96 }, (_, i) => ({
    x: edge.x - 25 + (i % 12) * 4.3,
    z: edge.z + 15 + Math.floor(i / 12) * 4.7,
    r: 0.5 + (i % 9) * 0.6
  }));
  // Include overlapping circles, cell-spanning circles and one whose center is outside the nav mesh.
  const boundary = { x: edge.x - 0.125, z: edge.z, r: 0.25 };
  const outside = { x: AMBUSHES[0].x - AMBUSHES[0].radius - 61, z: edge.z, r: 7 };
  for (const obstacles of [sparse, [...sparse, ...dense, boundary, outside]]) {
    const nav = wake(obstacles);
    assert.equal(nav.triangleCount, clear.triangleCount);
    for (let t = 0; t < nav.triangleCount; t++) {
      nav.center(t, center);
      const blocked = obstacles.some(({ x, z, r }) => Math.hypot(x - center[0], z - center[2]) < r);
      assert.equal(nav.isEnabled(t), clear.isEnabled(t) && !blocked, 'triangle ' + t);
    }
    assert.equal(nav.isEnabled(edge.t), obstacles === sparse);
  }
});
