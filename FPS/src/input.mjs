// Convert Egret Play's native input snapshot into the established game record.
// All gameplay values are kept in the simulation; this adapter owns only UI intentions.
import { idleInput } from './sim.mjs';
const WEAPONS=['rifle','pistol','marksman'];
const PULSE=new Set(['fire','reload','heal','grenade','jump']);
const HOLD={jump:['Space','pad:a'],reload:['KeyR','pad:x'],heal:['KeyQ','pad:up'],grenade:['KeyG','pad:y'],interact:['KeyF','KeyE','pad:b']};
const GAME_KEYS=[...new Set([...Object.values(HOLD).flat(),'Escape','KeyP','Tab','pad:start','pad:select','Digit1','Digit2','Digit3','pad:r1','pad:l1','pad:l2','pad:r2','pad:l3','pad:r3','ShiftLeft','ShiftRight','KeyC','ControlLeft'])];
const RADIANS_PER_PIXEL=.0022,TOUCH_RADIANS_PER_PIXEL=.0052,TOUCH_AIM=.62;
export function createInputPort(play,options={}){
  const record=idleInput(),held=new Map(),pulses=new Map(),blockedKeys=new Set();let enabled=false,touch=play.device==='touch',blockedButtons=0,toggleAim=false,toggleCrouch=false,lookX=0,lookY=0,weapon='',suppress=false,blockedAxis=false,sampledFrame=false,admitEdges=true;
  const has=(name)=>[...held.values()].includes(name),pulse=name=>[...pulses.values()].includes(name);
  const mouseMask=()=>play.pointer.buttons>>>0,mousePresses=()=>play.pointer.pressedButtons>>>0;
  const blockMouse=()=>{blockedButtons=(mouseMask()|mousePresses())>>>0;};
  const cancel=()=>{held.clear();pulses.clear();blockMouse();toggleAim=toggleCrouch=false;lookX=lookY=0;weapon='';suppress=true;blockedAxis=true;};
  const key=(...names)=>names.some(name=>!blockedKeys.has(name)&&play.keys.down(name)),edge=(...names)=>admitEdges&&names.some(name=>!blockedKeys.has(name)&&play.keys.pressed(name));
  const blockHeldKeys=()=>{blockedKeys.clear();for(const name of GAME_KEYS)if(play.keys.down(name)||play.keys.pressed(name))blockedKeys.add(name);};
  const input={sensitivity:1,adsSensitivity:.62,invertY:false,dragLook:false,
    get touchMode(){return play.device==='touch';},get enabled(){return enabled;},get aim(){return toggleAim;},get crouch(){return toggleCrouch;},
    get locked(){return play.pointer.locked;},get capturePending(){return false;},
    cancel,setEnabled(on){enabled=Boolean(on);if(!enabled)cancel();else {suppress=true;blockedAxis=Math.hypot(play.keys.axis().x,play.keys.axis().y)>.05;blockHeldKeys();blockMouse();}},
    hold(name,id,on,canceled=false){if(!enabled)return;if(on){held.set(id,name);if(PULSE.has(name))pulses.set(id,name);}else{held.delete(id);if(canceled)pulses.delete(id);}},
    toggle(name){if(!enabled)return;if(name==='aim')toggleAim=!toggleAim;else if(name==='crouch')toggleCrouch=!toggleCrouch;},
    touchLook(dx,dy){if(!enabled||!Number.isFinite(dx)||!Number.isFinite(dy))return;const scale=TOUCH_RADIANS_PER_PIXEL*input.sensitivity*(toggleAim?TOUCH_AIM:1);lookX+=dx*scale;lookY+=dy*scale;},
    selectWeapon(name){if(enabled&&WEAPONS.includes(name))weapon=name;},
    action(name){if(!enabled)return;if(name==='pause')options.onPause?.();else if(name==='bag')options.onBag?.();else if(name==='swap')weapon='swap';else if(name==='aim'||name==='crouch')input.toggle(name);else if(PULSE.has(name))pulses.set('semantic-'+name,name);},
    // One Play.update terminates a browser snapshot after all World3D clock chunks.
    endFrame(){sampledFrame=false;},
    sample(dt=1/60){
      admitEdges=!sampledFrame;sampledFrame=true;
      const nowTouch=play.device==='touch';if(nowTouch!==touch){touch=nowTouch;cancel();if(touch)options.onTouch?.();else options.onMouse?.();}
      if(!enabled){Object.assign(record,idleInput());return record;}
      for(const name of blockedKeys)if(!play.keys.down(name)&&!play.keys.pressed(name))blockedKeys.delete(name);
      let axis=play.keys.axis();if(blockedAxis){if(Math.hypot(axis.x,axis.y)>.05)axis={x:0,y:0};else blockedAxis=false;}
      // Native mouse masks are sampled once. A held button or an edge from a
      // menu click must go quiet before that same button can be admitted again;
      // a newly pressed independent button remains eligible.
      const buttons=mouseMask(),presses=mousePresses();
      blockedButtons=(blockedButtons&(buttons|presses))>>>0;
      const mask=buttons&~blockedButtons,freshPresses=admitEdges?presses&~blockedButtons:0;
      const mouseAllowed=!touch&&(play.pointer.locked||input.dragLook),aimMouse=mouseAllowed&&Boolean(mask&2),fireMouse=mouseAllowed&&Boolean(mask&1);
      const padAim=key('pad:l2'),padFire=key('pad:r2');
      const dx=suppress||!admitEdges?0:play.pointer.dx,dy=suppress||!admitEdges?0:play.pointer.dy,wheel=suppress||!admitEdges?0:play.pointer.wheel;suppress=false;
      // Browser movement deltas are already CSS pixels, including inside native pointer lock.
      if(mouseAllowed&&(play.pointer.locked||mask)){const multiplier=RADIANS_PER_PIXEL*input.sensitivity*(aimMouse?input.adsSensitivity:1);lookX+=dx*multiplier;lookY+=dy*multiplier;}
      const pad=play.keys.look();lookX+=pad.x*dt*2.2*input.sensitivity*(padAim?input.adsSensitivity:1);lookY+=pad.y*dt*2.2*input.sensitivity*(padAim?input.adsSensitivity:1);
      if(edge('Escape','KeyP','pad:start'))options.onPause?.();else if(edge('pad:select','Tab'))options.onBag?.();
      if(!enabled){Object.assign(record,idleInput());return record;}
      for(let i=0;i<WEAPONS.length;i++)if(edge('Digit'+(i+1)))weapon=WEAPONS[i];
      if(wheel)weapon=wheel>0?'next':'previous';else if(edge('pad:r1'))weapon='next';else if(edge('pad:l1'))weapon='previous';
      const pressed=name=>key(...HOLD[name])||edge(...HOLD[name])||has(name)||pulse(name);
      record.moveX=axis.x;record.moveZ=-axis.y;record.lookYaw=-lookX;record.lookPitch=input.invertY?lookY:-lookY;lookX=lookY=0;
      record.firePressed=(mouseAllowed&&Boolean(freshPresses&1))||edge('pad:r2')||pulse('fire');record.fire=fireMouse||padFire||has('fire')||record.firePressed;record.aim=aimMouse||padAim||toggleAim;
      record.sprint=key('ShiftLeft','ShiftRight','pad:l3')||(touch&&record.moveZ>.92&&!record.fire);record.crouch=key('KeyC','ControlLeft','pad:r3')||toggleCrouch;
      record.jump=pressed('jump');record.reload=pressed('reload');record.heal=pressed('heal');record.grenade=pressed('grenade');record.interact=key(...HOLD.interact)||has('interact');record.weapon=weapon;
      weapon='';pulses.clear();return record;
    }
  };return input;
}

