import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Worker as NodeWorker} from 'node:worker_threads';
await import('../vendor/node-register.mjs');
const {Scene3D}=await import('@egret/engine/world3d');
import {sampleTerrainTile,COLUMNS,TILE} from '../src/view3d/terrain-sampling.mjs';
import {createTerrainSampler} from '../src/view3d/terrain-sampler.mjs';
const {createLand,groundColour}=await import('../src/view3d/terrain.mjs');
import {landAt} from '../src/sim/land.mjs';

function originalSamples(tx,tz){
 const n=COLUMNS*COLUMNS,heights=new Float32Array(n),tint=new Float32Array(n*4),sample={},colour=[0,0,0];
 for(let r=0;r<COLUMNS;r++)for(let c=0;c<COLUMNS;c++){
  const i=r*COLUMNS+c,x=tx*TILE+c,z=tz*TILE+r;landAt(x,z,sample);heights[i]=sample.height;
  groundColour(sample,0,x,z,colour);for(let k=0;k<3;k++)tint[i*3+k]=colour[k];
  tint[n*3+i]=Math.min(1,sample.mountain/4+sample.plateau)*(1-Math.min(1,Math.max(0,(sample.height-24)/6))*.3);
 }
 return{heights,tint};
}
test('terrain sampler retains the deterministic land/colour equations and tile seams',()=>{
 for(const [tx,tz] of [[20,15],[5,7],[33,31],[34,31]])assert.deepEqual(sampleTerrainTile(tx,tz),originalSamples(tx,tz));
 const a=sampleTerrainTile(33,31),b=sampleTerrainTile(34,31);
 for(let r=0;r<COLUMNS;r++)assert.equal(a.heights[r*COLUMNS+COLUMNS-1],b.heights[r*COLUMNS]);
});
test('worker failure uses deterministic fallback and all pending requests settle',async()=>{
 class FakeWorker{listeners={};addEventListener(k,fn){this.listeners[k]=fn;}postMessage({id,tx,tz}){queueMicrotask(()=>this.listeners.message({data:{id,...sampleTerrainTile(tx,tz)}}));}terminate(){}}
 const pool=createTerrainSampler({WorkerClass:FakeWorker});
 try{assert(pool.usingWorker);const [a,b]=await Promise.all([pool.request(20,15),pool.request(21,15)]);assert.deepEqual(a,originalSamples(20,15));assert.deepEqual(b,originalSamples(21,15));}finally{pool.dispose();}
 class Failing extends FakeWorker{postMessage(){throw Error('worker unavailable');}}
 let fallback=0;const failed=createTerrainSampler({WorkerClass:Failing,onFallback:()=>fallback++});
 try{assert.deepEqual(await failed.request(20,15),originalSamples(20,15));assert.equal(fallback,1);assert(!failed.usingWorker);}finally{failed.dispose();}
});
test('actual browser module transfers the exact arrays through a real Node worker',async()=>{
 class NodeBridge{
  constructor(url){this.worker=new NodeWorker(new URL('./fixtures/terrain-worker-node-shim.mjs',import.meta.url),{workerData:{url:String(url)}});}
  addEventListener(type,fn){this.worker.on(type,value=>fn(type==='message'?{data:value}:value));}
  postMessage(data){this.worker.postMessage(data);}
  terminate(){void this.worker.terminate();}
 }
 const pool=createTerrainSampler({WorkerClass:NodeBridge});
 try{assert.ok(pool.usingWorker);const [a,b]=await Promise.all([pool.request(20,15),pool.request(21,15)]);assert.deepEqual(a,originalSamples(20,15));assert.deepEqual(b,originalSamples(21,15));assert.ok(pool.usingWorker);}finally{pool.dispose();}
});
class HeldWorker{
 static last;listeners={};messages=[];terminated=false;
 constructor(){HeldWorker.last=this;}
 addEventListener(k,fn){this.listeners[k]=fn;}
 postMessage(msg){this.messages.push(msg);}
 reply(){const msg=this.messages.shift();assert.ok(msg);this.listeners.message({data:{id:msg.id,...sampleTerrainTile(msg.tx,msg.tz)}});return msg;}
 terminate(){this.terminated=true;}
}
test('native TerrainStream async publication, deterministic height and owned cancellation',async()=>{
 const scene=new Scene3D(),events=[],land=createLand(scene,{quality:'low',samplerOptions:{WorkerClass:HeldWorker},onTile:(tile,show)=>events.push([tile.x,tile.z,show])});
 const x=20*TILE+32,z=15*TILE+32;
 try{land.update(x,z,36);const w=HeldWorker.last;assert.ok(w&&!w.terminated);assert.equal(land.stream.tiles.length,0);assert.ok(land.stream.pendingCount>0);
  const msg=w.reply();await new Promise(r=>setImmediate(r));const tile=land.stream.tileAt(msg.tx*TILE+1,msg.tz*TILE+1);assert.ok(tile);assert.equal(events[0][2],true);
  assert.equal(tile.field.heightAt(-TILE/2,-TILE/2),sampleTerrainTile(msg.tx,msg.tz).heights[0]);
 }finally{land.dispose();}
 await new Promise(r=>setImmediate(r));assert.ok(HeldWorker.last.terminated);assert.equal(land.stream.pendingCount,0);assert.equal(land.stream.tiles.length,0);assert.equal(events.at(-1)[2],false);assert(!scene.children.includes(land.stream));
});
test('worker and synchronous native terrain geometry publish identical mesh attributes',async()=>{
 const sync=createLand(new Scene3D(),{quality:'low',samplerOptions:{WorkerClass:null}}),asyncLand=createLand(new Scene3D(),{quality:'low',samplerOptions:{WorkerClass:HeldWorker}});
 const x=20*TILE+32,z=15*TILE+32;
 try{
  sync.update(x,z,36);asyncLand.update(x,z,36);assert.ok(sync.stream.tiles.length>0);assert.equal(sync.stream.pendingCount,0);
  const worker=HeldWorker.last;while(worker.messages.length){worker.reply();await new Promise(r=>setImmediate(r));}
  for(const a of sync.stream.tiles){
   const b=asyncLand.stream.tileAt(a.x*TILE+1,a.z*TILE+1);assert.ok(b);assert.equal(a.terrain.children.length,b.terrain.children.length);
   for(let i=0;i<a.terrain.children.length;i++){
    const ga=a.terrain.children[i].geometry,gb=b.terrain.children[i].geometry;assert.equal(ga.drawCount,gb.drawCount);
    for(const key of ['position','normal','uv','color'])assert.deepEqual(ga.getAttribute(key).data,gb.getAttribute(key).data);
   }
  }
 }finally{sync.dispose();asyncLand.dispose();}
});
test('the default native ground shader retains the original key and same material source across quality settings',()=>{
 const base=createLand(new Scene3D(),{quality:'low',samplerOptions:{WorkerClass:null}}),
 medium=createLand(new Scene3D(),{quality:'medium',samplerOptions:{WorkerClass:null}});
 try{assert.equal(base.material.shader.key,'nine-ground-domains');assert.equal(medium.material.shader.glsl,base.material.shader.glsl);}
 finally{base.dispose();medium.dispose();}
});

