import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeCommandInput,attachStageTap} from '../web/jyx2/ui/native/native-input.mjs';

const binding=(command,keys,repeat=false)=>({command,keys,repeat});
function demo(){
  let current={mode:'travel',owner:'A'}, down=new Set(),pressed=new Set(),axis={x:0,y:0},extra=[],log=[],claims=[];
  const abort=new AbortController();
  const game={scope:abort,keys:{claim(name,when){claims.push([name,when]);return()=>claims.splice(claims.findIndex(v=>v[0]===name),1)},down: n=>down.has(n),pressed:n=>pressed.has(n),axis:()=>axis}};
  const adapter=createNativeCommandInput({game,readMode:()=>current,emit:v=>log.push([v.mode,v.command,v.phase,v.reason]),
    modes:{travel:{bindings:[binding('left',['ArrowLeft','pad:left']),binding('right',['ArrowRight','pad:right']),binding('confirm',['Enter','pad:a'])],analog:{left:'left',right:'right',up:'up',down:'down'}},
      menu:{bindings:[binding('choose',['KeyO','pad:start']),binding('previous',['ArrowLeft'],true)]},
      board:{bindings:[binding('inspect',['KeyV','extra:r3'])],analog:{left:'left',right:'right',up:'up',down:'down',diagonal:true}}},
    digital:['ArrowLeft','ArrowRight','pad:left','pad:right'],readExtra:()=>extra,claim:(_,m)=>m.mode==='travel'});
  return {adapter,log,claims,abort,set(d=[],p=[],a={x:0,y:0},e=[]){down=new Set(d);pressed=new Set(p);axis=a;extra=e;},mode(m,owner=m){current={mode:m,owner}}};
}
test('held movement releases once; fast press-release survives the sample',()=>{
  const d=demo();d.set(['ArrowLeft'],['ArrowLeft']);d.adapter.sample(0);
  d.set();d.adapter.sample(10);
  d.set([],['Enter']);d.adapter.sample(20);
  assert.deepEqual(d.log.map(x=>x.slice(1,3)),[['left','press'],['left','release'],['confirm','press'],['confirm','release']]);
});
test('a held command does not leak after a modal changes owners',()=>{
  const d=demo();d.set(['ArrowLeft'],['ArrowLeft']);d.adapter.sample(0);
  d.mode('menu');d.set(['ArrowLeft']);d.adapter.sample(10);
  d.set();d.adapter.sample(20);
  d.set(['ArrowLeft'],['ArrowLeft']);d.adapter.sample(30);d.set(['ArrowLeft']);d.adapter.sample(400);
  d.mode('menu','B');d.adapter.sample(401);
  assert.deepEqual(d.log.map(x=>x.slice(1,3)),[['left','press'],['left','release'],['previous','press'],['previous','repeat'],['previous','release']]);
});
test('analog map direction is cardinal; the board can hold both axes',()=>{
  const d=demo();d.set([],[],{x:.8,y:.6});d.adapter.sample(0);
  d.set([],[],{x:0,y:0});d.adapter.sample(5);
  d.mode('board');d.adapter.sample(10);d.set([],[],{x:.8,y:.6});d.adapter.sample(15);
  assert.deepEqual(d.adapter.held,['right','down']);
  assert.deepEqual(d.log.map(x=>x.slice(1,3)),[['right','press'],['right','release'],['right','press'],['down','press']]);
});
test('a controller stick held while entering another mode waits for neutral',()=>{
  const d=demo();d.set([],[],{x:.8,y:0});d.adapter.sample(0);
  d.mode('board');d.adapter.sample(10);
  assert.deepEqual(d.adapter.held,[]);
  d.set();d.adapter.sample(20);d.set([],[],{x:.8,y:0});d.adapter.sample(30);
  assert.deepEqual(d.adapter.held,['right']);
});
test('blur followed by a still-held controller command requires active neutral',()=>{
  const d=demo();d.set(['pad:right'],['pad:right']);d.adapter.sample(0);
  // The host may already have cleared its key edge set before the blur callback.
  d.set();d.adapter.suspend('blur');d.mode('inactive');d.adapter.sample(10);
  d.mode('travel');d.set(['pad:right'],['pad:right']);d.adapter.sample(20);
  assert.deepEqual(d.adapter.held,[]);
  d.set();d.adapter.sample(30);d.set(['pad:right'],['pad:right']);d.adapter.sample(40);
  assert.deepEqual(d.adapter.held,['right']);
});
test('optional extra source and cleanup are bounded',()=>{
  const d=demo();d.mode('board');d.set([],[],{x:0,y:0},['extra:r3']);d.adapter.sample(0);
  assert.deepEqual(d.adapter.held,['inspect']);
  d.abort.abort();assert.deepEqual(d.adapter.held,[]);assert.equal(d.claims.length,0);
  assert.equal(d.log.at(-1)[2],'release');
});
test('stage route only accepts primary contacts and does not accept synthetic activation',()=>{
  let notify,tap,events=[];const controller=new AbortController();
  const game={scope:controller,browser:{pointer:{observe(fn){notify=fn;return()=>{notify=undefined}}}},onTap(_,fn){tap=fn}};
  attachStageTap(game,{},v=>events.push(v));
  const send=(buttons,type='mouse')=>notify({kind:'begin',contact:{buttons,session:{pointerId:1,pointerType:type}}});
  const activate=(source='mouse')=>tap({source,pointerId:1,stageX:9,stageY:7,stopPropagation(){}});
  send(2);activate();send(1);activate();send(0,'touch');activate('touch');activate('semantic');
  assert.deepEqual(events,[{x:9,y:7,source:'mouse'},{x:9,y:7,source:'touch'}]);
  controller.abort();assert.equal(notify,undefined);
});
