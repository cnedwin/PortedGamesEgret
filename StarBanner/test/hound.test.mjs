import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { AnimationMixer3D, Mesh3D, loadGltf3D } from '../vendor/engine/dist/rendering/world3d/index.js';

const sourceHashes = {
  high: '283b13433900c654adfa1f56268ee6896ec821a6cbb7115d1a80c74bf8eb376d',
  mid: '43b998cf67d14eac93b3536ce136d62f5a81e455d34eb81fa788de7f8a869d81',
  low: '4b1d8888d7207118fb5c4b77abc6163ec910c40250508fa69810c37a0f2def7f'
};

for (const [tier, hash] of Object.entries(sourceHashes)) {
  test(`hound ${tier} keeps the source shape and five playable quadruped clips`, async () => {
    const model = await readFile(new URL(`../assets/models/hound-${tier}.glb`, import.meta.url));
    const json = JSON.parse(model.toString('utf8', 20, 20 + model.readUInt32LE(12)));
    assert.equal(json.asset.extras.sourceSha256, hash);
    const asset = await loadGltf3D(model, {
      decodeImage: async () => ({ width: 1, height: 1, data: new Uint8Array([255, 255, 255, 255]) })
    });
    let mesh;
    asset.scene.traverse((node) => { if (node instanceof Mesh3D) mesh = node; });
    assert.equal(mesh.skeleton.bones.length, 18);
    const joint = mesh.geometry.getAttribute('joints').data;
    const weight = mesh.geometry.getAttribute('weights').data;
    const used = new Set();
    for (let i = 0; i < joint.length; i += 4) {
      assert(Math.abs(weight[i] + weight[i + 1] + weight[i + 2] + weight[i + 3] - 1) < 0.00001);
      for (let slot = i; slot < i + 4; slot++) if (weight[slot]) used.add(joint[slot]);
    }
    const paws = mesh.skeleton.bones.filter((bone) => bone.name.endsWith('_paw'));
    assert.equal(paws.length, 4);
    assert(paws.every((bone) => used.has(mesh.skeleton.bones.indexOf(bone))));
    assert.deepEqual(asset.animations.map((clip) => clip.name), ['idle', 'walk', 'pounce', 'hurt', 'fall']);
    const mixer = new AnimationMixer3D(asset.scene);
    const body = mesh.skeleton.bones[0];
    const bind = [...body.position];
    for (const clip of asset.animations) {
      mixer.restorePose();
      mixer.clipAction(clip).reset().play();
      mixer.update(clip.duration * 0.35);
      assert.notDeepEqual([...body.position], bind, `${clip.name} moves the body`);
    }
  });
}
