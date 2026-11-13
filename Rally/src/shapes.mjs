// Building blocks for the models: shared primitive geometries, a way to merge
// coloured parts into one mesh, colour conversion, and small textures made
// from pixels. Every model in the game is assembled from these in code.
import {
  Texture3D,
  createBoxGeometry3D,
  createConeGeometry3D,
  createCylinderGeometry3D,
  createGeometry3D,
  createSphereGeometry3D,
  createTorusGeometry3D,
  mat4Compose,
  quatFromEuler,
} from '@egret/engine/world3d';

/** Colours are written as they look on screen and converted to the linear values the renderer lights. */
export const linear = (v) => Math.pow(v, 2.2);
/** 0xRRGGBB to linear [r, g, b]. */
export const rgb = (hex) => [linear(((hex >> 16) & 255) / 255), linear(((hex >> 8) & 255) / 255), linear((hex & 255) / 255)];
/** Screen-space [r, g, b] (0 to 1) or 0xRRGGBB to linear [r, g, b]. */
const toLinear = (color) => (typeof color === 'number' ? rgb(color) : [linear(color[0]), linear(color[1]), linear(color[2])]);
/** Darken or lighten a 0xRRGGBB colour; `amount` 1 leaves it unchanged. */
export const shade = (hex, amount) => {
  const part = (shift) => Math.max(0, Math.min(255, Math.round(((hex >> shift) & 255) * amount)));
  return (part(16) << 16) | (part(8) << 8) | part(0);
};

// Unit-sized primitives; parts scale them into place.
export const SPHERE = createSphereGeometry3D({ radius: 1, widthSegments: 14, heightSegments: 10 });
export const CYLINDER = createCylinderGeometry3D({ radiusTop: 1, radiusBottom: 1, height: 1, radialSegments: 14 });
export const CONE = createConeGeometry3D({ radius: 1, height: 1, radialSegments: 12 });
export const BOX = createBoxGeometry3D({ width: 1, height: 1, depth: 1 });
export const TORUS = createTorusGeometry3D({ radius: 1, tube: 0.3, radialSegments: 8, tubularSegments: 20 });
/** Coarser versions for scenery that is drawn hundreds of times. */
export const BALL = createSphereGeometry3D({ radius: 1, widthSegments: 8, heightSegments: 5 });
export const ROD = createCylinderGeometry3D({ radiusTop: 1, radiusBottom: 1, height: 1, radialSegments: 7 });
export const SPIKE = createConeGeometry3D({ radius: 1, height: 1, radialSegments: 8 });
/** A four-sided pyramid with its edges along X and Z: a roof. */
export const PYRAMID = createConeGeometry3D({ radius: 1, height: 1, radialSegments: 4 });

/**
 * Merge parts into one geometry with a colour per part. Each part is
 * `[geometry, position, scale, colour, rotation]`: scale is a number or
 * [x, y, z], colour is 0xRRGGBB or screen-space [r, g, b], and rotation is
 * optional Euler angles in radians. Positions, normals and colours are kept.
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
      c = toLinear(color);
    quatFromEuler(turn, rotation?.[0] ?? 0, rotation?.[1] ?? 0, rotation?.[2] ?? 0);
    mat4Compose(m, at, turn, s);
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

/** A quaternion turning by `angle` around the Y axis, written into a shared array. */
const yawScratch = [0, 0, 0, 1];
export const yawQuat = (angle) => {
  yawScratch[1] = Math.sin(angle / 2);
  yawScratch[3] = Math.cos(angle / 2);
  return yawScratch;
};

/** A texture from a function giving [r, g, b, a] (0 to 255) for each pixel. */
export function paintTexture(width, height, pixel, options) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(pixel(x, y), (y * width + x) * 4);
  return new Texture3D({ width, height, data }, options);
}

/** A soft round dot for particles. */
export const dotTexture = () =>
  paintTexture(32, 32, (x, y) => {
    const d = Math.hypot(x - 15.5, y - 15.5) / 15.5;
    return [255, 255, 255, 255 * Math.max(0, 1 - d * d)];
  });

/** A texture drawn with the page's 2D canvas; used for the few surfaces that carry writing. */
export function canvasTexture(width, height, draw, options) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  draw(context, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  return new Texture3D({ width, height, data: new Uint8Array(pixels.data.buffer) }, options);
}

/** A repeatable random source for placing scenery, so the circuit looks the same on every visit. */
export function scatterSource(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
