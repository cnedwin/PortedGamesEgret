import test from 'node:test';import assert from 'node:assert/strict';
await import('../vendor/node-register.mjs');
import {createGeometryPrimer} from '../src/view3d/geometry-primer.mjs';
const {createPlaces}=await import('../src/view3d/cities.mjs');
const {Scene3D}=await import('@egret/engine/world3d');
import {FOOTPRINTS} from '../src/sim/land.mjs';

test('one native upload job at a time, identity deduplication and ordinary-draw fallback',async()=>{
  const requests=[],events=[];
  const renderer={prepareGeometries(list,options){return new Promise((resolve,reject)=>requests.push({list,options,resolve,reject}));}};
  const primer=createGeometryPrimer(renderer,{maxQueued:2,onFailure:()=>events.push('failure')});const a={},b={},c={};
  primer.enqueue([a,a,b],()=>events.push('first'));primer.enqueue([c],()=>events.push('second'));
  assert.equal(requests.length,1);assert.deepEqual(requests[0].list,[a,b]);assert.equal(requests[0].options.budgetMs,4);
  requests[0].resolve();await new Promise(resolve=>setImmediate(resolve));assert.equal(requests.length,2);assert.deepEqual(events,['first']);
  requests[1].reject(Error('recoverable prepare failure'));await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(events,['first','failure','second']);assert.equal(primer.pending,0);primer.dispose();
});

test('disposal aborts active native preparation and queued callbacks cannot publish',async()=>{
  const requests=[],events=[];const renderer={prepareGeometries(list,options){return new Promise(resolve=>requests.push({options,resolve}));}};
  const p=createGeometryPrimer(renderer);p.enqueue([{}],()=>events.push('late'));p.enqueue([{}],()=>events.push('queued'));
  p.dispose();assert.ok(requests[0].options.signal.aborted);requests[0].resolve();await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(events,[]);assert.equal(requests.length,1);assert.equal(p.pending,0);
});

test('unsupported renderer preserves immediate visible detail without a fake preload',()=>{
  let ready=false;const p=createGeometryPrimer({});p.enqueue([{}],()=>{ready=true;});assert.ok(ready);assert.equal(p.pending,0);
});

test('bounded queued work admits normal rendering when saturated',()=>{
  const renderer={prepareGeometries(){return new Promise(()=>{});}};const p=createGeometryPrimer(renderer,{maxQueued:1});
  let fallback=false;p.enqueue([{}],()=>{});p.enqueue([{}],()=>{});assert.equal(p.pending,2);
  assert.equal(p.enqueue([{}],()=>{fallback=true;}),false);assert.ok(fallback);p.dispose();
});

test('native city geometry keeps the original proxy until preparation is admitted',async()=>{
  const scene=new Scene3D(),jobs=[],renderer={prepareGeometries(list,options){return new Promise(resolve=>jobs.push({list,options,resolve}));}};
  const places=createPlaces(scene,{quality:'low',colourOf:()=>0x6b8f72,renderer});
  const anchor=Object.values(FOOTPRINTS).find(f=>f.kind==='city');
  try{
    places.update(anchor.x,anchor.z,50,52);
    assert.equal(jobs.length,1);assert.ok(places.meshes.get(anchor.id)?.length);assert.ok(places.meshes.get(anchor.id).every(m=>!m.visible));
    assert.ok(places.stats.proxy>0);assert.ok(jobs[0].list.every(g=>g&&g.drawCount>0));
    jobs[0].resolve();await new Promise(resolve=>setImmediate(resolve));places.update(anchor.x,anchor.z,50,52);
    assert.ok(places.meshes.get(anchor.id).every(m=>m.visible));assert.ok(places.stats.detailed>0);
  }finally{places.dispose();}
  assert.ok(jobs.slice(1).every(j=>j.options.signal.aborted));
});
