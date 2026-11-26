import test from 'node:test';
import assert from 'node:assert/strict';
import { worldPixelRatio, rpgDensity, scaleViewPart } from '../src/render-density.mjs';

test('desktop backing follows physical pixels instead of enlarging 915x540', () => {
  const scale = worldPixelRatio({width:915,height:540},{width:1440,height:850},1);
  assert.ok(scale > 1.56 && scale < 1.58);
});

test('phone landscape keeps previous oversampling and portrait increases density within budget', () => {
  assert.equal(worldPixelRatio({width:1451,height:540},{width:873,height:325},2.625),2);
  const portrait = worldPixelRatio({width:439,height:870},{width:411,height:813},2.625);
  assert.ok(portrait > 2.4 && portrait <= 2.5);
});

test('native RPG uses denser logical paragraphs on both PC and Fold7', () => {
  const portrait = {width:390,height:740};
  assert.equal(rpgDensity({width:1200,height:680},portrait,{width:1440,height:850},1).scale,1.5);
  const mobile = rpgDensity({width:780,height:320},portrait,{width:873,height:325},2.625);
  assert.equal(mobile.scale,2.5);
  assert.ok(mobile.pixelRatio >= 1 && mobile.pixelRatio < 1.1);
});

test('scaled UI preserves text, percent dimensions, semantic names, and checked state', () => {
  const part = {type:'panel',width:'fill',height:44,padding:6,gap:8,border:{width:1,color:9},
    children:[{type:'toggle',name:'material',text:'用作材料',checked:true,width:'50%',height:44},
      {type:'text',name:'description',text:'中文',size:13,paragraph:{lineHeight:18,maxLines:3}}]};
  const result = scaleViewPart(part,2.5);
  assert.equal(result.width,'fill'); assert.equal(result.height,110);
  assert.equal(result.children[0].width,'50%');assert.equal(result.children[0].checked,true);
  assert.equal(result.children[1].size,32.5);assert.equal(result.children[1].paragraph.lineHeight,45);
  assert.equal(result.children[1].paragraph.maxLines,3); assert.equal(result.border.width,2.5);
  assert.equal(part.height,44);
});