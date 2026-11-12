// The jelly pandas: a see-through body tinted with the skin's colour, darker
// jelly for ears, eye patches and limbs, and a pattern painted on the belly.
// Each panda wobbles on a spring so jumps, landings and hits read as jelly.
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
const fract = (v) => v - Math.floor(v);
const PATTERNS = {
  // Each returns how strongly the pattern colour shows at a point of the unwrapped body, 0 to 1.
  spots: (u, v) => {
    const x = fract(u * 8) - 0.5,
      y = fract(v * 5 + Math.floor(u * 8) * 0.5) - 0.5;
    return x * x + y * y < 0.07 ? 1 : 0;
  },
  stripes: (u, v) => (fract(v * 6) < 0.42 ? 1 : 0),
  checks: (u, v) => ((Math.floor(u * 10) + Math.floor(v * 6)) & 1 ? 1 : 0),
  waves: (u, v) => (fract(v * 5 + Math.sin(u * Math.PI * 8) * 0.12) < 0.35 ? 1 : 0),
  swirl: (u, v) => (fract(u * 4 + v * 3) < 0.4 ? 1 : 0),
  hearts: (u, v) => {
    const x = (fract(u * 7) - 0.5) * 2.6,
      y = (0.5 - fract(v * 4.5 + Math.floor(u * 7) * 0.5)) * 2.6 + 0.2,
      a = x * x + y * y - 1;
    return a * a * a - x * x * y * y * y < 0 ? 1 : 0;
  },
  stars: (u, v) => {
    const x = fract(u * 7) - 0.5,
      y = fract(v * 4.5 + Math.floor(u * 7) * 0.5) - 0.5,
      angle = Math.atan2(y, x),
      reach = 0.2 + 0.13 * Math.cos(angle * 5);
    return Math.hypot(x, y) < reach ? 1 : 0;
  },
  leaves: (u, v) => {
    const cell = Math.floor(u * 6),
      x = fract(u * 6) - 0.5,
      y = fract(v * 4 + cell * 0.37) - 0.5,
      turn = cell * 1.9,
      c = Math.cos(turn),
      n = Math.sin(turn),
      lx = x * c - y * n,
      ly = x * n + y * c;
    return (lx * lx) / 0.14 + (ly * ly) / 0.018 < 1 ? 1 : 0;
  },
};
/** Paint the skin's belly pattern into a texture that wraps around the body. */
function patternTexture(skin) {
  const width = 256,
    height = 128,
    data = new Uint8Array(width * height * 4),
    paint = PATTERNS[skin.pattern] ?? PATTERNS.spots,
    ink = [((skin.patch >> 16) & 255) / 255, ((skin.patch >> 8) & 255) / 255, (skin.patch & 255) / 255];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const u = x / width,
        v = y / height;
      // The pattern fades out toward the poles, where the unwrapped body pinches.
      const fade = Math.min(1, Math.sin(v * Math.PI) * 1.6),
        mark = paint(u, v) * fade * 0.72,
        o = (y * width + x) * 4;
      data[o] = 255 * (1 + (ink[0] - 1) * mark);
      data[o + 1] = 255 * (1 + (ink[1] - 1) * mark);
      data[o + 2] = 255 * (1 + (ink[2] - 1) * mark);
      data[o + 3] = 255; // stored as sRGB bytes
    }
  return new Texture3D({ width, height, data }, { wrapS: 'repeat', wrapT: 'clamp' });
}

const ball = createSphereGeometry3D({ radius: 1, widthSegments: 28, heightSegments: 18 });
const smallBall = createSphereGeometry3D({ radius: 1, widthSegments: 14, heightSegments: 10 });
// How strongly the body glows at rest.
const GLOW = 0.12;
const cheekPink = createUnlitMaterial3D({ color: 0xff9fb5, opacity: 0.75, alphaMode: 'blend', depthWrite: false }),
  shine = createUnlitMaterial3D({ color: 0xffffff, opacity: 0.5, alphaMode: 'blend', depthWrite: false });
const eyeWhite = createUnlitMaterial3D({ color: 0xffffff }),
  eyeDark = createStandardMaterial3D({ color: 0x14141c, roughness: 0.2 });

