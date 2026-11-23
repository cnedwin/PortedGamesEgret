// The five regiments' arms, made in code: ring-pommel sabre and round shield, Han sword, two-handed horse-cutter,
// long spear with a red tassel, horn bow and arrows, and a short knife.
//
// Every weapon is built in its own frame: the main hand's grip at the origin, the blade or the spearhead along +Y,
// the cutting edge facing +Z. `grips` gives where a second hand goes. Parts are gathered per material, so a
// weapon is a handful of draws.
import { Mesh3D, Object3D, createGeometry3D, createStandardMaterial3D } from '@egret/engine/world3d';

const srgb = (hex) => {
  const c = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => v / 255);
  return c.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
};

function createKit() {
  const parts = new Map();
  const piece = (mat) => {
    let p = parts.get(mat);
    if (!p) parts.set(mat, (p = { positions: [], normals: [], colors: [], indices: [] }));
    return p;
  };
  const kit = {
    /** A triangle soup with flat-shaded faces from quads/triangles given as point lists. */
    face(mat, points, colour) {
      const p = piece(mat);
      const base = p.positions.length / 3;
      const n = (() => {
        const a = points[0], b = points[1], c = points[2];
        const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        const x = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        const l = Math.hypot(...x) || 1;
        return x.map((q) => q / l);
      })();
      const c = srgb(colour);
      for (const pt of points) {
        p.positions.push(...pt);
        p.normals.push(...n);
        p.colors.push(...c);
      }
      for (let i = 1; i < points.length - 1; i++) p.indices.push(base, base + i, base + i + 1);
    },
    /** A solid of revolution about Y: `profile` is [radius, y] from bottom to top; smooth sides. */
    lathe(mat, profile, { segments = 16, colour = 0xffffff, colours, offset = [0, 0, 0], squash = [1, 1] } = {}) {
      const p = piece(mat);
      const base = p.positions.length / 3;
      for (let i = 0; i < profile.length; i++) {
        const [r, y] = profile[i];
        const prev = profile[Math.max(0, i - 1)],
          next = profile[Math.min(profile.length - 1, i + 1)];
        const dr = next[0] - prev[0],
          dy = next[1] - prev[1];
        const c = srgb(colours?.[i] ?? colour);
        for (let s = 0; s <= segments; s++) {
          const a = (s / segments) * Math.PI * 2;
          const cx = Math.cos(a),
            sz = Math.sin(a);
          p.positions.push(offset[0] + cx * r * squash[0], offset[1] + y, offset[2] + sz * r * squash[1]);
          const nl = Math.hypot(dy, dr) || 1;
          p.normals.push((cx * dy) / nl, -dr / nl, (sz * dy) / nl);
          p.colors.push(...c);
        }
      }
      const row = segments + 1;
      for (let i = 0; i < profile.length - 1; i++)
        for (let s = 0; s < segments; s++) {
          const a = base + i * row + s,
            b = a + row;
          p.indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
    },
    /** A tube through `points` (each [x, y, z]) with radius `r` (or per point). */
    tube(mat, points, r, { segments = 8, colour = 0xffffff } = {}) {
      const p = piece(mat);
      const base = p.positions.length / 3;
      const c = srgb(colour);
      for (let i = 0; i < points.length; i++) {
        const a = points[Math.max(0, i - 1)],
          b = points[Math.min(points.length - 1, i + 1)];
        let t = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        const tl = Math.hypot(...t) || 1;
        t = t.map((v) => v / tl);
        let u = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
        let n1 = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]];
        const l1 = Math.hypot(...n1);
        n1 = n1.map((v) => v / l1);
        const n2 = [t[1] * n1[2] - t[2] * n1[1], t[2] * n1[0] - t[0] * n1[2], t[0] * n1[1] - t[1] * n1[0]];
        const rr = Array.isArray(r) ? r[i] : r;
        for (let s = 0; s <= segments; s++) {
          const ang = (s / segments) * Math.PI * 2;
          const nx = n1[0] * Math.cos(ang) + n2[0] * Math.sin(ang),
            ny = n1[1] * Math.cos(ang) + n2[1] * Math.sin(ang),
            nz = n1[2] * Math.cos(ang) + n2[2] * Math.sin(ang);
          p.positions.push(points[i][0] + nx * rr, points[i][1] + ny * rr, points[i][2] + nz * rr);
          p.normals.push(nx, ny, nz);
          p.colors.push(...c);
        }
      }
      const row = segments + 1;
      for (let i = 0; i < points.length - 1; i++)
        for (let s = 0; s < segments; s++) {
          const a = base + i * row + s,
            b = a + row;
          p.indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
    },
    box(mat, [x0, y0, z0], [x1, y1, z1], colour) {
      const v = (x, y, z) => [x ? x1 : x0, y ? y1 : y0, z ? z1 : z0];
      kit.face(mat, [v(0, 0, 1), v(1, 0, 1), v(1, 1, 1), v(0, 1, 1)], colour);
      kit.face(mat, [v(1, 0, 0), v(0, 0, 0), v(0, 1, 0), v(1, 1, 0)], colour);
      kit.face(mat, [v(1, 0, 1), v(1, 0, 0), v(1, 1, 0), v(1, 1, 1)], colour);
      kit.face(mat, [v(0, 0, 0), v(0, 0, 1), v(0, 1, 1), v(0, 1, 0)], colour);
      kit.face(mat, [v(0, 1, 1), v(1, 1, 1), v(1, 1, 0), v(0, 1, 0)], colour);
      kit.face(mat, [v(0, 0, 0), v(1, 0, 0), v(1, 0, 1), v(0, 0, 1)], colour);
    },
    /**
     * A blade from y0 to y1: a cross-section with a back (−Z) and an edge (+Z) or two edges, tapering to a point.
     * `width(t)` gives the width along it (t 0..1), `curve(t)` bends it toward −Z.
     */
    blade(mat, { y0, y1, width, thick = 0.007, double = false, curve = () => 0, steps = 14, tip = 0.12, colour = 0xd9dde2, edgeColour = 0xf4f6f8 }) {
      const rows = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const y = y0 + (y1 - y0) * t;
        let w = width(t);
        const tipStart = 1 - tip;
        if (t > tipStart) w *= Math.max(0, 1 - (t - tipStart) / tip) ** (double ? 1 : 0.8);
        const z = -curve(t);
        const th = thick * (0.5 + 0.5 * (1 - t * 0.6));
        // back, flat sides, edge: the section [back-left, back-right, ridge-left, ridge-right, edge]
        if (double) rows.push([[0, y, z - w / 2], [-th, y, z], [th, y, z], [0, y, z + w / 2]]);
        else rows.push([[-th, y, z - w / 2], [th, y, z - w / 2], [th * 0.85, y, z + w * 0.15], [-th * 0.85, y, z + w * 0.15], [0, y, z + w / 2]]);
      }
      const at = (r, k) => rows[r][k];
      for (let r = 0; r < rows.length - 1; r++) {
        if (double) {
          kit.face(mat, [at(r, 0), at(r, 1), at(r + 1, 1), at(r + 1, 0)], colour);
          kit.face(mat, [at(r, 1), at(r, 3), at(r + 1, 3), at(r + 1, 1)], edgeColour);
          kit.face(mat, [at(r, 3), at(r, 2), at(r + 1, 2), at(r + 1, 3)], edgeColour);
          kit.face(mat, [at(r, 2), at(r, 0), at(r + 1, 0), at(r + 1, 2)], colour);
        } else {
          kit.face(mat, [at(r, 1), at(r, 0), at(r + 1, 0), at(r + 1, 1)], colour);
          kit.face(mat, [at(r, 0), at(r, 3), at(r + 1, 3), at(r + 1, 0)], colour);
          kit.face(mat, [at(r, 2), at(r, 1), at(r + 1, 1), at(r + 1, 2)], colour);
          kit.face(mat, [at(r, 3), at(r, 4), at(r + 1, 4), at(r + 1, 3)], edgeColour);
          kit.face(mat, [at(r, 4), at(r, 2), at(r + 1, 2), at(r + 1, 4)], edgeColour);
        }
      }
    },
    build(materials) {
      const root = new Object3D();
      for (const [mat, p] of parts) {
        const geometry = createGeometry3D({ positions: p.positions, normals: p.normals, colors: p.colors, indices: p.indices });
        const mesh = new Mesh3D(geometry, materials[mat]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.name = mat;
        root.addChild(mesh);
      }
      return root;
    }
  };
  return kit;
}

