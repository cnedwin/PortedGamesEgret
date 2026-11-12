import assert from 'node:assert/strict';
import test from 'node:test';
import { packMap } from '../tools/game-data.mjs';

test('map transport preserves signed tile data in explicit little-endian order', () => {
  const cells = Int16Array.of(99, -1, 256, -32768, 99).subarray(1, 4);
  const map = { id: 70, width: 3, height: 1, layers: { earth: cells }, events: [] };
  const packed = packMap(map);
  assert.equal(packed.encoding, 'i16le-base64');
  assert.equal(packed.id, 70);
  assert.equal(packed.width, 3);
  assert.deepEqual(Buffer.from(packed.layers.earth, 'base64'), Buffer.from([255, 255, 0, 1, 0, 128]));
  assert.deepEqual(packed.events, []);
});
