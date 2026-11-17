// Source solids tag the surface they represent. Pack colours still carry the
// carved occlusion and variations, with the shared maps supplying close detail.
export const PROP_SURFACE = Object.freeze({ stone: 0, bronze: 1, snow: 2, straw: 3, bark: 4, needle: 5 });
export const PROP_ATLAS = Object.freeze({ columns: 3, rows: 2, border: 1 / 16, high: 256, low: 128 });
const TEXTURED = new Set(['lion', 'lantern', 'censer', 'stack', 'pine']);
const PLANES = 4, CHARTS = 6 * PLANES;
export const hasPropSurface = (name) => TEXTURED.has(name);

/** Split only vertices whose local projection or surface changes across a face. */
export function propSurfaceGeometry(info, positions, normals, colors, indices, surface) {
  const lookup = new Int32Array(surface.length * CHARTS);
  const mapped = { positions: [], normals: [], colors: [], uvs: [], indices: new Uint32Array(indices.length) };
  const { columns, rows, border } = PROP_ATLAS;
  const cylindrical = (tile) => tile === PROP_SURFACE.bark || tile === PROP_SURFACE.straw || tile === PROP_SURFACE.bronze;
  const angles = surface.some(cylindrical) ? Float32Array.from(surface, (_, index) =>
    0.5 + Math.atan2(positions[index * 3 + 2], positions[index * 3]) / (2 * Math.PI)) : null;
  function vertex(index, tile, axis) {
    const key = index * CHARTS + tile * PLANES + axis;
    if (lookup[key]) return lookup[key] - 1;
    const at = index * 3;
    const target = mapped.positions.length / 3;
    for (let j = 0; j < 3; j++) {
      mapped.positions.push(positions[at + j]);
      mapped.normals.push(normals[at + j]);
      mapped.colors.push(colors[at + j]);
    }
    const relative = (component) => Math.max(0, Math.min(1,
      (positions[at + component] - info.lo[component]) / (info.size[component] || 1)));
    const u = axis === 3 ? angles[index] : relative(axis === 0 ? 2 : 0);
    const v = relative(axis === 1 ? 2 : 1);
    const x = (u * (1 - 2 * border) + border + tile % columns) / columns;
    const y = (v * (1 - 2 * border) + border + Math.floor(tile / columns)) / rows;
    mapped.uvs.push(x, y);
    lookup[key] = target + 1;
    return target;
  }
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2];
    const tile = Math.min(PROP_SURFACE.needle, surface[b] === surface[c] ? surface[b] : surface[a]);
    let axis = 1;
    if (cylindrical(tile)) {
      // A tiny planar patch at the back keeps the UV ring's seam inside
      // its tile. The bark and straw highlights follow the object height.
      const low = Math.min(angles[a], angles[b], angles[c]), high = Math.max(angles[a], angles[b], angles[c]);
      axis = high - low < 0.5 ? 3 : 2;
    } else if (tile !== PROP_SURFACE.snow && tile !== PROP_SURFACE.needle) {
      const nx = Math.abs(normals[a * 3] + normals[b * 3] + normals[c * 3]);
      const ny = Math.abs(normals[a * 3 + 1] + normals[b * 3 + 1] + normals[c * 3 + 1]);
      const nz = Math.abs(normals[a * 3 + 2] + normals[b * 3 + 2] + normals[c * 3 + 2]);
      axis = nx >= ny && nx >= nz ? 0 : ny >= nz ? 1 : 2;
    }
    mapped.indices[i] = vertex(a, tile, axis);
    mapped.indices[i + 1] = vertex(b, tile, axis);
    mapped.indices[i + 2] = vertex(c, tile, axis);
  }
  return mapped;
}
