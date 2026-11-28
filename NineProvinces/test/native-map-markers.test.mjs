import test from 'node:test';
import assert from 'node:assert/strict';
import {placedRect, selectVisibleMarkers, markerHitArea, reliefDrop} from '../src/view3d/map-marker-math.mjs';
import {createMapOcclusionRegistry} from '../src/view3d/map-occlusion.mjs';

const safe={x:0,y:0,width:500,height:300};
const entry=(id,rect,priority=0,distance=100,passive=false)=>({id,rect,priority,distance,passive});
test('map marker visual coordinates retain CSS size under native Play scale',()=>{
  assert.deepEqual(placedRect({x:100,y:60},{x:-30,y:-25,width:60,height:25},2),{x:85,y:47.5,width:30,height:12.5});
  assert.deepEqual(markerHitArea({x:-30,y:-25,width:60,height:25}),{x:-30,y:-34.5,width:60,height:44});
});
test('selection, occlusion and safe-area priority are deterministic',()=>{
  const chosen=entry('selected',{x:100,y:100,width:70,height:44},100,30);
  const army=entry('army',{x:110,y:101,width:70,height:44},50,5);
  const capital=entry('capital',{x:210,y:140,width:70,height:44},30,10);
  const off=entry('off',{x:470,y:20,width:60,height:44},1000);
  const underHud=entry('hud',{x:10,y:2,width:70,height:44},1000);
  const passive=entry('relief',{x:205,y:144,width:80,height:25},10000,1,true);
  const list=[army,off,passive,capital,underHud,chosen];
  assert.deepEqual(selectVisibleMarkers(list,safe,[{x:0,y:0,width:500,height:60}]).map(x=>x.id),['selected','capital']);
  assert.deepEqual(selectVisibleMarkers([...list].reverse(),safe,[{x:0,y:0,width:500,height:60}]).map(x=>x.id),['selected','capital']);
});
test('active pool budget does not admit unbounded labels or ambiguous identical touch areas',()=>{
  const records=Array.from({length:100},(_,i)=>entry(String(i),{x:i*50,y:0,width:44,height:44},0,i));
  const visible=selectVisibleMarkers(records,{x:0,y:0,width:5000,height:100},[],{maxVisible:32});
  assert.equal(visible.length,32);assert.equal(visible.at(-1).id,'31');
});
test('the old relief label may shift below the HUD only within 56 CSS pixels',()=>{
  assert.equal(reliefDrop({x:80,y:30,width:100,height:25},60,1),30);
  assert.equal(reliefDrop({x:80,y:30,width:100,height:25},60,2),null);
  assert.equal(reliefDrop({x:80,y:100,width:100,height:25},60,2),0);
});
test('real native UI occlusion providers follow retained geometry and unregister',()=>{
  const registry=createMapOcclusionRegistry(),first={x:0,y:0,width:100,height:44};let active=true;
  const remove=registry.addMapOcclusion(()=>active?[first,{x:1,y:2,width:0,height:10}]:[]);
  registry.addMapOcclusion(()=>null);assert.deepEqual(registry.mapOcclusionRects(),[first]);
  first.width=200;assert.equal(registry.mapOcclusionRects()[0].width,200);
  active=false;assert.deepEqual(registry.mapOcclusionRects(),[]);active=true;remove();assert.deepEqual(registry.mapOcclusionRects(),[]);
});
