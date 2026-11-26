// A small shape builder. Everything in the game is modelled in code: boxes, tapered limbs and balls are
// written into one geometry with a colour at every corner, so a whole figure part or a whole building
// is drawn at once.
import { Mesh3D, createGeometry3D } from '@egret/engine/world3d';

/** Colours are written as they look on screen; the renderer lights linear values. */
export const rgb = (hex) => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255].map((v) => Math.pow(v, 2.2));
export const shade = (tint, k) => tint.map((v) => v * k);

export function createBuilder() {
  const positions = [],
    normals = [],
    uvs = [],
    colors = [],
    indices = [];
  const put = (p, n, tint, u = 0, v = 0) => {
    positions.push(p[0], p[1], p[2]);
    normals.push(n[0], n[1], n[2]);
    colors.push(tint[0], tint[1], tint[2]);
    uvs.push(u, v);
    return positions.length / 3 - 1;
  };
  const builder = {
    get empty() {
      return positions.length === 0;
    },
    /** A box: centre, size; `rx`, `ry`, `rz` turn it about its own centre (z first, then x, then y). */
    box(x, y, z, w, h, d, { tint = [1, 1, 1], rx = 0, ry = 0, rz = 0, top } = {}) {
      const cx = Math.cos(rx),
        sx = Math.sin(rx),
        cy = Math.cos(ry),
        sy = Math.sin(ry),
        cz = Math.cos(rz),
        sz = Math.sin(rz);
      const turn = (v) => {
        const x1 = v[0] * cz - v[1] * sz,
          y1 = v[0] * sz + v[1] * cz,
          y2 = y1 * cx - v[2] * sx,
          z2 = y1 * sx + v[2] * cx;
        return [x1 * cy + z2 * sy, y2, -x1 * sy + z2 * cy];
      };
      const faces = [
        [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
        [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
        [[0, 1, 0], [1, 0, 0], [0, 0, -1]],
        [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
        [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
        [[0, 0, -1], [-1, 0, 0], [0, 1, 0]]
      ];
      const half = [w / 2, h / 2, d / 2];
      for (const [n, u, v] of faces) {
        const normal = turn(n),
          colour = top && n[1] === 1 ? top : tint,
          corners = [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1]
          ].map(([su, sv]) => {
            const local = [0, 1, 2].map((k) => (n[k] + u[k] * su + v[k] * sv) * half[k]),
              p = turn(local);
            return put([x + p[0], y + p[1], z + p[2]], normal, colour, (su + 1) / 2, (sv + 1) / 2);
          });
        indices.push(corners[0], corners[1], corners[2], corners[0], corners[2], corners[3]);
      }
      return builder;
    },
    /** A round, tapered limb from `a` to `b`. `tintB` shades it along its length; `flat` squashes it front to back. */
    limb(a, b, ra, rb, { tint = [1, 1, 1], tintB = tint, sides = 8, caps = true, flat = 1 } = {}) {
      const axis = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
        length = Math.hypot(...axis) || 1e-6,
        w = axis.map((v) => v / length),
        ref = Math.abs(w[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0];
      let u = [ref[1] * w[2] - ref[2] * w[1], ref[2] * w[0] - ref[0] * w[2], ref[0] * w[1] - ref[1] * w[0]];
      const ul = Math.hypot(...u);
      u = u.map((v) => v / ul);
      const v = [w[1] * u[2] - w[2] * u[1], w[2] * u[0] - w[0] * u[2], w[0] * u[1] - w[1] * u[0]].map((c) => c * flat);
      const slope = (ra - rb) / length,
        rings = [];
      for (const [centre, r, colour] of [
        [a, ra, tint],
        [b, rb, tintB]
      ]) {
        const ring = [];
        for (let i = 0; i <= sides; i++) {
          const t = (i / sides) * Math.PI * 2,
            c = Math.cos(t),
            s = Math.sin(t),
            out = [0, 1, 2].map((k) => u[k] * c + v[k] * s),
            n = [0, 1, 2].map((k) => out[k] + w[k] * slope),
            nl = Math.hypot(...n) || 1;
          ring.push(put(centre.map((p, k) => p + out[k] * r), n.map((c2) => c2 / nl), colour, i / sides, centre === a ? 0 : 1));
        }
        rings.push(ring);
      }
      for (let i = 0; i < sides; i++) indices.push(rings[0][i], rings[1][i], rings[1][i + 1], rings[0][i], rings[1][i + 1], rings[0][i + 1]);
      if (caps)
        for (const [centre, r, dir, colour] of [
          [a, ra, -1, tint],
          [b, rb, 1, tintB]
        ]) {
          if (r < 1e-4) continue;
          const n = w.map((c) => c * dir),
            mid = put(centre, n, colour, 0.5, 0.5),
            rim = [];
          for (let i = 0; i <= sides; i++) {
            const t = (i / sides) * Math.PI * 2;
            rim.push(put(centre.map((p, k) => p + (u[k] * Math.cos(t) + v[k] * Math.sin(t)) * r), n, colour, 0.5, 0.5));
          }
          for (let i = 0; i < sides; i++) dir > 0 ? indices.push(mid, rim[i], rim[i + 1]) : indices.push(mid, rim[i + 1], rim[i]);
        }
      return builder;
    },
    /** A ball, or an egg: centre and three radii. */
    ball(x, y, z, rx, ry, rz, { tint = [1, 1, 1], sides = 10, rings = 6 } = {}) {
      const grid = [];
      for (let j = 0; j <= rings; j++) {
        const phi = (j / rings) * Math.PI,
          row = [];
        for (let i = 0; i <= sides; i++) {
          const theta = (i / sides) * Math.PI * 2,
            n = [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)],
            m = [n[0] / rx, n[1] / ry, n[2] / rz],
            ml = Math.hypot(...m) || 1;
          row.push(put([x + n[0] * rx, y + n[1] * ry, z + n[2] * rz], m.map((c) => c / ml), tint, i / sides, j / rings));
        }
        grid.push(row);
      }
      for (let j = 0; j < rings; j++) for (let i = 0; i < sides; i++) indices.push(grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j][i], grid[j + 1][i + 1], grid[j + 1][i]);
      return builder;
    },
    /** A flat sheet through four corners (counter-clockwise seen from its front); drawn from both sides by its material. */
    sheet(p0, p1, p2, p3, { tint = [1, 1, 1], tintB = tint } = {}) {
      const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]],
        e2 = [p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]];
      let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const nl = Math.hypot(...n) || 1;
      n = n.map((c) => c / nl);
      const i0 = put(p0, n, tint, 0, 0),
        i1 = put(p1, n, tint, 1, 0),
        i2 = put(p2, n, tintB, 1, 1),
        i3 = put(p3, n, tintB, 0, 1);
      indices.push(i0, i1, i2, i0, i2, i3);
      return builder;
    },
    geometry() {
      return createGeometry3D({ positions, normals, uvs, colors, indices });
    },
    mesh(material, { shadow = true } = {}) {
      const mesh = new Mesh3D(builder.geometry(), material);
      mesh.castShadow = shadow;
      mesh.receiveShadow = true;
      return mesh;
    }
  };
  return builder;
}
