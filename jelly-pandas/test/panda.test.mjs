import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

register('../tools/egret-resolve.mjs', import.meta.url);
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
