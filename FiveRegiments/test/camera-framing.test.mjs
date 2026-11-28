// Generic cinematic camera continuity for menus; no interactive game timing.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCameraRig} from '../src/view/camera.mjs';

const start=[0,2,8],look=[0,1,0],destination=[6,4,12],target=[4,2,2];
function build(){
  const shot={},rig=createCameraRig({setPosition(...v){shot.position=v;},lookAt(...v){shot.look=v;}});
  rig.snap(start,look);return {rig,shot};
}
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<tolerance,`${a} vs ${b}`);
const travel=(p,a,b)=>(p-a)/(b-a);

test('fixed presentation reframing eases into motion while settling at the original pace',()=>{
  const {rig,shot}=build(),dt=1/60;
  rig.frame(dt,destination,target,2);
  const first=travel(shot.position[0],start[0],destination[0]);
  assert.ok(first>0&&first<.01,'the first frame starts gently instead of a velocity jump');
  let previous=first;
  for(let i=1;i<75;i++){
    rig.frame(dt,destination,target,2);
    const progress=travel(shot.position[0],start[0],destination[0]);
    assert.ok(progress>=previous&&progress<=1,'stationary target is approached without overshoot');
    near(progress,travel(shot.look[0],look[0],target[0]));
    previous=progress;
  }
  assert.ok(previous>.92,'staging still settles promptly');
});

test('stationary fixed camera interpolation depends on elapsed time, not frame subdivision',()=>{
  const frames=[30,60,120].map(hz=>{
    const {rig,shot}=build();
    for(let i=0;i<hz;i++)rig.frame(1/hz,destination,target,2.5);
    return shot;
  });
  for(const shot of frames.slice(1)){
    shot.position.forEach((n,i)=>near(n,frames[0].position[i]));
    shot.look.forEach((n,i)=>near(n,frames[0].look[i]));
  }
});

test('reduced motion cuts directly to a desired fixed frame, and snap clears any earlier easing',()=>{
  const {rig,shot}=build();
  rig.frame(.18,destination,target,2);
  rig.frame(1/60,[2,3,9],[0,2,1],2,{reducedMotion:true});
  assert.deepEqual(shot.position,[2,3,9]);assert.deepEqual(shot.look,[0,2,1]);
  rig.snap(start,look);
  rig.frame(1/60,destination,target,2);
  assert.ok(travel(shot.position[0],start[0],destination[0])<.01);
});

test('an immediate first-person camera and subsequent menu reset are independent of stale fixed framing',()=>{
  const a=build(),b=build(),params={hero:{x:0,z:0,floor:0},yaw:.2,pitch:.1,place:{radius:20,posts:[]},view:'first',eye:[0,1.8,0]};
  a.rig.frame(.5,destination,target,2);
  assert.equal(a.rig.update(1/60,params),b.rig.update(1/60,params));
  assert.deepEqual(a.shot,b.shot,'first person never inherits decorative menu easing');
  a.rig.frame(1/60,destination,target,2);b.rig.frame(1/60,destination,target,2);
  assert.deepEqual(a.shot,b.shot,'old staging momentum is retired at interactive view entry');
});
