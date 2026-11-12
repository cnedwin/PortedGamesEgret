import {
  Mesh3D, Object3D, createCustomShader3D, createGeometry3D, createUnlitMaterial3D,
  mat4Compose, mat4Multiply, vec3TransformMat4,
} from '@egret/engine/world3d';
import { loadTexture3D } from '@egret/engine/webgl2/world3d';
import { createNativeSceneView } from './native-inn-view.mjs';

const exitFragment = `vec4 customFragment(vec4 color, vec3 world, vec3 normal, vec2 uv) {
  vec4 effect = uCustom[0]; // time, rays layer, strength, ground height
  vec2 edge = min(uv, vec2(1.0) - uv);
  float rim = smoothstep(0.0, 0.24, edge.x) * smoothstep(0.0, 0.24, edge.y);
  float floorFade = smoothstep(-0.02, 0.08, world.y - effect.w);
  float pulse = 0.79 + 0.21 * sin(2.4 * effect.x + uv.x * 24.0);
  float beam = dot(color.rg, vec2(0.72, 0.54));
  float rays = color.r * rim * (0.42 + 0.58 * pow(0.5 + 0.5 * cos(uv.x * 81.68), 2.8));
  return vec4(0.981, 0.950, 0.727, mix(beam, rays * pulse, effect.y) * floorFade * effect.z);
}`;

async function createExitEffect({ spec, transform }) {
  const anchor = spec.anchors?.exit;
  if (!anchor) return;
  const files = ['exit-lightbeam.png', 'exit-rays.png'];
  const loaded = await Promise.allSettled(files.map(name => loadTexture3D('/jyx2/home3d/' + name, {
    flipY: true, colorSpace: 'linear', anisotropy: 4,
  })));
  const textures = loaded.filter(result => result.status === 'fulfilled').map(result => result.value);
  const failure = loaded.find(result => result.status === 'rejected');
  if (failure) {
    for (const texture of textures) texture.dispose();
    throw failure.reason;
  }

  const placement = new Float32Array(16);
  const length = Math.hypot(...anchor.sourceQuaternion);
  const rotation = anchor.sourceQuaternion.map(value => value / length);
  mat4Compose(placement, anchor.sourcePosition, rotation, anchor.sourceScale);
  mat4Multiply(placement, transform, placement);
  placement.set(anchor.position, 12);
  const node = new Object3D();
  node.name = 'Heluo exit light';
  // Preserve the authored footprint and masks as depth-tested layers in World3D.
  // The Three reference raymarches these same masks inside the exit volume.
  const layers = [[.115, 0, .135], [.21, 1, .066], [.31, 1, .035]].map(([height, mask, strength]) => {
    const positions = [[-.5, -.5], [-.5, .5], [.5, .5], [.5, -.5]].flatMap(([u, v]) =>
      Array.from(vec3TransformMat4(new Float32Array(3), [height, u, v], placement)));
    const geometry = createGeometry3D({ positions, uvs: [0, 0, 1, 0, 1, 1, 0, 1], indices: [0, 1, 2, 0, 2, 3] });
    const material = createUnlitMaterial3D({ map: textures[mask], side: 'double', alphaMode: 'blend',
      blending: 'additive', depthWrite: false, toneMapped: false });
    const shader = createCustomShader3D({ key: 'kys-heluo-exit', glsl: exitFragment,
      uniforms: [0, mask, strength, anchor.position[1]] });
    material.shader = shader;
    material.touch();
    const plane = node.addChild(new Mesh3D(geometry, material));
    plane.castShadow = false;
    return { geometry, material, shader };
  });
  const [, , , , ux, , uz, , vx, , vz, , x, , z] = placement;
  const determinant = ux * vz - uz * vx;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  return {
    node, groundCenter: [x, z],
    containsGroundPoint(worldX, worldZ) {
      const dx = worldX - x, dz = worldZ - z;
      const u = (dx * vz - dz * vx) / determinant;
      const v = (dz * ux - dx * uz) / determinant;
      return Math.abs(u) <= .5 && Math.abs(v) <= .5;
    },
    update(elapsedMs) {
      const seconds = motion.matches ? 0 : (elapsedMs % 20000) / 1000;
      for (const { shader } of layers) shader.uniforms[0] = seconds;
    },
    dispose() {
      for (const { geometry, material } of layers) {
        geometry.dispose();
        material.dispose();
      }
      for (const texture of textures) texture.dispose();
    },
  };
}

export function createNativeHeluoView(viewport, overlay, options) {
  return createNativeSceneView(viewport, overlay, options, {
    sceneId: 1, classKey: 'heluo3d', assetDirectory: '/jyx2/scene/', manifest: 'heluo-scene.json',
    modelIds: ['0', 'staff', 'guest', 'weixiaobao'], requireInstancing: true, actorTints: true, createExitEffect,
  });
}
