import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { createHeightField3D, Object3D } = await import('@egret/engine/world3d');
const { createFlora } = await import('../src/world/flora.mjs');
const { planFlora } = await import('../src/world/floraPlan.mjs');
const { TILE } = await import('../src/world/land.mjs');
const { geography } = await import('../src/world/route.mjs');

test('transferred tile dressing preserves the tea hillside, obstacle layout and unload', () => {
  const x = 0, z = -1, columns = 97;
  const { heights } = geography.fillTile((x + 0.5) * TILE, (z + 0.5) * TILE, TILE, columns, 128);
  const field = createHeightField3D({ width: TILE, depth: TILE, columns, rows: columns, heights });
  const tile = { x, z, field, terrain: new Object3D() };
  const bodies = [], removed = [];
  const flora = createFlora(null, {
    createBody(body) { bodies.push(body); return body; },
    removeBody(body) { removed.push(body); }
  }, { quality: 'high' });
  const plan = planFlora(geography, x, z, TILE, field, 'high');
  const { matrices } = plan.tea[0].bushes;
  const transferred = structuredClone(plan, { transfer: [matrices.buffer] });
  assert.equal(matrices.byteLength, 0);
  flora.onTile(tile, 'load', transferred);
  assert.equal(bodies.length, 29);
  assert.equal(tile.terrain.children.length, 19);
  assert.ok(tile.terrain.children.some((mesh) => mesh.instanceMatrices === transferred.tea[0].bushes.matrices));
  assert.equal(tile.terrain.children.at(-1).castShadow, true);
  const signature = createHash('sha256').update(JSON.stringify(bodies));
  for (const mesh of tile.terrain.children) {
    signature.update(Buffer.from(mesh.instanceMatrices.buffer));
    if (mesh.instanceColors) signature.update(Buffer.from(mesh.instanceColors.buffer));
  }
  // Recorded from b31005e using the same ground samples, before moving placement into the worker.
  assert.equal(signature.digest('hex'), '6a8271277bf3e4dee238ad6d7e1ed975d5a516a4455fe46a9dd49c94dcfd7f8a');
  flora.onTile(tile, 'unload');
  assert.deepEqual(removed, bodies);
  assert.equal(tile.terrain.children.length, 0);
  assert.deepEqual(flora.obstacles(0, 0, 500), []);
});
