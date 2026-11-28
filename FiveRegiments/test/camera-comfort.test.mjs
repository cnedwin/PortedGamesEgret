// Presentation-only camera comfort: no game clock, rules or input simulation.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCameraRig} from '../src/view/camera.mjs';

const dt=1/60, place={radius:30,posts:[]};
const options={hero:{x:0,z:0,floor:0},yaw:.25,pitch:.1,place};
function recorder(){
  const shot={};
  const rig=createCameraRig({
    setPosition(...values){shot.position=values;},
    lookAt(...values){shot.look=values;}
  });
  rig.snap([0,1.6,-4],[0,1.4,0]);
  return {rig,shot};
}
const residual=({rig,shot})=>shot.position.map((n,i)=>n-rig.at[i]-rig.contact[i]);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} differs from ${b}`);

test('decorative third-person shake is bounded and calmer without masking the contact accent',()=>{
  const sample=recorder();
  let peak=0,previous=null,variation=0,motion=0;
  for(let i=0;i<48;i++){
    if(i===0||i===12||i===18)sample.rig.kick(.8,.3);
    sample.rig.update(dt,options);
    const offset=residual(sample),amount=Math.hypot(offset[0],offset[1]);
    peak=Math.max(peak,amount);motion+=amount;
    if(previous)variation+=Math.hypot(offset[0]-previous[0],offset[1]-previous[1]);
    previous=offset;
    close(offset[2],0);
  }
  assert.ok(motion>0,'ordinary mode retains a visible decorative accent');
  assert.ok(peak<.065,`decorative camera excursion ${peak} must stay below the comfort bound`);
  assert.ok(variation<1.15,`rapid flicker ${variation} must remain bounded`);
});

test('reduced motion suppresses decorative shake only; the underlying camera transforms stay identical',()=>{
  const normal=recorder(),reduced=recorder();
  for(let i=0;i<60;i++){
    if(i===0||i===12||i===24){normal.rig.kick(.9,.7);reduced.rig.kick(.9,.7);}
    const frame={...options,hero:{...options.hero,x:i*.013,z:i*.008},
      target:{x:1,z:2},targetYaw:.45,mounted:i>=20,zoom:1.1};
    const a=normal.rig.update(dt,frame),b=reduced.rig.update(dt,{...frame,reducedMotion:true});
    assert.equal(a,b,'the returned heading is invariant');
    for(const key of ['at','look','contact','distance','up','bowFrame','shake','shakeT'])assert.deepEqual(normal.rig[key],reduced.rig[key],key);
    for(const n of residual(reduced))close(n,0);
    assert.deepEqual(reduced.shot.look,reduced.rig.look);
  }
});

test('first-person and menu preview base framing do not change with the reduced-motion flag',()=>{
  const normal=recorder(),reduced=recorder();
  normal.rig.kick(.8,.3);reduced.rig.kick(.8,.3);
  const eye=[.1,1.7,.2];
  normal.rig.update(dt,{...options,view:'first',eye});
  reduced.rig.update(dt,{...options,view:'first',eye,reducedMotion:true});
  assert.deepEqual(normal.shot,reduced.shot);
  const from=[2,2,6],to=[0,1,0];
  normal.rig.frame(dt,from,to);reduced.rig.frame(dt,from,to);
  assert.deepEqual(normal.shot,reduced.shot);
});
