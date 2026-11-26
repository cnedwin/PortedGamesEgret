// 植物与石头的几何：云南松、雪山冷杉、茶树丛、阔叶树和几种石头。
// 每种是一块合并好的几何（顶点色），由地块按实例摆放；同一种在全图共用一份。
//
// Geometry of plants and stones: Yunnan pine, snow fir, tea bushes, broadleaf trees and stones. Each is one merged
// geometry with vertex colours, placed by the tiles as instances; every kind is made once for the whole map.
import {
  Attribute3D,
  Geometry3D,
  createConeGeometry3D,
  createCylinderGeometry3D,
  createGeometryBuilder3D,
  createIcosahedronGeometry3D,
  createSphereGeometry3D
} from '@egret/engine/world3d';
import { seeded } from '../world/noise.mjs';

const made = new Map();
const once = (key, make) => (made.has(key) ? made.get(key) : (made.set(key, make()), made.get(key)));

/** Push a geometry's vertices out or in along their direction from the centre by seeded noise, for rough shapes. */
function roughen(geometry, amount, seed) {
  const random = seeded(seed),
    attribute = geometry.getAttribute('position'),
    p = attribute.data,
    offsets = new Map();
  for (let i = 0; i < p.length; i += 3) {
    // Vertices at the same place move together, so seams stay closed.
    const key = `${p[i].toFixed(3)},${p[i + 1].toFixed(3)},${p[i + 2].toFixed(3)}`;
    if (!offsets.has(key)) offsets.set(key, 1 + (random() * 2 - 1) * amount);
    const k = offsets.get(key);
    p[i] *= k;
    p[i + 1] *= k;
    p[i + 2] *= k;
  }
  attribute.touch();
  geometry.invalidateBounds();
  geometry.computeNormals();
  return geometry;
}

const linear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const color = (hex) => [hex >> 16, (hex >> 8) & 255, hex & 255].map((channel) => linear(channel / 255));

function coloredMesh(positions, indices, colors) {
  const g = new Geometry3D();
  g.setAttribute('position', new Attribute3D(Float32Array.from(positions), 3));
  g.setAttribute('color', new Attribute3D(Float32Array.from(colors), 3));
  g.setIndex(Uint16Array.from(indices));
  g.computeNormals();
  return g;
}

/** A tapered woody limb between two points. */
function limb(builder, start, end, base, tip, tint, segments = 4) {
  const dx = end[0] - start[0],
    dy = end[1] - start[1],
    dz = end[2] - start[2],
    height = Math.hypot(dx, dy, dz),
    q = Math.hypot(dx, dz, height + dy);
  builder.add(createCylinderGeometry3D({ radiusTop: tip, radiusBottom: base, height, radialSegments: segments, openEnded: true }), {
    position: [(start[0] + end[0]) * 0.5, (start[1] + end[1]) * 0.5, (start[2] + end[2]) * 0.5],
    quaternion: [dz / q, 0, -dx / q, (height + dy) / q],
    color: tint
  });
}

function crownCluster(seed) {
  return roughen(createIcosahedronGeometry3D({ radius: 1, detail: 0 }), 0.16, seed);
}

/** Open, asymmetrical shelves of needles around the bent, red-brown Yunnan pine trunk. */
function makePine(far) {
  const b = createGeometryBuilder3D(),
    trunk = [[0, -0.1, 0], [0.09, 3.6, -0.12], [-0.22, 6.8, 0.14], [0.21, 10, -0.04]],
    layers = [
      [[-1.73, 4.7, 0.58], [1.48, 0.51, 1.03], 0x345b4b],
      [[1.58, 5.77, -0.72], [1.68, 0.68, 1.3], 0x3e6a52],
      [[-0.11, 6.72, 1.66], [1.22, 0.59, 1.18], 0x427357],
      [[-1.12, 7.37, -0.9], [1.52, 0.69, 1.28], 0x507a57],
      [[0.96, 8.51, 0.28], [1.37, 0.73, 1.12], 0x577e55],
      [[0.13, 9.64, -0.24], [1.32, 0.97, 1.15], 0x61895e]
    ];
  if (far) {
    limb(b, trunk[0], trunk[3], 0.36, 0.08, 0x674536);
    for (const i of [0, 1, 3, 5]) {
      const [position, scale, color] = layers[i];
      b.add(crownCluster(31 + i), { position, scale: [scale[0] * 1.12, scale[1] * 1.14, scale[2] * 1.12], color });
    }
    return b.build();
  }
  limb(b, trunk[0], trunk[1], 0.43, 0.26, 0x6a4735, 7);
  limb(b, trunk[1], trunk[2], 0.26, 0.18, 0x795140, 6);
  limb(b, trunk[2], trunk[3], 0.18, 0.04, 0x795140, 5);
  for (let i = 0; i < layers.length; i++) {
    const [position, scale, color] = layers[i];
    if (i < 5) limb(b, [trunk[1][0], position[1] - 1.3, 0], position, 0.16 - 0.016 * i, 0.04, 0x765441);
    b.add(crownCluster(31 + i), { position, scale, rotation: [0, i * 0.7, 0.08 * (i % 2)], color });
    b.add(crownCluster(47 + i), { position: [position[0] * 0.77, position[1] + 0.29, position[2] * 0.73], scale: [scale[0] * 0.73, scale[1], scale[2] * 0.77], color });
  }
  return b.build();
}

