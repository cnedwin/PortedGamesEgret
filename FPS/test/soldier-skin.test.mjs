import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';

register('../tools/egret-resolve.mjs', import.meta.url);
const { loadGltf3D, createPhysicsWorld3D } = await import('@egret/engine/world3d');
const { describeModel } = await import('../src/asset-models.mjs');
const { prepareSoldierSkin, createSoldierSkin } = await import('../src/soldier-skin.mjs');
const { createSoldierFactory } = await import('../src/soldier.mjs');

async function model(kind) {
  const bytes = await readFile(new URL('../assets/models/soldier-' + kind + '.glb', import.meta.url));
  const asset = await loadGltf3D(bytes, { decodeImage: async () => ({ width: 1, height: 1, data: new Uint8Array([255,255,255,255]) }) });
  return describeModel(asset.scene, { yaw: Math.PI, parts: {} });
}

test('continuous soldier skin preserves source surfaces, UVs and shared PBR data', async () => {
  for (const kind of ['rifle', 'rush', 'heavy']) {
    const original = await model(kind), first = original.meshes[0];
    const position = first.geometry.getAttribute('position'), uv = first.geometry.getAttribute('uv'), indices = first.geometry.index;
    const bakedJoints=first.geometry.getAttribute('joints'),bakedWeights=first.geometry.getAttribute('weights');
    assert.ok(bakedJoints && bakedWeights, 'production characters include the visually reviewed offline skin');
    const positions = position.data.slice(), uvs = uv.data.slice(), triangles = indices.data.slice();
    const prepared = prepareSoldierSkin(original, kind);
    assert.equal(prepareSoldierSkin(original, kind), prepared, 'weights are prepared once per loaded role');
    assert.equal(prepared.pieces.length, original.meshes.length);
    assert.equal(prepared.pieces[0].geometry, first.geometry);
    assert.equal(prepared.pieces[0].material, first.material);
    assert.equal(first.geometry.getAttribute('joints'),bakedJoints,'boot reuses the baked palette indices');
    assert.equal(first.geometry.getAttribute('weights'),bakedWeights,'boot does not infer character weights on the phone');
    assert.deepEqual(position.data, positions);
    assert.deepEqual(uv.data, uvs);
    assert.deepEqual(indices.data, triangles, 'no triangles are cut or reassigned to independent limbs');
    assert.ok(first.geometry.getAttribute('tangent'), 'normal mapped source retains a UV tangent basis');
    for (const piece of prepared.pieces) {
      const joints = piece.geometry.getAttribute('joints').data, weights = piece.geometry.getAttribute('weights').data;
      assert.equal(weights.length, piece.geometry.vertexCount * 4);
      for (let i = 0; i < weights.length; i += 4) {
        assert.ok(Math.abs(weights[i]+weights[i+1]+weights[i+2]+weights[i+3]-1) < 1e-6);
        for (let slot=0; slot<4; slot++) {
          assert.ok(weights[i+slot] >= 0 && weights[i+slot] <= 1);
          assert.ok(joints[i+slot] < 16);
        }
      }
    }
  }
});

test('actors share continuous geometry but retain independent bone palettes and a faithful bind pose', async () => {
  const prepared = prepareSoldierSkin(await model('rifle'), 'rifle');
  const first = createSoldierSkin(prepared, 1), second = createSoldierSkin(prepared, 1);
  assert.notEqual(first.skeleton, second.skeleton);
  assert.notEqual(first.skeleton.bones[8], second.skeleton.bones[8]);
  assert.equal(first.root.children[1].geometry, second.root.children[1].geometry);
  assert.equal(first.root.children[1].material, second.root.children[1].material);
  const initial = Array.from(second.skeleton.bones[8].quaternion);
  for (const bone of first.skeleton.bones) bone.setQuaternion(0,0,0,1);
  first.root.updateWorldMatrices(true);
  first.skeleton.update(1);
  for (let offset=0; offset<first.skeleton.boneMatrices.length; offset+=16) {
    const matrix=first.skeleton.boneMatrices.subarray(offset,offset+16);
    for (let i=0; i<16; i++) assert.ok(Math.abs(matrix[i] - (i%5===0 ? 1 : 0)) < 1e-5);
  }
  assert.deepEqual(Array.from(second.skeleton.bones[8].quaternion), initial);
});

test('loose outer sleeves follow the whole arm instead of leaving stretched pelvis-weighted fins', async () => {
  for (const kind of ['rifle', 'rush', 'heavy']) {
    const prepared = prepareSoldierSkin(await model(kind), kind);
    let checked = 0;
    for (const piece of prepared.pieces) {
      const positions = piece.geometry.getAttribute('position').data;
      const joints = piece.geometry.getAttribute('joints').data, weights = piece.geometry.getAttribute('weights').data;
      const m = piece.bind;
      for (let i=0; i<positions.length; i+=3) {
        const p=positions.subarray(i,i+3);
        const x=Math.abs((m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12])/1.78);
        const y=(m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13])/1.78;
        const sleeve=kind==='heavy' ? x>.325 && y>.26 && y<.8 : x>.205 && y>.61 && y<.86;
        if (!sleeve) continue;
        checked++;
        let torso=0;
        for (let slot=0; slot<4; slot++) if (joints[i/3*4+slot]<8) torso+=weights[i/3*4+slot];
        assert.ok(torso<.001, `${kind} outer sleeve x=${x.toFixed(3)} y=${y.toFixed(3)} retains ${torso.toFixed(3)} torso influence`);
      }
    }
    assert.ok(checked>100, kind+' exercises the actual authored sleeve surface');
  }
});

test('a continuous heavy figure follows native movement, reload and rigid-body death', async () => {
  const heavy = await model('heavy'), world = createPhysicsWorld3D({ gravity: [0,-18,0] });
  const actor = createSoldierFactory(world, { 'soldier-heavy': heavy })('heavy');
  let mesh;
  actor.root.traverse(node => { if (node.skeleton) mesh = node; });
  assert.ok(mesh);
  assert.equal(mesh.geometry, heavy.meshes[0].geometry);
  const original = mesh.geometry.getAttribute('position').data.slice();
  const enemy = { id: 1, x: 2, z: 3, yaw: .4, speed: 4, crouch: 0, hurtAgo: 3, firedAgo: 3,
    sees: true, aware: true, reloading: 0, dead: false, deadFor: 0, fallYaw: 0 };
  for (let i=0; i<60; i++) actor.update(enemy, 1/60, 0);
  actor.update({ ...enemy, reloading: 1 }, 1/60, 0);
  actor.update({ ...enemy, dead: true }, 1/60, 0);
  world.step(1/60);
  actor.update({ ...enemy, dead: true }, 1/60, 0);
  actor.root.updateWorldMatrices(true);
  actor.root.traverse(node => assert.ok(Array.from(node.matrixWorld).every(Number.isFinite)));
  assert.deepEqual(mesh.geometry.getAttribute('position').data, original, 'animation updates only the palette');
  actor.dispose();
});
