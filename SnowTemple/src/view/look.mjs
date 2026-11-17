import { createAtmosphere3D, createCustomPost3D } from '@egret/engine/webgl2/world3d';

// Keep the grade in World3D's existing fog composite so it does not need another full-screen pass.
const NIGHT_GRADE = /* glsl */ `
vec3 customPost(vec3 color, vec2 uv) {
    vec3 lit = snowHeightFog(color, uv);
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
  const atmosphere = createAtmosphere3D({
    fogColor: 0x3f5078, fogDensity: 0.061, fogHeight: 0.08, fogFalloff: 0.49, shaftIntensity: 0
  });
  const film = createCustomPost3D({
    key: 'snow-night-grade',
    glsl: '#define customPost snowHeightFog\n' + atmosphere.post.glsl + '\n#undef customPost\n' + NIGHT_GRADE
  });
  const post = renderer.postProcess;
  Object.assign(post, {
    enabled: true, custom: film, bloom: true, bloomThreshold: 1.29, bloomKnee: 0.43,
    bloomIntensity: 0.23, bloomLevels: 6, fxaa: true, vignette: 0.37, contrast: 1.1,
    saturation: 0.98, ssao, ssaoRadius: 0.67, ssaoIntensity: 1.14
  });

  return (camera, sunDirection, cinematic, dt) => {
    atmosphere.update(camera, sunDirection);
    film.uniforms.set(atmosphere.post.uniforms);
    post.vignette += ((cinematic ? 0.52 : 0.37) - post.vignette) * (1 - Math.exp(-dt * 5));
  };
}
