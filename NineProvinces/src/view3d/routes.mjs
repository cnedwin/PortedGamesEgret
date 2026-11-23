// 道路：画成贴地的土路带，过水和进城处断开。路线本身在 sim/ways.mjs。
// Roads, drawn as dirt tracks lying on the ground, broken at water and at the walls. The ways themselves are in
// sim/ways.mjs.
import { Mesh3D, createGeometry3D, createStandardMaterial3D } from '@egret/engine/world3d';
import { ROADS, landAt } from '../sim/land.mjs';
export { along, routeLine } from '../sim/ways.mjs';

/** Dirt roads lying on the land. `heightAt` gives the ground. */
export function createRoads(scene) {
  const positions = [],
    normals = [],
    colours = [],
    indices = [];
  const s = {};
  const dirt = [0.36, 0.29, 0.2],
    edge = [0.3, 0.27, 0.18];
  for (const road of ROADS) {
    // Every half unit along the road, so the strip follows the ground.
    const pts = [];
    for (let i = 0; i < road.line.length - 1; i++) {
      const [x1, z1] = road.line[i],
        [x2, z2] = road.line[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, z2 - z1) / 0.6));
      for (let k = 0; k < n; k++) pts.push([x1 + ((x2 - x1) * k) / n, z1 + ((z2 - z1) * k) / n]);
    }
    pts.push(road.line[road.line.length - 1]);
    let open = false;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i],
        a = pts[Math.max(0, i - 1)],
        b = pts[Math.min(pts.length - 1, i + 1)];
      landAt(p[0], p[1], s);
      // No road across water or through the walls: it stops at the bank and at the gate.
      if (s.water || s.place > 0.9) {
        open = false;
        continue;
      }
      const tx = b[0] - a[0],
        tz = b[1] - a[1],
        l = Math.hypot(tx, tz) || 1;
      const w = 0.42;
      const base = positions.length / 3;
      for (const side of [-1, 0, 1]) {
        positions.push(p[0] - (tz / l) * w * side, s.height + 0.05, p[1] + (tx / l) * w * side);
        normals.push(0, 1, 0);
        colours.push(...(side ? edge : dirt));
      }
      if (open) {
        const prev = base - 3;
        indices.push(prev, base, prev + 1, prev + 1, base, base + 1, prev + 1, base + 1, prev + 2, prev + 2, base + 1, base + 2);
      }
      open = true;
    }
  }
  const geometry = createGeometry3D({ positions: new Float32Array(positions), normals: new Float32Array(normals), colors: new Float32Array(colours), indices });
  const material = createStandardMaterial3D({ vertexColors: true, roughness: 1, metallic: 0 });
  material.polygonOffset = [-1, -2];
  const mesh = new Mesh3D(geometry, material);
  mesh.receiveShadow = true;
  mesh.pickable = false;
  scene.addChild(mesh);
  return mesh;
}
