// 草木：每块地加载时，按 sim/land.mjs 的林地浓淡撒树——北方多松柏，南方多阔叶，高处是针叶林；每块地每种树一个
// 实例网格，远了不画，画质低时树少一半。树避开水、路、城墙和陡崖。
// Trees: as each tile of land comes in, trees are scattered by the woodland of sim/land.mjs — pines and cypresses in the
// north, broadleaves in the south, conifers on the heights; one instanced mesh per kind of tree per tile, not drawn when
// far, and half as many at low quality. Trees keep off water, roads, walls and cliffs.
import { InstancedMesh3D, createConeGeometry3D, createCylinderGeometry3D, createCustomShader3D, createGeometryBuilder3D, createIcosahedronGeometry3D, createStandardMaterial3D, mat4Compose, quatFromEuler } from '@egret/engine/world3d';
import { landAt, noise } from '../sim/land.mjs';
import { TILE } from './terrain.mjs';

/** The plain trees of low quality: a cone or a ball on a stick. */
function plainPine() {
  const b = createGeometryBuilder3D();
  b.add(createCylinderGeometry3D({ radiusTop: 0.06, radiusBottom: 0.08, height: 0.5, radialSegments: 4 }), { position: [0, 0.25, 0], color: 0x4a3626 });
  for (let i = 0; i < 3; i++) b.add(createConeGeometry3D({ radius: 0.62 - i * 0.16, height: 0.8 - i * 0.09, radialSegments: 5 }), { position: [0.03 * i, 0.8 + i * 0.42, 0], color: [0x294d40, 0x345b46, 0x486c4d][i] });
  return b.build();
}
function plainBroadleaf() {
  const b = createGeometryBuilder3D();
  b.add(createCylinderGeometry3D({ radiusTop: 0.06, radiusBottom: 0.09, height: 0.6, radialSegments: 4 }), { position: [0, 0.3, 0], color: 0x4d3a28 });
  const crown = createIcosahedronGeometry3D({ radius: 0.5, detail: 0 });
  b.add(crown, { position: [-0.22, 0.91, 0], scale: [1.12, 0.65, 0.9], color: 0x42684b });
  b.add(crown, { position: [0.23, 1.23, -0.1], scale: [0.9, 0.7, 1], color: 0x5d7b50 });
  return b.build();
}
function pine() {
  const b = createGeometryBuilder3D();
  b.add(createCylinderGeometry3D({ radiusTop: 0.035, radiusBottom: 0.095, height: 1.7, radialSegments: 5 }), { position: [0, 0.85, 0], rotation: [0, 0, 0.06], color: 0x5a4936 });
  const shades = [0x284b3d, 0x315641, 0x3c6248, 0x567451];
  for (let i = 0; i < 4; i++) {
    b.add(createConeGeometry3D({ radius: 0.67 - i * 0.15, height: 0.74 - i * 0.07, radialSegments: 7 }), { position: [Math.sin(i * 2) * 0.07, 0.8 + i * 0.35, Math.cos(i * 2) * 0.04], rotation: [0.04, i * 0.65, 0.06], scale: [1.1, 1, 0.86], color: shades[i] });
  }
  return b.build();
}
function broadleaf() {
  const b = createGeometryBuilder3D();
  const trunk = createCylinderGeometry3D({ radiusTop: 0.035, radiusBottom: 0.09, height: 0.9, radialSegments: 5 });
  b.add(trunk, { position: [0, 0.45, 0], rotation: [0, 0, -0.12], color: 0x5c4a37 });
  for (const side of [-1, 1]) b.add(trunk, { position: [side * 0.15, 0.75, 0], scale: [0.6, 0.65, 0.6], rotation: [0.25, 0, side * -0.65], color: 0x65513a });
  const crown = createIcosahedronGeometry3D({ radius: 0.48, detail: 0 });
  const clusters = [[-0.36, 0.99, 0.08, 0x375e49], [0.32, 1.15, 0.1, 0x50764e], [-0.02, 1.43, -0.17, 0x688655], [0.12, 1.01, 0.37, 0x426a46]];
  for (const [x, y, z, color] of clusters) b.add(crown, { position: [x, y, z], rotation: [0.15, y * 2, x], scale: [1.15, 0.68, 1], color });
  return b.build();
}

function reeds() {
  const b = createGeometryBuilder3D();
  const stalk = createCylinderGeometry3D({ radiusTop: 0.012, radiusBottom: 0.018, height: 0.72, radialSegments: 3 });
  const seed = createCylinderGeometry3D({ radiusTop: 0.035, radiusBottom: 0.03, height: 0.14, radialSegments: 4 });
  for (let i = 0; i < 4; i++) {
    const x = Math.sin(i * 2.4) * 0.13, z = Math.cos(i * 2.4) * 0.13;
    b.add(stalk, { position: [x, 0.36, z], rotation: [i * 0.06, 0, -0.1], color: 0x657a4f });
    b.add(seed, { position: [x + 0.03, 0.76, z], color: 0x8f7751 });
  }
  return b.build();
}

function distantTree(conifer) {
  const b = createGeometryBuilder3D();
  if (conifer) {
    b.add(createConeGeometry3D({ radius: 0.68, height: 1.8, radialSegments: 4 }), { position: [0, 1.1, 0], color: 0x3c6048 });
  } else {
    b.add(createIcosahedronGeometry3D({ radius: 0.67, detail: 0 }), { position: [0, 1.1, 0], scale: [1.1, 0.73, 1], color: 0x57794e });
  }
  return b.build();
}

