// The people of the chapter: sculpted figures on a shared skeleton, and the poses that move them.
// A figure faces +z; its left is +x. Poses are sets of joint angles; each frame every joint eases toward
// the pose its state asks for, which is what gives the cuts their snap and the walk its weight.
import { Mesh3D, Object3D, Skeleton3D, createCustomShader3D, createStandardMaterial3D, mat4LookAt, quatFromRotationMatrix, quatSlerp } from '@egret/engine/world3d';
import { LOCOMOTION, sampleLocomotion } from './locomotion.mjs';
import { BASE_BONES, BIND, BONES, HANDS, JOINTS } from './rig.mjs';

// Fine surface that the sculpted mesh is too coarse to carry, drawn per pixel from a pattern that stays
// fixed to the figure: the threads of woven cloth, pores and flush on skin, the grain of leather, the
// brushing of metal, strands of hair. Each fades out as it gets too small on screen to draw cleanly.
const SURFACE_GLSL = `
float sHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float sNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(sHash(i), sHash(i + vec2(1.0, 0.0)), u.x), mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// How much of a pattern of the given pitch (metres) can still be drawn at this pixel.
float sSeen(vec2 p, float pitch) { return clamp(1.3 - max(fwidth(p.x), fwidth(p.y)) / pitch * 2.2, 0.0, 1.0); }
// Height of the surface's fine relief at a point; x of the result is the height, yz its slope.
vec3 sRelief(float id, vec2 p) {
    if (id < 0.5) {
        // Plain weave: warp over weft, with a thicker thread now and then.
        float pitch = 0.0026, seen = sSeen(p, pitch), k = 6.2832 / pitch;
        float slub = 0.7 + 0.6 * sNoise(vec2(p.x * 30.0, p.y * 700.0));
        float h = sin(p.x * k) * sin(p.y * k) * slub;
        return vec3(h, cos(p.x * k) * sin(p.y * k), sin(p.x * k) * cos(p.y * k)) * seen;
    } else if (id < 1.5) {
        // Skin: pores, and finer creases across them.
        float seen = sSeen(p, 0.0016);
        float h = sNoise(p * 1400.0) * 0.6 + sNoise(vec2(p.x * 500.0, p.y * 1900.0)) * 0.4;
        return vec3(h - 0.5, sNoise(p * 1400.0 + vec2(0.4, 0.0)) - sNoise(p * 1400.0), sNoise(p * 1400.0 + vec2(0.0, 0.4)) - sNoise(p * 1400.0)) * seen * 0.6;
    } else if (id < 2.5) {
        // Leather: a pebbled grain broken by creases.
        float seen = sSeen(p, 0.003);
        float g = sNoise(p * 650.0), c = abs(sNoise(p * 90.0) - 0.5) * 2.0;
        float h = g * 0.7 + smoothstep(0.12, 0.0, c) * -0.8;
        return vec3(h - 0.35, sNoise(p * 650.0 + vec2(0.3, 0.0)) - g, sNoise(p * 650.0 + vec2(0.0, 0.3)) - g) * seen;
    } else if (id < 3.5) {
        // Metal: brushed one way, with a few pits.
        float seen = sSeen(p, 0.002);
        float h = sNoise(vec2(p.x * 90.0, p.y * 2400.0));
        return vec3(h - 0.5, 0.0, sNoise(vec2(p.x * 90.0, p.y * 2400.0 + 0.4)) - h) * seen * 0.7;
    }
    // Hair and fur: strands running down.
    float seen = sSeen(p, 0.0022);
    float h = sNoise(vec2(p.x * 2100.0, p.y * 60.0));
    return vec3(h - 0.5, sNoise(vec2(p.x * 2100.0 + 0.4, p.y * 60.0)) - h, 0.0) * seen * 1.4;
}
vec4 customFragment(vec4 color, vec3 worldPosition, vec3 normal, vec2 uv) {
    float id = floor(uv.x / 16.0);
    vec2 p = vec2(uv.x - id * 16.0, uv.y);
    vec3 relief = sRelief(id, p);
    // Low places are darker; cloth also fades and soils unevenly, and skin flushes in patches.
    vec3 c = color.rgb * (1.0 + relief.x * (id < 0.5 ? 0.22 : id > 3.5 ? 0.45 : 0.16));
    float patchy = sNoise(p * 14.0) * 0.6 + sNoise(p * 55.0) * 0.4;
    if (id < 0.5) c *= 0.88 + patchy * 0.24;
    else if (id < 1.5) c *= mix(vec3(1.0), vec3(1.12, 0.93, 0.9), smoothstep(0.45, 0.8, patchy) * 0.5);
    else if (id < 2.5) c *= 0.8 + patchy * 0.35;
    else if (id < 3.5) c *= 0.9 + patchy * 0.2;
    return vec4(c, color.a);
}`;
const SURFACE_NORMAL_GLSL = `
vec3 customNormal(vec3 normal, vec3 worldPosition, vec2 uv) {
    float id = floor(uv.x / 16.0);
    vec3 relief = sRelief(id, vec2(uv.x - id * 16.0, uv.y));
    // Lean the normal by the slope of the relief, along two directions that lie in the surface.
    vec3 side = normalize(cross(normal, vec3(0.0, 1.0, 0.001))), up = cross(side, normal);
    return normal - (side * relief.y + up * relief.z) * (id < 0.5 ? 0.55 : 0.4);
}`;
/** Give a figure's material its fine surface. */
function surfaced(material) {
  material.shader = createCustomShader3D({ key: 'snow-surface', glsl: SURFACE_GLSL, glslNormal: SURFACE_NORMAL_GLSL });
  return material;
}