/** One scope lives with native Play. The only observed contacts here are touch-look contacts. */
export function createInput(play,{onPause,onBag,onTouch,onMouse,gameArea,canLook=()=>true,document:page=globalThis.document,window:win=globalThis}={}){
 const input=createInputPort(play,{onPause,onBag,onTouch,onMouse}),port=play.browser.pointer;
 const unclaimTab=play.keys.claim('Tab',()=>input.enabled);
 let lookContact,lookAt,lookTarget,blockedTargets=new Set(),closed=false,lockOwned=false,releaseVersion=0,captureVersion=0,lastLockResult;
 const remove=port.observe(({kind,contact,target})=>{
  const s=contact.session;
  if(s.pointerType!=='touch')return;
  const pos=play.fromStage(contact.globalX,contact.globalY),safe=play.safe;const own=(node,base)=>{for(let n=node;n;n=n.parent)if(n===base)return true;return false;};
  if(kind==='begin'&&input.enabled&&canLook()&&!lookContact&&pos.x>=safe.x+safe.width*.40){
   const control=[...blockedTargets].some(node=>own(target,node));if(!control||own(target,lookTarget)){lookContact=s;lookAt=pos;}
  }else if(s===lookContact){if(kind==='move'&&canLook()){const box=play.canvas.getBoundingClientRect(),frame=play.browser.frame;input.touchLook((pos.x-lookAt.x)*box.width/frame.width,(pos.y-lookAt.y)*box.height/frame.height);lookAt=pos;}else{lookContact=lookAt=undefined;}}
 });
 const baseCancel=input.cancel,baseSet=input.setEnabled,baseSample=input.sample;
 input.cancel=()=>{baseCancel();lookContact=lookAt=undefined;};
 input.setEnabled=on=>{baseSet(on);if(!on)lookContact=lookAt=undefined;};
 // A lock result is returned by the engine, not by a second DOM capture state
 // machine. Request synchronously in the activating gesture. Raw movement is
 // explicit; there is no automatic retry with a different browser policy.
 input.capture=(raw=false)=>{
  if(closed||input.touchMode)return Promise.resolve(false);
  const version=releaseVersion,attempt=++captureVersion;
  const options=raw?{unadjustedMovement:true}:{};
  if(typeof globalThis.AbortSignal?.timeout==='function')options.signal=globalThis.AbortSignal.timeout(1800);
  return play.pointer.lock(options).then(result=>{
   if(attempt===captureVersion)lastLockResult=result;
   if(closed||version!==releaseVersion||attempt!==captureVersion)return false;
   lockOwned=result.status==='locked'&&play.pointer.locked;
   return lockOwned;
  });
 };
 input.release=()=>{releaseVersion++;lockOwned=false;play.pointer.unlock();};
 Object.defineProperties(input,{capturePending:{get:()=>play.pointer.lockPending},lastLockResult:{get:()=>lastLockResult}});
 // Pointer Lock can be lost between frames. Retire input and pause before
 // returning a record to the rules, rather than reacting one simulation step
 // later. An intentional unlock for a menu has already cleared lockOwned.
 input.sample=dt=>{
  if(lockOwned&&!play.pointer.locked){
   const live=input.enabled&&!input.touchMode;
   lockOwned=false;input.cancel();
   if(live){input.setEnabled(false);onPause?.('released');return idleInput();}
  }
  return baseSample(dt);
 };
 const lose=()=>{
  const live=input.enabled&&!input.touchMode&&(lockOwned||input.dragLook);
  input.cancel();input.release();
  if(live){input.setEnabled(false);onPause?.('released');}
 };
 const hidden=()=>{if(page.hidden)lose();};
 win.addEventListener('blur',lose);page.addEventListener('visibilitychange',hidden);
 input.setTouchTargets=(nodes,fire)=>{blockedTargets=new Set(nodes);lookTarget=fire;};
 play.scope.use({dispose(){
  if(closed)return;closed=true;remove();unclaimTab();win.removeEventListener('blur',lose);page.removeEventListener('visibilitychange',hidden);
  input.cancel();input.release();
 }});
 return input;
}
