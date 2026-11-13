// Building blocks for the models: shared primitive shapes, a way to merge
// coloured parts into one mesh, and the cel-shaded materials. Every model in
// the game is assembled from these in code, which keeps the download small
// and the triangle counts low enough for a phone.
import {
  Mesh3D,
  createBoxGeometry3D,
  createConeGeometry3D,
  createCylinderGeometry3D,
  createGeometry3D,
  createGradientCubeTexture3D,
  createSphereGeometry3D,
  createToonMaterial3D,
  createUnlitMaterial3D,
  mat4Compose,
  quatFromEuler,
} from '@egret/engine/world3d';

/** Colours are written as they look on screen and converted to the linear values the renderer lights. */
export const linear = (v) => Math.pow(v, 2.2);
/** 0xRRGGBB to linear [r, g, b]. */
export const rgb = (hex) => [linear(((hex >> 16) & 255) / 255), linear(((hex >> 8) & 255) / 255), linear((hex & 255) / 255)];
/** '#rrggbb' to 0xRRGGBB. */
export const hexOf = (css) => parseInt(css.slice(1), 16);
/** Darken or lighten a 0xRRGGBB colour; `amount` 1 leaves it unchanged. */
export const shade = (hex, amount) => {
  const part = (shift) => Math.max(0, Math.min(255, Math.round(((hex >> shift) & 255) * amount)));
  return (part(16) << 16) | (part(8) << 8) | part(0);
};
/** Blend two 0xRRGGBB colours; `t` 0 gives the first. */
export const mix = (a, b, t) => {
  const part = (shift) => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
  return (part(16) << 16) | (part(8) << 8) | part(0);
};

// Unit-sized primitives; parts scale them into place. They are coarse on
// purpose: a figure is seen small and there may be forty on screen.
export const BALL = createSphereGeometry3D({ radius: 1, widthSegments: 10, heightSegments: 7 });
export const ROD = createCylinderGeometry3D({ radiusTop: 1, radiusBottom: 1, height: 1, radialSegments: 8 });
/** A cylinder narrower at the top: sleeves, robes, tree trunks. */
export const TAPER = createCylinderGeometry3D({ radiusTop: 0.6, radiusBottom: 1, height: 1, radialSegments: 8 });
export const SPIKE = createConeGeometry3D({ radius: 1, height: 1, radialSegments: 8 });
export const BOX = createBoxGeometry3D({ width: 1, height: 1, depth: 1 });
/** A four-sided pyramid with its edges along X and Z. */
export const PYRAMID = createConeGeometry3D({ radius: 1, height: 1, radialSegments: 4 });

/**
 * Merge parts into one geometry with a colour per part. Each part is
 * `[geometry, position, scale, colour, rotation]`: scale is a number or
 * [x, y, z], colour is 0xRRGGBB, and rotation is optional Euler angles in
 * radians. Positions, normals and colours are kept.
 */
export function build(parts) {
  const positions = [],
    normals = [],
    colors = [],
    indices = [];
  const m = new Float32Array(16),
    turn = [0, 0, 0, 1];
  for (const [geometry, at, scale, color, rotation] of parts) {
    const p = geometry.getAttribute('position').data,
      n = geometry.getAttribute('normal').data,
      index = geometry.index?.data,
      base = positions.length / 3;
    const s = typeof scale === 'number' ? [scale, scale, scale] : scale,
      c = rgb(color);
    quatFromEuler(turn, rotation?.[0] ?? 0, rotation?.[1] ?? 0, rotation?.[2] ?? 0);
    mat4Compose(m, at, turn, s);
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i],
        y = p[i + 1],
        z = p[i + 2];
      positions.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]);
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

/**
 * A surface over a rectangle from a height function, coloured by a second
 * function: roofs, hills and ground. The rectangle is `width` by `depth`
 * around the origin, cut into `nx` by `nz` cells.
 */
export function heightSurface(width, depth, nx, nz, height, colour) {
  const positions = [],
    normals = [],
    colors = [],
    indices = [];
  const at = (i, j) => [(i / nx - 0.5) * width, (j / nz - 0.5) * depth];
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) {
      const [x, z] = at(i, j);
      const y = height(x, z);
      positions.push(x, y, z);
      // The slope gives the normal.
      const e = 0.05,
        dx = (height(x + e, z) - height(x - e, z)) / (2 * e),
        dz = (height(x, z + e) - height(x, z - e)) / (2 * e),
        length = Math.hypot(dx, 1, dz);
      normals.push(-dx / length, 1 / length, -dz / length);
      const c = rgb(colour(x, z, y));
      colors.push(c[0], c[1], c[2]);
    }
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i,
        b = a + 1,
        c = a + nx + 1,
        d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  return createGeometry3D({ positions, normals, colors, indices });
}

/** The cel-shaded material every model shares: colour comes from the vertices. */
export const toon = (more) => createToonMaterial3D({ color: 0xffffff, vertexColors: true, steps: 3, ...more });
export const TOON = toon();
/** A flat colour that ignores the light: lanterns, sparks, the glow of a strike. */
export const glow = (hex, strength = 1.6) => {
  const c = rgb(hex);
  return createUnlitMaterial3D({ color: [c[0] * strength, c[1] * strength, c[2] * strength] });
};

/** A mesh from parts, set to cast and take shadows. */
export function model(parts, material = TOON, shadow = true) {
  const mesh = new Mesh3D(build(parts), material);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  return mesh;
}

/** A sky from three colours: straight up, the horizon and below it. */
export const skyOf = (top, horizon, ground) => createGradientCubeTexture3D(top, horizon, ground, 32);

/** A repeatable random source for placing scenery, so a place looks the same on every visit. */
export function scatter(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
