// Small, hard-edged details complement the weathered, sculpted bodies. They are
// packed into the same mesh and material as the object that carries them.
const ink = (hex) => [16, 8, 0].map((shift) => (((hex >> shift) & 255) / 255) ** 2.2);
const OAK = ink(0x473428), VERMILION = ink(0x8b392d), EDGE = ink(0xb16c50),
  JADE = ink(0x315f61), SLATE = ink(0x566576), STONE = ink(0x81848a),
  GOLD = ink(0xb99a59), BRONZE = ink(0x527f75), PATINA = ink(0x325653),
  FROST = ink(0xb3c5cc);

const subtract = (a, b) => a.map((v, i) => v - b[i]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const length = Math.hypot(...a); return a.map((v) => v / length); };

function reliefMesh() {
  const positions = [], normals = [], colours = [], indices = [];
  function vertex(point, normal, tint) {
    const index = positions.length / 3;
    positions.push(...point);
    normals.push(...normal);
    colours.push(...tint);
    return index;
  }
  function face(points, tint) {
    const normal = unit(cross(subtract(points[1], points[0]), subtract(points[2], points[0])));
    const offset = positions.length / 3;
    for (const point of points) vertex(point, normal, tint);
    for (let corner = 1; corner + 1 < points.length; corner++) indices.push(offset, offset + corner, offset + corner + 1);
  }
  function box(x, y, z, w, h, d, tint) {
    const l = x - w / 2, r = x + w / 2, b = y - h / 2, t = y + h / 2, f = z + d / 2, a = z - d / 2;
    face([[l,b,f],[r,b,f],[r,t,f],[l,t,f]], tint);
    face([[r,b,a],[l,b,a],[l,t,a],[r,t,a]], tint);
    face([[r,b,f],[r,b,a],[r,t,a],[r,t,f]], tint);
    face([[l,b,a],[l,b,f],[l,t,f],[l,t,a]], tint);
    face([[l,t,f],[r,t,f],[r,t,a],[l,t,a]], tint);
    face([[l,b,a],[r,b,a],[r,b,f],[l,b,f]], tint);
  }
  function pin(a, b, radius, tint, sides = 6, back = true) {
    const w = unit(subtract(b,a)), u = unit(cross(Math.abs(w[1]) > 0.9 ? [1,0,0] : [0,1,0], w)), v = cross(w,u);
    const around = Array.from({ length:sides }, (_, i) => {
      const angle = i * 2 * Math.PI / sides;
      return u.map((value, component) => value * Math.cos(angle) + v[component] * Math.sin(angle));
    });
    const ring = (centre, capNormal) => around.map((radial) => vertex(centre.map((value, i) => value + radial[i] * radius), capNormal ?? radial, tint));
    const base = ring(a), tip = ring(b);
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      indices.push(base[i], base[j], tip[j], base[i], tip[j], tip[i]);
    }
    const front = ring(b,w), centre = vertex(b,w,tint);
    for (let i = 0; i < sides; i++) indices.push(centre, front[i], front[(i + 1) % sides]);
    if (back) {
      const normal = w.map((value) => -value), rear = ring(a,normal), centre = vertex(a,normal,tint);
      for (let i = 0; i < sides; i++) indices.push(centre, rear[(i + 1) % sides], rear[i]);
    }
  }
  return { positions, normals, colours, indices, box, pin };
}

/** Thin pigmented trim lines, laid out as carpentry rather than floating decals. */
function fascia(mesh, y, z, width, count) {
  mesh.box(0, y, z, width, 0.22, 0.12, OAK);
  mesh.box(0, y + 0.077, z + 0.066, width * 0.98, 0.035, 0.028, EDGE);
  const bay = width / count;
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * bay;
    mesh.box(x, y - 0.009, z + 0.066, bay * 0.69, 0.1, 0.037, i % 2 ? JADE : VERMILION);
    mesh.pin([x, y - 0.018, z + 0.066], [x, y - 0.018, z + 0.112], 0.035, GOLD);
  }
}

