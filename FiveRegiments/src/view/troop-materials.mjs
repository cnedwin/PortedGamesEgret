import { Attribute3D, Geometry3D, Mesh3D } from '@egret/engine/world3d';

// Linear dye multipliers for the five issued uniforms. Keep enough of the
// low-resolution atlas to show folds, stitching and the shape of each plate.
const uniforms = {
  yulin: [1, 0.59, 0.60],
  tiger: [1, 0.78, 0.54],
  vanguard: [0.62, 0.83, 1],
  plume: [0.81, 0.64, 0.98],
  archer: [0.66, 0.99, 0.57]
};

const neutralJoint = /^(?:head$|neck_|hand_|thumb_|index_|middle_|ring_|pinky_|foot_|ball_)/;

function uniformGeometry(source, bones, dye) {
  const joints = source.getAttribute('joints');
  const weights = source.getAttribute('weights');
  const protectedJoints = bones.map(bone => neutralJoint.test(bone.name));
  const colors = new Float32Array(source.vertexCount * 3);

  // Cloth and skin are on the same atlas. Use existing skin weights to fade
  // out the dye at the neck, wrists and boots without affecting deformation.
  for (let vertex = 0; vertex < source.vertexCount; vertex++) {
    let total = 0;
    let cloth = 0;
    const start = vertex * weights.itemSize;
    for (let part = 0; part < weights.itemSize; part++) {
      const joint = joints.data[start + part];
      const weight = weights.data[start + part];
      total += weight;
      if (!protectedJoints[joint]) cloth += weight;
    }
    const coverage = total > 0 ? cloth / total : 0;
    for (let channel = 0; channel < 3; channel++) {
      colors[vertex * 3 + channel] = 1 + (dye[channel] - 1) * coverage;
    }
  }

  const geometry = new Geometry3D();
  geometry.topology = source.topology;
  for (const [name, attribute] of source.attributes) geometry.setAttribute(name, attribute);
  geometry.setAttribute('color', new Attribute3D(colors, 3));
  if (source.index) geometry.setIndex(source.index.data);
  for (const group of source.groups) geometry.addGroup(group.start, group.count, group.materialIndex);
  if (source.morphTargets.length) geometry.setMorphTargets(source.morphTargets);
  return geometry;
}

/** Apply once to the troop body template, before equipping weapons or cloning figures. */
export function prepareTroopMaterials(scene, regiment) {
  const dye = uniforms[regiment];
  const materials = new Map();
  const geometries = new Map();

  function matte(source) {
    if (!materials.has(source)) {
      const material = source.clone();
      material.vertexColors = true;
      material.normalMap = undefined;
      material.metallicRoughnessMap = undefined;
      material.roughness = 0.92;
      material.metallic = 0.06;
      materials.set(source, material);
    }
    return materials.get(source);
  }

  scene.traverse(mesh => {
    if (!(mesh instanceof Mesh3D) || !mesh.skeleton) return;
    const source = mesh.geometry;
    if (!source.getAttribute('joints') || !source.getAttribute('weights')) return;
    if (!geometries.has(source)) geometries.set(source, uniformGeometry(source, mesh.skeleton.bones, dye));
    mesh.geometry = geometries.get(source);
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(matte) : matte(mesh.material);
  });

  // Source attributes and the original atlas remain owned by the model.
  return () => {
    for (const geometry of geometries.values()) geometry.dispose();
    for (const material of materials.values()) material.dispose();
  };
}
