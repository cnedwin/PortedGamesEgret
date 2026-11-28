import assert from 'node:assert/strict';
import {test} from 'node:test';
import {register} from 'node:module';
register('../tools/egret-resolve.mjs', import.meta.url);
const {createInputPort,createInput}=await import('../src/input.mjs');

function fixture(device='keyboard'){
 const down=new Set(),pressed=new Set();let axis={x:0,y:0},look={x:0,y:0},current=device;
 const actions={pause:0,bag:0,touch:0,mouse:0};const play={get device(){return current},keys:{down:(...k)=>k.some(v=>down.has(v)),pressed:(...k)=>k.some(v=>pressed.has(v)),axis:()=>axis,look:()=>look},pointer:{locked:false,buttons:0,pressedButtons:0,releasedButtons:0,dx:0,dy:0,wheel:0}};
 const input=createInputPort(play,{onPause(){actions.pause++},onBag(){actions.bag++},onTouch(){actions.touch++},onMouse(){actions.mouse++}});
 return {play,input,down,pressed,actions,step(dt){const record={...input.sample(dt)};input.endFrame?.();return record;},axis(x,y){axis={x,y}},look(x,y){look={x,y}},device(x){current=x}};
}
const begin=f=>{f.input.setEnabled(true);f.step();};
test('engine axes and held aliases map to original movement, while interaction is held',()=>{const f=fixture();begin(f);f.axis(.6,-.8);f.down.add('KeyF');const a=f.step();assert.equal(a.moveX,.6);assert.equal(a.moveZ,.8);assert.equal(a.interact,true);f.down.clear();assert.equal(f.step().interact,false)});
test('engine key edges trigger one sample; held interaction is not a tap',()=>{const f=fixture();begin(f);for(const k of ['KeyR','KeyQ','KeyG','Space','KeyF'])f.pressed.add(k);const a={...f.step()};assert(a.reload&&a.heal&&a.grenade&&a.jump&&!a.interact);f.pressed.clear();assert.equal(f.step().reload,false)});
test('native mouse snapshot retains simultaneous buttons and independent release',()=>{const f=fixture();begin(f);const p=f.play.pointer;p.locked=true;p.buttons=3;p.pressedButtons=3;p.dx=10;p.dy=3;const a=f.step();assert(a.fire&&a.firePressed&&a.aim);assert(Math.abs(a.lookYaw+10*.0022*.62)<1e-12);p.buttons=2;p.pressedButtons=0;const b=f.step();assert(!b.fire&&b.aim);p.buttons=0;assert(!f.step().aim)});
test('touch action contact cancel discards unsampled press but not independent contact',()=>{const f=fixture('touch');begin(f);f.input.hold('fire',1,true);f.input.hold('reload',2,true);f.input.hold('fire',1,false,true);const a=f.step();assert(!a.fire&&!a.firePressed&&a.reload);f.input.hold('reload',2,false);assert(!f.step().reload)});
test('touch held owners and analog motion remain independent',()=>{const f=fixture('touch');begin(f);f.axis(0,-1);assert(f.step().sprint);f.input.hold('fire',1,true);f.input.hold('fire',2,true);assert(f.step().firePressed);assert(!f.step().sprint);f.input.hold('fire',1,false);assert(f.step().fire);f.input.hold('fire',2,false,true);assert(!f.step().fire&&f.step().sprint)});
test('touch look applies the original input scale and toggle, pause clears everything',()=>{const f=fixture('touch');begin(f);f.input.touchLook(20,0);const a=f.step().lookYaw;f.input.toggle('aim');f.input.touchLook(20,0);assert(Math.abs(f.step().lookYaw/a-.62)<1e-9);f.input.hold('interact',1,true);f.input.setEnabled(false);const b=f.step();assert(!b.interact&&!b.aim&&!b.fire&&b.moveX===0);f.input.setEnabled(true);assert(!f.step().aim)});
test('selection, wheel and bag are edges; disabled ignores changes',()=>{const f=fixture();begin(f);f.input.selectWeapon('marksman');assert.equal(f.step().weapon,'marksman');assert.equal(f.step().weapon,'');f.play.pointer.wheel=1;assert.equal(f.step().weapon,'next');f.play.pointer.wheel=0;f.pressed.add('Tab');f.step();assert.equal(f.actions.bag,1);f.pressed.clear();f.input.setEnabled(false);f.input.selectWeapon('pistol');assert.equal(f.step().weapon,'')});
test('gamepad uses native axes, look and buttons',()=>{const f=fixture('gamepad');begin(f);f.axis(.4,-.3);f.look(.5,0);f.down.add('pad:l2');f.down.add('pad:r2');const r=f.step(.016);assert(r.aim&&r.fire&&r.moveZ===.3&&r.lookYaw<0)});
test('device handoff cancels held state without replaying it',()=>{const f=fixture();begin(f);f.play.pointer.buttons=1;f.play.pointer.pressedButtons=1;f.device('touch');f.step();assert.equal(f.actions.touch,1);assert(!f.step().fire);f.device('mouse');f.step();assert.equal(f.actions.mouse,1)});
 test('resume ignores held gameplay keys and pad triggers until release, without masking fresh input',()=>{
   const f=fixture();begin(f);for(const k of ['KeyR','KeyF','pad:r2','KeyC'])f.down.add(k);
   f.input.setEnabled(false);f.pressed.add('KeyQ');f.input.setEnabled(true);
   let r={...f.step()};assert(!r.reload&&!r.interact&&!r.fire&&!r.crouch&&!r.heal);
   f.pressed.clear();f.pressed.add('Space');r={...f.step()};assert(r.jump&&!r.reload&&!r.fire);
   f.down.clear();f.pressed.clear();f.step();for(const k of ['KeyR','KeyF','pad:r2','KeyC'])f.down.add(k);
   r={...f.step()};assert(r.reload&&r.interact&&r.fire&&r.crouch);
 });
