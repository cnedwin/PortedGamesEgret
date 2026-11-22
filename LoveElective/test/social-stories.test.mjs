import test from 'node:test';
import assert from 'node:assert/strict';
import * as sim from '../src/sim.mjs';
import {CHAPTERS_SCRIPT} from '../src/story/chapters.mjs';
import{socialScript}from'../src/story/social-stories.mjs';
import{readFile}from'node:fs/promises';

function earn(girl,aff){
 const s=sim.newGame({seed:921047});
 for(let i=0;i<116;i++){
  const place=sim.whereIs(s,girl);
  if(place&&sim.placeOpen(s,place)){
   sim.enter(s,place);const chapter=sim.chapterAt(s,girl,place);
   if(chapter){const walk=steps=>{for(const step of steps)if(step[0]==='pick'){const o=step[1].reduce((a,b)=>(a.fx?.aff??0)>=(b.fx?.aff??0)?a:b);sim.applyEffect(s,girl,o.fx);if(o.then)walk(o.then);}};walk(CHAPTERS_SCRIPT[girl][chapter]);sim.finishChapter(s,girl,chapter);}
   if(s.girls[girl].chapter>=2&&s.girls[girl].aff>=aff)return s;
   if(sim.canChat(s,girl))sim.chat(s,girl,'steady');
   if(sim.canGift(s,girl)){const gift=girl==='linxia'?'sportsdrink':girl==='tangmi'?'macaron':'cocoa';if(!s.bag[gift])sim.buy(s,'giftshop',gift);sim.give(s,girl,gift);}
  }
  sim.advance(s);
 }
 throw Error('Natural route did not earn '+girl);
}

test('three invitations are earned deterministically and legacy v1 state migrates without replacing Bai Lu progress',()=>{
 for(const [id,girl,aff]of [['pool','linxia',20],['pajama','tangmi',35],['lounge','bailu',35]]){
  assert.equal(sim.socialStatus(sim.newGame(),id).unlocked,false);
  const s=earn(girl,aff),old=JSON.parse(sim.serialize(s));delete old.socialStories;
  const r=sim.deserialize(JSON.stringify(old));assert(sim.socialStatus(r,id).unlocked);
  assert.deepEqual(r.bailuZero,s.bailuZero);assert.deepEqual(r.girls,s.girls);assert.equal(r.day,s.day);
 }
});

for(const [id,girl,aff]of [['pool','linxia',20],['pajama','tangmi',35],['lounge','bailu',35]])test(`${id}: actual dress, voluntary space, resume and follow-up have lasting, one-time effects`,()=>{
 let s=earn(girl,aff);const clock=sim.clock(s).absolute,hp=s.girls[girl].aff,money=s.money,originalTop=s.girls[girl].wear.top?.id,originalBottom=s.girls[girl].wear.bottom?.id;
 assert(sim.beginSocial(s,id));assert(sim.chooseSocial(s,id,'outfit','borrow'));
 if(id==='pajama'){assert(sim.closet(s,girl).includes('overknee-stockings'));assert.notEqual(s.girls[girl].wear.legs?.id,'overknee-stockings');}
 const item=id==='pool'?'swim-onepiece':id==='pajama'?'pajama-top':'lounge-robe';
 assert(sim.closet(s,girl).includes(item));assert(sim.dye(s,girl,item,0,'#6d719c'));
 if(id==='lounge'){assert.equal(s.girls[girl].wear.top?.id,originalTop);assert.equal(s.girls[girl].wear.bottom?.id,originalBottom);}
 assert(sim.finishSocial(s,id,0));assert(!sim.finishSocial(s,id,0));
 sim.beginSocial(s,id);assert(sim.chooseSocial(s,id,'approach','space'));assert(sim.chooseSocial(s,id,'response','yes'));
 s.socialStories[id].playback.cursor='7';s.socialStories[id].playback.choices['3']=2;
 s=sim.deserialize(sim.serialize(s));assert.equal(sim.beginSocial(s,id).choices['3'],2);assert.equal(s.socialStories[id].approach,'space');
 assert(sim.finishSocial(s,id,1));assert(!sim.finishSocial(s,id,1));assert.equal(sim.socialFollowUpReady(s,girl),id);
 assert.equal(s.socialStories[id].outfit.lead.dyes[item][0],'#6d719c');assert.equal(s.girls[girl].dyes[item][0],'#6d719c');
 assert(sim.beginSocial(s,id));assert(sim.chooseSocial(s,id,'followup','later'));assert(sim.finishSocial(s,id,2));
 assert.equal(sim.socialFollowUpReady(s,girl),null);sim.advance(s);assert.equal(sim.socialFollowUpReady(s,girl),id);
 sim.beginSocial(s,id);assert(sim.chooseSocial(s,id,'followup','accept'));assert(sim.finishSocial(s,id,2));
 assert.equal(s.socialStories[id].followup,'done');assert(s.socialStories[id].nameUnlocked);assert(s.socialStories[id].topics.length>0);
 assert.equal(s.girls[girl].aff,hp+4);assert.equal(sim.beginSocial(s,id),null);assert(!sim.finishSocial(s,id,2));
 assert.equal(sim.clock(s).absolute,clock+1);
 assert.equal(s.money,money);
});

