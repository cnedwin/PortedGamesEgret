import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { ORDER } from '../src/sim/regiments.mjs';

const root = new URL('../', import.meta.url);
const { imports } = JSON.parse(await readFile(new URL('vendor/importmap.json', root), 'utf8'));
const hook = registerHooks({ resolve(name, context, next) {
  return next(imports[name] ? new URL(imports[name], root).href : name, context);
} });
const { Mesh3D, loadGltf3D } = await import('@egret/engine/world3d');
const { cloneFigureScene } = await import('../src/view/figure-body.mjs');
hook.deregister();

const skinnedMeshes = (scene) => {
  const meshes = [];
  scene.traverse(node => {
    if (node instanceof Mesh3D && node.skeleton) meshes.push(node);
  });
  return meshes;
};

test('each regiment can share a troop body without sharing animated bones', async () => {
  for (const regiment of ORDER) {
    const bytes = await readFile(new URL(`assets/characters/${regiment}-low.glb`, root));
    const asset = await loadGltf3D(bytes, {
      decodeImage: async () => ({ data: new Uint8Array(4), width: 1, height: 1 })
    });
    try {
      const leftScene = cloneFigureScene(asset.scene);
      const rightScene = cloneFigureScene(asset.scene);
      const source = skinnedMeshes(asset.scene);
      const left = skinnedMeshes(leftScene);
      const right = skinnedMeshes(rightScene);
      assert.ok(source.length > 0, regiment);
      assert.equal(left.length, source.length, regiment);
      assert.equal(right.length, source.length, regiment);
      const leftNodes = new Set();
      leftScene.traverse(node => leftNodes.add(node));
      for (let i = 0; i < source.length; i++) {
        assert.equal(left[i].geometry, source[i].geometry, regiment);
        assert.equal(left[i].material, source[i].material, regiment);
        assert.deepEqual(left[i].bindMatrix, source[i].bindMatrix, regiment);
        assert.notEqual(left[i].skeleton, right[i].skeleton, regiment);
        assert.ok(left[i].skeleton.bones.every(bone => leftNodes.has(bone)), regiment);
        const leftBone = left[i].skeleton.bones[0];
        const rightBone = right[i].skeleton.bones[0];
        const rest = Array.from(rightBone.position);
        leftBone.setPosition(rest[0] + 3, rest[1], rest[2]);
        assert.deepEqual(Array.from(rightBone.position), rest, regiment);
      }
    } finally {
      asset.dispose();
    }
  }
});
