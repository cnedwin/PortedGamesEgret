// Convert Egret Play's native input snapshot into the established game record.
// All gameplay values are kept in the simulation; this adapter owns only UI intentions.
import { idleInput } from './sim.mjs';
const WEAPONS=['rifle','pistol','marksman'];
const PULSE=new Set(['fire','reload','heal','grenade','jump']);
const HOLD={jump:['Space','pad:a'],reload:['KeyR','pad:x'],heal:['KeyQ','pad:up'],grenade:['KeyG','pad:y'],interact:['KeyF','KeyE','pad:b']};
const GAME_KEYS=[...new Set([...Object.values(HOLD).flat(),'Escape','KeyP','Tab','pad:start','pad:select','Digit1','Digit2','Digit3','pad:r1','pad:l1','pad:l2','pad:r2','pad:l3','pad:r3','ShiftLeft','ShiftRight','KeyC','ControlLeft'])];
const RADIANS_PER_PIXEL=.0022,TOUCH_RADIANS_PER_PIXEL=.0052,TOUCH_AIM=.62;
export function createInputPort(play,options={}){
  const record=idleInput(),held=new Map(),pulses=new Map(),blockedKeys=new Set();let enabled=false,touch=play.device==='touch',mask=0,mouseEdge=false,toggleAim=false,toggleCrouch=false,lookX=0,lookY=0,weapon='',suppress=false,blockedAxis=false;
  const has=(name)=>[...held.values()].includes(name),pulse=name=>[...pulses.values()].includes(name);
  const cancel=()=>{held.clear();pulses.clear();mask=0;mouseEdge=false;toggleAim=toggleCrouch=false;lookX=lookY=0;weapon='';suppress=true;blockedAxis=true;};
  const key=(...names)=>names.some(name=>!blockedKeys.has(name)&&play.keys.down(name)),edge=(...names)=>names.some(name=>!blockedKeys.has(name)&&play.keys.pressed(name));
  const blockHeldKeys=()=>{blockedKeys.clear();for(const name of GAME_KEYS)if(play.keys.down(name)||play.keys.pressed(name))blockedKeys.add(name);};
  const input={sensitivity:1,adsSensitivity:.62,invertY:false,dragLook:false,
    get touchMode(){return play.device==='touch';},get enabled(){return enabled;},get aim(){return toggleAim;},get crouch(){return toggleCrouch;},
    get locked(){return play.pointer.locked;},get capturePending(){return false;},
    cancel,setEnabled(on){enabled=Boolean(on);if(!enabled)cancel();else {suppress=true;blockedAxis=Math.hypot(play.keys.axis().x,play.keys.axis().y)>.05;blockHeldKeys();}},
    mouse(buttons){if(!enabled)return;const value=Number(buttons)||0;if((value&1)&&!(mask&1))mouseEdge=true;mask=value;},
    hold(name,id,on,canceled=false){if(!enabled)return;if(on){held.set(id,name);if(PULSE.has(name))pulses.set(id,name);}else{held.delete(id);if(canceled)pulses.delete(id);}},
    toggle(name){if(!enabled)return;if(name==='aim')toggleAim=!toggleAim;else if(name==='crouch')toggleCrouch=!toggleCrouch;},
    touchLook(dx,dy){if(!enabled||!Number.isFinite(dx)||!Number.isFinite(dy))return;const scale=TOUCH_RADIANS_PER_PIXEL*input.sensitivity*(toggleAim?TOUCH_AIM:1);lookX+=dx*scale;lookY+=dy*scale;},
    selectWeapon(name){if(enabled&&WEAPONS.includes(name))weapon=name;},
    action(name){if(!enabled)return;if(name==='pause')options.onPause?.();else if(name==='bag')options.onBag?.();else if(name==='swap')weapon='swap';else if(name==='aim'||name==='crouch')input.toggle(name);else if(PULSE.has(name))pulses.set('semantic-'+name,name);},
    sample(dt=1/60){
      const nowTouch=play.device==='touch';if(nowTouch!==touch){touch=nowTouch;cancel();if(touch)options.onTouch?.();else options.onMouse?.();}
      if(!enabled){Object.assign(record,idleInput());return record;}
      for(const name of blockedKeys)if(!play.keys.down(name)&&!play.keys.pressed(name))blockedKeys.delete(name);
      let axis=play.keys.axis();if(blockedAxis){if(Math.hypot(axis.x,axis.y)>.05)axis={x:0,y:0};else blockedAxis=false;}
      const mouseAllowed=!touch&&(play.pointer.locked||input.dragLook),aimMouse=mouseAllowed&&Boolean(mask&2),fireMouse=mouseAllowed&&Boolean(mask&1);
      const padAim=key('pad:l2'),padFire=key('pad:r2');
      const dx=suppress?0:play.pointer.dx,dy=suppress?0:play.pointer.dy,wheel=suppress?0:play.pointer.wheel;suppress=false;
      // Browser movement deltas are already CSS pixels, including inside native pointer lock.
      if(mouseAllowed&&(play.pointer.locked||mask)){const multiplier=RADIANS_PER_PIXEL*input.sensitivity*(aimMouse?input.adsSensitivity:1);lookX+=dx*multiplier;lookY+=dy*multiplier;}
      const pad=play.keys.look();lookX+=pad.x*dt*2.2*input.sensitivity*(padAim?input.adsSensitivity:1);lookY+=pad.y*dt*2.2*input.sensitivity*(padAim?input.adsSensitivity:1);
      if(edge('Escape','KeyP','pad:start'))options.onPause?.();else if(edge('pad:select')||(options.nativeTab!==false&&edge('Tab')))options.onBag?.();
      if(!enabled){Object.assign(record,idleInput());return record;}
      for(let i=0;i<WEAPONS.length;i++)if(edge('Digit'+(i+1)))weapon=WEAPONS[i];
      if(wheel)weapon=wheel>0?'next':'previous';else if(edge('pad:r1'))weapon='next';else if(edge('pad:l1'))weapon='previous';
      const pressed=name=>key(...HOLD[name])||edge(...HOLD[name])||has(name)||pulse(name);
      record.moveX=axis.x;record.moveZ=-axis.y;record.lookYaw=-lookX;record.lookPitch=input.invertY?lookY:-lookY;lookX=lookY=0;
      record.firePressed=(mouseAllowed&&mouseEdge)||edge('pad:r2')||pulse('fire');record.fire=fireMouse||padFire||has('fire')||record.firePressed;record.aim=aimMouse||padAim||toggleAim;
      record.sprint=key('ShiftLeft','ShiftRight','pad:l3')||(touch&&record.moveZ>.92&&!record.fire);record.crouch=key('KeyC','ControlLeft','pad:r3')||toggleCrouch;
      record.jump=pressed('jump');record.reload=pressed('reload');record.heal=pressed('heal');record.grenade=pressed('grenade');record.interact=key(...HOLD.interact)||has('interact');record.weapon=weapon;
      weapon='';mouseEdge=false;pulses.clear();return record;
    }
  };return input;
}

