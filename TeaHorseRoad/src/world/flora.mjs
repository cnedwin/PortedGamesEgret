// 草木与石头：每块地形加载时，按这块地的位置撒下茶丛、树和石头（同一块地每次撒得一样），卸载时一起收走。
// 每种东西在一块地里是一组实例；靠近路的树干和大石头还有静态碰撞体，山匪绕着它们走。
//
// Plants and stones: as each terrain tile loads, tea bushes, trees and stones are scattered over it by its position (the
// same tile always gets the same), and taken away with it. Each kind is one set of instances per tile; trunks and
// boulders near the road also get static colliders, which the bandits walk around.
import { InstancedMesh3D, createStandardMaterial3D } from '@egret/engine/world3d';
import { broadleafGeometry, farBroadleafGeometry, farPineGeometry, pineGeometry, stoneGeometry, teaBushGeometry, teaStripGeometry, tuftGeometry } from '../models/plants.mjs';
import { LAYER, TILE } from './land.mjs';
import { FORD, LAKE, RIVER, STATIONS, biomeAt, nearestRoad } from './route.mjs';
import { noise2, seeded, smoothstep } from './noise.mjs';

const foliage = createStandardMaterial3D({ vertexColors: true, roughness: 0.88, metallic: 0 });
const stone = createStandardMaterial3D({ vertexColors: true, roughness: 0.92, metallic: 0 });

/** What a quality setting scatters: the share of the full density. */
const DENSITY = { low: 0.45, medium: 0.8, high: 1 };
/** How far from the camera small things (tea, tufts, scree) still show, and where trees change to their far shape. */
const DETAIL = { low: 110, medium: 170, high: 230 };
const NEAR_TREES = { low: 120, medium: 190, high: 260 };
const TEA_NEAR = { low: 40, medium: 60, high: 80 };
const SMALL = new Set(['tuft', 'scree']);
const FAR = { pine: () => farPineGeometry(false), fir: () => farPineGeometry(true), broadleaf: () => farBroadleafGeometry() };

/** Whether nothing should grow here: the road and its verge, the stations, the water. */
function bare(x, z, n) {
  if (n.d < 8.5) return true;
  for (const station of STATIONS) if (Math.hypot(x - station.x, z - station.z) < station.radius + 6) return true;
  if (Math.abs(z - RIVER.z(x)) < RIVER.halfWidth + 6) return true;
  if (Math.abs(z - FORD.z(x)) < FORD.halfWidth + 3 && Math.abs(n.s - FORD.s) < 240) return true;
  if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.radius + 4) return true;
  return false;
}

/**
 * Scatter over the tiles of `land` as they come and go. `physics` takes the colliders. Returns `obstacles(x, z, r)`,
 * the colliders within `r` of a point (for the bandits' paths), and `dispose()`.
 */
