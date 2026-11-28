import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { test } from 'node:test';
import { findHostedPack } from '../browser/hosted-pack.mjs';

function pendingFetch(t) {
  let observed;
  t.mock.method(globalThis, 'fetch', (_url, options) => {
    observed=options.signal;
    return new Promise((_,reject)=>{
      if(observed.aborted)reject(observed.reason);
      else observed.addEventListener('abort',()=>reject(observed.reason),{once:true});
    });
  });
  return()=>observed;
}

test('manifest request cancels through a retained controller without AbortSignal.any or timeout',async t=>{
  t.mock.method(AbortSignal,'any',()=>{throw new Error('composite signals unavailable');});
  t.mock.method(AbortSignal,'timeout',()=>{throw new Error('static timeouts unavailable');});
  const parent=new AbortController(),observed=pendingFetch(t),reason=Error('cancelled by test');
  const pending=findHostedPack(parent.signal);
  void pending.catch(()=>{});
  // The promise is active before the caller cancels; exactly one native fetch sees a real signal.
  assert.ok(observed() instanceof AbortSignal);
  parent.abort(reason);
  await assert.rejects(pending,error=>error===reason);
  assert.equal(observed().aborted,true);
  assert.equal(getEventListeners(parent.signal,'abort').length,0);
});

test('successful empty manifest clears its timeout and parent abort subscription',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  let observed;
  const parent=new AbortController();
  t.mock.method(globalThis,'fetch',async(_url,options)=>{
    observed=options.signal;
    return {status:200,ok:true,json:async()=>({version:1,enabled:false})};
  });
  assert.equal(await findHostedPack(parent.signal),undefined);
  assert.equal(getEventListeners(parent.signal,'abort').length,0);
  t.mock.timers.tick(8000);
  parent.abort();
  assert.equal(observed.aborted,false);
});

test('manifest deadline explicitly aborts its own fetch and removes parent subscription',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const parent=new AbortController(),observed=pendingFetch(t);
  const pending=findHostedPack(parent.signal);
  const rejected=assert.rejects(pending,error=>error?.name==='TimeoutError');
  t.mock.timers.tick(8000);
  await rejected;
  assert.equal(observed().aborted,true);
  assert.equal(parent.signal.aborted,false);
  assert.equal(getEventListeners(parent.signal,'abort').length,0);
});

test('already cancelled caller cannot start a new manifest fetch',async t=>{
  const parent=new AbortController(),reason=Error('already cancelled');parent.abort(reason);
  let calls=0;t.mock.method(globalThis,'fetch',()=>{calls++;throw Error('unexpected native fetch');});
  await assert.rejects(findHostedPack(parent.signal),error=>error===reason);
  assert.equal(calls,0);
});
