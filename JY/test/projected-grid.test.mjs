import test from 'node:test';import assert from 'node:assert/strict';import { createProjectedGrid } from '../web/projected-grid.mjs';
const calls=[];const graphics=new Proxy({}, {get:(_,key)=>(...args)=>{calls.push([key,...args]);return graphics;}});
test('retains unchanged graphics, redraws board projection and clears on settlement',()=>{calls.length=0;const root={x:100,y:100,scaleX:1,scaleY:1};const grid=createProjectedGrid(graphics,{width:640,height:360,root,project:(x,y)=>[(x-y)*18,(x+y)*9]});const state={result:null,canAct:true,selection:{type:'move',cells:[{x:1,y:1},{x:2,y:2}]},turn:{id:1,x:1,y:1,side:0}};assert(grid.draw(state,{x:2,y:2},{path:[{x:1,y:1}],targets:[]}));assert(calls.some(c=>c[0]==='drawEllipse'));const n=calls.length;assert.equal(grid.draw(state,{x:2,y:2},{path:[{x:1,y:1}],targets:[]}),false);assert.equal(calls.length,n);root.x+=10;assert(grid.draw(state,{x:2,y:2},{path:[{x:1,y:1}],targets:[]}));assert(grid.draw({...state,result:'done'}));assert.equal(calls.at(-1)[0],'clear');});

test('actual engine Graphics accepts the projected overlay and reuses unchanged geometry',async()=>{
  await import('../vendor/node-register.mjs');
  const {Sprite}=await import('@egret/engine');
  const sprite=new Sprite();
  try{
    const root={x:320,y:20,scaleX:1,scaleY:1};
    const grid=createProjectedGrid(sprite.graphics,{width:640,height:360,root,project:(x,y)=>[(x-y)*18,(x+y)*9]});
    const cells=Array.from({length:196},(_,i)=>({x:i%14,y:Math.floor(i/14)}));
    const state={result:null,canAct:true,selection:{type:'move',cells},turn:{id:1,x:7,y:7,side:0}};
    const preview={path:cells.slice(0,6),cells:cells.slice(0,10),targets:[{x:6,y:6,side:1}]};
    assert(grid.draw(state,{x:7,y:7},preview));
    assert(!grid.draw(state,{x:7,y:7},preview));
    assert(grid.draw({...state,result:true}));
  }finally{sprite.dispose()}
});