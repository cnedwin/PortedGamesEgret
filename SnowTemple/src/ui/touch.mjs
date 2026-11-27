// The engine routes every contact to one native control. Combat intentions
// and the floating stick never install a second browser pointer listener.
import { createActionControl, createMovementControl } from '@egret/engine/ui';

export function contactBounds(target,width,height){
  const p=target.localToGlobal(0,0),q=target.localToGlobal(width,height);
  return {x:p.x,y:p.y,width:q.x-p.x,height:q.y-p.y};
}
export function bindSnowAction(host,target,{name,onHeld,onActivate,onPaint}={}){
  const pointer=host.pointer,scope=host.scope,activation=typeof onActivate==='function';
  let available=false,owner,releaseOK=false,pressed=false,closing=false;
  const listen=(type,fn)=>scope.use({dispose:target.on(type,fn)});
  const moved=c=>Math.hypot(c.globalX-owner.x,c.globalY-owner.y)*host.metrics().scale>12;
  const inside=c=>{
    const p=target.globalToLocal(c.globalX,c.globalY),r=target.hitArea;
    return p.x>=r.x&&p.y>=r.y&&p.x<r.x+r.width&&p.y<r.y+r.height;
  };
  // Only release-activated controls (bag and page arrows) need a tap check.
  // Attack, guard and the other deeds keep their press until terminal delivery,
  // even after the contact leaves their actual target.
  if(activation){
    listen(pointer.events.begin,e=>{if(available&&!owner){releaseOK=false;owner={session:e.payload.session,x:e.payload.globalX,y:e.payload.globalY,swiped:false};}});
    listen(pointer.events.move,e=>{if(owner?.session===e.payload.session&&moved(e.payload))owner.swiped=true;});
    listen(pointer.events.end,e=>{const c=e.payload;if(owner?.session===c.session)releaseOK=!owner.swiped&&!moved(c)&&inside(c);});
    listen(pointer.events.cancel,e=>{if(owner?.session===e.payload.session)releaseOK=false;});
  }
  const control=createActionControl({input:pointer,target,onPressChange(next){
    pressed=next;
    if(next&&activation&&!owner)releaseOK=true; // keyboard/semantic activation
    if(!next&&activation&&owner)owner=undefined;
    onHeld?.(name,next);if(!closing){onPaint?.(next);host.requestPublish?.();}
  },onActivate(){if(activation&&releaseOK&&!closing)onActivate();releaseOK=false;}});
  scope.use({dispose(){closing=true;control.dispose();}});
  control.setEnabled(false);target.visible=false;target.touchEnabled=false;
  return {
    control,get held(){return pressed;},get available(){return available;},
    setAvailable(next){
      next=Boolean(next);if(next===available)return;
      available=next;control.setEnabled(next);target.visible=next;target.touchEnabled=next;
      if(!next){owner=undefined;releaseOK=false;}
    },
    release(){if(available){control.setEnabled(false);control.setEnabled(true);}owner=undefined;releaseOK=false;},
    activate(){if(available){control.press();control.release();}}
  };
}

/** A floating stick with the original 48 CSS-pixel radius and 20% dead zone.
 * Native MovementControl owns analog motion and cancellation; the observer
 * merely paints where the owning finger began (including a stationary finger).
 */
export function bindSnowStick(host,target,{onMovement=()=>{},onPaint=()=>{},radiusCss=48}={}){
  const pointer=host.pointer,scope=host.scope;
  let control,available=false,owner,origin,value={x:0,y:0},radius=0,box,closing=false;
  const publish=()=>{if(!closing){onPaint({available,active:!!owner,origin,value,radius});host.requestPublish?.();}};
  function resetVisual(){owner=undefined;origin=undefined;value={x:0,y:0};publish();}
  function release(){
    if(control?.enabled){control.setEnabled(false);control.setEnabled(available);}
    resetVisual();onMovement(0,0);
  }
  scope.use({dispose:target.on(pointer.events.begin,event=>{
    if(!available||owner)return;
    const c=event.payload;owner=c.session;origin={x:c.globalX,y:c.globalY};publish();
  })});
  const stop=pointer.observe(notification=>{
    if(owner!==notification.contact.session)return;
    if(notification.kind==='end'||notification.kind==='cancel'){resetVisual();onMovement(0,0);}
  });
  // Register the visual observer before the control; on terminal delivery we
  // clear the painted origin and the native control then clears its value.
  scope.use({dispose:stop});
  const ensure=next=>{
    if(control&&Math.abs(next-radius)<1e-7)return;
    release();control?.dispose();
    radius=next;control=createMovementControl({input:pointer,target,radius,deadZone:radius*.2,onMovement(nextValue){
      value={x:nextValue.x,y:nextValue.y};onMovement(value.x,value.y);publish();
    }});
    control.setEnabled(available);
  };
  scope.use({dispose(){closing=true;control?.dispose();control=undefined;resetVisual();onMovement(0,0);}});
  target.visible=false;target.touchEnabled=false;
  return {
    get control(){return control;},get active(){return Boolean(owner);},get available(){return available;},
    get value(){return {...value};},get origin(){return origin&&{...origin};},get box(){return box&&{...box};},
    setBounds(next,scale){
      const previous=box;
      if(previous&&(previous.x!==next.x||previous.y!==next.y||previous.width!==next.width||previous.height!==next.height))release();
      box={...next};
      target.x=next.x;target.y=next.y;target.hitArea={x:0,y:0,width:next.width,height:next.height};
      ensure(radiusCss/Math.max(.01,scale));
    },
    setAvailable(next){
      next=Boolean(next);if(next===available)return;
      available=next;control?.setEnabled(next);target.visible=next;target.touchEnabled=next;
      if(!next){resetVisual();onMovement(0,0);}else publish();
    },
    release
  };
}
