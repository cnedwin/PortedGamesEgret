import assert from 'node:assert/strict';
import {test} from 'node:test';
import '../vendor/node-register.mjs';
const [{Scene3D},{createEffects}]=await Promise.all([
  import('@egret/engine/world3d'),import('../src/view/effects.mjs')
]);
globalThis.OffscreenCanvas ??= class {
  getContext(){return {
    fillRect(){},beginPath(){},ellipse(){},fill(){},
    createRadialGradient(){return {addColorStop(){}};},
    getImageData(){return {data:new Uint8ClampedArray(64*64*4)};}
  };}
};
const where=id=>id==='other'?[1,1.1,2]:[0,1.1,0];
const blade=()=>[[0,1,0],[0,1,1]];
const release=()=>({type:'skillBeat',id:'spin',who:'hero',part:0});
const visible=scene=>scene.children.filter(n=>n.name==='decorative-energy'&&n.visible);
const notify=(fx,e)=>fx.event(e,where,blade);

test('a normal release adds a layered stylized energy accent with a smooth finite life',()=>{
  const scene=new Scene3D(),fx=createEffects(scene,{particles:.5});
  const total=scene.children.length;
  notify(fx,release());
  const [accent]=visible(scene);
  assert.equal(visible(scene).length,1);
  assert.ok(accent&&!accent.castShadow&&!accent.material.depthWrite);
  const rgb=Array.from(accent.geometry.getAttribute('color').data);
  assert.ok(rgb.some(c=>c<.25)&&rgb.some(c=>c>.9),'gradient has a saturated rim and bright core');
  const positions=accent.geometry.getAttribute('position').data,radii=[];
  for(let i=0;i<positions.length;i+=3)radii.push(Math.hypot(positions[i],positions[i+2]));
  assert(Math.max(...radii)-Math.min(...radii)<.37,'the decorative halo reads as a narrow ribbon, not a solid band');
  const opacity=accent.material.opacity,scale=accent.scale[0];
  fx.update(.07,null);
  assert.ok(accent.visible&&accent.material.opacity<opacity&&accent.material.opacity>0);
  assert.ok(accent.scale[0]>scale);
  fx.update(.6,null);
  assert.equal(visible(scene).length,0);
  assert.equal(scene.children.length,total);
});

test('only a real displayed confirmation emits the decorative contact star',()=>{
  const scene=new Scene3D(),fx=createEffects(scene);
  notify(fx,{type:'whiff',who:'hero'});
  notify(fx,{type:'hit',who:'other',by:'hero',quiet:true});
  assert.equal(visible(scene).length,0);
  notify(fx,{type:'hit',who:'other',by:'hero'});
  assert.equal(visible(scene).length,1);
  fx.clear();
  assert.equal(visible(scene).length,0);
});

test('bursts reuse shared geometry and obey fixed phone/desktop pool budgets',()=>{
  for(const [particles,budget] of [[.5,3],[1,6]]){
    const scene=new Scene3D(),fx=createEffects(scene,{particles});
    const count=scene.children.length;
    for(let n=0;n<40;n++)notify(fx,release());
    const accents=visible(scene);
    assert.equal(accents.length,budget);
    assert.equal(new Set(accents.map(n=>n.geometry)).size,1);
    assert.ok(accents[0].geometry.getAttribute('position').data.length/3<=160);
    assert.equal(scene.children.length,count);
    fx.clear();assert.equal(visible(scene).length,0);
  }
});

test('reduced motion disables the new decorative energy without removing existing cues',()=>{
  const scene=new Scene3D();let reduced=false;
  const fx=createEffects(scene,{particles:.5,reducedMotion:()=>reduced});
  notify(fx,release());assert.equal(visible(scene).length,1);
  reduced=true;fx.update(.01,null);
  assert.equal(visible(scene).length,0);
  notify(fx,release());
  assert.equal(visible(scene).length,0);
  assert.ok(scene.children.some(n=>n.name==='skill-cue'&&n.visible));
});

test('presentation stats describe only the fixed decoration pool, never gameplay or mutable state',()=>{
  const scene=new Scene3D();let reduced=false;
  const fx=createEffects(scene,{particles:.5,reducedMotion:()=>reduced});
  const snapshot=fx.presentationStats();
  assert.deepEqual(snapshot,{capacity:3,active:0,emitted:0,peak:0});
  assert.ok(Object.isFrozen(snapshot));
  for(let n=0;n<5;n++)notify(fx,release());
  assert.deepEqual(fx.presentationStats(),{capacity:3,active:3,emitted:5,peak:3});
  assert.equal(snapshot.active,0,'earlier snapshots do not mutate');
  fx.clear();
  assert.deepEqual(fx.presentationStats(),{capacity:3,active:0,emitted:5,peak:3});
  reduced=true;
  notify(fx,release());
  assert.deepEqual(fx.presentationStats(),{capacity:3,active:0,emitted:5,peak:3});
});
