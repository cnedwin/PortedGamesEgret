// A small geometry builder. The map is hundreds of boxes; drawing each one
// separately would cost a draw call apiece, so boxes that share a surface are
// written into one geometry. Texture coordinates follow world size, so a
// surface keeps the same grain whatever the box's shape.
import { createGeometry3D } from '@egret/engine/world3d';

/** Colours are written as they look on screen; the renderer lights linear values. */
export const linear = (v) => Math.pow(v, 2.2);
export const rgb = (hex) => [linear(((hex >> 16) & 255) / 255), linear(((hex >> 8) & 255) / 255), linear((hex & 255) / 255)];

// The six faces of a unit box: normal, then the two axes its texture runs along.
const FACES = [
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
];

export function createBuilder() {
  const positions = [],
    normals = [],
    uvs = [],
    colors = [],
    indices = [];
  const builder = {
    get empty() {
      return positions.length === 0;
    },
    /**
     * Add a box: centre, size, and options. `tile` is how many metres one
     * repeat of the texture covers; `tint` an [r, g, b] in linear values;
     * `yaw` turns the box about its own centre; `skipBottom` leaves out the
     * face nobody sees; `fit` stretches one copy of the texture over each face.
     */
    box(x, y, z, w, h, d, { tile = 2, tint = [1, 1, 1], yaw = 0, pitch = 0, roll = 0, skipBottom = false, fit = false } = {}) {
      const half = [w / 2, h / 2, d / 2];
      const cy = Math.cos(yaw),
        sy = Math.sin(yaw),
        cp = Math.cos(pitch),
        sp = Math.sin(pitch),
        cr = Math.cos(roll),
        sr = Math.sin(roll);
      // Turn a local direction: roll about Z, then pitch about X, then yaw about Y.
      const turn = (v) => {
        const x1 = v[0] * cr - v[1] * sr,
          y1 = v[0] * sr + v[1] * cr,
          z1 = v[2];
        const y2 = y1 * cp - z1 * sp,
          z2 = y1 * sp + z1 * cp;
        return [x1 * cy + z2 * sy, y2, -x1 * sy + z2 * cy];
      };
      for (const face of FACES) {
        if (skipBottom && face.n[1] === -1) continue;
        const base = positions.length / 3,
          normal = turn(face.n);
        // Half-lengths of the face along its two texture axes.
        const hu = Math.abs(face.u[0] * half[0] + face.u[1] * half[1] + face.u[2] * half[2]),
          hv = Math.abs(face.v[0] * half[0] + face.v[1] * half[1] + face.v[2] * half[2]);
        for (const [su, sv] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ]) {
          const local = [0, 1, 2].map((k) => face.n[k] * half[k] + face.u[k] * hu * su + face.v[k] * hv * sv),
            p = turn(local);
          positions.push(x + p[0], y + p[1], z + p[2]);
          normals.push(normal[0], normal[1], normal[2]);
          colors.push(tint[0], tint[1], tint[2]);
          if (fit) uvs.push((su + 1) / 2, (sv + 1) / 2);
          else {
            // World-sized texture: measure along the face from the box's own centre plus its place in the world.
            const along = face.u[0] * x + face.u[1] * y + face.u[2] * z,
              up = face.v[0] * x + face.v[1] * y + face.v[2] * z;
            uvs.push((along + hu * su) / tile, (up + hv * sv) / tile);
          }
        }
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
      return builder;
    },
    /** Add an upright cylinder (or a cone when `top` is smaller), `sides` faces round. */
    cylinder(x, y, z, radius, height, { top = radius, sides = 16, tint = [1, 1, 1], tile = 2, axis = 'y', caps = true } = {}) {
      const place = (px, py, pz) =>
        axis === 'y' ? [x + px, y + py, z + pz] : axis === 'x' ? [x + py, y + px, z + pz] : [x + px, y + pz, z + py];
      const direction = (nx, ny, nz) => (axis === 'y' ? [nx, ny, nz] : axis === 'x' ? [ny, nx, nz] : [nx, nz, ny]);
      const base = positions.length / 3,
        slope = (radius - top) / height;
      for (let i = 0; i <= sides; i++) {
        const a = (i / sides) * Math.PI * 2,
          c = Math.cos(a),
          s = Math.sin(a),
          n = direction(c, slope, s),
          length = Math.hypot(n[0], n[1], n[2]);
        for (const [r, py, v] of [
          [radius, -height / 2, 0],
          [top, height / 2, height / tile],
        ]) {
          positions.push(...place(c * r, py, s * r));
          normals.push(n[0] / length, n[1] / length, n[2] / length);
          colors.push(tint[0], tint[1], tint[2]);
          uvs.push(((i / sides) * Math.PI * 2 * radius) / tile, v);
        }
      }
      for (let i = 0; i < sides; i++) {
        const a = base + i * 2;
        indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
      }
      if (caps)
        for (const [r, py, ny] of [
          [top, height / 2, 1],
          [radius, -height / 2, -1],
        ]) {
          const centre = positions.length / 3,
            n = direction(0, ny, 0);
          positions.push(...place(0, py, 0));
          normals.push(...n);
          colors.push(tint[0], tint[1], tint[2]);
          uvs.push(0.5, 0.5);
          for (let i = 0; i <= sides; i++) {
            const a = (i / sides) * Math.PI * 2;
            positions.push(...place(Math.cos(a) * r, py, Math.sin(a) * r));
            normals.push(...n);
            colors.push(tint[0], tint[1], tint[2]);
            uvs.push(0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5);
          }
          for (let i = 0; i < sides; i++)
            if (ny > 0) indices.push(centre, centre + i + 2, centre + i + 1);
            else indices.push(centre, centre + i + 1, centre + i + 2);
        }
      return builder;
    },
    /** Add a round bar from one point to another, `r0` thick at the start and `r1` at the end: limbs, barrels, pipes. */
    limb(from, to, r0, r1 = r0, { sides = 8, tint = [1, 1, 1], caps = true } = {}) {
      const axis = [to[0] - from[0], to[1] - from[1], to[2] - from[2]],
        length = Math.hypot(axis[0], axis[1], axis[2]) || 1;
      axis[0] /= length;
      axis[1] /= length;
      axis[2] /= length;
      // Two directions square to the bar and to each other.
      const helper = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const a = [
          axis[1] * helper[2] - axis[2] * helper[1],
          axis[2] * helper[0] - axis[0] * helper[2],
          axis[0] * helper[1] - axis[1] * helper[0],
        ],
        al = Math.hypot(a[0], a[1], a[2]);
      a[0] /= al;
      a[1] /= al;
      a[2] /= al;
      const b = [axis[1] * a[2] - axis[2] * a[1], axis[2] * a[0] - axis[0] * a[2], axis[0] * a[1] - axis[1] * a[0]];
      const base = positions.length / 3;
      for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2,
          c = Math.cos(angle),
          sn = Math.sin(angle),
          n = [a[0] * c + b[0] * sn, a[1] * c + b[1] * sn, a[2] * c + b[2] * sn];
        for (const [point, radius, v] of [
          [from, r0, 0],
          [to, r1, 1],
        ]) {
          positions.push(point[0] + n[0] * radius, point[1] + n[1] * radius, point[2] + n[2] * radius);
          normals.push(n[0], n[1], n[2]);
          colors.push(tint[0], tint[1], tint[2]);
          uvs.push(i / sides, v);
        }
      }
      for (let i = 0; i < sides; i++) {
        const k = base + i * 2;
        indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
      if (caps)
        for (const [point, radius, sign] of [
          [from, r0, -1],
          [to, r1, 1],
        ]) {
          const centre = positions.length / 3;
          positions.push(point[0], point[1], point[2]);
          normals.push(axis[0] * sign, axis[1] * sign, axis[2] * sign);
          colors.push(tint[0], tint[1], tint[2]);
          uvs.push(0.5, 0.5);
          for (let i = 0; i <= sides; i++) {
            const angle = (i / sides) * Math.PI * 2,
              c = Math.cos(angle) * radius,
              sn = Math.sin(angle) * radius;
            positions.push(point[0] + a[0] * c + b[0] * sn, point[1] + a[1] * c + b[1] * sn, point[2] + a[2] * c + b[2] * sn);
            normals.push(axis[0] * sign, axis[1] * sign, axis[2] * sign);
            colors.push(tint[0], tint[1], tint[2]);
            uvs.push(0.5, 0.5);
          }
          for (let i = 0; i < sides; i++)
            if (sign > 0) indices.push(centre, centre + i + 1, centre + i + 2);
            else indices.push(centre, centre + i + 2, centre + i + 1);
        }
      return builder;
    },
    /** Add a ball, or an egg shape when the three radii differ. */
    ball(x, y, z, rx, ry = rx, rz = rx, { sides = 10, rings = 7, tint = [1, 1, 1] } = {}) {
      const base = positions.length / 3;
      for (let r = 0; r <= rings; r++) {
        const polar = (r / rings) * Math.PI,
          sy = Math.cos(polar),
          sr = Math.sin(polar);
        for (let i = 0; i <= sides; i++) {
          const angle = (i / sides) * Math.PI * 2,
            nx = Math.cos(angle) * sr,
            nz = Math.sin(angle) * sr,
            // Normals of a stretched ball lean towards its flatter sides.
            lx = nx / rx,
            ly = sy / ry,
            lz = nz / rz,
            ll = Math.hypot(lx, ly, lz) || 1;
          positions.push(x + nx * rx, y + sy * ry, z + nz * rz);
          normals.push(lx / ll, ly / ll, lz / ll);
          colors.push(tint[0], tint[1], tint[2]);
          uvs.push(i / sides, r / rings);
        }
      }
      for (let r = 0; r < rings; r++)
        for (let i = 0; i < sides; i++) {
          const k = base + r * (sides + 1) + i;
          indices.push(k, k + 1, k + sides + 1, k + 1, k + sides + 2, k + sides + 1);
        }
      return builder;
    },
    /** Turn what was added into a geometry; `tangents` are needed by surfaces with a normal map. */
    finish({ tangents = false } = {}) {
      const geometry = createGeometry3D({ positions, normals, uvs, colors, indices });
      if (tangents) geometry.computeTangents();
      return geometry;
    },
  };
  return builder;
}

/** Point a node: turn `yaw` about up, then tilt `pitch` (positive looks up), then `roll` about its own forward axis. */
export function orient(node, yaw, pitch = 0, roll = 0) {
  const cy = Math.cos(yaw / 2),
    sy = Math.sin(yaw / 2),
    cx = Math.cos(pitch / 2),
    sx = Math.sin(pitch / 2),
    cz = Math.cos(roll / 2),
    sz = Math.sin(roll / 2);
  const x = cy * sx,
    y = sy * cx,
    z = -sy * sx,
    w = cy * cx;
  node.setQuaternion(x * cz + y * sz, y * cz - x * sz, z * cz + w * sz, w * cz - z * sz);
  return node;
}
