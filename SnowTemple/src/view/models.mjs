// The sculpted models: one packed file, read once, turned into geometry the renderer can draw.
// They are made by tools/models.mjs; see tools/sculpt.mjs for how.
import { Attribute3D, createGeometry3D } from '@egret/engine/world3d';

const BODY_NAMES = new Set(['hero', 'blade', 'shield', 'bow', 'lu']);

function sceneRange(index) {
  let start, total = 0;
  for (const [name, info] of Object.entries(index).sort((a, b) => a[1].offset - b[1].offset)) {
    if (info.offset !== total || !Number.isSafeInteger(info.bytes) || info.bytes < 4 || info.bytes % 4 !== 0) return null;
    if (BODY_NAMES.has(name)) {
      if (!info.skinned || start !== undefined) return null;
    } else {
      start ??= total;
    }
    total += info.bytes;
  }
  return start > 0 && Number.isSafeInteger(total) ? { start, total } : null;
}

async function fullPack(url) {
  const response = await fetch(url);
  if (!response.ok) throw Error('Model pack HTTP ' + response.status);
  return { bin: await response.arrayBuffer(), offset: 0 };
}

async function scenePack(url, range) {
  const end = range.total - 1;
  try {
    const response = await fetch(url, { headers: { Range: 'bytes=' + range.start + '-' + end } });
    if (response.status === 200) {
      // Some local servers ignore Range and send the complete file once.
      const bin = await response.arrayBuffer();
      if (bin.byteLength === range.total) return { bin, offset: 0 };
    } else if (response.status === 206 &&
      response.headers.get('Content-Range') === 'bytes ' + range.start + '-' + end + '/' + range.total) {
      const bin = await response.arrayBuffer();
      if (bin.byteLength === range.total - range.start) return { bin, offset: range.start };
    } else {
      await response.body?.cancel();
    }
  } catch {
    // A proxy or development server may reject byte ranges. Retry the ordinary file.
  }
  return fullPack(url);
}

/** Read the stock pack, or just its scene suffix when all five external bodies have been validated. */
export async function loadModels(level = 'high', base = new URL('../../assets/', import.meta.url), replacementBodies) {
  const url = new URL('models-' + level + '.bin', base);
  const manifest = fetch(new URL('models-' + level + '.json', base)).then((response) => response.json());
  const [index, candidates, preloaded] = await Promise.all([manifest, replacementBodies, replacementBodies ? null : fullPack(url)]);
  const useReplacements = candidates && [...BODY_NAMES].every((name) => candidates[name]?.length > 0);
  const range = useReplacements ? sceneRange(index) : null;
  const { bin, offset } = preloaded ?? await (range ? scenePack(url, range) : fullPack(url));
  const models = {};
  for (const [name, info] of Object.entries(index)) {
    if (useReplacements && BODY_NAMES.has(name)) continue;
    const n = info.count;
    let at = info.offset - offset;
    const take = (Type, length) => {
      const view = new Type(bin, at, length);
      at += Math.ceil((length * Type.BYTES_PER_ELEMENT) / 4) * 4;
      return view;
    };
    const steps = take(Uint16Array, n * 3),
      normal = take(Int8Array, n * 3),
      colour = take(Uint8Array, n * 3),
      stuff = take(Uint8Array, n),
      uvs = new Float32Array(n * 2),
      positions = new Float32Array(n * 3),
      normals = new Float32Array(n * 3),
      colors = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) {
      positions[i] = info.lo[i % 3] + (steps[i] / 65535) * info.size[i % 3];
      normals[i] = normal[i] / 127;
      colors[i] = Math.pow(colour[i] / 255, 2.2);
    }
    // A stable place for fine pattern to be drawn from: the sculpted position seen a little from the side,
    // with what the point is made of carried in the whole part of the first number.
    for (let i = 0; i < n; i++) {
      uvs[i * 2] = stuff[i] * 16 + 4 + positions[i * 3] + positions[i * 3 + 2] * 0.37;
      uvs[i * 2 + 1] = positions[i * 3 + 1] + positions[i * 3 + 2] * 0.21;
    }
    const joints = info.skinned ? take(Uint8Array, n * 4) : null,
      weights = info.skinned ? take(Uint8Array, n * 4) : null,
      indices = take(info.wide ? Uint32Array : Uint16Array, info.indices),
      geometry = createGeometry3D({ positions, normals, colors, uvs, indices: info.wide ? indices : Uint32Array.from(indices) });
    if (joints) {
      geometry.setAttribute('joints', new Attribute3D(Uint16Array.from(joints), 4));
      geometry.setAttribute('weights', new Attribute3D(Float32Array.from(weights, (w) => w / 255), 4));
    }
    models[name] = geometry;
  }
  return models;
}
