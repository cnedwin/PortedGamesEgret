// Bridge the native Play design coordinates to the actual 3D CSS viewport.
export function sceneMapper(screen, overlay, scene) {
  const sx=screen.width/overlay.width, sy=screen.height/overlay.height;
  return {
    toDesign(x,y){return {x:screen.x+(scene.left-overlay.left+x)*sx,y:screen.y+(scene.top-overlay.top+y)*sy};},
    toScene(x,y){return {x:(x-screen.x)/sx+overlay.left-scene.left,y:(y-screen.y)/sy+overlay.top-scene.top};}
  };
}

// A negative DOM/Play wheel step zooms in, as the original realm did.
export const wheelFactor=steps=>1.18**(-steps);
export function pinchStep(previous,{phase,scale}) {
  if(phase!=='move'||!(scale>0)||!(previous>0))return {previous:1,factor:1};
  return {previous:scale,factor:scale/previous};
}

// The attached view can present before the application's UI and sound owners
// have been installed; only the explicit start enables the campaign clock.
export function createFrameGate(frame) {
  let running=false,reanchor=true;
  return {
    get running(){return running;},
    start(){if(!running)reanchor=true;running=true;},
    stop(){running=false;},
    frame(dt){if(running){const elapsed=reanchor?0:dt;reanchor=false;frame(elapsed);}}
  };
}
