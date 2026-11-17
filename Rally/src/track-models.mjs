import {
  InstancedMesh3D, Mesh3D, Object3D, mat4Compose, mat4Multiply, quatFromEuler, vec3TransformMat4,
} from '@egret/engine/world3d';

const DIRECTORY = new URL('../assets/track-models/', import.meta.url);
const ROLES = [
  'lion-kart', 'lion-driver', 'lion-head',
  'panda-kart', 'panda-driver', 'panda-head', 'monkey-kart', 'monkey-driver', 'monkey-head',
  'paper-lantern', 'guardian-lion', 'pagoda', 'cloud-gate', 'drum', 'start-gate',
];
const ORIGIN = [0, 0, 0], ONE = [1, 1, 1];
const IDENTITY = [0, 0, 0, 1];

/** Capture static mesh parts and their oriented bounds without dropping PBR maps or draw groups. */
export function describeTrackModel(scene, { yaw = 0, pitch = 0 } = {}) {
  if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) throw Error('Invalid model orientation in manifest');
  const parts = [], bounds = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  const rotation = quatFromEuler(new Float32Array(4), pitch, yaw, 0);
  const orientation = mat4Compose(new Float32Array(16), ORIGIN, rotation, ONE);
  const point = new Float32Array(3), local = new Float32Array(3);
  scene.updateWorldMatrices();
  scene.traverse(node => {
    if (!node.visible) return false;
    if (!(node instanceof Mesh3D)) return;
    if (node.isInstanced || node.skeleton || node.geometry.morphTargets.length) throw Error('Expected a static model');
    const position = node.geometry.getAttribute('position');
    if (!position || position.itemSize !== 3 || !node.geometry.drawCount) return;
    const matrix = mat4Multiply(new Float32Array(16), orientation, node.matrixWorld);
    const vertices = position.data;
    for (let i = 0; i < vertices.length; i += 3) {
      local[0] = vertices[i];
      local[1] = vertices[i + 1];
      local[2] = vertices[i + 2];
      vec3TransformMat4(point, local, matrix);
      for (let axis = 0; axis < 3; axis++) {
        bounds[axis] = Math.min(bounds[axis], point[axis]);
        bounds[axis + 3] = Math.max(bounds[axis + 3], point[axis]);
      }
    }
    parts.push({ geometry: node.geometry, material: node.material, matrix });
  });
  if (!parts.length || !bounds.every(Number.isFinite) || bounds.slice(0, 3).some((min, axis) => bounds[axis + 3] - min <= 1e-6)) {
    throw Error('Model has no usable three-dimensional bounds');
  }
  return { parts, bounds };
}

/** An empty or partially populated manifest uses the existing models for every absent role. */
export async function loadTrackModels(loadGltf) {
  const models = {}, failures = {}, acquired = [];
  const bundle = { models, failures, dispose() { for (const asset of acquired.splice(0)) asset.dispose(); } };
  const signal = AbortSignal.timeout(12000);
  const deadline = new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
  let sources;
  try {
    const response = await Promise.race([fetch(new URL('index.json', DIRECTORY), { signal }), deadline]);
    if (!response.ok) throw Error('Model manifest HTTP ' + response.status);
    sources = await Promise.race([response.json(), deadline]);
    if (!sources || typeof sources !== 'object' || Array.isArray(sources)) throw Error('Invalid model manifest');
  } catch (cause) {
    failures.manifest = String(cause?.message ?? cause);
    return bundle;
  }
  await Promise.all(ROLES.filter(role => Object.hasOwn(sources, role)).map(async role => {
    try {
      const spec = sources[role];
      if (typeof spec?.file !== 'string' || !/^[a-z0-9][a-z0-9._-]*\.glb$/i.test(spec.file)) throw Error('Invalid model manifest entry');
      const model = await Promise.race([
        loadGltf(new URL(spec.file, DIRECTORY), { signal, maxBytes: 32 * 1024 * 1024 }).then(asset => {
          try {
            signal.throwIfAborted();
            const fitted = describeTrackModel(asset.scene, spec);
            acquired.push(asset);
            return fitted;
          } catch (cause) {
            asset.dispose();
            throw cause;
          }
        }),
        deadline,
      ]);
      models[role] = { ...model, name: role };
    } catch (cause) {
      failures[role] = String(cause?.message ?? cause);
    }
  }));
  return bundle;
}

function fit(bounds, slot, stretch) {
  const scale = bounds.slice(0, 3).map((min, axis) => (slot[axis + 3] - slot[axis]) / (bounds[axis + 3] - min));
  if (!stretch) scale.fill(Math.min(...scale));
  // Settle on the original floor and centre across the original width and depth.
  const position = [
    (slot[0] + slot[3] - (bounds[0] + bounds[3]) * scale[0]) * 0.5,
    slot[1] - bounds[1] * scale[1],
    (slot[2] + slot[5] - (bounds[2] + bounds[5]) * scale[2]) * 0.5,
  ];
  return { position, scale };
}

/** Add a model as a child of a moving kart or a fixed landmark. */
export function addTrackModel(parent, model, slot, { shadow = true, stretch = false } = {}) {
  if (!model) return null;
  const { position, scale } = fit(model.bounds, slot, stretch);
  const group = new Object3D().setPosition(...position).setScale(...scale);
  group.name = model.name ?? 'Track model';
  for (const part of model.parts) {
    const mesh = new Mesh3D(part.geometry, part.material).setMatrix(part.matrix);
    mesh.castShadow = shadow;
    group.addChild(mesh);
  }
  parent.addChild(group);
  return group;
}

/** A repeated or moving prop with one instance batch per imported mesh part. */
export function createTrackModelBatch(parent, model, slot, capacity, { shadow = true, stretch = false } = {}) {
  if (!model) return null;
  const { position, scale } = fit(model.bounds, slot, stretch);
  const adjustment = mat4Compose(new Float32Array(16), position, IDENTITY, scale);
  const placement = new Float32Array(16), result = new Float32Array(16), scaleAt = new Float32Array(3);
  const parts = model.parts.map((part) => {
    const mesh = new InstancedMesh3D(part.geometry, part.material, Math.max(1, capacity));
    mesh.name = model.name ?? 'Track model';
    mesh.castShadow = shadow;
    mesh.count = 0;
    parent.addChild(mesh);
    return { mesh, matrix: mat4Multiply(new Float32Array(16), adjustment, part.matrix) };
  });
  return {
    setTransformAt(index, at, rotation, size) {
      mat4Compose(placement, at, rotation, typeof size === 'number' ? scaleAt.fill(size) : size);
      for (const { mesh, matrix } of parts) mesh.setMatrixAt(index, mat4Multiply(result, placement, matrix));
    },
    set count(count) { for (const { mesh } of parts) mesh.count = count; },
  };
}
