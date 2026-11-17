import { createCustomPost3D } from '@egret/engine/webgl2/world3d';

// World3D's composite provides the first opaque scene depth. Use it both for
// the ground fog and to cap each lantern's visible ray segment.
const NIGHT_LOOK = /* glsl */ `
vec3 lampMist(vec3 ray, float reach, vec4 lamp, vec4 up) {
    float energy = abs(lamp.w);
    if (energy < 0.001) return vec3(0.0);

    bool fire = lamp.w < 0.0;
    float radius = fire ? 3.25 : 2.45;
    float along = dot(lamp.xyz, ray);
    vec3 side = lamp.xyz - ray * along;
    float radial = 1.0 - dot(side, side) / (radius * radius);
    if (radial <= 0.0) return vec3(0.0);

    float halfLength = radius * sqrt(radial);
    float start = max(0.0, along - halfLength);
    float end = min(reach, along + halfLength);
    if (end <= start) return vec3(0.0);

    // Soft at the edge and denser in the shallow layer above the snow.
    float height = up.w + dot(up.xyz, ray) * (0.5 * (start + end));
    float nearGround = exp(-max(height - 0.18, 0.0) * 0.71);
    float softness = radial * radial * mix(0.24, 1.0, nearGround);
    vec3 tint = fire ? vec3(0.105, 0.042, 0.016) : vec3(0.088, 0.046, 0.021);
    return tint * ((end - start) * softness * energy);
}

vec3 customPost(vec3 color, vec2 uv) {
    vec4 up = uPostCustom[0];
    vec3 view = unprojectDepth(uv, rawDepth(uv));
    float reach = max(length(view), 0.001);
    vec3 ray = view / reach;
    float slope = 0.49 * dot(up.xyz, view);
    float thin = abs(slope) > 0.0001 ? (1.0 - exp(-slope)) / slope : 1.0;
    float fog = 0.061 * exp(-0.49 * (up.w - 0.08)) * reach * thin;
    vec3 lit = mix(vec3(0.050, 0.080, 0.188), color, exp(-max(fog, 0.0)));
    for (int i = 1; i <= 3; i++) {
        lit += lampMist(ray, reach, uPostCustom[i], up);
    }
    const vec3 luminance = vec3(0.2126, 0.7152, 0.0722);
    float value = dot(lit, luminance);
    float mids = smoothstep(0.025, 0.40, value);
    // Indigo in the shadows, with cleaner snow, steel and skin in the light.
    vec3 graded = lit * mix(vec3(0.83, 0.90, 1.08), vec3(1.02, 0.99, 0.97), mids);
    float warm = smoothstep(0.02, 0.40, lit.r - lit.b);
    graded = mix(graded, lit, warm * 0.65);
    float peak = max(graded.r, max(graded.g, graded.b));
    // Let bright lamps and snow retain a soft shoulder before ACES.
    graded /= 1.0 + max(peak - 0.82, 0.0) * 0.24;
    float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5;
    return graded + dither * min(0.003, value * 0.03);
}
`;

export function createSnowLook(renderer, ssao) {
  const film = createCustomPost3D({ key: 'snow-night-mist', glsl: NIGHT_LOOK });
  const post = renderer.postProcess;
  Object.assign(post, {
    enabled: true, custom: film, bloom: true, bloomThreshold: 1.29, bloomKnee: 0.43,
    bloomIntensity: 0.23, bloomLevels: 6, fxaa: true, vignette: 0.37, contrast: 1.1,
    saturation: 0.98, ssao, ssaoRadius: 0.67, ssaoIntensity: 1.14
  });

  return (camera, lamps, cinematic, dt) => {
    camera.updateWorldMatrix();
    const world = camera.matrixWorld, uniforms = film.uniforms;
    // The rotation-only camera basis maps world Y and the lights into view space.
    uniforms[0] = world[1];
    uniforms[1] = world[5];
    uniforms[2] = world[9];
    uniforms[3] = world[13];
    for (let i = 0; i < 3; i++) {
      const lamp = lamps[i], start = 4 * (i + 1);
      if (!lamp || lamp.distance >= 18) {
        uniforms[start + 3] = 0;
        continue;
      }
      const at = lamp.light.position, x = at[0] - world[12], y = at[1] - world[13], z = at[2] - world[14];
      uniforms[start] = x * world[0] + y * world[1] + z * world[2];
      uniforms[start + 1] = x * world[4] + y * world[5] + z * world[6];
      uniforms[start + 2] = x * world[8] + y * world[9] + z * world[10];
      const fade = Math.min(1, (18 - lamp.distance) / 7);
      const energy = Math.min(0.92, lamp.light.intensity * 0.055) * fade;
      uniforms[start + 3] = lamp.fire ? -energy : energy;
    }
    post.vignette += ((cinematic ? 0.52 : 0.37) - post.vignette) * (1 - Math.exp(-dt * 5));
  };
}
