import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
const { createEngine, DisplayObjectContainer } = await import('@egret/engine');
const { createSnowStory } = await import('../src/ui/story.mjs');
const { createSnowLocale } = await import('../src/i18n.mjs');

test('cinematic letterbox stays below the playable HUD throughout the return to combat', async t => {
  const engine = await createEngine({host:{surface:{},start(){},stop(){},async close(){},setTimeout(){return()=>{};}}});
  t.after(()=>engine.dispose());
  const scope=engine.createScope(),stage=engine.stage;
  const combatLayer=scope.use(new DisplayObjectContainer()),menuLayer=scope.use(new DisplayObjectContainer());
  stage.addChild(combatLayer);stage.addChild(menuLayer);
  let tick;
  const story=createSnowStory({
    scope,stage,combatLayer,menuLayer,game:{engine},
    metrics:()=>({screen:{width:960,height:540},safe:{x:0,y:0,width:960,height:540}}),
    registerUpdate(fn){tick=fn;return()=>{};},registerLayout(){return()=>{};},requestPublish(){}
  },{locale:createSnowLocale('zh')});
  t.after(()=>story.dispose());
  assert.equal(stage.numChildren,3,'letterbox has a dedicated stage layer');
  const shade=stage.getChildAt(0);
  assert.equal(stage.getChildAt(1),combatLayer);
  assert.equal(stage.getChildAt(2),menuLayer);
  story.stage(true);tick(.7);
  assert.ok(shade.getBounds().height>0,'cinematic bars still draw');
  story.stage(false);tick(.1);
  assert.equal(stage.getChildAt(1),combatLayer,'partially fading bars never cover the now-active HUD');
  tick(.7);
  assert.equal(shade.getBounds().height,0,'the letterbox still completely clears');
});
