import test from 'node:test';
import assert from 'node:assert/strict';
import * as sim from '../src/sim.mjs';
import {CHAPTERS_SCRIPT} from '../src/story/chapters.mjs';
import {bailuZeroScript,bailuMainChapter} from '../src/story/bailu-zero.mjs';
import {readFile} from 'node:fs/promises';

// Earn the second chapter through the existing story/chat/gift actions.
function earnedEntry(){
 const s=sim.newGame({seed:44721});
 for(let i=0;i<90;i++){
  if(sim.whereIs(s,'bailu')==='rooftop'){
   sim.enter(s,'rooftop');const chapter=sim.chapterAt(s,'bailu','rooftop');
   if(chapter){const walk=steps=>{for(const step of steps)if(step[0]==='pick'){const o=step[1].reduce((a,b)=>(a.fx?.aff??0)>=(b.fx?.aff??0)?a:b);sim.applyEffect(s,'bailu',o.fx);if(o.then)walk(o.then);}};walk(CHAPTERS_SCRIPT.bailu[chapter]);sim.finishChapter(s,'bailu',chapter);}
   if(s.girls.bailu.chapter>=2)return s;
   if(sim.canChat(s,'bailu'))sim.chat(s,'bailu','steady');
   if(sim.canGift(s,'bailu')){if(!s.bag.cocoa)sim.buy(s,'giftshop','cocoa');sim.give(s,'bailu','cocoa');}
  }
  sim.advance(s);
 }
 throw Error('Normal first/second chapter route did not unlock');
}

test('special story is deterministic after chapter two and migrates old v1 saves without changing campaign',()=>{
 assert.equal(sim.bailuZeroStatus(sim.newGame()).unlocked,false);
 const earned=earnedEntry(),old=JSON.parse(sim.serialize(earned));delete old.bailuZero;
 const restored=sim.deserialize(JSON.stringify(old));
 assert.equal(sim.bailuZeroStatus(restored).unlocked,true);assert.equal(restored.bailuZero.stage,0);
 for(const key of ['day','slot','money','energy','girls','hero','stats','quests'])assert.deepEqual(restored[key],old[key],key);
 assert.equal(sim.beginBailuZero(restored).id,'bailu-zero-0');
});

for(const ending of ['renew','farewell'])test(`five real story stages preserve clothing, choices, one-time rewards and ${ending} ending`,()=>{
 let s=earnedEntry();const clock=sim.clock(s).absolute,initial=s.girls.bailu.aff;
 for(let stage=0;stage<5;stage++){
  assert.equal(sim.bailuZeroStatus(s).stage,stage);sim.beginBailuZero(s);
  if(stage===1)assert.equal(sim.chooseBailuZero(s,'archive','ask'),true);
  if(stage===2){
   assert.equal(sim.chooseBailuZero(s,'outfit','night'),true);
   assert(sim.closet(s,'bailu').includes('cardigan'));assert(sim.closet(s,'bailu').includes('scarf'));
   assert(sim.dye(s,'bailu','cardigan',0,'#6b719d'));
  }
  if(stage===3){assert(sim.chooseBailuZero(s,'distance',ending==='renew'?'close':'space'));assert(sim.chooseBailuZero(s,'reading',ending==='renew'?'read':'wait'));}
  if(stage===4)assert(sim.chooseBailuZero(s,'ending',ending));
  const before=s.girls.bailu.aff;assert.equal(sim.finishBailuZero(s,stage),true);assert.equal(sim.finishBailuZero(s,stage),false);
  assert.equal(s.girls.bailu.aff,before+2);
  s=sim.deserialize(sim.serialize(s));
 }
 assert.equal(s.bailuZero.ending,ending);assert.equal(s.bailuZero.stage,5);
 assert.equal(s.girls.bailu.wear.outer.id,'cardigan');assert.equal(s.girls.bailu.wear.outer.c[0],'#6b719d');
 assert.deepEqual(s.bailuZero.outfit.wear,s.girls.bailu.wear);assert.equal(s.girls.bailu.aff,initial+10);
 assert.equal(sim.clock(s).absolute,clock);assert.equal(s.girls.bailu.chapter,2);
 assert.equal(sim.beginBailuZero(s),null);assert.equal(sim.chooseBailuZero(s,'ending',ending==='renew'?'farewell':'renew'),false);
 assert.equal(sim.finishBailuZero(s,5),false);
 assert.equal(s.bailuZero.clues.length,3);
});

