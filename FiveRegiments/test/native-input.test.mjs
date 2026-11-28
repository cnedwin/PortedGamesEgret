import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
const { createInput } = await import('../src/input.mjs');

function host(t) {
  // The fake browser supplies events but lock ownership is maintained by the Play API,
  // which is what the real browser integration exercises separately.
  const w = new EventTarget(), d = new EventTarget(), canvas = new EventTarget();
  const descriptors = new Map();
  const set=(key,value)=>{descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});};
  set('addEventListener',w.addEventListener.bind(w));
  set('removeEventListener',w.removeEventListener.bind(w));
  set('document',d);
  set('navigator',{ getGamepads:()=>[],userActivation:{isActive:true} });
  d.hasFocus=()=>true;
  canvas.requestPointerLock=()=>{};
  d.pointerLockElement=null;
  const calls=[], claims=new Map();
  let locked=false;
  const game={canvas,keys:{claim(name,predicate){claims.set(name,predicate);return()=>claims.delete(name);}},pointer:{
    get locked(){return locked;},get lockPending(){return false;},
    lock(){calls.push('lock');locked=true;d.pointerLockElement=canvas;d.dispatchEvent(new Event('pointerlockchange'));return Promise.resolve({status:'locked'});},
    unlock(){calls.push('unlock');if(locked){locked=false;d.pointerLockElement=null;d.dispatchEvent(new Event('pointerlockchange'));}}
  }};
  const restore=()=>{for(const [key,desc] of descriptors)if(desc)Object.defineProperty(globalThis,key,desc);else delete globalThis[key];};
  function event(target,type,values={}){const e=new Event(type,{cancelable:true});Object.assign(e,values);target.dispatchEvent(e);return e;}
  return {w,d,canvas,calls,claims,game,event,restore};
}
test('native pointer ownership follows Play API and gameplay keys leave the menu alone', t=>{
  const h=host(t);let active=false,pauses=0;
  const input=createInput(h.game,{settings:{},isActive:()=>active,onPause:()=>pauses++});
  t.after(()=>{input.dispose();h.restore();});
  assert.equal(h.claims.get('Tab')(),false);
  const tab=h.event(h.w,'keydown',{code:'Tab'});
  assert.equal(tab.defaultPrevented,false);
  assert.equal(input.state.hidePanels,false);
  h.event(h.w,'keydown',{code:'Space'});
  assert.equal(input.sample(1/60).step,false);
  active=true;
  input.capture(true);
  assert.deepEqual(h.calls,[],'entering the battle only arms capture; a previous menu activation must not request lock');
  h.event(h.canvas,'mousedown',{button:0});
  assert.deepEqual(h.calls,[],'do not request lock while native pointer capture is still held');
  h.event(h.w,'mouseup',{button:0});
  h.event(h.canvas,'click',{button:0});
  assert.deepEqual(h.calls,['lock']);
  assert.equal(input.state.pointerLocked,true);
  assert.equal(h.claims.get('Tab')(),true);
  const combatTab=h.event(h.w,'keydown',{code:'Tab'});
  assert.equal(combatTab.defaultPrevented,true);
  assert.equal(input.state.hidePanels,true);
  h.event(h.w,'keydown',{code:'Space'});
  assert.equal(input.sample(1/60).step,true);
  input.capture(false);
  assert.deepEqual(h.calls,['lock','unlock']);
  assert.equal(input.state.pointerLocked,false);
  assert.equal(pauses,0,'intentional unlock does not reopen the pause menu');
  active=false;
  h.event(h.w,'keydown',{code:'Escape'});
  assert.equal(pauses,0);
});
test('clear and lost lock retire pending input so resume never commits gestures', t=>{
  const h=host(t);let pauses=0;
  const input=createInput(h.game,{settings:{},onPause:()=>pauses++});
  t.after(()=>{input.dispose();h.restore();});
  input.capture(true);
  h.event(h.canvas,'mousedown',{button:0});h.event(h.w,'mouseup',{button:0});
  h.event(h.canvas,'click',{button:0});
  h.event(h.w,'mousemove',{movementX:24,movementY:0});
  h.event(h.canvas,'mousedown',{button:0});
  assert.equal(input.sample(1/60).meleeDown,true);
  h.game.pointer.unlock();
  assert.equal(pauses,1);
  h.event(h.w,'mouseup',{button:0});
  assert.equal(input.sample(1/60).meleeUp,false);
  input.state.touch.move=[0,1];input.state.touch.guard=true;input.state.touch.tapGuard=true;
  input.state.touch.tapAttack=true;input.state.touch.strikeLine='O';
  input.clear();
  const neutral=input.sample(1/60);
  assert.equal(Math.hypot(...neutral.move),0);
  assert.equal(neutral.guard,false);
  assert.equal(neutral.attack,false);
});
