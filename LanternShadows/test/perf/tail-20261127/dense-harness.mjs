// Deterministic diagnostic fixture; not natural gameplay or release code.
// Browser payload is installed before entering the diagnostic, optionally after page ready.
export function installDenseClient(){
  if(globalThis.__lanternDenseProfile) return;
  const G=()=>globalThis.__lantern;
  const nativeRandom=Math.random;
  let seed=734,mode='native-on',step=1/60,phase='idle',runId=0,priorRaf=null,rafIndex=0,rows=[],meta=null,renderMeta=null,backpressureMeta=null,admissionMeta=null,retryMeta=null,cpuWindow=null,lastCrowdText='',spanAgg=new Map(),stack=[],issues=[],startedAt=0,castAt=1.2,castTime=null,afterAt=null,observedCast=false,observedFull=false,fullRows=0,geometry=null,warmCount=0,initial=null,finishedAt=0;
  const recording=()=>['baseline','casting','dense','after'].includes(phase);
  const running=()=>phase==='warm'||recording();
  const now=()=>performance.now();
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
  function check(condition,message){if(!condition)throw Error(message);}
  function fail(message){issues.push(String(message));phase='failed';finishedAt=now();Math.random=nativeRandom}
  function markGeometry(){const c=document.querySelector('#stage')||document.querySelector('canvas');const r=c?.getBoundingClientRect();return {viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,canvasCss:r&&[r.x,r.y,r.width,r.height],canvasBacking:c&&[c.width,c.height],backend:G()?.backend,blend:new URL(location.href).searchParams.get("profileBlend")==="linear"?"linear":"srgb"};}
  function begin(name){
    if(!recording())return null;
    const parent=stack[stack.length-1];const token={name,start:now(),children:0,parent,runId,frame:rafIndex};stack.push(token);return token;
  }
  function end(token){
    if(!token||token.runId!==runId)return;
    const endedAt=now(),t=endedAt-token.start;
    if(token.name==="engine.frame.cpu")cpuWindow=[token.start,endedAt];
    if(stack.pop()!==token){issues.push('non-nested span '+token.name);stack=[];return;}
    if(token.parent)token.parent.children+=t;
    if(token.frame!==rafIndex){issues.push('span crossed frame '+token.name);return;}
    const a=spanAgg.get(token.name)||[0,0,0];
    a[0]++;a[1]+=t;a[2]+=Math.max(0,t-token.children);spanAgg.set(token.name,a);
  }
  globalThis.__lanternProfiler={begin,end};
  // Exact float bits and ordered scalar fields; no object key-order/cyclic references, wall clock or rendering measurements.
  const bits=new DataView(new ArrayBuffer(8));
  const actorFields=['kind','id','x','y','vx','vy','facing','grounded','state','time','health','safe','attack','serial','struck','queued','grace','coyote','buffer','cut','dashCooldown','airDash','landing','stride','bare','home','phase','rise','rest','turn','steady','move','last','gone','wait','delay','speed','side','slot','hop','blow','hits','flies'];
  const cloneFields=['id','x','y','vx','vy','facing','grounded','state','time','delay','speed','side','slot','hop','blow','serial'];
  const actFields=['state','time','hairs','tuft','solo','combo','best','timer','falls','wounds','felled','reviveIn','eaten','keen'];
  const crowdFields=['left','wait','blows','casting','casts'];
  function hash64(){
    let a=0x811c9dc5,b=0x9e3779b9;
    const word=n=>{a=Math.imul(a^(n>>>0),0x01000193)>>>0;b=Math.imul(b^(n>>>0),0x85ebca6b)>>>0;};
    function value(v){
      if(typeof v==='number'){word(1);bits.setFloat64(0,v,true);word(bits.getUint32(0,true));word(bits.getUint32(4,true));}
      else if(typeof v==='string'){word(2);word(v.length);for(let i=0;i<v.length;i++)word(v.charCodeAt(i));}
      else if(v===true||v===false){word(v?3:4);}
      else if(v===null)word(5);
      else if(v===undefined)word(6);
      else word(7);
    }
    return {value,hex:()=>a.toString(16).padStart(8,'0')+b.toString(16).padStart(8,'0')};
  }
  function stateDigest(act){
    const exact=hash64(),rounded=hash64(),add=v=>{exact.value(v);const n=typeof v==="number"&&Number.isFinite(v)?Math.round(v*1e6)/1e6:v;rounded.value(n===0?0:n);};
    const fields=(obj,keys)=>{add(!!obj);if(obj)for(const key of keys)add(obj[key]);};
    const actors=(items,keys=actorFields)=>{add(items?.length??0);for(const obj of items??[]){fields(obj,keys);if(obj.target){add(true);fields(obj.target,['kind','id','x','y','state']);}else add(false);}};
    fields(act,actFields);fields(act.crowd,crowdFields);fields(act.hero,actorFields);actors(act.foes);actors(act.clones,cloneFields);actors(act.posts);fields(act.boss,actorFields);
    actors(act.arrows);fields(act.gate,['x','y','barred']);fields(act.resting,['x','y']);
    return {exact:exact.hex(),rounded:rounded.hex()};
  }
  function isCheckpoint(){return recording()&&[1,3,5].some(age=>rows.length===Math.round((castAt+.45+age)/step));}
  // Collect only this page's supported performance entries; times use this
  // page's performance origin, shared with rAF. No browser-wide tracing.
  let observerTypes=[],observers=[],longEntries=[],observerDropped=0;
  function receive(entries){
    for(const e of entries){
      if(e.startTime+e.duration<startedAt || (finishedAt&&e.startTime>finishedAt))continue;
      if(longEntries.length>=800){observerDropped++;continue;}
      const row={type:e.entryType,start:e.startTime,duration:e.duration};
      if(e.entryType==='long-animation-frame'){
        row.renderStart=e.renderStart;row.styleAndLayoutStart=e.styleAndLayoutStart;
        row.blockingDuration=e.blockingDuration;
        row.scripts=Array.from(e.scripts??[]).slice(0,16).map(s=>{
          let file='(unavailable)';
          try{const url=new URL(s.sourceURL,location.href);if(url.origin===location.origin)file=url.pathname;}catch{}
          return {file,fn:s.sourceFunctionName??'',start:s.startTime,duration:s.duration,forcedStyleAndLayoutDuration:s.forcedStyleAndLayoutDuration,pauseDuration:s.pauseDuration,invokerType:s.invokerType};
        });
      }
      longEntries.push(row);
    }
  }
  function startObservers(){
    for(const o of observers)o.disconnect();
    observers=[];observerTypes=[];longEntries=[];observerDropped=0;
    const types=globalThis.PerformanceObserver?.supportedEntryTypes??[];
    for(const type of ['long-animation-frame','longtask']){
      if(!types.includes(type))continue;
      try{const o=new PerformanceObserver(list=>receive(list.getEntries()));o.observe({type,buffered:false});observers.push(o);observerTypes.push(type);}catch{}
    }
  }
  function stopObservers(){
    for(const o of observers){receive(o.takeRecords());o.disconnect();}
    observers=[];
  }
  function frame(data){
    if(!recording())return;
    const g=G(),a=g?.act;if(!a)return;
    const clones=a.clones??[];
    let out=0,minX=Infinity,maxX=-Infinity;
    for(const c of clones){if(c.state!=='wait'){out++;minX=Math.min(minX,c.x);maxX=Math.max(maxX,c.x);}}
    const c=g.crowd(),camera=g.camera()?.center;
    const checkpoint=isCheckpoint();let digest=null;
    if(checkpoint){const t=begin("qa.stateDigest");try{digest=stateDigest(a);}finally{end(t);}}
    const crowdChanged=lastCrowdText!==data.crowdText;lastCrowdText=data.crowdText??"";
    meta={...data,checkpoint,stateDigest:digest?.exact??null,stateDigestRounded:digest?.rounded??null,sampleIndex:rows.length,logicStep:Math.round(a.time*120),rngSeed:seed,crowdChanged,actTime:a.time,clones:clones.length,out,shown:data.shown??null,posedClones:data.posedClones??null,moving:data.moving??null,bones:data.bones??null,carried:c.carried,made:c.made,age:clones.length?7-a.crowd.left:null,left:clones.length?a.crowd.left:null,casts:a.crowd.casts,hero:[a.hero.x,a.hero.y,a.hero.health],camera:[camera?.x,camera?.y],cloneRange:out?[minX,maxX]:null,actState:a.state,screen:g.stage};
  }
  function render(data){if(recording())renderMeta={...data};}
  function backpressure(data){if(recording())backpressureMeta={...data};}
  function admission(data){if(recording())admissionMeta={...data};}
  function retry(data){if(recording())retryMeta={...data};}
  function finalizeFrame(t){
    if(recording()&&meta){
      const row={frame:rafIndex,phase,rafStart:priorRaf,rafEnd:t,rafMs:priorRaf==null?null:t-priorRaf,cpuWindow,...meta,render:renderMeta,backpressure:backpressureMeta,admission:admissionMeta,retry:retryMeta,spans:Object.fromEntries(spanAgg)};
      if(row.clones===100&&row.out===100&&row.shown===100&&row.carried===100&&row.made===100){observedFull=true;fullRows++}
      rows.push(row);
    }
    if(stack.length){issues.push('unfinished span(s) '+stack.map(v=>v.name).join(','));stack=[]}
    meta=null;renderMeta=null;backpressureMeta=null;admissionMeta=null;retryMeta=null;cpuWindow=null;spanAgg=new Map();rafIndex++;priorRaf=t;
  }
  function tick(t){
    try{
      if(running()){
        finalizeFrame(t);
        const g=G(),a=g?.act;
        check(g&&a&&g.playing,'game no longer playing');
        check(a.state==='play','fixture act ended unexpectedly');
        check(!g.paused,'fixture paused');
        check(now()-startedAt<180000,'fixture timeout');
        if(phase==='warm'){
          warmCount=g.crowd().made;
          if(warmCount>=100){
            g.again();
            // Diagnostic only: prevent early death so the same full clone lifetime is sampled.
            // The actual cast, clone movement, hit effects, rendering and expiry are untouched.
            const first=G().act;
            first.hero.safe=12;
            seed=734;
            initial={hero:[first.hero.x,first.hero.y,first.hero.health],stage:G().stage,foes:first.foes.map(f=>[f.kind,f.x,f.y]),posts:first.posts.map(p=>[p.x,p.y]),time:first.time,crowd:G().crowd()};
            phase='baseline';priorRaf=t;spanAgg=new Map();meta=null;
          }
        }else if(phase==='baseline'&&a.time>=castAt){
          a.hairs=30;g.tap('special');phase='casting';
        }else if(phase==='casting'){
          if(a.clones.length===100){observedCast=true;castTime=a.time;phase='dense'}
          else if(a.time>=castAt+3)throw Error('actual special cast failed');
        }else if(phase==='dense'){
          if(a.clones.length===0){
            check(observedCast&&observedFull,'no full rendered 100-clone interval');
            check(a.crowd.casts===1,'expected exactly one cast');
            phase='after';afterAt=a.time;
          }
        }else if(phase==='after'&&a.time>=afterAt+.5){
          finishedAt=now();phase='done';Math.random=nativeRandom;
          // Freeze after the last sample, with no effect on recorded frame data.
          g.pause(true);
        }
      }else{priorRaf=t;rafIndex++}
    }catch(e){fail(e?.message??e);}
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  const quant=(a,p)=>{if(!a.length)return null;const sorted=[...a].sort((x,y)=>x-y);return sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]};
  function stats(a){return {n:a.length,p50:quant(a,.5),p95:quant(a,.95),p99:quant(a,.99),max:a.length?Math.max(...a):null,mean:a.length?a.reduce((s,v)=>s+v,0)/a.length:null}}
  function group(input){
    const keys=[...new Set(input.flatMap(r=>Object.keys(r.spans)))].sort();
    return {frames:input.length,raf:stats(input.map(r=>r.rafMs).filter(Number.isFinite)),spans:Object.fromEntries(keys.map(k=>[k,{count:input.reduce((s,r)=>s+(r.spans[k]?.[0]||0),0),inclusive:stats(input.map(r=>r.spans[k]?.[1]||0)),exclusive:stats(input.map(r=>r.spans[k]?.[2]||0))}])),
      shown:stats(input.map(r=>r.shown).filter(Number.isFinite)),posedClones:stats(input.map(r=>r.posedClones).filter(Number.isFinite)),moving:stats(input.map(r=>r.moving).filter(Number.isFinite)),bones:stats(input.map(r=>r.bones).filter(Number.isFinite)), render:Object.fromEntries(['drawCalls','batchRanges','width','height','commands'].map(k=>[k,stats(input.map(r=>r.render?.[k]).filter(Number.isFinite))]))};
  }
  function start(options={}){
    if(running())throw Error('fixture already running');
    const g=G();check(g&&g.act&&g.backend==='webgl2','game not ready / backend mismatch');
    check(new URL(location.href).searchParams.get('clones')==='100','fixture requires ?clones=100 (prevents adaptive crowd cap/persistence)');
    mode=options.mode??'native-on';check(mode==='native-on','only native-on is measured by the low-overhead probe');
    castAt=options.castAt??1.2;check(Number.isFinite(castAt)&&castAt>=1.2&&castAt<=3.5,'invalid diagnostic cast time');
    step=options.fixedDt??1/60;check(Number.isFinite(step)&&step>0&&step<=.1,'invalid fixed dt');
    runId++;rows=[];issues=[];stack=[];spanAgg=new Map();meta=null;renderMeta=null;backpressureMeta=null;admissionMeta=null;retryMeta=null;cpuWindow=null;lastCrowdText="";observedCast=false;observedFull=false;fullRows=0;castTime=null;afterAt=null;geometry=markGeometry();initial=null;warmCount=0;finishedAt=0;startedAt=now();seed=734;Math.random=random;phase='warm';startObservers();
    // Existing test hook; not a natural player run. This still instantiates rules and scene normally.
    g.begin();
    return status();
  }
  function stop(){if(running()){finishedAt=now();phase="stopped";Math.random=nativeRandom;G()?.pause(true)}return status()}
  function status(){const a=G()?.act;return {phase,done:phase==='done',failed:phase==='failed',mode,active:recording(),fixedDt:running()?step:null,rows:rows.length,warmCount,fullRows,castAt,castTime,afterAt,simTime:a?.time,clones:a?.clones?.length??0,elapsedMs:(finishedAt||now())-startedAt,issues:[...issues]}}
  function result(){
    if(running())throw Error('fixture not completed');
    stopObservers();
    const baseline=rows.filter(r=>r.phase==='baseline'&&r.actTime>=.35&&r.actTime<1.1);
    const dense=rows.filter(r=>r.clones===100&&r.out===100&&r.shown===100&&r.carried===100&&r.made===100&&r.age>=1&&r.age<6.5);
    const full=rows.filter(r=>r.clones===100&&r.out===100&&r.shown===100&&r.carried===100&&r.made===100);
    return {protocol:'lantern-dense-tail/3',intervalOwner:'rafEnd-rafStart follows the preceding recorded engine frame; CPU window timestamps are absolute in this page',fixedDt:step,status:status(),geometry,initial,observerTypes,observerDropped,longEntries,summary:{baseline:group(baseline),dense:group(dense),full:group(full),window:{baselineActSec:[.35,1.1],denseCloneAgeSec:[1,6.5]},counts:{fullRows:full.length,fullPoseRows:full.filter(r=>r.posedClones===100).length,denseRows:dense.length,denseFullPoseRows:dense.filter(r=>r.posedClones===100).length,denseHostRows:dense.filter(r=>r.render&&Number.isFinite(r.render.drawCalls)).length,denseBackpressureRows:dense.filter(r=>r.backpressure).length,allRows:rows.length},firstFullAge:full[0]?.age,lastFullAge:full.at(-1)?.age},rows};
  }
  Object.defineProperty(globalThis,'__lanternDenseProfile',{value:{start,status,result,stop,frame,render,backpressure,admission,retry,get active(){return recording()},get fixedDt(){return running()?step:undefined},get mode(){return mode}}});
}
export const denseClientSource='('+installDenseClient.toString()+')();';
