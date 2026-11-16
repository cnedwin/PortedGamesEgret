// A sculptor. Shapes are described as soft solids (capsules, eggs, rounded boxes) that melt into one
// another; the surface of the whole is then found on a fine grid and written out as a dense mesh with
// smooth normals, colour, shadowing in its creases and, for people, the bones each point follows.
//
//   import { sculpt } from './sculpt.mjs'
//   const mesh = sculpt(solids, { cell: 0.01, bones: matrices })
//
// A solid: { kind: 'cap' | 'egg' | 'box', bone, colour, k (how softly it joins what is already there),
// cut (carve instead of add), fold (pleats: { n, amp }), flat (squash along z) } plus its own measures.

const mix = (a, b, t) => a + (b - a) * t;

function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
/** Smooth value noise in space, 0..1. */
export function noise3(x, y, z) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    iz = Math.floor(z),
    fx = x - ix,
    fy = y - iy,
    fz = z - iz,
    ux = fx * fx * (3 - 2 * fx),
    uy = fy * fy * (3 - 2 * fy),
    uz = fz * fz * (3 - 2 * fz);
  let total = 0;
  for (let c = 0; c < 8; c++) {
    const dx = c & 1,
      dy = (c >> 1) & 1,
      dz = c >> 2;
    total += hash3(ix + dx, iy + dy, iz + dz) * (dx ? ux : 1 - ux) * (dy ? uy : 1 - uy) * (dz ? uz : 1 - uz);
  }
  return total;
}

/** Bring a solid's measures from its bone's space into the model's, and note the ball that holds it. */
function prepare(solid, bones) {
  const m = bones?.[solid.bone] ?? { r: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] },
    out = { ...solid, k: solid.k ?? 0.02, flat: solid.flat ?? 1, m };
  // Points are taken into the bone's space for measuring, so a squashed or boxed solid keeps its axes.
  if (solid.kind === 'cap') {
    const reach = Math.hypot(solid.b[0] - solid.a[0], solid.b[1] - solid.a[1], solid.b[2] - solid.a[2]) / 2 + Math.max(solid.ra, solid.rb);
    out.centre = solid.a.map((v, i) => (v + solid.b[i]) / 2);
    out.reach = reach;
  } else if (solid.kind === 'egg') {
    out.centre = solid.c;
    out.reach = Math.max(...solid.r);
  } else {
    out.centre = solid.c;
    out.reach = Math.hypot(...solid.h) + (solid.round ?? 0);
  }
  out.reach += (solid.fold?.amp ?? 0) + (solid.rough?.amp ?? 0);
  out.world = toWorld(m, out.centre);
  return out;
}
const toWorld = (m, p) => [m.r[0] * p[0] + m.r[1] * p[1] + m.r[2] * p[2] + m.t[0], m.r[3] * p[0] + m.r[4] * p[1] + m.r[5] * p[2] + m.t[1], m.r[6] * p[0] + m.r[7] * p[1] + m.r[8] * p[2] + m.t[2]];
const toLocal = (m, x, y, z, out) => {
  const dx = x - m.t[0],
    dy = y - m.t[1],
    dz = z - m.t[2];
  out[0] = m.r[0] * dx + m.r[3] * dy + m.r[6] * dz;
  out[1] = m.r[1] * dx + m.r[4] * dy + m.r[7] * dz;
  out[2] = m.r[2] * dx + m.r[5] * dy + m.r[8] * dz;
};

