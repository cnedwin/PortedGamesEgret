import '../vendor/node-register.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {createReplayCursor} from '../src/ui/native-replay-model.mjs';
const {closestNativeHex,boardViewport}=await import('../src/ui/native-lab-board.mjs');
import {boardPoint} from '../src/ui/battle-board-layout.mjs';
const tape=()=>({setup:{factions:[],kind:'field'},field:{tiles:Array(22*14).fill('plain')},units:[{id:0,side:0,kind:'spear'},{id:1,side:1,kind:'spear'}],frames:[{time:0,phase:'deploy',units:[{id:0,pos:20,troops:5000},{id:1,pos:40,troops:5000}]},{time:1,phase:'fight',units:[{id:0,pos:21,troops:4900},{id:1,pos:40,troops:4800}],terrain:[[40,'hill']]},{time:2,phase:'result',over:{winner:0,why:'rout'},units:[{id:0,pos:22,troops:4800},{id:1,pos:40,troops:0,gone:true}]}],actions:[{kind:'contact',time:.4,unit:0,target:1}],events:[]});
test('Replay cursor follows preceding snapshot, highlight following snapshot, and playback clamps; tape untouched',()=>{
 const source=tape(),before=JSON.stringify(source),cursor=createReplayCursor(source,{tab:'replay',playerSide:0});cursor.seek(.4);assert.equal(cursor.current().time,0);assert(cursor.jump('contact'));assert.equal(cursor.current().time,1);assert.equal(cursor.presentation().tiles[40],'hill');cursor.seek(0);assert.equal(cursor.setSpeed(4),true);assert(cursor.toggle());cursor.update(.25);assert.equal(cursor.cursor,1);cursor.update(.251);assert.equal(cursor.cursor,2);assert.equal(cursor.playing,false);cursor.seek(99);assert.equal(cursor.cursor,2);cursor.jump('result');assert.equal(cursor.current().phase,'result');cursor.toggle();assert.equal(cursor.cursor,0);assert.equal(JSON.stringify(source),before);
});
test('Board projection uses the original hex layout and clipped viewport dimensions',()=>{
 const tiles=Array(22*14).fill('plain');for(const id of [0,21,22,100,307]){const p=boardPoint(id);assert.equal(closestNativeHex(tiles,p.x,p.y),id);}const outer=boardViewport(873,200),zoom=boardViewport(873,200,3,999,-999);assert.equal(outer.scale,200/470);assert(zoom.scale>outer.scale);assert.equal(closestNativeHex(tiles,-900,-900),-1);
});
const {createSandboxDraft,buildNativeSandboxSetup}=await import('../src/ui/native-battle-sandbox-setup.mjs');
import {DEFAULT_SANDBOX,encounterConfig,createSandboxBattle} from '../src/sim/battle-sandbox.mjs';
test('Native sandbox choices delegate the existing configuration; no source preset is mutated',()=>{
  const before=JSON.stringify(DEFAULT_SANDBOX),draft=createSandboxDraft();assert(draft.encounter('breach'));assert.deepEqual(draft.snapshot(),encounterConfig('breach'));assert(draft.map('river'));assert(draft.unit(0,0,'mengchong'));assert(draft.map('plain'));assert.equal(draft.config.armies[0][0].unit,'spear');assert.equal(draft.config.armies[0][0].formation,'fishscale');assert.equal(draft.config.encounter,null);draft.seed(123);assert.doesNotThrow(()=>createSandboxBattle(draft.snapshot()));assert.equal(JSON.stringify(DEFAULT_SANDBOX),before);
});
test('Native sandbox setup is accepted by the pinned engine planner',  async()=>{
 const {checkView,planView}=await import('@egret/engine/web/view');const draft=createSandboxDraft();const {description,bind}=buildNativeSandboxSetup(draft,{choose(){},edit(){},begin(){},exit(){},custom:true,toggleCustom(){}});const fields=checkView(description);assert(fields.has('sandbox-map'));for(const n of Object.keys(bind))assert(fields.has(n));for(const [width,height]of [[873,325],[390,844],[1280,800]]){const safe={x:0,y:0,width,height},p=planView(description,{screen:safe,safe,orientation:height>width?'portrait':'landscape'});const r=p.parts[p.names.get('sandbox-return')].rect;assert(r.width>=44&&r.height>=44);assert(r.x>=0&&r.y>=0&&r.x+r.width<=width&&r.y+r.height<=height);}
});