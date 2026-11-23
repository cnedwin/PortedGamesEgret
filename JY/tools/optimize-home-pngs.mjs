import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { constants, crc32, deflateSync, gzipSync, inflateSync } from 'node:zlib';

// Repack the Home GLB without changing PNG metadata, decoded pixels or glTF content.
const align = value => Math.ceil(value / 4) * 4;
const offset = view => view.byteOffset ?? 0;
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const supportedExtensions = new Set(['KHR_texture_transform', 'KHR_materials_unlit', 'EXT_mesh_gpu_instancing']);

function openGlb(bytes) {
  const jsonEnd = 20 + bytes.readUInt32LE(12);
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.equal(bytes.toString('ascii', 16, 20), 'JSON');
  assert.equal(bytes.toString('latin1', jsonEnd + 4, jsonEnd + 8), 'BIN\0');
  const model = JSON.parse(bytes.subarray(20, jsonEnd));
  const binary = bytes.subarray(jsonEnd + 8);
  assert.equal(bytes.readUInt32LE(jsonEnd), binary.length);
  assert.equal(model.buffers.length, 1);
  assert.equal(model.buffers[0].uri, undefined);
  assert.equal(model.buffers[0].byteLength, binary.length);
  assert([...(model.extensionsUsed ?? []), ...(model.extensionsRequired ?? [])]
    .every(name => supportedExtensions.has(name)), 'Unknown glTF extension');
  assert(model.bufferViews.every(view => view.buffer === 0 && Number.isSafeInteger(offset(view))
    && offset(view) >= 0 && Number.isSafeInteger(view.byteLength) && view.byteLength > 0
    && offset(view) + view.byteLength <= binary.length), 'Invalid buffer view');
  return { model, binary };
}

function writeGlb(model, binary) {
  const json = Buffer.from(JSON.stringify(model));
  const jsonPadding = Buffer.alloc(align(json.length) - json.length, 0x20);
  const header = Buffer.alloc(20);
  header.write('glTF');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + align(json.length) + binary.length, 8);
  header.writeUInt32LE(align(json.length), 12);
  header.write('JSON', 16);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binary.length);
  binHeader.write('BIN\0', 4);
  return Buffer.concat([header, json, jsonPadding, binHeader, binary]);
}

function readPng(bytes) {
  assert(bytes.subarray(0, 8).equals(signature), 'Invalid PNG signature');
  const chunks = [];
  let position = 8;
  while (position + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(position);
    const end = position + 12 + length;
    assert(end <= bytes.length, 'Truncated PNG chunk');
    const encoded = bytes.subarray(position, end);
    const kind = encoded.toString('ascii', 4, 8);
    const data = encoded.subarray(8, -4);
    assert.equal(crc32(encoded.subarray(4, -4)), encoded.readUInt32BE(encoded.length - 4), 'Invalid ' + kind + ' checksum');
    chunks.push({ kind, data, encoded });
    position = end;
    if (kind === 'IEND') break;
  }
  assert.equal(chunks[0]?.kind, 'IHDR');
  assert.equal(chunks.at(-1)?.kind, 'IEND');
  assert(bytes.length - position < 4 && bytes.subarray(position).every(byte => byte === 0), 'Invalid PNG padding');
  const header = chunks[0].data;
  assert.equal(header.length, 13);
  assert(header.subarray(8).equals(Buffer.from([8, 6, 0, 0, 0])), 'Expected non-interlaced RGBA8');
  assert(!chunks.some(({ kind }) => kind === 'acTL'), 'Animated PNG is not supported');
  const idat = chunks.filter(({ kind }) => kind === 'IDAT');
  assert(idat.length, 'Missing PNG image data');
  const first = chunks.indexOf(idat[0]);
  assert(idat.every((chunk, index) => chunks[first + index] === chunk), 'Non-contiguous IDAT');
  return { chunks, idat, first, width: header.readUInt32BE(0), height: header.readUInt32BE(4),
    stream: Buffer.concat(idat.map(({ data }) => data)) };
}

