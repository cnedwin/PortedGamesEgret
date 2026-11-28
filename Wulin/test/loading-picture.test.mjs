import test from 'node:test';
import assert from 'node:assert/strict';
import { pictureStatus, createPictureLoading } from '../src/view/loading-picture.mjs';

test('loading remains truthful until a scene has submitted its first frame; only unavailable uses fallback',()=>{
  const p={loading:true,stage:null,tried:true};
  assert.equal(pictureStatus(p,'seat',true,true,false),'seat');
  p.loading=false;p.stage={presented:false};
  assert.equal(pictureStatus(p,'seat',true,true,false),'seat');
  assert.equal(pictureStatus(p,'world',true,true,false),'realm');
  p.stage.presented=true;
  p.realmRequest={};assert.equal(pictureStatus(p,'world',true,true,false),'realm');p.realmRequest=null;
  assert.equal(pictureStatus(p,'seat',true,true,false),null);
  p.stage=null;
  assert.equal(pictureStatus(p,'seat',true,true,false),null);
  assert.equal(pictureStatus(p,'seat',true,true,true),'unavailable');
  assert.equal(pictureStatus(p,'world',true,false,false),null,'explicit painted map is never a loading screen');
  p.loading=true;
  assert.equal(pictureStatus(p,'title',false,true,false),null);
});

test('loading uses a single native noninteractive world layer and follows current screen, in either language',()=>{
  const nodes=[];
  const game={world:{},screen:{x:0,y:0,width:1280,height:720},safe:{x:0,y:0,width:1280,height:720},orientation:'landscape',sprite(draw,layer){const n={layer,graphics:{clear(){return this},beginFill(){return this},drawRect(...box){this.box=box;return this},endFill(){return this}}};nodes.push(n);draw?.(n.graphics);return n;},text(text,options){const n={text,options};nodes.push(n);return n;}};
  const show=createPictureLoading(game);
  assert.equal(nodes.length,3);
  show.show('seat','zh');assert.equal(nodes[0].visible,true);assert.equal(nodes[0].touchEnabled,false);assert.equal(nodes[0].touchChildren,false);assert.match(nodes[2].text,/山门/);
  game.screen={x:0,y:0,width:420,height:800};game.safe={x:0,y:24,width:420,height:752};game.orientation='portrait';show.resize();
  assert.deepEqual(nodes[1].graphics.box,[0,0,420,800]);assert.equal(nodes[2].x,210);assert.ok(nodes[2].y>=24&&nodes[2].y<390);
  show.show('realm','en');assert.match(nodes[2].text,/map/i);show.show(null,'en');assert.equal(nodes[0].visible,false);assert.equal(nodes.length,3);
});