const local = [0, 0, 0];
/** Distance from a point (in the model's space) to one solid. */
function distance(s, x, y, z) {
  toLocal(s.m, x, y, z, local);
  let px = local[0],
    py = local[1],
    pz = local[2],
    d;
  if (s.turn) {
    // The solid is turned about its own centre: z, then x, then y.
    px -= s.c[0];
    py -= s.c[1];
    pz -= s.c[2];
    const [cx, sx, cy, sy, cz, sz] = s.turnCS ?? (s.turnCS = [Math.cos(-s.turn[0]), Math.sin(-s.turn[0]), Math.cos(-s.turn[1]), Math.sin(-s.turn[1]), Math.cos(-s.turn[2]), Math.sin(-s.turn[2])]);
    let t = px * cy + pz * sy;
    pz = -px * sy + pz * cy;
    px = t;
    t = py * cx - pz * sx;
    pz = py * sx + pz * cx;
    py = t;
    t = px * cz - py * sz;
    py = px * sz + py * cz;
    px = t + s.c[0];
    py += s.c[1];
    pz += s.c[2];
  }
  if (s.kind === 'cap') {
    const ax = s.a[0],
      ay = s.a[1],
      az = s.a[2],
      bx = s.b[0] - ax,
      by = s.b[1] - ay,
      bz = s.b[2] - az,
      qx = px - ax,
      qy = py - ay,
      qz = (pz - az) / s.flat,
      bzf = bz / s.flat,
      t = Math.max(0, Math.min(1, (qx * bx + qy * by + qz * bzf) / (bx * bx + by * by + bzf * bzf)));
    d = Math.hypot(qx - bx * t, qy - by * t, qz - bzf * t) - mix(s.ra, s.rb, t);
    if (s.flat < 1) d *= s.flat + (1 - s.flat) * 0.5;
    if (s.fold) d += Math.sin(Math.atan2(qx - bx * t, qz - bzf * t) * s.fold.n + (s.fold.phase ?? 0)) * s.fold.amp * ((s.fold.from ?? 0) + t);
  } else if (s.kind === 'egg') {
    const qx = (px - s.c[0]) / s.r[0],
      qy = (py - s.c[1]) / s.r[1],
      qz = (pz - s.c[2]) / s.r[2],
      l = Math.hypot(qx, qy, qz);
    // A fair distance to an ellipsoid: exact on a ball, close enough near the surface otherwise.
    d = l < 1e-6 ? -Math.min(...s.r) : (l * (l - 1)) / Math.hypot(qx / s.r[0], qy / s.r[1], qz / s.r[2]);
  } else {
    const r = s.round ?? 0,
      qx = Math.abs(px - s.c[0]) - s.h[0] + r,
      qy = Math.abs(py - s.c[1]) - s.h[1] + r,
      qz = Math.abs(pz - s.c[2]) - s.h[2] + r;
    d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
  }
  if (s.rough) d += (noise3(x * s.rough.scale, y * s.rough.scale, z * s.rough.scale) - 0.5) * s.rough.amp;
  return d;
}

/** Distance to the whole figure. With `shade`, also the colour and the bones at that point. */
function field(solids, x, y, z, shade) {
  let d = 1e9;
  if (shade) (shade.colour = [0.5, 0.5, 0.5]), (shade.pull = []);
  for (let i = 0; i < solids.length; i++) {
    const s = solids[i],
      away = Math.hypot(x - s.world[0], y - s.world[1], z - s.world[2]) - s.reach;
    if (s.cut ? away > 0.02 : away > d + s.k) continue;
    const ds = distance(s, x, y, z),
      k = s.k;
    if (s.cut) {
      const h = Math.max(k - Math.abs(d + ds), 0) / k,
        carved = Math.max(d, -ds) + h * h * k * 0.25;
      if (shade && -ds > d - k) shade.colour = shade.colour.map((v, c) => mix(v, s.colour[c], Math.max(0, Math.min(1, 0.5 + (0.5 * (-ds - d)) / k))));
      d = carved;
      continue;
    }
    const h = Math.max(k - Math.abs(d - ds), 0) / k,
      t = Math.max(0, Math.min(1, 0.5 + (0.5 * (d - ds)) / k));
    if (shade) {
      if (d > 1e8) shade.colour = [...s.colour];
      else if (t > 0) shade.colour = shade.colour.map((v, c) => mix(v, s.colour[c], t));
      shade.pull.push([s.bone ?? 0, ds, s.also]);
    }
    d = Math.min(d, ds) - h * h * k * 0.25;
  }
  return d;
}

/**
 * Find the surface. Returns positions, normals, colours (0..1, lit as they look), and, when bones are
 * given, four bones and weights for every point.
 */
