// The jelly pandas: a coloured translucent core, a glossy candy shell,
// contrasting opaque face/limbs, and a pattern painted on the belly.
// Native jelly deformation and a volume-balanced animation rig give each
// jump, impact and roll a readable anticipation, contact and recovery.
import {
  Mesh3D,
  Object3D,
  Texture3D,
  createGeometry3D,
  createGlassMaterial3D,
  createJelly3D,
  createSphereGeometry3D,
  createStandardMaterial3D,
  createUnlitMaterial3D,
  mat4Compose,
  quatFromEuler,
} from '@egret/engine/world3d';

/** Colours are written as they look on screen and converted to the linear values the renderer lights. */
export const linear = (v) => Math.pow(v, 2.2);
const rgb = (hex) => [linear(((hex >> 16) & 255) / 255), linear(((hex >> 8) & 255) / 255), linear((hex & 255) / 255)];

/**
 * Merge shapes into one geometry with a colour per part. Each part is
 * `[geometry, position, scale, colour, rotation]`; rotation is optional Euler
 * angles in radians. Only positions, normals and colours are kept.
 */
export function buildShape(parts) {
  const positions = [],
    normals = [],
    colors = [],
    indices = [];
  const matrix = new Float32Array(16),
    turn = [0, 0, 0, 1];
  for (const [geometry, at, scale, color, rotation] of parts) {
    const p = geometry.getAttribute('position').data,
      n = geometry.getAttribute('normal').data,
      index = geometry.index?.data,
      base = positions.length / 3;
    const s = typeof scale === 'number' ? [scale, scale, scale] : scale,
      c = typeof color === 'number' ? rgb(color) : [linear(color[0]), linear(color[1]), linear(color[2])];
    quatFromEuler(turn, rotation?.[0] ?? 0, rotation?.[1] ?? 0, rotation?.[2] ?? 0);
    mat4Compose(matrix, at, turn, s);
    const m = matrix;
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i],
        y = p[i + 1],
        z = p[i + 2];
      positions.push(
        m[0] * x + m[4] * y + m[8] * z + m[12],
        m[1] * x + m[5] * y + m[9] * z + m[13],
        m[2] * x + m[6] * y + m[10] * z + m[14],
      );
      // Normals take the rotation and the inverse of the scale.
      const nx = n[i] / s[0],
        ny = n[i + 1] / s[1],
        nz = n[i + 2] / s[2];
      const rx = (m[0] * nx) / s[0] + (m[4] * ny) / s[1] + (m[8] * nz) / s[2],
        ry = (m[1] * nx) / s[0] + (m[5] * ny) / s[1] + (m[9] * nz) / s[2],
        rz = (m[2] * nx) / s[0] + (m[6] * ny) / s[1] + (m[10] * nz) / s[2];
      const length = Math.hypot(rx, ry, rz) || 1;
      normals.push(rx / length, ry / length, rz / length);
      colors.push(c[0], c[1], c[2]);
    }
    if (index) for (let i = 0; i < index.length; i++) indices.push(index[i] + base);
    else for (let i = 0; i < p.length / 3; i++) indices.push(base + i);
  }
  return createGeometry3D({ positions, normals, colors, indices });
}

