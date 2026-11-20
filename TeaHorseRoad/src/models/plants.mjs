// 植物与石头的几何：云南松、雪山冷杉、茶树丛、阔叶树和几种石头。
// 每种是一块合并好的几何（顶点色），由地块按实例摆放；同一种在全图共用一份。
//
// Geometry of plants and stones: Yunnan pine, snow fir, tea bushes, broadleaf trees and stones. Each is one merged
// geometry with vertex colours, placed by the tiles as instances; every kind is made once for the whole map.
import {
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

/** A Yunnan pine: a bare reddish trunk, and tiers of dark needles that thin toward the top. `snowy` dusts the tiers. */
export function pineGeometry(snowy = false) {
  return once('pine' + snowy, () => {
    const b = createGeometryBuilder3D(),
      random = seeded(snowy ? 17 : 7);
    b.add(createCylinderGeometry3D({ radiusTop: 0.1, radiusBottom: 0.34, height: 10, radialSegments: 8 }), { position: [0, 5, 0], color: 0x553724 });
    const tiers = 8;
    for (let i = 0; i < tiers; i++) {
      const t = i / (tiers - 1),
        radius = 2.9 * (1 - t * 0.82) + 0.25,
        height = 2.5 - t * 0.9,
        y = 2.6 + i * 1.05;
      // Each tier droops: a wide skirt of needles below a narrower cone.
      const skirt = roughen(createConeGeometry3D({ radius, height, radialSegments: 13 }), 0.14, 31 + i);
      const shade = 0.75 + 0.25 * t;
      const green = [Math.round(0x1c * shade), Math.round(0x38 * shade + 6 * t), Math.round(0x20 * shade)];
      b.add(skirt, { position: [(random() - 0.5) * 0.3, y, (random() - 0.5) * 0.3], rotation: [0, random() * 6, 0], color: (green[0] << 16) | (green[1] << 8) | green[2] });
      if (snowy) b.add(roughen(createConeGeometry3D({ radius: radius * 0.8, height: height * 0.38, radialSegments: 13 }), 0.12, 51 + i), { position: [0, y + height * 0.34, 0], color: 0xe4ebf4 });
    }
    return b.build();
  });
}

/** The same pine seen from afar: a trunk and four plain tiers, a tenth of the triangles. */
export function farPineGeometry(snowy = false) {
  return once('far-pine' + snowy, () => {
    const b = createGeometryBuilder3D();
    b.add(createCylinderGeometry3D({ radiusTop: 0.1, radiusBottom: 0.34, height: 10, radialSegments: 4 }), { position: [0, 5, 0], color: 0x553724 });
    for (let i = 0; i < 4; i++) {
      const t = i / 3,
        shade = 0.8 + 0.2 * t;
      b.add(createConeGeometry3D({ radius: 3.0 * (1 - t * 0.8) + 0.2, height: 3.4 - t, radialSegments: 6 }), {
        position: [0, 3.1 + i * 2.1, 0],
        color: snowy && i % 2 ? 0xc9d2dc : (Math.round(0x1c * shade) << 16) | (Math.round(0x3a * shade) << 8) | Math.round(0x20 * shade)
      });
    }
    return b.build();
  });
}

/** A broadleaf tree seen from afar: three plain lumps on a trunk. */
export function farBroadleafGeometry() {
  return once('far-broadleaf', () => {
    const b = createGeometryBuilder3D();
    b.add(createCylinderGeometry3D({ radiusTop: 0.18, radiusBottom: 0.38, height: 4.6, radialSegments: 4 }), { position: [0, 2.3, 0], color: 0x4e3a2a });
    b.add(createIcosahedronGeometry3D({ radius: 2.6, detail: 0 }), { position: [0, 6.2, 0], color: 0x2f5a26 });
    b.add(createIcosahedronGeometry3D({ radius: 1.9, detail: 0 }), { position: [1.6, 5.6, 0.4], color: 0x3a6a2c });
    b.add(createIcosahedronGeometry3D({ radius: 1.8, detail: 0 }), { position: [-1.4, 5.5, -0.6], color: 0x2a5222 });
    return b.build();
  });
}

/** A broadleaf tree of the tea hills: a leaning trunk and a crown of lumpy clusters. */
export function broadleafGeometry() {
  return once('broadleaf', () => {
    const b = createGeometryBuilder3D(),
      random = seeded(23);
    b.add(createCylinderGeometry3D({ radiusTop: 0.18, radiusBottom: 0.38, height: 4.6, radialSegments: 7 }), { position: [0, 2.3, 0], rotation: [0.05, 0, 0.06], color: 0x4e3a2a });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2,
        r = i === 0 ? 0 : 1.6 + random() * 0.6,
        size = i === 0 ? 2.4 : 1.6 + random() * 0.5;
      b.add(roughen(createIcosahedronGeometry3D({ radius: size, detail: 1, smooth: true }), 0.16, 61 + i), {
        position: [Math.cos(a) * r, 5.4 + (i === 0 ? 1.2 : random() * 1.2), Math.sin(a) * r],
        color: [0x2f5a26, 0x3a6a2c, 0x2a5222][i % 3]
      });
    }
    return b.build();
  });
}

/** A tea bush, clipped round and flat on top as tea is, its leaves a fresh deep green. */
export function teaBushGeometry() {
  return once('tea-bush', () => {
    const b = createGeometryBuilder3D();
    // Long and low, so bushes side by side in a row close into a clipped hedge.
    b.add(roughen(createSphereGeometry3D({ radius: 0.8, widthSegments: 9, heightSegments: 5 }), 0.08, 71), { position: [0, 0.5, 0], scale: [1.45, 0.78, 0.8], color: 0x24501f });
    b.add(roughen(createSphereGeometry3D({ radius: 0.6, widthSegments: 8, heightSegments: 4 }), 0.1, 72), { position: [0.15, 0.86, 0], scale: [1.7, 0.42, 0.95], color: 0x3e7428 });
    return b.build();
  });
}

/** A stretch of clipped tea hedge one metre long, for rows seen from afar; scaled along X to the stretch's length. */
export function teaStripGeometry() {
  return once('tea-strip', () => {
    const b = createGeometryBuilder3D();
    b.add(createSphereGeometry3D({ radius: 0.5, widthSegments: 8, heightSegments: 4 }), { position: [0, 0.5, 0], scale: [1.02, 0.95, 1.25], color: 0x2c5a22 });
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
