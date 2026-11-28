import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

register('../tools/egret-resolve.mjs', import.meta.url);
const { Mesh3D, Object3D, RenderList3D, Scene3D, createBoxGeometry3D, createPerspectiveCamera3D,
  createStandardMaterial3D } = await import('@egret/engine/world3d');
const { describeModel } = await import('../src/asset-models.mjs');
const { createGame } = await import('../src/sim.mjs');
const { createView } = await import('../src/view.mjs');

function fixture() {
  const source=new Object3D(),geometry=createBoxGeometry3D(),material=createStandardMaterial3D({side:'double'});
  const body=new Mesh3D(geometry,material);body.name='body';source.addChild(body);
  const lid=new Mesh3D(geometry,material);lid.name='lid';lid.setPosition(0,.6,0);source.addChild(lid);
  const model=describeModel(source,{parts:{body:'body',lid:'lid'}});
  const scene=new Scene3D(),camera=createPerspectiveCamera3D({aspect:1.5,near:.03,far:460});scene.addChild(camera);
  const game=createGame({seed:3}),view=createView(scene,camera,{models:{'supply-crate':model}});view.attach(game);
  const snapshot=()=>JSON.stringify({t:game.t,state:game.state,player:game.player,events:game.events,crates:game.crates});
  const lights=[];scene.traverse(node=>{if(node.lightType==='point')lights.push(node);});
  return {scene,camera,game,view,geometry,material,snapshot,lights};
}

test('boot draws the ordinary double-sided supply variant in both passes without advancing the game', () => {
  const f=fixture(),before=f.snapshot(),passes=[],lighting=f.lights.map(light=>light.intensity);
  const draw=pass=>{
    const found=[];f.scene.traverse(node=>{if(node.name==='boot-supply-body')found.push(node);});
    assert.equal(found.length,1,'one source mesh must actually reach each render call');
    const mesh=found[0];
    assert.equal(mesh.geometry,f.geometry);assert.equal(mesh.material,f.material);
    assert.equal(mesh.isInstanced,false);assert.equal(mesh.castShadow,false);assert.equal(mesh.receiveShadow,true);
    assert.equal(mesh.frustumCulled,false);assert.notEqual(mesh.renderOrder,0,'keep the ordinary mesh out of automatic instancing');
    mesh.updateWorldMatrix();assert(mesh.matrixWorld[13]<-30,'the preparation fixture stays below the visible scene');
    assert.equal(f.camera.position[2],f.game.player.z,'prepare with the actual starting view');
    const list=new RenderList3D();list.build(f.scene,f.camera);
    assert(list.opaque.some(item=>item.mesh===mesh),'the real render list must retain the ordinary fixture');
    passes.push(pass);
  };
  f.view.renderReflection=()=>draw('reflection');
  f.view.warm({render:()=>draw('main')},f.game);
  assert.deepEqual(passes,['reflection','main']);assert.equal(f.snapshot(),before);
  assert.equal(f.scene.children.some(node=>node.name==='boot-supply-body'),false);
  assert.deepEqual(Array.from(f.camera.position),[0,15,44],'restore the title camera');
  assert.equal(f.geometry.isDisposed,false);assert.equal(f.material.isDisposed,false);
  assert.deepEqual(f.lights.map(light=>light.intensity),lighting);
});

test('a failed boot draw removes the temporary mesh and restores the title without consuming shared art', () => {
  for(const failingPass of ['reflection','main']) {
    const f=fixture(),before=f.snapshot(),lighting=f.lights.map(light=>light.intensity),failure=new Error('forced '+failingPass+' draw failure');
    f.view.renderReflection=()=>{if(failingPass==='reflection')throw failure;};
    assert.throws(()=>f.view.warm({render(){throw failure;}},f.game),error=>error===failure);
    assert.equal(f.scene.children.some(node=>node.name==='boot-supply-body'),false);
    assert.deepEqual(Array.from(f.camera.position),[0,15,44]);assert.equal(f.snapshot(),before);
    assert.equal(f.geometry.isDisposed,false);assert.equal(f.material.isDisposed,false);
    assert.deepEqual(f.lights.map(light=>light.intensity),lighting);
  }
});


test('native program preparation covers ordinary supply, main and mirror without a draw or game mutation', async () => {
  const f=fixture(),before=f.snapshot(),titleCamera=Array.from(f.camera.position),lighting=f.lights.map(light=>light.intensity);
  const calls=[];
  const renderer={shadowsEnabled:true,postProcess:{enabled:true},preparePrograms(requests,options){calls.push({requests,options});return Promise.resolve();},
    render(){throw Error('Program preparation must not render');}};
  const result=await f.view.prepare(renderer);
  assert.equal(result.supported,true);assert.equal(calls.length,1);
  assert.equal(calls[0].options.includeAutoInstancing,true);
  const requests=calls[0].requests,ordinary=requests.filter(r=>r.mesh.name==='boot-supply-program');
  assert.equal(ordinary.length,2,'ordinary supply has exactly one main and one mirror color request');
  for(const r of ordinary){
    assert.equal(r.mesh.geometry,f.geometry);assert.equal(r.material,f.material);
    assert.equal(r.pass,undefined);assert.equal(r.mesh.castShadow,false);assert.equal(r.mesh.receiveShadow,true);
    assert.notEqual(r.mesh.renderOrder,0);assert.equal(r.mesh.parent,undefined);
  }
  assert(ordinary.some(r=>!r.reflection&&r.receiveShadows===true));
  assert(ordinary.some(r=>r.reflection&&r.reflection.shadows===false&&r.receiveShadows===false));
  assert(requests.some(r=>r.pass==='shadow'));
  assert.equal(result.requests,requests.length);
  assert.equal(f.snapshot(),before);assert.deepEqual(Array.from(f.camera.position),titleCamera);
  assert.deepEqual(f.lights.map(light=>light.intensity),lighting);
  assert.equal(f.geometry.isDisposed,false);assert.equal(f.material.isDisposed,false);
});

test('native preparation honors disabled features, absent WebGPU API and failures without touching the game',async()=>{
  const f=fixture(),before=f.snapshot(),titleCamera=Array.from(f.camera.position);
  const noApi=await f.view.prepare({});assert.equal(noApi.supported,false);
  f.view.setReflections(false);
  await f.view.prepare({shadowsEnabled:false,postProcess:{enabled:false},preparePrograms(requests){
    assert(requests.length>0);assert(requests.every(r=>!r.reflection&&r.pass!=='shadow'&&r.receiveShadows!==true));
    return Promise.resolve();
  }});
  const failure=Error('forced native prepare failure');
  await assert.rejects(()=>f.view.prepare({shadowsEnabled:true,postProcess:{enabled:true},preparePrograms(){return Promise.reject(failure);}}),error=>error===failure);
  assert.equal(f.snapshot(),before);assert.deepEqual(Array.from(f.camera.position),titleCamera);
  assert.equal(f.geometry.isDisposed,false);assert.equal(f.material.isDisposed,false);
});
