import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

register('../tools/egret-resolve.mjs', import.meta.url);
const { createBoxGeometry3D, createPerspectiveCamera3D, createStandardMaterial3D, InstancedMesh3D,
  Mesh3D, Object3D, RenderList3D, Scene3D } = await import('@egret/engine/world3d');
const { addModelShadow } = await import('../src/model-shadows.mjs');

test('depth proxies follow the same animated pivot and stay out of camera and mirror lists', () => {
  const scene = new Scene3D(), pivot = new Object3D().setPosition(0, 0, -4);
  const geometry = createBoxGeometry3D(), material = createStandardMaterial3D();
  const mesh = new Mesh3D(geometry, material).setPosition(0, 1, 0);
  pivot.addChild(mesh); scene.addChild(pivot);
  const proxy = addModelShadow(mesh), list = new RenderList3D();
  const camera = createPerspectiveCamera3D({ aspect: 1, near: .1, far: 100 });
  assert.equal(mesh.geometry, geometry);
  assert.equal(mesh.material, material);
  assert.equal(mesh.castShadow, false);
  assert.equal(proxy.castShadow, true);
  for (const layerMask of [1, 0xffffffff]) {
    list.build(scene, camera, { layerMask });
    assert.equal(list.opaque.length, 1);
    assert.equal(list.opaque[0].mesh, mesh);
    assert.deepEqual(list.shadowCasters, [proxy]);
  }
  pivot.setPosition(3, 2, -5).setRotation(.2, .7, -.1);
  scene.updateWorldMatrices();
  assert.deepEqual(proxy.matrixWorld, mesh.matrixWorld);
  geometry.dispose();
  assert.equal(proxy.geometry.isDisposed, true);
  assert.equal(proxy.material.isDisposed, true);
});

test('instanced proxies share placements and track subsequent matrix and count changes', () => {
  const mesh = new InstancedMesh3D(createBoxGeometry3D(), createStandardMaterial3D(), 2);
  mesh.setTransformAt(0, [1, 2, 3]); mesh.setTransformAt(1, [4, 5, 6]);
  const proxy = addModelShadow(mesh);
  assert.equal(proxy.instanceMatrices, mesh.instanceMatrices);
  mesh.setTransformAt(1, [7, 8, 9]); mesh.count = 1;
  proxy.beforeRender();
  assert.equal(proxy.count, 1);
  assert.equal(proxy.instanceVersion, mesh.instanceVersion);
  assert.deepEqual(Array.from(proxy.instanceMatrices.slice(28, 31)), [7, 8, 9]);
  assert.deepEqual(proxy.matrix, mesh.matrix);
});

test('shadow opt-out and full diagnostic mode do not add a proxy', () => {
  for (const [mode, casts] of [[false, false], ['full', true]]) {
    const mesh = new Mesh3D(createBoxGeometry3D(), createStandardMaterial3D());
    assert.equal(addModelShadow(mesh, mode), null);
    assert.equal(mesh.castShadow, casts);
    assert.equal(mesh.children.length, 0);
  }
  const mesh = new Mesh3D(createBoxGeometry3D(), createStandardMaterial3D());
  mesh.skeleton = {};
  assert.equal(addModelShadow(mesh), null);
  assert.equal(mesh.castShadow, true);
});
