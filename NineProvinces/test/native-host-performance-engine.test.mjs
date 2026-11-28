import test from 'node:test';import assert from 'node:assert/strict';import '../vendor/node-register.mjs';
import {createRealmPerformanceMode} from '../src/view3d/native-host-performance.mjs';
const {createWorld3DView}=await import('@egret/engine/webgl2/world3d');
test('Public World3DView keeps each clock update but coalesces deferred draw in the same synchronous Play afterFrame',async()=>{
 const m=createRealmPerformanceMode({defer3d:true,measure:true}),calls=[],clock={onTick(_scope,tick){this.step=tick;return {dispose(){}}}},scope={use(){}};let time=0;
 const view=createWorld3DView({clock},scope,{...m.worldOptions,autoResize:false,updateParticles:false,renderer:{canvas:{width:400,height:300},render(){calls.push('render');return true;}},scene:{},camera:{},onUpdate(){calls.push('update');}}),tick=()=>{time+=.016;clock.step({deltaSeconds:.016,elapsedSeconds:time})};
 tick();assert.deepEqual(calls,['update','render']);m.bind({view});tick();tick();tick();assert.deepEqual(calls,['update','render','update','update','update']);assert.equal(m.playOptions.afterFrame(),true);assert.equal(calls.at(-1),'render');assert.equal(m.playOptions.afterFrame(),false);
 const observations=m.snapshot().frames.world;assert.equal(observations.length,2);assert.equal(observations[1].deltaSeconds,.048);assert.equal(observations[1].outcome,'rendered');
 tick();await Promise.resolve();assert.equal(m.playOptions.afterFrame(),false,'missed turn never replays stale draw');tick();view.paused=true;assert.equal(m.playOptions.afterFrame(),false);view.paused=false;tick();assert.equal(m.playOptions.afterFrame(),true);view.dispose();m.dispose();assert.equal(m.playOptions.afterFrame(),false);
 assert.equal(calls.filter(x=>x==='update').length,7);assert.equal(calls.filter(x=>x==='render').length,3);
});