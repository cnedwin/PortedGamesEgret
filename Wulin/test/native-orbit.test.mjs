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
  const contact = {session:{id:1,pointerId:1},buttons:1};
  observer({kind:'begin',target:surface,contact});
  tap({pointerId:1,stageX:40,stageY:24});
  assert.deepEqual(selected, [[20,12]]);
  observer({kind:'end',target:surface,contact});
  observer({kind:'begin',target:surface,contact});
  gestures.drag({phase:'start',dx:0,dy:0,totalX:0,totalY:0});
  gestures.drag({phase:'move',dx:40,dy:20,totalX:40,totalY:20});
  assert.ok(orbit.yaw < 0);
  tap({pointerId:1,stageX:40,stageY:24});
  assert.equal(selected.length,1,'returning drag must not activate a label');
  observer({kind:'end',target:surface,contact});
  const originalDistance = orbit.distance;
  observer({kind:'begin',target:surface,contact});
  const second = {...contact,session:{id:2,pointerId:2}};
  observer({kind:'begin',target:surface,contact:second});
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
