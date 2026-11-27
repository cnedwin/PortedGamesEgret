// Scene-independent native loading screen; keep the existing snow-road painting and all progress stages.
import { Bitmap, DisplayObjectContainer } from '@egret/engine';
import { createSnowKit, INK, rect, clamp, fontScript } from './kit.mjs';

const ART=new URL('../../assets/boot-snow-road.webp',import.meta.url).href;
export function createSnowBoot(host,{locale}={}){
  const t=(zh,en)=>locale?.t(zh,en)??zh;
  const layer=host.scope.use(new DisplayObjectContainer());host.stage.addChild(layer);host.loading=true;
  let lease,frame,ended=false,fading=0,closed=false,value=.08,note='扫雪',error,handlers,retryId,retiring=null;
  function focusRetry(){
    if(!error||!retryId||closed||retiring)return;
    // Startup errors have no managed screen. Later errors retire that stack first.
    // Never turn a missing keyboard target into another fatal overlay recursively.
    try{host.keyboard?.focus(retryId,{visible:true});host.focus();host.requestPublish();}
    catch(cause){console.warn('Retry keyboard focus unavailable',cause);}
  }
  const setTop=()=>{
    if(layer.parent===host.stage&&host.stage.getChildAt(host.stage.numChildren-1)!==layer)
      host.stage.setChildIndex(layer,host.stage.numChildren-1);
  };
  function draw(){
    if(closed||ended)return;
    frame?.dispose();frame=host.game.engine.createScope();
    const content=frame.use(new DisplayObjectContainer());layer.addChild(content);
    const {screen,safe}=host.metrics(),w=screen.width,h=screen.height;
    host.addSemantic({id:'snow-boot-window',role:'dialog',describe:()=>({name:t('风雪山神庙','Snow at the Mountain Temple'),
      bounds:safe,hidden:!host.loading,modal:host.loading})},frame);
    const kit=createSnowKit(host,content,{scope:frame,prefix:'snow-boot',semanticParent:'snow-boot-window',locale});
    kit.panel(rect(0,0,w,h),{fill:INK.ink,alpha:1,border:null,radius:0});
    if(lease){
      const image=frame.use(new Bitmap(lease)),k=Math.max(w/896,h/560);
      image.scaleX=image.scaleY=k;image.x=(w-896*k)/2;image.y=(h-560*k)*.57;content.addChild(image);
    }
    const blockers=kit.shape(rect(0,0,w,h));blockers.touchEnabled=true;blockers.hitArea=rect(0,0,w,h);
    blockers.graphics.beginFill(INK.ink,error?.message?.length ? .42 : .18).drawRect(0,0,w,h).endFill();
    const cx=safe.x+safe.width/2,cy=safe.y+safe.height/2;
    const width=Math.min(safe.width-24,650),titleH=Math.min(92,Math.max(50,safe.height*.15));
    if(error){
      const height=Math.min(safe.height-16,250),box=rect(cx-width/2,cy-height/2,width,height);
      kit.panel(box,{alpha:.96});
      kit.label(t('出了点问题，画面停了。请重新载入。','Something went wrong. Please reload.'),rect(box.x+14,box.y+7,box.width-28,48),
        {size:22,min:16,color:INK.gold,family:fontScript,align:'center',role:'heading'});
      if(error.message)kit.label(String(error.message),rect(box.x+18,box.y+56,box.width-36,Math.max(38,box.height-130)),{size:15,min:12,align:'center'});
      const two=Boolean(handlers?.onContinue),gap=8,aW=(box.width-28-(two?gap:0))/(two?2:1);
      const retry=kit.button({id:'retry',text:t('重试','Retry'),box:rect(box.x+14,box.y+box.height-58,aW,48),primary:true,onActivate:()=>handlers?.onRetry?.()});
      if(two)kit.button({id:'continue',text:t('先这样玩','Continue'),box:rect(box.x+14+aW+gap,box.y+box.height-58,aW,48),onActivate:()=>handlers.onContinue()});
      retryId=retry.id;focusRetry();
    }else{
      kit.label(t('风雪山神庙','Snow at the Mountain Temple'),rect(cx-width/2,cy-titleH-14,width,titleH),
        {size:56,min:25,weight:600,color:INK.ivory,family:fontScript,role:'heading',align:'center',strokeWidth:1.3});
      const bw=Math.min(300,width*.72),bx=cx-bw/2,by=cy+4;
      kit.panel(rect(bx,by,bw,4),{fill:INK.snow,alpha:.23,border:null,radius:0});
      kit.panel(rect(bx,by,bw*clamp(value,0,1),4),{fill:INK.gold,alpha:1,border:null,radius:0});
      kit.label(t(note),rect(cx-width/2,by+14,width,38),{size:22,min:15,family:fontScript,color:INK.snow,align:'center',strokeWidth:.7,role:'status'});
    }
    setTop();host.requestPublish();
  }
  const stopLayout=host.registerLayout(draw),stopUpdate=host.registerUpdate(dt=>{
    if(ended||closed)return;setTop();
    if(fading>0){fading=Math.max(.0001,fading-dt);layer.alpha=clamp(fading/.9,0,1);
      if(fading<=.0001){ended=true;layer.visible=false;frame?.dispose();frame=null;host.requestPublish();}}
  });
  const loading=host.game.loadTexture(ART).then(next=>{
    lease=next;if(!ended&&!closed)draw();
  }).catch(cause=>{
    // The progress UI still has an ink backing when the optional painting fails.
    console.warn('Loading painting unavailable',cause);
  });
  host.track(loading);draw();
  return {
    get active(){return !ended&&!closed;},
    progress(k,text){if(closed||ended)return;value=clamp(Number(k)||0,0,1);note=text;draw();},
    finish(){
      if(ended||closed)return;error=undefined;handlers=undefined;
      // Release the loading input surface while its existing painting fades.
      host.loading=false;layer.touchChildren=false;fading=.9;host.requestPublish();
    },
    failure(message,{onRetry=()=>location.reload(),onContinue}={}){
      if(closed)return;host.loading=true;ended=false;fading=0;layer.alpha=1;layer.visible=true;layer.touchChildren=true;
      error={message:String(message??'')};handlers={onRetry,onContinue};
      if(host.retireScreensForFailure&&!retiring){
        retiring=Promise.resolve(host.retireScreensForFailure()).catch(cause=>console.warn('Failed screen teardown',cause))
          .finally(()=>{retiring=null;focusRetry();});
        host.track(retiring);
      }
      draw();
    },
    dispose(){if(closed)return;closed=true;host.loading=false;stopLayout();stopUpdate();frame?.dispose();layer.dispose();host.requestPublish();}
  };
}
