// SPDX-License-Identifier: Apache-2.0
// Converts Egret's composed Play input to an application's existing command-down/up contract.
// It owns no DOM input events, timer, gameplay state, or device-specific polling.
const DEFAULT_DIRECTIONS=Object.freeze({up:'up',down:'down',left:'left',right:'right'});

function vector(value) {
  return {
    x:Number.isFinite(value?.x) ? Math.max(-1,Math.min(1,value.x)) : 0,
    y:Number.isFinite(value?.y) ? Math.max(-1,Math.min(1,value.y)) : 0
  };
}

/**
 * emit({command,phase,source,reason?}) -> adapt press/release to an app's existing key/command handlers.
 * sample(playGame,{enabled}) once per Play.update after native keys/pad/touch have been sampled.
 * pulse(command,source) for a native named semantic/view/pointer activation.
 * suspend(reason) releases every owned command and waits for neutral before accepting gameplay input again.
 */
export function createCommandBridge({
  emit, bindings={}, directions=DEFAULT_DIRECTIONS,
  threshold=.5, releaseThreshold=.32, switchingMargin=.14
}={}) {
  if(typeof emit!=='function') throw new TypeError('emit');
  if(!(threshold>0&&threshold<=1&&releaseThreshold>=0&&releaseThreshold<threshold&&switchingMargin>=0))
    throw new TypeError('movement thresholds');
  const directionEntries=Object.entries(directions);
  if(directionEntries.length!==4||Object.keys(DEFAULT_DIRECTIONS).some(key=>typeof directions[key]!=='string'||!directions[key]))
    throw new TypeError('movement commands');
  const moves=new Set(Object.values(directions));
  if(moves.size!==4) throw new TypeError('movement commands must be unique');
  const actions=Object.entries(bindings).map(([command,names])=>{
    if(!command||moves.has(command)||!Array.isArray(names)||!names.length||names.some(name=>typeof name!=='string'||!name))
      throw new TypeError('invalid action or movement overlap: '+command);
    return [command,[...new Set(names)]];
  });
  const known=new Set([...moves,...actions.map(([command])=>command)]);
  const held=new Map();
  let direction, awaitingNeutral=false, closed=false, generation=0, sampling=false;

  function tell(command,phase,source,reason){
    emit(Object.freeze({command,phase,source,...(reason&&{reason})}));
  }
  function release(command,reason){
    const source=held.get(command);
    if(source===undefined)return;
    held.delete(command);
    tell(command,'release',source,reason);
  }
  function hold(command,source){
    if(held.has(command))return false;
    held.set(command,source);
    tell(command,'press',source);
    return true;
  }
  function suspend(reason='suspended'){
    generation++;
    awaitingNeutral=true;
    direction=undefined;
    for(const command of [...held.keys()])release(command,reason);
  }
  function cardinal(axis){
    const strengths={right:axis.x,left:-axis.x,down:axis.y,up:-axis.y};
    const best=Math.abs(axis.x)>=Math.abs(axis.y)?(axis.x>=0?'right':'left'):(axis.y>=0?'down':'up');
    if(direction&&strengths[direction]>=releaseThreshold&&strengths[best]-strengths[direction]<switchingMargin)return direction;
    return strengths[best]>=threshold?best:undefined;
  }
  function pulse(command,source='semantic'){
    if(closed||!known.has(command)||held.has(command))return false;
    hold(command,source);
    // The press callback may synchronously open a modal and call suspend. Do not release it twice.
    release(command);
    return true;
  }
  function sample(game,{enabled=true}={}){
    if(closed||sampling)return;
    if(!game?.keys||typeof game.keys.axis!=='function'||typeof game.keys.down!=='function'||typeof game.keys.pressed!=='function')
      throw new TypeError('Play game keys');
    if(!enabled){if(!awaitingNeutral||held.size)suspend('covered');return;}
    const axis=vector(game.keys.axis());
    const samples=actions.map(([command,names])=>({
      command, down:game.keys.down(...names), pressed:game.keys.pressed(...names)
    }));
    if(awaitingNeutral){
      if(Math.max(Math.abs(axis.x),Math.abs(axis.y))<releaseThreshold&&samples.every(item=>!item.down&&!item.pressed))
        awaitingNeutral=false;
      return;
    }
    const source=game.device??'keyboard';
    const next=cardinal(axis);
    direction=next;
    const desired=new Set([...next?[directions[next]]:[],...samples.filter(item=>item.down).map(item=>item.command)]);
    const previous=new Set(held.keys());
    const before=generation;
    sampling=true;
    try{
      // Release the old cardinal first, then press the new one; legacy movement state never sees two directions.
      for(const command of [...held.keys()]){
        if(!desired.has(command))release(command);
        if(generation!==before)return;
      }
      for(const command of desired){
        hold(command,source);
        if(generation!==before)return;
      }
      // Preserve a quick press-and-release that happened between two simulation samples.
      for(const item of samples){
        if(item.pressed&&!item.down&&!previous.has(item.command))pulse(item.command,source);
        if(generation!==before)return;
      }
    }finally{sampling=false;}
  }
  return Object.freeze({
    sample,pulse,suspend,
    dispose(){if(closed)return;suspend('disposed');closed=true;},
    get held(){return [...held.keys()];},
    get awaitingNeutral(){return awaitingNeutral;}
  });
}
