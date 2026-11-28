import { sampleTerrainTile,TILE } from './terrain-sampling.mjs';
/**
 * TerrainStream3D accepts asynchronous height-field loaders. Bound the number
 * of jobs sent to one worker and transfer arrays, rather than cloning them.
 * A missing/failed worker returns the exact same deterministic samples.
 */
export function createTerrainSampler({WorkerClass=globalThis.Worker,workers=1,limit=256,onFallback=()=>{}}={}){
  let retired=false,serial=0,failed=false,cancelled=0;const pending=new Map(),queue=[],pool=[];let lastX,lastZ,lastReach;
  const settle=(job,value)=>{pending.delete(job.id);job.resolve(value)};
  function fallback(err){
    if(failed||retired)return;failed=true;pool.forEach(p=>p.worker.terminate());pool.length=0;
    onFallback(err);
    // Only queued requests need synchronous fallback. Existing world retention
    // will discard obsolete completions independently.
    const jobs=[...pending.values()];queue.length=0;
    for(const job of jobs)try{settle(job,sampleTerrainTile(job.tx,job.tz))}catch(e){pending.delete(job.id);job.reject(e)}
  }
  function pump(){
    if(failed||retired)return;
    for(const p of pool){if(p.busy||!queue.length)continue;const job=queue.shift();p.busy=job;
      try{p.worker.postMessage({id:job.id,tx:job.tx,tz:job.tz})}catch(e){fallback(e);return}}
  }
  if(WorkerClass)try{for(let i=0;i<workers;i++){
    const worker=new WorkerClass(new URL('./terrain-worker.mjs',import.meta.url),{type:'module'});const p={worker,busy:null};pool.push(p);
    worker.addEventListener('message',({data})=>{if(retired||failed)return;const job=p.busy;if(!job||data.id!==job.id){fallback(new Error('Unexpected terrain worker response'));return}
      p.busy=null;if(job.cancelled){pump();return;} if(data.error){fallback(new Error(data.error));return}
      if(!(data.heights instanceof Float32Array)||!(data.tint instanceof Float32Array)){fallback(new Error('Invalid terrain samples'));return}
      settle(job,{heights:data.heights,tint:data.tint});pump()});
    worker.addEventListener('error',ev=>fallback(new Error(ev.message??'Terrain worker unavailable')));
  }}catch(e){fallback(e)}else failed=true;
  return {
    get usingWorker(){return !failed&&!retired&&pool.length>0},
    get cancelled(){return cancelled;},
    // Match the public TerrainStream retention window. Settling only jobs
    // whose tiles *left retention* frees the native outstanding allowance.
    // Late results from abandoned active jobs do not publish or poison the
    // next valid worker request.
    retain(x,z,viewDistance){
      if(retired||failed||(x===lastX&&z===lastZ&&viewDistance===lastReach))return 0;
      lastX=x;lastZ=z;lastReach=viewDistance;if(!pending.size)return 0;
      const retention=viewDistance*1.25+TILE*.25;let count=0;
      const outside=job=>Math.hypot(Math.max(job.tx*TILE-x,0,x-(job.tx+1)*TILE),Math.max(job.tz*TILE-z,0,z-(job.tz+1)*TILE))>retention;
      for(const job of pending.values())if(outside(job)){
        job.cancelled=true;settle(job,undefined);count++;
      }
      for(let i=queue.length-1;i>=0;i--)if(queue[i].cancelled)queue.splice(i,1);
      cancelled+=count;pump();return count;
    },
    request(tx,tz){
      if(retired)return Promise.reject(new Error('Terrain sampler closed'));
      if(failed||!pool.length)return sampleTerrainTile(tx,tz);
      // The engine limits the retained tile range. Keep preview travel from
      // enqueuing an unbounded worker backlog; retain a correct synchronous sample.
      if(pending.size>=limit)return sampleTerrainTile(tx,tz);
      return new Promise((resolve,reject)=>{const job={id:++serial,tx,tz,resolve,reject};pending.set(job.id,job);queue.push(job);pump()});
    },
    dispose(){if(retired)return;retired=true;for(const p of pool)p.worker.terminate();pool.length=0;queue.length=0;for(const job of pending.values())job.resolve(undefined);pending.clear()}
  };
}