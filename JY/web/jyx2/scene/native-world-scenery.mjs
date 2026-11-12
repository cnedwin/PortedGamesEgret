import {
  InstancedMesh3D, Mesh3D, Object3D, colorFromHex, computeObjectBounds3D, createCustomShader3D,
  mat4Compose, mat4Multiply, quatFromAxisAngle,
} from '@egret/engine/world3d';
import { createWorldPlacements } from './world-placement.mjs';
import { plantWindVertex } from './native-plant-wind.mjs';

const motion = {
  'tree-broad': [.105, .027], 'tree-tall': [.082, .020], 'tree-slim': [.112, .034],
  'snow-pine': [.072, .016], palm: [.135, .045], bare: [.062, .012], brush: [.195, .038],
  reeds: [.225, .044], 'flowers-yellow': [.173, .035], 'flowers-red': [.173, .035],
};
const up = [0, 1, 0];


export function createNativeWorldScenery(world, data, library) {
  const templates = new Map(library.children.map(child => [child.name, child]));
  const meshes = new Map();
  const dimensions = new Map();
  const variants = new Map();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  library.updateWorldMatrices();
  for (const [name, template] of templates) {
    const children = [];
    template.traverse(node => { if (node instanceof Mesh3D) children.push(node); });
    if (!children.length) continue;
    const [a, b, c, d, e, f] = computeObjectBounds3D(template);
    dimensions.set(name, { x: d - a, y: e - b, z: f - c });
    meshes.set(name, children);
  }
  const place = createWorldPlacements(world, data, dimensions);

  function materialFor(material, name) {
    if (!motion[name] || !(dimensions.get(name).y > 0)) return material;
    if (!variants.has(material)) variants.set(material, new Map());
    const options = variants.get(material);
    if (!options.has(name)) {
      const copy = material.clone(), height = dimensions.get(name).y;
      copy.shader = createCustomShader3D({ key: 'kys-world-wind', glslVertex: plantWindVertex,
        uniforms: [0, ...motion[name], 1 / height, height, Number(!reducedMotion.matches)] });
      copy.touch();
      options.set(name, copy);
    }
    return options.get(name);
  }

  function chunk(left, top, right, bottom) {
    const root = new Object3D();
    const matrix = new Float32Array(16), transform = new Float32Array(16);
    const yaw = new Float32Array(4), tint = new Float32Array(3);
    let instances = 0, windInstances = 0, buildings = 0;
    for (const [name, entries] of place(left, top, right, bottom)) {
      for (const { geometry, material, matrixWorld } of meshes.get(name)) {
        const materials = Array.isArray(material) ? material.map(entry => materialFor(entry, name)) : materialFor(material, name);
        const mesh = new InstancedMesh3D(geometry, materials, entries.length);
        mesh.name = name;
        mesh.castShadow = name !== 'terrace' && name !== 'pond';
        entries.forEach(({ x, y, floor, size, angle, color }, i) => {
          quatFromAxisAngle(yaw, up, angle);
          mat4Compose(matrix, [x, floor, y], yaw, typeof size === 'number' ? [size, size, size] : size);
          mat4Multiply(transform, matrix, matrixWorld);
          mesh.setMatrixAt(i, transform);
          colorFromHex(tint, color);
          mesh.setColorAt(i, tint[0], tint[1], tint[2]);
        });
        root.addChild(mesh);
      }
      instances += entries.length;
      if (motion[name]) windInstances += entries.length;
      if (['house', 'house-red', 'house-white', 'pavilion', 'fence', 'gate', 'terrace'].includes(name)) buildings += entries.length;
    }
    return { root, instances, windInstances, buildings };
  }

  return { chunk, templates, get windEnabled() { return !reducedMotion.matches; },
    tick(time) {
      const enabled = Number(!reducedMotion.matches);
      for (const options of variants.values()) for (const material of options.values()) {
        material.shader.uniforms[0] = time;
        material.shader.uniforms[5] = enabled;
      }
    },
    dispose() {
      for (const options of variants.values()) for (const material of options.values()) material.dispose();
    },
  };
}
