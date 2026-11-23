// 草木：每块地加载时，按 sim/land.mjs 的林地浓淡撒树——北方多松柏，南方多阔叶，高处是针叶林；每块地每种树一个
// 实例网格，远了不画，画质低时树少一半。树避开水、路、城墙和陡崖。
// Trees: as each tile of land comes in, trees are scattered by the woodland of sim/land.mjs — pines and cypresses in the
// north, broadleaves in the south, conifers on the heights; one instanced mesh per kind of tree per tile, not drawn when
// far, and half as many at low quality. Trees keep off water, roads, walls and cliffs.
import { InstancedMesh3D, createConeGeometry3D, createCylinderGeometry3D, createGeometryBuilder3D, createIcosahedronGeometry3D, createStandardMaterial3D, mat4Compose, quatFromEuler } from '@egret/engine/world3d';
import { landAt, noise } from '../sim/land.mjs';
import { TILE } from './terrain.mjs';

/** The plain trees of low quality: a cone or a ball on a stick. */
function plainPine() {
  const b = createGeometryBuilder3D();
  b.add(createCylinderGeometry3D({ radiusTop: 0.06, radiusBottom: 0.08, height: 0.5, radialSegments: 4 }), { position: [0, 0.25, 0], color: 0x4a3626 });
  b.add(createConeGeometry3D({ radius: 0.6, height: 1.5, radialSegments: 6 }), { position: [0, 1.15, 0], color: 0x33502f });
  return b.build();
}
function plainBroadleaf() {
  const b = createGeometryBuilder3D();
  b.add(createCylinderGeometry3D({ radiusTop: 0.06, radiusBottom: 0.09, height: 0.6, radialSegments: 4 }), { position: [0, 0.3, 0], color: 0x4d3a28 });
  b.add(createIcosahedronGeometry3D({ radius: 0.6, detail: 0 }), { position: [0, 1.0, 0], scale: [1, 0.9, 1], color: 0x4a6a32 });
  return b.build();
}
function pine() {
  const b = createGeometryBuilder3D();
  b.add(createCylinderGeometry3D({ radiusTop: 0.05, radiusBottom: 0.08, height: 0.5, radialSegments: 5 }), { position: [0, 0.25, 0], color: 0x4a3626 });
  b.add(createConeGeometry3D({ radius: 0.62, height: 0.95, radialSegments: 7 }), { position: [0, 0.78, 0], color: 0x2f4a2c });
  b.add(createConeGeometry3D({ radius: 0.48, height: 0.8, radialSegments: 7 }), { position: [0, 1.22, 0], rotation: [0, 0.4, 0], color: 0x355432 });
  b.add(createConeGeometry3D({ radius: 0.3, height: 0.6, radialSegments: 6 }), { position: [0, 1.62, 0], rotation: [0, 0.9, 0], color: 0x3c5d36 });
  return b.build();
}
function broadleaf() {
  const b = createGeometryBuilder3D();
  b.add(createCylinderGeometry3D({ radiusTop: 0.05, radiusBottom: 0.09, height: 0.65, radialSegments: 5 }), { position: [0, 0.32, 0], color: 0x4d3a28 });
  b.add(createIcosahedronGeometry3D({ radius: 0.55, detail: 0 }), { position: [0, 0.95, 0], scale: [1, 0.85, 1], color: 0x47662f });
  b.add(createIcosahedronGeometry3D({ radius: 0.38, detail: 0 }), { position: [0.28, 1.2, 0.1], rotation: [0.3, 0.5, 0], color: 0x51703a });
  b.add(createIcosahedronGeometry3D({ radius: 0.34, detail: 0 }), { position: [-0.22, 1.15, -0.18], rotation: [0.1, 1.2, 0.4], color: 0x3f5c2b });
  return b.build();
}

/** Woods on the tiles of `land`. Returns `onTile(tile, loaded)` for the stream to call. */
export function createFlora(scene, { quality = 'medium' } = {}) {
  const kinds = quality === 'low' ? [plainPine(), plainBroadleaf()] : [pine(), broadleaf()];
  const material = createStandardMaterial3D({ vertexColors: true, roughness: 0.9, metallic: 0, flatShading: true });
  const spacing = quality === 'low' ? 1.9 : quality === 'medium' ? 1.15 : 1.0;
  const reach = quality === 'low' ? 85 : quality === 'medium' ? 170 : 220;
  const byTile = new Map();
  const sample = {},
    m = new Float32Array(16),
    q = [0, 0, 0, 1];
  function plant(tile) {
    const x0 = tile.x * TILE,
      z0 = tile.z * TILE;
    const lists = [[], []];
    for (let gz = 0; gz < TILE; gz += spacing)
      for (let gx = 0; gx < TILE; gx += spacing) {
        const jx = noise(x0 + gx, z0 + gz, 91),
          jz = noise(x0 + gx + 7.3, z0 + gz - 3.1, 92);
        const x = x0 + gx + (jx - 0.5) * spacing * 1.6,
          z = z0 + gz + (jz - 0.5) * spacing * 1.6;
        landAt(x, z, sample);
        if (sample.water || sample.place > 0.2 || sample.road < 1.1 || sample.river < 1.6 || sample.shore < 1.5) continue;
        // Woods, and a scatter of single trees in the open.
        const chance = sample.forest * 1.15 + 0.02 * (1 - sample.desert) * (1 - sample.steppe);
        if (noise(x * 3.1, z * 3.1, 93) > chance) continue;
        if (sample.height > 26) continue;
        const south = Math.min(1, Math.max(0, (z - 1300) / 700));
        const conifer = sample.height > 12 || noise(x / 9, z / 9, 94) > 0.35 + south * 0.5;
        lists[conifer ? 0 : 1].push(x, sample.height, z, noise(x * 5.3, z * 5.1, 95));
      }
    const meshes = [];
    lists.forEach((list, kind) => {
      const n = list.length / 4;
      if (!n) return;
      const mesh = new InstancedMesh3D(kinds[kind], material, n);
      for (let i = 0; i < n; i++) {
        const x = list[i * 4],
          y = list[i * 4 + 1],
          z = list[i * 4 + 2],
          r = list[i * 4 + 3];
        const s = 0.75 + r * 0.55;
        quatFromEuler(q, (r - 0.5) * 0.12, r * 6.28, (r - 0.5) * 0.1);
        mat4Compose(m, [x, y - 0.05, z], q, [s, s * (0.9 + r * 0.3), s]);
        mesh.setMatrixAt(i, m);
        const tint = 0.85 + r * 0.3;
        mesh.setColorAt(i, tint * (kind ? 1 : 0.95), tint, tint * (kind ? 0.9 : 1));
      }
      mesh.cullDistance = reach;
      mesh.castShadow = quality !== 'low';
      mesh.receiveShadow = true;
      mesh.pickable = false;
      scene.addChild(mesh);
      meshes.push(mesh);
    });
    byTile.set(tile, meshes);
  }
  return {
    onTile(tile, loaded) {
      if (loaded) plant(tile);
      else {
        for (const mesh of byTile.get(tile) ?? []) {
          scene.removeChild(mesh);
        }
        byTile.delete(tile);
      }
    }
  };
}