// ---- belly patterns, painted into a small texture ---------------------------------
const ellipse = (x, y, rx, ry) => (x / rx) ** 2 + (y / ry) ** 2 < 1;
const fract = (v) => v - Math.floor(v);
const PATTERNS = {
  // Each returns the ink strength in local coordinates on the belly, from 0 to 1.
  spots: (x, y) =>
    Number(
      ellipse(x, y - 0.32, 0.14, 0.16) ||
      ellipse(Math.abs(x) - 0.39, y - 0.06, 0.15, 0.16) ||
      ellipse(Math.abs(x) - 0.22, y + 0.3, 0.14, 0.15)
    ),
  stripes: (x, y) => Number(Math.abs(x) < 0.68 && Math.abs(Math.abs(y - x * 0.12) - 0.21) < 0.1),
  checks: (x, y) => {
    if (Math.abs(x) >= 0.66 || Math.abs(y) >= 0.45) return 0;
    return (Math.floor((x + 0.66) / 0.33) + Math.floor((y + 0.45) / 0.3)) % 2 ? 1 : 0.26;
  },
  waves: (x, y) =>
    Number(Math.abs(x) < 0.66 && Math.abs(Math.abs(y - Math.sin(x * 6) * 0.11) - 0.19) < 0.092),
  swirl: (x, y) => {
    const radius = Math.hypot(x, y);
    if (radius < 0.09 || radius > 0.68) return 0;
    const turn = fract(Math.atan2(y, x) / (Math.PI * 2) + 2 - radius * 2.15);
    return Number(Math.abs(turn - 0.5) < 0.125);
  },
  hearts: (x, y) => {
    const hx = x * 1.6,
      hy = y * 1.85 + 0.12,
      a = hx * hx + hy * hy - 1;
    return Number(a * a * a - hx * hx * hy * hy * hy < 0);
  },
  stars: (x, y) => {
    const angle = Math.atan2(x, y),
      reach = 0.46 + 0.18 * Math.cos(angle * 5);
    return Number(Math.hypot(x, y) < reach);
  },
  leaves: (x, y) => {
    const large = ellipse(x + 0.19, y - 0.17 - (x + 0.19) * 1.03, 0.37, 0.15);
    const small = ellipse(x - 0.33, y + 0.21 - (x - 0.33) * 0.92, 0.23, 0.11);
    return large ? 1 : small ? 0.85 : 0;
  },
};
const patternCache = new WeakMap();
/** Paint a large belly mark and a softer matching mark visible from behind.
 * Reuse the immutable texture across title previews, parties and restarts.
 * Four sub-pixel samples keep the small stamped edges from stair-stepping
 * without increasing the texture dimensions or geometry budget.
 */
function patternTexture(skin) {
  const cached = patternCache.get(skin);
  if (cached && cached.patch === skin.patch && cached.pattern === skin.pattern && !cached.texture.isDisposed)
    return cached.texture;
  const width = 256,
    height = 128,
    data = new Uint8Array(width * height * 4),
    paint = PATTERNS[skin.pattern] ?? PATTERNS.spots,
    ink = [((skin.patch >> 16) & 255) / 255, ((skin.patch >> 8) & 255) / 255, (skin.patch & 255) / 255];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      // The sphere faces +Z at u = 1/4 and -Z at u = 3/4.
      const front = x < width / 2, sx = (front ? 7.4 : 8.6) / width, sy = 4.8 / height;
      const u = (x + 0.5) * sx - (front ? 0.25 : 0.75) * sx * width;
      const v = (y + 0.5) * sy - (front ? 0.48 : 0.56) * sy * height;
      let mark = 0;
      if (Math.abs(u) < 0.93 && Math.abs(v) < 0.88) {
        const sample = (dx, dy) => {
          const px = u + dx * sx, py = v + dy * sy;
          return Math.abs(px) < 0.9 && Math.abs(py) < 0.85 ? paint(px, py) : 0;
        };
        mark = (sample(-.25, -.25) + sample(.25, -.25) + sample(-.25, .25) + sample(.25, .25)) *
          (front ? 0.86 : 0.5) / 4;
      }
      const soft = 0.96 + 0.04 * (1 - y / height), o = (y * width + x) * 4;
      data[o] = 255 * soft * (1 + (ink[0] - 1) * mark);
      data[o + 1] = 255 * soft * (1 + (ink[1] - 1) * mark);
      data[o + 2] = 255 * soft * (1 + (ink[2] - 1) * mark);
      data[o + 3] = 255; // stored as sRGB bytes
    }
  const texture = new Texture3D({ width, height, data }, {
    wrapS: 'repeat', wrapT: 'clamp', minFilter: 'linear', magFilter: 'linear', mipmaps: true, anisotropy: 4,
  });
  patternCache.set(skin, { patch: skin.patch, pattern: skin.pattern, texture });
  return texture;
}