function paeth(left, up, corner) {
  const estimate = left + up - corner;
  const toLeft = Math.abs(estimate - left), toUp = Math.abs(estimate - up), toCorner = Math.abs(estimate - corner);
  return toLeft <= toUp && toLeft <= toCorner ? left : toUp <= toCorner ? up : corner;
}

function pixels(png, filtered = inflateSync(png.stream)) {
  const stride = png.width * 4;
  assert(Number.isSafeInteger(stride * png.height) && stride > 0 && png.height > 0);
  assert.equal(filtered.length, (stride + 1) * png.height);
  const rgba = Buffer.allocUnsafe(stride * png.height);
  for (let row = 0; row < png.height; row++) {
    const base = row * stride, source = row * (stride + 1);
    const filter = filtered[source];
    assert(filter <= 4, 'Invalid PNG row filter');
    for (let column = 0; column < stride; column++) {
      const left = column >= 4 ? rgba[base + column - 4] : 0;
      const up = row ? rgba[base + column - stride] : 0;
      const corner = row && column >= 4 ? rgba[base + column - stride - 4] : 0;
      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up
        : filter === 3 ? (left + up) >>> 1 : paeth(left, up, corner);
      rgba[base + column] = filtered[source + column + 1] + predictor;
    }
  }
  return rgba;
}

function pngWithStream(png, stream) {
  const chunk = Buffer.alloc(stream.length + 12);
  chunk.writeUInt32BE(stream.length);
  chunk.write('IDAT', 4);
  stream.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, -4)), chunk.length - 4);
  const original = png.chunks.map(({ encoded }) => encoded);
  original.splice(png.first, png.idat.length, chunk);
  return Buffer.concat([signature, ...original]);
}

async function compressPng(bytes, sharp) {
  const original = readPng(bytes);
  const filtered = inflateSync(original.stream);
  const rgba = pixels(original, filtered);
  const candidates = [original.stream, ...[constants.Z_DEFAULT_STRATEGY, constants.Z_FILTERED].map(strategy =>
    deflateSync(filtered, { level: 9, memLevel: 9, strategy }))];
  if (sharp) for (const adaptiveFiltering of [false, true]) {
    const compressed = await sharp(bytes, { ignoreIcc: true }).png({ compressionLevel: 9, adaptiveFiltering }).toBuffer();
    if (!compressed.subarray(16, 29).equals(original.chunks[0].data)) continue;
    const candidate = readPng(compressed);
    if (pixels(candidate).equals(rgba)) candidates.push(candidate.stream);
  }
  const smallest = candidates.reduce((best, data) => data.length < best.length ? data : best);
  const result = pngWithStream(original, smallest);
  return result.length < bytes.length ? result : bytes;
}

function viewData(asset, index) {
  const view = asset.model.bufferViews[index];
  return asset.binary.subarray(offset(view), offset(view) + view.byteLength);
}

function imageViews(model) {
  return new Set(model.images.map(image => {
    assert.equal(image.mimeType, 'image/png');
    assert(image.uri === undefined && Number.isInteger(image.bufferView));
    return image.bufferView;
  }));
}

async function repack(original, sharp) {
  const model = structuredClone(original.model);
  const images = imageViews(model);
  const ranges = new Map();
  for (const index of images) {
    const view = model.bufferViews[index];
    assert.equal(offset(view) % 4, 0);
    const key = offset(view) + ':' + view.byteLength;
    if (!ranges.has(key)) ranges.set(key, { start: offset(view), end: offset(view) + align(view.byteLength), indices: [] });
    ranges.get(key).indices.push(index);
  }
  const ordered = [...ranges.values()].sort((left, right) => left.start - right.start);
  const slices = [];
  let position = 0, adjustment = 0;
  for (const { start, end, indices } of ordered) {
    assert(start >= position && end <= original.binary.length, 'Invalid image buffer ranges');
    assert(model.bufferViews.every((view, index) => indices.includes(index) || offset(view) >= end
      || offset(view) + view.byteLength <= start), 'Image overlaps an unrelated buffer view');
    const originalImage = viewData(original, indices[0]);
    assert(original.binary.subarray(start + originalImage.length, end).every(byte => byte === 0), 'Expected alignment padding');
    const compressed = await compressPng(originalImage, sharp);
    const nextOffset = start - adjustment;
    slices.push(original.binary.subarray(position, start), compressed, Buffer.alloc(align(compressed.length) - compressed.length));
    for (const index of indices) {
      Object.assign(model.bufferViews[index], { byteOffset: nextOffset, byteLength: compressed.length });
    }
    adjustment += end - start - align(compressed.length);
    position = end;
  }
  slices.push(original.binary.subarray(position));
  // A view outside the PNGs only slides past the bytes removed from earlier PNG ranges.
  for (const [index, view] of model.bufferViews.entries()) if (!images.has(index)) {
    const shift = ordered.filter(range => range.end <= offset(view))
      .reduce((sum, range) => sum + range.end - range.start - align(model.bufferViews[range.indices[0]].byteLength), 0);
    if (shift) view.byteOffset = offset(view) - shift;
  }
  const binary = Buffer.concat(slices);
  model.buffers[0].byteLength = binary.length;
  return writeGlb(model, binary);
}

