import assert from 'node:assert/strict';
import test from 'node:test';
import { register } from 'node:module';
register('../tools/egret-resolve.mjs', import.meta.url);
const { createOrbit } = await import('../src/view/orbit.mjs');

test('the native orbit handles scene-owned gestures and clears held contacts when covered', () => {
  const canvas = Object.assign(new EventTarget(), {clientWidth: 400, clientHeight: 300, getBoundingClientRect: () => ({left:0,top:0,width:400,height:300})});
  const surface = {};
  let gestures, tap, observer, cancelled = 0;
  const pointerInput = {observe(fn) { observer = fn; return () => {}; }, cancelAll() { cancelled++; }};
  const game = {
    browser:{pointer:pointerInput,screen:{width:800,height:600}},
    canvas:{getBoundingClientRect:canvas.getBoundingClientRect},
    gestures(node, handlers){ assert.equal(node,surface); gestures = handlers; return () => {}; },
    onTap(node, callback){ assert.equal(node,surface); tap = callback; },
    keys:{down:()=>false}, pointer:{wheel:0,over:()=>true}
  };
  const orbit = createOrbit(canvas, {game, pointerSurface:surface});
  const selected = [];
  orbit.onTap = (x,y) => selected.push([x,y]);
  const contact = {session:{id:1,pointerId:1,pointerType:'touch'},buttons:1,globalX:0,globalY:0};
  observer({kind:'begin',target:surface,contact});
  tap({pointerId:1,stageX:40,stageY:24});
  assert.deepEqual(selected, [[20,12]]);
  observer({kind:'end',target:surface,contact});
  observer({kind:'begin',target:surface,contact});
  observer({kind:'move',target:surface,contact:{...contact,globalX:40,globalY:20}});
  assert.equal(orbit.yaw,0,'touch moves are consumed only by primary gestures');
  assert.deepEqual(orbit.target,[0,0,0]);
  gestures.drag({phase:'start',dx:0,dy:0,totalX:0,totalY:0});
  gestures.drag({phase:'move',dx:40,dy:20,totalX:40,totalY:20});
  assert.ok(orbit.yaw < 0);
  tap({pointerId:1,stageX:40,stageY:24});
  assert.equal(selected.length,1,'returning drag must not activate a label');
  observer({kind:'end',target:surface,contact});
  const originalDistance = orbit.distance;
  observer({kind:'begin',target:surface,contact});
  const second = {...contact,session:{id:2,pointerId:2,pointerType:'touch'}};
  observer({kind:'begin',target:surface,contact:second});
  const beforePinch=orbit.target.slice();
  observer({kind:'move',target:surface,contact:{...second,globalX:40,globalY:20}});
  assert.deepEqual(orbit.target,beforePinch,'second touch does not start secondary pan');
  gestures.pinch({phase:'start',scale:1,rotation:0,x:0,y:0});
  gestures.pinch({phase:'move',scale:2,rotation:15,x:10,y:2});
  assert.equal(orbit.distance,originalDistance/2);
  orbit.setInputEnabled(false);
  assert.ok(cancelled>0);
  const before = orbit.distance;
  gestures.pinch({phase:'move',scale:4,rotation:30,x:12,y:2});
  tap({pointerId:1,stageX:40,stageY:24});
  assert.equal(orbit.distance,before);
  assert.equal(selected.length,1);
  assert.equal(surface.touchEnabled,false);
});

test('scene-owned secondary mouse moves pan the seat and turn the realm, without toggling objects', () => {
  const canvas = Object.assign(new EventTarget(), {clientWidth:400,clientHeight:300,getBoundingClientRect:()=>({left:0,top:0,width:400,height:300})});
  const surface={};
  let observer,tap,gestures;
  const game={
    browser:{screen:{width:800,height:600},pointer:{observe(fn){observer=fn;return()=>{};},cancelAll(){}}},
    canvas, gestures(node,handlers){gestures=handlers;return()=>{};}, onTap(node,callback){tap=callback;},
    keys:{down:()=>false}, pointer:{wheel:0}
  };
  const orbit=createOrbit(canvas,{game,pointerSurface:surface});
  let selected=0;orbit.onTap=()=>selected++;
  const right={id:3,pointerId:3,pointerType:'mouse'}, left={id:4,pointerId:4,pointerType:'mouse'};
  const emit=(kind,session,x,y,buttons=2,target=surface)=>observer({kind,target,contact:{session,globalX:x,globalY:y,buttons}});
  // Current engine emits no drag signal for secondary-only presses, but routes their native contacts.
  emit('begin',right,100,100);emit('move',right,103,104);assert.deepEqual(orbit.target,[0,0,0]);
  emit('move',right,140,120);assert.notEqual(orbit.target[0],0);assert.equal(orbit.yaw,0);
  const seatTarget=orbit.target.slice();
  tap({stageX:140,stageY:120});emit('end',right,140,120,0);assert.equal(selected,0);
  emit('move',right,220,200);assert.deepEqual(orbit.target,seatTarget,'lift ends panning');
  orbit.dragPans=true;
  emit('begin',right,120,100);emit('move',right,160,100);assert.ok(orbit.yaw<0);assert.deepEqual(orbit.target,seatTarget);
  const realmYaw=orbit.yaw;emit('cancel',right,160,100,0);emit('move',right,220,100);assert.equal(orbit.yaw,realmYaw);
  emit('begin',right,120,100,2,{});emit('move',right,160,100);assert.equal(orbit.yaw,realmYaw,'UI-owned contact cannot move the scene');
  emit('begin',right,120,100);orbit.setInputEnabled(false);emit('move',right,180,100);orbit.setInputEnabled(true);emit('move',right,200,100);assert.equal(orbit.yaw,realmYaw,'modal cancels the secondary contact');
  emit('begin',left,100,100,1);gestures.drag({phase:'start',dx:30,dy:10});assert.notDeepEqual(orbit.target,seatTarget,'primary still uses the engine drag recognizer');
  assert.equal(orbit.yaw,realmYaw);
});
