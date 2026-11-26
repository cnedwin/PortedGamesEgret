import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

// This lossless rewrite is limited to the binary layout and extensions used by the Home scene.
const supportedExtensions = new Set(['KHR_texture_transform', 'KHR_materials_unlit', 'EXT_mesh_gpu_instancing']);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const offsetOf = view => view.byteOffset ?? 0;

function readGlb(file) {
  assert.equal(file.toString('ascii', 0, 4), 'glTF');
  assert.equal(file.readUInt32LE(4), 2);
  assert.equal(file.readUInt32LE(8), file.length);
  const jsonEnd = 20 + file.readUInt32LE(12);
  assert.equal(file.toString('ascii', 16, 20), 'JSON');
  assert.equal(file.toString('latin1', jsonEnd + 4, jsonEnd + 8), 'BIN\0');
  const document = JSON.parse(file.subarray(20, jsonEnd));
  const binary = file.subarray(jsonEnd + 8);
  assert.equal(file.readUInt32LE(jsonEnd), binary.length);
  assert.equal(document.buffers.length, 1, 'Input must have one embedded buffer');
  assert.equal(document.buffers[0].uri, undefined);
  assert.equal(document.buffers[0].byteLength, binary.length);
  assert([...(document.extensionsUsed ?? []), ...(document.extensionsRequired ?? [])]
    .every(extension => supportedExtensions.has(extension)), 'Unsupported Home glTF extension');
  assert(document.bufferViews.every(view => view.buffer === 0 && Number.isSafeInteger(offsetOf(view))
    && offsetOf(view) >= 0 && Number.isSafeInteger(view.byteLength) && view.byteLength > 0
    && offsetOf(view) + view.byteLength <= binary.length), 'Invalid buffer view range');
  return { document, binary };
}

function viewData(asset, index) {
  const view = asset.document.bufferViews[index];
  return asset.binary.subarray(offsetOf(view), offsetOf(view) + view.byteLength);
}

function textureAppearance(texture, document, imageHashes) {
  const { source, sampler, name: _name, ...metadata } = texture;
  return [imageHashes[source], sampler === undefined ? null : document.samplers[sampler], metadata];
}

function baseColorReferences(document) {
  return (document.materials ?? []).flatMap(material => material.pbrMetallicRoughness?.baseColorTexture ?? []);
}

function writeGlb(document, binary) {
  const data = Buffer.from(JSON.stringify(document));
  const jsonPadding = Buffer.alloc((4 - data.length % 4) % 4, 0x20);
  const header = Buffer.alloc(20);
  header.write('glTF');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + data.length + jsonPadding.length + binary.length, 8);
  header.writeUInt32LE(data.length + jsonPadding.length, 12);
  header.write('JSON', 16);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binary.length);
  binHeader.write('BIN\0', 4);
  return Buffer.concat([header, data, jsonPadding, binHeader, binary]);
}