/** A drooping fir whorl with snow on the upper surface and green needles at the tips. */
function firWhorl(segments, snow, seed) {
  const positions = [0, 1, 0],
    indices = [],
    colors = color(snow),
    random = seeded(seed),
    needles = color(0x33574e),
    shade = color(0x25443f);
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2,
      x = Math.cos(a),
      z = Math.sin(a),
      edge = (i % 2 ? 0.73 : 1) * (0.85 + 0.15 * random()),
      height = i % 2 ? 0.09 : -0.16;
    positions.push(x * edge * 0.61, 0.48, z * edge * 0.61, x * edge, height, z * edge);
    colors.push(...color(i % 3 === 0 ? 0x96b2b6 : snow), ...needles);
    const shoulder = i * 2 + 1,
      next = ((i + 1) % segments) * 2 + 1;
    indices.push(0, next, shoulder, shoulder, next, shoulder + 1, next, next + 1, shoulder + 1, shoulder + 1, next + 1, segments * 2 + 1);
  }
  positions.push(0, 0.03, 0);
  colors.push(...shade);
  return coloredMesh(positions, indices, colors);
}

function makeFir(far) {
  const b = createGeometryBuilder3D(),
    tiers = far ? 3 : 6,
    palette = [0xa5bac2, 0xc8dbdf, 0xdeebed];
  limb(b, [0, -0.08, 0], [0.13, 10.1, -0.05], 0.35, 0.07, 0x5a4942, far ? 4 : 6);
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1),
      radius = 2.97 - 2.52 * t;
    b.add(firWhorl(far ? 6 : 10, palette[i % palette.length], 54 + i), {
      position: [0.16 * t, 2.15 + 7.48 * t, -0.12 * t],
      scale: [radius, (far ? 3.45 : 2.4) * (1 - 0.58 * t), radius],
      rotation: [0, i * 1.47, 0],
      keepColors: true
    });
  }
  return b.build();
}

export function pineGeometry(snowy = false) {
  return once('pine' + snowy, () => snowy ? makeFir(false) : makePine(false));
}

export function farPineGeometry(snowy = false) {
  return once('far-pine' + snowy, () => snowy ? makeFir(true) : makePine(true));
}

/** Warm broadleaf shade trees along the tea terraces with a forked trunk and tiered crown. */
function makeBroadleaf(far) {
  const b = createGeometryBuilder3D(),
    crown = [
      [[-1.82, 5.49, 0.32], [2.02, 1.21, 1.61], 0x527544],
      [[1.54, 5.38, 0.49], [2.12, 1.43, 1.68], 0x668448],
      [[0.27, 6.62, -1.1], [2.79, 1.92, 1.86], 0x68894f],
      [[-0.41, 6.08, 1.05], [2.08, 1.47, 1.5], 0x7d9958]
    ];
  limb(b, [0, -0.08, 0], [-0.22, far ? 6.1 : 3.4, 0.16], 0.43, 0.25, 0x644c37, far ? 4 : 7);
  for (let i = 0; i < crown.length; i++) {
    const [position, scale, color] = crown[i];
    if (!far) limb(b, [-0.22, 3.25, 0.16], position, 0.24, 0.09, 0x765a41, 5);
    b.add(crownCluster(65 + i), { position, scale, color });
    if (!far) b.add(crownCluster(77 + i), { position: [position[0] * 0.78, position[1] + 0.63, position[2] * 0.72], scale: [scale[0] * 0.72, scale[1] * 0.83, scale[2] * 0.83], rotation: [0.14, i * 0.8, 0], color });
  }
  return b.build();
}