/** Size, what is carried in the right hand, and what on the left arm. */
const LOOKS = {
  hero: { size: 1, weapon: 'spear', grip: 0.5, articulated: true, fill: [0.008, 0.015, 0.024] },
  blade: { size: 1, weapon: 'sabre', grip: -0.24, fill: [0.01, 0.006, 0.003] },
  shield: { size: 1.06, weapon: 'short', off: 'rattan', offScale: 1.12, fill: [0.01, 0.008, 0.004] },
  bow: { size: 0.98, off: 'longbow', offScale: 1.08, fill: [0.006, 0.008, 0.012] },
  lu: { size: 1.2, weapon: 'glaive', grip: 0.55, articulated: true, fill: [0.019, 0.006, 0.008] }
};
const POSED = ['hips', 'spine', 'head', 'armL', 'foreL', 'armR', 'foreR', 'legL', 'shinL', 'legR', 'shinR', 'cloak', 'weapon', 'off'];
const ARTICULATED_POSED = [...POSED, 'footL', 'footR'];

/** Build one figure of the given kind from the sculpted models. */
export function createFigure(kind, models, detail = 'high') {
  const look = LOOKS[kind],
    fine = detail !== 'low',
    dress = (material) => (fine ? surfaced(material) : material),
    cloth = dress(createStandardMaterial3D({ vertexColors: true, roughness: 0.78, metallic: 0 })),
    gear = createStandardMaterial3D({ vertexColors: true, roughness: 0.6, metallic: 0.1 }),
    metal = dress(createStandardMaterial3D({ vertexColors: true, roughness: 0.28, metallic: 0.9, emissive: 0x9fd4ff, emissiveIntensity: 0 })),
    root = new Object3D(),
    joints = { root },
    bones = look.articulated ? BONES : BASE_BONES,
    posed = look.articulated ? ARTICULATED_POSED : POSED,
    rest = {};
  for (const name of bones) {
    const [parent, x, y, z] = JOINTS[name];
    const joint = new Object3D();
    joint.setPosition(x, y, z);
    // The pose the figure was sculpted in; the skin is bound to it.
    joint.setRotation(0, 0, BIND[name] ?? 0);
    rest[name] = [x, y, z];
    joints[parent].addChild(joint);
    joints[name] = joint;
  }
  root.updateWorldMatrices(true);
  const body = new Mesh3D(models[kind], cloth);
  body.castShadow = true;
  body.receiveShadow = true;
  root.addChild(body);
  body.bind(new Skeleton3D(bones.map((name) => joints[name])));
  const hold = (joint, name, material, scale = 1) => {
    if (!models[name]) return;
    const mesh = new Mesh3D(models[name], material);
    mesh.castShadow = true;
    mesh.setScale(scale);
    joints[joint].addChild(mesh);
  };
  if (look.weapon) (hold('weapon', look.weapon, gear), hold('weapon', look.weapon + 'Edge', metal));
  if (look.off) hold('off', look.off, gear, look.offScale);
  root.setScale(look.size);
  const angles = {};
  for (const name of posed) angles[name] = [0, 0, 0];
  const gait = look.articulated ? { phase: 0, travelled: 0, speed: 0, walk: {}, run: {} } : null;
  return { kind, look, root, joints, rest, posed, angles, gait, held: 0, slide: 0, rightOpening: 0, lift: 0, cloth, metal, glow: 0, flash: 0, scale: look.size, sink: 0 };
}

// ---- poses --------------------------------------------------------------------------------

const mix = (a, b, k) => a + (b - a) * k;
const ease = (k) => k * k * (3 - 2 * k);
const span = (t, from, to) => Math.max(0, Math.min(1, (t - from) / (to - from)));

/** Blend two poses. */
function blend(a, b, k) {
  const out = { lift: mix(a.lift ?? 0, b.lift ?? 0, k) };
  for (const name of ARTICULATED_POSED) {
    const p = a[name] ?? ZERO,
      q = b[name] ?? ZERO;
    out[name] = [mix(p[0], q[0], k), mix(p[1], q[1], k), mix(p[2], q[2], k)];
  }
  if (a.free || b.free || a.grip || b.grip) {
    out.grip = {
      strength: mix(a.grip?.strength ?? (a.free ? 0 : 1), b.grip?.strength ?? (b.free ? 0 : 1), k),
      slide: mix(a.grip?.slide ?? 0, b.grip?.slide ?? 0, k)
    };
  }
  return out;
}
const ZERO = [0, 0, 0];

const STAND = {
  hero: { spine: [0.06, -0.3, 0], head: [0, 0.25, 0], armR: [0.3, 0, -0.25], foreR: [-1.0, 0, 0], weapon: [-0.22, 1.1, 0], armL: [-0.25, 0, 0.18], foreL: [-0.7, 0, 0], legL: [-0.18, 0, 0.07], shinL: [0.2, 0, 0], legR: [0.22, 0, -0.07], shinR: [0.18, 0, 0], cloak: [0.12, 0, 0] },
  foe: { spine: [0.1, -0.2, 0], armR: [0.1, 0, -0.3], foreR: [-0.9, 0, 0], weapon: [-0.5, 0.25, 0], armL: [-0.2, 0, 0.2], foreL: [-0.6, 0, 0], legL: [-0.15, 0, 0.08], shinL: [0.18, 0, 0], legR: [0.18, 0, -0.08], shinR: [0.15, 0, 0], cloak: [0.1, 0, 0] },
  shield: { armL: [-0.95, 0, 0.1], foreL: [-1.1, 0, -0.5], off: [1.2, 0, 0] },
  bow: { armL: [-0.5, 0, 0.2], foreL: [-0.6, 0, 0], off: [0.9, 0, 0], armR: [0, 0, -0.15], foreR: [-0.4, 0, 0] }
};