test('only requests outside the documented native tile retention are retired; late worker response does not poison the queue',async()=>{
 const pool=createTerrainSampler({WorkerClass:HeldWorker});try{
 const oldA=pool.request(1,1),oldB=pool.request(2,1),near=pool.request(20,15),retained=pool.request(21,15);
 const cancelled=pool.retain(20*TILE+32,15*TILE+32,36);
 assert.equal(cancelled,2);assert.equal(await oldA,undefined);assert.equal(await oldB,undefined);
 const w=HeldWorker.last;assert.equal(w.reply().tx,1);assert.equal(w.reply().tx,20);assert.deepEqual(await near,sampleTerrainTile(20,15));
 assert.equal(w.reply().tx,21);assert.deepEqual(await retained,sampleTerrainTile(21,15));assert(pool.usingWorker);assert.equal(pool.cancelled,2);
 }finally{pool.dispose();}
});
test('native TerrainStream rapid jump settles retired jobs before new nearest requests and never publishes old geometry',async()=>{
 const scene=new Scene3D(),land=createLand(scene,{quality:'low',samplerOptions:{WorkerClass:HeldWorker}});
 try{
  const x=1*TILE+32,z=1*TILE+32,targetX=20*TILE+32,targetZ=15*TILE+32;
  for(let i=0;i<16;i++)land.update(x,z,180);assert.equal(land.stream.pendingCount,32);
  land.update(targetX,targetZ,180);await new Promise(r=>setImmediate(r));assert.equal(land.stream.pendingCount,0);
  land.update(targetX,targetZ,180);assert(land.stream.pendingCount>0);const w=HeldWorker.last;
  assert.equal(w.reply().tx,1);await new Promise(r=>setImmediate(r));assert.equal(land.stream.tiles.length,0);
  const msg=w.reply();await new Promise(r=>setImmediate(r));assert.equal(msg.tx,20);assert(land.stream.tileAt(targetX,targetZ));assert.equal(land.stream.tileAt(x,z),undefined);
 }finally{land.dispose();}
});
