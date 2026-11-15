// Weathering for every fixed surface, added in the fragment shader. Tiling
// textures look clean and repeat; real walls carry dirt at their foot, dark
// streaks where rain runs down them, and slow changes of tone across their
// length. These are worked out from the pixel's place in the world, so they
// never repeat and line up across neighbouring boxes.
import { createCustomShader3D } from '@egret/engine/world3d';

// Parameters (first group of four): streak strength, dirt-at-the-foot strength, floor stain strength, tone variation.
const GLSL = `
float grimeHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float grimeNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(grimeHash(i), grimeHash(i + vec2(1.0, 0.0)), f.x), mix(grimeHash(i + vec2(0.0, 1.0)), grimeHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
vec4 customFragment(vec4 color, vec3 worldPosition, vec3 normal, vec2 uv) {
    float wall = 1.0 - smoothstep(0.3, 0.8, abs(normal.y));
    // Measure along the wall, whichever way it faces.
    float along = abs(normal.x) > abs(normal.z) ? worldPosition.z : worldPosition.x;
    // Streaks: noise stretched a long way down the wall, stronger under the top edge of things.
    float run = grimeNoise(vec2(along * 2.6, worldPosition.y * 0.12)) * 0.65 + grimeNoise(vec2(along * 9.0, worldPosition.y * 0.4)) * 0.35;
    float streaks = smoothstep(0.52, 0.86, run) * wall * uCustom[0].x;
    // Dirt thrown up from the ground, with a ragged upper edge.
    float edge = 0.55 + grimeNoise(vec2(along * 1.7, 3.0)) * 0.9;
    float foot = wall * (1.0 - smoothstep(0.0, edge, worldPosition.y)) * uCustom[0].y;
    // Stains and tyre-dark patches on the flat.
    float level = 1.0 - wall;
    float blotch = grimeNoise(worldPosition.xz * 0.38) * 0.6 + grimeNoise(worldPosition.xz * 1.9) * 0.4;
    float stains = level * smoothstep(0.48, 0.82, blotch) * uCustom[0].z;
    float dirt = clamp(streaks + foot + stains, 0.0, 0.85);
    // Slow drift of tone so long walls are not one flat colour.
    float tone = 1.0 + (grimeNoise(vec2(along, worldPosition.y) * 0.21 + worldPosition.zx * 0.05) - 0.5) * uCustom[0].w;
    vec3 dirty = color.rgb * vec3(0.42, 0.38, 0.33);
    return vec4(mix(color.rgb, dirty, dirt) * tone, color.a);
}`;

const WGSL = `
fn grimeHash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
fn grimeNoise(p: vec2f) -> f32 {
    let i = floor(p);
    var f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(grimeHash(i), grimeHash(i + vec2f(1.0, 0.0)), f.x), mix(grimeHash(i + vec2f(0.0, 1.0)), grimeHash(i + vec2f(1.0, 1.0)), f.x), f.y);
}
fn customFragment(color: vec4f, worldPosition: vec3f, normal: vec3f, uv: vec2f) -> vec4f {
    let wall = 1.0 - smoothstep(0.3, 0.8, abs(normal.y));
    var along = worldPosition.x;
    if (abs(normal.x) > abs(normal.z)) { along = worldPosition.z; }
    let run = grimeNoise(vec2f(along * 2.6, worldPosition.y * 0.12)) * 0.65 + grimeNoise(vec2f(along * 9.0, worldPosition.y * 0.4)) * 0.35;
    let streaks = smoothstep(0.52, 0.86, run) * wall * material.custom[0].x;
    let edge = 0.55 + grimeNoise(vec2f(along * 1.7, 3.0)) * 0.9;
    let foot = wall * (1.0 - smoothstep(0.0, edge, worldPosition.y)) * material.custom[0].y;
    let level = 1.0 - wall;
    let blotch = grimeNoise(worldPosition.xz * 0.38) * 0.6 + grimeNoise(worldPosition.xz * 1.9) * 0.4;
    let stains = level * smoothstep(0.48, 0.82, blotch) * material.custom[0].z;
    let dirt = clamp(streaks + foot + stains, 0.0, 0.85);
    let tone = 1.0 + (grimeNoise(vec2f(along, worldPosition.y) * 0.21 + worldPosition.zx * 0.05) - 0.5) * material.custom[0].w;
    let dirty = color.rgb * vec3f(0.42, 0.38, 0.33);
    return vec4f(mix(color.rgb, dirty, dirt) * tone, color.a);
}`;

/**
 * Give a material weathering. `streaks`, `foot` and `stains` run 0 to 1;
 * `tone` is how far the brightness drifts across a surface.
 */
export function weather(material, { streaks = 0.5, foot = 0.6, stains = 0.5, tone = 0.3 } = {}) {
  const shader = createCustomShader3D({ key: 'cutoff-grime', glsl: GLSL, wgsl: WGSL });
  shader.uniforms[0] = streaks;
  shader.uniforms[1] = foot;
  shader.uniforms[2] = stains;
  shader.uniforms[3] = tone;
  material.shader = shader;
  material.touch();
  return material;
}
