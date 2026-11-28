import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';

register('../tools/egret-resolve.mjs', import.meta.url);
const { Scene3D, Mesh3D, InstancedMesh3D, createBoxGeometry3D, createStandardMaterial3D, loadGltf3D, vec3TransformMat4 } = await import('@egret/engine/world3d');
const { buildScenery } = await import('../src/scenery.mjs');
const { createSurfaces } = await import('../src/textures.mjs');
const { describeModel } = await import('../src/asset-models.mjs');

const roles = ['bunk-bed', 'archive-shelf', 'workbench', 'desktop-set', 'worker-locker'];
function build(models = {}) {
  const scene = new Scene3D();
  return { scene, ...buildScenery(scene, createSurfaces(), models) };
}
function visualFixture(name) {
  const source = new Scene3D();
  const mesh = new Mesh3D(createBoxGeometry3D(1, 1, 1), createStandardMaterial3D({color: 0x8d856d}));
  source.addChild(mesh);
  const model = describeModel(source);
  model.name = name;
  return model;
}

test('roofed rooms share one opaque dry cosmetic floor; native outdoor rain and decal height are retained', () => {
  const {scene, wet} = build();
  const rooms = scene.children.filter(n => n.name === 'Interior dry concrete floors');
  assert.equal(rooms.length, 1, 'one batched visual floor surface, not one material per room');
  const floor = rooms[0];
  assert(!wet.meshes.includes(floor));
  assert(!wet.materials.some(entry => entry.material === floor.material));
  assert(floor.material.roughness >= 0.82);
  assert.equal(floor.material.shader.key, 'cutoff-grime', 'dry grime only, not animated rain normals');
  assert(wet.materials.some(entry => entry.material.shader?.key === 'cutoff-wet'), 'outdoor wet shader remains');
  const p = floor.geometry.getAttribute('position').data;
  const byRoom=[[],[]];
  for(let i=0;i<p.length;i+=3){
    const [x,y,z]=p.subarray(i,i+3);
    assert(y<=0.01 && y>=-0.01,'cosmetic surface remains below 0.012 road/hazard decals');
    assert(y>=-0.01);
    if(x>=-8&&x<=16&&z>=-26&&z<=-8)byRoom[0].push([x,y,z]);
    else if(x>=22&&x<=36&&z>=-20&&z<=2)byRoom[1].push([x,y,z]);
    else assert.fail('dry surface spills outside its existing room bounds');
  }
  for(const [i,[xmin,xmax,zmin,zmax]] of [[-8,16,-26,-8],[22,36,-20,2]].entries()) {
    assert(byRoom[i].length>0);
    const x=byRoom[i].map(v=>v[0]), y=byRoom[i].map(v=>v[1]), z=byRoom[i].map(v=>v[2]);
    assert.equal(Math.min(...x),xmin);assert.equal(Math.max(...x),xmax);
    assert.equal(Math.min(...z),zmin);assert.equal(Math.max(...z),zmax);
    assert(Math.max(...y)>0,'dry surface must cover the underlying wet plane');
  }
});

test('authored room props retain original cosmetic locations and replace only their procedural counterparts', () => {
  const fallback=build();
  const models=Object.fromEntries(roles.map(name=>[name,visualFixture(name)]));
  const authored=build(models);
  const expected={
    'bunk-bed':[[35.1,-7.2],[35.1,-0.2]],
    'archive-shelf':[[35.55,-11.5],[35.55,-13.5]],
    workbench:[[13.6,-9.3]],
    'desktop-set':[[31,-12.6],[25.1,-17],[26,-5.6],[33.6,-4]],
    'worker-locker':Array.from({length:5},(_,i)=>[-7.35,-9.6-i*0.62]),
  };
  for(const role of roles){
    assert.equal(fallback.scene.children.filter(n=>n.name===role).length,0);
    const matches=authored.scene.children.filter(n=>n.name===role);
    assert.equal(matches.length,1,role+' uses one instance batch for one authored material/mesh');
    const [mesh]=matches;
    assert(mesh instanceof InstancedMesh3D);
    assert.equal(mesh.count,expected[role].length);
    for(const [i,[x,z]] of expected[role].entries()){
      const m=mesh.instanceMatrices.subarray(i*16,(i+1)*16);
      assert(Math.abs(m[12]-x)<0.001&&Math.abs(m[14]-z)<0.001,role+' stays centered on its original position');
      const magnitudes=[Math.hypot(...m.subarray(0,3)),Math.hypot(...m.subarray(4,7)),Math.hypot(...m.subarray(8,11))];
      assert(magnitudes.every(v=>Math.abs(v-magnitudes[0])<.00001),role+' scale is uniform, never squeezed to fill a slot');
    }
  }
  for(const name of ['plain','wood','metal'])assert(authored.meshes[name].geometry.drawCount<fallback.meshes[name].geometry.drawCount,'loaded props remove old cosmetic '+name+' shapes');
});

test('the shipped bed, archive shelf and worker locker retain natural full-size visual proportions', async () => {
  const directory = new URL('../assets/models/', import.meta.url);
  const specs = JSON.parse(await readFile(new URL('index.json', directory), 'utf8'));
  const envelopes = {
    // x=room depth, z=long/width axis after manifest orientation + placement yaw.
    'bunk-bed': [[1.16,1.25],[1.5,1.65],[1.7,1.85]],
    'archive-shelf': [[.51,.56],[1.85,2],[.92,1.03]],
    'worker-locker': [[.67,.72],[1.7,1.8],[.56,.59]],
  };
  const models={},assets=[];
  try {
    for (const role of Object.keys(envelopes)) {
      const spec=specs[role];
      const asset = await loadGltf3D(await readFile(new URL(spec.file,directory)), {
        decodeImage: async () => ({width:1,height:1,data:new Uint8Array([255,255,255,255])}),
      });
      assets.push(asset);
      const model = describeModel(asset.scene, spec);
      models[role] = {...model, name:role};
    }
    const {scene}=build(models);
    const point=new Float32Array(3);
    for (const [role,ranges] of Object.entries(envelopes)) {
      const meshes=scene.children.filter(n=>n.name===role);
      assert(meshes.length>0);
      for (let i=0;i<meshes[0].count;i++) {
        const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
        for (const mesh of meshes) {
          const mat=mesh.instanceMatrices.subarray(i*16,i*16+16),p=mesh.geometry.getAttribute('position').data;
          for (let at=0;at<p.length;at+=3) {
            vec3TransformMat4(point,p.subarray(at,at+3),mat);
            for(let axis=0;axis<3;axis++){min[axis]=Math.min(min[axis],point[axis]);max[axis]=Math.max(max[axis],point[axis]);}
          }
        }
        for (let axis=0;axis<3;axis++) {
          const size=max[axis]-min[axis],[lower,upper]=ranges[axis];
          assert(size>=lower&&size<=upper,`${role} visual axis ${axis} is naturally sized: ${size}`);
        }
        assert(Math.abs(min[1]-.008)<.0001,role+' rests on the dry cosmetic floor');
        assert(role==='worker-locker'?min[0]>-8:max[0]<36,role+' fits inside the existing wall extent');
      }
    }
  } finally {
    for(const asset of assets)asset.dispose();
  }
});
