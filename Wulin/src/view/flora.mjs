// Trees, shrubs, stones, grass and flowers from model files (see ASSETS.md for
// where they came from). Each file is read once and turned into a geometry
// the rest of the scenery can use like any other: coloured at the vertices,
// one unit tall, standing on the origin.
//
// The files give every surface a material by name (leaves, trunk, and so on)
// and nothing else is taken from them but shape: the colours are this game's
// own, so one tree can be had green, turning, or in blossom.
import { createGeometry3D } from '@egret/engine/world3d';
import { rgb, shade } from './shapes.mjs';

/** The model files, by the name the scenery asks for them by. */
export const FLORA_FILES = ['common_tree_1', 'common_tree_2', 'common_tree_3', 'pine_tree_1', 'pine_tree_2', 'pine_tree_3', 'bush_1', 'bush_2', 'bush_3', 'bush_4', 'bush_5', 'stone_1', 'stone_2', 'stone_3', 'stone_4', 'stone_5', 'grass_1', 'grass_2', 'grass_3', 'grass_4', 'flower_1', 'flower_2', 'flower_3', 'plant_1', 'plant_2', 'plant_3', 'tree_stump_1', 'dead_tree_1'];

/** The colour of each named material, as 0xRRGGBB; a variant replaces some of them. */
const COLOURS = { leaves: 0x5f8f48, leaves_dark: 0x426f3a, trunk: 0x6a4a30, trunk_inner: 0xc9a26a, DarkGreen: 0x4d7d3e, Gray: 0x8f8c82, grass: 0x73a04e, Green: 0x4f8a3f, Red: 0xd04a52, Yellow: 0xf0c040, Black: 0x3a2a20, Purple: 0xb866c8, Blue: 0x6f8fe0, Brown: 0x7a5a3e, DarkBrown: 0x4a3428 };
export const VARIANTS = {
  plain: {},
  pine: { leaves: 0x3a6040, leaves_dark: 0x2c4c34 },
  maple: { leaves: 0xc65a2c, leaves_dark: 0xa5412a },
  ginkgo: { leaves: 0xdcae34, leaves_dark: 0xc08a2a },
  blossom: { leaves: 0xf3bccb, leaves_dark: 0xe79db4, trunk: 0x4a3428 },
  moss: { Gray: 0x7f8672 },
  white: { Red: 0xf6f0e4 },
  pink: { Red: 0xf2a8c0, Purple: 0xf2a8c0, Blue: 0xf7d0d8 },
};

/** The raw shapes, by file name: `{ positions, normals, indices, materials: [{ name, start, count }] }`. */
const shapes = new Map();
const built = new Map();
const waiting = [];
let ready = false;

/** Reads a binary glTF file into one shape: every mesh of every node, moved to where its node puts it. */
export function readGlb(buffer) {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('not a glb file');
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)));
  const binStart = 20 + jsonLength + 8;
  const read = (index) => {
    const accessor = json.accessors[index],
      bufferView = json.bufferViews[accessor.bufferView];
    const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type],
      Kind = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array }[accessor.componentType];
    const from = binStart + (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0),
      stride = bufferView.byteStride ?? size * Kind.BYTES_PER_ELEMENT;
    const out = new Kind(accessor.count * size),
      data = new DataView(buffer, from);
    const get = { 5126: 'getFloat32', 5125: 'getUint32', 5123: 'getUint16', 5121: 'getUint8' }[accessor.componentType];
    for (let i = 0; i < accessor.count; i++) for (let k = 0; k < size; k++) out[i * size + k] = data[get](i * stride + k * Kind.BYTES_PER_ELEMENT, true);
    return out;
  };
  const positions = [],
    normals = [],
    indices = [],
    materials = [];
  /** Turns a vector by a quaternion. */
  const turn = ([x, y, z], [qx, qy, qz, qw]) => {
    const ix = qw * x + qy * z - qz * y,
      iy = qw * y + qz * x - qx * z,
      iz = qw * z + qx * y - qy * x,
      iw = -qx * x - qy * y - qz * z;
    return [ix * qw + iw * -qx + iy * -qz - iz * -qy, iy * qw + iw * -qy + iz * -qx - ix * -qz, iz * qw + iw * -qz + ix * -qy - iy * -qx];
  };
  const visit = (index, place) => {
    const node = json.nodes[index];
    const scale = node.scale ?? [1, 1, 1],
      rotation = node.rotation ?? [0, 0, 0, 1],
      move = node.translation ?? [0, 0, 0];
    // A point of this node, in the space of the whole file.
    const here = (p) => place(turn([p[0] * scale[0], p[1] * scale[1], p[2] * scale[2]], rotation).map((v, i) => v + move[i]));
    const lean = (n) => place.lean(turn([n[0] / scale[0], n[1] / scale[1], n[2] / scale[2]], rotation));
    here.lean = lean;
    if (node.mesh !== undefined)
      for (const primitive of json.meshes[node.mesh].primitives) {
        const p = read(primitive.attributes.POSITION),
          n = read(primitive.attributes.NORMAL),
          base = positions.length / 3;
        for (let i = 0; i < p.length; i += 3) {
          positions.push(...here([p[i], p[i + 1], p[i + 2]]));
          const normal = lean([n[i], n[i + 1], n[i + 2]]),
            length = Math.hypot(...normal) || 1;
          normals.push(normal[0] / length, normal[1] / length, normal[2] / length);
        }
        const start = indices.length;
        if (primitive.indices !== undefined) for (const i of read(primitive.indices)) indices.push(base + i);
        else for (let i = 0; i < p.length / 3; i++) indices.push(base + i);
        materials.push({ name: json.materials?.[primitive.material]?.name ?? '', start, count: indices.length - start });
      }
    for (const child of node.children ?? []) visit(child, here);
  };
  const still = (p) => p;
  still.lean = (n) => n;
  for (const root of json.scenes[json.scene ?? 0].nodes) visit(root, still);
  return { positions, normals, indices, materials };
}