/** A stride: `phase` runs 0..1 over two steps, `reach` is how far the legs swing. */
function stride(base, phase, reach, lean) {
  const s = Math.sin(phase * Math.PI * 2),
    c = Math.cos(phase * Math.PI * 2);
  return {
    ...base,
    lift: Math.abs(c) * 0.05 - 0.04,
    spine: [(base.spine?.[0] ?? 0) + lean, (base.spine?.[1] ?? 0) + s * 0.12, 0],
    legL: [-s * reach, 0, 0.03],
    shinL: [Math.max(0, c) * reach * 1.3 + 0.15, 0, 0],
    legR: [s * reach, 0, -0.03],
    shinR: [Math.max(0, -c) * reach * 1.3 + 0.15, 0, 0],
    armL: [s * reach * 0.7 - 0.15, 0, 0.15],
    foreL: [-0.6, 0, 0],
    cloak: [0.3 + lean * 1.4 + c * 0.08, 0, 0]
  };
}

const GAIT_BODY = ['hips', 'spine', 'head', 'legL', 'shinL', 'footL', 'legR', 'shinR', 'footR'];
function capturedStride(base, gait, distance, speed, clock, travelled) {
  const running = ease(span(speed, 1.85, 4.25)),
    strideMeters = mix(LOCOMOTION.walk.strideMeters, LOCOMOTION.run.strideMeters, running);
  gait.phase = (gait.phase + distance / strideMeters) % 1;
  const walk = sampleLocomotion('walk', gait.phase, gait.walk),
    run = sampleLocomotion('run', gait.phase, gait.run),
    result = { ...base, lift: mix(walk.lift, run.lift, running), contactL: mix(walk.contactL, run.contactL, running), contactR: mix(walk.contactR, run.contactR, running) };
  for (const joint of GAIT_BODY) {
    const w = walk[joint],
      r = run[joint],
      transfer = joint === 'spine' || joint === 'head' ? 0.62 : 1;
    result[joint] = [0, 1, 2].map((axis) => mix(base[joint]?.[axis] ?? 0, mix(w[axis], r[axis], running), transfer));
  }
  // Keep the weapon carriage while the body follows the measured weight transfers.
  result.cloak = [0.32 + running * 0.23 + Math.cos(gait.phase * Math.PI * 4) * 0.08, Math.sin(clock * 2.9 + travelled * 0.6) * 0.14, Math.sin(clock * 2.2 + 0.9) * 0.07];
  return result;
}

function travelledSince(gait, travelled, dt) {
  if (!gait) return 0;
  const distance = Math.max(0, travelled - gait.travelled);
  gait.travelled = travelled;
  // The simulation advances in discrete steps even on high-refresh displays.
  if (dt > 0) gait.speed += (distance / dt - gait.speed) * (1 - Math.exp(-dt * 17));
  return distance;
}

// The three cuts, each as: ready, drawn back, struck.
const CUTS = [
  [
    { spine: [0.08, -0.75, 0], armR: [0.85, 0, -0.3], foreR: [-1.7, 0, 0], weapon: [0, 0.1, 0], armL: [-0.9, 0, 0.2], foreL: [-0.5, 0, 0], legL: [-0.3, 0, 0.05], shinL: [0.4, 0, 0], legR: [0.35, 0, -0.05], shinR: [0.3, 0, 0], lift: -0.08 },
    { spine: [0.32, 0.55, 0], head: [0, -0.4, 0], armR: [-1.5, 0, 0.12], foreR: [-0.08, 0, 0], weapon: [0.04, 0, 0], armL: [0.5, 0, 0.3], foreL: [-0.4, 0, 0], legL: [-0.95, 0, 0.05], shinL: [0.95, 0, 0], legR: [0.6, 0, -0.05], shinR: [0.1, 0, 0], lift: -0.2, cloak: [0.7, 0, 0] }
  ],
  [
    { spine: [0.1, -1.0, 0], armR: [-0.5, 0, -1.1], foreR: [-0.5, 0, 0], weapon: [0, -1.75, 0], armL: [-0.7, 0, -0.3], foreL: [-0.9, 0, 0], legL: [-0.25, 0, 0.1], shinL: [0.35, 0, 0], legR: [0.3, 0, -0.1], shinR: [0.3, 0, 0], lift: -0.1 },
    { spine: [0.18, 1.0, 0], head: [0, -0.6, 0], armR: [-1.25, 0, 0.75], foreR: [-0.2, 0, 0], weapon: [0.02, 1.6, 0], armL: [0.3, 0, 0.6], foreL: [-0.5, 0, 0], legL: [-0.5, 0, 0.2], shinL: [0.5, 0, 0], legR: [0.45, 0, -0.2], shinR: [0.25, 0, 0], lift: -0.14, cloak: [0.5, 0.5, 0] }
  ],
  [
    { spine: [-0.32, 0, 0], head: [0.3, 0, 0], armR: [-2.75, 0, -0.1], foreR: [-0.35, 0, 0], weapon: [-2.0, 0, 0], armL: [-2.6, 0, 0.1], foreL: [-0.4, 0, 0], legL: [-0.1, 0, 0.1], shinL: [0.1, 0, 0], legR: [0.1, 0, -0.1], shinR: [0.1, 0, 0], lift: 0.12 },
    { spine: [0.7, 0, 0], head: [-0.4, 0, 0], armR: [-0.95, 0, 0.1], foreR: [-0.2, 0, 0], weapon: [0.52, 0, 0], armL: [-0.9, 0, -0.1], foreL: [-0.4, 0, 0], legL: [-0.9, 0, 0.1], shinL: [1.1, 0, 0], legR: [0.5, 0, -0.1], shinR: [0.6, 0, 0], lift: -0.32, cloak: [0.9, 0, 0] }
  ]
];

