// Original common host adapter for a Play-owned 2D canvas and caller-owned 3D presenters.
// A presentation receipt is an accepted 2D submission followed by Host idle, not a GPU fence.
import { play } from '@egret/engine/play';

const HOOKS=['update','beforeRender','afterFrame','onScreenChange','onActivate','onDeactivate','dispose'];
const RESERVED=['setup','arrange','update','beforeRender','afterFrame','onFrameTiming','onError'];
function aborted(message='Scene or host closed'){
  return new DOMException(message,'AbortError');
}
function checkedCallback(value,name){
  if(value!==undefined&&typeof value!=='function')throw new TypeError(name+' must be a function');
  return value;
}
function synchronous(callback,name,...args){
  if(!callback)return;
  const result=callback(...args);
  if(result&&typeof result.then==='function'){
    void Promise.resolve(result).catch(()=>{});
    throw new TypeError(name+' must return synchronously');
  }
}
function liveState(state){return state==='starting'||state==='ready'}

/**
 * Make one Play clock, one 2D host, and non-overlapping caller-owned scene presenters.
 *
 * setup(host) can create scopes, native UI and a scene; it must not await presentFrame()
 * until the Play clock starts. All scene callbacks except setup are synchronous.
 * An independent 3D output may draw in afterFrame on retained/refused 2D turns.
 * primary.attempted/refused describe a local 2D attempt, not complete paired presentation;
 * use presentFrame's accepted+whenIdle receipt for event barriers, and test strict paired
 * surfaces separately. When a supplied canvas is used, the caller owns its CSS fit.
 */
