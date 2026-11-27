// The actual native 3D stage decides quality. Only overlap its title's first model downloads with a slower UI host.
import { MAPS,mapById } from './sim/maps.mjs';
import { createGame } from './sim/rules.mjs';
import { SET_OF,initialModelNames } from './view/model-plan.mjs';
import { prefetchInitialModels } from './view/model-bytes.mjs';

export function backdropSetup(params,random=Math.random) {
  const map=params.get('map')??MAPS[Math.floor(random()*MAPS.length)].id;
  return {map,sides:[{commander:'seline',ai:true,level:'normal'},{commander:'vireta',ai:true,level:'normal'}],human:-1,seed:5};
}

export async function prepareStartupHosts({params,startup,createWorld,createOverlay,
  now=()=>performance.now(),random=Math.random,fetcher=globalThis.fetch}) {
  let initial=null,overlayReady=false,failed=false;
  const world=Promise.resolve().then(createWorld).then(stage=>{
    startup.world=now();
    // A direct battle, rejected host or already-ready overlay has no title-prefetch window.
    if(!params.get('battle')&&!overlayReady&&!failed){
      const setup=backdropSetup(params,random);
      const game=createGame(mapById(setup.map),setup.sides,setup.seed);
      const names=initialModelNames(game),set=SET_OF[stage.quality]??'mid';
      startup.modelsRequested=now();
      const prefetch=prefetchInitialModels(names,set,{fetcher});
      initial={setup,prefetch};
      const receipt=startup.modelPrefetch={set,names:prefetch.names,requested:prefetch.names.length};
      void prefetch.done.then(counts=>{
        startup.modelsDownloaded=now();
        Object.assign(receipt,counts);
      });
    }
    return stage;
  });
  const overlay=Promise.resolve().then(createOverlay).then(ui=>{
    overlayReady=true;startup.overlay=now();return ui;
  });
  try {
    const [stage,ui]=await Promise.all([world,overlay]);
    return {stage,ui,initial};
  } catch(cause){
    failed=true;initial?.prefetch.cancel();throw cause;
  }
}
