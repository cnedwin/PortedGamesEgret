import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
const { Scene3D, Object3D, Mesh3D, InstancedMesh3D, createBoxGeometry3D, createStandardMaterial3D, loadGltf3D } = await import('@egret/engine/world3d');
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
// A real native GLB-description-shaped fixture, not an invented tree asset. It
// checks assembly and LOD placement before the authored binary is available.
const { describeModel, loadModels } = await import('../src/asset-models.mjs');
function importedFixture(name, alphaMode='opaque') {
  const scene=new Object3D(),material=createStandardMaterial3D({color:0x74805e,alphaMode,side:'double'});
  for(const [nodeName,width,height,depth] of [['TreeNear',2.4,3.7,2.1],['TreeFar',2.25,3.6,2.05]]){
    const root=new Object3D();root.name=nodeName;
    const mesh=new Mesh3D(createBoxGeometry3D({width,height,depth}),material).setPosition(0,height/2,0);
    root.addChild(mesh);scene.addChild(root);
  }
  const model=describeModel(scene,{parts:{near:'TreeNear',far:'TreeFar'}});
  model.parts.near.name=name+'/near';model.parts.far.name=name+'/far';
  return {...model,name};
}

test('required native tree art places every high/low instance at the original grounded site and omits diagnostic textures',()=>{
  const scene=new Scene3D(),o=importedFixture('tree-oak','mask'),f=importedFixture('tree-fir','opaque');
  const result=vegetation.buildVegetation(scene,{'tree-oak':o,'tree-fir':f}),p=vegetation.treePlacements();
  assert.equal(result.meshes.length,4);
  assert.deepEqual(Object.keys(result.textures),[],'normal imported art must not build procedural atlases');
  const expected={'tree-oak/near':p.oak.slice(0,4),'tree-oak/far':p.oak.slice(4),
    'tree-fir/near':p.fir.slice(-4),'tree-fir/far':p.fir.slice(0,-4)};
  const speciesScale={};
  for(const mesh of result.meshes){
    const list=expected[mesh.name];
    assert.ok(mesh instanceof InstancedMesh3D&&list,'one native batch per actual model part');
    assert.equal(mesh.count,list.length);
    const mat=mesh.instanceMatrices,bounds=mesh.geometry.boundingBox;
    for(let i=0;i<list.length;i++){
      const [x,z,size]=list[i],m=mat.subarray(i*16,(i+1)*16);
      assert.ok(Math.abs(m[12]-x)<1e-4&&Math.abs(m[14]-z)<1e-4);
      const sx=Math.hypot(m[0],m[1],m[2]),sy=Math.hypot(m[4],m[5],m[6]),sz=Math.hypot(m[8],m[9],m[10]);
      assert.ok(Math.abs(sx-sy)<1e-4&&Math.abs(sy-sz)<1e-4,'trees must use uniform scale');
      const species=mesh.name.split('/')[0],ratio=sx/size;
      if(speciesScale[species]===undefined)speciesScale[species]=ratio;
      else assert.ok(Math.abs(speciesScale[species]-ratio)<1e-4,'near/far parts share the same model fit');
      const bottom=m[13]+bounds[1]*sy,top=m[13]+bounds[4]*sy;
      assert.ok(Math.abs(bottom)<1e-4&&top>2.4*size&&top<4.05*size,'grounded within original height envelope');
    }
    if(mesh.name.startsWith('tree-oak')){
      assert.equal(mesh.material.alphaMode,'mask');
      assert.equal(mesh.castShadow,true,'alpha-cutout shadow must use the source material, not an opaque proxy');
      assert.equal(mesh.children.length,0);
    }
  }
  assert.deepEqual(result.placements,p);
});

