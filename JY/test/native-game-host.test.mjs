import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { makeGameImports } from '../src/browser-imports.mjs';
const vendor = new URL('../vendor/', import.meta.url);
const manifests = JSON.parse(await readFile(new URL('importmap.json', vendor), 'utf8'));
const imports = makeGameImports(manifests, (folder, target) => new URL(`${folder}/${target}`, vendor).href, name => name);
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(Object.hasOwn(imports, specifier) ? imports[specifier] : specifier, context);
  },
});
const { createGameHost } = await import('../web/game-host.mjs');
hook.deregister();

function simulate(){
  let opts,disposed=0,invalidations=0,id=0,refusedFrames=0,screenWidth=640;
  const idles=[];
  function scope(){
    const abort=new AbortController(),values=[];
    return {state:'open',signal:abort.signal,use(value){values.push(value);return value},dispose(){
      if(this.state==='closed')return;
      this.state='closed';abort.abort(new DOMException('Scope closed','AbortError'));
      for(const value of values.reverse())value.dispose?.();
    }};
  }
  const root=scope(),scopes=[];
  let currentIdle=Promise.resolve();
  const fake={
    scope:root,engine:{createScope(){const made=scope();scopes.push(made);return made}},
    world:{},ui:{},canvas:{},
    get screen(){return {width:screenWidth,height:360,x:0,y:0}},safe:{x:0,y:0,width:640,height:360},
    browser:{stage:{},staticLayers:{},host:{whenIdle(){return currentIdle}},getFrameUsage(){return {refusedFrames}},frame:{width:640,height:360}},
    invalidate(){invalidations++},async dispose(){disposed++;root.dispose()},
  };
  return {fake,scopes,get disposed(){return disposed},get invalidations(){return invalidations},
    start:async options=>{opts=options;await opts.setup(fake);opts.arrange(fake);return fake},
    newIdle(){let resolve,reject;currentIdle=new Promise((a,b)=>{resolve=a;reject=b});return {resolve,reject}},
    async turn(outcome='submitted',{update=true,before=outcome==='submitted'||outcome==='refused',after=true}={}){
      if(update)opts.update(1/60,fake);
      if(before)opts.beforeRender();
      if(outcome==='refused')refusedFrames++;
      if(after)opts.afterFrame();
      opts.onFrameTiming({id:++id,outcome,rafTimestampMs:id*16});
      await Promise.resolve();
    },
    rotate(){screenWidth=400;opts.arrange(fake)},
    fail(error){opts.onError(error)}
  };
}

function inspect(promise){
  let state='pending',value;
  promise.then(v=>{value=v;state='resolved'},e=>{value=e;state='rejected'});
  return {get state(){return state},get value(){return value}};
}

test('accepted receipt never uses retained, refusal or backpressure and still waits for host idle',async()=>{
  const sim=simulate();
  let seen=[];
  const host=await createGameHost({playOptions:{width:640,height:360},setup(h){
    const scene=h.createScene({update(dt){seen.push(['update',dt])},beforeRender(){seen.push(['prepare'])},afterFrame(ctx){seen.push(['draw',ctx.primary.attempted,ctx.primary.refused])}});
    h.activateScene(scene);
  }},{startPlay:sim.start});
  const pending=host.presentFrame();
  const observed=inspect(pending);
  await sim.turn('retained');await sim.turn('backpressure');await sim.turn('refused');
  assert.equal(observed.state,'pending');
  assert.ok(seen.some(v=>v[0]==='draw'&&v[1]===true&&v[2]===true));
  const idle=sim.newIdle();
  await sim.turn('submitted');
  assert.equal(observed.state,'pending');
  idle.resolve();
  const receipt=await pending;
  assert.equal(receipt.outcome,'submitted');
  assert.equal(receipt.sceneId,host.activeScene.id);
  assert.equal(receipt.frameId,4);
  assert.ok(receipt.acceptedRevision>=receipt.requestedRevision);
  assert.equal(host.stats.submitted,1);
  assert.equal(host.stats.refused,1);
  await host.dispose();assert.equal(sim.disposed,1);
});

