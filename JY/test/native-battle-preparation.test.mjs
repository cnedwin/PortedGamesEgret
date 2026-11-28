import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareBattleResources } from '../web/jyx2/scene/prepare-battle-resources.mjs';
const mesh = geometry => ({ mesh: { geometry }, material: {} });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return {promise, resolve}; };

test('native preparation uploads distinct real geometry, not program-only stand-in', async () => {
  const a={},b={},standIn={},real=[mesh(a),mesh(a),mesh(b)],programOnly=[mesh(standIn)],signal=new AbortController().signal;
  const seen={};
  const stats=await prepareBattleResources({
    async preparePrograms(requests){seen.requests=requests;},
    async prepareGeometries(geometries,options){seen.geometries=geometries;seen.options=options;},
  },real,programOnly,{signal});
  assert.deepEqual(seen.requests,[...real,...programOnly]);
  assert.deepEqual(seen.geometries,[a,b]);
  assert.deepEqual(seen.options,{budgetMs:4,maxPerSlice:12,signal});
  assert.equal(stats.programOnlyStandIn,true);assert.equal(stats.realGeometries,2);assert.equal(stats.programRequests,4);
  assert.ok(stats.programsReady&&stats.geometryReady&&stats.totalMs>=0);
});

test('geometry cancellation waits for program preparation before owner may dispose the stand-in', async () => {
  const marker=new Error('fixture geometry canceled');const pending=deferred(),signal=AbortSignal.abort(marker);let measured,settled=false;
  const work=prepareBattleResources({
    preparePrograms(){return pending.promise;},
    async prepareGeometries(_geometry,options){assert.equal(options.signal,signal);throw marker;},
  },[mesh({})],[mesh({})],{signal,onMeasured:stats=>{measured=stats;}});
  const outcome=work.catch(error=>{settled=true;return error;});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);
  pending.resolve();assert.equal(await outcome,marker);
  assert.equal(measured.programsReady,true);assert.equal(measured.geometryReady,false);
  assert.equal(measured.programOnlyStandIn,true);
});
