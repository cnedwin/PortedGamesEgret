// Same-seed, fresh-run dense-wave comparison. No screenshots during the sampled window.
// Run on the current native UI, or set JELLY_GAME_DIR to the retained old game folder and JELLY_LEGACY=1.
// JELLY_PERF_DIAGNOSTICS=1 opts into #545 CPU/Host observations; compare an uninstrumented run too.
// Frame intervals are CPU/browser scheduling, not GPU timestamps; GL calls are actual API invocations.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { launch, openPage, serve } from '../../tools/lib/browser.mjs';
import { advance } from './screen-route.mjs';
import { chromium } from 'playwright';
const current=resolve(dirname(fileURLToPath(import.meta.url)),'..'),
  game=resolve(process.env.JELLY_GAME_DIR??current),legacy=process.env.JELLY_LEGACY==='1',
  out=resolve(process.env.JELLY_PERF_OUT??join(tmpdir(),'jelly-pandas-perf-'+Date.now())),
  staticKind=process.env.JELLY_PERF_STATIC??'',staticMenu=['1','title','pause','cards','end'].includes(staticKind),detail=process.env.JELLY_PERF_DETAIL==='1',
  frames=Number(process.env.JELLY_PERF_FRAMES??(staticMenu?30:60)),denseTime=Number(process.env.JELLY_DENSE_TIME??285);
if(!Number.isInteger(frames)||frames<20||frames>300||!Number.isFinite(denseTime)||denseTime<60||denseTime>900)throw new Error('Invalid performance fixture length');
const hardware=process.env.JELLY_PERF_HARDWARE==='1',diagnosticsRequested=process.env.JELLY_PERF_DIAGNOSTICS==='1';
const server=await serve({root:game}),browser=hardware?await chromium.launch({
  headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
  args:['--enable-gpu',...(process.platform==='win32'?['--use-angle=d3d11']:[]),'--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required']
 }):await launch(),settings={skin:7,party:1,muted:true,quality:process.env.JELLY_PERF_QUALITY??'medium'};