function optimize(original) {
  const document = structuredClone(original.document);
  const views = original.document.bufferViews;
  const canonicalImages = new Map();
  const imageAliases = new Map();
  const bufferAliases = new Map();
  const imageHashes = [];
  for (const [id, image] of document.images.entries()) {
    assert.equal(image.mimeType, 'image/png', 'Input must use inline PNG images');
    assert(Number.isInteger(image.bufferView) && image.uri === undefined);
    const imageData = viewData(original, image.bufferView);
    const hash = sha256(imageData);
    imageHashes[id] = hash;
    const canonical = canonicalImages.get(hash);
    if (canonical === undefined) {
      canonicalImages.set(hash, id);
      continue;
    }
    const canonicalView = document.images[canonical].bufferView;
    assert(imageData.equals(viewData(original, canonicalView)), 'PNG hash collision');
    imageAliases.set(id, canonical);
    if (offsetOf(views[image.bufferView]) !== offsetOf(views[canonicalView])) {
      bufferAliases.set(image.bufferView, canonicalView);
    }
  }

  // Retain every accessor and image bufferView index. Only duplicate physical payloads are removed.
  const removed = [...bufferAliases].map(([index, canonical]) => {
    const view = views[index];
    const start = offsetOf(view);
    const end = start + (Math.ceil(view.byteLength / 4) * 4);
    assert.equal(start % 4, 0, 'PNG buffer is not aligned');
    assert(end <= original.binary.length && original.binary.subarray(start + view.byteLength, end).every(byte => byte === 0),
      'PNG padding is not empty');
    assert(views.every((other, id) => id === index || offsetOf(other) >= end
      || offsetOf(other) + other.byteLength <= start), 'Duplicate PNG overlaps another view');
    assert(!bufferAliases.has(canonical), 'Expected a canonical view');
    return { start, end };
  }).sort((left, right) => left.start - right.start);
  const slices = [];
  let cursor = 0;
  for (const { start, end } of removed) {
    slices.push(original.binary.subarray(cursor, start));
    cursor = end;
  }
  slices.push(original.binary.subarray(cursor));
  const binary = Buffer.concat(slices);
  document.buffers[0].byteLength = binary.length;
  for (const [index, view] of document.bufferViews.entries()) {
    const originalOffset = offsetOf(views[bufferAliases.get(index) ?? index]);
    const removedBytes = removed.filter(range => range.end <= originalOffset)
      .reduce((total, range) => total + range.end - range.start, 0);
    const next = originalOffset - removedBytes;
    if (next !== offsetOf(view)) view.byteOffset = next;
  }

  // Equal source bytes and equal sampler settings can share a Texture3D cache entry.
  // Keep texture definitions, names, texture-info transforms and UV sets.
  for (const texture of document.textures) {
    assert(Number.isInteger(texture.source) && document.images[texture.source]);
    texture.source = imageAliases.get(texture.source) ?? texture.source;
  }
  const canonicalTextures = new Map();
  for (const info of baseColorReferences(document)) {
    const texture = document.textures[info.index];
    const key = JSON.stringify(textureAppearance(texture, document, imageHashes));
    if (!canonicalTextures.has(key)) canonicalTextures.set(key, info.index);
    info.index = canonicalTextures.get(key);
  }
  return writeGlb(document, binary);
}

function semanticDocument(asset) {
  const document = structuredClone(asset.document);
  const hashes = document.images.map(image => sha256(viewData(asset, image.bufferView)));
  // The byte offsets may move, but each logical view must keep its original bytes.
  for (const view of document.bufferViews) delete view.byteOffset;
  delete document.buffers[0].byteLength;
  for (const info of baseColorReferences(document)) {
    info.index = textureAppearance(document.textures[info.index], document, hashes);
  }
  for (const texture of document.textures) texture.source = hashes[texture.source];
  return document;
}

function verify(original, candidate) {
  assert.deepEqual(semanticDocument(candidate), semanticDocument(original));
  for (const [index] of original.document.bufferViews.entries()) {
    assert(viewData(candidate, index).equals(viewData(original, index)), 'Changed bytes in logical buffer view ' + index);
  }
}

const [input, output, option] = process.argv.slice(2);
if (!input || !output || (option !== undefined && option !== '--check')) {
  throw Error('Usage: node tools/optimize-home-glb.mjs <input.glb> <output.glb> [--check]');
}
const originalBytes = await readFile(input);
const original = readGlb(originalBytes);
const expected = optimize(original);
const candidate = option === '--check' ? await readFile(output) : expected;
assert(candidate.equals(expected), 'Candidate differs from the deterministic lossless rewrite');
verify(original, readGlb(candidate));
if (option !== '--check') await writeFile(output, candidate, { flag: 'wx' });
console.log(JSON.stringify({ before: originalBytes.length, after: candidate.length, saved: originalBytes.length - candidate.length,
  sha256: sha256(candidate), viewsVerified: original.document.bufferViews.length }));
