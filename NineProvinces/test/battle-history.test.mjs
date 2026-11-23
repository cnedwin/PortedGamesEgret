import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
import { createBattle, stepBattle, command } from '../src/sim/battle.mjs';
import { createBattleRecorder, recordedAutoBattle, replayFrameAt } from '../src/sim/battle-history.mjs';
import { createSandboxSetup, SANDBOX_MAPS } from '../src/sim/battle-sandbox.mjs';

test('sandbox configuration is bounded and independent, retaining actual map and arm choices',()=>{
 const input={map:'siege',seed:81,armies:[[{unit:'ram',troops:7000,formation:'square'}],[{unit:'archer',troops:5000,formation:'geese'}]]};const before=JSON.stringify(input),a=createSandboxSetup(input),b=createSandboxSetup(input);assert.deepEqual(a,b);assert.equal(JSON.stringify(input),before);assert.equal(a.kind,'siege');assert.equal(a.units[0].unit,'ram');assert.equal(a.units[1].formation,'geese');assert.equal(a.units[0].troops,7000);assert(Object.keys(SANDBOX_MAPS).length>=5);
 assert.throws(()=>createSandboxSetup({armies:[[],[]]}));assert.throws(()=>createSandboxSetup({armies:[[{unit:'missing'}],[{unit:'spear'}]]}));
 const clamped=createSandboxSetup({armies:[[{unit:'spear',troops:999999,formation:'arrowhead'}],[{unit:'sword',troops:-5}]]});assert.equal(clamped.units[0].troops,20000);assert.equal(clamped.units[1].troops,1000);assert.equal(clamped.units[0].formation,'fishscale');
});
test('recorder captures actual player orders/phases and detached seekable snapshots',()=>{
 const b=createBattle(createSandboxSetup({seed:4})),r=createBattleRecorder(b);r.capture('deploy');r.action('formation',{unit:0,formation:'square'});command(b,0,'formation','square');r.capture('fight',{force:true});
 for(let i=0;i<30;i++){stepBattle(b,.1,0);r.capture('fight');}
 const tape=r.finish(),plain=JSON.parse(JSON.stringify(tape));assert.deepEqual(tape,plain);assert(tape.frames.length>=4);assert.equal(tape.actions[0].kind,'formation');assert(tape.frames.some(f=>f.phase==='deploy'));assert(tape.frames.some(f=>f.phase==='fight'));assert.equal(replayFrameAt(tape,9999),tape.frames.at(-1));assert.equal(replayFrameAt(tape,-1),tape.frames[0]);
 const old=tape.frames[0].units[0].troops;b.units[0].troops=1;assert.equal(tape.frames[0].units[0].troops,old);assert.equal(tape.report.units[0].remaining,Math.round(plain.frames.at(-1).units[0].troops));
});
test('player entrusted simulation yields a complete replay and does not mutate setup or campaign',()=>{
 const setup=createSandboxSetup({seed:43,armies:[[{unit:'lightcav',troops:12000,formation:'arrowhead'}],[{unit:'archer',troops:5000,formation:'geese'}]]});const old=JSON.stringify(setup);const a=recordedAutoBattle(setup),b=recordedAutoBattle(setup);assert.deepEqual(a,b);assert.equal(JSON.stringify(setup),old);assert(a.result.winner===0||a.result.winner===1);assert(a.tape.frames.length>5);assert.equal(a.tape.frames.at(-1).phase,'result');assert.equal(a.report.seconds,a.result.seconds);assert(a.tape.actions.some(x=>x.kind==='entrust'));
});
test('bounded recorder keeps the opening and actual latest frame under prolonged capture',()=>{
 const b=createBattle(createSandboxSetup()),r=createBattleRecorder(b,{maxFrames:12,interval:.1});for(let i=0;i<80;i++){b.time=i;r.capture('fight',{force:true});}const tape=r.finish();assert(tape.frames.length<=12);assert.equal(tape.frames[0].time,0);assert.equal(tape.frames.at(-1).time,79);
});
