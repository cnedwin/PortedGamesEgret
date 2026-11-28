import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createBattleReframeGate,battleReframeIndices} from '../src/view3d/battle-viewport-reframe.mjs';
test('initial and minor resizes preserve camera; meaningful orientation reframe happens once after actual layout stabilizes',()=>{
 const gate=createBattleReframeGate();
 assert.equal(gate.observe(1280,800,false),false);
 assert.equal(gate.observe(1280,790,false),false);
 assert.equal(gate.observe(873,325,false),false);assert.equal(gate.observe(873,325,false,true),false);
 assert.equal(gate.observe(873,325,false),true);assert.equal(gate.observe(873,325,false),false);
 assert.equal(gate.observe(411,813,true),false);
 assert.equal(gate.observe(411,800,true),false);
 assert.equal(gate.observe(411,800,true),true);assert.equal(gate.observe(411,800,true),false);
});
test('rotation targeting reads original selected/active positions and goal without altering battle state',()=>{
 const battle={units:[{id:0,pos:7,gone:false},{id:1,pos:10,gone:false},{id:2,pos:12,gone:true},{id:3,pos:-1,gone:false}],gate:{at:9},keep:10};
 const before=JSON.stringify(battle);
 assert.deepEqual(battleReframeIndices(battle,{selected:0,preview:{path:[8,9],hex:10},includeObjectives:true}),[7,8,9,10]);
 assert.deepEqual(battleReframeIndices(battle,{selected:2,includeObjectives:false}),[7,10]);
 assert.equal(JSON.stringify(battle),before);
});

test('Locate chooses a real free marker-sized center instead of a covered short-landscape midpoint',async()=>{
 const {chooseBattleLocateAnchor,locateCameraOffset}=await import('../src/view3d/battle-viewport-reframe.mjs');
 const area={width:873,height:325,safe:{left:0,top:0,right:873,bottom:325},obstacles:[{left:0,top:0,right:873,bottom:110},
 {left:0,top:110,right:168,bottom:325},{left:618,top:110,right:873,bottom:325},
 {left:303,top:110,right:484,bottom:187},{left:175,top:296,right:609,bottom:325}]};
 const anchor=chooseBattleLocateAnchor(area);assert(anchor);assert(anchor.y>=212&&anchor.y<=267);assert(anchor.x>=227&&anchor.x<=559);
 const offset=locateCameraOffset(area,45,anchor);
 assert(Number.isFinite(offset.x)&&Number.isFinite(offset.z));assert.notEqual(offset.z,2);
 const clear=chooseBattleLocateAnchor({width:1280,height:800,safe:{left:0,top:0,right:1280,bottom:800},obstacles:[]});assert.equal(clear.x,640);assert.equal(clear.y,400);
});
