// 水：东边和南边的海是一整片有浪的水面；每条江河是一条顺着河道铺的水带，水位从源头到入海一路降低；湖是按湖岸
// 铺的平水面。画质低时用不折射的简单水面。
// Water: the seas to the east and south are one wide surface with waves; each river is a ribbon laid along its bed, its
// level falling from source to mouth; each lake a level sheet within its shore. At low quality the water is a simple
// surface without refraction.
import { Mesh3D, createGeometry3D, createStandardMaterial3D, createWater3D, createWaterMaterial3D } from '@egret/engine/world3d';
import { MAP } from '../data/map.mjs';
import { LAKE_SHAPES, RIVER_LINES } from '../sim/land.mjs';

function ribbon(line, stride = 1) {
  const samples = [];
  for (let i = 0; i < line.points.length - 1; i += stride) samples.push(i);
  samples.push(line.points.length - 1);
  const n = samples.length,
    positions = new Float32Array(n * 2 * 3),
    normals = new Float32Array(n * 2 * 3),
    uvs = new Float32Array(n * 2 * 2),
    indices = [];
  let along = 0;
  for (let i = 0; i < n; i++) {
    const source = samples[i];
    const p = line.points[source],
      a = line.points[samples[Math.max(0, i - 1)]],
      b = line.points[samples[Math.min(n - 1, i + 1)]];
    if (i > 0) along += Math.hypot(p[0] - a[0], p[1] - a[1]);
    let tx = b[0] - a[0],
      tz = b[1] - a[1];
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    // A little wider than the bed, so the edges lie under the banks; narrow at the source.
    const w = (line.half + 0.9) * Math.min(1, 0.35 + source / 12);
    const y = line.levels[source] + 0.02;
    for (let s = 0; s < 2; s++) {
      const k = i * 2 + s,
        sign = s ? 1 : -1;
      positions[k * 3] = p[0] - tz * w * sign;
      positions[k * 3 + 1] = y;
      positions[k * 3 + 2] = p[1] + tx * w * sign;
      normals[k * 3 + 1] = 1;
      uvs[k * 2] = s;
      uvs[k * 2 + 1] = along / 8;
    }
    if (i < n - 1) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  return createGeometry3D({ positions, normals, uvs, indices });
}

function sheet(lake) {
  const n = lake.poly.length,
    positions = new Float32Array((n + 1) * 3),
    normals = new Float32Array((n + 1) * 3),
    uvs = new Float32Array((n + 1) * 2),
    indices = [];
  positions.set([lake.cx, lake.level, lake.cz], 0);
  normals[1] = 1;
  for (let i = 0; i < n; i++) {
    const p = lake.poly[i];
    // A little beyond the shore, under the banks.
    const dx = p[0] - lake.cx,
      dz = p[1] - lake.cz,
      d = Math.hypot(dx, dz) || 1;
    positions.set([p[0] + (dx / d) * 1.2, lake.level, p[1] + (dz / d) * 1.2], (i + 1) * 3);
    normals[(i + 1) * 3 + 1] = 1;
    uvs.set([dx / 8, dz / 8], (i + 1) * 2);
    indices.push(0, 1 + ((i + 1) % n), 1 + i);
  }
  return createGeometry3D({ positions, normals, uvs, indices });
}

/** The seas, rivers and lakes. Returns `update(seconds)`. */
export function createWaters(scene, { quality = 'medium' } = {}) {
  const fancy = quality !== 'low';
  const SEA = 0x376b76,
    RIVER = 0x527d72;
  const simpleSea = createStandardMaterial3D({ color: 0x355e6a, roughness: 0.35, metallic: 0 });
  const simpleRiver = createStandardMaterial3D({ color: 0x48776d, roughness: 0.35, metallic: 0 });
  let sea, riverMaterial;
  if (fancy) {
    sea = createWater3D({
      width: MAP.width + 2400,
      depth: MAP.height + 2400,
      segments: 96,
      color: SEA,
      deepColor: 0x163f55,
      amplitude: 0.12,
      wavelength: 14,
      speed: 0.6,
      rippleStrength: 0.18,
      rippleLength: 1.6,
      clarity: 0.7,
      depthFade: 5,
      foamWidth: 0.35,
      caustics: 0.25,
      reflectionSize: 0
    });
    riverMaterial = createWaterMaterial3D({ color: RIVER, deepColor: 0x2c4d4a, amplitude: 0.03, wavelength: 4, speed: 0.9, rippleStrength: 0.22, rippleLength: 0.8, clarity: 0.55, depthFade: 1.8, foamWidth: 0.25, caustics: 0.2, reflectionSize: 0 });
  } else {
    const geometry = createGeometry3D({
      positions: new Float32Array([-1200, 0, -1200, MAP.width + 1200, 0, -1200, -1200, 0, MAP.height + 1200, MAP.width + 1200, 0, MAP.height + 1200]),
      normals: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]),
      indices: [0, 2, 1, 1, 2, 3]
    });
    sea = new Mesh3D(geometry, simpleSea);
    riverMaterial = simpleRiver;
  }
  if (fancy) sea.setPosition(MAP.width / 2, 0, MAP.height / 2);
  sea.receiveShadow = true;
  scene.addChild(sea);
  const detailedSeaGeometry = sea.geometry, detailedSeaMaterial = sea.material;
  const halfW = (MAP.width + 2400) / 2, halfD = (MAP.height + 2400) / 2;
  const proxySeaGeometry = fancy ? createGeometry3D({ positions: new Float32Array([-halfW, 0, -halfD, halfW, 0, -halfD, -halfW, 0, halfD, halfW, 0, halfD]), normals: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), indices: [0, 2, 1, 1, 2, 3] }) : detailedSeaGeometry;
  let detailed = true;
  const stats = { detail: fancy ? 'near' : 'simple', triangles: 0, switches: 0 };
  const meshes = [];
  for (const line of RIVER_LINES) {
    const mesh = new Mesh3D(ribbon(line), riverMaterial);
    mesh.receiveShadow = true;
    scene.addChild(mesh);
    meshes.push({ mesh, detailedGeometry: mesh.geometry, proxyGeometry: ribbon(line, 4) });
  }
  for (const lake of LAKE_SHAPES) {
    const mesh = new Mesh3D(sheet(lake), riverMaterial);
    mesh.receiveShadow = true;
    scene.addChild(mesh);
    meshes.push({ mesh, detailedGeometry: mesh.geometry, proxyGeometry: mesh.geometry });
  }
  return {
    sea,
    stats,
    update(seconds, zoom = 70, forceDetail = false) {
      const near = forceDetail || zoom < (detailed ? 156 : 126);
      if (near !== detailed) {
        detailed = near;
        stats.switches++;
        sea.geometry = near ? detailedSeaGeometry : proxySeaGeometry;
        sea.material = near ? detailedSeaMaterial : simpleSea;
        for (const item of meshes) {
          item.mesh.geometry = near ? item.detailedGeometry : item.proxyGeometry;
          item.mesh.material = near ? riverMaterial : simpleRiver;
        }
      }
      stats.detail = fancy ? (near ? 'near' : 'far') : (near ? 'simple-near' : 'simple-far');
      stats.triangles = sea.geometry.drawCount / 3;
      for (const { mesh } of meshes) stats.triangles += mesh.geometry.drawCount / 3;
      if (fancy) {
        sea.update(seconds);
        riverMaterial.shader.uniforms[0] += seconds;
      }
    }
  };
}
