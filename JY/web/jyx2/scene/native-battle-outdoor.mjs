import {
  InstancedMesh3D, Mesh3D, computeObjectBounds3D, createBoxGeometry3D, createCustomShader3D,
  createCylinderGeometry3D, mat4Compose, mat4Multiply, quatFromEuler,
} from '@egret/engine/world3d';
import { addBattleGround, battleCellSeed, battleGrid, battlePartBatches } from './native-battle-terrain.mjs';
import { plantWindVertex } from './native-plant-wind.mjs';

const wallIds = new Set([872, 873, 874, 875, 881]);
const grassIds = new Set([32, 35, 76]);
const treeNames = new Map([
  [1396, 'Pine'], [1397, 'Pine'], [1398, 'Maple'], [1399, 'Cedar'],
  [1400, 'Maple'], [1401, 'Maple'], [1402, 'Pine'], [1403, 'Cedar'], [1404, 'Maple'], [1622, 'Maple'],
  [1787, 'Pine'], [1788, 'Cedar'], [1789, 'Pine'],
]);
const fence = id => id >= 1505 && id <= 1522;

function addTrees(scene, library, placements, own) {
  const shaders = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const rotation = new Float32Array(4), matrix = new Float32Array(16), transform = new Float32Array(16);
  let batches = 0, instances = 0, treeCount = 0;
  library.updateWorldMatrices();
  for (const [name, entries] of placements) {
    const source = library.children.find(node => node.name === name);
    if (!source) throw Error('Missing original battle tree model ' + name);
    const [minX, minY, minZ, maxX, maxY, maxZ] = computeObjectBounds3D(source);
    const treeHeight = Math.max(.01, maxY - minY);
    const centerX = (minX + maxX) * .5, centerZ = (minZ + maxZ) * .5;
    const [bend, flutter] = name === 'Maple' ? [.105, .027] : [.082, .020];
    source.traverse(node => {
      if (!(node instanceof Mesh3D)) return;
      const localMinY = node.geometry.boundingBox[1];
      const windMaterial = material => {
        const result = own(material.clone());
        // All materials on a tree move together, including its trunk and shadow pass.
        result.shader = createCustomShader3D({ key: 'kys-battle-tree-wind', glslVertex: plantWindVertex,
          uniforms: [0, bend, flutter, 1 / treeHeight, 3.85, Number(!reducedMotion.matches), Math.min(minY, localMinY)] });
        result.touch();
        shaders.push(result.shader);
        return result;
      };
      const materials = Array.isArray(node.material) ? node.material.map(windMaterial) : windMaterial(node.material);
      const mesh = scene.addChild(new InstancedMesh3D(node.geometry, materials, entries.length));
      mesh.name = name;
      entries.forEach(([x, y, seed], index) => {
        const size = (3.35 + seed % 16 * .09) / treeHeight;
        const yaw = seed % 28 * .23;
        const cos = Math.cos(yaw), sin = Math.sin(yaw);
        quatFromEuler(rotation, 0, yaw, 0);
        mat4Compose(matrix, [x - size * (cos * centerX + sin * centerZ), -size * minY,
          y - size * (cos * centerZ - sin * centerX)], rotation, [size, size, size]);
        mesh.setMatrixAt(index, mat4Multiply(transform, matrix, node.matrixWorld));
      });
      batches++;
      instances += entries.length;
    });
    treeCount += entries.length;
  }
  return {
    batches, instances, treeCount,
    tick(time) {
      const enabled = Number(!reducedMotion.matches);
      for (const shader of shaders) {
        shader.uniforms[0] = time;
        shader.uniforms[5] = enabled;
      }
    },
  };
}

export function addNativeOutdoorBattle(scene, spec, [stone, wood, grass, treeAsset], own) {
  const grid = battleGrid(spec);
  const { width, height, groundAt, propAt } = grid;
  const snow = spec.battlefieldId === 0;
  const groundTiles = addBattleGround(scene, grid, {
    map: snow ? undefined : grass, baseColor: 0xfff6e4,
    tones: snow ? [0xe1ebf2, 0xe1ebf2] : [0xa2c482, 0xefc090], repeat: 6,
    accent: (x, y) => groundAt(x, y) > 0 && !grassIds.has(groundAt(x, y)),
  }, own);

  const bases = [], walls = [], roofs = [], ridges = [], rocks = [], fences = [];
  const trees = new Map();
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const id = propAt(x, y);
    if (!id) continue;
    const seed = battleCellSeed(x, y);
    if (wallIds.has(id)) {
      const across = wallIds.has(propAt(x - 1, y)) || wallIds.has(propAt(x + 1, y));
      const yaw = across ? 0 : Math.PI / 2;
      bases.push([x, .13, y, 1.02, .26, .33, yaw]);
      walls.push([x, .82, y, 1.025, 1.18, .26, yaw]);
      roofs.push([x, 1.43, y, 1.035, .13, .45, yaw]);
      ridges.push([x, 1.53, y, 1.04, .08, .13, yaw]);
    } else if (treeNames.has(id)) {
      const name = treeNames.get(id);
      if (!trees.has(name)) trees.set(name, []);
      trees.get(name).push([x, y, seed]);
    } else if (fence(id)) {
      const yaw = fence(propAt(x - 1, y)) || fence(propAt(x + 1, y)) ? 0 : Math.PI / 2;
      const h = id <= 1511 ? 1.18 : .83;
      fences.push([x, h * .48, y, 1.01, .20, .11, yaw]);
      for (const offset of [-.34, 0, .34]) {
        fences.push([x + Math.cos(yaw) * offset, h * .48, y - Math.sin(yaw) * offset, .21, h, .14, yaw]);
      }
    } else if (id >= 1480 && id <= 1502 || snow && id >= 1775 && id <= 1797) {
      rocks.push([x, .18, y, .65, .34, .57, seed % 24 * .26], [x + .24, .11, y - .13, .43, .19, .38, seed % 17 * .26]);
    } else if (id >= 1143 && id <= 1187 && seed % 4 === 0) {
      bases.push([x, .045, y, .45, .09, .56, seed % 19 * .22]);
    }
  }
  const parts = battlePartBatches(scene, own);
  const box = own(createBoxGeometry3D());
  parts.add(bases, box, 0x8e9175, stone);
  parts.add(walls, box, 0xd4cfb9);
  parts.add(roofs, box, 0x576b59, stone);
  parts.add(ridges, box, 0x354b43, stone);
  parts.add(fences, box, 0xbb8754, wood);
  if (rocks.length) {
    const rock = own(createCylinderGeometry3D({ radiusTop: .34, radiusBottom: .56, height: 1, radialSegments: 7 }));
    parts.add(rocks, rock, snow ? 0xdce6ec : 0x8b887c, snow ? undefined : stone);
  }
  const plants = addTrees(scene, treeAsset.scene, trees, own);
  return {
    groundTiles, treeCount: plants.treeCount, wallCount: walls.length, tick: plants.tick,
    instances: parts.stats.instances + plants.instances, batches: parts.stats.batches + plants.batches,
  };
}
