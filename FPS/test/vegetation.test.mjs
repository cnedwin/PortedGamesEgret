import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
const { Scene3D, InstancedMesh3D } = await import('@egret/engine/world3d');
const vegetation = await import('../src/vegetation.mjs');

test('tree locations retain every authored oak and every original seeded fir; no collision changes', () => {
  const placements = vegetation.treePlacements();
  const oak = [[-34.5,30,1.25],[34.5,30.2,1.3],[36,-27.5,1.2],[-12.5,30.3,1.1],[45,6,2],[-46,12,2.2],
    [-44,-14,1.9],[10,40,2.1],[-20,41,1.8],[47,26,1.9]];
  const fir = [];
  for(let i=0;i<54;i++){
    const angle=(i/54)*Math.PI*2+Math.sin(i*3.7)*0.05,reach=50+((i*37)%11)*1.6;
    const x=Math.sin(angle)*reach*1.05,z=Math.cos(angle)*reach*0.95+2;
    if(z<-24&&Math.abs(x)<50)continue;
    fir.push([x,z,2.2+((i*13)%7)*0.22]);
  }
  fir.push([-35.5,29.5,1.5],[35,-24.5,1.7],[36,12.5,1.4],[-10.5,29.8,1.3]);
  assert.deepEqual(placements.oak,oak);
  assert.deepEqual(placements.fir,fir);
});

test('original procedural bark and foliage maps are deterministic, non-solid and bounded', () => {
  const { oak,pine,bark,normal,size } = vegetation.vegetationPixels();
  assert.equal(size,256);
  for(const rgba of [oak,pine,bark,normal]){
    assert.ok(rgba instanceof Uint8Array);
    assert.equal(rgba.length,size*size*4);
  }
  const again=vegetation.vegetationPixels();
  assert.deepEqual(again.oak,oak);assert.deepEqual(again.pine,pine);assert.deepEqual(again.bark,bark);
  for(const [kind,pixels] of [['oak',oak],['pine',pine]]){
    let opaque=0,transparent=0,colors=new Set();
    for(let i=0;i<pixels.length;i+=4){
      if(pixels[i+3]>=90){opaque++;colors.add((pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2]);}
      else transparent++;
    }
    const share=opaque/(size*size);
    assert.ok(share>0.18&&share<0.88,kind+' retains a natural cutout silhouette '+share);
    assert.ok(colors.size>100,kind+' contains true leaf color/detail variation');
    assert.ok(transparent>0);
    for(const i of [0,(size-1)*4,(size*(size-1))*4,(size*size-1)*4])assert.equal(pixels[i+3],0);
  }
  assert.notDeepEqual(oak,pine,'a broadleaf and a needle spray must not share a cutout shape');
  assert.equal(bark[3],255);assert.equal(normal[3],255);
});

test('native vegetation uses four shared instanced draws with bounded geometry and shadow-compatible cutout materials', () => {
  const scene=new Scene3D(),built=vegetation.buildVegetation(scene),p=vegetation.treePlacements();
  assert.equal(built.meshes.length,4);
  assert.equal(scene.children.length,4);
  let totalTriangles=0;
  for(const mesh of built.meshes){
    assert.ok(mesh instanceof InstancedMesh3D);
    assert.ok(mesh.castShadow&&mesh.receiveShadow);
    assert.ok(mesh.material.map,'native textured surfaces');
    const type=mesh.name.startsWith('oak')?'oak':'fir';
    assert.equal(mesh.count,p[type].length);
    const g=mesh.geometry,b=g.boundingBox;
    assert.ok(g.drawCount>0&&g.drawCount%3===0);
    assert.ok(g.drawCount/3<=600,'keep per-instanced prototype bounded');
    totalTriangles+=g.drawCount/3*mesh.count;
    const maxRadius=type==='oak'?1.8:1.32;
    assert.ok(b[0]>=-maxRadius&&b[2]>=-maxRadius&&b[3]<=maxRadius&&b[5]<=maxRadius,'old footprint envelope');
    assert.ok(b[1]>=-0.04&&b[4]<=(type==='oak'?4.05:3.55),'old height envelope');
    if(mesh.name.endsWith('canopy')){
      assert.equal(mesh.material.alphaMode,'mask');
      assert.ok(mesh.material.depthWrite&&mesh.material.side==='double');
      assert.ok(mesh.material.alphaCutoff>=0.30&&mesh.material.alphaCutoff<=0.55);
    }else{
      assert.equal(mesh.material.alphaMode,'opaque');
      assert.ok(mesh.material.normalMap,'bark catches wet grazing light and has relief');
    }
  }
  assert.ok(totalTriangles<36000,'bounded total scene triangle count for trees: '+totalTriangles);
});