function eaveEnds(mesh, y, width, reach, centreZ, count, detail) {
  const bay = width / count;
  for (const side of [-1, 1]) for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * bay;
    const end = centreZ + side * reach;
    const flank = (2 * x / width) ** 6;
    mesh.pin([x, y + flank * 0.13, end - side * 0.12], [x, y - 0.025 + flank * 0.13, end + side * 0.024],
      bay * 0.31, i % 3 ? SLATE : STONE, detail ? 8 : 6, false);
    if (detail || i % 3 === 0) mesh.pin([x, y - 0.025 + flank * 0.13, end + side * 0.02], [x, y - 0.025 + flank * 0.13, end + side * 0.044],
      bay * 0.15, i % 3 ? OAK : BRONZE, 6, false);
  }
}

function plaque(mesh, y, z, scale) {
  // An engraved mountain-and-disc device is legible from the chapter camera.
  // It is an ornament, so the scene never depends on an image of written text.
  const stroke = (a,b) => mesh.pin([a[0] * scale,y + a[1] * scale,z], [b[0] * scale,y + b[1] * scale,z], 0.025 * scale, GOLD);
  const peaks = [[-0.77,-0.15],[-0.43,0.032],[-0.21,-0.06],[0.08,0.17],[0.44,-0.095],[0.52,-0.015],[0.76,-0.15]];
  peaks.forEach((p, i) => { if (i) stroke(peaks[i - 1], p); });
  mesh.pin([-0.3 * scale,y + 0.17 * scale,z - 0.018], [-0.3 * scale,y + 0.17 * scale,z + 0.019], 0.056 * scale, EDGE, 10);
  stroke([-0.82,-0.2],[0.82,-0.2]);
}

