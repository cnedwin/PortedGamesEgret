import assert from 'node:assert/strict';
import {test} from 'node:test';
import {register} from 'node:module';
register('../tools/egret-resolve.mjs', import.meta.url);
const {createInputPort,createPointerCapture,bindLockedMouse,bindGameplayTab}=await import('../src/input.mjs');

function fixture(device='keyboard'){
 const down=new Set(),pressed=new Set();let axis={x:0,y:0},look={x:0,y:0},current=device;
 const actions={pause:0,bag:0,touch:0,mouse:0};const play={get device(){return current},keys:{down:(...k)=>k.some(v=>down.has(v)),pressed:(...k)=>k.some(v=>pressed.has(v)),axis:()=>axis,look:()=>look},pointer:{locked:false,dx:0,dy:0,wheel:0}};
 const input=createInputPort(play,{onPause(){actions.pause++},onBag(){actions.bag++},onTouch(){actions.touch++},onMouse(){actions.mouse++}});
 return {play,input,down,pressed,actions,axis(x,y){axis={x,y}},look(x,y){look={x,y}},device(x){current=x}};
}
const begin=f=>{f.input.setEnabled(true);f.input.sample();};
test('engine axes and held aliases map to original movement, while interaction is held',()=>{const f=fixture();begin(f);f.axis(.6,-.8);f.down.add('KeyF');const a=f.input.sample();assert.equal(a.moveX,.6);assert.equal(a.moveZ,.8);assert.equal(a.interact,true);f.down.clear();assert.equal(f.input.sample().interact,false)});
test('engine key edges trigger one sample; held interaction is not a tap',()=>{const f=fixture();begin(f);for(const k of ['KeyR','KeyQ','KeyG','Space','KeyF'])f.pressed.add(k);const a={...f.input.sample()};assert(a.reload&&a.heal&&a.grenade&&a.jump&&!a.interact);f.pressed.clear();assert.equal(f.input.sample().reload,false)});
test('native mouse contact uses bitmask for simultaneous primary and secondary, keeps real lock',()=>{const f=fixture();begin(f);f.play.pointer.locked=true;f.input.mouse(3);f.play.pointer.dx=10;f.play.pointer.dy=3;const a={...f.input.sample()};assert(a.fire&&a.firePressed&&a.aim);assert(Math.abs(a.lookYaw+10*.0022*.62)<1e-12);f.input.mouse(2);const b=f.input.sample();assert(!b.fire&&b.aim);f.input.mouse(0);assert(!f.input.sample().aim)});
test('touch action contact cancel discards unsampled press but not independent contact',()=>{const f=fixture('touch');begin(f);f.input.hold('fire',1,true);f.input.hold('reload',2,true);f.input.hold('fire',1,false,true);const a=f.input.sample();assert(!a.fire&&!a.firePressed&&a.reload);f.input.hold('reload',2,false);assert(!f.input.sample().reload)});
test('touch held owners and analog motion remain independent',()=>{const f=fixture('touch');begin(f);f.axis(0,-1);assert(f.input.sample().sprint);f.input.hold('fire',1,true);f.input.hold('fire',2,true);assert(f.input.sample().firePressed);assert(!f.input.sample().sprint);f.input.hold('fire',1,false);assert(f.input.sample().fire);f.input.hold('fire',2,false,true);assert(!f.input.sample().fire&&f.input.sample().sprint)});
test('touch look applies the original input scale and toggle, pause clears everything',()=>{const f=fixture('touch');begin(f);f.input.touchLook(20,0);const a=f.input.sample().lookYaw;f.input.toggle('aim');f.input.touchLook(20,0);assert(Math.abs(f.input.sample().lookYaw/a-.62)<1e-9);f.input.hold('interact',1,true);f.input.setEnabled(false);const b=f.input.sample();assert(!b.interact&&!b.aim&&!b.fire&&b.moveX===0);f.input.setEnabled(true);assert(!f.input.sample().aim)});
test('selection, wheel and bag are edges; disabled ignores changes',()=>{const f=fixture();begin(f);f.input.selectWeapon('marksman');assert.equal(f.input.sample().weapon,'marksman');assert.equal(f.input.sample().weapon,'');f.play.pointer.wheel=1;assert.equal(f.input.sample().weapon,'next');f.play.pointer.wheel=0;f.pressed.add('Tab');f.input.sample();assert.equal(f.actions.bag,1);f.pressed.clear();f.input.setEnabled(false);f.input.selectWeapon('pistol');assert.equal(f.input.sample().weapon,'')});
test('gamepad uses native axes, look and buttons',()=>{const f=fixture('gamepad');begin(f);f.axis(.4,-.3);f.look(.5,0);f.down.add('pad:l2');f.down.add('pad:r2');const r=f.input.sample(.016);assert(r.aim&&r.fire&&r.moveZ===.3&&r.lookYaw<0)});
test('device handoff cancels held state without replaying it',()=>{const f=fixture();begin(f);f.input.mouse(1);f.device('touch');f.input.sample();assert.equal(f.actions.touch,1);assert(!f.input.sample().fire);f.device('mouse');f.input.sample();assert.equal(f.actions.mouse,1)});
function lockFixture(){const events=new Map();let locked=false,asks=0,unlocks=0;const page={addEventListener(n,cb){events.set(n,cb)},removeEventListener(n){events.delete(n)},dispatch(n){events.get(n)?.()}};const pointer={get locked(){return locked},lock(){asks++},unlock(){unlocks++;locked=false;page.dispatch('pointerlockchange')}};let pauses=0;const cap=createPointerCapture(pointer,page,{onLost(){pauses++},timeoutMs:20});return {cap,page,pointer,lock(on){locked=on;page.dispatch('pointerlockchange')},get asks(){return asks},get unlocks(){return unlocks},get pauses(){return pauses}}}
test('pointer request happens inside the calling gesture, actual lock change confirms',async()=>{const f=lockFixture();const pending=f.cap.capture();assert.equal(f.asks,1);assert(f.cap.pending);f.lock(true);assert.equal(await pending,true);assert(f.cap.owned);f.lock(false);assert.equal(f.pauses,1);f.cap.dispose()});
test('denial, silence and late locks do not open gameplay; no implicit retry',async()=>{const f=lockFixture();const first=f.cap.capture();f.page.dispatch('pointerlockerror');assert.equal(await first,false);assert.equal(f.asks,1);const second=f.cap.capture();assert.equal(await second,false);f.lock(true);assert(!f.pointer.locked);assert.equal(f.asks,2);f.cap.dispose()});
test('pending release invalidates the previous request and does not treat a late lock as a fresh request',async()=>{const f=lockFixture();const p=f.cap.capture();f.cap.release();assert.equal(await p,false);assert.equal(await f.cap.capture(),false);f.lock(true);assert(!f.pointer.locked);f.cap.dispose()});
test('only pointer-locked desktop mouse suppresses native capture while preserving simultaneous button bits',()=>{
 const make=()=>{const m=new Map();return{addEventListener(n,f){m.set(n,f)},removeEventListener(n){m.delete(n)},fire(n,e={}){m.get(n)?.(e)}}};
 const page=make(),win=make(),pointer={locked:false},states=[],flags=[];
 const dispose=bindLockedMouse(pointer,{setInteractive:on=>states.push(on)},page,win,bits=>flags.push(bits));
 win.fire('mousedown',{buttons:1});assert.deepEqual(flags,[]);
 pointer.locked=true;page.fire('pointerlockchange');assert.deepEqual(states,[false]);
 win.fire('mousedown',{buttons:1});win.fire('mousedown',{buttons:3});win.fire('mouseup',{buttons:2});win.fire('mouseup',{buttons:0});
 assert.deepEqual(flags,[1,3,2,0]);pointer.locked=false;page.fire('pointerlockchange');assert.deepEqual(states,[false,true]);
 win.fire('mousedown',{buttons:1});assert.deepEqual(flags,[1,3,2,0,0]);dispose();
});
test('gameplay Tab is owned by the inventory without taking menu Tab navigation',()=>{
 let listener,enabled=false,opened=0,prevented=0;const win={addEventListener(n,f){listener=f},removeEventListener(){listener=null}};
 const stop=bindGameplayTab(win,()=>enabled,()=>opened++);const event=(repeat=false)=>({code:'Tab',repeat,preventDefault(){prevented++},stopPropagation(){}});
 listener(event());assert.equal(prevented,0);enabled=true;listener(event());listener(event(true));assert.equal(opened,1);assert.equal(prevented,2);stop();assert.equal(listener,null);
});

 test('resume ignores held gameplay keys and pad triggers until release, without masking fresh input',()=>{
   const f=fixture();begin(f);for(const k of ['KeyR','KeyF','pad:r2','KeyC'])f.down.add(k);
   f.input.setEnabled(false);f.pressed.add('KeyQ');f.input.setEnabled(true);
   let r={...f.input.sample()};assert(!r.reload&&!r.interact&&!r.fire&&!r.crouch&&!r.heal);
   f.pressed.clear();f.pressed.add('Space');r={...f.input.sample()};assert(r.jump&&!r.reload&&!r.fire);
   f.down.clear();f.pressed.clear();f.input.sample();for(const k of ['KeyR','KeyF','pad:r2','KeyC'])f.down.add(k);
   r={...f.input.sample()};assert(r.reload&&r.interact&&r.fire&&r.crouch);
 });