export function createFlora(scene, physics, { quality = 'medium' } = {}) {
  const density = DENSITY[quality] ?? 0.8,
    placed = new Map();

  function scatter(tile) {
    const cx = (tile.x + 0.5) * TILE,
      cz = (tile.z + 0.5) * TILE,
      random = seeded(((tile.x * 73856093) ^ (tile.z * 19349663)) >>> 0 || 1),
      n = {},
      biome = [0, 0, 0],
      kinds = new Map(),
      obstacles = [],
      bodies = [];
    const add = (kind, x, y, z, scale, yaw, tilt = 0) => {
      let list = kinds.get(kind);
      if (!list) kinds.set(kind, (list = []));
      list.push(x, y, z, scale, yaw, tilt);
    };
    const groundAt = (x, z) => tile.field.heightAt(x - cx, z - cz);
    const slopeAt = (x, z) => Math.hypot(groundAt(x + 1, z) - groundAt(x - 1, z), groundAt(x, z + 1) - groundAt(x, z - 1)) / 2;

    // Trees and stones, scattered at random spots.
    const tries = Math.round(220 * density);
    for (let i = 0; i < tries; i++) {
      const x = cx + (random() - 0.5) * TILE,
        z = cz + (random() - 0.5) * TILE;
      nearestRoad(x, z, n);
      if (bare(x, z, n)) continue;
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
        bodies.push(
          physics.createBody({
            type: 'static',
            shape: kind === 'boulder' ? { type: 'sphere', radius } : { type: 'capsule', radius, halfHeight: 2.5 * scale },
            position: [x, y + (kind === 'boulder' ? 0.2 * scale : 2.5 * scale), z],
            layer: LAYER.prop,
            friction: 0.8,
            userData: { kind }
          })
        );
        obstacles.push({ x, z, r: radius + 0.6 });
      }
    }

    // Tea in rows along the hillsides of the tea hills, in fields that come and go with the land. The tile is cut into
    // 3 x 3 cells; near the camera a cell shows each bush, further off its rows as plain hedge strips.
    const CELL = TILE / 3,
      teaCells = Array.from({ length: 9 }, () => ({ bushes: [], strips: [] }));
    const cellOf = (x, z) => teaCells[Math.min(2, Math.floor((z - cz + TILE / 2) / CELL)) * 3 + Math.min(2, Math.floor((x - cx + TILE / 2) / CELL))];
    biomeAt(nearestRoad(cx, cz, n).s, biome);
    if (biome[0] > 0.2) {
      const row = 2.4,
        step = 1.9 / Math.sqrt(density);
      for (let z = cz - TILE / 2 + row / 2; z < cz + TILE / 2; z += row) {
        let run = [];
        // A strip covers up to four bushes standing in a row with no gap.
        const strip = () => {
          if (run.length) {
            const [x0, y0, z0] = run[0],
              [x1, y1, z1] = run[run.length - 1];
            cellOf((x0 + x1) / 2, (z0 + z1) / 2).strips.push((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0 + step, Math.atan2(y1 - y0, x1 - x0 || 1));
          }
          run = [];
        };
        for (let x = cx - TILE / 2 + step / 2; x < cx + TILE / 2; x += step) {
          const field = noise2(x / 70, z / 70, 92) * 0.5 + 0.5;
          const jx = x + (random() - 0.5) * 0.25,
            jz = z + (random() - 0.5) * 0.2;
          let ok = field >= 0.42;
          if (ok) {
            nearestRoad(jx, jz, n);
            ok = !bare(jx, jz, n) && n.d >= 11;
          }
          if (ok) {
            biomeAt(n.s, biome);
            ok = random() <= biome[0] && slopeAt(jx, jz) <= 0.5;
          }
          if (!ok) {
            strip();
            continue;
          }
          const y = groundAt(jx, jz) - 0.1;
          cellOf(jx, jz).bushes.push(jx, y, jz, 0.9 + random() * 0.2, (random() - 0.5) * 0.12, 0);
          run.push([x, y, z]);
          if (run.length === 4) strip();
        }
        strip();
      }
    }

    // One set of instances per kind, under the tile's terrain so it goes with it. Trees also get a plain far copy; which
    // of the two shows, and whether the small things show at all, is decided each frame by the distance to the camera.
    const meshes = [],
      near = [],
      far = [],
      small = [];
    const instances = (geometry, material, list, kind) => {
      const count = list.length / 6,
        mesh = new InstancedMesh3D(geometry, material, count);
      for (let i = 0; i < count; i++) {
        const o = i * 6,
          yaw = list[o + 4],
          tilt = list[o + 5];
        mesh.setTransformAt(i, [list[o] - cx, list[o + 1], list[o + 2] - cz], [Math.sin(tilt / 2), Math.sin(yaw / 2) * Math.cos(tilt / 2), 0, Math.cos(yaw / 2) * Math.cos(tilt / 2)], list[o + 3]);
      }
      mesh.count = count;
      mesh.castShadow = quality !== 'low' && !SMALL.has(kind);
      mesh.receiveShadow = true;
      tile.terrain.addChild(mesh);
      meshes.push(mesh);
      return mesh;
    };
    for (const [kind, list] of kinds) {
      const geometry =
        kind === 'pine' ? pineGeometry(false) : kind === 'fir' ? pineGeometry(true) : kind === 'broadleaf' ? broadleafGeometry() : kind === 'tea' ? teaBushGeometry() : kind === 'tuft' ? tuftGeometry(0x6f6a3a) : stoneGeometry(kind === 'boulder' ? 0 : kind === 'slab' ? 1 : 2);
      const material = kind === 'boulder' || kind === 'slab' || kind === 'scree' ? stone : foliage,
        mesh = instances(geometry, material, list, kind);
      if (SMALL.has(kind)) small.push(mesh);
      else if (FAR[kind]) {
        near.push(mesh);
        const copy = instances(FAR[kind](), material, list, kind);
        copy.castShadow = false;
        far.push(copy);
      }
    }
    const tea = [];
    teaCells.forEach((cell, i) => {
      if (!cell.bushes.length) return;
      const bushes = instances(teaBushGeometry(), foliage, cell.bushes, 'tea'),
        count = cell.strips.length / 5,
        strips = new InstancedMesh3D(teaStripGeometry(), foliage, count);
      for (let k = 0; k < count; k++) {
        const o = k * 5,
          pitch = cell.strips[o + 4];
        strips.setTransformAt(k, [cell.strips[o] - cx, cell.strips[o + 1], cell.strips[o + 2] - cz], [0, 0, Math.sin(pitch / 2), Math.cos(pitch / 2)], [cell.strips[o + 3], 1, 1]);
      }
      strips.count = count;
      strips.receiveShadow = true;
      tile.terrain.addChild(strips);
      meshes.push(strips);
      tea.push({ bushes, strips, x: cx - TILE / 2 + ((i % 3) + 0.5) * CELL, z: cz - TILE / 2 + (Math.floor(i / 3) + 0.5) * CELL, distance: -1 });
    });
    placed.set(tile, { meshes, near, far, small, tea, bodies, obstacles, cx, cz, distance: -1 });
  }

  function clear(tile) {
    const entry = placed.get(tile);
    if (!entry) return;
    for (const mesh of entry.meshes) mesh.removeFromParent();
    for (const body of entry.bodies) physics.removeBody(body);
    placed.delete(tile);
  }

  const detail = DETAIL[quality] ?? 170,
    nearTrees = NEAR_TREES[quality] ?? 190,
    teaNear = TEA_NEAR[quality] ?? 60;
  return {
    onTile(tile, what) {
      if (what === 'load') scatter(tile);
      else clear(tile);
    },
    /** Choose what each tile shows from the camera's place: the distance is to the nearest point of the tile. */
    update(x, z) {
      for (const entry of placed.values()) {
        const dx = Math.max(0, Math.abs(x - entry.cx) - TILE / 2),
          dz = Math.max(0, Math.abs(z - entry.cz) - TILE / 2),
          d = Math.hypot(dx, dz);
        for (const cell of entry.tea) {
          const e = Math.hypot(Math.max(0, Math.abs(x - cell.x) - TILE / 6), Math.max(0, Math.abs(z - cell.z) - TILE / 6));
          if (Math.abs(e - cell.distance) < 3) continue;
          cell.distance = e;
          cell.bushes.visible = e < teaNear;
          cell.strips.visible = e >= teaNear && e < detail * 1.6;
        }
        if (Math.abs(d - entry.distance) < 4) continue;
        entry.distance = d;
        for (const mesh of entry.small) mesh.visible = d < detail;
        for (const mesh of entry.near) mesh.visible = d < nearTrees;
        for (const mesh of entry.far) mesh.visible = d >= nearTrees;
      }
    },
    /** The colliders near a point, as circles on the ground. */
    obstacles(x, z, radius) {
      const found = [];
      for (const entry of placed.values()) for (const o of entry.obstacles) if (Math.hypot(o.x - x, o.z - z) < radius + o.r) found.push(o);
      return found;
    }
  };
}
