// Compare independent full fixed-step Spine diagnostic blocks. A mismatch is evidence, never auto-normalized away.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

const quant=(values,p)=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?a[Math.min(a.length-1,Math.floor(a.length*p))]:null};
const stats=values=>{const a=values.filter(Number.isFinite);return {n:a.length,p50:quant(a,.5),p95:quant(a,.95),max:a.length?Math.max(...a):null}};
const dense=r=>r.rows.filter(x=>x.age>=1&&x.age<6.5&&x.clones===100&&x.out===100&&x.shown===100&&x.posedClones===100&&x.carried===100&&x.made===100);
const count=(r,key)=>r.reduce((n,x)=>n+(Number(x.spine?.[key])||0),0);
function phaseMetrics(rows){
  const marks=[...new Set(rows.flatMap(x=>Object.keys(x.spine?.timings??{})))];
  return Object.fromEntries(marks.sort().map(k=>[k,stats(rows.map(x=>x.spine?.timings?.[k]??0))]));
}
function hostIntervals(rows){
  let elapsed=0,last=null;const intervals=[];
  for(const r of rows){elapsed+=r.rafMs||0;if(r.render){if(last!==null)intervals.push(elapsed-last);last=elapsed;}}
  return stats(intervals);
}
function block(r,label){
  const issues=[];
  const test=(condition,msg)=>{if(!condition)issues.push(label+': '+msg);};
  test(r.protocol==='lantern-dense-fixed-step/2','wrong protocol');
  test(r.status?.phase==='done','incomplete fixture');
  test(r.fixedDt===1/60,'not full fixed 1/60');
  test(r.status?.issues?.length===0,'harness issues '+JSON.stringify(r.status?.issues));
  const rows=dense(r),s=rows.filter(x=>x.render),k=rows.filter(x=>x.backpressure);
  test(rows.length===330,'expected 330 dense shown+posed100 rows, got '+rows.length);
  test(r.validation?.spineMetaRows===r.rows.length,'missing Spine metadata');
  test(r.validation?.staleSubmitted?.length===0,'submitted pose mismatch/missing check');
  test(r.validation?.submittedRevisionOk===r.validation?.submitted,'not all submitted revisions verified');
  test(s.length>0,'no actual host submission');
  test(s.every(x=>x.revisionOk===true&&x.spine?.pendingEnd===0&&x.spine?.revisionMismatch===0),'dense submitted frame revision mismatch');
  test(r.rows.every(x=>typeof x.stateDigest==='string'&&typeof x.stateDigestRounded==='string'),'missing state digest');
  test(r.rows.every(x=>x.eventDigest!==null&&Number.isFinite(x.eventCount)),'missing event digest/count');
  test(r.validation?.eventCumulativeCount>0,'no actual collected Spine events; event equality not exercised');
  const checks=r.validation?.checkpoints??[];
  test(checks.length===3&&checks.every(c=>c.semanticDigest!==null&&c.semanticRoundedDigest!==null&&c.semanticInstances>0),'missing semantic bone/track checkpoint digest');
  const result={label,mode:r.status?.mode,geometry:r.geometry,rows:rows.length,submitted:s.length,backpressure:k.length,otherSkipped:rows.length-s.length-k.length,raf:stats(rows.map(x=>x.rafMs)),hostIntervals:hostIntervals(rows),cpu:stats(rows.map(x=>x.spans?.['engine.frame.cpu']?.[1]??0)),spineAdvance:stats(rows.map(x=>x.spans?.['demo.spine.advance']?.[1]??0)),spineTimings:phaseMetrics(rows),submittedSpineTimings:phaseMetrics(s),backpressureSpineTimings:phaseMetrics(k),counts:Object.fromEntries(['semanticDeliveries','events','deferred','flushed','dropped','published','revisionChecks','revisionMismatch'].map(key=>[key,count(rows,key)])),validation:r.validation,issues};
  return result;
}
function align(r){
  // Match the deterministic logical tick and clone age ordering, not the wall-time RAF ID.
  const seen=new Map();
  return new Map(r.rows.map(x=>{
    const base=x.logicStep+':'+(x.age===null?'none':Math.round(x.age*120));
    const next=(seen.get(base)||0)+1;seen.set(base,next);
    return [base+':'+next,x];
  }));
}
export function compareSpine(a,b,labelA='A',labelB='B'){
  const blocks=[block(a,labelA),block(b,labelB)];
  const left=align(a),right=align(b);
  const keys=[...left.keys()],onlyA=keys.filter(k=>!right.has(k)),onlyB=[...right.keys()].filter(k=>!left.has(k));
  const differences={stateExact:[],stateRounded:[],events:[],eventsRounded:[],counts:[],semanticCheckpoints:[],semanticExactDiagnostics:[]};
  for(const key of keys){
    const x=left.get(key),y=right.get(key);if(!y)continue;
    if(x.stateDigest!==y.stateDigest)differences.stateExact.push(key);
    if(x.stateDigestRounded!==y.stateDigestRounded)differences.stateRounded.push(key);
    if(x.eventDigest!==y.eventDigest||x.eventCount!==y.eventCount||x.eventCumulativeDigest!==y.eventCumulativeDigest||x.eventCumulativeCount!==y.eventCumulativeCount)differences.events.push(key);
    if(x.eventRoundedDigest!==y.eventRoundedDigest||x.eventCount!==y.eventCount||x.eventRoundedCumulativeDigest!==y.eventRoundedCumulativeDigest||x.eventCumulativeCount!==y.eventCumulativeCount)differences.eventsRounded.push(key);
    if(x.clones!==y.clones||x.shown!==y.shown||x.posedClones!==y.posedClones||x.bones!==y.bones||x.casts!==y.casts||x.spine?.semanticDeliveries!==y.spine?.semanticDeliveries)differences.counts.push(key);
  }
  const checksA=a.validation?.checkpoints??[],checksB=b.validation?.checkpoints??[];
  for(let i=0;i<Math.max(checksA.length,checksB.length);i++){
    const x=checksA[i],y=checksB[i];
    if(!x||!y||x.logicStep!==y.logicStep||x.semanticDigest!==y.semanticDigest||x.semanticRoundedDigest!==y.semanticRoundedDigest||x.semanticInstances!==y.semanticInstances)differences.semanticCheckpoints.push({index:i,a:x,b:y});
    if(x&&y&&x.semanticTickSum!==y.semanticTickSum)differences.semanticExactDiagnostics.push({index:i,exact:[x.semanticDigest,y.semanticDigest],absoluteTickSum:[x.semanticTickSum,y.semanticTickSum]});
  }
  const geometryEqual=JSON.stringify(a.geometry)===JSON.stringify(b.geometry);
  const initEqual=JSON.stringify([a.initial?.hero,a.initial?.foes,a.initial?.posts])===JSON.stringify([b.initial?.hero,b.initial?.foes,b.initial?.posts]);
  const eventsEqual=a.validation?.eventCumulativeDigest===b.validation?.eventCumulativeDigest&&a.validation?.eventCumulativeCount===b.validation?.eventCumulativeCount;
  const roundedEventsEqual=a.validation?.eventRoundedCumulativeDigest===b.validation?.eventRoundedCumulativeDigest&&a.validation?.eventCumulativeCount===b.validation?.eventCumulativeCount;
  const strictPassed=blocks.every(x=>x.issues.length===0)&&geometryEqual&&initEqual&&eventsEqual&&roundedEventsEqual&&!onlyA.length&&!onlyB.length&&Object.entries(differences).filter(([k])=>k!=='semanticExactDiagnostics').every(([,x])=>x.length===0);
  const roundedOnly=differences.stateExact.length>0&&!differences.stateRounded.length;
  return {protocol:'lantern-spine-comparison/1',strictPassed,geometryEqual,initEqual,eventsEqual,roundedEventsEqual,roundedOnly,alignment:{matched:keys.length-onlyA.length,onlyA,onlyB},differences,blocks};
}
export async function compareFiles(files){
  const blocks=await Promise.all(files.map(async file=>JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''))));
  return blocks.slice(1).map((b,i)=>compareSpine(blocks[0],b,'A','block'+(i+2)));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const files=process.argv.slice(2);
  assert(files.length>=2,'Usage: node compare-spine.mjs baseline.json deferred.json [repeat.json]');
  const result=await compareFiles(files);
  console.log(JSON.stringify(result,null,2));
  if(!result.every(x=>x.strictPassed))process.exitCode=1;
}
