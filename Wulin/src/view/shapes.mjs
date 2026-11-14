// Building blocks for the models: shared primitive shapes, a way to merge
// coloured parts into one mesh, and the materials. Every model in the game is
// assembled from these in code, which keeps the download small and the
// triangle counts low enough for a phone.
//
// Surfaces are matt and lit as real ones are, and none is a flat colour: a
// part may shade from one tone at its foot to another at its top, and every
// mesh carries a painted grain (made here, not loaded) that mottles its
// colour and roughens the way it takes the light.
import {
  Mesh3D,
  createBoxGeometry3D,
  createConeGeometry3D,
  createCylinderGeometry3D,
  createGeometry3D,
  createGradientCubeTexture3D,
  createSphereGeometry3D,
  createStandardMaterial3D,
  Texture3D,
  createUnlitMaterial3D,
  mat4Compose,
  quatFromEuler,
} from '@egret/engine/world3d';

/** Colours are written as they look on screen and converted to the linear values the renderer lights. */
export const linear = (v) => Math.pow(v, 2.2);
/** 0xRRGGBB to linear [r, g, b]. */
export const rgb = (hex) => {
  // Colours are drawn back a little towards grey: pigment and stone are never as pure as a colour picked off a wheel.
  const r = ((hex >> 16) & 255) / 255,
    g = ((hex >> 8) & 255) / 255,
    b = (hex & 255) / 255,
    grey = r * 0.3 + g * 0.59 + b * 0.11,
    keep = 0.84;
  return [linear(grey + (r - grey) * keep), linear(grey + (g - grey) * keep), linear(grey + (b - grey) * keep)];
};
/**
 * A colour for a part of `build` that runs from a darker foot to a lighter top, as things
 * do that stand on the ground in daylight: `grad(0x4f7f3f)`, or with its own two strengths.
 */
export const grad = (hex, foot = 0.72, top = 1.12) => ({ foot: shade(hex, foot), top: shade(hex, top) });
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
/** A rounder ball, for heads and anything else looked at closely. */
export const ORB = createSphereGeometry3D({ radius: 1, widthSegments: 18, heightSegments: 12 });
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
    uvs = [],
    indices = [];
  const m = new Float32Array(16),
    turn = [0, 0, 0, 1];
  for (const [geometry, at, scale, color, rotation] of parts) {
    const p = geometry.getAttribute('position').data,
      n = geometry.getAttribute('normal').data,
      index = geometry.index?.data,
      base = positions.length / 3;
    const s = typeof scale === 'number' ? [scale, scale, scale] : scale,
      shaded = typeof color === 'object',
      c = shaded ? rgb(color.foot) : rgb(color),
      c2 = shaded ? rgb(color.top) : c;
    let low = Infinity,
      high = -Infinity;
    if (shaded) for (let i = 1; i < p.length; i += 3) (low = Math.min(low, p[i])), (high = Math.max(high, p[i]));
    quatFromEuler(turn, rotation?.[0] ?? 0, rotation?.[1] ?? 0, rotation?.[2] ?? 0);
    mat4Compose(m, at, turn, s);
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i],
        y = p[i + 1],
        z = p[i + 2];
      const wx = m[0] * x + m[4] * y + m[8] * z + m[12],
        wy = m[1] * x + m[5] * y + m[9] * z + m[13],
        wz = m[2] * x + m[6] * y + m[10] * z + m[14];
      positions.push(wx, wy, wz);
      // Normals take the rotation and the inverse of the scale.
      const nx = n[i] / s[0],
        ny = n[i + 1] / s[1],
        nz = n[i + 2] / s[2];
      const rx = (m[0] * nx) / s[0] + (m[4] * ny) / s[1] + (m[8] * nz) / s[2],
        ry = (m[1] * nx) / s[0] + (m[5] * ny) / s[1] + (m[9] * nz) / s[2],
        rz = (m[2] * nx) / s[0] + (m[6] * ny) / s[1] + (m[10] * nz) / s[2];
      const length = Math.hypot(rx, ry, rz) || 1;
      normals.push(rx / length, ry / length, rz / length);
      // The grain is laid on from whichever side the surface most nearly faces, so it never stretches.
      const ax = Math.abs(rx),
        ay = Math.abs(ry),
        az = Math.abs(rz);
      if (ay >= ax && ay >= az) uvs.push(wx * GRAIN_PER_METRE, wz * GRAIN_PER_METRE);
      else if (ax >= az) uvs.push(wz * GRAIN_PER_METRE, wy * GRAIN_PER_METRE);
      else uvs.push(wx * GRAIN_PER_METRE, wy * GRAIN_PER_METRE);
      if (shaded) {
        const k = (y - low) / (high - low || 1);
        colors.push(c[0] + (c2[0] - c[0]) * k, c[1] + (c2[1] - c[1]) * k, c[2] + (c2[2] - c[2]) * k);
      } else colors.push(c[0], c[1], c[2]);
    }
    if (index) for (let i = 0; i < index.length; i++) indices.push(index[i] + base);
    else for (let i = 0; i < p.length / 3; i++) indices.push(base + i);
  }
  return createGeometry3D({ positions, normals, colors, uvs, indices });
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
    uvs = [],
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
      uvs.push(x * GRAIN_PER_METRE, z * GRAIN_PER_METRE);
    }
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i,
        b = a + 1,
        c = a + nx + 1,
        d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  return createGeometry3D({ positions, normals, colors, uvs, indices });
}

/**
 * A part for `build`: a rod of a thickness and colour running from one point to another.
 * Ridge beams, rails, ropes and anything else that does not stand upright.
 */
