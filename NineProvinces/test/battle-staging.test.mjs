import assert from 'node:assert/strict';
import {test} from 'node:test';
import {formationSlots, freshAttack, createSiegeLighting, battleCameraFrame} from '../src/view3d/battle-staging.mjs';

test('sample formations have distinct bounded silhouettes and no duplicated soldier positions', () => {
  const shapes = ['fishscale','arrowhead','craneswing','square','geese','longsnake','crescent','yoke'].map(id => {
    const slots = formationSlots(id, 16);
    assert.equal(slots.length, 16);
    assert.equal(new Set(slots.map(p => p.join(','))).size, 16);
    assert(slots.every(([x,z]) => Number.isFinite(x) && Number.isFinite(z) && Math.hypot(x,z) <= 1.46));
    return JSON.stringify(slots);
  });
  assert.equal(new Set(shapes).size, shapes.length);
  const width = slots => Math.max(...slots.map(p=>p[0])) - Math.min(...slots.map(p=>p[0]));
  const depth = slots => Math.max(...slots.map(p=>p[1])) - Math.min(...slots.map(p=>p[1]));
  assert(width(formationSlots('geese',16)) > depth(formationSlots('geese',16)));
  assert(depth(formationSlots('longsnake',16)) > width(formationSlots('longsnake',16))*2);
  assert.deepEqual(formationSlots('square',1), [[0,0]]);
});

test('only actual new lastAttack signals animate a strike, never cooldown resets', () => {
  const unit={id:2,cd:1.3,lastAttack:null};
  assert.equal(freshAttack(unit,null),null);
  unit.lastAttack={time:4.2,target:5,kind:'normal'};
  const event=freshAttack(unit,null);assert.deepEqual(event,{unit:2,target:5,kind:'normal',t:4.2,stamp:'4.2:5:normal'});
  assert.equal(freshAttack(unit,event.stamp),null);
  unit.cd=0.1;assert.equal(freshAttack(unit,event.stamp),null);
  unit.lastAttack={time:4.3,target:1,kind:'retaliation'};
  assert.equal(freshAttack(unit,event.stamp).target,1);
});

test('sample light lease restores all owned stage values exactly and dispose is idempotent', () => {
  const light=()=>({color:new Float32Array([1,.9,.8]),intensity:2.9,position:new Float32Array([1,2,3]),quaternion:new Float32Array([0,0,0,1]),groundColor:new Float32Array([.4,.3,.2]),setPosition(...p){this.position.set(p);},lookAt(){this.quaternion.set([1,0,0,0]);},setQuaternion(...q){this.quaternion.set(q);}});
  const stage={sun:light(),sky:light(),haze:[.56,.62,.66],scene:{background:{id:'day'},environment:{id:'day-env'},environmentIntensity:.18},app:{quality:'medium',renderer:{postProcess:{bloomIntensity:.32,contrast:1.06,saturation:1.08,vignette:.22}}}};
  const snapshot=()=>JSON.stringify(stage);
  const before=snapshot(),lease=createSiegeLighting(stage,{id:'sunset'});
  lease.update({x:10,z:20},3);assert.notEqual(snapshot(),before);assert.equal(stage.scene.background.id,'sunset');
  lease.dispose();assert.equal(snapshot(),before);lease.dispose();assert.equal(snapshot(),before);
});

test('sample framing uses the available field rather than the full canvas', () => {
  const points=[{x:0,z:0,y:0},{x:25,z:20,y:3},{x:-15,z:5,y:0}];
  const full=battleCameraFrame(points,{width:1440,height:900,left:0,right:1440,top:0,bottom:900});
  const rail=battleCameraFrame(points,{width:667,height:325,left:150,right:419,top:88,bottom:317});
  assert(rail.distance>full.distance);
  assert(rail.x>5, 'left-of-centre visible field shifts the camera target right');
  assert([rail.x,rail.z,rail.distance].every(Number.isFinite));
});
