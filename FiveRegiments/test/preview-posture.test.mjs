import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import '../vendor/node-register.mjs';
const [{Scene3D,loadGltf3D},{createFigure},{createHorse},{createMotion},{createFight},{qrot,qinv,sub}]=await Promise.all([
  import('@egret/engine/world3d'),import('../src/view/figure.mjs'),import('../src/view/horse.mjs'),import('../src/view/motion.mjs'),import('../src/sim/fight.mjs'),import('../src/view/rig.mjs')]);
const ORDER=['yulin','tiger','vanguard','plume','archer'],ASSETS=new URL('../assets/',import.meta.url),deg=x=>x*180/Math.PI;
const load=(name,set)=>loadGltf3D(readFileSync(new URL('characters/'+name+'-'+set+'.glb',ASSETS)),{decodeImage:async()=>({data:new Uint8Array(4),width:1,height:1})});
function loadMotion(regiment){const bin=readFileSync(new URL('motion/'+regiment+'.bin',ASSETS));return createMotion(JSON.parse(readFileSync(new URL('motion/'+regiment+'.json',ASSETS))),bin.buffer.slice(bin.byteOffset,bin.byteOffset+bin.byteLength));}
function headLocal(rig){return qrot(qinv(rig.world('head').r),rig.dirToRig([0,0,1]));}
function posture(rig,localForward){const axis=sub(rig.toBody(rig.world('neck_01').t),rig.toBody(rig.world('pelvis').t)),gaze=rig.dirToBody(qrot(rig.world('head').r,localForward));return {trunk:deg(Math.atan2(axis[2],axis[1])),head:deg(Math.atan2(gaze[1],Math.hypot(gaze[0],gaze[2]))),yaw:deg(Math.atan2(gaze[0],gaze[2]))};}
const nearVector=(a,b,epsilon=1e-6)=>assert(Math.hypot(...Array.from(a,(v,i)=>v-b[i]))<epsilon);

test('each actual five-regiment preview raises torso and gaze without changing foot placement or the logical actor',async t=>{
  const world=new Scene3D(),game=createFight({hero:{regiment:ORDER[0]},foes:ORDER.slice(1).map(regiment=>({regiment}))});
  for(const set of ['low','mid'])for(const m of game.men){const [a,b]=await Promise.all([load(m.regiment,set),load(m.regiment,set)]),motion=loadMotion(m.regiment);
    const before=createFigure({regiment:m.regiment,world,motion,body:a}),after=createFigure({regiment:m.regiment,world,motion,body:b});
    const gazeBefore=headLocal(before.rig),gazeAfter=headLocal(after.rig),horseBody=m.horse?await load('horse',set):null,horse=horseBody?createHorse({body:horseBody,world}):null;
    const logical=()=>[m.x,m.z,m.face,m.hp,m.alive,m.mounted,game.time],original=logical();
    try{
      for(let i=0;i<30;i++){horse?.update(m.horse,1/60);const seat=horse?.seat();before.update(m,game,1/60,{seat});after.update(m,game,1/60,{seat,preview:true});}
      const old=posture(before.rig,gazeBefore),next=posture(after.rig,gazeAfter);
      assert(old.trunk>18&&old.head<-15,`${m.regiment} original display slouch recorded`);
      assert(Math.abs(next.trunk)<9,`${m.regiment} torso upright: ${next.trunk}`);
      assert(next.head>=-1&&next.head<9,`${m.regiment} gaze raised: ${next.head}`);
      for(const name of ['pelvis','thigh_l','thigh_r','foot_l','foot_r'])nearVector(before.rig.world(name).t,after.rig.world(name).t);
      nearVector(before.holder.position,after.holder.position);assert.deepEqual(logical(),original);
      t.diagnostic(`${set} ${m.regiment}: chest ${old.trunk.toFixed(1)}°→${next.trunk.toFixed(1)}°, gaze ${old.head.toFixed(1)}°→${next.head.toFixed(1)}°`);
    }finally{before.dispose();after.dispose();horse?.dispose();horseBody?.dispose();}
  }
});
