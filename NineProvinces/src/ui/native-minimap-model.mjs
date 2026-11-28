// Geometry only: shared by native minimap drawing, pointer selection and tests.
import { MAP, NODES } from '../data/map.mjs';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

/** Convert the native minimap's local coordinates to an in-map camera target. */
export function miniMapTarget(x,y,width,height){
  return {x:clamp(x/Math.max(1e-6,width),0,1)*MAP.width,z:clamp(y/Math.max(1e-6,height),0,1)*MAP.height};
}

/** Keep the original overview marks and camera footprint. */
export function miniMapMarks(state,home,view){
  const n=NODES[home], armies=[];
  if(state?.player)for(const a of Object.values(state.armies)){if(a.faction!==state.player)continue;const p=NODES[a.link?a.link.to:a.at];if(p)armies.push({id:a.id,x:p.x,z:p.y});}
  const w=view.d*1.45,h=view.d*.95;
  return {home:n?{x:n.x,z:n.y}:null,armies,camera:{x:view.x-w/2,z:view.z-h*.75,width:w,height:h}};
}

/** Native design-unit bounds: pinned to the safe right edge below the HUD. */
export function layoutMiniMap(safe,scale,top,portrait){
  const ratio=MAP.width/MAP.height, css=1/Math.max(.001,scale),gap=7*css;
  const topY=Math.max(safe.y,top)+gap,available=Math.max(0,safe.y+safe.height-gap-topY);
  const width=Math.max(0,Math.min((portrait?132:232)*css,safe.width*(portrait?.34:.27),available*ratio));
  return {x:safe.x+safe.width-width-gap,y:topY,width,height:width/ratio};
}
