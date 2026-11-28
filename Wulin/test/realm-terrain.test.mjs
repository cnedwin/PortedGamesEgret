import '../vendor/node-register.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const {createCutDistance,buildRealmTerrain,prepareRealmTerrain,createRealm,createRealmAsync}=await import('../src/view/realm.mjs');

function reference(path,u,v){let best=Infinity;for(let i=0;i<path.length-1;i++){const [ax,ay]=path[i],[bx,by]=path[i+1],dx=bx-ax,dy=by-ay;const t=Math.max(0,Math.min(1,((u-ax)*dx+(v-ay)*dy)/(dx*dx+dy*dy)));best=Math.min(best,Math.hypot(u-ax-dx*t,v-ay-dy*t));}return best;}

test('river cutting keeps the actual distance of all points within the cut radius',()=>{
  const path=[[0,0],[8,2],[7,10],[22,11],[30,10]],radius=3.0,cut=createCutDistance(path,radius);
  for(let v=-6;v<18;v+=.25)for(let u=-6;u<38;u+=.25){const expected=reference(path,u,v);assert.equal(cut(u,v),expected<radius?expected:Infinity);}
});

test('the frame-sliced low-quality terrain is byte-equivalent to its synchronous assembly',async()=>{
  let slices=0,time=0;
  const staged=await prepareRealmTerrain('low',{clock:()=>++time,schedule:async()=>{slices++;},budgetMs:5});
  const sync=buildRealmTerrain('low');
  assert.ok(slices>10);
  for(const key of ['heights','positions','normals','indices','base','first','second','firstDistance','secondDistance']) assert.deepEqual(staged[key],sync[key],key);
});

test('leaving or replacing the world cancels the pure terrain preparation before scene construction',async()=>{
  let slices=0,time=0;
  const terrain=await prepareRealmTerrain('high',{isCurrent:()=>slices<3,clock:()=>++time,schedule:async()=>{ slices++; },budgetMs:5});
  assert.equal(terrain,null);assert.equal(slices,3);
});
test('async realm construction keeps the same complete scene and never enters abandoned scenes',async()=>{
  const {createWorld}=await import('../src/core/world.mjs');
  const world=createWorld({seed:7,playerSect:'shaolin'}),stage={quality:'low',orbit:{yaw:0,set(){},apply(){},project:()=>null},markers(){assert.fail('a scene is not entered during preparation');}};
  const sync=createRealm(stage,()=>world);let clock=0,slices=0;
  const result=await createRealmAsync(stage,()=>world,{clock:()=>++clock,schedule:async()=>{slices++;},budgetMs:5});
  const inventory=realm=>{const out=[];realm.scene.traverse(node=>out.push([node.constructor.name,node.geometry?.vertexCount,node.geometry?.index?.data.length,node.count]));return out;};
  assert.deepEqual(inventory(result),inventory(sync));assert.ok(slices>20);
  let cancelled=0;clock=0;
  assert.equal(await createRealmAsync(stage,()=>world,{terrain:buildRealmTerrain('low'),clock:()=>++clock,schedule:async()=>{cancelled++;},budgetMs:1,isCurrent:()=>cancelled<3}),null);
});
