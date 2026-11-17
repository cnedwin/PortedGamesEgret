import {
  Attribute3D, Geometry3D, InstancedMesh3D, Mesh3D, createUnlitMaterial3D,
} from '@egret/engine/world3d';

// Only depth silhouettes use this reduction. The authored visible geometry,
// normals, tangents and PBR textures are never changed.
const cache = new WeakMap();
const CELLS = 32;
// A/B control leaves all visible art and lighting intact; only caster detail
// changes. The explicit per-mount shadow:'full' option does the same.
const fullDepth = globalThis.location && new URL(globalThis.location.href).searchParams.get('modelShadows') === 'full';

function reduce(source) {
  const attribute = source.getAttribute('position'), positions = attribute.data;
  const count = attribute.count, bounds = source.boundingBox;
  const span = Math.max(bounds[3] - bounds[0], bounds[4] - bounds[1], bounds[5] - bounds[2]);
  const cell = span / CELLS, groups = new Map(), clusters = [];
  const vertex = new Uint32Array(count);
  if (!(cell > 0) || attribute.itemSize !== 3) return source;
  for (let i = 0; i < count; i++) {
    const offset = i * 3, x = positions[offset], y = positions[offset + 1], z = positions[offset + 2];
    const gx = Math.min(CELLS, Math.floor((x - bounds[0]) / cell));
    const gy = Math.min(CELLS, Math.floor((y - bounds[1]) / cell));
    const gz = Math.min(CELLS, Math.floor((z - bounds[2]) / cell));
    const key = gx + (CELLS + 1) * (gy + (CELLS + 1) * gz);
    let index = groups.get(key);
    if (index === undefined) {
      index = clusters.length;
      groups.set(key, index);
      clusters.push([0, 0, 0, 0, 0]);
    }
    const cluster = clusters[index];
    cluster[0] += x; cluster[1] += y; cluster[2] += z; cluster[3]++;
    // Keep the source's six outer planes so broad contact/silhouette extents
    // cannot shrink just because a bevel shares a vertex cluster.
    for (let axis = 0; axis < 3; axis++) {
      if (positions[offset + axis] === bounds[axis]) cluster[4] |= 1 << axis;
      if (positions[offset + axis] === bounds[axis + 3]) cluster[4] |= 1 << (axis + 3);
    }
    vertex[i] = index;
  }
  const compact = new Float32Array(clusters.length * 3);
  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    for (let axis = 0; axis < 3; axis++) {
      compact[i * 3 + axis] = cluster[4] & (1 << axis) ? bounds[axis]
        : cluster[4] & (1 << (axis + 3)) ? bounds[axis + 3] : cluster[axis] / cluster[3];
    }
  }
  const sourceIndex = source.index?.data, faces = [], seen = new Set();
  const threshold = span ** 4 * 1e-20;
  for (let i = 0; i < source.drawCount; i += 3) {
    const a = vertex[sourceIndex ? sourceIndex[i] : i];
    const b = vertex[sourceIndex ? sourceIndex[i + 1] : i + 1];
    const c = vertex[sourceIndex ? sourceIndex[i + 2] : i + 2];
    if (a === b || b === c || c === a) continue;
    const abx = compact[b * 3] - compact[a * 3], aby = compact[b * 3 + 1] - compact[a * 3 + 1], abz = compact[b * 3 + 2] - compact[a * 3 + 2];
    const acx = compact[c * 3] - compact[a * 3], acy = compact[c * 3 + 1] - compact[a * 3 + 1], acz = compact[c * 3 + 2] - compact[a * 3 + 2];
    const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
    if (nx * nx + ny * ny + nz * nz <= threshold) continue;
    const lo = Math.min(a, b, c), hi = Math.max(a, b, c), key = lo + '/' + (a + b + c - lo - hi) + '/' + hi;
    if (seen.has(key)) continue;
    seen.add(key);
    faces.push(a, b, c);
  }
  // Very small/open source parts remain valid depth casters too.
  if (!faces.length || faces.length >= source.drawCount) return source;
  return new Geometry3D().setAttribute('position', new Attribute3D(compact, 3)).setIndex(faces);
}

function entry(source) {
  let found = cache.get(source);
  if (found) return found;
  const geometry = reduce(source);
  const material = createUnlitMaterial3D({ color: 0xffffff, side: 'double' });
  material.name = 'Imported model depth silhouette';
  found = { geometry, material };
  cache.set(source, found);
  source.onDispose(() => {
    if (geometry !== source) geometry.dispose();
    material.dispose();
    cache.delete(source);
  });
  return found;
}

/** Native shadow passes gather casters before camera layers are filtered. */
export function addModelShadow(mesh, shadow = true) {
  if (!shadow || shadow === 'full' || fullDepth || mesh.skeleton || mesh.geometry.morphTargets.length || mesh.geometry.topology !== 'triangles') {
    mesh.castShadow = Boolean(shadow);
    return null;
  }
  const { geometry, material } = entry(mesh.geometry);
  const proxy = mesh.isInstanced
    ? new InstancedMesh3D(geometry, material, mesh.capacity)
    : new Mesh3D(geometry, material);
  proxy.name = (mesh.name || 'Imported model') + ' / depth silhouette';
  proxy.layers = 0;
  proxy.pickable = false;
  proxy.castShadow = true;
  proxy.receiveShadow = false;
  proxy.frustumCulled = mesh.frustumCulled;
  if (mesh.isInstanced) {
    // Share the immutable placement stream. A later caller's matrix/count
    // changes also reach the proxy without copying or allocating each frame.
    proxy.instanceMatrices = mesh.instanceMatrices;
    proxy.count = mesh.count;
    proxy.instanceVersion = mesh.instanceVersion;
    proxy.beforeRender = () => {
      proxy.count = mesh.count;
      proxy.instanceVersion = mesh.instanceVersion;
    };
  }
  mesh.castShadow = false;
  mesh.addChild(proxy);
  return proxy;
}