/** PlayPointer.lock() has a void public result; keep the minimal confirmation/loss adapter.
 * The actual request is made synchronously by the native control's gesture.
 * This intentionally never retries with a different browser locking policy.
 */
export function createPointerCapture(pointer,page,{onLost,timeoutMs=1800}={}){
  let request,owned=false,closed=false;
  function finish(req,success){if(request!==req)return;clearTimeout(req.timer);request=undefined;owned=Boolean(success&&!req.canceled&&pointer.locked&&!closed);req.resolve(owned);if(!owned&&pointer.locked)pointer.unlock();}
  function change(){if(pointer.locked){if(request)finish(request,true);else if(!owned)pointer.unlock();}else if(owned){owned=false;onLost?.();}}
  function failure(){if(request)finish(request,false);}
  page.addEventListener('pointerlockchange',change);page.addEventListener('pointerlockerror',failure);
  const api={get owned(){return owned},get pending(){return Boolean(request&&!request.canceled)},capture(){
    if(closed)return Promise.resolve(false);if(request)return request.canceled?Promise.resolve(false):request.promise;if(pointer.locked)return Promise.resolve(owned);
    const req={canceled:false};req.promise=new Promise(resolve=>{req.resolve=resolve;});request=req;req.timer=setTimeout(()=>finish(req,false),timeoutMs);try{pointer.lock();if(pointer.locked&&request===req)finish(req,true);}catch{finish(req,false);}return req.promise.then(value=>value&&owned&&pointer.locked);
  },release(){owned=false;if(request&&!request.canceled){request.canceled=true;request.resolve(false);}if(pointer.locked)pointer.unlock();},dispose(){if(closed)return;closed=true;api.release();if(request){clearTimeout(request.timer);request=undefined;}page.removeEventListener('pointerlockchange',change);page.removeEventListener('pointerlockerror',failure);}};return api;
}

