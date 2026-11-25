// 卡通渲染的材质：分层明暗的卡通光照，再加一圈边缘光、阵营换色（把衣甲上的蓝色转成对方的颜色）、行动过的单位变灰、
// 受击时闪白。地形和建筑用同一套光照，只是不换色。
// Toon materials: banded cel lighting, plus a rim light, the team colour swap (the blue of tabards and banners turned
// to the other side's colour), grey for a unit that has acted and a white flash when hit. Terrain and buildings share
// the lighting without the swap.
import { createCustomShader3D, createToonMaterial3D } from '@egret/engine/world3d';

// uCustom[0] = (hue turn in turns, swap on, grey, flash); uCustom[1] = rim colour and strength;
// uCustom[2] = (saturation for swapped colours, lightness lift, 0, 0).
const FIGURE_GLSL = /* glsl */ `
vec3 sbHsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
}
vec3 sbRgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}
vec4 customFragment(vec4 color, vec3 wp, vec3 normal, vec2 uv) {
  vec3 c = color.rgb;
  if (uCustom[0].y > 0.5) {
    vec3 hsv = sbHsv(max(c, vec3(0.0)));
    float blue = smoothstep(0.52, 0.56, hsv.x) * (1.0 - smoothstep(0.72, 0.76, hsv.x)) * smoothstep(0.18, 0.32, hsv.y);
    vec3 turned = sbRgb(vec3(fract(hsv.x + uCustom[0].x), hsv.y * uCustom[2].x, hsv.z * (1.0 + uCustom[2].y)));
    c = mix(c, turned, blue);
  }
  vec3 v = normalize(uCameraPosition.xyz - wp);
  float rim = pow(1.0 - clamp(dot(normal, v), 0.0, 1.0), 3.0);
  c += uCustom[1].rgb * smoothstep(0.35, 0.6, rim) * uCustom[1].w;
  float g = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(c, vec3(g) * 0.75, uCustom[0].z);
  c = mix(c, vec3(1.0), uCustom[0].w);
  return vec4(c, color.a);
}`;

const FIGURE_WGSL = /* wgsl */ `
fn sbHsv(c: vec3f) -> vec3f {
  let K = vec4f(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  let p = mix(vec4f(c.b, c.g, K.w, K.z), vec4f(c.g, c.b, K.x, K.y), step(c.b, c.g));
  let q = mix(vec4f(p.x, p.y, p.w, c.r), vec4f(c.r, p.y, p.z, p.x), step(p.x, c.r));
  let d = q.x - min(q.w, q.y);
  return vec3f(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
}
fn sbRgb(c: vec3f) -> vec3f {
  let p = abs(fract(vec3f(c.x) + vec3f(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3f(1.0), clamp(p - 1.0, vec3f(0.0), vec3f(1.0)), c.y);
}
fn customFragment(color: vec4f, wp: vec3f, normal: vec3f, uv: vec2f) -> vec4f {
  var c = color.rgb;
  let k = material.custom;
  if (k[0].y > 0.5) {
    let hsv = sbHsv(max(c, vec3f(0.0)));
    let blue = smoothstep(0.52, 0.56, hsv.x) * (1.0 - smoothstep(0.72, 0.76, hsv.x)) * smoothstep(0.18, 0.32, hsv.y);
    let turned = sbRgb(vec3f(fract(hsv.x + k[0].x), hsv.y * k[2].x, hsv.z * (1.0 + k[2].y)));
    c = mix(c, turned, blue);
  }
  let v = normalize(frame.cameraPosition.xyz - wp);
  let rim = pow(1.0 - clamp(dot(normal, v), 0.0, 1.0), 3.0);
  c += k[1].rgb * smoothstep(0.35, 0.6, rim) * k[1].w;
  let g = dot(c, vec3f(0.299, 0.587, 0.114));
  c = mix(c, vec3f(g) * 0.75, k[0].z);
  c = mix(c, vec3f(1.0), k[0].w);
  return vec4f(c, color.a);
}`;

/** The team colours: side 0 keeps the blue the models are painted in, side 1 turns it crimson, neutral to grey. */
export const TEAMS = [
  { hue: 0, sat: 1, lift: 0, ring: [0.24, 0.52, 1.0], css: '#3d7bff' },
  { hue: 0.375, sat: 1.05, lift: -0.04, ring: [0.95, 0.2, 0.22], css: '#e8384a' }
];
export const NEUTRAL = { hue: 0, sat: 0.12, lift: -0.15, ring: [0.75, 0.75, 0.72], css: '#b9b9b0' };

/**
 * A toon copy of a loaded model's material: its colour map kept, lit in `steps` bands, with the figure hook. Returns
 * the material; its `shader.uniforms` are the parameters set by `paintFigure`.
 */
export function toonFrom(source, { steps = 3, rim = [1, 0.95, 0.85, 0.35], swap = true } = {}) {
  const material = createToonMaterial3D({
    steps,
    color: [1, 1, 1],
    ...(source?.map ? { map: source.map } : {}),
    side: source?.side ?? 'front',
    ...(source?.alphaMode && source.alphaMode !== 'opaque' ? { alphaMode: source.alphaMode, alphaCutoff: source.alphaCutoff } : {})
  });
  if (source?.color) material.color.set(source.color);
  material.shader = createCustomShader3D({ key: 'sb-figure', glsl: FIGURE_GLSL, wgsl: FIGURE_WGSL, uniforms: [0, swap ? 1 : 0, 0, 0, ...rim, 1, 0, 0, 0] });
  return material;
}

/** Sets a figure material's team colour, grey (acted) and flash. */
export function paintFigure(material, team, { grey = 0, flash = 0, swap = true } = {}) {
  const u = material.shader.uniforms;
  u[0] = team.hue;
  u[1] = swap ? 1 : 0;
  u[2] = grey;
  u[3] = flash;
  u[8] = team.sat;
  u[9] = team.lift;
}

/** Replaces every material under `root` with its toon copy; returns the list of new materials. */
export function toonify(root, options) {
  const made = [];
  const cache = new Map();
  root.traverse((node) => {
    if (!node.material) return;
    const swap = (m) => {
      if (!cache.has(m)) {
        const t = toonFrom(m, options);
        cache.set(m, t);
        made.push(t);
      }
      return cache.get(m);
    };
    node.material = Array.isArray(node.material) ? node.material.map(swap) : swap(node.material);
  });
  return made;
}