async function verify(original, candidate, sharp) {
  const images = imageViews(original.model);
  function normalized(model) {
    const copy = structuredClone(model);
    delete copy.buffers[0].byteLength;
    for (const [index, view] of copy.bufferViews.entries()) {
      delete view.byteOffset;
      if (images.has(index)) delete view.byteLength;
    }
    return copy;
  }
  assert.deepEqual(normalized(candidate.model), normalized(original.model));
  const checked = new Map();
  for (const [index, view] of original.model.bufferViews.entries()) {
    const before = viewData(original, index), after = viewData(candidate, index);
    if (!images.has(index)) {
      assert(after.equals(before), 'Changed non-image buffer view ' + index);
      continue;
    }
    const key = offset(view) + ':' + view.byteLength;
    const next = candidate.model.bufferViews[index];
    const location = [offset(next), next.byteLength];
    if (checked.has(key)) {
      assert.deepEqual(location, checked.get(key), 'Lost PNG sharing');
      continue;
    }
    checked.set(key, location);
    const a = readPng(before), b = readPng(after);
    const metadata = png => png.chunks.filter(({ kind }) => kind !== 'IDAT').map(({ encoded }) => encoded);
    assert.deepEqual(metadata(b), metadata(a));
    const originalPixels = pixels(a), candidatePixels = pixels(b);
    assert(candidatePixels.equals(originalPixels), 'Changed RGBA in PNG buffer view ' + index);
    if (sharp) {
      const decoded = await sharp(after, { ignoreIcc: true }).raw().toBuffer();
      assert(decoded.equals(originalPixels), 'libpng decoded different RGBA in view ' + index);
    }
  }
  return checked.size;
}

const [input, output, ...options] = process.argv.slice(2);
if (!input || !output || options.some(value => value !== '--check' && !value.startsWith('--sharp='))) {
  throw Error('Usage: node tools/optimize-home-pngs.mjs <input.glb> <output.glb> [--sharp=<installed module path>] [--check]');
}
const sharpPath = options.find(value => value.startsWith('--sharp='))?.slice('--sharp='.length);
const sharp = sharpPath ? createRequire(import.meta.url)(sharpPath) : null;
if (sharp) { sharp.concurrency(1); sharp.cache(false); }
const inputBytes = await readFile(input);
const original = openGlb(inputBytes);
const checking = options.includes('--check');
const outputBytes = checking ? await readFile(output) : await repack(original, sharp);
assert(outputBytes.length < inputBytes.length, 'No size reduction');
const verifiedImages = await verify(original, openGlb(outputBytes), sharp);
if (!checking) await writeFile(output, outputBytes, { flag: 'wx' });
console.log(JSON.stringify({
  before: inputBytes.length, after: outputBytes.length, saved: inputBytes.length - outputBytes.length,
  gzipBefore: gzipSync(inputBytes).length, gzipAfter: gzipSync(outputBytes).length,
  sha256: createHash('sha256').update(outputBytes).digest('hex'), verifiedImages,
  toolchain: { node: process.versions.node, zlib: process.versions.zlib,
    ...(sharp ? { sharp: sharp.versions.sharp, libpng: sharp.versions.png } : {}) }
}));