/**
 * Build one panda. With `jelly` false the body uses a plain glossy material,
 * for devices where the see-through pass is too slow.
 */
export function createPanda(skin, jelly = true) {
  const tint = rgb(skin.body),
    patchTint = rgb(skin.patch),
    map = patternTexture(skin);
  const bodyMaterial = jelly
    ? createGlassMaterial3D({
        color: skin.body,
        map,
        roughness: 0.14,
        thickness: 0.7,
        ior: 1.3,
        transmission: 0.85,
        environmentIntensity: 1.4,
      })
    : createStandardMaterial3D({ color: skin.body, map, roughness: 0.25, opacity: 0.9, alphaMode: 'blend' });
  const headMaterial = jelly
    ? createGlassMaterial3D({
        color: skin.body,
        roughness: 0.14,
        thickness: 0.6,
        ior: 1.3,
        transmission: 0.85,
        environmentIntensity: 1.4,
      })
    : createStandardMaterial3D({ color: skin.body, roughness: 0.25 });
  const patchMaterial = jelly
    ? createGlassMaterial3D({
        color: skin.patch,
        roughness: 0.2,
        thickness: 0.3,
        ior: 1.3,
        transmission: 0.55,
        environmentIntensity: 1.2,
      })
    : createStandardMaterial3D({ color: skin.patch, roughness: 0.3 });
  if (jelly) {
    for (const material of [bodyMaterial, headMaterial]) {
      material.attenuationColor.set(tint);
      material.attenuationDistance = 1.1;
    }
    patchMaterial.attenuationColor.set(patchTint);
    patchMaterial.attenuationDistance = 0.5;
  }
  // A faint glow keeps the jelly bright in shade.
  for (const material of [bodyMaterial, headMaterial]) {
    material.setEmissive(tint);
    material.emissiveIntensity = GLOW;
  }

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
  const glowing = [piece(ball, bodyMaterial, 0, -0.14, 0, 0.64, 0.6, 0.58)];
  const head = new Object3D();
  head.setPosition(0, 0.56, 0.04);
  pivot.addChild(head);
  glowing.push(piece(ball, headMaterial, 0, 0, 0, 0.5, 0.46, 0.46, head));
  const earL = piece(smallBall, patchMaterial, -0.36, 0.36, -0.02, 0.17, 0.17, 0.1, head),
    earR = piece(smallBall, patchMaterial, 0.36, 0.36, -0.02, 0.17, 0.17, 0.1, head);
  // Face: eye patches, eyes that blink, a nose, a small mouth and rosy cheeks.
  const eyes = [];
  for (const side of [-1, 1]) {
    const patch = piece(smallBall, patchMaterial, side * 0.19, 0.04, 0.38, 0.14, 0.18, 0.07, head);
    patch.setRotation(0, side * 0.35, side * -0.35);
    const eye = new Object3D();
    eye.setPosition(side * 0.19, 0.06, 0.445);
    head.addChild(eye);
    detail(smallBall, eyeWhite, 0, 0, 0, 0.068, 0.068, 0.03, eye);
    detail(smallBall, eyeDark, side * -0.006, -0.004, 0.022, 0.04, 0.04, 0.016, eye);
    detail(smallBall, eyeWhite, side * -0.02, 0.018, 0.036, 0.013, 0.013, 0.006, eye); // catch-light
    eyes.push(eye);
    detail(smallBall, cheekPink, side * 0.3, -0.09, 0.36, 0.07, 0.045, 0.02, head);
  }
  detail(smallBall, eyeDark, 0, -0.06, 0.458, 0.055, 0.036, 0.032, head); // nose
  const mouth = detail(smallBall, eyeDark, 0, -0.135, 0.44, 0.045, 0.014, 0.012, head);
  // A soft highlight on the brow and the belly sells the wet, glossy surface.
  detail(smallBall, shine, -0.17, 0.26, 0.3, 0.1, 0.05, 0.03, head).setRotation(-0.6, -0.4, 0.4);
  detail(smallBall, shine, -0.24, 0.12, 0.42, 0.13, 0.07, 0.03).setRotation(-0.4, -0.5, 0.5);
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
    stiffness: 3.1,
    damping: 0.2,
    squash: 0.45,
    sensitivity: 0.035,
    wobble: 0.05,
    height: 1.75,
    base: 0,
    idle: 0.018,
    idleRate: 0.55,
  });
  // The jelly gave each mesh its own material; these are the ones that flash when hurt.
  const glowMaterials = glowing.map((mesh) => mesh.material);
  const UP = [0, 1, 0],
    knock = [0, 0, 0];

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
    /**
     * Follow a simulated panda. `state` carries x, y, z, facing, speedNow,
     * grounded, rolling, slamming, charge, down, hurtFlash and iframe.
     */
    update(dt, state, time) {
      // Held shapes ease in; everything springy is left to the jelly.
      const rest = state.down ? 0.6 : state.slamming ? 1.28 : 1 - Math.min(0.4, state.charge * 0.55);
      this.stretch += (rest - this.stretch) * Math.min(1, dt * 16);
      const wide = 1 / Math.sqrt(this.stretch);
      pose.setScale(wide, this.stretch, wide);
      // Turn toward the heading the short way round.
      let turn = state.facing - this.yaw;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      this.yaw += turn * Math.min(1, dt * 14);
      root.setPosition(state.x, state.y, state.z);
      root.setRotation(0, this.yaw, 0);
      const moving = state.grounded && state.speedNow > 0.8 && !state.down;
      this.step += dt * (moving ? 6 + state.speedNow * 0.9 : 0);
      const swing = moving ? Math.sin(this.step) : 0,
        sway = moving ? Math.sin(this.step) * 0.07 : Math.sin(time * 1.8) * 0.02,
        bob = moving ? Math.abs(Math.cos(this.step)) * 0.06 : 0;
      this.lie += ((state.down ? 1 : 0) - this.lie) * Math.min(1, dt * 6);
      if (state.rolling) this.roll += dt * state.speedNow * 1.6;
      else this.roll *= Math.max(0, 1 - dt * 12);
      // Lean into the run and tip forward for a dive.
      const lean = state.slamming ? 0.5 : moving ? Math.min(0.22, state.speedNow * 0.022) : 0;
      pivot.setRotation(this.roll + lean + this.lie * -1.45, 0, sway);
      pivot.setPosition(0, 0.78 + bob - this.lie * 0.42, 0);
      head.setRotation(Math.sin(time * 2.3) * 0.04 - (state.charge > 0.1 ? 0.2 : 0) - lean * 0.6, 0, -sway * 1.5);
      const reach = state.slamming ? -2.6 : state.grounded ? 0 : -1.3;
      armL.setRotation(swing * 0.8 + reach, 0, -0.25 - (state.grounded ? 0 : 0.6));
      armR.setRotation(-swing * 0.8 + reach, 0, 0.25 + (state.grounded ? 0 : 0.6));
      legL.setRotation(-swing * 0.7, 0, 0);
      legR.setRotation(swing * 0.7, 0, 0);
      earL.setRotation(0, 0, 0.2 + wobble.amount * 0.8);
      earR.setRotation(0, 0, -0.2 - wobble.amount * 0.8);
      // Eyes: a blink every few seconds, squeezed shut while hurt or down, wide open in the air.
      this.blink -= dt;
      if (this.blink < -0.12) this.blink = 2 + Math.random() * 4;
      const shut = state.down || state.hurtFlash > 0 || this.blink < 0,
        open = shut ? 0.12 : state.grounded ? 1 : 1.2;
      for (const eye of eyes) eye.setScale(1, open, 1);
      mouth.setScale(state.grounded && !shut ? 0.045 : 0.035, state.grounded && !shut ? 0.014 : 0.035, 0.012);
      // Flash while hurt, blink while briefly untouchable.
      const glow = state.hurtFlash > 0 ? 1.4 : GLOW;
      for (const material of glowMaterials) material.emissiveIntensity = glow;
      root.visible = state.down || !(state.iframe > 0.5 && Math.floor(time * 14) % 2 === 0);
      if (dt > 0) wobble.update(dt);
    },
  };
  return panda;
}
