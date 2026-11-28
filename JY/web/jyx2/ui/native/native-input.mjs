// A game can retain its command contract while using the single Play input
// sample for keyboard and standard controller buttons. No DOM listeners.
const isPad = name => /^(pad:|extra:)/i.test(name);

export function createNativeCommandInput({game, modes, readMode, emit, signal=game.scope.signal,
  claim=()=>false, digital=[], readExtra=()=>[], readAxis=()=>game.keys.axis(),
  threshold=.35, repeatDelay=350, repeatInterval=80}) {
  const keys=game.keys, held=new Map(), blocked=new Set();
  const all=[...new Set(Object.values(modes).flatMap(mode=>mode.bindings.flatMap(binding=>binding.keys)))];
  const keyboard=[...new Set(all.filter(name=>!isPad(name)))];
  const removeClaims=keyboard.map(name=>keys.claim(name,()=>claim(name,readMode())));
  let previousMode, previousExtra=new Set(), analogBlocked=false, awaitNeutral=false, disposed=false;
  const down=(name,extra)=>name.startsWith('extra:')?extra.has(name):keys.down(name);
  const pressed=(name,extra)=>name.startsWith('extra:')?extra.has(name)&&!previousExtra.has(name):keys.pressed(name);
  const same=(a,b)=>Boolean(a&&b&&a.mode===b.mode&&a.owner===b.owner);
  const point=(mode,command,phase,source,reason)=>emit({mode:mode.mode,owner:mode.owner,command,phase,source,reason});
  const drop=(item,reason)=>point(item.mode,item.command,'release',item.source,reason);
  function releaseAll(reason) {
    for(const item of held.values())drop(item,reason);
    held.clear();
  }
  function add(mode,command,source,repeat,now) {
    if(held.has(command))return;
    const item={mode,command,source,repeat,next:now+repeatDelay};
    held.set(command,item);point(mode,command,'press',source);
  }
  function sample(now) {
    if(disposed)return;
    const mode=readMode(), config=mode&&modes[mode.mode], extra=new Set(readExtra(now));
    const axis=readAxis(now), neutral=Math.max(Math.abs(axis.x||0),Math.abs(axis.y||0))<threshold;
    if(!same(mode,previousMode)) {
      if(previousMode) {
        releaseAll('mode-change');
        for (const n of all) if(down(n,extra)||pressed(n,extra))blocked.add(n);
        analogBlocked=!neutral;
      }
      previousMode=mode;
    }
    if(neutral)analogBlocked=false;
    for(const name of blocked)if(!down(name,extra)&&!pressed(name,extra))blocked.delete(name);
    const finish=()=>{previousExtra=extra;};
    if(!config){releaseAll('disabled');finish();return;}
    // Play clears its own physical samples on blur. Do not treat that cleared
    // snapshot as a released controller while the page remains inactive.
    if(awaitNeutral){
      if(neutral&&all.every(name=>!down(name,extra)&&!pressed(name,extra)))awaitNeutral=false;
      finish();return;
    }
    const desired=new Map(), pulses=[];
    for(const binding of config.bindings) {
      const active=binding.keys.filter(name=>!blocked.has(name)&&down(name,extra));
      const edge=binding.keys.filter(name=>!blocked.has(name)&&pressed(name,extra));
      if(active.length&&(held.has(binding.command)||edge.length))desired.set(binding.command,{source:isPad(active[0])?'gamepad':'keyboard',repeat:binding.repeat&&!isPad(active[0])});
      else if(edge.length&&!held.has(binding.command))pulses.push({command:binding.command,source:isPad(edge[0])?'gamepad':'keyboard'});
    }
    if(config.analog && !analogBlocked && (config.analog.allowDigital||
      !digital.some(name=>down(name,extra)||pressed(name,extra)))) {
      const {x=0,y=0}=axis, a=config.analog;
      // Mode-specific cardinal versus two-axis routing remains application policy.
      const horizontal=Math.abs(x)>=Math.abs(y);
      if(Math.abs(x)>=threshold&&(a.diagonal||horizontal))desired.set(x<0?a.left:a.right,{source:'gamepad',repeat:false,analog:true});
      if(Math.abs(y)>=threshold&&(a.diagonal||!horizontal))desired.set(y<0?a.up:a.down,{source:'gamepad',repeat:false,analog:true});
    }
    // Releases precede replacement presses, so a held direction cannot survive
    // a mode change or the first neutral input.
    for(const [code,item] of held) if(!desired.has(code)){held.delete(code);drop(item,'release');}
    const ordered=[...desired];
    if(config.gamepadOrder){
      // Retain the legacy controller sample order (stick first, then mapped
      // digital buttons). Un-keyed sources remain deterministic and independent.
      const rank=([code,item])=>item.analog?-1:config.gamepadOrder.includes(code)?config.gamepadOrder.indexOf(code):Infinity;
      const padEntries=ordered.filter(([,item])=>item.source==='gamepad').sort((a,b)=>rank(a)-rank(b));
      let index=0;
      for(let i=0;i<ordered.length;i++)if(ordered[i][1].source==='gamepad')ordered[i]=padEntries[index++];
    }
    for(const [code,item] of ordered){
      if(!same(mode,readMode())){releaseAll('mode-change');finish();return;}
      if(!held.has(code))add(mode,code,item.source,item.repeat,now);
      else {
        const entry=held.get(code);
        if(entry.repeat&&now>=entry.next){entry.next=now+repeatInterval;point(mode,code,'repeat',entry.source);}
      }
    }
    for(const item of pulses){
      if(!same(mode,readMode())){releaseAll('mode-change');finish();return;}
      point(mode,item.command,'press',item.source);
      point(mode,item.command,'release',item.source,same(mode,readMode())?'release':'mode-change');
    }
    finish();
  }
  function suspend(reason='suspended') {
    releaseAll(reason);
    for(const name of all)if(down(name,previousExtra)||pressed(name,previousExtra))blocked.add(name);
    analogBlocked=true;
    awaitNeutral=true;
  }
  function dispose(){
    if(disposed)return;disposed=true;suspend('disposed');for(const remove of removeClaims)remove();
    signal?.removeEventListener('abort',dispose);
  }
  signal?.addEventListener('abort',dispose,{once:true});
  if(signal?.aborted)dispose();
  return {sample,suspend,dispose,get held(){return [...held.keys()]},get mode(){return previousMode?.mode}};
}

// World clicks are a real engine-routed target behind named interface controls.
// Capture only the primary-button fact from the existing browser pointer
// channel: Play's activation carries its stage point but not the begin bitmask.
export function attachStageTap(game,node,onTap,{signal=game.scope.signal}={}) {
  const input=game.browser.pointer, primary=new Map();
  if(!input?.observe)throw new Error('Native browser pointer is required');
  const detach=input.observe(({contact,kind})=>{
    const {pointerId,pointerType}=contact.session;
    if(kind==='begin')primary.set(pointerId,pointerType!=='mouse'||(contact.buttons&1)!==0);
    else if(kind==='cancel'||kind==='end')primary.delete(pointerId);
  });
  game.onTap(node,event=>{
    if(signal?.aborted||event.source==='semantic'||!primary.get(event.pointerId))return;
    event.stopPropagation();onTap({x:event.stageX,y:event.stageY,source:event.source});
  });
  signal?.addEventListener('abort',detach,{once:true});
  return detach;
}
