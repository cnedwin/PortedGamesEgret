import assert from 'node:assert/strict';
import {test} from 'node:test';
import '../vendor/node-register.mjs';
import {TACTICS} from '../src/data/tactics.mjs';
import {tacticPresentation,battleOutcomeReason,battleActionLabel,hexPositionLabel} from '../src/ui/battle-copy.mjs';
import {boardRenderWidth,BOARD} from '../src/ui/battle-board-layout.mjs';
import {createSandboxBattle,encounterConfig} from '../src/sim/battle-sandbox.mjs';
import {useTactic,idx} from '../src/sim/battle.mjs';

test('overview fits both measured dimensions including short fields; zoom keeps a scrollable larger field',()=>{
 for(const[w,h]of[[1064,534],[800,110],[380,300],[500,95]]){
  const width=boardRenderWidth(w,h);assert(width<=w);assert(width*BOARD.height/BOARD.width<=h);
 }
 assert(boardRenderWidth(380,200,{fit:false,zoom:1.5})>380);
 assert(Number.isFinite(boardRenderWidth(0,0)));
});
test('visible tactic cost and duration describe the unchanged successful cast rule',()=>{
 const b=createSandboxBattle(encounterConfig('spears')),u=b.units[0];u.rage=100;
 const spec=tacticPresentation(TACTICS.qiangzhen,2);assert.match(spec.effect,/30%.*8秒/);assert.match(spec.cost,/100.*清空/);
 assert(useTactic(b,u,'qiangzhen'));assert.equal(u.rage,0);assert(u.buffs.some(x=>x.key==='def'&&x.v===30&&x.t===8));
});
test('scheme failure explanation matches the existing thirty-rage remainder, not a fabricated eighty-point cost',()=>{
 const b=createSandboxBattle(encounterConfig('riverfire')),u=b.units[0],foe=b.units.find(x=>x.side===1);
 u.pos=idx(8,7);foe.pos=idx(10,7);u.rage=100;u.tactics.push('huoji');b.random=()=>1;
 assert(useTactic(b,u,'huoji',foe));assert.equal(u.rage,30);assert.equal(b.events.at(-1).kind,'tacticFailed');
 const spec=tacticPresentation(TACTICS.huoji,5);assert.match(spec.detail,/识破.*30/);assert.match(spec.target,/射程5格/);
});
test('every existing tactic has readable bilingual effects, real target scope and rage cost',()=>{
 for(const tc of Object.values(TACTICS))for(const language of ['zh','en']){
  const spec=tacticPresentation(tc,5,{language});assert(spec.effect&&spec.target&&spec.cost,tc.id);assert(spec.cost.includes('100'));
  if(language==='en')assert(!/[㐀-鿿]/.test(spec.detail),tc.id);
 }
 assert.match(tacticPresentation(TACTICS.guwu,5).target,/3格内友军/);
 assert.match(tacticPresentation(TACTICS.jianxiong,5).target,/己方全军/);
});
test('result cause names the actual losing side and respects the campaign player side',()=>{
 assert.match(battleOutcomeReason({winner:1,why:'broken'},0),/我军.*蓝军.*溃散/);
 assert.match(battleOutcomeReason({winner:0,why:'broken'},0),/敌军.*红军.*溃散/);
 assert.match(battleOutcomeReason({winner:0,why:'broken'},1),/我军.*红军.*溃散/);
 assert.equal(battleOutcomeReason({winner:1,why:'broken'}),'蓝军溃散');
 assert.equal(battleOutcomeReason({winner:0,why:'keep'},1),'本营失守');
 assert.equal(battleOutcomeReason({winner:0,why:'keep'},0),'我军攻占敌营');
 assert.equal(battleOutcomeReason({winner:0,why:'depot'},1),'我军粮仓被焚');
 assert.match(battleOutcomeReason({winner:0,why:'broken'},1,'en'),/Our army.*Red army/);
});
test('old aim/deploy recordings display ordinary instructions and coordinates without altering data',()=>{
 const action={kind:'aim',tactic:'tuci',unit:0,target:0},before=JSON.stringify(action);
 assert.equal(battleActionLabel(action),'选择目标');assert.equal(battleActionLabel({...action,target:null}),'选择战法');assert.equal(battleActionLabel({kind:'cancelAim'}),'取消施策');
 assert.equal(hexPositionLabel(48),'位置 5,3');assert.equal(hexPositionLabel(48,'en'),'Position 5,3');assert.equal(JSON.stringify(action),before);
});
