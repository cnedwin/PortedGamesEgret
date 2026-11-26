import fs from 'node:fs';
const args=process.argv.slice(2),out=args[0],files=args.slice(1);
if(!out||files.length<1)throw Error('Usage: node expiry-summary.mjs report.json raw1.json [raw2...]');
function read(f){const raw=JSON.parse(fs.readFileSync(f,'utf8'));return raw.result?.rows?raw.result:raw;}
const data=files.map(read),phases=['engine.frame.cpu','engine.frame.update','demo.rules.total','demo.rules.step','demo.events','demo.spine.advance','demo.fx.update','engine.frame.render','engine.webgl2.prepare','engine.webgl2.submit'];
const values=r=>Object.fromEntries(phases.map(k=>[k,r.spans?.[k]?.[1]??null]));
const row=(r,entries)=>r?{sampleIndex:r.sampleIndex,logicStep:r.logicStep,actTime:r.actTime,age:r.age,rafMs:r.rafMs,rafStart:r.rafStart,rafEnd:r.rafEnd,cpuWindow:r.cpuWindow,
  clones:r.clones,out:r.out,shown:r.shown,posedClones:r.posedClones,rngSeed:r.rngSeed,bursts:r.bursts,requested:r.particlesRequested,
  burstApiCalls:r.burstApiCalls,expirySites:r.expirySites,expiryRequested:r.expiryRequested,expiryApiCalls:r.expiryApiCalls,particlesAlive:r.particlesAlive,particleDraws:r.particleDraws,
  admission:r.admission,backpressure:r.backpressure,render:r.render?{drawCalls:r.render.drawCalls}:null,timingsMs:values(r),
  overlappingLongEntries:(entries??[]).filter(e=>Number.isFinite(r.rafStart)&&Math.min(e.start+e.duration,r.rafEnd)>Math.max(e.start,r.rafStart)).map(e=>({type:e.type,duration:e.duration,start:e.start,scriptDurations:e.scripts?.map(s=>s.duration)}))}:null;
let issues=[],ref=data[0];
const common=['sampleIndex','logicStep','rngSeed','clones','out','shown','posedClones','carried','made','casts','bones','moving','bursts','particlesRequested','expirySites','expiryRequested'];
const summaries=data.map((b,i)=>{
 if(b.instrumentationRevision!=='expiry-particle-draw-count/1'||b.status?.phase!=='done'||b.status?.issues?.length)issues.push({block:i+1,reason:'incomplete or wrong probe'});
 if(b.rows.length!==ref.rows.length)issues.push({block:i+1,reason:'different row count'});
 if(JSON.stringify(b.geometry)!==JSON.stringify(ref.geometry))issues.push({block:i+1,reason:'different geometry'});
 for(let n=0;n<b.rows.length;n++){const a=ref.rows[n],r=b.rows[n];if(!a)continue;const mismatches=common.filter(k=>a[k]!==r[k]);if(a.stateDigest&&r.stateDigest&&a.stateDigest!==r.stateDigest)mismatches.push('checkpoint logical state');
  if(JSON.stringify(a.particlesAlive)!==JSON.stringify(r.particlesAlive))mismatches.push('particle alive counts');
  if(mismatches.length)issues.push({block:i+1,row:n,mismatches});
 }
 const ix=b.rows.flatMap((r,n)=>r.expirySites>0?[n]:[]);
 if(ix.length!==1)issues.push({block:i+1,reason:'expected single expiry event row',count:ix.length});
 const n=ix[0],r=b.rows[n];
 if(r&&(r.expirySites!==48||r.expiryRequested!==192||r.clones!==0||b.rows[n-1]?.clones!==100))issues.push({block:i+1,reason:'expiry must include original 100→0 and all 48 sites'});
 return {file:files[i],geometry:b.geometry,rows:b.rows.length,dense:b.summary?.counts?.denseRows,expiry:row(r,b.longEntries),preceding:row(b.rows[n-1],[]),following:row(b.rows[n+1],[]),exactCheckpoints:b.rows.filter(r=>r.checkpoint&&r.stateDigest).length};
});
const result={summaries,validation:{issueCount:issues.length,issues:issues.slice(0,30)},limit:'Counts are actual draw() invocations; nonempty means the real geometry construction branch. Event draw counts include any other emission in the same event-dispatch span, while expiryApiCalls is the targeted expiry call alone. No per-particle timers or GPU attribution.'};
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({blocks:summaries.map(s=>({file:s.file,rows:s.rows,dense:s.dense,expiry:s.expiry&&{sample:s.expiry.sampleIndex,sites:s.expiry.expirySites,requested:s.expiry.expiryRequested,apiCalls:s.expiry.expiryApiCalls,draws:s.expiry.particleDraws,alive:s.expiry.particlesAlive,raf:s.expiry.rafMs,events:s.expiry.timingsMs['demo.events'],cpu:s.expiry.timingsMs['engine.frame.cpu']}})),validation:result.validation},null,2));
if(issues.length)process.exitCode=1;
