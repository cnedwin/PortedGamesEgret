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

function buildSections(model, sections) {
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
      for (const { range, offset, scale } of sections) {
        let polygon = triangle;
        for (let axis = 0; axis < 3 && polygon.length; axis++) {
          if (Number.isFinite(range[axis])) polygon = clip(polygon, axis, range[axis], true);
          if (Number.isFinite(range[axis + 3])) polygon = clip(polygon, axis, range[axis + 3], false);
        }
        if (polygon.length < 3) continue;
        const base = positions.length / 3;
        for (const vertex of polygon) {
          for (let component = 0; component < 3; component++) {
            const value = (vertex[component] + offset[component]) * scale;
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
    const geometry = createGeometry3D({ positions, normals, uvs, indices });
    if (part.material.normalMap) geometry.computeTangents();
    return { geometry, material: part.material,
      matrix: mat4Identity(new Float32Array(16)) };
  }).filter(part => part.geometry.drawCount > 0);
  return { name: model.name, bounds, meshes, parts: {} };
}

/** Crop a facade around its original doorways without rescaling the window pattern. */
export function cropSceneModel(model, range) {
  return buildSections(model, [{ range, offset: [0, 0, 0], scale: 1 }]);
}

/** Merge clipped facade reliefs into one static draw per authored material. */
export function mergeSceneReliefs(name, pieces) {
  const groups = new Map(), bounds = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const { model, origin, at, yaw, depth } of pieces) {
    const cosine = Math.cos(yaw), sine = Math.sin(yaw);
    for (const part of model.meshes) {
      if (!groups.has(part.material)) groups.set(part.material, { positions: [], normals: [], uvs: [], indices: [] });
      const group = groups.get(part.material), base = group.positions.length / 3;
      const positions = part.geometry.getAttribute('position').data, normals = part.geometry.getAttribute('normal').data;
      const uv = part.geometry.getAttribute('uv').data, indices = part.geometry.index.data;
      for (let index = 0; index < positions.length; index += 3) {
        const x = positions[index] - origin[0], y = positions[index + 1], z = (positions[index + 2] - origin[2]) * depth + 0.016;
        const vertex = [at[0] + cosine * x + sine * z, y, at[2] - sine * x + cosine * z];
        const nx = normals[index], ny = normals[index + 1], nz = normals[index + 2] / depth;
        const length = Math.hypot(nx, ny, nz) || 1;
        group.positions.push(...vertex);
        group.normals.push((cosine * nx + sine * nz) / length, ny / length, (-sine * nx + cosine * nz) / length);
        for (let axis = 0; axis < 3; axis++) {
          bounds[axis] = Math.min(bounds[axis], vertex[axis]);
          bounds[axis + 3] = Math.max(bounds[axis + 3], vertex[axis]);
        }
      }
      for (const value of uv) group.uvs.push(value);
      for (const index of indices) group.indices.push(base + index);
      part.geometry.dispose();
    }
  }
  const meshes = [...groups].map(([material, arrays]) => {
    const geometry = createGeometry3D(arrays);
    if (material.normalMap) geometry.computeTangents();
    return { geometry, material, matrix: mat4Identity(new Float32Array(16)) };
  });
  return { name, bounds, meshes, parts: {} };
}

/**
 * Repeat complete source panels with their UVs and PBR material. End caps keep
 * their original proportions. The caller caches each manufactured length.
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
  const sections = bands.map(([start, end, destination]) => {
    const range = [-Infinity, -Infinity, -Infinity, Infinity, Infinity, Infinity], offset = [0, 0, 0];
    range[axis] = start;
    range[axis + 3] = end;
    offset[axis] = destination - start;
    return { range, offset, scale };
  });
  return buildSections(model, sections);
}
