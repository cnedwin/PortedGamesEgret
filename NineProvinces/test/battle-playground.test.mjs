import assert from 'node:assert/strict';
import {test} from 'node:test';
import '../vendor/node-register.mjs';
import {ENCOUNTERS,encounterConfig,createSandboxBattle} from '../src/sim/battle-sandbox.mjs';
import {stepBattle,tacticPreview,useTactic,idx} from '../src/sim/battle.mjs';
import {createBattleRecorder} from '../src/sim/battle-history.mjs';
import {formationSlots,boardPoint,terrainLift} from '../src/ui/battle-board-layout.mjs';

test('curated encounters use actual officers and ordinary battlefield objectives, and finish naturally',()=>{
 assert.equal(Object.keys(ENCOUNTERS).length,4);
 for(const id of Object.keys(ENCOUNTERS)){
  const config=encounterConfig(id),before=JSON.stringify(config),a=createSandboxBattle(config),b=createSandboxBattle(config);
  assert.equal(JSON.stringify(config),before);assert(a.units.every(u=>u.pos>=0));assert.equal(a.setup.encounterId,id);
  if(id==='riverfire'){assert(a.units[0].tactics.includes('chibi'));assert(a.units[0].int>80);}
  for(let n=0;n<1800&&!a.over;n++)stepBattle(a,.25);for(let n=0;n<1800&&!b.over;n++)stepBattle(b,.25);
  assert(a.over,id+' must reach an ordinary result');assert.deepEqual(a.over,b.over);assert.deepEqual(a.units.map(u=>u.troops),b.units.map(u=>u.troops));
 }
 const copy=encounterConfig('spears');copy.armies[0][0].troops=1000;assert.notEqual(encounterConfig('spears').armies[0][0].troops,1000);
});
test('tactic targeting preview shares actual area and refuses invalid/out-of-reach targets without mutation',()=>{
 const b=createSandboxBattle(encounterConfig('riverfire')),u=b.units[0],foe=b.units.find(u=>u.side===1);u.pos=idx(8,7);foe.pos=idx(10,7);u.rage=100;
 const before=JSON.stringify(b.units.map(u=>[u.troops,u.rage,u.pos])),p=tacticPreview(b,u,'chibi',foe);assert(p.valid&&p.hexes.includes(foe.pos));assert(p.targets.includes(foe.id));assert.equal(JSON.stringify(b.units.map(u=>[u.troops,u.rage,u.pos])),before);
 assert.equal(tacticPreview(b,u,'missing',foe).valid,false);foe.pos=idx(21,0);assert.equal(tacticPreview(b,u,'chibi',foe).valid,false);foe.pos=idx(10,7);assert(useTactic(b,u,'chibi',foe));assert(foe.troops<foe.start);
});
test('replay captures detached path and attack counters for truthful command and contact presentation',()=>{
 const b=createSandboxBattle(encounterConfig('spears')),r=createBattleRecorder(b);b.units[0].path=[1,2,3];b.units[0].goal=3;r.capture('fight',{force:true});const tape=r.finish();assert.deepEqual(tape.frames.at(-1).units[0].path,[1,2,3]);b.units[0].path.push(4);assert.deepEqual(tape.frames.at(-1).units[0].path,[1,2,3]);assert.equal(tape.frames.at(-1).units[0].hits,0);
});
test('formation miniatures are bounded, distinct and follow actual odd-row hex coordinates',()=>{
 const square=formationSlots('square',12),arrow=formationSlots('arrowhead',12);assert.equal(square.length,12);assert.notDeepEqual(square,arrow);assert(square.every(p=>Number.isFinite(p.x)&&Math.abs(p.x)<=15&&Math.abs(p.y)<=15));assert.equal(formationSlots('longsnake',999).length,12);assert.equal(formationSlots('missing',0).length,3);
 assert(boardPoint(idx(1,1)).x>boardPoint(idx(1,0)).x);assert(terrainLift('wall')>terrainLift('plain'));assert.equal(terrainLift('water'),0);
});
