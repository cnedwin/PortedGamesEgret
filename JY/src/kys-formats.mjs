// Layouts follow cnedwin/kys-cpp at fe4ad958 (Types.h, Save.h, MainScene.cpp, GrpIdxFile.cpp).
const WORLD_SIZE = 480;
const WORLD_CELLS = WORLD_SIZE * WORLD_SIZE;
const WORLD_LAYER_NAMES = ['earth', 'surface', 'building', 'buildx', 'buildy'];
const SUBMAP_SIZE = 64;
const SUBMAP_CELLS = SUBMAP_SIZE * SUBMAP_SIZE;
const SUBMAP_LAYER_NAMES = ['earth', 'building', 'decoration', 'eventIndex', 'buildingHeight', 'decorationHeight'];
const EVENT_COUNT = 200;
const EVENT_FIELDS = [
  'cannotWalk', 'index', 'event1', 'event2', 'event3',
  'currentPic', 'endPic', 'beginPic', 'picDelay', 'x', 'y',
];
const EVENT_BYTES = EVENT_FIELDS.length * 2;
const SUBMAP_LAYER_BYTES = SUBMAP_LAYER_NAMES.length * SUBMAP_CELLS * 2;
const SUBMAP_EVENT_BYTES = EVENT_COUNT * EVENT_BYTES;

function asBytes(input, label) {
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  throw new TypeError(`${label} must be an ArrayBuffer or a view`);
}

function asDataView(bytes) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function readInt16s(view, start, count) {
  const values = new Int16Array(count);
  for (let index = 0; index < count; index++) {
    values[index] = view.getInt16(start + index * 2, true);
  }
  return values;
}

/** Read signed little-endian cumulative IDX offsets, returning views into the GRP. */
export function readIndexedGroup(indexBytes, groupBytes) {
  const index = asDataView(asBytes(indexBytes, 'IDX'));
  const group = asBytes(groupBytes, 'GRP');
  if (index.byteLength % 4 !== 0) {
    throw new RangeError('IDX length must be a multiple of 4 bytes');
  }

  const entries = [];
  let start = 0;
  for (let offset = 0; offset < index.byteLength; offset += 4) {
    const end = index.getInt32(offset, true);
    if (end < start || end > group.byteLength) {
      throw new RangeError(`IDX entry ${offset / 4} offset ${end} is outside ${start}..${group.byteLength}`);
    }
    entries.push(group.subarray(start, end));
    start = end;
  }
  return entries;
}

/** Decode a 480 × 480 world layer, retaining the original signed values. */
export function decodeWorldLayer(bytes, label = 'World layer') {
  const view = asDataView(asBytes(bytes, label));
  const expectedBytes = WORLD_CELLS * 2;
  if (view.byteLength !== expectedBytes) {
    throw new RangeError(`${label} must be ${expectedBytes} bytes, received ${view.byteLength}`);
  }
  return readInt16s(view, 0, WORLD_CELLS);
}

export function decodeWorldLayers(input) {
  const layers = {};
  for (const name of WORLD_LAYER_NAMES) {
    layers[name] = decodeWorldLayer(input[name], `${name}.002`);
  }
  return { width: WORLD_SIZE, height: WORLD_SIZE, layers };
}

/** Apply the original integer division to a graphic tile value, never to coordinates. */
export function normalizeTileId(raw) {
  const id = Math.trunc(raw / 2);
  return id === 0 ? 0 : id;
}

/** Decode one zero-based scene from concatenated S and D save records. */
export function decodeSubmap(layerBytes, eventBytes, ordinal) {
  const layerView = asDataView(asBytes(layerBytes, 'Submap layers'));
  const eventView = asDataView(asBytes(eventBytes, 'Submap events'));
  if (layerView.byteLength % SUBMAP_LAYER_BYTES !== 0) {
    throw new RangeError(`Submap layers length must be a multiple of ${SUBMAP_LAYER_BYTES} bytes`);
  }
  if (eventView.byteLength % SUBMAP_EVENT_BYTES !== 0) {
    throw new RangeError(`Submap events length must be a multiple of ${SUBMAP_EVENT_BYTES} bytes`);
  }
  const mapCount = layerView.byteLength / SUBMAP_LAYER_BYTES;
  if (eventView.byteLength / SUBMAP_EVENT_BYTES !== mapCount) {
    throw new RangeError('Submap layer and event record counts must match');
  }
  if (!Number.isInteger(ordinal) || ordinal < 0 || ordinal >= mapCount) {
    throw new RangeError(`Submap ordinal ${ordinal} is outside ${mapCount} available records`);
  }

  const layers = {};
  let layerOffset = ordinal * SUBMAP_LAYER_BYTES;
  for (const name of SUBMAP_LAYER_NAMES) {
    layers[name] = readInt16s(layerView, layerOffset, SUBMAP_CELLS);
    layerOffset += SUBMAP_CELLS * 2;
  }

  const events = [];
  let eventOffset = ordinal * SUBMAP_EVENT_BYTES;
  for (let index = 0; index < EVENT_COUNT; index++) {
    const event = {};
    for (const field of EVENT_FIELDS) {
      event[field] = eventView.getInt16(eventOffset, true);
      eventOffset += 2;
    }
    events.push(event);
  }
  return { width: SUBMAP_SIZE, height: SUBMAP_SIZE, layers, events };
}
