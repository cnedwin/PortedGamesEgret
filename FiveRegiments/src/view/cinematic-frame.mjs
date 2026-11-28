// Fixed, noninteractive camera staging. A cascade of two critically damped
// first-order filters brings a selected scene into view with a gentle start.
// The closed-form update is invariant to frame subdivision for a fixed target.
export function createCinematicFrame(){
  const firstPosition=[0,0,0],firstLook=[0,0,0];
  let ready=false;
  const copy=(out,value)=>{for(let i=0;i<3;i++)out[i]=value[i];};
  function advance(out,first,target,q,e){
    for(let i=0;i<3;i++){
      const offset=first[i]-target[i];
      out[i]=target[i]+((out[i]-target[i])+q*offset)*e;
      first[i]=target[i]+offset*e;
    }
  }
  return {
    clear(){ready=false;},
    update(at,look,from,to,dt,rate,{reducedMotion=false}={}){
      if(reducedMotion){copy(at,from);copy(look,to);ready=false;return;}
      if(!ready){copy(firstPosition,at);copy(firstLook,look);ready=true;}
      if(!(dt>0&&rate>0))return;
      // Matching the earlier exponential's approximate settling time while
      // suppressing the initial velocity jump.
      const q=dt*rate*1.9,e=Math.exp(-q);
      advance(at,firstPosition,from,q,e);
      advance(look,firstLook,to,q,e);
    }
  };
}
