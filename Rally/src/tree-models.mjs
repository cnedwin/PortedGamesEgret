// Roadside vegetation uses the same colors as painted scenery, with five
// silhouettes and a lighter pine for the far hills. Each shape is instanced.
import { createCylinderGeometry3D, createGeometry3D } from '@egret/engine/world3d';
import { build } from './shapes.mjs';

// Branch ends are buried in the ground, in another branch or under the leaves.
const BARK = createCylinderGeometry3D({ radiusTop: 0.63, radiusBottom: 1, height: 1, radialSegments: 6, openEnded: true });

/** Turn a series of irregular rings into a shaded clump of leaves or needles. */
function crown(sides, rings) {
  const positions = [], normals = [], indices = [];
  for (let row = 0; row < rings.length; row++) {
    const [y, radius] = rings[row];
    const prev = rings[Math.max(0, row - 1)], next = rings[Math.min(rings.length - 1, row + 1)];
    const slope = (prev[1] - next[1]) / (next[0] - prev[0]);
    for (let i = 0; i < sides; i++) {
      const a = i / sides * 2 * Math.PI;
      const x = Math.cos(a), z = Math.sin(a);
      const r = radius * (1 + 0.15 * Math.sin(a * 3 + row * 0.7));
      positions.push(x * r + y * 0.17, y, z * r);
      const length = Math.hypot(1, slope);
      normals.push(x / length, slope / length, z / length);
      if (row === 0) continue;
      const low = (row - 1) * sides + i;
      const other = (row - 1) * sides + (i + 1) % sides;
      indices.push(low, low + sides, other, other, low + sides, other + sides);
    }
  }
  return createGeometry3D({ positions, normals, indices });
}

const FOLIAGE = crown(8, [[-0.85, 0.04], [-0.48, 0.73], [0, 1], [0.52, 0.68], [0.78, 0.04]]);
const NEEDLES = crown(7, [[-0.42, 0.1], [-0.2, 0.9], [0.03, 1], [0.56, 0.65], [0.85, 0.06]]);
const HILL_NEEDLES = crown(6, [[-1, 0.04], [-0.84, 1], [-0.36, 0.5], [-0.3, 0.83], [0.23, 0.36], [0.27, 0.56], [1, 0.04]]);
const BLOOM = crown(6, [[-0.69, 0.04], [-0.29, 0.81], [0.13, 1], [0.79, 0.04]]);

/** A bent branch is made from a few tapered spans rather than a straight post. */
function stem(parts, a, b, radius, color) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const length = Math.hypot(dx, dy, dz);
  parts.push([BARK, a.map((v, i) => (v + b[i]) / 2), [radius, length, radius], color, [Math.atan2(dz, dy), 0, Math.asin(-dx / length)]]);
}

function pine() {
  const parts = [];
  stem(parts, [0, 0, 0], [0.21, 2.25, -0.18], 0.36, 0x644938);
  stem(parts, [0.21, 2.24, -0.18], [-0.21, 4.72, 0.02], 0.22, 0x72523b);
  stem(parts, [-0.21, 4.67, 0.02], [0.12, 7.05, 0.18], 0.13, 0x654737);
  const tiers = [
    [[-0.94, 3.48, 0.31], [1.82, 0.72, 1.45], 0x285641],
    [[0.91, 4.09, -0.72], [1.58, 0.91, 1.38], 0x376d4e],
    [[-0.65, 5.11, -0.39], [1.56, 0.98, 1.41], 0x347255],
    [[0.53, 5.64, 0.61], [1.27, 0.85, 1.15], 0x4d815d],
    [[0.12, 6.89, 0.19], [1.18, 1.03, 1.08], 0x548c64],
  ];
  tiers.forEach(([tip, scale, color], i) => {
    if (i < 4) stem(parts, [0, tip[1] - 0.8, -0.06], tip, 0.12, 0x614a35);
    parts.push([NEEDLES, tip, scale, color, [0, i * 0.87, (i % 2 ? 1 : -1) * 0.14]]);
  });
  for (const end of [[0.64, 0, 0.22], [-0.31, 0, 0.46], [-0.45, 0, -0.23]])
    stem(parts, end, [0, 0.64, 0], 0.19, 0x584735);
  return build(parts);
}

