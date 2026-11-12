import assert from 'node:assert/strict';
import test from 'node:test';
import { readTextureOffsets } from '../src/kys-texture-offsets.mjs';

test('text reads signed offsets by frame ID and keeps the last valid duplicate', () => {
  const text = '0, -4, +5\r\n2: -7 9.9\n0 (1e1, -2.8)\n0 2147483648 2\n1 8\n3 1 2\n-1 3 4';
  const binary = Uint8Array.of(90, 0, 91, 0);
  assert.deepEqual(readTextureOffsets(3, { text, binary }), new Map([
    [0, { dx: 10, dy: -2 }],
    [2, { dx: -7, dy: 9 }],
  ]));
});

test('nonempty text suppresses binary even when there are no valid rows', () => {
  const binary = Uint8Array.of(5, 0, 6, 0);
  assert.deepEqual(readTextureOffsets(1, { text: '\r\n ', binary }), new Map());
});

test('empty text falls back to signed little-endian pairs in the supplied view', () => {
  const bytes = Uint8Array.of(99, 0, 128, 255, 127, 255, 255, 2, 0, 7, 0, 8);
  const binary = new DataView(bytes.buffer, 1);
  const first = { dx: -32768, dy: 32767 };
  const second = { dx: -1, dy: 2 };

  assert.deepEqual(readTextureOffsets(4, { text: '', binary }), new Map([[0, first], [1, second]]));
  assert.deepEqual(readTextureOffsets(1, { binary }), new Map([[0, first]]));
  assert.deepEqual(readTextureOffsets(2, { binary: Uint8Array.of(1, 0, 2, 0, 7).buffer }),
    new Map([[0, { dx: 1, dy: 2 }]]));
});

test('missing offset files return no overrides and invalid frame counts fail', () => {
  assert.deepEqual(readTextureOffsets(3), new Map());
  assert.deepEqual(readTextureOffsets(0, { text: '0 4 5' }), new Map());
  for (const count of [-1, 0.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => readTextureOffsets(count), RangeError);
  }
});
