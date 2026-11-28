import assert from 'node:assert/strict';
import {test} from 'node:test';
import '../vendor/node-register.mjs';
const {createRuntimeWords}=await import('../web/jyx2/ui/native/runtime-words.mjs');
import {describeSaveSlot} from '../web/save-info.mjs';
import {playGameEvent} from '../src/game-events.mjs';

test('save metadata follows selected language without changing source locations or companion names',()=>{
 const places=[{id:7,name:'測試場地'}],roles={0:{name:'測試角色'},1:{name:'測試同伴'}};
 const save={location:{id:7},flags:{finished:true},savedAt:'2026-11-19T18:30:00.000Z',party:[0,1,-1]};
 const en=createRuntimeWords({language:'en'});
 const english=describeSaveSlot(save,places,roles,en);
 assert.equal(english.location,'Completed · 測試場地');
 assert.match(english.detail,/Saved at /);
 assert.match(english.detail,/2 in party · 測試角色, 測試同伴/);
 assert.equal(describeSaveSlot(save,places,roles).location,'已通關 · 測試場地');
 assert.equal(describeSaveSlot({location:{id:'world'}},places,roles,en).location,'World map');
 assert.equal(describeSaveSlot(undefined,places,roles,en).location,'Empty slot');
});

test('event presentation language changes only generated output, not loaded text, names or state',async()=>{
 const source='測試原文：不要翻譯。',name='測試角色',skill='測試技能';
 async function scenario(words){
   const shown=[],asks=[],dialogue=[];
   const progress=await playGameEvent({
     program:{},sceneId:7,eventSlot:0,
     run:async(_,host)=>{
       await host('talk',source,-1,1);await host('askjoin');await host('askbattle');await host('askrest');
       await host('addiq',0,3);await host('oldlearnmagic',0,1,false);await host('showmorality');await host('showfame');
     },
     game:{party:[0],inventory:new Map(),roleState:[],scenePatches:new Map()},
     catalog:{roles:{0:{name,iq:7,morality:15,fame:11,learnedMagics:[]}},magics:{1:{name:skill}}},
     view:{words:words&&((key,values)=>words.text(key,values)),talk:text=>dialogue.push(text),
       message:text=>shown.push(text),ask:text=>{asks.push(text);return false;}}
   });
   return {progress,shown,asks,dialogue};
 }
 const zh=await scenario(undefined),en=await scenario(createRuntimeWords({language:'en'}));
 assert.deepEqual(zh.dialogue,[source]);assert.deepEqual(en.dialogue,[source]);
 assert.deepEqual(en.asks,['Invite this companion?','Continue to the encounter?','Choose Yes or No.']);
 assert.deepEqual(en.shown,[name+' · Aptitude +3',name+' learned '+skill,'Your morality is 15','Your reputation is 11']);
 assert.deepEqual(zh.shown,[name+'資質增加3',name+'習得武學'+skill,'你的道德指數為15','你的聲望為11']);
 assert.deepEqual(en.progress,zh.progress);
});