test('resume checkpoint retains current line and committed choices without reapplying them',()=>{
 let s=earnedEntry();sim.beginBailuZero(s);s.bailuZero.playback.cursor='3';s.bailuZero.playback.done['1']=true;s.bailuZero.playback.choices['2']=1;
 s=sim.deserialize(sim.serialize(s));const checkpoint=sim.beginBailuZero(s);
 assert.equal(checkpoint.cursor,'3');assert.equal(checkpoint.choices['2'],1);assert.equal(checkpoint.done['1'],true);
 assert.equal(sim.finishBailuZero(s,4),false);assert.equal(sim.chooseBailuZero(s,'distance','close'),false);
});

test('all 22 voiced script lines exactly match the Traditional Chinese production manifest',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../assets/audio/voice/manifest.json',import.meta.url),'utf8'));
 const found=new Map();
 const walk=steps=>{for(let i=0;i<steps.length;i++){const st=steps[i];if(st[0]==='voice'){const next=steps[i+1];found.set(st[1],{speaker:next[0],text:next[2]});}if(st[0]==='pick')for(const o of st[1])walk(o.then??[]);if(st[0]==='branch'){walk(st[2]);walk(st[3]);}}};
 for(let stage=0;stage<5;stage++)walk(bailuZeroScript(stage));assert.equal(found.size,22);
 for(const cue of manifest.cues.filter(cue=>cue.id.startsWith('bailu-zero-'))){assert.deepEqual(found.get(cue.id),{speaker:cue.speaker,text:cue.text},cue.id);}
});

test('the actual authored scripts select different endings and retain the requested space/read callbacks',()=>{
 const outputs=[];
 for(const branch of [0,1]){
  const s=earnedEntry(),lines=[];
  const walk=steps=>{for(const st of steps){
   if(st[0]==='pick'){const o=st[1][branch];sim.applyEffect(s,'bailu',o.fx);walk(o.then??[]);}
   else if(st[0]==='branch')walk(sim.bailuZeroMatches(s,st[1])?st[2]:st[3]);
   else if(['bailu','zhiwei','qingge'].includes(st[0]))lines.push(st[2]);
   else if(st[0]==='n')lines.push(st[1]);
  }};
  for(let stage=0;stage<5;stage++){sim.beginBailuZero(s);walk(bailuZeroScript(stage));assert(sim.finishBailuZero(s,stage));}
  outputs.push({ending:s.bailuZero.ending,text:lines.join('\n')});
 }
 assert.equal(outputs[0].ending,'renew');assert.equal(outputs[1].ending,'farewell');
 assert(outputs[0].text.includes('下次等流星的時候，我想先等到你。'));
 assert(outputs[1].text.includes('最後一封信，我還沒有讀。'));
 assert(outputs[1].text.includes('不用說話，我知道你在。'));
 assert(!outputs[1].text.includes('你才輕輕握住'));
});

test('main chapter three echoes a finished interlude without changing its rewards or chapter four',()=>{
 const s=earnedEntry();assert.equal(bailuMainChapter(s,3),null);
 const original=CHAPTERS_SCRIPT.bailu[3].find(st=>st[0]==='pick')[1];
 for(const ending of ['renew','farewell']){
  const earned=earnedEntry();
  for(let stage=0;stage<5;stage++){
   sim.beginBailuZero(earned);
   if(stage===1)sim.chooseBailuZero(earned,'archive','ask');
   if(stage===2)sim.chooseBailuZero(earned,'outfit','night');
   if(stage===3){sim.chooseBailuZero(earned,'distance','space');sim.chooseBailuZero(earned,'reading','wait');}
   if(stage===4)sim.chooseBailuZero(earned,'ending',ending);
   assert(sim.finishBailuZero(earned,stage));
  }
  const script=bailuMainChapter(earned,3),options=script.find(st=>st[0]==='pick')[1];
  assert.deepEqual(options.map(o=>o.fx),original.map(o=>o.fx));
  assert(JSON.stringify(script).includes(ending==='renew'?'核准的新社員名冊':'器材歸還單'));
  assert(!JSON.stringify(script).includes('社員不足三人'));
  assert.equal(bailuMainChapter(earned,4),null);assert.equal(earned.girls.bailu.chapter,2);
  sim.applyEffect(earned,'bailu',options[0].fx);sim.finishChapter(earned,'bailu',3);
  assert.equal(earned.girls.bailu.chapter,3);assert.equal(earned.bailuZero.ending,ending);
 }
});
