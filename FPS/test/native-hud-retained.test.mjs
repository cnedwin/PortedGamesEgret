import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

register('../tools/egret-resolve.mjs', import.meta.url);
const { DisplayObject, Sprite } = await import('@egret/engine');
const { createPerspectiveCamera3D } = await import('@egret/engine/world3d');
const { createCombatHud } = await import('../src/ui/hud.mjs');
const { createGame } = await import('../src/sim.mjs');

function fixture() {
  // Real engine display objects and graphics record actual changed writes. A
  // lightweight Play facade omits browser rendering and the unrelated cards.
  const changes = { visible:0, clear:0 }, ui = new Sprite();
  const descriptor = Object.getOwnPropertyDescriptor(DisplayObject.prototype,'visible');
  const make = parent => {
    const node = new Sprite();parent.addChild(node);
    Object.defineProperty(node,'visible',{
      configurable:true,get(){return descriptor.get.call(this);},
      set(value){if(descriptor.get.call(this)!==value)changes.visible++;descriptor.set.call(this,value);}
    });
    const clear = node.graphics.clear.bind(node.graphics);
    node.graphics.clear = () => {changes.clear++;return clear();};
    return node;
  };
  const screen={x:0,y:0,width:960,height:540};
  const play={ui,screen,safe:screen,orientation:'landscape',browser:{screen:{scale:1}},scope:{use(){}},
    hints:()=>({set(){},dispose(){}}),sprite:(_,parent=ui)=>make(parent),
    text:(text,options)=>{const node=make(options.layer??ui);node.text=text;node.x=options.x??0;node.y=options.y??0;return node;},
    show:()=>({show(){},hide(){},close(){}}),remove:node=>node.parent?.removeChild(node)};
  const game=createGame({seed:7}),p=game.player,target=game.terminals[0];
  const yaw=-Math.atan2(target.x-p.x,-(target.z-p.z));
  const camera=createPerspectiveCamera3D({fov:70,aspect:960/540,near:.03,far:460});
  camera.setPosition(p.x,p.y+p.eye,p.z).lookAt(target.x,1.7,target.z);
  const eye={x:p.x,y:p.y+p.eye,z:p.z,yaw,pitch:0,fov:70,aspect:960/540};
  const hud=createCombatHud(play,{camera,stage:null,settings:{lang:'zh'}});hud.setVisible(true);
  hud.update(game,0,eye);assert(hud.snapshot().markerCount>0);
  changes.visible=changes.clear=0;
  return{hud,game,eye,changes};
}

test('stationary HUD markers retain native visibility without a hide/show cycle on every update',()=>{
  const {hud,game,eye,changes}=fixture();
  hud.update(game,0,eye);
  assert.equal(changes.visible,0,'unchanged visible compass markers do not publish false then true');
  assert.equal(changes.clear,0);
});

test('changing one retained HUD shape does not rebuild the other invisible/unchanged shape',()=>{
  const {hud,game,eye,changes}=fixture();
  const gap=hud.snapshot().state.gap;
  game.weapons[game.player.weapon].heat=1;
  hud.update(game,0,eye);
  assert.notEqual(hud.snapshot().state.gap,gap,'fixture changes the existing displayed spacing');
  assert.equal(changes.clear,1,'only changing crosshair geometry is regenerated');
});

test('transient feedback draws immediately on appearance and can hide without rebuilding retained shapes',()=>{
  const {hud,game,eye,changes}=fixture();
  hud.handle({type:'shot',enemy:true,killed:true});
  hud.update(game,0,eye);
  assert(hud.snapshot().state.hitLeft>0);
  assert.equal(changes.clear,1,'the newly visible feedback shape is drawn immediately');
  changes.clear=0;
  hud.update(game,.4,eye);
  assert.equal(hud.snapshot().state.hitLeft,0);
  assert.equal(changes.clear,0,'expiry is only a visibility change');
});
