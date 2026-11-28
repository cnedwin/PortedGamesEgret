import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createLocomotionBlend,createHorseIdlePitch,createGaitCadence,createClosedLocomotionSampler,GAIT_NAMES} from '../src/view/locomotion-blend.mjs';
import {createMotion} from '../src/view/motion.mjs';
const update=(blend,fwd,back,left,right,run,movement,dt=1/60,ordinary=true)=>blend.update(fwd,back,left,right,run,movement,dt,ordinary);
const values=(out)=>({moving:out.moving,weights:[...out.weights]});
const near=(a,b,eps=1e-6)=>assert(Math.abs(a-b)<=eps,`expected ${a} ≈ ${b}`);

test('ordinary captured gait crossfades start, stop and direction changes without changing the settled mix',()=>{
  const b=createLocomotionBlend();
  const idle=values(update(b,0,0,0,0,0,0));assert.equal(idle.moving,0);
  const start=values(update(b,1,0,0,0,0,1));assert(start.moving>0&&start.moving<.5);assert(start.weights[0]>0);
  let walk;for(let i=0;i<18;i++)walk=values(update(b,1,0,0,0,0,1));assert(walk.moving>.99);
  const turn=values(update(b,0,0,1,0,0,1));assert(turn.weights[0]>.5&&turn.weights[3]>0&&turn.weights[3]<.5);
  let side;for(let i=0;i<24;i++)side=values(update(b,0,0,1,0,0,1));assert(side.weights[3]>.99&&side.weights[0]<.01);
  const stop=values(update(b,0,0,0,0,0,0));assert(stop.moving>0&&stop.moving<1);assert(stop.weights[3]>.95);
  let rest;for(let i=0;i<24;i++)rest=values(update(b,0,0,0,0,0,0));assert(rest.moving<.001);
});

test('ordinary blend is frame-rate-independent, holds on zero time; action bypass returns exact original weights',()=>{
  const a=createLocomotionBlend(),b=createLocomotionBlend();update(a,1,0,0,0,.25,.8);update(b,1,0,0,0,.25,.8);
  let x,y;for(let i=0;i<12;i++)x=values(update(a,0,.5,.75,0,0,1,1/60));for(let i=0;i<6;i++)y=values(update(b,0,.5,.75,0,0,1,1/30));
  near(x.moving,y.moving);x.weights.forEach((v,i)=>near(v,y.weights[i]));
  assert.deepEqual(values(update(a,0,0,0,0,0,0,0)),x);
  const raw=values(update(a,.8,0,.6,0,.25,.7,1/60,false));near(raw.moving,.7);near(raw.weights[0],.6);near(raw.weights[1],.2);near(raw.weights[3],.6);
});

const realMotion=(id)=>{const bytes=readFileSync(new URL(`../assets/motion/${id}.bin`,import.meta.url));return createMotion(JSON.parse(readFileSync(new URL(`../assets/motion/${id}.json`,import.meta.url))),bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));};
function sampleMix(motion,phase,weights){
  const out=motion.pose(),layer=motion.pose();let total=0;
  for(let i=0;i<GAIT_NAMES.length;i++){const w=weights[i],name=GAIT_NAMES[i];if(w<=.02)continue;
    if(total===0)motion.sample(name,phase*motion.duration(name),out);
    else{motion.sample(name,phase*motion.duration(name),layer);motion.blend(out,layer,w/(total+w));}total+=w;
  }return out;
}
function lowerAngle(motion,a,b){let largest=0;for(let i=0;i<motion.bones.length;i++)if(/thigh|calf|foot|ball/.test(motion.bones[i])){
  let dot=0,lenA=0,lenB=0;for(let k=0;k<4;k++){dot+=a[4*i+k]*b[4*i+k];lenA+=a[4*i+k]**2;lenB+=b[4*i+k]**2;}
  largest=Math.max(largest,2*Math.acos(Math.min(1,Math.abs(dot/Math.sqrt(lenA*lenB)))));
}return largest;}

test('real five-regiment motion assets: a sudden walk-to-side turn reduces the lower-body one-frame pose jump',(t)=>{
  for(const id of ['yulin','tiger','vanguard','plume','archer']){
    const motion=realMotion(id);let old=0,next=0;
    for(const phase of [.17,.33,.59,.81]){
      const b=createLocomotionBlend();update(b,1,0,0,0,0,1);
      const walk=sampleMix(motion,phase,[1,0,0,0,0]),side=sampleMix(motion,phase,[0,0,0,1,0]);
      const mixed=sampleMix(motion,phase,update(b,0,0,1,0,0,1).weights);
      old=Math.max(old,lowerAngle(motion,walk,side));next=Math.max(next,lowerAngle(motion,walk,mixed));
    }
    assert(old>.05&&next<old*.65,`${id}: ${old} -> ${next}`);
    t.diagnostic(`${id}: ${(old*180/Math.PI).toFixed(1)}° → ${(next*180/Math.PI).toFixed(1)}° (largest sampled lower-body joint change)`);
  }
});

