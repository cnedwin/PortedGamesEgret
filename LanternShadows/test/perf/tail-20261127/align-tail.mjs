// Offline alignment of owned page diagnostics. No browser, no GPU attribution.
import fs from 'node:fs';
import path from 'node:path';
const read=f=>{const j=JSON.parse(fs.readFileSync(f,'utf8'));return j.result?.rows?j.result:j;};
const finite=x=>Number.isFinite(x);
const dense=r=>r.clones===100&&r.out===100&&r.shown===100&&r.posedClones===100&&r.carried===100&&r.made===100&&r.age>=1&&r.age<6.5;
const quant=(values,p)=>{const a=values.filter(finite).sort((a,b)=>a-b);return a.length?a[Math.min(a.length-1,Math.floor(a.length*p))]:null;};
function stats(values){const a=values.filter(finite);return {n:a.length,p50:quant(a,.5),p95:quant(a,.95),p99:quant(a,.99),max:a.length?Math.max(...a):null};}
const round=x=>finite(x)?Math.round(x*1000)/1000:null;
const inc=(r,name)=>r.spans?.[name]?.[1];
const exc=(r,name)=>r.spans?.[name]?.[2];
const phases=[
  'engine.frame.cpu','engine.clock','engine.frame.update','demo.frame.update','demo.rules.total','demo.rules.step','demo.events',
  'demo.actor.present','demo.spine.advance','demo.fx.scene','demo.fx.update','demo.camera.visual','demo.ui.refresh',
  'engine.ui.views','engine.ui.labels','engine.ui.semantics.publish','engine.ui.semantics.projection',
  'engine.frame.beforeRender','engine.frame.render','engine.frame.capture','engine.webgl2.prepare','engine.webgl2.prepare.geometry',
  'engine.webgl2.prepare.pack','engine.webgl2.prepare.texture','engine.webgl2.prepare.batch','engine.webgl2.submit','engine.webgl2.upload','engine.webgl2.draw','qa.stateDigest'
];
const timing=(r)=>Object.fromEntries(phases.filter(k=>r.spans?.[k]!==undefined).map(k=>[k,round(inc(r,k))]));
const overlaps=(a,b,c,d)=>[a,b,c,d].every(finite)?Math.max(0,Math.min(b,d)-Math.max(a,c)):null;
function rowCard(r,entries){
  const cpuOverlap=r.cpuWindow?overlaps(r.rafStart,r.rafEnd,...r.cpuWindow):null;
  const matches=(entries??[]).map(e=>({...e,overlapMs:round(overlaps(r.rafStart,r.rafEnd,e.start,e.start+e.duration))})).filter(e=>e.overlapMs>0);
  return {sample:r.sampleIndex,logicStep:r.logicStep,actTime:round(r.actTime),age:round(r.age),rafMs:round(r.rafMs),
    rafStart:r.rafStart,rafEnd:r.rafEnd,cpuWindow:r.cpuWindow,cpuOverlapMs:round(cpuOverlap),
    outsideMeasuredEngineWindowMs:cpuOverlap===null?null:round(Math.max(0,r.rafMs-cpuOverlap)),
    admission:r.admission,backpressure:r.backpressure,retry:r.retry,render:r.render,
    bones:r.bones,moving:r.moving,bursts:r.bursts,particlesRequested:r.particlesRequested,particlesAlive:r.particlesAlive,
    crowdChanged:r.crowdChanged,notice:r.notice,combo:r.combo,checkpoint:r.checkpoint,
    spansInclusiveCpuMs:timing(r),longEntries:matches};
}
function summarize(file){
  const data=read(file);
  if(data.dense?.rows&&data.rows===undefined){
    const rows=data.dense.rows,max=rows.reduce((a,r,i)=>r.raf>a.value?{i,value:r.raf}:a,{i:-1,value:-Infinity});
    return {file,protocol:'simple wall-clock sample; no exact CPU interval',status:data.passing,
      sampleStats:stats(rows.map(r=>r.raf)),longRows:rows.flatMap((r,i)=>r.raf>50?[{row:i,previous:rows[i-1],current:r,next:rows[i+1]}]:[]),
      maxRow:max.i,reason:'Simple callback interval precedes current row metadata; frameMs/poseMs are moving averages, not the corresponding CPU phases.'};
  }
  const rows=data.rows??[],full=rows.filter(dense);
  const host=full.filter(r=>r.render),skip=full.filter(r=>r.backpressure);
  const checkpoints=rows.filter(r=>r.checkpoint).map(r=>({sample:r.sampleIndex,logicStep:r.logicStep,age:round(r.age),rngSeed:r.rngSeed,stateDigest:r.stateDigest,stateDigestRounded:r.stateDigestRounded}));
  const long=rows.map((r,i)=>({r,i})).filter(({r})=>r.rafMs>50).map(({r,i})=>({intervalOwner:'row CPU spans belong to the preceding engine frame before rafEnd',row:rowCard(r,data.longEntries),previous:i>0?rowCard(rows[i-1],[]):null,next:i+1<rows.length?rowCard(rows[i+1],[]):null}));
  const focus=rows.filter(r=>Math.abs((r.actTime??-100)-8.76666667)<=.1).map(r=>rowCard(r,data.longEntries));
  const denseTiming={};for(const name of phases)if(full.some(r=>r.spans?.[name]))denseTiming[name]={all:stats(full.map(r=>inc(r,name))),submitted:stats(host.map(r=>inc(r,name))),skipped:stats(skip.map(r=>inc(r,name))),exclusive:stats(full.map(r=>exc(r,name)))};
  return {file,protocol:data.protocol,status:data.status,geometry:data.geometry,observerTypes:data.observerTypes,observerDropped:data.observerDropped,
    samples:rows.length,denseRows:full.length,denseHost:host.length,denseSkipped:skip.length,denseUnknown:full.filter(r=>!r.render&&!r.backpressure&&!r.retry).length,
    denseRaf:stats(full.map(r=>r.rafMs)),denseWithoutCheckpointRaf:stats(full.filter(r=>!r.checkpoint).map(r=>r.rafMs)),denseTiming,
    checkpoints,longFrames:long,aroundPriorLongActTime:focus,
    note:'CPU spans overlap; quantiles are not additive. Outside measured engine interval includes browser scheduling, JS outside spans, composition or GPU waits; it does not identify GPU execution.'};
}
function compare(a,b){
  if(!a.rows||!b.rows)return {compatible:false,why:'both need fixed-step rows'};
  const x=a.rows,y=b.rows;
  const sameGeometry=JSON.stringify(a.geometry?.canvasBacking)===JSON.stringify(b.geometry?.canvasBacking)&&JSON.stringify(a.geometry?.viewport)===JSON.stringify(b.geometry?.viewport)&&a.geometry?.backend===b.geometry?.backend&&a.geometry?.dpr===b.geometry?.dpr;
  const by=new Map(y.map(r=>[r.sampleIndex,r]));
  const fields=['logicStep','rngSeed','clones','out','shown','posedClones','carried','made','casts'];
  const mismatches=[];let matched=0,denseMatched=0,checkpointMatches=0;
  for(const r of x){
    const t=by.get(r.sampleIndex);if(!t){mismatches.push({sample:r.sampleIndex,reason:'missing'});continue;}
    const changed=fields.filter(k=>r[k]!==t[k]);
    if(r.stateDigest&&t.stateDigest&&r.stateDigest!==t.stateDigest)changed.push('exact state checkpoint');
    if(changed.length)mismatches.push({sample:r.sampleIndex,fields:changed,actTime:[r.actTime,t.actTime]});
    else {matched++;if(dense(r)&&dense(t))denseMatched++;if(r.stateDigest&&t.stateDigest&&r.checkpoint&&t.checkpoint)checkpointMatches++;}
  }
  const exactCheckpoints=x.filter(r=>r.checkpoint&&r.stateDigest).length;
  return {sameGeometry,fixedDt:[a.fixedDt,b.fixedDt],castAt:[a.status?.castAt??1.2,b.status?.castAt??1.2],
    sampleCounts:[x.length,y.length],matched,denseMatched,checkpoints:[checkpointMatches,exactCheckpoints],
    comparable:sameGeometry&&a.fixedDt===b.fixedDt&&(a.status?.castAt??1.2)===(b.status?.castAt??1.2)&&x.length===y.length&&mismatches.length===0,
    mismatches:mismatches.slice(0,20),mismatchCount:mismatches.length,
    note:'Sparse exact logical hashes plus rowwise progress/count/RNG checks; low probe has no all-frame semantic event or mesh revision proof. A longer castAt fixture is separate.'};
}
const args=process.argv.slice(2),outIndex=args.indexOf('--out'),out=outIndex>=0?args[outIndex+1]:null,files=outIndex>=0?args.filter((_,i)=>i!==outIndex&&i!==outIndex+1):args;
if(!files.length)throw Error('Usage: node align-tail.mjs rawA.json [rawB.json ...] [--out report.json]');
const data=files.map(read),report={generated:new Date().toISOString(),summaries:files.map(summarize),comparisons:data.slice(1).map((v,i)=>({reference:files[0],other:files[i+1],...compare(data[0],v)}))};
if(out)fs.writeFileSync(path.resolve(out),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({summaries:report.summaries.map(s=>({file:s.file,protocol:s.protocol,denseRows:s.denseRows,denseRaf:s.denseRaf,host:s.denseHost,skip:s.denseSkipped,longFrames:s.longFrames?.length,simpleLongRows:s.longRows?.length})),comparisons:report.comparisons},null,2));