/** Browser pointer capture is prohibited during Pointer Lock. In 33897768
 * BrowserPointerInput otherwise attempts setPointerCapture on a locked mouse.
 * Suspend only the contact router while locked; native Play still provides
 * relative movement, wheel and keys. Bridge the browser button bitmask in
 * this narrow interval, then restore the engine's normal pointer routing. */
export function bindLockedMouse(pointer,port,page,win,feed){
 let suspended=false;
 const sync=()=>{const locked=Boolean(pointer.locked);if(locked===suspended)return;suspended=locked;port.setInteractive(!locked);if(!locked)feed(0);};
 const buttons=event=>{if(suspended&&pointer.locked)feed(event.buttons);};
 page.addEventListener('pointerlockchange',sync);win.addEventListener('mousedown',buttons);win.addEventListener('mouseup',buttons);
 sync();return()=>{page.removeEventListener('pointerlockchange',sync);win.removeEventListener('mousedown',buttons);win.removeEventListener('mouseup',buttons);if(suspended){suspended=false;port.setInteractive(true);feed(0);}};
}

/** Embedded Play reserves Tab for page navigation. Only active gameplay owns
 * the inventory shortcut; menu and accessibility navigation remain native. */
export function bindGameplayTab(win,enabled,activate){
 const tap=event=>{if(event.code!=='Tab'||!enabled())return;event.preventDefault();event.stopPropagation();if(!event.repeat)activate();};
 win.addEventListener('keydown',tap,true);return()=>win.removeEventListener('keydown',tap,true);
}

/** One scope lives with native Play. Observe the engine's contacts rather than adding a competing input stream. */
export function createInput(play,{onPause,onBag,onTouch,onMouse,gameArea,canLook=()=>true,document:page=globalThis.document,window:win=globalThis}={}){
 const input=createInputPort(play,{onPause,onBag,onTouch,onMouse,nativeTab:false}),port=play.browser.pointer;const unbindTab=bindGameplayTab(win,()=>input.enabled,()=>onBag?.());const cap=createPointerCapture(play.pointer,page,{onLost(){input.cancel();if(input.enabled&&!input.touchMode)onPause?.('released')}});const unbindLocked=bindLockedMouse(play.pointer,port,page,win,flags=>input.mouse(flags));let lookContact,lookAt,lookTarget,blockedTargets=new Set();const remove=port.observe(({kind,contact,target,reason})=>{
  const s=contact.session;if(s.pointerType==='mouse'){input.mouse(kind==='cancel'||kind==='end'?0:contact.buttons);return;}
  if(s.pointerType!=='touch')return;
  const pos=play.fromStage(contact.globalX,contact.globalY),safe=play.safe;const own=(node,base)=>{for(let n=node;n;n=n.parent)if(n===base)return true;return false;};
  if(kind==='begin'&&input.enabled&&canLook()&&!lookContact&&pos.x>=safe.x+safe.width*.40){
   const control=[...blockedTargets].some(node=>own(target,node));if(!control||own(target,lookTarget)){lookContact=s;lookAt=pos;}
  }else if(s===lookContact){if(kind==='move'&&canLook()){const box=play.canvas.getBoundingClientRect(),frame=play.browser.frame;input.touchLook((pos.x-lookAt.x)*box.width/frame.width,(pos.y-lookAt.y)*box.height/frame.height);lookAt=pos;}else{lookContact=lookAt=undefined;}}
 });
 const clear=()=>{lookContact=lookAt=undefined;input.cancel();};const lose=()=>{const live=input.enabled&&!input.touchMode&&(cap.owned||input.dragLook);clear();cap.release();if(live)onPause?.('released');};const hidden=()=>{if(page.hidden)lose();};win.addEventListener('blur',lose);page.addEventListener('visibilitychange',hidden);
 const baseCancel=input.cancel,baseSet=input.setEnabled;input.cancel=()=>{baseCancel();lookContact=lookAt=undefined;};input.setEnabled=on=>{baseSet(on);if(!on)lookContact=lookAt=undefined;};input.capture=()=>input.touchMode?Promise.resolve(false):cap.capture();input.release=()=>cap.release();Object.defineProperty(input,'capturePending',{get:()=>cap.pending});input.setTouchTargets=(nodes,fire)=>{blockedTargets=new Set(nodes);lookTarget=fire;};
 play.scope.use({dispose(){remove();cap.dispose();unbindLocked();unbindTab();win.removeEventListener('blur',lose);page.removeEventListener('visibilitychange',hidden);clear();}});return input;
}
