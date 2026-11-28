// One native, responsive 2D stage over the unchanged 3D race. There is no menu-sized 3D canvas.
import { DisplayObjectContainer } from '@egret/engine';
import { createWorld3DOverlay } from '@egret/engine/webgl2/world3d';
import { createBrowserHoverInput } from '@egret/engine/web/hover';
import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { createUiTester } from '@egret/engine/ui/testing';

export const UI_LANDSCAPE={width:960,height:540};
export const UI_PORTRAIT={width:420,height:760};
const keyFor={left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown',confirm:'Enter'};

export async function createRallyUiHost(canvas,{lang,label,onError=console.error}={}){
  let host,closed=false,dirty=true,focusStamp='',presentTimer;
  const semantics=createUiSemantics();
  const overlay=await createWorld3DOverlay(canvas,{
    ...UI_LANDSCAPE,portrait:UI_PORTRAIT,fit:'expand',uiScale:{min:44/48,max:1.25},
    blendSpace:'srgb',pixelRatio:2,passThrough:true,renderMode:'on-demand',webgl2PageBatching:'single-page',
    update:()=>host?.tick(),onError
  });
  const game=overlay.game,stage=game.stage,scope=game.scope,keyboard=game.keyboard,pointer=game.pointer;
  const language=lang==='en'||lang==='zh'?lang:(navigator.language?.startsWith('zh')?'zh':'en');
  const projection=createBrowserSemantics({semantics,canvas:overlay.canvas,width:game.frame.width,height:game.frame.height,
    label:label??(language==='en'?'Jinxiu Rally':'锦绣飞车'),onError});
  const hover=game.hover??createBrowserHoverInput({engine:game.engine,scope,canvas:overlay.canvas,
    width:game.frame.width,height:game.frame.height,size:()=>game.frame,onError});
  const raceLayer=scope.use(new DisplayObjectContainer());
  stage.addChild(raceLayer); // Managed menu layers are registered above this persistent racing layer.
  const layouts=new Set(),painters=new Set(),pending=new Set();
  const requestPublish=()=>{dirty=true;};
  function publish(){if(!closed){semantics.publish();dirty=false;}}
  // Repaint the static overlay once after asynchronously prepared labels settle.
  function settlePresentation(){
    clearTimeout(presentTimer);
    presentTimer=setTimeout(()=>{if(!closed&&!pending.size)game.invalidate();},250);
  }
  function track(work){
    const promise=Promise.resolve(work);
    pending.add(promise);
    promise.then(()=>{pending.delete(promise);requestPublish();if(!pending.size)settlePresentation();},cause=>{pending.delete(promise);if(!closed)onError(cause);});
    return promise;
  }
  function addSemantic(definition,owner=scope){
    const item=semantics.add(definition);owner.use({dispose:()=>item.remove()});requestPublish();return item;
  }
  const focus=()=>overlay.canvas.focus({preventScroll:true});
  const blurToScene=()=>{keyboard?.focus(undefined);canvas.focus({preventScroll:true});requestPublish();};
  function command(name,detail={}){
    if(!keyboard)return false;
    if(detail.taken??detail.event?.defaultPrevented)return true;
    if(name==='next'||name==='previous'){
      keyboard.moveFocus(name==='previous'||detail.reverse?'previous':'next',true);requestPublish();return true;
    }
    const key=keyFor[name];if(!key)return false;
    const direction=name!=='confirm';
    // Real keys have already gone through the canvas's native keyboard bridge. A gamepad, or a
    // global shortcut while the scene owns focus, can route through that same logical channel.
    if(detail.source==='keyboard'&&document.activeElement===overlay.canvas){
      if(direction){keyboard.moveFocus(name==='up'||name==='left'?'previous':'next',true);requestPublish();return true;}
      return false;
    }
    if(!keyboard.getSnapshot().focusedId)keyboard.moveFocus('next',true);
    const sample={code:key,key};
    const taken=keyboard.keyDown(sample);keyboard.keyUp(sample);
    if(!taken&&direction)keyboard.moveFocus(name==='up'||name==='left'?'previous':'next',true);
    requestPublish();return taken||direction;
  }
  host={
    overlay,game,stage,scope,semantics,keyboard,pointer,hover,raceLayer,worldCanvas:canvas,canvas:overlay.canvas,
    tester:createUiTester({semantics,update:publish}),
    setScreenStack(screens){host.tester=createUiTester({semantics,update:publish,screens});},
    metrics(){const screen=game.screen;return {screen,safe:screen.safe,scale:screen.scale,portrait:screen.height>screen.width,
      unit:1,tap:48,touch:(navigator.maxTouchPoints??0)>0};},
    addSemantic,requestPublish,publish,track,focus,blurToScene,command,reportError:onError,
    registerLayout(fn){layouts.add(fn);return ()=>layouts.delete(fn);},
    registerPainter(fn){painters.add(fn);return ()=>painters.delete(fn);},
    async ready(){
      for(let tries=0;tries<80;tries++){
        const jobs=[...pending];
        if(jobs.length)await Promise.allSettled(jobs);
        else {await Promise.resolve();if(!pending.size)break;}
      }
      publish();
    },
    tick(){
      const status=keyboard?.getSnapshot(),stamp=status?String(status.focusedId)+'/'+status.focusVisible:'';
      if(stamp!==focusStamp){focusStamp=stamp;for(const paint of [...painters])paint();dirty=true;}
      if(dirty)publish();
    },
    async dispose(){
      if(closed)return;closed=true;clearTimeout(presentTimer);stopScreen();layouts.clear();painters.clear();
      projection.dispose();semantics.dispose();await overlay.dispose();
    }
  };
  const stopScreen=game.onScreenChange(()=>{
    projection.sync(game.frame);
    for(const arrange of [...layouts])arrange();
    requestPublish();
  });
  return host;
}
