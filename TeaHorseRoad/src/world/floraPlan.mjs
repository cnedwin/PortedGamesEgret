// Deterministic tile dressing. Run the same placement rules in the terrain worker and in tests.
import { mat4Compose } from '../../vendor/engine/dist/rendering/world3d/math3D.js';
import { noise2, random2, seeded } from './noise.mjs';

const DENSITY = { low: 0.45, medium: 0.8, high: 1 };

function teaRowZ(x, rowZ) {
  return rowZ + 3.6 * noise2(x / 63, rowZ / 68, 94) + 0.9 * Math.sin(x / 29 + rowZ / 37);
}

// Rotate a row segment about local Z (slope), then about world Y (heading).
function teaRotation(yaw, pitch) {
  const sy = Math.sin(yaw / 2),
    cy = Math.cos(yaw / 2),
    sp = Math.sin(pitch / 2),
    cp = Math.cos(pitch / 2);
  return [sy * sp, sy * cp, cy * sp, cy * cp];
}

/** Whether nothing should grow here: the road and its verge, the stations, the water. */
function bare({ STATIONS, RIVER, FORD, LAKE }, x, z, n) {
  if (n.d < 8.5) return true;
  for (const station of STATIONS) if (Math.hypot(x - station.x, z - station.z) < station.radius + 6) return true;
  if (Math.abs(z - RIVER.z(x)) < RIVER.halfWidth + 6) return true;
  if (Math.abs(z - FORD.z(x)) < FORD.halfWidth + 3 && Math.abs(n.s - FORD.s) < 240) return true;
  if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.radius + 4) return true;
  return false;
}