export function broadleafGeometry() {
  return once('broadleaf', () => makeBroadleaf(false));
}

export function farBroadleafGeometry() {
  return once('far-broadleaf', () => makeBroadleaf(true));
}

/** A rounded hedge with darker mature leaves beneath the yellow-green new growth. */
function teaCrown(far) {
  const g = roughen(createSphereGeometry3D({ radius: 1, widthSegments: far ? 6 : 8, heightSegments: far ? 3 : 4 }), 0.055, 71),
    positions = g.getAttribute('position').data,
    colors = new Float32Array(positions.length),
    base = color(0x314b28),
    middle = color(0x577539),
    top = color(0x8d9e48);
  for (let i = 0; i < positions.length; i += 3) {
    const y = positions[i + 1],
      shade = y < 0 ? base : top,
      t = Math.min(1, Math.abs(y));
    for (let c = 0; c < 3; c++) colors[i + c] = middle[c] + (shade[c] - middle[c]) * t;
  }
  g.setAttribute('color', new Attribute3D(colors, 3));
  return g;
}

/** One folded, lanceolate tea leaf. */
function teaLeaf() {
  return coloredMesh(
    [0, 0, 0, 0.44, 0.12, 0.16, 1, 0.29, 0.02, 0.49, 0.08, -0.16, 0.46, 0.16, 0],
    [0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4],
    [0x768937, 0x93a843, 0xc8c879, 0xa7b957, 0xb5c469].flatMap(color)
  );
}

/** A clipped tea bush with layered foliage and clusters of individual young leaves. */
export function teaBushGeometry() {
  return once('tea-bush', () => {
    const b = createGeometryBuilder3D(),
      leaf = teaLeaf(),
      random = seeded(72);
    b.add(teaCrown(false), { position: [0, 0.45, 0], scale: [1.13, 0.51, 0.64], keepColors: true });
    for (let i = 0; i < 9; i++) {
      const x = (random() - 0.5) * 1.55,
        z = (random() - 0.5) * 0.71,
        top = 0.43 + 0.46 * Math.sqrt(1 - (x / 1.13) ** 2 - (z / 0.64) ** 2);
      b.add(leaf, { position: [x, top, z], scale: 0.27 + random() * 0.23, rotation: [0, random() * Math.PI * 2, 0], keepColors: true });
    }
    return b.build();
  });
}

/** A one-metre tea hedge segment with the same crown palette as the nearby bushes. */
export function teaStripGeometry() {
  return once('tea-strip', () => {
    const b = createGeometryBuilder3D();
    b.add(teaCrown(true), { position: [0, 0.45, 0], scale: [0.53, 0.51, 0.61], keepColors: true });
    return b.build();
  });
}

/** Stones: a weathered boulder, a flat slab and scree, each roughened differently. */
export function stoneGeometry(kind = 0) {
  return once('stone' + kind, () => {
    const b = createGeometryBuilder3D();
    if (kind === 0) b.add(roughen(createIcosahedronGeometry3D({ radius: 1, detail: 2, smooth: true }), 0.22, 81), { scale: [1.2, 0.8, 1], color: 0x77736c });
    else if (kind === 1) b.add(roughen(createIcosahedronGeometry3D({ radius: 1, detail: 1, smooth: true }), 0.18, 82), { scale: [1.6, 0.45, 1.1], color: 0x6c675f });
    else for (let i = 0; i < 4; i++) b.add(roughen(createIcosahedronGeometry3D({ radius: 0.4, detail: 0 }), 0.25, 83 + i), { position: [i * 0.5 - 0.7, 0.1, (i % 2) * 0.4], color: 0x827d74 });
    return b.build();
  });
}

/** A low tuft of grass or alpine shrub, three crossed blades. */
export function tuftGeometry(color = 0x6a7a3a) {
  return once('tuft' + color, () => {
    const b = createGeometryBuilder3D(),
      cone = createConeGeometry3D({ radius: 0.28, height: 0.7, radialSegments: 5 });
    for (let i = 0; i < 3; i++) b.add(cone, { position: [(i - 1) * 0.18, 0.3, (i % 2) * 0.12], rotation: [0.25 * (i - 1), i, 0.2], color });
    return b.build();
  });
}
