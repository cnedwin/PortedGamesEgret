import assert from 'node:assert/strict';
import test from 'node:test';
import { createFx } from './fx.mjs';

class Sprite {
  constructor() {
    this.graphics = {
      beginFill() { return this; },
      endFill() { return this; },
      drawRect() { return this; },
      drawCircle() { return this; },
      lineStyle() { return this; },
    };
  }
}

test('受击的淡闪沿指定强度衰减，并在结束时隐藏', () => {
  const flashSprites = [];
  const fx = createFx({
    Sprite,
    scope: { use: (item) => item },
    world: {},
    layer: { addChild() {} },
    flashLayer: { addChild: (sprite) => flashSprites.push(sprite) },
  });
  fx.flash(0.26, 0.16);
  const [flash] = flashSprites;
  assert.equal(flash.alpha, 0.26);
  fx.update(0.04);
  assert.equal(flash.alpha, 0.195);
  assert.equal(flash.visible, true);
  fx.update(0.12);
  assert.equal(flash.visible, false);
});
