import { Mesh3D } from '@egret/engine/world3d';
import { loadGltfFromUrl3D } from '@egret/engine/webgl2/world3d';

/** Optional art uses one opaque primitive baked into the game's local coordinates. */
export async function loadRoadAsset(scope, url) {
  let asset;
  try {
    asset = await loadGltfFromUrl3D(url, { signal: AbortSignal.timeout(3000), maxBytes: 512 * 1024 });
  } catch (cause) {
    console.warn('Optional road model unavailable', url.href, cause);
    return null;
  }
  const [mesh] = asset.scene.children;
  if (asset.scene.children.length !== 1 || !(mesh instanceof Mesh3D) || mesh.children.length
      || Array.isArray(mesh.material) || mesh.material.alphaMode !== 'opaque' || !mesh.material.map) {
    asset.dispose();
    console.warn('Unexpected road model format', url.href);
    return null;
  }
  scope.use(asset);
  return { geometry: mesh.geometry, material: mesh.material };
}