const DETAILS = {
  gate(mesh) {
    for (const side of [-1,1]) for (const facing of [-1,1]) {
      const z = facing * 0.604;
      // Alternating stone courses and a chiseled coping beneath the worn plaster.
      mesh.box(side * 5.45, 0.738, z, 7.33, 0.1, 0.11, STONE);
      for (let i = 0; i < 8; i++) {
        const x = side * (2.55 + i * 0.87);
        mesh.box(x, 0.502, z, 0.81, 0.25, 0.16, i % 3 ? SLATE : STONE);
        mesh.box(x + side * 0.13, 0.229, z, 0.74, 0.22, 0.14, i % 2 ? STONE : SLATE);
      }
      mesh.box(side * 2.2, 0.89, facing * 0.75, 0.49, 0.17, 0.47, OAK);
      mesh.pin([side * 2.2, 1.22, facing * 0.75], [side * 2.2, 1.29, facing * 0.75], 0.258, EDGE, 12);
      mesh.box(side * 2.2, 3.97, facing * 0.75, 0.48, 0.22, 0.45, JADE);
    }
  },
  gateRoof(mesh, detail) {
    fascia(mesh, 4.765, 1.15, 5.35, 9);
    fascia(mesh, 4.69, 2.095, 7.42, 13);
    eaveEnds(mesh, 4.826, 7.53, 2.368, 0, detail ? 21 : 15, detail);
    plaque(mesh, 3.79, 0.95, 1);
  },
  temple(mesh, detail) {
    for (const side of [-1,1]) {
      // Remain on the existing stair cheeks, clear of the approach.
      mesh.box(side * 3.7, 0.99, 6.4, 0.4, 0.1, 1.72, STONE);
      for (let i = 0; i < 4; i++) {
        const z = 6.12 + (3 - i) * 0.42;
        mesh.box(side * 2.16, 0.197 + i * 0.22, z, 2.67, 0.034, 0.045, FROST);
      }
      for (let i = 0; i < 6; i++) {
        const x = side * (3.45 + i * 1.17);
        mesh.box(x, 0.26, 5.603, 1.09, 0.28, 0.09, i % 3 ? SLATE : STONE);
        mesh.box(x - side * 0.18, 0.59, 5.603, 1.08, 0.23, 0.09, i % 2 ? SLATE : STONE);
      }
      // The open lattice is bracketed by two exposed timbers, keeping the glow visible.
      const w = side * 5.6;
      for (const x of [w - 1.07,w + 1.07]) mesh.box(x, 3.0, 2.233, 0.15, 1.88, 0.13, VERMILION);
      for (const y of [2.08,3.92]) mesh.box(w, y, 2.233, 2.28, 0.12, 0.13, EDGE);
    }
    fascia(mesh, 5.37, 3.767, 17.05, 19);
    fascia(mesh, 5.71, 6.855, 22.15, 23);
    fascia(mesh, 9.1, 3.605, 12.9, 15);
    eaveEnds(mesh, 5.77, 22.1, 6.75, 0.6, detail ? 36 : 28, detail);
    eaveEnds(mesh, 9.17, 13.2, 3.38, 0.6, detail ? 24 : 18, detail);
    plaque(mesh, 6.25, 4.45, 1.35);
  },
  censer(mesh, detail) {
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8, c = Math.cos(a), s = Math.sin(a);
      mesh.pin([c * 0.816, 1.075, s * 0.816], [c * 0.887, 1.075, s * 0.887], 0.04, i % 4 ? BRONZE : GOLD, 8);
      if (detail) mesh.pin([c * 0.743, 0.88, s * 0.743], [c * 0.846, 0.88, s * 0.846], 0.028, PATINA);
    }
    for (const side of [-1,1]) {
      mesh.pin([side * 0.94, 1.61, 0], [side * 0.99, 1.73, 0], 0.071, BRONZE, 8);
      mesh.pin([side * 0.89, 1.72, 0], [side * 0.73, 1.729, 0], 0.053, GOLD);
    }
  },
  lion(mesh) {
    for (const side of [-1,1]) {
      for (const y of [0.18,0.72]) mesh.box(0, y, side * 0.752, 1.2, 0.09, 0.07, SLATE);
      mesh.box(side * 0.598, 0.46, 0, 0.055, 0.12, 1.46, STONE);
      // A shallow eyebrow and two scroll ribs are carved into each side of the stone mask.
      mesh.pin([side * 0.08, 2.335, 0.522], [side * 0.221, 2.344, 0.478], 0.024, STONE);
      mesh.pin([side * 0.221, 2.344, 0.478], [side * 0.259, 2.306, 0.444], 0.024, SLATE);
      mesh.pin([side * 0.14, 1.86, 0.306], [side * 0.237, 1.725, 0.375], 0.025, STONE);
    }
  },
  lantern(mesh) {
    for (const side of [-1,1]) {
      mesh.box(0, 1.151, side * 0.199, 0.416, 0.068, 0.044, SLATE);
      mesh.box(0, 1.451, side * 0.194, 0.416, 0.076, 0.045, STONE);
      for (const x of [-0.068,0.068]) mesh.pin([x,1.163,side * 0.197], [x,1.438,side * 0.197], 0.016, BRONZE);
      mesh.box(0, 0.17, side * 0.292, 0.53, 0.038, 0.095, FROST);
    }
    mesh.pin([0,1.02,0],[0,1.04,0],0.225,STONE,10);
  }
};

/** Add the trim without adding a draw call or changing the original envelopes. */
export function detailSceneMesh(name, base, coarse) {
  const make = DETAILS[name];
  if (!make) return base;
  const detail = reliefMesh();
  make(detail, coarse === 1);
  const offset = base.positions.length / 3, added = detail.positions.length / 3;
  const combine = (source, copy) => {
    const result = new source.constructor(source.length + copy.length);
    result.set(source);
    result.set(copy, source.length);
    return result;
  };
  return { ...base, positions: combine(base.positions, detail.positions), normals: combine(base.normals, detail.normals),
    colours: combine(base.colours, detail.colours), stuffs: combine(base.stuffs, new Uint8Array(added)),
    indices: combine(base.indices, detail.indices.map((index) => index + offset)) };
}