const FOLIAGE_GLSL = /* glsl */ `
vec4 customFragment(vec4 color, vec3 wp, vec3 normal, vec2 uv) {
  float leaf = smoothstep(0.0, 0.05, color.g - color.r * 1.05);
  vec3 tint = mix(vec3(1.0), uCustom[0].rgb, leaf);
  vec3 c = color.rgb * tint;
  float north = 1.0 - smoothstep(1050.0, 2050.0, wp.z);
  float snow = uCustom[0].w * clamp(north + smoothstep(14.0, 27.0, wp.y) * 0.6, 0.0, 1.0);
  c = mix(c, vec3(0.72, 0.79, 0.77), snow * leaf * smoothstep(0.3, 0.85, normal.y) * 0.86);
  return vec4(c, color.a);
}`;

/** Woods on the tiles of `land`. Returns `onTile(tile, loaded)` for the stream to call. */
export function createFlora(scene, { quality = 'medium' } = {}) {
  const kinds = [...(quality === 'low' ? [plainPine(), plainBroadleaf()] : [pine(), broadleaf()]), reeds()];
  const proxies = [distantTree(true), distantTree(false)];
  const material = createStandardMaterial3D({ vertexColors: true, roughness: 0.9, metallic: 0, flatShading: true });
  material.shader = createCustomShader3D({ key: 'nine-canopy-season', glsl: FOLIAGE_GLSL, uniforms: [1, 1, 1, 0] });
  const spacing = quality === 'low' ? 1.9 : quality === 'medium' ? 1.15 : 1.0;
  const reach = quality === 'low' ? 85 : quality === 'medium' ? 170 : 220;
  const byTile = new Map();
  const stats = { nearTiles: 0, farTiles: 0, trees: 0, reeds: 0, triangles: 0 };
  const enterDetail = quality === 'low' ? 83 : 118;
  const sample = {},
    m = new Float32Array(16),
    q = [0, 0, 0, 1];
  function plant(tile) {
    const x0 = tile.x * TILE,
      z0 = tile.z * TILE;
    const lists = [[], [], []];
    for (let gz = 0; gz < TILE; gz += spacing)
      for (let gx = 0; gx < TILE; gx += spacing) {
        const jx = noise(x0 + gx, z0 + gz, 91),
          jz = noise(x0 + gx + 7.3, z0 + gz - 3.1, 92);
        const x = x0 + gx + (jx - 0.5) * spacing * 1.6,
          z = z0 + gz + (jz - 0.5) * spacing * 1.6;
        landAt(x, z, sample);
        if (!sample.water && sample.place < 0.12 && sample.road > 1.1 && sample.height < 9 && (sample.shore < 1.5 || (sample.river > 1 && sample.river < 1.65)) && jx > 0.65) {
          lists[2].push(x, sample.height, z, jz);
        }
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
      mesh.userData = { landscape: 'flora', kind, tile: [tile.x, tile.z] };
      // A deterministic spatially mixed prefix makes thinning even, rather than deleting one edge of a tile.
      const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => noise(list[a * 4], list[a * 4 + 2], 107) - noise(list[b * 4], list[b * 4 + 2], 107));
      for (let i = 0; i < n; i++) {
        const source = order[i] * 4;
        const x = list[source],
          y = list[source + 1],
          z = list[source + 2],
          r = list[source + 3];
        const s = 0.75 + r * 0.55;
        quatFromEuler(q, (r - 0.5) * 0.12, r * 6.28, (r - 0.5) * 0.1);
        mat4Compose(m, [x, y - 0.05, z], q, [s, s * (0.9 + r * 0.3), s]);
        mesh.setMatrixAt(i, m);
        const tint = 0.85 + r * 0.3;
        mesh.setColorAt(i, tint * (kind ? 1 : 0.95), tint, tint * (kind ? 0.9 : 1));
      }
      mesh.cullDistance = kind === 2 ? 110 : 330;
      mesh.castShadow = kind !== 2 && quality !== 'low';
      mesh.receiveShadow = true;
      mesh.pickable = false;
      scene.addChild(mesh);
      meshes.push({ mesh, kind, count: n });
    });
    byTile.set(tile, { meshes, near: false, x: x0 + TILE / 2, z: z0 + TILE / 2 });
  }
  return {
    stats,
    update(view, forceDetail = false) {
      stats.nearTiles = stats.farTiles = stats.trees = stats.reeds = stats.triangles = 0;
      for (const record of byTile.values()) {
        const metric = Math.hypot(record.x - view.x, record.z - view.z, view.d);
        const near = forceDetail || metric < enterDetail + (record.near ? 22 : 0);
        record.near = near;
        if (near) stats.nearTiles++;
        else stats.farTiles++;
        for (const { mesh, kind, count } of record.meshes) {
          mesh.geometry = near || kind === 2 ? kinds[kind] : proxies[kind];
          mesh.count = near ? count : kind === 2 ? 0 : Math.max(1, Math.floor(count * 0.36));
          mesh.visible = mesh.count > 0;
          mesh.castShadow = near && kind !== 2 && quality !== 'low';
          if (kind === 2) stats.reeds += mesh.count;
          else stats.trees += mesh.count;
          stats.triangles += mesh.count * mesh.geometry.drawCount / 3;
        }
      }
    },
    setSeason(season) {
      material.shader.uniforms.set([1 + season.autumn * 1.25 + season.spring * 0.08, 1 - season.autumn * 0.24 + season.spring * 0.12, 1 - season.autumn * 0.58, season.winter]);
    },
    onTile(tile, loaded) {
      if (loaded) plant(tile);
      else {
        for (const { mesh } of byTile.get(tile)?.meshes ?? []) {
          scene.removeChild(mesh);
        }
        byTile.delete(tile);
      }
    }
  };
}
