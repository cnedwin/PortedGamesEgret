// 地形：近处是引擎的按视距加载地块（createTerrainStream3D），每块由工作线程算出高度场，
// 用四层地面纹理按权重图混合，并接入工作线程准备的碰撞体和植被。远处是一整块低精度的远山。
//
// The land: near the convoy, tiles streamed in by distance (`createTerrainStream3D`), each a height field worked out by
// the terrain workers, drawn with four ground textures blended by a weight map, with worker-built collision and plants;
// beyond them, one low-detail field of far mountains with snow on their heads.
import {
  Texture3D,
  TriangleMeshShape3D,
  createHeightField3D,
  createStandardMaterial3D,
  createTerrain3D,
  createTerrainMaterial3D,
  createTerrainStream3D
} from '@egret/engine/world3d';
import { groundLayers } from '../art/textures.mjs';
import { geography, legAt, nearestRoad, samples } from './route.mjs';

export const TILE = 192;
const COLUMNS = 97;
const WEIGHTS = 128;
export const LAYER = { ground: 1, vehicle: 2, prop: 4, body: 8, sensor: 16 };

/** Workers that work out tiles, shared round-robin; each is told the road once. */
function createWorkers(count) {
  const url = new URL('./tileWorker.mjs', import.meta.url),
    pending = new Map(),
    workers = [];
  let next = 1,
    turn = 0;
  for (let i = 0; i < count; i++) {
    const worker = new Worker(url, { type: 'module' });
    worker.postMessage({ type: 'init', samples: { x: samples.x, y: samples.y, z: samples.z, count: samples.count } });
    worker.onmessage = (event) => {
      const message = event.data,
        job = pending.get(message.id);
      if (!job) return;
      pending.delete(message.id);
      if (message.type === 'error') job.reject(new Error(message.message));
      else job.resolve(message);
    };
    workers.push(worker);
  }
  return {
    ask(message) {
      const id = next++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        workers[turn++ % workers.length].postMessage({ ...message, id });
      });
    },
    dispose() {
      for (const worker of workers) worker.terminate();
      pending.clear();
    }
  };
}

/**
 * The streamed land and the far mountains. `physics` gets a static body per loaded tile; `quality` sets how far the
 * tiles reach. Returns the stream, the far land, `heightAt` and `update(x, z)` to call as the convoy moves.
 */
export async function createLand(scene, physics, { quality = 'medium', onTile } = {}) {
  const workers = createWorkers(quality === 'low' ? 1 : 2),
    layers = [0, 1, 2].map((leg) => groundLayers(leg)),
    preparedTiles = new WeakMap(),
    bodies = new Map();
  const viewDistance = quality === 'low' ? 330 : quality === 'medium' ? 460 : 560;

  const stream = createTerrainStream3D({
    tileSize: TILE,
    viewDistance,
    loadsPerUpdate: 2,
    terrain: { chunkCells: 32, levels: 3, lodDistance: quality === 'low' ? 70 : 110, skirtDepth: 3 },
    async load(tx, tz) {
      const cx = (tx + 0.5) * TILE,
        cz = (tz + 0.5) * TILE;
      const tile = await workers.ask({ type: 'tile', tx, tz, cx, cz, size: TILE, columns: COLUMNS, weightSize: WEIGHTS, quality });
      const field = createHeightField3D({ columns: COLUMNS, rows: COLUMNS, width: TILE, depth: TILE, heights: tile.heights });
      const mesh = TriangleMeshShape3D.fromBuffers(tile.collision);
      // Key the worker result by this request's field. Retired requests can be collected without publishing.
      preparedTiles.set(field, { weights: tile.weights, flora: tile.flora, mesh });
      return field;
    },
    // Each tile blends the four ground layers by its own weight map, which covers the tile once.
    material(tx, tz, field) {
      const weights = new Texture3D({ width: WEIGHTS, height: WEIGHTS, data: preparedTiles.get(field).weights }, { colorSpace: 'linear', wrapS: 'clamp', wrapT: 'clamp', mipmaps: false, flipY: false });
      // The grass of the leg the tile's middle belongs to.
      const leg = legAt(nearestRoad((tx + 0.5) * TILE, (tz + 0.5) * TILE, {}).s);
      return createTerrainMaterial3D({ layers: layers[leg], weights, repeat: [34, 40, 22, 26], roughness: 0.95, metallic: 0 });
    },
    onLoad(tile) {
      const { mesh, flora } = preparedTiles.get(tile.field);
      preparedTiles.delete(tile.field);
      tile.terrain.setShadows(false, true);
      const body = physics.createBody({
        type: 'static',
        shape: { type: 'mesh', mesh },
        // The tile's height field is centred on the tile (ENGINE-NOTES.md, item 6).
        position: [tile.center[0], 0, tile.center[1]],
        friction: 0.9,
        layer: LAYER.ground,
        userData: { kind: 'ground' }
      });
      bodies.set(tile, body);
      onTile?.(tile, 'load', flora);
    },
    onUnload(tile) {
      const body = bodies.get(tile);
      if (body) physics.removeBody(body);
      bodies.delete(tile);
      const material = tile.terrain.material;
      material.splat?.weights.dispose();
      material.dispose();
      onTile?.(tile, 'unload');
    }
  });
  scene.addChild(stream);

  // The far mountains: one field of 12 km, snow by height and slope, behind everything else.
  const FAR = 12000,
    FAR_COLUMNS = 161,
    farCenter = [140, -2100];
  const farHeights = (await workers.ask({ type: 'backdrop', cx: farCenter[0], cz: farCenter[1], size: FAR, columns: FAR_COLUMNS })).heights;
  const farField = createHeightField3D({ columns: FAR_COLUMNS, rows: FAR_COLUMNS, width: FAR, depth: FAR, heights: farHeights });
  const far = createTerrain3D(farField, createStandardMaterial3D({ vertexColors: true, roughness: 1, metallic: 0 }), {
    chunkCells: 40,
    levels: 3,
    lodDistance: 2500,
    skirtDepth: 20,
    colorAt(height, slope, x, z, out) {
      geography.groundColor(height, slope, x + farCenter[0], z + farCenter[1], out);
      // Far off, every peak above the snow line is white.
      const snow = Math.min(1, Math.max(0, (height - 340) / 120)) * (1 - Math.min(1, Math.max(0, (slope - 0.45) / 0.3)));
      out[0] += (0.86 - out[0]) * snow;
      out[1] += (0.88 - out[1]) * snow;
      out[2] += (0.94 - out[2]) * snow;
    }
  });
  far.setPosition(farCenter[0], 0, farCenter[1]);
  far.setShadows(false, false);
  scene.addChild(far);

  return {
    stream,
    far,
    viewDistance,
    /** The height of the ground, from the loaded tiles, or worked out where none is loaded yet. */
    heightAt: (x, z) => stream.heightAt(x, z) ?? geography.heightAt(x, z),
    /** Whether every tile within `radius` of a point is in place. */
    readyAround(x, z, radius = 120) {
      for (let dx = -radius; dx <= radius; dx += TILE / 2)
        for (let dz = -radius; dz <= radius; dz += TILE / 2) if (!stream.tileAt(x + dx, z + dz)) return false;
      return true;
    },
    /** Bring the tiles near (x, z) in and let the far ones go; each chunk picks its own detail as it is drawn. */
    update(x, z) {
      stream.update(x, z);
    },
    dispose() {
      workers.dispose();
    }
  };
}