const HERO_POSES = {
  guard: { spine: [0.12, 0, 0], armR: [-1.0, 0, -0.35], foreR: [-0.9, 0, 0], weapon: [-0.2, 1.4, 0.2], armL: [-1.2, 0, 0.45], foreL: [-0.7, 0, 0], legL: [-0.35, 0, 0.16], shinL: [0.4, 0, 0], legR: [0.3, 0, -0.16], shinR: [0.35, 0, 0], lift: -0.12 },
  dodge: { free: true, spine: [1.0, 0, 0], head: [-0.4, 0, 0], armR: [0.6, 0, -0.3], foreR: [-0.6, 0, 0], weapon: [0.1, -0.5, 0], armL: [0.7, 0, 0.3], foreL: [-0.5, 0, 0], legL: [-1.2, 0, 0], shinL: [1.5, 0, 0], legR: [-0.3, 0, 0], shinR: [1.2, 0, 0], lift: -0.42, cloak: [1.2, 0, 0] },
  hurt: { free: true, spine: [-0.5, 0.35, 0], head: [-0.35, 0, 0], armR: [0.4, 0, -0.9], foreR: [-0.5, 0, 0], weapon: [0.3, -0.8, 0], armL: [0.3, 0, 0.9], foreL: [-0.4, 0, 0], legL: [0.25, 0, 0.1], shinL: [0.3, 0, 0], legR: [-0.2, 0, -0.1], shinR: [0.3, 0, 0], lift: -0.06 },
  drink: { free: true, spine: [-0.18, 0, 0], head: [-0.5, 0, 0], armL: [-2.1, 0, 0.35], foreL: [-1.7, 0, 0], armR: [-0.4, 0, -0.35], foreR: [-0.5, 0, 0], weapon: [-1.45, 0, 0] },
  stars: { free: true, spine: [0.1, 0.55, 0], armL: [-1.55, 0, -0.1], foreL: [-0.05, 0, 0], armR: [0.5, 0, -0.5], foreR: [-0.7, 0, 0], weapon: [0.15, -1.3, 0], legL: [-0.5, 0, 0.1], shinL: [0.5, 0, 0], legR: [0.4, 0, -0.1], shinR: [0.2, 0, 0], lift: -0.1 },
  rainUp: { spine: [-0.28, 0, 0], head: [-0.45, 0, 0], armR: [-3.0, 0, -0.08], foreR: [-0.1, 0, 0], weapon: [-1.57, 0, 0], armL: [-0.6, 0, 0.9], foreL: [-0.3, 0, 0], lift: 0.25, cloak: [1.0, 0, 0] },
  rainDown: { spine: [0.75, 0, 0], head: [-0.3, 0, 0], armR: [-1.0, 0, 0], foreR: [-0.5, 0, 0], weapon: [1.25, 0, 0], armL: [-1.0, 0, 0.2], foreL: [-0.5, 0, 0], legL: [-1.1, 0, 0.1], shinL: [1.3, 0, 0], legR: [0.3, 0, -0.1], shinR: [1.2, 0, 0], lift: -0.4 },
  glide: { free: true, spine: [0.75, 0, 0], head: [-0.6, 0, 0], armR: [0.9, 0, -0.4], foreR: [-0.3, 0, 0], weapon: [0.12, -0.25, 0], armL: [0.9, 0, 0.4], foreL: [-0.2, 0, 0], legL: [-0.7, 0, 0.05], shinL: [0.9, 0, 0], legR: [0.75, 0, -0.05], shinR: [0.5, 0, 0], lift: -0.1, cloak: [1.35, 0, 0] },
  dead: { free: true, hips: [-1.45, 0, 0.1], spine: [-0.1, 0, 0], head: [-0.2, 0.4, 0], armR: [0.2, 0, -1.2], armL: [0.1, 0, 1.3], weapon: [0.2, -1.2, 1.2], legL: [0.1, 0, 0.25], legR: [-0.15, 0, -0.2], shinR: [0.5, 0, 0], lift: -0.8 }
};

/** Struck: thrown back at once, then gathering himself over the rest of the stagger. */
function reel(base, struck, t, total) {
  const impactEnd = total * 0.26;
  if (t < impactEnd) return [struck, 48];
  // Weight returns through a bent leg and a lowered centre of gravity before the guard comes back.
  const catchStep = { ...base, free: true, lift: -0.18, spine: [0.32, 0, 0.08], head: [-0.18, 0, -0.06], legL: [-0.52, 0, 0.12], shinL: [0.72, 0, 0], footL: [-0.21, 0, 0], legR: [0.24, 0, -0.14], shinR: [0.43, 0, 0], cloak: [0.55, 0, 0.12] };
  const planted = blend(struck, catchStep, ease(span(t, impactEnd, total * 0.54)));
  return [blend(planted, base, ease(span(t, total * 0.55, total))), 24];
}
/** Falling: the knees give, he goes over backward, and comes to rest with one arm thrown out. */
export const FALL_CONTACT = 0.54;
function fall(base, t, side) {
  const buckle = { ...base, free: true, lift: -0.34, spine: [0.42, 0.2 * side, 0], head: [0.28, 0, 0], legL: [-0.7, 0, 0.17], shinL: [1.53, 0, 0], footL: [-0.48, 0, 0], legR: [-0.51, 0, -0.1], shinR: [1.29, 0, 0], footR: [-0.32, 0, 0], armL: [-0.4, 0, 0.58], armR: [-0.2, 0, -0.64], weapon: [0.48, -0.6 * side, 0.28] },
    over = { ...base, free: true, lift: -0.59, hips: [-0.95, 0, 0.19 * side], spine: [-0.33, 0, 0.08 * side], head: [-0.53, 0, 0], legL: [-0.56, 0, 0.22], shinL: [0.98, 0, 0], footL: [0.23, 0, 0], legR: [-0.24, 0, -0.2], shinR: [0.72, 0, 0], armL: [-1.57, 0, 0.98], armR: [-1.14, 0, -1.0], weapon: [0.3, -1.0, 0.8] },
    contact = { ...base, ...HERO_POSES.dead, hips: [-1.65, 0, 0.17 * side], spine: [0.03, 0.13 * side, 0], head: [-0.32, 0.42 * side, 0], lift: -0.83 },
    down = { ...contact, hips: [-1.51, 0, 0.16 * side], head: [-0.15, 0.5 * side, 0], lift: -0.8 };
  if (t < 0.2) return [{ ...blend(base, buckle, ease(span(t, 0, 0.2))), grip: { strength: 0 } }, 40];
  if (t < FALL_CONTACT) {
    const turn = t < 0.38 ? blend(buckle, over, ease(span(t, 0.2, 0.38))) : blend(over, contact, ease(span(t, 0.38, FALL_CONTACT)));
    return [turn, 45];
  }
  return [blend(contact, down, ease(span(t, FALL_CONTACT + 0.08, 0.86))), 30];
}

