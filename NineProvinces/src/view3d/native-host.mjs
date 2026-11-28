// One native Play host owns flat interface, input and the single clock which
// drives the borrowed, independently configured World3D renderer.
import {play3dAttached} from '@egret/engine/webgl2/world3d';
import {createUiScreenStack} from '@egret/engine/ui';
import {createUiSemantics} from '@egret/engine/ui/semantics';
import {createBrowserSemantics} from '@egret/engine/web/semantics';
import {createUiTester} from '@egret/engine/ui/testing';
import {createCanvasParagraphProvider} from '@egret/engine/web/paragraph';
import {createParagraphCache} from '@egret/engine/paragraph';
import {createFrameGate,sceneMapper} from './screen-math.mjs';
import {createNativeRangeSemantics} from '../ui/native-range-semantics.mjs';
import {createMapOcclusionRegistry} from './map-occlusion.mjs';
import {createRealmPerformanceMode} from './native-host-performance.mjs';
import {t} from '../i18n.mjs';

export async function createRealmHost({canvas,owner,scene,camera,frame,onError,performanceOptions,uiParent=canvas.parentElement}) {
  const parent=canvas.ownerDocument.createElement('div');
  parent.className='nativeRealmUi';
  parent.style.cssText='position:absolute;inset:0;overflow:hidden';
  // The transparent Play surface owns all interface draws above World3D.
  if(canvas.parentElement===uiParent)uiParent.insertBefore(parent,canvas.nextSibling);else uiParent.appendChild(parent);
  // The full opening/management lists and map nameplates share this bounded
  // semantic tree. Leave room for both without removing its native limit.
  const {semantics,sliderSemanticMeta}=createNativeRangeSemantics(createUiSemantics({maxNodes:1024}));
  const stack=createUiScreenStack({onError}),layouts=new Set();
  const mapOcclusion=createMapOcclusionRegistry();
  const tester=createUiTester({semantics,screens:stack});
  const gate=createFrameGate(frame),performanceMode=createRealmPerformanceMode(performanceOptions);
  performanceMode.mark('host.attach.begin');
  let game,session,background,paragraphCache,projection,topReserve=0,closed;
  const metrics=()=>{
    const screen=game.screen,safe=game.safe,r=game.canvas.getBoundingClientRect(),scale=r.width/screen.width||1;
    return {screen,safe,scale,portrait:game.orientation==='portrait',tablet:Math.min(r.width,r.height)>=600,tap:44/scale,uiScale:game.uiScale};
  };
  const clientToDesign=(x,y)=>{const p=game.browser.toStage(x,y);return game.fromStage(p.x,p.y);};
  const designToClient=(x,y)=>{
    const r=game.canvas.getBoundingClientRect(),s=game.screen;
    return {x:r.left+(x-s.x)*r.width/s.width,y:r.top+(y-s.y)*r.height/s.height};
  };
  const mapper=()=>sceneMapper(game.screen,game.canvas.getBoundingClientRect(),canvas.getBoundingClientRect());
  try{
    session=await play3dAttached({parent,width:960,height:540,portrait:{width:540,height:960},fit:'expand',
      // The native label atlas shares the host's raster density. Keep the flat
      // interface crisp independently of the quality/resolution of the 3D map.
      pixelRatio:2,uiScale:{min:44/48,max:1},backend:owner.backend,renderMode:'on-demand',audio:false,semantics,onError,...performanceMode.playOptions,
      setup(g){
        game=g;
        background=g.sprite(undefined,g.ui);background.touchEnabled=true;background.touchChildren=false;
        const provider=g.scope.use(createCanvasParagraphProvider(g.browser.scheduleTextWork?{schedule:g.browser.scheduleTextWork}:{}));
        paragraphCache=g.scope.use(createParagraphCache(g.engine.assets,{provider,maxEntries:96,maxPendingJobs:96,maxImageBytes:64*1024*1024}));
        // The native projection names its scene once; keep the host's own
        // accessible name localized without rebuilding its semantics/focus.
        g.canvas.setAttribute('aria-label',t('title'));
        projection=createBrowserSemantics({semantics,canvas:g.canvas,width:g.browser.frame.width,height:g.browser.frame.height});
        g.scope.use(projection);
        const stop=g.browser.onScreenChange(()=>projection.sync(g.browser.frame));g.scope.use({dispose:stop});
      },
      world(){return {renderer:owner.renderer,scene,camera,autoResize:false,onError,...performanceMode.worldOptions,onUpdate(dt){owner.resize(camera,dt);gate.frame(dt);}};},
      arrange(g){
        background.hitArea={...g.screen};
        const current=metrics();for(const fn of layouts)fn(current);
      }
    });
    performanceMode.bind(session);
    performanceMode.mark('host.attach.ready',game.browser.getStartupTiming?.()??null);
  }catch(error){
    performanceMode.dispose();
    try{await stack.dispose();}finally{semantics.dispose();parent.remove();}
    throw error;
  }
  const host={
    game,semantics,sliderSemanticMeta,tester,stack,paragraphCache,background,parent,metrics,clientToDesign,designToClient,mapper,
    ...mapOcclusion,
    performanceSnapshot:()=>performanceMode.snapshot(game),clearPerformance:()=>performanceMode.clear(),markPerformance:performanceMode.mark,
    get view(){return session.view;},get topInset(){return Math.max(0,topReserve)*metrics().scale;},
    reserveTop(n){topReserve=Number.isFinite(n)?Math.max(0,n):0;},
    setInputEnabled(on){background.touchEnabled=Boolean(on);parent.inert=!on;if(!on&&game.canvas.ownerDocument.activeElement===game.canvas)game.canvas.blur();},
    addLayout(fn){layouts.add(fn);fn(metrics());return()=>layouts.delete(fn);},
    start(){gate.start();if(session.view)session.view.paused=false;},
    stop(){gate.stop();if(session.view)session.view.paused=true;},
    dispose(){return closed??=Promise.resolve().then(async()=>{
      performanceMode.dispose();gate.stop();layouts.clear();mapOcclusion.clearMapOcclusion();
      try{await stack.dispose();}finally{try{await game.dispose();}finally{semantics.dispose();parent.remove();}}
    });}
  };
  owner.bind(host);
  return host;
}
