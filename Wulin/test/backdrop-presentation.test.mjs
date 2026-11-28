import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackdropPresentation} from '../src/ui/backdrop-presentation.mjs';

function fixture(){
  const jobs=new Map(),callbacks=new Map();let serial=0,active=true,redraws=0,releases=0;
  const presenter=createBackdropPresentation({
    load:url=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});jobs.set(url,{resolve,reject});return promise;},
    invalidate:()=>redraws++,active:()=>active,
    schedule:(fn,ms)=>{assert.equal(ms,250);const id=++serial;callbacks.set(id,fn);return id;},cancel:id=>callbacks.delete(id)
  });
  async function complete(url){jobs.get(url).resolve({release:()=>releases++});await Promise.resolve();await Promise.resolve();}
  async function fail(url){jobs.get(url).reject(Error('unavailable'));await Promise.resolve();await Promise.resolve();}
  function fire(){for(const [id,fn] of [...callbacks]){callbacks.delete(id);fn();}}
  return {presenter,jobs,callbacks,complete,fail,fire,stop:()=>active=false,get redraws(){return redraws;},get releases(){return releases;}};
}
test('one bounded repaint follows slow backdrop readiness, not mount time or repeated refresh',async()=>{
  const f=fixture();f.presenter.request('scene-a');f.presenter.request('scene-a');await Promise.resolve();
  assert.equal(f.jobs.size,1);assert.equal(f.callbacks.size,0);
  await f.complete('scene-a');assert.equal(f.releases,1);assert.equal(f.callbacks.size,1);
  f.fire();assert.equal(f.redraws,1);f.fire();assert.equal(f.redraws,1);
  f.presenter.request('scene-a');await Promise.resolve();assert.equal(f.callbacks.size,0);
});
test('changed or closed pages release late leases without presenting stale content',async()=>{
  const f=fixture();f.presenter.request('scene-a');await Promise.resolve();f.presenter.request('scene-b');await Promise.resolve();
  await f.complete('scene-a');assert.equal(f.callbacks.size,0);
  await f.complete('scene-b');assert.equal(f.callbacks.size,1);f.presenter.dispose();assert.equal(f.callbacks.size,0);f.fire();assert.equal(f.redraws,0);assert.equal(f.releases,2);
  f.presenter.request('scene-c');await Promise.resolve();f.stop();await f.complete('scene-c');assert.equal(f.callbacks.size,0);assert.equal(f.releases,3);
});
test('a failed texture is not a repaint loop or a second exception path',async()=>{
  const f=fixture();f.presenter.request('missing');await Promise.resolve();await f.fail('missing');f.fire();assert.equal(f.redraws,0);assert.equal(f.callbacks.size,0);
});
