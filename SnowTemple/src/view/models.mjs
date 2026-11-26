// The sculpted models: one packed file, read once, turned into geometry the renderer can draw.
// They are made by tools/models.mjs; see tools/sculpt.mjs for how.
import { Attribute3D, createGeometry3D } from '@egret/engine/world3d';
import { hasPropSurface, propSurfaceGeometry } from './prop-surface.mjs';
import { loadModelPack } from './model-pack.mjs';

/** Read scene geometry and the stock body of any character unavailable as a GLB. */
export async function loadModels(level = 'high', base = new URL('../../assets/', import.meta.url), replacementBodies, signal) {
  const { index, skip, spans } = await loadModelPack(level, base, replacementBodies, signal);
  const models = {};
  for (const [name, info] of Object.entries(index)) {
    if (skip.has(name)) continue;
    const { bin, offset } = spans.find(({ bin, offset }) =>
      info.offset >= offset && info.offset + info.bytes <= offset + bin.byteLength);
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
      geometry = createGeometry3D(hasPropSurface(name) ? propSurfaceGeometry(info, positions, normals, colors, indices, stuff) :
        { positions, normals, colors, uvs, indices: info.wide ? indices : Uint32Array.from(indices) });
    if (joints) {
      geometry.setAttribute('joints', new Attribute3D(Uint16Array.from(joints), 4));
      geometry.setAttribute('weights', new Attribute3D(Float32Array.from(weights, (w) => w / 255), 4));
    }
    models[name] = geometry;
  }
  return models;
}

/** Shared stock bodies, needed only when an external character is unavailable. */
export function loadStockCharacters(base, pageSignal) {
  const deadline = AbortSignal.timeout(8000);
  const signal = pageSignal ? AbortSignal.any([pageSignal, deadline]) : deadline;
  return loadModels('stock-characters', base, undefined, signal);
}