/** The hero's pose for what he is doing. Returns [pose, how fast the joints chase it]. */
export function heroPose(hero, tune, clock, travelled, fallen = 0, gait, dt = 0) {
  const base = STAND.hero,
    distance = travelledSince(gait, travelled, dt);
  switch (hero.state) {
    case 'cut': {
      const cut = tune.cuts[hero.cut],
        [back, through] = CUTS[hero.cut],
        transfer = Math.sin(Math.PI * span(hero.t, 0, cut.windup));
      if (hero.t < cut.windup) return [{ ...base, ...back, grip: { strength: 1 - 0.52 * transfer, slide: -0.12 * transfer } }, 30];
      if (hero.t < cut.windup + cut.active + 0.08) return [{ ...base, ...through, grip: { strength: 1, slide: hero.cut === 2 ? 0.1 : 0.045 } }, 46];
      return [blend({ ...base, ...through }, base, ease(span(hero.t, cut.windup + cut.active + 0.08, cut.windup + cut.active + cut.recover))), 16];
    }
    case 'riposte':
      return hero.t < tune.riposte.strike * 0.7 ? [{ ...base, ...CUTS[0][0], lift: -0.25 }, 40] : [{ ...base, ...CUTS[0][1], lift: -0.3 }, 50];
    case 'guard':
      return [{ ...base, ...HERO_POSES.guard }, 26];
    case 'dodge':
      return [{ ...base, ...HERO_POSES.dodge, hips: [hero.t / tune.dodge.time < 0.8 ? 0.5 : 0, 0, 0] }, 26];
    case 'hurt':
      return reel(base, { ...base, ...HERO_POSES.hurt }, hero.t, hero.staggerFor ?? 0.4);
    case 'drink':
      return [{ ...base, ...HERO_POSES.drink }, 14];
    case 'stars':
      return [{ ...base, ...HERO_POSES.stars }, 30];
    case 'rain':
      return hero.t < tune.rain.burstAt - 0.2 ? [{ ...base, ...HERO_POSES.rainUp, lift: 0.25 + Math.sin(clock * 3) * 0.05 }, 9] : [{ ...base, ...HERO_POSES.rainDown }, 34];
    case 'glide':
      return [{ ...base, ...HERO_POSES.glide }, 14];
    case 'dead':
      return fall(base, fallen, 1);
  }
  if (hero.moving) {
    if (gait) {
      const trailing = ease(span(gait.speed, 2.1, 4.25));
      const carrying = { ...base, weapon: [mix(-0.22, 0.12, trailing), mix(1.1, 0.3, trailing), 0], armR: [0.34, 0, -0.25], grip: { strength: 1 - trailing } };
      return [capturedStride(carrying, gait, distance, gait.speed, clock, travelled), 42];
    }
    const pace = Math.min(1, Math.hypot(hero.vx, hero.vz) / tune.speed);
    const moving = stride({ ...base, weapon: [0.12, 0.3, 0], armR: [0.35, 0, -0.25] }, travelled / 2.3, 0.42 + 0.43 * pace, 0.07 + 0.15 * pace);
    moving.cloak[1] = Math.sin(clock * 2.9 + travelled * 0.6) * (0.06 + pace * 0.1);
    moving.cloak[2] = Math.sin(clock * 2.2 + 0.9) * 0.07;
    return [moving, 18];
  }
  const breath = Math.sin(clock * 1.8) * 0.02;
  const wind = Math.sin(clock * 2.4) * 0.045 + Math.sin(clock * 4.1) * 0.023;
  return [{ ...base, spine: [0.06 + breath, -0.3, 0], cloak: [0.12 + wind, wind * 0.6, wind], lift: breath * 0.6 }, 10];
}

