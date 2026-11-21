import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { TriangleMeshShape3D, createHeightField3D, createPhysicsWorld3D } = await import('@egret/engine/world3d');

function slopingTerrain() {
  const grid = 97;
  const heights = Float32Array.from({ length: grid * grid }, (_, i) => {
    const x = i % grid, z = Math.floor(i / grid);
    return Math.sin(x / 14) * 4 + Math.cos(z / 12) * 3 + (x + z) / 8;
  });
  return createHeightField3D({ columns: grid, rows: grid, width: 192, depth: 192, heights }).createShape();
}

function queryTriangles(mesh, box) {
  const triangles = [];
  mesh.query(...box, (index) => triangles.push(index));
  return triangles;
}

function worldRayHits(shape) {
  const physics = createPhysicsWorld3D();
  physics.createBody({ type: 'static', shape, position: [96, 2, -96] });
  const ray = (x, z, direction) => {
    const hit = physics.raycast([x, 100, z], direction, 150);
    return hit && [hit.distance, hit.point, hit.normal];
  };
  return [
    ray(0, -192, [0, -1, 0]),
    ray(96, -96, [0, -1, 0]),
    ray(192, 0, [0, -1, 0]),
    ray(89, -101, [0.15, -1, -0.07]),
    ray(192.1, 0, [0, -1, 0])
  ];
}

test('transfer adopts the actual terrain tree and retains exact collision queries', () => {
  const original = slopingTerrain();
  const exported = slopingTerrain().mesh.exportBuffers();
  const transfer = Object.values(exported).map((view) => view.buffer);
  const prepared = structuredClone(exported, { transfer });
  assert.ok(transfer.every((buffer) => buffer.byteLength === 0));

  const mesh = TriangleMeshShape3D.fromBuffers(prepared);
  assert.equal(mesh.positions, prepared.positions);
  assert.equal(mesh.indices, prepared.indices);
  assert.equal(mesh.triangleCount, 18432);
  assert.deepEqual(mesh.bounds, original.mesh.bounds);
  assert.deepEqual(mesh.positions, original.mesh.positions);
  assert.deepEqual(mesh.indices, original.mesh.indices);

  const boxes = [
    [-96, -10, -96, 96, 40, 96],
    [-97, -10, -97, -95, 40, -95],
    [11, -10, -7, 13, 40, 0],
    [-3, -20, -2, 3, -15, 2]
  ];
  for (const box of boxes) assert.deepEqual(queryTriangles(mesh, box), queryTriangles(original.mesh, box));
  const oldRays = worldRayHits(original);
  assert.ok(oldRays.slice(0, 4).every(Boolean));
  assert.equal(oldRays.at(-1), undefined);
  assert.deepEqual(worldRayHits({ type: 'mesh', mesh }), oldRays);
});

test('prepared mesh rejects mismatched, detached and malformed tree data', () => {
  const valid = () => slopingTerrain().mesh.exportBuffers();
  const prepared = valid();
  assert.throws(() => TriangleMeshShape3D.fromBuffers(null), /prepared mesh buffers/);
  assert.throws(() => TriangleMeshShape3D.fromBuffers({ ...prepared, nodeCount: prepared.nodeCount.subarray(1) }), /prepared mesh buffers/);

  const badTree = valid();
  badTree.nodeLeft[0] = 0;
  assert.throws(() => TriangleMeshShape3D.fromBuffers(badTree), /prepared mesh buffers/);

  structuredClone(prepared.positions, { transfer: [prepared.positions.buffer] });
  assert.throws(() => TriangleMeshShape3D.fromBuffers(prepared), /prepared mesh buffers/);
});
