import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { Scene3D, createBoxGeometry3D, createHeightField3D, createPhysicsWorld3D, createStandardMaterial3D } = await import('@egret/engine/world3d');
const { createLandmarks } = await import('../src/world/landmarks.mjs');
const { createRiverbank } = await import('../src/world/riverbank.mjs');
const { stoneGeometry } = await import('../src/models/plants.mjs');
const { BRIDGE, FORD, geography, nearestRoad, pointAt } = await import('../src/world/route.mjs');

function roadArt(width, height, depth) {
  return {
    geometry: createBoxGeometry3D({ width, height, depth }),
    material: createStandardMaterial3D()
  };
}

function bridgeFixture(bridgeArt) {
  const scene = new Scene3D(), physics = createPhysicsWorld3D();
  const landmarks = createLandmarks(scene, physics, { quality: 'high', bridgeArt });
  landmarks.update(1 / 60, pointAt((BRIDGE.from + BRIDGE.to) / 2));
  return {
    board: scene.children.find(mesh => mesh.isInstanced && mesh.count === 302),
    scene,
    deck: landmarks.bridge.deck.map(({ position, quaternion, shape, layer, friction, userData }) => ({
      position: [...position], quaternion: [...quaternion], shape, layer, friction, userData
    })),
    cables: scene.children.filter(mesh => {
      const attribute = mesh.geometry?.getAttribute('position');
      return attribute?.dynamic && mesh.geometry.boundingBox[2] < BRIDGE.a[2] &&
        mesh.geometry.boundingBox[5] > BRIDGE.b[2];
    }).map(mesh => [...mesh.geometry.getAttribute('position').data])
  };
}

test('bridge art changes only the portal and plank visuals', () => {
  const baseline = bridgeFixture();
  const tower = roadArt(6.4, 6.4, 0.7), board = roadArt(5.2, 0.12, 0.4);
  const next = bridgeFixture({ tower, board });

  assert.equal(baseline.deck.length, 16);
  assert.equal(baseline.deck.filter(body => body.userData.kind === 'bridge').length, 14);
  assert.deepEqual(next.deck, baseline.deck);
  assert(baseline.cables.length >= 2);
  assert.deepEqual(next.cables, baseline.cables);
  assert.deepEqual(next.board.instanceMatrices, baseline.board.instanceMatrices);
  assert.equal(next.board.geometry, board.geometry);
  assert.equal(next.board.material, board.material);
  assert.equal(next.board.castShadow, baseline.board.castShadow);
  assert.equal(next.board.receiveShadow, baseline.board.receiveShadow);

  const portals = next.scene.children.filter(mesh => mesh.geometry === tower.geometry);
  assert.equal(portals.length, 2);
  assert.equal(next.scene.children.length, baseline.scene.children.length - 4);
  for (const [index, route] of [BRIDGE.from - 3, BRIDGE.to + 3].entries()) {
    const [x, , z] = pointAt(route);
    assert.deepEqual([...portals[index].position], [x, BRIDGE.y, z + (index === 0 ? 1.5 : -1.5)].map(Math.fround));
  }
});

test('riverbank and ford art keeps independent instance groups on loaded terrain outside the lane', () => {
  const model = roadArt(4.4, 2.2, 2.5);
  const fields = new Map();
  const ground = (x, z) => {
    const tx = Math.floor(x / 192), tz = Math.floor(z / 192);
    const key = tx + ',' + tz, cx = (tx + 0.5) * 192, cz = (tz + 0.5) * 192;
    if (!fields.has(key)) {
      const { heights } = geography.fillTile(cx, cz, 192, 97, 1);
      fields.set(key, createHeightField3D({ width: 192, depth: 192, columns: 97, rows: 97, heights }));
    }
    return fields.get(key).heightAt(x - cx, z - cz);
  };
  for (const [quality, counts] of [['low', [6, 4]], ['medium', [8, 6]], ['high', [12, 8]]]) {
    const scene = new Scene3D();
    const { river, ford } = createRiverbank(scene, model, { quality });
    assert.deepEqual(scene.children, [river, ford]);
    for (const [index, group] of [river, ford].entries()) {
      const mesh = group.levels[0].object;
      assert.equal(mesh.count, counts[index]);
      assert.equal(mesh.geometry, model.geometry);
      assert.equal(mesh.material, model.material);
      assert.equal(mesh.castShadow, quality !== 'low');
      for (let i = 0; i < mesh.count; i++) {
        const at = i * 16, matrix = mesh.instanceMatrices;
        const x = group.position[0] + matrix[at + 12];
        const z = group.position[2] + matrix[at + 14];
        const scaleY = Math.hypot(matrix[at + 4], matrix[at + 5], matrix[at + 6]);
        const foot = group.position[1] + matrix[at + 13] + model.geometry.boundingBox[1] * scaleY;
        const n = nearestRoad(x, z, {});
        assert(n.d > (index === 0 ? 36 : 14));
        assert(Math.abs(n.s - (index === 0 ? (BRIDGE.from + BRIDGE.to) / 2 : FORD.s)) < 150);
        assert(Math.abs(ground(x, z) - foot - scaleY * 0.52) < 0.01);
      }
      scene.updateWorldMatrices();
      group.select(...group.position);
      assert(mesh.visible);
      group.select(group.position[0] + 600, group.position[1], group.position[2]);
      assert(!mesh.visible);
    }
  }
  const fallback = createRiverbank(new Scene3D(), null, { quality: 'low' });
  assert.equal(fallback.river.levels[0].object.geometry, stoneGeometry(0));
  assert.equal(fallback.ford.levels[0].object.geometry, stoneGeometry(0));
});
