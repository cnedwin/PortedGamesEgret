import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

register('../tools/egret-resolve.mjs', import.meta.url);
const { makeSluiceAtlas, makePuddleMask, createWaterDetails, PUDDLE_LAYOUT } = await import('../src/water-details.mjs');
const { Scene3D }=await import('@egret/engine/world3d');
const { buildScenery }=await import('../src/scenery.mjs');
const { createSurfaces }=await import('../src/textures.mjs');

const alpha = (image,x,y) => image.data[(y*image.width+x)*4+3];
test('sluice sheets and splash atlas have detailed translucent flow and fully feathered edges',()=>{
  const image=makeSluiceAtlas();assert.equal(image.width,256);assert.equal(image.height,256);
  assert.deepEqual(image,makeSluiceAtlas(),'procedural art is reproducible');
  for(let i=0;i<image.height;i++)for(const x of [0,127,128,255])assert.equal(alpha(image,x,i),0);
  for(const y of [0,255])for(let x=0;x<image.width;x++)assert.equal(alpha(image,x,y),0);
  const water=new Set(),foam=new Set();for(let y=16;y<240;y++)for(let x=0;x<128;x++){
    water.add(alpha(image,x,y));foam.add(alpha(image,x+128,y));
  }
  assert(water.size>45&&foam.size>35,'flow and spray have soft, detailed alpha gradients');
  assert(Math.max(...water)<180&&Math.max(...foam)<180,'neither layer forms an opaque white slab');
});

test('puddle is a single irregular, softly blended mask instead of dark overlapping polygons',()=>{
  const image=makePuddleMask();assert.deepEqual(image,makePuddleMask());
  const {width:w,height:h,data}=image,values=new Set();let visible=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const a=alpha(image,x,y);values.add(a);
    if(x===0||y===0||x===w-1||y===h-1)assert.equal(a,0);
    if(a>20){visible++;const i=(y*w+x)*4;assert(Math.min(data[i],data[i+1],data[i+2])>=70,'rainwater is not near-black');}
  }
  assert(visible>w*h*.28&&visible<w*h*.75,'the opacity contour is irregular and does not fill its quad');
  assert(values.size>50&&alpha(image,w/2,h/2)>80&&alpha(image,w/2,h/2)<190,'soft edge and translucent center');
});

test('native water meshes preserve gate and puddle locations using flat non-overlapping surfaces',()=>{
  const {sluice,puddles,puddleStrength}=createWaterDetails(-30);
  assert.equal(sluice.name,'Sluice water and spray');assert.equal(puddles.name,'Rain puddles');
  assert.equal(sluice.geometry.drawCount,3*2*6,'three gates: one wet sheet and splash quad per gate');
  assert.equal(puddles.geometry.drawCount,PUDDLE_LAYOUT.length*6,'one feathered quad per authored puddle');
  for(const mesh of [sluice,puddles]){
    assert(mesh.material.map);assert.equal(mesh.material.alphaMode,'blend');assert.equal(mesh.material.depthWrite,false);assert.equal(mesh.castShadow,false);
  }
  assert(puddleStrength>=.7&&puddleStrength<=1);assert(puddles.material.roughness>.03);
  const pos=puddles.geometry.getAttribute('position').data,normals=puddles.geometry.getAttribute('normal').data;
  const boxes=[];
  for(let i=0;i<PUDDLE_LAYOUT.length;i++){
    const vertices=Array.from({length:4},(_,j)=>Array.from(pos.slice((i*4+j)*3,(i*4+j+1)*3)));
    assert(vertices.every(v=>v.every(Number.isFinite)&&v[1]>.014&&v[1]<.035));
    for(let j=0;j<4;j++)assert.deepEqual(Array.from(normals.slice((i*4+j)*3,(i*4+j+1)*3)),[0,1,0]);
    const [x,z]=PUDDLE_LAYOUT[i];assert(Math.abs(vertices.reduce((v,a)=>v+a[0]/4,0)-x)<1e-5);assert(Math.abs(vertices.reduce((v,a)=>v+a[2]/4,0)-z)<1e-5);
    boxes.push([Math.min(...vertices.map(v=>v[0])),Math.min(...vertices.map(v=>v[2])),Math.max(...vertices.map(v=>v[0])),Math.max(...vertices.map(v=>v[2]))]);
  }
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert(a[2]<b[0]||b[2]<a[0]||a[3]<b[1]||b[3]<a[1],'puddles never overlap each other');}
});

test('scenery includes one authored sluice mesh and keeps the new rainwater on the native reflection path',()=>{
  const scene=new Scene3D(),{wet}=buildScenery(scene,createSurfaces());
  const sluice=scene.children.filter(node=>node.name==='Sluice water and spray');
  const puddles=scene.children.filter(node=>node.name==='Rain puddles');
  assert.equal(sluice.length,1);assert.equal(puddles.length,1);
  assert(wet.meshes.includes(puddles[0]),'mirror omits puddles from its own reflected scene');
  assert(!wet.meshes.includes(sluice[0]),'the vertical fall remains visible in reflected ground');
  const entry=wet.materials.find(entry=>entry.material===puddles[0].material);
  assert(entry&&entry.strength>=.7);
  assert(puddles[0].material.shader,'existing native rain-normal shader remains enabled');
});
