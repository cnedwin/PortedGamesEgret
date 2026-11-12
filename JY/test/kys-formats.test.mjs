import assert from 'node:assert/strict';
import test from 'node:test';
import {
  decodeSubmap,
  decodeWorldLayer,
  decodeWorldLayers,
  normalizeTileId,
  readIndexedGroup,
} from '../src/kys-formats.mjs';

const worldBytes = 480 * 480 * 2;
const submapLayerBytes = 6 * 64 * 64 * 2;
const submapEventBytes = 200 * 22;

function indexOf(...endOffsets) {
  const bytes = new Uint8Array(endOffsets.length * 4);
  const view = new DataView(bytes.buffer);
  endOffsets.forEach((end, ordinal) => view.setInt32(ordinal * 4, end, true));
  return bytes;
}

test('IDX cumulative endpoints produce non-copying GRP slices, including empty entries', () => {
  const backing = Uint8Array.of(88, 10, 20, 30, 40, 99);
  const group = backing.subarray(1);
  const entries = readIndexedGroup(indexOf(2, 2, 4).buffer, group);

  assert.deepEqual(entries.map(entry => [...entry]), [[10, 20], [], [30, 40]]);
  assert.equal(entries[0].buffer, backing.buffer);
  assert.equal(entries[0].byteOffset, group.byteOffset);
  assert.deepEqual(readIndexedGroup(indexOf(), group), []);
});

test('IDX rejects partial, negative, descending and out-of-bounds endpoints', () => {
  const group = new Uint8Array(4);
  assert.throws(() => readIndexedGroup(Uint8Array.of(0), group), /IDX.*4/);
  assert.throws(() => readIndexedGroup(indexOf(-1), group), /IDX.*offset/);
  assert.throws(() => readIndexedGroup(indexOf(3, 2), group), /IDX.*offset/);
  assert.throws(() => readIndexedGroup(indexOf(5), group), /IDX.*offset/);
});

test('world layer decodes unaligned signed little-endian data in row order', () => {
  const layer = new DataView(new ArrayBuffer(worldBytes + 2), 1, worldBytes);
  layer.setInt16(0, -32768, true);
  layer.setInt16((3 + 2 * 480) * 2, 0x1234, true);
  layer.setInt16(worldBytes - 2, 32767, true);

  const decoded = decodeWorldLayer(layer);
  assert.ok(decoded instanceof Int16Array);
  assert.equal(decoded.length, 480 * 480);
  assert.equal(decoded[0], -32768);
  assert.equal(decoded[3 + 2 * 480], 0x1234);
  assert.equal(decoded.at(-1), 32767);
  assert.throws(() => decodeWorldLayer(new Uint8Array(worldBytes - 2)), /460800/);
});

test('world preserves all five raw layers and normalizes graphic IDs only on request', () => {
  const input = Object.fromEntries(['earth', 'surface', 'building', 'buildx', 'buildy'].map((name, ordinal) => {
    const bytes = new ArrayBuffer(worldBytes);
    new DataView(bytes).setInt16(0, 13 + ordinal * 2, true);
    return [name, bytes];
  }));
  const world = decodeWorldLayers(input);

  assert.deepEqual([world.width, world.height], [480, 480]);
  assert.deepEqual(Object.values(world.layers).map(layer => layer[0]), [13, 15, 17, 19, 21]);
  assert.equal(normalizeTileId(world.layers.earth[0]), 6);
  assert.equal(normalizeTileId(-3), -1);
  assert.equal(normalizeTileId(-1), 0);
  assert.throws(() => decodeWorldLayers({ ...input, buildy: new Uint8Array(0) }), /buildy.*460800/);
});

test('submap selects its ordinal and preserves layer and event field order', () => {
  const layers = new DataView(new ArrayBuffer(submapLayerBytes * 2));
  const events = new DataView(new ArrayBuffer(submapEventBytes * 2));
  for (let layer = 0; layer < 6; layer++) {
    layers.setInt16(submapLayerBytes + (layer * 64 * 64 + 3 + 2 * 64) * 2, layer === 3 ? -1 : 10 + layer, true);
  }
  const values = [1, -1, 31, 32, 33, 44, 55, 66, 7, -2, 4];
  values.forEach((value, field) => events.setInt16(submapEventBytes + 199 * 22 + field * 2, value, true));

  const map = decodeSubmap(layers, events, 1);
  assert.deepEqual([map.width, map.height], [64, 64]);
  assert.deepEqual(Object.keys(map.layers), ['earth', 'building', 'decoration', 'eventIndex', 'buildingHeight', 'decorationHeight']);
  assert.deepEqual(Object.values(map.layers).map(layer => layer[3 + 2 * 64]), [10, 11, 12, -1, 14, 15]);
  assert.equal(map.events.length, 200);
  assert.deepEqual(map.events[199], {
    cannotWalk: 1, index: -1, event1: 31, event2: 32, event3: 33,
    currentPic: 44, endPic: 55, beginPic: 66, picDelay: 7, x: -2, y: 4,
  });
  assert.equal(decodeSubmap(layers, events, 0).layers.earth[3 + 2 * 64], 0);
});

test('submap rejects incomplete records, disagreeing counts and invalid ordinals', () => {
  const layers = new Uint8Array(submapLayerBytes);
  const events = new Uint8Array(submapEventBytes);

  assert.throws(() => decodeSubmap(layers.subarray(1), events, 0), /layers.*49152/);
  assert.throws(() => decodeSubmap(layers, events.subarray(1), 0), /events.*4400/);
  assert.throws(() => decodeSubmap(layers, new Uint8Array(submapEventBytes * 2), 0), /counts.*match/);
  for (const ordinal of [-1, 1, 0.5]) {
    assert.throws(() => decodeSubmap(layers, events, ordinal), /ordinal/);
  }
});