let shared = null;
function materials() {
  shared ??= {
    steel: createStandardMaterial3D({ vertexColors: true, metallic: 1, roughness: 0.26, side: 'double' }),
    darkSteel: createStandardMaterial3D({ vertexColors: true, metallic: 0.9, roughness: 0.42 }),
    bronze: createStandardMaterial3D({ vertexColors: true, metallic: 1, roughness: 0.34 }),
    wood: createStandardMaterial3D({ vertexColors: true, metallic: 0, roughness: 0.62 }),
    lacquer: createStandardMaterial3D({ vertexColors: true, metallic: 0, roughness: 0.3 }),
    leather: createStandardMaterial3D({ vertexColors: true, metallic: 0, roughness: 0.8 }),
    cloth: createStandardMaterial3D({ vertexColors: true, metallic: 0, roughness: 0.92, side: 'double' }),
    string: createStandardMaterial3D({ color: 0xe8dcc0, roughness: 0.7 })
  };
  return shared;
}

/** A wrapped grip from y0 to y1 of radius r: leather with raised bands. */
function grip(kit, y0, y1, r, colour = 0x3a2416) {
  const prof = [];
  const n = 10;
  for (let i = 0; i <= n; i++) prof.push([r * (i % 2 ? 1.08 : 0.97), y0 + ((y1 - y0) * i) / n]);
  kit.lathe('leather', prof, { segments: 10, colour });
}

