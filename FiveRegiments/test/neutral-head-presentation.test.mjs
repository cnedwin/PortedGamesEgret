import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import '../vendor/node-register.mjs';

const { Scene3D, loadGltf3D } = await import('@egret/engine/world3d');
const { createFigure } = await import('../src/view/figure.mjs');
const { createMotion } = await import('../src/view/motion.mjs');
const { createFight } = await import('../src/sim/fight.mjs');
const { createDecorativePoseTransition } = await import('../src/view/decorative-pose-transition.mjs');
const DEG = 180 / Math.PI;
const angle=(a,b)=>2*Math.acos(Math.min(1,Math.abs(a.reduce((s,x,i)=>s+x*b[i],0)/(Math.hypot(...a)*Math.hypot(...b)))));
const q=degrees=>[0,Math.sin(degrees/DEG/2),0,Math.cos(degrees/DEG/2)];

test('a decorative quaternion transition settles by elapsed time, resets immediately and bounds lag',()=>{
  const a=createDecorativePoseTransition(),b=createDecorativePoseTransition(),origin=q(0),target=q(12);
  assert.strictEqual(a.update(origin,1/60),origin);b.update(origin,1/30);
  let first,even;
  for(let i=0;i<6;i++)first=[...a.update(target,1/60)];
  for(let i=0;i<3;i++)even=[...b.update(target,1/30)];
  assert(angle(first,even)<.001);assert(angle(first,target)<1.5/DEG);
  const far=q(100),next=a.update(far,1/60);
  assert(angle(next,far)<14/DEG);assert(Math.abs(Math.hypot(...next)-1)<1e-8);
  const held=[...a.update(far,0)];assert.deepEqual([...a.update(target,0)],held);
  a.reset();assert.strictEqual(a.update(target,1/60),target);
  // Opposite quaternion signs describe the same orientation, not a long turn.
  const negative=target.map(x=>-x);assert(angle(a.update(negative,1/60),target)<1e-6);
  const authoredChange=q(24);const restrained=a.update(authoredChange,1/60,.105);
  assert(angle(restrained,authoredChange)<6.1/DEG); // expressive displays keep a tighter bound
});

test('five actual rigs ease neutral start/turn/stop head jumps without changing any other bone or eye origin',async t=>{
  const assets=new URL('../assets/',import.meta.url);
  for(const id of ['yulin','tiger','vanguard','plume','archer']){
    const bin=readFileSync(new URL(`motion/${id}.bin`,assets));
    const motion=createMotion(JSON.parse(readFileSync(new URL(`motion/${id}.json`,assets))),bin.buffer.slice(bin.byteOffset,bin.byteOffset+bin.byteLength));
    const body=await loadGltf3D(readFileSync(new URL(`characters/${id}-low.glb`,assets)),{decodeImage:async()=>({data:new Uint8Array(4),width:1,height:1})});
    const fig=createFigure({regiment:id,world:new Scene3D(),motion,body});
    try{
      const game=createFight({hero:{regiment:id},foes:[{regiment:'yulin'}]});
      const man=game.hero;Object.assign(man,{mounted:false,guard:false,draw:false,act:null,stun:0,face:0});
      const rig=fig.rig,setWorld=rig.setWorld;
      let rawHead=null,edits=0;
      const untouched=['pelvis','spine_03','neck_01','foot_l','foot_r','hand_l','hand_r'];
      rig.setWorld=(name,value)=>{
        if(name!=='head')return setWorld(name,value);
        rawHead=[...rig.world('head').r];const origin=[...rig.world('head').t];
        const before=untouched.map(bone=>{const w=rig.world(bone);return [...w.r,...w.t];});
        setWorld(name,value);edits++;
        assert.deepEqual(rig.world('head').t,origin);
        assert.deepEqual(untouched.map(bone=>{const w=rig.world(bone);return [...w.r,...w.t];}),before);
      };
      const sequence=[[0,0,80],[0,1.3,100],[1.3,0,70],[1.1,1.1,70],[0,0,60],[0,3.1,90],[0,0,60]];
      let previousRaw=null,previousHead=null,rawJump=0,easedJump=0,maxLag=0;
      for(const [vx,vz,count] of sequence){Object.assign(man,{vx,vz});for(let i=0;i<count;i++){
        rawHead=null;game.time+=.015;fig.update(man,game,1/60);
        const head=[...rig.world('head').r],raw=rawHead??head;
        if(i<8&&previousHead){rawJump=Math.max(rawJump,angle(previousRaw,raw));easedJump=Math.max(easedJump,angle(previousHead,head));}
        maxLag=Math.max(maxLag,angle(raw,head));previousRaw=raw;previousHead=head;
      }}
      assert(edits>200,`${id}: no neutral head transition`);
      assert(rawJump>12/DEG&&easedJump<rawJump*.72,`${id}: ${rawJump*DEG}° -> ${easedJump*DEG}°`);
      assert(maxLag<14/DEG);t.diagnostic(`${id}: ${ (rawJump*DEG).toFixed(2) }° -> ${ (easedJump*DEG).toFixed(2) }°, maximum lag ${(maxLag*DEG).toFixed(2)}°`);

      // Exercise the existing stationary expressive/reaction displays, without advancing the
      // rules or constructing an action. The default presentation event is already in the game;
      // the head filter must leave every other authored transform unchanged on these frames too.
      const beforeExpression=edits;let expressionRaw=0,expressionEased=0,expressionLag=0;
      const observe=()=>{
        rawHead=null;game.time+=.015;fig.update(man,game,1/60);
        const head=[...rig.world('head').r],raw=rawHead??head;
        expressionRaw=Math.max(expressionRaw,angle(previousRaw,raw));
        expressionEased=Math.max(expressionEased,angle(previousHead,head));
        expressionLag=Math.max(expressionLag,angle(raw,head));previousRaw=raw;previousHead=head;
      };
      man.guard=true;for(let i=0;i<36;i++)observe();
      fig.struck();for(let i=0;i<36;i++)observe();
      man.guard=false;for(let i=0;i<30;i++)observe();
      assert(edits-beforeExpression>35,`${id}: expressive display bypassed generic head transition`);
      assert(expressionEased<=expressionRaw*1.05+1/DEG,`${id}: expressive display introduced a new head jump`);
      assert(expressionLag<14/DEG);
      t.diagnostic(`${id} existing expressive/reaction display: ${(expressionRaw*DEG).toFixed(2)}° -> ${(expressionEased*DEG).toFixed(2)}°, maximum lag ${(expressionLag*DEG).toFixed(2)}°`);
      const count=edits;fig.update(man,game,1/60,{preview:true});assert.equal(edits,count);
    }finally{fig.dispose();}
  }
});
