import assert from 'node:assert/strict';
import {test} from 'node:test';
import '../vendor/node-register.mjs';
const {createRuntimeWords,RUNTIME_WORDS}=await import('../web/jyx2/ui/native/runtime-words.mjs');

test('native runtime generated UI copy has complete bilingual keys and uses browser language negotiation',()=>{
  const words=createRuntimeWords({wanted:['en-GB','zh-TW']});
  assert.equal(words.language,'en');
  assert.deepEqual(words.missing(),{zh:[],en:[]});
  assert.equal(words.text('save.selectLoad'),'Choose a record to load');
  words.setLanguage('zh');
  assert.equal(words.text('save.selectLoad'),'選擇讀取的存檔');
});
test('templates preserve dynamic proper names and source values, including punctuation',()=>{
  const words=createRuntimeWords({language:'en'});
  const name='原文{name}／樣本',skill='功法（原文）';
  assert.equal(words.text('reward.item',{name,amount:3}),'Received '+name+' × 3');
  assert.equal(words.text('shop.item',{name,price:27}),name+' · 27 silver');
  assert.equal(words.text('event.learned',{name,skill}),name+' learned '+skill);
  assert.equal(words.text('result.returnWin',{place:name}),'Continue to return to '+name+'; this victory will be recorded and saved automatically.');
});
test('generated English headings and all static text leave source content out of the translation table',()=>{
  for(const [key,text] of Object.entries(RUNTIME_WORDS.en)){
    assert.doesNotMatch(text,/\p{Script=Han}/u,key);
  }
  const en=createRuntimeWords({language:'en'});
  assert.equal(en.text('battle.round',{round:7,remaining:3,total:8})+en.text('battle.autoSuffix'),'Round 7 · Remaining enemies 3/8 · Auto');
  assert.equal(en.text('map.coordinate',{x:11,y:22}),'Tile 11 · 22');
  assert.equal(en.text('route.noPath'),'No reachable path; select nearby ground');
});
