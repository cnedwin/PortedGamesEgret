import test from 'node:test';
import assert from 'node:assert/strict';
import { routePoints, navigationWords } from '../web/jyx2/ui/world-navigation.mjs';
import { createMapHud } from '../web/jyx2/ui/native/map-hud.mjs';

test('route normalization is relative to native expansive screen, clips discontinuities and caps steps',()=>{
 const steps=Array.from({length:30},(_,x)=>({x:x+1,y:1}));
 const points=routePoints((x,y)=>x===2?undefined:[x/20, y/10],{x:0,y:0},steps,{x:-80,y:0,width:800,height:360});
 assert.equal(points.length,15); assert.deepEqual(points[0],[-80,0]); assert.equal(points[2],null); assert.deepEqual(points[3],[40,36]);
});
test('native navigation translates action labels but leaves destination names unchanged',()=>{
 assert.equal(navigationWords('walking','原文','en'),'Following route · tap to reroute');
 assert.equal(navigationWords('arrived','已到達','zh'),'已到達');
 assert.equal(navigationWords('cancelled','已取消尋路','en'),'Route cancelled');
});
test('HUD updates only changes, uses engine state bindings, and abort closes native view',()=>{
 const calls=[]; let binding; const game={show(description,opts){binding=opts.bind;calls.push(description);return {refresh(){calls.push('refresh')},close(){calls.push('close')}}},invalidate(){calls.push('invalidate')}};
 const cancel=new AbortController(); const hud=createMapHud(game,{signal:cancel.signal, language:()=> 'en',initial:{sceneName:'古道',notice:'Starting'}});
 assert.equal(binding['scene-location'].text(),'古道'); assert.equal(binding['scene-notice'].text(),'Starting');
 hud.coordinates.textContent='格点 7 · 12'; assert.equal(binding.coordinates.text(),'Tile 7 · 12');
 const n=calls.length; hud.coordinates.textContent='格点 7 · 12'; assert.equal(calls.length,n);
 hud.hint.textContent='Sample instruction'; hud.setBattleMode(true);
 assert.equal(binding['scene-card'].visible(),false); assert.equal(binding['context-card'].visible(),false);
 assert.equal(binding['notice-card'].visible(),true);
 hud.setBattleMode(false); assert.equal(binding['scene-card'].visible(),true); assert.equal(binding['context-card'].visible(),true);
 hud.notice.hidden=true; assert.equal(binding['notice-card'].visible(),false); cancel.abort(); assert.equal(calls.at(-1),'close');
});
