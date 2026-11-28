// Menu-only cinematic framing. Move the camera and its target by the same
// offset so previews remain visible beside or above the native menu.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function previewFrame({screen,panel,focus=null,clock=0}){
  const portrait=screen.width<screen.height,aspect=screen.width/screen.height;
  const fovScale=2*Math.tan(26*Math.PI/180);
  let cx=.5,cy=.5,wide=1;
  if(panel&&screen.width>0&&screen.height>0){
    if(portrait){const free=clamp((panel.y-screen.y)/screen.height,.2,.95);cy=free/2;}
    else if(focus){wide=clamp((panel.x-screen.x)/screen.width,.28,1);cx=wide/2;}
    else {const left=clamp((panel.x+panel.width-screen.x)/screen.width,0,.72);wide=1-left;cx=(1+left)/2;}
  }
  const pivot=focus?[focus.x,focus.mounted?1.65:1.1,focus.z]:[0,1.25,0];
  const base=focus?(focus.mounted?5.4:4.3):8.0;
  let depth=base;
  if(portrait)depth=focus?7.4:9.2;
  else if(!focus)depth=clamp(8.9/(fovScale*aspect*wide),8.2,13);
  const w=fovScale*depth*aspect,h=fovScale*depth;
  const ox=(.5-cx)*w,oy=(cy-.5)*h;
  const to=[pivot[0]+ox,pivot[1]+oy,pivot[2]];
  const from=[to[0]+(focus?0.54:Math.sin(clock*.075)*.52),to[1]+(focus?.65:1.0),to[2]+depth];
  return {from,to,speed:focus?3:2.1};
}
