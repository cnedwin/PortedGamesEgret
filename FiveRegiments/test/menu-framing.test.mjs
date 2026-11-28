import {test} from 'node:test';
import assert from 'node:assert/strict';
import {previewFrame} from '../src/view/menu-framing.mjs';
test('lateral native title leaves the lineup in the unobstructed region',()=>{
 const screen={x:0,y:0,width:1280,height:800};
 const view=previewFrame({screen,panel:{x:0,y:0,width:360,height:800}});
 assert(view.to[0]<0);assert(view.from[2]>8);assert(view.from[2]<14);
});
test('a chosen officer is framed opposite the menu on landscape',()=>{
 const view=previewFrame({screen:{x:-40,y:0,width:1280,height:720},panel:{x:820,y:4,width:420,height:700},
   focus:{x:3,z:1,mounted:true}});
 assert(view.to[0]>3);assert(view.from[2]>view.to[2]);assert(view.to[1]>1);
});
test('portrait framing lifts the model above the lower interface without changing the world',()=>{
 const focus={x:1,z:-2,mounted:false};
 const view=previewFrame({screen:{x:0,y:-40,width:540,height:1060},panel:{x:0,y:530,width:540,height:490},focus});
 assert(view.to[1]<1.1);assert(view.from[2]>view.to[2]);assert.deepEqual(focus,{x:1,z:-2,mounted:false});
});