test('late request inside afterFrame cannot be acknowledged by the earlier capture',async()=>{
  const sim=simulate();let late,requested=false;
  const host=await createGameHost({playOptions:{width:640,height:360},setup(h){
    h.activateScene(h.createScene({afterFrame(ctx){
      if(!requested){requested=true;late=ctx.host.presentFrame()}
    }}));
  }},{startPlay:sim.start});
  const early=host.presentFrame();
  await sim.turn('submitted');
  await early;
  const watch=inspect(late);
  await Promise.resolve();
  assert.equal(watch.state,'pending');
  await sim.turn('submitted');
  const receipt=await late;
  assert.equal(receipt.frameId,2);
  await host.dispose();
});

test('active epoch protects old waiters while borrowed inactive scene may be restored',async()=>{
  const sim=simulate(),calls=[];
  let a,b;
  const host=await createGameHost({playOptions:{width:640,height:360},setup(h){
    a=h.createScene({name:'first',update(){calls.push('a tick')},onActivate(){calls.push('a enter')},onDeactivate(){calls.push('a exit')},dispose(){calls.push('a dispose')}});
    b=h.createScene({name:'second',update(){calls.push('b tick')},onActivate(){calls.push('b enter')},onDeactivate(){calls.push('b exit')},dispose(){calls.push('b dispose')}});
    h.activateScene(a);
  }},{startPlay:sim.start});
  const old=host.presentFrame();const rejected=assert.rejects(old,{name:'AbortError'});
  const idle=sim.newIdle();await sim.turn('submitted');
  host.activateScene(b,{retirePrevious:false});
  await rejected;assert.equal(a.disposed,false);assert.equal(a.active,false);assert.equal(b.active,true);
  const current=host.presentFrame();const observed=inspect(current);
  idle.resolve();await Promise.resolve();assert.equal(observed.state,'pending');
  await sim.turn('submitted');assert.equal((await current).sceneId,b.id);
  host.activateScene(a,{retirePrevious:true});
  assert.equal(b.disposed,true);assert.equal(a.disposed,false);assert.equal(a.active,true);
  await sim.turn('submitted');
  assert.deepEqual(calls.slice(0,8),['a enter','a tick','a exit','b enter','b tick','b exit','b dispose','a enter']);
  assert.equal(b.scope.signal.aborted,true);
  await host.dispose();await host.dispose();
  assert.equal(a.disposed,true);assert.equal(a.scope.signal.aborted,true);assert.equal(sim.disposed,1);
  assert.equal(calls.filter(x=>x==='a dispose').length,1);
  assert.equal(calls.filter(x=>x==='b dispose').length,1);
});

test('screen listeners, callback ownership, and explicit abort are isolated',async()=>{
  const sim=simulate();let a,b,screens=[],other=[];
  const host=await createGameHost({playOptions:{width:640,height:360},setup(h){
    a=h.createScene({onScreenChange(ctx){screens.push(['a',ctx.host.screen.width])},update(dt,ctx){if(ctx.scene===a)ctx.host.activateScene(b,{retirePrevious:false})}});
    b=h.createScene({onScreenChange(ctx){screens.push(['b',ctx.host.screen.width])},afterFrame(){other.push('b draw')}});
    h.activateScene(a);
  }},{startPlay:sim.start});
  const abort=new AbortController();
  const seen=[];
  host.onScreenChange(screen=>seen.push(screen.width),{signal:abort.signal});
  await sim.turn('submitted');
  assert.equal(host.activeScene,b);
  assert.deepEqual(other,['b draw']);
  sim.rotate();
  assert.ok(screens.some(x=>x[0]==='b'&&x[1]===400));
  assert.deepEqual(seen,[400]);
  abort.abort();sim.rotate();assert.deepEqual(seen,[400]);
  const owner=new AbortController();
  const pending=host.presentFrame({signal:owner.signal});
  const rejected=assert.rejects(pending,{name:'AbortError'});
  owner.abort();await rejected;
  await host.dispose();
});

test('setup barrier refuses to wait before the clock exists and failure retires owned scenes',async()=>{
  const sim=simulate();let scene,hostDuring;
  const fault=new Error('setup failed');let disposed=0;
  await assert.rejects(createGameHost({playOptions:{width:1,height:1},async setup(h){
    hostDuring=h;
    scene=h.createScene({dispose(){disposed++}});h.activateScene(scene);
    await assert.rejects(h.presentFrame(),/not running/);
    throw fault;
  }},{startPlay:sim.start}), fault);
  assert.equal(scene.disposed,true);assert.equal(disposed,1);
  assert.equal(hostDuring.state,'closed');
});

