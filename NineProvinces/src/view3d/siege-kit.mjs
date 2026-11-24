import {
  createBoxGeometry3D,
  createCylinderGeometry3D,
  createGeometryBuilder3D,
  createTorusGeometry3D
} from '@egret/engine/world3d';

export const SIEGE_COLORS = {
  timber: 0x815632,
  darkWood: 0x3e2b21,
  edgeWood: 0xab7546,
  planks: [0x684831, 0x94613a, 0x794d30, 0x9e6d43],
  iron: 0x3b4444,
  ironEdge: 0x778080,
  bronze: 0xad8450,
  rope: 0xc5aa7c,
  linen: 0xcdb28a,
  hide: 0xa18256,
  flag: 0xf5eee0,
  flagTrim: 0xb5a990
};

const cube = createBoxGeometry3D();
const axleTurn = [0, 0, Math.PI / 2];
const wheelTurn = [0, Math.PI / 2, 0];

/** Bake all fixed surfaces and all faction-dyed cloth into two shared meshes. */
export function siegeBuilder(detail) {
  const plain = createGeometryBuilder3D();
  const coat = createGeometryBuilder3D();
  const block = (color, position, scale, rotation) => plain.add(cube, { color, position, scale, rotation });
  const cloth = (color, position, scale, rotation) => coat.add(cube, { color, position, scale, rotation });

  function round(color, position, radiusTop, radiusBottom, height, radialSegments = 8, rotation) {
    const geometry = createCylinderGeometry3D({ radiusTop, radiusBottom, height, radialSegments });
    plain.add(geometry, { color, position, rotation });
  }

  function beam(color, from, to, width, depth = width) {
    const delta = to.map((n, i) => n - from[i]);
    const length = Math.hypot(...delta);
    const [x, y, z] = delta.map(n => n / length);
    const normal = Math.hypot(z, -x, 1 + y);
    const quaternion = normal > 1e-8 ? [z / normal, 0, -x / normal, (1 + y) / normal] : [1, 0, 0, 0];
    const position = to.map((n, i) => (n + from[i]) / 2);
    plain.add(cube, { color, position, scale: [width, length, depth], quaternion });
  }

  function wheels(x, zOffsets, radius) {
    const { timber, darkWood, edgeWood, iron, ironEdge, bronze } = SIEGE_COLORS;
    const rim = createTorusGeometry3D({ radius: radius * .86, tube: radius * .14, radialSegments: 4,
      tubularSegments: detail ? 12 : 8 });
    const band = createTorusGeometry3D({ radius: radius * .92, tube: radius * .065, radialSegments: 3,
      tubularSegments: 12 });
    for (const z of zOffsets) {
      round(darkWood, [0, radius, z], .031, .031, x * 2, 6, axleTurn);
      for (const side of [-1, 1]) {
        const axle = side * x;
        plain.add(rim, { position: [axle, radius, z], rotation: wheelTurn, scale: [1, 1, 1.35], color: iron });
        if (detail) plain.add(band, { position: [axle + side * radius * .11, radius, z],
          rotation: wheelTurn, color: ironEdge });
        const spokes = detail ? 6 : 4;
        for (let i = 0; i < spokes; i++) {
          const angle = i * Math.PI * 2 / spokes;
          beam(i % 2 ? timber : edgeWood, [axle, radius, z],
            [axle, radius + Math.cos(angle) * radius * .8, z + Math.sin(angle) * radius * .8], radius * .2);
        }
        round(timber, [axle, radius, z], radius * .37, radius * .37, radius * .54, 8, axleTurn);
        round(bronze, [axle + side * radius * .29, radius, z], radius * .22, radius * .22, radius * .105, 6, axleTurn);
      }
    }
  }

  return { block, round, beam, cloth, wheels, finish: () => ({ plain: plain.build(), coat: coat.build() }) };
}
