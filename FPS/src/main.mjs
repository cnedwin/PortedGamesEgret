// One native Play clock advances the existing 3D view, game rules and UI.
import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createUiTester } from '@egret/engine/ui/testing';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { prefersReducedMotion, watchReducedMotion } from '@egret/engine/web/kit';
import { Scene3D, createPerspectiveCamera3D } from '@egret/engine/world3d';
import { loadModels } from './asset-models.mjs';
import { createAudio } from './audio.mjs';
import { createBot } from './bot.mjs';
import { createInput } from './input.mjs';
import { createGame } from './sim.mjs';
import { createStats } from './native-stats.mjs';
import { loadSettings, saveSettings } from './native-settings.mjs';
import { createMenus } from './ui/menus.mjs';
import { createCombatHud } from './ui/hud.mjs';
import { createTouchControls } from './ui/touch.mjs';
import { createView } from './view.mjs';

const gameArea=document.querySelector('#game'), canvas=document.querySelector('#stage'), boot=document.querySelector('#boot');
const params=new URLSearchParams(location.search), useWebGPU=params.get('backend')==='webgpu';
const status={error:'',frames:0,mode:'boot',game:undefined,buildVersion:new URL(import.meta.url).searchParams.get('v')??'development'};
globalThis.__cutoff=status;
const settings=loadSettings(params), semantics=createUiSemantics();
const chinese=()=>settings.lang==='zh';
const reduced=()=>settings.reducedMotion==='reduce'||(settings.reducedMotion!=='normal'&&prefersReducedMotion());
function pageLanguage(){document.documentElement.lang=chinese()?'zh-CN':'en';document.title=chinese()?'断流行动 / Operation Cutoff':'Operation Cutoff / 断流行动';}
pageLanguage();
const backend=await (useWebGPU?import('@egret/engine/webgpu/world3d'):import('@egret/engine/webgl2/world3d'));
// Model loads run concurrently with creation of the native UI and renderer.
const modelsReady=params.get('art')==='original'?Promise.resolve({bundle:null}):loadModels(backend.loadGltfFromUrl3D,{
  strict:true,onProgress({complete,total}){status.assetProgress={complete,total};}
}).then(bundle=>({bundle}),error=>({error}));
let menus,combatHud,input,touchControls,worldView;
let cancelPendingLock=()=>false;
function fail(cause){
  const message=cause?.code==='MODEL_LOAD_FAILED'
    ? (chinese()?'美术资源加载未完成，请检查网络后重试。':'Game art could not finish loading. Check your connection and retry.')
    : (chinese()?'出错了：':'Error: ')+(cause?.message??cause);
  if(status.error)return;
  status.error=String(cause?.stack??cause);status.mode='error';
  if(cause?.code==='MODEL_LOAD_FAILED')status.models={loaded:[],failures:cause.failures};
  input?.setEnabled(false);input?.release();if(worldView)worldView.paused=true;
  combatHud?.setVisible(false);touchControls?.setVisible(false);
  if(menus){menus.setError(message);boot.hidden=true;}else{boot.hidden=false;boot.textContent=message;}
}
async function setup(p){
  const scope=p.scope;
  const projection=createBrowserSemantics({semantics,canvas:p.canvas,width:p.browser.frame.width,height:p.browser.frame.height,label:chinese()?'断流行动':'Operation Cutoff',onError:fail});
  const stopProjection=p.browser.onScreenChange(()=>projection.sync(p.browser.frame));
  scope.use({dispose(){stopProjection();projection.dispose();}});
  const noContextMenu=event=>event.preventDefault();
  gameArea.addEventListener('contextmenu',noContextMenu);
  scope.use({dispose(){gameArea.removeEventListener('contextmenu',noContextMenu);}});
  let worldOptions,game,bot,deployed=false,mode='title',mouseAttempt=0,time=0,endIn=0,view,renderer,focusOn=true,stats,atmosphere,baseFov=settings.fov,statText,lastStats=0,menuWeapon='';
  const SUNLIGHT=[-.72,-.4,-.56],auto=params.get('auto')==='1';
  let deploy=()=>{},resume=()=>{},pause=()=>{},setMode=()=>{},applyQuality=()=>{},openBag=()=>{},closeBag=()=>{};
  const audio=createAudio();audio.setVolume(settings.volume);
  scope.use({dispose:()=>audio.dispose?.()});
  const actions={
    deploy:()=>deploy(),restart:()=>deploy(),resume:()=>resume(),
    selectWeapon(weapon){if(mode==='play'&&['rifle','pistol','marksman'].includes(weapon))menuWeapon=weapon;},
    requestCloseBag(){closeBag();},
    'drag-look'(){if(mode!=='pause'||input.capturePending)return;audio.resume();input.dragLook=true;setMode('play');},
    click(){audio.resume();audio.click();},
    changed(key){
      saveSettings(settings);
      if(key==='quality')applyQuality();
      if(key==='volume')audio.setVolume(settings.volume);
      if(key==='fov')view?.setFov(settings.fov);
      if(key==='lang'){
        pageLanguage();combatHud?.setLanguage(settings.lang);touchControls?.setLanguage(settings.lang);
        p.canvas.setAttribute('aria-label',chinese()?'断流行动':'Operation Cutoff');
      }
      if(key==='reducedMotion'&&view)view.reducedMotion=reduced();
      if(input){input.sensitivity=settings.sensitivity;input.adsSensitivity=settings.adsSensitivity;input.invertY=settings.invertY;}
    },onError:fail
  };
  menus=createMenus(p,gameArea,settings,actions);
  scope.use({dispose:()=>menus.dispose()});
  status.ui={game:p,canvas:p.canvas,semantics,tester:createUiTester({semantics}),menus,ready:()=>Promise.resolve()};
  boot.hidden=true;
  try{
    const rendererReady=useWebGPU
      ? backend.createWebGPURenderer3D({canvas,antialias:true,toneMapping:'aces',onDeviceLost:message=>fail(message||'device lost')})
      : Promise.resolve(backend.createWebGL2Renderer3D({canvas,antialias:true,toneMapping:'aces'}));
    const [created,art]=await p.loading([rendererReady,modelsReady],{label:chinese()?'正在载入场景与美术':'Loading scene and art'});
    renderer=created;scope.use(renderer);
    if(art.error)throw art.error;
    if(art.bundle)scope.use(art.bundle);
    const models=art.bundle?.models??{};
    status.models={loaded:Object.keys(models),failures:art.bundle?.failures??{}};
    status.renderer=renderer;
    const gl=useWebGPU?null:renderer.context,ext=gl?.getExtension('WEBGL_debug_renderer_info');
    status.adapter=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'';
    Object.assign(renderer.postProcess,{bloom:true,bloomThreshold:1.15,bloomIntensity:.4,fxaa:true,saturation:1.04,contrast:1.07,vignette:.28,ssaoRadius:.6,ssaoIntensity:1});
    atmosphere=backend.createAtmosphere3D({fogColor:0xcfb7a2,fogDensity:.0065,fogHeight:0,fogFalloff:.07,shaftIntensity:.5,shaftLength:.7});
    renderer.postProcess.custom=atmosphere.post;
    const scene=new Scene3D(),camera=createPerspectiveCamera3D({fov:settings.fov,near:.03,far:460});
    scene.addChild(camera);status.scene=scene;status.camera=camera;
    // Keep the existing scene and custom rendering configuration, rather than play3d's default lights and preset.
    view=createView(scene,camera,{fov:settings.fov,models});status.view=view;
    view.reducedMotion=reduced();
    scope.use({dispose:watchReducedMotion(value=>{if(!settings.reducedMotion||settings.reducedMotion==='system')view.reducedMotion=value;})});
    stats=createStats(renderer);scope.use(stats);status.stats=stats;
    if(params.get('stats')==='1'){statText=p.text('',{size:14,color:0xa4f5cb,layer:'ui'});p.pin(statText,{left:7,top:7});}
    combatHud=createCombatHud(p,{camera,stage:canvas,settings,actions});status.ui.hud=combatHud;
    input=createInput(p,{gameArea,canLook:()=>!menus.bagOpen,
      onBag(){if(mode==='play'&&!menus.bagOpen)openBag();},
      onPause(reason){if(menus.handleBack())return;pause(reason);},
      onTouch(){mouseAttempt++;menus.setTouch(true);combatHud.setTouch(true);menus.setMouseStatus(null);},
      onMouse(){menus.setTouch(false);combatHud.setTouch(false);if(!auto)pause('released');}
    });
    input.sensitivity=settings.sensitivity;input.adsSensitivity=settings.adsSensitivity;input.invertY=settings.invertY;
    touchControls=createTouchControls(p,input,semantics,settings);status.ui.touch=touchControls;status.input=input;
    menus.setTouch(input.touchMode);combatHud.setTouch(input.touchMode);
    let wasFullscreen=document.fullscreenElement===gameArea;
    const fullscreenChanged=()=>{
      const current=document.fullscreenElement===gameArea;
      if(wasFullscreen&&!current&&!input.touchMode&&!auto)pause('released');
      wasFullscreen=current;
    };
    document.addEventListener('fullscreenchange',fullscreenChanged);
    scope.use({dispose(){document.removeEventListener('fullscreenchange',fullscreenChanged);}});
    applyQuality=()=>{
      const high=settings.quality==='high',low=settings.quality==='low',off=name=>params.get(name)==='0';
      renderer.postProcess.enabled=!low&&!off('post');
      renderer.postProcess.ssao=high&&!off('ssao');
      renderer.shadowsEnabled=!low&&!off('shadows');
      view.setShadowSize(high?2048:1024);
      view.setReflections(!low&&!off('reflect'));
      focusOn=high&&!off('dof');
      renderer.tiledLights=params.get('lights')!=='near';
      view.setTiledLamps(renderer.tiledLights===true);
      if(!focusOn)renderer.postProcess.dof=false;
    };
    applyQuality();
    function newGame(){
      const seed=Number(params.get('seed'))||(Date.now()%100000)+1;
      game=createGame({seed});menuWeapon='';bot=auto?createBot(game):undefined;view.attach(game);status.game=game;
    }
    setMode=next=>{
      mouseAttempt++;mode=next;status.mode=next;
      menus.show(next==='play'?'none':next);menus.setMouseStatus(null);
      input.setEnabled(next==='play');menus.toggleBag(false);
      combatHud.setVisible(next==='play');combatHud.setTouch(input.touchMode);menus.setTouch(input.touchMode);
      audio.setPaused(next!=='play'&&next!=='title');
      if(next!=='play'){input.dragLook=false;input.release();}
    };
    resume=()=>{
      if(!input||input.capturePending)return;
      audio.resume();
      if(auto||input.touchMode||p.device==='gamepad')return setMode('play');
      if(settings.mouseMode==='drag'){input.dragLook=true;return setMode('play');}
      // Request in the real native control activation; do not run rules until lock is confirmed.
      setMode('pause');menus.setMouseStatus('waiting');
      const attempt=mouseAttempt;
      void input.capture(settings.mouseMode==='raw').then(locked=>{
        if(attempt!==mouseAttempt)return;
        if(locked&&input.locked&&document.hasFocus()&&!document.hidden&&!menus.snapshot().panel)setMode('play');
        else{input.release();menus.setMouseStatus('failed');}
      });
    };
    // A real inventory is an interactive native view: give it the cursor and
    // prevent menu contacts from becoming gameplay input. Rules keep running
    // exactly as before while the bag is open; resume requests lock again from
    // the actual Close/weapon control gesture, with the existing retry path.
    openBag=()=>{if(mode!=='play'||menus.bagOpen)return;input.setEnabled(false);input.release();menus.toggleBag(true);};
    closeBag=()=>{if(mode!=='play'||!menus.bagOpen)return;menus.toggleBag(false);resume();};
    deploy=()=>{if(!view||!input||input.capturePending)return;if(deployed)newGame();deployed=true;combatHud.reset();endIn=0;resume();};
    cancelPendingLock=()=>{
      if(!input.capturePending)return false;
      mouseAttempt++;input.release();menus.setMouseStatus('released');return true;
    };
    pause=reason=>{
      if(!(mode==='play'&&game.state!=='dead'&&game.state!=='won')&&!input.capturePending)return;
      setMode('pause');menus.setMouseStatus(reason);
    };
    newGame();

    // Existing picture response and rule update order.
    const BASE={saturation:1.04,contrast:1.07,vignette:.28};
    renderer.postProcess.dofRadius=0;
    let focus=30,focusIn=0,hurt=0,deadFor=0;
    function flinch(amount){hurt=Math.min(1.2,hurt+.25+amount/35);}
    function grade(dt){
      const post=renderer.postProcess,player=game.player,playing=mode==='play';
      hurt=Math.max(0,hurt-dt*1.4);
      deadFor=playing&&game.state==='dead'?deadFor+dt:0;
      const low=playing?Math.max(0,1-player.health/45):0,gone=Math.min(1,deadFor/1.5);
      post.saturation=BASE.saturation*(1-Math.min(.9,low*.55+hurt*.25+gone*.9));
      post.vignette=BASE.vignette+low*.3+hurt*.3+gone*.35;
      post.contrast=BASE.contrast+hurt*.12;
      if(!focusOn)return;post.dof=true;
      if(!playing){
        post.dofFocus=.4;post.dofRange=.2;
        post.dofRadius+=((mode==='title'?0:5)-post.dofRadius)*Math.min(1,dt*6);return;
      }
      focusIn-=dt;if(focusIn<=0){focusIn=.12;focus+=(Math.max(1.5,game.sightDistance())-focus)*.5;}
      post.dofFocus=focus;post.dofRange=Math.max(2.5,focus*(1.1-.45*player.aim));
      post.dofRadius+=(player.aim*3.2+hurt*3+low*1.6+gone*5-post.dofRadius)*Math.min(1,dt*10);
    }
    const STEP=1/60;
    function frame(dt){
      stats.begin();status.frames++;
      if(status.frames===1&&auto)queueMicrotask(deploy);
      dt=Math.min(dt,.1);time+=dt;
      if(mode==='play'&&dt>1e-5){
        const record=bot?bot.think(dt):input.sample(dt);
        if(mode==='play'){
          if(!menus.bagOpen&&menuWeapon){record.weapon=menuWeapon;menuWeapon='';}
          if(record.weapon==='swap'||record.weapon==='next'||record.weapon==='previous'){
            const order=['rifle','pistol','marksman'],at=order.indexOf(game.player.weapon);
            record.weapon=order[(at+(record.weapon==='previous'?order.length-1:1))%order.length];
          }
          for(let left=dt;left>1e-5;left-=STEP){
            game.update(Math.min(STEP,left),record);
            record.lookYaw=record.lookPitch=0;record.firePressed=false;record.weapon='';
          }
          for(const event of game.events){
            if(event.type==='playerHit')flinch(event.amount);
            view.handle(event,game);combatHud.handle(event);audio.handle(event,game);
          }
          game.events.length=0;
          if(game.state==='dead'||game.state==='won'){
            endIn+=dt;
            if(endIn>(game.state==='dead'?1.8:4)){
              if(game.state==='dead')menus.setDead(game);else menus.setDebrief(game);
              setMode(game.state==='dead'?'dead':'debrief');
            }
          }
        }
      }
      stats.lap('rules');
      camera.fov=baseFov;
      view.update(mode==='pause'?0:dt,game,mode==='title'?'title':'play',time);
      baseFov=camera.fov;
      // Same documented keepWidthBelow projection for the retained low-level Camera3D, not a changed game rule.
      if(camera.aspect<1)camera.fov=Math.min(170,2*Math.atan(Math.tan(baseFov*Math.PI/360)/camera.aspect)*180/Math.PI);
      if(mode!=='title'){
        const player=game.player;
        combatHud.update(game,dt,{x:player.x,y:player.y+player.eye,z:player.z,yaw:player.yaw,pitch:player.pitch+player.kick,fov:camera.fov,aspect:camera.aspect});
      }
      menus.updateBag(game);
      touchControls.setVisible(mode==='play'&&input.touchMode&&!menus.bagOpen);touchControls.update();
      if(statText&&time-lastStats>=.25){
        lastStats=time;statText.text=Math.round(stats.fps)+' FPS | '+stats.average.frame.toFixed(1)+' ms | '+stats.drawCalls+' draws';
      }
      atmosphere.update(camera,SUNLIGHT);audio.update(dt,game,view.helicopter,mode);grade(dt);view.renderReflection(renderer);
      stats.lap('view');stats.end(game.aliveCount());
    }
    stats.measure=options=>renderer.measureFrame?.(()=>{view.renderReflection(renderer);renderer.render(scene,camera);},options);
    menus.setBoot({message:chinese()?'正在准备画面…':'Preparing the view…',loaded:0,total:2});
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const pixelRatio=Math.min(typeof devicePixelRatio==='number'?devicePixelRatio:1,Number(params.get('ratio'))||1.5);
    renderer.resizeToDisplaySize(pixelRatio);if(canvas.height>0)camera.aspect=canvas.width/canvas.height;
    status.warmup={startedAt:performance.now()};performance.mark('fps.boot.first-view.start');
    status.warmup.prepared=await view.prepare(renderer);
    menus.setBoot({message:chinese()?'正在上传场景资源…':'Uploading scene resources…',loaded:1,total:2});
    // Native preparation compiles variants; the bounded initial draw still uploads the existing mesh/texture data.
    Object.assign(status.warmup,view.warm(renderer,game),{finishedAt:performance.now()});
    performance.mark('fps.boot.first-view.end');
    menus.hideBoot();setMode('title');
    // Attach the configured world through the public single-clock companion after warmup.
    worldOptions={renderer,scene,camera,maxPixelRatio:Number(params.get('ratio'))||1.5,onUpdate:frame,onError:fail};
  }catch(cause){
    void modelsReady.then(art=>{if(!status.models)art.bundle?.dispose();});fail(cause);
  }
  status.menuBack=()=>{if(mode!=='play')menus.handleBack();};
  // An asset failure keeps the native retry interface active without an attached world.
  return worldOptions;
}
try{
  const session=await backend.play3dAttached({
    parent:gameArea,width:960,height:540,portrait:{width:420,height:760},fit:'expand',
    uiScale:{min:44/48,max:1.25},audio:false,semantics,
    // Independent 2D raster density keeps small labels sharp on ordinary DPR=1 desktops as well.
    backend:useWebGPU?'webgpu':'webgl2',renderMode:'on-demand',pixelRatio:2,
    world:setup,onError:fail,onWarning:warning=>{status.warnings??=[];if(status.warnings.length<50)status.warnings.push(String(warning?.message??warning));},
    update(dt,p){
      try{
        if(p.keys.pressed('Escape','pad:b')&&!cancelPendingLock()&&(status.mode!=='play'||status.ui?.menus.bagOpen)){
          status.ui?.menus.bagOpen?status.ui.menus.handleBack():status.menuBack?.();
        }
      }finally{
        // The native key, mouse and relative-delta snapshot survives every
        // World3D substep of this browser frame, then clears after Play.update.
        input?.endFrame();
      }
    }
  });
  worldView=session.view;
  Object.defineProperty(status,'worldView',{enumerable:true,get:()=>session.view});
}catch(cause){fail(cause);}
