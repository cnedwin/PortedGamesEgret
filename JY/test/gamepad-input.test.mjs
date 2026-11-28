import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { createNativeCommandInput } from '../web/jyx2/ui/native/native-input.mjs';
import { createInputMapping, createRawPadSample } from '../web/jyx2/ui/native/input-mapping.mjs';

const { makeGameImports }=await import('../src/browser-imports.mjs');
const vendor=new URL('../vendor/',import.meta.url);
const manifests=JSON.parse(await readFile(new URL('importmap.json',vendor),'utf8'));
const imports=makeGameImports(manifests,(folder,target)=>new URL(folder+'/'+target,vendor).href,name=>name);
const hook=registerHooks({resolve(specifier,context,nextResolve){return nextResolve(Object.hasOwn(imports,specifier)?imports[specifier]:specifier,context)}});
const { createBrowserGamepadInput }=await import('@egret/engine/web/gamepad');
hook.deregister();

const moveCodes=['ArrowUp','KeyW','ArrowRight','KeyD','ArrowLeft','KeyA','ArrowDown','KeyS'];
const battleCodes=[...moveCodes,'KeyM','KeyI','KeyL','KeyQ','KeyF','KeyB','KeyT','KeyV','KeyR','Tab'];
const padNames=['a','b','x','y','l1','r1','l2','r2','select','start','l3','r3','up','down','left','right','home'];
const releasedButtons=()=>Array.from({length:17},()=>({pressed:false,value:0}));

function setup(t,initial='map'){
  const doc=Object.assign(new EventTarget(),{visibilityState:'visible',hasFocus:()=>true});
  const win=Object.assign(new EventTarget(),{navigator:{}});
  const pad={index:1,id:'controller',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:releasedButtons()};
  let access=true,focused=true,mode=initial,owner={},frames=0,now=0,polls=0,disposals=0;
  let current=new Set(),pressed=new Set(),previous=new Set();
  win.navigator.getGamepads=()=>{if(!access)throw new DOMException('Denied','SecurityError');return [null,pad.connected?pad:null]};
  win.requestAnimationFrame=()=>{frames++;throw new Error('another clock')};
  doc.defaultView=win;
  for(const [name,value] of Object.entries({navigator:win.navigator,document:doc,window:win})){
    const original=Object.getOwnPropertyDescriptor(globalThis,name);
    Object.defineProperty(globalThis,name,{configurable:true,value});
    t.after(()=>{if(original)Object.defineProperty(globalThis,name,original);else delete globalThis[name]});
  }
  const official=createBrowserGamepadInput({optional:true});
  const source={input:official.input,poll(stamp){polls++;official.poll(stamp)},dispose(){disposals++;official.dispose()}};
  const events=[],reset=[],abort=new AbortController();
  const readMode=()=>focused?{mode,owner}:undefined;
  const keys={claim:()=>()=>{},down:name=>current.has(name),pressed:name=>pressed.has(name),axis:()=>({x:0,y:0})};
  let bridge;
  const raw=createRawPadSample({source,active:()=>focused,onReset:reason=>{reset.push(reason);bridge.suspend(reason)}});
  bridge=createNativeCommandInput({game:{keys,scope:abort},readMode,...createInputMapping(moveCodes,battleCodes),
    readExtra:raw.sample,readAxis:()=>raw.axis,emit:e=>events.push(e)});
  let closed=false;
  function close(){if(closed)return;closed=true;abort.abort();source.dispose()}
  t.after(close);
  function sample(){
    // This test supplies the same documented high-level Play key names; actual
    // browser input/consumption is checked separately by the native fixture.
    const modal=['menu','team','journal','native-battle-modal'].includes(mode);
    current=new Set(focused&&access&&pad.connected?padNames.flatMap((name,index)=>{
      if(['l3','r3','home'].includes(name)||modal&&['a','b','up','down','left','right'].includes(name))return [];
      return pad.buttons[index]?.pressed?['pad:'+name]:[];
    }):[]);
    pressed=new Set([...current].filter(name=>!previous.has(name)));
    previous=current;bridge.sample(now+=16);
  }
  return {pad,sample,events,reset,bridge,close,
    button(index,down,value=Number(down)){pad.buttons[index]={pressed:down,value}},
    clear(){pad.axes=[0,0,0,0];pad.buttons=releasedButtons()},
    change(value){mode=value;owner={}},blur(){focused=false;bridge.suspend('blur')},focus(){focused=true},
    denied(){access=false},get counters(){return{frames,polls,disposals}}};
}
const pairs=events=>events.map(e=>[e.phase,e.command]);

