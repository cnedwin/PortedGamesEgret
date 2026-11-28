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