test('error and disposal reject pending barriers without resolving stale generations',async()=>{
  const sim=simulate();const host=await createGameHost({playOptions:{width:1,height:1}},{startPlay:sim.start});
  const err=new Error('draw failed');
  const pending=host.presentFrame();const rejection=assert.rejects(pending,err);
  sim.fail(err);await rejection;
  assert.equal(host.state,'failed');
  await assert.rejects(host.presentFrame(),/not running/);
  await host.dispose();
  assert.equal(host.state,'closed');
});

test('host cannot accept lifecycle swaps during the presentation callback',async()=>{
  const sim=simulate();let b;
  const host=await createGameHost({playOptions:{width:1,height:1},setup(h){
    b=h.createScene({});
    h.activateScene(h.createScene({beforeRender(ctx){assert.throws(()=>ctx.host.activateScene(b),/during presentation/)}}));
  }},{startPlay:sim.start});
  await sim.turn('submitted');
  assert.notEqual(host.activeScene,b);
  await host.dispose();
});


test('external Play close and external scene scope abort retire callbacks once, then host disposal is idempotent',async()=>{
  const sim=simulate();let a,b,retired=[];
  const host=await createGameHost({playOptions:{width:1,height:1},setup(h){
    a=h.createScene({dispose(){retired.push('a')}});
    b=h.createScene({dispose(){retired.push('b')}});
    h.activateScene(a);
  }},{startPlay:sim.start});
  const frame=host.presentFrame(),rejected=assert.rejects(frame,{name:'AbortError'});
  a.scope.dispose();await rejected;assert.equal(a.disposed,true);assert.equal(host.activeScene,undefined);
  host.activateScene(b);
  const second=host.presentFrame(),closed=assert.rejects(second,{name:'AbortError'});
  await sim.fake.dispose();await closed;assert.equal(host.state,'closed');assert.equal(b.disposed,true);
  await host.dispose();
  assert.equal(sim.disposed,1,'underlying Play was already closed');
  assert.deepEqual(retired,['a','b']);
});


test('a delayed operation from an inactive scene cannot request or acknowledge another scene frame',async()=>{
  const sim=simulate();let a,b,aContext;
  const host=await createGameHost({playOptions:{width:1,height:1},setup(h){
    a=h.createScene({onActivate(ctx){aContext=ctx}});b=h.createScene({});h.activateScene(a);
  }},{startPlay:sim.start});
  host.activateScene(b,{retirePrevious:false});
  await assert.rejects(host.presentFrame({scene:a}),{name:'AbortError'});
  await assert.rejects(aContext.presentFrame(),{name:'AbortError'});
  assert.throws(()=>aContext.invalidate(),{name:'AbortError'});
  const now=host.presentFrame({scene:b});
  await sim.turn('submitted');assert.equal((await now).sceneId,b.id);
  host.activateScene(a,{retirePrevious:false});
  const restored=aContext.presentFrame();await sim.turn('submitted');assert.equal((await restored).sceneId,a.id);
  await host.dispose();
});


test('activation signal cancels async work across suspend and reactivation, even when the scene scope is retained',async()=>{
  const sim=simulate();let a,b,ctx;
  const host=await createGameHost({playOptions:{width:1,height:1},setup(h){
    a=h.createScene({onActivate(value){ctx=value}});b=h.createScene({});h.activateScene(a);
  }},{startPlay:sim.start});
  const old=ctx.activationSignal;
  assert.equal(old.aborted,false);
  host.activateScene(b,{retirePrevious:false});assert.equal(old.aborted,true);assert.equal(a.scope.signal.aborted,false);
  host.activateScene(a,{retirePrevious:false});const current=ctx.activationSignal;
  assert.notEqual(current,old);assert.equal(current.aborted,false);
  await assert.rejects(ctx.presentFrame({signal:old}),{name:'AbortError'});
  const pending=ctx.presentFrame({signal:current});await sim.turn('submitted');await pending;
  await host.dispose();assert.equal(current.aborted,true);
});