test('native map mapping preserves dominant raw direction, confirmation and one Play clock',t=>{
  const p=setup(t);p.pad.axes=[.7,-.5,0,0];p.sample();p.sample();
  p.pad.axes=[.2,-.2,0,0];p.button(0,true);p.sample();p.button(0,false);p.sample();
  assert.deepEqual(pairs(p.events),[['press','ArrowRight'],['release','ArrowRight'],['press','Enter'],['release','Enter']]);
  p.close();assert.deepEqual(p.counters,{frames:0,polls:4,disposals:1});
});
test('the native battle mode preserves stick-first ordering, standard aliases and raw extra thresholds',t=>{
  const p=setup(t,'battle');p.pad.axes=[-.9,.7,0,0];
  for(const index of [0,2,3,4,5,8,10,11])p.button(index,true);
  p.button(6,false,.55); // analog trigger that does not yet report pressed
  p.sample();
  assert.deepEqual(pairs(p.events),[
    ['press','KeyA'],['press','KeyS'],['press','Enter'],['press','KeyL'],['press','KeyI'],
    ['press','KeyM'],['press','KeyQ'],['press','Tab'],['press','KeyT'],['press','KeyV']
  ]);
  p.button(6,false,.49);p.sample();
  assert.deepEqual(pairs(p.events).at(-1),['release','KeyQ']);
});
test('a held battle bag press is retired on modal switch; native modal A/B are not sent again',t=>{
  const p=setup(t,'battle');p.button(1,true);p.sample();
  p.change('menu');p.sample();p.sample();p.button(1,false);p.sample();p.button(0,true);p.sample();p.button(0,false);p.sample();
  assert.deepEqual(pairs(p.events),[['press','KeyB'],['release','KeyB']]);
  assert.equal(p.events[1].reason,'mode-change');
});
test('a controller disconnect/reconnect and blur release the owned command, then require neutral',t=>{
  const p=setup(t,'team');p.button(9,true);p.sample();p.pad.connected=false;p.sample();
  assert.deepEqual(pairs(p.events),[['press','KeyO'],['release','KeyO']]);
  p.pad.connected=true;p.sample();assert.equal(p.events.length,2);
  p.button(9,false);p.sample();p.button(2,true);p.sample();
  assert.deepEqual(pairs(p.events).at(-1),['press','KeyA']);
  p.blur();p.sample();p.focus();p.sample();
  assert.deepEqual(pairs(p.events).at(-1),['release','KeyA']);
  p.button(2,false);p.sample();p.button(2,true);p.sample();
  assert.deepEqual(pairs(p.events).at(-1),['press','KeyA']);
  assert.deepEqual(p.reset,['pad-change','pad-reconnect']);
});
test('an inaccessible gamepad API remains optional and no alternate RAF is scheduled',t=>{
  const p=setup(t);p.denied();p.sample();assert.deepEqual(p.events,[]);
  p.close();assert.deepEqual(p.counters,{frames:0,polls:1,disposals:1});
});
test('native modal and menu keep ownership of standard focus commands; team retains extras',t=>{
  const map=createInputMapping(moveCodes,battleCodes);
  assert.equal(map.claim('ArrowLeft',{mode:'map'}),true);
  assert.equal(map.claim('Escape',{mode:'script'}),true);
  assert.equal(map.claim('Enter',{mode:'script'}),false);
  assert.equal(map.claim('Tab',{mode:'battle'}),true);
  assert.equal(map.claim('Enter',{mode:'native-battle-modal'}),false);
  assert.deepEqual(map.modes['native-battle-modal'].bindings,[]);
  const p=setup(t,'team');for(const i of [0,1,2,9,12,13])p.button(i,true);p.sample();
  assert.deepEqual(pairs(p.events),[['press','KeyA'],['press','KeyO']]);
});
