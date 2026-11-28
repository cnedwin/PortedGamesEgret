// Presentation-only smoothing between the existing captured locomotion clips.
// Keeps the original steady-state mix and cadence calculation, and returns the exact original mix when bypassed.
export const GAIT_NAMES=Object.freeze(['walk','run','back','sideB','sideA']);
const clamp01=v=>Math.max(0,Math.min(1,v));
const seconds=dt=>Math.max(0,Number.isFinite(dt)?dt:0);

export function createLocomotionBlend(){
  const weights=new Float64Array(GAIT_NAMES.length),target=new Float64Array(GAIT_NAMES.length);
  const out={weights,moving:0};let initialized=false;
  return {
    update(fwd,back,left,right,run,movement,dt,ordinary){
      target[0]=fwd*(1-run);target[1]=fwd*run;target[2]=back;target[3]=left;target[4]=right;
      const time=seconds(dt);
      if(!initialized||!ordinary){
        initialized=true;weights.set(target);out.moving=movement;return out;
      }
      // Keep the last direction during a stop so the standing pose eases out of the current stride.
      if(fwd+back+left+right>0&&time>0){
        const mix=1-Math.exp(-18*time);
        for(let i=0;i<weights.length;i++)weights[i]+=(target[i]-weights[i])*mix;
      }
      // The root still follows the logical movement immediately. Only the amount of sampled gait fades.
      const rate=movement>out.moving?20:22;
      out.moving+=(movement-out.moving)*(1-Math.exp(-rate*time));
      if(movement===0&&out.moving<1e-4)out.moving=0;
      return out;
    }
  };
}

/** Subtle idle head pitch for a resting horse. Does not modify body, saddle, gait or its heading. */
export function createHorseIdlePitch(){
  let time=0,weight=0;
  return (speed,alive,rearing,dt)=>{
    const elapsed=seconds(dt);time=(time+elapsed)%1000;
    if(!alive||rearing||speed>=.5){weight=0;return 0;}
    const want=clamp01((.5-Math.abs(speed))/.35);
    weight+=(want-weight)*(1-Math.exp(-6*elapsed));
    return (.018*Math.sin(time*1.7)+.006*Math.sin(time*3.7))*weight*want;
  };
}
