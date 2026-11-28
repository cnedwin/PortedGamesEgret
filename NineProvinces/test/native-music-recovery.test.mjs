import {test} from 'node:test';import assert from 'node:assert/strict';
import {createMusicRecovery} from '../src/ui/native-music-recovery.mjs';
const turn=()=>new Promise(r=>setImmediate(r));
test('optional failed scene music offers native retry and continue; only user retry invokes current theme',async()=>{
 const calls=[],prompts=[];let current='title';
 const sound={get music(){return current;},theme:async name=>{calls.push(name);}};
 const game={confirm(question,options){return new Promise(resolve=>prompts.push({question,options,resolve}));}};
 const h=createMusicRecovery({game,getSound:()=>sound,enabled:()=>true,words:(zh,en)=>en});
 h.failed('title');h.failed('title');await turn();assert.equal(prompts.length,1);assert.match(prompts[0].question,/continue/i);assert.equal(prompts[0].options.yes,'Retry music');
 assert.deepEqual(calls,[]);prompts[0].resolve(true);await turn();assert.deepEqual(calls,['title']);
 h.failed('title');await turn();assert.equal(prompts.length,2);prompts[1].resolve(false);await turn();assert.deepEqual(calls,['title']);h.dispose();
});
test('stale, muted and disposed music failures do not offer or retry old tracks',async()=>{
 const prompts=[],calls=[];let current='realm',enabled=true;
 const sound={get music(){return current;},theme:async name=>calls.push(name)};
 const game={confirm(q,options){return new Promise(resolve=>prompts.push(resolve));}};
 const h=createMusicRecovery({game,getSound:()=>sound,enabled:()=>enabled,words:(zh,en)=>en});
 h.failed('title');await turn();assert.equal(prompts.length,0);
 enabled=false;h.failed('realm');await turn();assert.equal(prompts.length,0);
 enabled=true;h.failed('realm');await turn();assert.equal(prompts.length,1);
 current='battle';prompts[0](true);await turn();assert.deepEqual(calls,[]);
 h.failed('battle');await turn();h.dispose();prompts[1](true);await turn();assert.deepEqual(calls,[]);
});
