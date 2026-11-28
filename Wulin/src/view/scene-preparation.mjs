// Cold geometry admission was beneficial on the measured high-quality desktop
// scene only; low-quality phones incur extra upload bytes and entry delay.
export const canPrepareRealmGeometry = (quality, renderer) => quality === 'high' && typeof renderer.prepareGeometries === 'function';
// The same-frame submission order is measured only for desktop-pointer high WebGL2 realm in Play.
export const canDeferRealmDraw = (quality, webgpu, hasPlay, realm, desktop) => quality==='high' && !webgpu && hasPlay && realm && desktop;
// Scene-local preparation: shader compilation and bounded geometry uploads share
// the existing loading interval, without drawing a hidden scene.
export function createScenePreparation(renderer, collectVariants) {
  let readyPrograms=new WeakSet(), readyGeometry=new WeakSet();
  let active;
  function cancel() {
    if(!active)return false;
    const request=active;active=undefined;request.controller.abort();return true;
  }
  function begin(scene,{geometry=false}={}) {
    cancel();
    const programs=typeof renderer.preparePrograms==='function'&&!readyPrograms.has(scene);
    const uploads=geometry&&typeof renderer.prepareGeometries==='function'&&!readyGeometry.has(scene);
    if(!programs&&!uploads)return null;
    const controller=new AbortController(),signal=controller.signal,request={controller,signal,scene};
    active=request;
    request.ready=Promise.resolve().then(()=>{
      if(signal.aborted)return;
      const variants=collectVariants(scene),jobs=[];
      if(programs)jobs.push(Promise.resolve().then(()=>!signal.aborted&&renderer.preparePrograms(variants,{includeAutoInstancing:true})));
      if(uploads){
        const geometries=[...new Set(variants.map(variant=>variant.mesh.geometry))];
        jobs.push(Promise.resolve().then(()=>!signal.aborted&&renderer.prepareGeometries(geometries,{signal,budgetMs:4,maxPerSlice:16})));
      }
      return Promise.all(jobs);
    }).then(()=>{
      if(signal.aborted)return;
      if(programs)readyPrograms.add(scene);
      if(uploads)readyGeometry.add(scene);
    }).catch(cause=>{
      if(signal.aborted)return; // A superseded scene must not report a false load failure.
      controller.abort();throw cause; // Cancel the sibling upload when the other job genuinely fails.
    }).finally(()=>{if(active===request)active=undefined;});
    return request;
  }
  return {begin,cancel,reset(){cancel();readyPrograms=new WeakSet();readyGeometry=new WeakSet();}};
}
