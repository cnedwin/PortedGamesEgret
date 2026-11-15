// Weather for every fixed surface, added in the shaders. Tiling textures look
// clean and repeat; real walls carry dirt at their foot, dark streaks where
// rain runs down them, paint that has chipped to rust, and slow changes of
// tone along their length. All of it is worked out from the pixel's place in
// the world, so it never repeats and lines up across neighbouring boxes.
//
// Ground surfaces also get the rain itself: rings spreading where drops land,
// which bend the surface normal and so break up the mirror image of a wet floor.
import { createCustomShader3D } from '@egret/engine/world3d';

// Parameters, four to a group:
//   0: streak strength, dirt at the foot, floor stains, drift of tone
//   1: paint wear, time in seconds, rain strength, unused
const GLSL = `
float grimeHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float grimeNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(grimeHash(i), grimeHash(i + vec2(1.0, 0.0)), f.x), mix(grimeHash(i + vec2(0.0, 1.0)), grimeHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float paintLoss(vec2 p) { return grimeNoise(p * 2.3) * 0.55 + grimeNoise(p * 7.1) * 0.3 + grimeNoise(p * 19.0) * 0.15; }
vec4 customFragment(vec4 color, vec3 worldPosition, vec3 normal, vec2 uv) {
    float wall = 1.0 - smoothstep(0.3, 0.8, abs(normal.y));
    // Measure along the wall, whichever way it faces.
    float along = abs(normal.x) > abs(normal.z) ? worldPosition.z : worldPosition.x;
    vec2 face = vec2(along, worldPosition.y);
    // Streaks: noise stretched a long way down the wall.
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
    float tone = 1.0 + (grimeNoise(face * 0.21 + worldPosition.zx * 0.05) - 0.5) * uCustom[0].w;
    vec3 result = mix(color.rgb, color.rgb * vec3(0.42, 0.38, 0.33), dirt) * tone;
    // Paint worn through to rust: chips where the loss is greatest, a thin oxide edge round
    // them, and rust washed down the wall below.
    float wear = uCustom[1].x * wall;
    if (wear > 0.0) {
        float cut = 1.0 - wear * 0.5;
        float loss = paintLoss(face);
        float chip = smoothstep(cut, cut + 0.02, loss);
        float halo = smoothstep(cut - 0.07, cut, loss) * (1.0 - chip);
        float above = max(max(paintLoss(face + vec2(0.0, 0.18)), paintLoss(face + vec2(0.0, 0.4))), paintLoss(face + vec2(0.0, 0.7)));
        float wash = smoothstep(cut - 0.02, cut + 0.05, above) * (1.0 - chip) * 0.55 * grimeNoise(vec2(along * 22.0, worldPosition.y * 1.5));
        float light = dot(result, vec3(0.3, 0.5, 0.2));
        vec3 rust = vec3(0.62, 0.27, 0.1) * (light * 1.3 + 0.02) * (0.7 + 0.6 * grimeNoise(face * 31.0));
        result = mix(result, rust, clamp(chip + halo * 0.6 + wash, 0.0, 1.0));
    }
    return vec4(result, color.a);
}`;

const GLSL_RAIN = `
vec2 rainRing(vec2 p, float size, float time, float offset) {
    vec2 cell = floor(p / size + offset);
    float seed = fract(sin(dot(cell, vec2(41.3, 289.1))) * 43758.5453);
    float age = fract(time * (0.7 + seed * 0.5) + seed * 7.0);
    vec2 centre = (cell - offset + 0.5 + (vec2(fract(seed * 17.0), fract(seed * 59.0)) - 0.5) * 0.5) * size;
    vec2 away = p - centre;
    float reach = length(away) / size;
    // A thin crest travelling outwards and fading as it goes.
    float crest = sin((reach - age * 0.48) * 46.0) * smoothstep(0.07, 0.0, abs(reach - age * 0.48)) * (1.0 - age);
    return away / max(length(away), 1e-4) * crest;
}
vec3 customNormal(vec3 normal, vec3 worldPosition, vec2 uv) {
    if (normal.y < 0.8) return normal;
    float time = uCustom[1].y;
    vec2 slope = rainRing(worldPosition.xz, 0.34, time, 0.0) + rainRing(worldPosition.xz, 0.52, time * 0.83, 0.37) * 0.8;
    return normal + vec3(slope.x, 0.0, slope.y) * uCustom[1].z;
}`;