const FOE_POSES = {
  arcBack: { spine: [0.05, -0.9, 0], armR: [-0.9, 0, -1.2], foreR: [-0.7, 0, 0], weapon: [-0.55, -1.7, 0], legL: [-0.3, 0, 0.1], shinL: [0.35, 0, 0], legR: [0.3, 0, -0.1], shinR: [0.3, 0, 0], lift: -0.1 },
  arcThrough: { spine: [0.25, 0.95, 0], armR: [-1.3, 0, 0.6], foreR: [-0.2, 0, 0], weapon: [0.12, 1.5, 0], legL: [-0.7, 0, 0.1], shinL: [0.7, 0, 0], legR: [0.5, 0, -0.1], shinR: [0.2, 0, 0], lift: -0.16, cloak: [0.6, 0.4, 0] },
  lineBack: { spine: [0.3, -0.6, 0], armR: [0.8, 0, -0.3], foreR: [-1.5, 0, 0], weapon: [0, 0.05, 0], legL: [-0.5, 0, 0.1], shinL: [0.8, 0, 0], legR: [0.5, 0, -0.1], shinR: [0.8, 0, 0], lift: -0.25 },
  lineThrough: { spine: [0.4, 0.5, 0], armR: [-1.5, 0, 0.1], foreR: [-0.05, 0, 0], weapon: [0.03, 0, 0], legL: [-1.0, 0, 0.05], shinL: [1.0, 0, 0], legR: [0.7, 0, -0.05], shinR: [0.1, 0, 0], lift: -0.22, cloak: [1.1, 0, 0] },
  discBack: { spine: [-0.35, 0, 0], head: [0.3, 0, 0], armR: [-2.8, 0, -0.1], foreR: [-0.3, 0, 0], armL: [-2.7, 0, 0.1], foreL: [-0.3, 0, 0], weapon: [-2.05, 0, 0], lift: 0.14 },
  discThrough: { spine: [0.75, 0, 0], armR: [-0.9, 0, 0.1], foreR: [-0.2, 0, 0], armL: [-0.9, 0, -0.1], foreL: [-0.3, 0, 0], weapon: [0.55, 0, 0], legL: [-0.9, 0, 0.1], shinL: [1.1, 0, 0], legR: [0.5, 0, -0.1], shinR: [0.6, 0, 0], lift: -0.32 },
  fireBack: { spine: [0.55, -0.5, 0], armR: [0.3, 0, -0.5], foreR: [-0.4, 0, 0], weapon: [0.5, -0.9, 0], legL: [-0.6, 0, 0.1], shinL: [0.9, 0, 0], legR: [0.4, 0, -0.1], shinR: [0.7, 0, 0], lift: -0.28 },
  fireThrough: { spine: [-0.25, 0.6, 0], armR: [-2.2, 0, 0.3], foreR: [-0.2, 0, 0], weapon: [-1.0, 0.5, 0], lift: 0.05, cloak: [0.8, 0, 0] },
  wheel: { spine: [0.15, 0, 0], armR: [-1.4, 0, -0.9], foreR: [-0.1, 0, 0], armL: [-0.6, 0, 1.0], weapon: [0.05, -1.57, 0], lift: -0.12, cloak: [1.1, 0, 0] },
  draw: { free: true, spine: [0.02, -0.5, 0], head: [0, 0.4, 0], armL: [-1.5, 0, -0.35], foreL: [-0.05, 0, 0], off: [1.55, 0, 0], armR: [-1.35, 0, -0.5], foreR: [-2.0, 0, 0] },
  loft: { free: true, spine: [-0.35, -0.5, 0], head: [-0.3, 0.4, 0], armL: [-2.3, 0, -0.35], foreL: [-0.05, 0, 0], off: [1.55, 0, 0], armR: [-2.0, 0, -0.5], foreR: [-2.0, 0, 0] },
  stagger: { free: true, spine: [-0.55, 0.3, 0], head: [-0.4, 0, 0], armR: [0.3, 0, -1.0], foreR: [-0.4, 0, 0], weapon: [0.4, -1.0, 0.3], armL: [0.2, 0, 1.0], foreL: [-0.3, 0, 0], legL: [0.3, 0, 0.1], shinL: [0.35, 0, 0], legR: [-0.25, 0, -0.1], shinR: [0.35, 0, 0], lift: -0.08 },
  down: { free: true, spine: [0.7, 0, 0], head: [0.45, 0, 0], armR: [-0.8, 0, -0.2], foreR: [-0.9, 0, 0], weapon: [-1.35, 0, 0.15], armL: [-0.3, 0, 0.3], foreL: [-1.0, 0, 0], legL: [-1.4, 0, 0.1], shinL: [1.5, 0, 0], legR: [0.2, 0, -0.1], shinR: [1.5, 0, 0], lift: -0.46 },
  rage: { free: true, spine: [-0.42, 0, 0], head: [-0.5, 0, 0], armR: [-0.7, 0, -1.3], foreR: [-0.3, 0, 0], weapon: [-0.9, -0.9, 0], armL: [-0.7, 0, 1.3], foreL: [-0.4, 0, 0], legL: [-0.2, 0, 0.2], legR: [0.2, 0, -0.2], lift: 0.05, cloak: [1.0, 0, 0] },
  wait: { free: true, spine: [0.05, 0, 0], armR: [-0.35, 0, -0.3], foreR: [-0.5, 0, 0], weapon: [-1.5, 0, 0], armL: [0.1, 0, 0.12], foreL: [-0.2, 0, 0] }
};

/** A foe's pose for what he is doing. */
export function foePose(foe, clock, travelled, gait, dt = 0) {
  const base = { ...STAND.foe, ...(STAND[foe.kind] ?? {}) },
    over = (pose) => ({ ...base, ...pose }),
    distance = travelledSince(gait, travelled, dt);
  switch (foe.state) {
    case 'dead':
      return fall(base, foe.t, foe.id % 2 ? 1 : -1);
    case 'stagger':
      return reel(base, over(FOE_POSES.stagger), foe.t, foe.staggerFor ?? 0.5);
    case 'down':
      return [over(FOE_POSES.down), 12];
    case 'rage':
      return foe.t < 0.8 ? [over(FOE_POSES.down), 12] : [over(FOE_POSES.rage), 16];
    case 'wait':
      return [over(foe.kind === 'lu' ? FOE_POSES.wait : {}), 8];
    case 'windup':
    case 'strike':
    case 'recover': {
      const move = foe.move,
        key = move.name === 'fire' ? 'fire' : move.name === 'wheel' ? 'wheel' : move.shape === 'arc' ? 'arc' : move.shape === 'line' ? 'line' : 'disc';
      if (foe.kind === 'bow') {
        const pose = over(move.name === 'volley' ? FOE_POSES.loft : FOE_POSES.draw);
        return foe.state === 'recover' ? [blend(pose, base, ease(span(foe.t, 0, 0.35))), 14] : [pose, 12];
      }
      if (key === 'wheel') return [over({ ...FOE_POSES.wheel, hips: [0, foe.state === 'strike' ? foe.t * 26 : 0, 0] }), foe.state === 'strike' ? 60 : 14];
      const back = over(FOE_POSES[key + 'Back']),
        through = over(FOE_POSES[key + 'Through']);
      if (foe.state === 'windup') return [blend(base, back, ease(span(foe.t, 0, move.windup * 0.55))), 16];
      if (foe.state === 'strike') return [through, 48];
      return [blend(through, base, ease(span(foe.t, move.recover * 0.35, move.recover))), 14];
    }
  }
  if (foe.walking) return gait && dt > 0
    ? [capturedStride(base, gait, distance, gait.speed, clock, travelled), 40]
    : [stride(base, travelled / 1.9, 0.6, 0.12), 16];
  const breath = Math.sin(clock * 1.6 + foe.id) * 0.02;
  return [{ ...base, lift: breath }, 10];
}

