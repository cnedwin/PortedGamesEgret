import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayPixelRatio } from '../src/layout.mjs';

test('the renderer follows actual CSS enlargement instead of stretching low-density text', () => {
  assert.equal(displayPixelRatio(1280, 720, false, 1), 4 / 3);
  assert.equal(displayPixelRatio(1920, 1080, false, 1), 2);
  assert.equal(displayPixelRatio(960, 540, false, 1), 1);
  assert.equal(displayPixelRatio(720, 405, false, 1), 1);
});

test('high-density phone displays retain the existing two-times budget in either orientation', () => {
  assert.equal(displayPixelRatio(411, 411 * 1280 / 720, true, 2.625), 2);
  assert.equal(displayPixelRatio(325 * 1280 / 720, 325, false, 2.625), 2);
  assert.equal(displayPixelRatio(1280, 720, false, 1.5), 2);
});
