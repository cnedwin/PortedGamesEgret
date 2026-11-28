import '../vendor/node-register.mjs';
import test from 'node:test';import assert from 'node:assert/strict';

import {createGame} from '../src/sim/world.mjs';
import {createSandboxSetup,encounterConfig} from '../src/sim/battle-sandbox.mjs';
const engine=await import('@egret/engine/web/view');

test('Actual battle controller bridges native deployment and tempo without DOM or a second simulation',  async()=>{
 const {startBattle}=await import('../src/ui/battleui-native.mjs');
 const state=createGame({seed:31,faction:'liubei',branch:'free'}),setup=createSandboxSetup(encounterConfig('breach'));
 const errors=[],views=[];let contacts=[],observed;const wait=()=>new Promise(resolve=>queueMicrotask(resolve));
 const g={uiScale:1,browser:{pointer:{get contacts(){return contacts},observe(fn){observed=fn;return()=>{}},cancelAll(){contacts=[]}}},show(description,options){engine.checkView(description);const v={description,options,focused:null,closed:false,focus(n){this.focused=n;return true},scroll(){return{offset:0,scrollTo(){}}},close(){this.closed=true},refresh(){},replaceChildren(){}};views.push(v);return v},after(){return()=>{}}};
 const host={game:g,metrics:()=>({scale:1,safe:{x:0,y:0,width:1280,height:720}}),addLayout(fn){fn();return()=>{}}};
 const app={state,uiHost:host,map:{zoomBy(){},panBy(){}},rulers:()=>({}),calm:()=>true,sound:{play(){},theme(){}},hud:{toast(){}},endBattle(){}};let selection=null;
 const createView=()=>({select:id=>{selection=id},preview(){},lookAtHex(){},overview(){},destroy(){},update(){},tick(){}});
 const ctrl=startBattle(app,setup,{createView,presentation:{onError:e=>errors.push(e)}});await wait();assert.deepEqual(errors,[]);assert.equal(ctrl.phase,'deploy');assert.equal(selection,0);assert(views.at(-1).options.bind['battle-begin']);
 const before=ctrl.battle.time;ctrl.begin();await wait();assert.deepEqual(errors,[]);assert.equal(ctrl.phase,'fight');assert.equal(ctrl.battle.time,before);assert(views.at(-1).options.bind['battle-bpause']||views.some(v=>v.options.bind['battle-bpause']));
 ctrl.key('Space');await wait();assert.equal(ctrl.tempo.paused,true);assert.deepEqual(errors,[]);
});
test('Actual recorded game report is a complete named native view; closing preserves the tape',  async()=>{
 const {openNativeBattleReplay}=await import('../src/ui/native-battle-replay.mjs');const {recordedAutoBattle}=await import('../src/sim/battle-history.mjs');const {tape}=recordedAutoBattle(createSandboxSetup(encounterConfig('breach'))),before=JSON.stringify(tape);let current;
 const host={game:{show(description,options){engine.checkView(description);current={description,options,focused:null,focus(name){this.focused=name;return true},close(){this.closed=true},refresh(){}};return current;}},addLayout(fn){fn();return()=>{}},metrics:()=>({scale:1,safe:{width:1280,height:720}})};
 const ui=openNativeBattleReplay(host,tape,{playerSide:0});const fields=engine.checkView(current.description);assert(fields.has('replay-report-scroll'));assert(fields.has('replay-report-unit-0'));assert(fields.has('replay-exit'));assert.equal(ui.inspect().tab,'report');ui.destroy();assert(current.closed);assert.equal(JSON.stringify(tape),before);
});