export function sculpt(list, { cell = 0.01, bones = null, soft = 0.035, mottle = 0.07, pad = 0.03 } = {}) {
  const solids = list.map((solid) => prepare(solid, bones));
  const lo = [1e9, 1e9, 1e9],
    hi = [-1e9, -1e9, -1e9];
  for (const s of solids)
    if (!s.cut)
      for (let c = 0; c < 3; c++) {
        lo[c] = Math.min(lo[c], s.world[c] - s.reach - pad);
        hi[c] = Math.max(hi[c], s.world[c] + s.reach + pad);
      }
  const n = [0, 1, 2].map((c) => Math.ceil((hi[c] - lo[c]) / cell) + 1),
    [nx, ny, nz] = n,
    values = new Float32Array(nx * ny * nz),
    at = (i, j, k) => (k * ny + j) * nx + i;
  // Measure in blocks: far from any surface a whole block takes one value.
  const B = 6,
    far = cell * B * 0.9 + 0.01;
  for (let k0 = 0; k0 < nz; k0 += B)
    for (let j0 = 0; j0 < ny; j0 += B)
      for (let i0 = 0; i0 < nx; i0 += B) {
        const mid = field(solids, lo[0] + (i0 + B / 2) * cell, lo[1] + (j0 + B / 2) * cell, lo[2] + (k0 + B / 2) * cell),
          skip = Math.abs(mid) > far + cell * B * 0.9;
        for (let k = k0; k < Math.min(nz, k0 + B); k++)
          for (let j = j0; j < Math.min(ny, j0 + B); j++)
            for (let i = i0; i < Math.min(nx, i0 + B); i++) values[at(i, j, k)] = skip ? mid : field(solids, lo[0] + i * cell, lo[1] + j * cell, lo[2] + k * cell);
      }
  // One point in every cell the surface passes through, at the middle of where it crosses the cell's edges.
  const index = new Int32Array(nx * ny * nz).fill(-1),
    positions = [];
  const EDGES = [
    [0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]
  ];
  const corner = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++)
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          corner[c] = values[at(i + (c & 1), j + ((c >> 1) & 1), k + (c >> 2))];
          if (corner[c] < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0,
          sy = 0,
          sz = 0,
          count = 0;
        for (const [a, b] of EDGES) {
          if (corner[a] < 0 === corner[b] < 0) continue;
          const t = corner[a] / (corner[a] - corner[b]);
          sx += mix(a & 1, b & 1, t);
          sy += mix((a >> 1) & 1, (b >> 1) & 1, t);
          sz += mix(a >> 2, b >> 2, t);
          count++;
        }
        index[at(i, j, k)] = positions.length / 3;
        positions.push(lo[0] + (i + sx / count) * cell, lo[1] + (j + sy / count) * cell, lo[2] + (k + sz / count) * cell);
      }
  // A quad across every grid edge the surface cuts, joining the four cells round that edge.
  const indices = [];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) indices.push(a, c, b, a, d, c);
    else indices.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++)
    for (let j = 1; j < ny - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const v = values[at(i, j, k)] < 0;
        if (v !== values[at(i + 1, j, k)] < 0) quad(index[at(i, j - 1, k - 1)], index[at(i, j, k - 1)], index[at(i, j, k)], index[at(i, j - 1, k)], !v);
        if (v !== values[at(i, j + 1, k)] < 0) quad(index[at(i - 1, j, k - 1)], index[at(i - 1, j, k)], index[at(i, j, k)], index[at(i, j, k - 1)], !v);
        if (v !== values[at(i, j, k + 1)] < 0) quad(index[at(i - 1, j - 1, k)], index[at(i, j - 1, k)], index[at(i, j, k)], index[at(i - 1, j, k)], !v);
      }
  // Dress every point: the way the surface faces, its colour, how deep it sits in a crease, its bones.
  const count = positions.length / 3,
    normals = new Float32Array(count * 3),
    colours = new Float32Array(count * 3),
    joints = bones ? new Uint8Array(count * 4) : null,
    weights = bones ? new Float32Array(count * 4) : null,
    shade = {},
    e = cell * 0.6;
  for (let v = 0; v < count; v++) {
    const x = positions[v * 3],
      y = positions[v * 3 + 1],
      z = positions[v * 3 + 2];
    let gx = field(solids, x + e, y, z) - field(solids, x - e, y, z),
      gy = field(solids, x, y + e, z) - field(solids, x, y - e, z),
      gz = field(solids, x, y, z + e) - field(solids, x, y, z - e);
    const gl = Math.hypot(gx, gy, gz) || 1;
    gx /= gl;
    gy /= gl;
    gz /= gl;
    normals.set([gx, gy, gz], v * 3);
    field(solids, x, y, z, shade);
    // Creases: step out along the normal; where the figure is still close by, less sky reaches the point.
    let open = 1;
    for (const [reach, weight] of [
      [0.02, 0.3],
      [0.05, 0.3],
      [0.11, 0.25],
      [0.2, 0.15]
    ])
      open -= weight * Math.max(0, Math.min(1, 1 - field(solids, x + gx * reach, y + gy * reach, z + gz * reach) / reach));
    const tone = (0.35 + 0.65 * Math.max(0, open)) * (1 - mottle / 2 + noise3(x * 45, y * 45, z * 45) * mottle * 0.6 + noise3(x * 9, y * 9, z * 9) * mottle * 0.4);
    for (let c = 0; c < 3; c++) colours[v * 3 + c] = shade.colour[c] * tone;
    if (bones) {
      // The nearer a solid, the more its bone holds the point; the four strongest are kept.
      let nearest = 1e9;
      for (const [, ds] of shade.pull) nearest = Math.min(nearest, ds);
      const share = new Map();
      for (const [bone, ds, also] of shade.pull) {
        const w = Math.exp(-(ds - nearest) / soft);
        if (also) {
          share.set(bone, (share.get(bone) ?? 0) + w * (1 - also[1]));
          share.set(also[0], (share.get(also[0]) ?? 0) + w * also[1]);
        } else share.set(bone, (share.get(bone) ?? 0) + w);
      }
      const top = [...share].sort((a, b) => b[1] - a[1]).slice(0, 4),
        total = top.reduce((sum, [, w]) => sum + w, 0);
      top.forEach(([bone, w], slot) => {
        joints[v * 4 + slot] = bone;
        weights[v * 4 + slot] = w / total;
      });
    }
  }
  return { positions: Float32Array.from(positions), normals, colours, joints, weights, indices: Uint32Array.from(indices), lo, hi };
}

