import { InstancedMesh3D, vec3Normalize } from '@egret/engine/world3d';
import { createNativeSceneSprites } from './native-scene-sprites.mjs';

export async function addNativeGenericBattle(scene, spec, camera, units, outdoor, artwork, own) {
  const { loadNativeSubmapScenery } = await import('./native-submap-scenery.mjs');
  const { loadArt, json } = artwork;
  const originalIds = [...new Set(Array.from(spec.layers.building, raw => Math.trunc(raw / 2)))].filter(id => id > 0);
  const available = originalIds.length ? new Set(await json('/api/art/smap')) : new Set();
  const ids = originalIds.filter(id => available.has(id));
  const art = ids.length ? await loadArt('smap', ids) : new Map();
  const sprites = own(createNativeSceneSprites(art, units));
  const toward = vec3Normalize(new Float32Array(3), camera.position);
  const flat = new Int16Array(spec.width * spec.height);
  const layers = { ...spec.layers, decoration: flat, buildingHeight: flat, decorationHeight: flat };
  const scenery = own(await loadNativeSubmapScenery({ ...spec, name: outdoor ? '' : '洞', layers, blendOutdoorGround: true }, {
    sprite(id, x, z, y, rank) {
      const mesh = sprites.create(id);
      if (!mesh) return;
      const offset = rank * .006;
      return mesh.setPosition(x + toward[0] * offset, y + toward[1] * offset, z + toward[2] * offset)
        .setQuaternion(...camera.quaternion);
    },
  }));
  scene.addChild(scenery.root);
  let instances = 0, batches = 0;
  scenery.root.traverse(node => {
    if (!(node instanceof InstancedMesh3D)) return;
    batches++;
    instances += node.count;
  });
  return {
    instances, batches, groundTiles: scenery.floorCells, treeCount: scenery.vegetationInstances,
    modeledTerrain: scenery.modeled, originalProps: scenery.retained, omittedTerrain: scenery.omitted,
    maskCells: scenery.maskCells, tick(seconds) { scenery.updateWind(seconds * 1000); },
  };
}