if(!['high','medium','low'].includes(settings.quality))throw new Error('Invalid visual quality');
const width=Number(process.env.JELLY_PERF_WIDTH??844),height=Number(process.env.JELLY_PERF_HEIGHT??390);
let page;
try{
  page=await openPage(browser,server.url+'?seed=7&lang=en&ratio=1'+(diagnosticsRequested?'&diag=1':''), {width,height,reducedMotion:false,before:async pg=>{
    await pg.addInitScript(({settings,detail})=>{
      localStorage.setItem('jelly-pandas',JSON.stringify(settings));
      const events={},costs={},contexts=new WeakMap();let next=0;
      window.__jellyPerfGL=events;window.__jellyPerfCost=costs;window.__jellyMeasuring=false;
      const names=['texImage2D','texSubImage2D','texImage3D','texSubImage3D','compressedTexImage2D','compressedTexSubImage2D','compressedTexImage3D','compressedTexSubImage3D','texStorage2D','texStorage3D','bufferData','bufferSubData','drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced','drawRangeElements'];
      // Hook the actual methods on each prototype, not an inherited alias (avoids double counting).
      for(const proto of [globalThis.WebGLRenderingContext?.prototype,globalThis.WebGL2RenderingContext?.prototype].filter(Boolean))for(const method of names){
        const d=Object.getOwnPropertyDescriptor(proto,method);if(typeof d?.value!=='function')continue;const original=d.value;
        Object.defineProperty(proto,method,{...d,value:function(...args){
          if(!window.__jellyMeasuring)return original.apply(this,args);
          if(!contexts.has(this))contexts.set(this,this.canvas?.id==='stage'?'3D stage':((this.canvas?.id||this.canvas?.className||'canvas')+' / '+(++next)));
          const label=contexts.get(this),context=events[label]??(events[label]={});context[method]=(context[method]??0)+1;
          if(!detail)return original.apply(this,args);
          const start=performance.now();
          try{return original.apply(this,args);}
          finally{const elapsed=performance.now()-start,cost=costs[label]??(costs[label]={});cost[method]=(cost[method]??0)+elapsed;}
        }});
      }
    },{settings,detail});
  }});
  await page.waitForFunction(legacy=>{
    const j=window.__jellyPandas;
    if(!(j?.frames>1)||j.error)return false;
    // A measured native paragraph can delay the title's first committed semantic tree.
    // The status-only tree is not yet a usable title. Legacy DOM readiness is unchanged.
    return legacy||!!j.ui?.tester&&j.ui.semantics.snapshot.nodes.some(node=>node.name==='Play'&&node.role==='button'&&!node.hidden&&!node.disabled&&!node.inert);
  },legacy,{timeout:90000});
  if(!legacy)await page.evaluate(async()=>{await window.__jellyPandas.ui.menus.ready;});
  if(staticMenu&&legacy)throw new Error('Static overlay measurement needs native UI');
  if(staticKind==='pause'){
    await page.evaluate(()=>window.__jellyPandas.ui.tester.press('button:Play'));await page.keyboard.press('KeyP');
    await page.waitForFunction(()=>window.__jellyPandas.mode==='paused',{}, {timeout:90000});
  }else if(staticKind==='cards'){
    const result=await advance({read:(fn,arg)=>page.evaluate(fn,arg)},120,{fresh:'Play',untilChoice:true});
    if(!result.end.choice)throw new Error('No card fixture reached');
    await page.waitForFunction(()=>window.__jellyPandas.ui.menus.kind==='cards',{}, {timeout:90000});
  }else if(staticKind==='end'){
    await page.setViewportSize({width:320,height:180});
    const result=await advance({read:(fn,arg)=>page.evaluate(fn,arg)},780,{fresh:'Play',sea:true});
    if(result.end.state!=='lost')throw new Error('No natural result fixture reached');
    await page.waitForFunction(()=>window.__jellyPandas.mode==='over',{}, {timeout:120000});await page.setViewportSize({width,height});
  }
  const fixture=staticMenu?await page.evaluate(()=>({state:window.__jellyPandas.mode,menu:window.__jellyPandas.ui.menus.kind,skin:window.__jellyPandas.game.pandas[0].skin,t:window.__jellyPandas.game.t})):await page.evaluate(({legacy,denseTime})=>{
    if(legacy)document.querySelector('.title:not(.hidden) .go').click();
    else window.__jellyPandas.ui.tester.press('button:Play');
    const g=window.__jellyPandas.game,p=g.pandas[0],input={moveX:0,moveZ:0,jump:false,slam:false,roll:false};
    if(g.t!==0||p.skin!==7||g.pandas.length!==1)throw new Error('Replay must start at exact t0, Mint, solo');
    p.human=false;let steps=0;const start=performance.now();
    while(g.state==='play'&&g.t<denseTime){g.update(1/60,input);g.events.length=0;steps++;}
    return {t:g.t,state:g.state,steps,elapsedMs:performance.now()-start,level:g.level,kills:g.kills,enemies:g.aliveCount,hp:p.hp,toys:p.toys.map(t=>[t.id,t.level,t.evo]),charms:[...p.charms]};
  },{legacy,denseTime});
  if(!staticMenu&&(fixture.state!=='play'||fixture.enemies<40))throw new Error('No dense fixture was reached: '+JSON.stringify(fixture));
  // Warm both renderers before collecting. Texture creation/upload on cold opening is measured by separate startup work.
  await page.evaluate(warm=>new Promise(resolve=>{const s=window.__jellyPandas,until=s.frames+warm;function f(){if(s.frames>=until)resolve();else requestAnimationFrame(f);}f();}),staticMenu?30:12);
  const measured=await page.evaluate(({frames,detail,diagnosticsRequested})=>new Promise((resolve,reject)=>{
    const j=window.__jellyPandas,s=j.stats,rows=[],raf=[];let sample,previous,priorGL={},priorCost={};
    const diagnostic=diagnosticsRequested?j.diagnostics:undefined,host=j.ui?.game?.host;
    diagnostic?.reset?.();
    const hostBefore=diagnosticsRequested?host?.getSharedFrameTiming?.()??null:null;
    const started=performance.now();
    const diff=(now,before)=>Object.fromEntries(Object.entries(now).map(([label,calls])=>[label,Object.fromEntries(Object.entries(calls).map(([key,value])=>[key,value-(before[label]?.[key]??0)]))]));
    const begin=s.begin.bind(s),lap=s.lap.bind(s),end=s.end.bind(s);
    let finished=false,rafId,deadline;
    const stop=()=>{finished=true;cancelAnimationFrame(rafId);clearTimeout(deadline);window.__jellyMeasuring=false;s.begin=begin;s.lap=lap;s.end=end;};
    const finish=()=>{
      const ended=performance.now();stop();
      resolve({rows,raf,started,ended,visibility:document.visibilityState,focused:document.hasFocus(),
        gl:window.__jellyPerfGL,glCpu:window.__jellyPerfCost,
        diagnostics:diagnostic?.snapshot?.()??null,hostBefore,
        hostAfter:diagnosticsRequested?host?.getSharedFrameTiming?.()??null:null});
    };
    const onRaf=timestamp=>{if(!finished){raf.push(timestamp);rafId=requestAnimationFrame(onRaf);}};
    s.begin=()=>{const now=performance.now();sample={start:now,frame:previous===undefined?null:now-previous};previous=now;if(detail){sample.glSincePrevious=diff(window.__jellyPerfGL,priorGL);sample.glCpuSincePrevious=diff(window.__jellyPerfCost,priorCost);priorGL=structuredClone(window.__jellyPerfGL);priorCost=structuredClone(window.__jellyPerfCost);}begin();};
    s.lap=key=>{const now=performance.now();sample[key]=now-(sample.mark??sample.start);sample.mark=now;lap(key);};
    s.end=enemies=>{const row=sample,start=performance.now();end(enemies);queueMicrotask(()=>{
      if(finished)return;
      const g=j.game;row.draw=performance.now()-start;
      Object.assign(row,{callbackStartMs:row.start,handoffEndMs:performance.now(),drawCalls:s.renderer.info.drawCalls,triangles:s.renderer.info.triangles,enemies,t:g.t,kills:g.kills,level:g.level,mode:j.mode});
      delete row.start;delete row.mark;rows.push(row);
      if(rows.length>=frames)finish();
    });};
    window.__jellyMeasuring=true;
    rafId=requestAnimationFrame(onRaf);
    deadline=setTimeout(()=>{if(!finished){const message='Performance sample timed out with '+rows.length+' game callbacks and '+raf.length+' RAF timestamps';stop();reject(new Error(message));}},90000);
  }),{frames,detail,diagnosticsRequested});
  const quant=(data,p)=>+(Array.from(data).sort((a,b)=>a-b)[Math.ceil(data.length*p)-1]??0).toFixed(3);
  const metrics=Object.fromEntries(['frame','rules','view','draw','drawCalls','triangles','enemies'].map(key=>{
    const data=measured.rows.map(r=>r[key]).filter(v=>typeof v==='number');
    return [key,{samples:data.length,p50:quant(data,.5),p95:quant(data,.95),max:quant(data,1)}];
  }));
  // Independent RAF timestamps come from the page, not the accepted engine clock.
  const gap=times=>times.slice(1).map((time,i)=>time-times[i]);
  const values=(rows,key)=>rows.map(row=>row[key]).filter(Number.isFinite);
  const distribution=data=>({samples:data.length,p50:data.length?quant(data,.5):null,p95:data.length?quant(data,.95):null,max:data.length?quant(data,1):null,
    mean:data.length?+(data.reduce((a,b)=>a+b,0)/data.length).toFixed(3):null,
    over20:data.filter(v=>v>20).length,over30:data.filter(v=>v>30).length,over50:data.filter(v=>v>50).length});
  metrics.raf=distribution(gap(measured.raf));
  const diagnosticErrors=[],diagnostics={requested:diagnosticsRequested,available:!!measured.diagnostics};
  if(measured.raf.length<2)diagnosticErrors.push('Independent browser RAF cadence unavailable.');
  if(diagnosticsRequested){
    const raw=measured.diagnostics??{},summaries={};
    for(const kind of ['world','view','ui',...(Array.isArray(raw.game)?['game']:[])]){
      const rows=Array.isArray(raw[kind])?raw[kind]:[],outcomes={},phases={};
      for(const row of rows)if(typeof row.outcome==='string')outcomes[row.outcome]=(outcomes[row.outcome]??0)+1;
      for(const key of ['advanceMs','updateMs','decisionMs','hostCheckMs','prepareMs','renderMs','pendingFrames','rulesMs','effectsMs','modelsMs','cameraMs','hudMs','musicMs','reflectionMs']){
        const data=values(rows,key);if(data.length)phases[key]=distribution(data);
      }
      summaries[kind]={count:rows.length,outcomes,phases,callback:distribution(rows.filter(row=>Number.isFinite(row.callbackStartMs)&&Number.isFinite(row.callbackEndMs)).map(row=>row.callbackEndMs-row.callbackStartMs)),raf:distribution(gap(values(rows,'rafTimestampMs')))};
      if(!rows.length&&kind!=='game')diagnosticErrors.push('No '+kind+' timing samples; check the candidate exposes ?diag=1.');
    }
    const world=raw.world??[],view=raw.view??[],ui=raw.ui??[],gameTiming=Array.isArray(raw.game)?raw.game:[],uiByTimestamp=new Map(ui.map(row=>[row.rafTimestampMs,row]));
    diagnostics.loops=summaries;
    diagnostics.alignment={
      worldWithSameRafInUi:world.filter(row=>uiByTimestamp.has(row.rafTimestampMs)).length,
      viewInsideWorldCallback:view.filter(row=>world.some(w=>row.callbackStartMs>=w.callbackStartMs-.15&&row.callbackEndMs<=w.callbackEndMs+.15)).length,
      ...(Array.isArray(raw.game)?{gameInsideViewCallback:gameTiming.filter(row=>view.some(v=>row.callbackStartMs>=v.callbackStartMs-.15&&row.callbackEndMs<=v.callbackEndMs+.15)).length}:{})
    };
    // The raw aligned timestamps remain available; these associations are observation, not causation.
    const aligned=row=>{
      const containing=row&&world.find(w=>row.callbackStartMs>=w.callbackStartMs-.15&&row.callbackStartMs<=w.callbackEndMs+.15);
      const sibling=containing&&uiByTimestamp.get(containing.rafTimestampMs);
      const application=row&&gameTiming.find(g=>row.callbackStartMs>=g.callbackStartMs-.15&&row.callbackStartMs<=g.callbackEndMs+.15);
      return {world:containing??null,ui:sibling??null,...(Array.isArray(raw.game)?{game:application??null}:{})};
    };
    diagnostics.longAcceptedGaps=measured.rows.flatMap((row,index)=>row.frame>20?[{
      frame:row.frame,callbackStartMs:row.callbackStartMs,previous:aligned(measured.rows[index-1]),current:aligned(row)
    }]:[]);
    const before=measured.hostBefore,after=measured.hostAfter;
    if(!before||!after)diagnosticErrors.push('Shared WebGL2 Host timing unavailable; enable measureSharedFrames with ?diag=1.');
    diagnostics.host=before&&after?{
      recentWindowSamples:after.recent.filter(sample=>sample.startMs>=measured.started&&sample.startMs<=measured.ended).length,
      droppedDelta:after.dropped-before.dropped,
      phases:Object.fromEntries(Object.entries(after.totals).map(([name,current])=>[name,{
        count:current.count-(before.totals[name]?.count??0),
        totalMs:current.totalMs-(before.totals[name]?.totalMs??0),
        recentWindow:distribution(after.recent.filter(sample=>sample.phase===name&&sample.startMs>=measured.started&&sample.startMs<=measured.ended).map(sample=>sample.durationMs))
      }]))
    }:null;
  }
  const gpu=await page.evaluate(()=>{const gl=document.querySelector('#stage').getContext('webgl2');if(!gl)throw Error('Comparable benchmark requires an actual WebGL2 renderer');const ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);});
  if(hardware&&(!gpu||/swiftshader|llvmpipe|software/i.test(gpu)))throw new Error('Hardware sample refused: '+gpu);
  const result={game,legacy,hardware,browser:browser.version(),gpu,width,height,settings,fixture,frames,staticMenu,staticKind,detail,backend:'webgl2',metrics,diagnostics,diagnosticErrors,glCalls:measured.gl,glCpu:measured.glCpu,
    timers:[...new Set(measured.rows.map(r=>Math.floor(r.t)))],killsSeen:[...new Set(measured.rows.map(r=>r.kills))],
    note:'frame=accepted engine game-callback gap, raf=independent browser RAF interval. rules/view/draw are CPU phase durations, draw ends in microtask (not GPU time). UI canvas API counts include its actual WebGL draws/uploads. Opt-in diagnostics add observer overhead; matching RAF and enclosing callbacks or Host fence polling does not establish GPU execution or compositor presentation. Hardware mode requires a non-software renderer; neither mode is physical human input nor a GPU timestamp.',
    errors:page.problems};
  await mkdir(out,{recursive:true});await writeFile(resolve(out,'raw.json'),JSON.stringify(measured,null,2)+'\n');await writeFile(resolve(out,'report.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));if(page.problems.length||diagnosticErrors.length)process.exitCode=1;
} finally{await browser.close();await server.close();}