export function planFlora(geography, x, z, tileSize, field, quality) {
  const { nearestRoad, biomeAt } = geography;
  const density = DENSITY[quality] ?? 0.8;
  const cx = (x + 0.5) * tileSize,
    cz = (z + 0.5) * tileSize,
    random = seeded(((x * 73856093) ^ (z * 19349663)) >>> 0 || 1),
    n = {},
    biome = [0, 0, 0],
    kinds = new Map(),
    colliders = [];
  const add = (kind, x, y, z, scale, yaw, tilt = 0) => {
    let list = kinds.get(kind);
    if (!list) kinds.set(kind, (list = []));
    list.push(x, y, z, scale, yaw, tilt);
  };
  const groundAt = (x, z) => field.heightAt(x - cx, z - cz);
  const slopeAt = (x, z) => Math.hypot(groundAt(x + 1, z) - groundAt(x - 1, z), groundAt(x, z + 1) - groundAt(x, z - 1)) / 2;

  // Trees and stones, scattered at random spots.
  const tries = Math.round(220 * density);
  for (let i = 0; i < tries; i++) {
    const x = cx + (random() - 0.5) * tileSize,
      z = cz + (random() - 0.5) * tileSize;
    nearestRoad(x, z, n);
    if (bare(geography, x, z, n)) continue;
    biomeAt(n.s, biome);
    const y = groundAt(x, z),
      slope = slopeAt(x, z),
      roll = random(),
      clump = noise2(x / 60, z / 60, 91) * 0.5 + 0.5;
    if (slope > 1.1) continue;
    const leg = biome[2] > 0.5 ? 2 : biome[1] > 0.5 ? 1 : 0;
    let kind = null,
      scale = 0.8 + random() * 0.5;
    if (roll < 0.18) kind = 'boulder';
    else if (roll < 0.28) kind = 'slab';
    else if (roll < 0.36) kind = 'scree';
    else if (clump > (leg === 1 ? 0.62 : 0.45) && slope < 0.7) {
      if (leg === 0) kind = random() < 0.45 ? 'broadleaf' : 'pine';
      else if (leg === 1) kind = 'pine';
      else kind = y - n.y < 60 ? 'fir' : null;
    } else if (leg > 0 && roll < 0.7) kind = 'tuft';
    if (!kind) continue;
    if (kind === 'boulder') scale = 0.7 + random() * 1.6;
    const yaw = random() * Math.PI * 2;
    add(kind, x, y - (kind === 'boulder' ? 0.35 * scale : 0.05), z, scale, yaw, kind === 'pine' || kind === 'fir' ? (random() - 0.5) * 0.06 : 0);
    // Near the road, trunks and big stones stand in the way.
    if (n.d < 34 && (kind === 'pine' || kind === 'fir' || kind === 'broadleaf' || (kind === 'boulder' && scale > 1.1))) {
      const radius = kind === 'boulder' ? scale * 1.05 : 0.4 * scale;
      colliders.push({ kind, x, y, z, scale, radius });
    }
  }

  // Tea rows follow gentle curves through the terraces. Their grid is anchored in world space so adjoining tiles
  // follow the same rows. A cell draws individual bushes nearby and joined hedges in the distance.
  const CELL = tileSize / 3,
    xMin = cx - tileSize / 2,
    zMin = cz - tileSize / 2,
    teaStep = 2.05 / Math.sqrt(density),
    teaCells = Array.from({ length: 9 }, () => ({ bushes: [], strips: [] }));
  const cellOf = (x, z) => teaCells[Math.floor((z - zMin) / CELL) * 3 + Math.floor((x - xMin) / CELL)];
  biomeAt(nearestRoad(cx, cz, n).s, biome);
  if (biome[0] > 0.2) {
    const rowSpacing = 3.1,
      maxSway = 4.65,
      firstColumn = Math.ceil(xMin / teaStep - 0.5),
      firstRow = Math.ceil((zMin - maxSway) / rowSpacing - 0.5);
    for (let row = firstRow; (row + 0.5) * rowSpacing < zMin + tileSize + maxSway; row++) {
      const rowZ = (row + 0.5) * rowSpacing,
        run = [];
      let activeCell = null;
      const strip = () => {
        if (!run.length) return;
        const [x0, y0, z0, localHeading] = run[0],
          [x1, y1, z1] = run[run.length - 1],
          runLength = Math.hypot(x1 - x0, z1 - z0),
          yaw = runLength ? Math.atan2(z0 - z1, x1 - x0) : localHeading,
          pitch = runLength ? Math.atan2(y1 - y0, runLength) : 0;
        activeCell.strips.push((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.hypot(runLength, y1 - y0) + teaStep, yaw, pitch);
        run.length = 0;
      };
      for (let column = firstColumn; (column + 0.5) * teaStep < xMin + tileSize; column++) {
        const x = (column + 0.5) * teaStep,
          z = teaRowZ(x, rowZ) + (random2(column, row, 96) - 0.5) * 0.18;
        if (z < zMin || z >= zMin + tileSize || noise2(x / 70, z / 70, 92) < -0.16) {
          strip();
          continue;
        }
        nearestRoad(x, z, n);
        biomeAt(n.s, biome);
        if (n.d < 11 || bare(geography, x, z, n) || random2(column, row, 98) > biome[0] || slopeAt(x, z) > 0.5) {
          strip();
          continue;
        }
        const cell = cellOf(x, z),
          y = groundAt(x, z) - 0.1,
          yaw = Math.atan2(teaRowZ(x - 1, rowZ) - teaRowZ(x + 1, rowZ), 2),
          size = 0.93 + random2(column, row, 99) * 0.15;
        if (activeCell !== cell) {
          strip();
          activeCell = cell;
        }
        cell.bushes.push(x, y, z, size, yaw, 0);
        run.push([x, y, z, yaw]);
        if (run.length === 4) strip();
      }
      strip();
    }
  }

  const batches = [...kinds].map(([kind, list]) => [
    kind, instanceBuffers(list, cx, cz, kind, teaStep)
  ]);
  const tea = [];
  teaCells.forEach((cell, i) => {
    if (!cell.bushes.length) return;
    tea.push({
      bushes: instanceBuffers(cell.bushes, cx, cz, 'tea', teaStep),
      strips: instanceBuffers(cell.strips, cx, cz, 'strip', teaStep),
      x: xMin + ((i % 3) + 0.5) * CELL,
      z: zMin + (Math.floor(i / 3) + 0.5) * CELL
    });
  });
  return { batches, tea, colliders };
}

function instanceBuffers(list, cx, cz, kind, teaStep) {
  const count = list.length / 6;
  const matrices = new Float32Array(count * 16);
  const colors = kind === 'boulder' || kind === 'slab' || kind === 'scree' ? undefined : new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const at = i * 6;
    const x = list[at], y = list[at + 1], z = list[at + 2];
    const scale = list[at + 3], yaw = list[at + 4], tilt = list[at + 5];
    const position = [x - cx, y, z - cz];
    const matrix = matrices.subarray(i * 16, i * 16 + 16);
    if (kind === 'strip') {
      mat4Compose(matrix, position, teaRotation(yaw, tilt), [scale, 1, 1]);
    } else {
      const sy = Math.sin(yaw / 2), cy = Math.cos(yaw / 2), st = Math.sin(tilt / 2), ct = Math.cos(tilt / 2);
      // InstancedMesh3D's scalar scale path goes through a Float32 scratch vector.
      const size = kind === 'tea' ? scale : Math.fround(scale);
      const width = kind === 'tea' ? scale * teaStep / 2.05 : size;
      mat4Compose(matrix, position, [cy * st, sy * ct, -sy * st, cy * ct], [width, size, size]);
    }
    if (colors) {
      const patch = noise2(x / 39, z / 39, 97);
      const light = 0.96 + patch * 0.17;
      colors[i * 3] = light + patch * 0.12;
      colors[i * 3 + 1] = light;
      colors[i * 3 + 2] = light - patch * (kind === 'tea' || kind === 'strip' ? 0.23 : 0.08);
    }
  }
  return { matrices, colors };
}
