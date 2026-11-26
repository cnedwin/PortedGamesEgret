// 路：从茶山到高原的长度、坡度和弯，驿站、埋伏、浅滩和吊桥都在路上该在的地方，地面高度处处有限。
// The road: its length, grades and bends from the tea hills to the plateau; the stations, ambushes, ford and bridge
// where they belong along it; and a finite ground height everywhere.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

// The road is the engine's Catmull-Rom curve through the control points, sampled every two metres.
const { geography: g, samples: ROAD_SAMPLES } = await import('../src/world/route.mjs');
const { Scene3D } = await import('@egret/engine/world3d');
const { createWaters } = await import('../src/world/water.mjs');

test('water only creates mirror targets at the quality that updates them', () => {
  for (const quality of ['low', 'medium', 'high']) {
    const scene = new Scene3D();
    const waters = createWaters(scene, { quality });
    for (const { water } of waters.bodies) {
      assert.equal(water.reflection?.target.width ?? 0, quality === 'high' ? 512 : 0, quality);
      assert.equal(Boolean(water.material.reflectionMap), quality === 'high', quality);
      assert.ok(water.material.transmission > 0);
      assert.ok(water.material.softness > 0);
      water.dispose();
    }
  }
});

test('the road runs about 4.6 km, its grades drivable and its bends not too tight', () => {
  const n = ROAD_SAMPLES.count,
    length = (n - 1) * 2;
  assert.ok(length > 4400 && length < 4900, `${length} m`);
  let steepest = 0;
  for (let i = 10; i < n - 10; i += 5) {
    const rise = ROAD_SAMPLES.y[i + 5] - ROAD_SAMPLES.y[i],
      run = Math.hypot(ROAD_SAMPLES.x[i + 5] - ROAD_SAMPLES.x[i], ROAD_SAMPLES.z[i + 5] - ROAD_SAMPLES.z[i]);
    steepest = Math.max(steepest, Math.abs(rise / run));
  }
  assert.ok(steepest < 0.22, `steepest grade ${steepest}`);
});

test('the stations come in order along the road, with the ambushes between them', () => {
  const s = g.STATIONS.map((station) => station.s);
  assert.deepEqual([...s].sort((a, b) => a - b), s);
  assert.ok(s[3] - s[0] > 4000);
  const [forest, gorge, pass] = g.AMBUSHES;
  assert.ok(forest.s > s[0] && forest.s < s[1]);
  assert.ok(gorge.s > s[1] && gorge.s < s[2]);
  assert.ok(pass.s > s[2] && pass.s < s[3]);
  assert.ok(g.FORD.s > s[0] && g.FORD.s < forest.s);
  assert.ok(g.BRIDGE.from > s[1] && g.BRIDGE.to < gorge.s);
});

test('the road keeps its own height, and the ground is finite everywhere near it', () => {
  for (let i = 0; i < ROAD_SAMPLES.count; i += 97) {
    const x = ROAD_SAMPLES.x[i],
      z = ROAD_SAMPLES.z[i],
      on = g.heightAt(x, z);
    assert.ok(Number.isFinite(on));
    const bridge = g.BRIDGE.from - 5 < i * 2 && i * 2 < g.BRIDGE.to + 5;
    if (!bridge) assert.ok(Math.abs(on - ROAD_SAMPLES.y[i]) < 1.2, `at ${i * 2} m the ground is ${on} and the road ${ROAD_SAMPLES.y[i]}`);
    for (const d of [-60, 60]) assert.ok(Number.isFinite(g.heightAt(x + d, z + d)));
  }
});

test('the legs blend from tea hills through the gorge to the snow', () => {
  const b = [0, 0, 0];
  g.biomeAt(100, b);
  assert.ok(b[0] > 0.9);
  g.biomeAt(2400, b);
  assert.ok(b[1] > 0.5);
  g.biomeAt(4200, b);
  assert.ok(b[2] > 0.9);
});

test('both bridge approaches overlap the suspended deck', () => {
  const { from, to, y } = g.BRIDGE;
  for (const s of [from - 3, from, from + 3, to - 3, to, to + 3]) {
    const [x, , z] = g.pointAt(s);
    assert.ok(Math.abs(g.heightAt(x, z) - y) < 0.45, `missing bridge approach at ${s} m`);
  }
  const [x, , z] = g.pointAt((from + to) / 2);
  assert.ok(g.heightAt(x, z) < y - 10, 'the gorge stays open underneath the deck');
});
