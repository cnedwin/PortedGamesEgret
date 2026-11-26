// Render-only land network. Connections and centre-lines always come from the simulation.
import { Mesh3D, createBoxGeometry3D, createCustomShader3D, createGeometry3D, createGeometryBuilder3D, createStandardMaterial3D, linearColor3D } from '@egret/engine/world3d';
import { ADJACENT, NODES } from '../data/map.mjs';
import { FOOTPRINTS, landAt } from '../sim/land.mjs';
import { HEX_H, HEX_W } from '../sim/hexgrid.mjs';
import { along, routeLine } from '../sim/ways.mjs';
export { along, routeLine };
const SOIL = linearColor3D(0x846b49), VERGE = linearColor3D(0x7b7758), DECK = linearColor3D(0x806140);

const TRACK_GLSL = /* glsl */ `
vec4 customFragment(vec4 color, vec3 wp, vec3 normal, vec2 uv) {
  float pixel = max(length(dFdx(wp)), length(dFdy(wp)));
  float detail = 1.0 - smoothstep(0.08, 0.4, pixel);
  float tracks = exp(-pow((uv.x - 0.27) * 22.0, 2.0)) + exp(-pow((uv.x - 0.73) * 22.0, 2.0));
  float grain = sin(wp.x * 29.0 + sin(wp.z * 17.0)) * sin(wp.z * 37.0);
  return vec4(color.rgb * (1.0 - tracks * 0.15 * detail + grain * 0.045 * detail), color.a);
}`;

/** Real land links, once each. River/sea links never enter the rendered road network. */
function landLinks() {
  const result = [];
  for (const [from, edges] of Object.entries(ADJACENT)) {
    for (const edge of edges) {
      if (edge.link.kind === 'land' && from < edge.to) result.push({ from, to: edge.to });
    }
  }
  return result;
}

// The simulation keeps its original centreline. Only the last few visual metres meet the nearest city gate.
function meetGate(line, id, gates) {
  const f = FOOTPRINTS[id];
  if (f?.kind !== 'city') return line;
  const hx = (f.a - 0.25) * HEX_W, hz = f.b * HEX_H;
  const outside = line.findIndex(([x, z]) => Math.abs(x - f.x) > hx + 5 || Math.abs(z - f.z) > hz + 5);
  if (outside < 1) return line;
  const anchor = line[outside];
  const dx = anchor[0] - f.x, dz = anchor[1] - f.z;
  const horizontal = Math.abs(dx) / hx > Math.abs(dz) / hz;
  const side = Math.sign(horizontal ? dx : dz) || 1;
  const gate = horizontal ? [f.x + side * (hx + 0.9), f.z] : [f.x, f.z + side * (hz + 0.9)];
  const key = `${id}:${horizontal ? 'x' : 'z'}:${side}`;
  const entry = gates.get(key);
  if (entry) entry.connections++;
  else gates.set(key, { x: gate[0], z: gate[1], connections: 1 });
  return [gate, ...line.slice(outside)];
}

function sampleRoad(line) {
  const points = [];
  let distance = 0;
  const sample = {};
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.max(1, Math.ceil(length / 0.85));
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
      landAt(x, z, sample);
      points.push({ x, z, y: sample.height + 0.075, level: sample.level, water: sample.water, distance: distance + length * t, open: !sample.water, bridge: false });
    }
    distance += length;
  }
  const last = line.at(-1);
  landAt(last[0], last[1], sample);
  points.push({ x: last[0], z: last[1], y: sample.height + 0.075, level: sample.level, water: sample.water, distance, open: !sample.water, bridge: false });
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    points[i].dx = b.x - a.x;
    points[i].dz = b.z - a.z;
  }
  return points;
}

/** Short inland-river crossings only; long ferries, lakes and sea remain visibly open water. */
function bridgeCrossings(points) {
  const spans = [];
  for (let i = 1; i < points.length - 1; i++) {
    if (!points[i].water) continue;
    const start = i;
    while (i < points.length && points[i].water) i++;
    const end = i;
    const a = points[start - 1], b = points[end];
    if (!b || !a.open || !b.open) continue;
    const wet = points.slice(start, end);
    const span = b.distance - a.distance;
    if (span > 16 || !wet.every((p) => p.water === 3) || Math.abs(a.y - b.y) > 2.4) continue;
    const waterLevel = Math.max(...wet.map((p) => p.level));
    if (Math.min(a.y, b.y) < waterLevel + 0.15) continue;
    for (let k = start - 1; k <= end; k++) {
      const p = points[k];
      const t = (p.distance - a.distance) / span;
      p.y = Math.max(waterLevel + 0.24, a.y + (b.y - a.y) * t);
      p.open = true;
      p.bridge = true;
    }
    spans.push({ points: points.slice(start - 1, end + 1), length: span });
  }
  return spans;
}

