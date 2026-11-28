import { Mesh3D } from '@egret/engine/world3d';

const opaque = material => !(material.isTransparent || material.transmission > 0);

/** Collect real grouped draws for the ready title world, rather than constructing dummy materials. */
export function collectTitleProgramRequests(roots, { fog = false, environment = false, shadowsEnabled = false, depthPrepass } = {}) {
  const items = [], visited = new Set();
  function visit(node) {
    if (!node?.visible || visited.has(node)) return;
    visited.add(node);
    if (node instanceof Mesh3D && !node.geometry.isDisposed && node.geometry.drawCount > 0) {
      const groups = node.geometry.groups;
      // RenderList3D uses grouped slots only when the mesh has an array of materials.
      const materials = Array.isArray(node.material) && groups.length
        ? groups.filter(group => group.count > 0).map(group => node.materialAt(group.materialIndex))
        : [node.materialAt(0)];
      for (const material of new Set(materials)) {
        if (material?.visible && !material.isDisposed) items.push({ mesh: node, material });
      }
    }
    for (const child of node.children) visit(child);
  }
  for (const root of Array.isArray(roots) ? roots : [roots]) visit(root);

  // Match the renderer's scene-depth and scene-colour conditions. This title normally has
  // no soft-depth surfaces, so there is no reason to prepare an unrelated depth-only pass.
  const needsDepth = depthPrepass ?? items.some(({ material }) => !opaque(material) && material.softness > 0);
  const needsSceneColour = items.some(({ material }) => !opaque(material) && material.shading === 'standard' && material.transmission > 0);
  const requests = [];
  for (const { mesh, material } of items) {
    requests.push({ mesh, material, pass: 'color', fog, environment,
      receiveShadows: shadowsEnabled && mesh.receiveShadow,
      softDepth: needsDepth && material.softness > 0,
      transmission: needsSceneColour && material.transmission > 0 });
    if (mesh.geometry.topology !== 'triangles' || material.billboard) continue;
    if (shadowsEnabled && mesh.castShadow) requests.push({ mesh, material, pass: 'shadow' });
    if (needsDepth && opaque(material) && material.depthWrite && !material.screenSpace)
      requests.push({ mesh, material, pass: 'depth-prepass' });
  }
  return requests;
}

/** Link asynchronously on supported renderers before the first draw; no scene or material is changed. */
export async function prepareTitlePrograms(renderer, roots, options = {}) {
  if (typeof renderer.preparePrograms !== 'function') return 0;
  const requests = collectTitleProgramRequests(roots, { ...options, shadowsEnabled: renderer.shadowsEnabled });
  if (requests.length) await renderer.preparePrograms(requests, { includeAutoInstancing: true });
  return requests.length;
}