/** Takes in a file that has been fetched. */
export function addFlora(name, buffer) {
  shapes.set(name, readGlb(buffer));
}

/** Fetches every model from a folder; resolves when all that could be had are in. Scenery made before then is told. */
export async function loadFlora(folder) {
  await Promise.all(
    FLORA_FILES.map(async (name) => {
      try {
        const response = await fetch(new URL(name + '.glb', folder));
        if (response.ok) addFlora(name, await response.arrayBuffer());
      } catch {
        // A model that cannot be had is done without.
      }
    }),
  );
  ready = shapes.size > 0;
  waiting.splice(0).forEach((tell) => tell());
  return ready;
}
/** Calls `tell` once the models are in, if they are not already. */
export const whenFlora = (tell) => (ready ? undefined : waiting.push(tell));
export const hasFlora = (name) => shapes.has(name);

/**
 * The geometry of a model in a variant of its colours: one unit tall, its foot on the origin.
 * Leaves and grass darken towards the ground, where less light reaches them. Null if the model is not in.
 */
export function floraGeometry(name, variant = 'plain') {
  const key = name + '|' + variant;
  if (built.has(key)) return built.get(key);
  const shape = shapes.get(name);
  if (!shape) return null;
  const { positions, normals, indices, materials } = shape;
  let low = Infinity,
    high = -Infinity,
    cx = 0,
    cz = 0;
  for (let i = 0; i < positions.length; i += 3) (low = Math.min(low, positions[i + 1])), (high = Math.max(high, positions[i + 1])), (cx += positions[i]), (cz += positions[i + 2]);
  cx /= positions.length / 3;
  cz /= positions.length / 3;
  const tall = high - low || 1;
  const palette = { ...COLOURS, ...VARIANTS[variant] };
  const out = new Float32Array(positions.length),
    colors = new Float32Array(positions.length).fill(1),
    uvs = new Float32Array((positions.length / 3) * 2);
  for (let i = 0; i < positions.length; i += 3) {
    out[i] = (positions[i] - cx) / tall;
    out[i + 1] = (positions[i + 1] - low) / tall;
    out[i + 2] = (positions[i + 2] - cz) / tall;
    uvs[(i / 3) * 2] = out[i] * 2.2 + out[i + 2] * 1.3;
    uvs[(i / 3) * 2 + 1] = out[i + 1] * 2.2;
  }
  for (const material of materials) {
    const hex = palette[material.name] ?? 0x8a8a8a,
      soft = /leaves|Green|grass/.test(material.name);
    for (let k = material.start; k < material.start + material.count; k++) {
      const v = indices[k],
        c = rgb(soft ? shade(hex, 0.66 + 0.5 * out[v * 3 + 1]) : hex);
      colors[v * 3] = c[0];
      colors[v * 3 + 1] = c[1];
      colors[v * 3 + 2] = c[2];
    }
  }
  const geometry = createGeometry3D({ positions: out, normals, colors, uvs, indices });
  built.set(key, geometry);
  return geometry;
}
