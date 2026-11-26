import fs from 'node:fs';
const args=process.argv.slice(2),pattern=args[0],out=args[1],files=args.slice(2);
if(!/^[AB]+$/.test(pattern)||pattern.length!==files.length)throw Error('Usage: node paired-points.mjs ABBA report.json raw1 ... rawN');
const read=f=>{const j=JSON.parse(fs.readFileSync(f,'utf8'));return j.result?.rows?j.result:j;};
const blocks=files.map(read),metric=(r,key)=>key==='raf'?r.rafMs:r.spans?.[key]?.[1];
const full=r=>r.clones===100&&r.out===100&&r.shown===100&&r.posedClones===100&&r.carried===100&&r.made===100&&r.age>=1&&r.age<6.5;
const fields=['sampleIndex','logicStep','rngSeed','clones','out','shown','posedClones','carried','made','casts','bones','moving'];
const stats=a=>{const q=a.filter(Number.isFinite).sort((a,b)=>a-b),at=p=>q.length?q[Math.min(q.length-1,Math.floor(q.length*p))]:null;return {n:q.length,p50:at(.5),p95:at(.95),p99:at(.99),max:q.at(-1)??null,mean:q.length?q.reduce((x,y)=>x+y,0)/q.length:null};};
const dense=blocks.map(b=>b.rows.filter(full)),first=blocks[0],baseGeom=JSON.stringify(first.geometry);
let mismatches=[],stateChecks=0,eventChecks=0,revisionChecks=0;
for(let k=0;k<blocks.length;k++){
 const b=blocks[k];
 if(JSON.stringify(b.geometry)!==baseGeom)mismatches.push({block:k+1,reason:'geometry differs'});
 if(b.status?.phase!=='done'||b.status?.issues?.length)mismatches.push({block:k+1,reason:'incomplete or issues'});
 if(b.rows.length!==first.rows.length||dense[k].length!==dense[0].length)mismatches.push({block:k+1,reason:'row count'});
 for(let i=0;i<b.rows.length;i++){
   const a=first.rows[i],d=b.rows[i];if(!a)continue;
   const changed=fields.filter(f=>a[f]!==d[f]);
   if(a.stateDigest&&d.stateDigest){stateChecks++;if(a.stateDigest!==d.stateDigest)changed.push('stateDigest');}
   if(a.eventCumulativeDigest&&d.eventCumulativeDigest){eventChecks++;if(a.eventCumulativeDigest!==d.eventCumulativeDigest||a.eventCumulativeCount!==d.eventCumulativeCount)changed.push('eventCumulative');}
   if(d.render&&d.revisionOk!==undefined){revisionChecks++;if(d.revisionOk!==true)changed.push('stale mesh');}
   if(changed.length)mismatches.push({block:k+1,row:i,changed});
 }
}
const maps=dense.map(rows=>new Map(rows.map(r=>[r.sampleIndex,r])));
const common=dense[0].filter(r=>maps.every(m=>m.get(r.sampleIndex)?.render)).map(r=>r.sampleIndex);
const keys=['raf','engine.frame.cpu','demo.spine.advance','engine.frame.capture','engine.webgl2.prepare','engine.webgl2.prepare.geometry','engine.webgl2.prepare.pack','engine.webgl2.submit','engine.webgl2.draw'];
const per=blocks.map((b,i)=>({label:pattern[i],file:files[i],rows:b.rows.length,dense:dense[i].length,submitted:dense[i].filter(r=>r.render).length,skipped:dense[i].filter(r=>r.backpressure).length,
 denseRaf:stats(dense[i].map(r=>r.rafMs)),longDense:dense[i].filter(r=>r.rafMs>50).map(r=>({sample:r.sampleIndex,actTime:r.actTime,age:r.age,rafMs:r.rafMs,
  cpu:metric(r,'engine.frame.cpu'),spine:metric(r,'demo.spine.advance'),prepare:metric(r,'engine.webgl2.prepare'),geometry:metric(r,'engine.webgl2.prepare.geometry'),submit:metric(r,'engine.webgl2.submit'),draw:metric(r,'engine.webgl2.draw'),
  bursts:r.bursts,crowdChanged:r.crowdChanged,admission:r.admission,render:r.render})),
 common:Object.fromEntries(keys.map(key=>[key,stats(common.map(ix=>metric(maps[i].get(ix),key)))]))}));
const grouped={};for(const label of new Set(pattern))grouped[label]=Object.fromEntries(keys.map(key=>[key,stats(common.flatMap(ix=>maps.flatMap((m,i)=>pattern[i]===label?[metric(m.get(ix),key)]:[])))]));
const deltas={};if(pattern.includes('A')&&pattern.includes('B'))for(const key of keys){const byLabel=(ix,l)=>maps.flatMap((m,i)=>pattern[i]===l?[metric(m.get(ix),key)]:[]).filter(Number.isFinite),mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;const values=common.map(ix=>mean(byLabel(ix,'B'))-mean(byLabel(ix,'A')));deltas[key]={...stats(values),improved:values.filter(v=>v<0).length,worse:values.filter(v=>v>0).length,unit:'B minus A, matched common submitted sample (wall ms)'};}
const report={pattern,commonHostPoints:common.length,firstDense:common[0],lastDense:common.at(-1),validation:{mismatchCount:mismatches.length,mismatches:mismatches.slice(0,20),stateChecks,eventChecks,revisionChecks},per,grouped,deltas,limitations:'Common host subset is an intersection selected for comparability, not the entire user-facing cadence distribution. CPU wall time includes synchronous driver waits; no GPU execution or presentation measurement.'};
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({pattern,commonHostPoints:report.commonHostPoints,validation:report.validation,per:per.map(p=>({label:p.label,dense:p.dense,submitted:p.submitted,skip:p.skipped,denseRaf:p.denseRaf,longDense:p.longDense.length,geom:p.common['engine.webgl2.prepare.geometry'],frame:p.common['engine.frame.cpu']})),grouped:{A:grouped.A&&{'geometry':grouped.A['engine.webgl2.prepare.geometry'],'cpu':grouped.A['engine.frame.cpu']},B:grouped.B&&{'geometry':grouped.B['engine.webgl2.prepare.geometry'],'cpu':grouped.B['engine.frame.cpu']}},deltas:{geometry:deltas['engine.webgl2.prepare.geometry'],cpu:deltas['engine.frame.cpu']}},null,2));
if(mismatches.length)process.exitCode=1;
