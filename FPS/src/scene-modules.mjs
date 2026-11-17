import { createGeometry3D, mat4Identity, vec3TransformMat4 } from '@egret/engine/world3d';

function clip(vertices, axis, boundary, keepGreater) {
  const output = [];
  for (let index = 0; index < vertices.length; index++) {
    const a = vertices[index], b = vertices[(index + 1) % vertices.length];
    const insideA = keepGreater ? a[axis] >= boundary : a[axis] <= boundary;
    const insideB = keepGreater ? b[axis] >= boundary : b[axis] <= boundary;
    if (insideA) output.push(a.slice());
    if (insideA !== insideB) {
      const t = (boundary - a[axis]) / (b[axis] - a[axis]);
      output.push(a.map((value, component) => value + (b[component] - value) * t));
    }
  }
  return output;
}

/**
 * Extend a straight manufactured object by repeating its centre panel.
 * End caps, cross-section and textures retain one uniform source scale.
 * The result is cached by the caller and remains one instanced material draw.
 */
export function repeatSceneModel(model, axis, length, scale) {
  const min = model.bounds[axis], max = model.bounds[axis + 3], span = max - min;
  const target = length / scale, cap = Math.min(span * 0.18, target * 0.22);
  const middle = Math.min(span * 0.28, target - cap * 2);
  const bands = [[min, min + cap, -target / 2], [max - cap, max, target / 2 - cap]];
  for (let at = -target / 2 + cap; at < target / 2 - cap - 1e-7; at += middle) {
    const size = Math.min(middle, target / 2 - cap - at);
    bands.push([(min + max - middle) / 2, (min + max - middle) / 2 + size, at]);
  }
  const bounds = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  const point = new Float32Array(3);
  const meshes = model.meshes.map(part => {
    const position = part.geometry.getAttribute('position').data;
    const normal = part.geometry.getAttribute('normal')?.data;
    const uv = part.geometry.getAttribute('uv')?.data;
    const faces = part.geometry.index?.data ?? Array.from({ length: position.length / 3 }, (_, index) => index);
    const positions = [], normals = [], uvs = [], indices = [];
    for (let face = 0; face < faces.length; face += 3) {
      const triangle = [];
      for (let corner = 0; corner < 3; corner++) {
        const vertex = faces[face + corner], offset = vertex * 3, m = part.matrix;
        point.set(position.subarray(offset, offset + 3));
        vec3TransformMat4(point, point, m);
        const n = normal ? [normal[offset], normal[offset + 1], normal[offset + 2]] : [0, 1, 0];
        const transformedNormal = [
          m[0] * n[0] + m[4] * n[1] + m[8] * n[2],
          m[1] * n[0] + m[5] * n[1] + m[9] * n[2],
          m[2] * n[0] + m[6] * n[1] + m[10] * n[2],
        ];
        triangle.push([...point, ...transformedNormal, uv?.[vertex * 2] ?? 0, uv?.[vertex * 2 + 1] ?? 0]);
      }
      for (const [start, end, destination] of bands) {
        const polygon = clip(clip(triangle, axis, start, true), axis, end, false);
        if (polygon.length < 3) continue;
        const base = positions.length / 3;
        for (const vertex of polygon) {
          vertex[axis] += destination - start;
          for (let component = 0; component < 3; component++) {
            const value = vertex[component] * scale;
            positions.push(value);
            bounds[component] = Math.min(bounds[component], value);
            bounds[component + 3] = Math.max(bounds[component + 3], value);
          }
          const magnitude = Math.hypot(...vertex.slice(3, 6)) || 1;
          normals.push(vertex[3] / magnitude, vertex[4] / magnitude, vertex[5] / magnitude);
          uvs.push(vertex[6], vertex[7]);
        }
        for (let corner = 1; corner < polygon.length - 1; corner++) indices.push(base, base + corner, base + corner + 1);
      }
    }
    return { geometry: createGeometry3D({ positions, normals, uvs, indices }), material: part.material,
      matrix: mat4Identity(new Float32Array(16)) };
  });
  return { name: model.name, bounds, meshes, parts: {} };
}