test('all social approaches have different spoken callbacks and all 15 exact zh-TW voice cues are reachable',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../assets/audio/voice/manifest.json',import.meta.url),'utf8')),found=new Map(),callbacks=new Set();
 for(const [id,girl,aff]of [['pool','linxia',20],['pajama','tangmi',35],['lounge','bailu',35]])for(const approach of ['closer','respond','space']){
  const s=earn(girl,aff);
  const walk=steps=>{for(let i=0;i<steps.length;i++){
   const st=steps[i];if(st[0]==='voice'){const next=steps[i+1];found.set(st[1],{speaker:next[0],text:next[2]});}
   if(st[0]==='pick'){
    const options=st[1],o=options.find(o=>o.fx?.social?.key==='approach'&&o.fx.social.value===approach)??options[0];
    sim.applyEffect(s,girl,o.fx);walk(o.then??[]);
   }else if(st[0]==='social-branch')walk(sim.socialMatches(s,st[1])?st[2]:st[3]);
  }};
  for(let stage=0;stage<2;stage++){sim.beginSocial(s,id);walk(socialScript(s,id,stage));assert(sim.finishSocial(s,id,stage));}
  callbacks.add(JSON.stringify(socialScript(s,id,2).filter(step=>step[0]===girl)));
 }
 assert.equal(callbacks.size,9);assert.equal(found.size,15);
 for(const cue of manifest.cues.filter(cue=>cue.id.startsWith('social-')))assert.deepEqual(found.get(cue.id),{speaker:cue.speaker,text:cue.text},cue.id);
});

test('Bai Lu social dialogue preserves the earned letter ending and never interprets past closeness as current permission',()=>{
 const s=earn('bailu',35);
 for(let stage=0;stage<5;stage++){
  sim.beginBailuZero(s);
  if(stage===1)sim.chooseBailuZero(s,'archive','ask');if(stage===2)sim.chooseBailuZero(s,'outfit','night');
  if(stage===3){sim.chooseBailuZero(s,'distance','space');sim.chooseBailuZero(s,'reading','wait');}
  if(stage===4)sim.chooseBailuZero(s,'ending','farewell');assert(sim.finishBailuZero(s,stage));
 }
 const old=JSON.stringify(s.bailuZero);sim.beginSocial(s,'lounge');sim.chooseSocial(s,'lounge','outfit','borrow');sim.finishSocial(s,'lounge',0);sim.beginSocial(s,'lounge');
 const script=JSON.stringify(socialScript(s,'lounge',1));assert(script.includes('望遠鏡交回去了'));assert(script.includes('沒有急著讀完'));assert(script.includes('不會自動替今天回答'));
 assert.equal(JSON.stringify(s.bailuZero),old);
});
