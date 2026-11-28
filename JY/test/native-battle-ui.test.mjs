import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../vendor/node-register.mjs';
const {checkView,planView}=await import('@egret/engine/web/view');
const {battleWords,projectBattleUi,buildBattleHud,buildBattlePrompt}=await import('../web/jyx2/ui/native/battle-ui.mjs');
const {buildBattleResult,normalizeResultCopy}=await import('../web/jyx2/ui/native/battle-result-ui.mjs');

const words=battleWords('en');
const actor={name:'Synthetic player',side:0,hp:6,maxHp:9,mp:4,maxMp:8,learnedMagics:[1,2],moved:false};
const target={name:'Synthetic counterpart',side:1,hp:3,maxHp:7,action:'wait'};
function state(overrides={}){
  return {result:null,pendingResult:null,round:2,turn:actor,canAct:true,auto:false,moveRange:3,target,activeMagicName:'Sample',
    ...overrides};
}
test('battle UI projection reads only host-provided flags, choices, preview and counts',()=>{
  const plain=projectBattleUi({state:state(),actions:['move','status','rest']},words);
  assert.equal(plain.phase,'active');
  assert.equal(plain.commands.KeyM.enabled,true);
  assert.equal(plain.commands.KeyI.enabled,false);
  assert.equal(plain.commands.Enter.enabled,false);
  assert.equal(plain.actor.hpRatio,2/3);
  assert.equal(plain.target.vitalRatio,3/7);
  const selecting=projectBattleUi({state:state({selection:{type:'move'}}),actions:['move'],
    preview:{type:'move',path:[{},{}],stamina:2},context:{}},words);
  assert.equal(selecting.commands.Enter.enabled,true);
  assert.equal(selecting.commands.KeyM.pressed,true);
  assert.equal(selecting.target.showMeter,false);
  assert.match(selecting.target.detail,/2 \/ 3/);
  const disabled=projectBattleUi({state:state({auto:true}),actions:['move','status']},words);
  assert.equal(disabled.commands.KeyM.enabled,false);
  assert.equal(disabled.commands.Tab.pressed,true);
});
test('modal phase and invalid preview are explicit without changing any game rule',()=>{
  assert.equal(projectBattleUi({state:undefined},words).phase,'hidden');
  assert.equal(projectBattleUi({state:state({result:false})},words).phase,'hidden');
  assert.equal(projectBattleUi({state:state(),context:{prompt:'restart'}},words).phase,'confirm');
  assert.equal(projectBattleUi({state:state(),context:{prompt:'host-owned-prompt'}},words).phase,'hidden');
  const invalid=projectBattleUi({state:state({selection:{type:'move'}}),context:{invalid:true}},words);
  assert.equal(invalid.target.tone,'warning');
});
const frames=[
  {orientation:'landscape',form:'phone',screen:{x:-180,y:0,width:1320,height:540},safe:{x:-120,y:0,width:1200,height:490}},
  {orientation:'portrait',form:'phone',screen:{x:0,y:0,width:492,height:990},safe:{x:0,y:40,width:492,height:900}},
  {orientation:'landscape',form:'tablet',screen:{x:0,y:0,width:960,height:720},safe:{x:0,y:0,width:960,height:720}},
  {orientation:'portrait',form:'tablet',screen:{x:0,y:0,width:720,height:960},safe:{x:0,y:0,width:720,height:960}}
];
function safely(plan,name,min=74){
  const {rect:r}=plan.parts[plan.names.get(name)],s=plan.area;
  assert.ok(r.width>=min&&r.height>=min,JSON.stringify({name,r,variant:plan.variant}));
  assert.ok(r.x>=s.x&&r.y>=s.y&&r.x+r.width<=s.x+s.width+1e-6&&r.y+r.height<=s.y+s.height+1e-6,JSON.stringify({name,r,s}));
  return r;
}
function noOverlap(rects){
  for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
    const a=rects[i],b=rects[j];
    assert.ok(Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)<=0.01||
      Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)<=0.01,JSON.stringify({a,b}));
  }
}
test('actual native planner keeps all primary command targets within safe area and non-overlapping',()=>{
  const views=buildBattleHud(words),prompt=buildBattlePrompt(words);
  assert.ok(checkView(views).size>0);assert.ok(checkView(prompt).size>0);
  for(const frame of frames){
    const plan=planView(views,frame);
    noOverlap(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyF','KeyM','KeyI','Enter','KeyB','KeyT','KeyV','KeyL','Tab','more']
      .map(name=>safely(plan,name)));
    for(const name of ['KeyR','Escape'])safely(plan,name);
    const confirmation=planView(prompt,frame);
    noOverlap(['confirm-back','confirm-accept'].map(name=>safely(confirmation,name)));
  }
});
test('fixed 640×360 design keeps compact primary controls separate and secondary commands available',()=>{
  const frame={orientation:'landscape',form:'phone',screen:{x:0,y:0,width:640,height:360},safe:{x:0,y:0,width:640,height:360}};
  const desc=buildBattleHud(words,{compact:true});
  assert.ok(checkView(desc).size>0);
  const plan=planView(desc,frame);
  noOverlap(['KeyW','KeyA','KeyS','KeyD','KeyM','KeyI','Enter','KeyB','Tab','more'].map(name=>safely(plan,name,56)));
  noOverlap(['KeyQ','KeyF','KeyR','Escape','KeyM','KeyI','Enter','KeyB','KeyT','KeyV','KeyL','Tab','more'].map(name=>safely(plan,name,56)));
  for(const name of ['actor-card','target-card','encounter-context'])assert.ok(plan.names.has(name));
});
test('result screen accepts only injected summary records and has native scrollable details',()=>{
  const result=normalizeResultCopy({won:false,summary:'Original synthetic summary · Sample record',detail:'Return to the test scene.'},words);
  assert.equal(result.won,false);
  assert.ok(result.lines.some(line=>line.includes('Sample record')));
  const view=buildBattleResult(words,result);
  assert.ok(checkView(view).size>0);
  for(const frame of frames){
    const plan=planView(view,frame);
    safely(plan,'continue');
    assert.ok(plan.names.has('result-scroll'));
  }
});

test('injected encounter metadata is preserved without changing commands or result',()=>{
  const meta={title:'Synthetic arena',status:'3 / 5',hint:'Choose a cell'};
  const ui=projectBattleUi({state:state(),actions:['move'],context:meta},words);
  assert.deepEqual(ui.metadata,meta);
  assert.equal(ui.commands.KeyM.enabled,true);
  assert.equal(projectBattleUi({state:state({result:false}),context:meta},words).phase,'hidden');
});