function roadGeometry(roads, gates, coarse) {
  const positions = [], normals = [], colors = [], uvs = [], indices = [];
  const cross = coarse ? [-1, 0, 1] : [-1, -0.52, 0, 0.52, 1];
  const sample = {};
  for (const road of roads) {
    const rows = road.points;
    let previous = -1;
    for (let i = 0; i < rows.length; i++) {
      const p = rows[i];
      const boundary = i === 0 || i === rows.length - 1 || rows[i - 1]?.open !== p.open || rows[i + 1]?.open !== p.open || rows[i - 1]?.bridge !== p.bridge || rows[i + 1]?.bridge !== p.bridge;
      if (coarse && i % 4 !== 0 && !boundary) continue;
      if (!p.open) { previous = -1; continue; }
      const a = rows[Math.max(0, i - 1)], b = rows[Math.min(rows.length - 1, i + 1)];
      const dx = p.dx ?? b.x - a.x, dz = p.dz ?? b.z - a.z;
      const length = Math.hypot(dx, dz) || 1;
      const base = positions.length / 3;
      const width = p.bridge ? 0.69 : coarse ? 1.0 : road.width;
      for (const side of cross) {
        const x = p.x - dz / length * width * side, z = p.z + dx / length * width * side;
        landAt(x, z, sample);
        const y = p.bridge ? p.y : Math.max(p.y - 0.15, sample.height + 0.075);
        positions.push(x, y, z);
        normals.push(0, 1, 0);
        const edge = Math.abs(side);
        if (p.bridge) colors.push(...DECK);
        else for (let channel = 0; channel < 3; channel++) colors.push(SOIL[channel] + (VERGE[channel] - SOIL[channel]) * edge);
        uvs.push((side + 1) / 2, p.distance);
      }
      if (previous >= 0) {
        for (let side = 0; side < cross.length - 1; side++) indices.push(previous + side, previous + side + 1, base + side, previous + side + 1, base + side + 1, base + side);
      }
      previous = base;
    }
  }
  // Shared gate forecourts blend multiple genuine land connections, without inventing cross-map junctions.
  for (const gate of gates.values()) {
    if (gate.connections < 2) continue;
    landAt(gate.x, gate.z, sample);
    if (sample.water) continue;
    const base = positions.length / 3;
    positions.push(gate.x, sample.height + 0.08, gate.z); normals.push(0, 1, 0); colors.push(...SOIL); uvs.push(0.5, 0);
    const segments = coarse ? 8 : 12;
    for (let i = 0; i <= segments; i++) {
      const angle = i / segments * Math.PI * 2;
      const x = gate.x + Math.cos(angle) * 1.18, z = gate.z + Math.sin(angle) * 1.18;
      landAt(x, z, sample);
      positions.push(x, sample.height + 0.08, z); normals.push(0, 1, 0); colors.push(...VERGE); uvs.push(0.5, 0);
      if (i) indices.push(base, base + i + 1, base + i);
    }
  }
  if (!positions.length) return null;
  return createGeometry3D({ positions: new Float32Array(positions), normals: new Float32Array(normals), colors: new Float32Array(colors), uvs: new Float32Array(uvs), indices });
}

function bridgeStructure(spans) {
  const b = createGeometryBuilder3D();
  const unit = createBoxGeometry3D({ width: 1, height: 1, depth: 1 });
  for (const span of spans) {
    for (let i = 0; i < span.points.length; i += 2) {
      const p = span.points[i], next = span.points[Math.min(span.points.length - 1, i + 2)];
      const heading = Math.atan2(next.x - p.x, next.z - p.z);
      b.add(unit, { position: [p.x, p.y - 0.08, p.z], rotation: [0, heading, 0], scale: [1.48, 0.16, 0.9], color: 0x73563a });
      for (const side of [-1, 1]) {
        const x = p.x + Math.cos(heading) * side * 0.73, z = p.z - Math.sin(heading) * side * 0.73;
        b.add(unit, { position: [x, p.y + 0.22, z], rotation: [0, heading, 0], scale: [0.065, 0.065, 1.85], color: 0x8b704a });
        b.add(unit, { position: [x, p.y - 0.22, z], scale: [0.075, 0.9, 0.075], color: 0x5e4931 });
      }
    }
  }
  return b.parts ? b.build() : null;
}