test('a diagnostic partial tree set builds only the missing species procedural atlas',()=>{
  const scene=new Scene3D(),model=importedFixture('tree-oak');
  const result=vegetation.buildVegetation(scene,{'tree-oak':model});
  assert.equal(result.meshes.length,4);
  assert.deepEqual(Object.keys(result.textures).sort(),['bark','normal','pine']);
  assert.equal(result.meshes.filter(mesh=>mesh.name.startsWith('tree-oak/')).reduce((n,m)=>n+m.count,0),10);
  assert.equal(result.meshes.filter(mesh=>mesh.name==='fir-canopy')[0].count,43);
});
test('production requires both native tree roles and a failed tree releases the art bundle for Retry',async t=>{
  const {readFile}=await import('node:fs/promises');
  const manifest=JSON.parse(await readFile(new URL('../assets/models/index.json',import.meta.url),'utf8'));
  // The actual loader/catalog roles are exercised; the fixture merely shares one
  // native unit geometry for unrelated assets to avoid network/decoder work.
  const fixture=Object.fromEntries(Object.keys(manifest).map(role=>[role,{file:'ready.glb'}]));
  fixture['tree-oak']={file:'ready.glb'};fixture['tree-fir']={file:'failed-tree.glb'};
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>fixture}));
  let disposals=0,requests=0;
  const load=async url=>{
    requests++;
    if(url.pathname.endsWith('/failed-tree.glb'))throw Error('Tree download interrupted');
    const scene=new Object3D();
    scene.addChild(new Mesh3D(createBoxGeometry3D({width:1,height:2,depth:1}),createStandardMaterial3D({color:0xffffff})));
    return {scene,dispose(){disposals++;}};
  };
  await assert.rejects(loadModels(load,{strict:true}),error=>error.code==='MODEL_LOAD_FAILED'&&error.failures['tree-fir'].includes('Tree download interrupted'));
  assert.equal(requests,2);assert.equal(disposals,1);
  delete fixture['tree-oak'];requests=0;
  await assert.rejects(loadModels(load,{strict:true}),error=>error.code==='MODEL_LOAD_FAILED'&&error.failures['tree-oak'].includes('missing'));
  assert.equal(requests,0,'neither mixed art nor fallback is admitted in normal production');
});
test('the shipped authored tree GLBs use native detailed near meshes and bounded far MASK art for all 53 trees',async()=>{
  const {readFile}=await import('node:fs/promises');
  const directory=new URL('../assets/models/',import.meta.url),manifest=JSON.parse(await readFile(new URL('index.json',directory),'utf8'));
  const models={},assets=[],expected={'tree-oak':17591,'tree-fir':17580};
  try{
    for(const role of Object.keys(expected)){
      const spec=manifest[role];
      assert.deepEqual(spec.parts,{near:'TreeNear',far:'TreeFar'});
      const bytes=await readFile(new URL(spec.file,directory));
      const json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
      assert(json.buffers.every(buffer=>!buffer.uri));
      assert(json.images.every(image=>!image.uri&&Number.isInteger(image.bufferView)),'all images remain embedded');
      // Geometry/material references are verified by the vendored native GLB
      // decoder. The browser acceptance decodes the real image pixels.
      const asset=await loadGltf3D(bytes,{decodeImage:async()=>({width:1,height:1,data:new Uint8Array([255,255,255,255])})});
      assets.push(asset);
      const model=describeModel(asset.scene,spec);
      for(const [part,section] of Object.entries(model.parts))section.name=role+'/'+part;
      models[role]={...model,name:role};
      assert.equal(model.parts.near.meshes.length,1);
      assert.equal(model.parts.near.meshes[0].geometry.drawCount/3,expected[role]);
      assert.equal(model.parts.far.meshes.length,1);
      assert.equal(model.parts.far.meshes[0].geometry.drawCount/3,6,'three crossed authored-view planes');
      assert.ok(Math.abs(model.parts.near.bounds[1])<1e-4&&Math.abs(model.parts.far.bounds[1])<1e-4);
      assert.ok(Math.abs(model.parts.near.bounds[4]-model.parts.far.bounds[4])<1e-4,'same authored ground and height');
      for(const section of Object.values(model.parts)){
        const material=section.meshes[0].material;
        assert.ok(material.map&&material.normalMap&&material.metallicRoughnessMap,'retain all three native PBR channels');
      }
      assert.equal(model.parts.near.meshes[0].material.alphaMode,'opaque');
      assert.equal(model.parts.far.meshes[0].material.alphaMode,'mask');
    }
    const scene=new Scene3D(),built=vegetation.buildVegetation(scene,models),counts=Object.fromEntries(built.meshes.map(mesh=>[mesh.name,mesh.count]));
    assert.deepEqual(counts,{'tree-oak/near':4,'tree-oak/far':6,'tree-fir/near':4,'tree-fir/far':39});
    assert.equal(Object.values(counts).reduce((sum,count)=>sum+count,0),53);
    assert.equal(built.meshes.length,4);
    assert.equal(Object.keys(built.textures).length,0,'no hidden original tree texture fallback on the normal path');
    assert.ok(scene.children.every(mesh=>mesh.name.startsWith('tree-')),'no old procedural tree is attached');
    assert.equal(built.meshes.reduce((sum,mesh)=>sum+mesh.geometry.drawCount/3*mesh.count,0),140954);
    for(const mesh of built.meshes){
      const source=models[mesh.name.split('/')[0]].parts[mesh.name.split('/')[1]].meshes[0].material;
      assert.notEqual(mesh.material,source,'tree fill is an independent native material');
      assert.equal(mesh.material.map,source.map);assert.equal(mesh.material.emissiveMap,source.map,'textured diffuse fill retains leaf/bark detail in shade');
      assert.ok(mesh.material.emissiveIntensity>0&&mesh.material.emissiveIntensity<=.30);
      assert.equal(mesh.material.metallic,0);assert.ok(mesh.material.roughness>=.9);
      if(mesh.name.endsWith('/far')){
        assert.equal(mesh.castShadow,true,'far alpha MASK is used in the original native shadow pass');
        assert.equal(mesh.children.length,0,'no opaque rectangular shadow proxy');
      }else{
        assert.equal(mesh.castShadow,false);
        assert.ok(mesh.children.some(proxy=>proxy.castShadow&&proxy.geometry.drawCount<mesh.geometry.drawCount));
      }
    }
  }finally{for(const asset of assets)asset.dispose();}
});
