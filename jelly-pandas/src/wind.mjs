// Wind for the island's plants. A vertex hook bends each plant from its
// root: waves of wind roll across the island all the time, and anything that
// walks through pushes the plant aside and presses it down.
import { createCustomShader3D } from '@egret/engine/world3d';

// The four parameters the hook reads (each a group of four numbers):
//   0: time in seconds, wind strength, push radius, 1 / plant height
//   1-3: six ground positions (x, z) of whatever is pushing through
const PUSHERS = 6;

const GLSL = `
vec3 pushAside(vec3 at, vec2 from, float bend, float radius) {
    vec2 away = at.xz - from;
    float gap = length(away);
    float press = clamp(1.0 - gap / radius, 0.0, 1.0);
    press *= press * bend;
    at.xz += away / max(gap, 0.05) * press * 0.55;
    at.y -= press * 0.3;
    return at;
}
vec3 customVertex(vec3 worldPosition, vec3 localPosition, vec3 normal, vec2 uv, vec4 color) {
    // 0 at the root, 1 at the tip; the bend grows with the square so stems curve.
    float rise = clamp(localPosition.y * uCustom[0].w, 0.0, 1.5);
    float bend = rise * rise;
    float time = uCustom[0].x;
    float wave = sin(worldPosition.x * 0.55 + time * 1.7) + 0.7 * sin(worldPosition.z * 0.4 + worldPosition.x * 0.2 + time * 1.15);
    float gust = 0.55 + 0.45 * sin(worldPosition.x * 0.07 + worldPosition.z * 0.05 + time * 0.35);
    vec3 moved = worldPosition + vec3(1.0, 0.0, 0.45) * (wave * gust * uCustom[0].y * bend);
    float radius = uCustom[0].z;
    moved = pushAside(moved, uCustom[1].xy, bend, radius);
    moved = pushAside(moved, uCustom[1].zw, bend, radius);
    moved = pushAside(moved, uCustom[2].xy, bend, radius);
    moved = pushAside(moved, uCustom[2].zw, bend, radius);
    moved = pushAside(moved, uCustom[3].xy, bend, radius);
    moved = pushAside(moved, uCustom[3].zw, bend, radius);
    return moved;
}`;

const WGSL = `
fn pushAside(place: vec3f, origin: vec2f, bend: f32, radius: f32) -> vec3f {
    var at = place;
    let away = at.xz - origin;
    let gap = length(away);
    var press = clamp(1.0 - gap / radius, 0.0, 1.0);
    press = press * press * bend;
    let side = away / max(gap, 0.05) * press * 0.55;
    at.x += side.x;
    at.z += side.y;
    at.y -= press * 0.3;
    return at;
}
fn customVertex(worldPosition: vec3f, localPosition: vec3f, normal: vec3f, uv: vec2f, color: vec4f) -> vec3f {
    let rise = clamp(localPosition.y * material.custom[0].w, 0.0, 1.5);
    let bend = rise * rise;
    let time = material.custom[0].x;
    let wave = sin(worldPosition.x * 0.55 + time * 1.7) + 0.7 * sin(worldPosition.z * 0.4 + worldPosition.x * 0.2 + time * 1.15);
    let gust = 0.55 + 0.45 * sin(worldPosition.x * 0.07 + worldPosition.z * 0.05 + time * 0.35);
    var moved = worldPosition + vec3f(1.0, 0.0, 0.45) * (wave * gust * material.custom[0].y * bend);
    let radius = material.custom[0].z;
    moved = pushAside(moved, material.custom[1].xy, bend, radius);
    moved = pushAside(moved, material.custom[1].zw, bend, radius);
    moved = pushAside(moved, material.custom[2].xy, bend, radius);
    moved = pushAside(moved, material.custom[2].zw, bend, radius);
    moved = pushAside(moved, material.custom[3].xy, bend, radius);
    moved = pushAside(moved, material.custom[3].zw, bend, radius);
    return moved;
}`;

/** Far enough away that an unused pusher slot touches nothing. */
const NOWHERE = 1e6;

export function createWind() {
  const shaders = [];
  const wind = {
    /**
     * Make a material sway. `height` is how tall the plant's shape is before
     * scaling, `strength` how far its tip swings in the wind, and `radius`
     * how close something must come to push it (0 for plants too big to push).
     */
    apply(material, { height, strength, radius = 1.3 }) {
      const shader = createCustomShader3D({ key: 'jelly-pandas-wind', glslVertex: GLSL, wgslVertex: WGSL });
      shader.uniforms.fill(NOWHERE, 4);
      shader.uniforms[1] = strength;
      shader.uniforms[2] = radius > 0 ? radius : 1e-3;
      shader.uniforms[3] = 1 / height;
      material.shader = shader;
      material.touch();
      shaders.push(shader);
      return material;
    },
    /**
     * Advance the wind and say what is pushing through the plants:
     * `pushers` is a flat list of x, z pairs, at most six of them.
     */
    update(time, pushers) {
      for (const shader of shaders) {
        const u = shader.uniforms;
        u[0] = time;
        for (let i = 0; i < PUSHERS * 2; i++) u[4 + i] = i < pushers.length ? pushers[i] : NOWHERE;
      }
    },
  };
  return wind;
}
