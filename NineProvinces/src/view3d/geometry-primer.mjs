// One cooperative native WebGL2 preparation job at a time. Geometry lists
// are real Geometry3D objects; no hidden draw, extra context, shader link or
// GPU completion promise is introduced. Unsupported/backlogged preparation
// falls back to ordinary renderer admission instead of hiding a city forever.
export function createGeometryPrimer(renderer,{maxQueued=8,budgetMs=4,maxPerSlice=4,onFailure=()=>{}}={}){
  const available=typeof renderer?.prepareGeometries==='function',queue=[];
  let active=null,closed=false,prepared=0,failed=0;
  function pump(){
    if(closed||active||!queue.length)return;
    const job=queue.shift(),controller=new AbortController();active={job,controller};
    const finish=(ok,error)=>{
      if(closed||active?.job!==job)return;
      active=null;
      try{if(!ok){failed++;onFailure(error);}else prepared++;}
      finally{try{job.ready();}finally{pump();}}
    };
    try{
      Promise.resolve(renderer.prepareGeometries(job.list,{budgetMs,maxPerSlice,signal:controller.signal})).then(()=>finish(true),error=>finish(false,error));
    }catch(error){finish(false,error);}
  }
  return {
    get enabled(){return available&&!closed;},get pending(){return queue.length+(active?1:0);},
    get prepared(){return prepared;},get failed(){return failed;},
    enqueue(geometries,ready){
      if(closed)return false;
      const list=[...new Set(geometries)];
      if(!available||!list.length||queue.length>=maxQueued){ready();return false;}
      queue.push({list,ready});pump();return true;
    },
    dispose(){if(closed)return;closed=true;active?.controller.abort();active=null;queue.length=0;}
  };
}
