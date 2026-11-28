import {test} from 'node:test';
import assert from 'node:assert/strict';
import {presentStaticScreen} from '../src/present-static-screen.mjs';

const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}};
const flush=async()=>{await Promise.resolve();await Promise.resolve()};
function harness(){
  const jobs=new Map();let n=0,draws=0,current=true;
  const wait=deferred(), game={invalidate(){draws++}}, view={textReady(){return wait.promise}};
  const schedule=fn=>{jobs.set(++n,fn);return n};
  const cancel=id=>jobs.delete(id);
  const start=()=>presentStaticScreen(game,view,['start'],()=>current,{schedule,cancel});
  const fire=()=>{const [id,job]=jobs.entries().next().value;jobs.delete(id);job()};
  return {start,wait,jobs,fire,get draws(){return draws},leave(){current=false}};
}
test('requests a first draw and one additional draw after native text is ready',async()=>{
  const h=harness();h.start();assert.equal(h.draws,1);assert.equal(h.jobs.size,1);
  h.wait.resolve();await flush();assert.equal(h.draws,1);h.fire();assert.equal(h.draws,2);assert.equal(h.jobs.size,0);
});
test('the deadline is bounded; the late text completion does not keep redrawing',async()=>{
  const h=harness();h.start();h.fire();assert.equal(h.draws,1);h.fire();assert.equal(h.draws,2);
  h.wait.resolve();await flush();assert.equal(h.draws,2);
});
test('leaving the screen prevents delayed invalidation',async()=>{
  const h=harness();h.start();h.leave();h.wait.resolve();await flush();assert.equal(h.draws,1);assert.equal(h.jobs.size,0);
});
