import { InstancedMesh3D, Lod3D, Object3D, createStandardMaterial3D, quatFromEuler } from '@egret/engine/world3d';
import { stoneGeometry } from '../models/plants.mjs';
import { FORD, RIVER, nearestRoad, pointAt } from './route.mjs';

// Ground anchors sampled from the 2 m streamed terrain grid. Put the closest
// silhouettes first so Low and Medium keep recognizable banks at both waters.
const RIVER_ROCKS = [
  [222, 62.7, -2231.524, 1.20, 1],
  [302, 63.0, -2252.293, 1.23, -1],
  [203, 62.6, -2266.903, 1.00, -1],
  [318, 63.2, -2222.959, 0.86, 1],
  [340, 62.8, -2259.126, 1.14, -1],
  [195, 62.9, -2237.743, 0.96, 1],
  [184, 65.2, -2238.859, 1.28, 1],
  [330, 64.35, -2257.465, 1.00, -1],
  [352, 62.92, -2232.189, 1.06, 1],
  [360, 65.6, -2233.948, 1.25, 1],
  [177, 63.1, -2272.043, 1.04, -1],
  [208, 65.3, -2233.679, 0.97, 1]
];
const FORD_ROCKS = [
  [54, 30.549, -749.520, 0.49, 1],
  [91, 30.278, -766.315, 0.48, -1],
  [48, 30.681, -766.194, 0.46, -1],
  [99, 30.418, -752.497, 0.42, 1],
  [42, 31.586, -748.872, 0.34, 1],
  [105, 30.522, -769.687, 0.39, -1],
  [30, 31.584, -769.206, 0.41, -1],
  [113, 31.209, -754.483, 0.46, 1]
];

const BUDGET = { low: [6, 4], medium: [8, 6], high: [12, 8] };
const oldStone = createStandardMaterial3D({ vertexColors: true, roughness: 0.92, metallic: 0 });

/** Shoreline silhouettes. The land and water continue to own contact and wetness. */
export function createRiverbank(scene, model, { quality = 'medium' } = {}) {
  const geometry = model?.geometry ?? stoneGeometry(0);
  const material = model?.material ?? oldStone;
  const minY = geometry.boundingBox[1];
  const stockFit = model ? [1, 1, 1] : [4.4, 2.2, 2.5].map((width, axis) =>
    width / (geometry.boundingBox[axis + 3] - geometry.boundingBox[axis]));
  const [riverCount, fordCount] = BUDGET[quality] ?? BUDGET.medium;
  const [fordX] = pointAt(FORD.s);
  const quaternion = new Float32Array(4);

  function place(name, body, origin, list, count, clearance, distance) {
    const positions = list.slice(0, count).filter(([x, , z]) => nearestRoad(x, z, {}).d >= clearance);
    const rocks = new InstancedMesh3D(geometry, material, positions.length);
    rocks.name = name + ' rocks';
    rocks.castShadow = quality !== 'low';
    for (let i = 0; i < positions.length; i++) {
      const [x, grade, z, size, side] = positions[i];
      const yaw = -Math.atan2(body.z(x + 1) - body.z(x - 1), 2) + (i % 3 - 1) * 0.16;
      quatFromEuler(quaternion, -side * 0.17, yaw + (i % 2) * Math.PI, (i % 3 - 1) * 0.055);
      const scale = stockFit.map(factor => factor * size);
      rocks.setTransformAt(i, [x - origin[0], grade - origin[1] - size * 0.52 - minY * scale[1], z - origin[2]], quaternion, scale);
    }
    const lod = new Lod3D().setPosition(...origin);
    lod.name = name;
    lod.addLevel(rocks, 0);
    lod.addLevel(new Object3D(), distance);
    scene.addChild(lod);
    return lod;
  }

  return {
    river: place('Gorge riverbank', RIVER, [260, RIVER.y, RIVER.z(260)], RIVER_ROCKS, riverCount, 36, 340),
    ford: place('Tea hills ford bank', FORD, [fordX, FORD.y, FORD.z(fordX)], FORD_ROCKS, fordCount, 14, 230)
  };
}