const WGSL = `
fn grimeHash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
fn grimeNoise(p: vec2f) -> f32 {
    let i = floor(p);
    var f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(grimeHash(i), grimeHash(i + vec2f(1.0, 0.0)), f.x), mix(grimeHash(i + vec2f(0.0, 1.0)), grimeHash(i + vec2f(1.0, 1.0)), f.x), f.y);
}
fn paintLoss(p: vec2f) -> f32 { return grimeNoise(p * 2.3) * 0.55 + grimeNoise(p * 7.1) * 0.3 + grimeNoise(p * 19.0) * 0.15; }
fn customFragment(color: vec4f, worldPosition: vec3f, normal: vec3f, uv: vec2f) -> vec4f {
    let wall = 1.0 - smoothstep(0.3, 0.8, abs(normal.y));
    var along = worldPosition.x;
    if (abs(normal.x) > abs(normal.z)) { along = worldPosition.z; }
    let face = vec2f(along, worldPosition.y);
    let run = grimeNoise(vec2f(along * 2.6, worldPosition.y * 0.12)) * 0.65 + grimeNoise(vec2f(along * 9.0, worldPosition.y * 0.4)) * 0.35;
    let streaks = smoothstep(0.52, 0.86, run) * wall * material.custom[0].x;
    let edge = 0.55 + grimeNoise(vec2f(along * 1.7, 3.0)) * 0.9;
    let foot = wall * (1.0 - smoothstep(0.0, edge, worldPosition.y)) * material.custom[0].y;
    let level = 1.0 - wall;
    let blotch = grimeNoise(worldPosition.xz * 0.38) * 0.6 + grimeNoise(worldPosition.xz * 1.9) * 0.4;
    let stains = level * smoothstep(0.48, 0.82, blotch) * material.custom[0].z;
    let dirt = clamp(streaks + foot + stains, 0.0, 0.85);
    let tone = 1.0 + (grimeNoise(face * 0.21 + worldPosition.zx * 0.05) - 0.5) * material.custom[0].w;
    var result = mix(color.rgb, color.rgb * vec3f(0.42, 0.38, 0.33), dirt) * tone;
    let wear = material.custom[1].x * wall;
    if (wear > 0.0) {
        let cut = 1.0 - wear * 0.5;
        let loss = paintLoss(face);
        let chip = smoothstep(cut, cut + 0.02, loss);
        let halo = smoothstep(cut - 0.07, cut, loss) * (1.0 - chip);
        let above = max(max(paintLoss(face + vec2f(0.0, 0.18)), paintLoss(face + vec2f(0.0, 0.4))), paintLoss(face + vec2f(0.0, 0.7)));
        let wash = smoothstep(cut - 0.02, cut + 0.05, above) * (1.0 - chip) * 0.55 * grimeNoise(vec2f(along * 22.0, worldPosition.y * 1.5));
        let light = dot(result, vec3f(0.3, 0.5, 0.2));
        let rust = vec3f(0.62, 0.27, 0.1) * (light * 1.3 + 0.02) * (0.7 + 0.6 * grimeNoise(face * 31.0));
        result = mix(result, rust, clamp(chip + halo * 0.6 + wash, 0.0, 1.0));
    }
    return vec4f(result, color.a);
}`;

const WGSL_RAIN = `
fn rainRing(p: vec2f, size: f32, time: f32, offset: f32) -> vec2f {
    let cell = floor(p / size + offset);
    let seed = fract(sin(dot(cell, vec2f(41.3, 289.1))) * 43758.5453);
    let age = fract(time * (0.7 + seed * 0.5) + seed * 7.0);
    let centre = (cell - offset + 0.5 + (vec2f(fract(seed * 17.0), fract(seed * 59.0)) - 0.5) * 0.5) * size;
    let away = p - centre;
    let reach = length(away) / size;
    let crest = sin((reach - age * 0.48) * 46.0) * smoothstep(0.07, 0.0, abs(reach - age * 0.48)) * (1.0 - age);
    return away / max(length(away), 1e-4) * crest;
}
fn customNormal(normal: vec3f, worldPosition: vec3f, uv: vec2f) -> vec3f {
    if (normal.y < 0.8) { return normal; }
    let time = material.custom[1].y;
    let slope = rainRing(worldPosition.xz, 0.34, time, 0.0) + rainRing(worldPosition.xz, 0.52, time * 0.83, 0.37) * 0.8;
    return normal + vec3f(slope.x, 0.0, slope.y) * material.custom[1].z;
}`;

/** Shaders of surfaces the rain lands on; `setRain` reaches them all. */
const wetShaders = [];

/**
 * Give a material weathering. `streaks`, `foot` and `stains` run 0 to 1;
 * `tone` is how far the brightness drifts across a surface; `wear` is how
 * much paint has gone to rust; `rain` adds spreading rings to a ground surface.
 */
export function weather(material, { streaks = 0.5, foot = 0.6, stains = 0.5, tone = 0.3, wear = 0, rain = false } = {}) {
  const shader = createCustomShader3D({
    key: rain ? 'cutoff-wet' : 'cutoff-grime',
    glsl: GLSL,
    wgsl: WGSL,
    ...(rain ? { glslNormal: GLSL_RAIN, wgslNormal: WGSL_RAIN } : {}),
  });
  shader.uniforms.set([streaks, foot, stains, tone, wear, 0, rain ? 0.5 : 0, 0]);
  material.shader = shader;
  material.touch();
  if (rain) wetShaders.push(shader);
  return material;
}

/** Advance the rain rings: `time` in seconds, `strength` 0 (dry) to 1. */
export function setRain(time, strength) {
  for (const shader of wetShaders) {
    shader.uniforms[5] = time;
    shader.uniforms[6] = strength * 0.5;
  }
}
