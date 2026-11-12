import {
  Mesh3D, createBoxGeometry3D, createCustomShader3D, createUnlitMaterial3D,
  mat4Compose, mat4Invert, mat4Multiply, quatNormalize, transformGeometry3D,
} from '@egret/engine/world3d';
import { loadTexture3D } from '@egret/engine/webgl2/world3d';

// The original beam spans a rotated Unity box. Sample its two masks along each camera ray.
const fragment = `
vec3 beamLocal(vec3 world) {
  vec4 p = vec4(world, 1.0);
  return vec3(dot(uCustom[0], p), dot(uCustom[1], p), dot(uCustom[2], p));
}

vec4 customFragment(vec4 color, vec3 world, vec3 normal, vec2 uv) {
  vec3 local = beamLocal(world);
  vec3 ray = normalize(local - beamLocal(uCameraPosition.xyz));
  vec3 inverseRay = mix(vec3(-1.0), vec3(1.0), step(vec3(0.0), ray)) / max(abs(ray), vec3(0.0001));
  vec3 farPlane = max((vec3(-0.5) - local) * inverseRay, (vec3(0.5) - local) * inverseRay);
  float stepSize = max(0.0, min(farPlane.x, min(farPlane.y, farPlane.z))) / 6.0;
  vec2 patternUV = (local + ray * stepSize * 3.0).zy + 0.5;
  float rayTexture = texture(uEmissiveMap, vec2(patternUV.x * 2.0, 0.35 + patternUV.y * 0.23)).r;
  float shimmer = texture(uEmissiveMap, vec2(patternUV.x * 3.0 + 0.23, fract(uCustom[3].w * 1.5))).r;
  float line = pow(0.5 + 0.5 * cos(patternUV.x * 81.68 + rayTexture * 0.7), 2.8);
  float rays = 0.24 + line * mix(0.45, 0.76, rayTexture) * mix(0.76, 1.24, shimmer);
  float density = 0.0;
  for (int i = 0; i < 6; i++) {
    vec3 delta = ray * (float(i) + 0.5) * stepSize;
    vec3 point = local + delta;
    vec2 beam = texture(uMap, point.zy + 0.5).rg;
    float groundFade = smoothstep(-0.02, 0.08, world.y + dot(uCustom[3].xyz, delta));
    float surfaceFade = 1.0 - smoothstep(0.26, 0.5, point.x);
    density += (beam.r * 0.72 + beam.g * 0.54) * groundFade * surfaceFade;
  }
  float opacity = (1.0 - exp(-density * stepSize * 1.55)) * 0.75686276 * rays;
  return vec4(0.9811321, 0.94996405, 0.72659314, opacity);
}`;

export async function createNativeHomeExit({ transform }) {
  const sourceRotation = quatNormalize(new Float32Array(4), [.512135, .48756307, .512135, .48756307]);
  const source = mat4Compose(new Float32Array(16), [1.06, .07, 14.34], sourceRotation, [1, 4, 4]);
  const box = mat4Multiply(new Float32Array(16), transform, source);
  const inverse = new Float32Array(16);
  if (!mat4Invert(inverse, box)) throw Error('Invalid Home exit beam transform.');

  const results = await Promise.allSettled([
    loadTexture3D(new URL('./exit-lightbeam.png', import.meta.url).href,
      { colorSpace: 'linear', wrapS: 'clamp', wrapT: 'clamp' }),
    loadTexture3D(new URL('./exit-rays.png', import.meta.url).href,
      { colorSpace: 'linear', wrapS: 'repeat', wrapT: 'repeat' }),
  ]);
  const failure = results.find(result => result.status === 'rejected');
  if (failure) {
    for (const result of results) if (result.status === 'fulfilled') result.value.dispose();
    throw failure.reason;
  }
  const [beam, rays] = results.map(result => result.value);
  const geometry = transformGeometry3D(createBoxGeometry3D(), box);
  const handedness = box[0] * (box[5] * box[10] - box[6] * box[9])
    - box[4] * (box[1] * box[10] - box[2] * box[9])
    + box[8] * (box[1] * box[6] - box[2] * box[5]);
  if (handedness < 0) {
    const indices = geometry.index.data;
    for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
    geometry.index.touch();
  }
  const material = createUnlitMaterial3D({ map: beam, emissiveMap: rays, alphaMode: 'blend',
    blending: 'additive', depthWrite: false, toneMapped: false, fog: false });
  material.shader = createCustomShader3D({ key: 'kys-home-exit-beam', glsl: fragment, uniforms: [
    inverse[0], inverse[4], inverse[8], inverse[12],
    inverse[1], inverse[5], inverse[9], inverse[13],
    inverse[2], inverse[6], inverse[10], inverse[14],
    box[1], box[5], box[9], 0,
  ] });
  const node = new Mesh3D(geometry, material);
  node.name = 'home-exit-light';
  node.castShadow = false;
  node.receiveShadow = false;
  const [ux, , uz] = box.subarray(4, 7);
  const [vx, , vz] = box.subarray(8, 11);
  const [x, , z] = box.subarray(12, 15);
  const determinant = ux * vz - uz * vx;

  return {
    node, groundCenter: [x, z],
    update(elapsedMs) {
      if (Number.isFinite(elapsedMs)) material.shader.uniforms[15] = (elapsedMs % 20000) / 1000;
    },
    containsGroundPoint(worldX, worldZ) {
      const dx = worldX - x, dz = worldZ - z;
      return Math.abs((dx * vz - dz * vx) / determinant) <= .5
        && Math.abs((dz * ux - dx * uz) / determinant) <= .5;
    },
    dispose() {
      node.removeFromParent();
      geometry.dispose();
      material.dispose();
      beam.dispose();
      rays.dispose();
    },
  };
}