// The portraits' expressions also read in 3D through ear shape, eyes and posture.
const FEATURES = {
  bamboo: { earTilt: 0.3, eyeOpen: 0.76, eyeTilt: 0.21, bellyWidth: 0.65, cheek: 0xffacba },
  peach: { earSize: 1.07, earY: 0.39, earTilt: 0.13, eyeOpen: 0.62, eyeTilt: -0.13, headTilt: 0.08, smile: 0.024, cheek: 0xffe7d0 },
  ocean: { earSpan: 0.39, earTilt: 0.37, eyeOpen: 0.96, eyeTilt: 0.18, headTilt: -0.06, smile: 0.017, cheek: 0xffa7bf },
  mango: { earSize: 1.04, earTilt: 0.05, eyeOpen: 0.58, eyeTilt: -0.19, headTilt: -0.07, bellyWidth: 0.69, cheek: 0xff9b92 },
  grape: { earY: 0.42, earTilt: 0.12, eyeOpen: 1.08, wink: 1, headTilt: 0.12, bellyWidth: 0.62, smile: 0.024, cheek: 0xffccdf },
  classic: { earSpan: 0.4, earSize: 1.08, eyeOpen: 1.08, headTilt: -0.03, bellyWidth: 0.67, cheek: 0xffaabf },
  cherry: { earSpan: 0.37, earTilt: 0.24, eyeOpen: 1.08, wink: -1, headTilt: -0.11, smile: 0.023, cheek: 0xffdfd0 },
  mint: { earSpan: 0.38, earY: 0.38, earTilt: 0.17, eyeOpen: 0.63, eyeTilt: -0.14, bellyWidth: 0.69, smile: 0.028, cheek: 0xffb3bd },
};

const ball = createSphereGeometry3D({ radius: 1, widthSegments: 28, heightSegments: 18 });
const smallBall = createSphereGeometry3D({ radius: 1, widthSegments: 14, heightSegments: 10 });
// How strongly the body glows at rest.
const GLOW = 0.065;
const shine = createUnlitMaterial3D({ color: 0xfffbe9, opacity: 0.38, alphaMode: 'blend', depthWrite: false });
const eyeWhite = createUnlitMaterial3D({ color: 0xffffff }),
  eyeDark = createStandardMaterial3D({ color: 0x131522, roughness: 0.18 });
eyeDark.clearcoat = 0.65;
eyeDark.clearcoatRoughness = 0.16;

const TURN = 2 * Math.PI;
const RESTED = 0.62;
const ease = (rate, dt) => 1 - Math.exp(-rate * dt);

/** The contact pose reads for roughly one frame, then the gel springs through rest. */
function rebound(age, frequency, damping) {
  if (age >= RESTED) return 0;
  const recovery = Math.max(0, age - 0.025);
  return Math.exp(-damping * recovery) * Math.cos(TURN * frequency * recovery);
}

/**
 * Build one panda. With `jelly` false the body uses a plain glossy material,
 * for devices where the see-through pass is too slow.
 */
