import assert from 'node:assert/strict';
import test from 'node:test';
import { createScenePreparation, canPrepareRealmGeometry } from '../src/view/scene-preparation.mjs';

const pending=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject};};
const turn=()=>Promise.resolve();

test('scene preparation starts shader and unique geometry jobs together, and caches successful scenes',async()=>{
 const g1={},g2={},scene={},requests=[{mesh:{geometry:g1}},{mesh:{geometry:g1},pass:'shadow'},{mesh:{geometry:g2}}],shader=pending(),upload=pending();
 const calls=[];const renderer={preparePrograms(values,options){calls.push(['shader',values,options]);return shader.promise;},prepareGeometries(values,options){calls.push(['upload',values,options]);return upload.promise;}};
 const preparation=createScenePreparation(renderer,()=>requests);
 const work=preparation.begin(scene,{geometry:true});await turn();await turn();
 assert.deepEqual(calls.map(x=>x[0]),['shader','upload']);assert.equal(calls[0][1],requests);assert.equal(calls[0][2].includeAutoInstancing,true);assert.deepEqual(calls[1][1],[g1,g2]);
 assert.equal(calls[1][2].signal,work.signal);assert.equal(calls[1][2].budgetMs,4);assert.equal(calls[1][2].maxPerSlice,16);
 shader.resolve();upload.resolve();await work.ready;
 assert.equal(preparation.begin(scene,{geometry:true}),null,'already prepared scene never repeats the jobs');
});

test('abandoning work cancels its geometry job, ignores a late rejection and does not admit stale preparation',async()=>{
 const scene={},g={},jobs=[],calls=[];const renderer={preparePrograms(){const job=pending();jobs.push(job);return job.promise;},prepareGeometries(_values,options){calls.push(options.signal);const job=pending();jobs.push(job);return job.promise;}};
 const p=createScenePreparation(renderer,()=>[{mesh:{geometry:g}}]);const old=p.begin(scene,{geometry:true});await turn();await turn();
 assert.equal(p.cancel(),true);assert.equal(old.signal.aborted,true);assert.equal(calls[0].aborted,true);
 const fresh=p.begin(scene,{geometry:true});await turn();await turn();assert.equal(fresh.signal.aborted,false);
 jobs[0].resolve();jobs[1].reject(new DOMException('Aborted','AbortError'));await old.ready;
 assert.equal(fresh.signal.aborted,false,'stale result cannot cancel the next request');jobs[2].resolve();jobs[3].resolve();await fresh.ready;assert.equal(p.begin(scene,{geometry:true}),null);
});

test('legacy renderer stays compatible; requesting geometry later only prepares the missing resource',async()=>{
 const scene={},g={},calls=[];const renderer={preparePrograms(){calls.push('shader');}};const p=createScenePreparation(renderer,()=>[{mesh:{geometry:g}}]);
 await p.begin(scene,{geometry:true}).ready;assert.deepEqual(calls,['shader']);assert.equal(p.begin(scene,{geometry:true}),null);
 renderer.prepareGeometries=()=>calls.push('geometry');await p.begin(scene,{geometry:true}).ready;assert.deepEqual(calls,['shader','geometry']);
});

test('a genuine failure aborts the sibling job, reports the error and can be retried on a later entry',async()=>{
 const scene={},g={},fail=Error('upload failed');let signal,broken=true;const renderer={preparePrograms(){return Promise.resolve();},prepareGeometries(_values,options){signal=options.signal;return broken?Promise.reject(fail):Promise.resolve();}};
 const p=createScenePreparation(renderer,()=>[{mesh:{geometry:g}}]);await assert.rejects(p.begin(scene,{geometry:true}).ready,fail);assert.equal(signal.aborted,true);
 broken=false;await p.begin(scene,{geometry:true}).ready;assert.equal(p.begin(scene,{geometry:true}),null);
});

test('context restoration invalidates both caches and cannot admit a pre-loss completion',async()=>{
 const scene={},other={},g={},calls=[];const oldShader=pending(),oldUpload=pending();let block=false;
 const renderer={preparePrograms(){calls.push('shader');return block?oldShader.promise:Promise.resolve();},prepareGeometries(){calls.push('geometry');return block?oldUpload.promise:Promise.resolve();}};
 const p=createScenePreparation(renderer,()=>[{mesh:{geometry:g}}]);await p.begin(scene,{geometry:true}).ready;block=true;
 const stale=p.begin(other,{geometry:true});await turn();await turn();p.reset();assert.equal(stale.signal.aborted,true);
 oldShader.resolve();oldUpload.resolve();await stale.ready;block=false;
 await p.begin(scene,{geometry:true}).ready;await p.begin(other,{geometry:true}).ready;
 assert.deepEqual(calls,['shader','geometry','shader','geometry','shader','geometry','shader','geometry']);
});

test('only proven high-quality WebGL geometry prewarming is enabled by the realm consumer',()=>{
 const capable={prepareGeometries(){}};
 assert.equal(canPrepareRealmGeometry('high',capable),true);
 assert.equal(canPrepareRealmGeometry('medium',capable),false);
 assert.equal(canPrepareRealmGeometry('low',capable),false);
 assert.equal(canPrepareRealmGeometry('high',{}),false);
});