function floweringTree(colors, spread) {
  const parts = [];
  stem(parts, [0, 0, 0], [-0.18, 1.65, 0.12], 0.3, 0x704839);
  stem(parts, [-0.18, 1.58, 0.12], [0.32, 3.39, -0.16], 0.19, 0x7c5644);
  const sprays = [
    [-1.18, 2.91, 0.42, 1.08], [0.44, 3.75, -0.6, 1.4],
    [1.34, 3.08, 0.31, 0.96], [-0.39, 3.62, 0.93, 1],
    [-0.72, 3.21, -0.91, 0.88], [0.4, 3.61, 1.23, 0.71],
  ];
  sprays.forEach(([x, y, z, size], i) => {
    const end = [spread * x, y, spread * z];
    stem(parts, [0.02, 1.87 + (i % 2) * 0.42, 0.04], end, 0.09, 0x6a4435);
    parts.push([BLOOM, end, [size * spread, size * 0.73, size * 0.89 * spread], colors[i % colors.length], [0, i * 0.7, 0.07 * i]]);
    if (i % 2 === 0) {
      const blush = [x * spread + 0.31, y + size * 0.53, z * spread + 0.1];
      parts.push([BLOOM, blush, [size * 0.57, size * 0.28, size * 0.58], colors[(i + 2) % colors.length], [0, i * 2.3, 0]]);
    }
  });
  return build(parts);
}

// Lance-shaped, creased blades, shaded on both sides.
const LEAF = createGeometry3D({
  positions: [0, 0, 0, -0.48, 0.44, 0.02, 0, 0.57, 0.1, 0.44, 0.46, 0.01, 0.06, 1, 0],
  normals: [0, 0, 1, -0.2, 0, 0.98, 0, 0, 1, 0.2, 0, 0.98, 0, 0, 1],
  indices: [0, 2, 1, 1, 2, 4, 0, 3, 2, 2, 3, 4, 0, 1, 2, 1, 4, 2, 0, 2, 3, 2, 4, 3],
});

function bamboo() {
  const parts = [];
  for (let stalk = 0; stalk < 4; stalk++) {
    const angle = stalk * 2.4;
    const dx = Math.cos(angle), dz = Math.sin(angle);
    const foot = [dx * 0.44, 0, dz * 0.44], h = 4.7 + (stalk % 3) * 1.2;
    const point = t => [foot[0] + dx * t * t * 0.72, t * h, foot[2] + dz * t * t * 0.72];
    [0, 0.33, 0.66].forEach((t, i) => stem(parts, point(t), point(t + 0.338), 0.1 - i * 0.016, [0x7b8f47, 0x94a553, 0xa5b061][i]));
    for (const t of [0.3, 0.57, 0.74, 0.89]) {
      stem(parts, point(t), point(t + 0.012), 0.103 - t * 0.04, 0x546535);
      const [x, y, z] = point(t);
      for (const side of [-1, 1]) {
        const yaw = angle + side * 0.96 + t * 1.2;
        const tip = [x + dx * 0.16, y, z + dz * 0.16];
        parts.push([LEAF, tip, [0.37, 1.09 - t * 0.36, 0.43], side > 0 ? 0x5c863e : 0x89a956, [0.28, yaw, side * 1.02]]);
        if (t > 0.7)
          parts.push([LEAF, [tip[0] + side * dx * 0.28, y + 0.16, tip[2] + dz * 0.22], [0.25, 0.61, 0.37], 0x436b3b, [0.1, yaw, side * 1.28]]);
      }
    }
  }
  return build(parts);
}

function willow() {
  const parts = [];
  stem(parts, [0, 0, 0], [0.28, 2.33, -0.13], 0.35, 0x655142);
  stem(parts, [0.28, 2.3, -0.13], [-0.28, 4, 0.17], 0.22, 0x776347);
  parts.push([FOLIAGE, [0, 4.56, 0.04], [1.72, 0.89, 1.61], 0x8baf68]);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4, reach = 1.47 + (i % 3) * 0.25, dx = Math.cos(a), dz = Math.sin(a);
    const top = [dx * reach, 4.1 + (i % 3) * 0.34, dz * reach];
    stem(parts, [0.24, 2.73, 0], top, 0.12, 0x6a5841);
    parts.push([BLOOM, top, [1.07, 0.79, 0.94], i % 2 ? 0x82a35d : 0x799952, [0, a, 0.13]]);
    for (const side of [-1, 1]) {
      // Overlapping long leaf sprays leave gaps in the silhouette.
      parts.push([LEAF, [top[0] + dx * 0.32, top[1] - 0.21, top[2] + dz * 0.32],
        [1.19, 2.42 - (i % 3) * 0.21, 0.21], side > 0 ? 0x789d57 : 0x96b374, [Math.PI, a + side * 0.92, side * 0.21]]);
    }
  }
  return build(parts);
}

export function treeModels() {
  return {
    pine: pine(),
    hillPine: build([
      [BARK, [0.03, 1.39, 0], [0.29, 2.78, 0.29], 0x695242],
      [HILL_NEEDLES, [0.02, 4.31, 0.05], [2.53, 2.9, 2.15], 0x467655],
    ]),
    blossom: floweringTree([0xe5a2b5, 0xf6c5cd, 0xbd728e, 0xf5d5d5, 0xe6a3bc], 1.08),
    maple: floweringTree([0xbf6338, 0xdf983f, 0xa54d38, 0xd58140, 0xeaac57], 1.02),
    bamboo: bamboo(),
    willow: willow(),
  };
}
