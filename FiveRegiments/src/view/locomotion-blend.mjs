// Presentation-only smoothing between the existing captured locomotion clips.
// Keeps the original steady-state mix and cadence calculation, and returns the exact original mix when bypassed.
export const GAIT_NAMES=Object.freeze(['walk','run','back','sideB','sideA']);
const clamp01=v=>Math.max(0,Math.min(1,v));
const seconds=dt=>Math.max(0,Number.isFinite(dt)?dt:0);
const GAIT_SPEEDS=Object.freeze([1.33,3.1,.9,1.1,1.1]);

/** Cadence follows the already blended captured clips, without a slower diagonal stride. */
export function createGaitCadence(motion){
  const durations=GAIT_NAMES.map(name=>motion.duration(name));
  return (weights,speed)=>{
    let sum=0,natural=0,cycle=0;
    for(let i=0;i<weights.length;i++){
      const w=weights[i];sum+=w;natural+=w*GAIT_SPEEDS[i];cycle+=w*durations[i];
    }
    if(sum<=1e-6||speed<=0)return 0;
    // The original weighting had length √2 on diagonals; multiplying that into both
    // speed and duration slowed the visible stepping without slowing the moving figure.
    return speed/(Math.max(.3,natural/sum)*Math.max(.3,cycle/sum));
  };
}

/** Smooth only the short end seam of captured neutral loops; disabled sampling is exact. */
export function createClosedLocomotionSampler(motion){
  const loops=new Map();
  const h=motion.bones.length*4;
  const dot=(a,b,i)=>a[i]*b[i]+a[i+1]*b[i+1]+a[i+2]*b[i+2]+a[i+3]*b[i+3];
  return (name,time,out,enabled=true)=>{
    motion.sample(name,time,out);
    if(!enabled)return out;
    let info=loops.get(name);
    if(!info){
      const clip=motion.clip(name),duration=motion.duration(name);
      info={duration,window:clip.loop?Math.min(duration*.12,2.5/clip.fps):0,
        forward:name==='walk'||name==='run',start:undefined};
      loops.set(name,info);
    }
    const {duration,window}=info;
    if(!(window>0&&duration>0))return out;
    const t=((time%duration)+duration)%duration;
    const edge=info.forward?Math.min(t,duration-t):duration-t;
    if(edge>=window)return out;
    const weight=clamp01(1-edge/window),k=weight*weight*(3-2*weight);
    if(!info.start){
      info.start=motion.pose();motion.sample(name,0,info.start);
      if(info.forward){
        info.end=motion.pose();motion.sample(name,duration-1e-7,info.end);
        info.mid=motion.pose();info.mid.set(info.start);motion.blend(info.mid,info.end,.5);
      }
    }
    if(!info.forward){motion.blend(out,info.start,k);return out;}
    // Forward clips are already moving rapidly at the seam. Adding the small signed
    // endpoint correction (rather than blending the entire pose toward a fixed frame)
    // retains that captured motion; both ends meet at the same midpoint pose.
    const ref=t<duration/2?info.start:info.end,mid=info.mid;
    for(let i=0;i<h;i+=4){
      const targetSign=dot(mid,ref,i)>=0?1:-1,currentSign=dot(ref,out,i)>=0?1:-1;
      for(let j=0;j<4;j++)out[i+j]+=k*currentSign*(targetSign*mid[i+j]-ref[i+j]);
      const length=Math.sqrt(dot(out,out,i))||1;
      for(let j=0;j<4;j++)out[i+j]/=length;
    }
    for(let j=0;j<3;j++)out[h+j]+=k*(mid[h+j]-ref[h+j]);
    return out;
  };
}

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
