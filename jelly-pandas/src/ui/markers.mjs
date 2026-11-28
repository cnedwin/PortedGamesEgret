// The only visible page elements left above the 3D canvas are engine-projected markers.
import { createScreenMarkers3D } from '@egret/engine/webgl2/world3d';

const FAR=[1e5,1e5,1e5];
export function createJellyMarkers(container,camera) {
  const layer=createScreenMarkers3D({container,camera});
  let next=0,visible=false;
  function make(kind){
    const outer=document.createElement('span'),inner=document.createElement('span');
    outer.className='scene-marker '+kind;inner.className='marker-glyph';outer.append(inner);
    outer.setAttribute('aria-hidden','true');outer.classList.add('inactive');
    const marker=layer.add(outer,{target:FAR,maxDistance:180});
    return {outer,inner,marker,expires:0,began:0,point:[0,0,0]};
  }
  const damage=Array.from({length:40},()=>make('damage-number'));
  const down=Array.from({length:4},()=>make('down-marker')),all=damage.concat(down);
  down.forEach(e=>e.inner.textContent='🆘');
  function off(e){e.outer.classList.add('inactive');e.marker.retarget(FAR);}
  function on(e,p){e.point[0]=p[0];e.point[1]=p[1];e.point[2]=p[2];e.marker.retarget(e.point);e.outer.classList.remove('inactive');}
  function setVisible(on){visible=!!on;container.hidden=!visible;if(!visible){damage.forEach(off);down.forEach(off);}}
  function consume(events,now){
    if(!visible)return;let used=0;
    for(const ev of events){
      if(ev.type!=='hit'||(ev.amount<4&&!ev.crit)||used>=5)continue;
      used++;
      const e=damage[next++%damage.length];e.began=now;e.expires=now+.76;
      e.inner.textContent=String(ev.amount);e.outer.classList.toggle('crit',!!ev.crit);
      on(e,[ev.x,ev.y,ev.z]);
    }
  }
  function layout(screen,box) {
    // The projection remains full-canvas. Only clip its presentation to the safe part.
    const safe=screen.safe,k=box.scale??screen.scale;
    container.style.clipPath=`inset(${Math.max(0,safe.y*k)}px ${Math.max(0,(screen.width-safe.x-safe.width)*k)}px ${Math.max(0,(screen.height-safe.y-safe.height)*k)}px ${Math.max(0,safe.x*k)}px)`;
  }
  function update(sim,now,protectedRects=[]){
    if(!visible)return;
    let n=0;
    for(const panda of sim.pandas){if(!panda.down||n>=down.length)continue;on(down[n++],[panda.x,panda.y+2.2,panda.z]);}
    for(;n<down.length;n++)off(down[n]);
    for(const e of damage){
      if(now>=e.expires){if(!e.outer.classList.contains('inactive'))off(e);continue;}
      const age=Math.max(0,(now-e.began)/.76);
      e.inner.style.transform=`translate(-50%,${-50-age*110}%) scale(${1+.2*Math.sin(Math.min(1,age*3)*Math.PI)})`;
      e.inner.style.opacity=String(Math.min(1,(1-age)*4));
    }
    layer.update();
    // The engine supplies the projected point. Keep floating glyphs out of the
    // UI's occupied screen rectangles; no second world-projection path.
    for(const e of all){
      if(e.outer.hidden||e.outer.classList.contains('inactive'))continue;
      const p=e.marker.point,rise=e.outer.classList.contains('damage-number')?30:14;
      const blocked=protectedRects.some(r=>p.x>=r.x-12&&p.x<=r.x+r.width+12&&p.y>=r.y-10&&p.y-rise<=r.y+r.height+8);
      e.outer.classList.toggle('occluded',blocked);
    }
  }
  function reset(){damage.forEach(e=>{e.expires=0;off(e);});down.forEach(off);}
  return {consume,update,layout,setVisible,reset,dispose:()=>layer.dispose(),get size(){return damage.length;}};
}
