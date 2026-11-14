import { Attribute3D, createGeometry3D } from '@egret/engine/world3d';
import { build, mix, rgb, shade } from './shapes.mjs';
import { dressDetails, headDetails, limbDetails, weaponDetails } from './figure-details.mjs';

const weight = (bone) => [[bone, 1]];

/** Assemble flexible surfaces and rigid accessories into the same skinned draw. */
function skinWriter() {
  const positions = [], normals = [], colors = [], indices = [], joints = [], weights = [];
  const putWeights = (shares) => {
    for (let j = 0; j < 4; j++) {
      joints.push(shares[j]?.[0].index ?? 0);
      weights.push(shares[j]?.[1] ?? 0);
    }
  };
  const vertex = (at, normal, color, shares) => {
    positions.push(...at);
    normals.push(...normal);
    colors.push(...rgb(color));
    putWeights(shares);
  };
  // Rings are ordered from the hem upwards. Color can follow the angle round the body.
  function tube(rings, segments = 12, cap = true) {
    const start = positions.length / 3;
    for (let r = 0; r < rings.length; r++) {
      const [x, y, z, rx, rz, color, share] = rings[r];
      const before = rings[Math.max(0, r - 1)];
      const after = rings[Math.min(rings.length - 1, r + 1)];
      const dy = after[1] - before[1] || .001;
      for (let k = 0; k < segments; k++) {
        const angle = k * Math.PI * 2 / segments;
        const side = Math.sin(angle), front = Math.cos(angle);
        const px = x + side * rx, pz = z + front * rz;
        const nx = side / rx, nz = front / rz;
        const ny = -(nx * (after[0] - before[0] + side * (after[3] - before[3])) + nz * (after[2] - before[2] + front * (after[4] - before[4]))) / dy;
        const length = Math.hypot(nx, ny, nz);
        const tone = typeof color === 'function' ? color(angle, side, front) : color;
        vertex([px, y, pz], [nx / length, ny / length, nz / length], tone, typeof share === 'function' ? share(side, front) : share);
        if (r) {
          const a = start + (r - 1) * segments + k;
          const b = start + (r - 1) * segments + (k + 1) % segments;
          indices.push(a, b, a + segments, b, b + segments, a + segments);
        }
      }
    }
    if (!cap) return;
    for (const row of [0, rings.length - 1]) {
      const [x, y, z, , , color, share] = rings[row];
      const center = positions.length / 3;
      const top = row !== 0;
      vertex([x, y, z], [0, top ? 1 : -1, 0], typeof color === 'function' ? color(0, 0, 1) : color, typeof share === 'function' ? share(0, 1) : share);
      for (let k = 0; k < segments; k++) {
        const a = start + row * segments + k;
        const b = start + row * segments + (k + 1) % segments;
        if (top) indices.push(center, a, b);
        else indices.push(center, b, a);
      }
    }
  }
  // Sewn cloth panels have a separate reverse face so hems and lining are visible.
  function panel(rows, sides = [1, -1]) {
    const width = rows[0].length;
    for (const face of sides) {
      const start = positions.length / 3;
      for (let r = 0; r < rows.length; r++) {
        for (let k = 0; k < width; k++) {
          const [at, tone, shares, lining] = rows[r][k];
          const before = rows[r][Math.max(0, k - 1)][0], after = rows[r][Math.min(width - 1, k + 1)][0];
          const low = rows[Math.max(0, r - 1)][k][0], high = rows[Math.min(rows.length - 1, r + 1)][k][0];
          const dx = after[0] - before[0], dy = after[1] - before[1], dz = after[2] - before[2];
          const vx = high[0] - low[0], vy = high[1] - low[1], vz = high[2] - low[2];
          const normal = [dy * vz - dz * vy, dz * vx - dx * vz, dx * vy - dy * vx];
          const scale = face / (Math.hypot(...normal) || 1);
          vertex(at, normal.map(value => value * scale), face === 1 ? tone : lining ?? shade(tone, .66), shares);
          if (r && k) {
            const d = start + r * width + k, c = d - 1, b = d - width, a = b - 1;
            if (face === 1) indices.push(a, b, c, b, d, c);
            else indices.push(a, c, b, b, c, d);
          }
        }
      }
    }
  }
  // Bind each group to its bone in the rest pose. One rigid part is one weight.
  function rigid(bone, parts) {
    if (!parts.length) return;
    const geometry = build(parts);
    const at = bone.matrixWorld;
    const p = geometry.getAttribute('position').data;
    const start = positions.length / 3;
    for (let i = 0; i < p.length; i += 3) {
      positions.push(p[i] + at[12], p[i + 1] + at[13], p[i + 2] + at[14]);
      putWeights([[bone, 1]]);
    }
    for (const value of geometry.getAttribute('normal').data) normals.push(value);
    for (const value of geometry.getAttribute('color').data) colors.push(value);
    for (const index of geometry.index.data) indices.push(start + index);
  }
  return {
    tube, panel, rigid,
    geometry() {
      const geometry = createGeometry3D({ positions, normals, colors, indices });
      geometry.setAttribute('joints', new Attribute3D(new Uint16Array(joints), 4));
      geometry.setAttribute('weights', new Attribute3D(new Float32Array(weights), 4));
      return geometry;
    },
  };
}