const ROAD_TILE = 160;
/** Near roads are static regional batches. A town view must not submit the entire country's detailed ribbon. */
function roadTiles(roads, gates) {
  const tiles = new Map();
  const keyOf = (point) => `${Math.floor(point.x / ROAD_TILE)},${Math.floor(point.z / ROAD_TILE)}`;
  function tileFor(key) {
    if (!tiles.has(key)) {
      const [x, z] = key.split(',').map(Number);
      tiles.set(key, { x: (x + 0.5) * ROAD_TILE, z: (z + 0.5) * ROAD_TILE, roads: [], gates: new Map() });
    }
    return tiles.get(key);
  }
  for (const road of roads) {
    let start = 0, key = keyOf(road.points[0]);
    for (let i = 1; i < road.points.length; i++) {
      const next = keyOf(road.points[i]);
      if (key === next) continue;
      tileFor(key).roads.push({ ...road, points: road.points.slice(start, i + 1) });
      start = i;
      key = next;
    }
    if (road.points.length - start > 1) tileFor(key).roads.push({ ...road, points: road.points.slice(start) });
  }
  for (const [key, gate] of gates) if (gate.connections > 1) tileFor(keyOf(gate)).gates.set(key, gate);
  return tiles.values();
}

export function createRoads(scene) {
  const gates = new Map(), roads = [], spans = [];
  for (const link of landLinks()) {
    let line = routeLine(link.from, link.to).map((point) => point.slice());
    line = meetGate(line, link.from, gates);
    line = meetGate(line.reverse(), link.to, gates).reverse();
    const points = sampleRoad(line);
    spans.push(...bridgeCrossings(points));
    roads.push({ ...link, points, width: 0.72 + Math.min(NODES[link.from].size, NODES[link.to].size) * 0.035 });
  }
  const farGeometry = roadGeometry(roads, gates, true);
  const nearMaterial = createStandardMaterial3D({ vertexColors: true, roughness: 1, metallic: 0 });
  nearMaterial.shader = createCustomShader3D({ key: 'nine-road-ruts', glsl: TRACK_GLSL });
  const farMaterial = createStandardMaterial3D({ vertexColors: true, roughness: 1, metallic: 0 });
  nearMaterial.polygonOffset = farMaterial.polygonOffset = [-1, -2];
  const mesh = new Mesh3D(farGeometry, farMaterial);
  mesh.userData = { landscape: 'land-roads' };
  mesh.receiveShadow = true;
  mesh.pickable = false;
  mesh.visible = false;
  scene.addChild(mesh);
  const nearMeshes = [];
  for (const tile of roadTiles(roads, gates)) {
    const geometry = roadGeometry(tile.roads, tile.gates, false);
    // Some land links contain a long ferry gap; a regional slice can therefore be entirely open water.
    if (!geometry) continue;
    const regional = new Mesh3D(geometry, nearMaterial);
    regional.userData = { landscape: 'land-roads-near' };
    regional.receiveShadow = true;
    regional.pickable = false;
    scene.addChild(regional);
    nearMeshes.push({ mesh: regional, x: tile.x, z: tile.z });
  }
  const bridgeGeometry = bridgeStructure(spans);
  const bridgeMesh = bridgeGeometry ? new Mesh3D(bridgeGeometry, farMaterial) : null;
  if (bridgeMesh) { bridgeMesh.receiveShadow = true; bridgeMesh.pickable = false; scene.addChild(bridgeMesh); }
  let near = true;
  const fullDetailTriangles = nearMeshes.reduce((sum, entry) => sum + entry.mesh.geometry.drawCount / 3, 0);
  const stats = { connections: roads.length, bridges: spans.length, junctions: [...gates.values()].filter((g) => g.connections > 1).length, detail: 'near', triangles: fullDetailTriangles, fullDetailTriangles, nearBatches: nearMeshes.length, visibleBatches: 0, switches: 0 };
  return {
    stats,
    mesh,
    update(zoom, forceDetail = false, view = null) {
      const detailed = forceDetail || zoom < (near ? 150 : 120);
      if (detailed !== near) {
        near = detailed;
        stats.switches++;
      }
      mesh.visible = !near;
      stats.visibleBatches = near ? 0 : 1;
      stats.triangles = near ? 0 : farGeometry.drawCount / 3;
      const reach = Math.min(330, zoom * 1.2 + 90) + ROAD_TILE / 2;
      for (const entry of nearMeshes) {
        entry.mesh.visible = near && (!view || (Math.abs(entry.x - view.x) < reach && Math.abs(entry.z - view.z) < reach));
        if (entry.mesh.visible) {
          stats.visibleBatches++;
          stats.triangles += entry.mesh.geometry.drawCount / 3;
        }
      }
      if (bridgeMesh) bridgeMesh.visible = near;
      stats.detail = near ? 'near' : 'far';
      if (near && bridgeGeometry) stats.triangles += bridgeGeometry.drawCount / 3;
    }
  };
}
