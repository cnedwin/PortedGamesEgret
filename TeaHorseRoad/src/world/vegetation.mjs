import { loadGltfFromUrl3D } from '@egret/engine/webgl2/world3d';
import { InstancedMesh3D, Mesh3D, mat4Compose, mat4Determinant, mergeGeometries3D, transformGeometry3D } from '@egret/engine/world3d';
import { broadleafGeometry, pineGeometry, teaBushGeometry } from '../models/plants.mjs';

const FACE_LIMIT = { pine: 300, fir: 240, tea: 96, broadleaf: 320 };
const MAX_BYTES = 512 * 1024;
const MAX_TEXTURE_EDGE = 1024;

function baseCenter(geometry) {
  const bounds = geometry.boundingBox;
  const limit = bounds[1] + (bounds[4] - bounds[1]) * 0.08;
  const positions = geometry.getAttribute('position').data;
  let left = Infinity, right = -Infinity, front = Infinity, back = -Infinity;
  for (let at = 0; at < positions.length; at += 3) {
    if (positions[at + 1] > limit) continue;
    left = Math.min(left, positions[at]);
    right = Math.max(right, positions[at]);
    front = Math.min(front, positions[at + 2]);
    back = Math.max(back, positions[at + 2]);
  }
  return [(left + right) / 2, (front + back) / 2];
}

/** Fit one opaque atlas plant to its procedural scale and placement. */
export function fitPlantModel(kind, asset) {
  if (!Object.hasOwn(FACE_LIMIT, kind)) throw new Error('Unknown near-plant kind: ' + kind);
  const meshes = [];
  asset.scene.updateWorldMatrices();
  asset.scene.traverse((node) => {
    if (!node.visible) return false;
    if (node instanceof Mesh3D) meshes.push(node);
  });
  if (meshes.length !== 1 || asset.animations.length) throw new Error('Expected one rigid near-plant primitive');
  const [mesh] = meshes, source = mesh.geometry, material = mesh.materialAt(0);
  if (mesh.isInstanced || mesh.skeleton || source.morphTargets.length || Array.isArray(mesh.material) ||
      source.topology !== 'triangles' || source.groups.length || !source.drawCount || source.drawCount % 3 ||
      source.drawCount / 3 > FACE_LIMIT[kind] || !source.getAttribute('normal') || !source.getAttribute('uv') ||
      mat4Determinant(mesh.matrixWorld) <= 0) throw new Error('Near-plant geometry is outside its draw budget');
  const bitmap = material.map?.source;
  if (material.shading !== 'standard' || material.alphaMode !== 'opaque' || material.transmission > 0 ||
      asset.textures.length !== 1 || material.normalMap || material.metallicRoughnessMap ||
      !bitmap?.width || !bitmap?.height || bitmap.width > MAX_TEXTURE_EDGE || bitmap.height > MAX_TEXTURE_EDGE)
    throw new Error('Expected one opaque base-color atlas up to 1024px');

  const geometry = mergeGeometries3D([source]);
  try {
    transformGeometry3D(geometry, mesh.matrixWorld);
    const stock = kind === 'tea' ? teaBushGeometry() : kind === 'broadleaf' ? broadleafGeometry() : pineGeometry(kind === 'fir');
    const target = stock.boundingBox, bounds = geometry.boundingBox;
    const size = [0, 1, 2].map((axis) => bounds[axis + 3] - bounds[axis]);
    if (!size.every((span) => Number.isFinite(span) && span > 0)) throw new Error('Near-plant mesh has no solid bounds');
    const scale = size.map((span, axis) => (target[axis + 3] - target[axis]) / span);
    const [x, z] = baseCenter(geometry), [stockX, stockZ] = baseCenter(stock);
    const position = [stockX - x * scale[0], target[1] - bounds[1] * scale[1], stockZ - z * scale[2]];
    transformGeometry3D(geometry, mat4Compose(new Float32Array(16), position, [0, 0, 0, 1], scale));
    return {
      geometry, material,
      dispose() {
        geometry.dispose();
        asset.dispose();
      }
    };
  } catch (cause) {
    geometry.dispose();
    throw cause;
  }
}

/** The original plant remains available if this optional, bounded load fails. */
export async function loadPlantModel(kind, url, { signal } = {}) {
  const deadline = AbortSignal.timeout(5000);
  const loadSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
  const asset = await loadGltfFromUrl3D(url, { signal: loadSignal, maxBytes: MAX_BYTES });
  try {
    loadSignal.throwIfAborted();
    return fitPlantModel(kind, asset);
  } catch (cause) {
    asset.dispose();
    throw cause;
  }
}

/** Prepare the mapped, tinted instance variant before any tile switches to it. */
export async function preparePlantModel(renderer, model, {
  scene, camera, waters, reflections, prepare = (requests) => renderer.preparePrograms(requests)
}) {
  if (typeof renderer.preparePrograms !== 'function') return;
  const { geometry, material } = model;
  const mesh = new InstancedMesh3D(geometry, material, 1);
  mesh.setColorAt(0, 1, 1, 1);
  const lighting = { fog: Boolean(scene.fog), environment: Boolean(scene.environment) };
  const requests = [
    { mesh, material, ...lighting, receiveShadows: renderer.shadowsEnabled },
    { mesh, material, pass: 'depth-prepass' },
  ];
  const ford = reflections && waters.bodies.find(({ id }) => id === 'ford')?.water;
  if (ford?.reflection) requests.push({ mesh, material, ...lighting, reflection: ford.reflection.createPass(camera, [ford]) });
  await prepare(requests);
}