test('neutral diagonal gait uses average captured cadence instead of slowing twice with directional weight sum',()=>{
  for(const id of ['yulin','tiger','vanguard','plume','archer']){
    const motion=realMotion(id),cadence=createGaitCadence(motion),w=Math.SQRT1_2,speed=1.6;
    // Settled cardinal movement uses the original cadence exactly.
    near(cadence([1,0,0,0,0],speed),speed/(1.33*motion.duration('walk')));
    near(cadence([0,1,0,0,0],speed),speed/(3.1*motion.duration('run')));
    near(cadence([0,0,1,0,0],speed),speed/(.9*motion.duration('back')));
    for(const side of [3,4]){
      const weights=[w,0,0,0,0];weights[side]=w;
      const cycle=(motion.duration('walk')+motion.duration(GAIT_NAMES[side]))/2;
      const expected=speed/(((1.33+1.1)/2)*cycle);
      near(cadence(weights,speed),expected);
      near(cadence(weights.map(x=>x/2),speed),expected); // blending amplitude isn't movement speed
    }
    assert.equal(cadence([1,0,0,0,0],0),0);
    assert.equal(cadence([0,0,0,0,0],speed),0);
  }
});

test('actual five-regiment locomotion loops close their last-frame seam while preserving their interior samples',(t)=>{
  for(const id of ['yulin','tiger','vanguard','plume','archer']){
    const motion=realMotion(id),sample=createClosedLocomotionSampler(motion);let previousJump=0,closedJump=0;
    for(const name of ['idle',...GAIT_NAMES]){
      const duration=motion.duration(name),a=motion.pose(),b=motion.pose(),c=motion.pose(),inner=motion.pose();
      motion.sample(name,0,a);motion.sample(name,duration-1e-6,b);sample(name,duration-1e-6,c);
      const old=lowerAngle(motion,a,b);sample(name,0,a);
      const closed=lowerAngle(motion,a,c);
      previousJump=Math.max(previousJump,old);closedJump=Math.max(closedJump,closed);
      assert(closed<.003,`${id}/${name} loop still has a lower-joint seam`);
      const h=motion.bones.length*4;assert(Math.hypot(...[0,1,2].map(k=>a[h+k]-c[h+k]))<1e-5);
      motion.sample(name,duration*.4,b);sample(name,duration*.4,inner);assert.deepEqual(inner,b);
      // Disabled sampling is byte-for-byte the original for preview/action states.
      motion.sample(name,duration-1e-6,b);sample(name,duration-1e-6,c,false);assert.deepEqual(c,b);
      // Closing the wrap must not simply move the pop one frame earlier. Compare the
      // actual adjacent 60Hz lower-body angular change over the whole seam window.
      let rawPeak=0,correctedPeak=0;
      for(const shift of [0,.37,.73])for(let i=0;i<24;i++){
        const at=duration-.2+(i+shift)/60;
        motion.sample(name,at,a);motion.sample(name,at+1/60,b);
        sample(name,at,c);sample(name,at+1/60,inner);
        rawPeak=Math.max(rawPeak,lowerAngle(motion,a,b));
        correctedPeak=Math.max(correctedPeak,lowerAngle(motion,c,inner));
      }
      assert(correctedPeak<=rawPeak*1.03,`${id}/${name}: moved seam spike ${rawPeak} -> ${correctedPeak}`);
    }
    assert(previousJump>.05&&closedJump<previousJump*.1);
    t.diagnostic(`${id}: ${(previousJump*180/Math.PI).toFixed(2)}° → ${(closedJump*180/Math.PI).toFixed(3)}° seam`);
  }
});

test('idle horse head pitch is small and continuous, with no contribution during running, rear or fall',()=>{
  const f=createHorseIdlePitch();let greatest=0,last=0;
  for(let i=0;i<360;i++){const n=f(0,true,false,1/60);assert(Math.abs(n-last)<.003);greatest=Math.max(greatest,Math.abs(n));last=n;}
  assert(greatest>.008&&greatest<.035);assert.equal(f(1.5,true,false,1/60),0);assert.equal(f(0,true,true,1/60),0);assert.equal(f(0,false,false,1/60),0);
});
