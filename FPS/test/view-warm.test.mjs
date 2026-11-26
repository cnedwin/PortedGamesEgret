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
