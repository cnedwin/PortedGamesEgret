// Single persistent 2D overlay, native semantic tree and 3D screen-marker layer.
import { DisplayObjectContainer } from '@egret/engine';
import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createUiTester } from '@egret/engine/ui/testing';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { createBrowserHoverInput } from '@egret/engine/web/hover';
import { TEXT } from './data.mjs';
import { createTextTable } from '@egret/engine/kit';
import { createMenus } from './ui/menus.mjs';
import { createPlayHud } from './ui/play-hud.mjs';
import { createTouchUi } from './ui/touch.mjs';
import { createJellyMarkers } from './ui/markers.mjs';

const canvasName=lang=>lang==='zh'?'果冻熊猫：WASD 移动，鼠标转视角，空格跳跃，Ctrl 或 Q 下砸，Shift 或 E 翻滚。':'Jelly Pandas: WASD move, mouse look, Space jump, Ctrl or Q slam, Shift or E roll.';
const chooseLang=lang=>lang==='zh'||lang==='en'?lang:(navigator.language??'en').toLowerCase().startsWith('zh')?'zh':'en';

export async function createHud(overlay,{canvas,input,camera,lang,onError,onTitleLayout,onFailureReady}) {
  const game=overlay.game,scope=game.scope,semantics=createUiSemantics();
  let language=chooseLang(lang),needsPublish=true,disposed=false,play,touch,menus,atlasError,atlas;
  const table=createTextTable({languages:Object.fromEntries(['en','zh'].map(lang=>[lang,Object.fromEntries(Object.entries(TEXT).map(([key,value])=>[key,value[lang]]))])),language,fallback:'en'});
  const locale={
    get lang(){return language;},zh:()=>language==='zh',
    t:(key)=>table.text(key),name:(def)=>def?.[language]??def?.en??'',
    describe:(def)=>(language==='zh'?def?.dzh:def?.den)??'',
    setLang(next){
      if(next!=='zh'&&next!=='en'||language===next)return;
      language=next;table.setLanguage(next);updateDocumentLanguage();play?.localize();touch?.refreshLanguage?.();mark();
    },
  };
  function updateDocumentLanguage(){
    document.documentElement.lang=locale.zh()?'zh-CN':'en';
    canvas.setAttribute('aria-label',canvasName(language));
    overlay.canvas.setAttribute('aria-label',locale.zh()?'果冻熊猫游戏界面':'Jelly Pandas game interface');
    document.title=locale.zh()?'果冻熊猫':'Jelly Pandas';
  }
  updateDocumentLanguage();
  const projection=createBrowserSemantics({semantics,canvas:overlay.canvas,width:game.screen.width,height:game.screen.height,
    label:locale.zh()?'果冻熊猫游戏界面':'Jelly Pandas game interface',onError});
  scope.use({dispose:()=>projection.dispose()});scope.use({dispose:()=>semantics.dispose()});
  const root=game.stage.addChild(scope.use(new DisplayObjectContainer()));
  const playRoot=root.addChild(scope.use(new DisplayObjectContainer()));
  const touchRoot=root.addChild(scope.use(new DisplayObjectContainer()));
  const markers=createJellyMarkers(document.querySelector('#scene-markers'),camera);
  scope.use({dispose:()=>markers.dispose()});
  // World3DOverlay currently has no hover option; use the engine's existing browser hover adapter.
  const hover=game.hover??createBrowserHoverInput({engine:game.engine,scope,canvas:overlay.canvas,width:game.screen.width,height:game.screen.height,size:()=>game.screen,onError});
  function mark(){needsPublish=true;}
  function publish(force=false){
    if(disposed||(!needsPublish&&!force))return;
    needsPublish=false;
    const previous=semantics.snapshot;
    const next=semantics.publish();
    if(force||previous!==next)projection.sync({width:game.screen.width,height:game.screen.height});
  }
  const onChanged=()=>{mark();game.invalidate();};
  const focusCanvas=()=>overlay.canvas.focus?.({preventScroll:true});
  try{atlas=await game.loadTexture(new URL('../assets/panda-roster.webp',import.meta.url).href);}
  catch(error){atlasError=error;}
  // Menus are created even when the roster resource failed; retry remains an engine control.
  menus=await createMenus(game,{semantics,atlas,locale,hover,onError,onTitleLayout,
    getTouchMode:()=>input.touchMode,getGamepadMode:()=>!!input.gamepadMode,onChanged,focusCanvas});
  const failure=(cause)=>{
    play?.hide();touch?.setActive(false);markers.setVisible(false);
    menus.showFailure(cause,()=>location.reload());focusCanvas();onChanged();
  };
  onFailureReady?.(failure);
  if(!atlasError){
    play=await createPlayHud(game,{root:playRoot,atlas,locale,semantics,onChanged,onError});
    touch=await createTouchUi({game,root:touchRoot,semantics,t:locale.t,onChanged},input);
    touch?.setActive(false);
  }
  const place=(screen=game.screen)=>{
    play?.layout(screen);touch?.layout(screen);menus?.layout?.(screen);markers.layout(screen,overlay.box);
    projection.sync({width:screen.width,height:screen.height});hover.sync?.();mark();game.invalidate();
  };
  scope.use({dispose:game.onScreenChange(place)});
  const tester=createUiTester({semantics,update:()=>publish(true),...(menus.stack?{screens:menus.stack}:{})});
  let touchMode=input.touchMode,previousRectSnapshot,previousRectScale,protectedRects=[];
  const hud={
    overlay,game,semantics,projection,tester,menus,markers,play,touch,
    get lang(){return locale.lang;},
    get kind(){return menus.kind;},
    get failed(){return !!atlasError;},
    tick(){menus.update?.();publish();},
    flush(){publish(true);},
    showTitle(state,handlers){
      root.visible=false;play?.hide();touch?.setActive(false);markers.setVisible(false);menus.showTitle(state,handlers);focusCanvas();onChanged();
    },
    startPlay(){
      menus.startPlay?.();root.visible=true;play?.start();markers.reset();markers.setVisible(true);onChanged();
    },
    showCards(panda,handlers){touch?.setActive(false);markers.setVisible(false);menus.showCards(panda,handlers);focusCanvas();onChanged();},
    hideCards(){menus.hideCards();markers.setVisible(true);onChanged();},
    showMenu(on,handlers){menus.showMenu(on,handlers);markers.setVisible(!on);if(on){touch?.setActive(false);focusCanvas();}onChanged();},
    showEnd(sim,handlers){touch?.setActive(false);markers.setVisible(false);menus.showEnd(sim,handlers);focusCanvas();onChanged();},
    showFailure:failure,
    handleCommand(command){return menus.handleCommand?.(command)??false;},
    setTouchControls(active,onTouchDevice){
      const changed=touchMode!==onTouchDevice;touchMode=onTouchDevice;
      play?.setTouch(onTouchDevice);touch?.setActive(active);
      if(changed){menus.setTouchMode?.(onTouchDevice);onChanged();}
    },
    update(sim,now,captured){
      play?.update(sim,now,captured);
      const k=overlay.box.scale;
      const snapshot=semantics.snapshot;
      if(snapshot!==previousRectSnapshot||k!==previousRectScale){previousRectSnapshot=snapshot;previousRectScale=k;protectedRects=snapshot.nodes.filter(n=>!n.inert&&(n.id!=='jelly-announcement'||!!n.name)&&(
        ['play-hud','jelly-boss','jelly-announcement','jelly-tricks','jelly-build','touch-move','touch-jump','touch-slam','touch-roll','touch-pause'].includes(n.id)||n.id.startsWith('jelly-party-')
      )).filter(n=>n.bounds.width>0&&n.bounds.height>0).map(n=>({x:n.bounds.x*k,y:n.bounds.y*k,width:n.bounds.width*k,height:n.bounds.height*k}));}
      markers.update(sim,now,protectedRects);
    },
    consume(events,sim,now){play?.consume(events,sim,now);markers.consume(events,now);},
    say(text,now,seconds,kind){play?.say(text,now,seconds,kind);},
    dispose(){disposed=true;menus.dispose?.();touch?.dispose?.();},
  };
  root.visible=false;markers.setVisible(false);place(game.screen);
  if(atlasError)failure(atlasError);
  return hud;
}
