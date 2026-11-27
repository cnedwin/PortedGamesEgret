import assert from 'node:assert/strict';
import { test } from 'node:test';

await import('../vendor/node-register.mjs');
const { SKINS } = await import('../src/data.mjs');
const { createPanda } = await import('../src/panda.mjs');

const DT = 1 / 60;
const idle = {
  x: 0, y: 0, z: 0, facing: 0, speedNow: 0, grounded: true,
  rolling: false, slamming: false, charge: 0, down: false, hurtFlash: 0, iframe: 0,
};

test('the actual panda rig squashes, stretches on takeoff, and rebounds after a slam', () => {
  for (const jelly of [true, false]) {
    const panda = createPanda(SKINS[0], jelly);
    const pose = panda.node.children[0];
    let time = 0;
    const next = (state) => {
      time += DT;
      panda.update(DT, state, time);
      return pose.scale[1];
    };

    assert.equal(panda.jelly.meshes.length, 23);
    assert.equal(panda.jelly.meshes.filter((mesh) => mesh.castShadow).length, 11);
    for (let i = 0; i < 36; i++) next({ ...idle, charge: 0.75 });
    assert.ok(pose.scale[1] < 0.7);
    panda.launch(1);
    assert.ok(next({ ...idle, grounded: false }) > 1.1);

    panda.land(5, true);
    assert.ok(next(idle) < 0.8);
    let peak = pose.scale[1];
    for (let i = 0; i < 36; i++) peak = Math.max(peak, next(idle));
    assert.ok(peak > 1.05);
    assert.ok(Math.abs(pose.scale[1] - 1) < 0.02);
  }
});

test('the eight gummy skins keep the draw/shadow budget and use an opaque readable face', () => {
  const maps = new Set();
  for (const skin of SKINS) {
    const high = createPanda(skin, true);
    const low = createPanda(skin, false);
    for (const panda of [high, low]) {
      assert.equal(panda.jelly.meshes.length, 23);
      assert.equal(panda.jelly.meshes.filter(mesh => mesh.castShadow).length, 11);
      // All original facial and limb parts remain. The number of transparent
      // and refracting authors goes down rather than multiplying passes.
      assert.equal(panda.jelly.meshes.filter(mesh => mesh.material.transmission > 0).length, panda === high ? 3 : 0);
      assert.equal(panda.jelly.meshes.filter(mesh => mesh.castShadow && !mesh.material.transmission).length, panda === high ? 8 : 11);
      assert.equal(panda.jelly.meshes.filter(mesh => mesh.material.alphaMode === 'blend').length, 4);
    }
    const body = high.jelly.meshes.find(mesh => mesh.material.map).material;
    assert.ok(body.transmission >= 0.6 && body.transmission < 0.75);
    assert.ok(body.clearcoat >= 0.5);
    assert.ok(high.jelly.meshes.filter(mesh => mesh.castShadow && !mesh.material.transmission)
      .every(mesh => mesh.material.clearcoat > 0 && mesh.material.alphaMode === 'opaque'));
    const fallback = low.jelly.meshes.find(mesh => mesh.material.map).material;
    assert.equal(fallback.map, body.map, 'both quality tiers reuse exactly the same belly-stamp texture');
    const repeated = createPanda(skin, true);
    assert.equal(repeated.jelly.meshes.find(mesh => mesh.material.map).material.map, body.map);
    maps.add(body.map);
  }
  assert.equal(maps.size, SKINS.length, 'each of eight distinct stamp designs survives');
});

test('rolling tucks the same limbs, charge squints and release recovers without moving the simulation root', () => {
  const panda = createPanda(SKINS[0], true), pose = panda.node.children[0], pivot = pose.children[0];
  const head = pivot.children.find(child => child.children.length > 8);
  const limbs = pivot.children.filter(child => child.children.length === 1);
  const eyes = head.children.filter(child => child.children.length === 3);
  assert.equal(limbs.length, 4);
  assert.equal(eyes.length, 2);
  panda.blink = 99;
  let t = 0;
  const pos = { x: 3, y: 2, z: -1 };
  const next = (state = {}) => {
    t += DT;
    panda.update(DT, { ...idle, ...pos, ...state }, t);
    assert.deepEqual(Array.from(panda.node.position), [pos.x, pos.y, pos.z]);
    assert.ok(Math.abs(pose.scale[0] * pose.scale[1] * pose.scale[2] - 1) < 1e-5);
  };
  next();
  const neutralEye = eyes[0].scale[1], neutralArm = Math.abs(limbs[0].position[0]);
  for (let i = 0; i < 24; i++) next({ charge: 0.8 });
  assert.ok(eyes[0].scale[1] < neutralEye * 0.85);
  panda.launch(1);
  next({ grounded: false });
  assert.ok(eyes[0].scale[1] > neutralEye);
  for (let i = 0; i < 24; i++) next({ rolling: true, speedNow: 8 });
  assert.ok(Math.abs(limbs[0].position[0]) < neutralArm - 0.09);
  assert.ok(pose.scale[2] > pose.scale[0], 'roll has a directional jelly stretch');
  for (let i = 0; i < 55; i++) next();
  assert.ok(Math.abs(Math.abs(limbs[0].position[0]) - neutralArm) < 0.01);
  assert.ok(Math.abs(pose.scale[1] - 1) < 0.02);
});

test('hit flash and deformation recover instead of accumulating between blows', () => {
  const panda = createPanda(SKINS[7], true), body = panda.jelly.meshes.find(mesh => mesh.material.map);
  panda.blink = 99;
  let t = 0;
  const next = () => { t += DT; panda.update(DT, idle, t); };
  next();
  const resting = body.material.emissiveIntensity;
  panda.hurt(1, 0, 42);
  next();
  assert.ok(body.material.emissiveIntensity > resting + 0.5);
  for (let i = 0; i < 60; i++) next();
  assert.ok(Math.abs(body.material.emissiveIntensity - resting) < 1e-6);
  panda.hurt(-1, 0, 42);
  next();
  assert.ok(body.material.emissiveIntensity > resting + 0.5);
});
