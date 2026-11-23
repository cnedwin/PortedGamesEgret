// Decorative river traffic and swallows. Four shared draw batches; no simulation RNG/state.
import { InstancedMesh3D, createBoxGeometry3D, createCylinderGeometry3D, createGeometry3D, createGeometryBuilder3D, createIcosahedronGeometry3D, createStandardMaterial3D, mat4Compose, quatFromEuler } from '@egret/engine/world3d';
import { NODES } from '../data/map.mjs';
import { landAt, RIVER_LINES } from '../sim/land.mjs';

const box = (w, h, d) => createBoxGeometry3D({ width: w, height: h, depth: d });

function merchantBoat() {
  const b = createGeometryBuilder3D();
  b.add(box(0.64, 0.16, 2.25), { position: [0, 0.14, 0], color: 0x473b2d });
  b.add(box(0.52, 0.06, 2.05), { position: [0, 0.25, 0], color: 0x9b8055 });
  for (const side of [-1, 1]) {
    b.add(box(0.045, 0.16, 1.8), { position: [side * 0.29, 0.3, 0], color: 0x665038 });
    b.add(box(0.48, 0.14, 0.38), { position: [0, 0.24, side * 1.04], rotation: [side * 0.35, 0, 0], color: 0x51402c });
  }
  b.add(box(0.5, 0.34, 0.6), { position: [0, 0.43, -0.4], color: 0x877249 });
  b.add(box(0.59, 0.07, 0.73), { position: [0, 0.64, -0.4], color: 0x4c5b53 });
  b.add(createCylinderGeometry3D({ radiusTop: 0.018, radiusBottom: 0.025, height: 1.8, radialSegments: 5 }), { position: [0, 1.1, 0.25], color: 0x5b4932 });
  b.add(box(1.05, 1.05, 0.025), { position: [0, 1.28, 0.29], rotation: [0, 0.12, -0.05], color: 0xc6b588 });
  for (let i = 0; i < 5; i++) b.add(box(1.08, 0.025, 0.04), { position: [0, 0.81 + i * 0.23, 0.31], rotation: [0, 0.12, -0.05], color: 0x8c7b57 });
  return b.build();
}

function wingGeometry() {
  // A bent taper, double sided by winding. Wing root is at the origin.
  const points = [0, 0, 0, 0.6, 0.02, -0.12, 0.88, 0, 0.18, 0, 0, 0, 0.88, 0, 0.18, 0.23, 0, 0.19];
  const positions = [...points];
  for (let i = 0; i < points.length; i += 9) positions.push(...points.slice(i, i + 3), ...points.slice(i + 6, i + 9), ...points.slice(i + 3, i + 6));
  const normals = new Float32Array(positions.length);
  for (let i = 1; i < normals.length; i += 3) normals[i] = i < points.length ? 1 : -1;
  return createGeometry3D({ positions: new Float32Array(positions), normals });
}

/** Distance-sampled actual river centreline. Long enough stretches keep merchant sails off the headwaters. */
function navigableRoutes() {
  const routes = [];
  const sample = {};
  for (const river of RIVER_LINES) {
    if (river.half < 1) continue;
    let segment = [];
    const flush = () => {
      if (segment.length > 18) {
        const distances = [0];
        for (let i = 1; i < segment.length; i++) distances.push(distances[i - 1] + Math.hypot(segment[i][0] - segment[i - 1][0], segment[i][2] - segment[i - 1][2]));
        if (distances.at(-1) > 35) routes.push({ points: segment, distances, length: distances.at(-1) });
      }
      segment = [];
    };
    for (let i = 15; i < river.points.length; i++) {
      const p = river.points[i];
      landAt(p[0], p[1], sample);
      if (!sample.water || sample.place > 0.15) { flush(); continue; }
      segment.push([p[0], river.levels[i] + 0.06, p[1]]);
    }
    flush();
  }
  return routes;
}

function sampleRoute(route, distance, out) {
  let lo = 0, hi = route.distances.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (route.distances[mid] < distance) lo = mid;
    else hi = mid;
  }
  const a = route.points[lo], b = route.points[hi];
  const t = Math.max(0, Math.min(1, (distance - route.distances[lo]) / (route.distances[hi] - route.distances[lo] || 1)));
  out.x = a[0] + (b[0] - a[0]) * t;
  out.y = a[1] + (b[1] - a[1]) * t;
  out.z = a[2] + (b[2] - a[2]) * t;
  out.heading = Math.atan2(b[0] - a[0], b[2] - a[2]);
  return out;
}