export function beam(a, b, thickness, colour, geometry = ROD) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    dz = b[2] - a[2],
    length = Math.hypot(dx, dy, dz) || 1;
  return [geometry, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [thickness, length, thickness], colour, [0, Math.atan2(dz, -dx), Math.acos(Math.max(-1, Math.min(1, dy / length)))]];
}

/** The cel-shaded material every model shares: colour comes from the vertices. */
/** How many times the grain repeats in a metre. */
const GRAIN_PER_METRE = 0.42;

/** Smooth noise that repeats every `period` cells, from 0 to 1. */
function tiled(x, y, period) {
  const hash = (i, j) => {
    const n = Math.sin((((i % period) + period) % period) * 127.1 + (((j % period) + period) % period) * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const ix = Math.floor(x),
    iy = Math.floor(y),
    fx = x - ix,
    fy = y - iy,
    sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy);
  return (hash(ix, iy) * (1 - sx) + hash(ix + 1, iy) * sx) * (1 - sy) + (hash(ix, iy + 1) * (1 - sx) + hash(ix + 1, iy + 1) * sx) * sy;
}
/**
 * A pair of textures from a height function over the unit square: one that mottles colour
 * (lighter where the surface stands proud, with a little warmth and coolness wandering
 * across it) and one that tells the light which way each point leans.
 * @param height (u, v) => 0 to 1, repeating at the edges
 * @param depth  how strongly the surface is modelled
 * @param tint   how far the colour is mottled, 0 to 1
 */
function grain(height, { size = 128, depth = 2.2, tint = 0.22 } = {}) {
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) heights[y * size + x] = height(x / size, y / size);
  const colour = new Uint8Array(size * size * 4),
    normal = new Uint8Array(size * size * 4);
  const at = (x, y) => heights[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4,
        h = heights[y * size + x],
        drift = tiled((x / size) * 3 + 11, (y / size) * 3 + 5, 3) - 0.5;
      const value = 1 - tint + tint * h;
      colour[i] = Math.min(255, 255 * value * (1 + drift * 0.07));
      colour[i + 1] = Math.min(255, 255 * value);
      colour[i + 2] = Math.min(255, 255 * value * (1 - drift * 0.09));
      colour[i + 3] = 255;
      const dx = (at(x + 1, y) - at(x - 1, y)) * depth,
        dy = (at(x, y + 1) - at(x, y - 1)) * depth,
        length = Math.hypot(dx, dy, 1);
      normal[i] = 127.5 - (dx / length) * 127.5;
      normal[i + 1] = 127.5 - (dy / length) * 127.5;
      normal[i + 2] = 127.5 + (1 / length) * 127.5;
      normal[i + 3] = 255;
    }
  const options = { wrapS: 'repeat', wrapT: 'repeat', mipmaps: true, anisotropy: 4 };
  return { map: new Texture3D({ width: size, height: size, data: colour }, { ...options, colorSpace: 'srgb' }), normalMap: new Texture3D({ width: size, height: size, data: normal }, { ...options, colorSpace: 'linear' }) };
}
const octaves = (u, v, base) => tiled(u * base, v * base, base) * 0.5 + tiled(u * base * 2, v * base * 2, base * 2) * 0.27 + tiled(u * base * 4, v * base * 4, base * 4) * 0.15 + tiled(u * base * 8, v * base * 8, base * 8) * 0.08;
/** Plaster, stone, timber, earth and leaf alike: broad mottling with a fine tooth over it. */
const PAINTED = grain((u, v) => octaves(u, v, 4) * 0.75 + tiled(u * 48, v * 48, 48) * 0.25);
/** Courses of roof tiles: round-backed tiles in rows, each row overlapping the one below. */
const TILED = grain(
  (u, v) => {
    const across = Math.abs(((u * 6) % 1) - 0.5) * 2,
      down = (v * 5) % 1;
    return Math.sqrt(Math.max(0, 1 - across * across)) * 0.6 + down * 0.3 + tiled(u * 24, v * 24, 24) * 0.1;
  },
  { depth: 4, tint: 0.4 },
);
/** Woven cloth: a fine weave with slubs in the thread. */
const WOVEN = grain((u, v) => (Math.sin(u * Math.PI * 2 * 22) * 0.5 + 0.5) * 0.3 + (Math.sin(v * Math.PI * 2 * 22) * 0.5 + 0.5) * 0.3 + octaves(u, v, 5) * 0.4, { depth: 1.4, tint: 0.16 });

/** Foliage: clumps of leaves catching the light, with dark between them. */
const LEAFED = grain(
  (u, v) => {
    // Clumps of no fixed size or spacing, with a fine flicker of single leaves over them.
    const clump = octaves(u + 0.3, v + 0.7, 6),
      edge = Math.max(0, Math.min(1, (clump - 0.36) / 0.3));
    return edge * edge * (3 - 2 * edge) * 0.75 + tiled(u * 40, v * 40, 40) * 0.25;
  },
  { depth: 3, tint: 0.46 },
);

/**
 * A matt, lit material whose colour comes from the vertices and whose surface from a painted grain.
 * @param more.grain 'painted' (the default), 'tiled' for roofs, 'woven' for cloth or 'leafed' for foliage; anything else is passed on
 */
export const toon = ({ grain: kind = 'painted', steps, ...more } = {}) => {
  const surface = { painted: PAINTED, tiled: TILED, woven: WOVEN, leafed: LEAFED }[kind] ?? PAINTED;
  return createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 0.92, metallic: 0, map: surface.map, normalMap: surface.normalMap, normalScale: kind === 'tiled' ? 1.1 : kind === 'leafed' ? 1.0 : 0.7, ...more });
};
export const TOON = toon();
/** The material for trees, shrubs and grass. */
export const FOLIAGE = toon({ grain: 'leafed' });
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
