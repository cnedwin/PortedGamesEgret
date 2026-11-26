import test from 'node:test';
import assert from 'node:assert/strict';
import { worldPixelRatio, rpgDensity } from '../src/render-density.mjs';

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
  const desktop = rpgDensity({width:1200,height:680},portrait,{width:1440,height:850},1);
  assert.equal(desktop.paragraphDensity,1.5);
  assert.ok(desktop.pixelRatio >= 1.5 && desktop.pixelRatio < 2);
  const mobile = rpgDensity({width:780,height:320},portrait,{width:873,height:325},2.625);
  assert.equal(mobile.paragraphDensity,2.5);
  assert.ok(mobile.pixelRatio >= 2.5 && mobile.pixelRatio < 2.75);
});