/** Layered robe surfaces sit on the same joint positions as the motion clips. */
export function createFigureGeometry(style, rig, weapon, quality) {
  const { body, chest, head, armL, armR, legL, legR, grip, clothFront, clothBack } = rig;
  const { outer, inner, belt, trim, ink, skin, sleeve, hem, w, cut, rank, seed } = style;
  const cloth = skinWriter();
  const around = quality === 'low' ? 10 : 14;
  const folds = (color, count = 4) => (a, side, front) => shade(color, .95 + .13 * Math.cos(a * count + seed) + .08 * front);
  const coat = folds(outer);
  const lapels = (spread, offset) => (a, side, front) => {
    if (front < .47) return coat(a, side, front);
    const edge = Math.abs(side - offset);
    if (edge < spread) return mix(inner, outer, .28);
    if (edge < spread + .23) return mix(trim, outer, .48);
    return coat(a, side, front);
  };
  cloth.tube([
    [0, .92, 0, .162 * w, .117 * w, ink, weight(body)],
    [0, .97, 0, .154 * w, .119 * w, outer, [[body, .8], [chest, .2]]],
    [0, 1.06, 0, .151 * w, .119 * w, coat, [[body, .4], [chest, .6]]],
    [0, 1.17, .006, .168 * w, .13 * w, lapels(.06, -.31), weight(chest)],
    [0, 1.30, .002, .194 * w, .141 * w, lapels(.2, -.17), weight(chest)],
    [0, 1.42, -.005, .202 * w, .121 * w, lapels(.40, .04), weight(chest)],
    [0, 1.474, 0, .100 * w, .086 * w, lapels(.61, .1), weight(chest)],
    [0, 1.505, .001, .057, .055, inner, weight(chest)],
  ], around);
  // Inner robe: let the skirt part toward the stepping leg rather than rotate as a solid cone.
  const skirt = (amount) => (side, front) => {
    const left = Math.max(0, Math.min(1, .5 + side * .83));
    const swing = amount * (Math.abs(front) > .5 ? .26 : .16);
    return [[body, 1 - amount], [legL.hip, (amount - swing) * left], [legR.hip, (amount - swing) * (1 - left)], [front > 0 ? clothFront : clothBack, swing]];
  };
  const under = cut === 'hidden' || cut === 'flame' ? shade(outer, .60) : mix(inner, outer, .4);
  cloth.tube([
    [0, hem + .02, 0, .228 * w, .162 * w, shade(under, .68), skirt(.84)],
    [0, hem + .064, 0, .243 * w, .177 * w, folds(under, 6), skirt(.84)],
    [0, hem + .19, 0, .216 * w, .165 * w, folds(under, 6), skirt(.72)],
    [0, .79, 0, .193 * w, .142 * w, folds(under, 6), skirt(.39)],
    [0, .93, 0, .161 * w, .118 * w, under, weight(body)],
  ], around, false);

  // A double front overlap and a divided back. Separate lower panels swing with the knees and sash.
  for (const sign of [-1, 1]) {
    for (const facing of [-1, 1]) {
      const drapeBone = facing > 0 ? clothFront : clothBack;
      const leg = sign > 0 ? legL.hip : legR.hip;
      const rows = [
        [hem + .012, .255, .189, .49, .47],
        [hem + .048, .265, .194, .49, .45],
        [hem + .18, .229, .190, .43, .38],
        [.82, .196, .148, .19, .22],
        [.951, .153, .124, 0, 0],
      ];
      const columns = [0, .08, .42, .77, .91, 1];
      if (sign * facing < 0) columns.reverse();
      cloth.panel(rows.map(([y, width, depth, followLeg, followCloth], row) => columns.map((t) => {
        const tail = row < 3 ? (.046 * Math.cos(t * 8 + seed) + sign * .016 + (facing < 0 ? -.025 : 0)) * (1 - row * .19) : 0;
        const x = sign * w * (t * width - .039 * (1 - t));
        const z = facing * depth * (1 - t * t * .86) + (t === .42 ? .021 * facing : 0);
        const border = row === 1 || t === .08 || t === .91;
        const color = border ? trim : row === 0 ? shade(outer, .66) : shade(outer, t === .42 ? 1.15 : .91 + .13 * t);
        return [[x, y + tail, z], color, [[body, 1 - followLeg - followCloth], [leg, followLeg], [drapeBone, followCloth]], inner];
      })), facing > 0 ? [1, -1] : [-1, 1]);
    }
  }

  // Folds at elbows, a lined cuff, then wrapped forearms.
  for (const arm of [armL, armR]) {
    const { shoulder, elbow } = arm;
    const x = shoulder.position[0];
    const fitted = sleeve < .9;
    const cuff = fitted ? .955 : .869;
    const wrap = cut === 'kasaya' || cut === 'lotus' ? inner : shade(ink, 1.12);
    cloth.tube([
      [x, .809, .005, .033, .034, wrap, weight(elbow)],
      [x, .829, .003, .038, .039, trim, weight(elbow)],
      [x, cuff - .02, 0, .041, .041, wrap, weight(elbow)],
      [x, cuff, 0, .051 * sleeve, .054 * sleeve, shade(inner, .87), weight(elbow)],
      [x, cuff + .014, 0, .08 * sleeve, .086 * sleeve, trim, weight(elbow)],
      [x, cuff + .04, -.005, .08 * sleeve, .079 * sleeve, coat, weight(elbow)],
      [x, 1.084, 0, .067 * sleeve, .071 * sleeve, coat, [[shoulder, .22], [elbow, .78]]],
      [x, 1.145, 0, .066, .071, coat, [[shoulder, .55], [elbow, .45]]],
      [x, 1.19, 0, .069, .073, coat, [[shoulder, .92], [elbow, .08]]],
      [x, 1.323, -.004, .075, .082, coat, weight(shoulder)],
      [x, 1.414, -.005, .077, .08, coat, [[shoulder, .74], [chest, .26]]],
      [x, 1.457, -.005, .044, .048, outer, [[shoulder, .43], [chest, .57]]],
    ], around);
  }
  for (const { hip, knee } of [legL, legR]) {
    const x = hip.position[0];
    const shoe = cut === 'kasaya' || cut === 'lotus' ? shade(inner, .72) : ink;
    const trousers = mix(ink, outer, .40);
    cloth.tube([
      [x, .061, 0, .047, .051, shoe, weight(knee)],
      [x, .113, 0, .053, .054, shoe, weight(knee)],
      [x, .22, 0, .056, .055, shoe, weight(knee)],
      [x, .251, 0, .061, .061, trim, weight(knee)],
      [x, .271, 0, .066, .061, trousers, weight(knee)],
      [x, .408, -.011, .065, .064, trousers, [[hip, .19], [knee, .81]]],
      [x, .478, 0, .068, .069, trousers, [[hip, .58], [knee, .42]]],
      [x, .555, 0, .073, .071, trousers, [[hip, .95], [knee, .05]]],
      [x, .90, 0, .080, .075, ink, weight(hip)],
    ], around);
  }

  cloth.tube([
    [0, 1.492, .008, .048, .044, shade(skin, .78), weight(head)],
    [0, 1.551, .016, .052, .054, shade(skin, .85), weight(head)],
    [0, 1.571, .028, .054, .068, shade(skin, .88), weight(head)],
    [0, 1.599, .014, .083, .086, shade(skin, .96), weight(head)],
    [0, 1.650, .006, .098, .096, skin, weight(head)],
    [0, 1.705, -.004, .094, .096, skin, weight(head)],
    [0, 1.745, -.011, .073, .074, shade(skin, 1.03), weight(head)],
    [0, 1.763, -.018, .030, .045, shade(skin, 1.03), weight(head)],
  ], quality === 'low' ? 12 : 16);
  dressDetails(cloth, rig, style);
  headDetails(cloth, head, style, quality);
  limbDetails(cloth, rig, style, weapon);
  cloth.rigid(grip, weaponDetails(weapon, style));
  return cloth.geometry();
}
