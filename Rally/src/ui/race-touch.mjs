// Native independent held controls keep their own pointer sessions across the edge.
// A pause action is stricter than driving holds: a swipe/cancellation is never an activation.
import { createActionControl } from '@egret/engine/ui';

function contactDetail(contact,kind){
  const s=contact?.session;
  return {source:s?'pointer':'script',kind,pointerType:s?.pointerType,pointerId:s?.pointerId,
    sessionId:s?.id,x:contact?.globalX,y:contact?.globalY,canceled:kind==='cancel'};
}

/** Exported so controlled tests can route actual Engine contacts through the production wiring. */
export function bindRaceAction(host,target,{
  name,onHeld=()=>{},onActivate=()=>{},onPaint=()=>{},pause=false
}={}){
  const input=host.pointer??host.game.pointer,scope=host.scope;
  let available=false,held=false,active,detail,validRelease=false;
  const same=contact=>active?.session===contact.session;
  const remember=(kind,c)=>{detail=contactDetail(c,kind);};
  const trackMove=c=>{
    if(!active||!same(c))return;
    if(Math.hypot(c.globalX-active.x,c.globalY-active.y)*(host.metrics()?.scale??1)>12)active.swiped=true;
  };
  const inside=c=>{
    const local=target.globalToLocal(c.globalX,c.globalY),rect=target.hitArea;
    return Boolean(local&&rect&&local.x>=rect.x&&local.x<rect.x+rect.width&&local.y>=rect.y&&local.y<rect.y+rect.height);
  };
  // Observe the target's own routed events before the engine ActionControl receives them;
  // it owns pressed/activation state and its native terminal observer also handles lost capture.
  const listen=(type,fn)=>{const sub=target.on(type,fn);scope.use({dispose:sub});};
  listen(input.events.begin,e=>{
    if(!available||active)return;
    const c=e.payload;active={session:c.session,x:c.globalX,y:c.globalY,swiped:false,c};
    validRelease=false;remember('begin',c);
  });
  listen(input.events.move,e=>{
    const c=e.payload;if(same(c)){trackMove(c);active.c=c;remember('move',c);}
  });
  listen(input.events.end,e=>{
    const c=e.payload;if(!same(c))return;
    trackMove(c);active.c=c;remember('end',c);validRelease=!active.swiped&&inside(c);
  });
  listen(input.events.cancel,e=>{
    const c=e.payload;if(!same(c))return;
    active.c=c;remember('cancel',c);validRelease=false;
  });
  const control=scope.use(createActionControl({
    input,target,
    onPressChange(pressed){
      held=pressed;
      if(pressed){
        // Script/semantic press has no PointerContact, but follows the same paint and release state.
        if(!active){detail=contactDetail(undefined,'begin');validRelease=true;}
      }else{
        if(detail?.kind!=='end'&&detail?.kind!=='cancel'){
          if(active){detail=contactDetail(active.c,'cancel');validRelease=false;}
          else detail=contactDetail(undefined,'end');
        }
      }
      onPaint(pressed);
      if(!pause)onHeld(name,pressed,detail??contactDetail(undefined,pressed?'begin':'cancel'));
      if(!pressed){active=undefined;detail=undefined;}
      host.requestPublish?.();
    },
    onActivate(){
      if(!pause||validRelease)onActivate();
      validRelease=false;
    }
  }));
  control.setEnabled(false);
  target.touchEnabled=false;
  target.visible=false;
  return {
    control,
    get held(){return held;},
    get available(){return available;},
    setAvailable(next){
      next=Boolean(next);if(available===next)return;
      available=next;control.setEnabled(next);
      target.touchEnabled=next;
      target.visible=next;
      if(!next){active=undefined;detail=undefined;validRelease=false;}
    },
    release(){
      // setEnabled(false) is the native non-activating end; a subsequent pointer-up cannot re-fire this hold.
      if(available){control.setEnabled(false);control.setEnabled(true);}
      active=undefined;detail=undefined;validRelease=false;
    },
    activate(){if(available){control.press();control.release();}}
  };
}
