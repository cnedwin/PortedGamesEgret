// Native marker artwork is designed in CSS-sized local units. Native Play
// scales the coordinate system; one inverse scale retains the old plate sizes.
export function placedRect(point,local,scale) {
  return {x:point.x+local.x/scale,y:point.y+local.y/scale,width:local.width/scale,height:local.height/scale};
}
export function markerHitArea(visual,minimum=44) {
  const width=Math.max(minimum,visual.width),height=Math.max(minimum,visual.height);
  return {x:visual.x-(width-visual.width)/2,y:visual.y-(height-visual.height)/2,width,height};
}
export const inside=(outer,inner)=>inner.x>=outer.x&&inner.y>=outer.y&&inner.x+inner.width<=outer.x+outer.width&&inner.y+inner.height<=outer.y+outer.height;
export const intersects=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;

// Clickable markers always win over passive landscape text. Within them the
// selected item, player's army and capital win consistently; a suppressed
// marker remains pickable on the underlying 3D ground and can reappear on zoom.
export function selectVisibleMarkers(candidates,safe,occluders,{maxVisible=96}={}) {
  const sorted=[...candidates].sort((a,b)=>Number(Boolean(a.passive))-Number(Boolean(b.passive))||b.priority-a.priority||
    Number(Boolean(b.retained))-Number(Boolean(a.retained))||a.distance-b.distance||String(a.id).localeCompare(String(b.id)));
  const accepted=[];
  for(const item of sorted){
    if(accepted.length>=maxVisible)break;
    if(!inside(safe,item.rect)||occluders.some(r=>intersects(r,item.rect))||accepted.some(other=>intersects(other.rect,item.rect)))continue;
    accepted.push(item);
  }
  return accepted;
}

export function reliefDrop(rect,reservedBottom,scale) {
  const delta=Math.max(0,reservedBottom-rect.y);
  return delta*scale<=56?delta:null;
}