export async function createGameHost(options,{startPlay=play}={}){
  if(!options || typeof options!=='object' || !options.playOptions || typeof options.playOptions!=='object')
    throw new TypeError('playOptions object required');
  checkedCallback(startPlay,'startPlay');
  const {playOptions,setup,onScreenChange,onFrameTiming,onError}=options;
  for(const name of RESERVED)if(Object.hasOwn(playOptions,name))throw new TypeError('Use game-host callback '+name+', not playOptions');
  if(playOptions.canvas!==undefined&&playOptions.parent!==undefined)throw new TypeError('Choose either caller canvas or engine-owned parent');
  checkedCallback(setup,'setup');checkedCallback(onScreenChange,'onScreenChange');
  checkedCallback(onFrameTiming,'onFrameTiming');checkedCallback(onError,'onError');
  let state='starting',game,setupComplete=false,phase='idle',transitioning=false,
    active,epoch=0,version=0,sequence=0,captured,closePromise;
  const records=new Map(),known=new WeakSet(),waiters=new Set(),screenListeners=new Set();
  const counters={updates:0,afterFrames:0,submitted:0,retained:0,refused:0,backpressure:0,interrupted:0,failed:0,retry:0};

  const canDrive=()=>liveState(state)&&setupComplete&&game?.scope.state==='open';
  const open=()=>{if(!liveState(state)||!game||game.scope.state!=='open')throw aborted('Game host is closed')};
  const noPresentationSwap=()=>{
    if(phase==='beforeRender'||phase==='afterFrame')throw new Error('Cannot switch scene during presentation');
    if(transitioning)throw new Error('Scene transition already active');
  };
  const recordFor=scene=>{
    const record=records.get(scene);
    if(!record||record.retired||record.scope.state!=='open')throw new TypeError('Scene is not a live scene of this host');
    return record;
  };
  function settle(waiter,error,receipt){
    if(!waiters.delete(waiter))return;
    waiter.signal?.removeEventListener('abort',waiter.abort);
    if(error)waiter.reject(error);else waiter.resolve(receipt);
  }
  function rejectWaiters(reason,where=()=>true){
    for(const waiter of [...waiters])if(where(waiter))settle(waiter,reason);
  }
  function invalidate({scene}={}){
    open();
    if(scene!==undefined&&active?.handle!==scene)throw aborted('Scene is not active');
    const next=++version;game.invalidate();return next;
  }
  function presentFrame({signal,scene}={}){
    if(state!=='ready'||game?.scope.state!=='open')return Promise.reject(new Error('Game host clock is not running'));
    if(signal?.aborted)return Promise.reject(aborted('Frame request canceled'));
    try{
      const revision=invalidate({scene}),ownerEpoch=epoch,sceneId=active?.handle.id;
      return new Promise((resolve,reject)=>{
        const waiter={revision,epoch:ownerEpoch,sceneId,resolve,reject,signal,queued:false,abort:undefined};
        waiter.abort=()=>settle(waiter,aborted('Frame request canceled'));
        waiters.add(waiter);
        signal?.addEventListener('abort',waiter.abort,{once:true});
        // Cancellation may have happened between the precheck and registration.
        if(signal?.aborted)waiter.abort();
      });
    }catch(error){return Promise.reject(error)}
  }
  function fail(error){
    if(!liveState(state))return;
    state='failed';captured=undefined;
    active?.activation?.abort(aborted('Game host failed'));
    rejectWaiters(error??new Error('Game host failed'));
    if(onError)onError(error);
  }
  function invoke(record,name,...args){
    if(!record||record.retired||record.scope.state!=='open')return;
    synchronous(record.callbacks[name],'scene.'+name,...args,record.context);
  }
  function leave(record){
    if(active!==record)return;
    try{invoke(record,'onDeactivate')}finally{
      active=undefined;epoch++;
      record.activation?.abort(aborted('Scene deactivated'));
      rejectWaiters(aborted('Scene deactivated'),waiter=>waiter.epoch!==epoch);
    }
  }
  function retireRecord(record,{scopeAlreadyClosing=false}={}){
    if(!record||record.retired)return;
    const errors=[];
    if(active===record){
      try{leave(record)}catch(cause){errors.push(cause)}
    }
    record.retired=true;
    records.delete(record.handle);
    rejectWaiters(aborted('Scene retired'),waiter=>waiter.sceneId===record.handle.id);
    record.scope.signal.removeEventListener('abort',record.abort);
    // The caller owns resources registered in the scene scope. A manual retire
    // calls the descriptor's disposer before ending the scope. If Engine already
    // began closing it, the same cleanup callback still runs once.
    try{synchronous(record.callbacks.dispose,'scene.dispose',record.context)}catch(cause){errors.push(cause)}
    if(!scopeAlreadyClosing){
      try{record.scope.dispose()}catch(cause){errors.push(cause)}
    }
    if(errors.length)throw new AggregateError(errors,'Scene cleanup failed');
  }
  function createScene(callbacks={}){
    open();
    if(!callbacks||typeof callbacks!=='object')throw new TypeError('Scene callbacks must be an object');
    for(const name of HOOKS)checkedCallback(callbacks[name],'scene.'+name);
    const scope=game.engine.createScope(),record={scope,callbacks:{...callbacks},retired:false,handle:undefined,context:undefined,abort:undefined,activation:undefined};
    const handle=Object.freeze({
      id:++sequence,name:callbacks.name??'scene-'+sequence,scope,signal:scope.signal,
      get active(){return active===record&&!record.retired&&scope.state==='open'},
      get activationSignal(){return record.activation?.signal},
      get disposed(){return record.retired||scope.state!=='open'}
    });
    record.handle=handle;
    record.context=Object.freeze({
      host,scene:handle,game,scope,signal:scope.signal,
      get active(){return handle.active},
      get epoch(){return epoch},
      get activationSignal(){return record.activation?.signal},
      invalidate(){return invalidate({scene:handle})},
      presentFrame({signal}={}){return presentFrame({signal,scene:handle})},
      get primary(){
        const current=captured;
        return Object.freeze({
          attempted:current?.epoch===epoch,
          refused:current?.epoch===epoch&&game.browser.getFrameUsage().refusedFrames>current.refusals,
          requestedRevision:current?.epoch===epoch?current.revision:undefined
        });
      }
    });
    record.abort=()=>{
      try{retireRecord(record,{scopeAlreadyClosing:true})}
      catch(error){fail(error)}
    };
    scope.signal.addEventListener('abort',record.abort,{once:true});
    records.set(handle,record);known.add(handle);
    return handle;
  }
  function activateScene(scene,{retirePrevious=false}={}){
    open();noPresentationSwap();
    const next=scene===undefined||scene===null?undefined:recordFor(scene);
    if(next===active)return;
    transitioning=true;
    try{
      const old=active;
      // A scene generation (including the UI-only null presenter) is distinct.
      if(old)leave(old);
      else {epoch++;rejectWaiters(aborted('Presentation generation changed'))}
      if(old&&retirePrevious)retireRecord(old);
      if(next){
        active=next;next.activation=new AbortController();
        invoke(next,'onActivate');
        invoke(next,'onScreenChange');
      }
      invalidate();
    }catch(error){fail(error);throw error}
    finally{transitioning=false}
  }
  function retireScene(scene){
    open();noPresentationSwap();
    const record=records.get(scene);
    if(!record){if(scene&&known.has(scene)&&scene.disposed)return;throw new TypeError('Scene is not a live scene of this host')}
    transitioning=true;
    try{retireRecord(record);invalidate()}
    finally{transitioning=false}
  }
  function onScreen(listener,{signal,immediate=false}={}){
    open();checkedCallback(listener,'screen listener');
    if(!listener)throw new TypeError('screen listener required');
    if(signal?.aborted)return ()=>{};
    let enabled=true;
    const row={listener,remove:undefined};
    const remove=()=>{
      if(!enabled)return;enabled=false;screenListeners.delete(row);
      signal?.removeEventListener('abort',remove);
    };
    row.remove=remove;screenListeners.add(row);
    signal?.addEventListener('abort',remove,{once:true});
    if(signal?.aborted){remove();return remove}
    if(immediate){try{synchronous(listener,'screen listener',game.screen,host)}catch(error){remove();throw error}}
    return remove;
  }
  function arrange(){
    if(!liveState(state)||!game)return;
    invoke(active,'onScreenChange');
    synchronous(onScreenChange,'onScreenChange',game.screen,host);
    for(const row of [...screenListeners])if(screenListeners.has(row))synchronous(row.listener,'screen listener',game.screen,host);
  }
  function driveUpdate(seconds){
    if(!canDrive())return;
    counters.updates++;
    phase='update';
    try{invoke(active,'update',seconds)}
    finally{phase='idle'}
  }
  function prepare(){
    captured=undefined;
    if(!canDrive())return;
    phase='beforeRender';
    try{
      invoke(active,'beforeRender');
      captured={revision:version,epoch,sceneId:active?.handle.id,refusals:game.browser.getFrameUsage().refusedFrames};
    }finally{phase='idle'}
  }
  function present(){
    if(!canDrive())return;
    counters.afterFrames++;
    phase='afterFrame';
    try{invoke(active,'afterFrame')}
    finally{phase='idle'}
  }
  function timing(sample){
    const receipt=captured;
    captured=undefined;
    if(Object.hasOwn(counters,sample.outcome))counters[sample.outcome]++;
    if(state==='ready'&&sample.outcome==='submitted'&&receipt&&receipt.epoch===epoch){
      const eligible=[...waiters].filter(w=>!w.queued&&w.epoch===receipt.epoch&&w.revision<=receipt.revision);
      if(eligible.length){
        for(const waiter of eligible)waiter.queued=true;
        const done=()=>{
          for(const waiter of eligible){
            if(waiter.epoch!==epoch||state!=='ready'){
              settle(waiter,aborted('Frame owner changed'));continue
            }
            settle(waiter,undefined,Object.freeze({
              outcome:'submitted',frameId:sample.id,timingId:sample.id,
              acceptedRevision:receipt.revision,requestedRevision:waiter.revision,sceneId:receipt.sceneId
            }));
          }
        };
        const failed=error=>{for(const waiter of eligible)settle(waiter,error)};
        try{void Promise.resolve(game.browser.host.whenIdle()).then(done,failed)}catch(error){failed(error)}
      }
    }
    // The engine timing hook is observational; user callbacks may not replace
    // receipt processing or throw into the loop.
    if(onFrameTiming){try{synchronous(onFrameTiming,'onFrameTiming',sample,host)}catch{/* observation only */}}
  }
  function clearOwned(){
    const errors=[];
    for(const row of [...screenListeners])row.remove();
    // Deactivate and retire active before closing any suspended presenters.
    const all=active?[active,...[...records.values()].filter(r=>r!==active)]:[...records.values()];
    for(const record of all){try{retireRecord(record)}catch(cause){errors.push(cause)}}
    rejectWaiters(aborted('Game host closed'));
    if(errors.length)throw new AggregateError(errors,'Game host scene cleanup failed');
  }
  function dispose(){
    if(closePromise)return closePromise;
    if(state==='closed')return Promise.resolve();
    state='closing';captured=undefined;rejectWaiters(aborted('Game host closed'));
    closePromise=Promise.resolve().then(async()=>{
      const errors=[];
      try{clearOwned()}catch(error){errors.push(error)}
      try{if(game)await game.dispose()}catch(error){errors.push(error)}
      state='closed';
      if(errors.length)throw new AggregateError(errors,'Game host disposal failed');
    });
    return closePromise;
  }
  const host=Object.freeze({
    get state(){return state},
    get game(){return game},
    get engine(){return game?.engine},
    get scope(){return game?.scope},
    get stage(){return game?.browser.stage},
    get world(){return game?.world},
    get ui(){return game?.ui},
    get canvas(){return game?.canvas},
    get screen(){return game?.screen},
    get safe(){return game?.safe},
    get frame(){return game?.browser.frame},
    get cache(){return game?.browser.staticLayers},
    get renderHost(){return game?.browser.host},
    get activeScene(){return active?.handle},
    get stats(){return Object.freeze({...counters,requestedRevision:version,epoch})},
    createScene,activateScene,retireScene,invalidate,presentFrame,onScreenChange:onScreen,dispose
  });
  try{
    const returned=await startPlay({
      backend:'webgl2',audio:false,transparent:true,staticLayers:true,blendSpace:'linear',renderMode:'on-demand',
      ...playOptions,
      async setup(g){
        game=g;
        // If the underlying Play is closed externally, its own scope cannot leave
        // independent presenters or pending receipts alive.
        g.scope.use({dispose(){
          if(state==='closed')return;
          if(state!=='closing')state='closing';
          try{clearOwned()}finally{state='closed'}
        }});
        await setup?.(host);
        if(!liveState(state))throw aborted('Game host closed during setup');
        setupComplete=true;
      },
      arrange,update:driveUpdate,beforeRender:prepare,afterFrame:present,onFrameTiming:timing,onError:fail
    });
    if(returned!==game||!setupComplete||!liveState(state))throw new Error('Play host did not complete setup');
    state='ready';
    // Ensure a frame requested during setup (before the native loop started)
    // is not accidentally retained from a previous surface.
    invalidate();
    return host;
  }catch(error){
    try{await dispose()}catch(cleanup){throw new AggregateError([error,cleanup],'Game host setup failed')}
    throw error;
  }
}
