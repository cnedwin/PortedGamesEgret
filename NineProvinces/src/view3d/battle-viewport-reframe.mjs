// Presentation-only resize gate. Ordinary address-bar jitter and unchanged
// frames retain the camera; a real orientation/aspect change is applied once
// after two equal settled viewport observations and no captured pointer.
export function createBattleReframeGate({aspectDelta=.20}={}){
 let anchor=null,pending=null;
 return {observe(width,height,portrait,blocked=false){
   if(!(width>0&&height>0&&Number.isFinite(width)&&Number.isFinite(height)))return false;
   const current={width,height,portrait:Boolean(portrait),aspect:width/height};
   if(!anchor){anchor=current;return false;}
   const changed=current.portrait!==anchor.portrait||Math.abs(Math.log(current.aspect/anchor.aspect))>=aspectDelta;
   if(!changed){pending=null;return false;}
   if(!pending||Math.abs(pending.width-width)>1||Math.abs(pending.height-height)>1||pending.portrait!==current.portrait){pending=current;return false;}
   if(blocked)return false;
   anchor=current;pending=null;return true;
 }};
}
export function battleReframeIndices(battle,{selected,preview,includeObjectives=false}={}){
 const indices=new Set(),put=i=>{if(Number.isInteger(i)&&i>=0)indices.add(i);};
 const unit=battle.units.find(u=>u.id===selected&&!u.gone);put(unit?.pos);
 for(const u of battle.units)if(!u.gone)put(u.pos);
 if(preview){for(const at of preview.path??[])put(at);put(preview.hex);put(battle.units[preview.target]?.pos);}
 if(includeObjectives){put(battle.gate?.at);put(battle.keep);}
 return [...indices].sort((a,b)=>a-b);
}

// Find an unobscured CSS footprint for the projected nameplate. Prefer a
// full card; compact is still useful when the real native HUD is crowded.
export function chooseBattleLocateAnchor({width,height,safe,obstacles},fullWidth=104){
 const centre={x:width/2,y:height/2},gap=5;
 for(const mode of ['full','compact']){
   const halfX=(mode==='full'?Math.max(44,fullWidth):44)/2,halfY=22;
   const loX=safe.left+halfX+gap,hiX=safe.right-halfX-gap,loY=safe.top+halfY+gap,hiY=safe.bottom-halfY-gap;
   if(loX>hiX||loY>hiY)continue;
   const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
   const xs=new Set([loX,hiX,clamp(centre.x,loX,hiX)]),ys=new Set([loY,hiY,clamp(centre.y,loY,hiY)]);
   for(const r of obstacles){
     xs.add(clamp(r.left-halfX-gap,loX,hiX));xs.add(clamp(r.right+halfX+gap,loX,hiX));
     ys.add(clamp(r.top-halfY-gap,loY,hiY));ys.add(clamp(r.bottom+halfY+gap,loY,hiY));
   }
   let best=null,bestScore=Infinity;
   for(const x of xs)for(const y of ys){
     const box={left:x-halfX,top:y-halfY,right:x+halfX,bottom:y+halfY};
     if(obstacles.some(r=>box.left<r.right+gap-.01&&box.right>r.left-gap+.01&&box.top<r.bottom+gap-.01&&box.bottom>r.top-gap+.01))continue;
     const score=(x-centre.x)**2+(y-centre.y)**2;
     if(score<bestScore){bestScore=score;best={x,y,mode};}
   }
   if(best)return best;
 }
 return null;
}

// The camera's existing perspective/pitch formula, in CSS pixels. Account
// for a plate's authored world-space height above the focused unit.
export function locateCameraOffset({width,height},distance,anchor,lift=2.9){
 if(!anchor)return {x:0,z:2};
 const pitch=(64-22*(1-(distance-20)/280)**1.6)*Math.PI/180;
 const pixels=height/(2*distance*Math.tan(19*Math.PI/180));
 return {x:(width/2-anchor.x)/pixels,z:((height/2-anchor.y)/pixels-lift*Math.cos(pitch))/Math.sin(pitch)};
}
