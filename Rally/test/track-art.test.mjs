import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

register('../tools/egret-resolve.mjs', import.meta.url);
const { Object3D } = await import('@egret/engine/world3d');
const { createGrandstand } = await import('../src/grandstand.mjs');

test('the seated and cheering spectators clear the bench plank', () => {
  const treadY = 1.04;
  for (const [pose, seed] of [['seated', 0], ['cheering', 3]]) {
    const scene = new Object3D();
    const samples = [1, 0.5, seed / 0x100000000];
    createGrandstand(scene, { x: 0, y: 0, z: 0, heading: 0 }, { chance: () => samples.shift() ?? 0 });
    const { children } = scene.children[0];
    const vertices = children.find((node) => node.name === 'grandstand-crowd').geometry.getAttribute('position').data;
    assert.equal(children.length, 3);
    assert.ok(vertices.length > 0);
    assert.equal(children.find((node) => node.name === 'grandstand-cheering').count, pose === 'cheering' ? 1 : 0);
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i], y = vertices[i + 1] - treadY;
      assert.ok(!(x > -0.259 && x < 0.499 && y > 0.286 && y < 0.434), `${pose} pierces the seat at x=${x}, y=${y}`);
      if (y < 0.02) assert.ok(x >= -0.74 && x < -0.26, `${pose} puts a foot outside the front tread at x=${x}`);
    }
  }
});
