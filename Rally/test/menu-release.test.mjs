// Routed pointer contact regression. Keyboard and semantic activation do not pass through this guard.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../vendor/node-register.mjs';
const { createEngine, DisplayObjectContainer } = await import('@egret/engine');
const { createPointerInput } = await import('@egret/engine/input');
const { createActionControl, createToggleControl, createSelectionGroup } = await import('@egret/engine/ui');
const { guardReleaseInside } = await import('../src/ui/kit.mjs');

test('native menu controls reject out-of-bounds release without losing keyboard/semantic activation',async()=>{
  const engine=await createEngine({host:{surface:{},start(){},stop(){},async close(){},setTimeout(){return()=>{};}}});
  const scope=engine.createScope(),input=createPointerInput({engine,scope,width:200,height:100});
  try {
    function face(x){
      const n=scope.use(new DisplayObjectContainer());n.x=x;n.hitArea={x:0,y:0,width:40,height:40};n.touchEnabled=true;
      engine.stage.addChild(n);guardReleaseInside(scope,input,n);return n;
    }
    let activations=0;
    const action=scope.use(createActionControl({input,target:face(0),onActivate(){activations++;}}));
    const toggle=scope.use(createToggleControl({input,target:face(50),checked:false}));
    const a=face(100),b=face(150);
    const choice=scope.use(createSelectionGroup({input,items:[{key:'a',target:a},{key:'b',target:b}],selected:'a'}));
    let clock=0;
    const begin=(x,y,id)=>input.begin({pointerId:id,pointerType:'touch',globalX:x,globalY:y,buttons:1,timestamp:++clock});
    const move=(s,x,y)=>input.move(s,{globalX:x,globalY:y,buttons:1,timestamp:++clock});
    const end=(s,x,y)=>input.end(s,{globalX:x,globalY:y,buttons:0,timestamp:++clock});
    const cancel=s=>input.cancel(s,'viewport');
    for(const [i,x] of [5,55,155].entries()){
      const s=begin(x,5,i+1);move(s,x,75);end(s,x,75);
    }
    assert.equal(activations,0);assert.equal(action.pressed,false);
    assert.equal(toggle.checked,false);assert.equal(toggle.pressed,false);
    assert.equal(choice.selected,'a');

    // A refused contact cannot retire or activate the owner's pending press.
    const owner=begin(5,5,4),second=begin(5,6,5);
    end(second,90,90);assert.equal(action.pressed,true);assert.equal(activations,0);
    move(owner,5,60);move(owner,5,8);end(owner,5,8);
    assert.equal(activations,1);assert.equal(action.pressed,false);

    let s=begin(55,5,6);end(s,55,5);assert.equal(toggle.checked,true);
    s=begin(155,5,7);end(s,155,5);assert.equal(choice.selected,'b');
    // Scripted equivalents are the same methods used by native keyboard/semantic bindings.
    action.press();action.release();assert.equal(activations,2);
    toggle.toggle();assert.equal(toggle.checked,false);choice.select('a');assert.equal(choice.selected,'a');
    // The native cancellation path remains intact.
    s=begin(5,5,8);cancel(s);assert.equal(action.pressed,false);assert.equal(activations,2);
  }finally{input.dispose();await engine.dispose();}
});
