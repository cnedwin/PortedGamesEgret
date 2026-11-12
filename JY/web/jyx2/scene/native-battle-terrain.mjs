import {
  InstancedMesh3D, Mesh3D, createGeometry3D, createStandardMaterial3D, mat4Compose, quatFromEuler, setColor3D,
} from '@egret/engine/world3d';

export const battleCellSeed = (x, y) => (Math.imul(x + 17, 2224571) ^ Math.imul(y + 41, 645229)) >>> 0;
const vertexCorners = [[0, 0], [-1, 0], [0, -1], [-1, -1]];

export function battleGrid({ width, height, layers }) {
  const valid = (x, y) => x >= 0 && x < width && y >= 0 && y < height;
  return {
    width, height, valid,
    groundAt: (x, y) => valid(x, y) ? layers.earth[y * width + x] / 2 : 0,
    propAt: (x, y) => valid(x, y) ? layers.building[y * width + x] / 2 : 0,
  };
}

export function addBattleGround(scene, grid, { map, baseColor, tones, repeat, accent, extraGround }, own) {
  const { width, height, valid, groundAt } = grid;
  const [floorTone, accentTone] = tones.map(color => setColor3D(new Float32Array(3), color));
  const positions = [], normals = [], uvs = [], colors = [], indices = [];
  const stride = width + 1;
  for (let y = 0; y <= height; y++) for (let x = 0; x <= width; x++) {
    let count = 0, accents = 0;
    for (const [dx, dy] of vertexCorners) {
      if (!valid(x + dx, y + dy)) continue;
      count++;
      if (accent(x + dx, y + dy)) accents++;
    }
    const amount = accents / count;
    const variation = .94 + battleCellSeed(x, y) % 13 * .009;
    positions.push(x - .5, 0, y - .5);
    normals.push(0, 1, 0);
    uvs.push((x - .5) / repeat, (y - .5) / repeat);
    for (let i = 0; i < 3; i++) colors.push((floorTone[i] * (1 - amount) + accentTone[i] * amount) * variation);
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (groundAt(x, y) <= 0 && !extraGround?.(x, y)) continue;
    const a = y * stride + x;
    indices.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1);
  }
  const geometry = own(createGeometry3D({ positions, normals, uvs, colors, indices }));
  const material = own(createStandardMaterial3D({ color: baseColor, map, vertexColors: true, roughness: .88 }));
  scene.addChild(new Mesh3D(geometry, material)).castShadow = false;
  return indices.length / 6;
}

export function battlePartBatches(scene, own) {
  const matrix = new Float32Array(16), rotation = new Float32Array(4);
  let instances = 0, batches = 0;
  return {
    add(parts, geometry, color, map) {
      if (!parts.length) return;
      const material = own(createStandardMaterial3D({ color, map, roughness: .88 }));
      const mesh = scene.addChild(new InstancedMesh3D(geometry, material, parts.length));
      parts.forEach(([x, y, z, w, h, d, yaw = 0, tilt = 0], index) => {
        quatFromEuler(rotation, tilt, yaw, 0);
        mesh.setMatrixAt(index, mat4Compose(matrix, [x, y, z], rotation, [w, h, d]));
      });
      instances += parts.length;
      batches++;
    },
    get stats() { return { instances, batches }; },
  };
}
