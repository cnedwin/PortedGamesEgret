import { InstancedMesh3D, createStandardMaterial3D, mat4Compose, quatFromEuler } from '@egret/engine/world3d';

const CAPACITY = 24;
const GRAY = [1, 1, 1];
const scale = [1.75, 1.75, 1.75];

/** A single shared batch for the short arcs of catapult stones. */
export function createSiegeShots(scene, geometry, impact) {
  const material = createStandardMaterial3D({ vertexColors: true, roughness: .95 });
  const mesh = new InstancedMesh3D(geometry, material, CAPACITY);
  mesh.name = 'battle-siege-stones';
  mesh.count = 0;
  mesh.pickable = false;
  mesh.frustumCulled = false;
  scene.addChild(mesh);
  const flights = [];
  const matrix = new Float32Array(16), rotation = [0, 0, 0, 1];
  return {
    launch(origin, target, delay, calm) {
      if (calm || flights.length >= CAPACITY) {
        impact(target);
        return;
      }
      const distance = Math.hypot(origin[0] - target.x, origin[2] - target.z);
      flights.push({ origin, target, age: -delay, duration: Math.min(.57, .31 + distance * .014),
        arc: Math.min(4.4, 1.1 + distance * .13) });
    },
    update(dt) {
      let count = 0;
      for (let i = flights.length - 1; i >= 0; i--) {
        const shot = flights[i];
        shot.age += dt;
        if (shot.age < 0) continue;
        const t = shot.age / shot.duration;
        if (t >= 1) {
          impact(shot.target);
          flights.splice(i, 1);
          continue;
        }
        const [x, y, z] = shot.origin, target = shot.target;
        const height = y + (target.y + .25 - y) * t + Math.sin(t * Math.PI) * shot.arc;
        quatFromEuler(rotation, 5 * t, 2 * t, .8 * t);
        mat4Compose(matrix, [x + (target.x - x) * t, height, z + (target.z - z) * t], rotation, scale);
        mesh.setMatrixAt(count, matrix);
        mesh.setColorAt(count++, ...GRAY);
      }
      mesh.count = count;
    },
    destroy() {
      scene.removeChild(mesh);
      geometry.dispose();
      material.dispose();
    }
  };
}
