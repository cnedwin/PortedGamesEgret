// 模型的载入：按画质读高、中、低某一档的 glb，材质换成卡通材质；摆件（树、山、礁石）取出网格和它在文件里的变换，
// 量好尺寸，交给棋盘批量摆放；单位和建筑留着整棵节点树，供每次复制一份。读不到的模型不报错，换成代码画的替身。
// Loading the models: one of the high, medium and low sets of each glb by quality, its materials turned to toon. For
// props (trees, peaks, reefs) the mesh and its transform in the file are taken and measured so the board can place
// them in batches; units and buildings keep the whole node tree, copied once for each use. A model that fails to load
// is not an error: a shape drawn in code stands in.
import { Mesh3D, Skeleton3D, computeObjectBounds3D, loadGltf3D } from '@egret/engine/world3d';
import { toonify } from './toon.mjs';
import { assetUrl } from '../asset-url.mjs';
import { modelBytes } from './model-bytes.mjs';
export { SET_OF } from './model-plan.mjs';

const decode = async ({ bytes, mimeType }) =>
  createImageBitmap(new Blob([bytes], { type: mimeType }), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });

/** How many models could not be had this page, so the page can say so and offer to try again. */
export const loadProblems = { count: 0 };

/** Fetch and parse one model; null when it cannot be had. */
export async function loadModel(name, set, base = assetUrl('models/'), prefetch) {
  try {
    return await loadGltf3D(await modelBytes(name,set,{base,prefetch}), { decodeImage: decode });
  } catch (cause) {
    loadProblems.count++;
    console.warn('model', name, cause?.message ?? cause);
    return null;
  }
}

/**
 * A prop for the board's batches: its geometry, a toon material, its transform inside the file, and the scale that
 * makes it `size` world units tall (or wide, for `by: 'width'`).
 */
export function propFrom(asset, size, { by = 'height', swap = false } = {}) {
  if (!asset) return null;
  let mesh = null;
  asset.scene.traverse((node) => {
    if (!mesh && node instanceof Mesh3D) mesh = node;
  });
  if (!mesh) return null;
  toonify(asset.scene, { swap, rim: [1, 1, 0.9, 0.12] });
  asset.scene.updateWorldMatrices();
  const bounds = computeObjectBounds3D(asset.scene);
  const height = bounds[4] - bounds[1],
    width = Math.max(bounds[3] - bounds[0], bounds[5] - bounds[2]);
  const fit = size / Math.max(1e-6, by === 'width' ? width : height);
  // Stand the model on the ground: its lowest point goes to zero.
  const local = new Float32Array(mesh.matrixWorld);
  local[12] -= (bounds[0] + bounds[3]) / 2;
  local[13] -= bounds[1];
  local[14] -= (bounds[2] + bounds[5]) / 2;
  return { geometry: mesh.geometry, material: Array.isArray(mesh.material) ? mesh.material[0] : mesh.material, matrix: local, fit };
}

/** Measures a model's node tree: its bounds and the scale for a given height. */
export function measure(root, height) {
  root.updateWorldMatrices();
  const b = computeObjectBounds3D(root);
  return { bounds: b, scale: height / Math.max(1e-6, b[4] - b[1]), centre: [(b[0] + b[3]) / 2, b[1], (b[2] + b[5]) / 2] };
}

/** A copy of a loaded scene for one more unit or building: its own nodes and, for a rigged figure, its own bones. */
export function cloneScene(source) {
  const nodes = new Map();
  const copyNode = (node) => {
    const copy = node.clone(false);
    nodes.set(node, copy);
    for (const child of node.children) copy.addChild(copyNode(child));
    return copy;
  };
  const scene = copyNode(source);
  const skeletons = new Map();
  for (const [node, copy] of nodes) {
    if (!(node instanceof Mesh3D) || !node.skeleton) continue;
    const original = node.skeleton;
    if (!skeletons.has(original)) skeletons.set(original, new Skeleton3D(original.bones.map((bone) => nodes.get(bone)), original.inverseBindMatrices));
    copy.bind(skeletons.get(original), node.bindMatrix);
  }
  return scene;
}
