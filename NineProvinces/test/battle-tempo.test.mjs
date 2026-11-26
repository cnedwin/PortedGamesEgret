import assert from 'node:assert/strict';
import {test} from 'node:test';
import '../vendor/node-register.mjs';
import {createSandboxBattle,encounterConfig} from '../src/sim/battle-sandbox.mjs';
import {idx,stepBattle} from '../src/sim/battle.mjs';
import {createTempoMilestones,inspectTempoMilestones,beginTacticAim,selectTacticTarget,restoreTacticPause} from '../src/ui/battle-tempo.mjs';

test('aiming preserves the original paused state through target changes and re-arming',()=>{
 let aim=beginTacticAim(null,{unit:0,tactic:'wusheng'},false);assert.equal(aim.wasPaused,false);
 aim=selectTacticTarget(aim,2);assert.equal(aim.target,2);
 aim=beginTacticAim(aim,{unit:0,tactic:'weizhen'},true);assert.equal(aim.wasPaused,false);assert.equal(aim.target,null);assert.equal(restoreTacticPause(aim,true),false);
 assert.equal(restoreTacticPause(beginTacticAim(null,{unit:0,tactic:'wusheng'},true),true),true);
});
test('milestones are pure, once per battle, and require actual contact and a valid tactic target',()=>{
 const b=createSandboxBattle(encounterConfig('spears')),seen=createTempoMilestones(),before=JSON.stringify(b.units.map(u=>[u.pos,u.rage,u.record]));
 const empty=inspectTempoMilestones(b,0,seen);assert.deepEqual(empty.reasons,[]);assert.deepEqual(seen,{contact:false,tactic:false});assert.equal(JSON.stringify(b.units.map(u=>[u.pos,u.rage,u.record])),before);
 const u=b.units[0],foe=b.units.find(x=>x.side===1);u.pos=idx(8,7);foe.pos=idx(9,7);u.rage=100;u.lastAttack={time:0,target:foe.id,kind:'normal'};
 u.autoTactic=false;
 const cue=inspectTempoMilestones(b,0,seen);assert.deepEqual(cue.reasons,['contact','tactic']);assert.equal(cue.opportunity.unitId,u.id);assert(cue.opportunity.tacticId);assert.deepEqual(inspectTempoMilestones(b,0,cue.next).reasons,[]);
});
test('out of range damaging tactics and full-health healing do not trigger readiness pauses',()=>{
 const b=createSandboxBattle(encounterConfig('riverfire')),u=b.units[0];u.rage=100;u.tactics=['chibi'];u.autoTactic=false;
 assert.equal(inspectTempoMilestones(b,0,createTempoMilestones()).opportunity,null);
 u.tactics=['zhiliao'];let cue=inspectTempoMilestones(b,0,createTempoMilestones());assert.equal(cue.opportunity,null);
 u.troops-=100;cue=inspectTempoMilestones(b,0,createTempoMilestones());assert.equal(cue.opportunity.tacticId,'zhiliao');
});
test('real structure damage counts as first contact and delegated tactics do not steal manual pauses',()=>{
 const b=createSandboxBattle(encounterConfig('breach')),seen=createTempoMilestones(b);
 b.gate.hp-=1;let cue=inspectTempoMilestones(b,0,seen);assert(cue.reasons.includes('contact'));assert.equal(cue.contactKind,'gate');assert(!inspectTempoMilestones(b,0,cue.next).reasons.includes('contact'));
 const u=b.units[0];u.rage=100;u.tactics=['qiangzhen'];u.autoTactic=true;assert.equal(inspectTempoMilestones(b,0,cue.next).opportunity,null);
 u.autoTactic=false;assert.equal(inspectTempoMilestones(b,0,cue.next).opportunity.tacticId,'qiangzhen');
});
test('ordinary battle progression reaches first contact without inventing an input or mutating rules',()=>{
 const b=createSandboxBattle(encounterConfig('spears'));let seen=createTempoMilestones(),contacts=0;
 for(let i=0;i<1000&&!b.over;i++){stepBattle(b,.1,0);const cue=inspectTempoMilestones(b,0,seen);seen=cue.next;contacts+=cue.reasons.includes('contact')?1:0;}
 assert.equal(contacts,1);assert.equal(seen.contact,true);
});