/** Pack a mesh small: positions as 16-bit steps across its box, the rest as bytes. */
export function pack(mesh) {
  const count = mesh.positions.length / 3,
    size = mesh.hi.map((v, c) => v - mesh.lo[c]),
    wide = count > 65535,
    parts = [];
  const pos = new Uint16Array(count * 3);
  for (let i = 0; i < count * 3; i++) pos[i] = Math.round(((mesh.positions[i] - mesh.lo[i % 3]) / size[i % 3]) * 65535);
  parts.push(pos);
  parts.push(Int8Array.from(mesh.normals, (v) => Math.round(v * 127)));
  parts.push(Uint8Array.from(mesh.colours, (v) => Math.round(Math.min(1, Math.pow(Math.max(0, v), 1 / 2.2)) * 255)));
  if (mesh.joints) {
    parts.push(mesh.joints);
    // Weights as bytes that still add up to 255.
    const w = new Uint8Array(count * 4);
    for (let v = 0; v < count; v++) {
      let left = 255;
      for (let s = 3; s > 0; s--) {
        w[v * 4 + s] = Math.round(mesh.weights[v * 4 + s] * 255);
        left -= w[v * 4 + s];
      }
      w[v * 4] = Math.max(0, left);
    }
    parts.push(w);
  }
  parts.push(wide ? mesh.indices : Uint16Array.from(mesh.indices));
  const buffers = parts.map((part) => {
    const bytes = Buffer.from(part.buffer, part.byteOffset, part.byteLength),
      padding = (4 - (bytes.length % 4)) % 4;
    return padding ? Buffer.concat([bytes, Buffer.alloc(padding)]) : bytes;
  });
  return { bytes: Buffer.concat(buffers), info: { count, indices: mesh.indices.length, wide, skinned: !!mesh.joints, lo: mesh.lo.map((v) => +v.toFixed(4)), size: size.map((v) => +v.toFixed(4)) } };
}