/** Ease the figure's joints toward a pose and place its weapon in its right hand. */
export function pose(figure, target, rate, dt) {
  const k = 1 - Math.exp(-rate * dt),
    joints = figure.joints;
  for (const name of figure.posed) {
    const want = target[name] ?? ZERO,
      now = figure.angles[name];
    for (let i = 0; i < 3; i++) now[i] += (want[i] - now[i]) * k;
    joints[name].setRotation(now[0], now[1], now[2]);
  }
  figure.lift += ((target.lift ?? 0) - figure.lift) * k;
  joints.hips.setPosition(0, figure.rest.hips[1] + figure.lift, 0);
  if (figure.look.articulated) {
    poseGrip(figure, target, dt);
    return;
  }
  // Older figures still carry their equipment from the original hand anchor.
  const hand = joints.hand.getWorldPosition(scratch);
  joints.spine.worldToLocal(scratch, hand);
  joints.weapon.setPosition(scratch[0], scratch[1], scratch[2]);
  if (figure.look.grip === undefined) return;
  figure.held += ((target.free ? 0 : 1) - figure.held) * (1 - Math.exp(-12 * dt));
  if (figure.held < 0.02) return;
  joints.weapon.localToWorld(scratch, [0, 0, figure.look.grip]);
  joints.spine.worldToLocal(scratch, scratch);
  reach(joints.armL, joints.foreL, figure.rest.armL, scratch, figure.held);
}
const scratch = [0, 0, 0];
const shaftAxis = [0, 0, 0],
  wristZero = [0, 0, 0],
  gripPoint = [0, 0, 0],
  supportPoint = [0, 0, 0],
  offsetPoint = [0, 0, 0],
  localShaftAxis = [0, 0, 0],
  shaftTip = [0, 0, 1],
  wristMatrix = new Float32Array(16),
  wristRotation = [0, 0, 0, 1],
  neutralWrist = [0, 0, 0, 1],
  wristForward = [0, 0, 0],
  wristUp = [0, 1, 0],
  wristSide = [1, 0, 0];

function setFingers(joints, hand, opening, anchored = false) {
  for (let i = 0; i < hand.fingers.length; i++) {
    const finger = hand.fingers[i],
      extent = opening * hand.side * (anchored && i < 2 ? 0.12 : 1);
    joints[finger.joints[0]].setRotation(0, 0, extent * 0.53);
    joints[finger.joints[1]].setRotation(0, 0, extent * 0.83);
    joints[finger.joints[2]].setRotation(0, 0, extent * 0.64);
  }
  const thumb = anchored ? 0 : opening,
    thumbExtent = thumb * hand.side;
  joints[hand.thumb.joints[0]].setRotation(-thumb * 0.29, thumbExtent * 0.16, thumbExtent * 0.33);
  joints[hand.thumb.joints[1]].setRotation(-thumb * 0.18, 0, thumbExtent * 0.39);
}

/** Keep the grip tunnel along the haft while retaining the forearm's natural roll. */
function alignWrist(palm, fore, weight) {
  fore.updateWorldMatrix();
  const m = fore.matrixWorld;
  const x = shaftAxis[0] * m[0] + shaftAxis[1] * m[1] + shaftAxis[2] * m[2],
    y = shaftAxis[0] * m[4] + shaftAxis[1] * m[5] + shaftAxis[2] * m[6],
    z = shaftAxis[0] * m[8] + shaftAxis[1] * m[9] + shaftAxis[2] * m[10],
    length = Math.hypot(x, y, z) || 1,
    sign = z < 0 ? 1 : -1;
  wristForward[0] = sign * x / length;
  wristForward[1] = sign * y / length;
  wristForward[2] = sign * z / length;
  mat4LookAt(wristMatrix, wristZero, wristForward, Math.abs(wristForward[1]) > 0.96 ? wristSide : wristUp);
  quatFromRotationMatrix(wristRotation, wristMatrix);
  quatSlerp(wristRotation, neutralWrist, wristRotation, weight);
  palm.setQuaternion(...wristRotation);
}

/** Slide the supporting hand along the wood if a fixed spot is outside the arm's reach. */
function chooseSupport(origin, direction, shoulder, palmOffset, preferred, armReach) {
  const x = shoulder[0] + palmOffset[0] - origin[0],
    y = shoulder[1] + palmOffset[1] - origin[1],
    z = shoulder[2] + palmOffset[2] - origin[2];
  const closest = x * direction[0] + y * direction[1] + z * direction[2];
  const reachAlong = Math.sqrt(Math.max(0, armReach ** 2 - (x * x + y * y + z * z - closest * closest)));
  return Math.max(-0.82, Math.min(0.96, Math.max(closest - reachAlong, Math.min(closest + reachAlong, preferred))));
}

