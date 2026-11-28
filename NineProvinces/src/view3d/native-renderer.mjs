// Renderer-only owner for an attached world. Play, not this owner, advances
// the engine clock. Use the same native presets, backend fallback and dynamic
// resolution policy as the previous World3D app.
import {createWebGL2Renderer3D, createDynamicResolution3D, WORLD3D_QUALITY_PRESETS,
  pickWorld3DQuality, pickWorld3DBackend, isSoftwareRendered3D} from '@egret/engine/webgl2/world3d';
import {World3DError} from '@egret/engine/world3d';
import {useFixedWorldResolution,automaticWorldResolution} from './canvas-policy.mjs';

export async function createRealmRenderer(canvas,{quality:requested}={}) {
  if(requested&&requested!=='auto'&&!Object.hasOwn(WORLD3D_QUALITY_PRESETS,requested))throw new World3DError('WORLD3D_INPUT_INVALID','quality');
  const automatic=!requested||requested==='auto';
  const software=automatic&&isSoftwareRendered3D(canvas.ownerDocument);
  let quality=automatic?pickWorld3DQuality({softwareRenderer:software}):requested;
  const preset=WORLD3D_QUALITY_PRESETS[quality],asked=pickWorld3DBackend();
  let backend='webgl2';
  if(asked==='webgpu'){
    try{if(await globalThis.navigator?.gpu?.requestAdapter())backend='webgpu';}catch{/* no-adapter WebGL2 fallback */}
  }
  const fixed=useFixedWorldResolution(globalThis.navigator);
  const common={canvas,antialias:preset.antialias,shadows:preset.shadows,shadowAtlasSize:preset.shadowAtlasSize,toneMapping:'aces',exposure:.85};
  const renderer=backend==='webgpu'
    ? await (await import('@egret/engine/webgpu/world3d')).createWebGPURenderer3D(common)
    : createWebGL2Renderer3D({...common,presentationResize:fixed?'stable':'direct'});
  const makeResolution=auto=>{const options=automaticWorldResolution({software,automatic:auto,fixed});return options===null?undefined:createDynamicResolution3D(options);};
  let resolution=makeResolution(automatic);
  const apply=()=>{
    const next=WORLD3D_QUALITY_PRESETS[quality];
    renderer.shadowsEnabled=next.shadows;
    Object.assign(renderer.postProcess,{enabled:next.post,bloom:next.bloom,ssao:next.ssao,fxaa:next.fxaa});
  };
  apply();
  let host,close;
  return {
    renderer,backend,fellBack:asked==='webgpu'&&backend==='webgl2',
    get quality(){return quality;},get resolutionScale(){return resolution?.scale??1;},
    get engine(){return host?.game.engine;},get scope(){return host?.game.scope;},get view(){return host?.view;},
    setQuality(next){if(!Object.hasOwn(WORLD3D_QUALITY_PRESETS,next))throw new World3DError('WORLD3D_INPUT_INVALID','quality');quality=next;apply();resolution=makeResolution(false);},
    resize(camera,dt){
      resolution?.update(dt);
      const ratio=Math.min(globalThis.devicePixelRatio??1,WORLD3D_QUALITY_PRESETS[quality].pixelRatio)*(resolution?.scale??1);
      renderer.resizeToDisplaySize(ratio);
      const drawn=renderer.renderSize??renderer.canvas;
      if(drawn.height>0)camera.aspect=drawn.width/drawn.height;
    },
    bind(hostValue){host=hostValue;},
    start(){host?.start();},stop(){host?.stop();},
    dispose(){return close??=Promise.resolve().then(async()=>{try{await host?.dispose();}finally{renderer.dispose();}});}
  };
}
