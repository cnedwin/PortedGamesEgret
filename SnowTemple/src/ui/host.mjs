// One responsive native overlay. The World3D canvas is never reconstructed by UI layout.
import { DisplayObjectContainer } from '@egret/engine';
import { createWorld3DOverlay } from '@egret/engine/webgl2/world3d';
import { createBrowserHoverInput } from '@egret/engine/web/hover';
import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { createUiTester } from '@egret/engine/ui/testing';

export async function createSnowUiHost(worldCanvas,{locale,onError=console.error}={}){
  const semantics=createUiSemantics();
  let host,closed=false,dirty=true,keyStamp='';
  const overlay=await createWorld3DOverlay(worldCanvas,{
    width:960,height:540,portrait:{width:480,height:840},fit:'expand',
    uiScale:{min:44/48,max:1.25},blendSpace:'srgb',pixelRatio:2,
    passThrough:true,renderMode:'on-demand',webgl2PageBatching:'single-page',
    update:dt=>host?.tick(dt),onError
  });
  const game=overlay.game,stage=game.stage,scope=game.scope,keyboard=game.keyboard,pointer=game.pointer;
  const projection=createBrowserSemantics({semantics,canvas:overlay.canvas,width:game.frame.width,height:game.frame.height,
    label:locale?.t('风雪山神庙','Snow at the Mountain Temple')??'风雪山神庙',onError});
  const hover=game.hover??createBrowserHoverInput({engine:game.engine,scope,canvas:overlay.canvas,
    width:game.frame.width,height:game.frame.height,size:()=>game.frame,onError});
  const combatLayer=scope.use(new DisplayObjectContainer()),menuLayer=scope.use(new DisplayObjectContainer());
  stage.addChild(combatLayer);stage.addChild(menuLayer);
  const layouts=new Set(),painters=new Set(),updates=new Set(),pending=new Set();
  const requestPublish=()=>{if(!closed)dirty=true;};
  function publish(){if(!closed){semantics.publish();dirty=false;}}
  function track(work){
    const p=Promise.resolve(work);pending.add(p);
    p.then(()=>{pending.delete(p);requestPublish();},cause=>{pending.delete(p);if(!closed)onError(cause);});
    return p;
  }
  function addSemantic(definition,owner=scope){
    const item=semantics.add(definition);owner.use({dispose:()=>item.remove()});requestPublish();return item;
  }
  const register=(set,fn)=>{set.add(fn);return ()=>set.delete(fn);};
  const focus=()=>overlay.canvas.focus({preventScroll:true});
  const blurToScene=()=>{keyboard?.focus(undefined);worldCanvas.focus({preventScroll:true});requestPublish();};
  host={
    overlay,game,stage,scope,semantics,keyboard,pointer,hover,combatLayer,menuLayer,canvas:overlay.canvas,worldCanvas,
    tester:createUiTester({semantics,update:publish}),
    setScreenStack(screens){host.tester=createUiTester({semantics,update:publish,screens});},
    metrics(){const screen=game.screen;return {screen,safe:screen.safe,scale:screen.scale,portrait:screen.height>screen.width,
      touch:(navigator.maxTouchPoints??0)>0,unit:1,tap:48};},
    addSemantic,requestPublish,publish,track,focus,blurToScene,onError,
    syncLocale(){const name=locale?.t('风雪山神庙','Snow at the Mountain Temple')??'风雪山神庙';overlay.canvas.setAttribute('aria-label',name);overlay.canvas.lang=locale?.lang==='en'?'en':'zh-CN';requestPublish();},
    registerLayout:fn=>register(layouts,fn),
    registerPainter:fn=>register(painters,fn),
    registerUpdate:fn=>register(updates,fn),
    async ready(){
      for(let tries=0;tries<80;tries++){
        const jobs=[...pending];
        if(jobs.length)await Promise.allSettled(jobs);
        else{await Promise.resolve();if(!pending.size)break;}
      }
      publish();
    },
    tick(dt){
      for(const update of [...updates])update(dt);
      const s=keyboard?.getSnapshot(),stamp=s?String(s.focusedId)+'/'+s.focusVisible:'';
      if(stamp!==keyStamp){keyStamp=stamp;for(const paint of [...painters])paint();dirty=true;}
      if(dirty)publish();
    },
    async dispose(){
      if(closed)return;closed=true;stopScreen();layouts.clear();painters.clear();updates.clear();
      projection.dispose();semantics.dispose();await overlay.dispose();
    }
  };
  const stopScreen=game.onScreenChange(()=>{projection.sync(game.frame);for(const layout of [...layouts])layout();requestPublish();});
  return host;
}