function poseGrip(figure, target, dt) {
  const { joints, rest, look } = figure,
    step = 1 - Math.exp(-20 * dt);
  figure.held += ((target.grip?.strength ?? (target.free ? 0 : 1)) - figure.held) * step;
  figure.slide += ((target.grip?.slide ?? 0) - figure.slide) * step;
  figure.rightOpening += (((1 - (target.grip?.strength ?? 1)) * 0.56) - figure.rightOpening) * step;
  joints.weapon.updateWorldMatrix();
  const axis = joints.weapon.matrixWorld;
  shaftAxis[0] = axis[8];
  shaftAxis[1] = axis[9];
  shaftAxis[2] = axis[10];

  const right = joints.palmR;
  alignWrist(right, joints.foreR, 1);
  right.localToWorld(gripPoint, HANDS.R.grip);
  joints.spine.worldToLocal(gripPoint, gripPoint);
  joints.weapon.setPosition(...gripPoint);
  setFingers(joints, HANDS.R, figure.rightOpening, true);

  const left = joints.palmL;
  const weight = figure.held;
  let seated = 0;
  if (weight > 0.02) {
    const foreLength = -HANDS.L.wrist[1],
      origin = joints.weapon.position;
    joints.weapon.localToWorld(localShaftAxis, shaftTip);
    joints.spine.worldToLocal(localShaftAxis, localShaftAxis);
    for (let axis = 0; axis < 3; axis++) localShaftAxis[axis] -= origin[axis];
    for (let pass = 0; pass < 3; pass++) {
      alignWrist(left, joints.foreL, weight);
      left.localToWorld(gripPoint, HANDS.L.grip);
      left.getWorldPosition(offsetPoint);
      joints.spine.worldToLocal(gripPoint, gripPoint);
      joints.spine.worldToLocal(offsetPoint, offsetPoint);
      for (let i = 0; i < 3; i++) offsetPoint[i] = gripPoint[i] - offsetPoint[i];
      const local = chooseSupport(origin, localShaftAxis, rest.armL, offsetPoint, look.grip + figure.slide, UPPER + foreLength - 0.011);
      for (let i = 0; i < 3; i++) supportPoint[i] = origin[i] + localShaftAxis[i] * local - offsetPoint[i];
      reach(joints.armL, joints.foreL, rest.armL, supportPoint, pass === 0 ? weight : weight * weight, foreLength);
    }
    alignWrist(left, joints.foreL, weight);
    left.localToWorld(gripPoint, HANDS.L.grip);
    joints.weapon.worldToLocal(gripPoint, gripPoint);
    seated = 1 - span(Math.hypot(gripPoint[0], gripPoint[1]), 0.03, 0.115);
  } else left.setRotation(0.06, 0, 0.05);
  setFingers(joints, HANDS.L, 1 - weight * seated);
}

const UPPER = 0.29,
  FORE = 0.29;
/** The turn that carries "straight down" onto the direction (x, y, z), written into `out`. */
function aim(out, x, y, z) {
  if (y > 0.9999) return ((out[0] = 1), (out[1] = out[2] = out[3] = 0), out);
  const l = Math.hypot(-z, 1 - y, x);
  out[0] = -z / l;
  out[1] = 0;
  out[2] = x / l;
  out[3] = (1 - y) / l;
  return out;
}
const qa = [0, 0, 0, 1],
  qb = [0, 0, 0, 1];
/** Bend a two-boned arm so that its hand comes to `to`; both are given in the space the shoulder sits in. */
function reach(upper, fore, shoulder, to, weight, foreLength = FORE) {
  let dx = to[0] - shoulder[0],
    dy = to[1] - shoulder[1],
    dz = to[2] - shoulder[2];
  const far = Math.hypot(dx, dy, dz) || 1e-4,
    d = Math.max(Math.abs(UPPER - foreLength) + 0.01, Math.min(far, UPPER + foreLength - 0.01));
  dx /= far;
  dy /= far;
  dz /= far;
  // The elbow lies off the line from shoulder to hand, out and down and a little back.
  const along = (UPPER * UPPER - foreLength * foreLength + d * d) / (2 * d),
    off = Math.sqrt(Math.max(0, UPPER * UPPER - along * along)),
    dot = 0.55 * dx - 0.75 * dy - 0.35 * dz;
  let px = 0.55 - dx * dot,
    py = -0.75 - dy * dot,
    pz = -0.35 - dz * dot;
  const pl = Math.hypot(px, py, pz) || 1;
  px /= pl;
  py /= pl;
  pz /= pl;
  const ex = dx * along + px * off,
    ey = dy * along + py * off,
    ez = dz * along + pz * off;
  aim(qa, ex / UPPER, ey / UPPER, ez / UPPER);
  // The forearm's direction, seen from the upper arm: turn it back by the upper arm's turn.
  let fx = dx * d - ex,
    fy = dy * d - ey,
    fz = dz * d - ez;
  const fl = Math.hypot(fx, fy, fz) || 1;
  fx /= fl;
  fy /= fl;
  fz /= fl;
  const [x, y, z, w] = [-qa[0], -qa[1], -qa[2], qa[3]],
    tx = 2 * (y * fz - z * fy),
    ty = 2 * (z * fx - x * fz),
    tz = 2 * (x * fy - y * fx);
  aim(qb, fx + w * tx + (y * tz - z * ty), fy + w * ty + (z * tx - x * tz), fz + w * tz + (x * ty - y * tx));
  for (const [joint, q] of [
    [upper, qa],
    [fore, qb]
  ]) {
    // Ease from the posed turn to the reaching one.
    const now = joint.quaternion,
      sign = now[0] * q[0] + now[1] * q[1] + now[2] * q[2] + now[3] * q[3] < 0 ? -1 : 1;
    joint.setQuaternion(now[0] + (q[0] * sign - now[0]) * weight, now[1] + (q[1] * sign - now[1]) * weight, now[2] + (q[2] * sign - now[2]) * weight, now[3] + (q[3] * sign - now[3]) * weight);
  }
}
