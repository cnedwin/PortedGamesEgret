import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHudTextGate, splitCallWords, splitWaveWords} from '../src/hud-text-gate.mjs';

const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}};
const flush=async()=>{await Promise.resolve();await Promise.resolve()};
function harness(){
 const jobs=new Map();let n=0;
 const wave=deferred(),call=deferred();
 const gate=createHudTextGate({schedule(fn,ms){jobs.set(++n,{fn,ms});return n},cancel(id){jobs.delete(id)}});
 const view={textReady(name){return name==='wave-time'?wave.promise:call.promise}};
 const fire=()=>{const [id,job]=jobs.entries().next().value;jobs.delete(id);job.fn();return job.ms};
 return {gate,view,wave,call,jobs,fire};
}
test('first HUD text remains stable until both native labels are ready and presented',async()=>{
 const h=harness();h.gate.hold(h.view);assert.equal(h.gate.holding,true);
 h.wave.resolve();await flush();assert.equal(h.gate.holding,true);h.call.resolve();await flush();
 assert.equal(h.gate.holding,true);assert.equal(h.fire(),250);assert.equal(h.gate.holding,false);
});
test('slow or unavailable raster has a finite fallback deadline',()=>{
 const h=harness();h.gate.hold(h.view);assert.equal(h.fire(),2000);assert.equal(h.gate.holding,false);
});
test('a departed HUD cannot release a newer field gate',async()=>{
 const h=harness();h.gate.hold(h.view);h.gate.clear();assert.equal(h.gate.holding,false);
 const other=deferred();h.gate.hold({textReady:()=>other.promise});h.wave.resolve();h.call.resolve();await flush();assert.equal(h.gate.holding,true);
 assert.equal(h.fire(),2000);
});
test('bilingual rapid numbers retain their separately readable context',()=>{
 assert.deepEqual(splitCallWords('迎第一波 +57'),{caption:'迎第一波',value:'+57'});
 assert.deepEqual(splitCallWords('Next wave +18'),{caption:'Next wave',value:'+18'});
 assert.deepEqual(splitCallWords('Wave underway'),{caption:'Wave underway',value:''});
 assert.deepEqual(splitWaveWords('29 秒后第一波','zh'),{caption:'秒后第一波',value:'29'});
 assert.deepEqual(splitWaveWords('Wave 2 in 6 s','en'),{caption:'Wave 2 in',value:'6 s'});
});