// Browser host test doubles expose only the formal Play input contract. No DOM
// capture or mouse/keydown transport is supplied by the game under test.
function nativeFixture(device='keyboard'){
 const f=fixture(device),play=f.play,pointer=play.pointer,claims=[],requests=[],owners=[];
 let pending,observer,unclaimed=0,removed=0,unlocks=0;
 const target=()=>{const listeners=new Map();return{listeners,hidden:false,addEventListener(name,fn){listeners.set(name,fn);},removeEventListener(name,fn){if(listeners.get(name)===fn)listeners.delete(name);},fire(name){listeners.get(name)?.();}};};
 const page=target(),win=target();
 play.keys.claim=(name,when)=>{const claim={name,when};claims.push(claim);return()=>{unclaimed++;};};
 pointer.lockPending=false;
 pointer.lock=options=>{requests.push(options);pointer.lockPending=true;return new Promise(resolve=>{pending=resolve;});};
 pointer.unlock=()=>{unlocks++;pointer.locked=false;pointer.lockPending=false;if(pending){const resolve=pending;pending=undefined;resolve({status:'canceled'});}};
 play.browser={pointer:{observe(fn){observer=fn;return()=>{removed++;observer=undefined;};}},frame:{width:100,height:100}};
 play.safe={x:0,y:0,width:100,height:100};play.fromStage=(x,y)=>({x,y});play.canvas={getBoundingClientRect(){return{width:100,height:100};}};
 play.scope={use(owner){owners.push(owner);return owner;}};
 const actions={pause:[],bag:0,touch:0,mouse:0};
 const input=createInput(play,{document:page,window:win,onPause:reason=>actions.pause.push(reason),onBag:()=>actions.bag++,onTouch:()=>actions.touch++,onMouse:()=>actions.mouse++});
 return {play,input,claims,requests,actions,page,win,
  finish(status,actual=status==='locked'){pointer.lockPending=false;pointer.locked=actual;const resolve=pending;pending=undefined;resolve({status});},
  dispose(){for(const owner of owners.reverse())owner.dispose();},
  get unclaimed(){return unclaimed;},get removed(){return removed;},get unlocks(){return unlocks;},get observer(){return observer;}};
}
test('native pointer result distinguishes denial and explicit raw acquisition without retry',async()=>{
 const f=nativeFixture(),ordinary=f.input.capture();
 assert.equal(f.requests.length,1,'request is made synchronously inside caller gesture');
 assert.equal(f.requests[0].unadjustedMovement,undefined);
 assert.equal(f.input.capturePending,true);
 f.finish('denied',false);assert.equal(await ordinary,false);assert.equal(f.input.lastLockResult.status,'denied');
 assert.equal(f.requests.length,1,'do not silently retry a different browser policy');
 const raw=f.input.capture(true);assert.equal(f.requests.length,2);assert.equal(f.requests[1].unadjustedMovement,true);
 f.finish('locked');assert.equal(await raw,true);assert.equal(f.input.lastLockResult.status,'locked');
 assert.equal(f.input.locked,true);assert.equal(f.input.capturePending,false);f.dispose();
});
test('native pending cancellation never opens a stale gameplay session',async()=>{
 const f=nativeFixture(),pending=f.input.capture();f.input.release();
 assert.equal(await pending,false);assert.equal(f.input.lastLockResult.status,'canceled');
 assert.equal(f.input.capturePending,false);assert.equal(f.requests.length,1);
 const next=f.input.capture();f.finish('locked',false);assert.equal(await next,false,'native result must still own actual pointer lock');f.dispose();
});
test('actual native lock loss stops gameplay before returning a record and pauses exactly once',async()=>{
 const f=nativeFixture(),pending=f.input.capture();f.finish('locked');assert(await pending);
 f.input.setEnabled(true);f.input.sample();f.input.endFrame();
 f.play.pointer.buttons=1;f.play.pointer.pressedButtons=1;assert(f.input.sample().fire);f.input.endFrame();
 f.play.pointer.locked=false;f.play.pointer.buttons=0;f.play.pointer.pressedButtons=0;
 const idle={...f.input.sample()};assert(!idle.fire&&!idle.firePressed&&!idle.aim&&idle.moveX===0&&idle.moveZ===0);
 assert.equal(f.input.enabled,false);assert.deepEqual(f.actions.pause,['released']);
 f.input.sample();assert.deepEqual(f.actions.pause,['released']);f.dispose();
});
test('native scoped Tab follows gameplay enablement and releases with the game scope',()=>{
 const f=nativeFixture();assert.equal(f.claims.length,1);assert.equal(f.claims[0].name,'Tab');
 assert(!f.claims[0].when());f.input.setEnabled(true);assert(f.claims[0].when());f.input.setEnabled(false);assert(!f.claims[0].when());
 assert.deepEqual([...f.win.listeners.keys()],['blur']);assert.deepEqual([...f.page.listeners.keys()],['visibilitychange']);
 f.dispose();assert.equal(f.unclaimed,1);assert.equal(f.removed,1);assert.equal(f.win.listeners.size,0);assert.equal(f.page.listeners.size,0);
});
test('business blur and visibility release the native lock without auto-resume',async()=>{
 const f=nativeFixture(),lock=f.input.capture();f.finish('locked');assert(await lock);f.input.setEnabled(true);
 f.win.fire('blur');assert.equal(f.input.locked,false);assert.equal(f.input.enabled,false);assert.deepEqual(f.actions.pause,['released']);
 f.page.hidden=true;f.page.fire('visibilitychange');assert.deepEqual(f.actions.pause,['released']);f.dispose();
});
test('touch mode does not request a desktop native lock',async()=>{
 const f=nativeFixture('touch');assert.equal(await f.input.capture(true),false);assert.equal(f.requests.length,0);f.dispose();
});
test('held mouse buttons and the menu click edge are blocked independently until quiet',()=>{
 const f=fixture();begin(f);const p=f.play.pointer;p.locked=true;p.buttons=1;p.pressedButtons=1;
 f.input.setEnabled(false);f.input.setEnabled(true);
 let a=f.step();assert(!a.fire&&!a.firePressed&&!a.aim);
 p.buttons=3;p.pressedButtons=2;a=f.step();assert(!a.fire&&!a.firePressed&&a.aim,'new secondary is independent of blocked primary');
 p.buttons=2;p.pressedButtons=0;a=f.step();assert(!a.fire&&a.aim);
 p.buttons=3;p.pressedButtons=1;a=f.step();assert(a.fire&&a.firePressed&&a.aim);
 // Menu click has already come up, but its press edge is still retained in the native snapshot.
 p.buttons=0;p.pressedButtons=1;f.input.setEnabled(false);f.input.setEnabled(true);a=f.step();assert(!a.firePressed);
 p.pressedButtons=0;f.step();p.pressedButtons=1;a=f.step();assert(a.firePressed&&!a.aim);
});
test('one native browser snapshot is consumed once across multiple clock chunks, holds remain continuous',()=>{
 const f=fixture();begin(f);const p=f.play.pointer;p.locked=true;p.buttons=3;p.pressedButtons=3;p.dx=10;p.dy=3;p.wheel=1;f.pressed.add('Space');
 const first={...f.input.sample(.02)},second={...f.input.sample(.02)};
 assert(first.firePressed&&first.jump&&first.weapon==='next'&&first.lookYaw!==0);
 assert(second.fire&&second.aim&&!second.firePressed&&!second.jump&&second.weapon===''&&second.lookYaw===0&&second.lookPitch===0);
 f.input.endFrame();p.pressedButtons=1;p.dx=4;p.dy=0;p.wheel=0;f.pressed.clear();
 const next={...f.input.sample(.016)};assert(next.firePressed&&next.lookYaw!==0,'a distinct browser snapshot admits fresh edges and delta');
});