export function createPanda(skin, jelly = true) {
  const {
    bellyWidth = 0.64,
    earSpan = 0.36,
    earY = 0.36,
    earSize = 1,
    earTilt = 0.2,
    eyeOpen = 1,
    eyeTilt = 0,
    headTilt = 0,
    smile = 0.014,
    wink = 0,
    cheek = 0xffa9be,
  } = FEATURES[skin.key] ?? {};
  const tint = rgb(skin.body),
    map = patternTexture(skin);
  const cheekMaterial = createUnlitMaterial3D({ color: cheek, opacity: 0.82, alphaMode: 'blend', depthWrite: false });
  // A gummy has both a coloured core and a soft lacquer highlight. Limit
  // transmission to the body/head/tail; opaque chocolate-like patches and
  // limbs stay readable against the refracting head and reduce blend draws.
  const bodyMaterial = jelly
    ? createGlassMaterial3D({
        color: skin.body,
        map,
        roughness: 0.22,
        thickness: 0.48,
        ior: 1.39,
        transmission: 0.65,
        environmentIntensity: 1.2,
      })
    : createStandardMaterial3D({ color: skin.body, map, roughness: 0.3, environmentIntensity: 1.1 });
  const headMaterial = jelly
    ? createGlassMaterial3D({
        color: skin.body,
        roughness: 0.19,
        thickness: 0.37,
        ior: 1.39,
        transmission: 0.68,
        environmentIntensity: 1.2,
      })
    : createStandardMaterial3D({ color: skin.body, roughness: 0.26, environmentIntensity: 1.1 });
  const patchMaterial = createStandardMaterial3D({ color: skin.patch, roughness: 0.26, environmentIntensity: 1.12 });
  if (jelly) {
    for (const material of [bodyMaterial, headMaterial]) {
      material.attenuationColor.set(tint);
      material.attenuationDistance = 1.35;
    }
  }
  // Native clearcoat adds a second, soft highlight without extra geometry.
  for (const material of [bodyMaterial, headMaterial]) {
    material.clearcoat = 0.62;
    material.clearcoatRoughness = 0.18;
    material.setEmissive(tint);
    material.emissiveIntensity = GLOW;
  }
  patchMaterial.clearcoat = 0.48;
  patchMaterial.clearcoatRoughness = 0.22;

  // root: where the panda stands and which way it faces.
  // pose: slow, held shapes (crouching to charge a jump, lying down).
  // pivot: the middle of the body, so a roll spins around it.
  const root = new Object3D(),
    pose = new Object3D(),
    pivot = new Object3D();
  root.addChild(pose);
  pose.addChild(pivot);
  pivot.setPosition(0, 0.78, 0);
  /** Add one scaled ball to the panda. */
  const piece = (geometry, material, x, y, z, sx, sy = sx, sz = sx, parent = pivot) => {
    const mesh = new Mesh3D(geometry, material);
    mesh.setPosition(x, y, z);
    mesh.setScale(sx, sy, sz);
    mesh.castShadow = true;
    parent.addChild(mesh);
    return mesh;
  };
  const detail = (...args) => {
    const mesh = piece(...args);
    mesh.castShadow = false;
    return mesh;
  };
  const glowing = [piece(ball, bodyMaterial, 0, -0.14, 0, bellyWidth, 0.6, 0.58)];
  const head = new Object3D();
  head.setPosition(0, 0.56, 0.04);
  pivot.addChild(head);
  glowing.push(piece(ball, headMaterial, 0, 0, 0, 0.52, 0.46, 0.46, head));
  const makeEar = (side) =>
    piece(smallBall, patchMaterial, side * earSpan, earY, -0.02, 0.18 * earSize, 0.17 * earSize, 0.12, head);
  const earL = makeEar(-1),
    earR = makeEar(1);
  // Face: eye patches, eyes that blink, a nose, a small mouth and rosy cheeks.
  const eyes = [];
  for (const side of [-1, 1]) {
    // The patches sit above, not inside, the refracting front surface.
    const patch = piece(smallBall, patchMaterial, side * 0.19, 0.04, 0.418, 0.147, 0.181, 0.058, head);
    patch.setRotation(0, side * 0.35, side * (-0.35 + eyeTilt * 0.6));
    const eye = new Object3D();
    eye.setPosition(side * 0.19, 0.06, 0.477);
    eye.setRotation(0, 0, side * eyeTilt);
    head.addChild(eye);
    detail(smallBall, eyeWhite, 0, 0, 0, 0.075, 0.07, 0.025, eye);
    detail(smallBall, eyeDark, side * -0.004, -0.004, 0.021, 0.049, 0.047, 0.016, eye);
    detail(smallBall, eyeWhite, -0.016, 0.019, 0.037, 0.016, 0.014, 0.006, eye); // catch-light
    eyes.push({ eye, winks: side === wink });
    detail(smallBall, cheekMaterial, side * 0.3, -0.085, 0.381, 0.076, 0.038, 0.018, head);
  }
  detail(smallBall, eyeDark, 0, -0.052, 0.464, 0.052, 0.031, 0.029, head); // nose
  const mouth = detail(smallBall, eyeDark, 0, -0.135, 0.453, 0.051, 0.012, 0.014, head);
  // A soft highlight on the brow and the belly sells the wet, glossy surface.
  detail(smallBall, shine, -0.205, 0.267, 0.34, 0.112, 0.036, 0.018, head).setRotation(-0.6, -0.4, 0.4);
  detail(smallBall, shine, -0.28, 0.15, 0.43, 0.115, 0.042, 0.018).setRotation(-0.4, -0.5, 0.5);
  const armL = new Object3D(),
    armR = new Object3D(),
    legL = new Object3D(),
    legR = new Object3D();
  armL.setPosition(-0.56, 0.12, 0.06);
  armR.setPosition(0.56, 0.12, 0.06);
  legL.setPosition(-0.3, -0.52, 0.04);
  legR.setPosition(0.3, -0.52, 0.04);
  for (const limb of [armL, armR, legL, legR]) pivot.addChild(limb);
  piece(smallBall, patchMaterial, 0, -0.14, 0, 0.16, 0.26, 0.16, armL);
  piece(smallBall, patchMaterial, 0, -0.14, 0, 0.16, 0.26, 0.16, armR);
  piece(smallBall, patchMaterial, 0, -0.1, 0.03, 0.2, 0.17, 0.24, legL);
  piece(smallBall, patchMaterial, 0, -0.1, 0.03, 0.2, 0.17, 0.24, legR);
  glowing.push(piece(smallBall, headMaterial, 0, -0.3, -0.55, 0.13)); // tail

  // The engine's jelly reshapes every mesh under the panda: it flattens along
  // each knock, springs back and lets the head trail behind sudden moves.
  const wobble = createJelly3D(root, {
    stiffness: 3.4,
    damping: 0.24,
    squash: 0.43,
    sensitivity: 0.037,
    wobble: 0.032,
    height: 1.75,
    base: 0,
    idle: 0.021,
    idleRate: 0.55,
  });
  // The jelly gave each mesh its own material; these are the ones that flash when hurt.
  const glowMaterials = glowing.map((mesh) => mesh.material);
  const UP = [0, 1, 0],
    knock = [0, 0, 0];

  let seen = false,
    wasGrounded = true,
    gait = 0,
    forwardLean = 0,
    turnBank = 0,
    rollTuck = 0,
    headFollowPitch = 0,
    headFollowSway = 0,
    takeoffAge = RESTED,
    takeoffStretch = 0,
    landingAge = RESTED,
    landingSquash = 0,
    hurtAge = RESTED,
    hurtStrength = 0,
    hurtX = 0,
    hurtZ = 0;

  const panda = {
    node: root,
    skin,
    jelly: wobble,
    // Held pose: vertical stretch, 1 at rest.
    stretch: 1,
    roll: 0,
    step: 0,
    lie: 0,
    yaw: 0,
    blink: 2 + Math.random() * 3,
    lastX: 0,
    lastY: 0,
    lastZ: 0,
    /** Knock the jelly up (positive) or down (negative); `amount` is a change of speed in metres per second. */
    kick(amount) {
      wobble.impact(UP, amount);
    },
    /** Knock the jelly along the ground, away from a blow at (fromX, fromZ). */
    shove(fromX, fromZ, x, z, amount) {
      knock[0] = x - fromX;
      knock[2] = z - fromZ;
      if (knock[0] || knock[2]) wobble.impact(knock, amount);
    },
    /** Release a loaded jump into a short, taller silhouette. */
    launch(power) {
      const charge = Math.min(1, Math.max(0, power));
      takeoffAge = 0;
      takeoffStretch = 0.14 + 0.09 * charge;
      landingAge = RESTED;
      this.stretch = Math.max(this.stretch, 1);
      wobble.impact(UP, -2.5 - charge * 2);
    },
    /** Ground contact compresses the body before it rebounds. */
    land(fall, slammed = false) {
      landingAge = 0;
      landingSquash = slammed ? 0.36 + Math.min(0.05, fall * 0.012) : Math.min(0.32, 0.16 + fall * 0.035);
      takeoffAge = RESTED;
      this.stretch = Math.min(this.stretch, 1);
      wobble.impact(UP, slammed ? 4 : Math.min(3.4, 1.5 + fall * 0.65));
    },
    /** Briefly bend away from a hit, using its world-space direction. */
    hurt(dx, dz, amount) {
      const speed = Math.hypot(dx, dz);
      hurtAge = 0;
      hurtStrength = 0.58 + Math.min(0.42, amount / 60);
      hurtX = speed > 0 ? dx / speed : 0;
      hurtZ = speed > 0 ? dz / speed : 0;
      if (speed > 0) this.shove(0, 0, hurtX, hurtZ, 4 + hurtStrength * 2.6);
      else wobble.impact(UP, 2.6);
    },
    /**
     * Follow a simulated panda. `state` carries x, y, z, facing, speedNow,
     * grounded, rolling, slamming, charge, down, hurtFlash and iframe.
     */
    update(dt, state, time) {
      // Turn toward the heading the short way round.
      let turn = state.facing - this.yaw;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      this.yaw += turn * ease(14, dt);
      // Teleports clear the previous movement rather than giving the rig an artificial collision.
      if (seen && Math.hypot(state.x - this.lastX, state.y - this.lastY, state.z - this.lastZ) > 2.5) {
        wobble.reset();
        takeoffAge = landingAge = hurtAge = RESTED;
        gait = forwardLean = turnBank = rollTuck = headFollowPitch = headFollowSway = this.roll = 0;
        wasGrounded = state.grounded;
      }
      seen = true;
      this.lastX = state.x;
      this.lastY = state.y;
      this.lastZ = state.z;
      root.setPosition(state.x, state.y, state.z);
      root.setRotation(0, this.yaw, 0);

      const moving = state.grounded && state.speedNow > 0.8 && !state.down,
        stepping = moving && !state.rolling,
        pace = Math.min(1, state.speedNow / 6.8),
        loading = state.grounded && state.charge > 0,
        dive = state.slamming && !state.down;
      const motionEase = ease(16, dt);
      gait += ((stepping ? pace : 0) - gait) * motionEase;
      this.step = (this.step + dt * gait * (6 + state.speedNow * 0.9)) % TURN;
      const swing = Math.sin(this.step) * gait,
        footfall = Math.cos(this.step * 2);
      forwardLean += ((dive ? 0.5 : moving ? pace * 0.3 : 0) - forwardLean) * motionEase;
      turnBank += ((moving ? -Math.max(-0.3, Math.min(0.3, turn * 0.28)) * pace : 0) - turnBank) * motionEase;
      this.lie += ((state.down ? 1 : 0) - this.lie) * ease(6, dt);
      rollTuck += ((state.rolling && !state.down ? 1 : 0) - rollTuck) * ease(state.rolling ? 20 : 10, dt);
      if (state.rolling && !state.down) this.roll = ((this.roll + dt * state.speedNow * 1.6 + Math.PI) % TURN) - Math.PI;
      else this.roll *= Math.exp(-9.5 * dt);

      takeoffAge = Math.min(RESTED, takeoffAge + dt);
      landingAge = Math.min(RESTED, landingAge + dt);
      hurtAge = Math.min(RESTED, hurtAge + dt);
      if (state.grounded && !wasGrounded && !state.down && landingAge > 0.15) {
        // Short drops below the game's landing-SFX threshold still touch down softly.
        landingAge = 0;
        landingSquash = 0.11;
        takeoffAge = RESTED;
      }
      wasGrounded = state.grounded;

      const takeoff = takeoffStretch * rebound(takeoffAge, 3.7, 11.5),
        landing = -landingSquash * rebound(landingAge, 5.4, 9.8),
        flinch = hurtStrength * rebound(hurtAge, 4.2, 10.5);
      const rising = Math.max(0, state.motor?.velocity[1] ?? 0);
      const rest = state.down
        ? 0.6
        : dive
          ? 1.28
          : state.rolling
            ? 0.82
            : loading
              ? 1 - Math.min(0.41, state.charge * 0.56)
              : state.grounded
                ? 1 - 0.018 * gait
                : 1 + Math.min(0.1, rising * 0.008);
      this.stretch += (rest - this.stretch) * motionEase;
      const stride = gait * (loading ? 0.017 : 0.066),
        height = Math.max(0.55, Math.min(1.42, this.stretch - stride * footfall + takeoff + landing - flinch * 0.11)),
        wide = 1 / Math.sqrt(height),
        // Preserve approximate volume while letting the forward axis
        // stretch slightly in flight/roll, rather than only scaling a sphere.
        directional = 1 + rollTuck * 0.11 + Math.max(0, takeoff) * 0.22 - Math.max(0, -landing) * 0.18;
      pose.setScale(wide / Math.sqrt(directional), height, wide * Math.sqrt(directional));

      const cosYaw = Math.cos(this.yaw),
        sinYaw = Math.sin(this.yaw),
        awaySide = hurtX * cosYaw - hurtZ * sinYaw,
        awayForward = hurtX * sinYaw + hurtZ * cosYaw,
        pitch = forwardLean + awayForward * flinch * 0.34,
        sway = swing * 0.1 + (1 - gait) * Math.sin(time * 1.8) * 0.02 + turnBank - awaySide * flinch * 0.34,
        bob = gait * (1 - footfall) * 0.028;
      pivot.setRotation(this.roll + pitch - this.lie * 1.45, 0, sway);
      pivot.setPosition(0, 0.78 + bob + landing * 0.07 - this.lie * 0.42, 0);
      // The head's inertia follows the torso instead of moving as a joined
      // solid toy. It recovers fast enough to keep the face readable.
      headFollowPitch += ((-pitch * 0.56 + landing * 0.5 - takeoff * 0.48) - headFollowPitch) * ease(11, dt);
      headFollowSway += ((-sway * 1.5) - headFollowSway) * ease(10, dt);
      head.setRotation(
        Math.sin(time * 2.3) * 0.04 - (state.charge > 0.1 ? 0.2 : 0) + headFollowPitch - rollTuck * 0.22,
        0,
        headFollowSway + (moving ? headTilt * 0.5 : headTilt),
      );
      const charge = loading ? Math.min(1, state.charge) : 0;
      const reach = dive ? -2.6 : state.grounded ? -charge * 0.45 : -1.3;
      // Tuck the paws substantially into the rolling silhouette, then
      // release them through the spring on braking/contact.
      armL.setPosition(-0.56 + rollTuck * 0.14, 0.12 - rollTuck * 0.13, 0.06 + rollTuck * 0.22);
      armR.setPosition(0.56 - rollTuck * 0.14, 0.12 - rollTuck * 0.13, 0.06 + rollTuck * 0.22);
      legL.setPosition(-0.3 + rollTuck * 0.08, -0.52 + rollTuck * 0.09, 0.04 + rollTuck * 0.15);
      legR.setPosition(0.3 - rollTuck * 0.08, -0.52 + rollTuck * 0.09, 0.04 + rollTuck * 0.15);
      const airborneSplay = state.grounded ? 0 : 0.6;
      armL.setRotation(swing * 0.8 + reach - rollTuck * 0.8, 0, -0.25 - airborneSplay + rollTuck * 0.55);
      armR.setRotation(-swing * 0.8 + reach - rollTuck * 0.8, 0, 0.25 + airborneSplay - rollTuck * 0.55);
      legL.setRotation(-swing * 0.7 - rollTuck * 0.85, 0, 0);
      legR.setRotation(swing * 0.7 - rollTuck * 0.85, 0, 0);
      const earRoll = earTilt + wobble.amount * 0.93 - landing * 0.58 + takeoff * 0.42 + charge * 0.16 + rollTuck * 0.24;
      earL.setRotation(0, -earTilt * 0.5, earRoll);
      earR.setRotation(0, earTilt * 0.5, -earRoll);
      // Eyes: a blink every few seconds, squeezed shut while hurt or down, wide open in the air.
      this.blink -= dt;
      if (this.blink < -0.12) this.blink = 2 + Math.random() * 4;
      const shut = state.down || state.hurtFlash > 0 || this.blink < 0,
        contactBlink = landingAge < 0.07 ? 0.32 : 1,
        open = (state.grounded ? eyeOpen : 1.24) * contactBlink * (1 - charge * 0.32) * (1 - rollTuck * 0.5);
      for (const { eye, winks } of eyes) {
        eye.setScale(1, shut || (winks && state.grounded && !moving && !loading) ? 0.12 : Math.max(0.18, open), 1);
      }
      const effort = shut || dive || (!state.grounded && !state.rolling);
      mouth.setScale(effort ? 0.04 : 0.053 + charge * 0.008, effort ? 0.033 : smile * (1 - charge * 0.38 + rollTuck * 0.14), 0.014);
      // A quick bloom follows the hit without obscuring the recovery or the face.
      const flash = Math.max(0, 1 - hurtAge / 0.22);
      const glow = GLOW + 0.88 * hurtStrength * flash * flash;
      for (const material of glowMaterials) material.emissiveIntensity = glow;
      root.visible = state.down || !(state.iframe > 0.5 && Math.floor(time * 14) % 2 === 0);
      if (dt > 0) wobble.update(dt);
    },
  };
  return panda;
}
