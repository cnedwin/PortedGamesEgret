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
