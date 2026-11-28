// Bounded optional diagnostics for the shared Play/World3D frame phases. No browser loop,
// drawing operation, engine internals or production state mutation.
export function createFrameLog(limit=4096){
  if(!Number.isInteger(limit)||limit<1)throw new RangeError('finite ring size required');
  function ring(){let index=0,count=0;const data=new Array(limit);return{push(value){data[index]=value;index=(index+1)%limit;count=Math.min(count+1,limit)},all(){return Array.from({length:count},(_,i)=>data[(index-count+i+limit)%limit])},clear(){index=count=0;data.fill(undefined)}};}
  const play=ring(),world=ring(),marks=ring();
  return {onPlay:s=>play.push(s),onWorld:s=>world.push(s),mark(name,value){marks.push({name,at:performance.now(),value});},snapshot(){return{play:play.all(),world:world.all(),marks:marks.all()}},clear(){play.clear();world.clear();marks.clear()}};
}
export function distribution(values){const a=values.filter(Number.isFinite).sort((x,y)=>x-y);const at=p=>a[Math.max(0,Math.ceil(a.length*p)-1)]??null;return {count:a.length,p50:at(.5),p95:at(.95),max:a.at(-1)??null,over50:a.filter(x=>x>50).length};}
function tally(records){const counts={};for(const s of records)counts[s.outcome]=(counts[s.outcome]??0)+1;return counts;}
export function summarizeFrameLog({play,world},from=-Infinity,to=Infinity){
 const p=play.filter(s=>s.callbackStartMs>=from&&s.callbackEndMs<=to).sort((a,b)=>a.callbackStartMs-b.callbackStartMs),w=world.filter(s=>s.callbackStartMs>=from&&s.callbackEndMs<=to).sort((a,b)=>a.callbackStartMs-b.callbackStartMs);
 const fields=(records,names)=>Object.fromEntries(names.map(key=>[key,distribution(records.map(s=>s[key]))]));
 // Two independent native counters. Pair by actual performance time origin,
 // not by ID; a catch-up turn may contain multiple World3D draws before defer.
 const turns=p.map(s=>({play:s,world:[]}));let current=0,unmatched=0;
 for(const vw of w){while(current<turns.length&&turns[current].play.callbackEndMs<vw.callbackEndMs)current++;
   const turn=turns[current];if(turn&&turn.play.callbackStartMs<=vw.callbackStartMs&&vw.callbackEndMs<=turn.play.callbackEndMs)turn.world.push(vw);else unmatched++;
 }
 return{scope:{from,to},playTurns:p.length,worldDrawAttempts:w.length,playOutcomes:tally(p),worldOutcomes:tally(w),worldAttemptsPerTurn:distribution(turns.map(x=>x.world.length)),unmatchedWorld:unmatched,rafIntervals:distribution(p.slice(1).map((s,i)=>s.rafTimestampMs-p[i].rafTimestampMs)),playWall:distribution(p.map(s=>s.callbackEndMs-s.callbackStartMs)),worldWall:distribution(w.map(s=>s.callbackEndMs-s.callbackStartMs)),playCpu:fields(p,['updateMs','decisionMs','hostCheckMs','prepareMs','renderMs','afterFrameMs']),worldCpu:fields(w,['updateMs','renderMs']),note:'Native CPU observations include overlapping phases; do not add Play/World totals. RAF intervals are not presentation timing.'};
}