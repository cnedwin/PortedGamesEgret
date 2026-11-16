// The sculpted models: one packed file, read once, turned into geometry the renderer can draw.
// They are made by tools/models.mjs; see tools/sculpt.mjs for how.
import { Attribute3D, createGeometry3D } from '@egret/engine/world3d';

/** Read every model. Returns a map from name to geometry; skinned ones carry bones and weights. */
export async function loadModels(level = 'high', base = new URL('../../assets/', import.meta.url)) {
  const [index, bin] = await Promise.all([fetch(new URL(`models-${level}.json`, base)).then((r) => r.json()), fetch(new URL(`models-${level}.bin`, base)).then((r) => r.arrayBuffer())]);
  const models = {};
  for (const [name, info] of Object.entries(index)) {
    const n = info.count;
    let at = info.offset;
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
