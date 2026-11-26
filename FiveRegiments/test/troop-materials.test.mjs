import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const { imports } = JSON.parse(await readFile(new URL('vendor/importmap.json', root), 'utf8'));
const hook = registerHooks({ resolve(name, context, next) {
  return next(imports[name] ? new URL(imports[name], root).href : name, context);
} });
const [{ Mesh3D, loadGltf3D }, { prepareTroopMaterials }] = await Promise.all([
  import('@egret/engine/world3d'), import('../src/view/troop-materials.mjs')
]);
hook.deregister();

test('the five regular uniforms keep the rig and face atlas while changing cloth and simplifying the surface', async () => {
  const dyes = new Set();
  for (const regiment of ['yulin', 'tiger', 'vanguard', 'plume', 'archer']) {
    const model = await loadGltf3D(await readFile(new URL(`assets/characters/${regiment}-low.glb`, root)), {
      decodeImage: async () => ({ data: new Uint8Array(4), width: 1, height: 1 })
    });
    let body;
    model.scene.traverse(mesh => {
      if (mesh instanceof Mesh3D && mesh.skeleton) body = mesh;
    });
    const { geometry, material, skeleton } = body;
    const dispose = prepareTroopMaterials(model.scene, regiment);
    try {
      assert.equal(body.skeleton, skeleton);
      for (const name of ['position', 'normal', 'uv', 'joints', 'weights']) {
        assert.equal(body.geometry.getAttribute(name), geometry.getAttribute(name), name);
      }
      assert.equal(body.geometry.index.data, geometry.index.data);
      assert.equal(body.material.map, material.map);
      assert.ok(material.normalMap && material.metallicRoughnessMap);
      assert.equal(body.material.normalMap, undefined);
      assert.equal(body.material.metallicRoughnessMap, undefined);
      assert.equal(geometry.getAttribute('color'), undefined);

      const joints = geometry.getAttribute('joints');
      const weights = geometry.getAttribute('weights');
      const color = body.geometry.getAttribute('color');
      const byRegion = region => {
        for (let vertex = 0; vertex < geometry.vertexCount; vertex++) {
          const start = vertex * weights.itemSize;
          const positive = joints.data.subarray(start, start + weights.itemSize)
            .filter((_, part) => weights.data[start + part] > 0);
          if (positive.length && positive.every(joint => region.test(skeleton.bones[joint].name))) {
            return Array.from(color.data.subarray(vertex * 3, vertex * 3 + 3));
          }
        }
      };
      assert.deepEqual(byRegion(/^(?:head$|neck_)/), [1, 1, 1], `${regiment} head`);
      const cloth = byRegion(/^(?:pelvis$|spine_)/);
      assert.ok(cloth?.some(channel => channel < 0.9), `${regiment} cloth`);
      dyes.add(cloth.join(','));
    } finally {
      dispose();
      assert.equal(body.geometry.isDisposed, true);
      assert.equal(body.material.isDisposed, true);
      assert.equal(material.isDisposed, false);
      model.dispose();
    }
  }
  assert.equal(dyes.size, 5);
});
