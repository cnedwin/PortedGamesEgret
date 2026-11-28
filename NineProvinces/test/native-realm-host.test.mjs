import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneMapper, wheelFactor, pinchStep, createFrameGate} from '../src/view3d/screen-math.mjs';

test('map coordinates preserve 3D CSS viewport projection on both expanded orientations', () => {
  for (const [screen,overlay,scene] of [
    [{x:-120,y:0,width:1200,height:540},{left:0,top:0,width:960,height:432},{left:0,top:0,width:960,height:432}],
    [{x:0,y:-36,width:540,height:1032},{left:12,top:20,width:405,height:774},{left:12,top:20,width:405,height:774}],
    [{x:-20,y:-10,width:1000,height:560},{left:20,top:30,width:800,height:448},{left:40,top:50,width:760,height:408}]
  ]) {
    const m=sceneMapper(screen,overlay,scene),p=m.toDesign(.35*scene.width,.72*scene.height),s=m.toScene(p.x,p.y);
    assert.ok(Math.abs(s.x-.35*scene.width)<1e-9);
    assert.ok(Math.abs(s.y-.72*scene.height)<1e-9);
  }
});

test('native wheel preserves legacy map zoom direction and combined wheel steps', () => {
  assert.equal(wheelFactor(-1),1.18);
  assert.equal(wheelFactor(1),1/1.18);
  assert.equal(wheelFactor(-2),1.18**2);
  assert.equal(wheelFactor(0),1);
});

test('native pinch is incremental and terminal/cancel never apply another zoom', () => {
  assert.deepEqual(pinchStep(1,{phase:'start',scale:1}),{previous:1,factor:1});
  assert.deepEqual(pinchStep(1,{phase:'move',scale:1.5}),{previous:1.5,factor:1.5});
  assert.deepEqual(pinchStep(1.5,{phase:'move',scale:2.25}),{previous:2.25,factor:1.5});
  assert.deepEqual(pinchStep(2.25,{phase:'cancel',scale:3}),{previous:1,factor:1});
});

test('pre-ready attached world draw never advances campaign; pause/reentry preserve one call', () => {
  const steps=[];
  const gate=createFrameGate(dt=>steps.push(dt));
  gate.frame(.1);assert.deepEqual(steps,[]);
  gate.start();gate.frame(.1);gate.frame(.016);assert.deepEqual(steps,[0,.016]);
  gate.stop();gate.frame(.1);assert.deepEqual(steps,[0,.016]);
  gate.start();gate.frame(.1);gate.frame(.016);assert.deepEqual(steps,[0,.016,0,.016]);
  gate.start();gate.frame(.016);assert.deepEqual(steps,[0,.016,0,.016,.016]);
});
