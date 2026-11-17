import {
  InstancedMesh3D, Mesh3D, Object3D, mat4Compose, mat4Multiply, quatFromEuler, vec3TransformMat4,
} from '@egret/engine/world3d';

const DIRECTORY = new URL('../assets/models/', import.meta.url);
const ROLES = [
  'soldier-rifle', 'soldier-rush', 'soldier-heavy', 'operator-hands',
  'weapon-rifle', 'weapon-pistol', 'weapon-marksman', 'enemy-rifle', 'enemy-rush', 'enemy-heavy',
  'booth', 'terminal', 'supply-crate', 'supply-body', 'supply-lid', 'truck', 'helicopter',
  'dam', 'dam-step', 'compound', 'plant', 'office', 'roof', 'water-tower',
  'container', 'crate', 'barrier', 'sandbag', 'canopy', 'post', 'generator', 'console', 'pipe-rack',
  'cabinet', 'server', 'desk', 'sofa', 'transformer', 'leg', 'tank', 'barrel', 'pallet',
  'tyres', 'reel', 'forklift', 'penstock', 'tower', 'grenade',
];
const ZERO = [0, 0, 0], ONE = [1, 1, 1];
const IDENTITY = [0, 0, 0, 1];
const emptyBounds = () => [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
const validBounds = bounds => bounds.every(Number.isFinite) && bounds.slice(0, 3).every((min, axis) => bounds[axis + 3] - min > 1e-6);

/** Keep each authored mesh and its material. Named parts may select whole glTF node branches. */
export function describeModel(scene, { yaw = 0, pitch = 0, parts = {} } = {}) {
  if (![yaw, pitch].every(Number.isFinite) || !parts || typeof parts !== 'object' || Array.isArray(parts)) {
    throw Error('Invalid visual model orientation or parts');
  }
  const sections = Object.fromEntries(Object.keys(parts).map(name => [name, { name, bounds: emptyBounds(), meshes: [] }]));
  const selectors = Object.entries(parts).map(([name, selector]) => {
    const names = Array.isArray(selector) ? selector : [selector];
    if (!names.length || !names.every(value => typeof value === 'string' && value.trim())) throw Error('Invalid mesh selector for ' + name);
    return [sections[name], new Set(names)];
  });
  const bounds = emptyBounds(), meshes = [];
  const rotation = quatFromEuler(new Float32Array(4), pitch, yaw, 0);
  const orientation = mat4Compose(new Float32Array(16), ZERO, rotation, ONE);
  const vertex = new Float32Array(3), point = new Float32Array(3);
  function include(target, range) {
    for (let axis = 0; axis < 3; axis++) {
      target[axis] = Math.min(target[axis], range[axis]);
      target[axis + 3] = Math.max(target[axis + 3], range[axis + 3]);
    }
  }
  scene.updateWorldMatrices();
  scene.traverse(node => {
    if (!node.visible) return false;
    if (!(node instanceof Mesh3D)) return;
    if (node.isInstanced || node.skeleton || node.geometry.morphTargets.length) throw Error('Visual model requires prepared rigid parts');
    const position = node.geometry.getAttribute('position');
    if (!position || position.itemSize !== 3 || !node.geometry.drawCount) return;
    const matrix = mat4Multiply(new Float32Array(16), orientation, node.matrixWorld);
    const range = emptyBounds();
    const vertices = position.data;
    for (let offset = 0; offset < vertices.length; offset += 3) {
      vertex[0] = vertices[offset];
      vertex[1] = vertices[offset + 1];
      vertex[2] = vertices[offset + 2];
      vec3TransformMat4(point, vertex, matrix);
      for (let axis = 0; axis < 3; axis++) {
        range[axis] = Math.min(range[axis], point[axis]);
        range[axis + 3] = Math.max(range[axis + 3], point[axis]);
      }
    }
    const mesh = { geometry: node.geometry, material: node.material, matrix };
    include(bounds, range);
    meshes.push(mesh);
    if (!selectors.length) return;
    const names = new Set();
    for (let ancestor = node; ancestor; ancestor = ancestor.parent) names.add(ancestor.name);
    for (const [section, accepted] of selectors) {
      if (![...accepted].some(name => names.has(name))) continue;
      include(section.bounds, range);
      section.meshes.push(mesh);
    }
  });
  if (!meshes.length || !validBounds(bounds)) throw Error('Visual model has no usable three-dimensional bounds');
  for (const section of Object.values(sections)) {
    if (!section.meshes.length || !validBounds(section.bounds)) throw Error('No usable geometry for model part ' + section.name);
  }
  return { bounds, meshes, parts: sections };
}

/** Keep stand-in art for failed or unavailable entries and release each shared GLB once. */
export async function loadModels(loadGltf) {
  const models = {}, failures = {}, assets = new Map(), acquired = [];
  const bundle = { models, failures, dispose() { for (const asset of acquired.splice(0)) asset.dispose(); } };
  const signal = AbortSignal.timeout(12000);
  const deadline = new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
  let manifest;
  try {
    const response = await Promise.race([fetch(new URL('index.json', DIRECTORY), { signal }), deadline]);
    if (!response.ok) throw Error('Visual model index HTTP ' + response.status);
    manifest = await Promise.race([response.json(), deadline]);
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw Error('Invalid visual model index');
  } catch (cause) {
    failures.manifest = String(cause?.message ?? cause);
    return bundle;
  }
  await Promise.all(ROLES.filter(role => Object.hasOwn(manifest, role)).map(async role => {
    try {
      const spec = manifest[role], file = spec?.file;
      if (typeof file !== 'string' || !/^[a-z0-9][a-z0-9_-]*(?:\.[a-z0-9_-]+)*\.glb$/i.test(file)) throw Error('Invalid GLB filename');
      if (!assets.has(file)) {
        assets.set(file, loadGltf(new URL(file, DIRECTORY), { signal, maxBytes: 24 * 1024 * 1024 }).then(asset => {
          if (signal.aborted) {
            asset.dispose();
            signal.throwIfAborted();
          }
          acquired.push(asset);
          return asset;
        }));
      }
      const asset = await Promise.race([assets.get(file), deadline]);
      const model = describeModel(asset.scene, spec);
      for (const [name, section] of Object.entries(model.parts)) section.name = role + '/' + name;
      models[role] = { ...model, name: role };
    } catch (cause) {
      failures[role] = String(cause?.message ?? cause);
    }
  }));
  return bundle;
}

const FIT_AXIS = { width: 0, height: 1, depth: 2 };

function modelFit(bounds, slot, stretch, align, fit) {
  const scale = bounds.slice(0, 3).map((min, axis) => (slot[axis + 3] - slot[axis]) / (bounds[axis + 3] - min));
  if (!stretch) {
    const factor = fit === 'contain' ? Math.min(...scale) : scale[FIT_AXIS[fit]];
    if (!Number.isFinite(factor) || factor <= 0) throw Error('Invalid model fit ' + fit);
    scale.fill(factor);
  }
  const position = scale.map((factor, axis) => {
    const space = slot[axis + 3] - slot[axis];
    const span = (bounds[axis + 3] - bounds[axis]) * factor;
    return slot[axis] - bounds[axis] * factor + (space - span) * align[axis];
  });
  return { position, scale };
}

/** Mount visual art beneath a native animated pivot. Slot bounds are local to that pivot. */
export function addModel(parent, model, slot, {
  stretch = false, fit = 'contain', align = [0.5, 0, 0.5], shadow = true, cull = true, transform,
} = {}) {
  if (!model) return null;
  let placement;
  if (transform) {
    const { scale, position } = transform;
    if (!Number.isFinite(scale) || scale <= 0 || !Array.isArray(position) ||
        position.length !== 3 || !position.every(Number.isFinite)) throw Error('Invalid model joint transform');
    placement = { position, scale: [scale, scale, scale] };
  } else {
    placement = modelFit(model.bounds, slot, stretch, align, fit);
  }
  const { position, scale } = placement;
  const group = new Object3D().setPosition(...position).setScale(...scale);
  group.name = model.name ?? 'Imported visual';
  for (const part of model.meshes) {
    const mesh = new Mesh3D(part.geometry, part.material).setMatrix(part.matrix);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    mesh.frustumCulled = cull;
    group.addChild(mesh);
  }
  parent.addChild(group);
  return group;
}

/** Share the geometry and material across all matching station props, including the taller/longer variants. */
export function batchModels(parent, model, placements, {
  shadow = true, fit = 'contain', stretch = false, align = [0.5, 0, 0.5],
} = {}) {
  if (!model || !placements.length) return;
  const local = new Float32Array(16), world = new Float32Array(16), matrix = new Float32Array(16), turn = new Float32Array(4);
  const fitted = placements.map(({ slot, at, yaw = 0, fit: instanceFit = fit,
    stretch: instanceStretch = stretch, align: instanceAlign = align }) => {
    const { position, scale } = modelFit(model.bounds, slot, instanceStretch, instanceAlign, instanceFit);
    mat4Compose(local, position, IDENTITY, scale);
    mat4Compose(world, at, quatFromEuler(turn, 0, yaw, 0), ONE);
    return mat4Multiply(new Float32Array(16), world, local);
  });
  for (const part of model.meshes) {
    const mesh = new InstancedMesh3D(part.geometry, part.material, placements.length);
    mesh.name = model.name ?? 'Imported visual';
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    for (let index = 0; index < fitted.length; index++) mesh.setMatrixAt(index, mat4Multiply(matrix, fitted[index], part.matrix));
    parent.addChild(mesh);
  }
}
