import assert from 'node:assert/strict';
import {test} from 'node:test';
import '../vendor/node-register.mjs';
import {FOOTPRINTS,landAt} from '../src/sim/land.mjs';
import {NODES} from '../src/data/map.mjs';
const {cityIdentity,landmarkLayout,findCityHarbour,outlyingLandmarkPlan}=await import('../src/view3d/city-landmarks.mjs');
const {Scene3D}=await import('@egret/engine/world3d');
const {createPlaces}=await import('../src/view3d/cities.mjs');

test('capitals and major port cities have distinct Han-inspired identities and original landmark sets',()=>{
 const ids=['changan','luoyang','jianye','xiakou','guangling','nanhai','chengdu','xuchang'];
 const identities=ids.map(cityIdentity);assert.equal(new Set(identities.map(i=>i.id)).size,ids.length);assert(identities.every(i=>i.landmarks.length>=1));assert.notEqual(identities[0].roof,identities[1].roof);assert(cityIdentity('jianye').harbour);assert(!cityIdentity('changan').harbour);
 assert(!identities.flatMap(i=>i.landmarks).some(n=>/大明宫|明城墙|现代黄鹤楼|大雁塔/.test(n)));
});
test('regional outlying landmarks follow existing dry route margins or real water without new map nodes',()=>{
 const before=JSON.stringify(NODES);
 for(const id of ['wuwei','dunhuang']){
  const f=FOOTPRINTS[id],beacons=outlyingLandmarkPlan(f);assert(beacons.length>=2,id);
  for(const p of beacons){const g=landAt(p.x,p.z,{});assert(!g.water&&!g.place);assert(Math.hypot(p.x-f.x,p.z-f.z)>15);}
 }
 const water=outlyingLandmarkPlan(FOOTPRINTS.chengdu);assert(water.some(p=>p.kind==='waterworks'));assert.equal(JSON.stringify(NODES),before);
});
test('landmark compounds stay inside immutable city footprints and leave the city anchors unchanged',()=>{
 const before=JSON.stringify(FOOTPRINTS);for(const id of ['changan','luoyang','jianye','xiakou','guangling','nanhai','chengdu','xuchang']){
  const f=FOOTPRINTS[id],layout=landmarkLayout(f);assert(layout.length>0,id);
  for(const p of layout){assert(Math.abs(p.x)+p.w/2<f.halfX-.3,id+' inner x bound');assert(Math.abs(p.z)+p.d/2<f.halfZ-.3,id+' inner z bound');assert(p.w>0&&p.d>0);}
 }assert.equal(JSON.stringify(FOOTPRINTS),before);
});
test('harbour moorings use real water beneath the entire hull; never make a land boat',()=>{
 let count=0;for(const id of ['jianye','xiakou','guangling','nanhai','jingkou','chibi']){
  const f=FOOTPRINTS[id],p=findCityHarbour(f);if(!p)continue;count++;
  assert(Math.hypot(p.x-f.x,p.z-f.z)<76,id+' local harbour');
  for(const[depth,side]of[[-.9,-.625],[-.9,.625],[4.3,-.625],[4.3,.625],[3.39,-2.4],[3.39,2.4],[4.21,-2.4],[4.21,2.4]]){
   const sample=landAt(p.x+p.dx*depth+p.dz*side,p.z+p.dz*depth-p.dx*side,{});
   assert(sample.road>2.2,id+' dock avoids existing bridge and road');
  }
  for(const berth of p.berths)for(const d of[-1.25,0,1.25]){const sample=landAt(berth.x+p.dx*d,berth.z+p.dz*d,{});assert(sample.water,id+' hull water');assert(Number.isFinite(berth.level));}
 }assert(count>=3,'at least three sampled waterfronts can support genuine docks');
 assert.equal(NODES.changan.kind,'city');
});
test('actual landmark geometry remains in three detail batches and a small single proxy with stable LOD anchors',()=>{
 const scene=new Scene3D(),places=createPlaces(scene,{quality:'low',colourOf:()=>0x6b8f72});
 for(const id of ['changan','luoyang','jianye','xiakou','guangling','nanhai','chengdu','wuwei']){
  const f=FOOTPRINTS[id],anchor=[f.x,f.z];for(let i=0;i<8;i++)places.update(f.x,f.z,25,25,true);
  const detail=scene.children.filter(c=>c.userData?.place===id&&c.userData.lod!=='proxy');assert(detail.length>0&&detail.length<=3,id+' merged material batches');
  assert(detail.reduce((sum,m)=>sum+m.geometry.drawCount/3,0)<40000,id+' detail triangle budget');
  places.update(f.x,f.z,25,280,false);const proxy=scene.children.find(c=>c.userData?.place===id&&c.userData.lod==='proxy');assert(proxy.visible);assert(proxy.geometry.drawCount/3<900,id+' proxy triangle budget');assert.equal(proxy.userData.cityIdentity,cityIdentity(id).id);assert.deepEqual([f.x,f.z],anchor);
 }
});