const BUILD = {
  sabre(kit) {
    grip(kit, -0.1, 0.1, 0.016);
    // Ring pommel.
    const ring = [];
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      ring.push([0, -0.145 + Math.cos(a) * 0.036, Math.sin(a) * 0.036]);
    }
    kit.tube('bronze', ring, 0.0075, { segments: 6, colour: 0xb08a4a });
    kit.lathe('bronze', [[0.0, -0.11], [0.019, -0.105], [0.019, -0.098], [0.0, -0.096]], { colour: 0xa98245 });
    // A small oval guard.
    kit.lathe('darkSteel', [[0, 0.1], [0.034, 0.103], [0.036, 0.112], [0.02, 0.118], [0, 0.12]], { segments: 14, colour: 0x6c6a66, squash: [0.55, 1] });
    kit.blade('steel', { y0: 0.118, y1: 0.93, width: (t) => 0.036 - 0.004 * t, thick: 0.0065, tip: 0.07, curve: (t) => 0.006 * t * t });
    return { length: 0.93 };
  },
  jian(kit) {
    grip(kit, -0.09, 0.09, 0.014, 0x2a1d14);
    kit.lathe('bronze', [[0, -0.125], [0.022, -0.12], [0.026, -0.108], [0.018, -0.096], [0.014, -0.09]], { colour: 0xb89252 });
    // A wide bronze guard.
    kit.lathe('bronze', [[0, 0.088], [0.03, 0.09], [0.05, 0.1], [0.045, 0.112], [0.02, 0.118], [0.0, 0.12]], { segments: 14, colour: 0xb89252, squash: [0.45, 1] });
    kit.blade('steel', { y0: 0.118, y1: 0.86, width: (t) => 0.042 - 0.012 * t, thick: 0.007, double: true, tip: 0.08 });
    return { length: 0.86 };
  },
  zhanma(kit) {
    // A long two-handed grip, the main hand high on it and the other low.
    kit.lathe('wood', [[0.019, -0.52], [0.02, -0.4], [0.019, 0.1]], { colour: 0x4a2c1a });
    grip(kit, -0.48, 0.1, 0.021, 0x2b1a10);
    kit.lathe('bronze', [[0, -0.56], [0.025, -0.55], [0.027, -0.53], [0.02, -0.52]], { colour: 0x9f7a3e });
    kit.lathe('darkSteel', [[0, 0.1], [0.05, 0.104], [0.052, 0.118], [0.022, 0.126], [0, 0.128]], { segments: 14, colour: 0x5d5b58, squash: [0.5, 1] });
    kit.blade('steel', { y0: 0.126, y1: 1.12, width: (t) => 0.056 + 0.008 * Math.sin(t * Math.PI), thick: 0.009, tip: 0.1, curve: (t) => 0.035 * t * t, colour: 0xc9cdd2 });
    return { length: 1.12, second: [0, -0.33, 0] };
  },
  spear(kit) {
    // The shaft runs from the butt (−1.05) through the main hand (0) to the head; the other hand rides forward on it.
    kit.lathe('lacquer', [[0.017, -1.02], [0.018, -0.5], [0.017, 0.4], [0.016, 1.38]], { segments: 10, colour: 0x7a1d16 });
    kit.lathe('bronze', [[0, -1.08], [0.02, -1.07], [0.021, -1.02], [0.017, -1.0]], { colour: 0xa07a40 });
    for (const y of [-0.06, 0.05, 0.42, 0.55]) kit.lathe('leather', [[0.0185, y], [0.0195, y + 0.006], [0.0195, y + 0.05], [0.0185, y + 0.056]], { segments: 10, colour: 0x24170f });
    kit.lathe('bronze', [[0.017, 1.36], [0.022, 1.38], [0.02, 1.44], [0.012, 1.46]], { colour: 0xa98245 });
    // A tuft of red horsehair under the head.
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const pts = [];
      for (let k = 0; k <= 4; k++) pts.push([Math.cos(a) * (0.018 + k * 0.013), 1.39 - k * 0.045, Math.sin(a) * (0.018 + k * 0.013)]);
      kit.tube('cloth', pts, [0.008, 0.009, 0.008, 0.006, 0.002], { segments: 4, colour: 0xb0201a });
    }
    kit.blade('steel', { y0: 1.45, y1: 1.78, width: (t) => 0.035 + 0.035 * Math.sin(Math.min(1, t * 1.4) * Math.PI * 0.85), thick: 0.008, double: true, tip: 0.35 });
    return { length: 1.78, second: [0, 0.55, 0] };
  },
  knife(kit) {
    grip(kit, -0.07, 0.07, 0.013);
    kit.lathe('bronze', [[0, 0.07], [0.022, 0.072], [0.022, 0.08], [0, 0.082]], { colour: 0xa07a40, squash: [0.5, 1] });
    kit.blade('steel', { y0: 0.08, y1: 0.36, width: (t) => 0.03, thick: 0.005, tip: 0.18 });
    return { length: 0.36 };
  },
  bow(kit) {
    // Held at the middle: limbs along ±Y bending back (−Z) and recurving at the tips; the string is drawn apart.
    const limb = (sign) => {
      const pts = [],
        r = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const y = sign * (0.06 + t * 0.66);
        const z = -0.13 * Math.sin(t * Math.PI * 0.78) + (t > 0.85 ? 0.09 * ((t - 0.85) / 0.15) ** 2 : 0);
        pts.push([0, y, z]);
        r.push(0.017 - t * 0.009);
      }
      kit.tube('lacquer', pts, r, { segments: 7, colour: 0x3b2316 });
      return pts.at(-1);
    };
    const top = limb(1),
      bottom = limb(-1);
    grip(kit, -0.07, 0.07, 0.019, 0x6b3a1e);
    for (const p of [top, bottom]) kit.lathe('bronze', [[0, p[1] - 0.01], [0.011, p[1]], [0, p[1] + 0.012]], { segments: 6, colour: 0xc29a50, offset: [0, 0, p[2]] });
    return { length: 0.8, nocks: [top, bottom] };
  },
  shield(kit) {
    // A round shield seen along +Z (its face), the arm behind it at the origin.
    const prof = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      prof.push([0.4 * (1 - t), 0.03 + 0.07 * Math.sin((t * Math.PI) / 2)]);
    }
    const colours = prof.map((_, i) => (i < 2 ? 0x1c1412 : i < 4 ? 0x7a1812 : i < 6 ? 0x1c1412 : 0x7a1812));
    const face = createKit();
    kit.lathe('lacquer', prof, { segments: 28, colours });
    // Rim and boss.
    kit.lathe('bronze', [[0.405, 0.0], [0.412, 0.02], [0.405, 0.04], [0.395, 0.035]], { segments: 28, colour: 0xa8823e });
    kit.lathe('bronze', [[0.075, 0.095], [0.07, 0.115], [0.05, 0.135], [0.0, 0.142]], { segments: 18, colour: 0xc29a52 });
    kit.lathe('leather', [[0.0, 0.0], [0.39, 0.0]], { segments: 28, colour: 0x3a2618 });
    // A grip bar across the back.
    kit.box('wood', [-0.09, -0.035, -0.014], [0.09, -0.005, 0.014], 0x4a2c1a);
    void face;
    return { length: 0.4 };
  },
  arrow(kit) {
    kit.lathe('wood', [[0.004, -0.72], [0.0045, 0], [0.004, 0.02]], { segments: 5, colour: 0x9c7b52 });
    kit.lathe('darkSteel', [[0.006, 0.02], [0.009, 0.035], [0.0, 0.085]], { segments: 6, colour: 0x6e6a64 });
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const c = Math.cos(a),
        s = Math.sin(a);
      const pts = [[0, -0.7, 0], [0.028, -0.68, 0], [0.024, -0.56, 0], [0, -0.55, 0]].map(([x, y]) => [x * c, y, x * s]);
      kit.face('cloth', pts, k === 0 ? 0x8f2a20 : 0xd8d0bc);
      kit.face('cloth', [...pts].reverse(), k === 0 ? 0x8f2a20 : 0xd8d0bc);
    }
    return { length: 0.8 };
  }
};

/** Make one weapon: { node, length, second, nocks }. Shields have their face along +Y (turned when worn). */
export function createWeapon(kind) {
  const kit = createKit();
  const info = BUILD[kind](kit);
  const node = kit.build(materials());
  node.name = kind;
  return { node, ...info };
}

/** What each regiment carries in which hand. */
export const ARMS = {
  yulin: { main: 'sabre', off: 'shield' },
  tiger: { main: 'jian' },
  vanguard: { main: 'zhanma', two: true },
  plume: { main: 'spear', two: true },
  archer: { main: 'knife', bow: 'bow' }
};
