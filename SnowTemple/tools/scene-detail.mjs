// Small, hard-edged details complement the weathered, sculpted bodies. They are
// packed into the same mesh and material as the object that carries them.
import { PROP_SURFACE } from '../src/view/prop-surface.mjs';
const ink = (hex) => [16, 8, 0].map((shift) => (((hex >> shift) & 255) / 255) ** 2.2);
const OAK = ink(0x473428), VERMILION = ink(0x8b392d), EDGE = ink(0xb16c50),
  JADE = ink(0x315f61), SLATE = ink(0x566576), STONE = ink(0x81848a),
  GOLD = ink(0xb99a59), BRONZE = ink(0x527f75), PATINA = ink(0x325653),
  FROST = ink(0xb3c5cc);

const subtract = (a, b) => a.map((v, i) => v - b[i]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const length = Math.hypot(...a); return a.map((v) => v / length); };

function reliefMesh(defaultSurface) {
  const positions = [], normals = [], colours = [], surfaces = [], indices = [];
  function vertex(point, normal, tint, surface = defaultSurface) {
    const index = positions.length / 3;
    positions.push(...point);
    normals.push(...normal);
    colours.push(...tint);
    surfaces.push(surface);
    return index;
  }
  function face(points, tint, surface) {
    const normal = unit(cross(subtract(points[1], points[0]), subtract(points[2], points[0])));
    const offset = positions.length / 3;
    for (const point of points) vertex(point, normal, tint, surface);
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
  function lathe(profile, sides) {
    const rows = profile.map(([r,y,tint], i) => {
      const [r0,y0] = profile[Math.max(0,i-1)], [r1,y1] = profile[Math.min(profile.length-1,i+1)];
      const direction = unit([y1-y0,r0-r1,0]);
      return Array.from({ length:sides }, (_, slice) => {
        const angle = slice * Math.PI * 2 / sides, c = Math.cos(angle), s = Math.sin(angle);
        return vertex([r*c,y,r*s], [direction[0]*c,direction[1],direction[0]*s], tint);
      });
    });
    for (let i=1; i<rows.length; i++) for (let j=0; j<sides; j++) {
      const next=(j+1)%sides, a=rows[i-1][j], b=rows[i][j], c=rows[i][next], d=rows[i-1][next];
      if (profile[i][0] !== 0) indices.push(a,b,c);
      if (profile[i-1][0] !== 0) indices.push(a,c,d);
    }
  }
  return { positions, normals, colours, surfaces, indices, face, box, pin, lathe };
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
    const dark = ink(0x4f5a4b), lip = ink(0x877853), cast = ink(0x66684e), ash = ink(0x57574e);
    // One continuous cast shell: the lip turns inward to the ash-filled bowl.
    mesh.lathe([[0,0.72,dark],[0.365,0.727,dark],[0.58,0.754,dark],[0.737,0.842,cast],[0.822,0.94,cast],
      [0.851,1.064,cast],[0.850,1.152,BRONZE],[0.864,1.178,lip],[0.853,1.205,cast],
      [0.825,1.228,cast],[0.89,1.255,lip],[0.9,1.283,lip],[0.878,1.31,lip],[0.81,1.311,PATINA],
      [0.783,1.263,PATINA],[0.744,1.213,dark],[0.653,1.124,dark],[0.471,1.052,ash],[0,1.04,ash]], detail ? 56 : 36);
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
  lantern(mesh) {
    for (const side of [-1,1]) {
      mesh.box(0, 1.151, side * 0.199, 0.416, 0.068, 0.044, SLATE);
      mesh.box(0, 1.451, side * 0.194, 0.416, 0.076, 0.045, STONE);
      for (const x of [-0.068,0.068]) mesh.pin([x,1.163,side * 0.197], [x,1.438,side * 0.197], 0.016, BRONZE);
      mesh.box(0, 0.17, side * 0.292, 0.53, 0.038, 0.095, FROST);
    }
    mesh.pin([0,1.02,0],[0,1.04,0],0.225,STONE,10);
    const roof = (width,y,kick) => [
      [-width,y+kick,+width],[0,y,+width],[width,y+kick,+width],[width,y,0],
      [width,y+kick,-width],[0,y,-width],[-width,y+kick,-width],[-width,y,0]
    ];
    const courses = [roof(0.249,1.516,0),roof(0.346,1.554,0.027),roof(0.306,1.591,0.018),
      roof(0.208,1.645,0.009),roof(0.124,1.709,0.003),roof(0.049,1.749,0)];
    for (let i=1; i<courses.length; i++) for (let j=0; j<8; j++) {
      const next=(j+1)%8, outer=courses[i-1], inner=courses[i];
      mesh.face([outer[j],outer[next],inner[next],inner[j]], i===1?SLATE:STONE);
    }
    // Leave some exposed stone around the upturned eaves under the frost.
    const cover=[roof(0.292,1.605,0.014),roof(0.192,1.661,0.009),roof(0.111,1.724,0.004),roof(0.044,1.762,0)];
    for (let i=1; i<cover.length; i++) for (let j=0; j<8; j++) {
      const next=(j+1)%8, outer=cover[i-1], inner=cover[i];
      mesh.face([outer[j],outer[next],inner[next],inner[j]], FROST, PROP_SURFACE.snow);
    }
  },
  pine(mesh, detail, solids) {
    const spans = detail ? 5 : 3;
    for (const limb of solids) {
      if (!limb.spray) continue;
      const forward = unit(subtract(limb.b, limb.a)), side = unit(cross(forward,[0,1,0]));
      for (let i=0; i<spans; i++) for (const sign of [-1,1]) {
        const t=0.57+i*0.36/spans, length=0.16+0.24*(1-t);
        const root = limb.a.map((v,j)=>v+(limb.b[j]-v)*t);
        const tip = root.map((v,j)=>v+forward[j]*0.165+side[j]*sign*length+(j===1?-0.105:0));
        const left=root.map((v,j)=>v-forward[j]*0.042+side[j]*sign*0.025);
        const right=root.map((v,j)=>v+forward[j]*0.037+side[j]*sign*0.024+(j===1?0.033:0));
        mesh.face([left,right,tip],limb.colour);
        mesh.face([right,left,tip],limb.colour);
      }
    }
  }
};

/** Add the trim without adding a draw call or changing the original envelopes. */
export function detailSceneMesh(name, base, coarse, solids) {
  if (name === 'stele') {
    // Baked surface variation follows gravity on the slab. Keep raised snow
    // on its cap clear, and don't add a second material or texture.
    for (let i = 0; i < base.positions.length; i += 3) {
      const x = base.positions[i], y = base.positions[i + 1], z = base.positions[i + 2];
      if (y >= 3.16) continue;
      const stain = Math.max(0, Math.sin(x * 40 + Math.sin(y * 2.2) * 0.48 + z * 47)) ** 6;
      const salt = Math.sin(x * 24 + z * 9 + 2) * Math.sin(y * 7 - z * 21) * 0.05;
      const damp = Math.max(0, 1 - y * 0.72) * 0.16;
      const tone = 0.97 + salt - stain * 0.11 - damp;
      for (let channel = 0; channel < 3; channel++) base.colours[i + channel] *= tone;
    }
  }
  const make = DETAILS[name];
  if (!make) return base;
  const surface = name === 'censer' ? PROP_SURFACE.bronze : name === 'pine' ? PROP_SURFACE.needle : PROP_SURFACE.stone;
  const detail = reliefMesh(surface);
  make(detail, coarse === 1, solids);
  const offset = base.positions.length / 3;
  const lo = [...base.lo], hi = [...base.hi];
  for (let i=0; i<detail.positions.length; i++) {
    const dim = i % 3;
    lo[dim] = Math.min(lo[dim], detail.positions[i]);
    hi[dim] = Math.max(hi[dim], detail.positions[i]);
  }
  const combine = (source, copy) => {
    const result = new source.constructor(source.length + copy.length);
    result.set(source);
    result.set(copy, source.length);
    return result;
  };
  return { ...base, positions: combine(base.positions, detail.positions), normals: combine(base.normals, detail.normals),
    colours: combine(base.colours, detail.colours), stuffs: combine(base.stuffs, detail.surfaces),
    indices: combine(base.indices, detail.indices.map((index) => index + offset)), lo, hi };
}