export function createAmbient(scene, { quality = 'medium' } = {}) {
  const birdLimit = quality === 'low' ? 18 : 36;
  const boatLimit = quality === 'low' ? 7 : 12;
  const material = createStandardMaterial3D({ vertexColors: true, roughness: 0.94, metallic: 0 });
  const birdMaterial = createStandardMaterial3D({ color: 0x303e3d, roughness: 1, metallic: 0 });
  const wakeMaterial = createStandardMaterial3D({ color: 0x97b7a6, roughness: 0.7, metallic: 0, opacity: 0.26, transparent: true });
  wakeMaterial.depthWrite = false;
  const boats = new InstancedMesh3D(merchantBoat(), material, boatLimit);
  const bodies = new InstancedMesh3D(createIcosahedronGeometry3D({ radius: 0.1, detail: 0 }), birdMaterial, birdLimit);
  const wings = new InstancedMesh3D(wingGeometry(), birdMaterial, birdLimit * 2);
  const wakes = new InstancedMesh3D(box(0.07, 0.015, 2.1), wakeMaterial, boatLimit * 2);
  boats.userData = { landscape: 'merchant-boats' };
  bodies.userData = { landscape: 'swallow-bodies' };
  wings.userData = { landscape: 'swallow-wings' };
  wakes.userData = { landscape: 'merchant-wakes' };
  for (const mesh of [boats, bodies, wings, wakes]) {
    mesh.count = 0;
    mesh.pickable = false;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    scene.addChild(mesh);
  }
  const routes = navigableRoutes();
  const birdAnchors = Object.values(NODES).filter((node) => node.kind === 'city' || node.kind === 'port');
  const matrix = new Float32Array(16), rotation = [0, 0, 0, 1];
  const point = {};
  const sample = {};
  let time = 0;
  let elapsed = 1;
  let previousView = '';
  const counts = { birds: 0, boats: 0, batches: 4, routes: routes.length };

  function place(mesh, index, x, y, z, rx, ry, rz, sx, sy, sz) {
    quatFromEuler(rotation, rx, ry, rz);
    mat4Compose(matrix, [x, y, z], rotation, [sx, sy, sz]);
    mesh.setMatrixAt(index, matrix);
  }

  return {
    counts,
    update(dt, view, reduced = false) {
      // Reduced motion freezes the decorative world without changing the calendar palette.
      if (!reduced) time += dt;
      const viewKey = `${view.x.toFixed(1)}:${view.z.toFixed(1)}:${view.d.toFixed(1)}`;
      elapsed += dt;
      if (viewKey === previousView && (reduced || elapsed < 1 / 24)) return;
      previousView = viewKey;
      elapsed = 0;
      const reach = Math.min(330, view.d * 1.4 + 55);
      let boatCount = 0;
      for (let r = 0; r < routes.length && boatCount < boatLimit; r++) {
        const route = routes[r];
        const ships = Math.min(5, Math.max(1, Math.floor(route.length / 110)));
        for (let i = 0; i < ships && boatCount < boatLimit; i++) {
          const phase = (time * 1.55 + route.length * (i + 0.28) / ships) % (route.length * 2);
          const returning = phase > route.length;
          sampleRoute(route, returning ? route.length * 2 - phase : phase, point);
          if (Math.hypot(point.x - view.x, point.z - view.z) > reach) continue;
          const heading = point.heading + (returning ? Math.PI : 0);
          const bob = Math.sin(time * 1.3 + r + i) * 0.025;
          place(boats, boatCount, point.x, point.y + bob, point.z, 0, heading, Math.sin(time + i) * 0.016, 1.3, 1.3, 1.3);
          for (const side of [-1, 1]) {
            const x = point.x + Math.cos(heading) * side * 0.5 - Math.sin(heading) * 1.6;
            const z = point.z - Math.sin(heading) * side * 0.5 - Math.cos(heading) * 1.6;
            place(wakes, boatCount * 2 + (side > 0 ? 1 : 0), x, point.y - 0.04, z, 0, heading - side * 0.13, 0, 1, 1, 1);
          }
          boatCount++;
        }
      }
      let birdCount = 0;
      for (let a = 0; a < birdAnchors.length && birdCount < birdLimit; a++) {
        const anchor = birdAnchors[a];
        if (Math.hypot(anchor.x - view.x, anchor.y - view.z) > reach - 12) continue;
        landAt(anchor.x, anchor.y, sample);
        const flockSize = quality === 'low' ? 3 : 5;
        for (let i = 0; i < flockSize && birdCount < birdLimit; i++) {
          const angle = time * 0.17 + a * 1.8 + i * 0.13;
          const radius = 16 + (a % 4) * 3 + i * 1.7;
          const x = anchor.x + Math.cos(angle) * radius;
          const z = anchor.y + Math.sin(angle) * radius * 0.65;
          const y = Math.max(0, sample.height) + 10 + i * 0.65 + Math.sin(angle * 2) * 1.1;
          const heading = Math.atan2(-Math.sin(angle), Math.cos(angle) * 0.65);
          const flap = Math.sin(time * 7.5 + i * 0.85) * 0.5;
          place(bodies, birdCount, x, y, z, 0, heading, 0, 0.9, 0.85, 2.6);
          for (const side of [-1, 1]) place(wings, birdCount * 2 + (side > 0 ? 1 : 0), x, y, z, 0, heading + (side < 0 ? Math.PI : 0), side * (flap + 0.06), 0.75, 0.75, side < 0 ? -0.75 : 0.75);
          birdCount++;
        }
      }
      boats.count = boatCount;
      wakes.count = boatCount * 2;
      bodies.count = birdCount;
      wings.count = birdCount * 2;
      counts.boats = boatCount;
      counts.birds = birdCount;
    }
  };
}
