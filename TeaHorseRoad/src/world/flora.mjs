// 草木与石头：每块地形加载时，按这块地的位置撒下茶丛、树和石头（同一块地每次撒得一样），卸载时一起收走。
// 每种东西在一块地里是一组实例；靠近路的树干和大石头还有静态碰撞体，山匪绕着它们走。
//
// Plants and stones: as each terrain tile loads, tea bushes, trees and stones are scattered over it by its position (the
// same tile always gets the same), and taken away with it. Each kind is one set of instances per tile; trunks and
// boulders near the road also get static colliders, which the bandits walk around.
import { InstancedMesh3D, createStandardMaterial3D } from '@egret/engine/world3d';
import { broadleafGeometry, farBroadleafGeometry, farPineGeometry, pineGeometry, stoneGeometry, teaBushGeometry, teaStripGeometry, tuftGeometry } from '../models/plants.mjs';
import { LAYER, TILE } from './land.mjs';

const foliage = createStandardMaterial3D({ vertexColors: true, roughness: 0.88, metallic: 0 });
const stone = createStandardMaterial3D({ vertexColors: true, roughness: 0.92, metallic: 0 });

/** How far from the camera small things (tea, tufts, scree) still show, and where trees change to their far shape. */
const DETAIL = { low: 110, medium: 170, high: 230 };
const NEAR_TREES = { low: 120, medium: 190, high: 260 };
const TEA_NEAR = { low: 40, medium: 60, high: 80 };
const SMALL = new Set(['tuft', 'scree']);
const FAR = { pine: () => farPineGeometry(false), fir: () => farPineGeometry(true), broadleaf: () => farBroadleafGeometry() };
const TREE = { pine: () => pineGeometry(false), fir: () => pineGeometry(true), broadleaf: broadleafGeometry };

/**
 * Scatter over the tiles of `land` as they come and go. `physics` takes the colliders. Returns `obstacles(x, z, r)`,
 * the colliders within `r` of a point (for the bandits' paths), and `dispose()`.
 */
export function createFlora(scene, physics, { quality = 'medium' } = {}) {
  const placed = new Map(), plantModels = new Map();

  function scatter(tile, plan) {
    const meshes = [], near = new Map(), far = [], tea = [];
    const bodies = [], obstacles = [];
    for (const { kind, x, y, z, scale, radius } of plan.colliders) {
      bodies.push(physics.createBody({
        type: 'static',
        shape: kind === 'boulder' ? { type: 'sphere', radius } : { type: 'capsule', radius, halfHeight: 2.5 * scale },
        position: [x, y + (kind === 'boulder' ? 0.2 * scale : 2.5 * scale), z],
        layer: LAYER.prop,
        friction: 0.8,
        userData: { kind }
      }));
      obstacles.push({ x, z, r: radius + 0.6 });
    }
    const instances = (geometry, material, { matrices, colors }, kind) => {
      const mesh = new InstancedMesh3D(geometry, material, matrices.length / 16);
      mesh.instanceMatrices = matrices;
      mesh.instanceColors = colors;
      mesh.instanceVersion++;
      mesh.castShadow = kind === 'strip' || (quality !== 'low' && !SMALL.has(kind));
      mesh.receiveShadow = true;
      tile.terrain.addChild(mesh);
      meshes.push(mesh);
      return mesh;
    };
    for (const [kind, batch] of plan.batches) {
      const replacement = plantModels.get(kind);
      const geometry =
        replacement?.geometry ?? (TREE[kind] ? TREE[kind]() : kind === 'tuft' ? tuftGeometry(0x6f6a3a) : stoneGeometry(kind === 'boulder' ? 0 : kind === 'slab' ? 1 : 2));
      const material = kind === 'boulder' || kind === 'slab' || kind === 'scree' ? stone : foliage,
        mesh = instances(geometry, replacement?.material ?? material, batch, kind);
      // Tufts and scree are gone past the detail distance, drawn and shadowed by none (ENGINE-NOTES.md, item 2).
      if (SMALL.has(kind)) mesh.cullDistance = detail;
      else if (FAR[kind]) {
        near.set(kind, mesh);
        const copy = instances(FAR[kind](), material, batch, kind);
        copy.castShadow = false;
        copy.visible = false;
        far.push(copy);
      }
    }
    const teaModel = plantModels.get('tea');
    for (const cell of plan.tea) {
      const bushes = instances(teaModel?.geometry ?? teaBushGeometry(), teaModel?.material ?? foliage, cell.bushes, 'tea');
      const strips = instances(teaStripGeometry(), foliage, cell.strips, 'strip');
      strips.visible = false;
      tea.push({ bushes, strips, x: cell.x, z: cell.z, distance: -1 });
    }
    const [cx, cz] = tile.center;
    placed.set(tile, { meshes, near, far, tea, bodies, obstacles, cx, cz, distance: -1 });
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
    /** Swap the near visual only. The caller retains the asset until it is removed or the scene closes. */
    setPlantModel(kind, model) {
      if (kind !== 'tea' && !Object.hasOwn(TREE, kind)) throw new Error('Unknown near-plant kind: ' + kind);
      if ((model ?? undefined) === plantModels.get(kind)) return;
      if (model) plantModels.set(kind, model);
      else plantModels.delete(kind);
      const geometry = model?.geometry ?? (kind === 'tea' ? teaBushGeometry() : TREE[kind]());
      const material = model?.material ?? foliage;
      for (const { near, tea } of placed.values()) {
        const batches = kind === 'tea' ? tea.map(({ bushes }) => bushes) : [near.get(kind)];
        for (const mesh of batches) {
          if (!mesh) continue;
          mesh.geometry = geometry;
          mesh.material = material;
          // The engine caches instance bounds by this revision and count.
          mesh.instanceVersion++;
        }
      }
    },
    onTile(tile, what, plan) {
      if (what === 'load') scatter(tile, plan);
      else clear(tile);
    },
    /**
     * Choose what each tile shows from the camera's place: the distance is to the nearest point of the tile, on the
     * ground. Not `Lod3D`, which measures in three dimensions from its own origin, nor `stream.distanceOf`, which
     * measures from the convoy the stream follows rather than the camera (ENGINE-NOTES.md, items 2 and 5).
     */
    update(x, z) {
      for (const entry of placed.values()) {
        const dx = Math.max(0, Math.abs(x - entry.cx) - TILE / 2),
          dz = Math.max(0, Math.abs(z - entry.cz) - TILE / 2),
          d = Math.hypot(dx, dz);
        for (const cell of entry.tea) {
          const e = Math.hypot(Math.max(0, Math.abs(x - cell.x) - TILE / 6), Math.max(0, Math.abs(z - cell.z) - TILE / 6));
          if (cell.distance >= 0 && Math.abs(e - cell.distance) < 3) continue;
          cell.distance = e;
          cell.bushes.visible = e < teaNear;
          cell.strips.visible = e >= teaNear && e < detail * 1.6;
        }
        if (entry.distance >= 0 && Math.abs(d - entry.distance) < 4) continue;
        entry.distance = d;
        for (const mesh of entry.near.values()) mesh.visible = d < nearTrees;
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
